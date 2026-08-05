import { query, rawQuery } from '@/lib/db';
import { requireAdminAuth } from '@/lib/auth';
import { errResponse, okResponse, parseBody, getSearchParams, cleanString } from '@/lib/utils';

// ── GET /api/admin/questions ─────────────────────────────────────────────────
export async function GET(req: Request): Promise<Response> {
  try { await requireAdminAuth(req); } catch { return errResponse('Unauthorized', 401); }

  const params = getSearchParams(req);
  const set = params.get('set') ? Number(params.get('set')) : null;
  const category = params.get('category')?.trim() || '';
  const search = params.get('search')?.trim() || '';
  const page = Number(params.get('page') || 1);
  const size = Math.max(1, Math.min(500, Number(params.get('size') || 50)));
  const offset = Math.max(0, (page - 1) * size);

  const whereClauses: string[] = [];
  const queryParams: unknown[] = [];
  let pIdx = 1;

  if (set) { whereClauses.push(`quiz_set = $${pIdx++}`); queryParams.push(set); }
  if (category && category !== 'all') { whereClauses.push(`LOWER(category) = $${pIdx++}`); queryParams.push(category.toLowerCase()); }
  if (search) {
    whereClauses.push(`(LOWER(question) LIKE $${pIdx} OR LOWER(options::text) LIKE $${pIdx})`);
    queryParams.push(`%${search.toLowerCase()}%`);
    pIdx++;
  }

  const whereSql = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';
  const countRes = await rawQuery(`SELECT COUNT(*)::int as total FROM questions ${whereSql}`, queryParams);
  const dataRes = await rawQuery(`SELECT * FROM questions ${whereSql} ORDER BY id DESC LIMIT ${size} OFFSET ${offset}`, queryParams);

  return okResponse({ questions: dataRes.rows, total: countRes.rows[0]?.total || 0, page });
}

// ── POST /api/admin/questions ─────────────────────────────────────────────────
export async function POST(req: Request): Promise<Response> {
  try { await requireAdminAuth(req); } catch { return errResponse('Unauthorized', 401); }

  const params = getSearchParams(req);
  const action = params.get('action');
  const body = await parseBody<Record<string, unknown>>(req);

  if (action === 'delete') {
    const id = Number(body.id || 0);
    if (!id) return errResponse('Missing id');
    await query`DELETE FROM questions WHERE id=${id}`;
    return okResponse();
  }

  if (action === 'update' || body.id) {
    const id = Number(body.id || 0);
    if (!id) return errResponse('Missing id');
    const updates: string[] = [];
    const queryParams: unknown[] = [];
    let idx = 1;

    if (body.question !== undefined) { updates.push(`question = $${idx++}`); queryParams.push(cleanString(body.question, 1000)); }
    if (body.options !== undefined) { updates.push(`options = $${idx++}`); queryParams.push(body.options); }
    if (body.correct_answer !== undefined) { updates.push(`correct_answer = $${idx++}`); queryParams.push(cleanString(body.correct_answer, 1)); }
    if (body.active !== undefined) { updates.push(`active = $${idx++}`); queryParams.push(Boolean(body.active)); }
    if (body.category !== undefined) { updates.push(`category = $${idx++}`); queryParams.push(cleanString(body.category, 100)); }
    if (body.quiz_set !== undefined) { updates.push(`quiz_set = $${idx++}`); queryParams.push(Number(body.quiz_set)); }

    if (updates.length === 0) return errResponse('No fields to update');
    queryParams.push(id);
    const result = await rawQuery(`UPDATE questions SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`, queryParams);
    if (!result.rows.length) return errResponse('Question not found', 404);
    return okResponse({ question: result.rows[0] });
  }

  // Create
  const q = cleanString(body.question, 1000);
  const options = body.options || {};
  const correct = cleanString(body.correct_answer, 1);
  const active = body.active !== false;
  const category = body.category ? cleanString(body.category, 100) : null;
  const quiz_set = Number(body.quiz_set || 1);

  if (!q || !(options as Record<string, unknown>).a || !(options as Record<string, unknown>).b || !(options as Record<string, unknown>).d) {
    return errResponse('Opsi A, B, D dan pertanyaan wajib diisi');
  }
  if (!['a', 'b', 'c', 'd'].includes(correct)) return errResponse('Jawaban benar harus A/B/C/D');

  const ins = await query`
    INSERT INTO questions (question, options, correct_answer, active, category, quiz_set)
    VALUES (${q}, ${options}, ${correct}, ${active}, ${category}, ${quiz_set})
    RETURNING *
  `;
  return errResponse('', 201).constructor === Response
    ? new Response(JSON.stringify({ status: 'success', question: ins.rows[0] }), { status: 201, headers: { 'Content-Type': 'application/json' } })
    : okResponse({ question: ins.rows[0] });
}
