import { HomePage } from "@/components/site/home-page";
import { normalizeLocale } from "@/lib/i18n";

/**
 * The link to share with youth: /hi/youth (or just /youth, which the
 * proxy prefixes with the visitor's language). It is the landing page with the
 * Youth category already chosen, so the form opens straight on the youth
 * details — on a phone too, where it skips the photographs.
 */
export default async function YouthRegistrationPage({ params }) {
  const { lang } = await params;
  return <HomePage lang={normalizeLocale(lang)} initialType="youth" />;
}
