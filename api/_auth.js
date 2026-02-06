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
  if (process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN) return { username: 'admin_token' };
  throw new Error('Unauthorized');
}

module.exports = { getSessionUser, requireAdminAuth };
