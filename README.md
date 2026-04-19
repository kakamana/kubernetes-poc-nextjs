# MoroHub Functional POC — Next.js + PostgreSQL on Kubernetes

A mid-range reference application built to walk the **MoroHub hosting**
Kubernetes-as-a-Service team through:

- Containerising a Next.js + PostgreSQL stack
- Deploying it to their managed Kubernetes offering
- Pod administration, rolling updates, and self-healing
- Ingress-level load balancing with **session stickiness** (NGINX cookie affinity)
- **High availability** via multi-replica Deployments, PodDisruptionBudgets, pod anti-affinity
- **Disaster recovery / business continuity** during node drains and pod kills
- **Horizontal scale in / scale out** via an HPA on CPU + memory
- **Active/passive PostgreSQL HA** via the Bitnami `postgresql-ha` Helm chart (Pgpool + repmgr)

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) + React 19 |
| Language | TypeScript, strict |
| UI | Tailwind CSS v4, shadcn-style primitives, Radix UI |
| Validation | Zod (server actions + API routes) |
| Auth | Auth.js (NextAuth v5) — credentials provider, bcrypt, JWT sessions |
| ORM | Prisma 6 (PostgreSQL) |
| Container | Multi-stage Dockerfile → Next.js `output: standalone` |
| Orchestration | Kubernetes manifests + Kustomize + Helm values |

## What the app does

- `/` — Landing page showing which pod handled the request
- `/login` — Credentials login (seeded admin + viewer accounts)
- `/admin` — Dashboard with headcount, payroll, and audit-log summary
- `/admin/employees` — Employees CRUD (ADMIN role only can mutate)
- `/admin/users` — List of accounts that can sign in
- `/admin/audit` — Last 100 admin actions, written to Postgres
- `/api/health` — Liveness probe target, also surfaces pod identity
- `/api/ready` — Readiness probe target — returns 503 if Postgres is down

Every admin page renders a banner with **pod hostname, node name, and pod IP**
so you can watch session stickiness and rolling updates in real time.

## Run locally

### Option A — Docker Compose (matches the K8s path)

```bash
docker compose up --build -d
docker compose exec web node_modules/.bin/prisma db push --accept-data-loss
docker compose exec web node_modules/.bin/tsx prisma/seed.ts
open http://localhost:3000
```

### Option B — Native Node + Postgres

```bash
cp .env.example .env            # then fill DATABASE_URL + AUTH_SECRET
npm install
npm run db:push
npm run db:seed
npm run dev
```

Seeded logins:

| Email | Password | Role |
|-------|----------|------|
| `admin@morohub.local` | `MoroHub@12345` | ADMIN — full CRUD |
| `viewer@morohub.local` | `Viewer@12345`  | USER  — read-only |

## Deploy to Kubernetes

Everything Day-1 and Day-2 lives under [`k8s/`](./k8s). The demo runbook
([`k8s/README.md`](./k8s/README.md)) has copy-paste commands for:

1. Rolling update with zero downtime
2. Session stickiness on/off
3. HPA-driven scale out under load
4. Killing a pod / draining a node (PodDisruptionBudget protection)
5. Failing over the Postgres primary (Bitnami HA chart)

TL;DR:

```bash
docker build -t ghcr.io/<org>/kubernetes-poc-nextjs:v0.1.0 .
docker push ghcr.io/<org>/kubernetes-poc-nextjs:v0.1.0

cd k8s
kustomize edit set image ghcr.io/REPLACE_ME/kubernetes-poc-nextjs=ghcr.io/<org>/kubernetes-poc-nextjs:v0.1.0
kubectl apply -k .
```

## Repository layout

```
.
├── src/
│   ├── app/              App Router routes (public + /admin + /api)
│   ├── components/       UI primitives + admin components
│   ├── lib/              Prisma client, Auth.js config, utilities, pod metadata
│   └── middleware.ts     Auth middleware for /admin/*
├── prisma/
│   ├── schema.prisma     User / Employee / AuditLog models
│   └── seed.ts           Idempotent seed (admin + viewer + 10 employees)
├── Dockerfile            Multi-stage standalone build
├── docker-compose.yml    Local Postgres + web
├── k8s/                  Kustomize-based K8s manifests + demo runbook
└── postgres-ha/          Bitnami postgresql-ha Helm values (active/passive)
```

## License

POC code — no licence declared. Treat as internal reference material.
