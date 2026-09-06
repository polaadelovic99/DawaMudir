"use client";

import { useActionState } from "react";
import { createProfile, type ActionState } from "./actions";

export type GovernorateOption = {
  id: number;
  name_ar: string;
};

const initialState: ActionState = {
  error: "",
};

export default function ProfileForm({ governorates }: { governorates: GovernorateOption[] }) {
  const [state, formAction, isPending] = useActionState(createProfile, initialState);

  return (
    <form action={formAction} className="flex w-full max-w-xl flex-col gap-5 text-right">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">إكمال الملف الشخصي</h1>
        <p className="text-foreground/70">نحتاج بعض البيانات الأساسية لتجهيز حسابك.</p>
      </div>

      <label className="flex flex-col gap-2">
        <span className="font-medium">الاسم بالكامل</span>
        <input
          name="full_name"
          required
          className="rounded-md border border-foreground/20 bg-transparent px-4 py-3 text-right outline-none transition focus:border-foreground/60"
        />
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

      <fieldset className="space-y-3">
        <legend className="font-medium">الدور</legend>
        <label className="flex items-center gap-3 rounded-md border border-foreground/20 px-4 py-3">
          <input name="is_pharmacist" type="checkbox" className="size-4" />
          <span>صيدلي</span>
        </label>
        <label className="flex items-center gap-3 rounded-md border border-foreground/20 px-4 py-3">
          <input name="is_owner" type="checkbox" className="size-4" />
          <span>صاحب صيدلية</span>
        </label>
      </fieldset>

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
        {isPending ? "جار الحفظ..." : "متابعة"}
      </button>
    </form>
  );
}
