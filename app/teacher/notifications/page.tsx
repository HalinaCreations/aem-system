import { requireRole } from "@/lib/session";
import NotificationList from "@/components/shell/notification-list";

export default async function TeacherNotificationsPage() {
  const session = await requireRole("TEACHER");
  return <NotificationList userId={session.user.id} />;
}
