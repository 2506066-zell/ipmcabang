const { query } = require('./_db');
const { getSessionUser, requireAdminAuth } = require('./_auth');
const { json, applySecurityHeaders } = require('./_util');
const { ensureSchema } = require('./_bootstrap');

const VALID_STATUSES = new Set(['pending', 'verified', 'rejected']);

let schemaReady = false;
async function ensureReady() {
  if (!schemaReady) {
    await ensureSchema();
    schemaReady = true;
  }
}

function isValidFileUrl(url) {
  if (!url) return false;
  // Accept Vercel Blob URLs, data URIs (base64 fallback), and common CDN patterns
  return url.startsWith('https://') || url.startsWith('data:');
}

module.exports = async (req, res) => {
  applySecurityHeaders(res);
  await ensureReady();
  const q = req.query || {};
  const action = String(q.action || '').trim().toLowerCase();

  try {
    // --- Public/User actions ---
    if (action === 'submit' && req.method === 'POST') {
      return await handleSubmit(req, res);
    }
    if (action === 'my-status' && req.method === 'GET') {
      return await handleMyStatus(req, res);
    }
    if (action === 'submit-essay' && req.method === 'POST') {
      return await handleSubmitEssay(req, res);
    }

    // --- Admin actions ---
    if (action === 'admin-list' && req.method === 'GET') {
      return await handleAdminList(req, res);
    }
    if (action === 'admin-update' && (req.method === 'POST' || req.method === 'PUT')) {
      return await handleAdminUpdate(req, res);
    }
    if (action === 'admin-delete' && req.method === 'DELETE') {
      return await handleAdminDelete(req, res);
    }
    if (action === 'admin-stats' && req.method === 'GET') {
      return await handleAdminStats(req, res);
    }

    return json(res, 400, { status: 'error', message: `Unknown action: ${action}` });
  } catch (err) {
    console.error('[PKDTM1] Error:', err);
    return json(res, 500, { status: 'error', message: String(err.message || 'Internal server error') });
  }
};

// --- Submit Registration ---
async function handleSubmit(req, res) {
  const user = await getSessionUser(req);
  if (!user) return json(res, 401, { status: 'error', message: 'Unauthorized' });

  let body;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    return json(res, 400, { status: 'error', message: 'Invalid JSON body' });
  }

  const nama = String(body.nama || '').trim();
  const asal_pimpinan = String(body.asal_pimpinan || '').trim();
  const sertifikat_url = String(body.sertifikat_url || '').trim();
  const foto_url = String(body.foto_url || '').trim();
  const motivasi_url = String(body.motivasi_url || '').trim();
  const kta_url = String(body.kta_url || '').trim() || null;
  const surat_mandat_url = String(body.surat_mandat_url || '').trim();

  // Validation
  if (!nama) return json(res, 400, { status: 'error', message: 'Nama wajib diisi' });
  if (nama.length > 200) return json(res, 400, { status: 'error', message: 'Nama terlalu panjang (maks 200 karakter)' });
  if (!asal_pimpinan) return json(res, 400, { status: 'error', message: 'Asal Pimpinan wajib diisi' });
  if (!sertifikat_url) return json(res, 400, { status: 'error', message: 'Sertifikat wajib diupload' });
  if (!foto_url) return json(res, 400, { status: 'error', message: 'Foto wajib diupload' });
  if (!motivasi_url) return json(res, 400, { status: 'error', message: 'Motivasi (PDF) wajib diupload' });
  if (!surat_mandat_url) return json(res, 400, { status: 'error', message: 'Surat Mandat wajib diupload' });

  // Validate URL format
  if (!isValidFileUrl(sertifikat_url)) return json(res, 400, { status: 'error', message: 'URL sertifikat tidak valid' });
  if (!isValidFileUrl(foto_url)) return json(res, 400, { status: 'error', message: 'URL foto tidak valid' });
  if (!isValidFileUrl(motivasi_url)) return json(res, 400, { status: 'error', message: 'URL motivasi tidak valid' });
  if (!isValidFileUrl(surat_mandat_url)) return json(res, 400, { status: 'error', message: 'URL surat mandat tidak valid' });
  if (kta_url && !isValidFileUrl(kta_url)) return json(res, 400, { status: 'error', message: 'URL KTA tidak valid' });

  // Check if already registered
  const existing = (await query`SELECT id, status FROM registrations_pkdtm1 WHERE user_id = ${user.id}`).rows[0];
  if (existing) {
    if (existing.status === 'rejected') {
      // Allow re-registration if previously rejected
      await query`UPDATE registrations_pkdtm1 SET
        nama = ${nama},
        asal_pimpinan = ${asal_pimpinan},
        sertifikat_url = ${sertifikat_url},
        foto_url = ${foto_url},
        motivasi_url = ${motivasi_url},
        kta_url = ${kta_url},
        surat_mandat_url = ${surat_mandat_url},
        status = 'pending',
        admin_note = NULL,
        reviewed_by = NULL,
        reviewed_at = NULL,
        updated_at = NOW()
      WHERE id = ${existing.id}`;
      return json(res, 200, { status: 'success', message: 'Pendaftaran berhasil diperbarui' });
    }
    return json(res, 409, { status: 'error', message: 'Anda sudah terdaftar pada PKDTM1' });
  }

  await query`INSERT INTO registrations_pkdtm1 (user_id, nama, asal_pimpinan, sertifikat_url, foto_url, motivasi_url, kta_url, surat_mandat_url)
    VALUES (${user.id}, ${nama}, ${asal_pimpinan}, ${sertifikat_url}, ${foto_url}, ${motivasi_url}, ${kta_url}, ${surat_mandat_url})`;

  return json(res, 201, { status: 'success', message: 'Pendaftaran PKDTM1 berhasil dikirim!' });
}

