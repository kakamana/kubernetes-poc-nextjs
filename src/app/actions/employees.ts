"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { employeeSchema } from "@/lib/validators";

export type EmployeeFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function toFields(formData: FormData) {
  return {
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    department: formData.get("department"),
    title: formData.get("title"),
    salary: formData.get("salary"),
    status: formData.get("status"),
  };
}

export async function createEmployee(
  _prev: EmployeeFormState,
  formData: FormData
): Promise<EmployeeFormState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Only admins can create employees" };
  }

  const parsed = employeeSchema.safeParse(toFields(formData));
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    const fieldErrors: Record<string, string> = {};
    for (const [k, v] of Object.entries(flat)) {
      if (v?.length) fieldErrors[k] = v[0]!;
    }
    return { error: "Fix the highlighted fields", fieldErrors };
  }

  try {
    const created = await prisma.employee.create({ data: parsed.data });
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "employee.create",
        target: created.id,
        metadata: { email: created.email },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/employees");
  redirect("/admin/employees");
}

export async function updateEmployee(
  id: string,
  _prev: EmployeeFormState,
  formData: FormData
): Promise<EmployeeFormState> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: "Only admins can update employees" };
  }

  const parsed = employeeSchema.safeParse(toFields(formData));
  if (!parsed.success) {
    const flat = parsed.error.flatten().fieldErrors;
    const fieldErrors: Record<string, string> = {};
    for (const [k, v] of Object.entries(flat)) {
      if (v?.length) fieldErrors[k] = v[0]!;
    }
    return { error: "Fix the highlighted fields", fieldErrors };
  }

  try {
    await prisma.employee.update({ where: { id }, data: parsed.data });
    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "employee.update",
        target: id,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/employees");
  redirect("/admin/employees");
}

export async function deleteEmployee(id: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new Error("forbidden");
  }
  await prisma.employee.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "employee.delete",
      target: id,
    },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/employees");
}
