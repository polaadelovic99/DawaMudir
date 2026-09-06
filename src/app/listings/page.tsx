import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  attendanceLabels,
  durationLabels,
  importedLabels,
  isDurationType,
  isListingKind,
  isWithWithout,
  kindLabels,
  scheduleLabels,
  type DurationType,
  type ListingKind,
  type WithWithout,
} from "./constants";

type SearchParams = {
  kind?: string | string[];
  governorate?: string | string[];
  duration_type?: string | string[];
  attendance?: string | string[];
  schedule?: string | string[];
  imported?: string | string[];
};

type Governorate = {
  id: number;
  name_ar: string;
};

type MaybeRelation<T> = T | T[] | null;

type ListingCard = {
  id: string;
  kind: ListingKind;
  author_id: string;
  duration_type: DurationType | null;
  duration_months: number | null;
  attendance: WithWithout | null;
  schedule: WithWithout | null;
  imported: WithWithout | null;
  salary_amount: number | null;
  notes: string | null;
  created_at: string;
  governorates: MaybeRelation<{ name_ar: string }>;
  pharmacies: MaybeRelation<{ name: string }>;
};

type PublicProfile = {
  id: string;
  full_name: string;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function relationOne<T>(value: MaybeRelation<T>) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function parseGovernorate(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function buildKindHref(kind: ListingKind, filters: Record<string, string | undefined>) {
  const params = new URLSearchParams({ kind });

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  return `/listings?${params.toString()}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(new Date(value));
}

function formatMoney(value: number | null) {
  return value === null ? "غير محدد" : `${value.toLocaleString("ar-EG")} جنيه`;
}

function durationText(listing: ListingCard) {
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

export default async function ListingsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const selectedKindParam = firstValue(params.kind);
  const selectedKind: ListingKind =
    selectedKindParam && isListingKind(selectedKindParam) ? selectedKindParam : "manager_wanted";
  const selectedGovernorate = parseGovernorate(firstValue(params.governorate));
  const selectedDuration = firstValue(params.duration_type);
  const selectedAttendance = firstValue(params.attendance);
  const selectedSchedule = firstValue(params.schedule);
  const selectedImported = firstValue(params.imported);
  const filters = {
    governorate: selectedGovernorate ? String(selectedGovernorate) : undefined,
    duration_type: selectedDuration && isDurationType(selectedDuration) ? selectedDuration : undefined,
    attendance: selectedAttendance && isWithWithout(selectedAttendance) ? selectedAttendance : undefined,
    schedule: selectedSchedule && isWithWithout(selectedSchedule) ? selectedSchedule : undefined,
    imported: selectedImported && isWithWithout(selectedImported) ? selectedImported : undefined,
  };

  const supabase = await createClient();
  const governoratesQuery = supabase
    .from("governorates")
    .select("id, name_ar")
    .order("name_ar", { ascending: true });

  let listingsQuery = supabase
    .from("listings")
    .select(
      "id, kind, author_id, duration_type, duration_months, attendance, schedule, imported, salary_amount, notes, created_at, governorates(name_ar), pharmacies(name)",
    )
    .eq("kind", selectedKind)
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (selectedGovernorate) {
    listingsQuery = listingsQuery.eq("governorate_id", selectedGovernorate);
  }

  if (filters.duration_type) {
    listingsQuery = listingsQuery.eq("duration_type", filters.duration_type);
  }

  if (filters.attendance) {
    listingsQuery = listingsQuery.eq("attendance", filters.attendance);
  }

  if (filters.schedule) {
    listingsQuery = listingsQuery.eq("schedule", filters.schedule);
  }

  if (filters.imported) {
    listingsQuery = listingsQuery.eq("imported", filters.imported);
  }

  const [governoratesResult, listingsResult] = await Promise.all([governoratesQuery, listingsQuery]);

  if (governoratesResult.error) {
    throw new Error(governoratesResult.error.message);
  }

  if (listingsResult.error) {
    throw new Error(listingsResult.error.message);
  }

  const listings = (listingsResult.data ?? []) as ListingCard[];
  const authorNames = new Map<string, string>();

  if (selectedKind === "manager_available" && listings.length > 0) {
    const authorIds = [...new Set(listings.map((listing) => listing.author_id))];
    const { data: profiles, error: profilesError } = await supabase
      .from("public_profiles")
      .select("id, full_name")
      .in("id", authorIds);

    if (profilesError) {
      throw new Error(profilesError.message);
    }

    ((profiles ?? []) as PublicProfile[]).forEach((profile) => {
      authorNames.set(profile.id, profile.full_name);
    });
  }

  return (
    <main className="flex flex-1 flex-col items-center p-8">
      <div className="flex w-full max-w-5xl flex-col gap-8">
        <div className="flex flex-col gap-4 text-center">
          <h1 className="text-3xl font-bold">الإعلانات</h1>
          <p className="text-foreground/70">ابحث عن مدير صيدلية أو اعرض تفرغك للعمل.</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              href={buildKindHref("manager_wanted", filters)}
              className={`rounded-md border px-5 py-3 font-semibold transition ${
                selectedKind === "manager_wanted"
                  ? "border-foreground bg-foreground text-background"
                  : "border-foreground/20 hover:border-foreground/60"
              }`}
            >
              {kindLabels.manager_wanted}
            </Link>
            <Link
              href={buildKindHref("manager_available", filters)}
              className={`rounded-md border px-5 py-3 font-semibold transition ${
                selectedKind === "manager_available"
                  ? "border-foreground bg-foreground text-background"
                  : "border-foreground/20 hover:border-foreground/60"
              }`}
            >
              {kindLabels.manager_available}
            </Link>
          </div>
        </div>

        <form
          action="/listings"
          className="grid gap-4 rounded-md border border-foreground/15 p-4 text-right md:grid-cols-3"
        >
          <input type="hidden" name="kind" value={selectedKind} />
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">المحافظة</span>
            <select
              name="governorate"
              defaultValue={filters.governorate ?? ""}
              className="rounded-md border border-foreground/20 bg-background px-4 py-3 text-right outline-none transition focus:border-foreground/60"
            >
              <option value="">كل المحافظات</option>
              {((governoratesResult.data ?? []) as Governorate[]).map((governorate) => (
                <option key={governorate.id} value={governorate.id}>
                  {governorate.name_ar}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">المدة</span>
            <select
              name="duration_type"
              defaultValue={filters.duration_type ?? ""}
              className="rounded-md border border-foreground/20 bg-background px-4 py-3 text-right outline-none transition focus:border-foreground/60"
            >
              <option value="">أي مدة</option>
              <option value="permanent">{durationLabels.permanent}</option>
              <option value="temporary">{durationLabels.temporary}</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">الحضور</span>
            <select
              name="attendance"
              defaultValue={filters.attendance ?? ""}
              className="rounded-md border border-foreground/20 bg-background px-4 py-3 text-right outline-none transition focus:border-foreground/60"
            >
              <option value="">أي حضور</option>
              <option value="with">{attendanceLabels.with}</option>
              <option value="without">{attendanceLabels.without}</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">الجدول</span>
            <select
              name="schedule"
              defaultValue={filters.schedule ?? ""}
              className="rounded-md border border-foreground/20 bg-background px-4 py-3 text-right outline-none transition focus:border-foreground/60"
            >
              <option value="">أي جدول</option>
              <option value="with">{scheduleLabels.with}</option>
              <option value="without">{scheduleLabels.without}</option>
            </select>
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium">المستورد</span>
            <select
              name="imported"
              defaultValue={filters.imported ?? ""}
              className="rounded-md border border-foreground/20 bg-background px-4 py-3 text-right outline-none transition focus:border-foreground/60"
            >
              <option value="">أي حالة</option>
              <option value="with">{importedLabels.with}</option>
              <option value="without">{importedLabels.without}</option>
            </select>
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full rounded-md bg-foreground px-5 py-3 font-semibold text-background transition hover:opacity-90"
            >
              تطبيق الفلاتر
            </button>
          </div>
        </form>

        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-foreground/60">
            {listings.length.toLocaleString("ar-EG")} إعلان مطابق
          </p>
          <Link
            href="/listings/new"
            className="rounded-md border border-foreground/20 px-4 py-2 font-semibold transition hover:border-foreground/60"
          >
            إعلان جديد
          </Link>
        </div>

        {listings.length === 0 ? (
          <div className="rounded-md border border-foreground/15 px-6 py-12 text-center text-foreground/70">
            لا توجد إعلانات مطابقة للفلاتر الحالية.
          </div>
        ) : (
          <div className="grid gap-4">
            {listings.map((listing) => (
              <Link
                key={listing.id}
                href={`/listings/${listing.id}`}
                className="rounded-md border border-foreground/15 p-5 text-right transition hover:border-foreground/50"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <h2 className="text-xl font-bold">{kindLabels[listing.kind]}</h2>
                    <p className="text-foreground/70">
                      {selectedKind === "manager_wanted"
                        ? relationOne(listing.pharmacies)?.name ?? "صيدلية غير محددة"
                        : authorNames.get(listing.author_id) ?? "ناشر غير محدد"}
                    </p>
                    {listing.notes ? <p className="max-w-3xl text-sm">{listing.notes}</p> : null}
                  </div>
                  <div className="text-sm text-foreground/60">{formatDate(listing.created_at)}</div>
                </div>

                <div className="mt-4 grid gap-3 text-sm text-foreground/75 md:grid-cols-3">
                  <span>
                    المحافظة: {relationOne(listing.governorates)?.name_ar ?? "غير محددة"}
                  </span>
                  <span>المدة: {durationText(listing)}</span>
                  <span>الراتب: {formatMoney(listing.salary_amount)}</span>
                  <span>الحضور: {optionText(listing.attendance, attendanceLabels)}</span>
                  <span>الجدول: {optionText(listing.schedule, scheduleLabels)}</span>
                  <span>المستورد: {optionText(listing.imported, importedLabels)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
