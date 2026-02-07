const { query, getConnHost } = require('./_db');
const { json, parseJsonBody, cacheHeaders } = require('./_util');

module.exports = async (req, res) => {
  try {
    const action = req.query.action || '';
    
    // Health Checks
    if (req.method === 'GET' && action === 'health') {
        return json(res, 200, { status: 'success', ok: true, ts: Date.now() }, cacheHeaders(10));
    }
    
    if (req.method === 'GET' && action === 'dbHealth') {
        const now = (await query`SELECT NOW() AS now`).rows[0]?.now;
        const host = getConnHost();
        return json(res, 200, { status: 'success', db: 'ok', host, now });
    }

    if (req.method !== 'POST') return json(res, 405, { status: 'error', message: 'Method not allowed' });
    const body = parseJsonBody(req);
    const bodyAction = String(body.action || '').trim();
    
    if (bodyAction === 'publicCanAttempt') {
      const session = String(body.session || '').trim();
      if (!session) return json(res, 401, { status: 'error', message: 'Unauthorized' });
      const row = (await query`SELECT s.id FROM sessions s WHERE s.token=${session} AND s.expires_at > NOW()`).rows[0];
      if (!row) return json(res, 401, { status: 'error', message: 'Unauthorized' });
      return json(res, 200, { status: 'success' });
    }
    if (bodyAction === 'logEvent') {
      return json(res, 202, { status: 'success' });
    }
    json(res, 400, { status: 'error', message: 'Invalid action' });
  } catch (e) {
    json(res, 500, { status: 'error', message: String(e.message || e) });
  }
};
