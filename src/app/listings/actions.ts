"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  isDurationType,
  isListingKind,
  isWithWithout,
  type ListingKind,
} from "./constants";

export type ActionState = {
  error: string;
};

type Profile = {
  is_pharmacist: boolean;
  is_owner: boolean;
  verification_tier: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getOptionalInt(formData: FormData, key: string) {
  const value = getString(formData, key);

  if (!value) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return NaN;
  }

  return parsed;
}

function resolveKind(profile: Profile, submittedKind: string): ListingKind | null {
  if (profile.is_pharmacist && !profile.is_owner) {
    return "manager_available";
  }

  if (profile.is_owner && !profile.is_pharmacist) {
    return "manager_wanted";
  }

  if (profile.is_owner && profile.is_pharmacist && isListingKind(submittedKind)) {
    return submittedKind;
  }

  return null;
}

function activeCapMessage(verificationTier: string) {
  const cap = verificationTier === "documents" ? 3 : 1;
  return `وصلت للحد الأقصى من الإعلانات النشطة — الحد الحالي هو ${cap}.`;
}

export async function createListing(_: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_pharmacist, is_owner, verification_tier")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (profileError) {
    return { error: "تعذّر قراءة الملف الشخصي. حاول مرة أخرى." };
  }

  if (!profile) {
    redirect("/onboarding");
  }

  const kind = resolveKind(profile, getString(formData, "kind"));

  if (!kind) {
    return { error: "أكمل بيانات الحساب قبل إنشاء إعلان." };
  }

  const durationType = getString(formData, "duration_type");
  const durationMonths = getOptionalInt(formData, "duration_months");
  const attendance = getString(formData, "attendance");
  const schedule = getString(formData, "schedule");
  const imported = getString(formData, "imported");
  const governorateId = getOptionalInt(formData, "governorate_id");
  const salaryAmount = getOptionalInt(formData, "salary_amount");
  const notes = getString(formData, "notes");

  if (!isDurationType(durationType)) {
    return { error: "اختر نوع المدة." };
  }

  if (durationType === "temporary" && (!durationMonths || durationMonths < 1)) {
    return { error: "اكتب عدد شهور صحيح للإعلان المؤقت." };
  }

  if (Number.isNaN(durationMonths)) {
    return { error: "اكتب عدد شهور صحيح أو اتركه فارغًا." };
  }

  if (!isWithWithout(attendance)) {
    return { error: "اختر حالة الحضور." };
  }

  if (!isWithWithout(schedule)) {
    return { error: "اختر حالة الجدول." };
  }

  if (!isWithWithout(imported)) {
    return { error: "اختر حالة المستورد." };
  }

  if (!governorateId || Number.isNaN(governorateId)) {
    return { error: "اختر المحافظة." };
  }

  if (Number.isNaN(salaryAmount) || (salaryAmount !== null && salaryAmount < 0)) {
    return { error: "اكتب قيمة راتب صحيحة أو اتركها فارغة." };
  }

  let pharmacyId: string | null = null;

  if (kind === "manager_wanted") {
    pharmacyId = getString(formData, "pharmacy_id");

    if (!pharmacyId) {
      return { error: "اختر الصيدلية." };
    }

    const { data: pharmacy, error: pharmacyError } = await supabase
      .from("pharmacies")
      .select("id")
      .eq("id", pharmacyId)
      .eq("owner_profile_id", user.id)
      .maybeSingle<{ id: string }>();

    if (pharmacyError) {
      return { error: "تعذّر التحقق من الصيدلية. حاول مرة أخرى." };
    }

    if (!pharmacy) {
      return { error: "اختر صيدلية من الصيدليات الخاصة بحسابك." };
    }
  }

  const { data: listing, error: listingError } = await supabase
    .from("listings")
    .insert({
      kind,
      author_id: user.id,
      pharmacy_id: pharmacyId,
      duration_type: durationType,
      duration_months: durationType === "temporary" ? durationMonths : null,
      attendance,
      schedule,
      imported,
      governorate_id: governorateId,
      salary_amount: salaryAmount,
      notes: notes || null,
      status: "active",
    })
    .select("id")
    .single<{ id: string }>();

  if (listingError) {
    if (listingError.message.includes("active listing cap reached")) {
      return { error: activeCapMessage(profile.verification_tier) };
    }

    return { error: "تعذّر إنشاء الإعلان. حاول مرة أخرى." };
  }

  redirect(`/listings/${listing.id}`);
}
