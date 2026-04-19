# MoroHub POC — Handoff Pack

Hi MoroHub team — thanks for hosting the Kubernetes-as-a-Service walk-through.

Everything you need is in this zip. There is **no source code** — the POC is
already packaged as a public container image.

## Container image

```
ghcr.io/kakamana/kubernetes-poc-nextjs:v0.1.0
```

- Hosted on **GitHub Container Registry** (public — no credentials required)
- Digest: `sha256:38afa2f811360041db53be19d35c9aa6bb4231518e7100dedc3e70789e5a6cda`
- Verify: `docker pull ghcr.io/kakamana/kubernetes-poc-nextjs:v0.1.0`

## What's in this zip

| Path | Purpose |
|------|---------|
| `k8s/` | Kustomize-based manifests — apply with `kubectl apply -k k8s/` |
| `k8s/README.md` | Demo runbook (Act-by-Act commands for the walk-through) |
| `postgres-ha/values.yaml` | Bitnami `postgresql-ha` Helm values for the active/passive demo |
| `DEPLOYMENT_GUIDE.docx` | **For the deploy engineer** — full release + deployment runbook |
| `DEPLOYMENT_GUIDE.md` | Same content in Markdown |
| `MOROHUB_HANDOFF.docx` | **For the walk-through session** — demo journey, checklist, questions |
| `MOROHUB_HANDOFF.md` | Same content in Markdown |
| `HANDOFF_README.md` | This file |

**Which document do I read first?**

- If you are **deploying**: open `DEPLOYMENT_GUIDE.docx` — step-by-step apply, verify, and operate.
- If you are **running the walk-through session with Kamran**: open `MOROHUB_HANDOFF.docx` — Act 0 → Act 8 demo script.

## One-command deploy

```bash
kubectl apply -k k8s/
kubectl -n morohub-poc wait --for=condition=Complete job/web-db-migrate --timeout=180s
kubectl -n morohub-poc wait --for=condition=Available deploy/web --timeout=180s
```

Then point your browser at the Ingress host set in `k8s/50-ingress.yaml` and
log in as `admin@morohub.local` / `MoroHub@12345`.

The walk-through proper starts at **Act 0** in `MOROHUB_HANDOFF.docx`
(section 4).

## Cluster prerequisites

- Kubernetes 1.27+
- `ingress-nginx` controller installed
- `metrics-server` add-on (required by the HPA)
- A default `StorageClass` that supports `ReadWriteOnce` PVCs
- Outbound egress to `ghcr.io` (to pull the image)

Please confirm these are in place before the session. Full details in
section 3.E of the handoff document.

## Point of contact

Muhammad Asad Kamran — asad@kamilinx.com
