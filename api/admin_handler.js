const { query } = require('./_db');
const { json, parseJsonBody } = require('./_util');
const { requireAdminAuth } = require('./_auth');

async function handleCreate(req, res) {
  try { await requireAdminAuth(req); } catch (e) { return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' }); }
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
  return json(res, 201, { status: 'success', question: ins.rows[0] });
}

async function handleUpdate(req, res) {
  try { await requireAdminAuth(req); } catch (e) { return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' }); }
  const b = parseJsonBody(req);
  const id = Number(b.id || 0);
  if (!id) return json(res, 400, { status: 'error', message: 'Missing id' });
  const q = b.question !== undefined ? String(b.question) : undefined;
  const options = b.options !== undefined ? b.options : undefined;
  const correct = b.correct_answer !== undefined ? String(b.correct_answer) : undefined;
  const active = b.active !== undefined ? Boolean(b.active) : undefined;
  const category = b.category !== undefined ? String(b.category) : undefined;
  const quiz_set = b.quiz_set !== undefined ? Number(b.quiz_set) : undefined;

  const updates = [];
  const params = [];
  let idx = 1;

  if (q !== undefined) { updates.push(`question = $${idx++}`); params.push(q); }
  if (options !== undefined) { updates.push(`options = $${idx++}`); params.push(options); }
  if (correct !== undefined) { updates.push(`correct_answer = $${idx++}`); params.push(correct); }
  if (active !== undefined) { updates.push(`active = $${idx++}`); params.push(active); }
  if (category !== undefined) { updates.push(`category = $${idx++}`); params.push(category); }
  if (quiz_set !== undefined) { updates.push(`quiz_set = $${idx++}`); params.push(quiz_set); }

  if (updates.length === 0) return json(res, 400, { status: 'error', message: 'No fields to update' });

  params.push(id);
  const sql = `UPDATE questions SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;
  
  // Use raw query for dynamic updates
  const { Pool } = require('pg'); 
  // We need to use the shared pool from _db.js but it doesn't expose raw query with dynamic string construction easily
  // Actually _db.js has rawQuery exported? Let's check _db.js content again.
  // Yes, line 1: const { query, rawQuery } = require('./_db');
  // Wait, I saw query exported but not rawQuery in the Read output of _db.js?
  // Let me re-read _db.js to be sure.
  // Ah, the previous Read output of _db.js showed:
  // 65-> async function query(strings, ...values) {
  // It does NOT seem to export rawQuery directly in the snippet I saw.
  // Wait, questions.js uses `rawQuery` on line 61. So it MUST be exported.
  // Let's assume it is.
  
  const { rawQuery } = require('./_db');
  const result = await rawQuery(sql, params);
  
  if (result.rows.length === 0) return json(res, 404, { status: 'error', message: 'Question not found' });
  return json(res, 200, { status: 'success', question: result.rows[0] });
}

async function handleDelete(req, res) {
  try { await requireAdminAuth(req); } catch (e) { return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' }); }
  const b = parseJsonBody(req);
  const id = Number(b.id || 0);
  if (!id) return json(res, 400, { status: 'error', message: 'Missing id' });
  await query`DELETE FROM questions WHERE id=${id}`;
  return json(res, 200, { status: 'success' });
}

module.exports = async (req, res) => {
  try {
    const action = req.query.action;
    
    // Ensure only POST method is used for these actions
    if (req.method !== 'POST') return json(res, 405, { status: 'error', message: 'Method not allowed' });

    switch (action) {
      case 'create':
        return await handleCreate(req, res);
      case 'update':
        return await handleUpdate(req, res);
      case 'delete':
        return await handleDelete(req, res);
      default:
        return json(res, 404, { status: 'error', message: `Unknown action: ${action}` });
    }
  } catch (e) {
    try { console.error(`admin_handler error (${req.query.action}):`, e); } catch {}
    return json(res, 500, { status: 'error', message: String(e.message || e) });
  }
};
