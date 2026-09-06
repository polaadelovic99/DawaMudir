"use client";

import { useActionState } from "react";
import {
  updateNotificationSettings,
  type NotificationSettingsState,
} from "../actions";

type NotificationSettingsFormProps = {
  notificationEmail: string;
  emailNotificationsEnabled: boolean;
};

const initialState: NotificationSettingsState = {
  error: "",
  success: "",
};

export default function NotificationSettingsForm({
  notificationEmail,
  emailNotificationsEnabled,
}: NotificationSettingsFormProps) {
  const [state, formAction, isPending] = useActionState(updateNotificationSettings, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-xl flex-col gap-5 text-right">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">إعدادات الإشعارات</h1>
        <p className="text-foreground/70">اختر بريدًا اختياريًا لاستلام تنبيه عند وصول رسالة جديدة.</p>
      </div>

      <label className="flex flex-col gap-2">
        <span className="font-medium">البريد الإلكتروني للإشعارات</span>
        <input
          name="notification_email"
          type="email"
          defaultValue={notificationEmail}
          placeholder="name@example.com"
          className="rounded-md border border-foreground/20 bg-transparent px-4 py-3 text-right outline-none transition focus:border-foreground/60"
        />
      </label>

      <label className="flex items-center gap-3 rounded-md border border-foreground/20 px-4 py-3">
        <input
          name="email_notifications_enabled"
          type="checkbox"
          defaultChecked={emailNotificationsEnabled}
          className="size-4"
        />
        <span>تفعيل إشعارات البريد عند الرسائل الجديدة</span>
      </label>

      {state.error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className="rounded-md border border-green-600/30 bg-green-600/10 px-4 py-3 text-sm text-green-700 dark:text-green-300">
          {state.success}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-foreground px-5 py-3 font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "جار الحفظ..." : "حفظ الإعدادات"}
      </button>
    </form>
  );
}
