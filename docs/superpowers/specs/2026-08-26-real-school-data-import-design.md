# Real School Data Import — Design

**Date:** 2026-08-26
**Status:** Draft (pending user review)
**Author:** AEM team

## Problem

The school provided two Excel workbooks in `sample-import-data/`:

- `tEACHER LIST 2026(2).xlsx` — 33 staff with designations, adviser sections, and
  a subject-by-section assignment list.
- `WARM BODIES 26-27(2).xlsx` — 15 sheets of student rosters.

Neither can be imported today. The wizard consumes flat CSVs (`lib/import/csv.ts`);
these are block-structured spreadsheets with merged headers. More importantly,
**the system has no importer for staff, sections, subjects, or teacher
assignments at all** — spec §6.11 lists six wizard steps, none of which cover
them. Loading this school means either hand-entering ~200 relationships through
`/admin/setup` and `/admin/users`, or building the missing importers.

## Goal

Load one school year to a realistic **starting state**: who the students are,
who the staff are, which sections exist, and who teaches or advises what.
Grades and attendance are deliberately excluded — the actual users generate
those through normal use.

## Source data analysis

### The student workbook is not a single-year roster

Its 15 sheets hold several years of the same cohorts stacked together. LRN
digits 7–8 encode the year the learner's LRN was issued, which makes the
overlap visible:

| Sheet | LRNs | Dominant entry year | Reading |
|---|---|---|---|
| `G7` | 146 | '17 | stale — the *Grade 9* cohort |
| `G7(3)` / `ID` | 135 / 142 | '18 | stale — the *Grade 8* cohort |
| `G7(2)` | 141 | '19 | **current Grade 7** |
| `G8` | 146 | '18 | **current Grade 8** |
| `G9` | 185 | '17 | **current Grade 9** |
| `G10` | 164 | '15 | stale — last year's Grade 10 |
| `G10 (2)` | 165 | '16 | **current Grade 10** |

`G7` ∩ `G8` share 135 LRNs. Importing every sheet would produce 186 duplicate-LRN
collisions and place students in the wrong grade.

**Chosen snapshot:** `G7(2)` + `G8` + `G9` + `G10 (2)`, with section blocks
filtered to the 17 sections named in the teacher list. Yields **576 roster rows**.

Entry year '19 → Grade 7 in SY 2025-2026, so the content is SY 2025-2026 despite
the "26-27" filename. This is an inference from LRN digits, not a statement from
the school (see Open Questions).

### No attendance or grade data exists

A census of every cell across all 15 sheets:

- **112** attendance-mark-like cells (P/A/T/E) total; 95 sit in `G7 (2)`, a stale
  sheet whose students have graduated. The MON–FRI grid is an unfilled printed
  form.
- **8** date cells in the entire workbook. There is no calendar to attach a mark to.
- The `TOTAL` rows at the foot of each section block are **headcounts** (36, 37,
  38 students), not attendance totals.
- The 60 numerics in the 60–100 range all live in `Girl Boy`, an enrollment
  statistics table. They are student counts, not scores.

### LRN quality

| Issue | Rows |
|---|---|
| Same LRN on two different students (34 LRNs × 2) | 68 |
| Malformed / placeholder (`0`, `1`, `11`, one 11-digit) | 7 |
| Structurally valid but implausible entry year ('22, '81) | 2 |
| Same name, two different LRNs | 0 |

**501 of 576 rows have a unique, well-formed LRN.**

The 68 duplicates concentrate in Grade 9 — Moissanite 27, Moonstone 28. They are
not a row-aligned copy (0/37 positional matches); the same LRN pool appears
reshuffled across both blocks bound to different names.

123 distinct 6-digit school prefixes is **not** a defect — the prefix identifies
the school that first issued the LRN, so a JHS drawing from many feeder
elementary schools is expected.

### Field coverage against the roster contract

