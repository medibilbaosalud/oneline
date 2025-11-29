import { supabaseAdmin } from "./supabaseAdmin";

export type NotificationInsert = {
  userId: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, any>;
};

/**
 * Insert a notification for a user. Uses the service role client so it bypasses RLS at insert time,
 * while read/update access remains protected per user.
 */
export async function createNotification({
  userId,
  type,
  title,
  body,
  data,
}: NotificationInsert): Promise<void> {
  const supabase = supabaseAdmin();
  const payload = {
    user_id: userId,
    type,
    title,
    body: body ?? null,
    data: data ?? null,
  };

  const { error } = await supabase.from("notifications").insert(payload);

  if (error) {
    console.error("Failed to create notification", error);
  }
}
