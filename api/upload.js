const { put } = require('@vercel/blob'); // assuming package is available in vercel env

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

        // In a real Vercel environment, we use the BLOB_READ_WRITE_TOKEN env var
        // If it's missing (development), we mock it.
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
            console.warn('BLOB_READ_WRITE_TOKEN missing. Using mock upload.');
            // Mock success for development
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
