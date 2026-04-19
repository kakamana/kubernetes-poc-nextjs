# Deployment & Release Guide — MoroHub Kubernetes Service

**Audience:** MoroHub hosting support / platform engineering team
**Application:** MoroHub Functional POC (Next.js 16 + PostgreSQL)
**Release:** `v0.1.0`
**Image:** `ghcr.io/kakamana/kubernetes-poc-nextjs:v0.1.0`
**Image digest:** `sha256:38afa2f811360041db53be19d35c9aa6bb4231518e7100dedc3e70789e5a6cda`
**Owner:** Muhammad Asad Kamran — asad@kamilinx.com

---

## 1. Release overview

This is a self-contained POC deployment pack. Everything the cluster needs is
either already in the container image (published on GitHub Container Registry,
public) or in the manifests shipped in this pack.

### What gets deployed

| Workload | Replicas | Resource request | Purpose |
|----------|---------:|------------------|---------|
| `web` Deployment | 3 | 100m CPU / 256Mi RAM each | Next.js app, behind a ClusterIP Service + Ingress |
| `postgres` StatefulSet | 1 | 100m CPU / 256Mi RAM | PostgreSQL 16, 5Gi PVC |
| `web-db-migrate` Job | 1 (one-shot) | 100m CPU / 256Mi RAM | Applies schema + seeds demo data |
| NGINX Ingress | — | — | Public entry point with cookie session affinity |
| HorizontalPodAutoscaler | — | — | Scales `web` 3→10 on CPU/memory |
| PodDisruptionBudget | — | — | Protects availability during voluntary disruptions |
| NetworkPolicies | — | — | Restrict Postgres to web, web to Ingress |

### Namespace

All objects live in the `morohub-poc` namespace, created by the manifests.

---

## 2. Cluster prerequisites

Please confirm the following before applying anything:

### Required

- [ ] **Kubernetes** 1.27 or newer
- [ ] **ingress-nginx** controller (`ingressClassName: nginx`). Other controllers may need annotation adjustments.
- [ ] **metrics-server** add-on installed and serving metrics (the HPA depends on it).
- [ ] A **default StorageClass** that provisions `ReadWriteOnce` volumes.
- [ ] **Outbound network egress** from nodes to `ghcr.io` (TCP 443) to pull the image.
- [ ] **kubectl** with cluster-admin or equivalent permissions for namespace creation, Deployments, StatefulSets, PVCs, Services, Ingress, HPA, PDB, NetworkPolicy.

### Optional but recommended

- [ ] **cert-manager** for TLS termination at the Ingress.
- [ ] **kustomize** ≥ 4.x (bundled with `kubectl` since 1.14, standalone binary preferred for the image-tag rewrite workflow).
- [ ] **helm** ≥ 3.x (only needed for the Postgres HA upgrade path in section 7).

### Quick pre-flight check

```bash
# kubectl can reach the cluster
kubectl version --short

# metrics-server is up
kubectl top nodes

# a StorageClass is marked default
kubectl get storageclass | grep -E "\(default\)|default"

# NGINX ingress controller is running
kubectl get pods -A | grep ingress-nginx

# the node can pull the image
docker pull ghcr.io/kakamana/kubernetes-poc-nextjs:v0.1.0
```

If any of these fail, fix them before moving to section 3.

---

## 3. Deployment steps

### 3.1 Unpack the handoff pack

The deployment pack you received contains:

```
morohub-poc-handoff/
├── HANDOFF_README.md
├── MOROHUB_HANDOFF.docx          ← walk-through / demo journey
├── MOROHUB_HANDOFF.md
├── DEPLOYMENT_GUIDE.docx         ← THIS document
├── DEPLOYMENT_GUIDE.md
├── k8s/                          ← Kustomize-managed manifests
│   ├── 00-namespace.yaml
│   ├── 10-config.yaml
│   ├── 20-postgres.yaml
│   ├── 30-migrate-job.yaml
│   ├── 40-web.yaml
│   ├── 50-ingress.yaml
│   ├── 60-hpa.yaml
│   ├── 70-pdb.yaml
│   ├── 80-networkpolicy.yaml
│   ├── kustomization.yaml
│   └── README.md                 ← demo runbook
└── postgres-ha/
    └── values.yaml               ← Bitnami postgresql-ha Helm values
```

Extract to any working directory:

```bash
unzip morohub-poc-handoff.zip
cd morohub-poc-handoff
```

### 3.2 Mandatory customisations

Make these edits **before** applying — they are environment-specific.

#### a) Set a real `AUTH_SECRET`

