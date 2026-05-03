const { query } = require('./_db');
const { json, parseJsonBody } = require('./_util');
const { requireAdminAuth, requireUserAuth } = require('./_auth');
const { notifyOrganizationProgram } = require('./_organization_notifications');

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
  if (/^data:image\//i.test(raw)) return raw;
  if (raw.startsWith('/data:image')) return raw.substring(1);
  if (raw.startsWith('/')) return raw;
  return `/${raw.replace(/^\.?\//, '')}`;
}

function fixCorruptedPath(p) {
  const s = String(p || '').trim();
  if (s.startsWith('/data:image')) return s.substring(1);
  return s;
}

function sanitizeInstagramUrl(value) {
  let raw = String(value || '').trim();
  if (!raw) return '';
  
  // Auto-prefix if only username/handle is provided
  if (!raw.includes('/') && !raw.startsWith('http')) {
    raw = `https://www.instagram.com/${raw.replace(/^@/, '')}`;
  }
  
  // Auto-prefix protocol if missing
  if (!/^https?:\/\//i.test(raw)) {
    raw = `https://${raw}`;
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

function sanitizeBidangCode(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function sanitizeHexColor(value) {
  const raw = String(value || '').trim();
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw : '#0f6f4d';
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
      photo_url: fixCorruptedPath(m.photo_url),
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
      progress_percent: Number(p.progress_percent || 0),
      upvote_count: Number(p.upvote_count || 0),
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
      image_url: fixCorruptedPath(b.image_url),
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
    SELECT id, bidang_id, title, description, status, sort_order, progress_percent, upvote_count, is_active
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
    SELECT id, bidang_id, title, description, status, sort_order, progress_percent, upvote_count, is_active
    FROM org_programs
    ORDER BY bidang_id ASC, sort_order ASC, id ASC
  `).rows;

  const bidang = groupByBidang(bidangRows, membersRows, programsRows);
  return json(res, 200, { status: 'success', bidang });
}

async function handleUpsertBidang(req, res) {
  let adminId = null;
  try {
    const admin = await requireAdminAuth(req);
    adminId = admin.id;
  } catch (e) {
    return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' });
  }

  const body = parseJsonBody(req);
  const id = Number(body.id || 0);
  const name = sanitizeText(body.name, 160);
  const code = sanitizeBidangCode(body.code || body.slug || name);
  const color = sanitizeHexColor(body.color);
  const imageUrl = normalizeMediaPath(body.image_url || body.image);
  const isCore = body.is_core === true || body.is_core === 'true';

  if (!name) return json(res, 400, { status: 'error', message: 'Nama bidang wajib diisi' });
  if (!code) return json(res, 400, { status: 'error', message: 'Kode bidang wajib diisi' });

  let sortOrder = parseSortOrder(body.sort_order, 0);
  if (sortOrder < 1) {
    const next = (await query`SELECT COALESCE(MAX(sort_order), 0)::int + 1 AS next_sort FROM org_bidang`).rows[0]?.next_sort;
    sortOrder = parseSortOrder(next, 1);
  }

  let row = null;
  if (id > 0) {
    const duplicate = (await query`
      SELECT id FROM org_bidang
      WHERE code=${code} AND id<>${id}
      LIMIT 1
    `).rows[0];
    if (duplicate) return json(res, 409, { status: 'error', message: 'Kode bidang sudah dipakai bidang lain' });

    row = (await query`
      UPDATE org_bidang
      SET code=${code},
          name=${name},
          color=${color},
          image_url=${imageUrl},
          sort_order=${sortOrder},
          is_core=${isCore},
          is_active=true,
          updated_at=NOW()
      WHERE id=${id}
      RETURNING *
    `).rows[0];
    if (!row) return json(res, 404, { status: 'error', message: 'Bidang tidak ditemukan' });
    try {
      await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'UPDATE_ORG_BIDANG', ${{ id, code, name }})`;
    } catch {}
  } else {
    row = (await query`
      INSERT INTO org_bidang (code, name, color, image_url, sort_order, is_core, is_active)
      VALUES (${code}, ${name}, ${color}, ${imageUrl}, ${sortOrder}, ${isCore}, ${true})
      RETURNING *
    `).rows[0];
    try {
      await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'CREATE_ORG_BIDANG', ${{ id: row?.id, code, name }})`;
    } catch {}
  }

  return json(res, 200, { status: 'success', bidang: row });
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
  const currentRow = id > 0
    ? (await query`SELECT * FROM org_programs WHERE id=${id} LIMIT 1`).rows[0]
    : null;

  const title = sanitizeText(body.title || body.name, 180);
  const description = sanitizeText(body.description || body.desc, 700);
  if (!title) return json(res, 400, { status: 'error', message: 'Judul program wajib diisi' });
  const status = sanitizeProgramStatus(body.status);
  const progressPercent = Math.max(0, Math.min(100, Number(body.progress_percent || 0)));

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
          progress_percent=${progressPercent},
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
        bidang_id, title, description, status, sort_order, progress_percent, is_active
      ) VALUES (
        ${bidangId}, ${title}, ${description}, ${status}, ${sortOrder}, ${progressPercent}, ${true}
      )
      RETURNING *
    `).rows[0];
    try {
      await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'CREATE_ORG_PROGRAM', ${{ id: row?.id, title, bidang_id: bidangId, status }})`;
    } catch {}
  }

  const bidang = (await query`
    SELECT id, code, name, image_url
    FROM org_bidang
    WHERE id=${bidangId}
    LIMIT 1
  `).rows[0];

  const hasMeaningfulChange = !currentRow
    || String(currentRow.title || '') !== String(row?.title || '')
    || String(currentRow.description || '') !== String(row?.description || '')
    || String(currentRow.status || '') !== String(row?.status || '')
    || Number(currentRow.progress_percent || 0) !== Number(row?.progress_percent || 0)
    || Number(currentRow.bidang_id || 0) !== Number(row?.bidang_id || 0);

  if (row && bidang && hasMeaningfulChange) {
    try {
      await notifyOrganizationProgram({
        program: row,
        bidang,
        eventType: currentRow ? 'update' : 'create',
        adminId
      });
    } catch (e) {
      console.error('Program notification failed:', e);
    }
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

async function handleProgramDetails(req, res) {
  const programId = Number(req.query.program_id || 0);
  if (!programId) return json(res, 400, { status: 'error', message: 'ID program tidak valid' });

  let userId = null;
  try {
    const user = await requireUserAuth(req);
    userId = user.id;
  } catch(e) {}

  let upvoted = false;
  if (userId) {
    const up = (await query`SELECT 1 FROM org_program_upvotes WHERE program_id=${programId} AND user_id=${userId}`).rows[0];
    if (up) upvoted = true;
  }

  const comments = (await query`
    SELECT c.id, c.content, c.created_at, u.nama_panjang, u.username
    FROM org_program_comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.program_id = ${programId}
    ORDER BY c.created_at ASC
  `).rows;

  return json(res, 200, { status: 'success', upvoted, comments });
}

async function handleToggleUpvote(req, res) {
  let user;
  try { user = await requireUserAuth(req); } 
  catch(e) { return json(res, 401, { status: 'error', message: 'Harus login untuk mendukung program.' }); }
  
  const body = parseJsonBody(req);
  const programId = Number(body.program_id || 0);
  if (!programId) return json(res, 400, { status: 'error', message: 'Program invalid' });

  const existing = (await query`SELECT 1 FROM org_program_upvotes WHERE program_id=${programId} AND user_id=${user.id}`).rows[0];
  let upvoted = false;
  
  if (existing) {
    await query`DELETE FROM org_program_upvotes WHERE program_id=${programId} AND user_id=${user.id}`;
    await query`UPDATE org_programs SET upvote_count = GREATEST(upvote_count - 1, 0) WHERE id=${programId}`;
  } else {
    await query`INSERT INTO org_program_upvotes (program_id, user_id) VALUES (${programId}, ${user.id})`;
    await query`UPDATE org_programs SET upvote_count = upvote_count + 1 WHERE id=${programId}`;
    upvoted = true;
  }
  
  const countRow = (await query`SELECT upvote_count FROM org_programs WHERE id=${programId}`).rows[0];
  return json(res, 200, { status: 'success', upvoted, upvote_count: countRow?.upvote_count || 0 });
}

async function handleAddProgramComment(req, res) {
  let user;
  try { user = await requireUserAuth(req); } 
  catch(e) { return json(res, 401, { status: 'error', message: 'Harus login untuk berkomentar.' }); }
  
  const body = parseJsonBody(req);
  const programId = Number(body.program_id || 0);
  const content = sanitizeText(body.content, 1000);
  if (!programId || !content) return json(res, 400, { status: 'error', message: 'Isi komentar tidak boleh kosong' });

  const row = (await query`
    INSERT INTO org_program_comments (program_id, user_id, content) 
    VALUES (${programId}, ${user.id}, ${content}) 
    RETURNING id, content, created_at
  `).rows[0];

  return json(res, 200, { 
    status: 'success', 
    comment: {
      id: row.id, content: row.content, created_at: row.created_at,
      username: user.username, nama_panjang: user.nama_panjang
    } 
  });
}

async function handleDeleteProgramComment(req, res) {
  let adminId = null;
  try {
    const admin = await requireAdminAuth(req);
    adminId = admin.id;
  } catch (e) {
    return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' });
  }

  const body = parseJsonBody(req);
  const commentId = Number(body.comment_id || 0);
  if (!commentId) return json(res, 400, { status: 'error', message: 'ID komentar tidak valid' });

  const deleted = (await query`DELETE FROM org_program_comments WHERE id=${commentId} RETURNING id`).rows[0];
  if (!deleted) return json(res, 404, { status: 'error', message: 'Komentar tidak ditemukan' });

  try {
    await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'DELETE_ORG_COMMENT', ${{ id: commentId }})`;
  } catch {}

  return json(res, 200, { status: 'success' });
}

