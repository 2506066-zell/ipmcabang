const handler = require('./_article-share');
export default async function apiRoute(req, res) {
  return handler(req, res);
}
