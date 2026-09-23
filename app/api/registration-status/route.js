import { NextResponse } from "next/server";
import { registrationGate } from "@/lib/registration-gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Whether the form should be shown at all, asked by the wizard as it mounts.
 *
 * Only the verdict leaves the server — never the limit or the paid count. The
 * register route re-checks on submit, so this is for the visitor's sake, not
 * the security boundary.
 */
export async function GET() {
  try {
    const gate = await registrationGate();
    return NextResponse.json(
      { ok: true, open: gate.allowed, reason: gate.reason },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[registration-status] failed", error);
    // Unknown is shown as open: the submit is refused anyway if it is not.
    return NextResponse.json(
      { ok: false, open: true, reason: null },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
