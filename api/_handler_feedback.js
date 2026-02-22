const { query } = require('./_db');
const { json, cacheHeaders, parseJsonBody } = require('./_util');
const { requireAdminAuth } = require('./_auth');

function sanitizeText(value, maxLen = 500) {
  const text = String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, maxLen);
}

function sanitizeMessage(value, maxLen = 2000) {
  return String(value || '')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, ' ')
    .trim()
    .slice(0, maxLen);
}

function sanitizeStatus(value) {
  const status = String(value || 'all').trim().toLowerCase();
  if (status === 'open' || status === 'resolved') return status;
  return 'all';
}

function parseSourceIp(req) {
  const forwarded = String(req?.headers?.['x-forwarded-for'] || '').trim();
  if (forwarded) return forwarded.split(',')[0].trim().slice(0, 120);
  const realIp = String(req?.headers?.['x-real-ip'] || '').trim();
  if (realIp) return realIp.slice(0, 120);
  return '';
}

function safeContext(raw) {
  if (!raw || typeof raw !== 'object') return {};
  const allowed = {};
  if (raw.bidang) allowed.bidang = sanitizeText(raw.bidang, 120);
  if (raw.page_url) allowed.page_url = sanitizeText(raw.page_url, 500);
  if (raw.user_agent) allowed.user_agent = sanitizeText(raw.user_agent, 300);
  return allowed;
}

async function handleCreateFeedback(req, res) {
  const body = parseJsonBody(req) || {};
  const sourcePage = sanitizeText(body.source_page || 'struktur-organisasi', 80) || 'struktur-organisasi';
  const subject = sanitizeText(body.subject || '', 140);
  const senderName = sanitizeText(body.sender_name || body.name || '', 80);
  const senderContact = sanitizeText(body.sender_contact || body.contact || '', 120);
  const message = sanitizeMessage(body.message || '', 2000);
  const sourceIp = parseSourceIp(req);
  const context = safeContext(body.context);

  if (message.length < 10) {
    return json(res, 400, { status: 'error', message: 'Pesan minimal 10 karakter.' });
  }

  // Basic anti-spam per IP within 30 seconds.
  if (sourceIp) {
    const recent = (await query`
      SELECT COUNT(*)::int AS c
      FROM feedback_messages
      WHERE source_ip=${sourceIp}
      AND created_at > NOW() - INTERVAL '30 seconds'
    `).rows[0];
    if (Number(recent?.c || 0) >= 3) {
      return json(res, 429, { status: 'error', message: 'Terlalu banyak kiriman. Coba lagi sebentar.' });
    }
  }

  await query`
    INSERT INTO feedback_messages (
      source_page, subject, sender_name, sender_contact, message, context_json, source_ip, status
    ) VALUES (
      ${sourcePage},
      ${subject || null},
      ${senderName || null},
      ${senderContact || null},
      ${message},
      ${context || {}},
      ${sourceIp || null},
      'open'
    )
  `;

  return json(res, 201, { status: 'success', message: 'Kritik & saran berhasil dikirim.' });
}

async function handleListFeedback(req, res) {
  try {
    await requireAdminAuth(req);
  } catch (e) {
    return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' });
  }

  const page = Math.max(1, Number(req.query?.page || 1) || 1);
  const size = Math.min(100, Math.max(1, Number(req.query?.size || 20) || 20));
  const offset = (page - 1) * size;
  const status = sanitizeStatus(req.query?.status || 'all');

  const whereSql = status === 'all' ? '' : `WHERE status='${status}'`;
  const { rawQuery } = require('./_db');
  const rows = await rawQuery(
    `SELECT id, source_page, subject, sender_name, sender_contact, message, context_json, source_ip, status, created_at, resolved_at, resolved_by
     FROM feedback_messages
     ${whereSql}
     ORDER BY created_at DESC
     LIMIT $1 OFFSET $2`,
    [size, offset]
  );

  const countRows = await rawQuery(
    `SELECT COUNT(*)::int AS c FROM feedback_messages ${whereSql}`,
    []
  );

  return json(res, 200, {
    status: 'success',
    items: rows.rows || [],
    total: Number(countRows.rows?.[0]?.c || 0),
    page,
    size
  }, cacheHeaders(0));
}

async function handleResolveFeedback(req, res) {
  let admin = null;
  try {
    admin = await requireAdminAuth(req);
  } catch (e) {
    return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' });
  }

  const body = parseJsonBody(req) || {};
  const id = Number(body.id || 0);
  if (!id) return json(res, 400, { status: 'error', message: 'ID tidak valid.' });
  const resolved = body.resolved !== false;

  if (resolved) {
    await query`
      UPDATE feedback_messages
      SET status='resolved', resolved_at=NOW(), resolved_by=${admin.id}
      WHERE id=${id}
    `;
  } else {
    await query`
      UPDATE feedback_messages
      SET status='open', resolved_at=NULL, resolved_by=NULL
      WHERE id=${id}
    `;
  }

  await query`
    INSERT INTO activity_logs (admin_id, action, details)
    VALUES (${admin.id}, 'UPDATE_FEEDBACK_STATUS', ${{ feedback_id: id, resolved }})
  `;

  return json(res, 200, { status: 'success' });
}

async function handleDeleteFeedback(req, res) {
  let admin = null;
  try {
    admin = await requireAdminAuth(req);
  } catch (e) {
    return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' });
  }

  const body = parseJsonBody(req) || {};
  const id = Number(body.id || req.query?.id || 0);
  if (!id) return json(res, 400, { status: 'error', message: 'ID tidak valid.' });

  await query`DELETE FROM feedback_messages WHERE id=${id}`;
  await query`
    INSERT INTO activity_logs (admin_id, action, details)
    VALUES (${admin.id}, 'DELETE_FEEDBACK', ${{ feedback_id: id }})
  `;

  return json(res, 200, { status: 'success' });
}

module.exports = async (req, res) => {
  try {
    const action = String(req.query?.action || '').trim();
    if (req.method === 'POST' && !action) return await handleCreateFeedback(req, res);
    if (req.method === 'GET' && action === 'list') return await handleListFeedback(req, res);
    if (req.method === 'POST' && action === 'resolve') return await handleResolveFeedback(req, res);
    if (req.method === 'DELETE' && action === 'delete') return await handleDeleteFeedback(req, res);
    return json(res, 405, { status: 'error', message: 'Method not allowed' });
  } catch (e) {
    return json(res, 500, { status: 'error', message: String(e.message || e) });
  }
};
