import { requireRole } from "@/lib/session";
import { getActiveSchoolYear } from "@/lib/active-year";
import {
  getPendingApprovals,
  getApprovedInterventionsForPrincipal,
} from "@/lib/intervention/queries";
import ApprovalsHubView from "@/components/roles/principal/approvals-hub-view";

export default async function PrincipalApprovalsPage() {
  await requireRole("PRINCIPAL");
  const sy = await getActiveSchoolYear();
  if (!sy) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
        No active school year.
      </div>
    );
  }

  const [pending, approved] = await Promise.all([
    getPendingApprovals(sy.id),
    getApprovedInterventionsForPrincipal(sy.id),
  ]);

  return <ApprovalsHubView syLabel={sy.label} pending={pending} approved={approved} />;
}
