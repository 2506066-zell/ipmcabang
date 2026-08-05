const handler = require('./_handler_attendance');
export default async function apiRoute(req, res) {
  return handler(req, res);
}
