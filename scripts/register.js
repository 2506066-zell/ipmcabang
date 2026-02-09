(() => {
  const FORM_ID = 'register-form';
  const API_BASE = '/api/auth/register';
  const PIMPINAN_API = '/api/auth?action=pimpinanOptions';
  function qs(id) { return document.getElementById(id); }
  function togglePassword() {
    const input = qs('password');
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  }
  function showMessage(msg) {
    const message = qs('message');
    if (message) {
      message.textContent = msg || '';
      message.style.display = msg ? 'block' : 'none';
    }
  }
  function onSubmit(e) {
    e.preventDefault();
    const nama = String(qs('namaPanjang')?.value || '').trim();
    const pimpinan = String(qs('pimpinan')?.value || '').trim();
    const username = String(qs('username')?.value || '').trim().toLowerCase();
    const password = String(qs('password')?.value || '');
    if (!nama || !pimpinan || !username || !password) {
      showMessage('Semua field wajib diisi.');
      if (window.Toast) Toast.show('Lengkapi semua data pendaftaran.', 'info');
      return;
    }
    showMessage('');
    if (window.AppLoader) AppLoader.show('Mendaftar...');
    fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama_panjang: nama, pimpinan, username, password })
    })
    .then(async (res) => {
      const ct = res.headers.get('content-type') || '';
      const body = await res.text();
      let data = {};
      try { data = ct.includes('application/json') ? JSON.parse(body) : {}; } catch {}
      if (!res.ok || data.status !== 'success') throw new Error(data.message || ('HTTP '+res.status));
      if (window.Toast) Toast.show('Pendaftaran berhasil', 'success');
      window.location.href = 'login.html';
    })
    .catch((e) => {
      const raw = String(e && e.message || '');
      const msg = raw.toLowerCase().includes('username') ? raw : 'Gagal mendaftar. Coba lagi.';
      showMessage(msg);
      if (window.Toast) Toast.show(msg, 'error');
    })
    .finally(() => {
      if (window.AppLoader) AppLoader.hide();
    });
  }
  document.addEventListener('DOMContentLoaded', () => {
    const form = qs(FORM_ID);
    const toggle = qs('toggle-password');
    const pimpinanSelect = qs('pimpinan');
    const pimpinanHint = qs('pimpinan-hint');
    if (toggle) toggle.addEventListener('click', togglePassword);
    if (form) form.addEventListener('submit', onSubmit);

    if (pimpinanSelect) {
      pimpinanSelect.disabled = true;
      fetch(PIMPINAN_API)
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok || data.status !== 'success') throw new Error(data.message || 'Gagal memuat pilihan.');
          const options = Array.isArray(data.options) ? data.options : [];
          pimpinanSelect.innerHTML = '';
          if (!options.length) {
            pimpinanSelect.innerHTML = '<option value="">Belum ada pilihan. Hubungi admin.</option>';
            pimpinanSelect.disabled = true;
            if (pimpinanHint) pimpinanHint.textContent = 'Pilihan belum tersedia. Hubungi admin untuk mengatur.';
            return;
          }
          const placeholder = document.createElement('option');
          placeholder.value = '';
          placeholder.textContent = 'Pilih asal pimpinan';
          placeholder.disabled = true;
          placeholder.selected = true;
          pimpinanSelect.appendChild(placeholder);
          options.forEach((opt) => {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            pimpinanSelect.appendChild(o);
          });
          pimpinanSelect.disabled = false;
        })
        .catch(() => {
          pimpinanSelect.innerHTML = '<option value="">Gagal memuat pilihan. Coba lagi.</option>';
          pimpinanSelect.disabled = true;
        });
    }
  });
})();
