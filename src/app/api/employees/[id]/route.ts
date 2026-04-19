import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { employeeSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await req.json();
  const parsed = employeeSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const updated = await prisma.employee.update({
    where: { id },
    data: parsed.data,
  });
  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "employee.update",
      target: id,
    },
  });
  return NextResponse.json({ employee: updated });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.employee.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "employee.delete",
      target: id,
    },
  });
  return NextResponse.json({ ok: true });
}
