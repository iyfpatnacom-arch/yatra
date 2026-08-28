/**
 * In-memory fixed-window rate limiter.
 *
 * Deliberately simple. It stops a bored visitor hammering the registration or
 * admin-login endpoint from one browser. It is per-process, so on a
 * multi-instance serverless deploy the effective limit is (limit x instances).
 * If this ever needs to be a real control, swap the Map for Redis — the
 * `check()` signature is designed not to change.
 */

const buckets = new Map();

/** Drop expired buckets so a long-running process does not leak memory. */
function sweep(now) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function check(key, { limit = 10, windowMs = 60_000 } = {}) {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000),
    };
  }

  return {
    allowed: true,
    remaining: limit - bucket.count,
    retryAfterSeconds: 0,
  };
}

/** Best-effort client IP from the usual proxy headers. */
export function clientKey(request, scope) {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip =
    (forwarded ? forwarded.split(",")[0].trim() : "") ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return `${scope}:${ip}`;
}
