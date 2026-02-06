document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('login-form');
  const messageEl = document.getElementById('error-message');
  const toggleBtn = document.getElementById('toggle-password');

  const API_URL = 'https://script.google.com/macros/s/AKfycbzQfRpw3cbu_FOfiA4ftjv-9AcWklpSZieRJZeotvwVSc3lkXC6i3saKYtt4P0V9tVn/exec';
  const USER_SESSION_KEY = 'ipmquiz_user_session';
  const USER_USERNAME_KEY = 'ipmquiz_user_username';
  const rememberEl = document.getElementById('remember-me');

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
    const username = String(document.getElementById('username').value || '').trim();
    const password = String(document.getElementById('password').value || '');
    if (!username || !password) {
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
      if (window.AppLoader) AppLoader.show('Menghubungkan...');
      form.querySelector('.login-button').disabled = true;
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'publicLogin', username, password })
      });
      const data = await res.json();
      if (!res.ok || data.status !== 'success') {
        throw new Error(data.message || 'Login gagal');
      }
      sessionStorage.setItem(USER_SESSION_KEY, String(data.session || ''));
      sessionStorage.setItem(USER_USERNAME_KEY, String(data.username || username));
      if (rememberEl && rememberEl.checked) {
        localStorage.setItem(USER_SESSION_KEY, String(data.session || ''));
        localStorage.setItem(USER_USERNAME_KEY, String(data.username || username));
      }
      showToast('Login berhasil');
      window.location.href = 'quiz.html';
    } catch (err) {
      setMessage(err.message || 'Gagal login');
      showToast('Login gagal');
    } finally {
      if (window.AppLoader) AppLoader.hide();
      form.querySelector('.login-button').disabled = false;
    }
  });

  // Auto-redirect if remembered
  const rememberedSession = String(localStorage.getItem(USER_SESSION_KEY) || '').trim();
  if (rememberedSession) {
    sessionStorage.setItem(USER_SESSION_KEY, rememberedSession);
    const rememberedUsername = String(localStorage.getItem(USER_USERNAME_KEY) || '');
    sessionStorage.setItem(USER_USERNAME_KEY, rememberedUsername);
    showToast('Mengarahkan ke kuis...');
    window.location.href = 'quiz.html';
  }
});
