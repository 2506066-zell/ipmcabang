const crypto = require('crypto');
const { query, rawQuery } = require('./_db');
const { json, cacheHeaders, parseJsonBody } = require('./_util');
const { getSessionUser, requireAdminAuth } = require('./_auth');

const ROOM_ACCESS_HEADER = 'x-room-access';
const ROOM_SESSION_HOURS = 12;
const VALID_STATUSES = new Set(['hadir', 'izin', 'sakit', 'alfa']);
const APP_TIMEZONE = 'Asia/Bangkok';

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

async function syncExpiredEvents() {
  await query`
    UPDATE attendance_events
    SET status='closed',
        closed_at=COALESCE(closed_at, NOW()),
        updated_at=NOW()
    WHERE status='active'
      AND event_date < ${todayDate()}
  `;
}

async function getRoomById(roomId) {
  return (await query`
    SELECT id, pimpinan, room_code, is_active, created_at, updated_at
    FROM attendance_rooms
    WHERE id=${roomId}
  `).rows[0] || null;
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
      AND e.event_date=${todayDate()}
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
  return (await query`
    SELECT e.id, e.room_id, e.title, e.description, e.event_date, e.status,
           e.created_by, e.created_at, e.updated_at, e.closed_at,
           room.pimpinan,
           room.is_active AS room_active
    FROM attendance_events e
    JOIN attendance_rooms room ON room.id = e.room_id
    WHERE e.id=${eventId}
  `).rows[0] || null;
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
    SELECT r.id, r.event_id, r.user_id, r.attendance_status, r.photo_url, r.check_in_at,
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
    SELECT id, event_id, user_id, attendance_status, photo_url, check_in_at, submitted_by_admin, submitted_by, note, created_at, updated_at
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
      AND event_date=${todayDate()}
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
  const currentRecord = activeEvent
    ? myState.records.find((item) => Number(item.event_id) === Number(activeEvent.id)) || null
    : null;

  return json(res, 200, {
    status: 'success',
    room: {
      id: room.id,
      pimpinan: room.pimpinan,
      is_active: room.is_active
    },
    permissions: {
      can_create_event: true,
      can_self_check_in: cleanString(user.pimpinan, 80) === cleanString(room.pimpinan, 80)
    },
    current_event: activeEvent ? {
      ...activeEvent,
      my_record: currentRecord
        ? {
            id: currentRecord.id,
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
    return json(res, 400, { status: 'error', message: 'Room dan judul event wajib diisi' });
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
    return json(res, 409, { status: 'error', message: 'Room ini sudah memiliki event aktif hari ini' });
  }

  const eventDate = todayDate();
  const created = (await query`
    INSERT INTO attendance_events (room_id, title, description, event_date, status, created_by, created_at, updated_at)
    VALUES (${room.id}, ${title}, ${description || null}, ${eventDate}, ${'active'}, ${user.id}, NOW(), NOW())
    RETURNING id, room_id, title, description, event_date, status, created_by, created_at, updated_at, closed_at
  `).rows[0];

  return json(res, 201, {
    status: 'success',
    event: created
  });
}

async function handleCheckIn(req, res) {
  const user = await getSessionUser(req);
  if (!user) return json(res, 401, { status: 'error', message: 'Unauthorized' });

  await ensureAttendanceRooms();
  await syncExpiredEvents();

  const body = parseJsonBody(req);
  const eventId = toNumber(body.event_id);
  const photoUrl = cleanString(body.photo_url, 500);
  if (!eventId || !photoUrl) {
    return json(res, 400, { status: 'error', message: 'Event dan foto selfie wajib diisi' });
  }

  const event = await getEventById(eventId);
  if (!event) return json(res, 404, { status: 'error', message: 'Event tidak ditemukan' });
  if (cleanString(event.status, 20).toLowerCase() !== 'active' || formatDateInZone(new Date(event.event_date), APP_TIMEZONE) !== todayDate()) {
    return json(res, 409, { status: 'error', message: 'Event tidak sedang aktif untuk absensi mandiri' });
  }
  if (cleanString(user.pimpinan, 80) !== cleanString(event.pimpinan, 80)) {
    return json(res, 403, { status: 'error', message: 'Absensi mandiri hanya untuk anggota pimpinan room ini' });
  }
  try {
    await requireRoomAccess(req, user, event.room_id);
  } catch (error) {
    return json(res, error.status || 403, { status: 'error', message: error.message || 'Forbidden' });
  }

  const existing = (await query`
    SELECT id, attendance_status
    FROM attendance_records
    WHERE event_id=${event.id}
      AND user_id=${user.id}
  `).rows[0];
  if (existing) {
    return json(res, 409, { status: 'error', message: 'Anda sudah tercatat pada event ini' });
  }

  const record = (await query`
    INSERT INTO attendance_records (
      event_id, user_id, attendance_status, photo_url, check_in_at,
      submitted_by_admin, submitted_by, note, created_at, updated_at
    )
    VALUES (
      ${event.id}, ${user.id}, ${'hadir'}, ${photoUrl}, NOW(),
      ${false}, ${user.id}, ${null}, NOW(), NOW()
    )
    RETURNING id, event_id, user_id, attendance_status, photo_url, check_in_at, submitted_by_admin, submitted_by, note, created_at, updated_at
  `).rows[0];

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

  const members = (await query`
    SELECT id, username, nama_panjang, pimpinan, role, created_at
    FROM users
    WHERE COALESCE(TRIM(pimpinan), '')=${cleanString(event.pimpinan, 80)}
    ORDER BY nama_panjang ASC NULLS LAST, username ASC
  `).rows;
  const records = (await query`
    SELECT r.id, r.event_id, r.user_id, r.attendance_status, r.photo_url, r.check_in_at,
           r.submitted_by_admin, r.submitted_by, r.note, r.created_at, r.updated_at,
           submitter.username AS submitted_by_username
    FROM attendance_records r
    LEFT JOIN users submitter ON submitter.id = r.submitted_by
    WHERE r.event_id=${event.id}
    ORDER BY r.updated_at DESC, r.id DESC
  `).rows;
  const recordMap = new Map(records.map((item) => [Number(item.user_id), item]));
  const participants = members.map((member) => {
    const record = recordMap.get(Number(member.id)) || null;
    const fallbackStatus = cleanString(event.status, 20).toLowerCase() === 'closed' ? 'alfa' : 'belum';
    return {
      id: member.id,
      username: member.username,
      nama_panjang: member.nama_panjang,
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

  const summary = participants.reduce((acc, item) => {
    const key = normalizeAttendanceStatus(item.attendance_status) || 'belum';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, { hadir: 0, izin: 0, sakit: 0, alfa: 0, belum: 0 });

  return json(res, 200, {
    status: 'success',
    event,
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
      room_code: room.room_code,
      is_active: room.is_active
    },
    events,
    recap
  }, cacheHeaders(0));
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
  const attendanceStatus = normalizeAttendanceStatus(body.attendance_status);
  const photoUrl = cleanString(body.photo_url, 500) || null;
  const note = cleanString(body.note, 300) || null;
  if (!eventId || !userId || !attendanceStatus) {
    return json(res, 400, { status: 'error', message: 'Event, user, dan status wajib diisi' });
  }

  const event = await getEventById(eventId);
  if (!event) return json(res, 404, { status: 'error', message: 'Event tidak ditemukan' });

  const targetUser = (await query`
    SELECT id, username, nama_panjang, pimpinan
    FROM users
    WHERE id=${userId}
  `).rows[0];
  if (!targetUser) return json(res, 404, { status: 'error', message: 'User tidak ditemukan' });
  if (cleanString(targetUser.pimpinan, 80) !== cleanString(event.pimpinan, 80)) {
    return json(res, 400, { status: 'error', message: 'User tidak termasuk pimpinan room event ini' });
  }

  const record = (await query`
    INSERT INTO attendance_records (
      event_id, user_id, attendance_status, photo_url, check_in_at,
      submitted_by_admin, submitted_by, note, created_at, updated_at
    )
    VALUES (
      ${event.id}, ${targetUser.id}, ${attendanceStatus}, ${photoUrl}, NOW(),
      ${true}, ${admin.id}, ${note}, NOW(), NOW()
    )
    ON CONFLICT (event_id, user_id)
    DO UPDATE SET
      attendance_status=EXCLUDED.attendance_status,
      photo_url=EXCLUDED.photo_url,
      check_in_at=NOW(),
      submitted_by_admin=${true},
      submitted_by=${admin.id},
      note=EXCLUDED.note,
      updated_at=NOW()
    RETURNING id, event_id, user_id, attendance_status, photo_url, check_in_at, submitted_by_admin, submitted_by, note, created_at, updated_at
  `).rows[0];

  await query`
    INSERT INTO activity_logs (admin_id, action, details)
    VALUES (${admin.id}, ${'MANUAL_ATTENDANCE_RECORD'}, ${{ event_id: event.id, user_id: targetUser.id, attendance_status: attendanceStatus }})
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
      if (action === 'mySummary') return await handleMySummary(req, res);
      if (action === 'adminOverview') return await handleAdminOverview(req, res);
      if (action === 'adminEventDetail') return await handleAdminEventDetail(req, res);
      if (action === 'adminRoomEvents') return await handleAdminRoomEvents(req, res);
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
