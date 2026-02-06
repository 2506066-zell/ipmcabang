const { query } = require('./db');
const { json, cacheHeaders } = require('./_util');
const { requireAdminAuth } = require('./_auth');

async function list(req, res) {
  const page = req.query.page ? Number(req.query.page) : 1;
  const size = req.query.size ? Number(req.query.size) : 200;
  const limit = Math.max(1, Math.min(500, size));
  const offset = Math.max(0, (Math.max(1, page) - 1) * limit);
  const rows = (await query`SELECT created_at AS ts, username, score, total, percent FROM results ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`).rows;
  json(res, 200, { status: 'success', results: rows, page: Math.max(1, page), size: limit }, cacheHeaders(30));
}

async function create(req, res) {
  const { parseJsonBody } = require('./_util');
  const b = parseJsonBody(req);
  const session = String(b.session || '').trim();
  const score = Number(b.score || 0);
  const total = Number(b.total || 0);
  const percent = Math.max(0, Math.min(100, Math.round((total ? (score / total) : 0) * 100)));
  const time_spent = Number(b.time_spent || 0);
  const quiz_set = Number(b.quiz_set || 1);
  const started_at = Number(b.started_at || Date.now());
  const finished_at = Number(b.finished_at || Date.now());
  if (!session) return json(res, 401, { status: 'error', message: 'Unauthorized' });
  const userRow = (await query`SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token=${session} AND s.expires_at > NOW()`).rows[0];
  if (!userRow) return json(res, 401, { status: 'error', message: 'Unauthorized' });
  const COOLDOWN_MS = 30 * 1000;
  const last = (await query`SELECT finished_at FROM results WHERE user_id=${userRow.id} ORDER BY id DESC LIMIT 1`).rows[0];
  if (last && Number(last.finished_at || 0) > 0) {
    const delta = finished_at - Number(last.finished_at);
    if (delta >= 0 && delta < COOLDOWN_MS) {
      return json(res, 429, { status: 'error', message: 'Terlalu cepat. Coba lagi beberapa saat.' });
    }
  }
  const dailyCount = Number((await query`SELECT COUNT(*)::int AS c FROM results WHERE user_id=${userRow.id} AND created_at::date = NOW()::date`).rows[0]?.c || 0);
  const DAILY_LIMIT = 10;
  if (dailyCount >= DAILY_LIMIT) {
    return json(res, 429, { status: 'error', message: 'Batas percobaan harian tercapai.' });
  }
  const ins = await query`INSERT INTO results (username, user_id, score, total, percent, time_spent, quiz_set, started_at, finished_at) VALUES (${userRow.username}, ${userRow.id}, ${score}, ${total}, ${percent}, ${time_spent}, ${quiz_set}, ${started_at}, ${finished_at}) RETURNING id`;
  json(res, 201, { status: 'success', id: ins.rows[0].id, score, total, percent });
}

async function purge(req, res) {
  try { await requireAdminAuth(req); } catch { return json(res, 401, { status: 'error', message: 'Unauthorized' }); }
  await query`DELETE FROM results`;
  json(res, 200, { status: 'success' });
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') return list(req, res);
    if (req.method === 'POST') return create(req, res);
    if (req.method === 'DELETE') return purge(req, res);
    json(res, 405, { status: 'error', message: 'Method not allowed' });
  } catch (e) {
    json(res, 500, { status: 'error', message: String(e.message || e) });
  }
};
