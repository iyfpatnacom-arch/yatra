/**
 * Where the yatra posters are hosted. Also listed in next.config.mjs, which
 * guards the built-in optimiser rather than this loader.
 */
const IMAGEKIT_HOST = "ik.imagekit.io";

/**
 * Whether `src` is a poster we can hand to {@link imagekitLoader}.
 *
 * Anything else — the local photographs in public/hero — is left to the
 * built-in loader, which serves them from disk and has nothing to gain by
 * being routed elsewhere.
 */
export function onImagekit(src) {
  return typeof src === "string" && src.startsWith(`https://${IMAGEKIT_HOST}/`);
}

/**
 * Asks ImageKit for a resized poster instead of resizing it ourselves.
 *
 * Left alone, next/image points remote images at /_next/image, which makes our
 * own VPS download the full-size JPEG and re-encode it for every width the
 * srcset asks for. That box is CPU-starved — it is why the build is shipped
 * standalone — and a cold cache there is most of the wait a visitor feels on
 * the posters, which are the entire carousel on a phone. ImageKit already does
 * that resize at its edge and has it cached, so we ask it directly.
 *
 * `w` is the width next/image picked for this srcset entry, device pixel ratio
 * already accounted for, so no `dpr` transform belongs here; `f-auto` lets
 * ImageKit negotiate WebP or AVIF from the browser's own Accept header.
 */
export function imagekitLoader({ src, width, quality }) {
  const url = new URL(src);
  url.searchParams.set("tr", `w-${width},q-${quality || 75},f-auto`);
  return url.toString();
}
