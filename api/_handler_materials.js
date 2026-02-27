const { query, rawQuery } = require('./_db');
const { json, parseJsonBody } = require('./_util');
const { getSessionUser } = require('./_auth');

module.exports = async (req, res) => {
    try {
        req.query = req.query || {};
        const action = String(req.query.action || '').trim();

        if (action === 'lastRead') {
            if (req.method === 'GET') {
                const user = await getSessionUser(req);
                if (!user) return json(res, 200, { status: 'success', last_read: null });

                const row = (await query`
                    SELECT material_key, title, url, file_type, thumbnail, page, total_pages, updated_at
                    FROM material_last_reads
                    WHERE user_id=${user.id}
                    LIMIT 1
                `).rows[0] || null;

                return json(res, 200, { status: 'success', last_read: row });
            }

            if (req.method === 'POST') {
                const user = await getSessionUser(req);
                if (!user) return json(res, 401, { status: 'error', message: 'Unauthorized' });

                const body = parseJsonBody(req);
                const title = String(body.title || '').trim();
                const url = String(body.url || '').trim();
                const materialKey = String(body.key || '').trim();
                const fileType = String(body.file_type || '').trim();
                const thumbnail = String(body.thumbnail || '').trim();
                const page = Math.max(0, Number(body.page) || 0);
                const totalPages = Math.max(0, Number(body.total_pages) || 0);

                if (!title || !url) {
                    return json(res, 400, { status: 'error', message: 'title dan url wajib diisi' });
                }

                await query`
                    INSERT INTO material_last_reads (user_id, material_key, title, url, file_type, thumbnail, page, total_pages, updated_at)
                    VALUES (${user.id}, ${materialKey}, ${title}, ${url}, ${fileType}, ${thumbnail}, ${page}, ${totalPages}, NOW())
                    ON CONFLICT (user_id)
                    DO UPDATE SET
                        material_key = EXCLUDED.material_key,
                        title = EXCLUDED.title,
                        url = EXCLUDED.url,
                        file_type = EXCLUDED.file_type,
                        thumbnail = EXCLUDED.thumbnail,
                        page = EXCLUDED.page,
                        total_pages = EXCLUDED.total_pages,
                        updated_at = NOW()
                `;

                return json(res, 200, { status: 'success' });
            }

            return json(res, 405, { status: 'error', message: 'Method not allowed' });
        }

        if (req.method !== 'GET') return json(res, 405, { status: 'error', message: 'Method not allowed' });

        const category = req.query.category ? String(req.query.category).trim() : '';
        const search = req.query.search ? String(req.query.search).trim() : '';
        const page = req.query.page ? Number(req.query.page) : 1;
        const size = req.query.size ? Number(req.query.size) : 20;

        const limit = Math.max(1, Math.min(100, size));
        const offset = Math.max(0, (page - 1) * limit);

        let whereClauses = ['active = true'];
        let params = [];
        let pIdx = 1;

        if (category && category !== 'all') {
            whereClauses.push(`LOWER(category) = $${pIdx++}`);
            params.push(category.toLowerCase());
        }
        if (search) {
            whereClauses.push(`(LOWER(title) LIKE $${pIdx} OR LOWER(description) LIKE $${pIdx})`);
            params.push(`%${search.toLowerCase()}%`);
            pIdx++;
        }

        const whereSql = 'WHERE ' + whereClauses.join(' AND ');

        const countRes = await rawQuery(`SELECT COUNT(*)::int as total FROM materials ${whereSql}`, params);
        const total = countRes.rows[0]?.total || 0;

        const dataRes = await rawQuery(`SELECT * FROM materials ${whereSql} ORDER BY updated_at DESC LIMIT ${limit} OFFSET ${offset}`, params);

        return json(res, 200, {
            status: 'success',
            materials: dataRes.rows,
            total,
            page
        });
    } catch (e) {
        return json(res, 500, { status: 'error', message: e.message });
    }
};
