import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ChatThread from "./ChatThread";
import DealPanel, { type DealRow } from "./DealPanel";
import type { MessageRow } from "../actions";

type ConversationDetail = {
  id: string;
  listing_id: string | null;
  participant_a: string;
  participant_b: string;
  listings: MaybeRelation<{
    kind: "manager_wanted" | "manager_available";
    author_id: string;
  }>;
};

type PublicProfile = {
  full_name: string;
};

type MaybeRelation<T> = T | T[] | null;

type ReviewId = {
  id: string;
};

function relationOne<T>(value: MaybeRelation<T>) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

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
    .select("id, listing_id, participant_a, participant_b, listings(kind, author_id)")
    .eq("id", id)
    .maybeSingle<ConversationDetail>();

  if (conversationError || !conversation) {
    return <NotFoundState />;
  }

  const otherParticipantId =
    conversation.participant_a === user.id ? conversation.participant_b : conversation.participant_a;
  const listing = relationOne(conversation.listings);
  const listingRole =
    listing?.kind === "manager_wanted"
      ? listing.author_id === user.id
        ? "owner"
        : "pharmacist"
      : listing?.kind === "manager_available"
        ? listing.author_id === user.id
          ? "pharmacist"
          : "owner"
        : null;

  const [profileResult, messagesResult, dealResult] = await Promise.all([
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
    supabase
      .from("deals")
      .select(
        "id, conversation_id, listing_id, owner_id, pharmacist_id, agreed_salary, duration_type, duration_months, start_date, confirmed_by_owner, confirmed_by_pharmacist, status, created_at",
      )
      .eq("conversation_id", conversation.id)
      .maybeSingle<DealRow>(),
  ]);

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }

  if (messagesResult.error) {
    throw new Error(messagesResult.error.message);
  }

  if (dealResult.error) {
    throw new Error(dealResult.error.message);
  }

  const deal = dealResult.data ?? null;
  const currentUserRole =
    listingRole ??
    (deal
      ? deal.owner_id === user.id
        ? "owner"
        : deal.pharmacist_id === user.id
          ? "pharmacist"
          : null
      : null);
  let hasReviewed = false;

  if (deal?.status === "confirmed") {
    const { data: review, error: reviewError } = await supabase
      .from("reviews")
      .select("id")
      .eq("deal_id", deal.id)
      .eq("author_id", user.id)
      .maybeSingle<ReviewId>();

    if (reviewError) {
      throw new Error(reviewError.message);
    }

    hasReviewed = Boolean(review);
  }

  return (
    <main className="flex flex-1 flex-col items-center p-8">
      <ChatThread
        conversationId={conversation.id}
        currentUserId={user.id}
        otherParticipantName={profileResult.data?.full_name ?? "مستخدم غير معروف"}
        initialMessages={(messagesResult.data ?? []) as MessageRow[]}
        dealPanel={
          <DealPanel
            conversationId={conversation.id}
            currentUserId={user.id}
            otherParticipantId={otherParticipantId}
            otherParticipantName={profileResult.data?.full_name ?? "الطرف التاني"}
            currentUserRole={currentUserRole}
            deal={deal}
            hasReviewed={hasReviewed}
          />
        }
      />
    </main>
  );
}
