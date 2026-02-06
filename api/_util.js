const crypto = require('crypto');

function json(res, status, data, headers) {
  const body = JSON.stringify(data ?? {});
  const etag = crypto.createHash('sha1').update(body).digest('hex');
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
  const h = String(req.headers['authorization'] || '');
  if (!h.startsWith('Bearer ')) return '';
  return h.slice(7).trim();
}

module.exports = { json, cacheHeaders, getBearerToken };
