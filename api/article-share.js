const ArticleModel = require('../models/ArticleModel');
const { applySecurityHeaders } = require('./_util');

const FALLBACK_IMAGE = '/ipm%20(2).png';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getOrigin(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return `${proto}://${host}`;
}

function buildDescription(article) {
  const source = article.summary || article.excerpt || article.content || '';
  const plain = stripHtml(source);
  if (!plain) return 'Baca artikel terbaru dari PC IPM Panawuan.';
  if (plain.length <= 180) return plain;
  return `${plain.slice(0, 180).trim()}...`;
}

function toIsoDate(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function sendHtml(res, status, html) {
  applySecurityHeaders(res);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=1800');
  res.status(status).send(html);
}

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    applySecurityHeaders(res);
    return res.status(405).send('Method Not Allowed');
  }

  const slug = String((req.query && req.query.slug) || '').trim();
  if (!slug) {
    const html = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Artikel - PC IPM Panawuan</title>
  <meta name="robots" content="noindex,nofollow">
</head>
<body>
  <p>Slug artikel tidak ditemukan.</p>
  <p><a href="/articles">Kembali ke daftar artikel</a></p>
</body>
</html>`;
    return sendHtml(res, 200, html);
  }

  const origin = getOrigin(req);
  const detailPath = `/articles/${encodeURIComponent(slug)}`;

  try {
    const article = await ArticleModel.findBySlug(slug);
    if (!article) {
      const title = 'Artikel Tidak Ditemukan - PC IPM Panawuan';
      const description = 'Artikel yang kamu cari tidak tersedia.';
      const imageUrl = new URL(FALLBACK_IMAGE, origin).toString();
      const canonicalUrl = new URL(detailPath, origin).toString();
      const html = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  <meta name="robots" content="noindex,nofollow">
</head>
<body>
  <p>Artikel tidak ditemukan.</p>
  <p><a href="/articles">Kembali ke daftar artikel</a></p>
</body>
</html>`;
      return sendHtml(res, 404, html);
    }

    const articleSlug = String(article.slug || slug).trim();
    const finalDetailPath = `/articles/${encodeURIComponent(articleSlug)}`;
    const title = `${article.title || 'Artikel Organisasi'} - PC IPM Panawuan`;
    const description = buildDescription(article);
    const imageUrl = new URL(`/api/article-share-image/${encodeURIComponent(articleSlug)}.jpg`, origin).toString();
    const canonicalUrl = new URL(finalDetailPath, origin).toString();
    const publishedIso = toIsoDate(article.publish_date || article.created_at || Date.now());

    const html = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta property="article:published_time" content="${escapeHtml(publishedIso)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  <script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title || 'Artikel Organisasi',
    author: article.author || 'Redaksi IPM Panawuan',
    datePublished: publishedIso,
    image: [imageUrl],
    mainEntityOfPage: canonicalUrl
  })}</script>
</head>
<body>
  <p>Preview artikel siap dibagikan.</p>
  <p><a href="${escapeHtml(finalDetailPath)}">Buka artikel</a></p>
</body>
</html>`;

    return sendHtml(res, 200, html);
  } catch (err) {
    console.error('article-share error', err);
    const html = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Artikel - PC IPM Panawuan</title>
  <meta name="robots" content="noindex,nofollow">
</head>
<body>
  <p>Gagal memuat preview artikel.</p>
  <p><a href="${escapeHtml(detailPath)}">Buka artikel</a></p>
</body>
</html>`;
    return sendHtml(res, 500, html);
  }
};
