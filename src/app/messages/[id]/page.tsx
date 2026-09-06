import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChatThread from "./ChatThread";
import type { MessageRow } from "../actions";

type ConversationDetail = {
  id: string;
  participant_a: string;
  participant_b: string;
};

type PublicProfile = {
  full_name: string;
};

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function NotFoundState() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="flex w-full max-w-xl flex-col gap-4">
        <h1 className="text-3xl font-bold">المحادثة غير موجودة</h1>
        <p className="text-foreground/70">قد تكون المحادثة غير متاحة أو لا تملك صلاحية عرضها.</p>
        <Link
          href="/messages"
          className="rounded-md bg-foreground px-5 py-3 font-semibold text-background transition hover:opacity-90"
        >
          الرجوع إلى الرسائل
        </Link>
      </div>
    </main>
  );
}

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isUuid(id)) {
    return <NotFoundState />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, participant_a, participant_b")
    .eq("id", id)
    .maybeSingle<ConversationDetail>();

  if (conversationError || !conversation) {
    return <NotFoundState />;
  }

  const otherParticipantId =
    conversation.participant_a === user.id ? conversation.participant_b : conversation.participant_a;

  const [profileResult, messagesResult] = await Promise.all([
    supabase
      .from("public_profiles")
      .select("full_name")
      .eq("id", otherParticipantId)
      .maybeSingle<PublicProfile>(),
    supabase
      .from("messages")
      .select("id, conversation_id, sender_id, body, contains_phone, created_at, read_at")
      .eq("conversation_id", conversation.id)
      .order("created_at", { ascending: true }),
  ]);

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }

  if (messagesResult.error) {
    throw new Error(messagesResult.error.message);
  }

  return (
    <main className="flex flex-1 flex-col items-center p-8">
      <ChatThread
        conversationId={conversation.id}
        currentUserId={user.id}
        otherParticipantName={profileResult.data?.full_name ?? "مستخدم غير معروف"}
        initialMessages={(messagesResult.data ?? []) as MessageRow[]}
      />
    </main>
  );
}
