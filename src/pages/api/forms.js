const handler = require('./_handler_forms');
export default async function apiRoute(req, res) {
  return handler(req, res);
}
