const { query } = require('./_db');
const {
  DEFAULT_ORG_BIDANG,
  DEFAULT_ORG_MEMBERS,
  DEFAULT_ORG_PROGRAMS
} = require('./_organization_seed');

function normalizeMediaPath(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.endsWith('/')) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^data:/i.test(raw)) return raw;
  if (raw.startsWith('/data:image')) return raw.substring(1);
  if (raw.startsWith('/')) return raw;
  return `/${raw.replace(/^\.?\//, '')}`;
}

function normalizeStatus(value) {
  const s = String(value || '').trim().toLowerCase();
  if (s === 'rencana' || s === 'terlaksana' || s === 'draft') return s;
  return 'draft';
}
