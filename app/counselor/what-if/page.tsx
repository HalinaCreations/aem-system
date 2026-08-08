import { requireRole } from "@/lib/session";
import WhatIfSimulator from "@/components/counselor/what-if-simulator";
import PageHeader from "@/components/shell/page-header";

export default async function CounselorWhatIfPage() {
  await requireRole("COUNSELOR");
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        label="AI Literacy"
        title="What-If Simulator"
        description="Tweak hypothetical inputs and see how the risk engine reacts. No data is saved — this is a literacy tool for understanding how the score is computed."
      />
      <WhatIfSimulator />
    </div>
  );
}
