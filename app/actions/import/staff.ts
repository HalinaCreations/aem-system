"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { parseCsv } from "@/lib/import/csv";
import { checkCsvLimits } from "@/lib/import/limits";
import { validateStaffCsv, type StaffRow } from "@/lib/import/staff";

/** Applied when a row leaves the password column blank. Dev/demo only. */
const DEFAULT_STAFF_PASSWORD = "aem2026";
const BCRYPT_COST = 10;

export type StaffPreview =
  | {
      ok: true;
      total: number;
      validCount: number;
      invalidCount: number;
      previewRows: Array<{ row: number; data: StaffRow }>;
      errors: Array<{ row: number; messages: string[]; raw: Record<string, string> }>;
    }
  | { ok: false; error: string };

const input = z.object({
  schoolYearId: z.string().min(1),
  csv: z.string().min(1),
});

export async function previewStaffAction(formData: FormData): Promise<StaffPreview> {
  await requireRole("ADMIN");

  const parsed = input.safeParse({
    schoolYearId: formData.get("schoolYearId"),
    csv: formData.get("csv"),
  });
  if (!parsed.success) return { ok: false, error: "Missing school year or CSV." };

  const limitErr = checkCsvLimits(parsed.data.csv);
  if (limitErr) return limitErr;

  let parsedCsv;
  try {
    parsedCsv = parseCsv(parsed.data.csv);
  } catch (err) {
    return { ok: false, error: `CSV parse failed: ${(err as Error).message}` };
  }

  const result = validateStaffCsv(parsedCsv);

  return {
    ok: true,
    total: result.total,
    validCount: result.valid.length,
    invalidCount: result.invalid.length,
    previewRows: result.valid.slice(0, 20).map((r) => ({ row: r.row, data: r.data })),
    errors: result.invalid.map((r) => ({ row: r.row, messages: r.errors, raw: r.raw })),
  };
}

export type StaffCommit =
  | { ok: true; created: number; updated: number }
  | { ok: false; error: string };

export async function commitStaffAction(formData: FormData): Promise<StaffCommit> {
  const session = await requireRole("ADMIN");

  const parsed = input.safeParse({
    schoolYearId: formData.get("schoolYearId"),
    csv: formData.get("csv"),
  });
  if (!parsed.success) return { ok: false, error: "Missing school year or CSV." };

  const limitErr = checkCsvLimits(parsed.data.csv);
  if (limitErr) return limitErr;

  let parsedCsv;
  try {
    parsedCsv = parseCsv(parsed.data.csv);
  } catch (err) {
    return { ok: false, error: `CSV parse failed: ${(err as Error).message}` };
  }

  const validation = validateStaffCsv(parsedCsv);
  if (validation.invalid.length > 0) {
    return {
      ok: false,
      error: `${validation.invalid.length} row(s) have errors. Fix them and re-upload before committing.`,
    };
  }
  if (validation.valid.length === 0) return { ok: false, error: "No valid rows to import." };

  // Hash outside the transaction — bcrypt at cost 10 is deliberately slow and
  // would hold the transaction open far longer than necessary.
  const hashed = await Promise.all(
    validation.valid.map(async (v) => ({
      ...v.data,
      hashedPassword: await bcrypt.hash(v.data.password ?? DEFAULT_STAFF_PASSWORD, BCRYPT_COST),
    })),
  );

  let created = 0;
  let updated = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of hashed) {
      const before = await tx.user.findUnique({ where: { email: row.email }, select: { id: true } });
      await tx.user.upsert({
        where: { email: row.email },
        // Never overwrite an existing password on re-import — an admin may have
        // rotated it since the first load.
        update: { name: row.name, role: row.role, status: row.status },
        create: {
          email: row.email,
          name: row.name,
          role: row.role,
          status: row.status,
          hashedPassword: row.hashedPassword,
        },
      });
      if (before) updated++;
      else created++;
    }
  });

  await logAudit({
    action: "IMPORT",
    userId: session.user.id,
    resourceType: "Staff",
    resourceId: "staff-csv",
    metadata: { totalRows: validation.total, created, updated },
  });

  return { ok: true, created, updated };
}
