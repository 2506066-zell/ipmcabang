const { query } = require('./_db');
const { json, parseJsonBody } = require('./_util');
const { requireAdminAuth } = require('./_auth');

function sanitizeText(value, max = 255) {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[<>]/g, ' ')
    .trim()
    .slice(0, max);
}

function normalizeMediaPath(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.endsWith('/')) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('/')) return raw;
  return `/${raw.replace(/^\.?\//, '')}`;
}

function sanitizeInstagramUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (!/^https?:\/\/.+/i.test(raw)) {
    throw new Error('URL Instagram harus diawali http:// atau https://');
  }
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('URL Instagram tidak valid');
  }
  if (!String(parsed.hostname || '').toLowerCase().includes('instagram.com')) {
    throw new Error('URL harus mengarah ke domain Instagram');
  }
  return raw;
}

function sanitizeProgramStatus(value) {
  const s = String(value || '').trim().toLowerCase();
  if (s === 'draft' || s === 'rencana' || s === 'terlaksana') return s;
  return 'draft';
}

function parseSortOrder(value, fallback = 1) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

async function resolveBidangId(inputBidangId, inputBidangCode) {
  const id = Number(inputBidangId || 0);
  if (id > 0) {
    const row = (await query`SELECT id FROM org_bidang WHERE id=${id} LIMIT 1`).rows[0];
    return row ? Number(row.id) : 0;
  }
  const code = sanitizeText(inputBidangCode, 80);
  if (!code) return 0;
  const row = (await query`SELECT id FROM org_bidang WHERE code=${code} LIMIT 1`).rows[0];
  return row ? Number(row.id) : 0;
}

function groupByBidang(bidangRows, membersRows, programsRows) {
  const membersByBidang = new Map();
  for (const m of membersRows) {
    const key = Number(m.bidang_id);
    if (!membersByBidang.has(key)) membersByBidang.set(key, []);
    membersByBidang.get(key).push({
      id: Number(m.id),
      bidang_id: key,
      full_name: m.full_name || '',
      role_title: m.role_title || '',
      quote: m.quote || '',
      photo_url: m.photo_url || '',
      instagram_url: m.instagram_url || '',
      sort_order: Number(m.sort_order || 1),
      is_active: m.is_active !== false
    });
  }

  const programsByBidang = new Map();
  for (const p of programsRows) {
    const key = Number(p.bidang_id);
    if (!programsByBidang.has(key)) programsByBidang.set(key, []);
    programsByBidang.get(key).push({
      id: Number(p.id),
      bidang_id: key,
      title: p.title || '',
      description: p.description || '',
      status: sanitizeProgramStatus(p.status),
      sort_order: Number(p.sort_order || 1),
      is_active: p.is_active !== false
    });
  }

  return bidangRows.map((b) => {
    const bidangId = Number(b.id);
    return {
      id: bidangId,
      code: b.code || '',
      name: b.name || '',
      color: b.color || '#4A7C5D',
      image_url: b.image_url || '',
      sort_order: Number(b.sort_order || 1),
      is_core: b.is_core === true,
      is_active: b.is_active !== false,
      members: membersByBidang.get(bidangId) || [],
      programs: programsByBidang.get(bidangId) || []
    };
  });
}

async function handlePublicList(req, res) {
  const bidangRows = (await query`
    SELECT id, code, name, color, image_url, sort_order, is_core, is_active
    FROM org_bidang
    WHERE is_active = true
    ORDER BY sort_order ASC, id ASC
  `).rows;
  if (!bidangRows.length) {
    return json(res, 200, { status: 'success', bidang: [] });
  }

  const membersRows = (await query`
    SELECT id, bidang_id, full_name, role_title, quote, photo_url, instagram_url, sort_order, is_active
    FROM org_members
    WHERE is_active = true
    ORDER BY bidang_id ASC, sort_order ASC, id ASC
  `).rows;

  const programsRows = (await query`
    SELECT id, bidang_id, title, description, status, sort_order, is_active
    FROM org_programs
    WHERE is_active = true
    ORDER BY bidang_id ASC, sort_order ASC, id ASC
  `).rows;

  const bidang = groupByBidang(bidangRows, membersRows, programsRows);
  return json(res, 200, { status: 'success', bidang });
}

