import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteEmployeeButton } from "@/components/admin/delete-employee-button";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const statusVariant = {
  ACTIVE: "success",
  ON_LEAVE: "warning",
  TERMINATED: "destructive",
} as const;

export default async function EmployeesPage() {
  const session = await auth();
  const isAdmin = session?.user?.role === "ADMIN";
  const employees = await prisma.employee.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Employees</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            {employees.length} records stored in PostgreSQL.
          </p>
        </div>
        {isAdmin ? (
          <Button asChild>
            <Link href="/admin/employees/new">+ Add employee</Link>
          </Button>
        ) : (
          <Badge variant="secondary">Read-only (USER role)</Badge>
        )}
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--card)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Salary</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.fullName}</TableCell>
                <TableCell className="font-mono text-xs">{e.email}</TableCell>
                <TableCell>{e.department}</TableCell>
                <TableCell>{e.title}</TableCell>
                <TableCell>{formatCurrency(e.salary)}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[e.status]}>
                    {e.status.replace("_", " ")}
                  </Badge>
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right space-x-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/admin/employees/${e.id}`}>Edit</Link>
                    </Button>
                    <DeleteEmployeeButton id={e.id} />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
