import Link from "next/link";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-bold">DawaMudir</h1>
      <p className="max-w-md text-foreground/70">
        منصة توصيل الصيادلة الموثّقين بأصحاب الصيدليات المحتاجين مدير مسجَّل — من غير مكاتب ومن
        غير عمولة.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/listings"
          className="rounded-md bg-foreground px-5 py-3 font-semibold text-background transition hover:opacity-90"
        >
          تصفح الإعلانات
        </Link>
        <Link
          href="/listings/new"
          className="rounded-md border border-foreground/20 px-5 py-3 font-semibold transition hover:border-foreground/60"
        >
          إنشاء إعلان
        </Link>
      </div>
    </main>
  );
}
