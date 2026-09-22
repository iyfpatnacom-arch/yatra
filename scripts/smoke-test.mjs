#!/usr/bin/env node
/**
 * Smoke test for a running build — the gate the deploy workflow puts in front
 * of, and behind, every release.
 *
 *   node scripts/smoke-test.mjs http://127.0.0.1:3000      # the build, in CI
 *   node scripts/smoke-test.mjs https://yatra.iyfpatna.in  # production, after
 *
 * For every page below it checks that:
 *   - the page answers 200 with HTML;
 *   - the page links at least one stylesheet;
 *   - every /_next/static file the HTML references answers 200 (and a .css
 *     file answers as text/css). A page left over from a previous build
 *     points at chunk hashes the current build no longer has, so this is what
 *     catches an unstyled or half-broken page served from a stale cache;
 *   - the home pages carry the youth helpline and the first yatra poster from
 *     lib/config.js *in this checkout*, so a green HTTP status also means the
 *     new release is the one being served.
 *
 * It also checks the payment callback is routed (a GET bounces with 303), so a
 * release that lost the Razorpay routes fails here rather than at checkout.
 *
 * Exits non-zero, listing every failure, if anything is wrong.
 */
import { readFile } from "node:fs/promises";

const base = (process.argv[2] || "http://127.0.0.1:3000").replace(/\/$/, "");
// Per request. Production goes through a slow VPS link, so its default is
// generous; CI talks to a server on localhost and sets this much lower.
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS) || 45_000;

// Pages that must render without a database: CI boots the build with no
// MONGODB_URI, and production must survive Mongo being unreachable.
const PAGES = [
  "/hi",
  "/en",
  "/en/youth",
  "/en/family",
  "/en/about",
  "/en/contact",
  "/en/privacy",
  "/en/terms",
  "/en/refund",
  "/en/shipping",
];
// The /youth and /family links are the landing page with a category chosen.
const HOME_PAGES = new Set(["/hi", "/en", "/en/youth", "/en/family"]);

/* lib/config.js reads NEXT_PUBLIC_* values, which the build took from
   .env.production.local (written from BUILD_ENV in CI). Load the same file so
   the expected helplines are the ones that were baked in. */
try {
  const env = await readFile(new URL("../.env.production.local", import.meta.url), "utf8");
  for (const line of env.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match && !(match[1] in process.env)) {
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
    }
  }
} catch {
  /* No build env file — config.js falls back to its defaults, as the build did. */
}

// config.js has no imports, only `export`s, so it can be loaded as a module
// straight from source — the expected values are always this commit's.
const configSource = await readFile(new URL("../lib/config.js", import.meta.url), "utf8");
const { HELPLINES, YATRA_POSTERS } = await import(
  `data:text/javascript;charset=utf-8,${encodeURIComponent(configSource)}`
);
const helpline = HELPLINES.youth[0];
const poster = YATRA_POSTERS[0]?.src;

const failures = [];
const fail = (msg) => {
  failures.push(msg);
  console.log(`  FAIL ${msg}`);
};

/** fetch with retries: the link to the VPS drops often, a blip is not a bug. */
async function get(path, { attempts = 4, redirect = "follow" } = {}) {
  let lastError;
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(base + path, {
        redirect,
        headers: { "user-agent": "yatra-smoke-test", "accept-language": "hi" },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      // A 5xx right after a restart can be the server still warming up.
      if (res.status >= 500 && i < attempts) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (err) {
      lastError = err;
      if (i < attempts) await new Promise((r) => setTimeout(r, 3000 * i));
    }
  }
  throw lastError;
}

function includesAny(html, value) {
  // next/image puts remote URLs through /_next/image?url=<encoded>, so the
  // poster shows up encoded rather than verbatim.
  return html.includes(value) || html.includes(encodeURIComponent(value));
}

const assets = new Set();

for (const path of PAGES) {
  console.log(`page ${path}`);
  let res;
  try {
    res = await get(path);
  } catch (err) {
    fail(`${path}: request failed (${err.message})`);
    continue;
  }
  const type = res.headers.get("content-type") || "";
  if (res.status !== 200) fail(`${path}: HTTP ${res.status}`);
  if (!type.includes("text/html")) fail(`${path}: content-type ${type}`);
  const html = await res.text();

  const refs = [...html.matchAll(/\/_next\/static\/[^"'\s\\)]+/g)].map((m) => m[0]);
  if (!refs.some((r) => r.endsWith(".css"))) fail(`${path}: no stylesheet linked`);
  refs.forEach((r) => assets.add(r));

  if (HOME_PAGES.has(path)) {
    if (helpline && !html.includes(helpline)) fail(`${path}: youth helpline ${helpline} missing`);
    if (poster && !includesAny(html, poster)) fail(`${path}: poster ${poster} missing`);
  }
}

console.log("payment callback");
try {
  const res = await get("/api/payment/response?lang=en", { redirect: "manual" });
  if (res.status !== 303) fail(`/api/payment/response: expected 303, got HTTP ${res.status}`);
  await res.arrayBuffer();
} catch (err) {
  fail(`/api/payment/response: request failed (${err.message})`);
}

console.log(`checking ${assets.size} static assets`);
for (const asset of assets) {
  try {
    const res = await get(asset);
    if (res.status !== 200) {
      fail(`${asset}: HTTP ${res.status}`);
    } else if (
      asset.endsWith(".css") &&
      !(res.headers.get("content-type") || "").includes("text/css")
    ) {
      fail(`${asset}: served as ${res.headers.get("content-type")}`);
    }
    await res.arrayBuffer();
  } catch (err) {
    fail(`${asset}: request failed (${err.message})`);
  }
}

if (failures.length) {
  console.error(`\nsmoke test FAILED against ${base} — ${failures.length} problem(s):`);
  failures.forEach((f) => console.error(`  - ${f}`));
  // Surfaced as annotations on the run summary, not buried in the step log.
  if (process.env.GITHUB_ACTIONS) {
    failures.forEach((f) => console.log(`::error title=Smoke test (${base})::${f}`));
  }
  process.exit(1);
}
console.log(`\nsmoke test passed against ${base}`);
