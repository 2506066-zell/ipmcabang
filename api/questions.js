const { query, rawQuery } = require('./_db');
const { json, cacheHeaders } = require('./_util');

const { getSessionUser } = require('./_auth');

async function list(req, res) {
  const mode = req.query.mode ? String(req.query.mode).trim() : '';
  const user = await getSessionUser(req);
  
  if (mode === 'summary') {
    // Return list of quiz sets and question counts
    // Also include 'attempted' status if user is logged in
    const rows = (await query`
      SELECT quiz_set, COUNT(*)::int as count 
      FROM questions 
      WHERE active = true 
      GROUP BY quiz_set 
      ORDER BY quiz_set ASC
    `).rows;

    // Enhance summary with attempted status and top score
    let attempts = [];
    if (user) {
      attempts = (await query`SELECT quiz_set FROM results WHERE user_id=${user.id}`).rows.map(r => r.quiz_set);
    }
    
    // Fetch Top 1 Global High Score (Single Champion)
    // We select the distinct best attempt for each user first, then order by best scores.
    // Using Postgres DISTINCT ON to get one row per user_id.
    const topScoresGlobal = (await query`
      SELECT * FROM (
        SELECT DISTINCT ON (user_id) username, score, total, percent, quiz_set, created_at, time_spent
        FROM results
        ORDER BY user_id, percent DESC, score DESC, time_spent ASC, created_at ASC
      ) as best_attempts
      ORDER BY percent DESC, score DESC, time_spent ASC
      LIMIT 1
    `).rows;

    // Also fetch Dynamic Next Quiz Info from quiz_schedules
    // We look for the next upcoming active schedule
    const nextSchedule = (await query`
      SELECT title, description, start_time 
      FROM quiz_schedules 
      WHERE active = true AND start_time > NOW() 
      ORDER BY start_time ASC 
      LIMIT 1
    `).rows[0];

    let nextQuiz = null;
    if (nextSchedule) {
        nextQuiz = {
            title: nextSchedule.title,
            topic: nextSchedule.description || "Event Mendatang", 
            countdown_target: nextSchedule.start_time
        };
    } else {
        // Fallback or empty
        nextQuiz = null;
    }

    const enhancedSets = rows.map(r => ({
      ...r,
      attempted: attempts.includes(r.quiz_set)
    }));

    return json(res, 200, { status: 'success', sets: enhancedSets, top_scores: topScoresGlobal, next_quiz: nextQuiz }, cacheHeaders(0));
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

  const set = req.query.set ? Number(req.query.set) : null;
  const category = req.query.category ? String(req.query.category).trim() : '';
  const search = req.query.search ? String(req.query.search).trim() : '';
  
  const page = req.query.page ? Number(req.query.page) : 1;
  const size = req.query.size ? Number(req.query.size) : 50; // Default size 50
  
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

  // Ensure only active questions are shown to public unless 'all_status' is requested by admin (handled in admin_handler)
  // For public API, we might want to default to active=true
  // But wait, admin might use this list endpoint too?
  // The user asked to separate endpoints. Admin CRUD is in admin_handler.
  // This is public read-only. So we should force active=true for safety, 
  // OR allow admin to see all if they pass a token?
  // The user said: "Pastikan tidak ada logic admin di endpoint public" (Ensure no admin logic in public endpoint).
  // So this should probably be restricted to active=true ONLY.
  // However, if the frontend admin panel uses this to list questions to edit, it needs to see inactive ones.
  // We should add a separate 'adminList' action in admin_handler or allow this one to filter if authorized.
  // Given the instruction, I will keep this simple and safe:
  // If no auth token, force active=true. If auth token present and valid, allow all.
  
  // Actually, to strictly follow "no admin logic in public endpoint", I should probably create a separate list endpoint for admin.
  // But that duplicates code.
  // I'll make this endpoint safe by default (active=true), but allow override if a special param + auth is present?
  // Or just create `listQuestions` in `admin_handler`?
  // Let's create `list` in `admin_handler` to be safe and clean.
  // And here in `questions.js`, we enforce `active = true`.

  whereClauses.push(`active = true`);

  const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
  
  // Count
  const countRes = await rawQuery(`SELECT COUNT(*)::int as total FROM questions ${whereSql}`, params);
  const total = countRes.rows[0]?.total || 0;
  
  // Data
  const dataRes = await rawQuery(`SELECT id, question, options, category, quiz_set FROM questions ${whereSql} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`, params);
  // Note: I removed 'correct_answer' and 'active' from SELECT to prevent cheating/leaking, 
  // though 'active' is true anyway. 'correct_answer' MUST NOT be sent to public.
  
  json(res, 200, { 
      status: 'success', 
      questions: dataRes.rows, 
      total: total,
      page: page,
      size: limit 
  }, cacheHeaders(0));
}

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      return await list(req, res);
    }
    return json(res, 405, { status: 'error', message: 'Method not allowed. Use POST /api/admin/questions for CRUD.' });
  } catch (e) {
    console.error('questions API error:', e);
    return json(res, 500, { status: 'error', message: 'Internal Server Error' });
  }
};
