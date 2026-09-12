import { getRegistrations } from "@/lib/db";
import { buildReceiptPdf, receiptFilename } from "@/lib/receipt";
import { verifyReceiptToken } from "@/lib/receipt-token";
import { check, clientKey } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The receipt PDF for one paid registration.
 *
 * Generated on every request rather than stored. The receipt is a pure
 * function of the registration document, which stops changing the moment the
 * payment succeeds, so there is nothing a stored copy would preserve that this
 * does not — and one fewer place for the same booking to exist in two versions.
 * A receipt is about 3 KB and takes a few milliseconds to draw.
 *
 * Unauthenticated by necessity — there are no accounts — so `?t=` carries an
 * HMAC of the registration ID. WhatsApp needs a link Meta's servers can fetch
 * without a cookie, and that same link is what the browser downloads.
 */
export async function GET(request, { params }) {
  const limit = check(clientKey(request, "receipt"), {
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.allowed) {
    return new Response("Too many requests", {
      status: 429,
      headers: { "Retry-After": String(limit.retryAfterSeconds) },
    });
  }

  const { orderId } = await params;
  const token = request.nextUrl.searchParams.get("t");

  if (!orderId || !(await verifyReceiptToken(orderId, token))) {
    // The same answer a missing registration gets, so a wrong token cannot be
    // used to find out which registration IDs exist.
    return new Response("Not found", { status: 404 });
  }

  const registrations = await getRegistrations();
  const registration = await registrations.findOne(
    { orderId },
    {
      /* Named field by field rather than excluded: ID-proof references must
         never leave the server, and `payment.raw` is the whole gateway
         response — only the four billing fields the address row is built from
         are pulled out of it. */
      projection: {
        orderId: 1,
        travellerCount: 1,
        amount: 1,
        createdAt: 1,
        "primary.name": 1,
        "primary.email": 1,
        "primary.phone": 1,
        "payment.status": 1,
        "payment.paymentMode": 1,
        "payment.paidAt": 1,
        "payment.raw.billing_address": 1,
        "payment.raw.billing_city": 1,
        "payment.raw.billing_state": 1,
        "payment.raw.billing_zip": 1,
      },
    }
  );

  if (!registration) return new Response("Not found", { status: 404 });

  /* A receipt is a record of money received. An unpaid, failed or abandoned
     registration has none to record, and issuing one anyway would hand a
     traveller a document their bank statement contradicts. */
  if (registration.payment?.status !== "success") {
    return new Response("No payment has been received for this registration.", {
      status: 409,
    });
  }

  let pdf;
  try {
    pdf = await buildReceiptPdf(registration);
  } catch (error) {
    console.error(`[receipt] could not draw ${orderId}`, error);
    return new Response("Could not generate the receipt", { status: 500 });
  }

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Length": String(pdf.length),
      /* `attachment` is what makes the browser save rather than preview it,
         and is why the status page needs no blob juggling to auto-download. */
      "Content-Disposition": `attachment; filename="${receiptFilename(registration)}"`,
      // Private: the link is the credential, so no shared cache may keep a
      // copy. The browser may, since a paid receipt never changes.
      "Cache-Control": "private, max-age=3600",
    },
  });
}
