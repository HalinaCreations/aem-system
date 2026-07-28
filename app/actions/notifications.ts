"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";

// Notifications are per-user, so every mutation scopes by the caller's own id.
// No role check is needed — but the userId filter is not optional: without it
// any signed-in user could mark someone else's notifications read.

const markReadSchema = z.object({ id: z.string().min(1) });

export async function markNotificationReadAction(
  input: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await requireSession();
  const parsed = markReadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid notification id." };

  const result = await prisma.notification.updateMany({
    where: { id: parsed.data.id, userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  if (result.count === 0) return { ok: false, error: "Notification not found." };

  revalidatePath("/", "layout");
  return { ok: true };
}

export async function markAllNotificationsReadAction(): Promise<
  { ok: true; count: number } | { ok: false; error: string }
> {
  const session = await requireSession();
  const result = await prisma.notification.updateMany({
    where: { userId: session.user.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidatePath("/", "layout");
  return { ok: true, count: result.count };
}
