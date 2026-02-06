const { query } = require('./db');
const { json, cacheHeaders, getBearerToken } = require('./_util');

async function list(req, res) {
  const rows = (await query`SELECT created_at AS ts, username, score, total, percent FROM results ORDER BY id DESC LIMIT 200`).rows;
  json(res, 200, { status: 'success', results: rows }, cacheHeaders(30));
}

async function create(req, res) {
  const b = JSON.parse(req.body || '{}');
  const username = String(b.username || '').trim();
  const score = Number(b.score || 0);
  const total = Number(b.total || 0);
  const percent = Number(b.percent || 0);
  const time_spent = Number(b.time_spent || 0);
  const quiz_set = Number(b.quiz_set || 1);
  const started_at = Number(b.started_at || Date.now());
  const finished_at = Number(b.finished_at || Date.now());
  if (!username) return json(res, 400, { status: 'error', message: 'Invalid payload' });
  const ins = await query`INSERT INTO results (username, score, total, percent, time_spent, quiz_set, started_at, finished_at) VALUES (${username}, ${score}, ${total}, ${percent}, ${time_spent}, ${quiz_set}, ${started_at}, ${finished_at}) RETURNING id`;
  json(res, 201, { status: 'success', id: ins.rows[0].id });
}

async function purge(req, res) {
  const token = getBearerToken(req);
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) return json(res, 401, { status: 'error', message: 'Unauthorized' });
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
