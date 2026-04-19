import Link from "next/link";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [
    totalEmployees,
    activeEmployees,
    onLeave,
    terminated,
    totalSalary,
    recentAudit,
  ] = await Promise.all([
    prisma.employee.count(),
    prisma.employee.count({ where: { status: "ACTIVE" } }),
    prisma.employee.count({ where: { status: "ON_LEAVE" } }),
    prisma.employee.count({ where: { status: "TERMINATED" } }),
    prisma.employee.aggregate({
      _sum: { salary: true },
      where: { status: "ACTIVE" },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const stats = [
    { label: "Employees", value: totalEmployees },
    { label: "Active", value: activeEmployees, variant: "success" as const },
    { label: "On leave", value: onLeave, variant: "warning" as const },
    { label: "Terminated", value: terminated, variant: "destructive" as const },
  ];

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Live data served from Postgres through this pod.
          </p>
        </div>
        <Link
          href="/admin/employees/new"
          className="text-sm font-medium underline-offset-4 hover:underline"
        >
          + Add employee
        </Link>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardDescription>{s.label}</CardDescription>
              <CardTitle className="text-3xl">{s.value}</CardTitle>
            </CardHeader>
            <CardContent>
              {s.variant ? (
                <Badge variant={s.variant}>{s.label}</Badge>
              ) : (
                <Badge variant="outline">Total headcount</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Active payroll</CardTitle>
            <CardDescription>
              Sum of salaries for employees currently in the ACTIVE state.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-semibold">
              {formatCurrency(totalSalary._sum.salary ?? 0)}
            </div>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              Numbers refresh every request — reload the page to watch the
              ingress route you to a different pod (when stickiness is off) or
              stay pinned (when sticky sessions are enabled).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent audit log</CardTitle>
            <CardDescription>Last 5 admin actions</CardDescription>
          </CardHeader>
          <CardContent>
            {recentAudit.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                No events yet. Create or update an employee.
              </p>
            ) : (
              <ul className="space-y-2 text-sm">
                {recentAudit.map((log) => (
                  <li
                    key={log.id}
                    className="flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="font-medium">{log.action}</div>
                      <div className="text-xs text-[var(--muted-foreground)] font-mono">
                        {log.target}
                      </div>
                    </div>
                    <div className="text-xs text-[var(--muted-foreground)]">
                      {new Date(log.createdAt).toLocaleString()}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
