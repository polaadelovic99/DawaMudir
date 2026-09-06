"use client";

import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function VerifyLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);
  const phone = searchParams.get("phone");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!phone) {
      router.replace("/login");
    }
  }, [phone, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!phone) {
      router.replace("/login");
      return;
    }

    if (!/^\d{6}$/.test(token)) {
      setError("اكتب رمز التحقق المكوّن من 6 أرقام.");
      return;
    }

    setIsLoading(true);

    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });

    setIsLoading(false);

    if (verifyError) {
      setError("رمز التحقق غير صحيح أو انتهت صلاحيته.");
      return;
    }

    router.push("/onboarding");
    router.refresh();
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-5 text-right">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold">تأكيد رقم الموبايل</h1>
          <p className="text-foreground/70">ادخل رمز التحقق المرسل إلى {phone || "رقمك"}.</p>
        </div>

        <label className="flex flex-col gap-2">
          <span className="font-medium">رمز التحقق</span>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={token}
            onChange={(event) => setToken(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="rounded-md border border-foreground/20 bg-transparent px-4 py-3 text-center text-2xl outline-none transition focus:border-foreground/60"
          />
        </label>

        {error ? (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isLoading || !phone}
          className="rounded-md bg-foreground px-5 py-3 font-semibold text-background transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "جار التحقق..." : "تأكيد الدخول"}
        </button>
      </form>
    </main>
  );
}

export default function VerifyLoginPage() {
  return (
    <Suspense>
      <VerifyLoginForm />
    </Suspense>
  );
}
