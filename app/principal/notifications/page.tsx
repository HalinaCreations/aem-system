import { requireRole } from "@/lib/session";
import NotificationList from "@/components/shell/notification-list";

export default async function PrincipalNotificationsPage() {
  const session = await requireRole("PRINCIPAL");
  return <NotificationList userId={session.user.id} />;
}
