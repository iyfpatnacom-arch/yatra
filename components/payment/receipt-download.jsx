"use client";

import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * The receipt download, offered as a button and taken automatically once.
 *
 * The route answers with `Content-Disposition: attachment`, so a plain anchor
 * click saves the file and leaves the page where it is — no blob URL, no
 * fetch, and none of the PDF passing through React state.
 *
 * The automatic download clicks its own hidden anchor rather than the button:
 * the visible one is handed to the Button's `render`, which owns that element,
 * and a ref through it is not ours to rely on.
 *
 * "Once" means once per browser session, not once per render. Someone who
 * bookmarks their status page and opens it next week should not have a file
 * pushed at them, and React strict mode mounts effects twice in development —
 * the same guard covers both.
 */
export function ReceiptDownload({ url, filename, auto = false, label, autoNote }) {
  const hidden = useRef(null);
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => {
    if (!auto) return;

    const key = `yatra:receipt:${filename}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* Private browsing denies sessionStorage. Offering the download again is
         better than never offering it, and the button below is the reliable
         path either way. */
    }

    /* A beat after paint, so the browser attributes the download to a settled
       page. Firing in the same frame as the arrival from the gateway is what
       gets a download silently discarded. */
    const timer = setTimeout(() => {
      hidden.current?.click();
      setDownloaded(true);
    }, 700);

    return () => clearTimeout(timer);
  }, [auto, filename]);

  return (
    <div className="mt-6">
      <a ref={hidden} href={url} download={filename} className="hidden" aria-hidden="true" tabIndex={-1}>
        {label}
      </a>

      <Button
        render={<a href={url} download={filename} />}
        variant="outline"
        className="h-11 w-full rounded-md"
      >
        <Download className="size-4" aria-hidden="true" />
        {label}
      </Button>

      {auto && downloaded ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          {autoNote}
        </p>
      ) : null}
    </div>
  );
}
