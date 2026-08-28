import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminLoginForm } from "@/components/admin/login-form";
import { LanguageSwitcher } from "@/components/site/language-switcher";
import { MandalaMark } from "@/components/site/ornaments";
import { getDictionary, normalizeLocale } from "@/lib/i18n";
import { isAdmin } from "@/lib/require-admin";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({ params }) {
  const { lang: rawLang } = await params;
  const lang = normalizeLocale(rawLang);
  const dict = getDictionary(lang);

  if (await isAdmin()) redirect(`/${lang}/admin`);

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-16">
      <MandalaMark className="pointer-events-none absolute -top-24 -right-24 w-[28rem] text-saffron/12" />
      <MandalaMark className="pointer-events-none absolute -bottom-32 -left-24 w-[28rem] text-indigo-krishna/10" />

      <div className="relative w-full max-w-sm">
        <div className="mb-4 flex items-center justify-between">
          <Link
            href={`/${lang}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-saffron-deep"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            {dict.status.backHome}
          </Link>
          <LanguageSwitcher lang={lang} label={dict.nav.switchTo} />
        </div>

        <div className="rounded-3xl bg-card/90 p-6 shadow-xl shadow-saffron/8 ring-1 ring-saffron/20 backdrop-blur-sm sm:p-8">
          <AdminLoginForm lang={lang} dict={dict} />
        </div>
      </div>
    </main>
  );
}
