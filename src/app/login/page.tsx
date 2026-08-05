import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login | PC IPM Panawuan',
  description: 'Login ke platform digital PC IPM Panawuan',
};

export default function LoginPage() {
  return (
    <>
      <link rel="stylesheet" href="/app/css/style.css" />
      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/ipm-logo.png" alt="Logo IPM" className="auth-logo" />
            <h1 className="auth-title">PC IPM Panawuan</h1>
            <p className="auth-subtitle">Masuk ke akun kader Anda</p>
          </div>

          <form className="auth-form" id="login-form" noValidate>
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                className="form-control"
                placeholder="Masukkan username"
                autoComplete="username"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  id="password"
                  name="password"
                  className="form-control"
                  placeholder="Masukkan password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  id="toggle-password"
                  className="btn btn-ghost btn-sm"
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', padding: '4px 8px' }}
                  aria-label="Toggle password visibility"
                >
                  <i className="fas fa-eye" id="toggle-password-icon"></i>
                </button>
              </div>
            </div>

            <div id="login-error" className="auth-error" hidden></div>

            <button type="submit" className="btn btn-primary btn-block" id="login-btn">
              <i className="fas fa-sign-in-alt"></i> Masuk
            </button>
          </form>

          <div className="auth-links">
            <p>Belum punya akun? <a href="/register">Daftar sekarang</a></p>
          </div>

          <div className="auth-divider"><span>atau</span></div>

          <button className="btn btn-secondary btn-block" id="webauthn-login-btn" type="button">
            <i className="fas fa-fingerprint"></i> Masuk dengan Biometrik
          </button>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            document.addEventListener('DOMContentLoaded', function() {
              const form = document.getElementById('login-form');
              const btn = document.getElementById('login-btn');
              const errEl = document.getElementById('login-error');
              const toggleBtn = document.getElementById('toggle-password');
              const pwdInput = document.getElementById('password');

              // Toggle password visibility
              toggleBtn?.addEventListener('click', function() {
                const icon = document.getElementById('toggle-password-icon');
                if (pwdInput.type === 'password') {
                  pwdInput.type = 'text';
                  icon.className = 'fas fa-eye-slash';
                } else {
                  pwdInput.type = 'password';
                  icon.className = 'fas fa-eye';
                }
              });

              form?.addEventListener('submit', async function(e) {
                e.preventDefault();
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
                errEl.hidden = true;

                const body = {
                  username: document.getElementById('username').value.trim(),
                  password: document.getElementById('password').value,
                };

                try {
                  const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body),
                  });
                  const data = await res.json();

                  if (data.status === 'success') {
                    localStorage.setItem('ipm_session', data.session);
                    const redirect = new URLSearchParams(location.search).get('redirect');
                    window.location.href = data.role === 'admin'
                      ? (redirect || '/admin')
                      : (redirect || '/');
                  } else {
                    errEl.textContent = data.message || 'Login gagal. Periksa kembali username dan password.';
                    errEl.hidden = false;
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Masuk';
                  }
                } catch(err) {
                  errEl.textContent = 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
                  errEl.hidden = false;
                  btn.disabled = false;
                  btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Masuk';
                }
              });
            });
          `,
        }}
      />
    </>
  );
}
