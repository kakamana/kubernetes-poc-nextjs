import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { podInfo } from "@/lib/pod";

export default async function Home() {
  const session = await auth();
  const pod = podInfo();

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-6 py-16">
      <div className="max-w-2xl text-center space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--muted)] px-3 py-1 text-xs uppercase tracking-widest text-[var(--muted-foreground)]">
          MoroHub Functional POC
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight">
          Next.js + PostgreSQL on Kubernetes
        </h1>
        <p className="text-[var(--muted-foreground)] text-lg">
          A mid-range reference application built to showcase MoroHub&apos;s
          Kubernetes-as-a-Service offering: authentication, Postgres-backed
          administration, session stickiness, horizontal scaling, pod
          disruption budgets, and active/passive database HA.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          {session?.user ? (
            <Button asChild size="lg">
              <Link href="/admin">Go to admin console</Link>
            </Button>
          ) : (
            <Button asChild size="lg">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
          <Button variant="outline" size="lg" asChild>
            <a href="/api/health" target="_blank" rel="noreferrer">
              Health endpoint
            </a>
          </Button>
        </div>
        <div className="mt-10 text-xs text-[var(--muted-foreground)] font-mono">
          Served by pod <span className="font-semibold">{pod.hostname}</span>
          {pod.nodeName ? <> on node {pod.nodeName}</> : null}
        </div>
      </div>
    </main>
  );
}
