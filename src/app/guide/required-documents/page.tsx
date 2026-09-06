import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "الأوراق المطلوبة للتوثيق | DawaMudir",
  description: "الأوراق المطلوبة للحصول على علامة موثّق أوراق على DawaMudir.",
};

export default function RequiredDocumentsPage() {
  return (
    <main className="flex flex-1 flex-col items-center p-8">
      <article className="flex w-full max-w-3xl flex-col gap-6 text-right leading-8">
        <Link href="/guide" className="text-sm font-semibold text-foreground/70 hover:text-foreground">
          الرجوع إلى دليل الإجراءات
        </Link>
        <h1 className="text-3xl font-bold">الأوراق المطلوبة للتوثيق</h1>

        <p>عشان تتوثّق بعلامة &quot;موثّق أوراق&quot; ✅ على DawaMudir، محتاج ترفع المستندات دي حسب نوع حسابك:</p>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">لو صيدلي:</h2>
          <ul className="list-inside list-disc space-y-2">
            <li>صورة واضحة من مزاولة المهنة سارية.</li>
            <li>
              صورة الرقم القومي (وجه وظهر لو ممكن) — بتستخدم للمراجعة الداخلية بس ومتتعرضش لحد غير فريق
              المراجعة، ومابتتنشرش في أي مكان على المنصة.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">لو صاحب صيدلية:</h2>
          <ul className="list-inside list-disc space-y-2">
            <li>صورة ترخيص الصيدلية ساري.</li>
            <li>صورة الرقم القومي لصاحب الصيدلية أو المفوّض عنها.</li>
          </ul>
        </section>

        <p>
          المراجعة بتاخد من 24 لـ48 ساعة عمل. لحد ما تتراجع، تقدر تستخدم المنصة عادي بعلامة &quot;موثّق أساسي&quot; —
          تنشر إعلان واحد، وتتصفح وتتراسل من غير ما تستنى. لو المستند اتقفل (رفض)، هتشوف السبب وتقدر ترفع
          تاني.
        </p>
      </article>
    </main>
  );
}