// --- My Status ---
async function handleMyStatus(req, res) {
  const user = await getSessionUser(req);
  if (!user) return json(res, 401, { status: 'error', message: 'Unauthorized' });

  const row = (await query`SELECT id, nama, asal_pimpinan, sertifikat_url, foto_url, motivasi_url, kta_url, surat_mandat_url, essay_url, essay_submitted_at, status, admin_note, created_at, updated_at
    FROM registrations_pkdtm1 WHERE user_id = ${user.id}`).rows[0];

  return json(res, 200, { status: 'success', registration: row || null });
}

// --- Submit Essay ---
async function handleSubmitEssay(req, res) {
  const user = await getSessionUser(req);
  if (!user) return json(res, 401, { status: 'error', message: 'Unauthorized' });

  // Check existing registration
  const existing = (await query`SELECT id, status, essay_url FROM registrations_pkdtm1 WHERE user_id = ${user.id}`).rows[0];
  if (!existing) return json(res, 404, { status: 'error', message: 'Anda belum terdaftar pada PKDTM1' });
  if (existing.status !== 'verified') return json(res, 403, { status: 'error', message: 'Anda harus lolos verifikasi terlebih dahulu untuk submit essay' });

  let body;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    return json(res, 400, { status: 'error', message: 'Invalid JSON body' });
  }

  const essay_url = String(body.essay_url || '').trim();
  if (!essay_url) return json(res, 400, { status: 'error', message: 'File essay wajib diupload' });
  if (!isValidFileUrl(essay_url)) return json(res, 400, { status: 'error', message: 'URL essay tidak valid' });

  await query`UPDATE registrations_pkdtm1 SET
    essay_url = ${essay_url},
    essay_submitted_at = NOW(),
    updated_at = NOW()
  WHERE id = ${existing.id}`;

  return json(res, 200, { status: 'success', message: 'Essay berhasil disubmit!' });
}

