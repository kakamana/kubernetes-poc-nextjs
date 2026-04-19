# Docker Guide — Run, Stop, and Ship Changes

This guide covers the day-to-day developer workflow for the MoroHub POC on
your local Mac using Docker Compose.

All commands below assume you are in the project root:

```bash
cd /Users/kakamana/Desktop/Work/Projects/Nextjs/Kubernetes-poc
```

---

## 1. Prerequisites

| Requirement | Check |
|-------------|-------|
| Docker Desktop is running | `docker version` should show both Client and Server |
| Ports 5500 and 5432 are free | `lsof -i :5500 -i :5432` should return nothing |
| `.env` file exists | `ls .env` (copy from `.env.example` if missing) |

---

## 2. Start the project

### First-time start (or after pulling fresh code)

```bash
# 1. Build images and start containers in the background
docker compose up --build -d

# 2. Apply the database schema (only needed on a fresh pgdata volume)
DATABASE_URL="postgresql://morohub:morohub@localhost:5432/morohub?schema=public" \
  npx prisma db push --accept-data-loss --skip-generate

# 3. Seed demo users + employees
DATABASE_URL="postgresql://morohub:morohub@localhost:5432/morohub?schema=public" \
  npx tsx prisma/seed.ts
```

### Subsequent starts (containers already built, data already seeded)

```bash
docker compose up -d
```

### Verify everything is healthy

```bash
docker compose ps
curl http://localhost:5500/api/health
curl http://localhost:5500/api/ready
```

Expected:
- `docker compose ps` shows both containers `Up (healthy)`.
- `/api/health` returns `"status":"ok"`.
- `/api/ready` returns `"status":"ready"` and `"db":"up"`.

### Open the app

1. Browser → **http://localhost:5500**
2. Click **Sign in**
3. Credentials:
   - Admin: `admin@morohub.local` / `MoroHub@12345`
   - Viewer: `viewer@morohub.local` / `Viewer@12345`

---

## 3. Stop the project

There are three levels of "stop" — pick the one you want:

### (a) Pause containers (preserves data, fastest restart)

```bash
docker compose stop
# Later resume with:
docker compose start
```

Nothing is deleted. Data stays in the `pgdata` volume.

### (b) Stop and remove containers (preserves data)

```bash
docker compose down
# Later start fresh containers with:
docker compose up -d
```

Containers are removed but the Postgres volume **survives**, so logins and
seeded employees are still there on next start.

### (c) Full reset (deletes database too)

```bash
docker compose down -v
```

`-v` deletes the `pgdata` volume. You **must** re-run `prisma db push` and
`prisma/seed.ts` after this (see "First-time start" above).

Use this when you want a clean slate — e.g. after changing `prisma/schema.prisma`
in a way that isn't compatible with the existing data.

---

## 4. Common inspection commands

```bash
# Follow web container logs live
docker compose logs -f web

# Follow Postgres logs
docker compose logs -f postgres

# Open a shell inside the web container
docker compose exec web sh

# Connect to Postgres using psql inside the container
docker compose exec postgres psql -U morohub -d morohub

# Who is the container that served the last request? (pod identity banner)
curl -s http://localhost:5500/api/health | jq .
```

---

## 5. Publishing code changes to Docker

Use this loop every time you change the app — add a feature, edit styles,
add a nav item, etc.

### The rebuild loop in one command

```bash
docker compose up --build -d
```

`--build` rebuilds the `web` image from your latest source before starting.
Compose reuses the `postgres` container and volume unchanged, so your data
survives.

If only the web code changed:

```bash
docker compose up --build -d web
```

If something is cached weirdly and a normal rebuild doesn't reflect your
changes:

```bash
docker compose build --no-cache web
docker compose up -d web
```

### Worked example — add an **About Us** header menu item

You want a new link in the admin nav. Here is the full loop from edit to
browser.

1. **Edit** `src/components/admin/nav.tsx` and add one line inside the
   `<nav>`:

   ```tsx
   <Link
     href="/admin/about"
     className="px-3 py-1.5 rounded-md hover:bg-[var(--accent)]"
   >
     About Us
   </Link>
   ```

2. **Create the target page** `src/app/admin/about/page.tsx`:

   ```tsx
   export default function AboutPage() {
     return (
       <main className="mx-auto max-w-3xl px-6 py-8 space-y-4">
         <h1 className="text-2xl font-semibold tracking-tight">About Us</h1>
         <p className="text-[var(--muted-foreground)]">
           MoroHub Functional POC — a reference Next.js + PostgreSQL
           application deployed on Kubernetes-as-a-Service.
         </p>
       </main>
     );
   }
   ```

3. **Rebuild and restart** in the background:

   ```bash
   docker compose up --build -d web
   ```

4. **Verify**:

   ```bash
   curl -s http://localhost:5500/api/health | jq .
   ```

5. **Refresh** your browser tab at http://localhost:5500/admin. You should
   see the new **About Us** item in the header.

### (Optional) Tag and push the image to a registry

When you're ready to hand the new build to MoroHub, tag it and push:

```bash
# Replace <your-registry> with the registry MoroHub gave you
REGISTRY=ghcr.io/kakamana
TAG=v0.1.1-about-us

docker tag morohub/kubernetes-poc-nextjs:local $REGISTRY/kubernetes-poc-nextjs:$TAG
docker push $REGISTRY/kubernetes-poc-nextjs:$TAG
```

Then update `k8s/kustomization.yaml` (or let MoroHub do it):

```bash
cd k8s
kustomize edit set image \
  ghcr.io/REPLACE_ME/kubernetes-poc-nextjs=$REGISTRY/kubernetes-poc-nextjs:$TAG
```

---

## 6. When things go wrong

| Symptom | Fix |
|---------|-----|
| `port is already allocated` | `lsof -i :5500` → kill the offending process, or change the host port in `docker-compose.yml` |
| `web` container keeps restarting | `docker compose logs web` — usually `DATABASE_URL` or `AUTH_SECRET` missing |
| Login says "Invalid email or password" | DB isn't seeded yet — run the `prisma db push` + seed commands from section 2 |
| Schema change doesn't show up | Run `prisma db push` again, or nuke with `docker compose down -v` and re-seed |
| Next.js change doesn't show up | Make sure you used `--build` — `docker compose up -d` alone does NOT rebuild the image |
| "no configuration file provided: not found" | You're not in the project root — `cd` into `Kubernetes-poc/` first |

---

## Quick reference card

```bash
# Start
docker compose up --build -d

# Stop (keep data)
docker compose down

# Stop and wipe data
docker compose down -v

# Apply schema (after a fresh volume or schema change)
DATABASE_URL="postgresql://morohub:morohub@localhost:5432/morohub?schema=public" \
  npx prisma db push --accept-data-loss --skip-generate

# Seed demo data
DATABASE_URL="postgresql://morohub:morohub@localhost:5432/morohub?schema=public" \
  npx tsx prisma/seed.ts

# Rebuild after code change
docker compose up --build -d web

# Logs
docker compose logs -f web
```
