const { query, rawQuery } = require('./_db');
const { json } = require('./_util');

module.exports = async (req, res) => {
    try {
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
