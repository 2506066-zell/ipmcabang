(() => {
  const FORM_ID = 'register-form';
  const API_BASE = '/api/auth/register';
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
    if (toggle) toggle.addEventListener('click', togglePassword);
    if (form) form.addEventListener('submit', onSubmit);
  });
})();
