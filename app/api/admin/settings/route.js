import { NextResponse } from "next/server";
import { isAdmin, unauthorized } from "@/lib/require-admin";
import {
  countPaidSeats,
  getRegistrationSettings,
  MAX_REGISTRATION_LIMIT,
  registrationGate,
  updateRegistrationSettings,
} from "@/lib/registration-gate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The switches plus what they currently add up to, for the controls card. */
async function snapshot() {
  const [settings, paid, gate] = await Promise.all([
    getRegistrationSettings(),
    countPaidSeats(),
    registrationGate(),
  ]);
  return { ok: true, settings, paid, reason: gate.reason };
}

export async function GET() {
  if (!(await isAdmin())) return unauthorized();
  return NextResponse.json(await snapshot());
}

/**
 * Accepts any subset of { open, killSwitch, limit }. `limit` is a whole number
 * of seats (paid travellers), or null to remove the cap.
 */
export async function PUT(request) {
  if (!(await isAdmin())) return unauthorized();

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "server_error" }, { status: 400 });
  }

  const changes = {};
  if ("open" in body) {
    if (typeof body.open !== "boolean") return invalid();
    changes.open = body.open;
  }
  if ("killSwitch" in body) {
    if (typeof body.killSwitch !== "boolean") return invalid();
    changes.killSwitch = body.killSwitch;
  }
  if ("limit" in body) {
    const { limit } = body;
    if (
      limit !== null &&
      !(Number.isInteger(limit) && limit >= 1 && limit <= MAX_REGISTRATION_LIMIT)
    ) {
      return invalid();
    }
    changes.limit = limit;
  }
  if (!Object.keys(changes).length) return invalid();

  await updateRegistrationSettings(changes);
  return NextResponse.json(await snapshot());
}

function invalid() {
  return NextResponse.json({ ok: false, error: "invalid_settings" }, { status: 400 });
}
