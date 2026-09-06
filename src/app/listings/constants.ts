export const LISTING_KINDS = ["manager_wanted", "manager_available"] as const;
export const DURATION_TYPES = ["permanent", "temporary"] as const;
export const OPTION_VALUES = ["with", "without"] as const;

export type ListingKind = (typeof LISTING_KINDS)[number];
export type DurationType = (typeof DURATION_TYPES)[number];
export type WithWithout = (typeof OPTION_VALUES)[number];

export const kindLabels: Record<ListingKind, string> = {
  manager_wanted: "مطلوب مدير",
  manager_available: "متاح للعمل",
};

export const durationLabels: Record<DurationType, string> = {
  permanent: "دائم",
  temporary: "مؤقت",
};

export const withWithoutLabels: Record<WithWithout, string> = {
  with: "نعم",
  without: "لا",
};

export const attendanceLabels: Record<WithWithout, string> = {
  with: "بحضور",
  without: "بدون حضور",
};

export const scheduleLabels: Record<WithWithout, string> = {
  with: "يوجد جدول",
  without: "بدون جدول",
};

export const importedLabels: Record<WithWithout, string> = {
  with: "يتعامل مع المستورد",
  without: "لا يتعامل مع المستورد",
};

export function isListingKind(value: string): value is ListingKind {
  return (LISTING_KINDS as readonly string[]).includes(value);
}

export function isDurationType(value: string): value is DurationType {
  return (DURATION_TYPES as readonly string[]).includes(value);
}

export function isWithWithout(value: string): value is WithWithout {
  return (OPTION_VALUES as readonly string[]).includes(value);
}
