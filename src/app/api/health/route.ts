import { NextResponse } from "next/server";
import { podInfo } from "@/lib/pod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ status: "ok", ...podInfo() });
}
