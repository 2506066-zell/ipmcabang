const { query } = require('./db');
const { json, parseJsonBody } = require('./_util');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return json(res, 405, { status: 'error', message: 'Method not allowed' });
    const body = parseJsonBody(req);
    const action = String(body.action || '').trim();
    if (action === 'publicCanAttempt') {
      const session = String(body.session || '').trim();
      if (!session) return json(res, 401, { status: 'error', message: 'Unauthorized' });
      const row = (await query`SELECT s.id FROM sessions s WHERE s.token=${session} AND s.expires_at > NOW()`).rows[0];
      if (!row) return json(res, 401, { status: 'error', message: 'Unauthorized' });
      return json(res, 200, { status: 'success' });
    }
    if (action === 'logEvent') {
      return json(res, 202, { status: 'success' });
    }
    json(res, 400, { status: 'error', message: 'Invalid action' });
  } catch (e) {
    json(res, 500, { status: 'error', message: String(e.message || e) });
  }
};
