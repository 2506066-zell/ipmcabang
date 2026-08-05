import crypto from 'crypto';
import { NextResponse } from 'next/server';

// === Security Headers ===
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-site',
};

// === JSON Response Helper ===
export function jsonResponse(
  data: unknown,
  status: number = 200,
  extraHeaders?: Record<string, string>
): NextResponse {
  const body = JSON.stringify(data ?? {});
  const etag = crypto.createHash('sha1').update(body).digest('hex');

  const response = new NextResponse(body, {
    status,
    headers: {
      'Content-Type': 'application/json',
      'ETag': `"${etag}"`,
      ...SECURITY_HEADERS,
      ...extraHeaders,
    },
  });

  return response;
}

// Standard error response shortcuts
export function errResponse(message: string, status: number = 400): NextResponse {
  return jsonResponse({ status: 'error', message }, status);
}

export function okResponse(data?: unknown): NextResponse {
  return jsonResponse({ status: 'success', ...(data || {}) });
}

// === Cache Headers ===
export function cacheHeaders(seconds: number): Record<string, string> {
  const s = Math.max(0, seconds);
  if (s === 0) return { 'Cache-Control': 'no-store' };
  return { 'Cache-Control': `public, s-maxage=${s}, stale-while-revalidate=${s * 5}` };
}

// === URL Validation ===
export function normalizeUrl(value: unknown): string {
  const raw = String(value || '').trim();
  if (!raw) return '/';
  if (/^(javascript|data|vbscript):/i.test(raw)) return '/';

  const looksLikeDomain = /^[a-z0-9.-]+\.[a-z]{2,}([/:?#].*)?$/i.test(raw);
  const candidate = /^https?:\/\//i.test(raw) || raw.startsWith('/')
    ? raw
    : looksLikeDomain ? `https://${raw}` : raw;

  try {
    if (/^https?:\/\//i.test(candidate)) return new URL(candidate).href;
    const parsed = new URL(candidate, 'http://local.app');
    const normalized = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    return normalized.startsWith('/') ? normalized : `/${normalized}`;
  } catch {
    const cleaned = raw.replace(/^\.?\//, '').trim();
    return cleaned ? `/${cleaned}` : '/';
  }
}

// === Text Sanitization ===
export function cleanString(value: unknown, max: number = 200): string {
  return String(value || '').trim().slice(0, max);
}

export function sanitizeText(value: unknown, max: number = 255): string {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[<>]/g, ' ')
    .trim()
    .slice(0, max);
}

// === Parse JSON Body ===
export async function parseBody<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    const text = await req.text();
    if (!text) return {} as T;
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

// === URL Search Params Helper ===
export function getSearchParams(req: Request): URLSearchParams {
  return new URL(req.url).searchParams;
}

// === Cron Authorization ===
export function isCronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const url = new URL(req.url);
    if (url.searchParams.get('secret') === secret) return true;
    if (req.headers.get('x-cron-secret') === secret) return true;
  }
  if (req.headers.get('x-vercel-cron')) return true;
  return false;
}

export function toNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}
