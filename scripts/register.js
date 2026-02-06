document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('register-form');
  const messageEl = document.getElementById('message');
  const toggleBtn = document.getElementById('toggle-password');

  const API_URL = '/api/auth/register';
  const USER_SESSION_KEY = 'ipmquiz_user_session';
  const USER_USERNAME_KEY = 'ipmquiz_user_username';
  if (window.NavigationGuard) NavigationGuard.enable('Keluar dari halaman? Data form belum tersimpan.');
  const inputs = Array.from((form && form.querySelectorAll('input')) || []);
  inputs.forEach(el => el.addEventListener('input', () => {
    const dirty = inputs.some(i => String(i.value || '').length > 0);
    if (window.NavigationGuard) {
      if (dirty) NavigationGuard.markDirty(); else NavigationGuard.clearDirty();
    }
  }));

  function setMessage(msg) {
    if (messageEl) messageEl.textContent = msg || '';
  }

  function showToast(text) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); t.remove(); }, 2000);
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const input = document.getElementById('password');
      const isPwd = input.type === 'password';
      input.type = isPwd ? 'text' : 'password';
      toggleBtn.innerHTML = isPwd ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    setMessage('');
    const nama_panjang = String(document.getElementById('namaPanjang').value || '').trim();
    const pimpinan = String(document.getElementById('pimpinan').value || '').trim();
    const username = String(document.getElementById('username').value || '').trim();
    const password = String(document.getElementById('password').value || '');
    if (!nama_panjang || !pimpinan || !username || !password) {
      setMessage('Isi semua kolom.');
      showToast('Lengkapi data terlebih dahulu');
      return;
    }
    if (password.length < 6) {
      setMessage('Password minimal 6 karakter.');
      showToast('Password terlalu pendek');
      return;
    }
    try {
      if (window.AppLoader) AppLoader.show('Mendaftarkan akun...');
      form.querySelector('.login-button').disabled = true;
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nama_panjang, pimpinan, username, password })
      });
      const data = await res.json();
      if (!res.ok || data.status !== 'success') {
        throw new Error(data.message || 'Pendaftaran gagal');
      }
      const loginRes = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      const loginData = await loginRes.json();
      if (!loginRes.ok || loginData.status !== 'success') throw new Error(loginData.message || 'Login otomatis gagal');
      sessionStorage.setItem(USER_SESSION_KEY, String(loginData.session || ''));
      sessionStorage.setItem(USER_USERNAME_KEY, String(loginData.username || username));
      showToast('Pendaftaran berhasil');
      if (window.NavigationGuard) NavigationGuard.disable();
      window.location.href = 'quiz.html';
    } catch (err) {
      setMessage(err.message || 'Gagal mendaftar');
      showToast('Pendaftaran gagal');
    } finally {
      if (window.AppLoader) AppLoader.hide();
      form.querySelector('.login-button').disabled = false;
    }
  });
});
