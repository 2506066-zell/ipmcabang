const { query } = require('./_db');
const { getSessionFromCookieHeader } = require('./_handler_users');

async function handler(req, res) {
  try {
    const { method } = req;
    const url = new URL(req.url, `http://${req.headers.host}`);
    const searchParams = url.searchParams;
    const id = searchParams.get('id');
    const action = searchParams.get('action');

    // Authentication Helper
    async function getUserSession() {
      const authHeader = req.headers.authorization;
      let token = '';
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else {
        token = getSessionFromCookieHeader(req.headers.cookie);
      }
      if (!token) return null;

      const sessionResult = await query`
        SELECT s.user_id, u.username, u.nama_panjang, u.role
        FROM sessions s
        JOIN users u ON s.user_id = u.id
        WHERE s.token = ${token}
      `;
      return sessionResult.rows[0] || null;
    }

    if (method === 'GET') {
      if (id) {
        // Increment view count if someone visits the detail page
        await query`UPDATE discussions SET views = views + 1 WHERE id = ${id}`;

        const discussionRes = await query`
          SELECT d.*, u.username, u.nama_panjang, u.role as user_role
          FROM discussions d
          JOIN users u ON d.user_id = u.id
          WHERE d.id = ${id}
        `;
        
        if (discussionRes.rows.length === 0) {
          return res.status(404).json({ status: 'error', message: 'Diskusi tidak ditemukan' });
        }
        
        const discussion = discussionRes.rows[0];

        const repliesRes = await query`
          SELECT r.*, u.username, u.nama_panjang, u.role as user_role
          FROM discussion_replies r
          JOIN users u ON r.user_id = u.id
          WHERE r.discussion_id = ${id}
          ORDER BY r.created_at ASC
        `;

        return res.status(200).json({
          status: 'success',
          discussion: discussion,
          replies: repliesRes.rows
        });
      }

      // List Discussions
      const limit = Number(searchParams.get('limit')) || 20;
      const offset = Number(searchParams.get('offset')) || 0;
      const q = searchParams.get('q');

      let queryStr = `
        SELECT 
          d.*, 
          u.username, u.nama_panjang, u.role as user_role,
          (SELECT COUNT(*) FROM discussion_replies r WHERE r.discussion_id = d.id) as reply_count
        FROM discussions d
        JOIN users u ON d.user_id = u.id
      `;
      let queryParams = [];

      if (q) {
        queryStr += ` WHERE d.title ILIKE $1 OR d.content ILIKE $1`;
        queryParams.push(`%${q}%`);
      }

      queryStr += ` ORDER BY d.created_at DESC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
      queryParams.push(limit, offset);

      const dbRes = await query(queryStr, ...queryParams);

      return res.status(200).json({
        status: 'success',
        discussions: dbRes.rows
      });
    }

    if (method === 'POST') {
      const user = await getUserSession();
      if (!user) {
        return res.status(401).json({ status: 'error', message: 'Unauthorized' });
      }

      const body = await parseBody(req);
      
      if (action === 'reply') {
        const { discussion_id, content } = body;
        if (!discussion_id || !content) {
          return res.status(400).json({ status: 'error', message: 'Missing fields' });
        }

        const result = await query`
          INSERT INTO discussion_replies (discussion_id, user_id, content)
          VALUES (${discussion_id}, ${user.user_id}, ${content})
          RETURNING id, created_at
        `;

        // Update updated_at of the discussion
        await query`UPDATE discussions SET updated_at = NOW() WHERE id = ${discussion_id}`;

        return res.status(201).json({
          status: 'success',
          message: 'Reply posted',
          reply_id: result.rows[0].id
        });
      }

      // Create new discussion
      const { title, content, category } = body;
      if (!title || !content) {
        return res.status(400).json({ status: 'error', message: 'Title and content are required' });
      }

      const result = await query`
        INSERT INTO discussions (user_id, title, content, category)
        VALUES (${user.user_id}, ${title}, ${content}, ${category || 'Umum'})
        RETURNING id, created_at
      `;

      return res.status(201).json({
        status: 'success',
        message: 'Discussion created',
        discussion_id: result.rows[0].id
      });
    }
    
    if (method === 'DELETE') {
       const user = await getUserSession();
       if (!user || user.role !== 'admin') {
           return res.status(403).json({ status: 'error', message: 'Admin access required' });
       }
       
       if (action === 'reply') {
           const replyId = searchParams.get('reply_id');
           if (!replyId) return res.status(400).json({ status: 'error', message: 'Missing reply_id' });
           await query`DELETE FROM discussion_replies WHERE id = ${replyId}`;
           return res.status(200).json({ status: 'success', message: 'Reply deleted' });
       }
       
       if (id) {
           await query`DELETE FROM discussions WHERE id = ${id}`;
           return res.status(200).json({ status: 'success', message: 'Discussion deleted' });
       }
       
       return res.status(400).json({ status: 'error', message: 'Missing id' });
    }

    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  } catch (error) {
    console.error('Discussions API Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
}

// Helper to parse JSON body
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let rawData = '';
    req.on('data', chunk => { rawData += chunk; });
    req.on('end', () => {
      try {
        resolve(rawData ? JSON.parse(rawData) : {});
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

module.exports = handler;
