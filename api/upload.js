let put;
try {
    ({ put } = require('@vercel/blob'));
} catch (e) {
    put = null;
    console.warn('Missing @vercel/blob dependency.');
}
const { requireAdminAuth } = require('./_auth');
const { applySecurityHeaders } = require('./_util');
const { getClientIp, checkRateLimit, setRateLimitHeaders } = require('./_rate_limit');

// Helper for standard JSON responses
const json = (res, status, data) => {
    applySecurityHeaders(res);
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = status;
    res.end(JSON.stringify(data));
};

function sanitizeFilename(input) {
    const raw = String(input || 'upload');
    const noPath = raw.replace(/[\\/]/g, '-');
    const clean = noPath.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 120);
    return clean || `upload-${Date.now()}`;
}

module.exports = async (req, res) => {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

    try {
        const headers = req.headers || {};
        const rl = checkRateLimit({ key: 'upload', id: getClientIp(req), limit: 25, windowMs: 10 * 60 * 1000 });
        setRateLimitHeaders(res, rl, 25);
        if (!rl.ok) {
            return json(res, 429, { status: 'error', message: 'Too many upload requests. Try again later.', error: 'Too many requests' });
        }
        try {
            await requireAdminAuth(req);
        } catch {
            return json(res, 401, { status: 'error', message: 'Unauthorized', error: 'Unauthorized' });
        }

        const contentLength = Number(headers['content-length'] || 0);
        const maxBytes = 5 * 1024 * 1024;
        if (contentLength > maxBytes) {
            const msg = 'File terlalu besar (maksimal 5MB).';
            return json(res, 413, { status: 'error', message: msg, error: msg });
        }

        if (!put || !process.env.BLOB_READ_WRITE_TOKEN) {
            const msg = 'Storage belum dikonfigurasi.';
            return json(res, 503, { status: 'error', message: msg, error: msg });
        }

        const filename = sanitizeFilename(headers['x-filename']);
        const contentType = String(headers['content-type'] || 'application/octet-stream');

        // Direct put to Vercel Blob
        const blob = await put(filename, req, {
            access: 'public',
            contentType: contentType,
        });

        return json(res, 201, {
            status: 'success',
            url: blob.url
        });

    } catch (error) {
        console.error('Upload Error:', error);
        const msg = String(error?.message || error || 'Upload gagal');
        return json(res, 500, { status: 'error', message: msg, error: msg });
    }
};
