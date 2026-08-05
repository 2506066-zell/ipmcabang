import { cookies, headers } from 'next/headers';
import { query } from './db';
import type { SessionUser } from '@/types';

function parseCookieHeader(cookieHeader: string): Record<string, string> {
  const list: Record<string, string> = {};
  if (!cookieHeader) return list;
  cookieHeader.split(';').forEach((cookie) => {
    const parts = cookie.split('=');
    const key = parts.shift()?.trim();
    if (key) list[key] = decodeURIComponent(parts.join('='));
  });
  return list;
}

function getBearerToken(req?: Request): string {
  try {
    // In Route Handlers, headers() is available
    const authHeader = req
      ? req.headers.get('authorization') || ''
      : '';
    if (authHeader.startsWith('Bearer ')) return authHeader.slice(7).trim();
  } catch {
    // noop
  }
  return '';
}

async function lookupSessionUser(token: string): Promise<SessionUser | null> {
  const row = (
    await query`
      SELECT u.id, u.username, u.nama_panjang, u.pimpinan, u.role
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token=${token}
        AND s.expires_at > NOW()
    `
  ).rows[0];
  return row ? (row as unknown as SessionUser) : null;
}

// Safe to call from Server Components / Route Handlers
export async function getSessionUser(req?: Request): Promise<SessionUser | null> {
  let bearerToken = '';
  let cookieToken = '';

  if (req) {
    // Route Handler context
    bearerToken = getBearerToken(req);
    const rawCookies = req.headers.get('cookie') || '';
    cookieToken = parseCookieHeader(rawCookies)['session_token'] || '';
  } else {
    // Server Component context
    try {
      const cookieStore = await cookies();
      cookieToken = cookieStore.get('session_token')?.value || '';
    } catch {
      return null;
    }
  }

  const token = bearerToken || cookieToken;
  if (!token) return null;

  const user = await lookupSessionUser(token);
  if (user) return user;

  // Fallback to cookie if bearer didn't match
  if (cookieToken && cookieToken !== token) {
    return await lookupSessionUser(cookieToken);
  }

  return null;
}

// For Route Handlers: enforces Bearer token on unsafe methods (CSRF protection)
export async function getSessionUserStrict(req: Request): Promise<SessionUser | null> {
  const method = req.method.toUpperCase();
  const isUnsafe = !['GET', 'HEAD', 'OPTIONS'].includes(method);

  const bearerToken = getBearerToken(req);
  const rawCookies = req.headers.get('cookie') || '';
  const cookieToken = parseCookieHeader(rawCookies)['session_token'] || '';

  // CSRF hardening: state-changing requests must present explicit Bearer token
  if (isUnsafe && !bearerToken) return null;

  const token = bearerToken || cookieToken;
  if (!token) return null;

  const user = await lookupSessionUser(token);
  if (user) return user;

  if (cookieToken && cookieToken !== token) {
    return await lookupSessionUser(cookieToken);
  }

  return null;
}

export async function requireAdminAuth(req: Request): Promise<{ id: number }> {
  const method = req.method.toUpperCase();
  const isUnsafe = !['GET', 'HEAD', 'OPTIONS'].includes(method);

  const bearerToken = getBearerToken(req);
  const rawCookies = req.headers.get('cookie') || '';
  const cookieToken = parseCookieHeader(rawCookies)['session_token'] || '';

  if (isUnsafe && !bearerToken) {
    throw new Error('Unauthorized: Bearer token required for state-changing requests');
  }

  const token = bearerToken || cookieToken;
  if (!token) throw new Error('Unauthorized: No token provided');

  const findAdmin = async (t: string) => {
    const row = (
      await query`
        SELECT s.user_id AS id
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token=${t}
          AND s.expires_at > NOW()
          AND u.role='admin'
      `
    ).rows[0];
    return row ? { id: Number(row.id) } : null;
  };

  let admin = await findAdmin(token);
  if (!admin && cookieToken && cookieToken !== token) {
    admin = await findAdmin(cookieToken);
  }

  if (!admin) throw new Error('Unauthorized: Invalid token or not admin');
  return admin;
}

export async function requireUserAuth(req: Request): Promise<SessionUser> {
  const user = await getSessionUserStrict(req);
  if (!user) throw new Error('Unauthorized');
  return user;
}

export function getClientIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for') || '';
  const first = xff.split(',')[0].trim();
  return first || 'unknown';
}

export function makeSessionCookieHeader(token: string, expires: Date): string {
  const maxAge = Math.floor((expires.getTime() - Date.now()) / 1000);
  return `session_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}; Secure`;
}