// --- Admin List ---
async function handleAdminList(req, res) {
  const admin = await requireAdminAuth(req);
  const q = req.query || {};
  const statusFilter = String(q.status || 'all').trim().toLowerCase();
  const search = String(q.search || '').trim();
  const page = Math.max(1, Number(q.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(q.limit) || 25));
  const offset = (page - 1) * limit;

  let countQuery, dataQuery;

  if (statusFilter !== 'all' && VALID_STATUSES.has(statusFilter)) {
    if (search) {
      countQuery = await query`SELECT COUNT(*)::int AS c FROM registrations_pkdtm1 r WHERE r.status = ${statusFilter} AND (r.nama ILIKE ${'%' + search + '%'} OR r.asal_pimpinan ILIKE ${'%' + search + '%'})`;
      dataQuery = await query`SELECT r.*, u.username FROM registrations_pkdtm1 r JOIN users u ON u.id = r.user_id WHERE r.status = ${statusFilter} AND (r.nama ILIKE ${'%' + search + '%'} OR r.asal_pimpinan ILIKE ${'%' + search + '%'}) ORDER BY r.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    } else {
      countQuery = await query`SELECT COUNT(*)::int AS c FROM registrations_pkdtm1 r WHERE r.status = ${statusFilter}`;
      dataQuery = await query`SELECT r.*, u.username FROM registrations_pkdtm1 r JOIN users u ON u.id = r.user_id WHERE r.status = ${statusFilter} ORDER BY r.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    }
  } else {
    if (search) {
      countQuery = await query`SELECT COUNT(*)::int AS c FROM registrations_pkdtm1 r WHERE r.nama ILIKE ${'%' + search + '%'} OR r.asal_pimpinan ILIKE ${'%' + search + '%'}`;
      dataQuery = await query`SELECT r.*, u.username FROM registrations_pkdtm1 r JOIN users u ON u.id = r.user_id WHERE r.nama ILIKE ${'%' + search + '%'} OR r.asal_pimpinan ILIKE ${'%' + search + '%'} ORDER BY r.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    } else {
      countQuery = await query`SELECT COUNT(*)::int AS c FROM registrations_pkdtm1`;
      dataQuery = await query`SELECT r.*, u.username FROM registrations_pkdtm1 r JOIN users u ON u.id = r.user_id ORDER BY r.created_at DESC LIMIT ${limit} OFFSET ${offset}`;
    }
  }

  const total = countQuery.rows[0]?.c || 0;

  return json(res, 200, {
    status: 'success',
    registrations: dataQuery.rows,
    total,
    page,
    totalPages: Math.ceil(total / limit)
  });
}

// --- Admin Update ---
async function handleAdminUpdate(req, res) {
  const admin = await requireAdminAuth(req);

  let body;
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    body = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    return json(res, 400, { status: 'error', message: 'Invalid JSON body' });
  }

  const id = Number(body.id);
  const newStatus = String(body.status || '').trim().toLowerCase();
  const adminNote = String(body.admin_note || '').trim() || null;

  if (!id || !VALID_STATUSES.has(newStatus)) {
    return json(res, 400, { status: 'error', message: 'ID dan status (pending/verified/rejected) diperlukan' });
  }

  const existing = (await query`SELECT id FROM registrations_pkdtm1 WHERE id = ${id}`).rows[0];
  if (!existing) return json(res, 404, { status: 'error', message: 'Registrasi tidak ditemukan' });

  await query`UPDATE registrations_pkdtm1 SET
    status = ${newStatus},
    admin_note = ${adminNote},
    reviewed_by = ${admin.id},
    reviewed_at = NOW(),
    updated_at = NOW()
  WHERE id = ${id}`;

  // Log the activity for audit trail
  await query`INSERT INTO activity_logs (admin_id, action, details) 
              VALUES (${admin.id}, ${'PKDTM1_STATUS_UPDATE'}, ${JSON.stringify({ registration_id: id, new_status: newStatus, note: adminNote })})`;

  // Trigger notification for the user
  try {
    const regData = (await query`SELECT user_id, nama FROM registrations_pkdtm1 WHERE id = ${id}`).rows[0];
    if (regData) {
      let notifTitle = 'Update Pendaftaran PKDTM1';
      let notifMsg = `Halo ${regData.nama}, pendaftaran Anda sekarang berstatus: ${newStatus.toUpperCase()}.`;
      let notifType = 'info';
      
      if (newStatus === 'verified') {
        notifTitle = 'Pendaftaran Lolos Verifikasi! 🎉';
        notifMsg = `Selamat ${regData.nama}! Anda lolos verifikasi tahap 1. Silakan lanjut ke Tahap 2 (Essay) sekarang.`;
        notifType = 'success';
      } else if (newStatus === 'rejected') {
        notifTitle = 'Pendaftaran Perlu Perbaikan ⚠️';
        notifMsg = `Maaf ${regData.nama}, pendaftaran Anda ditolak. Catatan admin: ${adminNote || 'Periksa kelengkapan berkas'}.`;
        notifType = 'warning';
      }

      await query`INSERT INTO notifications (user_id, title, message, type, action_url) 
                  VALUES (${regData.user_id}, ${notifTitle}, ${notifMsg}, ${notifType}, '/pendaftaran-pkdtm1.html')`;
      
      // Push notification (Web Push API)
      const { sendToUser } = require('./_push');
      sendToUser(regData.user_id, {
          title: notifTitle,
          body: notifMsg,
          url: '/pendaftaran-pkdtm1.html',
          image: '/app/media/notifications/reminder-forms.png'
      }).catch(() => {});
    }
  } catch (e) { console.error('[PKDTM1] Notification trigger failed:', e); }

  return json(res, 200, { status: 'success', message: `Status berhasil diubah ke ${newStatus}` });
}

// --- Admin Delete ---
async function handleAdminDelete(req, res) {
  const admin = await requireAdminAuth(req);
  const id = Number(req.query?.id);
  if (!id) return json(res, 400, { status: 'error', message: 'ID diperlukan' });

  const existing = (await query`SELECT id FROM registrations_pkdtm1 WHERE id = ${id}`).rows[0];
  if (!existing) return json(res, 404, { status: 'error', message: 'Registrasi tidak ditemukan' });

  await query`DELETE FROM registrations_pkdtm1 WHERE id = ${id}`;
  return json(res, 200, { status: 'success', message: 'Registrasi berhasil dihapus' });
}

// --- Admin Stats ---
async function handleAdminStats(req, res) {
  await requireAdminAuth(req);
  const stats = (await query`SELECT
    COUNT(*)::int AS total,
    COUNT(*) FILTER (WHERE status = 'pending')::int AS pending,
    COUNT(*) FILTER (WHERE status = 'verified')::int AS verified,
    COUNT(*) FILTER (WHERE status = 'rejected')::int AS rejected
  FROM registrations_pkdtm1`).rows[0];

  return json(res, 200, { status: 'success', stats });
}
