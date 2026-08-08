import Link from "next/link";
import { getUnreadNotificationCount } from "@/lib/notifications";
import type { RoleName } from "@/components/shell/role-shell";

/**
 * Unread indicator in the top bar. Server component — the count is read at
 * render time, so it refreshes whenever the surrounding page revalidates.
 */
export default async function NotificationBell({
  userId,
  role,
}: {
  userId: string;
  role: RoleName;
}) {
  const unread = await getUnreadNotificationCount(userId);

  return (
    <Link
      href={`/${role}/notifications`}
      aria-label={unread > 0 ? `Notifications — ${unread} unread` : "Notifications"}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
    >
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="h-5 w-5">
        <path
          d="M10 2.5a4.5 4.5 0 0 0-4.5 4.5v2.6L4.2 12.4a.6.6 0 0 0 .53.9h10.54a.6.6 0 0 0 .53-.9L14.5 9.6V7A4.5 4.5 0 0 0 10 2.5Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <path d="M8 15.2a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      {unread > 0 && (
        <span className="absolute -right-0.5 -top-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[9px] font-bold leading-none text-white ring-2 ring-white">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
