const BUCKETS: Map<string, { count: number; resetAt: number }> =
  (globalThis as Record<string, unknown>).__IPM_RATE_BUCKETS as typeof BUCKETS ??
  new Map<string, { count: number; resetAt: number }>();

(globalThis as Record<string, unknown>).__IPM_RATE_BUCKETS = BUCKETS;

interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
}

export function checkRateLimit(options: {
  key: string;
  id: string;
  limit: number;
  windowMs: number;
}): RateLimitResult {
  const { key, id, limit, windowMs } = options;
  const now = Date.now();
  const bucketKey = `${key}::${id}`;
  const item = BUCKETS.get(bucketKey);

  if (!item || item.resetAt <= now) {
    const resetAt = now + windowMs;
    BUCKETS.set(bucketKey, { count: 1, resetAt });
    return { ok: true, remaining: Math.max(0, limit - 1), resetAt };
  }

  if (item.count >= limit) {
    return { ok: false, remaining: 0, resetAt: item.resetAt };
  }

  item.count += 1;
  BUCKETS.set(bucketKey, item);
  return { ok: true, remaining: Math.max(0, limit - item.count), resetAt: item.resetAt };
}

export function getRateLimitHeaders(
  result: RateLimitResult,
  limit: number
): Record<string, string> {
  const retryAfterSec = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.floor(result.resetAt / 1000)),
  };
  if (!result.ok) {
    headers['Retry-After'] = String(retryAfterSec);
  }
  return headers;
}

export function enforceRateLimit(
  req: Request,
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; headers: Record<string, string> } {
  const xff = req.headers.get('x-forwarded-for') || '';
  const id = xff.split(',')[0].trim() || 'unknown';
  const result = checkRateLimit({ key, id, limit, windowMs });
  const headers = getRateLimitHeaders(result, limit);
  return { ok: result.ok, headers };
}
