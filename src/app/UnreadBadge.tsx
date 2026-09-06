"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type UnreadBadgeProps = {
  initialUnreadCount: number;
  currentUserId: string;
};

type ConversationId = {
  id: string;
};

type MessageChange = {
  conversation_id?: string;
  sender_id?: string;
};

export default function UnreadBadge({ initialUnreadCount, currentUserId }: UnreadBadgeProps) {
  const supabase = useMemo(() => createClient(), []);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const conversationIdsRef = useRef<Set<string>>(new Set());

  const refreshUnreadCount = useCallback(async () => {
    const conversationIds = [...conversationIdsRef.current];

    if (conversationIds.length === 0) {
      setUnreadCount(0);
      return;
    }

    const { count, error } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", conversationIds)
      .neq("sender_id", currentUserId)
      .is("read_at", null);

    if (!error) {
      setUnreadCount(count ?? 0);
    }
  }, [currentUserId, supabase]);

  const loadConversationIds = useCallback(async () => {
    const { data, error } = await supabase
      .from("conversations")
      .select("id")
      .or(`participant_a.eq.${currentUserId},participant_b.eq.${currentUserId}`);

    if (error) {
      return;
    }

    conversationIdsRef.current = new Set(
      ((data ?? []) as ConversationId[]).map((conversation) => conversation.id),
    );
  }, [currentUserId, supabase]);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      await loadConversationIds();

      if (isMounted) {
        await refreshUnreadCount();
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [loadConversationIds, refreshUnreadCount]);

  useEffect(() => {
    function handleUnreadUpdated() {
      void refreshUnreadCount();
    }

    window.addEventListener("dawamudir:unread-updated", handleUnreadUpdated);

    return () => {
      window.removeEventListener("dawamudir:unread-updated", handleUnreadUpdated);
    };
  }, [refreshUnreadCount]);

  useEffect(() => {
    const channel = supabase
      .channel(`unread-badge:${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          const row = (payload.new ?? payload.old) as MessageChange;

          if (!row.conversation_id) {
            return;
          }

          if (conversationIdsRef.current.has(row.conversation_id)) {
            void refreshUnreadCount();
            return;
          }

          // Unknown conversation id — either a brand new conversation someone just started
          // with this user, or one created after this component mounted. Re-fetch the set
          // before deciding whether this event is actually ours.
          void (async () => {
            await loadConversationIds();

            if (conversationIdsRef.current.has(row.conversation_id!)) {
              await refreshUnreadCount();
            }
          })();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, loadConversationIds, refreshUnreadCount, supabase]);

  if (unreadCount <= 0) {
    return null;
  }

  return (
    <span className="absolute -left-3 -top-2 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-center text-xs leading-none text-white">
      {unreadCount > 99 ? "99+" : unreadCount.toLocaleString("ar-EG")}
    </span>
  );
}
