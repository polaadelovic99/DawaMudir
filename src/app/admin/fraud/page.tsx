import { createClient } from "@/lib/supabase/server";
import { markFraudFlagStatus } from "../actions";

type FraudFlag = {
  id: string;
  kind: string;
  target_type: string;
  target_id: string;
  detail: unknown;
  created_at: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function detailText(detail: unknown) {
  return JSON.stringify(detail ?? {}, null, 2);
}

export default async function AdminFraudPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("fraud_flags")
    .select("id, kind, target_type, target_id, detail, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const flags = (data ?? []) as FraudFlag[];

  return (
    <main className="flex flex-1 flex-col items-center p-8">
      <div className="flex w-full max-w-5xl flex-col gap-6 text-right">
        <div className="border-b border-foreground/15 pb-5">
          <h1 className="text-3xl font-bold">مؤشرات الاحتيال</h1>
          <p className="mt-2 text-foreground/70">المؤشرات المفتوحة مرتبة من الأحدث للأقدم.</p>
        </div>

        {flags.length === 0 ? (
          <div className="rounded-md border border-foreground/15 px-6 py-10 text-center text-foreground/70">
            لا توجد مؤشرات احتيال مفتوحة.
          </div>
        ) : (
          <div className="grid gap-4">
            {flags.map((flag) => (
              <section key={flag.id} className="rounded-md border border-foreground/15 p-5">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-foreground/60">النوع</p>
                    <p className="mt-1 break-all font-semibold">{flag.kind}</p>
                  </div>
                  <div>
                    <p className="text-sm text-foreground/60">تاريخ الرصد</p>
                    <p className="mt-1 font-semibold">{formatDate(flag.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-foreground/60">نوع الهدف</p>
                    <p className="mt-1 font-semibold">{flag.target_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-foreground/60">معرّف الهدف</p>
                    <p className="mt-1 break-all font-semibold">{flag.target_id}</p>
                  </div>
                </div>

                <pre
                  dir="ltr"
                  className="mt-4 overflow-auto rounded-md border border-foreground/10 bg-foreground/5 p-4 text-left text-sm"
                >
                  {detailText(flag.detail)}
                </pre>

                <div className="mt-5 flex flex-wrap gap-3">
                  <form action={markFraudFlagStatus.bind(null, flag.id, "reviewed")}>
                    <button
                      type="submit"
                      className="rounded-md bg-foreground px-4 py-2 font-semibold text-background transition hover:opacity-90"
                    >
                      تمت المراجعة
                    </button>
                  </form>
                  <form action={markFraudFlagStatus.bind(null, flag.id, "dismissed")}>
                    <button
                      type="submit"
                      className="rounded-md border border-foreground/20 px-4 py-2 font-semibold transition hover:border-foreground/60"
                    >
                      تجاهل
                    </button>
                  </form>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
