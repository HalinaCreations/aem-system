import type { NavSection, ThemeName } from "@/components/shell/role-shell";

export const TEACHER_BADGE = "Teacher workspace";
export const TEACHER_TITLE = "Classroom operations dashboard";
export const TEACHER_DESCRIPTION =
  "Track daily academic data, stay aware of at-risk students, and coordinate on interventions from the teacher side.";
export const TEACHER_THEME: ThemeName = "emerald";

export const TEACHER_NAV: NavSection[] = [
  {
    title: "My Classes",
    href: "/teacher/my-classes",
    description:
      "Open handled sections, review rosters, and move quickly into attendance, grades, student risk, and behavioral logging.",
  },
  {
    title: "Student Risk",
    href: "/teacher/student-risk",
    description:
      "View risk scores and factor breakdowns for students in your assigned sections.",
  },
  {
    title: "Intervention Feedback",
    href: "/teacher/intervention-feedback",
    description:
      "View active intervention plans, log sessions you personally conducted, submit observation notes, and request plan revisions.",
  },
  {
    title: "Refer a Student",
    href: "/teacher/refer",
    description:
      "Propose an intervention for a student in your sections; a counselor reviews and decides.",
  },
  {
    title: "How this system works",
    href: "/learn",
    description:
      "Plain-language explanation of how the risk score is computed, what each pattern rule looks for, and what the system decides versus what you decide.",
  },
  {
    title: "Reports",
    href: "/reports",
    description:
      "Download CSV extracts of the data behind your screens — risk rosters, intervention outcomes, attendance, and governance breakdowns.",
  },
];

export const TEACHER_METRICS = [
  { label: "Teaching scope", value: "Assigned sections" },
  { label: "Daily focus", value: "Attendance and grades" },
  { label: "Intervention access", value: "Public fields" },
];
