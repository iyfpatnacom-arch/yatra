"use client";

import { useEffect, useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";

/** Long enough for the automatic receipt download (700 ms) to start first. */
const AUTO_OPEN_DELAY_MS = 3000;

/**
 * Phones and tablets, where the invite link hands over to the WhatsApp app.
 * iPadOS reports itself as a Mac, so a touch-capable "Mac" counts as well.
 */
function isHandheld() {
  const ua = navigator.userAgent || "";
  return (
    /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ||
    (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)
  );
}

/**
 * The WhatsApp group invite, offered as a button and followed automatically
 * once.
 *
 * Automatic only on a phone: there the invite link opens the WhatsApp app
 * (or WhatsApp's own "Join chat" page, one tap from it, where the browser
 * will not hand an app a navigation nobody tapped for). On a computer the
 * same move would only take the visitor off their status page, so there the
 * pulsing button is enough.
 *
 * It navigates the page rather than opening a tab — a tab opened without a
 * tap is exactly what popup blockers exist to stop. "Once" is once per browser
 * session, so coming back from WhatsApp with the back button lands on the
 * status page instead of bouncing straight back out again.
 */
export function JoinGroupButton({ url, orderId, label, note, openingLabel }) {
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!isHandheld()) return;

    /* Recorded when the page actually leaves, not when the timer is set, so a
       mount that is torn down before then (React strict mode does exactly
       that in development) does not use up the one automatic open. */
    const key = `yatra:group:${orderId}`;
    try {
      if (sessionStorage.getItem(key)) return;
    } catch {
      /* Private browsing denies sessionStorage. Opening the group again on a
         revisit is a smaller harm than never opening it. */
    }

    function open() {
      try {
        sessionStorage.setItem(key, "1");
      } catch {
        // As above.
      }
      window.location.assign(url);
    }

    const timers = [
      setTimeout(() => setOpening(true), 0),
      setTimeout(open, AUTO_OPEN_DELAY_MS),
      /* Nothing more happens on this page once the app takes over; a visitor
         who stays sees the button again rather than a spinner. */
      setTimeout(() => setOpening(false), AUTO_OPEN_DELAY_MS + 1500),
    ];

    return () => timers.forEach(clearTimeout);
  }, [url, orderId]);

  return (
    <div className="mt-6">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="animate-yatra-whatsapp-pulse flex h-12 w-full items-center justify-center gap-2 rounded-md bg-[#25D366] text-base font-medium text-white shadow-lg shadow-[#25D366]/25 transition-colors hover:bg-[#1da851] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366]"
      >
        {opening ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : (
          <MessageCircle className="size-4" aria-hidden="true" />
        )}
        {opening ? openingLabel : label}
      </a>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        {note}
      </p>
    </div>
  );
}
