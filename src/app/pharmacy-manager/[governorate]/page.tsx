import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ListingCard, { type ListingCardData } from "@/app/listings/ListingCard";

type Governorate = {
  id: number;
  name_ar: string;
};

const indexableGovernorates = new Set([
  "القاهرة",
  "الجيزة",
  "الإسكندرية",
  "الدقهلية",
  "الغربية",
  "الشرقية",
]);

function decodeGovernorateParam(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ governorate: string }>;
}): Promise<Metadata> {
  const { governorate } = await params;
  const name = decodeGovernorateParam(governorate);
  const isIndexable = indexableGovernorates.has(name);

  return {
    title: `مدير صيدلية في ${name} | DawaMudir`,
    description: `اعثر على إعلانات مطلوب مدير صيدلية في ${name} عبر DawaMudir.`,
    robots: isIndexable ? { index: true, follow: true } : { index: false, follow: true },
  };
}

export default async function GovernorateListingsPage({
  params,
}: {
  params: Promise<{ governorate: string }>;
}) {
  const { governorate } = await params;
  const name = decodeGovernorateParam(governorate);
  const supabase = await createClient();

  const { data: governorateRow, error: governorateError } = await supabase
    .from("governorates")
    .select("id, name_ar")
    .eq("name_ar", name)
    .maybeSingle<Governorate>();

  if (governorateError || !governorateRow) {
    notFound();
  }

  const { data: listingsData, error: listingsError } = await supabase
    .from("listings")
    .select(
      "id, kind, author_id, duration_type, duration_months, attendance, schedule, imported, salary_amount, notes, created_at, governorates(name_ar), pharmacies(name)",
    )
    .eq("kind", "manager_wanted")
    .eq("status", "active")
    .eq("governorate_id", governorateRow.id)
    .order("created_at", { ascending: false });

  if (listingsError) {
    throw new Error(listingsError.message);
  }

  const listings = (listingsData ?? []) as ListingCardData[];
  const listingHref = `/listings?kind=manager_wanted&governorate=${governorateRow.id}`;

  return (
    <main className="flex flex-1 flex-col items-center p-8">
      <div className="flex w-full max-w-5xl flex-col gap-8">
        <div className="flex flex-col gap-4 text-center">
          <h1 className="text-3xl font-bold">مدير صيدلية في {governorateRow.name_ar}</h1>
          <p className="text-foreground/70">
            إعلانات أصحاب الصيدليات الباحثين عن مدير صيدلية في {governorateRow.name_ar}.
          </p>
          <div>
            <Link
              href={listingHref}
              className="inline-flex rounded-md border border-foreground/20 px-5 py-3 font-semibold transition hover:border-foreground/60"
            >
              تصفح كل إعلانات {governorateRow.name_ar}
            </Link>
          </div>
        </div>

        {listings.length === 0 ? (
          <div className="rounded-md border border-foreground/15 px-6 py-12 text-center text-foreground/70">
            لا توجد إعلانات نشطة في {governorateRow.name_ar} حاليًا.
          </div>
        ) : (
          <div className="grid gap-4">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
