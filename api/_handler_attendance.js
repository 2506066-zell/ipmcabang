const crypto = require('crypto');
const { query, rawQuery } = require('./_db');
const { ensureSchema } = require('./_bootstrap');
const { json, cacheHeaders, parseJsonBody } = require('./_util');
const { getSessionUser, requireAdminAuth } = require('./_auth');

const ROOM_ACCESS_HEADER = 'x-room-access';
const ROOM_SESSION_HOURS = 12;
const VALID_STATUSES = new Set(['hadir', 'izin', 'sakit', 'alfa']);
const APP_TIMEZONE = 'Asia/Bangkok';
const CABANG_ROOM_SYNONYMS = [
  'IPM CABANG PANAWUAN',
  'PC IPM PANAWUAN',
  'IPM PANAWUAN',
  'PR IPM PANAWUAN',
  'PC IPM',
  'PR IPM'
];

function nowIso() {
  return new Date().toISOString();
}

function formatDateInZone(date = new Date(), timeZone = APP_TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}`;
}

function todayDate() {
  return formatDateInZone(new Date(), APP_TIMEZONE);
}

function cleanString(value, max = 200) {
  return String(value || '').trim().slice(0, max);
}

function normalizeRoomCode(value) {
  return cleanString(value, 32).replace(/\s+/g, '').toUpperCase();
}

function normalizeAttendanceStatus(value) {
  const normalized = cleanString(value, 20).toLowerCase();
  return VALID_STATUSES.has(normalized) ? normalized : '';
}

function generateDefaultRoomCode(pimpinan) {
  const base = cleanString(pimpinan, 30).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const prefix = (base || 'ROOM').slice(0, 4).padEnd(4, 'X');
  const suffix = crypto.createHash('sha1').update(base || 'ROOM').digest('hex').slice(0, 4).toUpperCase();
  return `${prefix}-${suffix}`;
}

function generateAccessToken() {
  return crypto.randomBytes(24).toString('hex');
}

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function normalizeRoomName(value) {
  return cleanString(value, 120).toUpperCase();
}

function getIdentityMode(roomLike) {
  const pimpinan = typeof roomLike === 'string' ? roomLike : roomLike?.pimpinan;
  const normalized = normalizeRoomName(pimpinan);
  const isBranch = CABANG_ROOM_SYNONYMS.some(syn => normalized.includes(normalizeRoomName(syn))) ||
                   normalized.includes('PC IPM') || 
                   normalized.includes('PR IPM') ||
                   normalized.includes('CABANG');
  return isBranch ? 'org_member_select' : 'account_identity';
}

function canUserSelfCheckIn(user, roomLike) {
  return !!user;
}

function buildSummary(events, records) {
  const recordMap = new Map((records || []).map((item) => [Number(item.event_id), item]));
  const summary = {
    total_events: 0,
    hadir_count: 0,
    izin_count: 0,
    sakit_count: 0,
    alfa_count: 0,
    attendance_percent: 0,
    activity_status: 'pasif'
  };

  for (const event of events || []) {
    const record = recordMap.get(Number(event.id));
    let status = normalizeAttendanceStatus(record?.attendance_status);
    if (!status && String(event.status || '').toLowerCase() === 'closed') {
      status = 'alfa';
    }
    if (!status) continue;
    summary.total_events += 1;
    if (status === 'hadir') summary.hadir_count += 1;
    if (status === 'izin') summary.izin_count += 1;
    if (status === 'sakit') summary.sakit_count += 1;
    if (status === 'alfa') summary.alfa_count += 1;
  }

  if (summary.total_events > 0) {
    summary.attendance_percent = Math.round((summary.hadir_count / summary.total_events) * 100);
  }
  summary.activity_status = summary.attendance_percent >= 75 ? 'aktif' : 'pasif';
  return summary;
}

async function getPimpinanOptions() {
  const row = (await query`SELECT value FROM system_settings WHERE key='pimpinan_options'`).rows[0];
  let options = [];
  if (row?.value) {
    try {
      const parsed = JSON.parse(row.value);
      if (Array.isArray(parsed)) {
        options = parsed.map((item) => cleanString(item, 80)).filter(Boolean);
      }
    } catch {}
  }
  if (!options.length) {
    const fallbackRows = (await query`
      SELECT DISTINCT pimpinan
      FROM users
      WHERE COALESCE(TRIM(pimpinan), '') <> ''
      ORDER BY pimpinan ASC
    `).rows;
    options = fallbackRows.map((item) => cleanString(item.pimpinan, 80)).filter(Boolean);
  }
  return [...new Set(options)];
}

async function ensureAttendanceRooms() {
  await ensureSchema();
  const options = await getPimpinanOptions();
  for (const pimpinan of options) {
    const roomCode = generateDefaultRoomCode(pimpinan);
    await query`
      INSERT INTO attendance_rooms (pimpinan, room_code, is_active, created_at, updated_at)
      VALUES (${pimpinan}, ${roomCode}, ${true}, NOW(), NOW())
      ON CONFLICT (pimpinan)
      DO NOTHING
    `;
  }
  return (await query`
    SELECT id, pimpinan, room_code, is_active, created_at, updated_at
    FROM attendance_rooms
    ORDER BY pimpinan ASC
  `).rows;
}

async function getActiveOrgMembers() {
  return (await query`
    SELECT m.id, m.full_name, m.role_title, m.bidang_id, b.name AS bidang_name
    FROM org_members m
    LEFT JOIN org_bidang b ON b.id = m.bidang_id
    WHERE COALESCE(m.is_active, true) = true
    ORDER BY m.full_name ASC, m.id ASC
  `).rows;
}

async function getOrgMemberById(orgMemberId) {
  return (await query`
    SELECT m.id, m.full_name, m.role_title, m.bidang_id, b.name AS bidang_name, m.is_active
    FROM org_members m
    LEFT JOIN org_bidang b ON b.id = m.bidang_id
    WHERE m.id=${orgMemberId}
  `).rows[0] || null;
}

async function getAccountMembersByPimpinan(pimpinan) {
  return (await query`
    SELECT id, username, nama_panjang, pimpinan, role, created_at
    FROM users
    WHERE COALESCE(TRIM(pimpinan), '')=${cleanString(pimpinan, 80)}
    ORDER BY nama_panjang ASC NULLS LAST, username ASC
  `).rows;
}

async function getAccountMemberById(userId, pimpinan) {
  return (await query`
    SELECT id, username, nama_panjang, pimpinan, role, created_at
    FROM users
    WHERE id=${userId}
      AND COALESCE(TRIM(pimpinan), '')=${cleanString(pimpinan, 80)}
    LIMIT 1
  `).rows[0] || null;
}

async function syncExpiredEvents() {
  await query`
    UPDATE attendance_events
    SET status='closed',
        closed_at=COALESCE(closed_at, NOW()),
        updated_at=NOW()
    WHERE status='active'
      AND (created_at < (NOW() - INTERVAL '24 hours') OR event_date < ${todayDate()})
  `;
}

async function getRoomById(roomId) {
  const room = (await query`
    SELECT id, pimpinan, room_code, is_active, created_at, updated_at
    FROM attendance_rooms
    WHERE id=${roomId}
  `).rows[0] || null;
  return room ? { ...room, identity_mode: getIdentityMode(room) } : null;
}

async function getRoomSession(userId, roomId, accessToken) {
  if (!userId || !roomId || !accessToken) return null;
  return (await query`
    SELECT id, room_id, user_id, access_token, expires_at
    FROM attendance_room_sessions
    WHERE user_id=${userId}
      AND room_id=${roomId}
      AND access_token=${accessToken}
      AND expires_at > NOW()
  `).rows[0] || null;
}

async function requireRoomAccess(req, user, roomId) {
  const token = cleanString(req.headers?.[ROOM_ACCESS_HEADER] || req.query?.room_token || '', 120);
  const access = await getRoomSession(user.id, roomId, token);
  if (!access) {
    const error = new Error('Akses room tidak valid atau sudah kedaluwarsa');
    error.status = 403;
    throw error;
  }
  return access;
}

async function getActiveEventForRoom(roomId) {
  return (await query`
    SELECT e.id, e.room_id, e.title, e.description, e.event_date, e.status,
           e.created_by, e.created_at, e.updated_at, e.closed_at,
           u.username AS created_by_username,
           u.nama_panjang AS created_by_name
    FROM attendance_events e
    LEFT JOIN users u ON u.id = e.created_by
    WHERE e.room_id=${roomId}
      AND e.status='active'
      AND e.created_at >= (NOW() - INTERVAL '24 hours')
    ORDER BY e.created_at DESC
    LIMIT 1
  `).rows[0] || null;
}

async function getRoomHistory(roomId, limit = 12) {
  const rows = (await query`
    SELECT e.id, e.room_id, e.title, e.description, e.event_date, e.status,
           e.created_at, e.closed_at,
           u.username AS created_by_username,
           COALESCE(COUNT(r.id), 0)::int AS submitted_count,
           COALESCE(SUM(CASE WHEN r.attendance_status='hadir' THEN 1 ELSE 0 END), 0)::int AS hadir_count
    FROM attendance_events e
    LEFT JOIN users u ON u.id = e.created_by
    LEFT JOIN attendance_records r ON r.event_id = e.id
    WHERE e.room_id=${roomId}
    GROUP BY e.id, u.username
    ORDER BY e.event_date DESC, e.created_at DESC
    LIMIT ${limit}
  `).rows;
  return rows;
}

async function getEventById(eventId) {
  const event = (await query`
    SELECT e.id, e.room_id, e.title, e.description, e.event_date, e.status,
           e.created_by, e.created_at, e.updated_at, e.closed_at,
           room.pimpinan,
           room.is_active AS room_active
    FROM attendance_events e
    JOIN attendance_rooms room ON room.id = e.room_id
    WHERE e.id=${eventId}
  `).rows[0] || null;
  return event ? { ...event, identity_mode: getIdentityMode(event) } : null;
}

async function getRoomEvents(roomId) {
  return (await query`
    SELECT id, room_id, title, description, event_date, status, created_by, created_at, updated_at, closed_at
    FROM attendance_events
    WHERE room_id=${roomId}
    ORDER BY event_date DESC, created_at DESC
  `).rows;
}

async function getRoomRecords(roomId) {
  return (await query`
    SELECT r.id, r.event_id, r.user_id, r.org_member_id, r.attendee_name_snapshot, r.attendance_status, r.photo_url, r.check_in_at,
           r.submitted_by_admin, r.submitted_by, r.note, r.created_at, r.updated_at
    FROM attendance_records r
    JOIN attendance_events e ON e.id = r.event_id
    WHERE e.room_id=${roomId}
    ORDER BY r.updated_at DESC, r.id DESC
  `).rows;
}

async function getUserSummaryForRoom(roomId, userId) {
  const events = await getRoomEvents(roomId);
  const records = (await query`
    SELECT id, event_id, user_id, org_member_id, attendee_name_snapshot, attendance_status, photo_url, check_in_at, submitted_by_admin, submitted_by, note, created_at, updated_at
    FROM attendance_records
    WHERE user_id=${userId}
      AND event_id IN (
        SELECT id FROM attendance_events WHERE room_id=${roomId}
      )
    ORDER BY updated_at DESC, id DESC
  `).rows;
  return {
    summary: buildSummary(events, records),
    records
  };
}

async function buildRoomRecap(room) {
  const events = await getRoomEvents(room.id);
  const records = await getRoomRecords(room.id);
  if (getIdentityMode(room) === 'org_member_select') {
    const members = await getActiveOrgMembers();
    const recapUsers = members.map((member) => {
      const memberRecords = records
        .filter((record) => Number(record.org_member_id) === Number(member.id))
        .map((record) => ({ ...record, user_id: member.id }));
      const summary = buildSummary(events, memberRecords);
      return {
        id: member.id,
        username: '',
        nama_panjang: member.full_name,
        role_title: member.role_title,
        bidang_name: member.bidang_name || '',
        summary
      };
    });

    return {
      room_id: room.id,
      pimpinan: room.pimpinan,
      identity_mode: 'org_member_select',
      total_members: recapUsers.length,
      active_members: recapUsers.filter((item) => item.summary.activity_status === 'aktif').length,
      passive_members: recapUsers.filter((item) => item.summary.activity_status === 'pasif').length,
      users: recapUsers
    };
  }

  const users = (await query`
    SELECT id, username, nama_panjang, pimpinan, role, created_at
    FROM users
    WHERE COALESCE(TRIM(pimpinan), '')=${cleanString(room.pimpinan, 80)}
    ORDER BY nama_panjang ASC NULLS LAST, username ASC
  `).rows;

  const recapUsers = users.map((user) => {
    const userRecords = records.filter((record) => Number(record.user_id) === Number(user.id));
    const summary = buildSummary(events, userRecords);
    return {
      id: user.id,
      username: user.username,
      nama_panjang: user.nama_panjang,
      pimpinan: user.pimpinan,
      summary
    };
  });

  return {
    room_id: room.id,
    pimpinan: room.pimpinan,
    identity_mode: 'account_identity',
    total_members: recapUsers.length,
    active_members: recapUsers.filter((item) => item.summary.activity_status === 'aktif').length,
    passive_members: recapUsers.filter((item) => item.summary.activity_status === 'pasif').length,
    users: recapUsers
  };
}

function serializeRoomForUser(room, accessMap, activeEventMap) {
  return {
    id: room.id,
    pimpinan: room.pimpinan,
    identity_mode: getIdentityMode(room),
    is_active: room.is_active === true || String(room.is_active).toLowerCase() === 'true',
    has_access: accessMap.has(Number(room.id)),
    today_event: activeEventMap.get(Number(room.id)) || null
  };
}

async function handleRooms(req, res) {
  const user = await getSessionUser(req);
  if (!user) return json(res, 401, { status: 'error', message: 'Unauthorized' });

  await ensureAttendanceRooms();
  await syncExpiredEvents();

  const rooms = (await query`
    SELECT id, pimpinan, room_code, is_active, created_at, updated_at
    FROM attendance_rooms
    ORDER BY pimpinan ASC
  `).rows;
  const accessRows = (await query`
    SELECT room_id, access_token, expires_at
    FROM attendance_room_sessions
    WHERE user_id=${user.id}
      AND expires_at > NOW()
  `).rows;
  const activeEvents = (await query`
    SELECT id, room_id, title, event_date, status, created_at
    FROM attendance_events
    WHERE status='active'
      AND created_at >= (NOW() - INTERVAL '24 hours')
  `).rows;
  const accessMap = new Map(accessRows.map((item) => [Number(item.room_id), item]));
  const activeEventMap = new Map(activeEvents.map((item) => [Number(item.room_id), item]));

  return json(res, 200, {
    status: 'success',
    user: {
      id: user.id,
      username: user.username,
      nama_panjang: user.nama_panjang,
      pimpinan: user.pimpinan,
      role: user.role
    },
    rooms: rooms.map((room) => serializeRoomForUser(room, accessMap, activeEventMap))
  }, cacheHeaders(0));
}

async function handleMemberOptions(req, res) {
  const user = await getSessionUser(req);
  if (!user) return json(res, 401, { status: 'error', message: 'Unauthorized' });

  await ensureAttendanceRooms();
  const roomId = toNumber(req.query?.room_id);
  if (!roomId) return json(res, 400, { status: 'error', message: 'room_id wajib diisi' });
  const room = await getRoomById(roomId);
  if (!room) return json(res, 404, { status: 'error', message: 'Room tidak ditemukan' });

  if (room.identity_mode !== 'org_member_select') {
    return json(res, 200, { status: 'success', identity_mode: room.identity_mode, members: [] }, cacheHeaders(0));
  }

  const members = await getActiveOrgMembers();
  return json(res, 200, {
    status: 'success',
    identity_mode: room.identity_mode,
    members: members.map((item) => ({
      id: item.id,
      full_name: item.full_name || item.nama_panjang || item.username || '',
      role_title: item.role_title || item.role || '',
      bidang_name: item.bidang_name || cleanString(room.pimpinan, 80) || ''
    }))
  }, cacheHeaders(0));
}

async function handleVerifyRoom(req, res) {
  const user = await getSessionUser(req);
  if (!user) return json(res, 401, { status: 'error', message: 'Unauthorized' });

  await ensureAttendanceRooms();
  const body = parseJsonBody(req);
  const roomId = toNumber(body.room_id);
  const roomCode = normalizeRoomCode(body.room_code);
  if (!roomId || !roomCode) {
    return json(res, 400, { status: 'error', message: 'Room dan kode wajib diisi' });
  }

  const room = await getRoomById(roomId);
  if (!room || !(room.is_active === true || String(room.is_active).toLowerCase() === 'true')) {
    return json(res, 404, { status: 'error', message: 'Room tidak ditemukan atau tidak aktif' });
  }
  if (normalizeRoomCode(room.room_code) !== roomCode) {
    return json(res, 403, { status: 'error', message: 'Kode room tidak sesuai' });
  }

  const accessToken = generateAccessToken();
  const expiresAt = new Date(Date.now() + ROOM_SESSION_HOURS * 60 * 60 * 1000).toISOString();
  await query`
    INSERT INTO attendance_room_sessions (room_id, user_id, access_token, expires_at, created_at, updated_at)
    VALUES (${room.id}, ${user.id}, ${accessToken}, ${expiresAt}, NOW(), NOW())
    ON CONFLICT (room_id, user_id)
    DO UPDATE SET
      access_token=EXCLUDED.access_token,
      expires_at=EXCLUDED.expires_at,
      updated_at=NOW()
  `;

  return json(res, 200, {
    status: 'success',
    room: {
      id: room.id,
      pimpinan: room.pimpinan,
      identity_mode: room.identity_mode,
      is_active: room.is_active
    },
    access_token: accessToken,
    expires_at: expiresAt
  });
}

async function handleRoomDetail(req, res) {
  const user = await getSessionUser(req);
  if (!user) return json(res, 401, { status: 'error', message: 'Unauthorized' });

  await ensureAttendanceRooms();
  await syncExpiredEvents();

  const roomId = toNumber(req.query?.room_id);
  if (!roomId) return json(res, 400, { status: 'error', message: 'room_id wajib diisi' });

  const room = await getRoomById(roomId);
  if (!room) return json(res, 404, { status: 'error', message: 'Room tidak ditemukan' });
  try {
    await requireRoomAccess(req, user, room.id);
  } catch (error) {
    return json(res, error.status || 403, { status: 'error', message: error.message || 'Forbidden' });
  }

  const activeEvent = await getActiveEventForRoom(room.id);
  const history = await getRoomHistory(room.id, 14);
  const myState = await getUserSummaryForRoom(room.id, user.id);
  const roomMemberCount = getIdentityMode(room) === 'org_member_select'
    ? Number((await query`SELECT COUNT(*)::int AS c FROM org_members WHERE is_active = true`).rows[0]?.c || 0)
    : Number((await query`
      SELECT COUNT(*)::int AS c
      FROM users
      WHERE COALESCE(TRIM(pimpinan), '')=${cleanString(room.pimpinan, 80)}
    `).rows[0]?.c || 0);
  const currentRecord = activeEvent
    ? myState.records.find((item) => Number(item.event_id) === Number(activeEvent.id)) || null
    : null;

  let recentAttendees = [];
  let attendeesCount = 0;
  if (activeEvent) {
    recentAttendees = (await query`
      SELECT COALESCE(r.attendee_name_snapshot, m.full_name, u.nama_panjang, u.username) AS attendee_name,
             u.username,
             r.check_in_at
      FROM attendance_records r
      LEFT JOIN org_members m ON m.id = r.org_member_id
      LEFT JOIN users u ON u.id = r.user_id
      WHERE r.event_id=${activeEvent.id}
        AND r.attendance_status='hadir'
      ORDER BY r.check_in_at DESC
      LIMIT 10
    `).rows;
    attendeesCount = Number((await query`
      SELECT COUNT(*)::int AS c
      FROM attendance_records
      WHERE event_id=${activeEvent.id}
        AND attendance_status='hadir'
    `).rows[0]?.c || 0);
  }

  return json(res, 200, {
    status: 'success',
    room: {
      id: room.id,
      pimpinan: room.pimpinan,
      identity_mode: room.identity_mode,
      is_active: room.is_active,
      member_count: roomMemberCount
    },
    permissions: {
      can_create_event: true,
      can_self_check_in: canUserSelfCheckIn(user, room)
    },
    current_event: activeEvent ? {
      ...activeEvent,
      identity_mode: room.identity_mode,
      attendees_count: attendeesCount,
      recent_attendees: recentAttendees,
      my_record: currentRecord
        ? {
            id: currentRecord.id,
            org_member_id: currentRecord.org_member_id,
            attendee_name_snapshot: currentRecord.attendee_name_snapshot,
            attendance_status: currentRecord.attendance_status,
            photo_url: currentRecord.photo_url,
            check_in_at: currentRecord.check_in_at,
            submitted_by_admin: currentRecord.submitted_by_admin,
            note: currentRecord.note
          }
        : null
    } : null,
    history,
    my_summary: myState.summary
  }, cacheHeaders(0));
}

async function handleCreateEvent(req, res) {
  const user = await getSessionUser(req);
  if (!user) return json(res, 401, { status: 'error', message: 'Unauthorized' });

  await ensureAttendanceRooms();
  await syncExpiredEvents();

  const body = parseJsonBody(req);
  const roomId = toNumber(body.room_id);
  const title = cleanString(body.title, 140);
  const description = cleanString(body.description, 500);
  if (!roomId || !title) {
    return json(res, 400, { status: 'error', message: 'Room dan judul rapat wajib diisi' });
  }

  const room = await getRoomById(roomId);
  if (!room || !(room.is_active === true || String(room.is_active).toLowerCase() === 'true')) {
    return json(res, 404, { status: 'error', message: 'Room tidak ditemukan atau nonaktif' });
  }
  try {
    await requireRoomAccess(req, user, room.id);
  } catch (error) {
    return json(res, error.status || 403, { status: 'error', message: error.message || 'Forbidden' });
  }

  const existingActive = await getActiveEventForRoom(room.id);
  if (existingActive) {
    return json(res, 409, { status: 'error', message: 'Room ini sudah memiliki rapat aktif hari ini' });
  }

  const eventDate = todayDate();
  const created = (await query`
    INSERT INTO attendance_events (room_id, title, description, event_date, status, created_by, created_at, updated_at)
    VALUES (${room.id}, ${title}, ${description || null}, ${eventDate}, ${'active'}, ${user.id}, NOW(), NOW())
    RETURNING id, room_id, title, description, event_date, status, created_by, created_at, updated_at, closed_at
  `).rows[0];

  return json(res, 201, {
    status: 'success',
    event: { ...created, identity_mode: room.identity_mode }
  });
}

async function handleCheckIn(req, res) {
  const user = await getSessionUser(req);
  if (!user) return json(res, 401, { status: 'error', message: 'Unauthorized' });

  await ensureAttendanceRooms();
  await syncExpiredEvents();

  const body = parseJsonBody(req);
  const eventId = toNumber(body.event_id);
  const photoUrl = cleanString(body.photo_url, 256000);
  const orgMemberId = toNumber(body.org_member_id);
  const attendeeName = cleanString(body.attendee_name, 160);
  if (!eventId || !photoUrl) {
    return json(res, 400, { status: 'error', message: 'Rapat dan foto selfie wajib diisi' });
  }

  const event = await getEventById(eventId);
  if (!event) return json(res, 404, { status: 'error', message: 'Rapat tidak ditemukan' });
  if (cleanString(event.status, 20).toLowerCase() !== 'active' || (new Date() - new Date(event.created_at)) > 24 * 60 * 60 * 1000) {
    return json(res, 409, { status: 'error', message: 'Rapat tidak sedang aktif untuk absensi mandiri' });
  }
  if (!canUserSelfCheckIn(user, event)) {
    return json(res, 403, { status: 'error', message: 'Absensi mandiri hanya untuk anggota pimpinan room ini' });
  }
  try {
    await requireRoomAccess(req, user, event.room_id);
  } catch (error) {
    return json(res, error.status || 403, { status: 'error', message: error.message || 'Forbidden' });
  }

  let targetOrgMemberId = null;
  let targetUserId = user.id;
  let attendeeNameSnapshot = cleanString(user.nama_panjang || user.username, 160);
  if (event.identity_mode === 'org_member_select') {
    if (!orgMemberId) {
      return json(res, 400, { status: 'error', message: 'Nama anggota organisasi wajib dipilih untuk room cabang' });
    }
    const orgMember = await getOrgMemberById(orgMemberId);
    if (!orgMember || orgMember.is_active === false) {
      return json(res, 400, { status: 'error', message: 'Nama anggota organisasi tidak valid atau tidak aktif' });
    }
    const existingOrgMember = (await query`
      SELECT id
      FROM attendance_records
      WHERE event_id=${event.id}
        AND org_member_id=${orgMember.id}
    `).rows[0];
    if (existingOrgMember) {
      return json(res, 409, { status: 'error', message: 'Nama anggota ini sudah tercatat pada event yang sama' });
    }
    targetOrgMemberId = orgMember.id;
    attendeeNameSnapshot = cleanString(orgMember.full_name, 160);
  } else {
    if (!attendeeName) {
      return json(res, 400, { status: 'error', message: 'Tulis nama kader yang akan diabsenkan' });
    }
    targetUserId = null;
    attendeeNameSnapshot = attendeeName;
    const existing = (await query`
      SELECT id
      FROM attendance_records
      WHERE event_id=${event.id}
        AND LOWER(COALESCE(attendee_name_snapshot, '')) = LOWER(${attendeeNameSnapshot})
      LIMIT 1
    `).rows[0];
    if (existing) {
      return json(res, 409, { status: 'error', message: 'Kader ini sudah tercatat pada event yang sama' });
    }
  }

  let record;
  try {
    record = (await query`
      INSERT INTO attendance_records (
        event_id, user_id, org_member_id, attendee_name_snapshot, attendance_status, photo_url, check_in_at,
        submitted_by_admin, submitted_by, note, created_at, updated_at
      )
      VALUES (
        ${event.id}, ${targetUserId}, ${targetOrgMemberId}, ${attendeeNameSnapshot}, ${'hadir'}, ${photoUrl}, NOW(),
        ${false}, ${user.id}, ${null}, NOW(), NOW()
      )
      RETURNING id, event_id, user_id, org_member_id, attendee_name_snapshot, attendance_status, photo_url, check_in_at, submitted_by_admin, submitted_by, note, created_at, updated_at
    `).rows[0];
  } catch (error) {
    const message = String(error?.message || '');
    if (message.includes('idx_attendance_records_event_org_member_unique') || message.includes('attendance_records_event_id_org_member_id')) {
      return json(res, 409, { status: 'error', message: 'Nama anggota ini sudah tercatat pada event yang sama' });
    }
    if (message.includes('idx_attendance_records_event_user_account_unique') || message.includes('attendance_records_event_id_user_id_key')) {
      return json(res, 409, { status: 'error', message: 'Kader ini sudah tercatat pada event yang sama' });
    }
    throw error;
  }

  return json(res, 201, { status: 'success', record });
}

async function handleMySummary(req, res) {
  const user = await getSessionUser(req);
  if (!user) return json(res, 401, { status: 'error', message: 'Unauthorized' });

  await ensureAttendanceRooms();
  await syncExpiredEvents();

  const rooms = (await query`
    SELECT id, pimpinan, room_code, is_active
    FROM attendance_rooms
    ORDER BY pimpinan ASC
  `).rows;

  const summaries = [];
  for (const room of rooms) {
    const data = await getUserSummaryForRoom(room.id, user.id);
    summaries.push({
      room_id: room.id,
      pimpinan: room.pimpinan,
      identity_mode: getIdentityMode(room),
      summary: data.summary
    });
  }

  return json(res, 200, {
    status: 'success',
    summaries
  }, cacheHeaders(0));
}

async function handleAdminOverview(req, res) {
  try {
    await requireAdminAuth(req);
  } catch (error) {
    return json(res, 401, { status: 'error', message: error.message || 'Unauthorized' });
  }

  await ensureAttendanceRooms();
  await syncExpiredEvents();

  const rooms = (await query`
    SELECT id, pimpinan, room_code, is_active, created_at, updated_at
    FROM attendance_rooms
    ORDER BY pimpinan ASC
  `).rows;

  const roomCards = [];
  for (const room of rooms) {
    const recap = await buildRoomRecap(room);
    const activeEvent = await getActiveEventForRoom(room.id);
    const history = await getRoomHistory(room.id, 6);
    roomCards.push({
      id: room.id,
      pimpinan: room.pimpinan,
      identity_mode: getIdentityMode(room),
      room_code: room.room_code,
      is_active: room.is_active,
      active_event: activeEvent,
      latest_events: history,
      recap: {
        total_members: recap.total_members,
        active_members: recap.active_members,
        passive_members: recap.passive_members
      }
    });
  }

  return json(res, 200, {
    status: 'success',
    rooms: roomCards
  }, cacheHeaders(0));
}

async function handleAdminEventDetail(req, res) {
  try {
    await requireAdminAuth(req);
  } catch (error) {
    return json(res, 401, { status: 'error', message: error.message || 'Unauthorized' });
  }

  await ensureAttendanceRooms();
  await syncExpiredEvents();

  const eventId = toNumber(req.query?.event_id);
  if (!eventId) return json(res, 400, { status: 'error', message: 'event_id wajib diisi' });

  const event = await getEventById(eventId);
  if (!event) return json(res, 404, { status: 'error', message: 'Event tidak ditemukan' });

  const records = (await query`
    SELECT r.id, r.event_id, r.user_id, r.org_member_id, r.attendee_name_snapshot, r.attendance_status, r.photo_url, r.check_in_at,
           r.submitted_by_admin, r.submitted_by, r.note, r.created_at, r.updated_at,
           submitter.username AS submitted_by_username,
           u.username,
           u.nama_panjang,
           m.full_name AS org_member_name,
           m.role_title AS org_member_role_title,
           b.name AS org_member_bidang_name
    FROM attendance_records r
    LEFT JOIN users submitter ON submitter.id = r.submitted_by
    LEFT JOIN users u ON u.id = r.user_id
    LEFT JOIN org_members m ON m.id = r.org_member_id
    LEFT JOIN org_bidang b ON b.id = m.bidang_id
    WHERE r.event_id=${event.id}
    ORDER BY r.updated_at DESC, r.id DESC
  `).rows;
  let participants = [];
  if (event.identity_mode === 'org_member_select') {
    const members = await getActiveOrgMembers();
    const recordMap = new Map(records.map((item) => [Number(item.org_member_id), item]));
    participants = members.map((member) => {
      const record = recordMap.get(Number(member.id)) || null;
      const fallbackStatus = cleanString(event.status, 20).toLowerCase() === 'closed' ? 'alfa' : 'belum';
      return {
        id: member.id,
        user_id: record?.user_id || null,
        org_member_id: member.id,
        username: record?.username || '',
        nama_panjang: member.full_name,
        display_name: record?.attendee_name_snapshot || member.full_name,
        role_title: member.role_title || '',
        bidang_name: member.bidang_name || '',
        pimpinan: event.pimpinan,
        attendance_status: record ? record.attendance_status : fallbackStatus,
        photo_url: record?.photo_url || '',
        check_in_at: record?.check_in_at || null,
        source: record ? (record.submitted_by_admin ? 'admin manual' : 'self check-in') : 'belum absen',
        note: record?.note || '',
        record_id: record?.id || null,
        submitted_by_username: record?.submitted_by_username || ''
      };
    });
  } else {
    const members = (await query`
      SELECT id, username, nama_panjang, pimpinan, role, created_at
      FROM users
      WHERE COALESCE(TRIM(pimpinan), '')=${cleanString(event.pimpinan, 80)}
      ORDER BY nama_panjang ASC NULLS LAST, username ASC
    `).rows;
    const recordMap = new Map(records.map((item) => [Number(item.user_id), item]));
    participants = members.map((member) => {
      const record = recordMap.get(Number(member.id)) || null;
      const fallbackStatus = cleanString(event.status, 20).toLowerCase() === 'closed' ? 'alfa' : 'belum';
      return {
        id: member.id,
        user_id: member.id,
        org_member_id: null,
        username: member.username,
        nama_panjang: member.nama_panjang,
        display_name: member.nama_panjang || member.username,
        role_title: '',
        bidang_name: '',
        pimpinan: member.pimpinan,
        attendance_status: record ? record.attendance_status : fallbackStatus,
        photo_url: record?.photo_url || '',
        check_in_at: record?.check_in_at || null,
        source: record ? (record.submitted_by_admin ? 'admin manual' : 'self check-in') : 'belum absen',
        note: record?.note || '',
        record_id: record?.id || null,
        submitted_by_username: record?.submitted_by_username || ''
      };
    });
    const manualParticipants = records
      .filter((item) => !item.user_id && cleanString(item.attendee_name_snapshot, 160))
      .map((record) => ({
        id: `manual-${record.id}`,
        user_id: null,
        org_member_id: null,
        username: '',
        nama_panjang: record.attendee_name_snapshot,
        display_name: record.attendee_name_snapshot,
        role_title: '',
        bidang_name: '',
        pimpinan: event.pimpinan,
        attendance_status: record.attendance_status || 'belum',
        photo_url: record.photo_url || '',
        check_in_at: record.check_in_at || null,
        source: record.submitted_by_admin ? 'admin manual' : 'self check-in',
        note: record.note || '',
        record_id: record.id,
        submitted_by_username: record.submitted_by_username || ''
      }));
    participants = [...participants, ...manualParticipants];
  }

  const summary = participants.reduce((acc, item) => {
    const key = normalizeAttendanceStatus(item.attendance_status) || 'belum';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, { hadir: 0, izin: 0, sakit: 0, alfa: 0, belum: 0 });

  return json(res, 200, {
    status: 'success',
    event: { ...event, identity_mode: event.identity_mode },
    participants,
    summary
  }, cacheHeaders(0));
}

async function handleAdminRoomEvents(req, res) {
  try {
    await requireAdminAuth(req);
  } catch (error) {
    return json(res, 401, { status: 'error', message: error.message || 'Unauthorized' });
  }

  await ensureAttendanceRooms();
  await syncExpiredEvents();

  const roomId = toNumber(req.query?.room_id);
  if (!roomId) return json(res, 400, { status: 'error', message: 'room_id wajib diisi' });

  const room = await getRoomById(roomId);
  if (!room) return json(res, 404, { status: 'error', message: 'Room tidak ditemukan' });

  const events = await getRoomHistory(room.id, 30);
  const recap = await buildRoomRecap(room);
  return json(res, 200, {
    status: 'success',
    room: {
      id: room.id,
      pimpinan: room.pimpinan,
      identity_mode: room.identity_mode,
      room_code: room.room_code,
      is_active: room.is_active
    },
    events,
    recap
  }, cacheHeaders(0));
}

async function handleExportEvent(req, res) {
  const user = await getSessionUser(req);
  if (!user) return json(res, 401, { status: 'error', message: 'Unauthorized' });

  const eventId = toNumber(req.query?.event_id);
  if (!eventId) return json(res, 400, { status: 'error', message: 'event_id wajib diisi' });

  const event = await getEventById(eventId);
  if (!event) return json(res, 404, { status: 'error', message: 'Event tidak ditemukan' });

  // Safety check: require room access or admin
  let isAdmin = false;
  try {
    await requireAdminAuth(req);
    isAdmin = true;
  } catch {}

  if (!isAdmin) {
    try {
      await requireRoomAccess(req, user, event.room_id);
    } catch (e) {
      return json(res, 403, { status: 'error', message: 'Anda tidak memiliki akses untuk mengekspor data room ini' });
    }
  }

  // Reuse AdminEventDetail logic to get participants list
  const records = (await query`
    SELECT r.id, r.event_id, r.user_id, r.org_member_id, r.attendee_name_snapshot, r.attendance_status, r.photo_url, r.check_in_at,
           r.submitted_by_admin, r.note, r.created_at,
           u.username, u.nama_panjang,
           m.full_name AS org_member_name,
           m.role_title AS org_member_role_title,
           b.name AS org_member_bidang_name
    FROM attendance_records r
    LEFT JOIN users u ON u.id = r.user_id
    LEFT JOIN org_members m ON m.id = r.org_member_id
    LEFT JOIN org_bidang b ON b.id = m.bidang_id
    WHERE r.event_id=${event.id}
    ORDER BY r.check_in_at ASC, r.id ASC
  `).rows;

  const exportData = records.map(r => ({
    nama: r.attendee_name_snapshot || r.org_member_name || r.nama_panjang || r.username || '-',
    jabatan: r.org_member_role_title || '-',
    bidang: r.org_member_bidang_name || '-',
    status: r.attendance_status,
    waktu_absen: r.check_in_at ? new Date(r.check_in_at).toLocaleString('id-ID') : '-',
    sumber: r.submitted_by_admin ? 'Admin' : 'Mandiri',
    foto: r.photo_url || '-',
    catatan: r.note || '-'
  }));

  return json(res, 200, {
    status: 'success',
    event: {
      title: event.title,
      date: event.event_date,
      pimpinan: event.pimpinan
    },
    data: exportData
  });
}

async function handleUpdateRoomCode(req, res) {
  let admin = null;
  try {
    admin = await requireAdminAuth(req);
  } catch (error) {
    return json(res, 401, { status: 'error', message: error.message || 'Unauthorized' });
  }

  await ensureAttendanceRooms();

  const body = parseJsonBody(req);
  const roomId = toNumber(body.room_id);
  const roomCode = normalizeRoomCode(body.room_code);
  const isActive = body.is_active === undefined ? undefined : !!body.is_active;
  if (!roomId || !roomCode) {
    return json(res, 400, { status: 'error', message: 'Room dan kode wajib diisi' });
  }

  const updates = ['room_code = $1', 'updated_at = NOW()'];
  const params = [roomCode];
  if (isActive !== undefined) {
    updates.push(`is_active = $${params.length + 1}`);
    params.push(isActive);
  }
  params.push(roomId);
  await rawQuery(`UPDATE attendance_rooms SET ${updates.join(', ')} WHERE id = $${params.length}`, params);
  await query`
    INSERT INTO activity_logs (admin_id, action, details)
    VALUES (${admin.id}, ${'UPDATE_ATTENDANCE_ROOM'}, ${{ room_id: roomId, room_code: roomCode, is_active: isActive }})
  `;

  const room = await getRoomById(roomId);
  return json(res, 200, { status: 'success', room });
}

async function handleManualRecord(req, res) {
  let admin = null;
  try {
    admin = await requireAdminAuth(req);
  } catch (error) {
    return json(res, 401, { status: 'error', message: error.message || 'Unauthorized' });
  }

  await ensureAttendanceRooms();
  await syncExpiredEvents();

  const body = parseJsonBody(req);
  const eventId = toNumber(body.event_id);
  const userId = toNumber(body.user_id);
  const orgMemberId = toNumber(body.org_member_id);
  const attendanceStatus = normalizeAttendanceStatus(body.attendance_status);
  const photoUrl = cleanString(body.photo_url, 256000) || null;
  const note = cleanString(body.note, 300) || null;
  if (!eventId || !attendanceStatus) {
    return json(res, 400, { status: 'error', message: 'Rapat dan status wajib diisi' });
  }

  const event = await getEventById(eventId);
  if (!event) return json(res, 404, { status: 'error', message: 'Rapat tidak ditemukan' });

  let targetUserId = userId || null;
  let targetOrgMemberId = null;
  let attendeeNameSnapshot = '';
  let existing = null;
  if (event.identity_mode === 'org_member_select') {
    if (!orgMemberId) {
      return json(res, 400, { status: 'error', message: 'Nama anggota organisasi wajib dipilih untuk room cabang' });
    }
    const orgMember = await getOrgMemberById(orgMemberId);
    if (!orgMember || orgMember.is_active === false) {
      return json(res, 404, { status: 'error', message: 'Anggota organisasi tidak ditemukan' });
    }
    targetOrgMemberId = orgMember.id;
    attendeeNameSnapshot = cleanString(orgMember.full_name, 160);
    existing = (await query`
      SELECT id
      FROM attendance_records
      WHERE event_id=${event.id}
        AND org_member_id=${targetOrgMemberId}
    `).rows[0];
  } else {
    if (!userId) {
      return json(res, 400, { status: 'error', message: 'User wajib dipilih untuk room ini' });
    }
    const targetUser = (await query`
      SELECT id, username, nama_panjang, pimpinan
      FROM users
      WHERE id=${userId}
    `).rows[0];
    if (!targetUser) return json(res, 404, { status: 'error', message: 'User tidak ditemukan' });
    if (cleanString(targetUser.pimpinan, 80) !== cleanString(event.pimpinan, 80)) {
      return json(res, 400, { status: 'error', message: 'User tidak termasuk pimpinan room event ini' });
    }
    targetUserId = targetUser.id;
    attendeeNameSnapshot = cleanString(targetUser.nama_panjang || targetUser.username, 160);
    existing = (await query`
      SELECT id
      FROM attendance_records
      WHERE event_id=${event.id}
        AND user_id=${targetUserId}
    `).rows[0];
  }

  let record = null;
  if (existing) {
    record = (await query`
      UPDATE attendance_records
      SET user_id=${targetUserId},
          org_member_id=${targetOrgMemberId},
          attendee_name_snapshot=${attendeeNameSnapshot},
          attendance_status=${attendanceStatus},
          photo_url=${photoUrl},
          check_in_at=NOW(),
          submitted_by_admin=${true},
          submitted_by=${admin.id},
          note=${note},
          updated_at=NOW()
      WHERE id=${existing.id}
      RETURNING id, event_id, user_id, org_member_id, attendee_name_snapshot, attendance_status, photo_url, check_in_at, submitted_by_admin, submitted_by, note, created_at, updated_at
    `).rows[0];
  } else {
    record = (await query`
      INSERT INTO attendance_records (
        event_id, user_id, org_member_id, attendee_name_snapshot, attendance_status, photo_url, check_in_at,
        submitted_by_admin, submitted_by, note, created_at, updated_at
      )
      VALUES (
        ${event.id}, ${targetUserId}, ${targetOrgMemberId}, ${attendeeNameSnapshot}, ${attendanceStatus}, ${photoUrl}, NOW(),
        ${true}, ${admin.id}, ${note}, NOW(), NOW()
      )
      RETURNING id, event_id, user_id, org_member_id, attendee_name_snapshot, attendance_status, photo_url, check_in_at, submitted_by_admin, submitted_by, note, created_at, updated_at
    `).rows[0];
  }

  await query`
    INSERT INTO activity_logs (admin_id, action, details)
    VALUES (${admin.id}, ${'MANUAL_ATTENDANCE_RECORD'}, ${{ event_id: event.id, user_id: targetUserId, org_member_id: targetOrgMemberId, attendance_status: attendanceStatus }})
  `;

  return json(res, 200, { status: 'success', record });
}

async function handleCloseEvent(req, res) {
  let admin = null;
  try {
    admin = await requireAdminAuth(req);
  } catch (error) {
    return json(res, 401, { status: 'error', message: error.message || 'Unauthorized' });
  }

  const body = parseJsonBody(req);
  const eventId = toNumber(body.event_id);
  if (!eventId) return json(res, 400, { status: 'error', message: 'event_id wajib diisi' });

  await query`
    UPDATE attendance_events
    SET status='closed', closed_at=NOW(), updated_at=NOW()
    WHERE id=${eventId}
  `;
  await query`
    INSERT INTO activity_logs (admin_id, action, details)
    VALUES (${admin.id}, ${'CLOSE_ATTENDANCE_EVENT'}, ${{ event_id: eventId }})
  `;
  const event = await getEventById(eventId);
  return json(res, 200, { status: 'success', event });
}

module.exports = async (req, res) => {
  try {
    const action = cleanString(req.query?.action || '', 60);
    if (req.method === 'GET') {
      if (action === 'rooms') return await handleRooms(req, res);
      if (action === 'roomDetail') return await handleRoomDetail(req, res);
      if (action === 'memberOptions' || action === 'members') return await handleMemberOptions(req, res);
      if (action === 'mySummary') return await handleMySummary(req, res);
      if (action === 'adminOverview') return await handleAdminOverview(req, res);
      if (action === 'adminEventDetail') return await handleAdminEventDetail(req, res);
      if (action === 'adminRoomEvents') return await handleAdminRoomEvents(req, res);
      if (action === 'exportEvent') return await handleExportEvent(req, res);
      return json(res, 404, { status: 'error', message: `Unknown action: ${action}` });
    }

    if (req.method === 'POST') {
      if (action === 'verifyRoom') return await handleVerifyRoom(req, res);
      if (action === 'createEvent') return await handleCreateEvent(req, res);
      if (action === 'checkIn') return await handleCheckIn(req, res);
      if (action === 'updateRoomCode') return await handleUpdateRoomCode(req, res);
      if (action === 'manualRecord') return await handleManualRecord(req, res);
      if (action === 'closeEvent') return await handleCloseEvent(req, res);
      return json(res, 404, { status: 'error', message: `Unknown action: ${action}` });
    }

    return json(res, 405, { status: 'error', message: 'Method not allowed' });
  } catch (error) {
    return json(res, 500, { status: 'error', message: String(error?.message || error) });
  }
};
