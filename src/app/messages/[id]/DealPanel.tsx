"use client";

import { FormEvent, useActionState, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { durationLabels, type DurationType } from "@/app/listings/constants";
import { submitDeal, type DealActionState } from "./deal-actions";

export type DealRow = {
  id: string;
  conversation_id: string | null;
  listing_id: string | null;
  owner_id: string;
  pharmacist_id: string;
  agreed_salary: number | null;
  duration_type: DurationType | null;
  duration_months: number | null;
  start_date: string | null;
  confirmed_by_owner: boolean;
  confirmed_by_pharmacist: boolean;
  status: "pending" | "confirmed" | "cancelled" | "completed";
  created_at: string;
};

type DealPanelProps = {
  conversationId: string;
  currentUserId: string;
  otherParticipantId: string;
  otherParticipantName: string;
  currentUserRole: "owner" | "pharmacist" | null;
  deal: DealRow | null;
  hasReviewed: boolean;
};

const initialDealState: DealActionState = { error: "", success: "" };

function formatMoney(value: number | null) {
  return value === null ? "غير محدد" : `${value.toLocaleString("ar-EG")} جنيه`;
}

function formatDate(value: string | null) {
  if (!value) {
    return "غير محدد";
  }

  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(new Date(value));
}

function durationText(deal: Pick<DealRow, "duration_type" | "duration_months">) {
  if (!deal.duration_type) {
    return "غير محدد";
  }

  if (deal.duration_type === "temporary" && deal.duration_months) {
    return `${durationLabels.temporary} - ${deal.duration_months.toLocaleString("ar-EG")} شهر`;
  }

  return durationLabels[deal.duration_type];
}

function TermsSummary({ deal }: { deal: DealRow }) {
  return (
    <dl className="grid gap-3 text-sm text-foreground/75 md:grid-cols-3">
      <div>
        <dt className="text-foreground/55">المدة</dt>
        <dd className="mt-1 font-semibold text-foreground">{durationText(deal)}</dd>
      </div>
      <div>
        <dt className="text-foreground/55">تاريخ البداية</dt>
        <dd className="mt-1 font-semibold text-foreground">{formatDate(deal.start_date)}</dd>
      </div>
      <div>
        <dt className="text-foreground/55">المرتب المتفق عليه</dt>
        <dd className="mt-1 font-semibold text-foreground">{formatMoney(deal.agreed_salary)}</dd>
      </div>
    </dl>
  );
}

export default function DealPanel({
  conversationId,
  currentUserId,
  otherParticipantId,
  otherParticipantName,
  currentUserRole,
  deal,
  hasReviewed: initialHasReviewed,
}: DealPanelProps) {
  const supabase = useMemo(() => createClient(), []);
  const [dealState, dealFormAction, isDealPending] = useActionState(
    submitDeal.bind(null, conversationId),
    initialDealState,
  );
  const [durationType, setDurationType] = useState<DurationType>("permanent");
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(initialHasReviewed);

  if (!currentUserRole) {
    return null;
  }

  const callerConfirmed =
    deal && currentUserRole === "owner" ? deal.confirmed_by_owner : deal?.confirmed_by_pharmacist;

  async function handleReviewSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!deal || deal.status !== "confirmed") {
      return;
    }

    setReviewError("");
    setReviewSuccess("");

    const parsedRating = Number(rating);

    if (!Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      setReviewError("اختر تقييم من 1 إلى 5.");
      return;
    }

    setReviewSubmitting(true);
    const { error } = await supabase.from("reviews").insert({
      deal_id: deal.id,
      author_id: currentUserId,
      target_id: otherParticipantId,
      rating: parsedRating,
      comment: comment.trim() || null,
    });
    setReviewSubmitting(false);

    if (error) {
      if (error.code === "23505") {
        setHasReviewed(true);
        setReviewError("");
        setReviewSuccess("تم إرسال تقييمك بالفعل.");
        return;
      }

      setReviewError("تعذّر إرسال التقييم. حاول مرة أخرى.");
      return;
    }

    setHasReviewed(true);
    setComment("");
    setReviewSuccess("تم إرسال تقييمك.");
  }

  return (
    <section className="rounded-md border border-foreground/15 bg-foreground/[0.03] p-4 text-right">
      {!deal ? (
        <details>
          <summary className="cursor-pointer select-none font-semibold">سجّل الاتفاق</summary>
          <form action={dealFormAction} className="mt-4 grid gap-4 md:grid-cols-3">
            <input type="hidden" name="mode" value="propose" />
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">نوع المدة</span>
              <select
                name="duration_type"
                value={durationType}
                onChange={(event) => setDurationType(event.target.value as DurationType)}
                className="rounded-md border border-foreground/20 bg-background px-4 py-3 text-right outline-none transition focus:border-foreground/60"
              >
                <option value="permanent">{durationLabels.permanent}</option>
                <option value="temporary">{durationLabels.temporary}</option>
              </select>
            </label>

            {durationType === "temporary" ? (
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">عدد الشهور</span>
                <input
                  type="number"
                  name="duration_months"
                  min="1"
                  className="rounded-md border border-foreground/20 bg-background px-4 py-3 text-right outline-none transition focus:border-foreground/60"
                />
              </label>
            ) : null}

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">تاريخ البداية</span>
              <input
                type="date"
                name="start_date"
                required
                className="rounded-md border border-foreground/20 bg-background px-4 py-3 text-right outline-none transition focus:border-foreground/60"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium">المرتب المتفق عليه</span>
              <input
                type="number"
                name="agreed_salary"
                min="0"
                placeholder="اختياري"
                className="rounded-md border border-foreground/20 bg-background px-4 py-3 text-right outline-none transition focus:border-foreground/60"
              />
            </label>

            <div className="flex items-end md:col-span-2">
              <button
                type="submit"
                disabled={isDealPending}
                className="w-full rounded-md bg-foreground px-5 py-3 font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDealPending ? "جار التسجيل..." : "سجّل الاتفاق"}
              </button>
            </div>
          </form>
        </details>
      ) : null}

      {deal?.status === "pending" ? (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-semibold">الاتفاق المقترح</h2>
            <div className="mt-3">
              <TermsSummary deal={deal} />
            </div>
          </div>

          {callerConfirmed ? (
            <p className="rounded-md border border-foreground/15 px-4 py-3 text-sm text-foreground/70">
              بانتظار موافقة الطرف التاني.
            </p>
          ) : (
            <form action={dealFormAction}>
              <input type="hidden" name="mode" value="confirm" />
              <input type="hidden" name="duration_type" value={deal.duration_type ?? ""} />
              <input type="hidden" name="duration_months" value={deal.duration_months ?? ""} />
              <input type="hidden" name="start_date" value={deal.start_date ?? ""} />
              <input type="hidden" name="agreed_salary" value={deal.agreed_salary ?? ""} />
              <button
                type="submit"
                disabled={isDealPending}
                className="w-full rounded-md bg-foreground px-5 py-3 font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isDealPending ? "جار التسجيل..." : "أوافق على هذا الاتفاق"}
              </button>
            </form>
          )}
        </div>
      ) : null}

      {deal?.status === "confirmed" ? (
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="font-semibold">✅ تم تسجيل الاتفاق</h2>
            <div className="mt-3">
              <TermsSummary deal={deal} />
            </div>
          </div>

          {hasReviewed ? (
            <p className="rounded-md border border-foreground/15 px-4 py-3 text-sm text-foreground/70">
              تم إرسال تقييمك.
            </p>
          ) : (
            <form onSubmit={handleReviewSubmit} className="grid gap-3 md:grid-cols-[160px_1fr]">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">قيّم {otherParticipantName}</span>
                <select
                  value={rating}
                  onChange={(event) => setRating(event.target.value)}
                  className="rounded-md border border-foreground/20 bg-background px-4 py-3 text-right outline-none transition focus:border-foreground/60"
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>
                      {value.toLocaleString("ar-EG")}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium">تعليق اختياري</span>
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={3}
                  className="resize-none rounded-md border border-foreground/20 bg-background px-4 py-3 text-right outline-none transition focus:border-foreground/60"
                />
              </label>
              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className="w-full rounded-md border border-foreground/20 px-5 py-3 font-semibold transition hover:border-foreground/60 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {reviewSubmitting ? "جار الإرسال..." : "إرسال التقييم"}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : null}

      {deal && deal.status !== "pending" && deal.status !== "confirmed" ? (
        <div className="flex flex-col gap-3">
          <h2 className="font-semibold">حالة الاتفاق: {deal.status}</h2>
          <TermsSummary deal={deal} />
        </div>
      ) : null}

      {dealState.error ? (
        <p className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
          {dealState.error}
        </p>
      ) : null}
      {dealState.success ? (
        <p className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {dealState.success}
        </p>
      ) : null}
      {reviewError ? (
        <p className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
          {reviewError}
        </p>
      ) : null}
      {reviewSuccess ? (
        <p className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {reviewSuccess}
        </p>
      ) : null}
    </section>
  );
}
