import crypto from 'crypto';
import { query } from '@/lib/db';
import { hashPassword, verifyPassword } from '@/lib/password';
import { requireAdminAuth, getSessionUserStrict, getClientIp, makeSessionCookieHeader } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/rate-limit';
import { jsonResponse, errResponse, okResponse, parseBody } from '@/lib/utils';

// ── Helpers ─────────────────────────────────────────────────────────────────

async function tooManyFailures(username: string, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const row = (
    await query`
      SELECT COUNT(*)::int AS c FROM login_attempts
      WHERE success=false
        AND attempted_at > ${since}
        AND (LOWER(username)=${username.toLowerCase()} OR ip=${ip})
    `
  ).rows[0];
  const c = typeof row?.c === 'number' ? row.c : Number(row?.c || 0);
  return c >= 5;
}

// ── POST /api/auth/login ─────────────────────────────────────────────────────

export async function POST(req: Request): Promise<Response> {
  const path = new URL(req.url).pathname;
  const action = path.split('/').pop();

  switch (action) {
    case 'login':    return handleLogin(req);
    case 'register': return handleRegister(req);
    default:         return errResponse('Route not found', 404);
  }
}

export async function GET(req: Request): Promise<Response> {
  const path = new URL(req.url).pathname;
  const action = path.split('/').pop();

  switch (action) {
    case 'me':               return handleMe(req);
    case 'pimpinanOptions':  return handlePimpinanOptions(req);
    default:                 return errResponse('Route not found', 404);
  }
}

// ── Handlers ─────────────────────────────────────────────────────────────────

async function handleLogin(req: Request): Promise<Response> {
  const rl = enforceRateLimit(req, 'auth:login', 30, 10 * 60 * 1000);
  if (!rl.ok) return jsonResponse({ status: 'error', message: 'Too many requests. Try again later.' }, 429, rl.headers);

  const body = await parseBody<{ username?: string; password?: string }>(req);
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  const ip = getClientIp(req);

  if (!username || !password) return errResponse('Username & password wajib');

  if (await tooManyFailures(username, ip)) {
    return errResponse('Too many failed attempts. Try again later.', 429);
  }

  const user = (
    await query`
      SELECT id, username, nama_panjang, pimpinan, password_salt, password_hash, role
      FROM users WHERE LOWER(username)=${username}
    `
  ).rows[0];

  let success = false;
  let legacyHash = false;
  if (user) {
    const checked = await verifyPassword(password, String(user.password_salt || ''), String(user.password_hash || ''));
    if (checked.ok) { success = true; legacyHash = checked.legacy; }
  }

  await query`
    INSERT INTO login_attempts (username, ip, attempted_at, success)
    VALUES (${username}, ${ip}, ${new Date().toISOString()}, ${success})
  `;

  if (!success) return errResponse('Username atau password salah', 401);

  // Upgrade legacy PBKDF2 hash to scrypt silently
  if (legacyHash && user) {
    try {
      const next = await hashPassword(password);
      await query`UPDATE users SET password_salt=${next.salt}, password_hash=${next.hash} WHERE id=${user.id}`;
    } catch (e) {
      console.warn('Password rehash migration failed:', e);
    }
  }

  const token = crypto.randomBytes(24).toString('hex');
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const role = String(user!.role || 'user');
  await query`
    INSERT INTO sessions (user_id, token, role, expires_at)
    VALUES (${user!.id}, ${token}, ${role}, ${expires.toISOString()})
  `;

  return jsonResponse(
    { status: 'success', session: token, username: user!.username, nama_panjang: user!.nama_panjang, pimpinan: user!.pimpinan, role },
    200,
    { 'Set-Cookie': makeSessionCookieHeader(token, expires) }
  );
}

async function handleRegister(req: Request): Promise<Response> {
  const rl = enforceRateLimit(req, 'auth:register', 20, 10 * 60 * 1000);
  if (!rl.ok) return jsonResponse({ status: 'error', message: 'Too many requests.' }, 429, rl.headers);

  const body = await parseBody<{ username?: string; password?: string; nama_panjang?: string; pimpinan?: string }>(req);
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '');
  const nama_panjang = body.nama_panjang ? String(body.nama_panjang) : null;
  const pimpinan = body.pimpinan ? String(body.pimpinan) : null;

  if (!username || !password) return errResponse('Username & password wajib');

  const existing = (await query`SELECT id FROM users WHERE LOWER(username)=${username}`).rows[0];
  if (existing) return errResponse('Username sudah terpakai', 409);

  const pwd = await hashPassword(password);
  const ins = await query`
    INSERT INTO users (username, nama_panjang, pimpinan, password_salt, password_hash)
    VALUES (${username}, ${nama_panjang}, ${pimpinan}, ${pwd.salt}, ${pwd.hash})
    RETURNING id, username, nama_panjang, pimpinan
  `;

  return jsonResponse({ status: 'success', user: ins.rows[0] }, 201);
}

async function handleMe(req: Request): Promise<Response> {
  const user = await getSessionUserStrict(req);
  if (!user) return errResponse('Unauthorized', 401);
  return okResponse({ user: { id: user.id, username: user.username, nama_panjang: user.nama_panjang, pimpinan: user.pimpinan, role: user.role } });
}

async function handlePimpinanOptions(_req: Request): Promise<Response> {
  const row = (await query`SELECT value FROM system_settings WHERE key='pimpinan_options'`).rows[0];
  let options: string[] = [];
  if (row?.value) {
    try {
      const parsed = JSON.parse(String(row.value));
      if (Array.isArray(parsed)) options = parsed.map((item) => String(item || '').trim()).filter(Boolean);
    } catch { /* noop */ }
  }
  return okResponse({ options });
}
