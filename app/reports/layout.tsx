import type { ReactNode } from "react";
import { requireSession } from "@/lib/session";
import RoleShell, { type NavSection } from "@/components/shell/role-shell";

import {
  TEACHER_BADGE,
  TEACHER_TITLE,
  TEACHER_THEME,
  TEACHER_NAV,
} from "@/components/roles/teacher/teacher-config";
import {
  COUNSELOR_BADGE,
  COUNSELOR_TITLE,
  COUNSELOR_THEME,
  COUNSELOR_NAV,
} from "@/components/roles/counselor/counselor-config";
import {
  PRINCIPAL_BADGE,
  PRINCIPAL_TITLE,
  PRINCIPAL_THEME,
  PRINCIPAL_NAV,
} from "@/components/roles/principal/principal-config";
import {
  ADMIN_BADGE,
  ADMIN_TITLE,
  ADMIN_THEME,
  ADMIN_NAV,
} from "@/components/roles/admin/admin-config";

export default async function ReportsLayout({ children }: { children: ReactNode }) {
  const session = await requireSession();
  const role = session.user.role;

  let badge = "";
  let title = "";
  let theme: "indigo" | "emerald" | "amber" | "rose" = "indigo";
  let navSections: NavSection[] = [];
  let roleSlug: "teacher" | "counselor" | "principal" | "admin" = "teacher";

  if (role === "TEACHER") {
    badge = TEACHER_BADGE;
    title = TEACHER_TITLE;
    theme = TEACHER_THEME;
    navSections = TEACHER_NAV;
    roleSlug = "teacher";
  } else if (role === "COUNSELOR") {
    badge = COUNSELOR_BADGE;
    title = COUNSELOR_TITLE;
    theme = COUNSELOR_THEME;
    navSections = COUNSELOR_NAV;
    roleSlug = "counselor";
  } else if (role === "PRINCIPAL") {
    badge = PRINCIPAL_BADGE;
    title = PRINCIPAL_TITLE;
    theme = PRINCIPAL_THEME;
    navSections = PRINCIPAL_NAV;
    roleSlug = "principal";
  } else if (role === "ADMIN") {
    badge = ADMIN_BADGE;
    title = ADMIN_TITLE;
    theme = ADMIN_THEME;
    navSections = ADMIN_NAV;
    roleSlug = "admin";
  }

  return (
    <RoleShell
      role={roleSlug}
      badge={badge}
      title={title}
      theme={theme}
      navSections={navSections}
    >
      <div className="w-full">
        {children}
      </div>
    </RoleShell>
  );
}
