import { query } from '@/lib/db';
import { requireAdminAuth, getSessionUserStrict } from '@/lib/auth';
import { hashPassword } from '@/lib/password';
import { jsonResponse, errResponse, okResponse, parseBody, getSearchParams, cleanString } from '@/lib/utils';
import { sendToUser } from '@/lib/push';

// GET /api/users — list users (admin) or single user profile
export async function GET(req: Request): Promise<Response> {
  const params = getSearchParams(req);
  const action = params.get('action');

  if (action === 'notifications') {
    const user = await getSessionUserStrict(req);
    if (!user) return errResponse('Unauthorized', 401);
    const notifs = (
      await query`
        SELECT id, message, is_read, created_at
        FROM notifications
        WHERE user_id=${user.id}
        ORDER BY created_at DESC
        LIMIT 20
      `
    ).rows;
    return okResponse({ notifications: notifs });
  }

  if (action === 'extended') {
    try { await requireAdminAuth(req); } catch { return errResponse('Unauthorized', 401); }
    const users = (
      await query`
        SELECT u.id, u.username, u.email, u.nama_panjang, u.pimpinan, u.role, u.created_at,
               COUNT(r.id)::int AS total_quizzes,
               COALESCE(AVG(r.score), 0)::float AS avg_score,
               MAX(r.created_at) AS last_quiz_at,
               EXISTS(SELECT 1 FROM sessions s WHERE s.user_id=u.id AND s.expires_at > NOW()) AS active
        FROM users u
        LEFT JOIN results r ON u.id = r.user_id
        GROUP BY u.id
        ORDER BY u.created_at DESC
      `
    ).rows;
    return okResponse({ users });
  }

  if (action === 'status') {
    try { await requireAdminAuth(req); } catch { return errResponse('Unauthorized', 401); }
    const users = (await query`SELECT id, username, nama_panjang, role FROM users ORDER BY username ASC`).rows;
    const attempts = (await query`SELECT user_id, quiz_set, score, total FROM results`).rows;
    const attemptMap: Record<number, Record<number, { score: number; total: number }>> = {};
    attempts.forEach((a) => {
      const uid = Number(a.user_id);
      const qs = Number(a.quiz_set);
      if (!attemptMap[uid]) attemptMap[uid] = {};
      attemptMap[uid][qs] = { score: Number(a.score), total: Number(a.total) };
    });
    const data = users.map((u) => ({ id: u.id, username: u.username, nama_panjang: u.nama_panjang, attempts: attemptMap[Number(u.id)] || {} }));
    return okResponse({ users: data });
  }

  // Default: list or profile
  const viewer = await getSessionUserStrict(req);
  if (!viewer) return errResponse('Unauthorized', 401);

  const uname = params.get('username')?.trim().toLowerCase() || '';
  if (uname) {
    const isOwner = String(viewer.username || '').toLowerCase() === uname;
    const isAdmin = viewer.role === 'admin';
    if (!isOwner && !isAdmin) return errResponse('Forbidden', 403);
    const rows = (await query`SELECT id, username, nama_panjang, pimpinan, created_at FROM users WHERE LOWER(username)=${uname} ORDER BY id DESC`).rows;
    return okResponse({ users: rows });
  }

  if (viewer.role !== 'admin') return errResponse('Forbidden', 403);
  const rows = (await query`SELECT id, username, nama_panjang, pimpinan, created_at FROM users ORDER BY id DESC`).rows;
  return okResponse({ users: rows });
}

