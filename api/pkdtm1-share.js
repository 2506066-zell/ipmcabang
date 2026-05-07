const { applySecurityHeaders } = require('./_util');
const fs = require('fs');
const path = require('path');

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getOrigin(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return `${proto}://${host}`;
}

function sendHtml(res, status, html) {
  applySecurityHeaders(res);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=600, stale-while-revalidate=3600');
  res.status(status).send(html);
}

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    applySecurityHeaders(res);
    return res.status(405).send('Method Not Allowed');
  }

  const origin = getOrigin(req);
  const title = 'Daftar PKDTM 1 — Membumikan Identitas, Melahirkan Peradaban';
  const description = 'Ayo bergabung dalam Pelatihan Kader Dasar Taruna Melati 1 (PKDTM1) - PC IPM Panawuan. Jadilah kader dasar yang militan! Daftar sekarang!';
  const imageUrl = `${origin}/pkdtm1-banner-16-9.png`;
  const canonicalUrl = `${origin}/pendaftaran-pkdtm1.html`;
  const clientUrl = '/pendaftaran-pkdtm1.html';

  const html = `<!doctype html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonicalUrl)}">
  <meta property="og:type" content="article">
  <meta property="og:locale" content="id_ID">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:site_name" content="PC IPM Panawuan">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:url" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:secure_url" content="${escapeHtml(imageUrl)}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="300">
  <meta property="og:image:height" content="300">
  <meta property="og:image:alt" content="PKDTM 1 - Membumikan Identitas, Melahirkan Peradaban">
  <meta property="og:url" content="${escapeHtml(canonicalUrl)}">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">
  <meta name="twitter:image:alt" content="PKDTM 1 - Membumikan Identitas, Melahirkan Peradaban">
  <meta name="twitter:url" content="${escapeHtml(canonicalUrl)}">
</head>
<body>
  <script>
    (function () {
      try {
        window.location.replace(${JSON.stringify(clientUrl)});
      } catch (e) {}
    })();
  </script>
  <noscript>
    <p>Mengarahkan ke halaman pendaftaran...</p>
    <p><a href="${escapeHtml(clientUrl)}">Buka halaman pendaftaran PKDTM1</a></p>
  </noscript>
  <p><a href="${escapeHtml(clientUrl)}">Buka halaman pendaftaran PKDTM1</a></p>
</body>
</html>`;

  return sendHtml(res, 200, html);
};
