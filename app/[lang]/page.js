import { HomePage } from "@/components/site/home-page";
import { normalizeLocale } from "@/lib/i18n";

export default async function LandingPage({ params }) {
  const { lang } = await params;
  return <HomePage lang={normalizeLocale(lang)} />;
}
