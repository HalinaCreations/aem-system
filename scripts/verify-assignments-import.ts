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
  ["m.cruz@school.edu", "user-cruz"],
]);

// 1. Adviser row + subject row
const ok = validateAssignmentsCsv(
  parseCsv(
    [
      "email,gradeLevel,section,subjectCode,subjectName,isAdviser",
      "j.reyes@school.edu,Grade 9,Newton,,,true",
      "j.reyes@school.edu,Grade 9,Curie,ENG9,English 9,false",
      "m.cruz@school.edu,Grade 9,Newton,SCI9,Science 9,",
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
      "j.reyes@school.edu,Grade 9,Newton,,,true",
      "m.cruz@school.edu,Grade 9,Newton,,,true",
    ].join("\n"),
  ),
  { userIdByEmail },
);
if (bad.invalid.length !== 3) fail(`expected 3 invalid rows, got ${bad.invalid.length}: ${JSON.stringify(bad.invalid)}`);
if (!bad.invalid[0].errors.some((e) => e.includes("No staff user"))) fail("unknown email should be rejected");
if (!bad.invalid[1].errors.some((e) => e.includes("subjectName"))) fail("subjectCode without subjectName should be rejected");
if (!bad.invalid[2].errors.some((e) => e.includes("adviser"))) fail("second adviser on a section should be rejected");

console.log("PASS — assignments validator: adviser rows, subject rows, defaults, and 3 error classes");
