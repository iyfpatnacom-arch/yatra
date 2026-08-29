/**
 * Client-side image downscaling for ID-proof photos.
 *
 * Phone cameras produce 4–12 MB files. On a patchy mobile connection that is
 * the difference between a registration completing and a registration being
 * abandoned, so we resize before upload rather than raising the server limit.
 *
 * This compresses to a BYTE BUDGET, not to a fixed quality: the server accepts
 * at most MAX_ID_PROOF_BYTES, and a fixed quality lands wherever it lands, so
 * the same setting that produced 180 KB for one traveller's Aadhaar produced
 * 600 KB for the next one's passport and got rejected. Here we step the
 * dimensions and the JPEG quality down together until the encoded blob fits.
 *
 * Browser-only — do not import from a server component or route handler.
 */

/** Widest edge to try first, then progressively smaller. */
const DIMENSIONS = [1600, 1400, 1200, 1000, 850, 700];

/** Quality ladder tried at each dimension. 0.45 is still legible for an ID. */
const QUALITIES = [0.82, 0.72, 0.62, 0.52, 0.45];

function readAsImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("decode_failed"));
    };
    image.src = url;
  });
}

/** Draws the image at `maxEdge` and encodes it as JPEG at `quality`. */
function encode(image, maxEdge, quality) {
  const scale = Math.min(
    1,
    maxEdge / Math.max(image.naturalWidth, image.naturalHeight)
  );
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) return Promise.resolve(null);
  // White backdrop so transparent PNGs do not become black rectangles.
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(image, 0, 0, width, height);

  return new Promise((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
}

/**
 * Returns a File at or under `maxBytes` where it can manage it.
 *
 * Where it cannot — a format canvas refuses to decode, or a photo that is
 * still too heavy at the smallest setting — it returns the smallest result it
 * reached. The caller checks `.size` and shows the traveller a real error
 * rather than letting the upload fail at the server.
 */
export async function compressImage(file, maxBytes) {
  const budget = Number(maxBytes) > 0 ? Number(maxBytes) : Infinity;

  // Already inside the budget; re-encoding would only lose detail.
  if (file.size <= budget) return file;

  let image;
  try {
    image = await readAsImage(file);
  } catch {
    // HEIC and other formats canvas cannot decode fall through untouched; the
    // caller rejects them on type or size with a readable message.
    return file;
  }

  let best = null;

  for (const maxEdge of DIMENSIONS) {
    for (const quality of QUALITIES) {
      const blob = await encode(image, maxEdge, quality);
      if (!blob) return file;

      if (!best || blob.size < best.size) best = blob;
      if (blob.size <= budget) return toFile(blob, file);
    }
  }

  // Nothing fit. Hand back the smallest attempt if it at least beat the
  // original, so the error the traveller sees quotes a realistic size.
  if (best && best.size < file.size) return toFile(best, file);
  return file;
}

function toFile(blob, original) {
  const name = original.name.replace(/\.[^.]+$/, "") || "id-proof";
  return new File([blob], `${name}.jpg`, {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
