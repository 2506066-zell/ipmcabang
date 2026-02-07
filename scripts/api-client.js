function resolveBase() {
  const base = typeof window !== 'undefined' && window.__IPM_API_BASE__ ? String(window.__IPM_API_BASE__) : (typeof window !== 'undefined' ? window.location.origin : '');
  return base.replace(/\/$/, '');
}
async function apiFetch(path, init) {
  const p = path.startsWith('/api/') ? path : `/api/${path}`;
  const url = p.startsWith('http') ? p : resolveBase() + p;
  const res = await fetch(url, init);
  const ct = String(res.headers.get('Content-Type') || '');
  const txt = await res.text();
  let data = null;
  if (ct.includes('application/json')) {
    try { data = txt ? JSON.parse(txt) : null; } catch {}
  }
  if (data === null) {
    const snippet = (txt || '').slice(0, 180).replace(/\s+/g,' ').trim();
    throw new Error(`Respon bukan JSON (Content-Type: ${ct||'unknown'}). ${snippet?('Cuplikan: '+snippet):''}`);
  }
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}

async function listQuestions(set) {
  const q = set ? `questions?set=${encodeURIComponent(set)}` : 'questions';
  return await apiFetch(q);
}

async function createQuestion(payload, token) {
  return await apiFetch('questions', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(payload) });
}

async function submitResult(payload) {
  return await apiFetch('results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
}

window.IpmApi = { apiFetch, listQuestions, createQuestion, submitResult };
