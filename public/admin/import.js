function parseCSV(text) {
  const rows = [];
  let i = 0, field = '', row = [], inQuotes = false;
  while (i < text.length) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i+1] === '"') { field += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (c === ',' && !inQuotes) {
      row.push(field); field = '';
    } else if ((c === '\n' || c === '\r') && !inQuotes) {
      if (field !== '' || row.length) { row.push(field); field = ''; rows.push(row); row = []; }
    } else {
      field += c;
    }
    i++;
  }
  if (field !== '' || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function toObjects(rows) {
  if (!rows.length) return [];
  const header = rows[0].map(h => String(h).trim().toLowerCase());
  const out = [];
  for (let r = 1; r < rows.length; r++) {
    const obj = {};
    for (let c = 0; c < header.length; c++) obj[header[c]] = rows[r][c] ?? '';
    out.push(obj);
  }
  return out;
}

document.addEventListener('DOMContentLoaded', () => {
  const csvFile = document.getElementById('csv-file');
  const tokenEl = document.getElementById('admin-token');
  const startBtn = document.getElementById('start-import');
  const statusEl = document.getElementById('status');
  const defSetEl = document.getElementById('default-set');
  const defCatEl = document.getElementById('default-category');

  function setStatus(t, kind) {
    statusEl.textContent = t || '';
    statusEl.classList.remove('ok','error');
    if (kind === 'ok') statusEl.classList.add('ok');
    if (kind === 'error') statusEl.classList.add('error');
  }

  startBtn.addEventListener('click', async () => {
    try {
      setStatus('Memproses CSV...','');
      const file = csvFile.files[0];
      const token = String(tokenEl.value||'').trim();
      if (!file) { setStatus('Pilih file CSV','error'); return; }
      if (!token) { setStatus('Masukkan ADMIN_TOKEN','error'); return; }
      const text = await file.text();
      const rows = parseCSV(text);
      const objs = toObjects(rows);
      let okCount = 0, failCount = 0;
      for (const o of objs) {
        const payload = {
          question: String(o.question||'').trim(),
          options: { a: String(o.a||''), b: String(o.b||''), c: String(o.c||''), d: String(o.d||'') },
          correct_answer: String(o.correct||'').trim().toLowerCase(),
          active: String(o.active||'true').toLowerCase() !== 'false',
          category: String(o.category||String(defCatEl.value||'')).trim() || null,
          quiz_set: Number(String(o.quiz_set||String(defSetEl.value||'1')))
        };
        try {
          const res = await IpmApi.createQuestion(payload, token);
          if (res && res.status === 'success') okCount++; else failCount++;
        } catch { failCount++; }
        setStatus(`Berhasil: ${okCount}, Gagal: ${failCount}`,'');
      }
      setStatus(`Import selesai. Berhasil: ${okCount}, Gagal: ${failCount}`,'ok');
    } catch (e) {
      setStatus(String(e.message||e),'error');
    }
  });
});

