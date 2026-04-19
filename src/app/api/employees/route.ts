import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { employeeSchema } from "@/lib/validators";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const employees = await prisma.employee.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ employees });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = await req.json();
  const parsed = employeeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const created = await prisma.employee.create({ data: parsed.data });
  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "employee.create",
      target: created.id,
      metadata: { email: created.email },
    },
  });
  return NextResponse.json({ employee: created }, { status: 201 });
}
