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
    lastFocusedNode: null
  };

  const els = {};

  function byId(id) {
    return document.getElementById(id);
  }

  function normalizePath(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    const normalized = raw.startsWith('/') ? raw : `/${raw.replace(/^\.?\//, '')}`;
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
    if (nodeVariant === 'leader' || nodeVariant === 'core') {
      return `
        <button type="button" class="org-node-card org-node-card-circle ${nodeVariant === 'leader' ? 'is-leader' : 'is-core'}" data-bidang="${escapeHtml(bidang.code)}" aria-label="${escapeHtml(cardAria)}">
          <div class="org-node-circle-media">
            <div class="org-node-media${bidang.image_url ? ' is-loading' : ' no-image'}">
              <div class="org-node-fallback">${escapeHtml(initials || 'IPM')}</div>
              ${bidang.image_url ? `<img data-src="${escapeHtml(bidang.image_url)}" alt="${escapeHtml(bidang.name)}" class="lazy-load" loading="lazy" decoding="async" fetchpriority="low">` : ''}
            </div>
          </div>
          <div class="org-node-content">
            <h3 class="org-node-name">${escapeHtml(bidang.name)}</h3>
            <p class="org-node-meta">${bidang.members.length} anggota &#8226; ${bidang.programs.length} program</p>
          </div>
        </button>
      `;
    }
    const normalizedCode = normalizeCode(bidang.code);
    const defaultFocusY = resolveFieldImageFocusY(normalizedCode, false);
    return `
      <button type="button" class="org-node-card org-node-card-field" data-bidang="${escapeHtml(bidang.code)}" aria-label="${escapeHtml(cardAria)}">
        <div class="org-node-media${bidang.image_url ? ' is-loading' : ' no-image'}" data-bidang-code="${escapeHtml(normalizedCode)}" style="--field-focus-y: ${escapeHtml(defaultFocusY)};">
          <div class="org-node-fallback">${escapeHtml(initials || 'IPM')}</div>
          ${bidang.image_url ? `<img data-src="${escapeHtml(bidang.image_url)}" alt="${escapeHtml(bidang.name)}" class="lazy-load" loading="lazy" decoding="async" fetchpriority="low">` : ''}
        </div>
        <div class="org-node-content">
          <h3 class="org-node-name">${escapeHtml(bidang.name)}</h3>
          <p class="org-node-meta">${bidang.members.length} anggota &#8226; ${bidang.programs.length} program</p>
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
    const hasTopAndCore = Boolean(topNode && coreNodes.length);
    const hasCoreAndFields = Boolean(coreNodes.length && fieldNodes.length);

    els.bidangGrid.innerHTML = `
      <div class="org-structure-premium">
        ${topNode ? `
          <section class="org-leadership-stage">
            ${renderStageLabel('Pimpinan Utama', 'Pengarah gerak organisasi')}
            <div class="org-leadership-track">
              ${createNodeCard(topNode, 'leader')}
            </div>
          </section>
        ` : ''}
        ${hasTopAndCore ? '<div class="org-stage-connector is-top-core" aria-hidden="true"></div>' : ''}
        ${coreNodes.length ? `
          <section class="org-core-stage">
            ${renderStageLabel('Unsur Inti', 'Koordinasi utama organisasi')}
            <div class="org-core-track">
              ${coreNodes.map((item) => createNodeCard(item, 'core')).join('')}
            </div>
          </section>
        ` : ''}
        ${hasCoreAndFields ? '<div class="org-stage-connector is-core-fields" aria-hidden="true"></div>' : ''}
        ${fieldNodes.length ? `
          <section class="org-field-stage">
            ${renderStageLabel('Bidang Pelaksana', 'Eksekusi program dan layanan kader')}
            <div class="org-field-grid">
              ${fieldNodes.map((item) => createNodeCard(item, 'field')).join('')}
            </div>
          </section>
        ` : ''}
      </div>
    `;
    setupLazyLoading();
  }

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
    const safeQuote = escapeHtml(member.quote || 'Siap berkontribusi untuk bidang ini.');
    const initials = member.full_name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').toUpperCase().slice(0, 3);
    const photoMarkup = member.photo_url
      ? `<img data-src="${escapeHtml(member.photo_url)}" alt="${safeName}" class="lazy-load" loading="lazy" decoding="async" fetchpriority="low">`
      : '';
    return `
      <article class="anggota-card member-ring-node member-ring-node-${escapeHtml(variant)}${variant.startsWith('core') || variant === 'leadership-orbit' ? ' is-leadership' : ''}" data-member-id="${member.id}" tabindex="0" role="button" aria-label="Lihat detail ${safeName}">
        <div class="anggota-card-photo${member.photo_url ? ' is-loading' : ' no-image'}">
          ${photoMarkup}
          <div class="anggota-card-avatar">${escapeHtml(initials || '?')}</div>
        </div>
        <div class="anggota-card-info">
          <div class="anggota-card-name">${safeName}</div>
          <div class="anggota-card-role">${safeRole}</div>
          <div class="anggota-card-quote">${safeQuote}</div>
          <div class="anggota-card-indicator"><i class="fas fa-chevron-right"></i></div>
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
      card.className = 'program-card';
      card.style.setProperty('--color-bidang', bidang.color || '#4A7C5D');
      const pBar = `
        <div style="background:#eee; height:6px; border-radius:3px; margin: 12px 0 4px; overflow:hidden;">
          <div style="background:var(--color-bidang, #4A7C5D); height:100%; width: ${program.progress_percent}%; transition:width 0.4s ease;"></div>
        </div>
        <div style="font-size:12px; font-weight:600; color:var(--color-bidang, #4A7C5D); margin-bottom:8px;">${program.progress_percent}% Kemajuan</div>
      `;
      card.innerHTML = `
        <div class="program-card-head">
          <div class="program-card-name">${escapeHtml(program.title || 'Program')}</div>
          <span class="program-card-status status-${escapeHtml(program.status)}">${statusText}</span>
        </div>
        ${pBar}
        <div class="program-card-desc">${escapeHtml(program.description || 'Deskripsi program akan ditambahkan oleh admin.')}</div>
        <div class="program-card-actions" style="display:flex; gap:8px; margin-top:16px;">
           <button type="button" class="btn btn-secondary btn-sm btn-upvote" data-program-id="${program.id}">
              <i class="fas fa-thumbs-up"></i> <span class="upvt-count">${program.upvote_count}</span> Dukung
           </button>
           <button type="button" class="btn btn-secondary btn-sm btn-comment" data-program-id="${program.id}">
              <i class="fas fa-comments"></i> Ruang Diskusi
           </button>
        </div>
        <div class="program-comment-section hidden mt-16" id="comments-${program.id}" style="background:#f8fafc; border-radius:8px; padding:12px; margin-top:12px;"></div>
      `;
      els.programList.appendChild(card);
    });
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
    if (els.viewBidangGrid) els.viewBidangGrid.classList.add('hidden');
    if (els.viewDetail) els.viewDetail.classList.add('active');
    if (els.detailBidangTitle) els.detailBidangTitle.textContent = bidang.name;
    if (els.detailMemberCount) els.detailMemberCount.textContent = `${bidang.members.length} anggota`;
    if (els.detailProgramCount) els.detailProgramCount.textContent = `${bidang.programs.length} program`;
    renderDetailMembers(bidang);
    renderPrograms(bidang);
    setDetailSegment('anggota');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (els.detailBidangTitle) setTimeout(() => els.detailBidangTitle.focus(), 60);
  }

  function backToBidang() {
    if (els.viewDetail) els.viewDetail.classList.remove('active');
    if (els.viewBidangGrid) els.viewBidangGrid.classList.remove('hidden');
    state.currentBidangCode = '';
    state.currentSegment = 'anggota';
    toggleFeedbackVisibility();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (state.lastFocusedNode && typeof state.lastFocusedNode.focus === 'function') {
      setTimeout(() => state.lastFocusedNode.focus(), 40);
    }
  }

  function toggleFeedbackVisibility() {
    if (!els.orgFeedbackSection || !els.viewDetail) return;
    const detailOpen = els.viewDetail.classList.contains('active');
    const show = detailOpen && state.currentSegment === 'program';
    els.orgFeedbackSection.hidden = !show;
    if (!show && els.orgFeedbackPanel) els.orgFeedbackPanel.hidden = true;
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
    document.body.style.overflow = 'hidden';
  }

  function closeAnggotaDetail() {
    if (!els.anggotaDetailOverlay) return;
    els.anggotaDetailOverlay.classList.remove('active');
    document.body.style.overflow = '';
  }

  function bindEvents() {
    if (els.backToGridBtn) els.backToGridBtn.addEventListener('click', backToBidang);
    if (els.detailSegmentAnggota) els.detailSegmentAnggota.addEventListener('click', () => setDetailSegment('anggota'));
    if (els.detailSegmentProgram) els.detailSegmentProgram.addEventListener('click', () => setDetailSegment('program'));
    if (els.orgFeedbackToggleBtn) {
      els.orgFeedbackToggleBtn.addEventListener('click', () => {
        const isOpen = String(els.orgFeedbackToggleBtn.getAttribute('aria-expanded')) === 'true';
        if (els.orgFeedbackPanel) els.orgFeedbackPanel.hidden = isOpen;
        els.orgFeedbackToggleBtn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
      });
    }
    if (els.orgFeedbackForm) els.orgFeedbackForm.addEventListener('submit', submitFeedback);
    if (els.bidangGrid) {
      els.bidangGrid.addEventListener('click', (event) => {
        const card = event.target.closest('.org-node-card[data-bidang]');
        if (!card) return;
        showDetail(String(card.getAttribute('data-bidang') || '').trim(), card);
      });
      els.bidangGrid.addEventListener('keydown', (event) => {
        const card = event.target.closest('.org-node-card[data-bidang]');
        if (!card) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          showDetail(String(card.getAttribute('data-bidang') || '').trim(), card);
        }
      });
    }

    if (els.programList) {
        els.programList.addEventListener('click', async (e) => {
            const btnUpvote = e.target.closest('.btn-upvote');
            if (btnUpvote) {
                const pid = Number(btnUpvote.dataset.programId);
                let authHeaders = {};
                try {
                    const token = sessionStorage.getItem('ipmquiz_user_session') || localStorage.getItem('ipmquiz_user_session');
                    if (token) authHeaders['Authorization'] = 'Bearer ' + token;
                } catch(e){}
                
                try {
                   const res = await fetch('/api/organization?action=toggleUpvote', {
                      method: 'POST', body: JSON.stringify({program_id: pid}),
                      headers: {'Content-Type': 'application/json', ...authHeaders}
                   });
                   const data = await res.json();
                   if (data.status === 'success') {
                      btnUpvote.querySelector('.upvt-count').textContent = data.upvote_count;
                      if (data.upvoted) btnUpvote.style.color = 'var(--text-accent)';
                      else btnUpvote.style.color = '';
                   } else {
                      alert(data.message || 'Gagal update dukungan. Pastikan Anda sudah login.');
                   }
                } catch(err){ alert('Silakan login terlebih dahulu untuk mendukung program.') }
            }

            const btnComment = e.target.closest('.btn-comment');
            if (btnComment) {
                const pid = Number(btnComment.dataset.programId);
                const cSec = document.getElementById('comments-'+pid);
                if (cSec.classList.contains('hidden')) {
                    cSec.classList.remove('hidden');
                    cSec.innerHTML = '<div class="small muted">Memuat diskusi...</div>';
                    try {
                        const res = await fetch('/api/organization?action=getProgramDetails&program_id='+pid);
                        const data = await res.json();
                        if (data.status === 'success') {
                            let html = '<div class="comments-list" style="max-height:220px;overflow-y:auto; padding-right:4px;">';
                            if (!data.comments || !data.comments.length) html += '<div class="small muted" id="no-cmt-'+pid+'" style="margin-bottom:8px">Belum ada diskusi, yuk mulai!</div>';
                            else {
                                data.comments.forEach(c => {
                                    html += `<div style="padding:10px 0; border-bottom:1px solid #e2e8f0"><strong style="font-size:13px; color:#1e293b;">${escapeHtml(c.nama_panjang || c.username)}</strong><div style="font-size:13px; color:#475569; margin-top:4px;">${escapeHtml(c.content)}</div></div>`;
                                });
                            }
                            html += '</div>';
                            html += `
                              <form class="program-comment-form mt-12" style="display:flex;gap:8px" data-program-id="${pid}">
                                 <input type="text" class="toolbar-input" placeholder="Tulis ide atau pertanyaan..." required style="flex-grow:1; font-size:13px; padding:8px 12px">
                                 <button type="submit" class="btn btn-primary btn-sm">Kirim</button>
                              </form>
                            `;
                            cSec.innerHTML = html;
                            
                            const form = cSec.querySelector('.program-comment-form');
                            form.addEventListener('submit', async (ev) => {
                                ev.preventDefault();
                                const val = form.querySelector('input').value;
                                const sb = form.querySelector('button');
                                let authHeaders = {};
                                try {
                                    const token = sessionStorage.getItem('ipmquiz_user_session') || localStorage.getItem('ipmquiz_user_session');
                                    if (token) authHeaders['Authorization'] = 'Bearer ' + token;
                                } catch(e){}

                                sb.disabled = true;
                                try {
                                   const pr = await fetch('/api/organization?action=addProgramComment', {
                                      method:'POST', body: JSON.stringify({program_id: pid, content: val}),
                                      headers:{'Content-Type':'application/json', ...authHeaders}
                                   });
                                   const pd = await pr.json();
                                   if(pd.status === 'success') {
                                       const nx = document.createElement('div');
                                       nx.setAttribute('style', 'padding:10px 0; border-bottom:1px solid #e2e8f0');
                                       nx.innerHTML = `<strong style="font-size:13px; color:#1e293b;">${escapeHtml(pd.comment.nama_panjang || pd.comment.username)}</strong><div style="font-size:13px; color:#475569; margin-top:4px;">${escapeHtml(pd.comment.content)}</div>`;
                                       cSec.querySelector('.comments-list').appendChild(nx);
                                       form.querySelector('input').value = '';
                                       const noCmt = document.getElementById('no-cmt-'+pid);
                                       if (noCmt) noCmt.style.display='none';
                                       cSec.querySelector('.comments-list').scrollTop = cSec.querySelector('.comments-list').scrollHeight;
                                   } else {
                                       alert(pd.message || 'Gagal mengirim. Pastikan Anda sudah login.');
                                   }
                                } catch(err) { alert('Silakan login terlebih dahulu.') }
                                sb.disabled = false;
                            });
                        }
                    } catch(e){ cSec.innerHTML = '<div class="small" style="color:var(--status-danger)">Gagal memuat diskusi.</div>'; }
                } else {
                    cSec.classList.add('hidden');
                }
            }
        });
    }

    if (els.anggotaDetailOverlay) els.anggotaDetailOverlay.addEventListener('click', (event) => { if (event.target === els.anggotaDetailOverlay) closeAnggotaDetail(); });
    if (els.anggotaDetailCard) els.anggotaDetailCard.addEventListener('click', (event) => event.stopPropagation());
    if (els.closeAnggotaDetailBtn) els.closeAnggotaDetailBtn.addEventListener('click', closeAnggotaDetail);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && els.anggotaDetailOverlay?.classList.contains('active')) return closeAnggotaDetail();
      if (event.key === 'Escape' && els.viewDetail?.classList.contains('active')) return backToBidang();
    });
  }

  async function init() {
    els.loadingOverlay = byId('loading-overlay');
    els.heroTotalBidang = byId('heroTotalBidang');
    els.heroTotalAnggota = byId('heroTotalAnggota');
    els.heroTotalProgram = byId('heroTotalProgram');
    els.bidangGrid = byId('bidangGrid');
    els.viewBidangGrid = byId('viewBidangGrid');
    els.viewDetail = byId('viewDetail');
    els.backToGridBtn = byId('backToGridBtn');
    els.detailBidangTitle = byId('detailBidangTitle');
    els.detailMemberCount = byId('detailMemberCount');
    els.detailProgramCount = byId('detailProgramCount');
    els.detailSegmentAnggota = byId('detailSegmentAnggota');
    els.detailSegmentProgram = byId('detailSegmentProgram');
    els.detailPanelAnggota = byId('detailPanelAnggota');
    els.detailPanelProgram = byId('detailPanelProgram');
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
    hideLoadingOverlay();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
