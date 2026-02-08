const { query, rawQuery } = require('../api/_db');

class ArticleModel {
    /**
     * Generate a unique slug from title
     * @param {string} title 
     * @param {number|null} excludeId - ID to exclude from uniqueness check (for update)
     */
    static async generateSlug(title, excludeId = null) {
        let baseSlug = title.toLowerCase()
            .replace(/[^\w\s-]/g, '') // Remove non-word chars
            .replace(/[\s_-]+/g, '-') // Replace multiple spaces/hyphens with single hyphen
            .replace(/^-+|-+$/g, ''); // Trim leading/trailing hyphens

        if (!baseSlug) baseSlug = 'article-' + Date.now();

        let slug = baseSlug;
        let counter = 1;

        while (true) {
            // Check existence
            let q = `SELECT id FROM articles WHERE slug = $1`;
            const params = [slug];

            if (excludeId) {
                q += ` AND id != $2`;
                params.push(excludeId);
            }

            const existing = (await rawQuery(q, params)).rows[0];
            if (!existing) break;

            slug = `${baseSlug}-${counter}`;
            counter++;
        }

        return slug;
    }

    static async findAll({ search, category, sort, page = 1, limit = 10 }) {
        const offset = (page - 1) * limit;
        const params = [];
        let whereClauses = [];
        let idx = 1;

        if (search) {
            whereClauses.push(`(LOWER(title) LIKE $${idx} OR LOWER(author) LIKE $${idx})`);
            params.push(`%${search.toLowerCase()}%`);
            idx++;
        }

        if (category && category !== 'all') {
            whereClauses.push(`LOWER(category) = $${idx}`);
            params.push(category.toLowerCase());
            idx++;
        }

        const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

        let orderSQL = 'ORDER BY publish_date DESC';
        if (sort === 'popular') orderSQL = 'ORDER BY views DESC, publish_date DESC';
        if (sort === 'oldest') orderSQL = 'ORDER BY publish_date ASC';

        // Count total
        const countRes = await rawQuery(`SELECT COUNT(id) as total FROM articles ${whereSQL}`, params);
        const total = parseInt(countRes.rows[0].total || 0);

        // Fetch data
        const limitSQL = `LIMIT $${idx} OFFSET $${idx + 1}`;
        params.push(limit, offset);

        const sql = `SELECT * FROM articles ${whereSQL} ${orderSQL} ${limitSQL}`;
        const { rows } = await rawQuery(sql, params);

        return { articles: rows, total, page, limit, totalPages: Math.ceil(total / limit) };
    }

    static async findById(id) {
        const { rows } = await query`SELECT * FROM articles WHERE id=${id}`;
        return rows[0];
    }

    static async findBySlug(slug) {
        const { rows } = await query`SELECT * FROM articles WHERE slug=${slug}`;
        return rows[0];
    }

    static async create(data) {
        // data: { title, content, author, image, publish_date, category }
        const slug = await this.generateSlug(data.title);

        const { rows } = await query`
            INSERT INTO articles (title, slug, content, author, image, publish_date, category)
            VALUES (${data.title}, ${slug}, ${data.content}, ${data.author}, ${data.image}, ${data.publish_date}, ${data.category})
            RETURNING *
        `;
        return rows[0];
    }

    static async update(id, data) {
        // data: { title, content, author, image, publish_date, category }
        const updates = [];
        const params = [];
        let idx = 1;

        if (data.title) {
            const slug = await this.generateSlug(data.title, id);
            updates.push(`title=$${idx++}`); params.push(data.title);
            updates.push(`slug=$${idx++}`); params.push(slug);
        }
        if (data.content) { updates.push(`content=$${idx++}`); params.push(data.content); }
        if (data.author) { updates.push(`author=$${idx++}`); params.push(data.author); }
        if (data.image) { updates.push(`image=$${idx++}`); params.push(data.image); }
        if (data.publish_date) { updates.push(`publish_date=$${idx++}`); params.push(data.publish_date); }
        if (data.category) { updates.push(`category=$${idx++}`); params.push(data.category); }

        if (updates.length === 0) return null;

        params.push(id);
        const sql = `UPDATE articles SET ${updates.join(', ')} WHERE id=$${idx} RETURNING *`;
        const { rows } = await rawQuery(sql, params);
        return rows[0];
    }

    static async delete(id) {
        await query`DELETE FROM articles WHERE id=${id}`;
        return true;
    }

    static async incrementViews(id) {
        await query`UPDATE articles SET views = views + 1 WHERE id=${id}`;
        return true;
    }
}

module.exports = ArticleModel;
