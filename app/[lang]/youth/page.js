import { redirect } from "next/navigation";
import { normalizeLocale } from "@/lib/i18n";

/**
 * Registration now lives on the landing page, where the category is the first
 * step of the form. This route stays only so links already shared as
 * /hi/youth land somewhere sensible.
 */
export default async function YouthRegistrationPage({ params }) {
  const { lang } = await params;
  redirect(`/${normalizeLocale(lang)}`);
}
