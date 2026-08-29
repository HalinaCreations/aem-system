/**
 * Applied when a staff-import row leaves the password column blank, and shown
 * in the dev-only login quick-fill. Dev/demo only — imported accounts must be
 * reset before any non-local use.
 */
export const DEFAULT_STAFF_PASSWORD = "changeme2026";

export type DevAccount = {
  email: string;
  password: string;
  role: string;
  label: string;
};

export type DevAccountGroup = {
  title: string;
  hint: string;
  accounts: DevAccount[];
};

const DEV_ACCOUNT_GROUPS: DevAccountGroup[] = [
  {
    title: "Demo seed",
    hint: "SY 2025-2026 — Maria Santos reference scenario",
    accounts: [
      { email: "admin@school.edu", password: "admin123", role: "ADMIN", label: "Ms. Cruz" },
      { email: "principal@school.edu", password: "principal123", role: "PRINCIPAL", label: "Mr. Dela Cruz" },
      { email: "counselor@school.edu", password: "counselor123", role: "COUNSELOR", label: "Ms. Santos" },
      { email: "adviser@school.edu", password: "adviser123", role: "TEACHER", label: "Mrs. Lim · 9-Newton adviser" },
      { email: "teacher@school.edu", password: "teacher123", role: "TEACHER", label: "Mr. Reyes · subject teacher" },
    ],
  },
  {
    title: "Imported staff",
    hint: "SY 2026-2027 — active year, real roster",
    accounts: [
      { email: "i.quejano@school.edu", password: DEFAULT_STAFF_PASSWORD, role: "ADMIN", label: "Quejano · records officer" },
      { email: "m.carandang@school.edu", password: DEFAULT_STAFF_PASSWORD, role: "PRINCIPAL", label: "Carandang" },
      { email: "a.rosales@school.edu", password: DEFAULT_STAFF_PASSWORD, role: "COUNSELOR", label: "Rosales · guidance" },
      { email: "e.lustanas@school.edu", password: DEFAULT_STAFF_PASSWORD, role: "TEACHER", label: "Lustañas · Aquamarine adviser" },
      { email: "c.reyes@school.edu", password: DEFAULT_STAFF_PASSWORD, role: "TEACHER", label: "Reyes · subject teacher" },
    ],
  },
];

/** Quick-fill credentials for the login screen. Empty outside development. */
export function getDevAccountGroups(): DevAccountGroup[] {
  return process.env.NODE_ENV === "development" ? DEV_ACCOUNT_GROUPS : [];
}
