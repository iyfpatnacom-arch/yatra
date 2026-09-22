import { HomePage } from "@/components/site/home-page";
import { normalizeLocale } from "@/lib/i18n";

/**
 * The link to share with families: /hi/family (or just /family, which the
 * proxy prefixes with the visitor's language). It is the landing page with the
 * Family category already chosen, so the form opens straight on the family
 * details — on a phone too, where it skips the photographs.
 */
export default async function FamilyRegistrationPage({ params }) {
  const { lang } = await params;
  return <HomePage lang={normalizeLocale(lang)} initialType="family" />;
}
