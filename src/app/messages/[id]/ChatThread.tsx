"use client";

import Link from "next/link";
import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage, type MessageRow } from "../actions";

type ChatThreadProps = {
  conversationId: string;
  currentUserId: string;
  otherParticipantName: string;
  initialMessages: MessageRow[];
  dealPanel: ReactNode;
};

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function sortMessages(messages: MessageRow[]) {
  return [...messages].sort(
    (first, second) => new Date(first.created_at).getTime() - new Date(second.created_at).getTime(),
  );
}

export default function ChatThread({
  conversationId,
  currentUserId,
  otherParticipantName,
  initialMessages,
  dealPanel,
}: ChatThreadProps) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState(() => sortMessages(initialMessages));
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const appendMessage = useCallback((message: MessageRow) => {
    setMessages((current) => {
      if (current.some((existingMessage) => existingMessage.id === message.id)) {
        return current;
      }

      return sortMessages([...current, message]);
    });
  }, []);

  const markInboundMessagesRead = useCallback(async () => {
    // RPC, not a raw .update() — messages has no generic UPDATE policy (see migration 0005):
    // this can only ever set read_at on the caller's own inbound messages, never rewrite a
    // message's body or sender_id.
    const { error: readError } = await supabase.rpc("mark_conversation_read", {
      p_conversation_id: conversationId,
    });

    if (!readError) {
      window.dispatchEvent(new Event("dawamudir:unread-updated"));
    }
  }, [conversationId, supabase]);

  useEffect(() => {
    void markInboundMessagesRead();
  }, [markInboundMessagesRead]);

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const message = payload.new as MessageRow;
          appendMessage(message);

          if (message.sender_id !== currentUserId) {
            void markInboundMessagesRead();
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [appendMessage, conversationId, currentUserId, markInboundMessagesRead, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const body = draft.trim();

    if (!body) {
      setError("اكتب رسالة أولًا.");
      return;
    }

    setIsPending(true);
    const result = await sendMessage(conversationId, body);
    setIsPending(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    if (result.message) {
      appendMessage(result.message);
      setDraft("");
    }
  }

  return (
    <div className="flex w-full max-w-3xl flex-1 flex-col gap-5 text-right">
      <div className="flex flex-col gap-3 border-b border-foreground/15 pb-4">
        <Link href="/messages" className="text-sm font-semibold text-foreground/70 hover:text-foreground">
          الرجوع إلى الرسائل
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{otherParticipantName}</h1>
          <p className="mt-1 text-sm text-foreground/60">محادثة مباشرة</p>
        </div>
      </div>

      {dealPanel}

      <div className="flex min-h-[45vh] flex-1 flex-col gap-3 rounded-md border border-foreground/15 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-center text-foreground/60">
            لا توجد رسائل بعد. اكتب أول رسالة لبدء المحادثة.
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender_id === currentUserId;

            return (
              <div key={message.id} className={`flex ${isOwn ? "justify-start" : "justify-end"}`}>
                <div
                  className={`max-w-[82%] rounded-md px-4 py-3 ${
                    isOwn ? "bg-foreground text-background" : "bg-foreground/10 text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words leading-7">{message.body}</p>
                  <p className={`mt-2 text-xs ${isOwn ? "text-background/70" : "text-foreground/55"}`}>
                    {formatTime(message.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label className="sr-only" htmlFor="message-body">
          نص الرسالة
        </label>
        <textarea
          id="message-body"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          className="resize-none rounded-md border border-foreground/20 bg-transparent px-4 py-3 text-right outline-none transition focus:border-foreground/60"
          placeholder="اكتب رسالتك..."
        />

        {error ? (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isPending}
          className="rounded-md bg-foreground px-5 py-3 font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "جار الإرسال..." : "إرسال"}
        </button>
      </form>
    </div>
  );
}
