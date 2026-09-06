import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "مسؤوليات المدير القانونية | DawaMudir",
  description: "نقاط عامة عن المسؤولية القانونية لمدير الصيدلية المسجل.",
};

export default function ManagerLegalResponsibilitiesPage() {
  return (
    <main className="flex flex-1 flex-col items-center p-8">
      <article className="flex w-full max-w-3xl flex-col gap-6 text-right leading-8">
        <Link href="/guide" className="text-sm font-semibold text-foreground/70 hover:text-foreground">
          الرجوع إلى دليل الإجراءات
        </Link>
        <h1 className="text-3xl font-bold">مسؤوليات المدير القانونية</h1>

        <p>
          لما تسجّل كمدير مسؤول عن صيدلية، بتاخد مسؤولية قانونية فعلية — مش مجرد وظيفة. من أهم النقاط اللي
          لازم تكون واعي بيها (بشكل عام — استشر نقابة الصيادلة للتفاصيل الدقيقة حسب حالتك):
        </p>

        <ul className="list-inside list-disc space-y-2">
          <li>
            اسمك بيبقى مرتبط رسميًا بكل ما يحصل في الصيدلية أمام الجهات الرقابية، حتى لو مكنتش موجود وقت
            المخالفة.
          </li>
          <li>
            المخالفات (زي بيع أدوية بدون روشتة لما مطلوبة، أو مخالفات التخزين) بتقع مسؤوليتها عليك كمدير
            مسجّل، مش بس على صاحب الصيدلية.
          </li>
          <li>
            قبل ما توافق على &quot;بدون حضور&quot;، افهم كويس إيه المخاطر القانونية المترتبة على وجود اسمك كمدير من
            غير إشراف فعلي.
          </li>
          <li>
            وثّق كل اتفاق (الراتب، ساعات الحضور، مدة العمل) كتابة، وسجّله على المنصة كمان — ده بيديك أثر
            موثّق لو حصل خلاف.
          </li>
          <li>
            لما تقرر الترك، اتبع الإجراءات الرسمية كاملة (شوف صفحة &quot;إزاي تعمل ترك&quot;) — الاسم بيفضل مربوط بيك
            قانونيًا لحد ما التحديث الرسمي يتم فعليًا.
          </li>
        </ul>

        <p>DawaMudir منصة تعارف بين الطرفين فقط، ومش بديل عن استشارة قانونية أو نقابية.</p>
      </article>
    </main>
  );
}
