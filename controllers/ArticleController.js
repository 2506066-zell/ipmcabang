const ArticleModel = require('../models/ArticleModel');
const { json, parseJsonBody, cacheHeaders } = require('../api/_util');
const { requireAdminAuth } = require('../api/_auth');

function sanitizePlainText(value, max = 255) {
    return String(value || '')
        .replace(/[\u0000-\u001F\u007F]/g, ' ')
        .trim()
        .slice(0, max);
}

function sanitizeImageUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^data:image\//i.test(raw)) return raw;
    if (/^(https?:)?\/\//i.test(raw)) return raw;
    if (raw.startsWith('/')) return raw;
    return '';
}

function sanitizeArticleHtml(value) {
    const input = String(value || '');
    if (!input) return '';

    return input
        .replace(/<\s*(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
        .replace(/<\s*(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select)[^>]*\/?\s*>/gi, '')
        .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
        .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
        .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
        .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi, ' $1="#"')
        .replace(/\s(href|src)\s*=\s*(['"])\s*data:(?!image\/)[\s\S]*?\2/gi, ' $1="#"')
        .trim();
}

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
                title: sanitizePlainText(body.title, 180),
                content: sanitizeArticleHtml(body.content),
                author: sanitizePlainText(body.author || 'Admin', 120),
                image: sanitizeImageUrl(body.image),
                publish_date: body.publish_date || new Date(),
                category: sanitizePlainText(body.category || 'Umum', 80)
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
            const patch = {};
            if (body.title !== undefined) patch.title = sanitizePlainText(body.title, 180);
            if (body.content !== undefined) patch.content = sanitizeArticleHtml(body.content);
            if (body.author !== undefined) patch.author = sanitizePlainText(body.author, 120);
            if (body.image !== undefined) patch.image = sanitizeImageUrl(body.image);
            if (body.publish_date !== undefined) patch.publish_date = body.publish_date;
            if (body.category !== undefined) patch.category = sanitizePlainText(body.category, 80);

            const article = await ArticleModel.update(id, patch);
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
