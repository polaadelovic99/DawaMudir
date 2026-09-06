import { createClient } from "@/lib/supabase/server";
import { approveVerificationDocument, rejectVerificationDocument } from "../actions";

type VerificationDocument = {
  id: string;
  profile_id: string | null;
  pharmacy_id: string | null;
  doc_type: "license" | "national_id" | "pharmacy_license";
  storage_path: string;
  created_at: string;
};

type ProfileName = {
  id: string;
  full_name: string;
};

const docTypeLabels: Record<VerificationDocument["doc_type"], string> = {
  license: "مزاولة المهنة",
  national_id: "الرقم القومي",
  pharmacy_license: "ترخيص الصيدلية",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function AdminVerificationPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("verification_documents")
    .select("id, profile_id, pharmacy_id, doc_type, storage_path, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  const documents = (data ?? []) as VerificationDocument[];
  const profileIds = [...new Set(documents.map((document) => document.profile_id).filter(Boolean))] as string[];
  const [profilesResult, signedUrlResults] = await Promise.all([
    profileIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", profileIds)
      : Promise.resolve({ data: [], error: null }),
    Promise.all(
      documents.map((document) =>
        supabase.storage.from("verification-documents").createSignedUrl(document.storage_path, 60),
      ),
    ),
  ]);

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  const profileNames = new Map(
    ((profilesResult.data ?? []) as ProfileName[]).map((profile) => [profile.id, profile.full_name]),
  );
  const signedUrls = new Map<string, string | null>();

  documents.forEach((document, index) => {
    const result = signedUrlResults[index];
    signedUrls.set(document.id, result.error ? null : result.data.signedUrl);
  });

  return (
    <main className="flex flex-1 flex-col items-center p-8">
      <div className="flex w-full max-w-5xl flex-col gap-6 text-right">
        <div className="border-b border-foreground/15 pb-5">
          <h1 className="text-3xl font-bold">مراجعة الأوراق</h1>
          <p className="mt-2 text-foreground/70">المستندات الأقدم تظهر أولًا.</p>
        </div>

        {documents.length === 0 ? (
          <div className="rounded-md border border-foreground/15 px-6 py-10 text-center text-foreground/70">
            لا توجد مستندات في انتظار المراجعة.
          </div>
        ) : (
          <div className="grid gap-4">
            {documents.map((document) => {
              const signedUrl = signedUrls.get(document.id);

              return (
                <section key={document.id} className="rounded-md border border-foreground/15 p-5">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <p className="text-sm text-foreground/60">المستخدم</p>
                      <p className="mt-1 font-semibold">
                        {document.profile_id ? profileNames.get(document.profile_id) ?? "مستخدم غير معروف" : "غير محدد"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-foreground/60">نوع المستند</p>
                      <p className="mt-1 font-semibold">{docTypeLabels[document.doc_type]}</p>
                    </div>
                    <div>
                      <p className="text-sm text-foreground/60">معرّف الصيدلية</p>
                      <p className="mt-1 break-all font-semibold">{document.pharmacy_id ?? "غير مرتبط بصيدلية"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-foreground/60">تاريخ الرفع</p>
                      <p className="mt-1 font-semibold">{formatDate(document.created_at)}</p>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
                    {signedUrl ? (
                      <a
                        href={signedUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md border border-foreground/20 px-4 py-2 text-center font-semibold transition hover:border-foreground/60"
                      >
                        عرض الملف
                      </a>
                    ) : (
                      <span className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-600 dark:text-red-300">
                        تعذّر إنشاء رابط مؤقت للملف
                      </span>
                    )}

                    <form action={approveVerificationDocument.bind(null, document.id)}>
                      <button
                        type="submit"
                        className="w-full rounded-md bg-green-700 px-4 py-2 font-semibold text-white transition hover:opacity-90 sm:w-auto"
                      >
                        قبول
                      </button>
                    </form>

                    <form
                      action={rejectVerificationDocument.bind(null, document.id)}
                      className="flex flex-1 flex-col gap-2 sm:flex-row"
                    >
                      <input
                        name="review_note"
                        required
                        placeholder="سبب الرفض"
                        className="min-w-0 flex-1 rounded-md border border-foreground/20 bg-transparent px-4 py-2 text-right outline-none transition focus:border-foreground/60"
                      />
                      <button
                        type="submit"
                        className="rounded-md bg-red-700 px-4 py-2 font-semibold text-white transition hover:opacity-90"
                      >
                        رفض
                      </button>
                    </form>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
