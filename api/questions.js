const { query } = require('./db');
const { json, cacheHeaders, getBearerToken } = require('./_util');

async function list(req, res) {
  const set = req.query.set ? Number(req.query.set) : null;
  const rows = set ? (await query`SELECT * FROM questions WHERE quiz_set=${set} ORDER BY id DESC`).rows : (await query`SELECT * FROM questions ORDER BY id DESC`).rows;
  json(res, 200, { status: 'success', questions: rows }, cacheHeaders(60));
}

async function create(req, res) {
  const token = getBearerToken(req);
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) return json(res, 401, { status: 'error', message: 'Unauthorized' });
  const b = JSON.parse(req.body || '{}');
  const q = String(b.question || '').trim();
  const options = b.options || {};
  const correct = String(b.correct_answer || '').trim();
  const active = Boolean(b.active !== false);
  const category = b.category ? String(b.category) : null;
  const quiz_set = Number(b.quiz_set || 1);
  if (!q || !options.a || !options.b || !options.d || !['a','b','c','d'].includes(correct)) return json(res, 400, { status: 'error', message: 'Invalid payload' });
  const ins = await query`INSERT INTO questions (question, options, correct_answer, active, category, quiz_set) VALUES (${q}, ${options}, ${correct}, ${active}, ${category}, ${quiz_set}) RETURNING *`;
  json(res, 201, { status: 'success', question: ins.rows[0] });
}

async function update(req, res) {
  const token = getBearerToken(req);
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) return json(res, 401, { status: 'error', message: 'Unauthorized' });
  const b = JSON.parse(req.body || '{}');
  const id = Number(b.id || 0);
  if (!id) return json(res, 400, { status: 'error', message: 'Missing id' });
  const q = b.question !== undefined ? String(b.question) : undefined;
  const options = b.options !== undefined ? b.options : undefined;
  const correct = b.correct_answer !== undefined ? String(b.correct_answer) : undefined;
  const active = b.active !== undefined ? Boolean(b.active) : undefined;
  const category = b.category !== undefined ? String(b.category) : undefined;
  const quiz_set = b.quiz_set !== undefined ? Number(b.quiz_set) : undefined;
  const prev = (await query`SELECT * FROM questions WHERE id=${id}`).rows[0];
  if (!prev) return json(res, 404, { status: 'error', message: 'Not found' });
  const upd = await query`UPDATE questions SET question=${q ?? prev.question}, options=${options ?? prev.options}, correct_answer=${correct ?? prev.correct_answer}, active=${active ?? prev.active}, category=${category ?? prev.category}, quiz_set=${quiz_set ?? prev.quiz_set} WHERE id=${id} RETURNING *`;
  json(res, 200, { status: 'success', question: upd.rows[0] });
}

async function remove(req, res) {
  const token = getBearerToken(req);
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) return json(res, 401, { status: 'error', message: 'Unauthorized' });
  const id = Number(req.query.id || 0);
  if (!id) return json(res, 400, { status: 'error', message: 'Missing id' });
  await query`DELETE FROM questions WHERE id=${id}`;
  json(res, 200, { status: 'success' });
}

module.exports = async (req, res) => {
  if (req.method === 'GET') return list(req, res);
  if (req.method === 'POST') return create(req, res);
  if (req.method === 'PUT') return update(req, res);
  if (req.method === 'DELETE') return remove(req, res);
  json(res, 405, { status: 'error', message: 'Method not allowed' });
};