| Column | Coverage | Resolution |
|---|---|---|
| `lrn` | 501/576 clean | 41 mints (34 second-occurrences + 7 malformed) |
| `lastName` / `firstName` | 576/576 | split on comma |
| `middleName` | ~80% | null when absent (optional) |
| `sex` | **372/576 (64.6%)** | infer remaining 204 from given name, flag each |
| `birthDate` | **0/576** | synthesize plausible in-cohort date |
| `gradeLevel` / `section` | 576/576 | from block headers |
| `learningModality` | 0% | default `FACE_TO_FACE` |
| `guardianName` / `guardianContact` | 0% / 91% | synthesize both |
| `spedStatus` | 0% | `NONE` for all |

## Decisions (captured during brainstorming)

1. **Purpose:** demo / thesis, real names retained.
2. **Bad LRNs:** mint valid replacements, keep all 576 students. Every mint recorded.
3. **Unknown sex:** infer from given name, flag each inferred student for correction.
4. **Guardian data:** fully synthetic for all 576 — this also removes 488 real
   phone numbers from the dataset.
5. **SPED:** re-declare the drifted field in `schema.prisma`; every student `NONE`.
6. **Staff accounts:** 31 of 33 imported (librarian and nurse have no matching
   role), generated `firstinitial.lastname@school.edu` emails, one shared demo
   password.
7. **Target year:** new `SY 2026-2027`, made active. The three seed-demo years
   stay untouched so the Maria Santos reference scenario remains walkable.
8. **No grades or attendance.** The actual users generate them.

## Scope boundary

Staff, section, subject, and assignment import is **new scope beyond spec §6.11**.
Per CLAUDE.md convention #9 it is recorded in `docs/AEM_Development_Phases.md`
rather than added silently.

## Architecture

### 1. Schema — reconcile the SPED drift

`prisma/migrations/20260511140850_init/migration.sql` created the `SpedStatus`
enum, `Student.spedStatus` (`NOT NULL DEFAULT 'NONE'`), and the
`SpedStatusChange` table. **No later migration dropped them**, but
`schema.prisma` no longer declares any of the three. The database columns are
almost certainly still present and invisible to Prisma Client.

Re-declare all three to match the init migration exactly. Verify against a
running database first; if the columns are present the migration is a no-op
reconciliation, and `prisma migrate diff` should confirm that before we generate
anything.

This closes a real spec gap: §320 lists SPED status as a **required** roster
column, §347 weights it in the 10% Profile factor, and §313/§523 make it a
bias-monitoring axis.

Out of scope: wiring SPED into `computeProfileBreakdown` (`lib/risk/engine.ts:238`,
currently modality-only) and into `getBiasBreakdowns`. Both are logged as
follow-ups — with every student `NONE` there is no variance to surface, so
building them now would demonstrate nothing.

### 2. Roster importer — three new optional columns

`lib/import/roster.ts` gains `guardianName`, `guardianContact`, and `spedStatus`
as optional columns; `app/actions/import/roster.ts` persists them on the
`Student` upsert. `spedStatus` normalizes `NONE` / `IEP` / `ACCOMMODATIONS`,
defaulting to `NONE`.

### 3. New importer — staff

`lib/import/staff.ts` + `app/actions/import/staff.ts`, following the existing
validator/preview/commit pattern.

| Column | Required | Notes |
|---|---|---|
| `email` | ✅ | unique key for upsert |
| `name` | ✅ | as printed in the teacher list |
| `role` | ✅ | `ADMIN` / `TEACHER` / `COUNSELOR` / `PRINCIPAL` |
| `password` | — | defaults to the shared demo password |
| `status` | — | defaults to `ACTIVE` |

Role mapping from designation:

| Designation | Role | Count |
|---|---|---|
| Principal | `PRINCIPAL` | 1 |
| Guidance | `COUNSELOR` | 1 |
| Records | `ADMIN` | 1 |
| Any teaching load | `TEACHER` | 28 |
| Librarian, Nurse | *(skipped)* | 2 |

