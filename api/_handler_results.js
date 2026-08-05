const { query, rawQuery } = require('./_db');
const { json, cacheHeaders, parseJsonBody } = require('./_util');
const { requireAdminAuth } = require('./_auth');

const YM_PATTERN = /^\d{4}-\d{2}$/;

function getCurrentResetYm() {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

function isValidYm(value) {
    return YM_PATTERN.test(String(value || '').trim());
}

async function upsertResetYm(ym) {
    await query`INSERT INTO system_settings (key, value, updated_at)
        VALUES ('ranking_reset_ym', ${ym}, NOW())
        ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=NOW()`;
}

async function archiveTopThree(archiveYm) {
    if (!isValidYm(archiveYm)) return;

    await query`
        WITH ranked AS (
            SELECT
                r.user_id,
                COALESCE(NULLIF(TRIM(r.username), ''), 'Anonim') AS username_snapshot,
                COALESCE(NULLIF(TRIM(u.pimpinan), ''), '-') AS pimpinan_snapshot,
                COALESCE(r.score, 0) AS score,
                COALESCE(r.total, 0) AS total,
                COALESCE(r.percent, 0) AS percent,
                COALESCE(r.time_spent, 0) AS time_spent,
                r.quiz_set,
                r.created_at AS result_created_at,
                ROW_NUMBER() OVER (
                    ORDER BY COALESCE(r.score, 0) DESC, COALESCE(r.time_spent, 0) ASC, r.created_at ASC, r.id ASC
                ) AS rank_position
            FROM results r
            LEFT JOIN users u ON u.id = r.user_id
            WHERE COALESCE(NULLIF(TRIM(r.username), ''), '') <> ''
        )
        INSERT INTO ranking_monthly_archive (
            ym, rank_position, user_id, username_snapshot, pimpinan_snapshot,
            score, total, percent, time_spent, quiz_set, result_created_at, archived_at
        )
        SELECT
            ${archiveYm},
            ranked.rank_position,
            ranked.user_id,
            ranked.username_snapshot,
            ranked.pimpinan_snapshot,
            ranked.score,
            ranked.total,
            ranked.percent,
            ranked.time_spent,
            ranked.quiz_set,
            ranked.result_created_at,
            NOW()
        FROM ranked
        WHERE ranked.rank_position <= 3
        ON CONFLICT (ym, rank_position) DO UPDATE SET
            user_id = EXCLUDED.user_id,
            username_snapshot = EXCLUDED.username_snapshot,
            pimpinan_snapshot = EXCLUDED.pimpinan_snapshot,
            score = EXCLUDED.score,
            total = EXCLUDED.total,
            percent = EXCLUDED.percent,
            time_spent = EXCLUDED.time_spent,
            quiz_set = EXCLUDED.quiz_set,
            result_created_at = EXCLUDED.result_created_at,
            archived_at = NOW()
    `;
}

async function ensureMonthlyReset() {
    const ym = getCurrentResetYm();
    const row = (await query`SELECT value FROM system_settings WHERE key='ranking_reset_ym'`).rows[0];
    const last = String(row?.value || '').trim();

    // First-time initialization: keep current leaderboard untouched and mark current month.
    if (!last) {
        await upsertResetYm(ym);
        return;
    }

    if (last === ym) return;

    // Archive previous month winners before reset.
    await archiveTopThree(last);
    await query`DELETE FROM results`;
    await upsertResetYm(ym);
}

async function listLive(req, res) {
    const page = req.query.page ? Number(req.query.page) : 1;
    const size = req.query.size ? Number(req.query.size) : 200;
    const limit = Math.max(1, Math.min(500, size));
    const offset = Math.max(0, (Math.max(1, page) - 1) * limit);

    const queryText = `
        SELECT r.id, r.created_at AS ts, r.username, u.pimpinan, r.score, r.total, r.percent, r.time_spent
        FROM results r
        LEFT JOIN users u ON r.user_id = u.id
        WHERE r.username IS NOT NULL AND r.username != ''
        ORDER BY r.score DESC, r.time_spent ASC, r.created_at ASC
        LIMIT $1 OFFSET $2
    `;

    const result = await rawQuery(queryText, [limit, offset]);
    return json(
        res,
        200,
        { status: 'success', results: result.rows, page: Math.max(1, page), size: limit },
        cacheHeaders(0)
    );
}

async function listArchiveMonths(_req, res) {
    const months = (await query`
        SELECT
            a.ym,
            MAX(a.archived_at) AS archived_at,
            MAX(CASE WHEN a.rank_position = 1 THEN a.username_snapshot END) AS champion_name,
            MAX(CASE WHEN a.rank_position = 1 THEN a.score END)::INT AS champion_score,
            MAX(CASE WHEN a.rank_position = 1 THEN a.time_spent END)::BIGINT AS champion_time
        FROM ranking_monthly_archive a
        GROUP BY a.ym
        ORDER BY a.ym DESC
    `).rows;

    const hallOfFame = (await query`
        SELECT
            a.username_snapshot AS username,
            COUNT(*)::INT AS title_count,
            MIN(a.ym) AS first_win_ym,
            MAX(a.ym) AS last_win_ym
        FROM ranking_monthly_archive a
        WHERE a.rank_position = 1
        GROUP BY a.username_snapshot
        ORDER BY title_count DESC, last_win_ym DESC, username ASC
        LIMIT 8
    `).rows;

    return json(res, 200, { status: 'success', months, hall_of_fame: hallOfFame }, cacheHeaders(0));
}

async function listArchiveByYm(req, res) {
    let ym = String(req.query.ym || '').trim();
    if (ym && !isValidYm(ym)) {
        return json(res, 400, { status: 'error', message: 'Format ym tidak valid. Gunakan YYYY-MM.' });
    }

    if (!ym) {
        const latest = (await query`SELECT ym FROM ranking_monthly_archive ORDER BY ym DESC LIMIT 1`).rows[0];
        ym = String(latest?.ym || '').trim();
        if (!ym) {
            return json(res, 200, { status: 'success', ym: '', archives: [] }, cacheHeaders(0));
        }
    }

    const archives = (await query`
        SELECT
            ym,
            rank_position,
            user_id,
            username_snapshot,
            pimpinan_snapshot,
            score,
            total,
            percent,
            time_spent,
            quiz_set,
            result_created_at,
            archived_at
        FROM ranking_monthly_archive
        WHERE ym = ${ym}
        ORDER BY rank_position ASC
    `).rows;

    return json(res, 200, { status: 'success', ym, archives }, cacheHeaders(0));
}

async function listHallOfFame(_req, res) {
    const champions = (await query`
        SELECT
            a.username_snapshot AS username,
            COUNT(*)::INT AS title_count,
            MIN(a.ym) AS first_win_ym,
            MAX(a.ym) AS last_win_ym
        FROM ranking_monthly_archive a
        WHERE a.rank_position = 1
        GROUP BY a.username_snapshot
        ORDER BY title_count DESC, last_win_ym DESC, username ASC
        LIMIT 20
    `).rows;

    return json(res, 200, { status: 'success', champions }, cacheHeaders(0));
}

async function list(req, res) {
    try { await ensureMonthlyReset(); } catch (e) { console.error('Monthly reset failed:', e); }
    try {
        const mode = String(req.query.mode || '').trim().toLowerCase();
        if (mode === 'archive' || mode === 'monthly_archive') return await listArchiveByYm(req, res);
        if (mode === 'archivemonths' || mode === 'archive_months') return await listArchiveMonths(req, res);
        if (mode === 'halloffame' || mode === 'hall_of_fame') return await listHallOfFame(req, res);
        return await listLive(req, res);
    } catch (e) {
        return json(res, 500, { status: 'error', message: e.message });
    }
}

async function create(req, res) {
    try { await ensureMonthlyReset(); } catch (e) { console.error('Monthly reset failed:', e); }
    const b = parseJsonBody(req);
    const session = String(b.session || '').trim();
    const quiz_set = Number(b.quiz_set || 1);
    const time_spent = Number(b.time_spent || 0);
    const userAnswers = b.answers || {};

    if (!session) return json(res, 401, { status: 'error', message: 'Unauthorized' });

    const userRow = (await query`SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token=${session} AND s.expires_at > NOW()`).rows[0];
    if (!userRow) return json(res, 401, { status: 'error', message: 'Unauthorized' });

    const questions = (await query`SELECT id, correct_answer FROM questions WHERE quiz_set=${quiz_set} AND active=true`).rows;
    if (!questions.length) return json(res, 400, { status: 'error', message: 'Set soal tidak ditemukan atau tidak aktif.' });

    let score = 0;
    let total = questions.length;
    questions.forEach(q => {
        const uAns = (userAnswers[q.id] || '').toLowerCase().trim();
        const cAns = (q.correct_answer || '').toLowerCase().trim();
        if (uAns && cAns && uAns === cAns) score++;
    });

    const percent = Math.round((score / total) * 100);
    const finished_at = Date.now();
    const started_at = finished_at - (time_spent * 1000);
    const COOLDOWN_MS = 10 * 1000;

    const recentDup = (await query`SELECT id FROM results WHERE user_id=${userRow.id} AND quiz_set=${quiz_set} AND score=${score} AND created_at > NOW() - INTERVAL '10 seconds'`).rows[0];
    if (recentDup) return json(res, 200, { status: 'success', id: recentDup.id, score, total, percent, idempotent: true });

    const alreadyAttempted = (await query`SELECT id FROM results WHERE user_id=${userRow.id} AND quiz_set=${quiz_set} LIMIT 1`).rows[0];
    if (alreadyAttempted) {
        return json(res, 409, { status: 'error', message: 'Anda sudah mencoba kuis ini. Hubungi admin untuk reset.' });
    }

    const last = (await query`SELECT finished_at FROM results WHERE user_id=${userRow.id} ORDER BY id DESC LIMIT 1`).rows[0];
    if (last && Number(last.finished_at || 0) > 0) {
        const delta = finished_at - Number(last.finished_at);
        if (delta >= 0 && delta < COOLDOWN_MS) return json(res, 429, { status: 'error', message: 'Terlalu cepat. Harap tunggu sebentar.' });
    }

    const ins = await query`INSERT INTO results (username, user_id, score, total, percent, time_spent, quiz_set, started_at, finished_at) VALUES (${userRow.username}, ${userRow.id}, ${score}, ${total}, ${percent}, ${time_spent}, ${quiz_set}, ${started_at}, ${finished_at}) RETURNING id`;
    return json(res, 201, { status: 'success', id: ins.rows[0].id, score, total, percent });
}

async function purge(req, res) {
    try { await requireAdminAuth(req); } catch { return json(res, 401, { status: 'error', message: 'Unauthorized' }); }
    await query`DELETE FROM results`;
    return json(res, 200, { status: 'success' });
}

module.exports = async (req, res) => {
    try {
        req.query = req.query || {};
        if (req.method === 'GET') return await list(req, res);
        if (req.method === 'POST') return await create(req, res);
        if (req.method === 'DELETE') return await purge(req, res);
        return json(res, 405, { status: 'error', message: 'Method not allowed' });
    } catch (e) {
        return json(res, 500, { status: 'error', message: String(e.message || e) });
    }
};