Generate a 32-byte secret:

```bash
openssl rand -base64 32
```

Edit `k8s/10-config.yaml` and replace the placeholder:

```yaml
# k8s/10-config.yaml
apiVersion: v1
kind: Secret
metadata:
  name: web-secrets
  namespace: morohub-poc
type: Opaque
stringData:
  AUTH_SECRET: "<paste the openssl output here>"
  DATABASE_URL: "postgresql://morohub:morohub@postgres-primary:5432/morohub?schema=public"
```

#### b) Rotate the PostgreSQL password (recommended)

In the same file:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: postgres-secrets
  namespace: morohub-poc
type: Opaque
stringData:
  POSTGRES_USER: "morohub"
  POSTGRES_PASSWORD: "<new-password>"
  POSTGRES_DB: "morohub"
```

If you change the password, the `DATABASE_URL` above must match.

#### c) Set the public hostname

Edit `k8s/50-ingress.yaml`:

```yaml
spec:
  ingressClassName: nginx
  rules:
    - host: morohub-poc.<your-domain>         # ← change this
```

If TLS is required, uncomment the `tls:` block and point at a `Secret`
managed by cert-manager or your DNS provider.

### 3.3 (Optional) Mirror the image into your own registry

If your cluster policy forbids pulling directly from `ghcr.io`, mirror the
image once and repoint the manifests:

```bash
docker pull ghcr.io/kakamana/kubernetes-poc-nextjs:v0.1.0
docker tag  ghcr.io/kakamana/kubernetes-poc-nextjs:v0.1.0 \
            <your-registry>/morohub-poc-nextjs:v0.1.0
docker push <your-registry>/morohub-poc-nextjs:v0.1.0

cd k8s
kustomize edit set image \
  ghcr.io/REPLACE_ME/kubernetes-poc-nextjs=<your-registry>/morohub-poc-nextjs:v0.1.0
cd ..
```

If the destination registry is private, also create an `imagePullSecret`:

```bash
kubectl create namespace morohub-poc
kubectl -n morohub-poc create secret docker-registry regcred \
  --docker-server=<your-registry> \
  --docker-username=<user> \
  --docker-password=<token>
```

Then add `imagePullSecrets: [{name: regcred}]` to the `spec.template.spec`
of `k8s/40-web.yaml` and `k8s/30-migrate-job.yaml`.

### 3.4 Apply the manifests

```bash
kubectl apply -k k8s/
```

You should see the namespace, secrets, statefulset, service, deployment,
ingress, HPA, PDB, and network policies all created.

### 3.5 Wait for readiness

The order matters: Postgres must be Ready before the migrate Job can run,
and the Job must Complete before the web Deployment's readiness probes will
pass.

```bash
# 1. Postgres reaches Ready
kubectl -n morohub-poc wait --for=condition=Ready pod \
  -l app.kubernetes.io/name=postgres --timeout=180s

# 2. Migrate Job completes (applies schema, seeds demo data)
kubectl -n morohub-poc wait --for=condition=Complete job/web-db-migrate \
  --timeout=180s

# 3. Web Deployment becomes Available
kubectl -n morohub-poc wait --for=condition=Available deploy/web \
  --timeout=180s
```

### 3.6 Smoke test

```bash
# Inside the cluster
kubectl -n morohub-poc run smoketest --rm -it --image=curlimages/curl -- \
  -s http://web/api/ready

# Expected response:
# {"status":"ready","db":"up","hostname":"web-...","nodeName":"...","namespace":"morohub-poc"}
```

From outside (once DNS is pointed at the Ingress):

```bash
curl -s https://morohub-poc.<your-domain>/api/health
curl -s https://morohub-poc.<your-domain>/api/ready
```

Open a browser at `https://morohub-poc.<your-domain>/` and log in:

- Admin account: `admin@morohub.local` / `MoroHub@12345`
- Viewer account: `viewer@morohub.local` / `Viewer@12345`

Rotate these after the demo.

---

## 4. Post-deployment verification checklist

| Check | Command | Expected |
|-------|---------|----------|
| Pods Ready | `kubectl -n morohub-poc get pods` | 3× `web` + 1× `postgres`, all `Running 1/1` |
| Pods spread | `kubectl -n morohub-poc get pods -o wide` | `web` pods on ≥2 different nodes |
| Services | `kubectl -n morohub-poc get svc` | `web` (ClusterIP), `postgres-primary` (headless) |
| Ingress | `kubectl -n morohub-poc get ingress web` | `ADDRESS` populated |
| HPA | `kubectl -n morohub-poc get hpa web` | `TARGETS` shows real numbers, not `<unknown>` |
| PDB | `kubectl -n morohub-poc get pdb` | `MINAVAILABLE 2`, `ALLOWED DISRUPTIONS 1` |
| DB reachable | `curl …/api/ready` | `"db":"up"` |

