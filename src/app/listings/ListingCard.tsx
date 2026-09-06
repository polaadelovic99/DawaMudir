import Link from "next/link";
import {
  attendanceLabels,
  durationLabels,
  importedLabels,
  kindLabels,
  scheduleLabels,
  type DurationType,
  type ListingKind,
  type WithWithout,
} from "./constants";

export type MaybeRelation<T> = T | T[] | null;

export type ListingCardData = {
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

export function relationOne<T>(value: MaybeRelation<T>) {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(new Date(value));
}

function formatMoney(value: number | null) {
  return value === null ? "غير محدد" : `${value.toLocaleString("ar-EG")} جنيه`;
}

function durationText(listing: ListingCardData) {
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

export default function ListingCard({
  listing,
  authorName,
}: {
  listing: ListingCardData;
  authorName?: string;
}) {
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="rounded-md border border-foreground/15 p-5 text-right transition hover:border-foreground/50"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h2 className="text-xl font-bold">{kindLabels[listing.kind]}</h2>
          <p className="text-foreground/70">
            {listing.kind === "manager_wanted"
              ? relationOne(listing.pharmacies)?.name ?? "صيدلية غير محددة"
              : authorName ?? "ناشر غير محدد"}
          </p>
          {listing.notes ? <p className="max-w-3xl text-sm">{listing.notes}</p> : null}
        </div>
        <div className="text-sm text-foreground/60">{formatDate(listing.created_at)}</div>
      </div>

      <div className="mt-4 grid gap-3 text-sm text-foreground/75 md:grid-cols-3">
        <span>المحافظة: {relationOne(listing.governorates)?.name_ar ?? "غير محددة"}</span>
        <span>المدة: {durationText(listing)}</span>
        <span>الراتب: {formatMoney(listing.salary_amount)}</span>
        <span>الحضور: {optionText(listing.attendance, attendanceLabels)}</span>
        <span>الجدول: {optionText(listing.schedule, scheduleLabels)}</span>
        <span>المستورد: {optionText(listing.imported, importedLabels)}</span>
      </div>
    </Link>
  );
}
