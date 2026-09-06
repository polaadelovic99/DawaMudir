import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ListingKind } from "../constants";
import NewListingForm, { type GovernorateOption, type PharmacyOption } from "./NewListingForm";

type Profile = {
  is_pharmacist: boolean;
  is_owner: boolean;
};

export default async function NewListingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_pharmacist, is_owner")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile) {
    redirect("/onboarding");
  }

  if (!profile.is_pharmacist && !profile.is_owner) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <div className="flex w-full max-w-xl flex-col gap-4">
          <h1 className="text-3xl font-bold">أكمل بيانات الحساب</h1>
          <p className="text-foreground/70">يجب تحديد دورك قبل إنشاء إعلان جديد.</p>
          <Link
            href="/onboarding"
            className="rounded-md bg-foreground px-5 py-3 font-semibold text-background transition hover:opacity-90"
          >
            الذهاب إلى إكمال البيانات
          </Link>
        </div>
      </main>
    );
  }

  const [governoratesResult, pharmaciesResult] = await Promise.all([
    supabase.from("governorates").select("id, name_ar").order("name_ar", { ascending: true }),
    profile.is_owner
      ? supabase
          .from("pharmacies")
          .select("id, name")
          .eq("owner_profile_id", user.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (governoratesResult.error) {
    throw new Error(governoratesResult.error.message);
  }

  if (pharmaciesResult.error) {
    throw new Error(pharmaciesResult.error.message);
  }

  const pharmacies = (pharmaciesResult.data ?? []) as PharmacyOption[];

  if (profile.is_owner && !profile.is_pharmacist && pharmacies.length === 0) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center p-8 text-center">
        <div className="flex w-full max-w-xl flex-col gap-4">
          <h1 className="text-3xl font-bold">أضف صيدلية أولًا</h1>
          <p className="text-foreground/70">
            لا يمكن إنشاء إعلان مطلوب مدير قبل إضافة صيدلية إلى حسابك.
          </p>
          <Link
            href="/onboarding/pharmacy"
            className="rounded-md bg-foreground px-5 py-3 font-semibold text-background transition hover:opacity-90"
          >
            إضافة صيدلية
          </Link>
        </div>
      </main>
    );
  }

  const allowedKinds: ListingKind[] = [];

  if (profile.is_owner && pharmacies.length > 0) {
    allowedKinds.push("manager_wanted");
  }

  if (profile.is_pharmacist) {
    allowedKinds.push("manager_available");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-8">
      <NewListingForm
        allowedKinds={allowedKinds}
        governorates={(governoratesResult.data ?? []) as GovernorateOption[]}
        pharmacies={pharmacies}
      />
    </main>
  );
}
