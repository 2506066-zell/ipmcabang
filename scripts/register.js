(() => {
  const FORM_ID = 'register-form';
  const SUBMIT_BTN_ID = 'register-submit-btn';
  const API_BASE = '/api/auth/register';
  const PIMPINAN_API = '/api/auth?action=pimpinanOptions';
  const USERNAME_REGEX = /^[a-z0-9._-]{3,30}$/i;
  const FIELD_CONFIG = {
    nama: { inputId: 'namaPanjang', errorId: 'nama-field-error' },
    pimpinan: { inputId: 'pimpinan', errorId: 'pimpinan-field-error' },
    username: { inputId: 'username', errorId: 'username-field-error' },
    password: { inputId: 'password', errorId: 'password-field-error' },
    confirmPassword: { inputId: 'confirmPassword', errorId: 'confirm-password-field-error' }
  };

  function qs(id) { return document.getElementById(id); }

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
    const nama = String(qs('namaPanjang')?.value || '').trim();
    const pimpinan = String(qs('pimpinan')?.value || '').trim();
    const username = String(qs('username')?.value || '').trim().toLowerCase();
    const password = String(qs('password')?.value || '');
    const confirmPassword = String(qs('confirmPassword')?.value || '');
    let firstInvalidField = '';

    clearAllFieldErrors();

    if (!nama) {
      setFieldError('nama', 'Nama panjang wajib diisi.');
      firstInvalidField = firstInvalidField || 'nama';
    } else if (nama.length < 3) {
      setFieldError('nama', 'Nama minimal 3 karakter.');
      firstInvalidField = firstInvalidField || 'nama';
    }

    if (!pimpinan) {
      setFieldError('pimpinan', 'Pilih asal pimpinan terlebih dahulu.');
      firstInvalidField = firstInvalidField || 'pimpinan';
    }

    if (!username) {
      setFieldError('username', 'Username wajib diisi.');
      firstInvalidField = firstInvalidField || 'username';
    } else if (!USERNAME_REGEX.test(username)) {
      setFieldError('username', 'Gunakan 3-30 karakter (huruf, angka, titik, garis bawah, atau strip).');
      firstInvalidField = firstInvalidField || 'username';
    }

    if (!password) {
      setFieldError('password', 'Password wajib diisi.');
      firstInvalidField = firstInvalidField || 'password';
    } else if (password.length < 6) {
      setFieldError('password', 'Password minimal 6 karakter.');
      firstInvalidField = firstInvalidField || 'password';
    }

    if (!confirmPassword) {
      setFieldError('confirmPassword', 'Konfirmasi password wajib diisi.');
      firstInvalidField = firstInvalidField || 'confirmPassword';
    } else if (confirmPassword.length < 6) {
      setFieldError('confirmPassword', 'Konfirmasi password minimal 6 karakter.');
      firstInvalidField = firstInvalidField || 'confirmPassword';
    } else if (password && confirmPassword !== password) {
      setFieldError('confirmPassword', 'Konfirmasi password tidak sama.');
      firstInvalidField = firstInvalidField || 'confirmPassword';
    }

    if (firstInvalidField) {
      focusField(firstInvalidField);
      return null;
    }

    return { nama, pimpinan, username, password };
  }

  function showMessage(msg, type = 'error') {
    const message = qs('message');
    if (!message) return;
    message.textContent = msg || '';
    message.classList.remove('error', 'success');
    if (msg) message.classList.add(type === 'success' ? 'success' : 'error');
    message.hidden = !msg;
  }

  function setSubmitting(isSubmitting) {
    const submitBtn = qs(SUBMIT_BTN_ID);
    if (!submitBtn) return;
    submitBtn.disabled = !!isSubmitting;
    submitBtn.textContent = isSubmitting ? 'Memproses...' : 'Daftar Akun';
  }

  function onSubmit(e) {
    e.preventDefault();
    const payload = validateForm();
    if (!payload) {
      showMessage('');
      if (window.Toast) Toast.show('Periksa data pendaftaran yang ditandai.', 'info');
      return;
    }

    const { nama, pimpinan, username, password } = payload;
    showMessage('');
    setSubmitting(true);
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
      showMessage('Pendaftaran berhasil. Mengarahkan ke login...', 'success');
      if (window.Toast) Toast.show('Pendaftaran berhasil', 'success');
      try {
        sessionStorage.setItem('ipmquiz_flash', 'Pendaftaran berhasil. Silakan login.');
      } catch {}
      window.location.href = 'login.html';
    })
    .catch((e) => {
      const raw = String(e && e.message || '');
      let msg = /username|pimpinan|password|nama|sudah|wajib|valid/i.test(raw) ? raw : 'Gagal mendaftar. Coba lagi.';
      if (/username/i.test(raw)) {
        setFieldError('username', /sudah|exist|dipakai/i.test(raw) ? 'Username sudah dipakai.' : 'Periksa format username.');
        focusField('username');
      } else if (/pimpinan/i.test(raw)) {
        setFieldError('pimpinan', 'Pilih asal pimpinan yang valid.');
        focusField('pimpinan');
      } else if (/password/i.test(raw)) {
        setFieldError('password', 'Password belum memenuhi syarat.');
        focusField('password');
      } else if (/nama/i.test(raw)) {
        setFieldError('nama', 'Nama panjang belum valid.');
        focusField('nama');
      } else {
        msg = 'Gagal mendaftar. Coba lagi.';
      }
      showMessage(msg);
      if (window.Toast) Toast.show(msg, 'error');
    })
    .finally(() => {
      setSubmitting(false);
      if (window.AppLoader) AppLoader.hide();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = qs(FORM_ID);
    const pimpinanSelect = qs('pimpinan');
    const pimpinanHint = qs('pimpinan-hint');
    if (form) form.addEventListener('submit', onSubmit);
    const namaInput = qs('namaPanjang');
    const usernameInput = qs('username');
    const passwordInput = qs('password');
    const confirmPasswordInput = qs('confirmPassword');
    if (namaInput) {
      namaInput.addEventListener('input', () => clearFieldError('nama'));
    }
    if (usernameInput) {
      usernameInput.addEventListener('input', () => clearFieldError('username'));
      usernameInput.addEventListener('blur', () => {
        usernameInput.value = String(usernameInput.value || '').trim().toLowerCase();
      });
    }
    if (passwordInput) {
      passwordInput.addEventListener('input', () => {
        clearFieldError('password');
        clearFieldError('confirmPassword');
      });
    }
    if (confirmPasswordInput) {
      confirmPasswordInput.addEventListener('input', () => clearFieldError('confirmPassword'));
      confirmPasswordInput.addEventListener('blur', () => {
        const passwordValue = String(passwordInput?.value || '');
        const confirmValue = String(confirmPasswordInput.value || '');
        if (!confirmValue) return;
        if (passwordValue && confirmValue !== passwordValue) {
          setFieldError('confirmPassword', 'Konfirmasi password tidak sama.');
        }
      });
    }

    if (pimpinanSelect) {
      pimpinanSelect.disabled = true;
      pimpinanSelect.addEventListener('change', () => clearFieldError('pimpinan'));
      fetch(PIMPINAN_API)
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok || data.status !== 'success') throw new Error(data.message || 'Gagal memuat pilihan.');
          const options = Array.isArray(data.options) ? data.options : [];
          pimpinanSelect.innerHTML = '';
          if (!options.length) {
            pimpinanSelect.innerHTML = '<option value="">Belum ada pilihan. Hubungi admin.</option>';
            pimpinanSelect.disabled = true;
            setFieldError('pimpinan', 'Pilihan pimpinan belum tersedia.');
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
          clearFieldError('pimpinan');
        })
        .catch(() => {
          pimpinanSelect.innerHTML = '<option value="">Gagal memuat pilihan. Coba lagi.</option>';
          pimpinanSelect.disabled = true;
          setFieldError('pimpinan', 'Gagal memuat pilihan pimpinan.');
          if (pimpinanHint) pimpinanHint.textContent = 'Gagal memuat pilihan pimpinan. Muat ulang halaman.';
        });
    }
  });
})();
