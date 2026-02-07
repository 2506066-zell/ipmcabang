const { query, getConnHost } = require('./_db');
const { json } = require('./_util');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'GET') return json(res, 405, { status: 'error', message: 'Method not allowed' });
    const now = (await query`SELECT NOW() AS now`).rows[0]?.now;
    const host = getConnHost();
    json(res, 200, { status: 'success', db: 'ok', host, now });
  } catch (e) {
    json(res, 500, { status: 'error', message: String(e.message || e) });
  }
};
