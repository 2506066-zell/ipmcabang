(function () {
  const ORG_MEDIA_VERSION = '20260228-1';
  const FALLBACK_BIDANG = [
    { code: 'ketuaUmum', name: 'Ketua Umum', image_url: '/images/bidang/anwar.jpeg', color: '#2C5F4F' },
    { code: 'sekretaris', name: 'Sekretaris', image_url: '/images/bidang/sekretaris.jpg', color: '#4A7C5D' },
    { code: 'bendahara', name: 'Bendahara', image_url: '/images/bidang/bendahara.jpg', color: '#F39C12' },
    { code: 'perkaderan', name: 'Bidang Perkaderan', image_url: '/images/bidang/pkd.png', color: '#E74C3C' },
    { code: 'pengkajianIlmu', name: 'Bidang Pengkajian Ilmu Pengetahuan', image_url: '/images/bidang/pengkajianIlmu.jpeg', color: '#3498DB' },
    { code: 'kajianDakwah', name: 'Bidang Kajian Dakwah Islam', image_url: '/images/bidang/kajianDakwah.jpg', color: '#9B59B6' },
    { code: 'apresiasiBudaya', name: 'Bidang Apresiasi Budaya & Olahraga', image_url: '/images/bidang/apresiasiBudaya.jpg', color: '#1ABC9C' },
    { code: 'advokasi', name: 'Bidang Advokasi', image_url: '/images/bidang/adv0.png', color: '#E67E22' },
    { code: 'ipmawati', name: 'Ipmawati', image_url: '/images/bidang/ipmawati.jpeg', color: '#D946A6' }
  ];

  const TOP_CODES = new Set(['ketuaumum', 'ketuautama']);
  const CORE_CODES = new Set(['sekretaris', 'bendahara']);
  const FIELD_CARD_FOCUS_MAP = Object.freeze({
    ipmawati: '60%',
    advokasi: '34%',
    perkaderan: '45%',
    pengkajianilmu: '38%'
  });
  const FIELD_CARD_FOCUS_DEFAULTS = Object.freeze({
    portrait: '30%',
    landscape: '50%'
  });

  const state = {
    bidang: [],
    currentBidangCode: '',
    currentSegment: 'anggota',
    lastFocusedNode: null,
    deepLinkHandled: false
  };

  const els = {};

  function byId(id) {
    return document.getElementById(id);
  }

  const MISSING_IMAGES = new Set([
    '/images/bidang/umum.jpeg',
    '/images/bidang/sekretaris.jpg',
    '/images/bidang/bendahara.jpg',
    '/images/bidang/kajianDakwah.jpg',
    '/images/bidang/apresiasiBudaya.jpg',
    '/images/bidang/advokasi.jpeg'
  ]);
  function normalizePath(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    const normalized = raw.startsWith('/') ? raw : `/${raw.replace(/^\.?\//, '')}`;
    
    if (MISSING_IMAGES.has(normalized)) return '';
    
    if (!normalized.startsWith('/images/')) return normalized;

    const hashIndex = normalized.indexOf('#');
    const pathWithQuery = hashIndex >= 0 ? normalized.slice(0, hashIndex) : normalized;
    const hash = hashIndex >= 0 ? normalized.slice(hashIndex) : '';
    const [pathname, query = ''] = pathWithQuery.split('?');
    const params = new URLSearchParams(query);
    params.set('v', ORG_MEDIA_VERSION);
    const qs = params.toString();
    return `${pathname}${qs ? `?${qs}` : ''}${hash}`;
  }

  function normalizeCode(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
  }

  function normalizeFocusPercent(value, fallback) {
    const raw = String(value || '').trim();
    const num = Number.parseFloat(raw.replace('%', ''));
    if (!Number.isFinite(num)) return fallback;
    const clamped = Math.min(100, Math.max(0, num));
    return `${clamped}%`;
  }

  function resolveFieldImageFocusY(code, isPortrait) {
    const normalizedCode = normalizeCode(code);
    const defaultFocus = isPortrait
      ? FIELD_CARD_FOCUS_DEFAULTS.portrait
      : FIELD_CARD_FOCUS_DEFAULTS.landscape;
    const fromMap = FIELD_CARD_FOCUS_MAP[normalizedCode];
    return normalizeFocusPercent(fromMap, defaultFocus);
  }

  function isTopBidang(item) {
    const code = normalizeCode(item?.code);
    const name = normalizeCode(item?.name);
    return TOP_CODES.has(code) || code.includes('ketuaumum') || name.includes('ketuaumum');
  }

  function isCoreBidang(item) {
    const code = normalizeCode(item?.code);
    const name = normalizeCode(item?.name);
    return CORE_CODES.has(code)
      || code.includes('sekretaris')
      || code.includes('bendahara')
      || name.includes('sekretaris')
      || name.includes('bendahara');
  }

  function coreBidangPriority(item) {
    const code = normalizeCode(item?.code);
    const name = normalizeCode(item?.name);
    const signature = `${code} ${name}`;
    if (signature.includes('sekretaris')) return 10;
    if (signature.includes('bendahara')) return 20;
    return 100;
  }

  function bidangSortPriority(a, b) {
    return a.sort_order - b.sort_order || a.id - b.id;
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function normalizeRole(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isLeadershipRole(roleTitle) {
    const role = normalizeRole(roleTitle);
    if (!role) return false;
    return [
      'ketua umum',
      'ketua bidang',
      'ketua',
      'sekretaris bidang',
      'sekretaris',
      'bendahara umum',
      'bendahara i',
      'bendahara',
      'koordinator',
      'wakil ketua'
    ].some((keyword) => role.includes(keyword));
  }

  function leadershipPriority(roleTitle) {
    const role = normalizeRole(roleTitle);
    const rankMap = [
      ['ketua umum', 10],
      ['ketua bidang', 20],
      ['ketua', 30],
      ['sekretaris bidang', 40],
      ['sekretaris', 50],
      ['bendahara umum', 60],
      ['bendahara i', 70],
      ['bendahara', 80],
      ['koordinator', 90],
      ['wakil ketua', 100]
    ];
    for (let i = 0; i < rankMap.length; i += 1) {
      const [keyword, rank] = rankMap[i];
      if (role.includes(keyword)) return rank;
    }
    return isLeadershipRole(roleTitle) ? 500 : 1000;
  }

  function normalizeMember(raw, idx) {
    return {
      id: Number(raw?.id || 0) || idx + 1,
      full_name: String(raw?.full_name || raw?.name || '').trim(),
      role_title: String(raw?.role_title || raw?.role || '').trim(),
      quote: String(raw?.quote || '').trim(),
      photo_url: normalizePath(raw?.photo_url || raw?.photo || ''),
      instagram_url: String(raw?.instagram_url || raw?.instagram || '').trim(),
      sort_order: Number(raw?.sort_order || idx + 1) || idx + 1
    };
  }

  function normalizeProgram(raw, idx) {
    const statusRaw = String(raw?.status || '').trim().toLowerCase();
    const status = statusRaw === 'terlaksana' || statusRaw === 'rencana' ? statusRaw : 'draft';
    return {
      id: Number(raw?.id || 0) || idx + 1,
      title: String(raw?.title || raw?.name || '').trim(),
      description: String(raw?.description || raw?.desc || '').trim(),
      status,
      progress_percent: Number(raw?.progress_percent || 0),
      upvote_count: Number(raw?.upvote_count || 0),
      sort_order: Number(raw?.sort_order || idx + 1) || idx + 1
    };
  }

  function normalizeBidang(raw, idx) {
    const members = Array.isArray(raw?.members) ? raw.members : [];
    const programs = Array.isArray(raw?.programs) ? raw.programs : [];
    return {
      id: Number(raw?.id || 0) || idx + 1,
      code: String(raw?.code || raw?.id || `bidang-${idx + 1}`).trim(),
      name: String(raw?.name || 'Bidang').trim(),
      image_url: normalizePath(raw?.image_url || raw?.image || ''),
      color: String(raw?.color || '#4A7C5D').trim(),
      sort_order: Number(raw?.sort_order || idx + 1) || idx + 1,
      members: members.map(normalizeMember).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
      programs: programs.map(normalizeProgram).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
    };
  }

  function mergeMissingBidangWithFallback(list) {
    const normalizedList = Array.isArray(list) ? list : [];
    const merged = [...normalizedList];
    const existingCodes = new Set(merged.map((item) => normalizeCode(item?.code)));
    let maxId = merged.reduce((max, item) => Math.max(max, Number(item?.id || 0)), 0);

    FALLBACK_BIDANG.forEach((fallback, idx) => {
      const normalizedFallbackCode = normalizeCode(fallback?.code);
      if (!normalizedFallbackCode || existingCodes.has(normalizedFallbackCode)) return;

      maxId += 1;
      merged.push(normalizeBidang({
        ...fallback,
        id: maxId,
        sort_order: Number(fallback?.sort_order || idx + 1) || idx + 1,
        members: [],
        programs: []
      }, idx));
      existingCodes.add(normalizedFallbackCode);
    });

    return merged.sort(bidangSortPriority);
  }

  async function fetchOrganizationData() {
    try {
      const res = await fetch('/api/organization', { method: 'GET', headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.status !== 'success' || !Array.isArray(data?.bidang)) {
        throw new Error('Invalid response shape');
      }
      const fromApi = data.bidang.map(normalizeBidang).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
      const merged = mergeMissingBidangWithFallback(fromApi);
      if (merged.length !== fromApi.length) {
        console.warn('[Struktur] API bidang tidak lengkap, fallback parsial ditambahkan.');
      }
      return merged;
    } catch (err) {
      console.warn('[Struktur] fallback data used:', err?.message || err);
      return mergeMissingBidangWithFallback([]);
    }
  }

  function getCurrentBidang() {
    return state.bidang.find((item) => item.code === state.currentBidangCode) || null;
  }

  function findBidangByProgramId(programId) {
    const pid = Number(programId || 0);
    if (!pid) return null;
    return state.bidang.find((item) => Array.isArray(item.programs) && item.programs.some((program) => Number(program.id) === pid)) || null;
  }

  function prefillFeedbackForProgram(bidang, program) {
    if (!program) return;
    if (els.orgFeedbackPanel) els.orgFeedbackPanel.hidden = false;
    if (els.orgFeedbackToggleBtn) els.orgFeedbackToggleBtn.setAttribute('aria-expanded', 'true');
    if (els.orgFeedbackSubject && !String(els.orgFeedbackSubject.value || '').trim()) {
      els.orgFeedbackSubject.value = `Evaluasi program kerja: ${program.title}`;
    }
    if (els.orgFeedbackMessage && !String(els.orgFeedbackMessage.value || '').trim()) {
      const bidangName = bidang?.name || 'bidang terkait';
      els.orgFeedbackMessage.value = `Saya ingin memberi masukan untuk program "${program.title}" di ${bidangName}.\n\nYang perlu dikritisi / diperbaiki:\n- \n\nSaran saya:\n- `;
    }
    if (els.orgFeedbackMessage && typeof els.orgFeedbackMessage.focus === 'function') {
      els.orgFeedbackMessage.focus();
    }
  }

  function openProgramEngagement(programId, focusMode) {
    const pid = Number(programId || 0);
    if (!pid || !els.programList) return;
    const btnComment = els.programList.querySelector(`.btn-comment[data-program-id="${pid}"]`);
    if (btnComment) btnComment.click();

    if (focusMode === 'feedback') {
      const bidang = getCurrentBidang();
      const program = bidang?.programs?.find((item) => Number(item.id) === pid) || null;
      prefillFeedbackForProgram(bidang, program);
      if (els.orgFeedbackSection) els.orgFeedbackSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const commentsBox = document.getElementById(`comments-${pid}`);
    if (commentsBox) {
      setTimeout(() => {
        commentsBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const input = commentsBox.querySelector('.comment-input');
        if (input && typeof input.focus === 'function') input.focus();
      }, 240);
    }
  }

  function applyDeepLinkState() {
    if (state.deepLinkHandled) return;
    const params = new URLSearchParams(window.location.search || '');
    const bidangCode = String(params.get('bidang') || '').trim();
    const focusSegment = String(params.get('segment') || '').trim().toLowerCase();
    const focusMode = String(params.get('focus') || '').trim().toLowerCase();
    const programId = Number(params.get('program') || 0);

    let bidang = bidangCode ? state.bidang.find((item) => item.code === bidangCode) : null;
    if (!bidang && programId) bidang = findBidangByProgramId(programId);
    if (!bidang) return;

    state.deepLinkHandled = true;
    showDetail(bidang.code, null);
    if (focusSegment === 'program' || programId) setDetailSegment('program');
    if (programId) {
      setTimeout(() => {
        openProgramEngagement(programId, focusMode === 'feedback' ? 'feedback' : 'discussion');
      }, 220);
    }
  }

  function getStoredUsername() {
    const keys = ['ipmquiz_user_username', 'ipmquiz_admin_username'];
    for (let i = 0; i < keys.length; i += 1) {
      const key = keys[i];
      const fromSession = String(sessionStorage.getItem(key) || '').trim();
      if (fromSession) return fromSession;
      const fromLocal = String(localStorage.getItem(key) || '').trim();
      if (fromLocal) return fromLocal;
    }
    return '';
  }

  function hideLoadingOverlay() {
    if (!els.loadingOverlay) return;
    els.loadingOverlay.classList.add('hidden');
    els.loadingOverlay.style.display = 'none';
  }

  function applyFieldCardImageOrientation(img) {
    if (!img) return;
    const media = img.closest('.org-node-card-field .org-node-media');
    if (!media) return;
    const width = Number(img.naturalWidth || 0);
    const height = Number(img.naturalHeight || 0);
    const isPortrait = width > 0 && height > width;
    media.classList.toggle('is-portrait', isPortrait);
    const bidangCode = String(media.dataset.bidangCode || '').trim();
    media.style.setProperty('--field-focus-y', resolveFieldImageFocusY(bidangCode, isPortrait));
  }

  function setImageContainerState(img, stateName) {
    if (!img) return;
    const media = img.closest('.org-node-media, .anggota-card-photo');
    if (!media) return;

    media.classList.remove('is-loading', 'is-loaded');
    if (stateName === 'loading') media.classList.add('is-loading');
    if (stateName === 'loaded') media.classList.add('is-loaded');
  }

  function setupLazyLoading() {
    const lazyImages = document.querySelectorAll('.lazy-load[data-src]');
    const handleImageLoaded = (img) => {
      if (!img) return;
      setImageContainerState(img, 'loaded');
      applyFieldCardImageOrientation(img);
    };

    const queueImageReadyCheck = (img) => {
      if (!img) return;
      if (img.complete && Number(img.naturalWidth || 0) > 0) {
        handleImageLoaded(img);
        return;
      }
      img.addEventListener('load', () => {
        handleImageLoaded(img);
      }, { once: true });
    };

    lazyImages.forEach((img) => {
      setImageContainerState(img, 'loading');
      img.addEventListener('error', () => {
        const media = img.closest('.org-node-media, .anggota-card-photo');
        if (media) {
          media.classList.remove('is-loading', 'is-loaded');
          media.classList.add('no-image');
        }
        const fieldMedia = img.closest('.org-node-card-field .org-node-media');
        if (fieldMedia) fieldMedia.classList.remove('is-portrait');
      }, { once: true });
    });

    if (!lazyImages.length || !('IntersectionObserver' in window)) {
      lazyImages.forEach((img) => {
        img.loading = 'lazy';
        img.decoding = 'async';
        if (img.dataset.src) img.src = img.dataset.src;
        img.classList.remove('lazy-load');
        img.removeAttribute('data-src');
        queueImageReadyCheck(img);
      });
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const image = entry.target;
        image.loading = 'lazy';
        image.decoding = 'async';
        if (image.dataset.src) image.src = image.dataset.src;
        queueImageReadyCheck(image);
        image.classList.remove('lazy-load');
        image.removeAttribute('data-src');
        observer.unobserve(image);
      });
    });
    lazyImages.forEach((image) => observer.observe(image));
  }

  function classifyBidangTiers() {
    const sorted = [...state.bidang];
    if (!sorted.length) return { top: [], core: [], fields: [] };

    let top = sorted.find((item) => isTopBidang(item)) || sorted[0];

    const remain = sorted.filter((item) => item !== top);
    let core = remain
      .filter((item) => isCoreBidang(item))
      .sort((a, b) => coreBidangPriority(a) - coreBidangPriority(b) || bidangSortPriority(a, b));
    const fields = remain
      .filter((item) => !core.includes(item))
      .sort((a, b) => bidangSortPriority(a, b));
    if (!core.length && fields.length >= 2) {
      core = [fields.shift(), fields.shift()];
    } else if (core.length === 1 && fields.length >= 1) {
      core.push(fields.shift());
    }
    return { top: top ? [top] : [], core, fields };
  }

  function renderOrgHeroSummary() {
    const totalBidang = state.bidang.length;
    const totalAnggota = state.bidang.reduce((acc, item) => acc + item.members.length, 0);
    const totalProgram = state.bidang.reduce((acc, item) => acc + item.programs.length, 0);
    if (els.heroTotalBidang) els.heroTotalBidang.textContent = String(totalBidang);
    if (els.heroTotalAnggota) els.heroTotalAnggota.textContent = String(totalAnggota);
    if (els.heroTotalProgram) els.heroTotalProgram.textContent = String(totalProgram);
  }

  function createNodeCard(bidang, variant) {
    const initials = bidang.name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').toUpperCase().slice(0, 3);
    const cardAria = `Buka detail ${bidang.name}, ${bidang.members.length} anggota, ${bidang.programs.length} program`;
    const nodeVariant = variant || 'field';
    const normalizedCode = normalizeCode(bidang.code);
    const defaultFocusY = resolveFieldImageFocusY(normalizedCode, false);
    const variantLabel = nodeVariant === 'leader'
      ? 'Pimpinan Utama'
      : nodeVariant === 'core'
        ? 'Unsur Inti'
        : 'Bidang Pelaksana';

    return `
      <button type="button" class="org-node-card org-node-card-${nodeVariant}" data-bidang="${escapeHtml(bidang.code)}" data-bidang-code="${escapeHtml(bidang.code)}" aria-label="${escapeHtml(cardAria)}">
        <div class="org-node-media${bidang.image_url ? ' is-loading' : ' no-image'}" data-bidang-code="${escapeHtml(normalizedCode)}" style="--field-focus-y: ${escapeHtml(defaultFocusY)};">
          <div class="org-node-fallback">${escapeHtml(initials || 'IPM')}</div>
          ${bidang.image_url ? `<img data-src="${escapeHtml(bidang.image_url)}" alt="${escapeHtml(bidang.name)}" class="lazy-load" loading="lazy" decoding="async" fetchpriority="low">` : ''}
        </div>
        <div class="org-node-content">
          <span class="org-node-eyebrow">${escapeHtml(variantLabel)}</span>
          <h3 class="org-node-name">${escapeHtml(bidang.name)}</h3>
          <p class="org-node-meta">
            <span><i class="fas fa-user-group" aria-hidden="true"></i>${bidang.members.length} Anggota</span>
            <span><i class="fas fa-briefcase" aria-hidden="true"></i>${bidang.programs.length} Program</span>
          </p>
        </div>
      </button>
    `;
  }

  function renderStageLabel(title, subtitle) {
    return `
      <header class="org-stage-label">
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(subtitle)}</p>
      </header>
    `;
  }

  function renderOrgChartTiers() {
    if (!els.bidangGrid) return;
    if (!state.bidang.length) {
      els.bidangGrid.innerHTML = '<div class="org-empty-state">Data struktur organisasi belum tersedia.</div>';
      return;
    }
    const tiers = classifyBidangTiers();
    const topNode = tiers.top[0] || null;
    const coreNodes = tiers.core;
    const fieldNodes = tiers.fields;

    els.bidangGrid.innerHTML = `
      <div class="org-structure-premium">
        ${topNode ? `
          <section class="org-leadership-stage" id="stage-leadership">
            ${renderStageLabel('Pimpinan Utama', 'Pengarah gerak organisasi')}
            <div class="org-leadership-track">
              ${createNodeCard(topNode, 'leader')}
            </div>
          </section>
        ` : ''}
        ${coreNodes.length ? `
          <section class="org-core-stage" id="stage-core">
            ${renderStageLabel('Unsur Inti', 'Koordinasi utama organisasi')}
            <div class="org-core-track">
              ${coreNodes.map((item) => createNodeCard(item, 'core')).join('')}
            </div>
          </section>
        ` : ''}
        ${fieldNodes.length ? `
          <section class="org-field-stage" id="stage-fields">
            ${renderStageLabel('Bidang Pelaksana', 'Eksekusi program dan layanan kader')}
            <div class="org-field-grid">
              ${fieldNodes.map((item) => createNodeCard(item, 'field')).join('')}
            </div>
          </section>
        ` : ''}
      </div>
    `;
    
    const revealCards = document.querySelectorAll('.org-node-card');
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-active');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
      revealCards.forEach(c => observer.observe(c));
    } else {
      revealCards.forEach((card) => card.classList.add('reveal-active'));
    }

    requestAnimationFrame(() => {
      revealCards.forEach((card, index) => {
        card.style.transitionDelay = `${Math.min(index * 55, 440)}ms`;
      });
    });

    setupLazyLoading();
    setupPathInteractions();
    setTimeout(drawConnections, 300);
    setupHeroStats();
  }

  function setupHeroStats() {
    const sections = {
      heroTotalBidang: 'stage-fields',
      heroTotalAnggota: 'stage-leadership',
      heroTotalProgram: 'stage-fields'
    };
    Object.entries(sections).forEach(([id, targetId]) => {
      const el = byId(id)?.closest('.org-stat');
      if (el) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', () => {
          const target = byId(targetId);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Add a temporary highlight
            target.classList.add('section-highlight');
            setTimeout(() => target.classList.remove('section-highlight'), 2000);
          }
        });
      }
    });
  }

  function setupPathInteractions() {
    document.querySelectorAll('.org-node-card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        const code = card.dataset.bidangCode || card.dataset.bidang;
        if (!code) return;
        document.querySelectorAll(`.org-connection-path[data-from="${code}"], .org-connection-path[data-to="${code}"]`)
          .forEach(p => p.classList.add('is-highlighted'));
      });
      card.addEventListener('mouseleave', () => {
        document.querySelectorAll('.org-connection-path.is-highlighted')
          .forEach(p => p.classList.remove('is-highlighted'));
      });
    });
  }

  function drawConnections() {
    if (!els.orgChartSvg || !els.bidangGrid) return;
    const svg = els.orgChartSvg;
    svg.innerHTML = '';
    
    // Add dynamic gradient definition
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
        <linearGradient id="flowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="var(--zen-primary)" stop-opacity="0.1" />
            <stop offset="50%" stop-color="var(--zen-primary)" stop-opacity="1" />
            <stop offset="100%" stop-color="var(--zen-primary)" stop-opacity="0.1" />
        </linearGradient>
    `;
    svg.appendChild(defs);

    const containerRect = els.bidangGrid.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${containerRect.width} ${containerRect.height}`);

    const getBottomCenter = (el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2 - containerRect.left, y: r.bottom - containerRect.top };
    };

    const getTopCenter = (el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2 - containerRect.left, y: r.top - containerRect.top };
    };

    const drawPath = (start, end, fromId, toId) => {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const midY = (start.y + end.y) / 2;
        const d = `M ${start.x} ${start.y} C ${start.x} ${midY}, ${end.x} ${midY}, ${end.x} ${end.y}`;
        path.setAttribute('d', d);
        path.setAttribute('class', 'org-connection-path');
        // Let CSS handle the stroke, or override here if we want the gradient on all:
        // path.style.stroke = 'url(#flowGrad)'; 
        if (fromId) path.setAttribute('data-from', fromId);
        if (toId) path.setAttribute('data-to', toId);
        svg.appendChild(path);
    };

    const leadership = document.getElementById('stage-leadership')?.querySelector('.org-node-card');
    const coreCards = Array.from(document.getElementById('stage-core')?.querySelectorAll('.org-node-card') || []);
    const fieldCards = Array.from(document.getElementById('stage-fields')?.querySelectorAll('.org-node-card') || []);

    if (leadership && coreCards.length) {
        const start = getBottomCenter(leadership);
        const fromId = leadership.dataset.bidangCode || leadership.dataset.bidang;
        coreCards.forEach(card => {
            drawPath(start, getTopCenter(card), fromId, card.dataset.bidangCode || card.dataset.bidang);
        });
    }

    if (coreCards.length && fieldCards.length) {
        fieldCards.forEach(field => {
            const end = getTopCenter(field);
            const midCore = coreCards[Math.floor(coreCards.length / 2)];
            if (midCore) {
                drawPath(getBottomCenter(midCore), end, midCore.dataset.bidangCode || midCore.dataset.bidang, field.dataset.bidangCode || field.dataset.bidang);
            }
        });
    }
  }

  window.addEventListener('resize', () => {
    if (state.bidang.length) drawConnections();
  });

  function splitMembersByHierarchy(members) {
    const sorted = [...members].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    const leadership = sorted.filter((m) => isLeadershipRole(m.role_title)).sort((a, b) => leadershipPriority(a.role_title) - leadershipPriority(b.role_title));
    const regular = sorted.filter((m) => !isLeadershipRole(m.role_title));
    return { leadership, regular, sorted };
  }

  function buildMemberHierarchyModel(members) {
    const { leadership, regular, sorted } = splitMembersByHierarchy(members);
    const core = leadership.slice(0, 3);
    const leadershipOrbit = leadership.slice(3).map((member) => ({ member, variant: 'leadership-orbit' }));
    const regularOrbit = regular.map((member) => ({ member, variant: 'orbit' }));
    const orbit = [...leadershipOrbit, ...regularOrbit];
    return {
      leadership,
      regular,
      sorted,
      corePrimary: core[0] || null,
      coreSupport: core.slice(1),
      orbit,
      mode: leadership.length ? 'leadership' : (sorted.length ? 'team' : 'empty'),
      isCompact: orbit.length <= 2
    };
  }

  function renderMemberNode(member, variant) {
    const safeName = escapeHtml(member.full_name || 'Anggota');
    const safeRole = escapeHtml(member.role_title || 'Anggota');
    const initials = member.full_name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').toUpperCase().slice(0, 3);
    const photoMarkup = member.photo_url
      ? `<img data-src="${escapeHtml(member.photo_url)}" alt="${safeName}" class="lazy-load" loading="lazy" decoding="async" fetchpriority="low">`
      : '';

    return `
      <article class="anggota-card anggota-card-${variant || 'regular'}" data-member-id="${member.id}" tabindex="0" role="button" aria-label="Lihat detail ${safeName}">
        <div class="anggota-card-photo${member.photo_url ? ' is-loading' : ' no-image'}">
          ${photoMarkup}
          <div class="anggota-card-avatar">${escapeHtml(initials || '?')}</div>
        </div>
        <div class="anggota-card-content">
          <div class="anggota-card-name">${safeName}</div>
          <div class="anggota-card-role">${safeRole}</div>
        </div>
      </article>
    `;
  }

  function renderMemberHierarchyRing(model) {
    if (model.mode === 'empty') {
      return {
        leadershipHTML: '<div class="org-empty-state">Belum ada anggota di bidang ini.</div>',
        membersHTML: ''
      };
    }
    if (model.mode === 'team') {
      const compactClass = model.sorted.length <= 2 ? ' is-compact' : '';
      return {
        leadershipHTML: `
          <section class="hierarchy-section is-team member-hierarchy-shell">
            <header class="hierarchy-heading">
              <div class="hierarchy-title">Tim Bidang</div>
              <div class="hierarchy-meta">${model.sorted.length} anggota</div>
            </header>
            <div class="member-ring-layout member-ring-layout-team">
              <div class="member-ring-orbit${compactClass}">
                ${model.sorted.map((member) => renderMemberNode(member, 'orbit')).join('')}
              </div>
            </div>
          </section>
        `,
        membersHTML: ''
      };
    }
    const compactClass = model.isCompact ? ' is-compact' : '';
    const corePrimaryMarkup = model.corePrimary ? renderMemberNode(model.corePrimary, 'core-primary') : '';
    const coreSupportMarkup = model.coreSupport.length
      ? `<div class="member-ring-core-support">${model.coreSupport.map((member) => renderMemberNode(member, 'core-support')).join('')}</div>`
      : '';
    return {
      leadershipHTML: `
        <section class="hierarchy-section is-leadership member-hierarchy-shell">
          <header class="hierarchy-heading">
            <div class="hierarchy-title">Pimpinan Inti</div>
            <div class="hierarchy-meta">${model.leadership.length} posisi</div>
          </header>
          <div class="member-ring-layout">
            <div class="member-ring-core">
              ${corePrimaryMarkup}
              ${coreSupportMarkup}
            </div>
          </div>
        </section>
      `,
      membersHTML: `
        <section class="hierarchy-section is-regular member-hierarchy-shell">
          <header class="hierarchy-heading">
            <div class="hierarchy-title">Anggota Bidang</div>
            <div class="hierarchy-meta">${model.orbit.length} anggota</div>
          </header>
          ${model.orbit.length
        ? `<div class="member-ring-layout">
                <div class="member-ring-connector" aria-hidden="true"></div>
                <div class="member-ring-orbit${compactClass}">
                  ${model.orbit.map((node) => renderMemberNode(node.member, node.variant)).join('')}
                </div>
              </div>`
        : '<div class="org-empty-state">Belum ada anggota tambahan pada bidang ini.</div>'}
        </section>
      `
    };
  }

  function renderDetailMembers(bidang) {
    if (!els.leadershipSection || !els.membersSection) return;
    const model = buildMemberHierarchyModel(bidang.members || []);
    const ring = renderMemberHierarchyRing(model);
    els.leadershipSection.innerHTML = ring.leadershipHTML;
    els.membersSection.innerHTML = ring.membersHTML;
    setupLazyLoading();
    bindMemberCardEvents(bidang);
  }

  function renderPrograms(bidang) {
    if (!els.programList) return;
    els.programList.innerHTML = '';
    if (!bidang.programs.length) {
      els.programList.innerHTML = '<div class="org-empty-state">Program kerja belum diisi.</div>';
      return;
    }
    bidang.programs.forEach((program) => {
      const card = document.createElement('article');
      const statusText = program.status === 'terlaksana' ? 'Terlaksana' : (program.status === 'rencana' ? 'Rencana' : 'Draft');
      const progress = Math.min(100, Math.max(0, Number(program.progress_percent || 0)));
      card.className = 'program-card';
      
      const pBar = `
        <div class="program-progress-wrapper">
          <div class="program-progress-header">
            <span class="progress-label">${progress}% Kemajuan</span>
            <span class="progress-target">Target: ${statusText}</span>
          </div>
          <div class="program-progress-track">
            <div class="program-progress-fill" style="width: ${progress}%;"></div>
          </div>
        </div>
      `;

      card.innerHTML = `
        <div class="program-card-head">
          <div class="program-card-titleblock">
            <span class="program-card-kicker">Program Kerja</span>
            <div class="program-card-name">${escapeHtml(program.title || 'Program')}</div>
          </div>
          <span class="program-card-status status-${escapeHtml(program.status)}">${statusText}</span>
        </div>
        ${pBar}
        <div class="program-card-desc">${escapeHtml(program.description || 'Deskripsi program akan ditambahkan oleh admin.')}</div>
        <div class="program-card-actions">
           <button type="button" class="btn btn-secondary btn-sm btn-upvote" data-program-id="${program.id}">
              <i class="fas fa-thumbs-up"></i> <span class="upvt-count">${program.upvote_count}</span> <span class="btn-lbl">Dukung</span>
           </button>
           <button type="button" class="btn btn-secondary btn-sm btn-comment" data-program-id="${program.id}">
              <i class="fas fa-comments"></i> Ruang Diskusi
           </button>
        </div>
        <div class="program-comment-section hidden" id="comments-${program.id}"></div>
      `;
      els.programList.appendChild(card);
    });
  }

  function updateDetailSidebar(bidang) {
    if (!bidang) return;
    const leadershipCount = (bidang.members || []).filter((member) => isLeadershipRole(member.role_title)).length;
    const hasPrograms = Array.isArray(bidang.programs) && bidang.programs.length > 0;
    if (els.detailSidebarTitle) els.detailSidebarTitle.textContent = bidang.name;
    if (els.detailSidebarDescription) {
      els.detailSidebarDescription.textContent = hasPrograms
        ? 'Lihat susunan kader dan arah kerja bidang tanpa kehilangan konteks halaman.'
        : 'Susunan kader bidang ini sudah tersedia. Program kerja masih bisa ditambahkan dari panel admin.';
    }
    if (els.detailSidebarMemberCount) els.detailSidebarMemberCount.textContent = String((bidang.members || []).length);
    if (els.detailSidebarProgramCount) els.detailSidebarProgramCount.textContent = String((bidang.programs || []).length);
    if (els.detailSidebarNote) {
      els.detailSidebarNote.textContent = leadershipCount > 0
        ? `${leadershipCount} posisi inti terdeteksi. Klik kartu kader untuk membuka detail singkat di panel samping.`
        : 'Klik kartu kader untuk membuka detail singkat di panel samping tanpa menutup halaman ini.';
    }
  }

  function setDetailSegment(segment) {
    const onAnggota = segment !== 'program';
    state.currentSegment = onAnggota ? 'anggota' : 'program';
    if (els.detailSegmentAnggota) {
      els.detailSegmentAnggota.classList.toggle('active', onAnggota);
      els.detailSegmentAnggota.setAttribute('aria-selected', onAnggota ? 'true' : 'false');
    }
    if (els.detailSegmentProgram) {
      els.detailSegmentProgram.classList.toggle('active', !onAnggota);
      els.detailSegmentProgram.setAttribute('aria-selected', onAnggota ? 'false' : 'true');
    }
    if (els.detailPanelAnggota) {
      els.detailPanelAnggota.classList.toggle('active', onAnggota);
      els.detailPanelAnggota.hidden = !onAnggota;
    }
    if (els.detailPanelProgram) {
      els.detailPanelProgram.classList.toggle('active', !onAnggota);
      els.detailPanelProgram.hidden = onAnggota;
    }
    toggleFeedbackVisibility();
  }

  function showDetail(bidangCode, triggerEl) {
    const bidang = state.bidang.find((item) => item.code === bidangCode);
    if (!bidang) return;
    state.currentBidangCode = bidang.code;
    state.lastFocusedNode = triggerEl && typeof triggerEl.focus === 'function' ? triggerEl : document.activeElement;
    document.querySelectorAll('.org-node-card.is-selected').forEach((card) => card.classList.remove('is-selected'));
    if (triggerEl?.classList) triggerEl.classList.add('is-selected');
    
    if (els.viewDetail) {
        els.viewDetail.classList.remove('animate-in');
        // Force reflow
        void els.viewDetail.offsetWidth;
        els.viewDetail.classList.add('active', 'animate-in');
    }

    if (els.detailBidangTitle) els.detailBidangTitle.textContent = bidang.name;
    if (els.detailMemberCount) els.detailMemberCount.textContent = `${bidang.members.length} anggota`;
    if (els.detailProgramCount) els.detailProgramCount.textContent = `${bidang.programs.length} program`;
    updateDetailSidebar(bidang);
    renderDetailMembers(bidang);
    renderPrograms(bidang);
    setDetailSegment('anggota');

    if (els.viewDetail) {
      setTimeout(() => {
        els.viewDetail.scrollIntoView({ behavior: 'smooth', block: 'start' });
        if (els.detailBidangTitle) els.detailBidangTitle.focus();
      }, 40);
    }
  }

  function backToBidang() {
    if (els.viewDetail) {
        els.viewDetail.classList.remove('animate-in');
        setTimeout(() => els.viewDetail.classList.remove('active'), 300);
    }
    document.querySelectorAll('.org-node-card.is-selected').forEach((card) => card.classList.remove('is-selected'));
    state.currentBidangCode = '';
    state.currentSegment = 'anggota';
    toggleFeedbackVisibility();
    
    if (state.lastFocusedNode) {
        // Find the closest stage or container to scroll back to
        const stage = state.lastFocusedNode.closest('section');
        if (stage) {
            stage.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else if (els.viewBidangGrid) {
            els.viewBidangGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        setTimeout(() => {
            if (typeof state.lastFocusedNode.focus === 'function') state.lastFocusedNode.focus();
        }, 300);
    } else if (els.viewBidangGrid) {
        els.viewBidangGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function toggleFeedbackVisibility() {
    if (!els.orgFeedbackSection || !els.viewDetail) return;
    const detailOpen = els.viewDetail.classList.contains('active');
    const show = detailOpen && state.currentSegment === 'program';
    els.orgFeedbackSection.hidden = !show;
    if (!show && els.orgFeedbackPanel) {
      els.orgFeedbackPanel.hidden = true;
      if (els.orgFeedbackToggleBtn) els.orgFeedbackToggleBtn.setAttribute('aria-expanded', 'false');
    }
  }

  async function submitFeedback(event) {
    event.preventDefault();
    const message = String(els.orgFeedbackMessage?.value || '').trim();
    if (message.length < 10) {
      if (els.orgFeedbackStatus) els.orgFeedbackStatus.textContent = 'Pesan minimal 10 karakter.';
      return;
    }
    const bidang = getCurrentBidang();
    const payload = {
      source_page: 'struktur-organisasi-program-kerja',
      subject: String(els.orgFeedbackSubject?.value || '').trim(),
      sender_name: String(els.orgFeedbackName?.value || '').trim() || getStoredUsername(),
      sender_contact: String(els.orgFeedbackContact?.value || '').trim(),
      message,
      context: { bidang: bidang?.name || '', segment: state.currentSegment, page_url: window.location.href }
    };
    try {
      const res = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.status !== 'success') throw new Error(data?.message || `HTTP ${res.status}`);
      if (els.orgFeedbackMessage) els.orgFeedbackMessage.value = '';
      if (els.orgFeedbackStatus) {
        els.orgFeedbackStatus.textContent = 'Terima kasih. Pesan kamu sudah masuk ke admin.';
        els.orgFeedbackStatus.className = 'org-feedback-status success';
      }
    } catch (err) {
      if (els.orgFeedbackStatus) {
        els.orgFeedbackStatus.textContent = `Gagal kirim: ${err.message || 'error'}`;
        els.orgFeedbackStatus.className = 'org-feedback-status error';
      }
    }
  }

  function bindMemberCardEvents(currentBidang) {
    document.querySelectorAll('.anggota-card[data-member-id]').forEach((card) => {
      const openMember = () => {
        const id = Number(card.getAttribute('data-member-id') || 0);
        const member = currentBidang.members.find((m) => Number(m.id) === id);
        if (member) openAnggotaDetail(member, currentBidang);
      };
      card.addEventListener('click', openMember);
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openMember();
        }
      });
    });
  }

  function openAnggotaDetail(member, bidang) {
    if (!els.anggotaDetailOverlay) return;
    const initials = member.full_name.split(/\s+/).filter(Boolean).map((item) => item[0]).join('').toUpperCase().slice(0, 3);
    els.anggotaDetailHeader.innerHTML = '';
    els.anggotaDetailHeader.classList.remove('no-image');
    if (member.photo_url) {
      const img = document.createElement('img');
      img.src = member.photo_url;
      img.alt = `Foto ${member.full_name}`;
      img.decoding = 'async';
      img.onerror = () => {
        els.anggotaDetailHeader.innerHTML = '';
        const avatar = document.createElement('div');
        avatar.className = 'anggota-detail-avatar';
        avatar.textContent = initials || '?';
        els.anggotaDetailHeader.appendChild(avatar);
        els.anggotaDetailHeader.classList.add('no-image');
      };
      els.anggotaDetailHeader.appendChild(img);
    } else {
      const avatar = document.createElement('div');
      avatar.className = 'anggota-detail-avatar';
      avatar.textContent = initials || '?';
      els.anggotaDetailHeader.appendChild(avatar);
      els.anggotaDetailHeader.classList.add('no-image');
    }
    els.anggotaDetailName.textContent = member.full_name;
    els.anggotaDetailRole.textContent = member.role_title || 'Anggota';
    els.anggotaDetailBidang.textContent = bidang?.name || '-';
    els.anggotaDetailPosisi.textContent = member.role_title || '-';
    els.anggotaDetailQuote.style.display = member.quote ? 'block' : 'none';
    els.anggotaDetailQuote.textContent = member.quote ? `"${member.quote}"` : '';
    if (member.instagram_url) {
      els.anggotaInstagramBtn.href = member.instagram_url;
      els.anggotaDetailInstagram.style.display = 'block';
    } else {
      els.anggotaDetailInstagram.style.display = 'none';
    }
    els.anggotaDetailOverlay.classList.add('active');
    els.anggotaDetailOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    if (els.closeAnggotaDetailBtn) {
      setTimeout(() => els.closeAnggotaDetailBtn.focus(), 30);
    }
  }

  function closeAnggotaDetail() {
    if (!els.anggotaDetailOverlay) return;
    els.anggotaDetailOverlay.classList.remove('active');
    els.anggotaDetailOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function bindEvents() {
    if (els.backToGridBtn) els.backToGridBtn.addEventListener('click', backToBidang);
    if (els.detailSegmentAnggota) els.detailSegmentAnggota.addEventListener('click', () => setDetailSegment('anggota'));
    if (els.detailSegmentProgram) els.detailSegmentProgram.addEventListener('click', () => setDetailSegment('program'));
    if (els.closeAnggotaDetailBtn) els.closeAnggotaDetailBtn.addEventListener('click', closeAnggotaDetail);
    if (els.anggotaDetailOverlay) {
      els.anggotaDetailOverlay.addEventListener('click', (event) => {
        if (event.target === els.anggotaDetailOverlay) closeAnggotaDetail();
      });
    }
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && els.anggotaDetailOverlay?.classList.contains('active')) {
        closeAnggotaDetail();
      }
    });
    if (els.orgFeedbackForm) els.orgFeedbackForm.addEventListener('submit', submitFeedback);
    if (els.orgFeedbackToggleBtn) {
      els.orgFeedbackToggleBtn.addEventListener('click', () => {
        const expanded = els.orgFeedbackToggleBtn.getAttribute('aria-expanded') === 'true';
        els.orgFeedbackToggleBtn.setAttribute('aria-expanded', String(!expanded));
        if (els.orgFeedbackPanel) els.orgFeedbackPanel.hidden = expanded;
      });
    }

    if (els.bidangGrid) {
      els.bidangGrid.addEventListener('click', (e) => {
        const card = e.target.closest('.org-node-card');
        if (card) {
          const code = card.dataset.bidang || card.dataset.bidangCode;
          if (code) showDetail(code, card);
        }
      });
    }
  }

  async function init() {
    els.loadingOverlay = byId('loading-overlay');
    els.viewBidangGrid = byId('viewBidangGrid');
    els.viewDetail = byId('viewDetail');
    els.backToGridBtn = byId('backToGridBtn');
    els.detailBidangTitle = byId('detailBidangTitle');
    els.detailMemberCount = byId('detailMemberCount');
    els.heroTotalBidang = byId('heroTotalBidang');
    els.heroTotalAnggota = byId('heroTotalAnggota');
    els.heroTotalProgram = byId('heroTotalProgram');
    els.orgChartSvg = byId('orgChartSvg');
    els.bidangGrid = byId('bidangGrid');
    
    els.detailProgramCount = byId('detailProgramCount');
    els.detailSegmentAnggota = byId('detailSegmentAnggota');
    els.detailSegmentProgram = byId('detailSegmentProgram');
    els.detailPanelAnggota = byId('detailPanelAnggota');
    els.detailPanelProgram = byId('detailPanelProgram');
    els.detailSidebarTitle = byId('detailSidebarTitle');
    els.detailSidebarDescription = byId('detailSidebarDescription');
    els.detailSidebarMemberCount = byId('detailSidebarMemberCount');
    els.detailSidebarProgramCount = byId('detailSidebarProgramCount');
    els.detailSidebarNote = byId('detailSidebarNote');
    els.leadershipSection = byId('leadershipSection');
    els.membersSection = byId('membersSection');
    els.programList = byId('programList');
    els.orgFeedbackSection = byId('orgFeedbackSection');
    els.orgFeedbackForm = byId('orgFeedbackForm');
    els.orgFeedbackPanel = byId('orgFeedbackPanel');
    els.orgFeedbackToggleBtn = byId('orgFeedbackToggleBtn');
    els.orgFeedbackName = byId('orgFeedbackName');
    els.orgFeedbackContact = byId('orgFeedbackContact');
    els.orgFeedbackSubject = byId('orgFeedbackSubject');
    els.orgFeedbackMessage = byId('orgFeedbackMessage');
    els.orgFeedbackStatus = byId('orgFeedbackStatus');
    els.anggotaDetailOverlay = byId('anggotaDetailOverlay');
    els.anggotaDetailCard = byId('anggotaDetailCard');
    els.closeAnggotaDetailBtn = byId('closeAnggotaDetailBtn');
    els.anggotaDetailHeader = byId('anggotaDetailHeader');
    els.anggotaDetailName = byId('anggotaDetailName');
    els.anggotaDetailRole = byId('anggotaDetailRole');
    els.anggotaDetailBidang = byId('anggotaDetailBidang');
    els.anggotaDetailPosisi = byId('anggotaDetailPosisi');
    els.anggotaDetailQuote = byId('anggotaDetailQuote');
    els.anggotaDetailInstagram = byId('anggotaDetailInstagram');
    els.anggotaInstagramBtn = byId('anggotaInstagramBtn');

    bindEvents();
    state.bidang = await fetchOrganizationData();
    renderOrgHeroSummary();
    renderOrgChartTiers();
    toggleFeedbackVisibility();
    applyDeepLinkState();
    hideLoadingOverlay();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
