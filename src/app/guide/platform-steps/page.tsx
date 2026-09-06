import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "خطوات استخدام المنصة | DawaMudir",
  description: "خطوات استخدام DawaMudir من التسجيل وحتى تسجيل الاتفاق والتقييم.",
};

export default function PlatformStepsPage() {
  return (
    <main className="flex flex-1 flex-col items-center p-8">
      <article className="flex w-full max-w-3xl flex-col gap-6 text-right leading-8">
        <Link href="/guide" className="text-sm font-semibold text-foreground/70 hover:text-foreground">
          الرجوع إلى دليل الإجراءات
        </Link>
        <h1 className="text-3xl font-bold">خطوات استخدام المنصة</h1>

        <ol className="list-inside list-decimal space-y-2">
          <li>سجّل رقم موبايلك واتأكد بالـ OTP.</li>
          <li>اختار نوعك: صيدلي بيدوّر على شغل، أو صاحب صيدلية بيدوّر على مدير — أو الاتنين مع بعض.</li>
          <li>أكمل بياناتك (بيانات الصيدلية لو صاحب صيدلية، بياناتك المهنية لو صيدلي).</li>
          <li>ارفع مستنداتك للتوثيق بأوراق (اختياري، بس بيديك أولوية في الظهور وثقة أعلى).</li>
          <li>انشر إعلانك أو تصفح الإعلانات المتاحة وابدأ تتواصل.</li>
          <li>لما توصلوا لاتفاق، سجّلوه جوه المحادثة — ده بيفتح لكم إمكانية تقييم بعض بعد كده.</li>
          <li>قيّموا بعض بعد الاتفاق عشان تبنوا سجل ثقة يفيد باقي المستخدمين.</li>
        </ol>
      </article>
    </main>
  );
}
