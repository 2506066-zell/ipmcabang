const { query } = require('./db');
const { json, cacheHeaders } = require('./_util');
const { requireAdminAuth } = require('./_auth');

async function list(req, res) {
  const uname = req.query.username ? String(req.query.username).trim().toLowerCase() : '';
  const rows = uname
    ? (await query`SELECT id, username, nama_panjang, pimpinan, created_at FROM users WHERE LOWER(username)=${uname} ORDER BY id DESC`).rows
    : (await query`SELECT id, username, nama_panjang, pimpinan, created_at FROM users ORDER BY id DESC`).rows;
  json(res, 200, { status: 'success', users: rows }, cacheHeaders(60));
}

async function create(req, res) {
  try { await requireAdminAuth(req); } catch { return json(res, 401, { status: 'error', message: 'Unauthorized' }); }
  const { parseJsonBody } = require('./_util');
  const b = parseJsonBody(req);
  const username = String(b.username || '').trim();
  const nama = String(b.nama_panjang || '').trim();
  const pimpinan = String(b.pimpinan || '').trim();
  if (!username) return json(res, 400, { status: 'error', message: 'Invalid payload' });
  const ins = await query`INSERT INTO users (username, nama_panjang, pimpinan) VALUES (${username}, ${nama}, ${pimpinan}) RETURNING id, username, nama_panjang, pimpinan, created_at`;
  json(res, 201, { status: 'success', user: ins.rows[0] });
}

async function update(req, res) {
  try { await requireAdminAuth(req); } catch { return json(res, 401, { status: 'error', message: 'Unauthorized' }); }
  const b = parseJsonBody(req);
  const id = Number(b.id || 0);
  if (!id) return json(res, 400, { status: 'error', message: 'Missing id' });
  const prev = (await query`SELECT * FROM users WHERE id=${id}`).rows[0];
  if (!prev) return json(res, 404, { status: 'error', message: 'Not found' });
  const username = b.username !== undefined ? String(b.username) : undefined;
  const nama = b.nama_panjang !== undefined ? String(b.nama_panjang) : undefined;
  const pimpinan = b.pimpinan !== undefined ? String(b.pimpinan) : undefined;
  const upd = await query`UPDATE users SET username=${username ?? prev.username}, nama_panjang=${nama ?? prev.nama_panjang}, pimpinan=${pimpinan ?? prev.pimpinan} WHERE id=${id} RETURNING id, username, nama_panjang, pimpinan, created_at`;
  json(res, 200, { status: 'success', user: upd.rows[0] });
}

async function remove(req, res) {
  try { await requireAdminAuth(req); } catch { return json(res, 401, { status: 'error', message: 'Unauthorized' }); }
  const id = Number(req.query.id || 0);
  if (!id) return json(res, 400, { status: 'error', message: 'Missing id' });
  await query`DELETE FROM users WHERE id=${id}`;
  json(res, 200, { status: 'success' });
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') return list(req, res);
    if (req.method === 'POST') {
      const { parseJsonBody } = require('./_util');
      const b = parseJsonBody(req);
      if (b && b.id) return update(req, res);
      return create(req, res);
    }
    if (req.method === 'PUT') return update(req, res);
    if (req.method === 'DELETE') return remove(req, res);
    json(res, 405, { status: 'error', message: 'Method not allowed' });
  } catch (e) {
    try { console.error('users endpoint error:', e); } catch {}
    json(res, 500, { status: 'error', message: String(e.message || e) });
  }
};
