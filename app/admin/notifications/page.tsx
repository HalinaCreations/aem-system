import { requireRole } from "@/lib/session";
import NotificationList from "@/components/shell/notification-list";

export default async function AdminNotificationsPage() {
  const session = await requireRole("ADMIN");
  return <NotificationList userId={session.user.id} />;
}
