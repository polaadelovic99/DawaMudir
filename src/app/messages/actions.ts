"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendNewMessageEmail } from "@/lib/notifications/email";
import { createClient } from "@/lib/supabase/server";

export type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  contains_phone: boolean;
  created_at: string;
  read_at: string | null;
};

export type SendMessageResult = {
  error: string;
  message: MessageRow | null;
};

type ConversationParticipant = {
  id: string;
  participant_a: string;
  participant_b: string;
};

type ProfileName = {
  full_name: string;
};

type NotificationRecipient = {
  notification_email: string | null;
  email_notifications_enabled: boolean;
  full_name: string;
};

const MAX_MESSAGE_LENGTH = 4000;
const RATE_LIMIT_WINDOW_SECONDS = 3;
const RATE_LIMIT_MAX_MESSAGES = 5;

function normalizeDigits(value: string) {
  return value
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
}

function containsPhone(body: string) {
  const compact = normalizeDigits(body).replace(/[\s().-]/g, "");
  return /(?:\+?20|0)?1[0125]\d{8}/.test(compact);
}

async function conversationUrl(conversationId: string) {
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const proto = headerStore.get("x-forwarded-proto") ?? "http";

  if (!host) {
    return `/messages/${conversationId}`;
  }

  return `${proto}://${host}/messages/${conversationId}`;
}

export async function sendMessage(
  conversationId: string,
  body: string,
): Promise<SendMessageResult> {
  const messageBody = body.trim();

  if (!messageBody) {
    return { error: "اكتب رسالة أولًا.", message: null };
  }

  if (messageBody.length > MAX_MESSAGE_LENGTH) {
    return { error: "الرسالة طويلة جدًا. اختصرها وحاول مرة أخرى.", message: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, participant_a, participant_b")
    .eq("id", conversationId)
    .maybeSingle<ConversationParticipant>();

  if (conversationError || !conversation) {
    return { error: "المحادثة غير متاحة.", message: null };
  }

  const recipientId =
    conversation.participant_a === user.id ? conversation.participant_b : conversation.participant_a;

  if (recipientId === user.id) {
    return { error: "المحادثة غير متاحة.", message: null };
  }

  const rateLimitSince = new Date(Date.now() - RATE_LIMIT_WINDOW_SECONDS * 1000).toISOString();
  const { count: recentMessageCount, error: rateLimitError } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("sender_id", user.id)
    .gt("created_at", rateLimitSince);

  if (rateLimitError) {
    return { error: "تعذّر إرسال الرسالة. حاول مرة أخرى.", message: null };
  }

  if ((recentMessageCount ?? 0) >= RATE_LIMIT_MAX_MESSAGES) {
    return { error: "أرسلت رسائل كثيرة بسرعة. انتظر لحظة وحاول مرة أخرى.", message: null };
  }

  const { data: message, error: messageError } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversation.id,
      sender_id: user.id,
      body: messageBody,
      contains_phone: containsPhone(messageBody),
    })
    .select("id, conversation_id, sender_id, body, contains_phone, created_at, read_at")
    .single<MessageRow>();

  if (messageError || !message) {
    return { error: "تعذّر إرسال الرسالة. حاول مرة أخرى.", message: null };
  }

  const { count: previousUnreadCount, error: previousUnreadError } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("conversation_id", conversation.id)
    .neq("sender_id", recipientId)
    .is("read_at", null)
    .lt("created_at", message.created_at);

  const shouldSendNotification = !previousUnreadError && (previousUnreadCount ?? 0) === 0;

  revalidatePath("/messages");
  revalidatePath(`/messages/${conversation.id}`);

  if (shouldSendNotification) {
    const [senderResult, recipientResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .maybeSingle<ProfileName>(),
      supabase.rpc("get_notification_recipient", { p_profile_id: recipientId }),
    ]);
    const senderProfile = senderResult.data;
    const recipientRows = recipientResult.data as NotificationRecipient[] | null;

    const recipient = recipientRows?.[0];

    if (recipient?.notification_email && recipient.email_notifications_enabled) {
      void sendNewMessageEmail({
        to: recipient.notification_email,
        recipientName: recipient.full_name,
        senderName: senderProfile?.full_name ?? "مستخدم",
        conversationUrl: await conversationUrl(conversation.id),
      });
    }
  }

  return { error: "", message };
}
