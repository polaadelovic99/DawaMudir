"use client";

import { useActionState } from "react";
import { createPharmacistDetails, type ActionState } from "../actions";

const initialState: ActionState = {
  error: "",
};

const takleefOptions = [
  { value: "not_started", label: "لم يبدأ" },
  { value: "upcoming", label: "قادم" },
  { value: "completed", label: "تم" },
  { value: "exempted", label: "معفى" },
];

export default function PharmacistForm() {
  const [state, formAction, isPending] = useActionState(createPharmacistDetails, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-xl flex-col gap-5 text-right">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">بيانات الصيدلي</h1>
        <p className="text-foreground/70">أضف بياناتك المهنية الأساسية.</p>
      </div>

      <label className="flex flex-col gap-2">
        <span className="font-medium">سنة التخرج</span>
        <input
          name="graduation_year"
          type="number"
          min="1950"
          max="2100"
          inputMode="numeric"
          className="rounded-md border border-foreground/20 bg-transparent px-4 py-3 text-right outline-none transition focus:border-foreground/60"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="font-medium">موقف التكليف</span>
        <select
          name="takleef_status"
          defaultValue=""
          className="rounded-md border border-foreground/20 bg-background px-4 py-3 text-right outline-none transition focus:border-foreground/60"
        >
          <option value="">غير محدد</option>
          {takleefOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2">
          <span className="font-medium">الراتب المتوقع من</span>
          <input
            name="expected_salary_min"
            type="number"
            min="0"
            inputMode="numeric"
            className="rounded-md border border-foreground/20 bg-transparent px-4 py-3 text-right outline-none transition focus:border-foreground/60"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="font-medium">الراتب المتوقع إلى</span>
          <input
            name="expected_salary_max"
            type="number"
            min="0"
            inputMode="numeric"
            className="rounded-md border border-foreground/20 bg-transparent px-4 py-3 text-right outline-none transition focus:border-foreground/60"
          />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="font-medium">نبذة مختصرة</span>
        <textarea
          name="bio"
          rows={4}
          className="resize-y rounded-md border border-foreground/20 bg-transparent px-4 py-3 text-right outline-none transition focus:border-foreground/60"
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
        {isPending ? "جار الحفظ..." : "حفظ ومتابعة"}
      </button>
    </form>
  );
}