// POST /api/users — create user, update user, mark notifications read, reset attempt
export async function POST(req: Request): Promise<Response> {
  const params = getSearchParams(req);
  const action = params.get('action');

  if (action === 'markNotificationsRead') {
    const user = await getSessionUserStrict(req);
    if (!user) return errResponse('Unauthorized', 401);
    await query`UPDATE notifications SET is_read=TRUE WHERE user_id=${user.id}`;
    return okResponse();
  }

  if (action === 'resetAttempt') {
    let adminId: number;
    try { const admin = await requireAdminAuth(req); adminId = admin.id; }
    catch { return errResponse('Unauthorized', 401); }

    const body = await parseBody<{ user_id?: number; quiz_set?: number }>(req);
    const userId = Number(body.user_id);
    const quizSet = Number(body.quiz_set);
    if (!userId || !quizSet) return errResponse('User ID dan Quiz Set wajib diisi');

    try {
      await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'RESET_ATTEMPT', ${{ target_user_id: userId, quiz_set: quizSet }})`;
    } catch { /* noop */ }

    try {
      const msg = `Admin telah mereset status pengerjaan Kuis Set ${quizSet} Anda. Anda dapat mengerjakannya kembali.`;
      await query`INSERT INTO notifications (user_id, message) VALUES (${userId}, ${msg})`;
      sendToUser(userId, { title: 'Kuis Di-reset', body: msg, url: '/quiz' }).catch(() => {});
    } catch { /* noop */ }

    await query`DELETE FROM results WHERE user_id=${userId} AND quiz_set=${quizSet}`;
    return okResponse({ message: 'Attempt berhasil direset.' });
  }

  // Create or Update
  let adminId: number;
  try { const admin = await requireAdminAuth(req); adminId = admin.id; }
  catch { return errResponse('Unauthorized', 401); }

  const body = await parseBody<Record<string, unknown>>(req);
  if (body.id) {
    return handleUpdateUser(req, body, adminId);
  }
  return handleCreateUser(req, body, adminId);
}

// PUT /api/users — update user
export async function PUT(req: Request): Promise<Response> {
  let adminId: number;
  try { const admin = await requireAdminAuth(req); adminId = admin.id; }
  catch { return errResponse('Unauthorized', 401); }
  const body = await parseBody<Record<string, unknown>>(req);
  return handleUpdateUser(req, body, adminId);
}

// DELETE /api/users — delete user
export async function DELETE(req: Request): Promise<Response> {
  let adminId: number;
  try { const admin = await requireAdminAuth(req); adminId = admin.id; }
  catch { return errResponse('Unauthorized', 401); }

  const params = getSearchParams(req);
  const body = await parseBody<{ user_id?: number }>(req);
  const id = Number(params.get('id') || body.user_id || 0);
  if (!id) return errResponse('Missing id');
  if (id === adminId) return errResponse('Tidak dapat menghapus akun sendiri');

  try {
    await query`DELETE FROM results WHERE user_id=${id}`;
    await query`DELETE FROM sessions WHERE user_id=${id}`;
    await query`DELETE FROM notifications WHERE user_id=${id}`;
    await query`DELETE FROM users WHERE id=${id}`;
    await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'DELETE_USER', ${{ target_user_id: id }})`;
    return okResponse();
  } catch (e) {
    return errResponse(`Gagal menghapus user: ${(e as Error).message}`, 500);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function handleCreateUser(_req: Request, body: Record<string, unknown>, adminId: number): Promise<Response> {
  const username = cleanString(body.username, 80);
  const password = cleanString(body.password, 200);
  const email = body.email ? cleanString(body.email, 200) : null;
  const role = body.role === 'admin' ? 'admin' : 'user';
  const nama = cleanString(body.nama_panjang, 160);
  const pimpinan = body.pimpinan ? cleanString(body.pimpinan, 80) : null;

  if (!username) return errResponse('Username required');
  if (!password) return errResponse('Password wajib diisi');

  const pwd = await hashPassword(password);
  try {
    const ins = await query`
      INSERT INTO users (username, password_salt, password_hash, email, role, nama_panjang, pimpinan)
      VALUES (${username}, ${pwd.salt}, ${pwd.hash}, ${email}, ${role}, ${nama}, ${pimpinan})
      RETURNING id, username
    `;
    await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'CREATE_USER', ${{ username, role }})`;
    return jsonResponse({ status: 'success', user: ins.rows[0] }, 201);
  } catch (e) {
    if ((e as Error).message.includes('unique')) return errResponse('Username sudah digunakan');
    throw e;
  }
}

async function handleUpdateUser(_req: Request, body: Record<string, unknown>, adminId: number): Promise<Response> {
  const { rawQuery } = await import('@/lib/db');
  const id = Number(body.id || 0);
  if (!id) return errResponse('Missing id');

  const updates: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (body.username) { updates.push(`username = $${idx++}`); params.push(cleanString(body.username, 80)); }
  if (body.email !== undefined) { updates.push(`email = $${idx++}`); params.push(cleanString(body.email, 200) || null); }
  if (body.role) { updates.push(`role = $${idx++}`); params.push(body.role === 'admin' ? 'admin' : 'user'); }
  if (body.nama_panjang !== undefined) { updates.push(`nama_panjang = $${idx++}`); params.push(cleanString(body.nama_panjang, 160)); }
  if (body.pimpinan !== undefined) { updates.push(`pimpinan = $${idx++}`); params.push(cleanString(body.pimpinan, 80) || null); }
  if (body.password) {
    const pwd = await hashPassword(cleanString(body.password, 200));
    updates.push(`password_salt = $${idx++}`); params.push(pwd.salt);
    updates.push(`password_hash = $${idx++}`); params.push(pwd.hash);
  }

  if (updates.length === 0) return errResponse('No fields to update');

  params.push(id);
  await rawQuery(`UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`, params);
  await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'UPDATE_USER', ${{ target_user_id: id }})`;
  return okResponse();
}
