import Link from "next/link";
import { getNotifications } from "@/lib/notifications";
import MarkAllReadButton from "@/components/shell/mark-all-read-button";

const KIND_TONE: Record<string, string> = {
  RISK_BAND_INCREASED: "border-rose-200 bg-rose-50 text-rose-700",
  REFERRAL_ACCEPTED: "border-emerald-200 bg-emerald-50 text-emerald-700",
  REFERRAL_DECLINED: "border-slate-200 bg-slate-50 text-slate-600",
  APPROVAL_REQUESTED: "border-amber-200 bg-amber-50 text-amber-700",
};

const KIND_LABEL: Record<string, string> = {
  RISK_BAND_INCREASED: "Risk change",
  REFERRAL_ACCEPTED: "Referral accepted",
  REFERRAL_DECLINED: "Referral declined",
  APPROVAL_REQUESTED: "Approval needed",
};

/** Shared across all four roles — the query is scoped by userId, not by role. */
export default async function NotificationList({ userId }: { userId: string }) {
  const notifications = await getNotifications(userId);
  const unreadCount = notifications.filter((n) => n.readAt === null).length;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Notifications</h1>
          <p className="mt-1 text-sm text-slate-500">
            {unreadCount > 0
              ? `${unreadCount} unread of ${notifications.length}`
              : `${notifications.length} notification${notifications.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {unreadCount > 0 && <MarkAllReadButton />}
      </header>

      {notifications.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
          Nothing yet. You&apos;ll be notified when a student in your scope crosses into a higher risk
          band, or when work is waiting on you.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {notifications.map((n) => {
            const unread = n.readAt === null;
            const body = (
              <div
                className={`rounded-xl border p-4 transition-colors ${
                  unread ? "border-slate-300 bg-white shadow-sm" : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${
                      KIND_TONE[n.kind] ?? "border-slate-200 bg-slate-50 text-slate-600"
                    }`}
                  >
                    {KIND_LABEL[n.kind] ?? n.kind}
                  </span>
                  {unread && <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-label="Unread" />}
                  <span className="ml-auto text-[11px] text-slate-400">
                    {new Date(n.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className={`mt-2 text-sm ${unread ? "font-semibold text-slate-900" : "text-slate-700"}`}>
                  {n.title}
                </p>
                <p className="mt-0.5 text-sm text-slate-600">{n.body}</p>
              </div>
            );

            return (
              <li key={n.id}>
                {n.linkHref ? (
                  <Link href={n.linkHref} className="block hover:opacity-90">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
