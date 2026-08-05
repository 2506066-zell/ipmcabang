const handler = require('./_handler_questions');
export default async function apiRoute(req, res) {
  return handler(req, res);
}
