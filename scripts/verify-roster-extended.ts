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
