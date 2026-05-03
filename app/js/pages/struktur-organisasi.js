(function () {
  const ORG_MEDIA_VERSION = '20260228-1';
  const FALLBACK_BIDANG = [
    { code: 'ketuaUmum', name: 'Ketua Umum', image_url: '', color: '#2C5F4F' },
    { code: 'sekretaris', name: 'Sekretaris', image_url: '', color: '#4A7C5D' },
    { code: 'bendahara', name: 'Bendahara', image_url: '', color: '#F39C12' },
    { code: 'perkaderan', name: 'Bidang Perkaderan', image_url: '', color: '#E74C3C' },
    { code: 'pengkajianIlmu', name: 'Bidang Pengkajian Ilmu Pengetahuan', image_url: '', color: '#3498DB' },
    { code: 'kajianDakwah', name: 'Bidang Kajian Dakwah Islam', image_url: '', color: '#9B59B6' },
    { code: 'apresiasiBudaya', name: 'Bidang Apresiasi Budaya & Olahraga', image_url: '', color: '#1ABC9C' },
    { code: 'advokasi', name: 'Bidang Advokasi', image_url: '', color: '#E67E22' },
    { code: 'ipmawati', name: 'Ipmawati', image_url: '', color: '#D946A6' }
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
    if (/^data:image\//i.test(raw)) return raw;
    const normalized = raw.startsWith('/') ? raw : `/${raw.replace(/^\.?\//, '')}`;
    if (!normalized.startsWith('/images/') && !normalized.startsWith('/data:image')) return normalized;
    
    if (normalized.startsWith('/data:image')) return normalized.substring(1);

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

    // Find the real top node (Ketua Umum)
    const top = sorted.find((item) => isTopBidang(item)) || sorted[0];
    const topId = top.id;

    // Remaining items excluding top
    const remainAfterTop = sorted.filter((item) => item.id !== topId);

    // Identify core (Sekretaris, Bendahara)
    let core = remainAfterTop
      .filter((item) => isCoreBidang(item))
      .sort((a, b) => coreBidangPriority(a) - coreBidangPriority(b));
    
    const coreIds = new Set(core.map(c => c.id));

    // Identify fields (The rest)
    let fields = remainAfterTop
      .filter((item) => !coreIds.has(item.id))
      .sort((a, b) => bidangSortPriority(a, b));

    // If core is empty, pull from fields to keep the hierarchy visual
    if (!core.length && fields.length >= 2) {
      core = [fields.shift(), fields.shift()];
    } else if (core.length === 1 && fields.length >= 1) {
      core.push(fields.shift());
    }
    
    return { top: [top], core, fields };
  }

  function renderOrgHeroSummary() {
    const totalBidang = state.bidang.length;
    const totalAnggota = state.bidang.reduce((acc, item) => acc + item.members.length, 0);
    const totalProgram = state.bidang.reduce((acc, item) => acc + item.programs.length, 0);
    if (els.heroTotalBidang) els.heroTotalBidang.textContent = String(totalBidang);
    if (els.heroTotalAnggota) els.heroTotalAnggota.textContent = String(totalAnggota);
    if (els.heroTotalProgram) els.heroTotalProgram.textContent = String(totalProgram);
  }

  function createCircleNodeCard(bidang, variant) {
    const isLeader = variant === 'leader';
    const photoUrl = normalizePath(bidang.image_url || bidang.image);
    const initials = (bidang.name || '??').split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 3);
    const hasImage = !!photoUrl;

    return `
      <div class="org-node-card-circle ${isLeader ? 'is-leader' : ''}" 
           onclick="window.viewBidangDetail('${bidang.id}')"
           style="cursor: pointer;">
        <div class="org-node-circle-media ${!hasImage ? 'no-image' : ''}">
          ${hasImage ? `<img src="${photoUrl}" alt="${bidang.name}">` : initials}
        </div>
        <div class="org-node-content-mini">
          <h3 class="org-node-name">${bidang.name}</h3>
          <div class="org-node-meta">
            <span><i class="fas fa-users"></i> ${bidang.member_count || 0}</span>
            <span><i class="fas fa-briefcase"></i> ${bidang.program_count || 0}</span>
          </div>
        </div>
      </div>
    `;
  }

  function createNodeCard(bidang, variant) {
    const initials = bidang.name.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').toUpperCase().slice(0, 3);
    const cardAria = `Buka detail ${bidang.name}, ${bidang.members.length} anggota, ${bidang.programs.length} program`;
    const nodeVariant = variant || 'field';
    const normalizedCode = normalizeCode(bidang.code);
    const defaultFocusY = resolveFieldImageFocusY(normalizedCode, false);
    
    return `
      <button type="button" class="org-node-card org-node-card-${nodeVariant}" data-bidang="${escapeHtml(bidang.code)}" aria-label="${escapeHtml(cardAria)}">
        <div class="org-node-media${bidang.image_url ? ' is-loading' : ' no-image'}" data-bidang-code="${escapeHtml(normalizedCode)}" style="--field-focus-y: ${escapeHtml(defaultFocusY)};">
          <div class="org-node-fallback">${escapeHtml(initials || 'IPM')}</div>
          ${bidang.image_url ? `<img data-src="${escapeHtml(bidang.image_url)}" alt="${escapeHtml(bidang.name)}" class="lazy-load" loading="lazy" decoding="async" fetchpriority="low">` : ''}
        </div>
        <div class="org-node-content">
          <h3 class="org-node-name">${escapeHtml(bidang.name)}</h3>
          <p class="org-node-meta">
            <span><i class="fas fa-users"></i> ${bidang.members.length}</span>
            <span><i class="fas fa-briefcase"></i> ${bidang.programs.length}</span>
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
    const hasTopAndCore = Boolean(topNode && coreNodes.length);
    const hasCoreAndFields = Boolean(coreNodes.length && fieldNodes.length);

    els.bidangGrid.innerHTML = `
      <div class="org-structure-premium">
        ${topNode ? `
          <section class="org-leadership-stage">
            ${renderStageLabel('Pimpinan Utama', 'Pengarah gerak organisasi')}
            <div class="org-leadership-track">
              ${createCircleNodeCard(topNode, 'leader')}
            </div>
          </section>
        ` : ''}

        <section class="org-core-stage">
          ${renderStageLabel('Pimpinan Inti', 'Pelaksana manajemen harian')}
          <div class="org-core-track">
            ${coreNodes.map((item) => createCircleNodeCard(item, 'core')).join('')}
          </div>
        </section>

        <section class="org-field-stage">
          ${renderStageLabel('Bidang Pelaksana', 'Pengembang program kerja')}
          <div class="org-field-grid">
            ${fieldNodes.map((item) => createNodeCard(item, 'field')).join('')}
          </div>
        </section>
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
        <div class="program-progress-wrapper" style="margin-top: 16px;">
          <div class="program-progress-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span style="font-size:12px; font-weight:600; color:var(--color-bidang, #4A7C5D);">${program.progress_percent}% Kemajuan</span>
            <span style="font-size:11px; color:#64748b; font-weight:500;">Target: ${statusText}</span>
          </div>
          <div class="program-progress-track" style="background:#e2e8f0; height:8px; border-radius:10px; overflow:hidden; position:relative;">
            <div class="program-progress-fill" style="background:var(--color-bidang, #4A7C5D); height:100%; width: ${program.progress_percent}%; transition:width 0.8s cubic-bezier(0.34, 1.56, 0.64, 1); box-shadow: 0 0 10px rgba(0,0,0,0.1);">
                <div style="position:absolute; top:0; left:0; right:0; bottom:0; background:linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent); animation: shimmer 2s infinite;"></div>
            </div>
          </div>
        </div>
      `;

      card.innerHTML = `
        <div class="program-card-head">
          <div class="program-card-name" style="font-weight:700; font-size:16px; line-height:1.4;">${escapeHtml(program.title || 'Program')}</div>
          <span class="program-card-status status-${escapeHtml(program.status)}" style="padding: 4px 10px; border-radius: 20px; font-size:11px; font-weight:600; letter-spacing:0.02em;">${statusText}</span>
        </div>
        ${pBar}
        <div class="program-card-desc" style="margin-top:12px; font-size:14px; color:#475569; line-height:1.6;">${escapeHtml(program.description || 'Deskripsi program akan ditambahkan oleh admin.')}</div>
        <div class="program-card-actions" style="display:flex; gap:10px; margin-top:20px; padding-top:16px; border-top:1px solid #f1f5f9;">
           <button type="button" class="btn btn-secondary btn-sm btn-upvote" data-program-id="${program.id}" style="border-radius:12px; background: #fff; border: 1px solid #e2e8f0; font-weight:600;">
              <i class="fas fa-thumbs-up" style="margin-right:6px;"></i> <span class="upvt-count">${program.upvote_count}</span> <span class="btn-lbl">Dukung</span>
           </button>
           <button type="button" class="btn btn-secondary btn-sm btn-comment" data-program-id="${program.id}" style="border-radius:12px; background: #fff; border: 1px solid #e2e8f0; font-weight:600;">
              <i class="fas fa-comments" style="margin-right:6px;"></i> Ruang Diskusi
           </button>
        </div>
        <div class="program-comment-section hidden" id="comments-${program.id}" style="background:#f8fafc; border-radius:12px; padding:16px; margin-top:16px; border: 1px solid #f1f5f9;"></div>
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
                
                btnUpvote.classList.add('loading');
                try {
                   const res = await fetch('/api/organization?action=toggleUpvote', {
                      method: 'POST', body: JSON.stringify({program_id: pid}),
                      headers: {'Content-Type': 'application/json', ...authHeaders}
                   });
                   const data = await res.json();
                   if (data.status === 'success') {
                      btnUpvote.querySelector('.upvt-count').textContent = data.upvote_count;
                      if (data.upvoted) {
                          btnUpvote.style.color = '#3b82f6';
                          btnUpvote.style.borderColor = '#3b82f6';
                          btnUpvote.style.background = '#eff6ff';
                          btnUpvote.querySelector('.btn-lbl').textContent = 'Didukung';
                      } else {
                          btnUpvote.style.color = '';
                          btnUpvote.style.borderColor = '';
                          btnUpvote.style.background = '';
                          btnUpvote.querySelector('.btn-lbl').textContent = 'Dukung';
                      }
                   } else {
                      alert(data.message || 'Gagal update dukungan. Pastikan Anda sudah login.');
                   }
                } catch(err){ alert('Silakan login terlebih dahulu untuk mendukung program.') }
                btnUpvote.classList.remove('loading');
            }

            const btnComment = e.target.closest('.btn-comment');
            if (btnComment) {
                const pid = Number(btnComment.dataset.programId);
                const cSec = document.getElementById('comments-'+pid);
                if (cSec.classList.contains('hidden')) {
                    cSec.classList.remove('hidden');
                    cSec.innerHTML = '<div class="loading-dots" style="padding:10px; text-align:center;"><i class="fas fa-circle-notch fa-spin"></i> Memuat diskusi...</div>';
                    try {
                        const res = await fetch('/api/organization?action=getProgramDetails&program_id='+pid);
                        const data = await res.json();
                        
                        // User Context for Moderation
                        const currentAdmin = sessionStorage.getItem('ipmquiz_admin_username') || localStorage.getItem('ipmquiz_admin_username');

                        if (data.status === 'success') {
                            let html = '<div class="comments-list" style="max-height:300px; overflow-y:auto; margin-bottom:16px;">';
                            if (!data.comments || !data.comments.length) {
                                html += `<div class="empty-comments" id="no-cmt-${pid}" style="text-align:center; padding:20px 0; color:#94a3b8;">
                                    <i class="fas fa-comments" style="font-size:24px; display:block; margin-bottom:8px; opacity:0.3;"></i>
                                    <span style="font-size:13px;">Belum ada diskusi. Yuk, berikan masukan atau pertanyaan!</span>
                                </div>`;
                            } else {
                                data.comments.forEach(c => {
                                    const isAdminMark = c.role === 'admin' ? '<span style="background:#3b82f6; color:#fff; font-size:9px; padding:2px 6px; border-radius:10px; margin-left:6px;">ADMIN</span>' : '';
                                    const canDelete = currentAdmin ? `<button class="btn-delete-comment" data-comment-id="${c.id}" style="color:#ef4444; border:none; background:transparent; font-size:11px; cursor:pointer;"><i class="fas fa-trash"></i></button>` : '';
                                    
                                    html += `
                                    <div class="comment-item" style="padding:12px 0; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between; align-items:flex-start;">
                                        <div style="flex-grow:1;">
                                            <div style="display:flex; align-items:center; margin-bottom:4px;">
                                                <strong style="font-size:13px; color:#1e293b;">${escapeHtml(c.nama_panjang || c.username)}</strong>
                                                ${isAdminMark}
                                            </div>
                                            <div style="font-size:13px; color:#475569; line-height:1.5;">${escapeHtml(c.content)}</div>
                                        </div>
                                        ${canDelete}
                                    </div>`;
                                });
                            }
                            html += '</div>';
                            html += `
                              <form class="program-comment-form" style="display:flex; gap:8px;" data-program-id="${pid}">
                                 <input type="text" class="comment-input" placeholder="Tulis masukan..." required style="flex-grow:1; font-size:13px; padding:10px 14px; border-radius:10px; border:1px solid #e2e8f0; outline:none; transition:border 0.2s;">
                                 <button type="submit" class="btn btn-primary" style="padding:0 16px; border-radius:10px; font-weight:600;"><i class="fas fa-paper-plane"></i></button>
                              </form>
                            `;
                            cSec.innerHTML = html;
                            
                            // Bind Moderation Actions
                            cSec.querySelectorAll('.btn-delete-comment').forEach(delBtn => {
                                delBtn.addEventListener('click', async () => {
                                    const cid = delBtn.dataset.commentId;
                                    if(!confirm('Hapus komentar ini?')) return;
                                    
                                    try {
                                        const adminToken = sessionStorage.getItem('ipmquiz_admin_session') || localStorage.getItem('ipmquiz_admin_session');
                                        const dr = await fetch('/api/organization?action=deleteProgramComment', {
                                            method: 'POST', body: JSON.stringify({comment_id: cid}),
                                            headers: {'Content-Type':'application/json', 'Authorization': 'Bearer ' + adminToken}
                                        });
                                        const dd = await dr.json();
                                        if(dd.status === 'success') {
                                            delBtn.closest('.comment-item').remove();
                                        } else alert(dd.message);
                                    } catch(e) { alert('Gagal menghapus komentar.') }
                                });
                            });

                            const form = cSec.querySelector('.program-comment-form');
                            form.addEventListener('submit', async (ev) => {
                                ev.preventDefault();
                                const inp = form.querySelector('.comment-input');
                                const val = inp.value.trim();
                                if(!val) return;
                                const sb = form.querySelector('button');
                                let authHeaders = {};
                                try {
                                    const token = sessionStorage.getItem('ipmquiz_user_session') || localStorage.getItem('ipmquiz_user_session') || sessionStorage.getItem('ipmquiz_admin_session') || localStorage.getItem('ipmquiz_admin_session');
                                    if (token) authHeaders['Authorization'] = 'Bearer ' + token;
                                } catch(e){}

                                sb.disabled = true;
                                sb.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                                try {
                                   const pr = await fetch('/api/organization?action=addProgramComment', {
                                      method:'POST', body: JSON.stringify({program_id: pid, content: val}),
                                      headers:{'Content-Type':'application/json', ...authHeaders}
                                   });
                                   const pd = await pr.json();
                                   if(pd.status === 'success') {
                                       const list = cSec.querySelector('.comments-list');
                                       const noCmt = document.getElementById('no-cmt-'+pid);
                                       if (noCmt) noCmt.remove();
                                       
                                       const nx = document.createElement('div');
                                       nx.className = 'comment-item';
                                       nx.setAttribute('style', 'padding:12px 0; border-bottom:1px solid #f1f5f9; animation: slideIn 0.3s ease-out;');
                                       nx.innerHTML = `
                                            <div style="display:flex; align-items:center; margin-bottom:4px;">
                                                <strong style="font-size:13px; color:#1e293b;">${escapeHtml(pd.comment.nama_panjang || pd.comment.username)}</strong>
                                                ${pd.comment.role === 'admin' ? '<span style="background:#3b82f6; color:#fff; font-size:9px; padding:2px 6px; border-radius:10px; margin-left:6px;">ADMIN</span>' : ''}
                                            </div>
                                            <div style="font-size:13px; color:#475569; line-height:1.5;">${escapeHtml(pd.comment.content)}</div>
                                       `;
                                       list.appendChild(nx);
                                       inp.value = '';
                                       list.scrollTop = list.scrollHeight;
                                   } else {
                                       alert(pd.message || 'Gagal mengirim. Pastikan Anda sudah login.');
                                   }
                                } catch(err) { alert('Silakan login terlebih dahulu untuk berkomentar.') }
                                sb.disabled = false;
                                sb.innerHTML = '<i class="fas fa-paper-plane"></i>';
                            });
                        }
                    } catch(e){ cSec.innerHTML = '<div class="small" style="color:var(--status-danger); text-align:center; padding:10px;">Gagal memuat diskusi.</div>'; }
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
