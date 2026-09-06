"use client";

import { useActionState, useMemo, useState } from "react";
import { createListing, type ActionState } from "../actions";
import {
  attendanceLabels,
  durationLabels,
  importedLabels,
  kindLabels,
  scheduleLabels,
  type ListingKind,
} from "../constants";

export type GovernorateOption = {
  id: number;
  name_ar: string;
};

export type PharmacyOption = {
  id: string;
  name: string;
};

const initialState: ActionState = {
  error: "",
};

type Props = {
  allowedKinds: ListingKind[];
  governorates: GovernorateOption[];
  pharmacies: PharmacyOption[];
};

export default function NewListingForm({ allowedKinds, governorates, pharmacies }: Props) {
  const [state, formAction, isPending] = useActionState(createListing, initialState);
  const [kind, setKind] = useState<ListingKind>(allowedKinds[0] ?? "manager_wanted");
  const [durationType, setDurationType] = useState("permanent");
  const canChooseKind = allowedKinds.length > 1;
  const showPharmacyPicker = kind === "manager_wanted";
  const kindDescription = useMemo(() => {
    if (kind === "manager_wanted") {
      return "أنشئ إعلانًا لصيدلية تبحث عن مدير مسجّل.";
    }

    return "أنشئ إعلانًا يوضح أنك متاح للعمل كمدير صيدلية.";
  }, [kind]);

  return (
    <form action={formAction} className="flex w-full max-w-2xl flex-col gap-5 text-right">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">إعلان جديد</h1>
        <p className="text-foreground/70">{kindDescription}</p>
      </div>

      {canChooseKind ? (
        <label className="flex flex-col gap-2">
          <span className="font-medium">نوع الإعلان</span>
          <select
            name="kind"
            value={kind}
            onChange={(event) => setKind(event.target.value as ListingKind)}
            className="rounded-md border border-foreground/20 bg-background px-4 py-3 text-right outline-none transition focus:border-foreground/60"
          >
            {allowedKinds.map((allowedKind) => (
              <option key={allowedKind} value={allowedKind}>
                {kindLabels[allowedKind]}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <>
          <input type="hidden" name="kind" value={kind} />
          <div className="rounded-md border border-foreground/20 px-4 py-3">
            <span className="text-sm text-foreground/60">نوع الإعلان</span>
            <p className="font-semibold">{kindLabels[kind]}</p>
          </div>
        </>
      )}

      {showPharmacyPicker ? (
        <label className="flex flex-col gap-2">
          <span className="font-medium">الصيدلية</span>
          <select
            name="pharmacy_id"
            required
            defaultValue=""
            className="rounded-md border border-foreground/20 bg-background px-4 py-3 text-right outline-none transition focus:border-foreground/60"
          >
            <option value="" disabled>
              اختر الصيدلية
            </option>
            {pharmacies.map((pharmacy) => (
              <option key={pharmacy.id} value={pharmacy.id}>
                {pharmacy.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="font-medium">المدة</span>
          <select
            name="duration_type"
            required
            value={durationType}
            onChange={(event) => setDurationType(event.target.value)}
            className="rounded-md border border-foreground/20 bg-background px-4 py-3 text-right outline-none transition focus:border-foreground/60"
          >
            <option value="permanent">{durationLabels.permanent}</option>
            <option value="temporary">{durationLabels.temporary}</option>
          </select>
        </label>

        {durationType === "temporary" ? (
          <label className="flex flex-col gap-2">
            <span className="font-medium">عدد الشهور</span>
            <input
              name="duration_months"
              type="number"
              min="1"
              required
              className="rounded-md border border-foreground/20 bg-transparent px-4 py-3 text-right outline-none transition focus:border-foreground/60"
            />
          </label>
        ) : null}

        <label className="flex flex-col gap-2">
          <span className="font-medium">الحضور</span>
          <select
            name="attendance"
            required
            defaultValue=""
            className="rounded-md border border-foreground/20 bg-background px-4 py-3 text-right outline-none transition focus:border-foreground/60"
          >
            <option value="" disabled>
              اختر الحضور
            </option>
            <option value="with">{attendanceLabels.with}</option>
            <option value="without">{attendanceLabels.without}</option>
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-medium">جدول الشفتات</span>
          <select
            name="schedule"
            required
            defaultValue=""
            className="rounded-md border border-foreground/20 bg-background px-4 py-3 text-right outline-none transition focus:border-foreground/60"
          >
            <option value="" disabled>
              اختر حالة الجدول
            </option>
            <option value="with">{scheduleLabels.with}</option>
            <option value="without">{scheduleLabels.without}</option>
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-medium">الأدوية المستوردة</span>
          <select
            name="imported"
            required
            defaultValue=""
            className="rounded-md border border-foreground/20 bg-background px-4 py-3 text-right outline-none transition focus:border-foreground/60"
          >
            <option value="" disabled>
              اختر حالة المستورد
            </option>
            <option value="with">{importedLabels.with}</option>
            <option value="without">{importedLabels.without}</option>
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-medium">المحافظة</span>
          <select
            name="governorate_id"
            required
            defaultValue=""
            className="rounded-md border border-foreground/20 bg-background px-4 py-3 text-right outline-none transition focus:border-foreground/60"
          >
            <option value="" disabled>
              اختر المحافظة
            </option>
            {governorates.map((governorate) => (
              <option key={governorate.id} value={governorate.id}>
                {governorate.name_ar}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="font-medium">الراتب المتوقع</span>
          <input
            name="salary_amount"
            type="number"
            min="0"
            className="rounded-md border border-foreground/20 bg-transparent px-4 py-3 text-right outline-none transition focus:border-foreground/60"
          />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="font-medium">ملاحظات</span>
        <textarea
          name="notes"
          rows={5}
          className="rounded-md border border-foreground/20 bg-transparent px-4 py-3 text-right outline-none transition focus:border-foreground/60"
        />
      </label>

      {state.error ? (
        <p className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-foreground px-5 py-3 font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "جار إنشاء الإعلان..." : "نشر الإعلان"}
      </button>
    </form>
  );
}
