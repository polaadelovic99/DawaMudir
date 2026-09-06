"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type NotificationSettingsState = {
  error: string;
  success: string;
};

function getNotificationEmail(formData: FormData) {
  const value = formData.get("notification_email");
  return typeof value === "string" ? value.trim() : "";
}

export async function updateNotificationSettings(
  _: NotificationSettingsState,
  formData: FormData,
): Promise<NotificationSettingsState> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const notificationEmail = getNotificationEmail(formData);
  const emailNotificationsEnabled = formData.get("email_notifications_enabled") === "on";

  const { error } = await supabase
    .from("profiles")
    .update({
      notification_email: notificationEmail || null,
      email_notifications_enabled: emailNotificationsEnabled,
    })
    .eq("id", user.id);

  if (error) {
    return { error: "تعذّر حفظ إعدادات الإشعارات. حاول مرة أخرى.", success: "" };
  }

  return { error: "", success: "تم حفظ إعدادات الإشعارات." };
}