Passwords are bcrypt-hashed at cost 10 in the commit action, never in the CSV.

### 4. New importer — assignments

`lib/import/assignments.ts` + `app/actions/import/assignments.ts`.

| Column | Required | Notes |
|---|---|---|
| `email` | ✅ | resolves to an existing `User` |
| `gradeLevel` | ✅ | e.g. `Grade 9` |
| `section` | ✅ | e.g. `Moonstone` |
| `subjectCode` | — | blank ⇒ adviser row |
| `subjectName` | — | required when `subjectCode` is present |
| `isAdviser` | — | `true` / `false`, defaults false |

The commit upserts `Section` on `(schoolYearId, gradeLevel, name)` and `Subject`
on `(schoolYearId, code)` — the same pattern `commitRosterAction` already uses —
then upserts `TeacherAssignment` on its four-part unique key. Adviser rows carry
`subjectId: null` per the model comment.

Subjects are **derived from the assignment rows**, not assumed as a
grade × subject cross-product, because the teacher list does not show every
subject taught in every grade.

Validation rules: the referenced user must exist; a row with `subjectName` but no
`subjectCode` (or vice versa) is an error; at most one adviser per section.

**Parsing hazard.** The `Section handled` column in `Summary2026` is free text,
one cell per teacher, comma-separated, and riddled with typos and inconsistent
spacing:

```
"Science 10 Jade, Science 9 Moonstone, Science 10 Sapphire, ..."
"TLE 8 Alexandrite, TLE 8 Aventurine, TLE 8 Amber, ..., TLE 8 Amthyst"   <- Amethyst
"Math 8 Amethyst, ..., Mth 8 Aventurine, ..., Math 8 Aquamarie"          <- Math, Aquamarine
"AP 8 Aquamarine, ..., AP 8 Aventure, ..., AP 8 Aventurine"              <- dupe + typo
"... Val. Ed. 9 Moonstone, Vale/ Ed. 9 Morganite"                        <- Val. Ed.
"AP 8 Alexandrite, ICT 7 Radiant, ..., ICT Princess, ..."                <- grade missing
```

Extraction therefore fuzzy-matches each fragment against the 17 known section
names and the 9 known subject areas, infers a missing grade level from the
matched section, and **fails loudly on any fragment it cannot resolve** rather
than guessing. Unresolved fragments go into the data-quality report for manual
resolution. Exact duplicates within one teacher's cell (e.g. `Math 10 Sapphire`
three times, `English 10 Jade` twice) collapse to one assignment — the
`TeacherAssignment` unique key would reject them anyway.

The ~150 figure is therefore approximate until extraction runs.

### 5. Wizard

`components/roles/admin/import-wizard.tsx` goes from 7 steps to 9:

```
1 Select school year
2 Staff CSV            ← new
3 Roster CSV           (extended)
4 Assignments CSV      ← new
5 Grades CSV
6 Attendance CSV
7 Behavioral CSV       (optional)
8 Interventions CSV    (optional)
9 SEL CSV              (optional)
```

Staff precedes roster and assignments because assignments reference users by
email; roster precedes assignments so sections exist first. Enforced by step
gating, not by trusting click order.

Two sample-data bugs fixed while in this file:

- The roster sample emits `gradeLevel: "9"` / `section: "9-Newton"`, but
  `prisma/seed.ts:29,34` and `scripts/seed-demo.ts` use `gradeLevel: "Grade 9"` /
  `name: "Newton"`. Since sections upsert on `(schoolYearId, gradeLevel, name)`,
  following the sample creates a **parallel duplicate set of sections**.
- The sample advertises `spedStatus`, which currently does not exist anywhere in
  the import path. Item 2 makes that promise true.

### 6. CSV generation

