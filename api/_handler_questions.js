const { query, rawQuery } = require('./_db');
const { json, cacheHeaders } = require('./_util');
const { getSessionUser } = require('./_auth');

async function list(req, res) {
    const mode = req.query.mode ? String(req.query.mode).trim() : '';
    const user = await getSessionUser(req);
    const defaultGamification = {
        enabled: true,
        timer_seconds: 20,
        xp_base: 10,
        streak_bonus: 2,
        streak_cap: 5,
        quest_daily_target: 3,
        quest_highscore_target: 2,
        highscore_percent: 80
    };

    if (mode === 'summary') {
        const rows = (await query`
      SELECT quiz_set, COUNT(*)::int as count 
      FROM questions 
      WHERE active = true 
      GROUP BY quiz_set 
      ORDER BY quiz_set ASC
    `).rows;

        let attempts = [];
        if (user) {
            attempts = (await query`SELECT quiz_set FROM results WHERE user_id=${user.id}`).rows.map(r => r.quiz_set);
        }

        let topScoresGlobal = [];
        try {
            topScoresGlobal = (await query`
          SELECT 
            u.username, 
            best_attempts.score, 
            best_attempts.total, 
            best_attempts.percent, 
            best_attempts.quiz_set, 
            best_attempts.created_at, 
            best_attempts.time_spent
          FROM (
            SELECT DISTINCT ON (user_id) user_id, score, total, percent, quiz_set, created_at, time_spent
            FROM results
            ORDER BY user_id, percent DESC, score DESC, time_spent ASC, created_at ASC
          ) as best_attempts
          JOIN users u ON best_attempts.user_id = u.id
          ORDER BY best_attempts.percent DESC, best_attempts.score DESC, best_attempts.time_spent ASC
          LIMIT 1
        `).rows;
        } catch (e) {
            console.error('Failed to fetch top scores:', e);
        }

        let nextSchedule = null;
        try {
            nextSchedule = (await query`
          SELECT title, description, start_time, show_in_quiz 
          FROM quiz_schedules 
          WHERE active = true AND start_time > NOW() AND (show_in_quiz = true OR show_in_quiz IS NULL)
          ORDER BY start_time ASC 
          LIMIT 1
        `).rows[0];
        } catch (e) {
            console.error('Failed to fetch schedule:', e);
        }

        let nextQuiz = null;
        if (nextSchedule) {
            nextQuiz = {
                title: nextSchedule.title,
                topic: nextSchedule.description || "Event Mendatang",
                countdown_target: nextSchedule.start_time
            };
        }

        const enhancedSets = rows.map(r => ({
            ...r,
            attempted: attempts.includes(r.quiz_set)
        }));

        return json(res, 200, { status: 'success', sets: enhancedSets, top_scores: topScoresGlobal, next_quiz: nextQuiz }, cacheHeaders(0));
    }

    if (mode === 'gamification') {
        let settings = defaultGamification;
        try {
            const row = (await query`SELECT value FROM system_settings WHERE key='gamification_settings'`).rows[0];
            if (row && row.value) {
                const parsed = JSON.parse(row.value);
                settings = { ...defaultGamification, ...(parsed || {}) };
            }
        } catch { }
        return json(res, 200, { status: 'success', settings }, cacheHeaders(60));
    }

    if (mode === 'categories') {
        const rows = (await query`
      SELECT DISTINCT category 
      FROM questions 
      WHERE category IS NOT NULL AND category != ''
      ORDER BY category ASC
    `).rows;
        return json(res, 200, { status: 'success', categories: rows.map(r => r.category) }, cacheHeaders(300));
    }

    if (mode === 'schedules') {
        const schedules = (await query`
      SELECT title, description, start_time, end_time, show_in_quiz, show_in_notif 
      FROM quiz_schedules 
      WHERE (end_time IS NULL OR end_time > NOW()) 
      ORDER BY start_time ASC
    `).rows;
        return json(res, 200, { status: 'success', schedules }, cacheHeaders(60));
    }

    const set = req.query.set ? Number(req.query.set) : null;
    const category = req.query.category ? String(req.query.category).trim() : '';
    const search = req.query.search ? String(req.query.search).trim() : '';
    const page = req.query.page ? Number(req.query.page) : 1;
    const size = req.query.size ? Number(req.query.size) : 50;
    const limit = Math.max(1, Math.min(500, size));
    const offset = Math.max(0, (page - 1) * limit);

    let whereClauses = ['active = true'];
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

    const whereSql = 'WHERE ' + whereClauses.join(' AND ');

    const countRes = await rawQuery(`SELECT COUNT(*)::int as total FROM questions ${whereSql}`, params);
    const total = countRes.rows[0]?.total || 0;

    const dataRes = await rawQuery(`SELECT id, question, options, category, quiz_set FROM questions ${whereSql} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`, params);

    return json(res, 200, {
        status: 'success',
        questions: dataRes.rows,
        total: total,
        page: page,
        size: limit
    }, cacheHeaders(0));
}

module.exports = async (req, res) => {
    try {
        if (req.method === 'GET') return await list(req, res);
        return json(res, 405, { status: 'error', message: 'Method not allowed' });
    } catch (e) {
        return json(res, 500, { status: 'error', message: 'Internal Server Error' });
    }
};
