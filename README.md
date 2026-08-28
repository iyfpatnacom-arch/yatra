This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Payments (CCAvenue) and WhatsApp (BotBiz)

Both integrations are optional at runtime: with their environment variables
blank the site still takes registrations, it just skips the payment handoff and
the messaging. Copy `.env.example` to `.env.local` for the full list.

### Payment flow

1. `POST /api/register` saves the registration as `pending` and answers with
   `next: "payment"` when CCAvenue is configured.
2. The browser calls `POST /api/payment/initiate`, which encrypts the order
   server-side and returns the gateway URL plus `encRequest` / `access_code`.
3. The browser POSTs itself to CCAvenue's billing page and the customer pays
   there — no card details ever reach this app.
4. CCAvenue POSTs the encrypted result to `/api/payment/response` (or
   `/api/payment/cancel`), which decrypts it, verifies the amount and currency
   against the stored registration, updates the row exactly once, and
   redirects to `/{lang}/status/{orderId}`. CCAvenue emails the payer their
   receipt directly, which is what the status page tells them to look for.

An unpaid registration can be paid for later from its status page; the
registration ID never changes.

### Before this works

- `NEXT_PUBLIC_SITE_URL` must be a public HTTPS origin, and the redirect and
  cancel URLs under it must be whitelisted in the CCAvenue MARS dashboard.
  **Payments cannot be exercised against localhost.**
- `CCAVENUE_ENCRYPTION` must match what the merchant account is provisioned
  for — `aes128` (the classic MD5/CBC scheme, the default) or `aes256`. A
  mismatch surfaces as CCAvenue error 10002, not as a decryption error.
- `CCAVENUE_ENV` defaults to `test`; set it to `production` explicitly.
- The admin dashboard's "Check with CCAvenue" button uses the server-to-server
  Status API, which additionally requires this server's public IP to be
  registered with CCAvenue. It is the recovery path for a payment whose
  response never made it back to us.

### WhatsApp — currently paused

`WHATSAPP_ENABLED` is the master switch and it is **off**. CCAvenue already
emails the traveller a receipt on a successful payment, so nothing is sent to
BotBiz: `sendPaymentConfirmation` returns without contacting the API and
without recording a failed attempt, and the admin dialog and CSV report those
registrations as `paused` rather than `not_sent`. Set `WHATSAPP_ENABLED=true`
to resume — the credentials below are still read, so it is one variable, not a
code change.

When it is on, confirmations go to the traveller's WhatsApp number and an alert to
`COORDINATOR_WHATSAPP`. Plain text only reaches someone who messaged the
business number in the last 24 hours, so set
`BOTBIZ_TEMPLATE_CONFIRMATION` to an approved template for reliable delivery;
the plain send is the fallback. Delivery is best-effort and recorded on the
registration under `notifications`, surfaced in the admin dialog and the CSV
export — a WhatsApp outage never fails a payment.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
