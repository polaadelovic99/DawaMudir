import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";

type AdminProfile = {
  is_admin: boolean;
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle<AdminProfile>();

  if (error || !profile?.is_admin) {
    redirect("/");
  }

  return (
    <div className="flex flex-1 flex-col">
      <nav className="border-b border-foreground/10 bg-foreground/[0.03]">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-4 px-6 py-3 text-sm">
          <Link href="/admin" className="font-semibold text-foreground/70 hover:text-foreground">
            الإحصائيات
          </Link>
          <Link href="/admin/verification" className="font-semibold text-foreground/70 hover:text-foreground">
            مراجعة الأوراق
          </Link>
          <Link href="/admin/reports" className="font-semibold text-foreground/70 hover:text-foreground">
            البلاغات
          </Link>
          <Link href="/admin/fraud" className="font-semibold text-foreground/70 hover:text-foreground">
            مؤشرات الاحتيال
          </Link>
        </div>
      </nav>
      {children}
    </div>
  );
}
