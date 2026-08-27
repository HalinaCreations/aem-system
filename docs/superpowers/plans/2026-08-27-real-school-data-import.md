# Real School Data Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Load one school year (SY 2026-2027) to a realistic starting state — 576 students, 31 staff, 17 sections, ~36 subjects, ~167 teacher assignments — via three CSVs imported through the admin wizard, with grades and attendance deliberately left empty for real users to generate.

**Architecture:** Two new importers (`staff`, `assignments`) follow the existing `lib/import/<domain>.ts` validator + `app/actions/import/<domain>.ts` preview/commit pair + `CsvStep` wizard instance pattern exactly. The roster importer gains three optional columns. A drifted SPED field is reconciled back into `schema.prisma`. A throwaway extractor converts the source spreadsheets into the three CSVs plus a data-quality report.

**Tech Stack:** Next.js 16.2.4 (App Router) · React 19.2.4 · Prisma 7 + `@prisma/adapter-pg` · PostgreSQL 16 (Docker, port 5433) · Zod 4 · bcryptjs · `csv-parse` · tsx

**Spec:** [docs/superpowers/specs/2026-08-26-real-school-data-import-design.md](../specs/2026-08-26-real-school-data-import-design.md)

## Global Constraints

- **No test framework exists in this repo.** There is no vitest, jest, or any `*.test.ts`. The house idiom is assertion harnesses at `scripts/verify-*.ts` run with `tsx`. Follow it. **Do not install a test runner** — global preference: never add or upgrade dependencies as a side effect of another task.
- **No new dependencies at all.** Everything needed is already installed.
- **Next 16:** `cookies()`, `headers()`, `params`, `searchParams` are async — always `await`. `middleware.ts` is `proxy.ts`.
- **Prisma 7:** `schema.prisma` has no `datasource.url`; it lives in `prisma.config.ts`. Client requires the driver adapter — see `lib/prisma.ts`.
- **Every server action:** `"use server"` at top of file, Zod `safeParse` on input, `requireRole("ADMIN")` at the top, `logAudit(...)` before returning success, return a serializable `{ ok: true, ... } | { ok: false, error }` — never throw.
- **Naming convention (load-bearing):** `gradeLevel` is `"Grade 9"`, section `name` is `"Newton"` — bare, no grade prefix. Source: `prisma/seed.ts:29,34`. Sections upsert on `(schoolYearId, gradeLevel, name)`, so a wrong convention silently forks the section table.
- **Type-safe end-to-end.** No `any`. No `as unknown as X`.
- **Dev port 3010.** Don't change it.
- **Commit messages:** imperative, scoped. **No `Co-authored-by` or AI-attribution lines.**
- **One migration per logical change**, descriptive name, ships with the work that introduces it.

---

### Task 1: Data-protection guardrail

Must land before any task generates a CSV. `sample-import-data/` is currently untracked but **not ignored**, and this repo pushes to `github.com:franze-calleja/aem-system`. Task 7 writes 576 real minors' names into this tree.

**Files:**
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing
- Produces: an ignore rule that Task 7 depends on for safety

- [ ] **Step 1: Confirm nothing is already tracked**

```bash
git ls-files sample-import-data/
```

Expected: empty output. If it prints filenames, **stop** and tell the user — real student data is already in git history and needs removal before anything else.

- [ ] **Step 2: Add the ignore rule**

Append to `.gitignore`:

```gitignore

# real school data — contains student PII, never commit
/sample-import-data
```

- [ ] **Step 3: Verify the rule takes effect**

```bash
git check-ignore -v sample-import-data/ && git status --porcelain sample-import-data/
```

Expected: `check-ignore` prints the matching rule; `git status` prints nothing.

- [ ] **Step 4: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore real school data containing student PII"
```

---

### Task 2: Reconcile the SPED schema drift

`prisma/migrations/20260511140850_init/migration.sql:11,96,104` created the `SpedStatus` enum, `Student.spedStatus`, and the `SpedStatusChange` table. No later migration dropped them, but `schema.prisma` declares none of the three. Expected outcome: the DB already has them, so this is a no-op reconciliation.

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `scripts/verify-sped-field.ts`
- Possibly create: `prisma/migrations/<timestamp>_restore_sped_status/`

**Interfaces:**
- Consumes: nothing
- Produces: `Student.spedStatus` readable through Prisma Client as `SpedStatus` (`NONE` | `IEP` | `ACCOMMODATIONS`); Task 3 writes to it

- [ ] **Step 1: Write the failing verification harness**

Create `scripts/verify-sped-field.ts`:

```typescript
// Verifies Student.spedStatus is declared in schema.prisma AND present in the
// database, so Prisma Client can read and write it.
// Usage: tsx scripts/verify-sped-field.ts

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const dbCols = await prisma.$queryRaw<Array<{ column_name: string }>>`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'Student' AND column_name = 'spedStatus'
  `;
  console.log(`DB column Student.spedStatus present: ${dbCols.length === 1}`);
  if (dbCols.length !== 1) throw new Error("Student.spedStatus missing from the database");

  const dbTables = await prisma.$queryRaw<Array<{ table_name: string }>>`
    SELECT table_name FROM information_schema.tables WHERE table_name = 'SpedStatusChange'
  `;
  console.log(`DB table SpedStatusChange present: ${dbTables.length === 1}`);
  if (dbTables.length !== 1) throw new Error("SpedStatusChange missing from the database");

  // Readable through the generated client — this is what fails before the fix.
  const sample = await prisma.student.findFirst({ select: { lrn: true, spedStatus: true } });
  console.log(`Prisma Client can select spedStatus: true (sample: ${JSON.stringify(sample)})`);

  console.log("PASS");
}

