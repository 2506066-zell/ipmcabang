const ArticleController = require('../controllers/ArticleController');
const { json } = require('./_util');

module.exports = async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        switch (req.method) {
            case 'GET':
                if (req.query.id || req.query.slug) {
                    return await ArticleController.show(req, res);
                }
                return await ArticleController.index(req, res);
            case 'POST':
                return await ArticleController.store(req, res);
            case 'PUT':
                return await ArticleController.update(req, res);
            case 'DELETE':
                return await ArticleController.destroy(req, res);
            default:
                return json(res, 405, { status: 'error', message: 'Method Not Allowed' });
        }
    } catch (e) {
        console.error('API Error:', e);
        return json(res, 500, { status: 'error', message: 'Internal Server Error' });
    }
};
