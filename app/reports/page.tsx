import { requireSession } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import { reportsForRole } from "@/lib/reports/registry";
import PageHeader from "@/components/shell/page-header";

export default async function ReportsPage() {
  const session = await requireSession();
  const sy = await getActiveSchoolYear();
  const reports = reportsForRole(session.user.role);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        label="Data Export"
        title="Reports"
        description={
          <>
            <p>
              Downloads as CSV, ready to open in a spreadsheet. Each report covers{" "}
              <span className="font-semibold text-slate-800">{sy?.label ?? "the active school year"}</span>{" "}
              and reflects the data as it stands right now.
            </p>
            <p className="mt-2 text-xs leading-relaxed text-slate-400">
              Every export is recorded in the audit log — who exported what, and how many rows — because
              a downloaded file leaves the system&apos;s access controls behind. Reports never include
              counseling notes, SEL narrative, or intervention rationale.
            </p>
          </>
        }
      />

      {!sy ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No active school year, so there is nothing to report on yet.
        </p>
      ) : reports.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No reports are available for your role.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {reports.map((r) => {
            const note = r.scopeNote?.(session.user.role) ?? null;
            return (
              <li key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-slate-900">{r.label}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600">{r.description}</p>
                    {note && (
                      <p className="mt-2 inline-block rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">
                        {note}
                      </p>
                    )}
                  </div>
                  <a
                    href={`/api/reports/${r.id}`}
                    className="shrink-0 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:bg-slate-800"
                  >
                    Download CSV
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
