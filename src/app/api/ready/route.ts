import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { podInfo } from "@/lib/pod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ready", db: "up", ...podInfo() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown db error";
    return NextResponse.json(
      { status: "not-ready", db: "down", error: message, ...podInfo() },
      { status: 503 }
    );
  }
}
