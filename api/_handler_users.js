const { query } = require('./_db');
const { json, cacheHeaders, parseJsonBody } = require('./_util');
const { requireAdminAuth, getSessionUser } = require('./_auth');
const { hashPassword } = require('./_password');

async function list(req, res) {
    if (req.query?.action === 'notifications') {
        const user = await getSessionUser(req);
        if (!user) return json(res, 401, { status: 'error', message: 'Unauthorized' });
        const notifs = (await query`SELECT id, message, is_read, created_at FROM notifications WHERE user_id=${user.id} ORDER BY created_at DESC LIMIT 20`).rows;
        return json(res, 200, { status: 'success', notifications: notifs }, cacheHeaders(0));
    }

    const viewer = await getSessionUser(req);
    if (!viewer) return json(res, 401, { status: 'error', message: 'Unauthorized' });

    const uname = req.query?.username ? String(req.query.username).trim().toLowerCase() : '';
    let rows = [];

    if (uname) {
        const isOwner = String(viewer.username || '').toLowerCase() === uname;
        const isAdmin = String(viewer.role || '') === 'admin';
        if (!isOwner && !isAdmin) {
            return json(res, 403, { status: 'error', message: 'Forbidden' });
        }
        rows = (await query`SELECT id, username, nama_panjang, pimpinan, created_at FROM users WHERE LOWER(username)=${uname} ORDER BY id DESC`).rows;
    } else {
        if (String(viewer.role || '') !== 'admin') {
            return json(res, 403, { status: 'error', message: 'Forbidden' });
        }
        rows = (await query`SELECT id, username, nama_panjang, pimpinan, created_at FROM users ORDER BY id DESC`).rows;
    }

    json(res, 200, { status: 'success', users: rows }, cacheHeaders(60));
}

async function handleMarkNotificationsRead(req, res) {
    const user = await getSessionUser(req);
    if (!user) return json(res, 401, { status: 'error', message: 'Unauthorized' });
    await query`UPDATE notifications SET is_read=TRUE WHERE user_id=${user.id}`;
    return json(res, 200, { status: 'success' });
}

