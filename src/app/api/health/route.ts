import { query } from '@/lib/db';
import { errResponse, okResponse } from '@/lib/utils';

// GET /api/health — public health check
export async function GET(): Promise<Response> {
  return okResponse({ ok: true, time: new Date().toISOString() });
}

// GET /api/health/db — database connectivity check  
export async function HEAD(): Promise<Response> {
  try {
    const now = (await query`SELECT NOW() AS now`).rows[0]?.now;
    return okResponse({ db: 'ok', now });
  } catch (e) {
    return errResponse(`DB error: ${(e as Error).message}`, 503);
  }
}
