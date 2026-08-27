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

// 4. Password minimum length: explicit short password rejected (naming the
// column), blank column still valid (defaulting path), long-enough password
// preserved as-is.
const pw = validateStaffCsv(
  parseCsv(
    [
      "email,name,role,password",
      "short@school.edu,Short Password,TEACHER,1234567",
      "blank@school.edu,Blank Password,TEACHER,",
      "long@school.edu,Long Enough,TEACHER,eightplus",
    ].join("\n"),
  ),
);
if (pw.invalid.length !== 1) fail(`expected 1 invalid row for password length, got ${pw.invalid.length}: ${JSON.stringify(pw.invalid)}`);
if (!pw.invalid[0].errors.some((e) => e.toLowerCase().includes("password"))) {
  fail(`short password error should name the password column: ${JSON.stringify(pw.invalid[0].errors)}`);
}
if (pw.valid.length !== 2) fail(`expected 2 valid rows (blank + long-enough password), got ${pw.valid.length}`);
const blankRow = pw.valid.find((r) => r.data.email === "blank@school.edu");
if (!blankRow || blankRow.data.password !== null) fail(`blank password column should still validate as null, got ${blankRow?.data.password}`);
const longRow = pw.valid.find((r) => r.data.email === "long@school.edu");
if (!longRow || longRow.data.password !== "eightplus") fail(`explicit valid password should be preserved, got ${longRow?.data.password}`);

// 5. Status: unknown value rejected (naming the column), blank column still
// defaults to ACTIVE.
const status = validateStaffCsv(
  parseCsv(
    [
      "email,name,role,status",
      "suspend@school.edu,Someone Suspended,TEACHER,SUSPEND",
      "blankstatus@school.edu,Someone Blank,TEACHER,",
    ].join("\n"),
  ),
);
if (status.invalid.length !== 1) fail(`expected 1 invalid row for unknown status, got ${status.invalid.length}: ${JSON.stringify(status.invalid)}`);
if (!status.invalid[0].errors.some((e) => e.toLowerCase().includes("status"))) {
  fail(`unrecognized status error should name the status column: ${JSON.stringify(status.invalid[0].errors)}`);
}
if (status.valid.length !== 1) fail(`expected 1 valid row (blank status), got ${status.valid.length}`);
if (status.valid[0].data.status !== "ACTIVE") fail(`blank status should default to ACTIVE, got ${status.valid[0].data.status}`);

console.log("PASS — staff validator: happy path, normalization, defaults, 3 error classes, password minimum length, and status validation");
