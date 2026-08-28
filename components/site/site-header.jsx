import Link from "next/link";
import { LanguageSwitcher } from "@/components/site/language-switcher";
import { LotusMark } from "@/components/site/ornaments";
import { Button } from "@/components/ui/button";

/**
 * Header for the pages that sit outside the landing page — status and admin.
 *
 * The landing page carries its own brand lockup inside the image panel, so it
 * does not use this.
 */
export function SiteHeader({ lang, dict }) {
  return (
    <header className="sticky top-0 z-40 border-b border-saffron/15 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link
          href={`/${lang}`}
          className="group flex min-w-0 items-center gap-2.5"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-saffron to-saffron-deep text-primary-foreground shadow-sm ring-1 ring-gold/40">
            <LotusMark className="w-5" />
          </span>
          <span className="flex min-w-0 flex-col leading-tight">
            <span className="truncate font-heading text-sm font-semibold text-indigo-deep sm:text-base dark:text-foreground">
              {dict.nav.brand}
            </span>
            <span className="truncate text-[11px] text-saffron-deep sm:text-xs dark:text-saffron">
              {dict.nav.brandSub}
            </span>
          </span>
        </Link>

        <nav className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <LanguageSwitcher lang={lang} label={dict.nav.switchTo} />
          <Button
            render={<Link href={`/${lang}`} />}
            size="sm"
            className="rounded-full bg-gradient-to-r from-saffron to-saffron-deep shadow-sm hover:from-saffron-deep hover:to-saffron"
          >
            {dict.nav.register}
          </Button>
        </nav>
      </div>
    </header>
  );
}
