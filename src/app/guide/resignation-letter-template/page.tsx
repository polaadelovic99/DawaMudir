import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "صيغة جواب الترك | DawaMudir",
  description: "نموذج استرشادي لصيغة جواب ترك مدير الصيدلية.",
};

export default function ResignationLetterTemplatePage() {
  return (
    <main className="flex flex-1 flex-col items-center p-8">
      <article className="flex w-full max-w-3xl flex-col gap-6 text-right leading-8">
        <Link href="/guide" className="text-sm font-semibold text-foreground/70 hover:text-foreground">
          الرجوع إلى دليل الإجراءات
        </Link>
        <h1 className="text-3xl font-bold">صيغة جواب الترك</h1>

        <p>ده نموذج استرشادي بس — عدّل فيه حسب حالتك واستشر جهة مختصة لو محتاج صيغة رسمية معتمدة:</p>

        <pre className="overflow-x-auto rounded-md border border-foreground/15 bg-foreground/[0.03] p-4 text-right text-sm leading-8">
          <code>{`السيد/ة: [اسم صاحب الصيدلية]
صيدلية: [اسم الصيدلية] — [العنوان]

أفيدكم بأنني، الصيدلي/ة [الاسم بالكامل]، الحاصل على مزاولة المهنة رقم [الرقم]، أتقدم بطلب ترك
العمل كمدير مسؤول عن الصيدلية المذكورة أعلاه، اعتبارًا من تاريخ [التاريخ].

وذلك وفقًا للاتفاق المبرم بيننا بتاريخ [تاريخ الاتفاق].

برجاء اتخاذ الإجراءات اللازمة لتحديث بيانات الصيدلية لدى الجهات المختصة.

التوقيع: __________
التاريخ: __________`}</code>
        </pre>

        <p>احتفظ بنسخة موقّعة ومؤرخة لنفسك، واطلب من صاحب الصيدلية توقيع الاستلام عليها.</p>
      </article>
    </main>
  );
}
