import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { kindLabels, type ListingKind } from "../listings/constants";

type MaybeRelation<T> = T | T[] | null;

type ConversationListItem = {
  id: string;
  listing_id: string | null;
  participant_a: string;
  participant_b: string;
  last_message_at: string | null;
  created_at: string;
  listings: MaybeRelation<{
    kind: ListingKind;
    pharmacies: MaybeRelation<{ name: string }>;
  }>;
};

type PublicProfile = {
  id: string;
  full_name: string;
};

type MessagePreview = {
  conversation_id: string;
  body: string;
  created_at: string;
};

type UnreadMessage = {
  conversation_id: string;
};

function relationOne<T>(value: MaybeRelation<T>) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function truncate(value: string, maxLength = 90) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function listingTitle(conversation: ConversationListItem) {
  const listing = relationOne(conversation.listings);

  if (!listing) {
    return "إعلان محذوف";
  }

  const pharmacy = relationOne(listing.pharmacies);
  return `${kindLabels[listing.kind]} - ${pharmacy?.name ?? "بدون اسم صيدلية"}`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "لا توجد رسائل بعد";
  }

  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function MessagesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("conversations")
    .select("id, listing_id, participant_a, participant_b, last_message_at, created_at, listings(kind, pharmacies(name))")
    .or(`participant_a.eq.${user.id},participant_b.eq.${user.id}`)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const conversations = (data ?? []) as ConversationListItem[];
  const conversationIds = conversations.map((conversation) => conversation.id);
  const otherParticipantIds = [
    ...new Set(
      conversations.map((conversation) =>
        conversation.participant_a === user.id ? conversation.participant_b : conversation.participant_a,
      ),
    ),
  ];

  const [profilesResult, messagesResult, unreadResult] = await Promise.all([
    otherParticipantIds.length > 0
      ? supabase.from("public_profiles").select("id, full_name").in("id", otherParticipantIds)
      : Promise.resolve({ data: [], error: null }),
    conversationIds.length > 0
      ? supabase
          .from("messages")
          .select("conversation_id, body, created_at")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
    conversationIds.length > 0
      ? supabase
          .from("messages")
          .select("conversation_id")
          .in("conversation_id", conversationIds)
          .neq("sender_id", user.id)
          .is("read_at", null)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  if (messagesResult.error) {
    throw new Error(messagesResult.error.message);
  }

  if (unreadResult.error) {
    throw new Error(unreadResult.error.message);
  }

  const profileNames = new Map(
    ((profilesResult.data ?? []) as PublicProfile[]).map((profile) => [profile.id, profile.full_name]),
  );
  const previews = new Map<string, MessagePreview>();

  ((messagesResult.data ?? []) as MessagePreview[]).forEach((message) => {
    if (!previews.has(message.conversation_id)) {
      previews.set(message.conversation_id, message);
    }
  });

  const unreadConversationIds = new Set(
    ((unreadResult.data ?? []) as UnreadMessage[]).map((message) => message.conversation_id),
  );

  return (
    <main className="flex flex-1 flex-col items-center p-8">
      <div className="flex w-full max-w-4xl flex-col gap-6 text-right">
        <div className="flex flex-col gap-3 border-b border-foreground/15 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold">الرسائل</h1>
            <p className="mt-2 text-foreground/70">تابع محادثاتك مع أصحاب الإعلانات.</p>
          </div>
          <Link href="/settings/notifications" className="text-sm font-semibold text-foreground/70 hover:text-foreground">
            إعدادات الإشعارات
          </Link>
        </div>

        {conversations.length === 0 ? (
          <div className="rounded-md border border-foreground/15 px-5 py-8 text-center text-foreground/70">
            لا توجد محادثات بعد. ابدأ من صفحة الإعلانات.
          </div>
        ) : (
          <div className="flex flex-col overflow-hidden rounded-md border border-foreground/15">
            {conversations.map((conversation) => {
              const otherParticipantId =
                conversation.participant_a === user.id
                  ? conversation.participant_b
                  : conversation.participant_a;
              const preview = previews.get(conversation.id);
              const hasUnread = unreadConversationIds.has(conversation.id);

              return (
                <Link
                  key={conversation.id}
                  href={`/messages/${conversation.id}`}
                  className="flex gap-3 border-b border-foreground/10 px-4 py-4 transition last:border-b-0 hover:bg-foreground/5"
                >
                  <span
                    className={`mt-2 size-2 shrink-0 rounded-full ${hasUnread ? "bg-red-600" : "bg-transparent"}`}
                    aria-label={hasUnread ? "رسائل غير مقروءة" : undefined}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                      <span className="font-bold">
                        {profileNames.get(otherParticipantId) ?? "مستخدم غير معروف"}
                      </span>
                      <span className="text-sm text-foreground/55">
                        {formatDate(conversation.last_message_at)}
                      </span>
                    </span>
                    <span className="mt-1 block text-sm text-foreground/65">{listingTitle(conversation)}</span>
                    <span className="mt-2 block truncate text-foreground/75">
                      {preview ? truncate(preview.body) : "لم تبدأ المحادثة بعد."}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
