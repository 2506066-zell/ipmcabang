(() => {
  const FORM_ID = 'login-form';
  const SUBMIT_BTN_ID = 'login-submit-btn';
  const USER_SESSION_KEY = 'ipmquiz_user_session';
  const USER_USERNAME_KEY = 'ipmquiz_user_username';
  const API_BASE = '/api/auth/login';
  const FIELD_CONFIG = {
    username: { inputId: 'username', errorId: 'username-field-error' },
    password: { inputId: 'password', errorId: 'password-field-error' }
  };

  function qs(id) { return document.getElementById(id); }

  function storeSession(token, username, remember) {
    try {
      sessionStorage.removeItem(USER_SESSION_KEY);
      localStorage.removeItem(USER_SESSION_KEY);
      sessionStorage.removeItem(USER_USERNAME_KEY);
      localStorage.removeItem(USER_USERNAME_KEY);

      if (remember) {
        localStorage.setItem(USER_SESSION_KEY, token);
        localStorage.setItem(USER_USERNAME_KEY, username);
      } else {
        sessionStorage.setItem(USER_SESSION_KEY, token);
        sessionStorage.setItem(USER_USERNAME_KEY, username);
      }
    } catch {}
  }

  function setFieldError(fieldKey, message) {
    const config = FIELD_CONFIG[fieldKey];
    if (!config) return;
    const input = qs(config.inputId);
    const error = qs(config.errorId);
    if (input) {
      input.classList.toggle('is-invalid', !!message);
      input.setAttribute('aria-invalid', message ? 'true' : 'false');
    }
    if (error) {
      error.textContent = message || '';
      error.hidden = !message;
    }
  }

  function clearFieldError(fieldKey) {
    setFieldError(fieldKey, '');
  }

  function clearAllFieldErrors() {
    Object.keys(FIELD_CONFIG).forEach(clearFieldError);
  }

  function focusField(fieldKey) {
    const config = FIELD_CONFIG[fieldKey];
    const input = config ? qs(config.inputId) : null;
    if (input) input.focus();
  }

  function validateForm() {
    const username = String(qs('username')?.value || '').trim();
    const password = String(qs('password')?.value || '');
    let firstInvalidField = '';

    clearAllFieldErrors();

    if (!username) {
      setFieldError('username', 'Username wajib diisi.');
      firstInvalidField = firstInvalidField || 'username';
    }
    if (!password) {
      setFieldError('password', 'Password wajib diisi.');
      firstInvalidField = firstInvalidField || 'password';
    } else if (password.length < 6) {
      setFieldError('password', 'Password minimal 6 karakter.');
      firstInvalidField = firstInvalidField || 'password';
    }

    if (firstInvalidField) {
      focusField(firstInvalidField);
      return null;
    }

    return { username, password };
  }

  function showError(msg, type = 'error') {
    const err = qs('error-message');
    if (!err) return;
    err.textContent = msg || '';
    err.classList.remove('success', 'error');
    if (msg) err.classList.add(type === 'success' ? 'success' : 'error');
    err.hidden = !msg;
  }

  function setSubmitting(isSubmitting) {
    const submitBtn = qs(SUBMIT_BTN_ID);
    if (!submitBtn) return;
    submitBtn.disabled = !!isSubmitting;
    submitBtn.textContent = isSubmitting ? 'Memproses...' : 'Masuk';
  }

  function onSubmit(e) {
    e.preventDefault();
    const rememberEl = qs('remember-me');
    const credentials = validateForm();
    const username = String(credentials?.username || '');
    const password = String(credentials?.password || '');
    const remember = !!(rememberEl && rememberEl.checked);

    if (!credentials) {
      showError('');
      if (window.Toast) Toast.show('Periksa data login yang ditandai.', 'info');
      return;
    }

    showError('');
    setSubmitting(true);
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
      if (!token) throw new Error('Sesi login tidak valid.');
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
      window.location.href = 'quiz-gamified.html';
    })
    .catch((e) => {
      const msg = (e && e.message && /username|password|salah|unauthorized/i.test(e.message))
        ? 'Username atau password salah.'
        : 'Gagal masuk. Periksa koneksi lalu coba lagi.';
      showError(msg);
      if (/username|password|salah|unauthorized/i.test(String(e && e.message || ''))) {
        setFieldError('password', 'Periksa lagi username atau password.');
        focusField('password');
      }
      if (window.Toast) Toast.show(msg, 'error');
    })
    .finally(() => {
      setSubmitting(false);
      if (window.AppLoader) AppLoader.hide();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = qs(FORM_ID);
    if (form) form.addEventListener('submit', onSubmit);
    const usernameInput = qs('username');
    const passwordInput = qs('password');
    if (usernameInput) {
      usernameInput.addEventListener('input', () => {
        clearFieldError('username');
      });
    }
    if (passwordInput) {
      passwordInput.addEventListener('input', () => {
        clearFieldError('password');
      });
    }
    const flash = sessionStorage.getItem('ipmquiz_flash');
    if (flash) {
      sessionStorage.removeItem('ipmquiz_flash');
      showError(flash, 'success');
      if (window.Toast) Toast.show(flash, 'info');
    }

    // --- Biometric Login Support (Point 4) ---
    const bioBtn = qs('biometric-login-btn');
    if (bioBtn && window.WebAuthnClient) {
        window.WebAuthnClient.isSupported().then(supported => {
            if (supported) bioBtn.hidden = false;
        });

        bioBtn.addEventListener('click', async () => {
            const usernameInput = qs('username');
            const username = String(usernameInput?.value || '').trim().toLowerCase();
            
            if (!username) {
                setFieldError('username', 'Masukkan username dulu sebelum login biometrik.');
                focusField('username');
                return;
            }

            try {
                if (window.AppLoader) window.AppLoader.show('Verifikasi Biometrik...');
                const result = await window.WebAuthnClient.login(username);
                if (result.status === 'success') {
                    const token = result.user?.session || ''; // Handled by cookie too
                    storeSession(token, username, true);
                    if (window.Toast) window.Toast.show('Berhasil masuk via biometrik.', 'success');
                    window.location.href = 'quiz-gamified.html';
                } else {
                    showError(result.message || 'Gagal login biometrik.');
                }
            } catch (err) {
                showError('Biometrik gagal atau dibatalkan.');
            } finally {
                if (window.AppLoader) window.AppLoader.hide();
            }
        });
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

    const subscribeRes = await fetch('/api/push?action=subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ subscription })
    });
    if (!subscribeRes.ok) throw new Error(`Subscribe gagal (${subscribeRes.status})`);
    const subscribeData = await subscribeRes.json().catch(() => ({}));
    if (subscribeData.status && subscribeData.status !== 'success') {
      throw new Error(subscribeData.message || 'Subscribe gagal');
    }
  }
})();



