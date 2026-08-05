const handler = require('./_handler_feedback');
export default async function apiRoute(req, res) {
  return handler(req, res);
}
