const handler = require('./_handler_results');
export default async function apiRoute(req, res) {
  return handler(req, res);
}
