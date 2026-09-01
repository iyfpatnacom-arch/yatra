"use client";

import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { locales, otherLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Swaps the locale segment of the current URL. The choice is also stored in a
 * cookie so a later visit to "/" lands on the language the visitor picked
 * rather than being re-detected from Accept-Language.
 */
export function LanguageSwitcher({ lang, label, className = "" }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const target = otherLocale(lang);

  function switchLanguage() {
    const segments = pathname.split("/");
    if (locales.includes(segments[1])) {
      segments[1] = target;
    } else {
      segments.splice(1, 0, target);
    }

    document.cookie = `yatra_lang=${target}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => {
      router.push(segments.join("/") || `/${target}`);
      router.refresh();
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={switchLanguage}
      disabled={isPending}
      aria-label={`Switch language to ${target === "hi" ? "Hindi" : "English"}`}
      className={cn(
        "gap-1.5 rounded-md border-saffron/40 bg-background/70 backdrop-blur-sm hover:border-saffron",
        className
      )}
    >
      <Languages className="size-3.5 text-saffron" aria-hidden="true" />
      <span className="font-medium">{label}</span>
    </Button>
  );
}
