"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isDurationType } from "@/app/listings/constants";

export type DealActionState = {
  error: string;
  success: string;
};

type ConversationParticipant = {
  id: string;
  participant_a: string;
  participant_b: string;
};

type PendingDealTerms = {
  agreed_salary: number | null;
  duration_type: string | null;
  duration_months: number | null;
  start_date: string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function getOptionalDate(formData: FormData, key: string) {
  const value = getString(formData, key);

  if (!value) {
    return null;
  }

  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "invalid";
}

export async function submitDeal(
  conversationId: string,
  _: DealActionState,
  formData: FormData,
): Promise<DealActionState> {
  if (!UUID_PATTERN.test(conversationId)) {
    return { error: "المحادثة غير متاحة.", success: "" };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("conversations")
    .select("id, participant_a, participant_b")
    .eq("id", conversationId)
    .maybeSingle<ConversationParticipant>();

  if (
    conversationError ||
    !conversation ||
    (conversation.participant_a !== user.id && conversation.participant_b !== user.id)
  ) {
    return { error: "المحادثة غير متاحة.", success: "" };
  }

  const mode = getString(formData, "mode");

  if (mode === "confirm") {
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .select("agreed_salary, duration_type, duration_months, start_date")
      .eq("conversation_id", conversation.id)
      .eq("status", "pending")
      .maybeSingle<PendingDealTerms>();

    if (dealError || !deal) {
      return { error: "الاتفاق غير متاح للموافقة.", success: "" };
    }

    const { error: rpcError } = await supabase.rpc("propose_or_confirm_deal", {
      p_conversation_id: conversation.id,
      p_agreed_salary: deal.agreed_salary,
      p_duration_type: deal.duration_type,
      p_duration_months: deal.duration_months,
      p_start_date: deal.start_date,
    });

    if (rpcError) {
      return { error: "تعذّر تسجيل الموافقة. حاول مرة أخرى.", success: "" };
    }

    revalidatePath(`/messages/${conversation.id}`);

    return { error: "", success: "تم تحديث حالة الاتفاق." };
  }

  const agreedSalary = getOptionalInt(formData, "agreed_salary");
  const durationType = getString(formData, "duration_type");
  const durationMonths = getOptionalInt(formData, "duration_months");
  const startDate = getOptionalDate(formData, "start_date");

  if (mode !== "propose") {
    return { error: "طلب غير صحيح.", success: "" };
  }

  if (Number.isNaN(agreedSalary) || (agreedSalary !== null && agreedSalary < 0)) {
    return { error: "اكتب قيمة راتب صحيحة أو اتركها فارغة.", success: "" };
  }

  if (durationType && !isDurationType(durationType)) {
    return { error: "اختر نوع مدة صحيح.", success: "" };
  }

  if (mode === "propose" && !durationType) {
    return { error: "اختر نوع المدة.", success: "" };
  }

  if (durationType === "temporary" && (!durationMonths || durationMonths < 1)) {
    return { error: "اكتب عدد شهور صحيح للاتفاق المؤقت.", success: "" };
  }

  if (Number.isNaN(durationMonths)) {
    return { error: "اكتب عدد شهور صحيح أو اتركه فارغًا.", success: "" };
  }

  if (startDate === "invalid") {
    return { error: "اختر تاريخ بداية صحيح.", success: "" };
  }

  if (mode === "propose" && !startDate) {
    return { error: "اختر تاريخ البداية.", success: "" };
  }

  const { error: rpcError } = await supabase.rpc("propose_or_confirm_deal", {
    p_conversation_id: conversation.id,
    p_agreed_salary: agreedSalary,
    p_duration_type: durationType || null,
    p_duration_months: durationType === "temporary" ? durationMonths : null,
    p_start_date: startDate,
  });

  if (rpcError) {
    return { error: "تعذّر تسجيل الاتفاق. تأكد من بيانات الاتفاق وحاول مرة أخرى.", success: "" };
  }

  revalidatePath(`/messages/${conversation.id}`);

  return { error: "", success: "تم تحديث حالة الاتفاق." };
}
