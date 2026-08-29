import type { ReactNode } from "react";
import RoleSidebar from "@/components/roles/shared/role-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getAllSchoolYears, getActiveSchoolYear } from "@/lib/active-year";
import YearSwitcher from "@/components/shell/year-switcher";
import NotificationBell from "@/components/shell/notification-bell";
import { requireSession } from "@/lib/session";
import { SystemWorksProvider } from "@/components/shell/system-works-context";
import { TutorialProvider } from "@/components/tutorial/tutorial-context";
import { TutorialSpotlight } from "@/components/tutorial/tutorial-spotlight";
import { TutorialGuideModal } from "@/components/tutorial/tutorial-guide-modal";
import { TutorialTriggerButton } from "@/components/tutorial/tutorial-trigger-button";

export type RoleName = "admin" | "teacher" | "counselor" | "principal";
export type ThemeName = "indigo" | "emerald" | "amber" | "rose";

export type NavSection = {
  title: string;
  description: string;
  href?: string;
};

type RoleShellProps = {
  role: RoleName;
  badge: string;
  title: string;
  theme: ThemeName;
  navSections: NavSection[];
  children: ReactNode;
};

export default async function RoleShell({
  role,
  badge,
  title,
  theme,
  navSections,
  children,
}: RoleShellProps) {
  const [years, activeYear, session] = await Promise.all([
    getAllSchoolYears(),
    getActiveSchoolYear(),
    requireSession(),
  ]);

  const schoolYearLabel = activeYear?.label ?? "No school year";
  const viewingHistorical = activeYear ? !activeYear.isActive : false;

  return (
    <TutorialProvider role={role} userId={session.user.id}>
      <SystemWorksProvider>
        <SidebarProvider>
          <div className="flex min-h-screen bg-slate-50 text-slate-900">
            <RoleSidebar
              role={role}
              badge={badge}
              title={title}
              schoolYear={schoolYearLabel}
              theme={theme}
              sections={navSections}
            />

            <SidebarInset>
              <div className="flex min-h-screen flex-col">
                <header className="sticky top-0 z-40 border-b border-slate-200 bg-white h-16 flex items-center shrink-0">
                  <div className="flex-1 flex items-center justify-between gap-3 px-4 md:px-8">
                    <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                      {badge}
                    </div>
                    <div className="flex items-center gap-3">
                      <TutorialTriggerButton />
                      <YearSwitcher
                        years={years.map((y) => ({ id: y.id, label: y.label, isActive: y.isActive }))}
                        selectedId={activeYear?.id ?? null}
                      />
                      <NotificationBell userId={session.user.id} role={role} />
                    </div>
                  </div>
                  {viewingHistorical && (
                    <div className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800 md:px-8">
                      Viewing historical data: {schoolYearLabel}. Switch to the current school year to make changes.
                    </div>
                  )}
                </header>

                <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
              </div>
            </SidebarInset>
          </div>
          <TutorialSpotlight />
          <TutorialGuideModal />
        </SidebarProvider>
      </SystemWorksProvider>
    </TutorialProvider>
  );
}

