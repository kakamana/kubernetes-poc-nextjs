# MoroHub Handoff — Meeting Preparation and Walk-through Guide

**Audience:** Kamran (you) + MoroHub hosting Kubernetes team
**Meeting date:** Kick-off for MoroHub Kubernetes-as-a-Service evaluation
**POC app:** Next.js 16 + PostgreSQL + Auth.js + Prisma
**Repository:** https://github.com/kakamana/kubernetes-poc-nextjs

---

## 1. What you are asking MoroHub to do

You want MoroHub to walk you through deploying this exact POC onto their
Kubernetes-as-a-Service offering, so that you can evaluate whether their
platform meets your requirements for a production workload. The demo should
cover:

1. **Containerisation and registry** — how images get from your laptop / CI
   into their cluster.
2. **Deployment** — how the Next.js Deployment and Postgres StatefulSet get
   applied and reach a Ready state.
3. **Pod administration** — logs, exec, scale, restart.
4. **Load balancing and session stickiness** — Ingress / LoadBalancer, cookie
   affinity.
5. **High availability** — pod anti-affinity, multiple replicas, node loss
   tolerance.
6. **Disaster recovery / business continuity** — what happens when a pod
   dies, a node is drained, or a deployment goes wrong.
7. **Scale in / scale out** — manual scaling and the HPA under load.
8. **PostgreSQL active / passive HA** — primary + replicas, failover when the
   primary dies.

---

## 2. What you will hand over to MoroHub

Provide exactly these artefacts. Everything lives in the public GitHub repo.

| # | Artefact | Location in repo | Purpose |
|---|----------|------------------|---------|
| 1 | **Source code** | root of repo | Lets MoroHub build the image themselves if desired |
| 2 | **Dockerfile** | `/Dockerfile` | Multi-stage build, Next.js standalone output, Prisma tooling baked in |
| 3 | **docker-compose.yml** | `/docker-compose.yml` | Proves the app works outside K8s first |
| 4 | **K8s manifests** | `/k8s/` | Kustomize-based; what actually gets applied |
| 5 | **Helm values for Postgres HA** | `/postgres-ha/values.yaml` | For the Bitnami `postgresql-ha` chart |
| 6 | **Demo runbook** | `/k8s/README.md` | Copy-paste commands for each demo scenario |
| 7 | **Environment template** | `/.env.example` | Lists required env vars with notes |
| 8 | **Top-level README** | `/README.md` | One-page tour of the whole POC |

**URL to send them:** https://github.com/kakamana/kubernetes-poc-nextjs

---

## 3. Pre-meeting checklist (your side)

Run through this the evening before. 30 minutes.

### A. Local validation

```bash
cd /Users/kakamana/Desktop/Work/Projects/Nextjs/Kubernetes-poc
docker compose up --build -d
curl http://localhost:5500/api/health      # should return status: ok
curl http://localhost:5500/api/ready       # should return db: up
```

Sign in at **http://localhost:5500** with `admin@morohub.local` /
`MoroHub@12345`. Click around Employees, add one, delete one. If anything
looks wrong, fix it before the meeting — do not debug live.

### B. Rotate secrets to something meeting-safe

The repo ships with placeholder secrets. Before the meeting:

```bash
# Generate a real 32-byte AUTH_SECRET
openssl rand -base64 32
```

Paste the output into `k8s/10-config.yaml` under `web-secrets.AUTH_SECRET`,
and rotate the Postgres password in the same file if you want something
other than `morohub/morohub`. Commit and push.

### C. Decide on a container registry

Ask MoroHub **before** the meeting:

- Do they provide a private registry for tenants, or do you push to your own
  (GHCR, Docker Hub, ECR, GCR)?
- If MoroHub-hosted, what is the registry URL and how do you authenticate?
- Will they give the cluster an `imagePullSecret` for private registries, or
  must the image be public?

If you want a zero-friction demo, push the image to **GHCR as public** under
your own user:

```bash
IMAGE=ghcr.io/kakamana/kubernetes-poc-nextjs:v0.1.0
docker tag morohub/kubernetes-poc-nextjs:local $IMAGE
echo "<your-github-token>" | docker login ghcr.io -u kakamana --password-stdin
docker push $IMAGE
```

Then update `k8s/kustomization.yaml`:

```bash
cd k8s
kustomize edit set image \
  ghcr.io/REPLACE_ME/kubernetes-poc-nextjs=$IMAGE
git commit -am "Point manifests at ghcr image"
git push
```

### D. Decide on the public hostname

