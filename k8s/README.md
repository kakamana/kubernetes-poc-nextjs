# MoroHub POC — Kubernetes runbook

This folder contains everything you need to deploy the Next.js + PostgreSQL
POC to a MoroHub-hosted Kubernetes cluster and demonstrate the
Day-1 / Day-2 operations requested for the meeting.

## Pre-requisites on the cluster

| Requirement | Why |
|-------------|-----|
| `ingress-nginx` controller | Session stickiness + public entrypoint |
| `metrics-server` | Required by the HPA |
| A default `StorageClass` | For `StatefulSet` PVCs |
| (Optional) `cert-manager` | TLS termination at the Ingress |

## One-shot deploy (single-instance Postgres path)

```bash
# 1. Build + push the container image (CI normally does this)
IMAGE=ghcr.io/<your-org>/kubernetes-poc-nextjs:v0.1.0
docker build -t $IMAGE .
docker push $IMAGE

# 2. Point the manifests at your image
cd k8s
kustomize edit set image ghcr.io/REPLACE_ME/kubernetes-poc-nextjs=$IMAGE

# 3. Apply
kubectl apply -k .

# 4. Wait, then seed the DB
kubectl -n morohub-poc wait --for=condition=Ready pod -l app.kubernetes.io/name=postgres --timeout=180s
kubectl -n morohub-poc wait --for=condition=Complete job/web-db-migrate --timeout=180s
kubectl -n morohub-poc wait --for=condition=Available deploy/web --timeout=180s

# 5. Point your browser at the Ingress host (update k8s/50-ingress.yaml first)
```

Seeded login: `admin@morohub.local` / `MoroHub@12345`.

## Demo cheatsheet

### 1. See every pod and where it lives

```bash
kubectl -n morohub-poc get pods -o wide
kubectl -n morohub-poc get svc,ingress,hpa,pdb
```

### 2. Load balancing + session stickiness

Every request surfaces the pod hostname on the admin page banner.

```bash
# Round-robin (stickiness disabled): each hit lands on a different pod
for i in $(seq 1 10); do curl -s https://<ingress-host>/api/health | jq -r .hostname; done

# Turn stickiness OFF to prove it
kubectl -n morohub-poc annotate ingress web \
  nginx.ingress.kubernetes.io/affinity- --overwrite

# Turn stickiness BACK ON
kubectl -n morohub-poc annotate ingress web \
  nginx.ingress.kubernetes.io/affinity=cookie --overwrite
```

With stickiness on, the browser session keeps hitting the same pod because
the cookie `morohub-affinity` is set by the ingress.

### 3. Rolling update with zero downtime

```bash
# Bump the image
kubectl -n morohub-poc set image deploy/web web=ghcr.io/<org>/kubernetes-poc-nextjs:v0.2.0
kubectl -n morohub-poc rollout status deploy/web

# Confirm no 5xx during the roll (run from another shell)
while true; do curl -s -o /dev/null -w "%{http_code}\n" https://<ingress-host>/; sleep 0.5; done
```

The Deployment uses `maxUnavailable: 0`, readiness probes, and a `preStop`
sleep so in-flight requests drain before a pod exits.

### 4. Scale in / scale out

```bash
# Manual
kubectl -n morohub-poc scale deploy/web --replicas=6

# Automatic (CPU-driven) — load test to trigger the HPA
kubectl -n morohub-poc run hey --rm -it --image=williamyeh/hey -- \
  -z 2m -c 50 http://web.morohub-poc.svc.cluster.local/

kubectl -n morohub-poc get hpa web -w
```

### 5. Business continuity — kill a pod

```bash
POD=$(kubectl -n morohub-poc get pod -l app.kubernetes.io/name=web -o name | head -1)
kubectl -n morohub-poc delete $POD
# Refresh the browser — the next request is served by a surviving pod.
# The PDB (`minAvailable: 2`) prevents node drains from taking more than one
# pod offline at a time.
```

### 6. Node drain (DR rehearsal)

```bash
NODE=$(kubectl get pod -l app.kubernetes.io/name=web -n morohub-poc -o jsonpath='{.items[0].spec.nodeName}')
kubectl drain $NODE --ignore-daemonsets --delete-emptydir-data
# PDB refuses to evict the final 2 pods until replacements are Ready on another node.
kubectl uncordon $NODE
```

### 7. Postgres active/passive HA (Bitnami chart)

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update
helm upgrade --install postgres-ha bitnami/postgresql-ha \
  --namespace morohub-poc --create-namespace \
  -f ../postgres-ha/values.yaml

# Repoint the app at pgpool
kubectl -n morohub-poc patch secret web-secrets --type=merge -p '{"stringData":{"DATABASE_URL":"postgresql://morohub:<password>@postgres-ha-pgpool:5432/morohub?schema=public"}}'
kubectl -n morohub-poc rollout restart deploy/web

# Failover demo: kill the primary, repmgr promotes a replica automatically
kubectl -n morohub-poc delete pod postgres-ha-postgresql-0
kubectl -n morohub-poc get pods -w
```

## Troubleshooting

| Symptom | What to check |
|---------|---------------|
| App pods CrashLoopBackOff | `kubectl logs` — usually DB unreachable or missing `AUTH_SECRET` |
| `readiness` failing | `kubectl exec ... -- curl localhost:3000/api/ready` — returns DB error |
| HPA stuck at minReplicas | `kubectl top pods` / metrics-server installed? |
| Ingress 404 | `ingressClassName: nginx` matches the controller's class? |
| PVC Pending | Default StorageClass set on the cluster? |
