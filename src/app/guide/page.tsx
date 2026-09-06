import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "دليل الإجراءات | DawaMudir",
  description: "دليل DawaMudir للأوراق المطلوبة، خطوات المنصة، الترك، وصيغة جواب الترك.",
};

const guidePages = [
  { slug: "required-documents", title: "الأوراق المطلوبة للتوثيق" },
  { slug: "platform-steps", title: "خطوات استخدام المنصة" },
  { slug: "how-to-resign", title: "إزاي تعمل ترك (تسجيل خروج) صح" },
  { slug: "resignation-letter-template", title: "صيغة جواب الترك" },
  { slug: "manager-legal-responsibilities", title: "مسؤوليات المدير القانونية" },
];

export default function GuideIndexPage() {
  return (
    <main className="flex flex-1 flex-col items-center p-8">
      <div className="flex w-full max-w-4xl flex-col gap-8 text-right">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold">دليل الإجراءات</h1>
          <p className="text-foreground/70">الأوراق والخطوات الأساسية لاستخدام DawaMudir بثقة.</p>
        </div>

        <div className="grid gap-3">
          {guidePages.map((page) => (
            <Link
              key={page.slug}
              href={`/guide/${page.slug}`}
              className="rounded-md border border-foreground/15 px-5 py-4 font-semibold transition hover:border-foreground/50"
            >
              {page.title}
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
