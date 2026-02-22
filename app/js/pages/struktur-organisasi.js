(function () {
  const FALLBACK_BIDANG = [
    { code: 'ketuaUmum', name: 'Ketua Umum', image_url: '/images/bidang/umum.jpeg', color: '#2C5F4F' },
    { code: 'sekretaris', name: 'Sekretaris', image_url: '/images/bidang/sekretaris.jpg', color: '#4A7C5D' },
    { code: 'bendahara', name: 'Bendahara', image_url: '/images/bidang/bendahara.jpg', color: '#F39C12' },
    { code: 'perkaderan', name: 'Perkaderan', image_url: '/images/bidang/pkd.png', color: '#E74C3C' },
    { code: 'pengkajianIlmu', name: 'Pengkajian Ilmu Pengetahuan', image_url: '/images/bidang/pengkajianIlmu.jpeg', color: '#3498DB' },
    { code: 'kajianDakwah', name: 'Kajian Dakwah Islam', image_url: '/images/bidang/kajianDakwah.jpg', color: '#9B59B6' },
    { code: 'apresiasiBudaya', name: 'Apresiasi Budaya & Olahraga', image_url: '/images/bidang/apresiasiBudaya.jpg', color: '#1ABC9C' },
    { code: 'advokasi', name: 'Advokasi', image_url: '/images/bidang/advokasi.jpeg', color: '#E67E22' },
    { code: 'ipmawati', name: 'Ipmawati', image_url: '/images/bidang/ipmawati.jpeg', color: '#D946A6' }
  ];

  const state = {
    bidang: [],
    currentBidangCode: '',
    currentSegment: 'anggota'
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
      if (!data.bidang.length) throw new Error('Empty organization');
      return data.bidang.map(normalizeBidang);
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
    const lazyImages = document.querySelectorAll('.lazy-load');
    if (!lazyImages.length || !('IntersectionObserver' in window)) {
      lazyImages.forEach((img) => {
        const target = img;
        if (target.dataset.src) target.src = target.dataset.src;
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

  function createMemberCard(member, isLeadership) {
    const initials = member.full_name
      .split(/\s+/)
      .filter(Boolean)
      .map((name) => name[0])
      .join('')
      .toUpperCase()
      .slice(0, 3);

    return `
      <article class="anggota-card${isLeadership ? ' is-leadership' : ''}" data-member-id="${member.id}">
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

  function splitMembersByHierarchy(members) {
    const sortedMembers = [...members].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
    const leadership = sortedMembers
      .filter((member) => isLeadershipRole(member.role_title))
      .sort((a, b) => leadershipPriority(a.role_title) - leadershipPriority(b.role_title) || a.sort_order - b.sort_order || a.id - b.id);
    const regular = sortedMembers.filter((member) => !isLeadershipRole(member.role_title));
    return { leadership, regular, sortedMembers };
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
      card.addEventListener('click', () => {
        const memberId = Number(card.getAttribute('data-member-id') || 0);
        if (!memberId) return;
        const selectedMember = currentBidang.members.find((item) => Number(item.id) === memberId);
        if (!selectedMember) return;
        openAnggotaDetail(selectedMember, currentBidang);
      });
    });

    const images = document.querySelectorAll('.anggota-card-photo img');
    images.forEach((img) => {
      img.addEventListener('error', () => {
        if (img.parentElement) img.parentElement.classList.add('no-image');
      });
    });
  }

  function renderDetailMembers(selected) {
    if (!els.leadershipSection || !els.membersSection) return;
    if (!selected.members.length) {
      els.leadershipSection.innerHTML = '<div class="org-empty-state">Belum ada anggota di bidang ini.</div>';
      els.membersSection.innerHTML = '';
      return;
    }

    const { leadership, regular, sortedMembers } = splitMembersByHierarchy(selected.members);
    if (!leadership.length) {
      renderMemberSection(
        els.leadershipSection,
        'Tim Bidang',
        `${sortedMembers.length} anggota`,
        sortedMembers,
        { sectionClass: 'is-team', leadership: false }
      );
      els.membersSection.innerHTML = '';
      bindMemberCardEvents(selected);
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

    bindMemberCardEvents(selected);
    setupLazyLoading();
  }

  function renderPrograms(selected) {
    if (!els.programList) return;
    els.programList.innerHTML = '';
    if (!selected.programs.length) {
      els.programList.innerHTML = '<div class="org-empty-state">Program kerja belum diisi.</div>';
      return;
    }

    selected.programs.forEach((program) => {
      const card = document.createElement('article');
      const statusText = program.status === 'terlaksana' ? 'Terlaksana' : (program.status === 'rencana' ? 'Rencana' : 'Draft');
      card.className = 'program-card';
      card.style.setProperty('--color-bidang', selected.color || '#4A7C5D');
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

  function renderBidangGrid() {
    if (!els.bidangGrid) return;
    els.bidangGrid.innerHTML = '';
    state.bidang.forEach((bidang) => {
      const card = document.createElement('article');
      card.className = 'bidang-card';
      card.innerHTML = `
        <div class="bidang-card-header">
          <img src="${escapeHtml(bidang.image_url)}" alt="${escapeHtml(bidang.name)}" loading="lazy">
        </div>
        <div class="bidang-card-content">
          <div class="bidang-card-name">${escapeHtml(bidang.name)}</div>
          <div class="bidang-card-meta">${bidang.members.length} anggota • ${bidang.programs.length} program</div>
          <div class="bidang-card-actions">
            <button class="btn-card btn-card-anggota" type="button" data-action="anggota" data-bidang="${escapeHtml(bidang.code)}">
              <i class="fas fa-users"></i> Susunan
            </button>
            <button class="btn-card btn-card-program" type="button" data-action="program" data-bidang="${escapeHtml(bidang.code)}">
              <i class="fas fa-tasks"></i> Program
            </button>
          </div>
        </div>
      `;
      els.bidangGrid.appendChild(card);
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
  }

  function showDetail(bidangCode, segment) {
    state.currentBidangCode = bidangCode;
    const selected = getCurrentBidang();
    if (!selected) return;

    if (els.viewBidangGrid) els.viewBidangGrid.classList.add('hidden');
    if (els.viewDetail) els.viewDetail.classList.add('active');

    if (els.detailBidangTitle) els.detailBidangTitle.textContent = selected.name;
    if (els.detailMemberCount) els.detailMemberCount.textContent = `${selected.members.length} anggota`;
    if (els.detailProgramCount) els.detailProgramCount.textContent = `${selected.programs.length} program`;

    renderDetailMembers(selected);
    renderPrograms(selected);
    syncFeedbackSubject();
    setDetailSegment(segment || 'anggota');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function backToBidang() {
    if (els.viewDetail) els.viewDetail.classList.remove('active');
    if (els.viewBidangGrid) els.viewBidangGrid.classList.remove('hidden');
    state.currentBidangCode = '';
    state.currentSegment = 'anggota';
    syncFeedbackSubject();
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
    els.anggotaDetailRole.textContent = member.role_title;
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
    document.body.style.overflow = '';
  }

  function bindEvents() {
    if (els.backToGridBtn) {
      els.backToGridBtn.addEventListener('click', backToBidang);
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

    if (els.bidangGrid) {
      els.bidangGrid.addEventListener('click', (event) => {
        const btn = event.target.closest('button[data-action]');
        if (!btn) return;
        const bidangCode = String(btn.getAttribute('data-bidang') || '').trim();
        const action = String(btn.getAttribute('data-action') || '').trim();
        if (!bidangCode) return;
        showDetail(bidangCode, action === 'program' ? 'program' : 'anggota');
      });
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
      if (event.key === 'Escape' && els.anggotaDetailOverlay?.classList.contains('active')) {
        closeAnggotaDetail();
        return;
      }
      if (event.key === 'Escape' && els.viewDetail?.classList.contains('active')) {
        backToBidang();
      }
    });
  }

  async function init() {
    els.loadingOverlay = byId('loading-overlay');
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
    syncFeedbackSubject();
    setFeedbackPanelOpen(false);
    state.bidang = await fetchOrganizationData();
    renderBidangGrid();
    hideLoadingOverlay();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
