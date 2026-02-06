const { query } = require('./db');
const { getBearerToken } = require('./_util');

async function getSessionUser(req) {
  const token = getBearerToken(req);
  if (!token) return null;
  const row = (await query`SELECT u.id, u.username, u.nama_panjang, u.pimpinan FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token=${token} AND s.expires_at > NOW()`).rows[0];
  return row || null;
}

async function requireAdminAuth(req) {
  const token = getBearerToken(req);
  if (!token) throw new Error('Unauthorized');
  if (process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN) return { username: 'admin_token' };
  const row = (await query`SELECT s.user_id AS id FROM sessions s WHERE s.token=${token} AND s.expires_at > NOW()`).rows[0];
  if (!row) throw new Error('Unauthorized');
  return { id: row.id };
}

module.exports = { getSessionUser, requireAdminAuth };
