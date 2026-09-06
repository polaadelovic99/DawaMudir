import { createClient } from "@/lib/supabase/server";
import { kindLabels } from "../listings/constants";

type CountResult = {
  label: string;
  count: number;
};

function StatCard({ label, count }: CountResult) {
  return (
    <div className="rounded-md border border-foreground/15 px-5 py-4 text-right">
      <dt className="text-sm text-foreground/60">{label}</dt>
      <dd className="mt-2 text-3xl font-bold">{count.toLocaleString("ar-EG")}</dd>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const [
    totalProfiles,
    basicProfiles,
    documentsProfiles,
    managerWantedListings,
    managerAvailableListings,
    openReports,
    openFraudFlags,
    pendingDocuments,
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("verification_tier", "basic"),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("verification_tier", "documents"),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("kind", "manager_wanted"),
    supabase
      .from("listings")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .eq("kind", "manager_available"),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("fraud_flags").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase
      .from("verification_documents")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  const results = [
    totalProfiles,
    basicProfiles,
    documentsProfiles,
    managerWantedListings,
    managerAvailableListings,
    openReports,
    openFraudFlags,
    pendingDocuments,
  ];
  const firstError = results.find((result) => result.error)?.error;

  if (firstError) {
    throw new Error(firstError.message);
  }

  const stats: CountResult[] = [
    { label: "إجمالي الحسابات", count: totalProfiles.count ?? 0 },
    { label: "حسابات موثّقة أساسي", count: basicProfiles.count ?? 0 },
    { label: "حسابات موثّقة أوراق", count: documentsProfiles.count ?? 0 },
    { label: `إعلانات نشطة: ${kindLabels.manager_wanted}`, count: managerWantedListings.count ?? 0 },
    { label: `إعلانات نشطة: ${kindLabels.manager_available}`, count: managerAvailableListings.count ?? 0 },
    { label: "بلاغات مفتوحة", count: openReports.count ?? 0 },
    { label: "مؤشرات احتيال مفتوحة", count: openFraudFlags.count ?? 0 },
    { label: "مستندات في انتظار المراجعة", count: pendingDocuments.count ?? 0 },
  ];

  return (
    <main className="flex flex-1 flex-col items-center p-8">
      <div className="flex w-full max-w-5xl flex-col gap-6">
        <div className="border-b border-foreground/15 pb-5 text-right">
          <h1 className="text-3xl font-bold">لوحة الأدمن</h1>
          <p className="mt-2 text-foreground/70">أرقام سريعة عن الحسابات، الإعلانات، والمراجعات.</p>
        </div>

        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} label={stat.label} count={stat.count} />
          ))}
        </dl>
      </div>
    </main>
  );
}
