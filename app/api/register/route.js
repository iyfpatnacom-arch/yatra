import { NextResponse } from "next/server";
import { registrationSchema } from "@/lib/schema";
import {
  ACCEPTED_ID_PROOF_TYPES,
  MAX_ID_PROOF_BYTES,
  MAX_MEMBERS,
} from "@/lib/config";
import { ensureIndexes, getRegistrations } from "@/lib/db";
import { isPaymentConfigured } from "@/lib/ccavenue";
import { deleteIdProofs, uploadIdProof } from "@/lib/id-proof";
import { buildRegistrationDocument, generateOrderId } from "@/lib/registration";
import { check, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";

function fail(status, error, fieldErrors = []) {
  return NextResponse.json({ ok: false, error, fieldErrors }, { status });
}

/** Turns zod issues into { path, key } pairs the client maps back onto fields. */
function toFieldErrors(zodError) {
  return zodError.issues.map((issue) => ({
    path: issue.path.join("."),
    key: issue.message,
  }));
}

export async function POST(request) {
  const limit = check(clientKey(request, "register"), {
    limit: 8,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { ok: false, error: "rate_limited", fieldErrors: [] },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } }
    );
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return fail(400, "server_error");
  }

  let payload;
  try {
    payload = JSON.parse(form.get("payload"));
  } catch {
    return fail(400, "server_error");
  }

  const parsed = registrationSchema.safeParse(payload);
  if (!parsed.success) {
    return fail(400, "server_error", toFieldErrors(parsed.error));
  }

  const { type, coach, travellers } = parsed.data;
  if (travellers.length > MAX_MEMBERS) return fail(400, "travellers_max");

  // Every traveller must arrive with exactly one photo, index-matched to their
  // position in the payload.
  const files = [];
  const fileErrors = [];
  travellers.forEach((_, index) => {
    const file = form.get(`idProof_${index}`);
    const path = `travellers.${index}.idProof`;

    if (!file || typeof file === "string" || file.size === 0) {
      fileErrors.push({ path, key: "idproof_required" });
      return;
    }
    if (!ACCEPTED_ID_PROOF_TYPES.includes(file.type)) {
      fileErrors.push({ path, key: "idproof_type" });
      return;
    }
    if (file.size > MAX_ID_PROOF_BYTES) {
      fileErrors.push({ path, key: "idproof_size" });
      return;
    }
    files.push(file);
  });

  if (fileErrors.length) return fail(400, "server_error", fileErrors);

  const uploadedIds = [];
  try {
    await ensureIndexes();

    const orderId = generateOrderId(type);

    for (const [index, file] of files.entries()) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const id = await uploadIdProof({
        buffer,
        filename: `${orderId}-${index}-${file.name}`.slice(0, 180),
        contentType: file.type,
        metadata: {
          orderId,
          travellerIndex: index,
          uploadedAt: new Date(),
        },
      });
      uploadedIds.push(id);
    }

    const document = buildRegistrationDocument({
      type,
      coach,
      travellers,
      idProofFileIds: uploadedIds,
      orderId,
      meta: {
        userAgent: request.headers.get("user-agent")?.slice(0, 300) || null,
        locale: request.headers.get("x-yatra-locale") || null,
      },
    });

    const registrations = await getRegistrations();
    await registrations.insertOne(document);

    return NextResponse.json(
      {
        ok: true,
        orderId,
        amount: document.amount,
        balanceDue: document.fee.balanceDue,
        travellerCount: document.travellerCount,
        // The encrypted gateway payload is minted by /api/payment/initiate
        // rather than here, so the status page can re-open a payment that was
        // abandoned or declined. This flag just tells the client which way to
        // go next.
        next: isPaymentConfigured() ? "payment" : "status",
      },
      { status: 201 }
    );
  } catch (error) {
    // Roll back the photos so a failed insert leaves nothing behind.
    await deleteIdProofs(uploadedIds).catch(() => {});
    console.error("[register] failed", error);
    return fail(500, "server_error");
  }
}
