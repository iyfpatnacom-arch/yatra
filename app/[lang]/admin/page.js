import { redirect } from "next/navigation";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { LanguageSwitcher } from "@/components/site/language-switcher";
import { LotusMark } from "@/components/site/ornaments";
import { getDictionary, normalizeLocale } from "@/lib/i18n";
import { isAdmin } from "@/lib/require-admin";

export const dynamic = "force-dynamic";

export default async function AdminPage({ params }) {
  const { lang: rawLang } = await params;
  const lang = normalizeLocale(rawLang);
  const dict = getDictionary(lang);

  // proxy.js already redirects, but a route must never depend on that alone.
  if (!(await isAdmin())) redirect(`/${lang}/admin/login`);

  return (
    <main className="flex-1">
      <div className="border-b border-saffron/15 bg-card/60 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
          <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-saffron to-saffron-deep text-primary-foreground">
            <LotusMark className="w-5" />
          </span>
          <span className="font-heading text-sm font-semibold text-indigo-deep sm:text-base dark:text-foreground">
            {dict.nav.brand} · {dict.nav.admin}
          </span>
          <div className="ml-auto">
            <LanguageSwitcher lang={lang} label={dict.nav.switchTo} />
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        <AdminDashboard lang={lang} dict={dict} />
      </div>
    </main>
  );
}
