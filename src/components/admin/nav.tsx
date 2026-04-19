import Link from "next/link";
import { signOutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function AdminNav({
  user,
}: {
  user: { name?: string | null; email?: string | null; role: string };
}) {
  return (
    <header className="border-b border-[var(--border)] bg-[var(--card)]">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-6">
          <Link href="/admin" className="font-semibold tracking-tight">
            MoroHub <span className="text-[var(--muted-foreground)]">· Admin</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            <Link
              href="/admin"
              className="px-3 py-1.5 rounded-md hover:bg-[var(--accent)]"
            >
              Dashboard
            </Link>
            <Link
              href="/admin/employees"
              className="px-3 py-1.5 rounded-md hover:bg-[var(--accent)]"
            >
              Employees
            </Link>
            <Link
              href="/admin/users"
              className="px-3 py-1.5 rounded-md hover:bg-[var(--accent)]"
            >
              Users
            </Link>
            <Link
              href="/admin/audit"
              className="px-3 py-1.5 rounded-md hover:bg-[var(--accent)]"
            >
              Audit log
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm hidden sm:block">
            <div className="font-medium">{user.name ?? user.email}</div>
            <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-2">
              {user.email}
              <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                {user.role}
              </Badge>
            </div>
          </div>
          <form action={signOutAction}>
            <Button variant="outline" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
