function resolveBase() {
  const base = typeof window !== 'undefined' && window.__IPM_API_BASE__ ? String(window.__IPM_API_BASE__) : (typeof window !== 'undefined' ? window.location.origin : '');
  return base.replace(/\/$/, '');
}

async function apiFetch(path, init = {}) {
  const p = path.startsWith('/api/') ? path : `/api/${path}`;
  const url = p.startsWith('http') ? p : resolveBase() + p;
  
  // Ensure credentials (cookies) are sent
  if (!init.credentials) {
    init.credentials = 'include';
  }

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
  
  if (!res.ok) {
    const msg = data?.message || `HTTP ${res.status}`;
    // Attach status to error for handling
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  
  return data;
}

async function listQuestions(set) {
  const q = set ? `questions?set=${encodeURIComponent(set)}` : 'questions';
  return await apiFetch(q);
}

// Admin API wrappers
async function createQuestion(payload, token) {
  // We use cookie auth now, so token param is optional/deprecated but kept for compat if needed
  // We route to admin endpoint
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  return await apiFetch('admin/questions?action=create', { 
    method: 'POST', 
    headers, 
    body: JSON.stringify(payload) 
  });
}

async function updateQuestion(payload, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return await apiFetch('admin/questions?action=update', { 
    method: 'POST', 
    headers, 
    body: JSON.stringify(payload) 
  });
}

async function deleteQuestion(id, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  return await apiFetch('admin/questions?action=delete', { 
    method: 'POST', 
    headers, 
    body: JSON.stringify({ id }) 
  });
}

async function submitResult(payload) {
  return await apiFetch('results', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
}

window.IpmApi = { apiFetch, listQuestions, createQuestion, updateQuestion, deleteQuestion, submitResult };
