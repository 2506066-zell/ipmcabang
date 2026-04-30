let put;
try {
    ({ put } = require('@vercel/blob'));
} catch (e) {
    put = null;
    console.warn('Missing @vercel/blob dependency.');
}
const { requireAdminAuth, getSessionUser } = require('./_auth');
const { applySecurityHeaders } = require('./_util');
const { getClientIp, checkRateLimit, setRateLimitHeaders } = require('./_rate_limit');

// Helper for standard JSON responses
const json = (res, status, data) => {
    applySecurityHeaders(res);
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = status;
    res.end(JSON.stringify(data));
};

async function getBuffer(req) {
    const chunks = [];
    for await (const chunk of req) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

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
        const uploadScope = String(headers['x-upload-scope'] || '').trim().toLowerCase();
        const rl = checkRateLimit({ key: 'upload', id: getClientIp(req), limit: 25, windowMs: 10 * 60 * 1000 });
        setRateLimitHeaders(res, rl, 25);
        if (!rl.ok) {
            return json(res, 429, { status: 'error', message: 'Too many upload requests. Try again later.', error: 'Too many requests' });
        }
        let uploader = null;
        let folderPrefix = 'admin';
        if (uploadScope === 'attendance-selfie') {
            uploader = await getSessionUser(req);
            if (!uploader) {
                return json(res, 401, { status: 'error', message: 'Unauthorized', error: 'Unauthorized' });
            }
            folderPrefix = `attendance/user-${uploader.id}`;
        } else if (uploadScope === 'pkdtm1-registration') {
            uploader = await getSessionUser(req);
            if (!uploader) {
                return json(res, 401, { status: 'error', message: 'Unauthorized', error: 'Unauthorized' });
            }
            folderPrefix = `pkdtm1/user-${uploader.id}`;
        } else {
            try {
                uploader = await requireAdminAuth(req);
            } catch {
                return json(res, 401, { status: 'error', message: 'Unauthorized', error: 'Unauthorized' });
            }
        }

        const contentLength = Number(headers['content-length'] || 0);
        const maxBytes = 5 * 1024 * 1024;
        if (contentLength > maxBytes) {
            const msg = 'File terlalu besar (maksimal 5MB).';
            return json(res, 413, { status: 'error', message: msg, error: msg });
        }

        const filename = sanitizeFilename(headers['x-filename']);
        const contentType = String(headers['content-type'] || 'application/octet-stream');
        if (uploadScope === 'attendance-selfie' && !contentType.startsWith('image/')) {
            const msg = 'Upload selfie harus berupa file gambar.';
            return json(res, 400, { status: 'error', message: msg, error: msg });
        }
        if (uploadScope === 'pkdtm1-registration' && !contentType.startsWith('image/') && contentType !== 'application/pdf' && contentType !== 'application/msword' && contentType !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const msg = 'File PKDTM1 harus berupa gambar, PDF, atau dokumen Word.';
            return json(res, 400, { status: 'error', message: msg, error: msg });
        }

        // HYBRID STORAGE LOGIC
        if (!put || !process.env.BLOB_READ_WRITE_TOKEN) {
            // FALLBACK: Store as Base64 in database (works because we compressed the image to ~24KB)
            const buffer = await getBuffer(req);
            if (buffer.length > maxBytes) {
                return json(res, 413, { status: 'error', message: 'File terlalu besar untuk database.', error: 'Payload too large' });
            }
            const base64 = buffer.toString('base64');
            const dataUrl = `data:${contentType};base64,${base64}`;
            
            console.log(`[Upload] Using Database Fallback for ${uploadScope} (${buffer.length} bytes)`);
            return json(res, 201, {
                status: 'success',
                url: dataUrl,
                uploaded_by: uploader?.id || null
            });
        }

        // PRIMARY: Direct put to Vercel Blob
        const blob = await put(`${folderPrefix}/${Date.now()}-${filename}`, req, {
            access: 'public',
            contentType: contentType,
        });

        return json(res, 201, {
            status: 'success',
            url: blob.url,
            uploaded_by: uploader?.id || null
        });

    } catch (error) {
        console.error('Upload Error:', error);
        const msg = String(error?.message || error || 'Upload gagal');
        return json(res, 500, { status: 'error', message: msg, error: msg });
    }
};