If any of these show `<unknown>`, `Pending`, or `CrashLoopBackOff`, jump to
section 10 (troubleshooting).

---

## 5. Day-2 operations

### 5.1 Reading logs

```bash
# All web pods, last 100 lines, follow
kubectl -n morohub-poc logs -l app.kubernetes.io/name=web --tail=100 -f

# Just one pod
kubectl -n morohub-poc logs <pod-name> -f

# Postgres
kubectl -n morohub-poc logs postgres-0 -f
```

### 5.2 Exec into a running pod

```bash
kubectl -n morohub-poc exec -it deploy/web -- sh
# From the shell: check env, run curl, inspect files
```

### 5.3 Inspecting the database

```bash
kubectl -n morohub-poc exec -it postgres-0 -- psql -U morohub -d morohub
```

Example queries:

```sql
\dt                           -- list tables
SELECT count(*) FROM "User";  -- should be 2 after seed
SELECT count(*) FROM "Employee";
SELECT * FROM "AuditLog" ORDER BY "createdAt" DESC LIMIT 10;
```

### 5.4 Manual scale

```bash
kubectl -n morohub-poc scale deploy/web --replicas=6
kubectl -n morohub-poc rollout status deploy/web
```

The HPA overrides `replicas` based on load — manual scaling is temporary.

### 5.5 Rolling restart (no downtime)

```bash
kubectl -n morohub-poc rollout restart deploy/web
kubectl -n morohub-poc rollout status deploy/web
```

Useful when you need to re-read a `ConfigMap` / `Secret` change.

### 5.6 Forcing a config reload

The pods read `ConfigMap` and `Secret` on start. If you change
`web-config` or `web-secrets`, run step 5.5 so pods pick up new values.

---

## 6. Upgrading the application (new release)

This is the procedure when Kamran hands you a new image tag (e.g. `v0.2.0`).

```bash
# 1. Rewrite the image tag once
cd k8s
kustomize edit set image \
  ghcr.io/REPLACE_ME/kubernetes-poc-nextjs=ghcr.io/kakamana/kubernetes-poc-nextjs:v0.2.0
cd ..

# 2. Apply
kubectl apply -k k8s/

# 3. Watch the rollout
kubectl -n morohub-poc rollout status deploy/web --timeout=180s

# If anything is wrong, roll back immediately
kubectl -n morohub-poc rollout undo deploy/web
```

Database schema changes (if any) will come packaged with the new image. For
this POC, schema is applied idempotently via `prisma db push`; re-run the
Job if Kamran indicates a schema change:

```bash
kubectl -n morohub-poc delete job web-db-migrate
kubectl apply -k k8s/
```

---

## 7. Postgres active/passive HA (upgrade from single-instance)

The single-instance `StatefulSet` shipped in section 3 is suitable for
demos. For production, upgrade to the Bitnami `postgresql-ha` chart using
the supplied values file.

### 7.1 Install the chart

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

helm upgrade --install postgres-ha bitnami/postgresql-ha \
  --namespace morohub-poc --create-namespace \
  -f postgres-ha/values.yaml
```

This deploys:
- 3 PostgreSQL nodes (1 primary, 2 standby) managed by `repmgr`
- 2 Pgpool pods fronting the cluster (connection pooling + failover routing)

### 7.2 Repoint the app at Pgpool

```bash
kubectl -n morohub-poc patch secret web-secrets --type=merge -p \
  '{"stringData":{"DATABASE_URL":"postgresql://morohub:<password>@postgres-ha-pgpool:5432/morohub?schema=public"}}'
kubectl -n morohub-poc rollout restart deploy/web
```

(The `<password>` must match `global.postgresql.password` in
`postgres-ha/values.yaml`.)

### 7.3 Retire the single-instance StatefulSet (optional)

After migrating data (manual `pg_dump` / `pg_restore`):

```bash
kubectl -n morohub-poc delete statefulset postgres
kubectl -n morohub-poc delete pvc data-postgres-0
```

### 7.4 Failover demo (Day-2)

```bash
# Kill the current primary
kubectl -n morohub-poc delete pod postgres-ha-postgresql-0

# Watch repmgr promote a replica
kubectl -n morohub-poc get pods -w

