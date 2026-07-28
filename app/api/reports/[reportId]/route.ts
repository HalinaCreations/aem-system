import { NextResponse, type NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { getActiveSchoolYear } from "@/lib/active-year";
import { getReport } from "@/lib/reports/registry";
import { reportFilename, toCsv } from "@/lib/reports/csv";

// CSV download endpoint. Authorisation is checked twice on purpose: the role
// list decides whether this caller may run the report at all, and the report's
// own generator scopes the rows (a teacher gets their sections). Neither check
// lives in the page — a link is not a permission.

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> },
) {
  const session = await requireSession();
  const { reportId } = await params;

  const report = getReport(reportId);
  if (!report) {
    return NextResponse.json({ ok: false, error: "Unknown report." }, { status: 404 });
  }
  if (!report.roles.includes(session.user.role)) {
    return NextResponse.json({ ok: false, error: "Not available for your role." }, { status: 403 });
  }

  const sy = await getActiveSchoolYear();
  if (!sy) {
    return NextResponse.json({ ok: false, error: "No active school year." }, { status: 409 });
  }

  const payload = await report.generate({
    schoolYearId: sy.id,
    schoolYearLabel: sy.label,
    caller: { id: session.user.id, role: session.user.role },
  });

  const csv = toCsv(payload.header, payload.rows);
  const filename = reportFilename(report.id, sy.label);

  // Exports leave the audited UI behind, so the export itself is the audit
  // event: who took what data out, when, and how many rows.
  await logAudit({
    action: "REPORT_EXPORTED",
    userId: session.user.id,
    resourceType: "Report",
    resourceId: report.id,
    metadata: {
      reportId: report.id,
      schoolYearId: sy.id,
      schoolYearLabel: sy.label,
      rowCount: payload.rows.length,
      role: session.user.role,
    },
  });

  // Leading BOM so Excel reads the file as UTF-8 — without it, names carrying
  // ñ or é open as mojibake, which matters for a Philippine student roster.
  return new NextResponse(`﻿${csv}`, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
