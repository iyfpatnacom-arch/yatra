import { HandHeart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DONATE_LINK } from "@/components/site/site-links";
import { cn } from "@/lib/utils";

/**
 * Sends a visitor to the IYF Patna donation page.
 *
 * It sits beside the language switcher on every user-facing header and borrows
 * that button's texture so the pair reads as one control group — gold rather
 * than saffron, which keeps it distinct from the Register call to action
 * without competing with it.
 *
 * The label is hidden on a phone, where the header has no room for it; the
 * icon carries the meaning and `aria-label` carries the name. Every place this
 * is used also lists Donate as plain text somewhere in its footer or menu.
 */
export function DonateButton({ label, className = "" }) {
  return (
    <Button
      render={
        <a href={DONATE_LINK.href} target="_blank" rel="noopener noreferrer" />
      }
      variant="outline"
      size="sm"
      aria-label={label}
      className={cn(
        "gap-1.5 rounded-md border-gold/50 bg-background/70 text-saffron-deep backdrop-blur-sm hover:border-gold hover:bg-gold/10 dark:text-gold",
        className
      )}
    >
      <HandHeart className="size-3.5 text-gold" aria-hidden="true" />
      <span className="hidden font-medium sm:inline">{label}</span>
    </Button>
  );
}
