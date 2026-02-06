document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('register-form');
  const messageEl = document.getElementById('message');
  const toggleBtn = document.getElementById('toggle-password');

  const API_URL = 'https://script.google.com/macros/s/AKfycbzQfRpw3cbu_FOfiA4ftjv-9AcWklpSZieRJZeotvwVSc3lkXC6i3saKYtt4P0V9tVn/exec';
  const USER_SESSION_KEY = 'ipmquiz_user_session';
  const USER_USERNAME_KEY = 'ipmquiz_user_username';

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
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'publicRegister', nama_panjang, pimpinan, username, password })
      });
      const data = await res.json();
      if (!res.ok || data.status !== 'success') {
        throw new Error(data.message || 'Pendaftaran gagal');
      }
      sessionStorage.setItem(USER_SESSION_KEY, String(data.session || ''));
      sessionStorage.setItem(USER_USERNAME_KEY, String(data.username || username));
      showToast('Pendaftaran berhasil');
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