`k8s/50-ingress.yaml` points at `morohub-poc.example.com`. Ask MoroHub to
either give you a hostname under one of their domains, or attach their
wildcard ingress to a name you choose. Update the `host:` value before the
demo.

### E. Get the cluster requirements confirmed

Send MoroHub this checklist beforehand so they can pre-provision:

- [ ] Kubernetes cluster (any recent version, 1.27+ is fine)
- [ ] `ingress-nginx` controller installed (other controllers work but the
      stickiness annotations in `50-ingress.yaml` are NGINX-specific)
- [ ] `metrics-server` add-on (required by the HPA)
- [ ] A default `StorageClass` that supports `ReadWriteOnce` PVCs (for
      Postgres)
- [ ] Network egress to pull the container image and Helm chart
- [ ] (Optional) `cert-manager` for TLS

---

## 4. The 30-40 minute walk-through you are asking them to do

Hand this section to the MoroHub team as the running order for the demo.

### Act 0 — Platform tour (5 min)

> *Purpose: understand their platform before deploying anything.*

Ask MoroHub to show you:

- How a tenant gets cluster credentials (kubeconfig / portal / CLI)
- How namespaces / projects are isolated between tenants
- How tenants bring their own images (registry integration)
- Which ingress controller is pre-installed and what the public DNS pattern
  looks like
- Where cluster metrics live (Grafana / Prometheus / their portal)

### Act 1 — Deploy the stack (5 min)

> *Purpose: prove the app can be deployed from the artefacts we gave them.*

1. Clone the repo: `git clone https://github.com/kakamana/kubernetes-poc-nextjs`
2. Build + push the image to the registry (or use the pre-pushed image).
3. `cd k8s && kustomize edit set image ghcr.io/REPLACE_ME/kubernetes-poc-nextjs=<registry>/kubernetes-poc-nextjs:v0.1.0`
4. `kubectl apply -k .`
5. Watch pods come up:
   ```bash
   kubectl -n morohub-poc get pods -w
   ```
6. When the migrate Job says `Completed` and web pods are `Ready`, visit the
   Ingress URL and log in.

**What to check together:** every pod is on a different node
(`kubectl get pods -o wide`), the readiness probe goes green only after the
Job has seeded the database.

### Act 2 — Pod administration (3 min)

> *Purpose: see the "Day-2 ops" story.*

```bash
kubectl -n morohub-poc get pods -o wide
kubectl -n morohub-poc logs deploy/web --tail=50 -f
kubectl -n morohub-poc exec -it deploy/web -- sh
kubectl -n morohub-poc describe pod <pod-name>
```

### Act 3 — Load balancing and session stickiness (5 min)

> *Purpose: show traffic distribution and the cookie-affinity control.*

1. With stickiness **on** (default), open the app in a browser; the banner
   shows the pod hostname. Refresh — it stays the same (cookie pinned).
2. Open an incognito window — different cookie, different pod.
3. From a terminal, demonstrate round-robin by bypassing the cookie:
   ```bash
   for i in $(seq 1 10); do
     curl -s https://<ingress-host>/api/health | jq -r .hostname
   done
   ```
4. Toggle stickiness **off** and re-run:
   ```bash
   kubectl -n morohub-poc annotate ingress web \
     nginx.ingress.kubernetes.io/affinity- --overwrite
   ```
5. Turn it **back on**:
   ```bash
   kubectl -n morohub-poc annotate ingress web \
     nginx.ingress.kubernetes.io/affinity=cookie --overwrite
   ```

### Act 4 — Rolling update with zero downtime (5 min)

> *Purpose: prove deployments don't drop traffic.*

1. In one terminal, start a continuous health probe:
   ```bash
   while true; do
     curl -s -o /dev/null -w "%{http_code}\n" https://<ingress-host>/
     sleep 0.5
   done
   ```
2. In another terminal, trigger a rollout:
   ```bash
   kubectl -n morohub-poc set image deploy/web \
     web=<registry>/kubernetes-poc-nextjs:v0.1.1
   kubectl -n morohub-poc rollout status deploy/web
   ```
3. Watch the probe — it should stay `200` throughout. The Deployment uses
   `maxUnavailable: 0` plus a `preStop` drain so in-flight requests survive.
4. Rollback on demand:
   ```bash
   kubectl -n morohub-poc rollout undo deploy/web
   ```

### Act 5 — Horizontal scale in / scale out (5 min)

> *Purpose: show the HPA reacting to load.*

1. Check baseline:
   ```bash
   kubectl -n morohub-poc get hpa web
   kubectl -n morohub-poc top pods
   ```
