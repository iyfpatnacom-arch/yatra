import { NextResponse } from "next/server";
import { getRegistrations } from "@/lib/db";
import { toAdminRow } from "@/lib/registration";
import { isAdmin, unauthorized } from "@/lib/require-admin";
import {
  buildFilter,
  EMPTY_STATS,
  STATS_PIPELINE_GROUP,
} from "@/lib/admin-query";

export const runtime = "nodejs";

const PAGE_SIZE = 25;

export async function GET(request) {
  if (!(await isAdmin())) return unauthorized();

  const { searchParams } = new URL(request.url);
  const filter = buildFilter(searchParams);
  const page = Math.max(1, Number(searchParams.get("page")) || 1);

  const registrations = await getRegistrations();

  const [docs, total, stats] = await Promise.all([
    registrations
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .toArray(),
    registrations.countDocuments(filter),
    registrations
      .aggregate([{ $match: filter }, { $group: STATS_PIPELINE_GROUP }])
      .toArray(),
  ]);

  return NextResponse.json({
    ok: true,
    rows: docs.map(toAdminRow),
    page,
    pageSize: PAGE_SIZE,
    total,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    stats: stats[0] || EMPTY_STATS,
  });
}
