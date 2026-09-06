import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UnreadBadge from "./UnreadBadge";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  title: "DawaMudir",
  description: "منصة توصيل صيادلة موثّقين بأصحاب الصيدليات المحتاجين مدير مسجّل",
};

type ConversationId = {
  id: string;
};

async function signOut() {
  "use server";

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

async function getInitialUnreadCount(userId: string) {
  const supabase = await createClient();
  const { data: conversations, error: conversationsError } = await supabase
    .from("conversations")
    .select("id")
    .or(`participant_a.eq.${userId},participant_b.eq.${userId}`);

  if (conversationsError) {
    return 0;
  }

  const conversationIds = ((conversations ?? []) as ConversationId[]).map(
    (conversation) => conversation.id,
  );

  if (conversationIds.length === 0) {
    return 0;
  }

  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .in("conversation_id", conversationIds)
    .neq("sender_id", userId)
    .is("read_at", null);

  if (error) {
    return 0;
  }

  return count ?? 0;
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initialUnreadCount = user ? await getInitialUnreadCount(user.id) : 0;

  return (
    <html lang="ar" dir="rtl" className={`${cairo.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <header className="border-b border-foreground/10 bg-background">
          <nav className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-4 text-sm">
            <Link href="/" className="text-lg font-bold">
              DawaMudir
            </Link>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/listings" className="font-semibold text-foreground/70 hover:text-foreground">
                الإعلانات
              </Link>
              {user ? (
                <>
                  <Link
                    href="/messages"
                    className="relative font-semibold text-foreground/70 hover:text-foreground"
                  >
                    الرسائل
                    <UnreadBadge initialUnreadCount={initialUnreadCount} currentUserId={user.id} />
                  </Link>
                  <Link
                    href="/settings/verification"
                    className="font-semibold text-foreground/70 hover:text-foreground"
                  >
                    حالة التوثيق
                  </Link>
                  <form action={signOut}>
                    <button
                      type="submit"
                      className="font-semibold text-foreground/70 transition hover:text-foreground"
                    >
                      تسجيل الخروج
                    </button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="font-semibold text-foreground/70 hover:text-foreground">
                  تسجيل الدخول
                </Link>
              )}
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
