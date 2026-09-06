"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type AdminProfile = {
  is_admin: boolean;
};

type ProfileVerificationShape = {
  is_pharmacist: boolean;
  is_owner: boolean;
  verification_tier: "basic" | "documents";
};

type VerificationDocument = {
  id: string;
  profile_id: string | null;
  doc_type: "license" | "national_id" | "pharmacy_license";
  pharmacy_id: string | null;
};

type ApprovedDocument = {
  doc_type: "license" | "national_id" | "pharmacy_license";
  pharmacy_id: string | null;
};

type PharmacyId = {
  id: string;
};

async function getAdminClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .maybeSingle<AdminProfile>();

  if (profileError || !profile?.is_admin) {
    redirect("/");
  }

  return { supabase, user };
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function approvedKey(docType: string, pharmacyId: string | null) {
  return `${docType}:${pharmacyId ?? "profile"}`;
}

async function maybePromoteProfile(profileId: string) {
  const { supabase } = await getAdminClient();

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("is_pharmacist, is_owner, verification_tier")
    .eq("id", profileId)
    .maybeSingle<ProfileVerificationShape>();

  if (profileError || !profile || profile.verification_tier === "documents") {
    return;
  }

  const [pharmaciesResult, approvedDocumentsResult] = await Promise.all([
    profile.is_owner
      ? supabase.from("pharmacies").select("id").eq("owner_profile_id", profileId)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("verification_documents")
      .select("doc_type, pharmacy_id")
      .eq("profile_id", profileId)
      .eq("status", "approved"),
  ]);

  if (pharmaciesResult.error || approvedDocumentsResult.error) {
    return;
  }

  const approved = new Set(
    ((approvedDocumentsResult.data ?? []) as ApprovedDocument[]).map((document) =>
      approvedKey(document.doc_type, document.pharmacy_id),
    ),
  );
  const required = new Set<string>();

  if (profile.is_pharmacist) {
    required.add(approvedKey("license", null));
  }

  if (profile.is_pharmacist || profile.is_owner) {
    required.add(approvedKey("national_id", null));
  }

  if (profile.is_owner) {
    ((pharmaciesResult.data ?? []) as PharmacyId[]).forEach((pharmacy) => {
      required.add(approvedKey("pharmacy_license", pharmacy.id));
    });
  }

  if (required.size === 0) {
    return;
  }

  const hasAllRequiredDocuments = [...required].every((key) => approved.has(key));

  if (!hasAllRequiredDocuments) {
    return;
  }

  await supabase
    .from("profiles")
    .update({ verification_tier: "documents" })
    .eq("id", profileId);
}

export async function approveVerificationDocument(documentId: string) {
  const { supabase, user } = await getAdminClient();

  const { data: document, error: documentError } = await supabase
    .from("verification_documents")
    .select("id, profile_id, doc_type, pharmacy_id")
    .eq("id", documentId)
    .eq("status", "pending")
    .maybeSingle<VerificationDocument>();

  if (documentError || !document?.profile_id) {
    redirect("/admin/verification");
  }

  const { error: updateError } = await supabase
    .from("verification_documents")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_note: null,
    })
    .eq("id", document.id);

  if (!updateError) {
    await maybePromoteProfile(document.profile_id);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/verification");
  redirect("/admin/verification");
}

export async function rejectVerificationDocument(documentId: string, formData: FormData) {
  const { supabase, user } = await getAdminClient();
  const reviewNote = getString(formData, "review_note");

  if (!reviewNote) {
    redirect("/admin/verification");
  }

  await supabase
    .from("verification_documents")
    .update({
      status: "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_note: reviewNote,
    })
    .eq("id", documentId)
    .eq("status", "pending");

  revalidatePath("/admin");
  revalidatePath("/admin/verification");
  redirect("/admin/verification");
}

export async function markReportStatus(reportId: string, status: "reviewed" | "dismissed") {
  const { supabase } = await getAdminClient();

  await supabase
    .from("reports")
    .update({ status })
    .eq("id", reportId)
    .eq("status", "open");

  revalidatePath("/admin");
  revalidatePath("/admin/reports");
  redirect("/admin/reports");
}

export async function markFraudFlagStatus(flagId: string, status: "reviewed" | "dismissed") {
  const { supabase } = await getAdminClient();

  await supabase
    .from("fraud_flags")
    .update({ status })
    .eq("id", flagId)
    .eq("status", "open");

  revalidatePath("/admin");
  revalidatePath("/admin/fraud");
  redirect("/admin/fraud");
}