async function handleGetUsersExtended(req, res) {
    try { await requireAdminAuth(req); } catch (e) { return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' }); }
    const users = (await query`
        SELECT u.id, u.username, u.email, u.nama_panjang, u.role, u.created_at,
               COUNT(r.id) as total_quizzes, COALESCE(AVG(r.score), 0) as avg_score
        FROM users u LEFT JOIN results r ON u.id = r.user_id
        GROUP BY u.id ORDER BY u.created_at DESC
    `).rows;
    return json(res, 200, { status: 'success', users });
}

async function handleGetUsersStatus(req, res) {
    try { await requireAdminAuth(req); } catch (e) { return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' }); }
    const users = (await query`SELECT id, username, nama_panjang, role FROM users ORDER BY username ASC`).rows;
    const attempts = (await query`SELECT user_id, quiz_set, score, total FROM results`).rows;
    const attemptMap = {};
    attempts.forEach(a => {
        if (!attemptMap[a.user_id]) attemptMap[a.user_id] = {};
        attemptMap[a.user_id][a.quiz_set] = { score: a.score, total: a.total };
    });
    const data = users.map(u => ({ id: u.id, username: u.username, nama_panjang: u.nama_panjang, attempts: attemptMap[u.id] || {} }));
    return json(res, 200, { status: 'success', users: data });
}

async function handleResetAttempt(req, res) {
    let adminId = null;
    try { const admin = await requireAdminAuth(req); adminId = admin.id; } catch (e) { return json(res, 401, { status: 'error', message: e.message || 'Unauthorized' }); }
    const b = parseJsonBody(req);
    const userId = Number(b.user_id);
    const quizSet = Number(b.quiz_set);
    if (!userId || !quizSet) return json(res, 400, { status: 'error', message: 'User ID dan Quiz Set wajib diisi' });
    try { await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'RESET_ATTEMPT', ${{ target_user_id: userId, quiz_set: quizSet }})`; } catch (e) { }
    try {
        const msg = `Admin telah mereset status pengerjaan Kuis Set ${quizSet} Anda. Anda dapat mengerjakannya kembali.`;
        await query`INSERT INTO notifications (user_id, message) VALUES (${userId}, ${msg})`;
        const { sendToUser } = require('./_push');
        sendToUser(userId, {
            title: 'Kuis Di-reset',
            body: msg,
            url: '/quiz.html'
        }).catch(() => {});
    } catch (e) { }
    await query`DELETE FROM results WHERE user_id=${userId} AND quiz_set=${quizSet}`;
    return json(res, 200, { status: 'success', message: 'Attempt berhasil direset.' });
}

async function create(req, res) {
    let adminId = null;
    try { const admin = await requireAdminAuth(req); adminId = admin.id; } catch { return json(res, 401, { status: 'error', message: 'Unauthorized' }); }
    const b = parseJsonBody(req);
    const username = String(b.username || '').trim();
    const password = String(b.password || '').trim();
    const email = b.email ? String(b.email).trim() : null;
    const role = b.role === 'admin' ? 'admin' : 'user';
    const nama = String(b.nama_panjang || '').trim();
    if (!username) return json(res, 400, { status: 'error', message: 'Username required' });
    let pwd = null;
    if (password) {
        pwd = await hashPassword(password);
    } else return json(res, 400, { status: 'error', message: 'Password wajib diisi' });
    try {
        const ins = await query`INSERT INTO users (username, password_salt, password_hash, email, role, nama_panjang) VALUES (${username}, ${pwd.salt}, ${pwd.hash}, ${email}, ${role}, ${nama}) RETURNING id, username`;
        await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'CREATE_USER', ${{ username, role }})`;
        return json(res, 201, { status: 'success', user: ins.rows[0] });
    } catch (e) {
        if (e.message.includes('unique')) return json(res, 400, { status: 'error', message: 'Username sudah digunakan' });
        throw e;
    }
}

async function update(req, res) {
    let adminId = null;
    try { const admin = await requireAdminAuth(req); adminId = admin.id; } catch { return json(res, 401, { status: 'error', message: 'Unauthorized' }); }
    const b = parseJsonBody(req);
    const id = Number(b.id || 0);
    if (!id) return json(res, 400, { status: 'error', message: 'Missing id' });
    const updates = []; const params = []; let idx = 1;
    if (b.username) { updates.push(`username = $${idx++}`); params.push(String(b.username).trim()); }
    if (b.email !== undefined) { updates.push(`email = $${idx++}`); params.push(String(b.email).trim() || null); }
    if (b.role) { updates.push(`role = $${idx++}`); params.push(b.role === 'admin' ? 'admin' : 'user'); }
    if (b.nama_panjang !== undefined) { updates.push(`nama_panjang = $${idx++}`); params.push(String(b.nama_panjang).trim()); }
    if (b.password) {
        const pwd = await hashPassword(String(b.password));
        updates.push(`password_salt = $${idx++}`); params.push(pwd.salt);
        updates.push(`password_hash = $${idx++}`); params.push(pwd.hash);
    }
    if (updates.length === 0) return json(res, 400, { status: 'error', message: 'No fields' });
    params.push(id);
    const { rawQuery } = require('./_db');
    await rawQuery(`UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`, params);
    await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'UPDATE_USER', ${{ target_user_id: id, fields: Object.keys(b) }})`;
    return json(res, 200, { status: 'success' });
}

async function remove(req, res) {
    let adminId = null;
    try { const admin = await requireAdminAuth(req); adminId = admin.id; } catch { return json(res, 401, { status: 'error', message: 'Unauthorized' }); }
    const id = Number(req.query.id || parseJsonBody(req).user_id || 0);
    if (!id) return json(res, 400, { status: 'error', message: 'Missing id' });
    if (id === adminId) return json(res, 400, { status: 'error', message: 'Tidak dapat menghapus akun sendiri' });
    try {
        await query`DELETE FROM results WHERE user_id=${id}`;
        await query`DELETE FROM sessions WHERE user_id=${id}`;
        await query`DELETE FROM notifications WHERE user_id=${id}`;
        await query`DELETE FROM users WHERE id=${id}`;
        await query`INSERT INTO activity_logs (admin_id, action, details) VALUES (${adminId}, 'DELETE_USER', ${{ target_user_id: id }})`;
        return json(res, 200, { status: 'success' });
    } catch (e) { return json(res, 500, { status: 'error', message: 'Gagal menghapus user: ' + e.message }); }
}

module.exports = async (req, res) => {
    try {
        const action = req.query?.action;
        if (req.method === 'GET') {
            if (action === 'extended') return await handleGetUsersExtended(req, res);
            if (action === 'status') return await handleGetUsersStatus(req, res);
            return list(req, res);
        }
        if (req.method === 'POST') {
            if (action === 'markNotificationsRead') return await handleMarkNotificationsRead(req, res);
            if (action === 'resetAttempt') return await handleResetAttempt(req, res);
            const b = parseJsonBody(req);
            if (b && b.id) return await update(req, res);
            return await create(req, res);
        }
        if (req.method === 'PUT') return await update(req, res);
        if (req.method === 'DELETE') return await remove(req, res);
        return json(res, 405, { status: 'error', message: 'Method not allowed' });
    } catch (e) {
        return json(res, 500, { status: 'error', message: String(e.message || e) });
    }
};
