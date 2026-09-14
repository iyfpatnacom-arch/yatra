import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The ISKCON Patna mark, in its own colours, for the brand lockups in the nav
 * bars.
 *
 * Set on a white tile because those bars sit over a photo on the landing page
 * and on a dark ground in dark mode, where the crimson mark on its own all but
 * disappears.
 *
 * Decorative (empty alt): every lockup names the organisation in text right
 * beside it, and a screen reader should not hear the name twice.
 */
export function IskconLogo({ className = "" }) {
  return (
    <span
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-lg bg-white p-1 shadow-sm ring-1 ring-gold/40",
        className
      )}
    >
      <Image
        src="/iskcon-logo.svg"
        alt=""
        width={516}
        height={480}
        loading="eager"
        className="h-full w-auto"
      />
    </span>
  );
}
