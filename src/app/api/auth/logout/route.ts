import { jsonResponse, errResponse, okResponse } from '@/lib/utils';
import { makeSessionCookieHeader } from '@/lib/auth';

// DELETE /api/auth/logout — clear session cookie
export async function DELETE(_req: Request): Promise<Response> {
  return jsonResponse(
    { status: 'success' },
    200,
    { 'Set-Cookie': 'session_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure' }
  );
}

// Also support GET for convenience
export async function GET(_req: Request): Promise<Response> {
  return jsonResponse(
    { status: 'success' },
    200,
    { 'Set-Cookie': 'session_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0; Secure' }
  );
}
