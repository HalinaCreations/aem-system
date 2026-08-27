// Validator-only checks for the assignments importer. No database access.
// Usage: tsx scripts/verify-assignments-import.ts

import { parseCsv } from "../lib/import/csv";
import { validateAssignmentsCsv } from "../lib/import/assignments";

const fail = (m: string) => {
  console.error("FAIL:", m);
  process.exit(1);
};

const userIdByEmail = new Map<string, string>([
  ["j.gabog@school.edu", "user-gabog"],
  ["c.ablola@school.edu", "user-ablola"],
]);

// 1. Adviser row + subject row
const ok = validateAssignmentsCsv(
  parseCsv(
    [
      "email,gradeLevel,section,subjectCode,subjectName,isAdviser",
      "j.gabog@school.edu,Grade 9,Musgravite,,,true",
      "j.gabog@school.edu,Grade 9,Morganite,ENG9,English 9,false",
      "c.ablola@school.edu,Grade 9,Moonstone,SCI9,Science 9,",
    ].join("\n"),
  ),
  { userIdByEmail },
);
if (ok.invalid.length !== 0) fail(`happy path: ${JSON.stringify(ok.invalid)}`);
if (ok.valid.length !== 3) fail(`expected 3 valid, got ${ok.valid.length}`);
if (ok.valid[0].data.isAdviser !== true) fail("adviser row should set isAdviser true");
if (ok.valid[0].data.subjectCode !== null) fail("adviser row should have null subjectCode");
if (ok.valid[0].data.userId !== "user-gabog") fail(`email should resolve to userId, got ${ok.valid[0].data.userId}`);
if (ok.valid[1].data.subjectCode !== "ENG9") fail(`subjectCode = ${ok.valid[1].data.subjectCode}`);
if (ok.valid[2].data.isAdviser !== false) fail("blank isAdviser should default false");

// 2. Error classes: unknown user, half-specified subject, two advisers on one section
const bad = validateAssignmentsCsv(
  parseCsv(
    [
      "email,gradeLevel,section,subjectCode,subjectName,isAdviser",
      "nobody@school.edu,Grade 9,Musgravite,ENG9,English 9,false",
      "j.gabog@school.edu,Grade 9,Morganite,ENG9,,false",
      "j.gabog@school.edu,Grade 9,Moonstone,,,true",
      "c.ablola@school.edu,Grade 9,Moonstone,,,true",
    ].join("\n"),
  ),
  { userIdByEmail },
);
if (bad.invalid.length !== 3) fail(`expected 3 invalid rows, got ${bad.invalid.length}: ${JSON.stringify(bad.invalid)}`);
if (!bad.invalid[0].errors.some((e) => e.includes("No staff user"))) fail("unknown email should be rejected");
if (!bad.invalid[1].errors.some((e) => e.includes("subjectName"))) fail("subjectCode without subjectName should be rejected");
if (!bad.invalid[2].errors.some((e) => e.includes("adviser"))) fail("second adviser on a section should be rejected");

console.log("PASS — assignments validator: adviser rows, subject rows, defaults, and 3 error classes");
