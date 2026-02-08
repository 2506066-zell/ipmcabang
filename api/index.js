const { json } = require('./_util');

// Internal Route Map
const routes = {
  'auth': require('./_handler_auth'),
  'auth_handler': require('./_handler_auth'), // Legacy support
  'admin/questions': require('./_handler_admin'),
  'admin/materials': require('./_handler_admin'), // Admin materials logic is here
  'admin/users': require('./_handler_users'),    // Admin users logic is here
  'admin_handler': require('./_handler_admin'), // Legacy support
  'admin': require('./_handler_admin'),
  'articles': require('./_handler_articles'),
  'materials': require('./_handler_materials'),
  'questions': require('./_handler_questions'),
  'results': require('./_handler_results'),
  'users': require('./_handler_users')
};

module.exports = async (req, res) => {
  try {
    // Parse the path to find the segment after /api/
    // Example: /api/articles -> articles
    // Example: /api/auth/login -> auth
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathParts = url.pathname.split('/').filter(p => p);

    // Find segment after 'api'
    const apiIdx = pathParts.indexOf('api');
    const segment = (apiIdx !== -1 && pathParts[apiIdx + 1]) ? pathParts[apiIdx + 1] : null;
    const subSegment = (apiIdx !== -1 && pathParts[apiIdx + 2]) ? pathParts[apiIdx + 2] : null;

    // Direct match or nested match
    let handler = routes[segment];

    // Handle nested admin routes: /api/admin/users -> users handler, etc.
    if (segment === 'admin' && subSegment) {
      if (routes[`admin/${subSegment}`]) {
        handler = routes[`admin/${subSegment}`];
      } else if (routes[subSegment]) {
        handler = routes[subSegment];
      }
    }

    // Special case for admin_handler legacy path
    if (segment === 'admin_handler') {
      handler = routes['admin'];
    }
    if (segment === 'auth_handler') {
      handler = routes['auth'];
    }

    if (handler) {
      return await handler(req, res);
    }

    // Fallback for root /api calls (Old Logic)
    if (!segment) {
      const { query, getConnHost } = require('./_db');
      const action = req.query.action || '';
      if (req.method === 'GET' && action === 'health') return json(res, 200, { status: 'success', ok: true });
      if (req.method === 'GET' && action === 'dbHealth') {
        const now = (await query`SELECT NOW() AS now`).rows[0]?.now;
        return json(res, 200, { status: 'success', db: 'ok', now });
      }
    }

    return json(res, 404, { status: 'error', message: `Route /api/${segment || ''} not found` });

  } catch (e) {
    console.error('Router Error:', e);
    return json(res, 500, { status: 'error', message: 'Internal Server Error' });
  }
};
