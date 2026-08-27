import type { Role, UserStatus } from "@prisma/client";
import { type ParsedCsv, summarize, type ValidatedRow, type ValidationResult } from "@/lib/import/csv";

export const STAFF_COLUMNS = ["email", "name", "role", "password", "status"] as const;

export const STAFF_REQUIRED = ["email", "name", "role"] as const;

export type StaffRow = {
  email: string;
  name: string;
  role: Role;
  /** null ⇒ the commit action applies the shared default password. */
  password: string | null;
  status: UserStatus;
};

function normalizeRole(v: string): Role | null {
  const x = v.trim().toUpperCase();
  if (x === "ADMIN") return "ADMIN";
  if (x === "TEACHER") return "TEACHER";
  if (x === "COUNSELOR") return "COUNSELOR";
  if (x === "PRINCIPAL") return "PRINCIPAL";
  return null;
}

function normalizeStatus(v: string | undefined): UserStatus {
  if (!v) return "ACTIVE";
  return v.trim().toUpperCase() === "SUSPENDED" ? "SUSPENDED" : "ACTIVE";
}

// Deliberately permissive: enough to catch a mangled column, not an RFC parser.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Matches the minimum enforced for individually created accounts
// (app/actions/admin/users.ts) so the two paths that mint a hashedPassword
// agree on what counts as a valid one.
const MIN_PASSWORD_LENGTH = 8;

export function validateStaffCsv(parsed: ParsedCsv): ValidationResult<StaffRow> {
  const headerSetLower = new Set(parsed.headers.map((h) => h.toLowerCase()));
  const missingHeaders = STAFF_REQUIRED.filter((c) => !headerSetLower.has(c.toLowerCase()));

  if (missingHeaders.length > 0) {
    return summarize<StaffRow>([
      {
        ok: false,
        row: 0,
        errors: [`Missing required column(s): ${missingHeaders.join(", ")}`],
        raw: {},
      },
    ]);
  }

  const get = (r: Record<string, string>, key: string): string => {
    const exact = r[key];
    if (exact !== undefined) return (exact ?? "").toString().trim();
    const lower = key.toLowerCase();
    for (const k of Object.keys(r)) {
      if (k.toLowerCase() === lower) return (r[k] ?? "").toString().trim();
    }
    return "";
  };

  const seenEmail = new Set<string>();

  const validated: ValidatedRow<StaffRow>[] = parsed.rows.map((raw, idx) => {
    const rowNum = idx + 2; // header is row 1
    const errors: string[] = [];

    const email = get(raw, "email").toLowerCase();
    if (!EMAIL.test(email)) errors.push(`email is not a valid address (got "${get(raw, "email")}")`);
    if (seenEmail.has(email)) errors.push(`Duplicate email ${email} earlier in file`);
    seenEmail.add(email);

    const name = get(raw, "name");
    if (!name) errors.push("name required");

    const rawRole = get(raw, "role");
    const role = normalizeRole(rawRole);
    if (!role) errors.push(`role must be ADMIN, TEACHER, COUNSELOR, or PRINCIPAL (got "${rawRole}")`);

    const password = get(raw, "password") || null;
    if (password !== null && password.length < MIN_PASSWORD_LENGTH) {
      errors.push(`password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    }

    const status = normalizeStatus(get(raw, "status"));

    if (errors.length > 0) return { ok: false, row: rowNum, errors, raw };

    return {
      ok: true,
      row: rowNum,
      data: { email, name, role: role as Role, password, status },
    };
  });

  return summarize(validated);
}
