import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { startConversation } from "../actions";
import {
  attendanceLabels,
  durationLabels,
  importedLabels,
  kindLabels,
  scheduleLabels,
  withWithoutLabels,
  type DurationType,
  type ListingKind,
  type WithWithout,
} from "../constants";

type MaybeRelation<T> = T | T[] | null;

type ListingDetail = {
  id: string;
  kind: ListingKind;
  author_id: string;
  pharmacy_id: string | null;
  duration_type: DurationType | null;
  duration_months: number | null;
  attendance: WithWithout | null;
  schedule: WithWithout | null;
  imported: WithWithout | null;
  governorate_id: number | null;
  district_id: number | null;
  salary_amount: number | null;
  notes: string | null;
  status: string;
  expires_at: string | null;
  created_at: string;
  governorates: MaybeRelation<{ name_ar: string }>;
  pharmacies: MaybeRelation<{
    name: string;
    has_schedule: boolean | null;
    sells_imported: boolean | null;
  }>;
};

type PublicProfile = {
  full_name: string;
};

function relationOne<T>(value: MaybeRelation<T>) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "غير محدد";
  }

  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMoney(value: number | null) {
  return value === null ? "غير محدد" : `${value.toLocaleString("ar-EG")} جنيه`;
}

function durationText(listing: ListingDetail) {
  if (!listing.duration_type) {
    return "غير محدد";
  }

  if (listing.duration_type === "temporary" && listing.duration_months) {
    return `${durationLabels.temporary} - ${listing.duration_months.toLocaleString("ar-EG")} شهر`;
  }

  return durationLabels[listing.duration_type];
}

function optionText(value: WithWithout | null, labels: Record<WithWithout, string>) {
  return value ? labels[value] : "غير محدد";
}

function booleanText(value: boolean | null | undefined) {
  if (value === null || value === undefined) {
    return "غير محدد";
  }

  return value ? withWithoutLabels.with : withWithoutLabels.without;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-foreground/15 px-4 py-3">
      <dt className="text-sm text-foreground/60">{label}</dt>
      <dd className="mt-1 font-semibold">{value}</dd>
    </div>
  );
}

