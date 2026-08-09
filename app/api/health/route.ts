import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Container/orchestrator liveness probe (Docker HEALTHCHECK, Dokploy, Traefik).
// Unauthenticated by necessity — so the body is deliberately opaque: an
// unhealthy database is signalled by the status code, never by an error string
// that would leak connection details to the public internet.

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
