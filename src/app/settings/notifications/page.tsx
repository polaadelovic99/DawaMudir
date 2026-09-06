import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NotificationSettingsForm from "./NotificationSettingsForm";

type NotificationProfile = {
  notification_email: string | null;
  email_notifications_enabled: boolean;
};

export default async function NotificationSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("notification_email, email_notifications_enabled")
    .eq("id", user.id)
    .maybeSingle<NotificationProfile>();

  if (error) {
    throw new Error(error.message);
  }

  if (!profile) {
    redirect("/onboarding");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-8">
      <NotificationSettingsForm
        notificationEmail={profile.notification_email ?? ""}
        emailNotificationsEnabled={profile.email_notifications_enabled}
      />
    </main>
  );
}