A throwaway extraction script produces three CSVs plus a data-quality report.
It is not committed to `scripts/` — the repo is TypeScript-only, no xlsx reader
is installed, and this runs exactly once. The **CSVs are the deliverable**; the
extractor is documented in this spec and kept in the session scratchpad.

Outputs, written to `sample-import-data/generated/` (covered by the new ignore rule):

| File | Rows |
|---|---|
| `staff.csv` | 31 |
| `roster.csv` | 576 |
| `assignments.csv` | ~167 (17 adviser + ~150 subject-section) |
| `data-quality-report.md` | — |

### 7. Transformation rules

| Source condition | Transformation |
|---|---|
| `BAGUETTE (JUSTINE - 105)` | → section `Baguette` |
| `ALCANTARA.ERNIE, Jr Malabanan` | split on comma, proper case |
| Trailing initial in given-name field | → `middleName` |
| Duplicate LRN, second occurrence | mint replacement (34) |
| Malformed LRN | mint replacement (7) |
| Missing sex | infer from given name, flag |
| Missing birthDate | synthesize in-cohort date from grade level |
| Missing modality | `FACE_TO_FACE` |
| Guardian fields | synthesize (name and contact) |
| `spedStatus` | `NONE` |

Minted LRNs reuse the row's real 6-digit school prefix, a plausible entry year
for the grade level, and an unused sequence, so they are format-valid and
collision-free within the file.

### 8. Data-quality report

Emitted with the CSVs, listing every departure from source:

- Each of the 41 minted LRNs, with the original value it replaced and why
- Each of the 204 inferred sex values, with the given name it was inferred from
- The 2 implausible entry years, kept as-is and flagged
- Every synthetic field, stated as a blanket rule
- Rows excluded by snapshot selection, with the sheet they came from
- The four unresolvable items below

This doubles as the methodology record for a thesis defense: it states exactly
which data is real and which is reconstructed.

## Data protection

`sample-import-data/` is **not gitignored** and the repo pushes to
`github.com:franze-calleja/aem-system`. The xlsx files are currently untracked,
so nothing has leaked. Add `sample-import-data/` and the generated CSVs to
`.gitignore` before generating anything into the repo.

Synthesizing guardian contacts removes 488 real phone numbers from the dataset,
which is the single largest exposure reduction available here.

## Testing

- Typecheck (`npx tsc --noEmit`) and lint clean.
- Unit-level: validator tests for `staff.ts` and `assignments.ts` covering
  missing required columns, unknown user email, subject code/name mismatch,
  duplicate adviser per section, and role normalization.
- Round-trip: import all three CSVs into a fresh `SY 2026-2027` on a reset
  database, then assert 576 students, 17 sections, 31 users, ~167 assignments,
  1,728 consent records.
- Idempotency: re-running every import produces no duplicates (all paths upsert).
- Rollback: a deliberately invalid row aborts the whole batch.
- Regression: switch to SY 2025-2026 and walk `docs/AEM_Scenario_Maria.md`.
- Audit: confirm a `logAudit` entry for each of the three commits.

## Out of scope

- Grades and attendance for SY 2026-2027 — the users generate them.
- SPED in the risk engine and bias dashboard — logged as follow-ups.
- Parsing xlsx inside the app. The wizard's flat-CSV contract stays the boundary.
- An importer for DepEd SF1/SF2/SF9 forms — worth revisiting when the registrar
  provides real exports.

## Open questions for the registrar

Not blockers for a demo; blockers for anything real.

1. **Which 55 Grade 9 students own which LRN?** Minting makes the import succeed
   but does not recover the true binding. One student in each of the 34 collided
   pairs will hold a wrong national identifier, and the file cannot say which.
2. **Sex for the 204 unknowns**, mostly Grade 7.
3. **Is the snapshot really SY 2025-2026?** Inferred from LRN entry digits.
4. **Is Moonstone genuinely thin**, or is the block an incomplete transcription?
5. **Birth dates** — the SF1 would replace every synthesized value.
