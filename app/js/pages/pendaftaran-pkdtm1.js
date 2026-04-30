/**
 * Pendaftaran PKDTM1 — 2-Phase Registration
 * Phase 1: Data diri + berkas → Admin verifies
 * Phase 2: Essay upload (only after verification)
 */
(() => {
    'use strict';

    const state = {
        formStep: 1,       // Sub-step within Phase 1 (1=data, 2=upload, 3=review)
        nama: '',
        pimpinan: '',
        files: { sertifikat: null, foto: null, mandat: null, motivasi: null, kta: null },
        essayFile: null,
        uploadedUrls: { sertifikat_url: '', foto_url: '', surat_mandat_url: '', motivasi_url: '', kta_url: '' },
        isSubmitting: false,
        user: null,
        registration: null  // Server data
    };

    // --- Helpers ---
    const $ = id => document.getElementById(id);
    function getSessionToken() {
        return (
            sessionStorage.getItem('ipmquiz_user_session') ||
            localStorage.getItem('ipmquiz_user_session') ||
            sessionStorage.getItem('ipmquiz_admin_session') ||
            localStorage.getItem('ipmquiz_admin_session') ||
            ''
        );
    }
    function getAuthHeaders() {
        const token = String(getSessionToken() || '').trim();
        const h = { 'Content-Type': 'application/json' };
        if (token) h['Authorization'] = `Bearer ${token}`;
        return h;
    }
    async function fetchApi(url, opts = {}) {
        if (!opts.credentials) opts.credentials = 'include';
        if (!opts.headers) opts.headers = {};
        const token = String(getSessionToken() || '').trim();
        if (token && !opts.headers['Authorization']) opts.headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(url, opts);
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);
        return data;
    }
    function toast(msg, type = 'info') { if (window.Toast) window.Toast.show(msg, type); else alert(msg); }
    function escapeHtml(t) { return !t ? '' : String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
    function formatDate(d) {
        if (!d) return '-';
        try { return new Date(d).toLocaleDateString('id-ID',{day:'2-digit',month:'long',year:'numeric',hour:'2-digit',minute:'2-digit'}); }
        catch { return d; }
    }
    function showEl(id) { $(id)?.classList.remove('pk-hidden'); }
    function hideEl(id) { $(id)?.classList.add('pk-hidden'); }

    // --- Init ---
    document.addEventListener('DOMContentLoaded', init);

    async function init() {
        try {
            const data = await fetchApi('/api/auth?action=me', { headers: getAuthHeaders() });
            if (data.status === 'success' && data.user) {
                state.user = data.user;
                const chip = $('pk-auth-chip');
                if (chip) { chip.innerHTML = `<i class="fas fa-circle-check"></i> ${escapeHtml(data.user.username)}`; chip.classList.remove('is-err'); }
                if (data.user.nama_panjang) { state.nama = data.user.nama_panjang; const ni = $('pk-nama'); if (ni) ni.value = data.user.nama_panjang; }
            } else { return showAuthRequired(); }
        } catch { return showAuthRequired(); }

        await loadPimpinanOptions();
        await checkRegistration();
        bindEvents();
    }

    function showAuthRequired() {
        const chip = $('pk-auth-chip');
        if (chip) { chip.innerHTML = '<i class="fas fa-lock"></i> Belum login'; chip.classList.add('is-err'); }
        hideEl('pk-timeline-card');
        hideEl('pk-phase1-content');
        showEl('pk-auth-required');
    }

    async function loadPimpinanOptions() {
        try {
            const data = await fetchApi('/api/auth?action=pimpinanOptions');
            const list = data.options || [];
            const sel = $('pk-pimpinan');
            if (sel && list.length) {
                list.forEach(p => { const o = document.createElement('option'); o.value = p; o.textContent = p; sel.appendChild(o); });
            }
            if (state.user?.pimpinan && sel) {
                // Check if user pimpinan is in the list
                const exists = Array.from(sel.options).some(o => o.value === state.user.pimpinan);
                if (exists) {
                    sel.value = state.user.pimpinan;
                    state.pimpinan = state.user.pimpinan;
                } else if (state.user.pimpinan) {
                    // If not in list, it might be a custom one
                    sel.value = 'Lainnya';
                    const manualInput = $('pk-pimpinan-lainnya');
                    if (manualInput) {
                        manualInput.value = state.user.pimpinan;
                        showEl('pk-pimpinan-lainnya');
                    }
                    state.pimpinan = state.user.pimpinan;
                }
            }
        } catch (e) { console.warn('[PKDTM1] Pimpinan load failed:', e); }
    }

    // ==========================================
    // STATE MACHINE — Determine what to show
    // ==========================================
    async function checkRegistration() {
        try {
            const data = await fetchApi('/api/pkdtm1?action=my-status', { headers: getAuthHeaders() });
            state.registration = data.registration || null;
        } catch (e) { console.warn('[PKDTM1] Status check failed:', e); }
        renderView();
    }

    function renderView() {
        const reg = state.registration;

        // Hide everything first
        hideEl('pk-phase1-content');
        hideEl('pk-view-pending');
        hideEl('pk-view-rejected');
        hideEl('pk-view-essay');
        hideEl('pk-view-complete');

        if (!reg) {
            // No registration → Show Phase 1 form
            setPhaseTimeline('phase1-active');
            showEl('pk-phase1-content');
            goToStep(1);
            return;
        }

        if (reg.status === 'pending') {
            setPhaseTimeline('phase1-waiting');
            showEl('pk-view-pending');
            return;
        }

        if (reg.status === 'rejected') {
            setPhaseTimeline('phase1-rejected');
            showEl('pk-view-rejected');
            if (reg.admin_note) {
                $('pk-reject-note-text').textContent = reg.admin_note;
                showEl('pk-reject-note');
            }
            return;
        }

        if (reg.status === 'verified') {
            if (reg.essay_url) {
                // All done!
                setPhaseTimeline('complete');
                showEl('pk-view-complete');
            } else {
                // Phase 2: Essay upload
                setPhaseTimeline('phase2-active');
                showEl('pk-view-essay');
            }
            return;
        }
    }

    // ==========================================
    // PHASE TIMELINE — Visual state management
    // ==========================================
    function setPhaseTimeline(mode) {
        const p1 = $('pk-phase-1');
        const p2 = $('pk-phase-2');
        const conn = $('pk-connector');
        if (!p1 || !p2 || !conn) return;

        // Reset
        [p1, p2].forEach(el => el.className = 'pk-phase');
        conn.className = 'pk-phase-connector';

        const p2num = p2.querySelector('.pk-phase-num');

        switch (mode) {
            case 'phase1-active':
                p1.classList.add('active');
                p2.classList.add('locked');
                p2num.innerHTML = '<i class="fas fa-lock" style="font-size:0.7rem"></i>';
                break;
            case 'phase1-waiting':
                p1.classList.add('waiting');
                p2.classList.add('locked');
                p1.querySelector('.pk-phase-num').innerHTML = '<i class="fas fa-clock" style="font-size:0.75rem"></i>';
                p1.querySelector('.pk-phase-sub').textContent = 'Menunggu verifikasi';
                p2num.innerHTML = '<i class="fas fa-lock" style="font-size:0.7rem"></i>';
                break;
            case 'phase1-rejected':
                p1.classList.add('rejected');
                p2.classList.add('locked');
                p1.querySelector('.pk-phase-num').innerHTML = '<i class="fas fa-times" style="font-size:0.75rem"></i>';
                p1.querySelector('.pk-phase-sub').textContent = 'Ditolak';
                p2num.innerHTML = '<i class="fas fa-lock" style="font-size:0.7rem"></i>';
                break;
            case 'phase2-active':
                p1.classList.add('done');
                p1.querySelector('.pk-phase-num').innerHTML = '<i class="fas fa-check" style="font-size:0.75rem"></i>';
                p1.querySelector('.pk-phase-sub').textContent = 'Lolos ✓';
                conn.classList.add('done');
                p2.classList.add('active');
                p2num.textContent = '2';
                break;
            case 'complete':
                p1.classList.add('done');
                p1.querySelector('.pk-phase-num').innerHTML = '<i class="fas fa-check" style="font-size:0.75rem"></i>';
                p1.querySelector('.pk-phase-sub').textContent = 'Lolos ✓';
                conn.classList.add('done');
                p2.classList.add('done');
                p2num.innerHTML = '<i class="fas fa-check" style="font-size:0.75rem"></i>';
                p2.querySelector('.pk-phase-sub').textContent = 'Selesai ✓';
                break;
        }
    }

    // ==========================================
    // PHASE 1: Multi-step form
    // ==========================================
    function goToStep(step) {
        state.formStep = step;
        [1, 2, 3].forEach(s => {
            const el = $(`pk-step-${s}`);
            if (el) el.classList.toggle('pk-hidden', s !== step);
        });
        if (step === 3) buildReview();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function bindEvents() {
        // Phase 1 navigation
        $('pk-next-1')?.addEventListener('click', () => {
            const nama = $('pk-nama')?.value.trim();
            const selPimpinan = $('pk-pimpinan')?.value;
            const manualPimpinan = $('pk-pimpinan-lainnya')?.value.trim();

            if (!nama) { toast('Nama wajib diisi', 'error'); $('pk-nama')?.focus(); return; }
            if (!selPimpinan) { toast('Pilih asal pimpinan', 'error'); $('pk-pimpinan')?.focus(); return; }

            let pimpinanValue = selPimpinan;
            if (selPimpinan === 'Lainnya') {
                if (!manualPimpinan) { toast('Tulis nama pimpinan Anda', 'error'); $('pk-pimpinan-lainnya')?.focus(); return; }
                pimpinanValue = manualPimpinan;
            }

            state.nama = nama;
            state.pimpinan = pimpinanValue;
            goToStep(2);
        });

        // Pimpinan "Lainnya" toggle
        $('pk-pimpinan')?.addEventListener('change', (e) => {
            if (e.target.value === 'Lainnya') {
                showEl('pk-pimpinan-lainnya');
                $('pk-pimpinan-lainnya')?.focus();
            } else {
                hideEl('pk-pimpinan-lainnya');
            }
        });
        $('pk-next-2')?.addEventListener('click', () => {
            if (!state.files.sertifikat) { toast('Sertifikat wajib diupload', 'error'); return; }
            if (!state.files.foto) { toast('Foto wajib diupload', 'error'); return; }
            if (!state.files.mandat) { toast('Surat Mandat wajib diupload', 'error'); return; }
            if (!state.files.motivasi) { toast('Surat Motivasi wajib diupload', 'error'); return; }
            goToStep(3);
        });
        $('pk-prev-2')?.addEventListener('click', () => goToStep(1));
        $('pk-prev-3')?.addEventListener('click', () => goToStep(2));
        $('pk-submit')?.addEventListener('click', handleSubmitPhase1);

        // Upload zones Phase 1
        ['sertifikat', 'foto', 'mandat', 'motivasi', 'kta'].forEach(setupUploadZone);

        // Re-register
        $('pk-re-register')?.addEventListener('click', () => {
            state.registration = null;
            hideEl('pk-view-rejected');
            showEl('pk-phase1-content');
            setPhaseTimeline('phase1-active');
            goToStep(1);
        });

        // Phase 2: Essay
        setupEssayUpload();
        $('pk-submit-essay')?.addEventListener('click', handleSubmitEssay);
    }

    // --- Upload Zone Setup ---
    function setupUploadZone(fieldName) {
        const zone = $(`pk-zone-${fieldName}`);
        const input = $(`pk-file-${fieldName}`);
        if (!zone || !input) return;
        zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('is-dragover'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('is-dragover'));
        zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('is-dragover'); if (e.dataTransfer?.files?.[0]) handleFileSelect(fieldName, e.dataTransfer.files[0], zone); });
        input.addEventListener('change', () => { if (input.files?.[0]) handleFileSelect(fieldName, input.files[0], zone); });
    }

    function handleFileSelect(fieldName, file, zone) {
        if (file.size > 5 * 1024 * 1024) { toast('File terlalu besar (maks 5MB)', 'error'); return; }
        const allowedTypes = {
            sertifikat: ['image/jpeg','image/png','image/webp','application/pdf'],
            foto: ['image/jpeg','image/png','image/webp'],
            motivasi: ['application/pdf'],
            kta: ['image/jpeg','image/png','image/webp','application/pdf']
        };
        if (allowedTypes[fieldName] && !allowedTypes[fieldName].includes(file.type)) {
            toast('Format file tidak didukung', 'error'); return;
        }
        state.files[fieldName] = file;
        zone.classList.add('has-file');
        const textEl = zone.querySelector('.pk-upload-text');
        const iconEl = zone.querySelector('.pk-upload-icon i');
        if (textEl) {
            const isImg = file.type.startsWith('image/');
            const oldPrev = zone.querySelector('.pk-upload-preview');
            if (oldPrev?.src?.startsWith('blob:')) URL.revokeObjectURL(oldPrev.src);
            let preview = '';
            if (isImg) { const u = URL.createObjectURL(file); preview = `<img src="${u}" alt="Preview" class="pk-upload-preview" style="margin-top:6px;">`; }
            textEl.innerHTML = `<div class="pk-upload-filename"><i class="fas fa-check-circle"></i> ${escapeHtml(file.name)}</div><span>${(file.size/1024).toFixed(1)} KB</span>${preview}<button type="button" class="pk-upload-remove" data-field="${fieldName}">Hapus</button>`;
            textEl.querySelector('.pk-upload-remove')?.addEventListener('click', e => { e.stopPropagation(); removeFile(fieldName, zone); });
        }
        if (iconEl) iconEl.className = 'fas fa-check';
    }

    function removeFile(fieldName, zone) {
        const oldPrev = zone.querySelector('.pk-upload-preview');
        if (oldPrev?.src?.startsWith('blob:')) URL.revokeObjectURL(oldPrev.src);
        state.files[fieldName] = null;
        zone.classList.remove('has-file');
        const input = $(`pk-file-${fieldName}`);
        if (input) input.value = '';
        const icons = { sertifikat:'fa-file-certificate', foto:'fa-camera', motivasi:'fa-file-pdf', kta:'fa-id-card' };
        const hints = { sertifikat:'JPG, PNG, atau PDF — maks 5MB', foto:'JPG atau PNG — maks 5MB', motivasi:'PDF — maks 5MB', kta:'JPG, PNG, atau PDF — maks 5MB' };
        const textEl = zone.querySelector('.pk-upload-text');
        if (textEl) textEl.innerHTML = `<strong>Klik atau seret file ke sini</strong><span>${hints[fieldName]||'maks 5MB'}</span>`;
        const iconEl = zone.querySelector('.pk-upload-icon i');
        if (iconEl) iconEl.className = `fas ${icons[fieldName]||'fa-upload'}`;
    }

    // --- Review ---
    function buildReview() {
        const grid = $('pk-review-grid');
        if (!grid) return;
        const items = [
            { l: 'Nama Lengkap', v: state.nama },
            { l: 'Asal Pimpinan', v: state.pimpinan },
            { l: 'Sertifikat', v: state.files.sertifikat?.name, f: true },
            { l: 'Foto', v: state.files.foto?.name, f: true },
            { l: 'Surat Mandat', v: state.files.mandat?.name, f: true },
            { l: 'Surat Motivasi', v: state.files.motivasi?.name, f: true },
            { l: 'KTA', v: state.files.kta?.name, f: true, opt: true },
        ];
        grid.innerHTML = items.map(i => {
            let cls = 'pk-review-value', content = escapeHtml(i.v || '');
            if (i.f && i.v) { cls += ' is-file'; content = `<i class="fas fa-check-circle"></i> ${escapeHtml(i.v)}`; }
            else if (i.f && !i.v) { cls += ' is-missing'; content = i.opt ? 'Tidak diunggah' : 'Belum diunggah'; }
            return `<div class="pk-review-item"><span class="pk-review-label">${escapeHtml(i.l)}</span><span class="${cls}">${content}</span></div>`;
        }).join('');
    }

    // --- Submit Phase 1 ---
    async function handleSubmitPhase1() {
        if (state.isSubmitting) return;
        state.isSubmitting = true;
        const submitBtn = $('pk-submit'), prevBtn = $('pk-prev-3');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.classList.add('is-loading'); }
        if (prevBtn) prevBtn.disabled = true;
        const progress = $('pk-upload-progress'), fill = $('pk-progress-fill'), title = $('pk-progress-title'), meta = $('pk-progress-meta');
        if (progress) progress.classList.add('active');

        try {
            const toUpload = [
                { key: 'sertifikat', urlKey: 'sertifikat_url', file: state.files.sertifikat, label: 'Sertifikat' },
                { key: 'foto', urlKey: 'foto_url', file: state.files.foto, label: 'Foto' },
                { key: 'mandat', urlKey: 'surat_mandat_url', file: state.files.mandat, label: 'Surat Mandat' },
                { key: 'motivasi', urlKey: 'motivasi_url', file: state.files.motivasi, label: 'Motivasi' },
            ];
            if (state.files.kta) toUpload.push({ key: 'kta', urlKey: 'kta_url', file: state.files.kta, label: 'KTA' });
            const total = toUpload.length;

            for (let i = 0; i < toUpload.length; i++) {
                const item = toUpload[i];
                if (fill) fill.style.width = `${Math.round((i/total)*100)}%`;
                if (title) title.textContent = `Mengupload ${item.label}...`;
                if (meta) meta.textContent = `${i+1} dari ${total} berkas`;
                
                let fileToUpload = item.file;
                // Compress images to avoid 413 Payload Too Large if fallback to base64 occurs
                if (['foto', 'sertifikat'].includes(item.key) && item.file.type.startsWith('image/')) {
                    try {
                        fileToUpload = await compressImage(item.file, 1200, 0.7);
                        console.log(`[PKDTM1] Compressed ${item.label}: ${item.file.size} -> ${fileToUpload.size}`);
                    } catch (e) { console.warn(`[PKDTM1] Compression failed for ${item.label}:`, e); }
                }

                state.uploadedUrls[item.urlKey] = await uploadFile(fileToUpload);
            }

            if (fill) fill.style.width = '100%';
            if (title) title.textContent = 'Mengirim pendaftaran...';

            await fetchApi('/api/pkdtm1?action=submit', {
                method: 'POST', headers: getAuthHeaders(),
                body: JSON.stringify({
                    nama: state.nama, asal_pimpinan: state.pimpinan,
                    sertifikat_url: state.uploadedUrls.sertifikat_url,
                    foto_url: state.uploadedUrls.foto_url,
                    surat_mandat_url: state.uploadedUrls.surat_mandat_url,
                    motivasi_url: state.uploadedUrls.motivasi_url,
                    kta_url: state.uploadedUrls.kta_url || ''
                })
            });
            toast('Pendaftaran berhasil dikirim!', 'success');
            setTimeout(() => window.location.reload(), 800);
        } catch (err) {
            console.error('[PKDTM1] Submit Error:', err);
            let errMsg = err.message || 'Gagal mengirim pendaftaran';
            if (errMsg.includes('413') || (err.status === 413)) {
                errMsg = 'Ukuran file terlalu besar untuk diproses server tanpa Blob Storage. Silakan hubungi admin untuk konfigurasi BLOB_READ_WRITE_TOKEN.';
            }
            toast(errMsg, 'error');
            if (submitBtn) { submitBtn.disabled = false; submitBtn.classList.remove('is-loading'); }
            if (prevBtn) prevBtn.disabled = false;
            if (progress) progress.classList.remove('active');
            state.isSubmitting = false;
        }
    }

    // ==========================================
    // PHASE 2: Essay Upload
    // ==========================================
    function setupEssayUpload() {
        const zone = $('pk-zone-essay');
        const input = $('pk-file-essay');
        const submitBtn = $('pk-submit-essay');
        if (!zone || !input) return;

        zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('is-dragover'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('is-dragover'));
        zone.addEventListener('drop', e => {
            e.preventDefault(); zone.classList.remove('is-dragover');
            if (e.dataTransfer?.files?.[0]) handleEssaySelect(e.dataTransfer.files[0], zone);
        });
        input.addEventListener('change', () => { if (input.files?.[0]) handleEssaySelect(input.files[0], zone); });
    }

    function handleEssaySelect(file, zone) {
        if (file.size > 5 * 1024 * 1024) { toast('File terlalu besar (maks 5MB)', 'error'); return; }
        const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowed.includes(file.type)) { toast('File essay harus berupa PDF, DOC, atau DOCX', 'error'); return; }

        state.essayFile = file;
        zone.classList.add('has-file');
        const textEl = zone.querySelector('.pk-upload-text');
        const iconEl = zone.querySelector('.pk-upload-icon i');
        if (textEl) {
            textEl.innerHTML = `<div class="pk-upload-filename"><i class="fas fa-check-circle"></i> ${escapeHtml(file.name)}</div><span>${(file.size/1024).toFixed(1)} KB</span><button type="button" class="pk-upload-remove" id="pk-remove-essay">Hapus</button>`;
            $('pk-remove-essay')?.addEventListener('click', e => {
                e.stopPropagation();
                state.essayFile = null;
                zone.classList.remove('has-file');
                $('pk-file-essay').value = '';
                textEl.innerHTML = '<strong>Klik atau seret file essay ke sini</strong><span>PDF, DOC, atau DOCX — maks 5MB</span>';
                if (iconEl) iconEl.className = 'fas fa-pen-fancy';
                $('pk-submit-essay').disabled = true;
            });
        }
        if (iconEl) iconEl.className = 'fas fa-check';
        $('pk-submit-essay').disabled = false;
    }

    async function handleSubmitEssay() {
        if (state.isSubmitting || !state.essayFile) return;
        state.isSubmitting = true;
        const btn = $('pk-submit-essay');
        if (btn) { btn.disabled = true; btn.classList.add('is-loading'); }

        const progress = $('pk-essay-progress');
        const fill = $('pk-essay-progress-fill');
        const title = $('pk-essay-progress-title');
        if (progress) progress.classList.add('active');
        if (fill) fill.style.width = '30%';
        if (title) title.textContent = 'Mengupload essay...';

        try {
            const essayUrl = await uploadFile(state.essayFile);
            if (fill) fill.style.width = '80%';
            if (title) title.textContent = 'Menyimpan...';

            await fetchApi('/api/pkdtm1?action=submit-essay', {
                method: 'POST', headers: getAuthHeaders(),
                body: JSON.stringify({ essay_url: essayUrl })
            });

            if (fill) fill.style.width = '100%';
            toast('Essay berhasil disubmit!', 'success');
            setTimeout(() => window.location.reload(), 800);
        } catch (err) {
            toast(err.message || 'Gagal submit essay', 'error');
            if (btn) { btn.disabled = false; btn.classList.remove('is-loading'); }
            if (progress) progress.classList.remove('active');
            state.isSubmitting = false;
        }
    }

    // --- File Upload Helper ---
    async function uploadFile(file) {
        const token = getSessionToken();
        const headers = {
            'Content-Type': file.type || 'application/octet-stream',
            'x-upload-scope': 'pkdtm1-registration',
            'x-filename': file.name
        };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch('/api/upload', { method: 'POST', headers, body: file, credentials: 'include' });
        const data = await res.json();
        if (!res.ok || data.status !== 'success') throw new Error(data.message || 'Upload gagal');
        return data.url;
    }

    async function compressImage(file, maxWidth, quality) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = e => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width, height = img.height;
                    if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    canvas.toBlob(blob => {
                        if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                        else reject(new Error('Canvas toBlob failed'));
                    }, 'image/jpeg', quality);
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    }
})();
