# Email to MoroHub Team — copy / paste ready

Below is a ready-to-send email for the MoroHub hosting team. Copy the
**Subject** line and the body between the rulers into your mail client.

---

## Subject

MoroHub Kubernetes-as-a-Service walk-through — handoff pack and cluster prerequisites

---

## Body

Hello MoroHub team,

Thank you for agreeing to host a walk-through session for your
Kubernetes-as-a-Service offering. To make the most of our time together, we
have prepared a self-contained functional POC that exercises the scenarios
we want to evaluate.

**Attached to this email:**

- `morohub-poc-handoff.zip` — the complete handoff pack, containing:
  - `DEPLOYMENT_GUIDE.docx` / `.md` — step-by-step deployment and operations
    runbook for your deploy engineer.
  - `MOROHUB_HANDOFF.docx` / `.md` — the walk-through script we would like
    your team to drive during the session (Act 0 through Act 8, roughly 45
    minutes).
  - `k8s/` — Kustomize-managed Kubernetes manifests (Namespace, ConfigMap,
    Secrets, StatefulSet, Deployment, Service, Ingress, HPA, PDB,
    NetworkPolicies, one-shot migrate Job).
  - `postgres-ha/values.yaml` — Bitnami `postgresql-ha` Helm values for the
    active/passive PostgreSQL HA demo.
  - `HANDOFF_README.md` — a two-minute orientation for the pack.

**Container image (public, no credentials required):**

`ghcr.io/kakamana/kubernetes-poc-nextjs:v0.1.0`

It is hosted on the public GitHub Container Registry. You can verify
connectivity with:

    docker pull ghcr.io/kakamana/kubernetes-poc-nextjs:v0.1.0

Image digest for audit purposes:
`sha256:38afa2f811360041db53be19d35c9aa6bb4231518e7100dedc3e70789e5a6cda`

---

### What we are asking you to walk us through

The POC is designed to let your team demonstrate, end-to-end on your
platform:

1. Containerisation and pulling from a public image registry.
2. Deployment via `kubectl apply -k k8s/`.
3. Pod administration — logs, exec, scale, restart.
4. Load balancing with NGINX Ingress, including **cookie-based session
   stickiness** (and how to toggle it off for round-robin behaviour).
5. **High availability** across nodes via pod anti-affinity and multiple
   replicas.
6. **Business continuity / DR** when a pod is killed or a node is drained,
   protected by a PodDisruptionBudget.
7. **Horizontal scale in / scale out** via the HorizontalPodAutoscaler under
   synthetic load.
8. **PostgreSQL active / passive HA** using the Bitnami `postgresql-ha`
   Helm chart, including a primary failover demo.

The detailed Act-by-Act script is in `MOROHUB_HANDOFF.docx` section 4.

---

### Cluster prerequisites we will need in place

Please confirm the following are available on the cluster you will use for
the session:

- Kubernetes 1.27 or newer.
- `ingress-nginx` controller installed (the stickiness annotations in the
  Ingress manifest are NGINX-specific; if you use a different controller
  please let us know so we can adapt).
- `metrics-server` add-on (required by the HorizontalPodAutoscaler).
- A default `StorageClass` that provisions `ReadWriteOnce` persistent
  volumes (for the PostgreSQL StatefulSet).
- Outbound network egress from worker nodes to `ghcr.io` on TCP 443 to pull
  the container image. If this is blocked, please let us know and we can
  mirror the image to a registry you specify.
- A public hostname for the Ingress. Either one you provision under your
  domain, or please advise the pattern you would like us to use and we
  will update `k8s/50-ingress.yaml` before the session.
- `helm` 3.x available for the PostgreSQL HA portion (Act 8).

---

### Logistics

- **Session length:** please allow approximately 60 minutes (45 minutes
  demo + 15 minutes Q&A).
- **Format:** screen-share from your side would work best, with your
  engineer driving `kubectl`.
- **Pre-session:** our deploy engineer can do a dry run on the cluster
  ahead of the meeting if that is useful — just let us know a window.
- **Post-session:** we will take away your feedback on our manifests, plus
  any additions needed to meet your platform's requirements.

---

### Questions we will ask during the session

For context, we intend to cover the following topics in the Q&A at the
end, so your team may wish to prepare answers:

- Backup and restore strategy for the persistent volumes (RTO / RPO).
- Observability pipelines available to tenants (metrics, logs, traces).
- Secrets management integration options (Vault, Sealed Secrets, KMS).
- WAF / DDoS posture in front of the Ingress.
- Node and control-plane upgrade process, maintenance windows.
- Tenant billing unit and quota defaults.
- Multi-AZ / multi-region posture and cross-region DR options.
- SLA for the control plane and for tenant workloads.

---

### Primary contact

For any pre-meeting questions, image or manifest clarifications, or to
schedule a dry run:

**Muhammad Asad Kamran**
Email: asad@kamilinx.com

We are looking forward to the session and to a productive evaluation of
your platform.

Kind regards,
Muhammad Asad Kamran

---

## Attaching the file

When sending:

1. Attach `morohub-poc-handoff.zip` (approx. 110 KB) from the project root.
2. Double-check the `Subject` line matches.
3. CC anyone on your team who should be in the loop.
