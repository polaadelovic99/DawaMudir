import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm, { type GovernorateOption } from "./ProfileForm";

export default async function OnboardingPage() {
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

  if (profile) {
    redirect("/");
  }

  const { data: governorates, error: governoratesError } = await supabase
    .from("governorates")
    .select("id, name_ar")
    .order("name_ar", { ascending: true });

  if (governoratesError) {
    throw new Error(governoratesError.message);
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-8">
      <ProfileForm governorates={(governorates ?? []) as GovernorateOption[]} />
    </main>
  );
}
