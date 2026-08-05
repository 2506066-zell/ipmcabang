const crypto = require('crypto');

function applySecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
}

function json(res, status, data, headers) {
  const body = JSON.stringify(data ?? {});
  const etag = crypto.createHash('sha1').update(body).digest('hex');
  applySecurityHeaders(res);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('ETag', etag);
  if (headers) Object.entries(headers).forEach(([k, v]) => res.setHeader(k, v));
  res.status(status).send(body);
}

function cacheHeaders(seconds) {
  const s = Number(seconds || 60);
  return { 'Cache-Control': `public, s-maxage=${s}, stale-while-revalidate=${s * 5}` };
}

function getBearerToken(req) {
  const h = String(req?.headers?.['authorization'] || '');
  if (!h.startsWith('Bearer ')) return '';
  return h.slice(7).trim();
}

function parseJsonBody(req) {
  const b = req && req.body !== undefined ? req.body : {};
  if (typeof b === 'string') {
    try { return JSON.parse(b || '{}'); } catch { return {}; }
  }
  return b || {};
}

module.exports = { json, cacheHeaders, getBearerToken, parseJsonBody, applySecurityHeaders };
