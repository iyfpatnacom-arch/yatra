/**
 * Client-side image downscaling for ID-proof photos.
 *
 * Phone cameras produce 4–12 MB files. On a patchy mobile connection that is
 * the difference between a registration completing and a registration being
 * abandoned, so we resize before upload rather than raising the server limit.
 *
 * Browser-only — do not import from a server component or route handler.
 */

const MAX_DIMENSION = 1600;
const QUALITY = 0.82;

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

export async function compressImage(file) {
  // Small files are already fine; re-encoding would only lose detail.
  if (file.size <= 400 * 1024) return file;

  try {
    const image = await readAsImage(file);
    const scale = Math.min(
      1,
      MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight)
    );

    const width = Math.round(image.naturalWidth * scale);
    const height = Math.round(image.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return file;
    // White backdrop so transparent PNGs do not become black rectangles.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", QUALITY)
    );

    if (!blob || blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") || "id-proof";
    return new File([blob], `${name}.jpg`, {
      type: "image/jpeg",
      lastModified: Date.now(),
    });
  } catch {
    // HEIC and other formats canvas cannot decode fall through untouched;
    // the server validates the type and returns a readable error.
    return file;
  }
}

export function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
