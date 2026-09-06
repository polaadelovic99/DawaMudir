import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PharmacistForm from "./PharmacistForm";

export default async function PharmacistOnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-8">
      <PharmacistForm />
    </main>
  );
}
