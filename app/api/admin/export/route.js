import { getRegistrations } from "@/lib/db";
import { CSV_COLUMNS, toCsvRows } from "@/lib/registration";
import { csvFilename, toCsv } from "@/lib/csv";
import { isAdmin, unauthorized } from "@/lib/require-admin";
import { buildFilter } from "@/lib/admin-query";

export const runtime = "nodejs";

export async function GET(request) {
  if (!(await isAdmin())) return unauthorized();

  const { searchParams } = new URL(request.url);
  const filter = buildFilter(searchParams);

  const registrations = await getRegistrations();
  const docs = await registrations
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  // One row per traveller, so a four-person family booking exports four rows.
  const rows = docs.flatMap(toCsvRows);
  const csv = toCsv(CSV_COLUMNS, rows);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${csvFilename()}"`,
      "Cache-Control": "no-store",
    },
  });
}