async function handleSnapshot(req, res) {
  try {
    await requireAdminAuth(req);
  } catch (e) {
    return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' });
  }

  const bidangRows = (await query`
    SELECT id, code, name, color, image_url, sort_order, is_core, is_active
    FROM org_bidang
    ORDER BY sort_order ASC, id ASC
  `).rows;

  const membersRows = (await query`
    SELECT id, bidang_id, full_name, role_title, quote, photo_url, instagram_url, sort_order, is_active
    FROM org_members
    ORDER BY bidang_id ASC, sort_order ASC, id ASC
  `).rows;

  const programsRows = (await query`
    SELECT id, bidang_id, title, description, status, sort_order, is_active
    FROM org_programs
    ORDER BY bidang_id ASC, sort_order ASC, id ASC
  `).rows;

  const bidang = groupByBidang(bidangRows, membersRows, programsRows);
  return json(res, 200, { status: 'success', bidang });
}

async function handleUpsertMember(req, res) {
  let adminId = null;
  try {
    const admin = await requireAdminAuth(req);
    adminId = admin.id;
  } catch (e) {
    return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' });
  }

  const body = parseJsonBody(req);
  const id = Number(body.id || 0);
  const bidangId = await resolveBidangId(body.bidang_id, body.bidang_code);
  if (!bidangId) return json(res, 400, { status: 'error', message: 'Bidang tidak valid' });

  const fullName = sanitizeText(body.full_name || body.name, 160);
  const roleTitle = sanitizeText(body.role_title || body.role, 160);
  if (!fullName) return json(res, 400, { status: 'error', message: 'Nama anggota wajib diisi' });
  if (!roleTitle) return json(res, 400, { status: 'error', message: 'Role anggota wajib diisi' });

  const quote = sanitizeText(body.quote, 500);
  const photoUrl = normalizeMediaPath(body.photo_url || body.photo);
  let instagramUrl = '';
  try {
    instagramUrl = sanitizeInstagramUrl(body.instagram_url || body.instagram);
  } catch (e) {
    return json(res, 400, { status: 'error', message: e.message || 'URL Instagram tidak valid' });
  }

  let sortOrder = parseSortOrder(body.sort_order, 0);
  if (sortOrder < 1) {
    const next = (await query`SELECT COALESCE(MAX(sort_order), 0)::int + 1 AS next_sort FROM org_members WHERE bidang_id=${bidangId}`).rows[0]?.next_sort;
    sortOrder = parseSortOrder(next, 1);
  }

  let row = null;
  if (id > 0) {
    row = (await query`
      UPDATE org_members
      SET bidang_id=${bidangId},
          full_name=${fullName},
          role_title=${roleTitle},
          quote=${quote},
          photo_url=${photoUrl},
          instagram_url=${instagramUrl},
          sort_order=${sortOrder},
          is_active=true,
          updated_at=NOW()
      WHERE id=${id}
      RETURNING *
    `).rows[0];
    if (!row) return json(res, 404, { status: 'error', message: 'Anggota tidak ditemukan' });
    try {
      await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'UPDATE_ORG_MEMBER', ${{ id, full_name: fullName, bidang_id: bidangId }})`;
    } catch {}
  } else {
    row = (await query`
      INSERT INTO org_members (
        bidang_id, full_name, role_title, quote, photo_url, instagram_url, sort_order, is_active
      ) VALUES (
        ${bidangId}, ${fullName}, ${roleTitle}, ${quote}, ${photoUrl}, ${instagramUrl}, ${sortOrder}, ${true}
      )
      RETURNING *
    `).rows[0];
    try {
      await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'CREATE_ORG_MEMBER', ${{ id: row?.id, full_name: fullName, bidang_id: bidangId }})`;
    } catch {}
  }

  return json(res, 200, { status: 'success', member: row });
}

