const { query } = require('./_db');
const { json } = require('./_util');
const { requireAdminAuth } = require('./_auth');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return json(res, 405, { status: 'error', message: 'Method not allowed' });
    try { await requireAdminAuth(req); } catch { return json(res, 401, { status: 'error', message: 'Unauthorized' }); }
    const body = JSON.parse(req.body || '{}');
    const quiz_set = Number(body.quiz_set || 0);
    if (!quiz_set) return json(res, 400, { status: 'error', message: 'Missing quiz_set' });
    await query`DELETE FROM results WHERE quiz_set=${quiz_set}`;
    json(res, 200, { status: 'success' });
  } catch (e) {
    try { console.error('resetSet endpoint error:', e); } catch {}
    json(res, 500, { status: 'error', message: String(e.message || e) });
  }
};