2. Apply synthetic load (MoroHub can use `hey`, `k6`, or their own tool):
   ```bash
   kubectl -n morohub-poc run hey --rm -it --image=williamyeh/hey -- \
     -z 2m -c 50 http://web.morohub-poc.svc.cluster.local/
   ```
3. Watch the HPA add replicas:
   ```bash
   kubectl -n morohub-poc get hpa web -w
   kubectl -n morohub-poc get pods -w
   ```
4. When load stops, replicas scale back down after the cool-down window.

### Act 6 — Business continuity: kill a pod (3 min)

> *Purpose: prove self-healing.*

```bash
POD=$(kubectl -n morohub-poc get pod -l app.kubernetes.io/name=web -o name | head -1)
kubectl -n morohub-poc delete $POD
kubectl -n morohub-poc get pods -w
```

Refresh the browser — no user-visible error. A replacement pod appears
within seconds; the PDB (`minAvailable: 2`) ensures at least two pods are
serving traffic at all times.

### Act 7 — DR rehearsal: drain a node (5 min)

> *Purpose: prove the workload survives losing a whole node.*

```bash
NODE=$(kubectl get pod -l app.kubernetes.io/name=web -n morohub-poc \
  -o jsonpath='{.items[0].spec.nodeName}')
kubectl drain $NODE --ignore-daemonsets --delete-emptydir-data
# ... workload migrates to surviving nodes ...
kubectl uncordon $NODE
```

Confirm with `kubectl get pods -o wide` that pods rescheduled onto
different nodes and traffic was never interrupted.

### Act 8 — PostgreSQL active / passive HA (8 min)

> *Purpose: prove the database tier can survive a primary loss.*

MoroHub installs the Bitnami `postgresql-ha` chart using the values file in
the repo:

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
helm upgrade --install postgres-ha bitnami/postgresql-ha \
  --namespace morohub-poc --create-namespace \
  -f postgres-ha/values.yaml
```

Re-point the app at Pgpool (the chart's front-end):

```bash
kubectl -n morohub-poc patch secret web-secrets --type=merge \
  -p '{"stringData":{"DATABASE_URL":"postgresql://morohub:<password>@postgres-ha-pgpool:5432/morohub?schema=public"}}'
