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

// --- NEW ADMIN FUNCTIONS ---

async function handleGetUsersStatus(req, res) {
    try { await requireAdminAuth(req); } catch (e) { return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' }); }
    
    // Get all users
    const users = (await query`SELECT id, username, nama_panjang, role FROM users ORDER BY username ASC`).rows;
    
    // Get attempts per user per quiz set
    const attempts = (await query`SELECT user_id, quiz_set, score, total FROM results`).rows;
    
    // Map attempts to user
    // structure: { [userId]: { [quizSetId]: { score, total } } }
    const attemptMap = {};
    attempts.forEach(a => {
        if (!attemptMap[a.user_id]) attemptMap[a.user_id] = {};
        attemptMap[a.user_id][a.quiz_set] = { score: a.score, total: a.total };
    });
    
    const data = users.map(u => ({
        id: u.id,
        username: u.username,
        nama_panjang: u.nama_panjang,
        attempts: attemptMap[u.id] || {}
    }));
    
    return json(res, 200, { status: 'success', users: data });
}

async function handleResetAttempt(req, res) {
    let adminId = null;
    try { 
        const admin = await requireAdminAuth(req); 
        adminId = admin.id;
    } catch (e) { 
        return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' }); 
    }
    const b = parseJsonBody(req);
    const userId = Number(b.user_id);
    const quizSet = Number(b.quiz_set);
    
    if (!userId || !quizSet) return json(res, 400, { status: 'error', message: 'User ID dan Quiz Set wajib diisi' });
    
    // Log Activity
    const details = { target_user_id: userId, quiz_set: quizSet };
    try {
        await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'RESET_ATTEMPT', ${details})`;
    } catch (e) { console.error('Failed to log activity:', e); }

    // Create Notification
    const msg = `Admin telah mereset status pengerjaan Kuis Set ${quizSet} Anda. Anda dapat mengerjakannya kembali.`;
    try {
        await query`INSERT INTO notifications (user_id, message) VALUES (${userId}, ${msg})`;
    } catch (e) { console.error('Failed to create notification:', e); }
    
    // Delete result for this user and quiz set
    await query`DELETE FROM results WHERE user_id=${userId} AND quiz_set=${quizSet}`;
    
    return json(res, 200, { status: 'success', message: 'Attempt berhasil direset.' });
}

async function handleGetActivityLogs(req, res) {
    try { await requireAdminAuth(req); } catch (e) { return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' }); }
    
    const logs = (await query`
        SELECT l.id, l.action, l.details, l.created_at, u.username as admin_name 
        FROM activity_logs l 
        LEFT JOIN users u ON l.admin_id = u.id 
        ORDER BY l.created_at DESC 
        LIMIT 100
    `).rows;
    
    return json(res, 200, { status: 'success', logs });
}

module.exports = async (req, res) => {
  try {
    const action = req.query.action;
    
    if (req.method !== 'POST') {
        // Allow GET for fetching user status if action is usersStatus
        if (req.method === 'GET' && action === 'usersStatus') {
            return await handleGetUsersStatus(req, res);
        }
        if (req.method === 'GET' && action === 'activityLogs') {
            return await handleGetActivityLogs(req, res);
        }
        return json(res, 405, { status: 'error', message: 'Method not allowed' });
    }

    switch (action) {
      case 'create':
        return await handleCreate(req, res);
      case 'update':
        return await handleUpdate(req, res);
      case 'delete':
        return await handleDelete(req, res);
      case 'usersStatus': // Can be POST too if we want
        return await handleGetUsersStatus(req, res);
      case 'resetAttempt':
        return await handleResetAttempt(req, res);
      default:
        return json(res, 404, { status: 'error', message: `Unknown action: ${action}` });
    }
  } catch (e) {
    try { console.error(`admin_handler error (${req.query.action}):`, e); } catch {}
    return json(res, 500, { status: 'error', message: String(e.message || e) });
  }
};
