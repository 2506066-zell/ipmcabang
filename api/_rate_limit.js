const BUCKETS = global.__IPM_RATE_LIMIT_BUCKETS || new Map();
global.__IPM_RATE_LIMIT_BUCKETS = BUCKETS;

function getClientIp(req) {
  const xff = String(req?.headers?.['x-forwarded-for'] || '');
  const first = xff.split(',')[0].trim();
  if (first) return first;
  return String(req?.socket?.remoteAddress || 'unknown');
}

function checkRateLimit({ key, id, limit, windowMs }) {
  const now = Date.now();
  const bucketKey = `${String(key || 'global')}::${String(id || 'unknown')}`;
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

function setRateLimitHeaders(res, result, limit) {
  const retryAfterSec = Math.max(1, Math.ceil((result.resetAt - Date.now()) / 1000));
  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(result.remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.floor(result.resetAt / 1000)));
  if (!result.ok) {
    res.setHeader('Retry-After', String(retryAfterSec));
  }
}

module.exports = { getClientIp, checkRateLimit, setRateLimitHeaders };