kubectl -n morohub-poc rollout restart deploy/web
```

Kill the primary:

```bash
kubectl -n morohub-poc get pods -l app.kubernetes.io/name=postgresql
kubectl -n morohub-poc delete pod postgres-ha-postgresql-0
kubectl -n morohub-poc get pods -w
```

`repmgr` promotes a replica to primary automatically; Pgpool re-routes
writes. Refresh the app — after ~10 seconds `/api/ready` is green again
because the replica was promoted.

---

## 5. Success criteria — what "good" looks like after the meeting

After the walk-through, you should be able to answer **yes** to all of these:

- [ ] Deployment finished with one command (`kubectl apply -k .` + one helm
      install) from artefacts in this repo, without ad-hoc edits.
- [ ] All three web pods landed on different nodes.
- [ ] The public URL works, I can log in, and data is coming from Postgres.
- [ ] The pod hostname banner shows a stable pod when stickiness is on and
      rotates when I disable it.
- [ ] A rolling update happens with no HTTP 5xx in the probe loop.
- [ ] HPA demonstrably adds pods under load and removes them when idle.
- [ ] Killing a pod and draining a node are invisible to the end user.
- [ ] The Postgres primary can be deleted and the app recovers without me
      editing the secret again.

---

## 6. Questions to ask MoroHub during the meeting

Things that are not demonstrable from the POC but matter for production:

1. **Backup & restore** — How is the `postgres-ha` volume backed up? What is
   the RTO/RPO? Who restores in a disaster?
2. **Observability** — Which metrics / logs / traces pipelines come with the
   service? Can we wire up to our own Grafana or do we use theirs?
3. **Secrets management** — Is there a supported integration with a real
   secrets manager (Vault, Sealed Secrets, KMS)? The POC uses
   `stringData`, which is fine for a demo, not for prod.
4. **Network egress / WAF** — Can we put a WAF in front of the Ingress?
   What is the DDoS posture?
5. **Cluster upgrades** — Who schedules node / control-plane upgrades? Is
   there a maintenance window?
6. **Quota and cost** — What is the unit of billing (pods? vCPU-hours?
   namespaces?) and what are the soft/hard quotas for a tenant?
7. **Multi-AZ / multi-region** — Does the cluster span availability zones
   out of the box? Is there an option for cross-region DR?
8. **SLA** — What SLA does MoroHub offer on the control plane and on
   tenant workloads?

---

## 7. Step-by-step — what YOU do, in order

Use this as your personal countdown.

### Tonight (before the meeting)

1. `cd /Users/kakamana/Desktop/Work/Projects/Nextjs/Kubernetes-poc`
2. Run the local validation in section 3.A. Confirm login works.
3. Generate a real `AUTH_SECRET` and paste it into `k8s/10-config.yaml`.
   Commit and push.
4. (Optional) Push the image to GHCR so MoroHub doesn't have to build it.
5. Send MoroHub this email:

   > **Subject:** MoroHub Kubernetes-as-a-Service walk-through — inputs
   >
   > Hi team,
   >
   > For tomorrow's session we've prepared a functional POC at:
   > **https://github.com/kakamana/kubernetes-poc-nextjs**
   >
   > The repo contains the Dockerfile, K8s manifests (Kustomize), Helm
   > values for Postgres HA, and a step-by-step runbook for the walk-through
   > under `k8s/README.md`. A one-page handoff with the demo order lives at
   > `docs/MOROHUB_HANDOFF.md` in the same repo.
   >
   > Cluster pre-requisites we will need in place:
   >
   > - ingress-nginx controller
   > - metrics-server
   > - A default StorageClass with ReadWriteOnce support
   > - Registry access (GHCR public or a MoroHub-provided registry)
   > - A public hostname for the Ingress
   >
   > Would you please confirm these are available, and share the registry
   > URL + ingress hostname you'd like us to use?
   >
   > Looking forward to the session.

### At the meeting

1. Share your screen showing the running local POC first — shows them the
   app is real.
2. Hand them the repo URL and the `docs/MOROHUB_HANDOFF.md` guide.
3. Have them drive through **Act 0 → Act 8** while you take notes.
4. Use section 6 as a checklist of follow-up questions.

### After the meeting

1. Capture the artefacts MoroHub produced: kubeconfig, registry URL, final
   Ingress hostname.
2. Re-run the deployment yourself once, from your own laptop, against their
   cluster. If you can repeat it without their help, the handover is
   complete.
3. Decide on go / no-go based on the section 5 success criteria.

---

## Appendix A — Full file inventory to hand over

```
kubernetes-poc-nextjs/
├── README.md                       ← top-level tour
├── Dockerfile                      ← multi-stage build, Next.js standalone
├── docker-compose.yml              ← local verification
├── .env.example                    ← env var template
├── docs/
│   ├── DOCKER_GUIDE.md             ← dev workflow / ship changes
│   └── MOROHUB_HANDOFF.md          ← THIS document
├── src/                            ← Next.js app (App Router)
├── prisma/
│   ├── schema.prisma               ← User / Employee / AuditLog
│   └── seed.ts                     ← idempotent seed
├── k8s/
│   ├── 00-namespace.yaml
│   ├── 10-config.yaml              ← ConfigMap + two Secrets
│   ├── 20-postgres.yaml            ← StatefulSet + headless Service
│   ├── 30-migrate-job.yaml         ← db push + seed
│   ├── 40-web.yaml                 ← Deployment + ClusterIP Service
│   ├── 50-ingress.yaml             ← NGINX Ingress w/ cookie stickiness
│   ├── 60-hpa.yaml                 ← HorizontalPodAutoscaler
│   ├── 70-pdb.yaml                 ← PodDisruptionBudget
│   ├── 80-networkpolicy.yaml       ← Web ↔ Postgres ↔ Ingress policies
│   ├── kustomization.yaml          ← one place to bump the image tag
│   └── README.md                   ← K8s demo runbook
└── postgres-ha/
    └── values.yaml                 ← Bitnami postgresql-ha Helm values
```

## Appendix B — Credentials reference

| Environment | Variable | Demo value | Notes |
|-------------|----------|------------|-------|
| App | `AUTH_SECRET` | generated | Must be ≥32 bytes. Rotate before production. |
| App | `DATABASE_URL` | `postgresql://morohub:morohub@postgres-primary:5432/morohub` | In-cluster service name |
| Postgres | `POSTGRES_USER` | `morohub` | Rotate before production. |
| Postgres | `POSTGRES_PASSWORD` | `morohub` | Rotate before production. |
| Seed | Admin login | `admin@morohub.local` / `MoroHub@12345` | ADMIN role |
| Seed | Viewer login | `viewer@morohub.local` / `Viewer@12345` | USER role |
