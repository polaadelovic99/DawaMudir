"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ActionState = {
  error: string;
};

type ProfileRole = {
  is_pharmacist: boolean;
  is_owner: boolean;
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

function getRole(formData: FormData): ProfileRole {
  return {
    is_pharmacist: formData.get("is_pharmacist") === "on",
    is_owner: formData.get("is_owner") === "on",
  };
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return { supabase, user };
}

export async function createProfile(_: ActionState, formData: FormData): Promise<ActionState> {
  const fullName = getString(formData, "full_name");
  const governorateId = getOptionalInt(formData, "governorate_id");
  const role = getRole(formData);

  if (!fullName) {
    return { error: "اكتب الاسم بالكامل." };
  }

  if (!governorateId || Number.isNaN(governorateId)) {
    return { error: "اختر المحافظة." };
  }

  if (!role.is_pharmacist && !role.is_owner) {
    return { error: "اختر دورًا واحدًا على الأقل." };
  }

  const { supabase, user } = await getAuthenticatedUser();
  const phone = user.phone?.trim();

  if (!phone) {
    return { error: "لا يوجد رقم موبايل مؤكد على الجلسة الحالية. سجّل الدخول مرة أخرى." };
  }

  const { error } = await supabase.from("profiles").insert({
    id: user.id,
    full_name: fullName,
    phone,
    governorate_id: governorateId,
    is_pharmacist: role.is_pharmacist,
    is_owner: role.is_owner,
  });

  if (error) {
    return { error: "تعذّر إنشاء الملف الشخصي. حاول مرة أخرى." };
  }

  if (role.is_pharmacist) {
    redirect("/onboarding/pharmacist");
  }

  if (role.is_owner) {
    redirect("/onboarding/pharmacy");
  }

  redirect("/");
}

export async function createPharmacistDetails(
  _: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const graduationYear = getOptionalInt(formData, "graduation_year");
  const takleefStatus = getString(formData, "takleef_status");
  const expectedSalaryMin = getOptionalInt(formData, "expected_salary_min");
  const expectedSalaryMax = getOptionalInt(formData, "expected_salary_max");
  const bio = getString(formData, "bio");

  const allowedTakleefStatuses = new Set(["not_started", "upcoming", "completed", "exempted"]);

  if (Number.isNaN(graduationYear)) {
    return { error: "اكتب سنة تخرج صحيحة." };
  }

  if (takleefStatus && !allowedTakleefStatuses.has(takleefStatus)) {
    return { error: "اختر موقف التكليف من القائمة." };
  }

  if (Number.isNaN(expectedSalaryMin) || Number.isNaN(expectedSalaryMax)) {
    return { error: "اكتب قيمة راتب صحيحة أو اتركها فارغة." };
  }

  if (
    expectedSalaryMin !== null &&
    expectedSalaryMax !== null &&
    expectedSalaryMin > expectedSalaryMax
  ) {
    return { error: "الحد الأدنى للراتب يجب أن يكون أقل من أو يساوي الحد الأقصى." };
  }

  const { supabase, user } = await getAuthenticatedUser();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_owner")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { error: "تعذّر قراءة الملف الشخصي. حاول مرة أخرى." };
  }

  if (!profile) {
    redirect("/");
  }

  const { error } = await supabase.from("pharmacist_details").insert({
    profile_id: user.id,
    graduation_year: graduationYear,
    takleef_status: takleefStatus || null,
    expected_salary_min: expectedSalaryMin,
    expected_salary_max: expectedSalaryMax,
    bio: bio || null,
  });

  if (error) {
    return { error: "تعذّر حفظ بيانات الصيدلي. حاول مرة أخرى." };
  }

  if (profile.is_owner) {
    redirect("/onboarding/pharmacy");
  }

  redirect("/");
}

export async function createPharmacy(_: ActionState, formData: FormData): Promise<ActionState> {
  const name = getString(formData, "name");
  const licenseNumber = getString(formData, "license_number");
  const governorateId = getOptionalInt(formData, "governorate_id");
  const hasSchedule = formData.get("has_schedule") === "on";
  const sellsImported = formData.get("sells_imported") === "on";

  if (!name) {
    return { error: "اكتب اسم الصيدلية." };
  }

  if (!governorateId || Number.isNaN(governorateId)) {
    return { error: "اختر المحافظة." };
  }

  const { supabase, user } = await getAuthenticatedUser();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return { error: "تعذّر قراءة الملف الشخصي. حاول مرة أخرى." };
  }

  if (!profile) {
    redirect("/");
  }

  const { error } = await supabase.from("pharmacies").insert({
    owner_profile_id: user.id,
    name,
    license_number: licenseNumber || null,
    governorate_id: governorateId,
    has_schedule: hasSchedule,
    sells_imported: sellsImported,
  });

  if (error) {
    return { error: "تعذّر حفظ بيانات الصيدلية. حاول مرة أخرى." };
  }

  redirect("/");
}
