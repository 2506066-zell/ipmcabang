const { query } = require('./_db');
const { getBearerToken } = require('./_util');

function parseCookies(req) {
  const list = {};
  const rc = req.headers?.cookie;
  if (rc) {
    rc.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      list[parts.shift().trim()] = decodeURI(parts.join('='));
    });
  }
  return list;
}

function isUnsafeMethod(req) {
  const method = String(req?.method || 'GET').toUpperCase();
  return !['GET', 'HEAD', 'OPTIONS'].includes(method);
}

async function lookupSessionUser(token) {
  const row = (await query`SELECT u.id, u.username, u.nama_panjang, u.pimpinan, u.role FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token=${token} AND s.expires_at > NOW()`).rows[0];
  return row || null;
}

async function getSessionUser(req) {
  const bearerToken = getBearerToken(req);
  let token = bearerToken;
  const cookies = parseCookies(req);
  const cookieToken = cookies['session_token'];

  // CSRF hardening: unsafe methods must present explicit Authorization bearer token.
  if (isUnsafeMethod(req) && !bearerToken) return null;

  if (!token) token = cookieToken;
  if (!token) return null;

  const byPrimary = await lookupSessionUser(token);
  if (byPrimary) return byPrimary;
  if (cookieToken && cookieToken !== token) {
    return await lookupSessionUser(cookieToken);
  }
  return null;
}

async function requireAdminAuth(req) {
  const bearerToken = getBearerToken(req);
  let token = bearerToken;
  const cookies = parseCookies(req);
  const cookieToken = cookies['session_token'];

  // CSRF hardening: cookie-only auth is not allowed for state-changing methods.
  if (isUnsafeMethod(req) && !bearerToken) {
    throw new Error('Unauthorized: Bearer token required for state-changing requests');
  }

  if (!token) token = cookieToken;
  if (!token) throw new Error('Unauthorized: No token provided');

  const findAdmin = async (t) => (await query`SELECT s.user_id AS id FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token=${t} AND s.expires_at > NOW() AND u.role='admin'`).rows[0];

  let row = await findAdmin(token);
  if (!row && cookieToken && cookieToken !== token) {
    row = await findAdmin(cookieToken);
  }

  if (!row) throw new Error('Unauthorized: Invalid token or not admin');
  return { id: row.id };
}

module.exports = { getSessionUser, requireAdminAuth };
