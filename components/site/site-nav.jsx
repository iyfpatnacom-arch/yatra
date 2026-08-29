"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, X } from "lucide-react";
import { MAIN_LINKS, POLICY_LINKS, localised } from "@/components/site/site-links";
import { cn } from "@/lib/utils";

/**
 * Primary navigation for every page that is not the landing page.
 *
 * Desktop shows the main links inline with the policy documents behind a
 * disclosure; a phone collapses the whole thing into one sheet. Both render
 * the same list, so a policy page added to site-links.js appears in both
 * without further edits.
 */
export function SiteNav({ lang, dict, className = "" }) {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState(false);
  const [openPolicies, setOpenPolicies] = useState(false);
  const [openedAt, setOpenedAt] = useState(pathname);
  const policiesRef = useRef(null);

  /* Any navigation closes both panels. Every policy page renders SiteNav at
     the same position in the tree, so React reconciles rather than remounts
     it and an open menu would otherwise hang over the new page. Adjusted
     during render rather than in an effect: this way the new page never
     paints with the old menu open. */
  if (openedAt !== pathname) {
    setOpenedAt(pathname);
    setOpenMenu(false);
    setOpenPolicies(false);
  }

  useEffect(() => {
    if (!openPolicies) return undefined;

    function onPointerDown(event) {
      if (!policiesRef.current?.contains(event.target)) setOpenPolicies(false);
    }
    function onKeyDown(event) {
      if (event.key === "Escape") setOpenPolicies(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openPolicies]);

  const isCurrent = (href) => pathname === localised(lang, href);

  return (
    <div className={cn("flex items-center", className)}>
      {/* ---------- desktop ---------- */}
      <nav
        className="hidden items-center gap-0.5 lg:flex"
        aria-label={dict.nav.menu}
      >
        {MAIN_LINKS.map((link) => (
          <Link
            key={link.key}
            href={localised(lang, link.href)}
            aria-current={isCurrent(link.href) ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              isCurrent(link.href)
                ? "bg-saffron/12 text-saffron-deep dark:text-saffron"
                : "text-foreground/75 hover:bg-saffron/8 hover:text-saffron-deep dark:hover:text-saffron"
            )}
          >
            {dict.nav[link.key]}
          </Link>
        ))}

        <div className="relative" ref={policiesRef}>
          <button
            type="button"
            onClick={() => setOpenPolicies((open) => !open)}
            aria-expanded={openPolicies}
            aria-haspopup="true"
            className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-foreground/75 transition-colors hover:bg-saffron/8 hover:text-saffron-deep dark:hover:text-saffron"
          >
            {dict.nav.policies}
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                openPolicies && "rotate-180"
              )}
              aria-hidden="true"
            />
          </button>

          {openPolicies ? (
            <div className="absolute end-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-xl border border-saffron/20 bg-popover p-1.5 shadow-lg shadow-indigo-deep/10">
              {POLICY_LINKS.map((link) => (
                <Link
                  key={link.key}
                  href={localised(lang, link.href)}
                  aria-current={isCurrent(link.href) ? "page" : undefined}
                  className={cn(
                    "block rounded-lg px-3 py-2 text-sm transition-colors",
                    isCurrent(link.href)
                      ? "bg-saffron/12 text-saffron-deep dark:text-saffron"
                      : "text-popover-foreground hover:bg-saffron/8"
                  )}
                >
                  {dict.nav[link.key]}
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </nav>

      {/* ---------- phone ---------- */}
      <button
        type="button"
        onClick={() => setOpenMenu((open) => !open)}
        aria-expanded={openMenu}
        aria-label={openMenu ? dict.nav.closeMenu : dict.nav.menu}
        className="inline-flex size-9 items-center justify-center rounded-full border border-saffron/25 text-saffron-deep transition-colors hover:bg-saffron/8 lg:hidden dark:text-saffron"
      >
        {openMenu ? (
          <X className="size-4" aria-hidden="true" />
        ) : (
          <Menu className="size-4" aria-hidden="true" />
        )}
      </button>

      {openMenu ? (
        <nav
          aria-label={dict.nav.menu}
          className="absolute inset-x-0 top-full z-50 border-b border-saffron/15 bg-background/98 px-4 pt-2 pb-4 shadow-lg backdrop-blur-md lg:hidden"
        >
          <ul className="mx-auto grid w-full max-w-6xl gap-0.5">
            {MAIN_LINKS.map((link) => (
              <li key={link.key}>
                <Link
                  href={localised(lang, link.href)}
                  aria-current={isCurrent(link.href) ? "page" : undefined}
                  className={cn(
                    "block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isCurrent(link.href)
                      ? "bg-saffron/12 text-saffron-deep dark:text-saffron"
                      : "text-foreground/80 hover:bg-saffron/8"
                  )}
                >
                  {dict.nav[link.key]}
                </Link>
              </li>
            ))}

            <li className="mt-2 px-3 pt-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              {dict.nav.policies}
            </li>
            {POLICY_LINKS.map((link) => (
              <li key={link.key}>
                <Link
                  href={localised(lang, link.href)}
                  aria-current={isCurrent(link.href) ? "page" : undefined}
                  className={cn(
                    "block rounded-lg px-3 py-2.5 text-sm transition-colors",
                    isCurrent(link.href)
                      ? "bg-saffron/12 text-saffron-deep dark:text-saffron"
                      : "text-foreground/70 hover:bg-saffron/8"
                  )}
                >
                  {dict.nav[link.key]}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </div>
  );
}
