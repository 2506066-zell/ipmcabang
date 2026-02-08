const ArticleModel = require('../models/ArticleModel');
const { json, parseJsonBody, cacheHeaders } = require('../api/_util');
const { requireAdminAuth } = require('../api/_auth');

class ArticleController {

    // --- PUBLIC ---

    static async index(req, res) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const page = parseInt(url.searchParams.get('page')) || 1;
        const limit = parseInt(url.searchParams.get('size')) || 10;
        const search = url.searchParams.get('search') || '';
        const sort = url.searchParams.get('sort') || 'newest';
        const category = url.searchParams.get('category') || 'all';

        try {
            const result = await ArticleModel.findAll({ page, limit, search, sort, category });
            return json(res, 200, { status: 'success', ...result }, cacheHeaders(30)); // Cache for 30s
        } catch (e) {
            console.error(e);
            return json(res, 500, { status: 'error', message: 'Failed to fetch articles' });
        }
    }

    static async show(req, res) {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const id = url.searchParams.get('id');
        const slug = url.searchParams.get('slug');

        try {
            let article = null;
            if (id) article = await ArticleModel.findById(id);
            else if (slug) article = await ArticleModel.findBySlug(slug);

            if (!article) return json(res, 404, { status: 'error', message: 'Article not found' });

            // Increment views async (don't await)
            ArticleModel.incrementViews(article.id).catch(err => console.error('Failed to inc views', err));

            return json(res, 200, { status: 'success', article }, cacheHeaders(60));
        } catch (e) {
            return json(res, 500, { status: 'error', message: e.message });
        }
    }

    // --- ADMIN ---

    static async store(req, res) {
        try {
            const user = await requireAdminAuth(req);
        } catch (e) {
            return json(res, 401, { status: 'error', message: 'Unauthorized' });
        }

        const body = parseJsonBody(req);
        // Validation moved to here from Model for better error responses
        if (!body.title) return json(res, 400, { status: 'error', message: 'Title is required' });
        if (!body.content) return json(res, 400, { status: 'error', message: 'Content is required' });

        // Image validation (Size check should be done on client, but here we check payload size roughly)
        // Check if body.image is base64 and too large? Vercel has 4.5MB payload limit, so explicit check:
        if (body.image && body.image.length > 200000) { // ~150KB base64 encoded is approx 200KB string
            // 150 * 1024 * 1.33 = ~204KB. So 200,000 chars is safe limit.
            return json(res, 400, { status: 'error', message: 'Image too large (Max 150KB)' });
        }

        try {
            const article = await ArticleModel.create({
                title: body.title,
                content: body.content,
                author: body.author || 'Admin',
                image: body.image,
                publish_date: body.publish_date || new Date(),
                category: body.category || 'Umum'
            });
            return json(res, 201, { status: 'success', article });
        } catch (e) {
            console.error(e);
            return json(res, 500, { status: 'error', message: 'Failed to create article: ' + e.message });
        }
    }

    static async update(req, res) {
        try { await requireAdminAuth(req); } catch { return json(res, 401, { status: 'error', message: 'Unauthorized' }); }

        const body = parseJsonBody(req);
        const id = body.id || req.query.id;
        if (!id) return json(res, 400, { status: 'error', message: 'ID required' });

        if (body.image && body.image.length > 200000) {
            return json(res, 400, { status: 'error', message: 'Image too large (Max 150KB)' });
        }

        try {
            const article = await ArticleModel.update(id, body);
            if (!article) return json(res, 404, { status: 'error', message: 'Article not found' });
            return json(res, 200, { status: 'success', article });
        } catch (e) {
            return json(res, 500, { status: 'error', message: 'Update failed: ' + e.message });
        }
    }

    static async destroy(req, res) {
        try { await requireAdminAuth(req); } catch { return json(res, 401, { status: 'error', message: 'Unauthorized' }); }

        const id = req.query.id || parseJsonBody(req).id;
        if (!id) return json(res, 400, { status: 'error', message: 'ID required' });

        try {
            await ArticleModel.delete(id);
            return json(res, 200, { status: 'success', message: 'Article deleted' });
        } catch (e) {
            return json(res, 500, { status: 'error', message: 'Delete failed' });
        }
    }
}

module.exports = ArticleController;
