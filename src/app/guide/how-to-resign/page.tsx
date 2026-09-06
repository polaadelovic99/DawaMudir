import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "إزاي تعمل ترك (تسجيل خروج) صح | DawaMudir",
  description: "خطوات عامة لتسجيل ترك مدير الصيدلية مع تنبيه أنها ليست استشارة قانونية.",
};

export default function HowToResignPage() {
  return (
    <main className="flex flex-1 flex-col items-center p-8">
      <article className="flex w-full max-w-3xl flex-col gap-6 text-right leading-8">
        <Link href="/guide" className="text-sm font-semibold text-foreground/70 hover:text-foreground">
          الرجوع إلى دليل الإجراءات
        </Link>
        <h1 className="text-3xl font-bold">إزاي تعمل ترك (تسجيل خروج) صح</h1>

        <p>
          &quot;الترك&quot; هو الإجراء الرسمي اللي بيخلّي اسمك يتشال كمدير مسؤول عن الصيدلية أمام الجهات الرسمية.
          الخطوات العامة (اتأكد من التفاصيل مع نقابة الصيادلة أو الجهة المختصة، لأنها ممكن تختلف حسب حالتك):
        </p>

        <ol className="list-inside list-decimal space-y-2">
          <li>اتفق مع صاحب الصيدلية على تاريخ ترك محدد بالكتابة (رسالة أو مستند)، مش اتفاق شفهي بس.</li>
          <li>جهّز خطاب ترك رسمي بالصيغة المتعارف عليها (شوف صفحة &quot;صيغة جواب الترك&quot;).</li>
          <li>سلّم الخطاب لصاحب الصيدلية واستلم توقيع أو إيصال استلام يثبت التاريخ.</li>
          <li>تابع مع الجهة الرسمية المختصة إن التسجيل اتحدّث فعليًا وماعادش اسمك مربوط بالصيدلية دي.</li>
          <li>
            احتفظ بنسخة من كل المستندات (الاتفاق، الخطاب، إيصال الاستلام) عندك لحد ما تتأكد إن التحديث تم.
          </li>
        </ol>

        <p>
          <strong>ده مش استشارة قانونية.</strong> DawaMudir منصة تعارف بس، ومش طرف في أي اتفاق بينك وبين الطرف
          التاني — استشر محامي أو نقابة الصيادلة في أي حالة فيها تعقيد.
        </p>
      </article>
    </main>
  );
}
