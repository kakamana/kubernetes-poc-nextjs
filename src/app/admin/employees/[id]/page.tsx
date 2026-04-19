import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateEmployee } from "@/app/actions/employees";
import { EmployeeForm } from "@/components/admin/employee-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    redirect("/admin/employees");
  }

  const { id } = await params;
  const employee = await prisma.employee.findUnique({ where: { id } });
  if (!employee) notFound();

  const action = updateEmployee.bind(null, id);

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Edit {employee.fullName}</CardTitle>
          <CardDescription>Update the employee record.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeeForm
            action={action}
            defaults={{
              fullName: employee.fullName,
              email: employee.email,
              department: employee.department,
              title: employee.title,
              salary: employee.salary,
              status: employee.status,
            }}
            submitLabel="Save changes"
          />
        </CardContent>
      </Card>
    </main>
  );
}
