# Cara Login dan Setup Admin

## 1. Login Admin
Untuk masuk ke dashboard admin:
1.  Buka halaman **`/admin/admin.html`**.
2.  Masukkan Username dan Password dari akun yang memiliki hak akses **Admin**.
3.  Klik tombol "Masuk".

> **Catatan:** Sistem login admin menggunakan database yang sama dengan user biasa. Bedanya, akun admin memiliki `role='admin'`.

## 2. Membuat Admin Pertama
Jika sistem masih baru dan belum ada admin sama sekali, Anda tidak bisa login. Anda harus mempromosikan satu akun user menjadi admin.

### Cara Otomatis (UI)
1.  Pastikan Anda sudah mendaftar akun biasa melalui halaman `/register.html`.
2.  Buka halaman **`/admin/setup.html`**.
3.  Masukkan username dan password akun yang baru Anda buat.
4.  Klik "Jadikan Admin".
5.  Jika berhasil, Anda akan diarahkan ke halaman login admin.

> **Penting:** Fitur ini hanya berfungsi jika **belum ada admin sama sekali** di database. Jika sudah ada minimal satu admin, fitur ini akan ditolak demi keamanan.

### Cara Manual (Database)
Jika Anda memiliki akses langsung ke database (misal via Vercel Dashboard atau psql), Anda bisa menjalankan query berikut:

```sql
UPDATE users SET role = 'admin' WHERE username = 'username_anda';
```

## 3. Menambah Admin Baru (Jika sudah login)
Jika Anda sudah login sebagai admin, Anda bisa menambahkan admin baru melalui menu **Manajemen User**:
1.  Masuk ke Dashboard Admin.
2.  Buka tab "Manajemen User".
3.  Klik "Tambah User".
4.  Isi data dan pilih Role: **Admin**.
5.  Atau, edit user yang sudah ada dan ubah Role-nya menjadi Admin.
