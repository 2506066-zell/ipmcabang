const { json } = require('./_util');

function safeGoogleDriveId(input) {
  const raw = String(input || '').trim();
  if (!raw) return '';
  if (!/^[a-zA-Z0-9_-]{10,}$/.test(raw)) return '';
  return raw;
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'GET') return json(res, 405, { status: 'error', message: 'Method not allowed' });

    const id = safeGoogleDriveId(req.query?.id || '');
    if (!id) return json(res, 400, { status: 'error', message: 'id file Google Drive tidak valid' });

    const sourceUrl = `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    let upstream;
    try {
      upstream = await fetch(sourceUrl, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          Accept: 'application/pdf,*/*;q=0.8',
          'User-Agent': 'IPM-Cabang-Reader/1.0'
        }
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!upstream || !upstream.ok) {
      return json(res, 502, { status: 'error', message: 'Gagal mengambil file dari Google Drive' });
    }

    const contentType = String(upstream.headers.get('content-type') || '').toLowerCase();
    if (!contentType.includes('application/pdf')) {
      return json(res, 415, {
        status: 'error',
        message: 'File bukan PDF langsung atau akses publik Google Drive belum valid'
      });
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.status(200).send(buf);
  } catch (e) {
    return json(res, 500, { status: 'error', message: String(e.message || e) });
  }
};

