"use client";

import { FormEvent, useActionState, useState } from "react";
import { submitVerificationDocument, type VerificationUploadState } from "./actions";

export type VerificationItem = {
  key: string;
  docType: "license" | "national_id" | "pharmacy_license";
  title: string;
  description: string;
  pharmacyId: string | null;
  status: "pending" | "approved" | "rejected" | null;
  reviewNote: string | null;
  requiresLicenseNumber: boolean;
};

type VerificationFormProps = {
  items: VerificationItem[];
};

const initialState: VerificationUploadState = {
  error: "",
  success: "",
};

const allowedTypes = new Set(["image/jpeg", "image/png", "application/pdf"]);
const maxFileSize = 5 * 1024 * 1024;

function statusText(status: VerificationItem["status"]) {
  if (status === "pending") {
    return "جاري المراجعة";
  }

  if (status === "approved") {
    return "تم القبول ✅";
  }

  if (status === "rejected") {
    return "تم الرفض";
  }

  return "لم يتم الرفع";
}

function statusClass(status: VerificationItem["status"]) {
  if (status === "approved") {
    return "border-green-600/30 bg-green-600/10 text-green-700 dark:text-green-300";
  }

  if (status === "pending") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  if (status === "rejected") {
    return "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-300";
  }

  return "border-foreground/20 text-foreground/70";
}

function UploadCard({ item }: { item: VerificationItem }) {
  const [state, formAction, isPending] = useActionState(submitVerificationDocument, initialState);
  const [clientError, setClientError] = useState("");
  const canUpload = item.status === null || item.status === "rejected";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    setClientError("");

    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("document_file") as HTMLInputElement | null;
    const file = fileInput?.files?.[0];

    if (!file) {
      event.preventDefault();
      setClientError("اختر ملف المستند أولًا.");
      return;
    }

    if (!allowedTypes.has(file.type)) {
      event.preventDefault();
      setClientError("صيغة الملف غير مدعومة. استخدم JPG أو PNG أو PDF.");
      return;
    }

    if (file.size > maxFileSize) {
      event.preventDefault();
      setClientError("حجم الملف أكبر من 5 ميجابايت.");
    }
  }

  return (
    <section className="rounded-md border border-foreground/15 p-5 text-right">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-xl font-bold">{item.title}</h2>
          <p className="text-sm text-foreground/65">{item.description}</p>
        </div>
        <span className={`w-fit rounded-md border px-3 py-1 text-sm font-semibold ${statusClass(item.status)}`}>
          {statusText(item.status)}
        </span>
      </div>

      {item.status === "rejected" && item.reviewNote ? (
        <p className="mt-4 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
          سبب الرفض: {item.reviewNote}
        </p>
      ) : null}

      {canUpload ? (
        <form action={formAction} onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
          <input type="hidden" name="doc_type" value={item.docType} />
          {item.pharmacyId ? <input type="hidden" name="pharmacy_id" value={item.pharmacyId} /> : null}

          {item.requiresLicenseNumber ? (
            <label className="flex flex-col gap-2">
              <span className="font-medium">رقم مزاولة المهنة</span>
              <input
                name="license_number"
                required
                className="rounded-md border border-foreground/20 bg-transparent px-4 py-3 text-right outline-none transition focus:border-foreground/60"
              />
            </label>
          ) : null}

          <label className="flex flex-col gap-2">
            <span className="font-medium">ملف المستند</span>
            <input
              name="document_file"
              type="file"
              accept="image/jpeg,image/png,application/pdf"
              required
              className="rounded-md border border-foreground/20 bg-transparent px-4 py-3 text-right file:me-4 file:rounded-md file:border-0 file:bg-foreground file:px-4 file:py-2 file:font-semibold file:text-background"
            />
          </label>

          {clientError || state.error ? (
            <p className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
              {clientError || state.error}
            </p>
          ) : null}

          {state.success ? (
            <p className="rounded-md border border-green-600/30 bg-green-600/10 px-4 py-3 text-sm text-green-700 dark:text-green-300">
              {state.success}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-foreground px-5 py-3 font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "جار الرفع..." : item.status === "rejected" ? "إعادة رفع المستند" : "رفع المستند"}
          </button>
        </form>
      ) : null}
    </section>
  );
}

export default function VerificationForm({ items }: VerificationFormProps) {
  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <UploadCard key={item.key} item={item} />
      ))}
    </div>
  );
}
