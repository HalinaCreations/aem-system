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
      "m.carandang@school.edu,\"CARANDANG, Mary Jane S.\",PRINCIPAL",
      "a.rosales@school.edu,\"ROSALES, Ann Charise M.\",counselor",
      "i.quejano@school.edu,\"QUEJANO, Igleseria A.\",Admin",
      "j.gabog@school.edu,\"GABOG, Jonas M.\",TEACHER",
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
      "j.gabog@school.edu,Jonas Gabog,LIBRARIAN",
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
