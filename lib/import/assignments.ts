import { type ParsedCsv, summarize, type ValidatedRow, type ValidationResult } from "@/lib/import/csv";

export const ASSIGNMENT_COLUMNS = [
  "email",
  "gradeLevel",
  "section",
  "subjectCode",
  "subjectName",
  "isAdviser",
] as const;

export const ASSIGNMENT_REQUIRED = ["email", "gradeLevel", "section"] as const;

export type AssignmentRow = {
  email: string;
  userId: string;
  gradeLevel: string;
  section: string;
  /** null on adviser rows. */
  subjectCode: string | null;
  subjectName: string | null;
  isAdviser: boolean;
};

type Refs = {
  /** lowercased email → userId */
  userIdByEmail: Map<string, string>;
};

function parseBool(v: string | undefined): boolean {
  if (!v) return false;
  const x = v.trim().toUpperCase();
  return x === "TRUE" || x === "YES" || x === "1" || x === "Y";
}

export function validateAssignmentsCsv(parsed: ParsedCsv, refs: Refs): ValidationResult<AssignmentRow> {
  const headerSetLower = new Set(parsed.headers.map((h) => h.toLowerCase()));
  const missingHeaders = ASSIGNMENT_REQUIRED.filter((c) => !headerSetLower.has(c.toLowerCase()));

  if (missingHeaders.length > 0) {
    return summarize<AssignmentRow>([
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

  // A section may have at most one adviser. Key is gradeLevel::section.
  const adviserBySection = new Map<string, number>();

  const validated: ValidatedRow<AssignmentRow>[] = parsed.rows.map((raw, idx) => {
    const rowNum = idx + 2; // header is row 1
    const errors: string[] = [];

    const email = get(raw, "email").toLowerCase();
    const userId = refs.userIdByEmail.get(email);
    if (!userId) errors.push(`No staff user with email "${email}" — import the staff CSV first`);

    const gradeLevel = get(raw, "gradeLevel");
    if (!gradeLevel) errors.push("gradeLevel required");

    const section = get(raw, "section");
    if (!section) errors.push("section required");

    const subjectCode = get(raw, "subjectCode").toUpperCase() || null;
    const subjectName = get(raw, "subjectName") || null;
    if (subjectCode && !subjectName) errors.push("subjectName is required when subjectCode is given");
    if (subjectName && !subjectCode) errors.push("subjectCode is required when subjectName is given");

    const isAdviser = parseBool(get(raw, "isAdviser"));
    if (isAdviser && subjectCode) errors.push("an adviser row must not carry a subjectCode");

    if (isAdviser && gradeLevel && section) {
      const key = `${gradeLevel}::${section}`;
      const seen = (adviserBySection.get(key) ?? 0) + 1;
      adviserBySection.set(key, seen);
      if (seen > 1) errors.push(`${gradeLevel} ${section} already has an adviser earlier in the file`);
    }

    if (errors.length > 0) return { ok: false, row: rowNum, errors, raw };

    return {
      ok: true,
      row: rowNum,
      data: {
        email,
        userId: userId as string,
        gradeLevel,
        section,
        subjectCode,
        subjectName,
        isAdviser,
      },
    };
  });

  return summarize(validated);
}
