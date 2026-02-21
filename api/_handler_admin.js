const { query } = require('./_db');
const { json, parseJsonBody } = require('./_util');
const { requireAdminAuth } = require('./_auth');
const { ensureSchema } = require('./_bootstrap');
const { hashPassword } = require('./_password');

const DEFAULT_GAMIFICATION = {
    enabled: true,
    timer_seconds: 20,
    xp_base: 10,
    streak_bonus: 2,
    streak_cap: 5,
    quest_daily_target: 3,
    quest_highscore_target: 2,
    highscore_percent: 80
};

const DEFAULT_PIMPINAN_OPTIONS = [];

async function getGamificationSettings() {
    const row = (await query`SELECT value FROM system_settings WHERE key='gamification_settings'`).rows[0];
    if (!row || !row.value) return DEFAULT_GAMIFICATION;
    try {
        const parsed = JSON.parse(row.value);
        return { ...DEFAULT_GAMIFICATION, ...(parsed || {}) };
    } catch {
        return DEFAULT_GAMIFICATION;
    }
}

async function saveGamificationSettings(payload) {
    const merged = { ...DEFAULT_GAMIFICATION, ...(payload || {}) };
    const serialized = JSON.stringify(merged);
    await query`INSERT INTO system_settings (key, value, updated_at) VALUES ('gamification_settings', ${serialized}, NOW())
        ON CONFLICT (key) DO UPDATE SET value=${serialized}, updated_at=NOW()`;
    return merged;
}

async function getPimpinanOptions() {
    const row = (await query`SELECT value FROM system_settings WHERE key='pimpinan_options'`).rows[0];
    if (!row || !row.value) return DEFAULT_PIMPINAN_OPTIONS;
    try {
        const parsed = JSON.parse(row.value);
        if (Array.isArray(parsed)) {
            return parsed.map(item => String(item || '').trim()).filter(Boolean);
        }
        return DEFAULT_PIMPINAN_OPTIONS;
    } catch {
        return DEFAULT_PIMPINAN_OPTIONS;
    }
}

async function savePimpinanOptions(payload) {
    const raw = Array.isArray(payload) ? payload : (Array.isArray(payload?.options) ? payload.options : []);
    const cleaned = [];
    const seen = new Set();
    raw.forEach(item => {
        const val = String(item || '').trim();
        if (!val) return;
        const key = val.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        cleaned.push(val);
    });
    const serialized = JSON.stringify(cleaned);
    await query`INSERT INTO system_settings (key, value, updated_at) VALUES ('pimpinan_options', ${serialized}, NOW())
        ON CONFLICT (key) DO UPDATE SET value=${serialized}, updated_at=NOW()`;
    return cleaned;
}

function parseTarget(rawTarget) {
    const raw = String(rawTarget || 'all').trim();
    if (!raw || raw === 'all') {
        return { type: 'all', value: null, label: 'Semua User' };
    }
    if (raw.startsWith('pimpinan:')) {
        const value = raw.slice('pimpinan:'.length).trim();
        return { type: 'pimpinan', value: value || null, label: value || 'Pimpinan' };
    }
    return { type: 'pimpinan', value: raw, label: raw };
}

async function getTargetUserIds(target) {
    if (!target || target.type === 'all') return null;
    if (!target.value) return [];
    const rows = (await query`
        SELECT id FROM users 
        WHERE LOWER(pimpinan)=LOWER(${target.value})
        AND (role='user' OR role IS NULL)
    `).rows;
    return rows.map(r => r.id);
}

async function saveInAppNotifications(message, target, userIds) {
    if (!message) return 0;
    if (!target || target.type === 'all') {
        const res = await query`
            INSERT INTO notifications (user_id, message)
            SELECT id, ${message} FROM users WHERE role='user' OR role IS NULL
        `;
        return res.rows?.length || 0;
    }
    if (!Array.isArray(userIds) || userIds.length === 0) return 0;
    const { rawQuery } = require('./_db');
    await rawQuery(
        'INSERT INTO notifications (user_id, message) SELECT id, $1 FROM users WHERE id = ANY($2::int[])',
        [message, userIds]
    );
    return userIds.length;
}

