let put;
try {
    ({ put } = require('@vercel/blob'));
} catch (e) {
    put = null;
    console.warn('Missing @vercel/blob dependency.');
}

// Helper for standard JSON responses
const json = (res, status, data) => {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = status;
    res.end(JSON.stringify(data));
};

module.exports = async (req, res) => {
    if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

    try {
        const filename = req.headers['x-filename'] || 'upload';
        const contentType = req.headers['content-type'];

        // Authorization check (simplified)
        const token = req.headers['authorization'];
        if (!token) return json(res, 401, { error: 'Unauthorized' });

        // If blob client unavailable or token missing, mock success for safety
        if (!put || !process.env.BLOB_READ_WRITE_TOKEN) {
            console.warn('Upload fallback: missing blob client or token.');
            return json(res, 201, {
                status: 'success',
                url: `https://mock-storage.vercel.app/${filename}`,
                mock: true
            });
        }

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
        return json(res, 500, { error: error.message });
    }
};
