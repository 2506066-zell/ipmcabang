const handler = require('./_handler_materials');
export default async function apiRoute(req, res) {
  return handler(req, res);
}
