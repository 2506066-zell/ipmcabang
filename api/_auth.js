const { query } = require('./_db');
const { getBearerToken } = require('./_util');

function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      list[parts.shift().trim()] = decodeURI(parts.join('='));
    });
  }
  return list;
}

async function getSessionUser(req) {
  let token = getBearerToken(req);
  if (!token) {
    const cookies = parseCookies(req);
    token = cookies['session_token'];
  }
  
  if (!token) return null;
  
  const row = (await query`SELECT u.id, u.username, u.nama_panjang, u.pimpinan, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token=${token} AND s.expires_at > NOW()`).rows[0];
  return row || null;
}

async function requireAdminAuth(req) {
  let token = getBearerToken(req);
  if (!token) {
    const cookies = parseCookies(req);
    token = cookies['session_token'];
  }

  if (!token) throw new Error('Unauthorized: No token provided');
  
  const row = (await query`SELECT s.user_id AS id FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token=${token} AND s.expires_at > NOW() AND u.role='admin'`).rows[0];
  
  if (!row) throw new Error('Unauthorized: Invalid token or not admin');
  return { id: row.id };
}

module.exports = { getSessionUser, requireAdminAuth };
