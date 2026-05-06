const { applySecurityHeaders } = require('./_util');
const fs = require('fs');
const path = require('path');

function getOrigin(req) {
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  return `${proto}://${host}`;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    applySecurityHeaders(res);
    return res.status(405).send('Method Not Allowed');
  }

  applySecurityHeaders(res);

  // Try to serve the banner image file directly
  const bannerPaths = [
    path.join(__dirname, '..', 'images', 'pkdtm1-banner-v3.png'),
    path.join(__dirname, '..', 'pkdtm1-banner-v3.png'),
    path.join(__dirname, '..', 'images', 'pkdtm1-banner.png'),
  ];

  for (const filePath of bannerPaths) {
    try {
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Length', String(buffer.length));
        res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
        if (req.method === 'HEAD') return res.status(200).end();
        return res.status(200).send(buffer);
      }
    } catch (e) {
      console.warn('[pkdtm1-share-image] Error reading file:', filePath, e.message);
    }
  }

  // Fallback: redirect to logo
  const origin = getOrigin(req);
  const fallbackUrl = `${origin}/ipm%20(2).png`;
  res.setHeader('Location', fallbackUrl);
  res.setHeader('Cache-Control', 'public, s-maxage=300');
  return res.status(302).send('');
};
