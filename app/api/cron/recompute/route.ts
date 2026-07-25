import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { runRiskEngine } from "@/lib/risk/run-engine";

// Scheduled risk recompute (spec §15 week 7 / Phase 4 deferral).
//
// Auth is a shared secret, not a session — there is no user behind a cron tick.
// `proxy.ts` lets /api/cron through precisely because this handler does its own
// check; if CRON_SECRET is unset the endpoint refuses to run rather than
// defaulting open, so a missing env var can never turn this into an
// unauthenticated "recompute everything" button.
//
// Invoke from any scheduler, e.g. daily at 02:00:
//   0 2 * * *  curl -fsS -X POST http://localhost:3010/api/cron/recompute \
//                -H "Authorization: Bearer $CRON_SECRET"

export const dynamic = "force-dynamic";

function unauthorized() {
  return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
}

async function handle(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured; scheduled recompute is disabled." },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!presented || presented !== secret) return unauthorized();

  // Scheduled runs always target the active year — a schedule that silently
  // recomputed a historical year would rewrite settled records.
  const sy = await prisma.schoolYear.findFirst({ where: { isActive: true } });
  if (!sy) {
    return NextResponse.json({ ok: false, error: "No active school year." }, { status: 409 });
  }

  const run = await runRiskEngine({
    schoolYearId: sy.id,
    actorUserId: null, // unattended — see RunEngineOptions
    trigger: "scheduled",
  });

  if (!run.ok) return NextResponse.json({ ok: false, error: run.error }, { status: 409 });

  return NextResponse.json({
    ok: true,
    schoolYear: sy.label,
    ...run.result,
  });
}

export async function POST(request: NextRequest) {
  return handle(request);
}

// Some schedulers (including Vercel Cron) issue GET. Same guard either way.
export async function GET(request: NextRequest) {
  return handle(request);
}
