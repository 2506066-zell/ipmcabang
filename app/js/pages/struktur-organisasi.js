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
  const DETAIL_ANIMATION_MS = 260;

  const state = {
    bidang: [],
    hierarchy: { leader: null, core: [], divisions: [] },
    currentBidangCode: '',
    currentSegment: 'anggota',
    accordionOpenCode: '',
    lastTrigger: null
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

  function findLeaderIndex(sorted) {
    const idx = sorted.findIndex((item) => {
      const code = normalizeCode(item.code);
      return TOP_CODES.has(code) || code.includes('ketuaumum');
    });
    return idx >= 0 ? idx : 0;
  }

  function classifyHierarchy(bidangList) {
    const sorted = [...bidangList].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    if (!sorted.length) {
      return { leader: null, core: [], divisions: [] };
    }

    const leader = sorted[findLeaderIndex(sorted)] || null;
    const withoutLeader = sorted.filter((item) => item !== leader);
    const preferredCore = withoutLeader.filter((item) => {
      const code = normalizeCode(item.code);
      return CORE_CODES.has(code) || code.includes('sekretaris') || code.includes('bendahara');
    });
    const dedupCore = [];
    preferredCore.forEach((item) => {
      if (!dedupCore.includes(item)) dedupCore.push(item);
    });

    const core = dedupCore.slice(0, 2);
    if (core.length < 2) {
      withoutLeader.forEach((item) => {
        if (core.length >= 2) return;
        if (!core.includes(item)) core.push(item);
      });
    }

    const divisions = withoutLeader.filter((item) => !core.includes(item));
    return { leader, core, divisions };
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

  function getBidangDescription(bidang) {
    if (!bidang) return '';
    return `Bidang ${bidang.name} mengelola ${bidang.members.length} anggota dengan ${bidang.programs.length} program kerja aktif.`;
  }

  function isMobileViewport() {
    return window.matchMedia('(max-width: 760px)').matches;
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
        const parent = img.closest('.org-card-media, .org-accordion-media, .anggota-card-photo');
        if (parent) parent.classList.add('no-image');
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

    lazyImages.forEach((img) => observer.observe(img));
  }

  function renderOrgHeroSummary() {
    const totalBidang = state.bidang.length;
    const totalAnggota = state.bidang.reduce((acc, item) => acc + item.members.length, 0);
    const totalProgram = state.bidang.reduce((acc, item) => acc + item.programs.length, 0);

    if (els.heroTotalBidang) els.heroTotalBidang.textContent = String(totalBidang);
    if (els.heroTotalAnggota) els.heroTotalAnggota.textContent = String(totalAnggota);
    if (els.heroTotalProgram) els.heroTotalProgram.textContent = String(totalProgram);
  }

  function renderCardMedia(bidang, extraClass) {
    const initials = bidang.name
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 3);
    const hasImage = Boolean(bidang.image_url);
    return `
      <div class="org-card-media ${extraClass || ''}${hasImage ? '' : ' no-image'}">
        <div class="org-card-fallback">${escapeHtml(initials || 'IPM')}</div>
        ${hasImage ? `<img data-src="${escapeHtml(bidang.image_url)}" class="lazy-load" alt="${escapeHtml(bidang.name)}">` : ''}
      </div>
    `;
  }

  function renderTreeCard(bidang, roleClass) {
    return `
      <button type="button" class="org-tree-card ${roleClass}" data-bidang-card="${escapeHtml(bidang.code)}" aria-label="Lihat detail ${escapeHtml(bidang.name)}">
        ${renderCardMedia(bidang, '')}
        <div class="org-card-body">
          <h3 class="org-card-title">${escapeHtml(bidang.name)}</h3>
          <p class="org-card-meta">${bidang.members.length} anggota &#8226; ${bidang.programs.length} program</p>
        </div>
      </button>
    `;
  }

  function renderDesktopTree() {
    if (!els.orgTreeDesktop) return;
    const { leader, core, divisions } = state.hierarchy;
    if (!leader) {
      els.orgTreeDesktop.innerHTML = '<div class="org-empty-state">Data struktur organisasi belum tersedia.</div>';
      return;
    }

    const coreHtml = core.length
      ? `<div class="org-tree-core-row">${core.map((item) => renderTreeCard(item, 'is-core')).join('')}</div>`
      : '<div class="org-empty-state">Officer inti belum diatur.</div>';

    const divisionHtml = divisions.length
      ? `<div class="org-tree-division-grid">${divisions.map((item) => renderTreeCard(item, 'is-division')).join('')}</div>`
      : '<div class="org-empty-state">Bidang pelaksana belum diisi.</div>';

    els.orgTreeDesktop.innerHTML = `
      <section class="org-tree-section level-leader">
        <h3 class="org-level-title">Pimpinan Utama</h3>
        <div class="org-tree-leader-center">${renderTreeCard(leader, 'is-leader')}</div>
      </section>
      ${core.length ? '<div class="org-connector-line leader-to-core"></div>' : ''}
      <section class="org-tree-section level-core">
        <h3 class="org-level-title">Officer Inti</h3>
        ${coreHtml}
      </section>
      ${divisions.length ? '<div class="org-connector-line core-to-division"></div>' : ''}
      <section class="org-tree-section level-division">
        <h3 class="org-level-title">Bidang Pelaksana</h3>
        ${divisionHtml}
      </section>
    `;
  }

  function renderMobileAccordionItem(bidang, expanded) {
    return `
      <article class="org-accordion-item ${expanded ? 'is-open' : ''}">
        <button type="button" class="org-accordion-trigger" data-accordion-toggle="${escapeHtml(bidang.code)}" aria-expanded="${expanded ? 'true' : 'false'}">
          <span class="org-accordion-title">${escapeHtml(bidang.name)}</span>
          <span class="org-accordion-meta">${bidang.members.length} anggota &#8226; ${bidang.programs.length} program</span>
          <i class="fas fa-chevron-down" aria-hidden="true"></i>
        </button>
        <div class="org-accordion-panel" ${expanded ? '' : 'hidden'}>
          <div class="org-accordion-preview">
            <div class="org-accordion-media${bidang.image_url ? '' : ' no-image'}">
              <div class="org-card-fallback">${escapeHtml((bidang.name || 'IPM').slice(0, 2).toUpperCase())}</div>
              ${bidang.image_url ? `<img data-src="${escapeHtml(bidang.image_url)}" class="lazy-load" alt="${escapeHtml(bidang.name)}">` : ''}
            </div>
            <div class="org-accordion-content">
              <p>${escapeHtml(getBidangDescription(bidang))}</p>
              <button type="button" class="org-open-detail-btn" data-bidang-card="${escapeHtml(bidang.code)}">
                Lihat Detail Bidang
              </button>
            </div>
          </div>
        </div>
      </article>
    `;
  }

  function renderMobileFlow() {
    if (!els.orgFlowMobile) return;
    const { leader, core, divisions } = state.hierarchy;
    if (!leader) {
      els.orgFlowMobile.innerHTML = '<div class="org-empty-state">Data struktur organisasi belum tersedia.</div>';
      return;
    }

    const coreItems = core.map((item) => `
      <div class="org-mobile-step">
        <div class="org-mobile-connector"></div>
        ${renderTreeCard(item, 'is-core is-mobile')}
      </div>
    `).join('');

    const accordion = divisions.length
      ? divisions.map((item) => renderMobileAccordionItem(item, state.accordionOpenCode === item.code)).join('')
      : '<div class="org-empty-state">Bidang pelaksana belum diisi.</div>';

    els.orgFlowMobile.innerHTML = `
      <section class="org-mobile-stage">
        <h3 class="org-level-title">Alur Struktur Organisasi</h3>
        <div class="org-mobile-root">
          ${renderTreeCard(leader, 'is-leader is-mobile')}
        </div>
        ${coreItems}
        <div class="org-mobile-connector"></div>
        <section class="org-mobile-accordion">
          <h4 class="org-accordion-heading">Bidang Pelaksana</h4>
          ${accordion}
        </section>
      </section>
    `;
  }

  function renderOrganizationTree() {
    renderDesktopTree();
    renderMobileFlow();
    setupLazyLoading();
  }

  function splitMembersByHierarchy(members) {
    const sortedMembers = [...members].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    const leadership = sortedMembers
      .filter((member) => isLeadershipRole(member.role_title))
      .sort((a, b) => leadershipPriority(a.role_title) - leadershipPriority(b.role_title) || a.sort_order - b.sort_order || a.id - b.id);
    const regular = sortedMembers.filter((member) => !isLeadershipRole(member.role_title));
    return { leadership, regular, sortedMembers };
  }

  function createMemberCard(member, isLeadership) {
    const initials = member.full_name
      .split(/\s+/)
      .filter(Boolean)
      .map((name) => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 3);

    return `
      <article class="anggota-card${isLeadership ? ' is-leadership' : ''}" data-member-id="${member.id}" tabindex="0" role="button" aria-label="Lihat detail ${escapeHtml(member.full_name)}">
        <div class="anggota-card-photo${member.photo_url ? '' : ' no-image'}">
          <img data-src="${escapeHtml(member.photo_url)}" alt="${escapeHtml(member.full_name)}" class="lazy-load">
          <div class="anggota-card-avatar">${escapeHtml(initials || '?')}</div>
        </div>
        <div class="anggota-card-info">
          <div class="anggota-card-name">${escapeHtml(member.full_name)}</div>
          <div class="anggota-card-role">${escapeHtml(member.role_title || 'Anggota')}</div>
          <div class="anggota-card-quote">${escapeHtml(member.quote || 'Siap berkontribusi untuk bidang ini.')}</div>
          <div class="anggota-card-indicator"><i class="fas fa-chevron-right"></i></div>
        </div>
      </article>
    `;
  }

  function renderMemberSection(container, title, subtitle, members, options) {
    if (!container) return;
    const sectionClass = options?.sectionClass || '';
    const leadership = Boolean(options?.leadership);
    container.innerHTML = `
      <section class="hierarchy-section ${sectionClass}">
        <header class="hierarchy-heading">
          <div class="hierarchy-title">${escapeHtml(title)}</div>
          <div class="hierarchy-meta">${escapeHtml(subtitle)}</div>
        </header>
        <div class="anggota-grid">
          ${members.map((member) => createMemberCard(member, leadership)).join('')}
        </div>
      </section>
    `;
  }

  function bindMemberCardEvents(currentBidang) {
    const cards = document.querySelectorAll('.anggota-card[data-member-id]');
    cards.forEach((card) => {
      const openMember = () => {
        const memberId = Number(card.getAttribute('data-member-id') || 0);
        if (!memberId) return;
        const selectedMember = currentBidang.members.find((item) => Number(item.id) === memberId);
        if (!selectedMember) return;
        openAnggotaDetail(selectedMember, currentBidang);
      };

      card.addEventListener('click', openMember);
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openMember();
        }
      });
    });

    const images = document.querySelectorAll('.anggota-card-photo img');
    images.forEach((img) => {
      img.addEventListener('error', () => {
        if (img.parentElement) img.parentElement.classList.add('no-image');
      }, { once: true });
    });
  }

  function renderDetailMembers(bidang) {
    if (!els.leadershipSection || !els.membersSection) return;
    if (!bidang.members.length) {
      els.leadershipSection.innerHTML = '<div class="org-empty-state">Belum ada anggota di bidang ini.</div>';
      els.membersSection.innerHTML = '';
      return;
    }

    const { leadership, regular, sortedMembers } = splitMembersByHierarchy(bidang.members);
    if (!leadership.length) {
      renderMemberSection(
        els.leadershipSection,
        'Tim Bidang',
        `${sortedMembers.length} anggota`,
        sortedMembers,
        { sectionClass: 'is-team', leadership: false }
      );
      els.membersSection.innerHTML = '';
      bindMemberCardEvents(bidang);
      setupLazyLoading();
      return;
    }

    renderMemberSection(
      els.leadershipSection,
      'Pimpinan Inti',
      `${leadership.length} posisi`,
      leadership,
      { sectionClass: 'is-leadership', leadership: true }
    );

    if (regular.length) {
      renderMemberSection(
        els.membersSection,
        'Anggota Bidang',
        `${regular.length} anggota`,
        regular,
        { sectionClass: 'is-regular', leadership: false }
      );
    } else {
      els.membersSection.innerHTML = '<div class="org-empty-state">Belum ada anggota tambahan pada bidang ini.</div>';
    }

    bindMemberCardEvents(bidang);
    setupLazyLoading();
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
      card.innerHTML = `
        <div class="program-card-head">
          <div class="program-card-name">${escapeHtml(program.title || 'Program')}</div>
          <span class="program-card-status status-${escapeHtml(program.status)}">${statusText}</span>
        </div>
        <div class="program-card-desc">${escapeHtml(program.description || 'Deskripsi program akan ditambahkan oleh admin.')}</div>
      `;
      els.programList.appendChild(card);
    });
  }

  function syncFeedbackSubject() {
    if (!els.orgFeedbackSubject) return;
    if (String(els.orgFeedbackSubject.value || '').trim()) return;
    const activeBidang = getCurrentBidang();
    if (activeBidang?.name) {
      els.orgFeedbackSubject.value = `Masukan Program Kerja Bidang ${activeBidang.name}`;
      return;
    }
    els.orgFeedbackSubject.value = 'Masukan Program Kerja Struktur Organisasi';
  }

  function setFeedbackPanelOpen(open) {
    const shouldOpen = Boolean(open);
    if (!els.orgFeedbackPanel || !els.orgFeedbackToggleBtn) return;
    els.orgFeedbackPanel.hidden = !shouldOpen;
    els.orgFeedbackToggleBtn.setAttribute('aria-expanded', shouldOpen ? 'true' : 'false');
    els.orgFeedbackToggleBtn.classList.toggle('active', shouldOpen);
    if (shouldOpen && els.orgFeedbackMessage) {
      setTimeout(() => {
        if (document.activeElement !== els.orgFeedbackMessage) {
          els.orgFeedbackMessage.focus();
        }
      }, 30);
    }
  }

  function setFeedbackStatus(message, type) {
    if (!els.orgFeedbackStatus) return;
    const tone = type || 'muted';
    els.orgFeedbackStatus.textContent = String(message || '');
    els.orgFeedbackStatus.className = `org-feedback-status ${tone}`;
  }

  function toggleFeedbackVisibility() {
    const detailOpen = !els.divisionDetailOverlay?.hidden && els.divisionDetailOverlay?.classList.contains('active');
    if (!detailOpen) {
      if (els.orgFeedbackSection) els.orgFeedbackSection.hidden = true;
      setFeedbackPanelOpen(false);
      return;
    }
    const shouldShow = state.currentSegment === 'program';
    els.orgFeedbackSection.hidden = !shouldShow;
    if (!shouldShow) {
      setFeedbackPanelOpen(false);
      return;
    }
    syncFeedbackSubject();
  }

  async function submitFeedback(event) {
    event.preventDefault();
    const message = String(els.orgFeedbackMessage?.value || '').trim();
    if (message.length < 10) {
      setFeedbackPanelOpen(true);
      setFeedbackStatus('Pesan minimal 10 karakter.', 'error');
      return;
    }

    const activeBidang = getCurrentBidang();
    const payload = {
      source_page: 'struktur-organisasi-program-kerja',
      subject: String(els.orgFeedbackSubject?.value || '').trim(),
      sender_name: String(els.orgFeedbackName?.value || '').trim() || getStoredUsername(),
      sender_contact: String(els.orgFeedbackContact?.value || '').trim(),
      message,
      context: {
        bidang: activeBidang?.name || '',
        segment: state.currentSegment || 'anggota',
        focus: 'program-kerja',
        page_url: window.location.href,
        user_agent: navigator.userAgent
      }
    };

    if (els.orgFeedbackSubmitBtn) {
      els.orgFeedbackSubmitBtn.disabled = true;
      els.orgFeedbackSubmitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';
    }
    setFeedbackStatus('Mengirim kritik & saran...', 'muted');

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.status !== 'success') {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }
      if (els.orgFeedbackMessage) els.orgFeedbackMessage.value = '';
      if (els.orgFeedbackSubject) els.orgFeedbackSubject.value = '';
      setFeedbackStatus('Terima kasih. Pesan kamu sudah masuk ke admin.', 'success');
      syncFeedbackSubject();
    } catch (err) {
      setFeedbackStatus(`Gagal kirim: ${err.message || 'error'}`, 'error');
    } finally {
      if (els.orgFeedbackSubmitBtn) {
        els.orgFeedbackSubmitBtn.disabled = false;
        els.orgFeedbackSubmitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Kirim';
      }
    }
  }

  function setDetailSegment(segment) {
    const target = segment === 'program' ? 'program' : 'anggota';
    state.currentSegment = target;
    const onAnggota = target === 'anggota';

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

  function openDivisionDetail(bidangCode, triggerEl, preferredSegment) {
    const bidang = state.bidang.find((item) => item.code === bidangCode);
    if (!bidang || !els.divisionDetailOverlay || !els.divisionDetailShell) return;

    state.currentBidangCode = bidang.code;
    state.lastTrigger = triggerEl && typeof triggerEl.focus === 'function' ? triggerEl : document.activeElement;

    if (els.detailBidangTitle) els.detailBidangTitle.textContent = bidang.name;
    if (els.detailBidangDescription) els.detailBidangDescription.textContent = getBidangDescription(bidang);
    if (els.detailMemberCount) els.detailMemberCount.textContent = `${bidang.members.length} anggota`;
    if (els.detailProgramCount) els.detailProgramCount.textContent = `${bidang.programs.length} program`;

    renderDetailMembers(bidang);
    renderPrograms(bidang);
    syncFeedbackSubject();
    setDetailSegment(preferredSegment || 'anggota');

    const mobile = isMobileViewport();
    els.divisionDetailShell.classList.toggle('is-sheet', mobile);
    els.divisionDetailShell.classList.toggle('is-modal', !mobile);

    els.divisionDetailOverlay.hidden = false;
    requestAnimationFrame(() => {
      els.divisionDetailOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    });

    setTimeout(() => {
      if (els.detailBidangTitle) els.detailBidangTitle.focus();
    }, 70);
  }

  function closeDivisionDetail() {
    if (!els.divisionDetailOverlay || els.divisionDetailOverlay.hidden) return;
    els.divisionDetailOverlay.classList.remove('active');
    setFeedbackPanelOpen(false);
    if (els.orgFeedbackSection) els.orgFeedbackSection.hidden = true;

    window.setTimeout(() => {
      els.divisionDetailOverlay.hidden = true;
      document.body.style.overflow = '';
      state.currentBidangCode = '';
      state.currentSegment = 'anggota';
      if (state.lastTrigger && typeof state.lastTrigger.focus === 'function') {
        state.lastTrigger.focus();
      }
    }, DETAIL_ANIMATION_MS);
  }

  function toggleAccordion(code, triggerEl) {
    const target = String(code || '').trim();
    if (!target) return;
    state.accordionOpenCode = state.accordionOpenCode === target ? '' : target;
    renderMobileFlow();
    setupLazyLoading();
    if (triggerEl && typeof triggerEl.focus === 'function') triggerEl.focus();
  }

  function openAnggotaDetail(member, bidang) {
    if (!els.anggotaDetailOverlay) return;
    const initials = member.full_name
      .split(/\s+/)
      .filter(Boolean)
      .map((item) => item[0])
      .join('')
      .toUpperCase()
      .slice(0, 3);

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
    if (member.quote) {
      els.anggotaDetailQuote.textContent = `"${member.quote}"`;
      els.anggotaDetailQuote.style.display = 'block';
    } else {
      els.anggotaDetailQuote.style.display = 'none';
    }
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
    if (!els.divisionDetailOverlay || els.divisionDetailOverlay.hidden) {
      document.body.style.overflow = '';
    }
  }

  function bindHierarchyEvents() {
    const onAction = (event) => {
      const toggle = event.target.closest('[data-accordion-toggle]');
      if (toggle) {
        toggleAccordion(toggle.getAttribute('data-accordion-toggle'), toggle);
        return;
      }

      const card = event.target.closest('[data-bidang-card]');
      if (card) {
        openDivisionDetail(String(card.getAttribute('data-bidang-card') || '').trim(), card, 'anggota');
      }
    };

    if (els.orgTreeDesktop) {
      els.orgTreeDesktop.addEventListener('click', onAction);
      els.orgTreeDesktop.addEventListener('keydown', (event) => {
        const card = event.target.closest('[data-bidang-card]');
        if (!card) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openDivisionDetail(String(card.getAttribute('data-bidang-card') || '').trim(), card, 'anggota');
        }
      });
    }

    if (els.orgFlowMobile) {
      els.orgFlowMobile.addEventListener('click', onAction);
      els.orgFlowMobile.addEventListener('keydown', (event) => {
        const actionBtn = event.target.closest('[data-bidang-card], [data-accordion-toggle]');
        if (!actionBtn) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          actionBtn.click();
        }
      });
    }
  }

  function bindEvents() {
    bindHierarchyEvents();

    if (els.backToGridBtn) {
      els.backToGridBtn.addEventListener('click', closeDivisionDetail);
    }
    if (els.divisionDetailCloseBtn) {
      els.divisionDetailCloseBtn.addEventListener('click', closeDivisionDetail);
    }
    if (els.divisionDetailOverlay) {
      els.divisionDetailOverlay.addEventListener('click', (event) => {
        if (event.target === els.divisionDetailOverlay) closeDivisionDetail();
      });
    }

    if (els.detailSegmentAnggota) {
      els.detailSegmentAnggota.addEventListener('click', () => setDetailSegment('anggota'));
    }
    if (els.detailSegmentProgram) {
      els.detailSegmentProgram.addEventListener('click', () => setDetailSegment('program'));
    }

    if (els.orgFeedbackToggleBtn) {
      els.orgFeedbackToggleBtn.addEventListener('click', () => {
        const isOpen = String(els.orgFeedbackToggleBtn.getAttribute('aria-expanded')) === 'true';
        setFeedbackPanelOpen(!isOpen);
      });
    }
    if (els.orgFeedbackForm) {
      els.orgFeedbackForm.addEventListener('submit', submitFeedback);
    }

    if (els.anggotaDetailOverlay) {
      els.anggotaDetailOverlay.addEventListener('click', (event) => {
        if (event.target === els.anggotaDetailOverlay) closeAnggotaDetail();
      });
    }
    if (els.anggotaDetailCard) {
      els.anggotaDetailCard.addEventListener('click', (event) => event.stopPropagation());
    }
    if (els.closeAnggotaDetailBtn) {
      els.closeAnggotaDetailBtn.addEventListener('click', closeAnggotaDetail);
    }

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      if (els.anggotaDetailOverlay?.classList.contains('active')) {
        closeAnggotaDetail();
        return;
      }
      if (!els.divisionDetailOverlay?.hidden) {
        closeDivisionDetail();
      }
    });
  }

  async function init() {
    els.loadingOverlay = byId('loading-overlay');

    els.heroTotalBidang = byId('heroTotalBidang');
    els.heroTotalAnggota = byId('heroTotalAnggota');
    els.heroTotalProgram = byId('heroTotalProgram');

    els.viewBidangGrid = byId('viewBidangGrid');
    els.orgTreeDesktop = byId('orgTreeDesktop');
    els.orgFlowMobile = byId('orgFlowMobile');

    els.divisionDetailOverlay = byId('divisionDetailOverlay');
    els.divisionDetailShell = byId('divisionDetailShell');
    els.divisionDetailCloseBtn = byId('divisionDetailCloseBtn');

    els.viewDetail = byId('viewDetail');
    els.backToGridBtn = byId('backToGridBtn');
    els.detailBidangTitle = byId('detailBidangTitle');
    els.detailBidangDescription = byId('detailBidangDescription');
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
    els.orgFeedbackSubmitBtn = byId('orgFeedbackSubmitBtn');
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
    setFeedbackPanelOpen(false);
    toggleFeedbackVisibility();

    state.bidang = await fetchOrganizationData();
    state.hierarchy = classifyHierarchy(state.bidang);
    state.accordionOpenCode = state.hierarchy.divisions[0]?.code || '';

    renderOrgHeroSummary();
    renderOrganizationTree();
    hideLoadingOverlay();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
