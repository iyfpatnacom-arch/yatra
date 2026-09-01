import Link from "next/link";
import { LotusMark } from "@/components/site/ornaments";
import { Button } from "@/components/ui/button";

/**
 * Rendered outside the [lang] params context (Next does not pass params to
 * not-found), so this page is intentionally bilingual rather than localised.
 */
export default function NotFound() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-24 text-center">
      <div>
        <LotusMark className="mx-auto w-14 text-saffron/60" />
        <h1 className="mt-6 font-heading text-3xl font-bold text-indigo-deep dark:text-foreground">
          पृष्ठ नहीं मिला
        </h1>
        <p className="mt-1 text-lg text-muted-foreground">Page not found</p>
        <Button
          render={<Link href="/hi" />}
          className="mt-6 h-11 rounded-md bg-gradient-to-r from-saffron to-saffron-deep px-6"
        >
          मुख्य पृष्ठ / Home
        </Button>
      </div>
    </main>
  );
}
