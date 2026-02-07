const { query, rawQuery } = require('./_db');
const { json, cacheHeaders } = require('./_util');
const { requireAdminAuth } = require('./_auth');

async function list(req, res) {
  const mode = req.query.mode ? String(req.query.mode).trim() : '';
  
  if (mode === 'summary') {
    // Return list of quiz sets and question counts
    const rows = (await query`
      SELECT quiz_set, COUNT(*)::int as count 
      FROM questions 
      WHERE active = true 
      GROUP BY quiz_set 
      ORDER BY quiz_set ASC
    `).rows;
    return json(res, 200, { status: 'success', sets: rows }, cacheHeaders(60));
  }

  if (mode === 'categories') {
    const rows = (await query`
      SELECT DISTINCT category 
      FROM questions 
      WHERE category IS NOT NULL AND category != ''
      ORDER BY category ASC
    `).rows;
    return json(res, 200, { status: 'success', categories: rows.map(r => r.category) }, cacheHeaders(300));
  }

  const set = req.query.set ? Number(req.query.set) : null;
  const category = req.query.category ? String(req.query.category).trim() : '';
  const search = req.query.search ? String(req.query.search).trim() : '';
  
  const page = req.query.page ? Number(req.query.page) : 1;
  const size = req.query.size ? Number(req.query.size) : 50; // Default size 50
  
  const limit = Math.max(1, Math.min(500, size));
  const offset = Math.max(0, (page - 1) * limit);

  let whereClauses = [];
  let params = [];
  let pIdx = 1;

  if (set) {
      whereClauses.push(`quiz_set = $${pIdx++}`);
      params.push(set);
  }
  if (category && category !== 'all') {
      whereClauses.push(`LOWER(category) = $${pIdx++}`);
      params.push(category.toLowerCase());
  }
  if (search) {
      whereClauses.push(`(LOWER(question) LIKE $${pIdx} OR LOWER(options::text) LIKE $${pIdx})`);
      params.push(`%${search.toLowerCase()}%`);
      pIdx++;
  }

  const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
  
  // Count
  const countRes = await rawQuery(`SELECT COUNT(*)::int as total FROM questions ${whereSql}`, params);
  const total = countRes.rows[0]?.total || 0;
  
  // Data
  const dataRes = await rawQuery(`SELECT * FROM questions ${whereSql} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`, params);
  
  json(res, 200, { 
      status: 'success', 
      questions: dataRes.rows, 
      total: total,
      page: page,
      size: limit 
  }, cacheHeaders(0));
}

async function create(req, res) {
  try { await requireAdminAuth(req); } catch { return json(res, 401, { status: 'error', message: 'Unauthorized' }); }
  const { parseJsonBody } = require('./_util');
  const b = parseJsonBody(req);
  const q = String(b.question || '').trim();
  const options = b.options || {};
  const correct = String(b.correct_answer || '').trim();
  const active = Boolean(b.active !== false);
  const category = b.category ? String(b.category) : null;
  const quiz_set = Number(b.quiz_set || 1);
  if (!q || !options.a || !options.b || !options.d) return json(res, 400, { status: 'error', message: 'Opsi A, B, D dan pertanyaan wajib diisi' });
  if (!['a','b','c','d'].includes(correct)) return json(res, 400, { status: 'error', message: 'Jawaban benar harus A/B/C/D' });
  const ins = await query`INSERT INTO questions (question, options, correct_answer, active, category, quiz_set) VALUES (${q}, ${options}, ${correct}, ${active}, ${category}, ${quiz_set}) RETURNING *`;
  json(res, 201, { status: 'success', question: ins.rows[0] });
}

async function update(req, res) {
  try { await requireAdminAuth(req); } catch { return json(res, 401, { status: 'error', message: 'Unauthorized' }); }
  const b = parseJsonBody(req);
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
  try { await requireAdminAuth(req); } catch { return json(res, 401, { status: 'error', message: 'Unauthorized' }); }
  const id = Number(req.query.id || 0);
  if (!id) return json(res, 400, { status: 'error', message: 'Missing id' });
  await query`DELETE FROM questions WHERE id=${id}`;
  json(res, 200, { status: 'success' });
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') return list(req, res);
    if (req.method === 'POST') {
      const { parseJsonBody } = require('./_util');
      const b = parseJsonBody(req);
      if (b && b.id) return update(req, res);
      return create(req, res);
    }
    if (req.method === 'PUT') return update(req, res);
    if (req.method === 'DELETE') return remove(req, res);
    json(res, 405, { status: 'error', message: 'Method not allowed' });
  } catch (e) {
    try { console.error('questions endpoint error:', e); } catch {}
    json(res, 500, { status: 'error', message: String(e.message || e) });
  }
};