# App recovery
curl -s https://morohub-poc.<your-domain>/api/ready    # "db":"up" within ~15s
```

---

## 8. Teardown

### Soft (keep PVCs so data survives)

```bash
kubectl delete -k k8s/
```

### Hard (delete everything including data)

```bash
kubectl delete -k k8s/
kubectl delete namespace morohub-poc        # removes PVCs too
helm uninstall -n morohub-poc postgres-ha   # if installed
```

### Cleanup image (tenant side, optional)

If the image was mirrored to your registry, delete the tag following your
registry's normal process. The source image at GHCR is owned by Kamran.

---

## 9. Security notes

- **Secrets** in `k8s/10-config.yaml` ship as `stringData` for ease of
  demo. Production deployments should use Sealed Secrets, External Secrets
  Operator, or the equivalent MoroHub integration.
- **Network policies** in `k8s/80-networkpolicy.yaml` restrict Postgres to
  pods labelled `app.kubernetes.io/name=web`. Adjust the Ingress policy if
  your ingress controller lives in a namespace not labelled
  `kubernetes.io/metadata.name=ingress-nginx`.
- **Container runs as non-root** (UID 1001, readOnly filesystem disabled
  only to allow Next.js' `.next/cache`). Capabilities dropped: `ALL`.
- **AUTH_SECRET** is the signing key for session JWTs — rotating it will
  force all users to re-authenticate.

---

## 10. Troubleshooting matrix

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| `web` pods `CrashLoopBackOff` | Missing `AUTH_SECRET` or bad `DATABASE_URL` | `kubectl -n morohub-poc logs` — confirm both are set in `web-secrets`; `kubectl rollout restart` |
| `web` pods `NotReady` but not crashing | Postgres unreachable — readiness probe `/api/ready` fails | Check `postgres-0` status; `kubectl exec` into web and `nslookup postgres-primary` |
| `web-db-migrate` Job `Failed` | Postgres not yet ready when Job ran | `kubectl delete job web-db-migrate && kubectl apply -k k8s/` |
| HPA `TARGETS: <unknown>` | `metrics-server` missing | `kubectl get apiservices v1beta1.metrics.k8s.io` — reinstall metrics-server if missing |
| Ingress `ADDRESS` empty | No LoadBalancer for ingress-nginx | Verify the controller's Service type; check MoroHub's ingress documentation |
| 503 on every page | All pods failing readiness | `kubectl describe pod …` for probe failure reason |
| `ImagePullBackOff` | Can't reach `ghcr.io` or mirror is private | Confirm egress to `ghcr.io`; add `imagePullSecret` if using a private mirror |
| PVC `Pending` | No default StorageClass | `kubectl annotate sc <name> storageclass.kubernetes.io/is-default-class=true` |
| DB connections exhaust | App pod count × connection pool > Postgres `max_connections` | Use Pgpool (section 7); reduce app replicas; raise `max_connections` |

Collect diagnostics in one shot:

```bash
kubectl -n morohub-poc get all,ingress,hpa,pdb,networkpolicy
kubectl -n morohub-poc describe deploy/web
kubectl -n morohub-poc describe statefulset/postgres
kubectl -n morohub-poc logs -l app.kubernetes.io/name=web --tail=200 > web.log
kubectl -n morohub-poc logs postgres-0 --tail=200 > postgres.log
```

Send `web.log`, `postgres.log`, and the `describe` output to the owner
(asad@kamilinx.com) for remote diagnosis.

---

## 11. Sign-off checklist (deploy engineer)

Complete before handing back to the tenant:

- [ ] All pods Ready in `morohub-poc` namespace
- [ ] Public URL resolves to the Ingress and returns HTTP 200 on `/api/health`
- [ ] Login flow works with the seeded admin account
- [ ] HPA `TARGETS` shows numbers, not `<unknown>`
- [ ] `AUTH_SECRET` and Postgres password changed from the shipped defaults
- [ ] TLS in place (if required)
- [ ] Backup/observability integrations documented in the tenant's runbook
- [ ] Diagnostics bundle stored for reference

---

## 12. Support contact

**Application owner:** Muhammad Asad Kamran
**Email:** asad@kamilinx.com
**Repository (source):** https://github.com/kakamana/kubernetes-poc-nextjs
**Registry (image):** https://github.com/users/kakamana/packages/container/package/kubernetes-poc-nextjs

When escalating, include:
- The release tag (e.g. `v0.1.0`)
- The image digest from `kubectl -n morohub-poc describe deploy/web`
- The diagnostics bundle from section 10
- A summary of what changed before the issue appeared (upgrade? scale event? config change?)
