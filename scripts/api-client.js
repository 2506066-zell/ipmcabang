async function apiFetch(path, init) {
  const url = path.startsWith('/api/') ? path : `/api/${path}`;
  const res = await fetch(url, init);
  const txt = await res.text();
  const data = txt ? JSON.parse(txt) : null;
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
