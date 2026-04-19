import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createEmployee } from "@/app/actions/employees";
import { EmployeeForm } from "@/components/admin/employee-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function NewEmployeePage() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    redirect("/admin/employees");
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Add employee</CardTitle>
          <CardDescription>
            Validated server-side with Zod, persisted in PostgreSQL.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmployeeForm action={createEmployee} submitLabel="Create employee" />
        </CardContent>
      </Card>
    </main>
  );
}
