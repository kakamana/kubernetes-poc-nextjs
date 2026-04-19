import { podInfo } from "@/lib/pod";

export function PodBanner() {
  const pod = podInfo();
  return (
    <div className="border-b border-dashed border-[var(--border)] bg-[var(--muted)] text-xs font-mono text-[var(--muted-foreground)]">
      <div className="mx-auto max-w-7xl px-6 py-2 flex flex-wrap items-center gap-x-6 gap-y-1">
        <span>
          <span className="uppercase tracking-wider text-[10px] text-[var(--muted-foreground)] mr-1">
            pod
          </span>
          <span className="text-[var(--foreground)]">{pod.hostname}</span>
        </span>
        {pod.nodeName ? (
          <span>
            <span className="uppercase tracking-wider text-[10px] mr-1">node</span>
            <span className="text-[var(--foreground)]">{pod.nodeName}</span>
          </span>
        ) : null}
        {pod.podIP ? (
          <span>
            <span className="uppercase tracking-wider text-[10px] mr-1">ip</span>
            <span className="text-[var(--foreground)]">{pod.podIP}</span>
          </span>
        ) : null}
        {pod.namespace ? (
          <span>
            <span className="uppercase tracking-wider text-[10px] mr-1">ns</span>
            <span className="text-[var(--foreground)]">{pod.namespace}</span>
          </span>
        ) : null}
        <span className="ml-auto">
          refresh to confirm load-balancer routing / session stickiness
        </span>
      </div>
    </div>
  );
}
