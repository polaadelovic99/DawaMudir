"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type VerificationUploadState = {
  error: string;
  success: string;
};

const BUCKET_NAME = "verification-documents";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const FILE_EXTENSIONS = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["application/pdf", "pdf"],
]);
const DOCUMENT_TYPES = new Set(["license", "national_id", "pharmacy_license"]);

type Profile = {
  is_pharmacist: boolean;
  is_owner: boolean;
};

type PharmacistDetails = {
  license_number: string | null;
};

type VerificationDocumentStatus = {
  status: string;
};

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function isDocumentType(value: string) {
  return DOCUMENT_TYPES.has(value);
}

function documentStatusFilter(profileId: string, docType: string, pharmacyId: string | null) {
  return {
    profile_id: profileId,
    doc_type: docType,
    pharmacy_id: pharmacyId,
  };
}

async function rollbackLicenseNumber(profileId: string, licenseNumber: string) {
  const supabase = await createClient();
  await supabase
    .from("pharmacist_details")
    .update({ license_number: null })
    .eq("profile_id", profileId)
    .eq("license_number", licenseNumber);
}

export async function submitVerificationDocument(
  _: VerificationUploadState,
  formData: FormData,
): Promise<VerificationUploadState> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const docType = getString(formData, "doc_type");
  const submittedPharmacyId = getString(formData, "pharmacy_id");
  const file = formData.get("document_file");

  if (!isDocumentType(docType)) {
    return { error: "اختر نوع مستند صحيح.", success: "" };
  }

  if (!(file instanceof File) || file.size === 0) {
    return { error: "اختر ملف المستند أولًا.", success: "" };
  }

  const extension = FILE_EXTENSIONS.get(file.type);

  if (!extension) {
    return { error: "صيغة الملف غير مدعومة. استخدم JPG أو PNG أو PDF.", success: "" };
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: "حجم الملف أكبر من 5 ميجابايت.", success: "" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_pharmacist, is_owner")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (profileError) {
    return { error: "تعذّر قراءة الملف الشخصي. حاول مرة أخرى.", success: "" };
  }

  if (!profile) {
    redirect("/onboarding");
  }

  let pharmacyId: string | null = null;

  if (docType === "license" && !profile.is_pharmacist) {
    return { error: "هذا المستند مخصص للصيادلة فقط.", success: "" };
  }

  if (docType === "pharmacy_license") {
    if (!profile.is_owner || !submittedPharmacyId) {
      return { error: "اختر صيدلية من الصيدليات الخاصة بحسابك.", success: "" };
    }

    const { data: pharmacy, error: pharmacyError } = await supabase
      .from("pharmacies")
      .select("id")
      .eq("id", submittedPharmacyId)
      .eq("owner_profile_id", user.id)
      .maybeSingle<{ id: string }>();

    if (pharmacyError) {
      return { error: "تعذّر التحقق من الصيدلية. حاول مرة أخرى.", success: "" };
    }

    if (!pharmacy) {
      return { error: "اختر صيدلية من الصيدليات الخاصة بحسابك.", success: "" };
    }

    pharmacyId = pharmacy.id;
  }

  if (docType === "national_id" && !profile.is_pharmacist && !profile.is_owner) {
    return { error: "أكمل بيانات الحساب قبل رفع المستندات.", success: "" };
  }

  const filter = documentStatusFilter(user.id, docType, pharmacyId);
  let latestQuery = supabase
    .from("verification_documents")
    .select("status")
    .eq("profile_id", filter.profile_id)
    .eq("doc_type", filter.doc_type)
    .order("created_at", { ascending: false })
    .limit(1);

  latestQuery =
    filter.pharmacy_id === null ? latestQuery.is("pharmacy_id", null) : latestQuery.eq("pharmacy_id", filter.pharmacy_id);

  const { data: latestRows, error: latestError } = await latestQuery;

  if (latestError) {
    return { error: "تعذّر قراءة حالة المستند الحالية. حاول مرة أخرى.", success: "" };
  }

  const latest = ((latestRows ?? []) as VerificationDocumentStatus[])[0];

  if (latest?.status === "approved") {
    return { error: "تم قبول هذا المستند بالفعل.", success: "" };
  }

  if (latest?.status === "pending") {
    return { error: "هذا المستند قيد المراجعة بالفعل.", success: "" };
  }

  let updatedLicenseNumber: string | null = null;

  if (docType === "license") {
    const { data: pharmacistDetails, error: pharmacistError } = await supabase
      .from("pharmacist_details")
      .select("license_number")
      .eq("profile_id", user.id)
      .maybeSingle<PharmacistDetails>();

    if (pharmacistError) {
      return { error: "تعذّر قراءة بيانات الصيدلي. حاول مرة أخرى.", success: "" };
    }

    if (!pharmacistDetails) {
      return { error: "أكمل بيانات الصيدلي قبل رفع مزاولة المهنة.", success: "" };
    }

    if (!pharmacistDetails.license_number) {
      const licenseNumber = getString(formData, "license_number");

      if (!licenseNumber) {
        return { error: "اكتب رقم مزاولة المهنة.", success: "" };
      }

      const { error: licenseError } = await supabase
        .from("pharmacist_details")
        .update({ license_number: licenseNumber })
        .eq("profile_id", user.id);

      if (licenseError) {
        if (licenseError.code === "23505") {
          return { error: "رقم مزاولة المهنة مستخدم في حساب آخر.", success: "" };
        }

        return { error: "تعذّر حفظ رقم مزاولة المهنة. حاول مرة أخرى.", success: "" };
      }

      updatedLicenseNumber = licenseNumber;
    }
  }

  const storagePath = `${user.id}/${docType}/${crypto.randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    if (updatedLicenseNumber) {
      await rollbackLicenseNumber(user.id, updatedLicenseNumber);
    }

    return { error: "تعذّر رفع الملف. حاول مرة أخرى.", success: "" };
  }

  const { error: insertError } = await supabase.from("verification_documents").insert({
    profile_id: user.id,
    pharmacy_id: pharmacyId,
    doc_type: docType,
    storage_path: storagePath,
    status: "pending",
  });

  if (insertError) {
    if (updatedLicenseNumber) {
      await rollbackLicenseNumber(user.id, updatedLicenseNumber);
    }

    return { error: "تم رفع الملف لكن تعذّر تسجيل المستند. تواصل مع الدعم.", success: "" };
  }

  revalidatePath("/settings/verification");

  return { error: "", success: "تم رفع المستند وسيتم مراجعته قريبًا." };
}
