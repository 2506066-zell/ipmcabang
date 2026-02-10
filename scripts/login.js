(() => {
  const FORM_ID = 'login-form';
  const USER_SESSION_KEY = 'ipmquiz_user_session';
  const USER_USERNAME_KEY = 'ipmquiz_user_username';
  const API_BASE = '/api/auth/login';
  function qs(id) { return document.getElementById(id); }
  function storeSession(token, username, remember) {
    try {
      if (remember) {
        localStorage.setItem(USER_SESSION_KEY, token);
        localStorage.setItem(USER_USERNAME_KEY, username);
      } else {
        sessionStorage.setItem(USER_SESSION_KEY, token);
        sessionStorage.setItem(USER_USERNAME_KEY, username);
      }
    } catch {}
  }
  function togglePassword() {
    const input = qs('password');
    if (!input) return;
    input.type = input.type === 'password' ? 'text' : 'password';
  }
  function showError(msg) {
    const err = qs('error-message');
    if (err) {
      err.textContent = msg || '';
      err.style.display = msg ? 'block' : 'none';
    }
  }
  function onSubmit(e) {
    e.preventDefault();
    const unameEl = qs('username');
    const passEl = qs('password');
    const rememberEl = qs('remember-me');
    const err = qs('error-message');
    const username = String(unameEl && unameEl.value || '').trim();
    const password = String(passEl && passEl.value || '');
    const remember = !!(rememberEl && rememberEl.checked);
    if (!username || !password) {
      showError('Username dan password wajib diisi.');
      if (window.Toast) Toast.show('Lengkapi username dan password.', 'info');
      return;
    }
    showError('');
    if (window.AppLoader) AppLoader.show('Masuk...');
    fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    .then(async (res) => {
      const ct = res.headers.get('content-type') || '';
      const body = await res.text();
      let data = {};
      try { data = ct.includes('application/json') ? JSON.parse(body) : {}; } catch {}
      if (!res.ok || data.status !== 'success') throw new Error(data.message || ('HTTP '+res.status));
      const token = String(data.session || '');
      const uname = String(data.username || username);
      storeSession(token, uname, remember);
      try {
        const storage = remember ? localStorage : sessionStorage;
        if (data.nama_panjang) storage.setItem('ipmquiz_user_fullname', data.nama_panjang);
        if (data.pimpinan) storage.setItem('ipmquiz_user_pimpinan', data.pimpinan);
      } catch {}
      if (window.Toast) Toast.show('Berhasil masuk', 'success');
      try {
        await autoSubscribePush(token);
      } catch {}
      window.location.href = 'quiz.html';
    })
    .catch((e) => {
      const msg = (e && e.message && /username|password|salah|unauthorized/i.test(e.message))
        ? 'Username atau password salah.'
        : 'Gagal masuk. Periksa koneksi lalu coba lagi.';
      showError(msg);
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
    const flash = sessionStorage.getItem('ipmquiz_flash');
    if (flash) {
      sessionStorage.removeItem('ipmquiz_flash');
      showError(flash);
      if (window.Toast) Toast.show(flash, 'info');
    }
  });

  async function autoSubscribePush(token) {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission === 'denied') return;

    const getPublicKey = async () => {
      const res = await fetch('/api/push?action=publicKey');
      if (!res.ok) return null;
      const data = await res.json();
      return data.publicKey || null;
    };

    const urlBase64ToUint8Array = (base64String) => {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
      const rawData = atob(base64);
      return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
    };

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      const publicKey = await getPublicKey();
      if (!publicKey) return;
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });
    }

    await fetch('/api/push?action=subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ subscription })
    });
  }
})();