function NotFoundState() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-8 text-center">
      <div className="flex w-full max-w-xl flex-col gap-4">
        <h1 className="text-3xl font-bold">الإعلان غير موجود</h1>
        <p className="text-foreground/70">قد يكون الإعلان مغلقًا أو غير متاح للعرض.</p>
        <Link
          href="/listings"
          className="rounded-md bg-foreground px-5 py-3 font-semibold text-background transition hover:opacity-90"
        >
          الرجوع إلى الإعلانات
        </Link>
      </div>
    </main>
  );
}

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!isUuid(id)) {
    return <NotFoundState />;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("listings")
    .select(
      "id, kind, author_id, pharmacy_id, duration_type, duration_months, attendance, schedule, imported, governorate_id, district_id, salary_amount, notes, status, expires_at, created_at, governorates(name_ar), pharmacies(name, has_schedule, sells_imported)",
    )
    .eq("id", id)
    .maybeSingle<ListingDetail>();

  if (error || !data) {
    return <NotFoundState />;
  }

  const listing = data;
  const governorate = relationOne(listing.governorates);
  const pharmacy = relationOne(listing.pharmacies);
  let authorName = "غير محدد";

  if (listing.kind === "manager_available") {
    const { data: profile } = await supabase
      .from("public_profiles")
      .select("full_name")
      .eq("id", listing.author_id)
      .maybeSingle<PublicProfile>();

    authorName = profile?.full_name ?? authorName;
  }

  return (
    <main className="flex flex-1 flex-col items-center p-8">
      <article className="flex w-full max-w-4xl flex-col gap-8 text-right">
        <div className="flex flex-col gap-4 border-b border-foreground/15 pb-6">
          <Link href="/listings" className="text-sm font-semibold text-foreground/70 hover:text-foreground">
            الرجوع إلى الإعلانات
          </Link>
          <div className="space-y-2">
            <p className="font-semibold text-foreground/60">{kindLabels[listing.kind]}</p>
            <h1 className="text-3xl font-bold">
              {listing.kind === "manager_wanted"
                ? pharmacy?.name ?? "صيدلية غير محددة"
                : authorName}
            </h1>
            <p className="text-foreground/70">المحافظة: {governorate?.name_ar ?? "غير محددة"}</p>
          </div>
        </div>

        <section className="space-y-4">
          <h2 className="text-xl font-bold">تفاصيل الإعلان</h2>
          <dl className="grid gap-4 md:grid-cols-2">
            <DetailRow label="معرّف الإعلان" value={listing.id} />
            <DetailRow label="معرّف الناشر" value={listing.author_id} />
            <DetailRow label="معرّف الصيدلية" value={listing.pharmacy_id ?? "غير محدد"} />
            <DetailRow label="نوع الإعلان" value={kindLabels[listing.kind]} />
            <DetailRow label="المدة" value={durationText(listing)} />
            <DetailRow
              label="عدد الشهور"
              value={
                listing.duration_months === null
                  ? "غير محدد"
                  : listing.duration_months.toLocaleString("ar-EG")
              }
            />
            <DetailRow label="الحضور" value={optionText(listing.attendance, attendanceLabels)} />
            <DetailRow label="جدول الشفتات" value={optionText(listing.schedule, scheduleLabels)} />
            <DetailRow
              label="الأدوية المستوردة"
              value={optionText(listing.imported, importedLabels)}
            />
            <DetailRow label="المحافظة" value={governorate?.name_ar ?? "غير محددة"} />
            <DetailRow
              label="معرّف المحافظة"
              value={
                listing.governorate_id === null
                  ? "غير محدد"
                  : listing.governorate_id.toLocaleString("ar-EG")
              }
            />
            <DetailRow
              label="معرّف المركز أو الحي"
              value={listing.district_id === null ? "غير محدد" : listing.district_id.toLocaleString("ar-EG")}
            />
            <DetailRow label="الراتب" value={formatMoney(listing.salary_amount)} />
            <DetailRow label="حالة الإعلان" value={listing.status === "active" ? "نشط" : listing.status} />
            <DetailRow label="تاريخ النشر" value={formatDate(listing.created_at)} />
            <DetailRow label="تاريخ الانتهاء" value={formatDate(listing.expires_at)} />
          </dl>
        </section>

        {listing.kind === "manager_wanted" ? (
          <section className="space-y-4">
            <h2 className="text-xl font-bold">بيانات الصيدلية</h2>
            <dl className="grid gap-4 md:grid-cols-2">
              <DetailRow label="اسم الصيدلية" value={pharmacy?.name ?? "غير محدد"} />
              <DetailRow
                label="يوجد جدول شفتات"
                value={booleanText(pharmacy?.has_schedule)}
              />
              <DetailRow
                label="تتعامل مع أدوية مستوردة"
                value={booleanText(pharmacy?.sells_imported)}
              />
            </dl>
          </section>
        ) : (
          <section className="space-y-4">
            <h2 className="text-xl font-bold">ناشر الإعلان</h2>
            <dl className="grid gap-4 md:grid-cols-2">
              <DetailRow label="الاسم" value={authorName} />
            </dl>
          </section>
        )}

        <section className="space-y-3">
          <h2 className="text-xl font-bold">ملاحظات</h2>
          <p className="rounded-md border border-foreground/15 px-4 py-4 text-foreground/75">
            {listing.notes || "لا توجد ملاحظات إضافية."}
          </p>
        </section>

        {user?.id !== listing.author_id ? (
          <form action={startConversation.bind(null, listing.id)}>
            <button
              type="submit"
              className="w-full rounded-md bg-foreground px-5 py-3 font-semibold text-background transition hover:opacity-90"
            >
              بدء المحادثة
            </button>
          </form>
        ) : null}
      </article>
    </main>
  );
}
