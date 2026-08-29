import { PolicyPage } from "@/components/site/policy-page";
import { getDictionary, normalizeLocale } from "@/lib/i18n";
import { ORG } from "@/lib/config";

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = getDictionary(lang);
  const doc = dict.legal.refund;
  return {
    title: `${doc.title} — ${ORG.legalName}`,
    description: doc.summary.replaceAll("{org}", ORG.legalName),
    alternates: {
      canonical: `${ORG.siteUrl}/${normalizeLocale(lang)}/refund`,
    },
  };
}

export default async function RefundPolicyPage({ params }) {
  const { lang: rawLang } = await params;
  const lang = normalizeLocale(rawLang);

  return <PolicyPage lang={lang} dict={getDictionary(lang)} docKey="refund" />;
}
