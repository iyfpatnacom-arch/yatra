import { Mukta, Tiro_Devanagari_Hindi, Yatra_One } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { getDictionary, locales, normalizeLocale } from "@/lib/i18n";
import "../globals.css";

/* Mukta and Tiro cover both Devanagari and Latin, so Hindi and English render
   in the same typographic voice instead of falling back mid-sentence. */
const bodyFont = Mukta({
  variable: "--font-sans",
  subsets: ["devanagari", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const headingFont = Tiro_Devanagari_Hindi({
  variable: "--font-heading-family",
  subsets: ["devanagari", "latin"],
  weight: ["400"],
  display: "swap",
});

const displayFont = Yatra_One({
  variable: "--font-display-family",
  subsets: ["devanagari", "latin"],
  weight: ["400"],
  display: "swap",
});

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const dict = getDictionary(lang);
  return {
    title: dict.meta.title,
    description: dict.meta.description,
    openGraph: {
      title: dict.meta.title,
      description: dict.meta.description,
      type: "website",
    },
  };
}

export const viewport = {
  themeColor: "#E07A2F",
  width: "device-width",
  initialScale: 1,
};

export default async function LangLayout({ children, params }) {
  const { lang } = await params;
  const locale = normalizeLocale(lang);

  return (
    <html
      lang={locale}
      className={`${bodyFont.variable} ${headingFont.variable} ${displayFont.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        {/* The posters are fetched from ImageKit's edge rather than through
            our own optimiser (see lib/image-loader.js), so the connection to
            it is opened while the HTML is still being parsed instead of after
            the first <img> is discovered. React hoists these into <head>.
            dns-prefetch is the fallback for browsers that ignore preconnect. */}
        <link rel="preconnect" href="https://ik.imagekit.io" />
        <link rel="dns-prefetch" href="https://ik.imagekit.io" />
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
