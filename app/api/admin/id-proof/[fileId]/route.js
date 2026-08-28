import { readIdProof } from "@/lib/id-proof";
import { isAdmin, unauthorized } from "@/lib/require-admin";

export const runtime = "nodejs";

/**
 * The only way an ID photo leaves the database. Admin-gated, never cached,
 * and served inline so the browser previews rather than downloads it.
 */
export async function GET(_request, context) {
  if (!(await isAdmin())) return unauthorized();

  const { fileId } = await context.params;
  const file = await readIdProof(fileId);

  if (!file) {
    return Response.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  return new Response(file.buffer, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Length": String(file.length),
      "Content-Disposition": `inline; filename="${encodeURIComponent(file.filename)}"`,
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
