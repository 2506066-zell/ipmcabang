const { query, rawQuery } = require('./_db');
const { getSessionUser } = require('./_auth');
const { json, parseJsonBody, applySecurityHeaders } = require('./_util');

function cleanText(value, max = 500) {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[<>]/g, ' ')
    .trim()
    .slice(0, max);
}

async function handleList(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 50);
  const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);
  const q = cleanText(url.searchParams.get('q') || '', 100);

  let queryStr = `
    SELECT 
      d.id, d.title, d.content, d.category, d.views, d.created_at, d.updated_at,
      u.username, u.nama_panjang, u.role as user_role,
      (SELECT COUNT(*)::int FROM discussion_replies r WHERE r.discussion_id = d.id) as reply_count
    FROM discussions d
    JOIN users u ON d.user_id = u.id
  `;
  let queryParams = [];

  if (q) {
    queryStr += ` WHERE d.title ILIKE $1 OR d.content ILIKE $1`;
    queryParams.push(`%${q}%`);
  }

  queryStr += ` ORDER BY d.updated_at DESC, d.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
  queryParams.push(limit, offset);

  const dbRes = await rawQuery(queryStr, queryParams);

  // Get total count for pagination
  let countStr = `SELECT COUNT(*)::int AS total FROM discussions`;
  let countParams = [];
  if (q) {
    countStr += ` WHERE title ILIKE $1 OR content ILIKE $1`;
    countParams.push(`%${q}%`);
  }
  const countRes = await rawQuery(countStr, countParams);
  const total = countRes.rows[0]?.total || 0;

  return json(res, 200, {
    status: 'success',
    discussions: dbRes.rows,
    total,
    limit,
    offset
  });
}

async function handleDetail(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const id = Number(url.searchParams.get('id'));
  if (!id) return json(res, 400, { status: 'error', message: 'ID diskusi tidak valid' });

  // Increment view count
  await query`UPDATE discussions SET views = views + 1 WHERE id = ${id}`;

  const discussionRes = await query`
    SELECT d.id, d.title, d.content, d.category, d.views, d.created_at, d.updated_at,
           d.user_id,
           u.username, u.nama_panjang, u.role as user_role
    FROM discussions d
    JOIN users u ON d.user_id = u.id
    WHERE d.id = ${id}
  `;

  if (discussionRes.rows.length === 0) {
    return json(res, 404, { status: 'error', message: 'Diskusi tidak ditemukan' });
  }

  const repliesRes = await query`
    SELECT r.id, r.content, r.created_at,
           u.username, u.nama_panjang, u.role as user_role
    FROM discussion_replies r
    JOIN users u ON r.user_id = u.id
    WHERE r.discussion_id = ${id}
    ORDER BY r.created_at ASC
  `;

  return json(res, 200, {
    status: 'success',
    discussion: discussionRes.rows[0],
    replies: repliesRes.rows
  });
}

async function handleCreateTopic(req, res) {
  const user = await getSessionUser(req);
  if (!user) return json(res, 401, { status: 'error', message: 'Silakan login untuk membuat diskusi.' });

  const body = parseJsonBody(req);
  const title = cleanText(body.title, 150);
  const content = cleanText(body.content, 5000);
  const category = cleanText(body.category || 'Umum', 50);

  if (!title || title.length < 3) return json(res, 400, { status: 'error', message: 'Judul diskusi minimal 3 karakter.' });
  if (!content || content.length < 5) return json(res, 400, { status: 'error', message: 'Isi diskusi minimal 5 karakter.' });

  const result = await query`
    INSERT INTO discussions (user_id, title, content, category)
    VALUES (${user.id}, ${title}, ${content}, ${category})
    RETURNING id, created_at
  `;

  return json(res, 201, {
    status: 'success',
    message: 'Diskusi berhasil diposting',
    discussion_id: result.rows[0].id
  });
}

async function handleReply(req, res) {
  const user = await getSessionUser(req);
  if (!user) return json(res, 401, { status: 'error', message: 'Silakan login untuk membalas.' });

  const body = parseJsonBody(req);
  const discussionId = Number(body.discussion_id);
  const content = cleanText(body.content, 3000);

  if (!discussionId) return json(res, 400, { status: 'error', message: 'ID diskusi tidak valid.' });
  if (!content || content.length < 2) return json(res, 400, { status: 'error', message: 'Balasan minimal 2 karakter.' });

  // Verify discussion exists
  const exists = (await query`SELECT id FROM discussions WHERE id = ${discussionId}`).rows[0];
  if (!exists) return json(res, 404, { status: 'error', message: 'Diskusi tidak ditemukan.' });

  const result = await query`
    INSERT INTO discussion_replies (discussion_id, user_id, content)
    VALUES (${discussionId}, ${user.id}, ${content})
    RETURNING id, created_at
  `;

  // Bump discussion updated_at for "most recent activity" sorting
  await query`UPDATE discussions SET updated_at = NOW() WHERE id = ${discussionId}`;

  return json(res, 201, {
    status: 'success',
    message: 'Balasan terkirim',
    reply_id: result.rows[0].id
  });
}

async function handleDelete(req, res) {
  const user = await getSessionUser(req);
  if (!user) return json(res, 401, { status: 'error', message: 'Unauthorized' });

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const action = url.searchParams.get('action');
  const id = Number(url.searchParams.get('id'));

  if (action === 'reply') {
    const replyId = Number(url.searchParams.get('reply_id'));
    if (!replyId) return json(res, 400, { status: 'error', message: 'reply_id wajib diisi' });

    // Allow admin or own reply
    const reply = (await query`SELECT user_id FROM discussion_replies WHERE id = ${replyId}`).rows[0];
    if (!reply) return json(res, 404, { status: 'error', message: 'Balasan tidak ditemukan' });
    if (user.role !== 'admin' && Number(reply.user_id) !== Number(user.id)) {
      return json(res, 403, { status: 'error', message: 'Kamu hanya bisa menghapus balasan sendiri.' });
    }

    await query`DELETE FROM discussion_replies WHERE id = ${replyId}`;
    return json(res, 200, { status: 'success', message: 'Balasan dihapus' });
  }

  if (id) {
    // Allow admin or own discussion
    const disc = (await query`SELECT user_id FROM discussions WHERE id = ${id}`).rows[0];
    if (!disc) return json(res, 404, { status: 'error', message: 'Diskusi tidak ditemukan' });
    if (user.role !== 'admin' && Number(disc.user_id) !== Number(user.id)) {
      return json(res, 403, { status: 'error', message: 'Kamu hanya bisa menghapus diskusi sendiri.' });
    }

    await query`DELETE FROM discussions WHERE id = ${id}`;
    return json(res, 200, { status: 'success', message: 'Diskusi dihapus' });
  }

  return json(res, 400, { status: 'error', message: 'Parameter tidak lengkap.' });
}

module.exports = async (req, res) => {
  try {
    applySecurityHeaders(res);
    req.query = req.query || {};
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const action = url.searchParams.get('action');
    const id = url.searchParams.get('id');

    if (req.method === 'GET') {
      if (id) return await handleDetail(req, res);
      return await handleList(req, res);
    }

    if (req.method === 'POST') {
      if (action === 'reply') return await handleReply(req, res);
      return await handleCreateTopic(req, res);
    }

    if (req.method === 'DELETE') {
      return await handleDelete(req, res);
    }

    return json(res, 405, { status: 'error', message: 'Method not allowed' });
  } catch (error) {
    console.error('Discussions API Error:', error);
    return json(res, 500, { status: 'error', message: 'Internal server error: ' + (error.message || error) });
  }
};
