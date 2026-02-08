const { query, rawQuery } = require('./_db');
const { json, cacheHeaders, parseJsonBody } = require('./_util');
const { requireAdminAuth } = require('./_auth');

async function list(req, res) {
    const page = req.query.page ? Number(req.query.page) : 1;
    const size = req.query.size ? Number(req.query.size) : 200;
    const limit = Math.max(1, Math.min(500, size));
    const offset = Math.max(0, (Math.max(1, page) - 1) * limit);

    const queryText = `
    SELECT id, created_at AS ts, username, score, total, percent, time_spent
    FROM results
    WHERE username IS NOT NULL AND username != ''
    ORDER BY score DESC, time_spent ASC, created_at ASC
    LIMIT $1 OFFSET $2
  `;

    try {
        const result = await rawQuery(queryText, [limit, offset]);
        return json(res, 200, { status: 'success', results: result.rows, page: Math.max(1, page), size: limit }, cacheHeaders(0));
    } catch (e) {
        return json(res, 500, { status: 'error', message: e.message });
    }
}

async function create(req, res) {
    const b = parseJsonBody(req);
    const session = String(b.session || '').trim();
    const quiz_set = Number(b.quiz_set || 1);
    const time_spent = Number(b.time_spent || 0);
    const userAnswers = b.answers || {};

    if (!session) return json(res, 401, { status: 'error', message: 'Unauthorized' });

    const userRow = (await query`SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token=${session} AND s.expires_at > NOW()`).rows[0];
    if (!userRow) return json(res, 401, { status: 'error', message: 'Unauthorized' });

    const questions = (await query`SELECT id, correct_answer FROM questions WHERE quiz_set=${quiz_set} AND active=true`).rows;
    if (!questions.length) return json(res, 400, { status: 'error', message: 'Set soal tidak ditemukan atau tidak aktif.' });

    let score = 0;
    let total = questions.length;
    questions.forEach(q => {
        const uAns = (userAnswers[q.id] || '').toLowerCase().trim();
        const cAns = (q.correct_answer || '').toLowerCase().trim();
        if (uAns && cAns && uAns === cAns) score++;
    });

    const percent = Math.round((score / total) * 100);
    const finished_at = Date.now();
    const started_at = finished_at - (time_spent * 1000);
    const COOLDOWN_MS = 10 * 1000;

    const recentDup = (await query`SELECT id FROM results WHERE user_id=${userRow.id} AND quiz_set=${quiz_set} AND score=${score} AND created_at > NOW() - INTERVAL '10 seconds'`).rows[0];
    if (recentDup) return json(res, 200, { status: 'success', id: recentDup.id, score, total, percent, idempotent: true });

    const last = (await query`SELECT finished_at FROM results WHERE user_id=${userRow.id} ORDER BY id DESC LIMIT 1`).rows[0];
    if (last && Number(last.finished_at || 0) > 0) {
        const delta = finished_at - Number(last.finished_at);
        if (delta >= 0 && delta < COOLDOWN_MS) return json(res, 429, { status: 'error', message: 'Terlalu cepat. Harap tunggu sebentar.' });
    }

    const ins = await query`INSERT INTO results (username, user_id, score, total, percent, time_spent, quiz_set, started_at, finished_at) VALUES (${userRow.username}, ${userRow.id}, ${score}, ${total}, ${percent}, ${time_spent}, ${quiz_set}, ${started_at}, ${finished_at}) RETURNING id`;
    return json(res, 201, { status: 'success', id: ins.rows[0].id, score, total, percent });
}

async function purge(req, res) {
    try { await requireAdminAuth(req); } catch { return json(res, 401, { status: 'error', message: 'Unauthorized' }); }
    await query`DELETE FROM results`;
    return json(res, 200, { status: 'success' });
}

module.exports = async (req, res) => {
    try {
        if (req.method === 'GET') return await list(req, res);
        if (req.method === 'POST') return await create(req, res);
        if (req.method === 'DELETE') return await purge(req, res);
        return json(res, 405, { status: 'error', message: 'Method not allowed' });
    } catch (e) {
        return json(res, 500, { status: 'error', message: String(e.message || e) });
    }
};
