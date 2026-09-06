import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import VerificationForm, { type VerificationItem } from "./VerificationForm";

type Profile = {
  is_pharmacist: boolean;
  is_owner: boolean;
  verification_tier: "basic" | "documents";
};

type PharmacistDetails = {
  license_number: string | null;
};

type Pharmacy = {
  id: string;
  name: string;
};

type VerificationDocument = {
  doc_type: "license" | "national_id" | "pharmacy_license";
  pharmacy_id: string | null;
  status: "pending" | "approved" | "rejected";
  review_note: string | null;
  created_at: string;
};

function latestKey(docType: string, pharmacyId: string | null) {
  return `${docType}:${pharmacyId ?? "profile"}`;
}

function tierText(tier: Profile["verification_tier"]) {
  return tier === "documents" ? "موثّق أوراق" : "موثّق أساسي";
}

export default async function VerificationSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_pharmacist, is_owner, verification_tier")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (!profile) {
    redirect("/onboarding");
  }

  const [pharmacistResult, pharmaciesResult, documentsResult] = await Promise.all([
    profile.is_pharmacist
      ? supabase
          .from("pharmacist_details")
          .select("license_number")
          .eq("profile_id", user.id)
          .maybeSingle<PharmacistDetails>()
      : Promise.resolve({ data: null, error: null }),
    profile.is_owner
      ? supabase
          .from("pharmacies")
          .select("id, name")
          .eq("owner_profile_id", user.id)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("verification_documents")
      .select("doc_type, pharmacy_id, status, review_note, created_at")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  if (pharmacistResult.error) {
    throw new Error(pharmacistResult.error.message);
  }

  if (pharmaciesResult.error) {
    throw new Error(pharmaciesResult.error.message);
  }

  if (documentsResult.error) {
    throw new Error(documentsResult.error.message);
  }

  const latestDocuments = new Map<string, VerificationDocument>();

  ((documentsResult.data ?? []) as VerificationDocument[]).forEach((document) => {
    const key = latestKey(document.doc_type, document.pharmacy_id);

    if (!latestDocuments.has(key)) {
      latestDocuments.set(key, document);
    }
  });

  const pharmacistDetails = pharmacistResult.data as PharmacistDetails | null;
  const pharmacies = (pharmaciesResult.data ?? []) as Pharmacy[];
  const items: VerificationItem[] = [];

  if (profile.is_pharmacist) {
    const licenseDocument = latestDocuments.get(latestKey("license", null));

    items.push({
      key: latestKey("license", null),
      docType: "license",
      title: "مزاولة المهنة",
      description: "رخصة مزاولة المهنة للصيدلي.",
      pharmacyId: null,
      status: licenseDocument?.status ?? null,
      reviewNote: licenseDocument?.review_note ?? null,
      requiresLicenseNumber: !pharmacistDetails?.license_number,
    });
  }

  if (profile.is_pharmacist || profile.is_owner) {
    const nationalIdDocument = latestDocuments.get(latestKey("national_id", null));

    items.push({
      key: latestKey("national_id", null),
      docType: "national_id",
      title: "الرقم القومي",
      description: "صورة الرقم القومي للمراجعة اليدوية فقط.",
      pharmacyId: null,
      status: nationalIdDocument?.status ?? null,
      reviewNote: nationalIdDocument?.review_note ?? null,
      requiresLicenseNumber: false,
    });
  }

  if (profile.is_owner) {
    pharmacies.forEach((pharmacy) => {
      const pharmacyDocument = latestDocuments.get(latestKey("pharmacy_license", pharmacy.id));

      items.push({
        key: latestKey("pharmacy_license", pharmacy.id),
        docType: "pharmacy_license",
        title: `ترخيص صيدلية ${pharmacy.name}`,
        description: "ترخيص الصيدلية المرتبط بهذه الصيدلية.",
        pharmacyId: pharmacy.id,
        status: pharmacyDocument?.status ?? null,
        reviewNote: pharmacyDocument?.review_note ?? null,
        requiresLicenseNumber: false,
      });
    });
  }

  return (
    <main className="flex flex-1 flex-col items-center p-8">
      <div className="flex w-full max-w-4xl flex-col gap-6 text-right">
        <div className="flex flex-col gap-3 border-b border-foreground/15 pb-5">
          <h1 className="text-3xl font-bold">حالة التوثيق</h1>
          <p className="text-foreground/70">
            حالتك الحالية: <span className="font-semibold text-foreground">{tierText(profile.verification_tier)}</span>
          </p>
        </div>

        {profile.is_owner && pharmacies.length === 0 ? (
          <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-300">
            أضف صيدلية أولًا حتى يظهر مستند ترخيص الصيدلية ضمن التوثيق.
          </p>
        ) : null}

        {items.length === 0 ? (
          <div className="rounded-md border border-foreground/15 px-6 py-10 text-center text-foreground/70">
            أكمل بيانات الحساب أولًا حتى تظهر المستندات المطلوبة.
          </div>
        ) : (
          <VerificationForm items={items} />
        )}
      </div>
    </main>
  );
}