async function sendPushToTarget(payload, target, userIds) {
    try {
        const { sendToAll, sendToUsers } = require('./_push');
        if (!target || target.type === 'all') {
            return await sendToAll(payload);
        }
        if (!Array.isArray(userIds) || userIds.length === 0) return { sent: 0, failed: 0 };
        return await sendToUsers(userIds, payload);
    } catch (e) {
        console.error('Push send failed:', e);
        return { sent: 0, failed: 0, error: e.message || String(e) };
    }
}

async function sendNotificationToTarget({ title, message, url, save, target }) {
    const msg = title && message ? `${title} - ${message}` : (message || title || '');
    const userIds = await getTargetUserIds(target);
    if (save !== false) {
        await saveInAppNotifications(msg, target, userIds);
    }
    await sendPushToTarget({
        title: title || 'Notifikasi IPM',
        body: message || title || 'Ada pembaruan baru.',
        url: url || '/'
    }, target, userIds);
    return { userCount: Array.isArray(userIds) ? userIds.length : null };
}

// --- Questions Management ---

async function handleCreate(req, res) {
    try { await requireAdminAuth(req); } catch (e) { return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' }); }
    const b = parseJsonBody(req);
    const q = String(b.question || '').trim();
    const options = b.options || {};
    const correct = String(b.correct_answer || '').trim();
    const active = Boolean(b.active !== false);
    const category = b.category ? String(b.category) : null;
    const quiz_set = Number(b.quiz_set || 1);
    if (!q || !options.a || !options.b || !options.d) return json(res, 400, { status: 'error', message: 'Opsi A, B, D dan pertanyaan wajib diisi' });
    if (!['a', 'b', 'c', 'd'].includes(correct)) return json(res, 400, { status: 'error', message: 'Jawaban benar harus A/B/C/D' });
    const ins = await query`INSERT INTO questions (question, options, correct_answer, active, category, quiz_set) VALUES (${q}, ${options}, ${correct}, ${active}, ${category}, ${quiz_set}) RETURNING *`;
    return json(res, 201, { status: 'success', question: ins.rows[0] });
}

async function handleUpdate(req, res) {
    try { await requireAdminAuth(req); } catch (e) { return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' }); }
    const b = parseJsonBody(req);
    const id = Number(b.id || 0);
    if (!id) return json(res, 400, { status: 'error', message: 'Missing id' });
    const q = b.question !== undefined ? String(b.question) : undefined;
    const options = b.options !== undefined ? b.options : undefined;
    const correct = b.correct_answer !== undefined ? String(b.correct_answer) : undefined;
    const active = b.active !== undefined ? Boolean(b.active) : undefined;
    const category = b.category !== undefined ? String(b.category) : undefined;
    const quiz_set = b.quiz_set !== undefined ? Number(b.quiz_set) : undefined;

    const updates = [];
    const params = [];
    let idx = 1;

    if (q !== undefined) { updates.push(`question = $${idx++}`); params.push(q); }
    if (options !== undefined) { updates.push(`options = $${idx++}`); params.push(options); }
    if (correct !== undefined) { updates.push(`correct_answer = $${idx++}`); params.push(correct); }
    if (active !== undefined) { updates.push(`active = $${idx++}`); params.push(active); }
    if (category !== undefined) { updates.push(`category = $${idx++}`); params.push(category); }
    if (quiz_set !== undefined) { updates.push(`quiz_set = $${idx++}`); params.push(quiz_set); }

    if (updates.length === 0) return json(res, 400, { status: 'error', message: 'No fields to update' });

    params.push(id);
    const sql = `UPDATE questions SET ${updates.join(', ')} WHERE id = $${idx} RETURNING *`;

    const { rawQuery } = require('./_db');
    const result = await rawQuery(sql, params);

    if (result.rows.length === 0) return json(res, 404, { status: 'error', message: 'Question not found' });
    return json(res, 200, { status: 'success', question: result.rows[0] });
}

async function handleDelete(req, res) {
    try { await requireAdminAuth(req); } catch (e) { return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' }); }
    const b = parseJsonBody(req);
    const id = Number(b.id || 0);
    if (!id) return json(res, 400, { status: 'error', message: 'Missing id' });
    await query`DELETE FROM questions WHERE id=${id}`;
    return json(res, 200, { status: 'success' });
}

async function handleListQuestions(req, res) {
    try { await requireAdminAuth(req); } catch (e) { return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' }); }

    const set = req.query.set ? Number(req.query.set) : null;
    const category = req.query.category ? String(req.query.category).trim() : '';
    const search = req.query.search ? String(req.query.search).trim() : '';

    const page = req.query.page ? Number(req.query.page) : 1;
    const size = req.query.size ? Number(req.query.size) : 50;

    const limit = Math.max(1, Math.min(500, size));
    const offset = Math.max(0, (page - 1) * limit);

    let whereClauses = [];
    let params = [];
    let pIdx = 1;

    if (set) {
        whereClauses.push(`quiz_set = $${pIdx++}`);
        params.push(set);
    }
    if (category && category !== 'all') {
        whereClauses.push(`LOWER(category) = $${pIdx++}`);
        params.push(category.toLowerCase());
    }
    if (search) {
        whereClauses.push(`(LOWER(question) LIKE $${pIdx} OR LOWER(options::text) LIKE $${pIdx})`);
        params.push(`%${search.toLowerCase()}%`);
        pIdx++;
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

    const { rawQuery } = require('./_db');

    const countRes = await rawQuery(`SELECT COUNT(*)::int as total FROM questions ${whereSql}`, params);
    const total = countRes.rows[0]?.total || 0;

    const dataRes = await rawQuery(`SELECT * FROM questions ${whereSql} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`, params);

    return json(res, 200, {
        status: 'success',
        questions: dataRes.rows,
        total: total,
        page: page
    });
}

// --- Schedule Management ---

async function handleGetSchedules(req, res) {
    try { await requireAdminAuth(req); } catch (e) { return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' }); }
    const schedules = (await query`SELECT * FROM quiz_schedules ORDER BY id ASC`).rows;
    return json(res, 200, { status: 'success', schedules });
}

async function handleUpdateSchedule(req, res) {
    let adminId = null;
    try {
        const admin = await requireAdminAuth(req);
        adminId = admin.id;
    } catch (e) {
        return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' });
    }

    const b = parseJsonBody(req);
    const id = Number(b.id);
    const title = String(b.title || '');
    const description = String(b.description || '');
    const start_time = b.start_time ? String(b.start_time) : null;
    const end_time = b.end_time ? String(b.end_time) : null;
    const show_in_quiz = b.show_in_quiz === undefined ? true : !!b.show_in_quiz;
    const show_in_notif = b.show_in_notif === undefined ? false : !!b.show_in_notif;

    if (start_time && end_time && new Date(start_time) >= new Date(end_time)) {
        return json(res, 400, { status: 'error', message: 'Waktu selesai harus setelah waktu mulai' });
    }

    if (id) {
        await query`UPDATE quiz_schedules SET title=${title}, description=${description}, start_time=${start_time}, end_time=${end_time}, show_in_quiz=${show_in_quiz}, show_in_notif=${show_in_notif}, updated_at=NOW() WHERE id=${id}`;
        await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'UPDATE_SCHEDULE', ${{ id, title, description, start_time, end_time, show_in_quiz, show_in_notif }})`;
    } else {
        await query`INSERT INTO quiz_schedules (title, description, start_time, end_time, show_in_quiz, show_in_notif) VALUES (${title}, ${description}, ${start_time}, ${end_time}, ${show_in_quiz}, ${show_in_notif})`;
        await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'CREATE_SCHEDULE', ${{ title, description, start_time, end_time, show_in_quiz, show_in_notif }})`;
    }

    return json(res, 200, { status: 'success' });
}

async function handleDeleteSchedule(req, res) {
    let adminId = null;
    try {
        const admin = await requireAdminAuth(req);
        adminId = admin.id;
    } catch (e) {
        return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' });
    }

    const b = parseJsonBody(req);
    const id = Number(b.id);
    if (!id) return json(res, 400, { status: 'error', message: 'ID required' });

    await query`DELETE FROM quiz_schedules WHERE id=${id}`;
    await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'DELETE_SCHEDULE', ${{ id }})`;

    return json(res, 200, { status: 'success' });
}

// --- Materials Management ---

async function handleListMaterials(req, res) {
    try { await requireAdminAuth(req); } catch (e) { return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' }); }

    const category = req.query.category ? String(req.query.category).trim() : '';
    const search = req.query.search ? String(req.query.search).trim() : '';
    const page = req.query.page ? Number(req.query.page) : 1;
    const size = req.query.size ? Number(req.query.size) : 20;

    const limit = Math.max(1, Math.min(100, size));
    const offset = Math.max(0, (page - 1) * limit);

    let whereClauses = [];
    let params = [];
    let pIdx = 1;

    if (category && category !== 'all') {
        whereClauses.push(`LOWER(category) = $${pIdx++}`);
        params.push(category.toLowerCase());
    }
    if (search) {
        whereClauses.push(`(LOWER(title) LIKE $${pIdx} OR LOWER(description) LIKE $${pIdx})`);
        params.push(`%${search.toLowerCase()}%`);
        pIdx++;
    }

    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    const { rawQuery } = require('./_db');

    const countRes = await rawQuery(`SELECT COUNT(*)::int as total FROM materials ${whereSql}`, params);
    const total = countRes.rows[0]?.total || 0;

    const dataRes = await rawQuery(`SELECT * FROM materials ${whereSql} ORDER BY updated_at DESC LIMIT ${limit} OFFSET ${offset}`, params);

    return json(res, 200, {
        status: 'success',
        materials: dataRes.rows,
        total,
        page
    });
}

async function handleUpsertMaterial(req, res) {
    let adminId = null;
    try {
        const admin = await requireAdminAuth(req);
        adminId = admin.id;
    } catch (e) { return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' }); }

    const b = parseJsonBody(req);
    const id = b.id ? Number(b.id) : null;
    const title = String(b.title || '').trim();
    const description = String(b.description || '').trim();
    const file_type = String(b.file_type || 'pdf').trim();
    const file_url = String(b.file_url || '').trim();
    const thumbnail = String(b.thumbnail || '').trim();
    const category = String(b.category || 'Umum').trim();
    const author = String(b.author || '').trim();
    const active = b.active !== false;

    if (!title) return json(res, 400, { status: 'error', message: 'Judul materi wajib diisi' });

    if (id) {
        const result = await query`UPDATE materials SET title=${title}, description=${description}, file_type=${file_type}, file_url=${file_url}, thumbnail=${thumbnail}, category=${category}, author=${author}, active=${active}, updated_at=NOW() WHERE id=${id} RETURNING *`;
        if (result.rows.length === 0) return json(res, 404, { status: 'error', message: 'Material not found' });
        await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'UPDATE_MATERIAL', ${{ id, title }})`;
        return json(res, 200, { status: 'success', material: result.rows[0] });
    } else {
        const result = await query`INSERT INTO materials (title, description, file_type, file_url, thumbnail, category, author, active) VALUES (${title}, ${description}, ${file_type}, ${file_url}, ${thumbnail}, ${category}, ${author}, ${active}) RETURNING *`;
        await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'CREATE_MATERIAL', ${{ title }})`;
        return json(res, 201, { status: 'success', material: result.rows[0] });
    }
}

async function handleDeleteMaterial(req, res) {
    let adminId = null;
    try {
        const admin = await requireAdminAuth(req);
        adminId = admin.id;
    } catch (e) { return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' }); }

    const b = parseJsonBody(req);
    const id = Number(b.id);
    if (!id) return json(res, 400, { status: 'error', message: 'ID required' });

    await query`DELETE FROM materials WHERE id=${id}`;
    await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'DELETE_MATERIAL', ${{ id }})`;

    return json(res, 200, { status: 'success' });
}

async function handleBroadcastNotification(req, res) {
    let adminId = null;
    try {
        const admin = await requireAdminAuth(req);
        adminId = admin.id;
    } catch (e) { return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' }); }

    const b = parseJsonBody(req) || {};
    const title = String(b.title || '').trim();
    const message = String(b.message || '').trim();
    const url = String(b.url || '/').trim();
    const save = b.save !== false;
    const target = parseTarget(b.target);

    if (!title && !message) {
        return json(res, 400, { status: 'error', message: 'Judul atau pesan wajib diisi' });
    }

    await sendNotificationToTarget({ title, message, url, save, target });

    try {
        await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'BROADCAST_NOTIFICATION', ${{ title, message, url, save, target }})`;
    } catch (e) { }

    return json(res, 200, { status: 'success' });
}

async function handleScheduleNotification(req, res) {
    let adminId = null;
    try {
        const admin = await requireAdminAuth(req);
        adminId = admin.id;
    } catch (e) { return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' }); }

    const b = parseJsonBody(req) || {};
    const title = String(b.title || '').trim();
    const message = String(b.message || '').trim();
    const url = String(b.url || '/').trim();
    const save = b.save !== false;
    const target = parseTarget(b.target);
    const sendAtRaw = String(b.schedule_at || b.send_at || '').trim();

    if (!title && !message) {
        return json(res, 400, { status: 'error', message: 'Judul atau pesan wajib diisi' });
    }
    if (!sendAtRaw) {
        return json(res, 400, { status: 'error', message: 'Waktu jadwal wajib diisi' });
    }

    const sendAt = new Date(sendAtRaw);
    if (Number.isNaN(sendAt.getTime())) {
        return json(res, 400, { status: 'error', message: 'Format waktu tidak valid' });
    }
    if (sendAt.getTime() <= Date.now()) {
        return json(res, 400, { status: 'error', message: 'Waktu jadwal harus di masa depan' });
    }

    const result = await query`
        INSERT INTO scheduled_notifications (title, message, url, target_type, target_value, save_in_app, send_at, created_by)
        VALUES (${title}, ${message}, ${url}, ${target.type}, ${target.value}, ${save}, ${sendAt.toISOString()}, ${adminId})
        RETURNING *
    `;

    try {
        await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'SCHEDULE_NOTIFICATION', ${{ title, message, url, save, target, send_at: sendAt.toISOString() }})`;
    } catch (e) { }

    return json(res, 200, { status: 'success', scheduled: result.rows[0] });
}

async function handleListScheduledNotifications(req, res) {
    try { await requireAdminAuth(req); } catch (e) { return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' }); }
    const rows = (await query`
        SELECT * FROM scheduled_notifications
        ORDER BY send_at ASC
        LIMIT 100
    `).rows;
    return json(res, 200, { status: 'success', items: rows });
}

async function handleDeleteScheduledNotification(req, res) {
    let adminId = null;
    try {
        const admin = await requireAdminAuth(req);
        adminId = admin.id;
    } catch (e) { return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' }); }

    const b = parseJsonBody(req) || {};
    const id = Number(b.id || 0);
    if (!id) return json(res, 400, { status: 'error', message: 'ID tidak valid' });

    await query`DELETE FROM scheduled_notifications WHERE id=${id} AND status='pending'`;
    try {
        await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'DELETE_SCHEDULED_NOTIFICATION', ${{ id }})`;
    } catch (e) { }

    return json(res, 200, { status: 'success' });
}

function isCronAuthorized(req) {
    const secret = process.env.CRON_SECRET;
    if (secret) {
        if (String(req.query.secret || '') === secret) return true;
        const headerSecret = String(req.headers['x-cron-secret'] || '');
        if (headerSecret === secret) return true;
    }
    if (req.headers['x-vercel-cron']) return true;
    return false;
}

async function handleRunScheduledNotifications(req, res) {
    if (!isCronAuthorized(req)) {
        try {
            await requireAdminAuth(req);
        } catch (e) {
            return json(res, 401, { status: 'error', message: 'Unauthorized' });
        }
    }

    const due = (await query`
        SELECT * FROM scheduled_notifications
        WHERE status='pending' AND send_at <= NOW()
        ORDER BY send_at ASC
        LIMIT 50
    `).rows;

    let sentCount = 0;
    let failedCount = 0;

    for (const item of due) {
        try {
            const target = { type: item.target_type || 'all', value: item.target_value || null };
            await sendNotificationToTarget({
                title: item.title,
                message: item.message,
                url: item.url,
                save: item.save_in_app !== false,
                target
            });
            await query`UPDATE scheduled_notifications SET status='sent', sent_at=NOW(), error=NULL WHERE id=${item.id}`;
            sentCount++;
        } catch (e) {
            await query`UPDATE scheduled_notifications SET status='failed', error=${String(e.message || e)} WHERE id=${item.id}`;
            failedCount++;
        }
    }

    const cleanup = await query`
        DELETE FROM notifications
        WHERE created_at < NOW() - INTERVAL '7 days'
    `;

    return json(res, 200, {
        status: 'success',
        due: due.length,
        sent: sentCount,
        failed: failedCount,
        removedOldNotifications: cleanup?.rowCount || 0
    });
}

// --- System & Logs ---

async function handleGetActivityLogs(req, res) {
    try { await requireAdminAuth(req); } catch (e) { return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' }); }

    const logs = (await query`
        SELECT l.id, l.action, l.details, l.created_at, u.username as admin_name 
        FROM activity_logs l 
        LEFT JOIN users u ON l.admin_id = u.id 
        ORDER BY l.created_at DESC 
        LIMIT 100
    `).rows;

    return json(res, 200, { status: 'success', logs });
}

// --- Gamification Settings ---
async function handleGetGamification(req, res) {
    try { await requireAdminAuth(req); } catch (e) { return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' }); }
    const settings = await getGamificationSettings();
    return json(res, 200, { status: 'success', settings });
}

async function handleSaveGamification(req, res) {
    let adminId = null;
    try {
        const admin = await requireAdminAuth(req);
        adminId = admin.id;
    } catch (e) {
        return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' });
    }

    const b = parseJsonBody(req) || {};
    const settings = await saveGamificationSettings(b);
    try {
        await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'UPDATE_GAMIFICATION', ${settings})`;
    } catch {}
    return json(res, 200, { status: 'success', settings });
}

async function handleGetPimpinan(req, res) {
    try { await requireAdminAuth(req); } catch (e) { return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' }); }
    const options = await getPimpinanOptions();
    return json(res, 200, { status: 'success', options });
}

async function handleSavePimpinan(req, res) {
    let adminId = null;
    try {
        const admin = await requireAdminAuth(req);
        adminId = admin.id;
    } catch (e) { return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' }); }

    const body = parseJsonBody(req) || {};
    const options = await savePimpinanOptions(body);
    try {
        await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'UPDATE_PIMPINAN_OPTIONS', ${{ count: options.length }})`;
    } catch {}
    return json(res, 200, { status: 'success', options });
}

async function handleResetSet(req, res) {
    let adminId = null;
    try {
        const admin = await requireAdminAuth(req);
        adminId = admin.id;
    } catch { return json(res, 401, { status: 'error', message: 'Unauthorized' }); }

    const body = parseJsonBody(req);
    const quiz_set = Number(body.quiz_set || 0);
    if (!quiz_set) return json(res, 400, { status: 'error', message: 'Missing quiz_set' });

    try {
        const { sendToUser } = require('./_push');
        const affectedUsers = (await query`SELECT DISTINCT user_id FROM results WHERE quiz_set=${quiz_set}`).rows;
        if (affectedUsers.length > 0) {
            const msg = `Admin telah mereset Kuis Set ${quiz_set}. Anda dapat mengerjakannya kembali.`;
            for (const u of affectedUsers) {
                await query`INSERT INTO notifications (user_id, message) VALUES (${u.user_id}, ${msg})`;
                sendToUser(u.user_id, {
                    title: 'Kuis Di-reset',
                    body: msg,
                    url: '/quiz.html'
                }).catch(() => {});
            }
        }
    } catch (e) { console.error('Failed to notify users:', e); }

    await query`DELETE FROM results WHERE quiz_set=${quiz_set}`;

    try {
        await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'RESET_SET', ${{ quiz_set }})`;
    } catch (e) { console.error('Failed to log activity:', e); }

    return json(res, 200, { status: 'success' });
}

async function handleMigrate(req, res) {
    try { await requireAdminAuth(req); } catch { return json(res, 401, { status: 'error', message: 'Unauthorized' }); }

    await ensureSchema();

    const qcRaw = (await query`SELECT COUNT(*)::int AS c FROM questions`).rows[0]?.c;
    const qc = typeof qcRaw === 'number' ? qcRaw : Number(qcRaw || 0);
    if (qc === 0) {
        await query`INSERT INTO questions (question, options, correct_answer, active, category, quiz_set) VALUES (
        ${'Apa kepanjangan IPM?'}, ${{ a: 'Ikatan Pelajar Muhammadiyah', b: 'Ikatan Pemuda Muslim', c: 'Ikatan Pemuda Merdeka', d: 'Ikatan Pelajar Merdeka' }}, ${'a'}, ${true}, ${'Organisasi'}, ${1}
      )`;
        await query`INSERT INTO questions (question, options, correct_answer, active, category, quiz_set) VALUES (
        ${'Hari jadi IPM?'}, ${{ a: '5 Mei 1961', b: '5 Mei 1962', c: '5 Juni 1961', d: '5 Juni 1962' }}, ${'a'}, ${true}, ${'Sejarah'}, ${1}
      )`;
    }

    const adminU = String((process.env.ADMIN_USERNAME || '')).trim().toLowerCase();
    const adminP = String((process.env.ADMIN_PASSWORD || ''));
    if (adminU && adminP) {
        const exists = (await query`SELECT id FROM users WHERE LOWER(username)=${adminU}`).rows[0];
        if (!exists) {
            const pwd = await hashPassword(adminP);
            await query`INSERT INTO users (username, nama_panjang, pimpinan, password_salt, password_hash, role) VALUES (${adminU}, ${'Administrator'}, ${'IPM'}, ${pwd.salt}, ${pwd.hash}, ${'admin'})`;
        }
    }
    return json(res, 200, { status: 'success' });
}

module.exports = async (req, res) => {
    try {
        req.query = req.query || {};
        const action = req.query.action;

        if (req.method !== 'POST') {
            if (req.method === 'GET' && !action && String(req.url || '').includes('materials')) {
                return await handleListMaterials(req, res);
            }
            if (req.method === 'GET' && action === 'activityLogs') return await handleGetActivityLogs(req, res);
            if (req.method === 'GET' && action === 'schedules') return await handleGetSchedules(req, res);
            if (req.method === 'GET' && action === 'listQuestions') return await handleListQuestions(req, res);
            if (req.method === 'GET' && action === 'listMaterials') return await handleListMaterials(req, res);
            if (req.method === 'GET' && action === 'gamificationGet') return await handleGetGamification(req, res);
            if (req.method === 'GET' && action === 'pimpinanGet') return await handleGetPimpinan(req, res);
            if (req.method === 'GET' && action === 'listScheduledNotifications') return await handleListScheduledNotifications(req, res);
            if (req.method === 'GET' && action === 'runScheduledNotifications') return await handleRunScheduledNotifications(req, res);
            return json(res, 405, { status: 'error', message: 'Method not allowed' });
        }

        switch (action) {
            case 'create': return await handleCreate(req, res);
            case 'update': return await handleUpdate(req, res);
            case 'delete': return await handleDelete(req, res);
            case 'resetSet': return await handleResetSet(req, res);
            case 'migrate': return await handleMigrate(req, res);
            case 'updateSchedule': return await handleUpdateSchedule(req, res);
            case 'deleteSchedule': return await handleDeleteSchedule(req, res);
            case 'upsertMaterial': return await handleUpsertMaterial(req, res);
            case 'deleteMaterial': return await handleDeleteMaterial(req, res);
            case 'broadcastNotification': return await handleBroadcastNotification(req, res);
            case 'scheduleNotification': return await handleScheduleNotification(req, res);
            case 'deleteScheduledNotification': return await handleDeleteScheduledNotification(req, res);
            case 'gamificationSave': return await handleSaveGamification(req, res);
            case 'pimpinanSave': return await handleSavePimpinan(req, res);
            default: return json(res, 404, { status: 'error', message: `Unknown action: ${action}` });
        }
    } catch (e) {
        return json(res, 500, { status: 'error', message: String(e.message || e) });
    }
};
