import { createClient } from "@/lib/supabase/server";
import { markReportStatus } from "../actions";

type Report = {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  created_at: string;
};

type ProfileName = {
  id: string;
  full_name: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .select("id, reporter_id, target_type, target_id, reason, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const reports = (data ?? []) as Report[];
  const reporterIds = [...new Set(reports.map((report) => report.reporter_id))];
  const { data: profiles, error: profilesError } =
    reporterIds.length > 0
      ? await supabase.from("profiles").select("id, full_name").in("id", reporterIds)
      : { data: [], error: null };

  if (profilesError) {
    throw new Error(profilesError.message);
  }

  const profileNames = new Map(
    ((profiles ?? []) as ProfileName[]).map((profile) => [profile.id, profile.full_name]),
  );

  return (
    <main className="flex flex-1 flex-col items-center p-8">
      <div className="flex w-full max-w-5xl flex-col gap-6 text-right">
        <div className="border-b border-foreground/15 pb-5">
          <h1 className="text-3xl font-bold">البلاغات</h1>
          <p className="mt-2 text-foreground/70">البلاغات المفتوحة مرتبة من الأقدم للأحدث.</p>
        </div>

        {reports.length === 0 ? (
          <div className="rounded-md border border-foreground/15 px-6 py-10 text-center text-foreground/70">
            لا توجد بلاغات مفتوحة.
          </div>
        ) : (
          <div className="grid gap-4">
            {reports.map((report) => (
              <section key={report.id} className="rounded-md border border-foreground/15 p-5">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-foreground/60">المبلّغ</p>
                    <p className="mt-1 font-semibold">{profileNames.get(report.reporter_id) ?? "مستخدم غير معروف"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-foreground/60">تاريخ البلاغ</p>
                    <p className="mt-1 font-semibold">{formatDate(report.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-foreground/60">نوع الهدف</p>
                    <p className="mt-1 font-semibold">{report.target_type}</p>
                  </div>
                  <div>
                    <p className="text-sm text-foreground/60">معرّف الهدف</p>
                    <p className="mt-1 break-all font-semibold">{report.target_id}</p>
                  </div>
                </div>

                <p className="mt-4 whitespace-pre-wrap rounded-md border border-foreground/10 px-4 py-3 leading-7">
                  {report.reason}
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <form action={markReportStatus.bind(null, report.id, "reviewed")}>
                    <button
                      type="submit"
                      className="rounded-md bg-foreground px-4 py-2 font-semibold text-background transition hover:opacity-90"
                    >
                      تمت المراجعة
                    </button>
                  </form>
                  <form action={markReportStatus.bind(null, report.id, "dismissed")}>
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
