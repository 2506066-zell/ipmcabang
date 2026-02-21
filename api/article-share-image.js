const ArticleModel = require('../models/ArticleModel');
const { applySecurityHeaders } = require('./_util');

const FALLBACK_IMAGE = '/ipm%20(2).png';

function getOrigin(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return `${proto}://${host}`;
}

function redirect(res, location) {
  applySecurityHeaders(res);
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');
  res.setHeader('Location', location);
  return res.status(302).send('');
}

function parseDataImage(raw) {
  const match = String(raw || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/);
  if (!match) return null;
  try {
    return {
      mime: match[1],
      buffer: Buffer.from(match[2], 'base64')
    };
  } catch {
    return null;
  }
}

function getSlug(req) {
  const querySlug = String((req.query && req.query.slug) || '').trim();
  if (querySlug) {
    const normalized = querySlug.replace(/\.(jpg|jpeg|png|webp)$/i, '');
    try {
      return decodeURIComponent(normalized);
    } catch {
      return normalized;
    }
  }
  const path = String(req.url || '');
  const match = path.match(/\/api\/article-share-image\/([^/?#]+)/i);
  if (!match || !match[1]) return '';
  const raw = match[1].replace(/\.(jpg|jpeg|png|webp)$/i, '');
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    applySecurityHeaders(res);
    return res.status(405).send('Method Not Allowed');
  }

  const slug = getSlug(req);
  const origin = getOrigin(req);
  const fallbackUrl = new URL(FALLBACK_IMAGE, origin).toString();
  if (!slug) return redirect(res, fallbackUrl);

  try {
    const article = await ArticleModel.findBySlug(slug);
    if (!article || !article.image) return redirect(res, fallbackUrl);

    const rawImage = String(article.image || '').trim();
    const parsedData = parseDataImage(rawImage);
    if (parsedData) {
      applySecurityHeaders(res);
      res.setHeader('Content-Type', parsedData.mime);
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');
      res.setHeader('Content-Length', String(parsedData.buffer.length));
      if (req.method === 'HEAD') return res.status(200).end();
      return res.status(200).send(parsedData.buffer);
    }

    try {
      const resolved = new URL(rawImage, origin).toString();
      return redirect(res, resolved);
    } catch {
      return redirect(res, fallbackUrl);
    }
  } catch (err) {
    console.error('article-share-image error', err);
    return redirect(res, fallbackUrl);
  }
};