async function handleDeleteMember(req, res) {
  let adminId = null;
  try {
    const admin = await requireAdminAuth(req);
    adminId = admin.id;
  } catch (e) {
    return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' });
  }

  const body = parseJsonBody(req);
  const id = Number(body.id || 0);
  if (!id) return json(res, 400, { status: 'error', message: 'ID anggota tidak valid' });

  const deleted = (await query`DELETE FROM org_members WHERE id=${id} RETURNING id`).rows[0];
  if (!deleted) return json(res, 404, { status: 'error', message: 'Anggota tidak ditemukan' });

  try {
    await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'DELETE_ORG_MEMBER', ${{ id }})`;
  } catch {}

  return json(res, 200, { status: 'success' });
}

async function handleUpsertProgram(req, res) {
  let adminId = null;
  try {
    const admin = await requireAdminAuth(req);
    adminId = admin.id;
  } catch (e) {
    return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' });
  }

  const body = parseJsonBody(req);
  const id = Number(body.id || 0);
  const bidangId = await resolveBidangId(body.bidang_id, body.bidang_code);
  if (!bidangId) return json(res, 400, { status: 'error', message: 'Bidang tidak valid' });

  const title = sanitizeText(body.title || body.name, 180);
  const description = sanitizeText(body.description || body.desc, 700);
  if (!title) return json(res, 400, { status: 'error', message: 'Judul program wajib diisi' });
  const status = sanitizeProgramStatus(body.status);

  let sortOrder = parseSortOrder(body.sort_order, 0);
  if (sortOrder < 1) {
    const next = (await query`SELECT COALESCE(MAX(sort_order), 0)::int + 1 AS next_sort FROM org_programs WHERE bidang_id=${bidangId}`).rows[0]?.next_sort;
    sortOrder = parseSortOrder(next, 1);
  }

  let row = null;
  if (id > 0) {
    row = (await query`
      UPDATE org_programs
      SET bidang_id=${bidangId},
          title=${title},
          description=${description},
          status=${status},
          sort_order=${sortOrder},
          is_active=true,
          updated_at=NOW()
      WHERE id=${id}
      RETURNING *
    `).rows[0];
    if (!row) return json(res, 404, { status: 'error', message: 'Program tidak ditemukan' });
    try {
      await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'UPDATE_ORG_PROGRAM', ${{ id, title, bidang_id: bidangId, status }})`;
    } catch {}
  } else {
    row = (await query`
      INSERT INTO org_programs (
        bidang_id, title, description, status, sort_order, is_active
      ) VALUES (
        ${bidangId}, ${title}, ${description}, ${status}, ${sortOrder}, ${true}
      )
      RETURNING *
    `).rows[0];
    try {
      await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'CREATE_ORG_PROGRAM', ${{ id: row?.id, title, bidang_id: bidangId, status }})`;
    } catch {}
  }

  return json(res, 200, { status: 'success', program: row });
}

async function handleDeleteProgram(req, res) {
  let adminId = null;
  try {
    const admin = await requireAdminAuth(req);
    adminId = admin.id;
  } catch (e) {
    return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' });
  }

  const body = parseJsonBody(req);
  const id = Number(body.id || 0);
  if (!id) return json(res, 400, { status: 'error', message: 'ID program tidak valid' });

  const deleted = (await query`DELETE FROM org_programs WHERE id=${id} RETURNING id`).rows[0];
  if (!deleted) return json(res, 404, { status: 'error', message: 'Program tidak ditemukan' });

  try {
    await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'DELETE_ORG_PROGRAM', ${{ id }})`;
  } catch {}

  return json(res, 200, { status: 'success' });
}

module.exports = async (req, res) => {
  try {
    req.query = req.query || {};
    const action = String(req.query.action || '').trim();

    if (req.method === 'GET') {
      if (action === 'snapshot') return await handleSnapshot(req, res);
      return await handlePublicList(req, res);
    }

    if (req.method !== 'POST') {
      return json(res, 405, { status: 'error', message: 'Method not allowed' });
    }

    if (action === 'upsertMember') return await handleUpsertMember(req, res);
    if (action === 'deleteMember') return await handleDeleteMember(req, res);
    if (action === 'upsertProgram') return await handleUpsertProgram(req, res);
    if (action === 'deleteProgram') return await handleDeleteProgram(req, res);

    return json(res, 404, { status: 'error', message: `Unknown action: ${action || 'none'}` });
  } catch (e) {
    return json(res, 500, { status: 'error', message: String(e.message || e) });
  }
};