module.exports = async (req, res) => {
  try {
    req.query = req.query || {};
    const action = String(req.query.action || '').trim();

    if (req.method === 'GET') {
      if (action === 'snapshot') return await handleSnapshot(req, res);
      if (action === 'getProgramDetails') return await handleProgramDetails(req, res);
      return await handlePublicList(req, res);
    }

    if (req.method !== 'POST') {
      return json(res, 405, { status: 'error', message: 'Method not allowed' });
    }

    if (action === 'upsertMember') return await handleUpsertMember(req, res);
    if (action === 'upsertBidang') return await handleUpsertBidang(req, res);
    if (action === 'deleteMember') return await handleDeleteMember(req, res);
    if (action === 'upsertProgram') return await handleUpsertProgram(req, res);
    if (action === 'deleteProgram') return await handleDeleteProgram(req, res);
    if (action === 'deleteProgramComment') return await handleDeleteProgramComment(req, res);
    if (action === 'toggleUpvote') return await handleToggleUpvote(req, res);
    if (action === 'addProgramComment') return await handleAddProgramComment(req, res);

    return json(res, 404, { status: 'error', message: `Unknown action: ${action || 'none'}` });
  } catch (e) {
    return json(res, 500, { status: 'error', message: String(e.message || e) });
  }
};