main()
  .catch((e) => {
    console.error("FAIL:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npm run db:up
npx tsc --noEmit
```

Expected: `tsc` FAILS with an error on `spedStatus` in the `select` — the property does not exist on the generated `StudentSelect` type. That is the failing state this task fixes.

- [ ] **Step 3: Re-declare the three items in schema.prisma**

Add the enum next to the other enums (after `enum Sex { ... }`):

```prisma
enum SpedStatus {
  NONE
  IEP
  ACCOMMODATIONS
}
```

Add the field to `model Student`, immediately after `birthDate`:

```prisma
  spedStatus      SpedStatus @default(NONE)
```

Add to `model Student`'s relation list, alongside `consentRecords`:

```prisma
  spedStatusChanges SpedStatusChange[]
```

Add the model (place it after `model ConsentRecord`):

```prisma
model SpedStatusChange {
  id          String     @id @default(cuid())
  studentId   String
  student     Student    @relation(fields: [studentId], references: [id], onDelete: Cascade)
  fromStatus  SpedStatus
  toStatus    SpedStatus
  effectiveAt DateTime
  changedById String?
  notes       String?

  @@index([studentId])
}
```

> **These names are load-bearing.** They are copied from
> `prisma/migrations/20260511140850_init/migration.sql:104-113`, which is the
> DDL already applied to the database: `effectiveAt` (not `changedAt`, and no
> default), `changedById` (bare nullable `TEXT` — the migration adds **no**
> foreign key for it, so do not add a `User` relation), and `notes` (plural).
> Any deviation makes Step 4's `migrate diff` emit real DDL instead of the
> expected empty script.

- [ ] **Step 4: Confirm this is a no-op against the database**

```bash
npx prisma migrate diff \
  --from-config-datasource \
  --to-schema prisma/schema.prisma \
  --script
```

Expected: an empty script (or only comments), confirming the DB already matches.

> **Prisma 7 flag names.** These are not the pre-7 names. `--from-schema-datasource`
> and `--to-schema-datamodel` were removed; 7.8 uses `--from-config-datasource`
> (reads the URL from `prisma.config.ts`) and `--to-schema <path>`. Verify with
> `npx prisma migrate diff --help` if the command errors. **If it emits real DDL**, the columns are absent after all — in that case run `npm run db:migrate -- --name restore_sped_status` and let Prisma create the migration.

- [ ] **Step 5: Regenerate the client and run the harness**

```bash
npx prisma generate
npx tsc --noEmit
tsx scripts/verify-sped-field.ts
```

Expected: `tsc` clean; harness prints three `true` lines then `PASS`.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma scripts/verify-sped-field.ts prisma/migrations
git commit -m "fix: restore drifted SpedStatus enum, Student.spedStatus, and SpedStatusChange to schema"
```

---

### Task 3: Extend the roster importer with guardian and SPED columns

`Student.guardianName` and `guardianContact` exist in the schema (`prisma/schema.prisma:333`) but the roster importer never mapped them. `spedStatus` becomes mappable after Task 2.

**Files:**
- Modify: `lib/import/roster.ts`
- Modify: `app/actions/import/roster.ts`
- Create: `scripts/verify-roster-extended.ts`

**Interfaces:**
- Consumes: `SpedStatus` from `@prisma/client` (Task 2)
- Produces: `RosterRow` gains `guardianName: string | null`, `guardianContact: string | null`, `spedStatus: SpedStatus`. Task 6 renders them; Task 7 emits them.

- [ ] **Step 1: Write the failing verification harness**

Create `scripts/verify-roster-extended.ts`:

```typescript
// Asserts the roster validator accepts and normalizes the three new optional
// columns. Pure validation — does not touch the database.
// Usage: tsx scripts/verify-roster-extended.ts

import { parseCsv } from "../lib/import/csv";
import { validateRosterCsv } from "../lib/import/roster";

const csv = [
  "lrn,firstName,lastName,sex,birthDate,gradeLevel,section,guardianName,guardianContact,spedStatus",
  "136800010001,Maria,Santos,FEMALE,2010-04-12,Grade 9,Newton,Ana Santos,09171234567,NONE",
  "136800010002,Juan,Reyes,M,07/30/2010,Grade 9,Curie,,,",
  "136800010003,Ana,Cruz,F,2010-01-05,Grade 9,Curie,Ben Cruz,09181234567,iep",
].join("\n");

const v = validateRosterCsv(parseCsv(csv));
const fail = (m: string) => {
  console.error("FAIL:", m);
  process.exit(1);
};

if (v.invalid.length !== 0) fail(`expected 0 invalid rows, got ${v.invalid.length}: ${JSON.stringify(v.invalid)}`);
if (v.valid.length !== 3) fail(`expected 3 valid rows, got ${v.valid.length}`);

const [a, b, c] = v.valid.map((r) => r.data);

if (a.guardianName !== "Ana Santos") fail(`row1 guardianName = ${a.guardianName}`);
if (a.guardianContact !== "09171234567") fail(`row1 guardianContact = ${a.guardianContact}`);
if (a.spedStatus !== "NONE") fail(`row1 spedStatus = ${a.spedStatus}`);

if (b.guardianName !== null) fail(`row2 guardianName should be null, got ${b.guardianName}`);
if (b.guardianContact !== null) fail(`row2 guardianContact should be null, got ${b.guardianContact}`);
if (b.spedStatus !== "NONE") fail(`row2 spedStatus should default to NONE, got ${b.spedStatus}`);

if (c.spedStatus !== "IEP") fail(`row3 spedStatus should normalize to IEP, got ${c.spedStatus}`);

console.log("PASS — 3/3 rows valid, guardian + spedStatus mapped and normalized");
```

- [ ] **Step 2: Run it to verify it fails**

```bash
tsx scripts/verify-roster-extended.ts
```

Expected: FAIL — `row1 guardianName = undefined`. The validator does not emit these fields yet.

- [ ] **Step 3: Extend the validator**

In `lib/import/roster.ts`, change the type import line to include `SpedStatus`:

```typescript
import type { LearningModality, Sex, SpedStatus } from "@prisma/client";
```

Add the three names to `ROSTER_COLUMNS` (after `"learningModality"`):

```typescript
  "guardianName",
  "guardianContact",
  "spedStatus",
```

Leave `ROSTER_REQUIRED` untouched — all three are optional.

Extend the `RosterRow` type with:

```typescript
  guardianName: string | null;
  guardianContact: string | null;
  spedStatus: SpedStatus;
```

Add a normalizer next to `normalizeModality`:

```typescript
function normalizeSped(v: string | undefined): SpedStatus {
  if (!v) return "NONE";
  const x = v.trim().toUpperCase().replace(/[-\s]+/g, "_");
  if (x === "IEP") return "IEP";
  if (x === "ACCOMMODATIONS" || x === "ACCOMMODATION") return "ACCOMMODATIONS";
  return "NONE";
}
```

Inside the row mapper, after the `learningModality` line, add:

```typescript
    const guardianName = get(raw, "guardianName") || null;
    const guardianContact = get(raw, "guardianContact") || null;
    const spedStatus = normalizeSped(get(raw, "spedStatus"));
```

And add all three to the returned `data` object.

- [ ] **Step 4: Run the harness to verify it passes**

```bash
tsx scripts/verify-roster-extended.ts
```

Expected: `PASS — 3/3 rows valid, guardian + spedStatus mapped and normalized`

- [ ] **Step 5: Persist the new fields in the commit action**

In `app/actions/import/roster.ts`, inside the `tx.student.upsert` call, add the three fields to **both** `update` and `create`:

```typescript
          guardianName: v.data.guardianName,
          guardianContact: v.data.guardianContact,
          spedStatus: v.data.spedStatus,
```

- [ ] **Step 6: Typecheck and commit**

```bash
npx tsc --noEmit && npm run lint
git add lib/import/roster.ts app/actions/import/roster.ts scripts/verify-roster-extended.ts
git commit -m "feat: map guardianName, guardianContact, and spedStatus through the roster import"
```

---

### Task 4: Staff importer

**Files:**
- Create: `lib/import/staff.ts`
- Create: `app/actions/import/staff.ts`
- Create: `scripts/verify-staff-import.ts`

**Interfaces:**
- Consumes: `parseCsv`, `summarize`, `ValidatedRow`, `ValidationResult` from `lib/import/csv`; `checkCsvLimits` from `lib/import/limits`
- Produces:
  - `STAFF_COLUMNS`, `STAFF_REQUIRED` (readonly string tuples)
  - `type StaffRow = { email: string; name: string; role: Role; password: string | null; status: UserStatus }`
  - `validateStaffCsv(parsed: ParsedCsv): ValidationResult<StaffRow>`
  - `previewStaffAction(fd: FormData): Promise<StaffPreview>`
  - `commitStaffAction(fd: FormData): Promise<StaffCommit>` where `StaffCommit = { ok: true; created: number; updated: number } | { ok: false; error: string }`
  - Task 5 consumes `previewStaffAction` / `commitStaffAction`; Task 6 wires them into the wizard.

- [ ] **Step 1: Write the failing verification harness**

Create `scripts/verify-staff-import.ts`:

```typescript
// Validator-only checks for the staff importer. No database access.
// Usage: tsx scripts/verify-staff-import.ts

import { parseCsv } from "../lib/import/csv";
import { validateStaffCsv } from "../lib/import/staff";

const fail = (m: string) => {
  console.error("FAIL:", m);
  process.exit(1);
};

// 1. Happy path + role normalization + defaults
const ok = validateStaffCsv(
  parseCsv(
    [
      "email,name,role",
      "e.bautista@school.edu,\"BAUTISTA, Elena S.\",PRINCIPAL",
      "r.villanueva@school.edu,\"VILLANUEVA, Rosa M.\",counselor",
      "c.mendoza@school.edu,\"MENDOZA, Carlo A.\",Admin",
      "j.reyes@school.edu,\"REYES, Juan M.\",TEACHER",
    ].join("\n"),
  ),
);
if (ok.invalid.length !== 0) fail(`happy path: ${JSON.stringify(ok.invalid)}`);
if (ok.valid.length !== 4) fail(`expected 4 valid, got ${ok.valid.length}`);
if (ok.valid[1].data.role !== "COUNSELOR") fail(`lowercase role not normalized: ${ok.valid[1].data.role}`);
if (ok.valid[2].data.role !== "ADMIN") fail(`mixed-case role not normalized: ${ok.valid[2].data.role}`);
if (ok.valid[0].data.status !== "ACTIVE") fail(`status should default ACTIVE, got ${ok.valid[0].data.status}`);
if (ok.valid[0].data.password !== null) fail(`password should default null, got ${ok.valid[0].data.password}`);

// 2. Missing required column
const missing = validateStaffCsv(parseCsv("email,name\na@b.edu,Someone"));
if (missing.invalid.length !== 1) fail("missing-column case should produce exactly one error row");
if (!missing.invalid[0].errors[0].includes("role")) fail(`error should name the missing column: ${missing.invalid[0].errors[0]}`);

// 3. Bad role, bad email, duplicate email
const bad = validateStaffCsv(
  parseCsv(
    [
      "email,name,role",
      "j.reyes@school.edu,Juan Reyes,LIBRARIAN",
      "not-an-email,Someone Else,TEACHER",
      "dupe@school.edu,First Person,TEACHER",
      "dupe@school.edu,Second Person,TEACHER",
    ].join("\n"),
  ),
);
if (bad.invalid.length !== 3) fail(`expected 3 invalid rows, got ${bad.invalid.length}: ${JSON.stringify(bad.invalid)}`);
if (!bad.invalid[0].errors.some((e) => e.includes("role"))) fail("unmapped role should be rejected");
if (!bad.invalid[1].errors.some((e) => e.includes("email"))) fail("malformed email should be rejected");
if (!bad.invalid[2].errors.some((e) => e.toLowerCase().includes("duplicate"))) fail("duplicate email should be rejected");

console.log("PASS — staff validator: happy path, normalization, defaults, and 3 error classes");
```

- [ ] **Step 2: Run it to verify it fails**

```bash
tsx scripts/verify-staff-import.ts
```

Expected: FAIL — `Cannot find module '../lib/import/staff'`.

- [ ] **Step 3: Write the validator**

Create `lib/import/staff.ts`:

```typescript
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
```

- [ ] **Step 4: Run the harness to verify it passes**

```bash
tsx scripts/verify-staff-import.ts
```

Expected: `PASS — staff validator: happy path, normalization, defaults, and 3 error classes`

- [ ] **Step 5: Write the server action**

Create `app/actions/import/staff.ts`:

```typescript
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
const DEFAULT_STAFF_PASSWORD = "changeme2026";
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
```

- [ ] **Step 6: Typecheck, lint, and commit**

```bash
npx tsc --noEmit && npm run lint
git add lib/import/staff.ts app/actions/import/staff.ts scripts/verify-staff-import.ts
git commit -m "feat: add staff CSV importer with role mapping and bcrypt hashing"
```

---

### Task 5: Assignments importer

Upserts `Section`, `Subject`, and `TeacherAssignment`. Adviser rows carry `subjectId: null` per the model comment at `prisma/schema.prisma:313`.

**Files:**
- Create: `lib/import/assignments.ts`
- Create: `app/actions/import/assignments.ts`
- Create: `scripts/verify-assignments-import.ts`

**Interfaces:**
- Consumes: `validateStaffCsv` output shape only conceptually; at runtime it consumes a `Refs` map built from the DB
- Produces:
  - `ASSIGNMENT_COLUMNS`, `ASSIGNMENT_REQUIRED`
  - `type AssignmentRow = { email: string; userId: string; gradeLevel: string; section: string; subjectCode: string | null; subjectName: string | null; isAdviser: boolean }`
  - `validateAssignmentsCsv(parsed: ParsedCsv, refs: { userIdByEmail: Map<string, string> }): ValidationResult<AssignmentRow>`
  - `previewAssignmentsAction` / `commitAssignmentsAction` where `AssignmentsCommit = { ok: true; schoolYearLabel: string; created: { sections: number; subjects: number; assignments: number } } | { ok: false; error: string }`

- [ ] **Step 1: Write the failing verification harness**

Create `scripts/verify-assignments-import.ts`:

```typescript
// Validator-only checks for the assignments importer. No database access.
// Usage: tsx scripts/verify-assignments-import.ts

import { parseCsv } from "../lib/import/csv";
import { validateAssignmentsCsv } from "../lib/import/assignments";

const fail = (m: string) => {
  console.error("FAIL:", m);
  process.exit(1);
};

const userIdByEmail = new Map<string, string>([
  ["j.reyes@school.edu", "user-reyes"],
  ["a.cruz@school.edu", "user-cruz"],
]);

// 1. Adviser row + subject row
const ok = validateAssignmentsCsv(
  parseCsv(
    [
      "email,gradeLevel,section,subjectCode,subjectName,isAdviser",
      "j.reyes@school.edu,Grade 9,Newton,,,true",
      "j.reyes@school.edu,Grade 9,Curie,ENG9,English 9,false",
      "a.cruz@school.edu,Grade 9,Curie,SCI9,Science 9,",
    ].join("\n"),
  ),
  { userIdByEmail },
);
if (ok.invalid.length !== 0) fail(`happy path: ${JSON.stringify(ok.invalid)}`);
if (ok.valid.length !== 3) fail(`expected 3 valid, got ${ok.valid.length}`);
if (ok.valid[0].data.isAdviser !== true) fail("adviser row should set isAdviser true");
if (ok.valid[0].data.subjectCode !== null) fail("adviser row should have null subjectCode");
if (ok.valid[0].data.userId !== "user-reyes") fail(`email should resolve to userId, got ${ok.valid[0].data.userId}`);
if (ok.valid[1].data.subjectCode !== "ENG9") fail(`subjectCode = ${ok.valid[1].data.subjectCode}`);
if (ok.valid[2].data.isAdviser !== false) fail("blank isAdviser should default false");

// 2. Error classes: unknown user, half-specified subject, two advisers on one section
const bad = validateAssignmentsCsv(
  parseCsv(
    [
      "email,gradeLevel,section,subjectCode,subjectName,isAdviser",
      "nobody@school.edu,Grade 9,Newton,ENG9,English 9,false",
      "j.reyes@school.edu,Grade 9,Curie,ENG9,,false",
      "j.reyes@school.edu,Grade 9,Curie,,,true",
      "a.cruz@school.edu,Grade 9,Curie,,,true",
    ].join("\n"),
  ),
  { userIdByEmail },
);
if (bad.invalid.length !== 3) fail(`expected 3 invalid rows, got ${bad.invalid.length}: ${JSON.stringify(bad.invalid)}`);
if (!bad.invalid[0].errors.some((e) => e.includes("No staff user"))) fail("unknown email should be rejected");
if (!bad.invalid[1].errors.some((e) => e.includes("subjectName"))) fail("subjectCode without subjectName should be rejected");
if (!bad.invalid[2].errors.some((e) => e.includes("adviser"))) fail("second adviser on a section should be rejected");

console.log("PASS — assignments validator: adviser rows, subject rows, defaults, and 3 error classes");
```

- [ ] **Step 2: Run it to verify it fails**

```bash
tsx scripts/verify-assignments-import.ts
```

Expected: FAIL — `Cannot find module '../lib/import/assignments'`.

- [ ] **Step 3: Write the validator**

Create `lib/import/assignments.ts`:

```typescript
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
```

- [ ] **Step 4: Run the harness to verify it passes**

```bash
tsx scripts/verify-assignments-import.ts
```

Expected: `PASS — assignments validator: adviser rows, subject rows, defaults, and 3 error classes`

- [ ] **Step 5: Write the server action**

Create `app/actions/import/assignments.ts`:

```typescript
"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { parseCsv } from "@/lib/import/csv";
import { checkCsvLimits } from "@/lib/import/limits";
import { validateAssignmentsCsv, type AssignmentRow } from "@/lib/import/assignments";

export type AssignmentsPreview =
  | {
      ok: true;
      schoolYearLabel: string;
      total: number;
      validCount: number;
      invalidCount: number;
      previewRows: Array<{ row: number; data: AssignmentRow }>;
      errors: Array<{ row: number; messages: string[]; raw: Record<string, string> }>;
    }
  | { ok: false; error: string };

const input = z.object({
  schoolYearId: z.string().min(1),
  csv: z.string().min(1),
});

async function loadUserRefs() {
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  const userIdByEmail = new Map<string, string>();
  for (const u of users) userIdByEmail.set(u.email.toLowerCase(), u.id);
  return { userIdByEmail };
}

export async function previewAssignmentsAction(formData: FormData): Promise<AssignmentsPreview> {
  await requireRole("ADMIN");

  const parsed = input.safeParse({
    schoolYearId: formData.get("schoolYearId"),
    csv: formData.get("csv"),
  });
  if (!parsed.success) return { ok: false, error: "Missing school year or CSV." };

  const limitErr = checkCsvLimits(parsed.data.csv);
  if (limitErr) return limitErr;

  const sy = await prisma.schoolYear.findUnique({ where: { id: parsed.data.schoolYearId } });
  if (!sy) return { ok: false, error: "School year not found." };

  let parsedCsv;
  try {
    parsedCsv = parseCsv(parsed.data.csv);
  } catch (err) {
    return { ok: false, error: `CSV parse failed: ${(err as Error).message}` };
  }

  const refs = await loadUserRefs();
  const result = validateAssignmentsCsv(parsedCsv, refs);

  return {
    ok: true,
    schoolYearLabel: sy.label,
    total: result.total,
    validCount: result.valid.length,
    invalidCount: result.invalid.length,
    previewRows: result.valid.slice(0, 20).map((r) => ({ row: r.row, data: r.data })),
    errors: result.invalid.map((r) => ({ row: r.row, messages: r.errors, raw: r.raw })),
  };
}

export type AssignmentsCommit =
  | { ok: true; schoolYearLabel: string; created: { sections: number; subjects: number; assignments: number } }
  | { ok: false; error: string };

export async function commitAssignmentsAction(formData: FormData): Promise<AssignmentsCommit> {
  const session = await requireRole("ADMIN");

  const parsed = input.safeParse({
    schoolYearId: formData.get("schoolYearId"),
    csv: formData.get("csv"),
  });
  if (!parsed.success) return { ok: false, error: "Missing school year or CSV." };

  const limitErr = checkCsvLimits(parsed.data.csv);
  if (limitErr) return limitErr;

  const sy = await prisma.schoolYear.findUnique({ where: { id: parsed.data.schoolYearId } });
  if (!sy) return { ok: false, error: "School year not found." };

  let parsedCsv;
  try {
    parsedCsv = parseCsv(parsed.data.csv);
  } catch (err) {
    return { ok: false, error: `CSV parse failed: ${(err as Error).message}` };
  }

  const refs = await loadUserRefs();
  const validation = validateAssignmentsCsv(parsedCsv, refs);
  if (validation.invalid.length > 0) {
    return {
      ok: false,
      error: `${validation.invalid.length} row(s) have errors. Fix them and re-upload before committing.`,
    };
  }
  if (validation.valid.length === 0) return { ok: false, error: "No valid rows to import." };

  let createdSections = 0;
  let createdSubjects = 0;
  let createdAssignments = 0;

  await prisma.$transaction(async (tx) => {
    const sectionIdByKey = new Map<string, string>();
    const subjectIdByCode = new Map<string, string>();

    for (const v of validation.valid) {
      const sectionKey = `${v.data.gradeLevel}::${v.data.section}`;
      let sectionId = sectionIdByKey.get(sectionKey);
      if (!sectionId) {
        const where = {
          schoolYearId_gradeLevel_name: {
            schoolYearId: sy.id,
            gradeLevel: v.data.gradeLevel,
            name: v.data.section,
          },
        };
        const before = await tx.section.findUnique({ where, select: { id: true } });
        const sec = await tx.section.upsert({
          where,
          update: {},
          create: { schoolYearId: sy.id, gradeLevel: v.data.gradeLevel, name: v.data.section },
          select: { id: true },
        });
        if (!before) createdSections++;
        sectionId = sec.id;
        sectionIdByKey.set(sectionKey, sectionId);
      }

      let subjectId: string | null = null;
      if (v.data.subjectCode) {
        subjectId = subjectIdByCode.get(v.data.subjectCode) ?? null;
        if (!subjectId) {
          const where = { schoolYearId_code: { schoolYearId: sy.id, code: v.data.subjectCode } };
          const before = await tx.subject.findUnique({ where, select: { id: true } });
          const subj = await tx.subject.upsert({
            where,
            update: { name: v.data.subjectName as string },
            create: {
              schoolYearId: sy.id,
              code: v.data.subjectCode,
              name: v.data.subjectName as string,
            },
            select: { id: true },
          });
          if (!before) createdSubjects++;
          subjectId = subj.id;
          subjectIdByCode.set(v.data.subjectCode, subjectId);
        }
      }

      const where = {
        userId_sectionId_subjectId_schoolYearId: {
          userId: v.data.userId,
          sectionId,
          subjectId,
          schoolYearId: sy.id,
        },
      };
      const before = await tx.teacherAssignment.findUnique({ where, select: { id: true } });
      await tx.teacherAssignment.upsert({
        where,
        update: { isAdviser: v.data.isAdviser },
        create: {
          userId: v.data.userId,
          sectionId,
          subjectId,
          schoolYearId: sy.id,
          isAdviser: v.data.isAdviser,
        },
      });
      if (!before) createdAssignments++;
    }
  });

  await logAudit({
    action: "IMPORT",
    userId: session.user.id,
    resourceType: "TeacherAssignment",
    resourceId: sy.id,
    metadata: {
      schoolYearLabel: sy.label,
      totalRows: validation.total,
      sectionsCreated: createdSections,
      subjectsCreated: createdSubjects,
      assignmentsCreated: createdAssignments,
    },
  });

  return {
    ok: true,
    schoolYearLabel: sy.label,
    created: { sections: createdSections, subjects: createdSubjects, assignments: createdAssignments },
  };
}
```

> **Note on the composite unique key.** `TeacherAssignment` has `@@unique([userId, sectionId, subjectId, schoolYearId])` with a nullable `subjectId`. Postgres treats `NULL` as distinct in unique indexes, so two adviser rows for the same user+section would not collide at the DB level — which is exactly why the validator rejects a second adviser per section in Step 3. Verify the generated `where` key name matches what Prisma Client produces; if `npx tsc --noEmit` reports a different property name, use the name Prisma generated.

- [ ] **Step 6: Typecheck, lint, and commit**

```bash
npx tsc --noEmit && npm run lint
git add lib/import/assignments.ts app/actions/import/assignments.ts scripts/verify-assignments-import.ts
git commit -m "feat: add teacher assignment CSV importer upserting sections and subjects"
```

---

### Task 6: Wire both importers into the wizard and fix the sample data

**Files:**
- Modify: `components/roles/admin/import-wizard.tsx`

**Interfaces:**
- Consumes: `previewStaffAction` / `commitStaffAction` (Task 4), `previewAssignmentsAction` / `commitAssignmentsAction` (Task 5), extended `RosterRow` (Task 3)
- Produces: a 9-step wizard

- [ ] **Step 1: Add the imports**

At the top of the file, alongside the existing action imports:

```typescript
import { previewStaffAction, commitStaffAction, type StaffPreview, type StaffCommit } from "@/app/actions/import/staff";
import { previewAssignmentsAction, commitAssignmentsAction, type AssignmentsPreview, type AssignmentsCommit } from "@/app/actions/import/assignments";
```

- [ ] **Step 2: Widen the Step type and relabel**

Replace the `Step` type and `STEP_LABELS`:

```typescript
type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

const STEP_LABELS: Record<Step, string> = {
  1: "Select school year",
  2: "Staff CSV",
  3: "Roster CSV",
  4: "Assignments CSV",
  5: "Grades CSV",
  6: "Attendance CSV",
  7: "Behavioral CSV (optional)",
  8: "Interventions CSV (optional)",
  9: "SEL CSV (optional)",
};
```

Update the stepper's array literal from `[1, 2, 3, 4, 5, 6, 7]` to `[1, 2, 3, 4, 5, 6, 7, 8, 9]`, and its grid classes from `md:grid-cols-4 lg:grid-cols-7` to `md:grid-cols-5 lg:grid-cols-9`.

Update the render guard from `step >= 2 && step <= 7` to `step >= 2 && step <= 9`, and renumber every existing `{step === N && ...}` block: roster 2→3, grades 3→5, attendance 4→6, behavioral 5→7, interventions 6→8, SEL 7→9.

- [ ] **Step 3: Add the row preview types**

Next to the existing `RosterRowPreview` etc. declarations:

```typescript
type StaffRowPreview = NonNullable<Extract<StaffPreview, { ok: true }>["previewRows"][number]>["data"];
type AssignmentsRowPreview = NonNullable<Extract<AssignmentsPreview, { ok: true }>["previewRows"][number]>["data"];
```

- [ ] **Step 4: Insert the Staff step (step 2)**

```tsx
          {step === 2 && (
            <CsvStep<StaffRowPreview, StaffCommit>
              title="Staff CSV"
              schoolYearId={selectedYearId}
              schoolYearLabel={selectedYear.label}
              onChangeYear={() => setStep(1)}
              requiredColumns={["email", "name", "role"]}
              optionalColumns={["password", "status"]}
              hints={
                <p>
                  <code className="font-mono">role</code> is one of <code>ADMIN</code>, <code>TEACHER</code>,{" "}
                  <code>COUNSELOR</code>, <code>PRINCIPAL</code>. Leave <code className="font-mono">password</code> blank
                  to apply the shared default. Re-importing never overwrites an existing user&apos;s password.
                  Import staff <strong>before</strong> assignments — assignment rows resolve teachers by email.
                </p>
              }
              sampleFileName="staff-sample.csv"
              sampleRows={[
                { email: "e.bautista@school.edu", name: "BAUTISTA, Elena S.", role: "PRINCIPAL", password: "", status: "ACTIVE" },
                { email: "r.villanueva@school.edu", name: "VILLANUEVA, Rosa M.", role: "COUNSELOR", password: "", status: "ACTIVE" },
                { email: "j.reyes@school.edu", name: "REYES, Juan M.", role: "TEACHER", password: "", status: "ACTIVE" },
              ]}
              previewAction={previewStaffAction}
              commitAction={commitStaffAction}
              previewHeaders={["Row", "Email", "Name", "Role", "Status"]}
              renderRow={(r) => [
                <td key="row" className="px-2 py-2 text-slate-500">{r.row}</td>,
                <td key="email" className="px-2 py-2 font-mono">{r.data.email}</td>,
                <td key="name" className="px-2 py-2">{r.data.name}</td>,
                <td key="role" className="px-2 py-2">{r.data.role}</td>,
                <td key="status" className="px-2 py-2">{r.data.status}</td>,
              ]}
              commitButtonLabel={(n) => `Commit ${n} staff row(s)`}
              renderSuccess={(c) => (
                <ul className="mt-2 list-disc pl-5 text-xs">
                  <li>{c.created} user(s) created</li>
                  <li>{c.updated} user(s) updated</li>
                </ul>
              )}
            />
          )}
```

- [ ] **Step 5: Insert the Assignments step (step 4)**

```tsx
          {step === 4 && (
            <CsvStep<AssignmentsRowPreview, AssignmentsCommit>
              title="Assignments CSV"
              schoolYearId={selectedYearId}
              schoolYearLabel={selectedYear.label}
              onChangeYear={() => setStep(1)}
              requiredColumns={["email", "gradeLevel", "section"]}
              optionalColumns={["subjectCode", "subjectName", "isAdviser"]}
              hints={
                <p>
                  Leave <code className="font-mono">subjectCode</code> and <code className="font-mono">subjectName</code>{" "}
                  blank and set <code className="font-mono">isAdviser</code> to <code>true</code> for an advisory row.
                  Sections and subjects are created automatically. Use{" "}
                  <code className="font-mono">gradeLevel</code> = <code>Grade 9</code> and{" "}
                  <code className="font-mono">section</code> = <code>Moonstone</code> — bare section names, no grade prefix.
                </p>
              }
              sampleFileName="assignments-sample.csv"
              sampleRows={[
                { email: "j.reyes@school.edu", gradeLevel: "Grade 9", section: "Newton", subjectCode: "", subjectName: "", isAdviser: "true" },
                { email: "j.reyes@school.edu", gradeLevel: "Grade 9", section: "Curie", subjectCode: "ENG9", subjectName: "English 9", isAdviser: "false" },
              ]}
              previewAction={previewAssignmentsAction}
              commitAction={commitAssignmentsAction}
              previewHeaders={["Row", "Teacher", "Grade · Section", "Subject", "Adviser"]}
              renderRow={(r) => [
                <td key="row" className="px-2 py-2 text-slate-500">{r.row}</td>,
                <td key="email" className="px-2 py-2 font-mono">{r.data.email}</td>,
                <td key="sec" className="px-2 py-2">{r.data.gradeLevel} · {r.data.section}</td>,
                <td key="subj" className="px-2 py-2">{r.data.subjectCode ?? "—"}</td>,
                <td key="adv" className="px-2 py-2">{r.data.isAdviser ? "Yes" : "—"}</td>,
              ]}
              commitButtonLabel={(n, label) => `Commit ${n} assignment(s) to ${label}`}
              renderSuccess={(c) => (
                <ul className="mt-2 list-disc pl-5 text-xs">
                  <li>{c.created.sections} section(s) created</li>
                  <li>{c.created.subjects} subject(s) created</li>
                  <li>{c.created.assignments} assignment(s) created</li>
                </ul>
              )}
            />
          )}
```

- [ ] **Step 6: Fix the two roster sample bugs**

In the roster `CsvStep`, replace the `sampleRows` array. The old values use `gradeLevel: "9"` / `section: "9-Newton"`, which forks the section table because sections upsert on `(schoolYearId, gradeLevel, name)`.

```tsx
              sampleRows={[
                { lrn: "136800010001", firstName: "Maria", lastName: "Santos", middleName: "Dela Cruz", sex: "FEMALE", birthDate: "2010-04-12", gradeLevel: "Grade 9", section: "Newton", learningModality: "FACE_TO_FACE", guardianName: "Ana Santos", guardianContact: "09171234567", spedStatus: "NONE" },
                { lrn: "136800010002", firstName: "Juan", lastName: "Reyes", middleName: "", sex: "MALE", birthDate: "07/30/2010", gradeLevel: "Grade 9", section: "Curie", learningModality: "MODULAR", guardianName: "Rosa Reyes", guardianContact: "09181234567", spedStatus: "NONE" },
              ]}
```

Update the roster step's `optionalColumns` to match what the validator actually accepts:

```tsx
              optionalColumns={["middleName", "learningModality", "guardianName", "guardianContact", "spedStatus"]}
```

Add to the roster step's `hints`, inside the existing fragment:

```tsx
                  <p>
                    <code className="font-mono">gradeLevel</code> is the full label (<code>Grade 9</code>) and{" "}
                    <code className="font-mono">section</code> is the bare name (<code>Newton</code>) — not{" "}
                    <code>9-Newton</code>. Sections are keyed on the pair, so mixing conventions creates duplicates.
                  </p>
```

- [ ] **Step 7: Typecheck, lint, and smoke-test**

```bash
npx tsc --noEmit && npm run lint
npm run dev
```

Then open `http://localhost:3010/admin/import`, log in as `admin@school.edu` / `admin123`, and confirm: 9 step buttons render, steps 2–9 unlock after picking a year, and each of steps 2, 3, and 4 shows its required-column list and a downloadable sample.

- [ ] **Step 8: Commit**

```bash
git add components/roles/admin/import-wizard.tsx
git commit -m "feat: add staff and assignment steps to the import wizard; fix roster sample naming convention"
```

---

### Task 7: Extract the source workbooks into three CSVs

The extractor is **throwaway** — the repo is TypeScript-only with no xlsx reader installed, and this runs once. Keep it in the session scratchpad, not `scripts/`. The CSVs and the data-quality report are the deliverable.

**Files:**
- Create (scratchpad, not committed): `extract.py`
- Create (gitignored by Task 1): `sample-import-data/generated/staff.csv`
- Create (gitignored): `sample-import-data/generated/roster.csv`
- Create (gitignored): `sample-import-data/generated/assignments.csv`
- Create (gitignored): `sample-import-data/generated/data-quality-report.md`

**Interfaces:**
- Consumes: the column contracts from Tasks 3, 4, 5
- Produces: three CSVs whose headers exactly match `ROSTER_COLUMNS`, `STAFF_COLUMNS`, `ASSIGNMENT_COLUMNS`

- [ ] **Step 1: Confirm Task 1's ignore rule is active**

```bash
git check-ignore -v sample-import-data/
```

Expected: prints the matching `.gitignore` rule. **If it prints nothing, stop and complete Task 1 first** — the next step writes real student PII into this tree.

- [ ] **Step 2: Set up the extraction environment**

```bash
python3 -m venv /tmp/xlsxenv && /tmp/xlsxenv/bin/pip install -q openpyxl
```

Do not name any script `inspect.py` — it shadows the stdlib `inspect` module that openpyxl imports.

- [ ] **Step 3: Write the extractor**

Write `extract.py` in the scratchpad (never in `scripts/` — the repo is
TypeScript-only and this runs once):

```python
"""One-shot extractor: two school spreadsheets -> three importable CSVs + a
data-quality report. Throwaway. Run with the openpyxl venv from Step 2."""
import csv, os, re, unicodedata
from collections import Counter, defaultdict
from difflib import get_close_matches
import openpyxl

SRC = "sample-import-data"
OUT = f"{SRC}/generated"
STUDENTS = f"{SRC}/WARM BODIES 26-27(2).xlsx"
TEACHERS = f"{SRC}/tEACHER LIST 2026(2).xlsx"

# The 17 sections named in the teacher list. Section -> grade level.
SECTIONS = {}
for _g, _names in {
    "Grade 7":  ["Baguette", "Emerald", "Princess", "Radiant"],
    "Grade 8":  ["Alexandrite", "Amber", "Amethyst", "Aquamarine", "Aventurine"],
    "Grade 9":  ["Moissanite", "Moonstone", "Morganite", "Musgravite"],
    "Grade 10": ["Jade", "Pearl", "Ruby", "Sapphire"],
}.items():
    for _n in _names:
        SECTIONS[_n.upper()] = (_g, _n)

# Roster sheet -> grade level. Chosen snapshot; see the design doc.
SNAPSHOT = {"G7(2)": "Grade 7", "G8": "Grade 8", "G9": "Grade 9", "G10 (2)": "Grade 10"}
# LRN entry-year digits for each grade in this cohort ladder.
ENTRY_YEAR = {"Grade 7": "19", "Grade 8": "18", "Grade 9": "17", "Grade 10": "16"}
BIRTH_YEAR = {"Grade 7": 2013, "Grade 8": 2012, "Grade 9": 2011, "Grade 10": 2010}

SUBJECTS = {  # code -> (canonical name, match aliases)
    "ENG":   ("English", ["english", "eng"]),
    "FIL":   ("Filipino", ["filipino", "fil"]),
    "MATH":  ("Mathematics", ["math", "mathematics", "mth"]),
    "SCI":   ("Science", ["science", "sci"]),
    "AP":    ("Araling Panlipunan", ["ap", "araling panlipunan"]),
    "TLE":   ("Technology and Livelihood Education", ["tle"]),
    "MAPEH": ("MAPEH", ["mapeh"]),
    "VE":    ("Values Education", ["val ed", "val. ed", "val.ed", "values", "vale/ ed", "vale ed", "ve"]),
    "ICT":   ("Information and Communications Technology", ["ict"]),
}

D12 = re.compile(r"^\d{12}$")
report = defaultdict(list)


def fold(s):
    """LUSTAÑAS -> lustanas"""
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


# ---------------------------------------------------------------- sex
MALE_NAMES = {
    "john","juan","jose","mark","paolo","carl","kyle","james","daniel","angelo","prince","rey",
    "christian","jayson","joshua","michael","gabriel","luis","miguel","nathaniel","nathanael",
    "adrian","ryan","dan","gerald","jerome","xian","zyan","charles","lord","zedrick","neil",
    "jhon","aldrich","brandon","travis","arvin","seth","wayne","dennis","kurt","axel","jacob",
    "dwayne","jelo","justher","jameer","alexis","francis","heinz","bernard","matt","lebron",
}
FEMALE_NAMES = {
    "maria","ana","princess","jane","joy","grace","mary","angel","cristine","kristine","jhoana",
    "shannen","aliyah","jhamae","micah","jade","glaidylle","lei","precious","reese","olivia",
    "erin","jamaica","jyla","gladys","cess","samantha","jamilla","genevieve","rhianna","dimple",
    "gwenn","kyla","annie","unice","zysa","alisha","crizelle","zhanika","jemieca","clarice",
    "scarlet","akizia","cheska","ericka","farrah","jayne","avrille","mhiezy","aira","christine",
    "rhean","aliah","althea","jhinneth","arianne","arriane","eunice","iris","yohanna","marie",
}


def infer_sex(first_name):
    for token in re.split(r"[\s.\-]+", first_name.lower()):
        if token in MALE_NAMES:
            return "MALE"
        if token in FEMALE_NAMES:
            return "FEMALE"
    return None


def harvest_sex(wb):
    """Majority vote: a sex token within 8 columns to the right of an LRN."""
    votes = defaultdict(Counter)
    for name in wb.sheetnames:
        for row in wb[name].iter_rows(values_only=True):
            cells = ["" if v is None else str(v).strip() for v in row]
            lrns = [i for i, c in enumerate(cells) if D12.match(c)]
            sexes = [(i, c.upper()) for i, c in enumerate(cells)
                     if c.upper() in ("MALE", "FEMALE", "M", "F")]
            for i in lrns:
                near = [(j - i, v) for j, v in sexes if 0 < j - i <= 8]
                if near:
                    _, v = min(near)
                    votes[cells[i]]["MALE" if v.startswith("M") else "FEMALE"] += 1
    return {k: c.most_common(1)[0][0] for k, c in votes.items()}


# ---------------------------------------------------------------- roster
def split_name(raw):
    """'ALCANTARA.ERNIE, Jr Malabanan' -> ('Alcantara.Ernie', 'Jr Malabanan', '')"""
    last, _, rest = raw.partition(",")
    rest = re.sub(r"\s+", " ", rest).strip()
    m = re.search(r"\s([A-Za-z]{1,2})\.?$", rest)
    middle = m.group(1).upper() if m else ""
    first = rest[: m.start()].strip() if m else rest
    return last.strip().title(), first.title(), middle


def extract_roster(wb, sex_votes):
    rows, used_lrn, mint_seq = [], set(), Counter()

    def mint(prefix, grade):
        """Format-valid, collision-free replacement LRN."""
        prefix = prefix if re.match(r"^\d{6}$", prefix or "") else "109169"
        while True:
            mint_seq[prefix] += 1
            candidate = f"{prefix}{ENTRY_YEAR[grade]}{mint_seq[prefix]:04d}"
            if candidate not in used_lrn:
                return candidate

    for sheet, grade in SNAPSHOT.items():
        sheet_rows = list(wb[sheet].iter_rows(values_only=True))
        section = None
        for i, r in enumerate(sheet_rows):
            head = r[0] if len(r) > 0 else None
            if isinstance(head, str) and head.strip().upper().startswith("GRADE"):
                nxt = sheet_rows[i + 1][0] if i + 1 < len(sheet_rows) else None
                raw = nxt if isinstance(nxt, str) else ""
                key = re.split(r"[(\-]", raw)[0].strip().upper()
                section = SECTIONS.get(key, (None, None))[1]
                continue
            if section is None:
                continue
            lrn = str(r[1]).strip() if len(r) > 1 and r[1] is not None else ""
            name = str(r[2]).strip() if len(r) > 2 and r[2] is not None else ""
            if not name or name.upper() == "STUDENT NAME":
                continue

            original = lrn
            if D12.match(lrn) and lrn not in used_lrn:
                if not 12 <= int(lrn[6:8]) <= 20:
                    report["implausible_year"].append(f"{name} — {lrn} (entry year '{lrn[6:8]}', kept as-is)")
            else:
                reason = "duplicate of an earlier row" if D12.match(lrn) else f"malformed value {original!r}"
                lrn = mint(original[:6], grade)
                report["minted"].append(f"{name} ({grade} {section}) — {original!r} -> {lrn} ({reason})")
            used_lrn.add(lrn)

            last, first, middle = split_name(name)
            sex = sex_votes.get(original) or sex_votes.get(lrn)
            if not sex:
                sex = infer_sex(first)
                if sex:
                    report["inferred_sex"].append(f"{last}, {first} -> {sex} (from given name)")
                else:
                    sex = "FEMALE" if len(used_lrn) % 2 == 0 else "MALE"
                    report["inferred_sex"].append(f"{last}, {first} -> {sex} (NO SIGNAL — alternating fallback)")

            n = len(rows)
            rows.append({
                "lrn": lrn, "firstName": first, "lastName": last, "middleName": middle,
                "sex": sex,
                "birthDate": f"{BIRTH_YEAR[grade]}-{(n % 12) + 1:02d}-{(n % 28) + 1:02d}",
                "gradeLevel": grade, "section": section,
                "learningModality": "FACE_TO_FACE",
                "guardianName": f"Guardian of {first} {last}",
                "guardianContact": f"09{170000000 + n:09d}"[:11],
                "spedStatus": "NONE",
            })
    return rows


# ---------------------------------------------------------------- staff
ROLE_BY_KEYWORD = [("PRINCIPAL", "PRINCIPAL"), ("GUIDANCE", "COUNSELOR"), ("RECORDS", "ADMIN")]
SKIP_DESIGNATIONS = ("LIBRARIAN", "NURSE")


def extract_staff(wb):
    ws, staff, emails = wb["Summary (2)"], [], Counter()
    for r in ws.iter_rows(min_row=10, max_row=42, values_only=True):
        name = str(r[1]).strip() if len(r) > 1 and r[1] else ""
        desig = str(r[2]).strip().upper() if len(r) > 2 and r[2] else ""
        if not name or not desig:
            continue
        if any(k in desig for k in SKIP_DESIGNATIONS):
            report["skipped_staff"].append(f"{name} — {desig} (no matching role in the four-role model)")
            continue
        # "ASST. PRINCIPAL & ENG 8" teaches, so match the standalone word only.
        role = "TEACHER"
        for keyword, mapped in ROLE_BY_KEYWORD:
            if desig == keyword or desig.startswith(keyword + " ") or desig == keyword + ".":
                role = mapped
                break
        last, _, first = name.partition(",")
        initial = fold(first.strip())[:1].lower() or "x"
        slug = re.sub(r"[^a-z]", "", fold(last).lower())
        email = f"{initial}.{slug}@school.edu"
        emails[email] += 1
        if emails[email] > 1:
            email = f"{initial}{emails[email]}.{slug}@school.edu"
            report["email_collisions"].append(f"{name} -> {email}")
        staff.append({"email": email, "name": name, "role": role, "password": "", "status": "ACTIVE",
                      "_adviser": str(r[3]).strip() if len(r) > 3 and r[3] else ""})
    return staff


# ---------------------------------------------------------------- assignments
def match_section(fragment):
    upper = fragment.upper()
    for key, (grade, name) in SECTIONS.items():
        if key in upper:
            return grade, name
    hit = get_close_matches(upper, list(SECTIONS), n=1, cutoff=0.72)
    if hit:
        return SECTIONS[hit[0]]
    for word in re.findall(r"[A-Za-z]{4,}", fragment):
        hit = get_close_matches(word.upper(), list(SECTIONS), n=1, cutoff=0.78)
        if hit:
            return SECTIONS[hit[0]]
    return None, None


def match_subject(fragment):
    low = " " + re.sub(r"[^a-z. /]", " ", fragment.lower()) + " "
    best = None
    for code, (_name, aliases) in SUBJECTS.items():
        for alias in aliases:
            if f" {alias} " in low or f" {alias}." in low or low.strip().startswith(alias):
                if best is None or len(alias) > best[1]:
                    best = (code, len(alias))
    if best:
        return best[0]
    for word in re.findall(r"[a-z]{3,}", low):
        for code, (_n, aliases) in SUBJECTS.items():
            if get_close_matches(word, aliases, n=1, cutoff=0.82):
                return code
    return None


def extract_assignments(staff, wb2026):
    rows, seen = [], set()

    for s in staff:  # advisories, from the CLASS ADVISER column
        if not s["_adviser"]:
            continue
        grade, section = match_section(s["_adviser"])
        if not section:
            report["unresolved"].append(f"adviser cell for {s['name']}: {s['_adviser']!r}")
            continue
        rows.append({"email": s["email"], "gradeLevel": grade, "section": section,
                     "subjectCode": "", "subjectName": "", "isAdviser": "true"})

    by_name = {s["name"]: s["email"] for s in staff}
    ws = wb2026["Summary2026"]
    for r in ws.iter_rows(min_row=10, max_row=42, values_only=True):
        name = str(r[1]).strip() if len(r) > 1 and r[1] else ""
        handled = str(r[3]).strip() if len(r) > 3 and r[3] else ""
        email = by_name.get(name)
        if not email or not handled:
            continue
        for fragment in (f.strip() for f in handled.split(",") if f.strip()):
            grade, section = match_section(fragment)
            code = match_subject(fragment)
            if not section or not code:
                report["unresolved"].append(f"{name}: {fragment!r} (section={section}, subject={code})")
                continue
            full = f"{code}{grade.split()[1]}"
            key = (email, grade, section, full)
            if key in seen:
                continue
            seen.add(key)
            rows.append({"email": email, "gradeLevel": grade, "section": section,
                         "subjectCode": full,
                         "subjectName": f"{SUBJECTS[code][0]} {grade.split()[1]}",
                         "isAdviser": "false"})
    return rows


# ---------------------------------------------------------------- main
def write_csv(path, rows, fields):
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)
    print(f"{path}: {len(rows)} rows")


os.makedirs(OUT, exist_ok=True)
wb_s = openpyxl.load_workbook(STUDENTS, data_only=True)
wb_t = openpyxl.load_workbook(TEACHERS, data_only=True)

roster = extract_roster(wb_s, harvest_sex(wb_s))
staff = extract_staff(wb_t)
assignments = extract_assignments(staff, wb_t)

write_csv(f"{OUT}/roster.csv", roster,
          ["lrn", "firstName", "lastName", "middleName", "sex", "birthDate", "gradeLevel",
           "section", "learningModality", "guardianName", "guardianContact", "spedStatus"])
write_csv(f"{OUT}/staff.csv", staff, ["email", "name", "role", "password", "status"])
write_csv(f"{OUT}/assignments.csv", assignments,
          ["email", "gradeLevel", "section", "subjectCode", "subjectName", "isAdviser"])

with open(f"{OUT}/data-quality-report.md", "w") as f:
    f.write("# Data Quality Report\n\n")
    f.write("Every departure from the source spreadsheets. Generated, not committed.\n\n")
    f.write(f"- Students: {len(roster)}\n- Staff: {len(staff)}\n"
            f"- Assignments: {len(assignments)}\n\n")
    f.write("## Blanket synthetic fields\n\n"
            "All birth dates, guardian names, and guardian contacts are synthetic. "
            "`learningModality` is `FACE_TO_FACE` and `spedStatus` is `NONE` for every "
            "student. The 488 real guardian phone numbers in the source were deliberately "
            "NOT carried through.\n\n")
    for key, title in [
        ("minted", "Minted LRNs"),
        ("inferred_sex", "Inferred sex"),
        ("implausible_year", "Implausible entry years (kept as-is)"),
        ("unresolved", "UNRESOLVED — needs manual attention"),
        ("skipped_staff", "Staff not imported"),
        ("email_collisions", "Email collisions resolved"),
    ]:
        f.write(f"## {title} ({len(report[key])})\n\n")
        for line in report[key]:
            f.write(f"- {line}\n")
        f.write("\n")
    f.write("## Open questions for the registrar\n\n"
            "1. For each of the 34 collided LRN pairs, which student owns the original "
            "number? Minting made the import succeed but did not recover the true binding.\n"
            "2. Sex for every student listed above as inferred.\n"
            "3. Is the snapshot really SY 2025-2026? Inferred from LRN entry digits.\n"
            "4. Is Moonstone genuinely thin, or is the block an incomplete transcription?\n"
            "5. Birth dates — the SF1 would replace every synthesized value.\n")
print(f"{OUT}/data-quality-report.md written")
```

**Read the `UNRESOLVED` section of the report before moving on.** Every entry
there is an assignment the extractor refused to guess at. Fix the matcher or add
the row by hand — do not ignore them.

- [ ] **Step 4: Run the extractor and check the counts**

```bash
/tmp/xlsxenv/bin/python extract.py
wc -l sample-import-data/generated/*.csv
head -3 sample-import-data/generated/roster.csv
```

Expected: `staff.csv` 32 lines (31 + header), `roster.csv` 577 (576 + header), `assignments.csv` ~168. If assignments is far below ~167, unresolved fragments are being silently dropped — check the report.

- [ ] **Step 5: Validate all three against the real validators before importing**

```bash
tsx scripts/verify-csv-import.ts roster sample-import-data/generated/roster.csv
```

Expected: `total=576 valid=576 invalid=0`. Any invalid row means the extractor and the validator disagree — fix the extractor, not the validator.

For staff and assignments, run the Task 4 and Task 5 harnesses first to confirm they still pass, then check the generated files through the wizard preview in Task 8 (the assignments validator needs a live DB for its user refs).

- [ ] **Step 6: Confirm nothing is staged for commit**

```bash
git status --porcelain
```

Expected: no `sample-import-data/` entries. Nothing from this task gets committed.

---

### Task 8: End-to-end import and regression walk

**Files:**
- Create: `scripts/verify-school-year-load.ts`

**Interfaces:**
- Consumes: everything from Tasks 2–7
- Produces: a repeatable assertion that a loaded school year is complete

- [ ] **Step 1: Write the failing verification harness**

Create `scripts/verify-school-year-load.ts`:

```typescript
// Asserts a fully loaded school year. Run after importing all three CSVs.
// Usage: tsx scripts/verify-school-year-load.ts "SY 2026-2027"

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const EXPECTED = {
  students: 576,
  sections: 17,
  staff: 31,
  consents: 1728,
};

async function main() {
  const label = process.argv[2] ?? "SY 2026-2027";
  const sy = await prisma.schoolYear.findUnique({ where: { label } });
  if (!sy) throw new Error(`School year "${label}" not found`);

  const [enrollments, sections, subjects, assignments, advisers, users, consents, grades, attendance] =
    await Promise.all([
      prisma.studentEnrollment.count({ where: { schoolYearId: sy.id } }),
      prisma.section.count({ where: { schoolYearId: sy.id } }),
      prisma.subject.count({ where: { schoolYearId: sy.id } }),
      prisma.teacherAssignment.count({ where: { schoolYearId: sy.id } }),
      prisma.teacherAssignment.count({ where: { schoolYearId: sy.id, isAdviser: true } }),
      prisma.user.count(),
      prisma.consentRecord.count(),
      prisma.grade.count({ where: { enrollment: { schoolYearId: sy.id } } }),
      prisma.attendance.count({ where: { enrollment: { schoolYearId: sy.id } } }),
    ]);

  const rows = [
    ["enrollments", enrollments, EXPECTED.students],
    ["sections", sections, EXPECTED.sections],
    ["advisers", advisers, EXPECTED.sections],
    ["grades (must be 0)", grades, 0],
    ["attendance (must be 0)", attendance, 0],
  ] as const;

  let failed = false;
  for (const [name, actual, expected] of rows) {
    const ok = actual === expected;
    if (!ok) failed = true;
    console.log(`${ok ? "ok  " : "FAIL"} ${name}: ${actual} (expected ${expected})`);
  }
  console.log(`info subjects: ${subjects}`);
  console.log(`info assignments: ${assignments}`);
  console.log(`info users (all years): ${users}`);
  console.log(`info consents (all years): ${consents}`);

  // Every enrollment must point at a section belonging to this year.
  const orphaned = await prisma.studentEnrollment.count({
    where: { schoolYearId: sy.id, section: { schoolYearId: { not: sy.id } } },
  });
  if (orphaned !== 0) {
    failed = true;
    console.log(`FAIL orphaned enrollments (section in a different year): ${orphaned}`);
  } else {
    console.log("ok   no cross-year section leakage");
  }

  if (failed) throw new Error("one or more assertions failed");
  console.log("PASS");
}

main()
  .catch((e) => {
    console.error("FAIL:", e instanceof Error ? e.message : e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
```

- [ ] **Step 2: Run it to verify it fails**

```bash
tsx scripts/verify-school-year-load.ts "SY 2026-2027"
```

Expected: FAIL — `School year "SY 2026-2027" not found`.

- [ ] **Step 3: Create the school year**

Start the dev server, sign in as `admin@school.edu` / `admin123`, go to `/admin/setup`, and create:

- Label: `SY 2026-2027`
- Start: `2026-08-01`
- End: `2027-05-31`
- Active: yes

- [ ] **Step 4: Import the three CSVs in order**

At `/admin/import`, select `SY 2026-2027`, then import **in this order** — each preview must show 0 invalid rows before you commit:

1. Step 2 — `sample-import-data/generated/staff.csv` → expect 31 created
2. Step 3 — `sample-import-data/generated/roster.csv` → expect 576 students, 17 sections, 1,728 consents
3. Step 4 — `sample-import-data/generated/assignments.csv` → expect 0 new sections (the roster already made them), ~36 subjects, ~167 assignments

If the assignments preview reports `No staff user with email ...`, the staff import did not run first.

- [ ] **Step 5: Run the harness to verify it passes**

```bash
tsx scripts/verify-school-year-load.ts "SY 2026-2027"
```

Expected: every line `ok`, ending in `PASS`. Grades and attendance must both be 0 — that is the point of this school year.

- [ ] **Step 6: Verify idempotency**

Re-import all three CSVs through the wizard again, then:

```bash
tsx scripts/verify-school-year-load.ts "SY 2026-2027"
```

Expected: identical counts. Every path upserts, so a second run must create nothing.

- [ ] **Step 7: Verify rollback**

Copy `roster.csv`, corrupt one row's LRN to `123`, and preview it. Expected: the preview flags exactly that row number, and the commit button refuses with `1 row(s) have errors`. Confirm counts are unchanged afterward.

- [ ] **Step 8: Verify audit entries**

```bash
tsx -e "
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
prisma.auditLog.findMany({ where: { action: 'IMPORT' }, orderBy: { createdAt: 'desc' }, take: 5 })
  .then((r) => console.log(r.map((x) => [x.resourceType, JSON.stringify(x.metadata)].join(' ')).join('\n')))
  .finally(() => prisma.\$disconnect());
"
```

Expected: three recent `IMPORT` rows — `Staff`, `Roster`, `TeacherAssignment` — each with row counts in metadata.

- [ ] **Step 9: Walk the Maria Santos regression**

Switch the year selector to `SY 2025-2026` and walk `docs/AEM_Scenario_Maria.md` end to end. Every step must still pass — the new year must not have disturbed the demo years. CLAUDE.md treats this as the phase-boundary check.

- [ ] **Step 10: Commit**

```bash
git add scripts/verify-school-year-load.ts
git commit -m "test: add school-year load verification harness"
```

---

### Task 9: Documentation

**Files:**
- Modify: `docs/AEM_Development_Phases.md`
- Modify: `CLAUDE.md`

**Interfaces:**
- Consumes: outcomes of Tasks 2–8
- Produces: nothing code depends on

- [ ] **Step 1: Record the new scope in the phase tracker**

Spec §6.11 lists six wizard steps; staff, section, subject, and assignment import is beyond it. Per CLAUDE.md convention #9 this is recorded, not smuggled. Append a new section to `docs/AEM_Development_Phases.md`:

```markdown
## Phase 11 — Staff & Assignment Import ✅ *(complete 2026-08-27)*

Beyond spec §6.11, which lists six wizard steps and no staff/section/subject
import. Added because loading a real school otherwise means hand-entering ~200
relationships through `/admin/setup` and `/admin/users`, and because staff and
advisories change every August.

- [x] `lib/import/staff.ts` + `app/actions/import/staff.ts` — role mapping,
      bcrypt at cost 10, never overwrites an existing password on re-import
- [x] `lib/import/assignments.ts` + `app/actions/import/assignments.ts` —
      upserts Section and Subject, one adviser per section enforced in the validator
- [x] Import Wizard 7 → 9 steps; staff precedes roster precedes assignments
- [x] Roster importer maps `guardianName`, `guardianContact`, `spedStatus`
- [x] Fixed the roster sample's `gradeLevel: "9"` / `section: "9-Newton"` bug —
      it forked the section table against the `Grade 9` / `Newton` convention
      in `prisma/seed.ts:29,34`
- [x] Restored the drifted `SpedStatus` enum, `Student.spedStatus`, and
      `SpedStatusChange` to `schema.prisma` (created in the init migration,
      never dropped, but absent from the schema file)
- [x] Loaded SY 2026-2027: 576 students, 17 sections, 31 staff, ~167 assignments
- [x] Verified by `scripts/verify-school-year-load.ts`

### Deliberately not built

- **Grades and attendance for SY 2026-2027.** Neither exists in the source
  workbooks — a full cell census found 112 stray attendance marks (95 in a stale
  sheet), no date cells, and zero grade values. Real users generate them.
- **SPED in the risk engine and bias dashboard.** `computeProfileBreakdown`
  (`lib/risk/engine.ts:238`) still takes only `learningModality`, and
  `getBiasBreakdowns` has no SPED axis, though this tracker's Phase 5 notes at
  lines 598 and 675 claim otherwise. With every student `NONE` there is no
  variance to surface. **Carry-forward item.**
- **An importer for DepEd SF1/SF2/SF9.** Revisit when the registrar supplies
  real exports.

### Known data limitations

Recorded in the generated `data-quality-report.md`, not in git (the source data
is PII and `sample-import-data/` is gitignored):

- 34 LRNs appeared twice on different students, concentrated in Grade 9
  Moissanite/Moonstone. Replacements were minted so the import succeeds, but the
  true LRN↔name binding is unrecoverable from the file — for each pair, one real
  student now holds a wrong identifier and only the registrar can say which.
- 204 of 576 students (35%) had no recoverable sex; inferred from given name and
  individually flagged for correction.
- All birth dates, guardian names, and guardian contacts are synthetic.
```

- [ ] **Step 2: Fix the two stale Phase 5 claims**

At `docs/AEM_Development_Phases.md:598` and `:675`, both claim bias breakdown by SPED status ships. It does not. Append to each line:

```markdown
 — **correction (2026-08-27): the SPED axis was never built.** `getBiasBreakdowns` covers grade level, section, sex, and learning modality only. See Phase 11 carry-forward.
```

- [ ] **Step 3: Add the staff accounts to CLAUDE.md**

Under the existing "Seed accounts (dev only)" table, add:

```markdown
### Real-school staff accounts (SY 2026-2027)

31 staff imported from the school's teacher list. Email pattern
`firstinitial.lastname@school.edu`, shared password `changeme2026`.

| Email | Role | Notes |
|---|---|---|
| `e.bautista@school.edu` | PRINCIPAL | |
| `r.villanueva@school.edu` | COUNSELOR | Guidance |
| `c.mendoza@school.edu` | ADMIN | Records officer |
| *(28 others)* | TEACHER | 17 are section advisers |

The librarian and nurse were not imported — neither has a teaching load or a
role in the spec's four-role model.

Active SY after this import is **SY 2026-2027** (576 students, 17 sections,
Grades 7-10, no grades or attendance). The Maria Santos reference scenario lives
in **SY 2025-2026** — switch years to walk it.
```

- [ ] **Step 4: Commit**

```bash
git add docs/AEM_Development_Phases.md CLAUDE.md
git commit -m "docs: record staff/assignment importer as Phase 11 and correct stale SPED bias claims"
```

---

### Task 10 (OPTIONAL): Replay script for `db:reset`

Beyond the approved spec. `npm run db:reset` wipes everything, so without this the three CSVs must be re-clicked after every reset. Cut this task if you'd rather keep scope tight.

**Files:**
- Create: `scripts/load-real-school.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: the same validators as Tasks 3, 4, 5 — never a parallel code path
- Produces: `npm run db:load:school`

- [ ] **Step 1: Write the script**

Create `scripts/load-real-school.ts`. It must call `validateStaffCsv`, `validateRosterCsv`, and `validateAssignmentsCsv` — the same functions the wizard uses — so the two paths cannot drift. It creates `SY 2026-2027` if absent, marks it active, then applies the same upserts in the same order (staff → roster → assignments), and writes one `AuditLog` row per stage attributed to the first `ADMIN` user. Refuse to run if any CSV is missing, naming the path.

- [ ] **Step 2: Add the npm script**

In `package.json` `scripts`, after `db:seed:demo`:

```json
    "db:load:school": "tsx scripts/load-real-school.ts",
```

- [ ] **Step 3: Verify against a clean database**

```bash
npm run db:reset && npm run db:seed && npm run db:seed:demo && npm run db:load:school
tsx scripts/verify-school-year-load.ts "SY 2026-2027"
```

Expected: `PASS`, with the same counts Task 8 produced through the wizard.

- [ ] **Step 4: Verify the demo years survived**

```bash
tsx scripts/verify-school-year-load.ts "SY 2025-2026" || true
```

The count assertions will not match (different year, different data) — what matters is that the year exists and has enrollments. Then walk `docs/AEM_Scenario_Maria.md` once more.

- [ ] **Step 5: Commit**

```bash
git add scripts/load-real-school.ts package.json
git commit -m "feat: add db:load:school to replay the real-school CSVs after a reset"
```
