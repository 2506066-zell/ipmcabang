const { json, cacheHeaders } = require('./_util');

module.exports = async (req, res) => {
  json(res, 200, { status: 'success', ok: true, ts: Date.now() }, cacheHeaders(10));
};
