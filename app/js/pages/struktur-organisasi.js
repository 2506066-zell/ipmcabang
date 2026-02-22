(function () {
  const FALLBACK_BIDANG = [
    { code: 'ketuaUmum', name: 'Ketua Umum', image_url: '/images/bidang/umum.jpeg', color: '#2C5F4F' },
    { code: 'sekretaris', name: 'Sekretaris', image_url: '/images/bidang/sekretaris.jpg', color: '#4A7C5D' },
    { code: 'bendahara', name: 'Bendahara', image_url: '/images/bidang/bendahara.jpg', color: '#F39C12' },
    { code: 'perkaderan', name: 'Bidang Perkaderan', image_url: '/images/bidang/pkd.png', color: '#E74C3C' },
    { code: 'pengkajianIlmu', name: 'Bidang Pengkajian Ilmu Pengetahuan', image_url: '/images/bidang/pengkajianIlmu.jpeg', color: '#3498DB' },
    { code: 'kajianDakwah', name: 'Bidang Kajian Dakwah Islam', image_url: '/images/bidang/kajianDakwah.jpg', color: '#9B59B6' },
    { code: 'apresiasiBudaya', name: 'Bidang Apresiasi Budaya & Olahraga', image_url: '/images/bidang/apresiasiBudaya.jpg', color: '#1ABC9C' },
    { code: 'advokasi', name: 'Bidang Advokasi', image_url: '/images/bidang/advokasi.jpeg', color: '#E67E22' },
    { code: 'ipmawati', name: 'Ipmawati', image_url: '/images/bidang/ipmawati.jpeg', color: '#D946A6' }
  ];

  const TOP_CODES = new Set(['ketuaumum', 'ketuautama']);
  const CORE_CODES = new Set(['sekretaris', 'bendahara']);

  const state = {
    bidang: [],
    currentBidangCode: '',
    currentSegment: 'anggota',
    lastFocusedNode: null,
    mobileFieldsExpanded: false,
    mobileFieldAutoExpandHandler: null,
    lastViewportMobile: false
  };

  const els = {};

  function byId(id) {
    return document.getElementById(id);
  }

  function normalizePath(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (/^https?:\/\//i.test(raw)) return raw;
    if (raw.startsWith('/')) return raw;
    return `/${raw.replace(/^\.?\//, '')}`;
  }

  function normalizeCode(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
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

  async function fetchOrganizationData() {
    try {
      const res = await fetch('/api/organization', { method: 'GET', headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.status !== 'success' || !Array.isArray(data?.bidang)) {
        throw new Error('Invalid response shape');
      }
      return data.bidang.map(normalizeBidang).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    } catch (err) {
      console.warn('[Struktur] fallback data used:', err?.message || err);
      return FALLBACK_BIDANG.map((item, idx) => normalizeBidang({ ...item, members: [], programs: [] }, idx));
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

  function setupLazyLoading() {
    const lazyImages = document.querySelectorAll('.lazy-load[data-src]');
    lazyImages.forEach((img) => {
      img.addEventListener('error', () => {
        const media = img.closest('.org-node-media, .anggota-card-photo');
        if (media) media.classList.add('no-image');
      }, { once: true });
    });

    if (!lazyImages.length || !('IntersectionObserver' in window)) {
      lazyImages.forEach((img) => {
        if (img.dataset.src) img.src = img.dataset.src;
      });
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const image = entry.target;
        if (image.dataset.src) image.src = image.dataset.src;
        image.classList.remove('lazy-load');
        observer.unobserve(image);
      });
    });
    lazyImages.forEach((image) => observer.observe(image));
  }

  function isHierarchyMobile() {
    return window.matchMedia('(max-width: 780px)').matches;
  }

  function clearMobileFieldAutoExpand() {
    if (state.mobileFieldAutoExpandHandler) {
      window.removeEventListener('scroll', state.mobileFieldAutoExpandHandler);
      state.mobileFieldAutoExpandHandler = null;
    }
  }

  function classifyBidangTiers() {
    const sorted = [...state.bidang];
    if (!sorted.length) return { top: [], core: [], fields: [] };

    let top = sorted.find((item) => {
      const code = normalizeCode(item.code);
      return TOP_CODES.has(code) || code.includes('ketuaumum');
    }) || sorted[0];

    const remain = sorted.filter((item) => item !== top);
    let core = remain.filter((item) => {
      const code = normalizeCode(item.code);
      return CORE_CODES.has(code) || code.includes('sekretaris') || code.includes('bendahara');
    });
    const fields = remain.filter((item) => !core.includes(item));
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
    const nodeVariant = variant || 'field';
    if (nodeVariant === 'leader' || nodeVariant === 'core') {
      return `
        <button type="button" class="org-node-card org-node-card-circle ${nodeVariant === 'leader' ? 'is-leader' : 'is-core'}" data-bidang="${escapeHtml(bidang.code)}" aria-label="Buka detail ${escapeHtml(bidang.name)}">
          <div class="org-node-circle-media">
            <div class="org-node-media${bidang.image_url ? '' : ' no-image'}">
              <div class="org-node-fallback">${escapeHtml(initials || 'IPM')}</div>
              ${bidang.image_url ? `<img data-src="${escapeHtml(bidang.image_url)}" alt="${escapeHtml(bidang.name)}" class="lazy-load">` : ''}
            </div>
          </div>
          <div class="org-node-content">
            <h3 class="org-node-name">${escapeHtml(bidang.name)}</h3>
            <p class="org-node-meta">${bidang.members.length} anggota &#8226; ${bidang.programs.length} program</p>
          </div>
        </button>
      `;
    }
    return `
      <button type="button" class="org-node-card org-node-card-field" data-bidang="${escapeHtml(bidang.code)}" aria-label="Buka detail ${escapeHtml(bidang.name)}">
        <div class="org-node-media${bidang.image_url ? '' : ' no-image'}">
          <div class="org-node-fallback">${escapeHtml(initials || 'IPM')}</div>
          ${bidang.image_url ? `<img data-src="${escapeHtml(bidang.image_url)}" alt="${escapeHtml(bidang.name)}" class="lazy-load">` : ''}
        </div>
        <div class="org-node-content">
          <h3 class="org-node-name">${escapeHtml(bidang.name)}</h3>
          <p class="org-node-meta">${bidang.members.length} anggota &#8226; ${bidang.programs.length} program</p>
        </div>
      </button>
    `;
  }

  function renderStageLabel(level, title, subtitle) {
    return `
      <header class="org-stage-label">
        <span class="org-stage-level">LEVEL ${escapeHtml(level)}</span>
        <h2>${escapeHtml(title)}</h2>
        <p>${escapeHtml(subtitle)}</p>
      </header>
    `;
  }

  function renderStageConnectorSVG(type) {
    if (type === 'top-core') {
      return `
        <div class="org-stage-connector is-top-core" aria-hidden="true">
          <svg class="org-connector-svg" viewBox="0 0 100 50" preserveAspectRatio="none" focusable="false">
            <path d="M50 2 C50 12,50 24,50 48"></path>
          </svg>
        </div>
      `;
    }
    return `
      <div class="org-stage-connector is-core-fields" aria-hidden="true">
        <svg class="org-connector-svg" viewBox="0 0 100 64" preserveAspectRatio="none" focusable="false">
          <path d="M50 2 C50 14,50 22,50 30"></path>
          <path d="M18 30 C30 30,40 30,50 30 C60 30,70 30,82 30"></path>
          <path d="M18 30 C18 38,18 46,18 56"></path>
          <path d="M82 30 C82 38,82 46,82 56"></path>
          <path d="M50 30 C50 40,50 50,50 62"></path>
        </svg>
      </div>
    `;
  }

  function renderOrgChartSkeleton() {
    if (!els.bidangGrid) return;
    els.bidangGrid.innerHTML = `
      <div class="org-structure-premium is-skeleton" aria-hidden="true">
        <section class="org-leadership-stage">
          <div class="org-stage-label"><span class="org-stage-level skeleton-line"></span><span class="skeleton-line skeleton-title"></span><span class="skeleton-line skeleton-subtitle"></span></div>
          <div class="org-leadership-track"><div class="org-node-skeleton-circle is-leader"></div></div>
        </section>
        <div class="org-stage-connector is-top-core skeleton-connector"></div>
        <section class="org-core-stage">
          <div class="org-core-track">
            <div class="org-node-skeleton-circle"></div>
            <div class="org-node-skeleton-circle"></div>
          </div>
        </section>
        <div class="org-stage-connector is-core-fields skeleton-connector"></div>
        <section class="org-field-stage">
          <div class="org-field-grid">
            <div class="org-node-skeleton-field"></div>
            <div class="org-node-skeleton-field"></div>
            <div class="org-node-skeleton-field"></div>
          </div>
        </section>
      </div>
    `;
  }

  function setMobileFieldsExpanded(expanded) {
    state.mobileFieldsExpanded = !!expanded;
    if (!els.bidangGrid) return;
    const stage = els.bidangGrid.querySelector('.org-field-stage');
    const grid = els.bidangGrid.querySelector('.org-field-grid');
    const toggle = els.bidangGrid.querySelector('.org-fields-toggle[data-action="toggle-fields"]');
    if (!stage || !grid || !toggle) return;
    stage.classList.toggle('is-collapsed', !expanded);
    grid.hidden = !expanded;
    toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    const label = toggle.querySelector('.org-fields-toggle-label');
    if (label) label.textContent = expanded ? 'Sembunyikan bidang' : 'Tampilkan bidang';
  }

  function setupMobileFieldAutoExpand() {
    clearMobileFieldAutoExpand();
    if (!isHierarchyMobile() || state.mobileFieldsExpanded || !els.bidangGrid) return;
    state.mobileFieldAutoExpandHandler = () => {
      if (window.scrollY < 72) return;
      setMobileFieldsExpanded(true);
      clearMobileFieldAutoExpand();
    };
    window.addEventListener('scroll', state.mobileFieldAutoExpandHandler, { passive: true });
  }

  function renderOrgChartTiers() {
    if (!els.bidangGrid) return;
    if (!state.bidang.length) {
      els.bidangGrid.innerHTML = '<div class="org-empty-state premium-empty"><i class="fas fa-sitemap" aria-hidden="true"></i><div><strong>Struktur organisasi belum tersedia</strong><span>Admin belum menambahkan data susunan bidang.</span></div></div>';
      return;
    }
    const tiers = classifyBidangTiers();
    const topNode = tiers.top[0] || null;
    const coreNodes = tiers.core;
    const fieldNodes = tiers.fields;
    const hasTopAndCore = Boolean(topNode && coreNodes.length);
    const hasCoreAndFields = Boolean(coreNodes.length && fieldNodes.length);
    const onMobile = isHierarchyMobile();
    const fieldsExpanded = !onMobile || state.mobileFieldsExpanded;

    els.bidangGrid.innerHTML = `
      <div class="org-structure-premium">
        ${topNode ? `
          <section class="org-leadership-stage">
            ${renderStageLabel('1', 'Pimpinan Utama', 'Pengarah gerak organisasi')}
            <div class="org-leadership-track">
              ${createNodeCard(topNode, 'leader')}
            </div>
          </section>
        ` : ''}
        ${hasTopAndCore ? renderStageConnectorSVG('top-core') : ''}
        ${coreNodes.length ? `
          <section class="org-core-stage">
            ${renderStageLabel('2', 'Unsur Inti', 'Koordinasi utama organisasi')}
            <div class="org-core-track">
              ${coreNodes.map((item) => createNodeCard(item, 'core')).join('')}
            </div>
          </section>
        ` : ''}
        ${hasCoreAndFields ? renderStageConnectorSVG('core-fields') : ''}
        ${fieldNodes.length ? `
          <section class="org-field-stage${fieldsExpanded ? '' : ' is-collapsed'}">
            ${renderStageLabel('3', 'Bidang Pelaksana', 'Eksekusi program dan layanan kader')}
            ${onMobile ? `<button type="button" class="org-fields-toggle" data-action="toggle-fields" aria-expanded="${fieldsExpanded ? 'true' : 'false'}"><i class="fas fa-layer-group" aria-hidden="true"></i><span class="org-fields-toggle-label">${fieldsExpanded ? 'Sembunyikan bidang' : 'Tampilkan bidang'}</span></button>` : ''}
            <div class="org-field-grid" ${fieldsExpanded ? '' : 'hidden'}>
              ${fieldNodes.map((item) => createNodeCard(item, 'field')).join('')}
            </div>
          </section>
        ` : ''}
      </div>
    `;
    setupMobileFieldAutoExpand();
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
      ? `<img data-src="${escapeHtml(member.photo_url)}" alt="${safeName}" class="lazy-load">`
      : '';
    return `
      <article class="anggota-card member-ring-node member-ring-node-${escapeHtml(variant)}${variant.startsWith('core') || variant === 'leadership-orbit' ? ' is-leadership' : ''}" data-member-id="${member.id}" tabindex="0" role="button" aria-label="Lihat detail ${safeName}">
        <div class="anggota-card-photo${member.photo_url ? '' : ' no-image'}">
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
      card.innerHTML = `<div class="program-card-head"><div class="program-card-name">${escapeHtml(program.title || 'Program')}</div><span class="program-card-status status-${escapeHtml(program.status)}">${statusText}</span></div><div class="program-card-desc">${escapeHtml(program.description || 'Deskripsi program akan ditambahkan oleh admin.')}</div>`;
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
    clearMobileFieldAutoExpand();
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
    setupMobileFieldAutoExpand();
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
        const toggle = event.target.closest('.org-fields-toggle[data-action="toggle-fields"]');
        if (toggle) {
          const expanded = String(toggle.getAttribute('aria-expanded')) === 'true';
          setMobileFieldsExpanded(!expanded);
          if (expanded) setupMobileFieldAutoExpand();
          else clearMobileFieldAutoExpand();
          return;
        }
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
    if (els.anggotaDetailOverlay) els.anggotaDetailOverlay.addEventListener('click', (event) => { if (event.target === els.anggotaDetailOverlay) closeAnggotaDetail(); });
    if (els.anggotaDetailCard) els.anggotaDetailCard.addEventListener('click', (event) => event.stopPropagation());
    if (els.closeAnggotaDetailBtn) els.closeAnggotaDetailBtn.addEventListener('click', closeAnggotaDetail);
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && els.anggotaDetailOverlay?.classList.contains('active')) return closeAnggotaDetail();
      if (event.key === 'Escape' && els.viewDetail?.classList.contains('active')) return backToBidang();
    });
    window.addEventListener('resize', () => {
      const mobileNow = isHierarchyMobile();
      if (mobileNow === state.lastViewportMobile) return;
      state.lastViewportMobile = mobileNow;
      if (!mobileNow) {
        setMobileFieldsExpanded(true);
        clearMobileFieldAutoExpand();
        return;
      }
      setMobileFieldsExpanded(false);
      setupMobileFieldAutoExpand();
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

    state.lastViewportMobile = isHierarchyMobile();
    bindEvents();
    renderOrgChartSkeleton();
    state.bidang = await fetchOrganizationData();
    renderOrgHeroSummary();
    renderOrgChartTiers();
    toggleFeedbackVisibility();
    hideLoadingOverlay();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
