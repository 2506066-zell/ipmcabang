import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Register | PC IPM Panawuan',
  description: 'Daftar akun kader PC IPM Panawuan',
};

export default function RegisterPage() {
  return (
    <>
      <link rel="stylesheet" href="/app/css/style.css" />
      
    <div className="login-screen">
        <div className="login-card">
            <div className="login-header">
                <img />
                <h1>Buat Akun Baru</h1>
                <p>Isi data dengan benar agar akun langsung bisa dipakai login.</p>
            </div>
            <form id="register-form" noValidate>
                <div className="input-group">
                    <label htmlFor="namaPanjang">Nama Panjang</label>
                    <input />
                    <small id="nama-field-error" className="field-error" role="status" aria-live="polite" hidden></small>
                </div>
                <div className="input-group">
                    <label htmlFor="pimpinan">Asal Pimpinan</label>
                    <select id="pimpinan" name="pimpinan" required aria-describedby="pimpinan-hint pimpinan-field-error">
                        <option value="">Memuat pilihan...</option>
                    </select>
                    <small id="pimpinan-hint" className="input-hint">Pilih asal pimpinan sesuai daftar.</small>
                    <small id="pimpinan-field-error" className="field-error" role="status" aria-live="polite" hidden></small>
                </div>
                <div className="input-group">
                    <label htmlFor="username">Username</label>
                    <input />
                    <small id="username-hint" className="input-hint">Gunakan 3-30 karakter: huruf, angka, titik, garis bawah, atau strip.</small>
                    <small id="username-field-error" className="field-error" role="status" aria-live="polite" hidden></small>
                </div>
                <div className="input-group">
                    <label htmlFor="password">Password</label>
                    <div className="password-wrapper">
                        <input />
                        <button type="button" id="toggle-password" className="password-toggle" aria-label="Tampilkan password" aria-pressed="false" aria-controls="password"><i className="fas fa-eye"></i></button>
                    </div>
                    <small id="password-hint" className="input-hint">Minimal 6 karakter.</small>
                    <small id="password-field-error" className="field-error" role="status" aria-live="polite" hidden></small>
                </div>
                <div className="input-group">
                    <label htmlFor="confirmPassword">Konfirmasi Password</label>
                    <div className="password-wrapper">
                        <input />
                        <button type="button" id="toggle-confirm-password" className="password-toggle" aria-label="Tampilkan password konfirmasi" aria-pressed="false" aria-controls="confirmPassword"><i className="fas fa-eye"></i></button>
                    </div>
                    <small id="confirm-password-field-error" className="field-error" role="status" aria-live="polite" hidden></small>
                </div>
                <button type="submit" className="btn-login" id="register-submit-btn">Daftar Akun</button>
                <p id="message" className="form-message" role="alert" aria-live="polite" hidden></p>
            </form>
            <div className="register-link">
                <p>Sudah punya akun? <a href="login.html">Login di sini</a></p>
            </div>
        </div>
    </div>
    
      <script src="/app/js/core/register.js" defer></script>
    </>
  );
}