"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function normalizeEgyptianPhone(value: string) {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, "");

  if (/^\+20(10|11|12|15)\d{8}$/.test(trimmed)) {
    return trimmed;
  }

  if (/^20(10|11|12|15)\d{8}$/.test(digits)) {
    return `+${digits}`;
  }

  if (/^0(10|11|12|15)\d{8}$/.test(digits)) {
    return `+20${digits.slice(1)}`;
  }

  if (/^(10|11|12|15)\d{8}$/.test(digits)) {
    return `+20${digits}`;
  }

  return null;
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedPhone = normalizeEgyptianPhone(phone);

    if (!normalizedPhone) {
      setError("اكتب رقم موبايل مصري صحيح بصيغة 01xxxxxxxxx.");
      return;
    }

    setIsLoading(true);

    const { error: signInError } = await supabase.auth.signInWithOtp({
      phone: normalizedPhone,
    });

    setIsLoading(false);

    if (signInError) {
      setError("تعذّر إرسال رمز التحقق. تحقق من الرقم وحاول مرة أخرى.");
      return;
    }

    router.push(`/login/verify?phone=${encodeURIComponent(normalizedPhone)}`);
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-5 text-right">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">تسجيل الدخول</h1>
          <p className="text-foreground/70">ادخل رقم موبايلك لاستلام رمز تحقق قصير.</p>
        </div>

        <label className="flex flex-col gap-2">
          <span className="font-medium">رقم الموبايل</span>
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="01xxxxxxxxx"
            className="rounded-md border border-foreground/20 bg-transparent px-4 py-3 text-right outline-none transition focus:border-foreground/60"
            aria-describedby="phone-help"
          />
          <span id="phone-help" className="text-sm text-foreground/60">
            مثال: 01012345678
          </span>
        </label>

        {error ? (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isLoading}
          className="rounded-md bg-foreground px-5 py-3 font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "جار إرسال الرمز..." : "إرسال رمز التحقق"}
        </button>
      </form>
    </main>
  );
}
