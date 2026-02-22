(function initArticleEditor() {
    'use strict';

    const SESSION_KEY = 'ipmquiz_admin_session';
    const DRAFT_KEY = 'ipmquiz_editor_draft';
    const MIN_WORD_COUNT = 120;
    const DEBOUNCE_MS = 250;
    const DOMAIN_WEIGHTS = {
        structure: 45,
        readability: 35,
        seo: 20
    };

    const ARTICLE_TEMPLATES = {
        lead_news: `
            <p>Tulis ringkasan berita utama dalam 2-3 kalimat. Jelaskan siapa, apa, kapan, dan dampaknya.</p>
            <h2>Konteks Utama</h2>
            <p>Jelaskan latar belakang isu atau kegiatan secara ringkas.</p>
            <h2>Fakta Lapangan</h2>
            <p>Masukkan data, kutipan, atau temuan utama agar pembaca mendapat gambaran nyata.</p>
            <h3>Detail Penting</h3>
            <p>Tambahkan detail pendukung yang relevan.</p>
            <h2>Penutup</h2>
            <p>Tutup dengan kesimpulan singkat dan ajakan tindak lanjut bila diperlukan.</p>
        `,
        opinion: `
            <p>Tulis pembuka opini: posisi pendapatmu dan alasan paling kuat dalam 2-3 kalimat.</p>
            <h2>Argumen Inti</h2>
            <p>Jelaskan argumen utama secara jelas dan fokus.</p>
            <h2>Analisis</h2>
            <p>Bandingkan perspektif lain, lalu jelaskan kenapa pendapatmu lebih relevan.</p>
            <h3>Contoh Nyata</h3>
            <p>Masukkan contoh kasus agar pembaca mudah memahami poin.</p>
            <h2>Kesimpulan</h2>
            <p>Rangkum argumen dan berikan pesan akhir yang tegas.</p>
        `,
        work_program: `
            <p>Jelaskan tujuan program kerja dalam 2-3 kalimat singkat.</p>
            <h2>Latar Belakang Program</h2>
            <p>Uraikan masalah yang ingin diselesaikan dan urgensi program.</p>
            <h2>Rencana Pelaksanaan</h2>
            <p>Jelaskan tahapan, target waktu, dan pihak yang terlibat.</p>
            <h3>Indikator Keberhasilan</h3>
            <ul>
                <li>Tuliskan indikator 1</li>
                <li>Tuliskan indikator 2</li>
            </ul>
            <h2>Penutup</h2>
            <p>Jelaskan manfaat program untuk anggota atau masyarakat.</p>
        `,
        activity_release: `
            <p>Tulis pembuka rilis: kegiatan apa yang dilaksanakan, kapan, dan oleh siapa.</p>
            <h2>Ringkasan Kegiatan</h2>
            <p>Jelaskan jalannya kegiatan dari awal hingga akhir secara singkat.</p>
            <h2>Hasil dan Dampak</h2>
            <p>Uraikan output kegiatan dan dampaknya.</p>
            <h3>Kutipan Narasumber</h3>
            <blockquote>Tuliskan kutipan singkat narasumber atau penanggung jawab.</blockquote>
            <h2>Tindak Lanjut</h2>
            <p>Tuliskan agenda lanjutan setelah kegiatan berlangsung.</p>
        `,
        announcement: `
            <p>Tulis inti pengumuman secara langsung dalam 1-2 kalimat.</p>
            <h2>Informasi Utama</h2>
            <ul>
                <li>Waktu:</li>
                <li>Tempat:</li>
                <li>Sasaran:</li>
            </ul>
            <h2>Ketentuan</h2>
            <p>Jelaskan syarat, dokumen, atau aturan penting.</p>
            <h2>Kontak dan Penutup</h2>
            <p>Berikan kontak panitia/admin dan kalimat penutup yang jelas.</p>
        `
    };

    const state = {
        session: sessionStorage.getItem(SESSION_KEY) || '',
        id: new URLSearchParams(window.location.search).get('id'),
        loading: false,
        savedRange: null,
        currentPane: 'write',
        lint: { errors: [], warnings: [] },
        quality: null,
        coverMeta: null,
        lowGradeResolver: null,
        pendingPaste: null
    };

    const els = {
        form: document.getElementById('article-form'),
        inpId: document.getElementById('art-id'),
        inpTitle: document.getElementById('art-title'),
        inpAuthor: document.getElementById('art-author'),
        inpCategory: document.getElementById('art-category'),
        inpDate: document.getElementById('art-date'),
        inpFile: document.getElementById('art-image-file'),
        inpBase64: document.getElementById('art-image-base64'),
        previewDiv: document.getElementById('art-image-preview'),
        editorArea: document.getElementById('art-editor'),
        inpContent: document.getElementById('art-content'),
        toolbar: document.getElementById('editor-toolbar'),
        statusText: document.getElementById('editor-status'),
        qualityStatusText: document.getElementById('editor-quality-status'),
        autosaveText: document.getElementById('editor-autosave'),
        saveBtn: document.getElementById('art-save-btn'),
        saveBtnBottom: document.getElementById('art-save-btn-bottom'),
        overlay: document.getElementById('loading-overlay'),
        removeImgBtn: document.getElementById('remove-art-image'),
        cancelBtn: document.getElementById('art-cancel-btn'),
        previewBtn: document.getElementById('previewBtn'),
        splitLayout: document.getElementById('editor-split-layout'),
        tabButtons: Array.from(document.querySelectorAll('.editor-tab-btn')),
        livePreview: document.getElementById('editor-live-preview'),
        lintList: document.getElementById('article-lint-list'),
        qualityScoreCard: document.getElementById('article-quality-score-card'),
        qualityGradeBadge: document.getElementById('quality-grade-badge'),
        qualityScoreValue: document.getElementById('quality-score-value'),
        qualityScoreSummary: document.getElementById('quality-score-summary'),
        qualityDomainBreakdown: document.getElementById('quality-domain-breakdown'),
        qualityParamsList: document.getElementById('quality-params-list'),
        qualityDetailsToggle: document.getElementById('quality-details-toggle'),
        qualityDetailsBody: document.getElementById('quality-details-body'),
        blockSelect: document.getElementById('editor-block-style'),
        templateSelect: document.getElementById('editor-template-select'),
        insertTemplateBtn: document.getElementById('editor-insert-template-btn'),
        normalizeBtn: document.getElementById('editor-normalize-btn'),
        inlineImageInput: document.getElementById('editor-inline-image'),
        linkPopover: document.getElementById('editor-link-popover'),
        linkInput: document.getElementById('editor-link-input'),
        linkApplyBtn: document.getElementById('editor-link-apply'),
        linkCancelBtn: document.getElementById('editor-link-cancel'),
        imagePopover: document.getElementById('editor-image-popover'),
        imageInput: document.getElementById('editor-image-input'),
        imageApplyBtn: document.getElementById('editor-image-apply'),
        imageUploadBtn: document.getElementById('editor-image-upload'),
        moreToolsBtn: document.getElementById('editor-more-tools-btn'),
        moreToolsPanel: document.getElementById('editor-more-tools-panel'),
        pasteChoicePopover: document.getElementById('editor-paste-choice-popover'),
        pasteCleanBtn: document.getElementById('editor-paste-clean-btn'),
        pasteKeepBtn: document.getElementById('editor-paste-keep-btn'),
        pasteCancelBtn: document.getElementById('editor-paste-cancel-btn'),
        lowGradeModal: document.getElementById('low-grade-confirm-modal'),
        lowGradeGrade: document.getElementById('low-grade-confirm-grade'),
        lowGradeCancelBtn: document.getElementById('low-grade-cancel-btn'),
        lowGradeConfirmBtn: document.getElementById('low-grade-confirm-btn')
    };

    function getRenderer() {
        return window.ArticleRenderer || null;
    }

    function debounce(fn, delay) {
        let timer = null;
        return function debounced(...args) {
            clearTimeout(timer);
            timer = setTimeout(() => fn.apply(this, args), delay);
        };
    }

    async function fetchJson(url, init) {
        const opts = { ...(init || {}) };
        if (!opts.credentials) opts.credentials = 'include';
        const res = await fetch(url, opts);
        const payload = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(payload.message || `HTTP ${res.status}`);
        return payload;
    }

    async function apiRequest(method, path, body) {
        const headers = { 'Content-Type': 'application/json' };
        if (state.session) headers.Authorization = `Bearer ${state.session}`;
        return fetchJson(path, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined
        });
    }

    function showLoader(show) {
        if (!els.overlay) return;
        els.overlay.classList.toggle('hidden', !show);
    }

    function notify(message, type) {
        if (window.Toast && typeof window.Toast.show === 'function') {
            window.Toast.show(message, type || 'info');
            return;
        }
        if (message) alert(message);
    }

    function isMobileView() {
        return window.matchMedia('(max-width: 900px)').matches;
    }

    function setPane(pane) {
        state.currentPane = pane === 'preview' ? 'preview' : 'write';
        if (!els.splitLayout) return;
        els.splitLayout.classList.toggle('show-preview', state.currentPane === 'preview');
        els.tabButtons.forEach((btn) => {
            const active = btn.dataset.pane === state.currentPane;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });
    }

    function updateStatus(wordCount) {
        if (els.statusText) {
            els.statusText.textContent = `Draft - ${wordCount} kata`;
        }
    }

    function updateQualityHeaderStatus(quality) {
        if (!els.qualityStatusText) return;
        if (!quality) {
            els.qualityStatusText.textContent = 'Grade - | Perlu evaluasi';
            return;
        }
        const statusText = quality.errors.length > 0
            ? 'Perlu perbaikan'
            : (quality.grade === 'A' || quality.grade === 'B' || quality.grade === 'C' ? 'Siap publish' : 'Perlu rapikan');
        els.qualityStatusText.textContent = `Grade ${quality.grade} | ${statusText}`;
    }

    function updateAutosaveLabel(text) {
        if (els.autosaveText) els.autosaveText.textContent = text;
    }

    function getWordCountFromHtml(html) {
        const renderer = getRenderer();
        const plain = renderer && typeof renderer.stripHtml === 'function'
            ? renderer.stripHtml(html)
            : String(html || '').replace(/<[^>]+>/g, ' ');
        return plain.trim() ? plain.trim().split(/\s+/).length : 0;
    }

    function getCoverMimeFromSource(src) {
        const value = String(src || '').trim();
        if (!value) return '';
        const dataMatch = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/i);
        if (dataMatch && dataMatch[1]) return dataMatch[1].toLowerCase();
        if (/\.png(\?|#|$)/i.test(value)) return 'image/png';
        if (/\.jpe?g(\?|#|$)/i.test(value)) return 'image/jpeg';
        if (/\.webp(\?|#|$)/i.test(value)) return 'image/webp';
        if (/\.gif(\?|#|$)/i.test(value)) return 'image/gif';
        return '';
    }

    function inspectCoverImage(src) {
        const value = String(src || '').trim();
        if (!value) {
            state.coverMeta = null;
            return;
        }

        const meta = {
            status: 'pending',
            mime: getCoverMimeFromSource(value),
            width: 0,
            height: 0
        };
        state.coverMeta = meta;

        const img = new Image();
        img.onload = () => {
            meta.status = 'ok';
            meta.width = Number(img.naturalWidth || 0);
            meta.height = Number(img.naturalHeight || 0);
            runStructureLint();
        };
        img.onerror = () => {
            meta.status = 'error';
            runStructureLint();
        };
        img.src = value;
    }

    function countWords(text) {
        const plain = String(text || '').trim();
        if (!plain) return 0;
        return plain.split(/\s+/).filter(Boolean).length;
    }

    function normalizeTextValue(text) {
        return String(text || '').replace(/\s+/g, ' ').trim();
    }

    function statusWeight(status) {
        if (status === 'pass') return 1;
        if (status === 'warning') return 0.5;
        return 0;
    }

    function scoreItems(maxScore, items) {
        if (!items.length) return 0;
        const totalWeight = items.reduce((sum, item) => sum + statusWeight(item.status), 0);
        return Math.round((totalWeight / items.length) * maxScore);
    }

    function gradeFromScore(score) {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 55) return 'D';
        return 'E';
    }

    function createCheckItem(domain, label, ok, messageOk, messageBad, options) {
        const opts = options || {};
        const status = ok ? 'pass' : (opts.severity === 'error' ? 'error' : 'warning');
        return {
            domain,
            label,
            status,
            critical: Boolean(opts.critical),
            message: ok ? messageOk : messageBad
        };
    }

    function getContentAnalysis(rawContent) {
        const sanitized = sanitizeHtml(rawContent || '');
        const parser = new DOMParser();
        const doc = parser.parseFromString(sanitized, 'text/html');
        const body = doc.body;
        const plain = normalizeTextValue(body.textContent || '');
        const paragraphs = Array.from(body.querySelectorAll('p'));
        const headings = Array.from(body.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        const h2List = Array.from(body.querySelectorAll('h2'));
        const h3List = Array.from(body.querySelectorAll('h3'));
        const images = Array.from(body.querySelectorAll('img'));
        const links = Array.from(body.querySelectorAll('a'));
        const lists = Array.from(body.querySelectorAll('ul, ol'));
        const blockquotes = Array.from(body.querySelectorAll('blockquote'));

        const paragraphWords = paragraphs.map((p) => countWords(normalizeTextValue(p.textContent || '')));
        const emptyHeadings = headings.filter((h) => !normalizeTextValue(h.textContent || ''));
        const emptyParagraphIndexes = [];
        let consecutiveEmptyParagraphChains = 0;
        let inEmptyChain = false;
        paragraphs.forEach((p, idx) => {
            const empty = !normalizeTextValue(p.textContent || '');
            if (empty) emptyParagraphIndexes.push(idx);
            if (empty && !inEmptyChain) {
                inEmptyChain = true;
                consecutiveEmptyParagraphChains += 1;
            }
            if (!empty) inEmptyChain = false;
        });

        let h3BeforeH2 = false;
        let seenH2 = false;
        Array.from(body.querySelectorAll('h2, h3')).forEach((el) => {
            const tag = el.tagName.toLowerCase();
            if (tag === 'h2') seenH2 = true;
            if (tag === 'h3' && !seenH2) h3BeforeH2 = true;
        });

        const emptyListItems = Array.from(body.querySelectorAll('li')).filter((li) => !normalizeTextValue(li.textContent || ''));
        const fragmentedBlockquotes = blockquotes.filter((q) => countWords(normalizeTextValue(q.textContent || '')) < 4);
        const strongCount = body.querySelectorAll('strong, b').length;
        const italicCount = body.querySelectorAll('em, i').length;

        return {
            doc,
            body,
            plain,
            wordCount: countWords(plain),
            paragraphs,
            paragraphWords,
            headings,
            h2List,
            h3List,
            images,
            links,
            lists,
            blockquotes,
            emptyHeadings,
            emptyParagraphIndexes,
            consecutiveEmptyParagraphChains,
            h3BeforeH2,
            emptyListItems,
            fragmentedBlockquotes,
            strongCount,
            italicCount
        };
    }

    function evaluateStructure(meta) {
        const items = [];
        const title = normalizeTextValue(els.inpTitle ? els.inpTitle.value : '');
        const author = normalizeTextValue(els.inpAuthor ? els.inpAuthor.value : '');
        items.push(createCheckItem(
            'Struktur',
            'Judul minimal 12 karakter',
            title.length >= 12,
            'Judul sudah memenuhi panjang minimum.',
            'Panjangkan judul hingga minimal 12 karakter.',
            { critical: true, severity: 'error' }
        ));
        items.push(createCheckItem(
            'Struktur',
            'Penulis terisi',
            Boolean(author),
            'Penulis sudah diisi.',
            'Isi nama penulis sebelum publish.',
            { critical: true, severity: 'error' }
        ));
        items.push(createCheckItem(
            'Struktur',
            `Konten minimal ${MIN_WORD_COUNT} kata`,
            meta.wordCount >= MIN_WORD_COUNT,
            `Konten sudah memenuhi minimal ${MIN_WORD_COUNT} kata.`,
            `Tambahkan isi artikel hingga minimal ${MIN_WORD_COUNT} kata.`,
            { critical: true, severity: 'error' }
        ));
        items.push(createCheckItem(
            'Struktur',
            'Urutan heading konsisten',
            !meta.h3BeforeH2,
            'Urutan heading sudah konsisten.',
            'Ada H3 sebelum H2. Rapikan urutan heading.',
            { severity: 'warning' }
        ));
        items.push(createCheckItem(
            'Struktur',
            'Heading tidak kosong',
            meta.emptyHeadings.length === 0,
            'Tidak ada heading kosong.',
            'Hapus heading kosong atau isi teks heading.',
            { severity: 'warning' }
        ));
        items.push(createCheckItem(
            'Struktur',
            'Paragraf kosong tidak beruntun',
            meta.consecutiveEmptyParagraphChains <= 1,
            'Jarak paragraf sudah rapi.',
            'Ada paragraf kosong beruntun. Rapikan spasi antar paragraf.',
            { severity: 'warning' }
        ));
        items.push(createCheckItem(
            'Struktur',
            'List dan quote tidak terfragmentasi',
            meta.emptyListItems.length === 0 && meta.fragmentedBlockquotes.length === 0,
            'List dan quote tersusun rapi.',
            'Ada list/quote yang kosong atau terlalu pendek. Lengkapi atau hapus.',
            { severity: 'warning' }
        ));
        return items;
    }

    function evaluateReadability(meta) {
        const items = [];
        const longParagraphCount = meta.paragraphWords.filter((count) => count > 120).length;
        const contentLengthNeedsHeadings = meta.wordCount >= 350;
        const headingEnough = !contentLengthNeedsHeadings || meta.h2List.length >= 2;
        const heavyInlineFormatting = (meta.strongCount + meta.italicCount) > Math.max(8, meta.paragraphs.length * 3);
        const imagesWithoutAlt = meta.images.filter((img) => !normalizeTextValue(img.getAttribute('alt') || ''));

        items.push(createCheckItem(
            'Readability',
            'Panjang paragraf ideal',
            longParagraphCount === 0,
            'Panjang paragraf sudah nyaman dibaca.',
            `Ada ${longParagraphCount} paragraf terlalu panjang. Pecah agar lebih nyaman dibaca.`,
            { severity: 'warning' }
        ));
        items.push(createCheckItem(
            'Readability',
            'Distribusi subjudul cukup',
            headingEnough,
            'Distribusi subjudul sudah cukup.',
            'Artikel panjang butuh minimal 2 subjudul H2 agar mudah dipindai.',
            { severity: 'warning' }
        ));
        items.push(createCheckItem(
            'Readability',
            'Kepadatan format sehat',
            !heavyInlineFormatting,
            'Penekanan teks tidak berlebihan.',
            'Penggunaan bold/italic terlalu padat. Kurangi agar ritme baca tetap nyaman.',
            { severity: 'warning' }
        ));
        items.push(createCheckItem(
            'Readability',
            'Spasi antar paragraf konsisten',
            meta.consecutiveEmptyParagraphChains <= 1,
            'Spasi antar paragraf konsisten.',
            'Temukan paragraf kosong beruntun. Gunakan satu pemisah antar bagian.',
            { severity: 'warning' }
        ));
        items.push(createCheckItem(
            'Readability',
            'Gambar inline memiliki alt',
            imagesWithoutAlt.length === 0,
            'Semua gambar inline sudah punya alt.',
            'Tambahkan alt pada gambar inline agar lebih jelas dan aksesibel.',
            { severity: 'warning' }
        ));
        return items;
    }

    function evaluateSeoReadiness(meta) {
        const items = [];
        const title = normalizeTextValue(els.inpTitle ? els.inpTitle.value : '');
        const coverImage = normalizeTextValue(els.inpBase64 ? els.inpBase64.value : '');
        const intro = meta.paragraphs.length ? normalizeTextValue(meta.paragraphs[0].textContent || '') : '';
        const coverMime = getCoverMimeFromSource(coverImage);
        const coverMeta = state.coverMeta;
        const hasValidDimension = coverMeta && coverMeta.status === 'ok' && coverMeta.width > 0 && coverMeta.height > 0;
        const ratio = hasValidDimension ? (coverMeta.width / coverMeta.height) : 0;

        items.push(createCheckItem(
            'SEO & Share',
            'Cover image tersedia',
            Boolean(coverImage),
            'Cover artikel sudah tersedia.',
            'Tambah gambar sampul agar preview share tampil lengkap.',
            { critical: true, severity: 'error' }
        ));
        items.push(createCheckItem(
            'SEO & Share',
            'Format cover JPG/PNG',
            Boolean(coverImage) && /^image\/(jpeg|png)$/i.test(coverMime),
            'Format cover sudah sesuai.',
            'Gunakan JPG atau PNG agar preview WhatsApp lebih konsisten.',
            { severity: 'warning' }
        ));
        items.push(createCheckItem(
            'SEO & Share',
            'Resolusi cover >= 1200x630',
            Boolean(coverImage) && hasValidDimension && coverMeta.width >= 1200 && coverMeta.height >= 630,
            'Resolusi cover sudah ideal.',
            'Resolusi cover disarankan minimal 1200 x 630.',
            { severity: 'warning' }
        ));
        items.push(createCheckItem(
            'SEO & Share',
            'Rasio cover mendekati 1.91:1',
            Boolean(coverImage) && hasValidDimension && Math.abs(ratio - (1200 / 630)) <= 0.12,
            'Rasio cover sudah rapi untuk kartu share.',
            'Gunakan rasio sekitar 1.91:1 (contoh 1200 x 630).',
            { severity: 'warning' }
        ));
        items.push(createCheckItem(
            'SEO & Share',
            'Judul cukup kuat untuk snippet',
            title.length >= 36,
            'Panjang judul sudah baik untuk snippet.',
            'Pertimbangkan judul 36+ karakter agar snippet lebih informatif.',
            { severity: 'warning' }
        ));
        items.push(createCheckItem(
            'SEO & Share',
            'Dek/intro tersedia di paragraf awal',
            intro.length >= 80,
            'Paragraf awal sudah cukup menjelaskan konteks.',
            'Perkuat paragraf pembuka agar konteks artikel langsung jelas.',
            { severity: 'warning' }
        ));
        return items;
    }

    function buildQualityAssessment(rawContent) {
        const meta = getContentAnalysis(rawContent);
        const structureItems = evaluateStructure(meta);
        const readabilityItems = evaluateReadability(meta);
        const seoItems = evaluateSeoReadiness(meta);

        const structureScore = scoreItems(DOMAIN_WEIGHTS.structure, structureItems);
        const readabilityScore = scoreItems(DOMAIN_WEIGHTS.readability, readabilityItems);
        const seoScore = scoreItems(DOMAIN_WEIGHTS.seo, seoItems);
        const totalScore = structureScore + readabilityScore + seoScore;
        const grade = gradeFromScore(totalScore);

        const allItems = [...structureItems, ...readabilityItems, ...seoItems];
        const errors = allItems.filter((item) => item.status === 'error').map((item) => item.message);
        const warnings = allItems.filter((item) => item.status === 'warning').map((item) => item.message);

        let summary = 'Perlu evaluasi kualitas artikel.';
        if (errors.length > 0) summary = 'Perlu perbaikan kritis sebelum publish.';
        else if (grade === 'A' || grade === 'B' || grade === 'C') summary = 'Siap Publish';
        else summary = 'Perlu perapihan ringan sebelum publish.';

        return {
            meta,
            score: totalScore,
            grade,
            summary,
            errors,
            warnings,
            domains: [
                { key: 'structure', label: 'Struktur', score: structureScore, max: DOMAIN_WEIGHTS.structure },
                { key: 'readability', label: 'Readability', score: readabilityScore, max: DOMAIN_WEIGHTS.readability },
                { key: 'seo', label: 'SEO & Share', score: seoScore, max: DOMAIN_WEIGHTS.seo }
            ],
            parameterDetails: allItems
        };
    }

    function sanitizeHtml(rawHtml) {
        const renderer = getRenderer();
        if (renderer && typeof renderer.sanitizeArticleHTML === 'function') {
            return renderer.sanitizeArticleHTML(rawHtml, { removeHeadingOne: true });
        }
        return String(rawHtml || '')
            .replace(/<\s*(script|style|iframe|object|embed|link|meta|base|form|input|button|textarea|select)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
            .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, '')
            .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, '')
            .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '');
    }

    function saveSelection() {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        state.savedRange = sel.getRangeAt(0);
    }

    function restoreSelection() {
        if (!state.savedRange) return;
        const sel = window.getSelection();
        if (!sel) return;
        sel.removeAllRanges();
        sel.addRange(state.savedRange);
    }

    function normalizeHref(raw) {
        const value = String(raw || '').trim();
        if (!value) return '';
        if (/^(https?:|mailto:|tel:)/i.test(value)) return value;
        return `https://${value}`;
    }

    function execCommand(command, value) {
        restoreSelection();
        document.execCommand(command, false, value || null);
        if (els.editorArea) els.editorArea.focus();
        refreshToolbarState();
    }

    function closestElement(node, selector) {
        if (!node) return null;
        if (node.nodeType === Node.ELEMENT_NODE) return node.closest(selector);
        if (node.parentElement) return node.parentElement.closest(selector);
        return null;
    }

    function getSelectionRootElement() {
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return null;
        return sel.anchorNode && sel.anchorNode.nodeType === Node.ELEMENT_NODE
            ? sel.anchorNode
            : sel.anchorNode && sel.anchorNode.parentElement
                ? sel.anchorNode.parentElement
                : null;
    }

    function getActiveBlockElement() {
        const anchorEl = getSelectionRootElement();
        return closestElement(anchorEl, 'p, h2, h3, li, blockquote');
    }

    function getSelectedBlockElements() {
        if (!els.editorArea) return [];
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return [];
        const range = sel.getRangeAt(0);
        const allBlocks = Array.from(els.editorArea.querySelectorAll('p, h2, h3, li, blockquote'));
        const inRange = allBlocks.filter((block) => {
            try {
                return range.intersectsNode(block);
            } catch {
                return false;
            }
        });
        if (inRange.length) return inRange;
        const active = getActiveBlockElement();
        return active ? [active] : [];
    }

    function setLinkSecurityAttributes(anchorEl, href) {
        if (!anchorEl) return;
        anchorEl.setAttribute('href', href);
        if (/^https?:\/\//i.test(href)) {
            anchorEl.setAttribute('target', '_blank');
            anchorEl.setAttribute('rel', 'noopener noreferrer');
        } else {
            anchorEl.removeAttribute('target');
            anchorEl.removeAttribute('rel');
        }
    }

    function applyAlignment(alignment) {
        const safeAlign = ['left', 'center', 'right', 'justify'].includes(alignment) ? alignment : 'left';
        const targets = getSelectedBlockElements();
        if (!targets.length) {
            notify('Pilih paragraf atau heading yang ingin diratakan.', 'warning');
            return;
        }
        targets.forEach((block) => {
            block.setAttribute('data-align', safeAlign);
        });
        if (els.editorArea) els.editorArea.focus();
        handleEditorContentChange();
    }

    function insertHorizontalRule() {
        restoreSelection();
        const ok = document.execCommand('insertHorizontalRule', false);
        if (!ok) execCommand('insertHTML', '<hr>');
        if (els.editorArea) els.editorArea.focus();
        handleEditorContentChange();
    }

    function getCurrentAlignment() {
        const activeBlock = getActiveBlockElement();
        if (!activeBlock) return '';
        const align = String(activeBlock.getAttribute('data-align') || '').toLowerCase();
        return ['left', 'center', 'right', 'justify'].includes(align) ? align : '';
    }

    function toSemanticParagraphs(rawText) {
        const escapeText = (value) => String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        return String(rawText || '')
            .split(/\n{2,}/)
            .map((line) => line.trim())
            .filter(Boolean)
            .map((line) => `<p>${escapeText(line)}</p>`)
            .join('');
    }

    function cleanPastedHtml(rawHtml, fallbackText) {
        const renderer = getRenderer();
        const parser = new DOMParser();
        const doc = parser.parseFromString(String(rawHtml || ''), 'text/html');
        if (!doc.body) return toSemanticParagraphs(fallbackText);
        const plain = (doc.body.textContent || '').trim();
        if (!plain) return '';
        if (renderer && typeof renderer.sanitizeArticleHTML === 'function') {
            return renderer.sanitizeArticleHTML(toSemanticParagraphs(plain), { removeHeadingOne: true });
        }
        return toSemanticParagraphs(plain);
    }

    function closeAllPopovers() {
        if (els.linkPopover) els.linkPopover.hidden = true;
        if (els.imagePopover) els.imagePopover.hidden = true;
        if (els.moreToolsPanel) els.moreToolsPanel.hidden = true;
        if (els.pasteChoicePopover) els.pasteChoicePopover.hidden = true;
        if (els.moreToolsBtn) els.moreToolsBtn.setAttribute('aria-expanded', 'false');
        state.pendingPaste = null;
    }

    function refreshToolbarState() {
        if (!els.toolbar) return;
        const buttons = els.toolbar.querySelectorAll('.tool-btn[data-command]');
        buttons.forEach((btn) => {
            const cmd = btn.dataset.command;
            let active = false;
            try {
                active = document.queryCommandState(cmd);
            } catch {
                active = false;
            }
            btn.classList.toggle('active', Boolean(active));
        });

        const alignMap = {
            alignLeft: 'left',
            alignCenter: 'center',
            alignRight: 'right',
            alignJustify: 'justify'
        };
        const currentAlign = getCurrentAlignment();
        Object.keys(alignMap).forEach((action) => {
            const btn = document.querySelector(`.tool-btn[data-action="${action}"]`);
            if (!btn) return;
            btn.setAttribute('aria-pressed', alignMap[action] === currentAlign ? 'true' : 'false');
        });

        const outdentBtn = document.querySelector('.tool-btn[data-action="outdent"]');
        if (outdentBtn) {
            let enabled = true;
            try {
                enabled = document.queryCommandEnabled('outdent');
            } catch {
                enabled = true;
            }
            outdentBtn.disabled = !enabled;
        }

        const activeBlock = getActiveBlockElement();
        if (els.blockSelect && activeBlock) {
            const tag = activeBlock.tagName.toLowerCase();
            if (tag === 'h2' || tag === 'h3' || tag === 'p') {
                els.blockSelect.value = tag;
            }
        }
    }

    function openLinkPopover() {
        if (els.imagePopover) els.imagePopover.hidden = true;
        if (els.moreToolsPanel) els.moreToolsPanel.hidden = true;
        if (els.pasteChoicePopover) els.pasteChoicePopover.hidden = true;
        if (els.moreToolsBtn) els.moreToolsBtn.setAttribute('aria-expanded', 'false');
        if (!els.linkPopover || !els.linkInput) return;
        const activeAnchor = closestElement(getSelectionRootElement(), 'a');
        els.linkInput.value = activeAnchor ? String(activeAnchor.getAttribute('href') || '') : '';
        els.linkPopover.hidden = false;
        els.linkInput.focus();
    }

    function openImagePopover() {
        if (els.linkPopover) els.linkPopover.hidden = true;
        if (els.moreToolsPanel) els.moreToolsPanel.hidden = true;
        if (els.pasteChoicePopover) els.pasteChoicePopover.hidden = true;
        if (els.moreToolsBtn) els.moreToolsBtn.setAttribute('aria-expanded', 'false');
        if (!els.imagePopover || !els.imageInput) return;
        els.imagePopover.hidden = false;
        els.imageInput.focus();
    }

    function applyLink() {
        if (!els.linkInput) return;
        const href = normalizeHref(els.linkInput.value);
        if (!href) {
            notify('URL tautan belum diisi.', 'warning');
            return;
        }
        restoreSelection();
        const activeAnchor = closestElement(getSelectionRootElement(), 'a');
        const sel = window.getSelection();
        if (activeAnchor && (!sel || sel.isCollapsed)) {
            setLinkSecurityAttributes(activeAnchor, href);
        } else if (sel && !sel.isCollapsed) {
            execCommand('createLink', href);
        } else {
            execCommand('insertHTML', `<a href="${href}" target="_blank" rel="noopener noreferrer">${href}</a>`);
        }
        const linked = closestElement(getSelectionRootElement(), 'a');
        if (linked) setLinkSecurityAttributes(linked, href);
        closeAllPopovers();
        els.linkInput.value = '';
        handleEditorContentChange();
    }

    function applyInlineImageSource(src) {
        const safeSrc = String(src || '').trim();
        if (!safeSrc) return;
        restoreSelection();
        execCommand('insertHTML', `<img src="${safeSrc}" alt="Gambar artikel">`);
    }

    function applyImageFromUrl() {
        if (!els.imageInput) return;
        const value = normalizeHref(els.imageInput.value);
        if (!value) {
            notify('URL gambar belum diisi.', 'warning');
            return;
        }
        applyInlineImageSource(value);
        closeAllPopovers();
        els.imageInput.value = '';
        handleEditorContentChange();
    }

    function removeActiveLink() {
        restoreSelection();
        execCommand('unlink');
        handleEditorContentChange();
    }

    function openMoreToolsPanel() {
        if (!els.moreToolsPanel || !els.moreToolsBtn) return;
        const willOpen = els.moreToolsPanel.hidden;
        closeAllPopovers();
        els.moreToolsPanel.hidden = !willOpen;
        els.moreToolsBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        if (willOpen) {
            const firstBtn = els.moreToolsPanel.querySelector('.tool-btn');
            if (firstBtn) firstBtn.focus();
        }
    }

    function openPasteChoicePopover(html, text) {
        if (!els.pasteChoicePopover) return;
        state.pendingPaste = {
            html: String(html || ''),
            text: String(text || '')
        };
        if (els.linkPopover) els.linkPopover.hidden = true;
        if (els.imagePopover) els.imagePopover.hidden = true;
        if (els.moreToolsPanel) els.moreToolsPanel.hidden = true;
        if (els.moreToolsBtn) els.moreToolsBtn.setAttribute('aria-expanded', 'false');
        els.pasteChoicePopover.hidden = false;
        if (els.pasteCleanBtn) els.pasteCleanBtn.focus();
    }

    function closePasteChoicePopover() {
        if (els.pasteChoicePopover) els.pasteChoicePopover.hidden = true;
        state.pendingPaste = null;
        if (els.editorArea) els.editorArea.focus();
    }

    function applyPendingPaste(mode) {
        if (!state.pendingPaste) return;
        restoreSelection();
        const html = state.pendingPaste.html;
        const text = state.pendingPaste.text;
        let payload = '';
        if (mode === 'keep') {
            payload = sanitizeHtml(html || toSemanticParagraphs(text));
        } else {
            payload = cleanPastedHtml(html, text);
        }
        execCommand('insertHTML', payload || toSemanticParagraphs(text));
        closePasteChoicePopover();
        handleEditorContentChange();
    }

    async function readClipboardPayload() {
        if (!navigator.clipboard) return null;
        const payload = { html: '', text: '' };
        if (navigator.clipboard.read) {
            const items = await navigator.clipboard.read();
            for (const item of items) {
                if (item.types.includes('text/html')) {
                    const blob = await item.getType('text/html');
                    payload.html = await blob.text();
                }
                if (item.types.includes('text/plain')) {
                    const blob = await item.getType('text/plain');
                    payload.text = await blob.text();
                }
            }
        }
        if (!payload.text && navigator.clipboard.readText) {
            payload.text = await navigator.clipboard.readText();
        }
        return payload;
    }

    async function runClipboardPaste(mode) {
        try {
            const payload = await readClipboardPayload();
            if (!payload || (!payload.html && !payload.text)) {
                notify('Clipboard kosong atau akses ditolak browser.', 'warning');
                return;
            }
            restoreSelection();
            if (mode === 'keep') {
                execCommand('insertHTML', sanitizeHtml(payload.html || toSemanticParagraphs(payload.text)));
            } else {
                execCommand('insertHTML', cleanPastedHtml(payload.html, payload.text));
            }
            handleEditorContentChange();
        } catch {
            notify('Browser memblokir akses clipboard. Gunakan Ctrl/Cmd+V.', 'warning');
        }
    }

    function executeToolbarAction(action) {
        switch (action) {
        case 'undo':
            execCommand('undo');
            handleEditorContentChange();
            return;
        case 'redo':
            execCommand('redo');
            handleEditorContentChange();
            return;
        case 'removeFormat':
            execCommand('removeFormat');
            handleEditorContentChange();
            return;
        case 'toggleMoreTools':
            openMoreToolsPanel();
            return;
        case 'alignLeft':
            applyAlignment('left');
            return;
        case 'alignCenter':
            applyAlignment('center');
            return;
        case 'alignRight':
            applyAlignment('right');
            return;
        case 'alignJustify':
            applyAlignment('justify');
            return;
        case 'indent':
            execCommand('indent');
            handleEditorContentChange();
            return;
        case 'outdent':
            execCommand('outdent');
            handleEditorContentChange();
            return;
        case 'insertHr':
            insertHorizontalRule();
            return;
        case 'unlink':
            removeActiveLink();
            return;
        case 'pasteCleanNow':
            runClipboardPaste('clean');
            return;
        case 'pasteKeepNow':
            runClipboardPaste('keep');
            return;
        default:
            return;
        }
    }

    function handleInlineImageUpload(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const src = evt.target && evt.target.result ? evt.target.result : '';
            if (!src) return;
            applyInlineImageSource(src);
            handleEditorContentChange();
        };
        reader.readAsDataURL(file);
    }

    function getRawArticleForPreview() {
        return {
            id: els.inpId ? els.inpId.value : '',
            title: els.inpTitle ? els.inpTitle.value : '',
            author: els.inpAuthor ? els.inpAuthor.value : '',
            category: els.inpCategory ? els.inpCategory.value : 'Umum',
            publish_date: els.inpDate && els.inpDate.value ? new Date(els.inpDate.value).toISOString() : new Date().toISOString(),
            image: els.inpBase64 ? els.inpBase64.value : '',
            content: sanitizeHtml(els.editorArea ? els.editorArea.innerHTML : '')
        };
    }

    function setupPreviewToc(root, prefix) {
        const toc = root.querySelector(`#${prefix}article-toc`);
        const content = root.querySelector(`#${prefix}article-content-body`);
        if (!toc || !content) return;

        const headings = Array.from(content.querySelectorAll('h2, h3')).filter((el) => (el.textContent || '').trim().length > 0);
        if (headings.length < 2) {
            toc.hidden = true;
            toc.innerHTML = '';
            return;
        }

        const idSet = new Set();
        headings.forEach((heading, index) => {
            const base = (heading.textContent || `bagian-${index + 1}`)
                .toLowerCase()
                .trim()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-') || `bagian-${index + 1}`;
            let id = `${prefix}${base}`;
            while (idSet.has(id)) id = `${id}-${index + 1}`;
            idSet.add(id);
            heading.id = id;
        });

        const tocItems = headings.map((heading) => {
            const level = heading.tagName.toLowerCase();
            return `
                <li class="toc-item ${level === 'h3' ? 'is-sub' : ''}">
                    <a class="toc-link" href="#${heading.id}">${heading.textContent || ''}</a>
                </li>
            `;
        }).join('');
        toc.innerHTML = `
            <div class="toc-title">Daftar Isi</div>
            <ol class="toc-list">${tocItems}</ol>
        `;
        toc.hidden = false;

        toc.onclick = (evt) => {
            const link = evt.target.closest('a.toc-link');
            if (!link) return;
            const target = root.querySelector(link.getAttribute('href'));
            if (!target) return;
            evt.preventDefault();
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
    }

    function renderLivePreview() {
        if (!els.livePreview) return;
        const renderer = getRenderer();
        if (!renderer || typeof renderer.buildArticleViewModel !== 'function' || typeof renderer.renderArticleDetailHTML !== 'function') {
            els.livePreview.innerHTML = '<p style="padding:12px">Renderer belum siap.</p>';
            return;
        }

        const article = getRawArticleForPreview();
        const vm = renderer.buildArticleViewModel(article, { url: '/articles' });
        const html = renderer.renderArticleDetailHTML(vm, {
            includeBackLink: false,
            showReadingTools: true,
            showToc: true,
            idPrefix: 'preview-',
            articleClassName: 'article-detail'
        });

        els.livePreview.innerHTML = html;
        const heroImg = els.livePreview.querySelector('.hero-img');
        if (heroImg) {
            if (heroImg.complete) heroImg.classList.add('is-loaded');
            else heroImg.addEventListener('load', () => heroImg.classList.add('is-loaded'), { once: true });
        }
        setupPreviewToc(els.livePreview, 'preview-');
    }

    function renderQualityScoreCard(quality) {
        if (!els.qualityScoreCard || !quality) return;

        if (els.qualityGradeBadge) {
            const badge = els.qualityGradeBadge;
            badge.textContent = quality.grade;
            badge.className = `quality-grade-badge grade-${String(quality.grade || '').toLowerCase() || 'pending'}`;
        }
        if (els.qualityScoreValue) els.qualityScoreValue.textContent = `${quality.score}/100`;
        if (els.qualityScoreSummary) els.qualityScoreSummary.textContent = quality.summary;

        if (els.qualityDomainBreakdown) {
            els.qualityDomainBreakdown.innerHTML = quality.domains.map((domain) => `
                <div class="quality-domain-item">
                    <strong>${domain.label}</strong>
                    <span>${domain.score}/${domain.max}</span>
                </div>
            `).join('');
        }

        if (els.qualityParamsList) {
            els.qualityParamsList.innerHTML = quality.parameterDetails.map((item) => `
                <li class="quality-param-item">
                    <div class="quality-param-head">
                        <span class="quality-param-title">${item.domain}: ${item.label}</span>
                        <span class="quality-param-status ${item.status}">${item.status}</span>
                    </div>
                    <p class="quality-param-note">${item.message}</p>
                </li>
            `).join('');
        }
    }

    function renderLintPanel(errors, warnings) {
        if (!els.lintList) return;
        const rows = [];
        errors.forEach((message) => {
            rows.push(`<li class="article-lint-item error"><i class="fas fa-circle-exclamation"></i><span>${message}</span></li>`);
        });
        warnings.forEach((message) => {
            rows.push(`<li class="article-lint-item warning"><i class="fas fa-triangle-exclamation"></i><span>${message}</span></li>`);
        });
        if (!rows.length) {
            rows.push('<li class="article-lint-item success"><i class="fas fa-circle-check"></i><span>Struktur artikel sudah rapi dan siap publish.</span></li>');
        }
        els.lintList.innerHTML = rows.join('');
    }

    function runStructureLint() {
        const rawContent = els.editorArea ? els.editorArea.innerHTML : '';
        const quality = buildQualityAssessment(rawContent);
        state.quality = quality;
        state.lint = { errors: quality.errors, warnings: quality.warnings };
        renderQualityScoreCard(quality);
        renderLintPanel(quality.errors, quality.warnings);
        updateQualityHeaderStatus(quality);
        return state.lint;
    }

    function saveDraft() {
        if (state.id) return;
        const payload = {
            title: els.inpTitle ? els.inpTitle.value : '',
            author: els.inpAuthor ? els.inpAuthor.value : '',
            category: els.inpCategory ? els.inpCategory.value : 'Umum',
            publishDate: els.inpDate ? els.inpDate.value : '',
            content: els.editorArea ? els.editorArea.innerHTML : '',
            image: els.inpBase64 ? els.inpBase64.value : '',
            ts: Date.now()
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
        updateAutosaveLabel(`Draft tersimpan ${new Date(payload.ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`);
    }

    function loadDraft() {
        if (state.id) return;
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        try {
            const draft = JSON.parse(raw);
            if (!draft || !draft.ts || Date.now() - draft.ts > 2 * 60 * 60 * 1000) return;
            if (!confirm('Lanjutkan draft artikel terakhir?')) {
                localStorage.removeItem(DRAFT_KEY);
                return;
            }
            if (els.inpTitle) els.inpTitle.value = draft.title || '';
            if (els.inpAuthor) els.inpAuthor.value = draft.author || '';
            if (els.inpCategory) els.inpCategory.value = draft.category || 'Umum';
            if (els.inpDate && draft.publishDate) els.inpDate.value = draft.publishDate;
            if (els.editorArea) els.editorArea.innerHTML = draft.content || '';
            if (els.inpBase64 && draft.image) {
                els.inpBase64.value = draft.image;
                if (els.previewDiv) {
                    const img = els.previewDiv.querySelector('img');
                    if (img) img.src = draft.image;
                    els.previewDiv.style.display = 'block';
                }
                inspectCoverImage(draft.image);
            }
            updateAutosaveLabel(`Draft dipulihkan ${new Date(draft.ts).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`);
        } catch {
            // ignore invalid draft
        }
    }

    function clearDraft() {
        localStorage.removeItem(DRAFT_KEY);
    }

    function updateWordAndStatus() {
        const count = getWordCountFromHtml(els.editorArea ? els.editorArea.innerHTML : '');
        updateStatus(count);
    }

    const handleEditorContentChange = debounce(() => {
        updateWordAndStatus();
        saveDraft();
        runStructureLint();
        renderLivePreview();
    }, DEBOUNCE_MS);

    function isEditorEmpty() {
        const raw = els.editorArea ? els.editorArea.innerHTML : '';
        return !normalizeTextValue(String(raw || '').replace(/<[^>]+>/g, ' '));
    }

    function placeCursorAtEnd(node) {
        if (!node) return;
        node.focus();
        const range = document.createRange();
        range.selectNodeContents(node);
        range.collapse(false);
        const sel = window.getSelection();
        if (!sel) return;
        sel.removeAllRanges();
        sel.addRange(range);
        saveSelection();
    }

    function insertTemplateToEditor() {
        if (!els.templateSelect || !els.editorArea) return;
        const key = String(els.templateSelect.value || '').trim();
        const template = ARTICLE_TEMPLATES[key];
        if (!template) {
            notify('Pilih template dulu.', 'warning');
            return;
        }

        const html = sanitizeHtml(template);
        if (isEditorEmpty()) {
            els.editorArea.innerHTML = html;
        } else {
            placeCursorAtEnd(els.editorArea);
            execCommand('insertHTML', `<p></p>${html}`);
        }
        notify('Template berhasil disisipkan.', 'success');
        handleEditorContentChange();
    }

    function normalizeEditorContent() {
        if (!els.editorArea) return { html: '', changes: 0 };
        const input = sanitizeHtml(els.editorArea.innerHTML || '');
        const parser = new DOMParser();
        const doc = parser.parseFromString(input, 'text/html');
        const body = doc.body;
        let changes = 0;

        const headingNodes = Array.from(body.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        let seenH2 = false;
        headingNodes.forEach((heading) => {
            const text = normalizeTextValue(heading.textContent || '');
            if (!text) {
                heading.remove();
                changes += 1;
                return;
            }

            const oldTag = heading.tagName.toLowerCase();
            let newTag = oldTag;
            if (oldTag === 'h1') newTag = 'h2';
            if (oldTag === 'h4' || oldTag === 'h5' || oldTag === 'h6') newTag = 'h3';
            if (newTag === 'h3' && !seenH2) newTag = 'h2';
            if (newTag === 'h2') seenH2 = true;

            if (newTag !== oldTag) {
                const replacement = doc.createElement(newTag);
                replacement.innerHTML = heading.innerHTML;
                heading.replaceWith(replacement);
                changes += 1;
            }
        });

        let prevEmptyParagraph = false;
        Array.from(body.querySelectorAll('p')).forEach((p) => {
            const text = normalizeTextValue(p.textContent || '');
            if (!text) {
                if (prevEmptyParagraph) {
                    p.remove();
                    changes += 1;
                    return;
                }
                prevEmptyParagraph = true;
                return;
            }
            prevEmptyParagraph = false;
        });

        Array.from(body.querySelectorAll('ul, ol')).forEach((list) => {
            Array.from(list.querySelectorAll('li')).forEach((li) => {
                if (!normalizeTextValue(li.textContent || '')) {
                    li.remove();
                    changes += 1;
                }
            });
            if (!list.querySelector('li')) {
                list.remove();
                changes += 1;
            }
        });

        Array.from(body.querySelectorAll('blockquote')).forEach((quote) => {
            if (countWords(normalizeTextValue(quote.textContent || '')) < 4) {
                quote.remove();
                changes += 1;
            }
        });

        Array.from(body.querySelectorAll('a')).forEach((link) => {
            const href = normalizeHref(link.getAttribute('href') || '');
            if (!href) {
                link.removeAttribute('href');
                link.removeAttribute('target');
                link.removeAttribute('rel');
                changes += 1;
                return;
            }
            link.setAttribute('href', href);
            if (/^https?:\/\//i.test(href)) {
                link.setAttribute('target', '_blank');
                link.setAttribute('rel', 'noopener noreferrer');
            }
        });

        // Normalize excessive whitespace in text nodes without destroying inline markup.
        Array.from(body.querySelectorAll('p, h2, h3, li, blockquote')).forEach((el) => {
            const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
            const textNodes = [];
            while (walker.nextNode()) {
                textNodes.push(walker.currentNode);
            }
            textNodes.forEach((textNode) => {
                const original = textNode.nodeValue || '';
                if (!original) return;
                let normalized = original.replace(/\s+/g, ' ');
                if (!textNode.previousSibling) normalized = normalized.replace(/^\s+/, '');
                if (!textNode.nextSibling) normalized = normalized.replace(/\s+$/, '');
                if (normalized !== original) {
                    textNode.nodeValue = normalized;
                    changes += 1;
                }
            });
        });

        return { html: body.innerHTML.trim(), changes };
    }

    function runManualNormalize() {
        if (!els.editorArea) return;
        const result = normalizeEditorContent();
        els.editorArea.innerHTML = result.html || '<p></p>';
        handleEditorContentChange();
        notify(`Konten dirapikan (${result.changes} penyesuaian).`, 'success');
    }

    function syncQualityDetailForViewport() {
        if (!els.qualityDetailsBody || !els.qualityDetailsToggle) return;
        if (isMobileView()) {
            if (!els.qualityDetailsBody.dataset.mobileInit) {
                els.qualityDetailsBody.classList.remove('is-mobile-open');
                els.qualityDetailsBody.dataset.mobileInit = '1';
            }
            const open = els.qualityDetailsBody.classList.contains('is-mobile-open');
            els.qualityDetailsToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
            return;
        }
        delete els.qualityDetailsBody.dataset.mobileInit;
        els.qualityDetailsBody.classList.remove('is-collapsed');
        els.qualityDetailsBody.classList.add('is-mobile-open');
        els.qualityDetailsToggle.setAttribute('aria-expanded', 'true');
    }

    function bindQualityTools() {
        if (els.insertTemplateBtn) {
            els.insertTemplateBtn.addEventListener('click', insertTemplateToEditor);
        }
        if (els.normalizeBtn) {
            els.normalizeBtn.addEventListener('click', runManualNormalize);
        }
        if (els.qualityDetailsToggle && els.qualityDetailsBody) {
            els.qualityDetailsToggle.addEventListener('click', () => {
                if (isMobileView()) {
                    const open = els.qualityDetailsBody.classList.toggle('is-mobile-open');
                    els.qualityDetailsToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
                    return;
                }
                const collapsed = els.qualityDetailsBody.classList.toggle('is-collapsed');
                els.qualityDetailsToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
            });
        }
        syncQualityDetailForViewport();
    }

    function closeLowGradeModal(approved) {
        if (!els.lowGradeModal) return;
        els.lowGradeModal.hidden = true;
        els.lowGradeModal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('body-no-scroll');
        if (state.lowGradeResolver) {
            const resolve = state.lowGradeResolver;
            state.lowGradeResolver = null;
            resolve(Boolean(approved));
        }
    }

    function requestLowGradeConfirmation(quality) {
        if (!els.lowGradeModal) return Promise.resolve(true);
        if (els.lowGradeGrade) els.lowGradeGrade.textContent = quality.grade;
        els.lowGradeModal.hidden = false;
        els.lowGradeModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('body-no-scroll');
        return new Promise((resolve) => {
            state.lowGradeResolver = resolve;
        });
    }

    function bindLowGradeModal() {
        if (!els.lowGradeModal) return;
        if (els.lowGradeCancelBtn) els.lowGradeCancelBtn.addEventListener('click', () => closeLowGradeModal(false));
        if (els.lowGradeConfirmBtn) els.lowGradeConfirmBtn.addEventListener('click', () => closeLowGradeModal(true));
        const backdrop = els.lowGradeModal.querySelector('[data-dismiss="true"]');
        if (backdrop) backdrop.addEventListener('click', () => closeLowGradeModal(false));
        document.addEventListener('keydown', (evt) => {
            if (evt.key === 'Escape' && !els.lowGradeModal.hidden) {
                closeLowGradeModal(false);
            }
        });
    }

    function bindCoverImageUpload() {
        if (els.inpFile) {
            els.inpFile.onchange = () => {
                const file = els.inpFile.files && els.inpFile.files[0];
                if (!file) return;
                if (file.size > 250 * 1024) {
                    notify('Ukuran gambar maksimal 250KB.', 'warning');
                    els.inpFile.value = '';
                    return;
                }
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const result = evt.target && evt.target.result ? evt.target.result : '';
                    if (!result) return;
                    if (els.inpBase64) els.inpBase64.value = result;
                    if (els.previewDiv) {
                        const img = els.previewDiv.querySelector('img');
                        if (img) img.src = result;
                        els.previewDiv.style.display = 'block';
                    }
                    inspectCoverImage(result);
                    handleEditorContentChange();
                };
                reader.readAsDataURL(file);
            };
        }

        if (els.removeImgBtn) {
            els.removeImgBtn.onclick = () => {
                if (els.inpBase64) els.inpBase64.value = '';
                if (els.inpFile) els.inpFile.value = '';
                if (els.previewDiv) els.previewDiv.style.display = 'none';
                inspectCoverImage('');
                handleEditorContentChange();
            };
        }
    }

    function bindToolbar() {
        if (!els.toolbar || !els.editorArea) return;
        try {
            document.execCommand('styleWithCSS', false, false);
        } catch {
            // unsupported on some browsers
        }

        const commandButtons = document.querySelectorAll('#editor-toolbar .tool-btn, #editor-more-tools-panel .tool-btn');
        commandButtons.forEach((btn) => {
            btn.addEventListener('mousedown', saveSelection);
            btn.addEventListener('click', (evt) => {
                evt.preventDefault();
                const action = btn.dataset.action;
                const command = btn.dataset.command;
                if (action === 'link') {
                    openLinkPopover();
                    return;
                }
                if (action === 'image') {
                    openImagePopover();
                    return;
                }
                if (action) {
                    executeToolbarAction(action);
                    return;
                }
                if (!command) return;
                execCommand(command, btn.dataset.value || null);
                handleEditorContentChange();
            });
        });

        if (els.blockSelect) {
            els.blockSelect.addEventListener('change', () => {
                const value = els.blockSelect.value || 'p';
                const block = value === 'p' ? 'P' : value.toUpperCase();
                execCommand('formatBlock', block);
                handleEditorContentChange();
            });
        }

        if (els.linkApplyBtn) els.linkApplyBtn.addEventListener('click', applyLink);
        if (els.linkCancelBtn) els.linkCancelBtn.addEventListener('click', closeAllPopovers);
        if (els.imageApplyBtn) els.imageApplyBtn.addEventListener('click', applyImageFromUrl);
        if (els.pasteCleanBtn) els.pasteCleanBtn.addEventListener('click', () => applyPendingPaste('clean'));
        if (els.pasteKeepBtn) els.pasteKeepBtn.addEventListener('click', () => applyPendingPaste('keep'));
        if (els.pasteCancelBtn) els.pasteCancelBtn.addEventListener('click', closePasteChoicePopover);
        if (els.imageUploadBtn && els.inlineImageInput) {
            els.imageUploadBtn.addEventListener('click', () => els.inlineImageInput.click());
        }

        if (els.inlineImageInput) {
            els.inlineImageInput.addEventListener('change', () => {
                const file = els.inlineImageInput.files && els.inlineImageInput.files[0];
                if (!file) return;
                handleInlineImageUpload(file);
                els.inlineImageInput.value = '';
                closeAllPopovers();
            });
        }

        els.editorArea.addEventListener('keydown', (evt) => {
            if (!(evt.ctrlKey || evt.metaKey)) return;
            const key = String(evt.key || '').toLowerCase();
            if (key === 'b') {
                evt.preventDefault();
                execCommand('bold');
                handleEditorContentChange();
                return;
            }
            if (key === 'i') {
                evt.preventDefault();
                execCommand('italic');
                handleEditorContentChange();
                return;
            }
            if (key === 'k') {
                evt.preventDefault();
                openLinkPopover();
                return;
            }
            if (key === 'z' && evt.shiftKey) {
                evt.preventDefault();
                executeToolbarAction('redo');
                return;
            }
            if (key === 'y') {
                evt.preventDefault();
                executeToolbarAction('redo');
                return;
            }
            if (key === 'z') {
                evt.preventDefault();
                executeToolbarAction('undo');
            }
        });

        els.editorArea.addEventListener('paste', (evt) => {
            const html = evt.clipboardData.getData('text/html');
            const text = evt.clipboardData.getData('text/plain');
            if (html) {
                evt.preventDefault();
                saveSelection();
                openPasteChoicePopover(html, text);
                return;
            }
            evt.preventDefault();
            execCommand('insertHTML', toSemanticParagraphs(text));
            handleEditorContentChange();
        });

        ['keyup', 'mouseup', 'focus'].forEach((name) => {
            els.editorArea.addEventListener(name, () => {
                saveSelection();
                refreshToolbarState();
            });
        });

        document.addEventListener('selectionchange', () => {
            if (document.activeElement === els.editorArea) {
                saveSelection();
                refreshToolbarState();
            }
        });

        document.addEventListener('click', (evt) => {
            const isPopover = evt.target.closest('.editor-popover');
            const isTool = evt.target.closest('.tool-btn');
            if (!isPopover && !isTool) closeAllPopovers();
        });

        document.addEventListener('keydown', (evt) => {
            if (evt.key === 'Escape') {
                closeAllPopovers();
            }
        });

        refreshToolbarState();
    }

    function bindPaneToggle() {
        if (els.tabButtons.length) {
            els.tabButtons.forEach((btn) => {
                btn.addEventListener('click', () => {
                    setPane(btn.dataset.pane);
                });
            });
        }

        if (els.previewBtn) {
            els.previewBtn.addEventListener('click', () => {
                if (isMobileView()) {
                    setPane('preview');
                    return;
                }
                if (els.livePreview) {
                    els.livePreview.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
        }

        window.addEventListener('resize', () => {
            if (!isMobileView()) setPane('write');
            syncQualityDetailForViewport();
        });
    }

    async function loadExistingArticle() {
        if (!state.id) return;
        showLoader(true);
        try {
            const data = await fetchJson(`/api/articles?id=${state.id}`);
            if (data.status !== 'success' || !data.article) throw new Error('Artikel tidak ditemukan');
            const article = data.article;
            if (els.inpId) els.inpId.value = article.id || '';
            if (els.inpTitle) els.inpTitle.value = article.title || '';
            if (els.inpAuthor) els.inpAuthor.value = article.author || '';
            if (els.inpCategory) els.inpCategory.value = article.category || 'Umum';
            if (els.editorArea) els.editorArea.innerHTML = sanitizeHtml(article.content || '');
            if (els.inpDate) {
                const date = new Date(article.publish_date || Date.now());
                date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
                els.inpDate.value = date.toISOString().slice(0, 16);
            }
            if (article.image && els.inpBase64) {
                els.inpBase64.value = article.image;
                if (els.previewDiv) {
                    const img = els.previewDiv.querySelector('img');
                    if (img) img.src = article.image;
                    els.previewDiv.style.display = 'block';
                }
                inspectCoverImage(article.image);
            }
        } finally {
            showLoader(false);
        }
    }

    function buildPayload() {
        const publishIso = els.inpDate && els.inpDate.value
            ? new Date(els.inpDate.value).toISOString()
            : new Date().toISOString();

        return {
            id: els.inpId ? els.inpId.value : '',
            title: els.inpTitle ? els.inpTitle.value.trim() : '',
            author: els.inpAuthor ? els.inpAuthor.value.trim() : '',
            category: els.inpCategory ? els.inpCategory.value : 'Umum',
            content: sanitizeHtml(els.editorArea ? els.editorArea.innerHTML : ''),
            image: els.inpBase64 ? els.inpBase64.value : '',
            publish_date: publishIso
        };
    }

    function bindFormActions() {
        if (els.cancelBtn) {
            els.cancelBtn.addEventListener('click', () => {
                window.location.href = 'admin.html#articles';
            });
        }

        if (!els.form) return;
        els.form.addEventListener('submit', async (evt) => {
            evt.preventDefault();
            runStructureLint();
            if (state.lint.errors.length > 0) {
                notify('Perbaiki error kualitas artikel sebelum publish.', 'error');
                return;
            }

            const quality = state.quality;
            const lowGrade = quality && (quality.grade === 'D' || quality.grade === 'E');
            if (lowGrade) {
                const approved = await requestLowGradeConfirmation(quality);
                if (!approved) return;
            }

            const payload = buildPayload();
            const method = payload.id ? 'PUT' : 'POST';
            const oldTop = els.saveBtn ? els.saveBtn.innerHTML : '';
            const oldBottom = els.saveBtnBottom ? els.saveBtnBottom.innerHTML : '';

            if (els.saveBtn) {
                els.saveBtn.disabled = true;
                els.saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
            }
            if (els.saveBtnBottom) {
                els.saveBtnBottom.disabled = true;
                els.saveBtnBottom.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Menyimpan...';
            }

            try {
                await apiRequest(method, '/api/articles', payload);
                clearDraft();
                notify('Artikel berhasil dipublikasikan.', 'success');
                setTimeout(() => {
                    window.location.href = 'admin.html#articles';
                }, 700);
            } catch (err) {
                notify(`Gagal simpan: ${err.message}`, 'error');
                if (els.saveBtn) {
                    els.saveBtn.disabled = false;
                    els.saveBtn.innerHTML = oldTop;
                }
                if (els.saveBtnBottom) {
                    els.saveBtnBottom.disabled = false;
                    els.saveBtnBottom.innerHTML = oldBottom;
                }
            }
        });
    }

    function bindInputObservers() {
        const fields = [els.inpTitle, els.inpAuthor, els.inpCategory, els.inpDate, els.editorArea];
        fields.forEach((field) => {
            if (!field) return;
            field.addEventListener('input', handleEditorContentChange);
            field.addEventListener('change', handleEditorContentChange);
        });
    }

    async function initialize() {
        if (!state.session) {
            window.location.href = 'admin.html';
            return;
        }

        bindPaneToggle();
        bindCoverImageUpload();
        bindToolbar();
        bindQualityTools();
        bindLowGradeModal();
        bindInputObservers();
        bindFormActions();

        if (state.id) {
            await loadExistingArticle();
            updateAutosaveLabel('Mode edit artikel');
        } else {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            if (els.inpDate) els.inpDate.value = now.toISOString().slice(0, 16);
            loadDraft();
        }

        updateWordAndStatus();
        runStructureLint();
        renderLivePreview();
        refreshToolbarState();
    }

    initialize().catch((err) => {
        notify(err.message || 'Gagal memuat editor.', 'error');
    });
})();


