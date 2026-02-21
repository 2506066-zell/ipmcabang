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
    currentBidangCode: ''
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

  function normalizeMember(raw, idx) {
    return {
      id: Number(raw?.id || 0) || idx + 1,
      full_name: String(raw?.full_name || raw?.name || '').trim(),
      role_title: String(raw?.role_title || raw?.role || '').trim(),
      quote: String(raw?.quote || '').trim(),
      photo_url: normalizePath(raw?.photo_url || raw?.photo || ''),
      instagram_url: String(raw?.instagram_url || raw?.instagram || '').trim(),
      sort_order: Number(raw?.sort_order || idx + 1) || (idx + 1)
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
      sort_order: Number(raw?.sort_order || idx + 1) || (idx + 1)
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
      sort_order: Number(raw?.sort_order || idx + 1) || (idx + 1),
      members: members.map(normalizeMember).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
      programs: programs.map(normalizeProgram).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
    };
  }

  async function fetchOrganizationData() {
    try {
      const res = await fetch('/api/organization', { method: 'GET', headers: { 'Accept': 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data?.status !== 'success' || !Array.isArray(data?.bidang)) {
        throw new Error('Invalid response shape');
      }
      if (!data.bidang.length) throw new Error('Empty organization');
      return data.bidang.map(normalizeBidang);
    } catch (e) {
      console.warn('[Struktur] fallback data used:', e.message || e);
      return FALLBACK_BIDANG.map((b, idx) => normalizeBidang({ ...b, members: [], programs: [] }, idx));
    }
  }

  function getCurrentBidang() {
    return state.bidang.find(b => b.code === state.currentBidangCode) || null;
  }

  function hideLoadingOverlay() {
    if (!els.loadingOverlay) return;
    els.loadingOverlay.classList.add('hidden');
    els.loadingOverlay.style.display = 'none';
  }

  function renderBidangGrid() {
    if (!els.bidangGrid) return;
    els.bidangGrid.innerHTML = '';
    state.bidang.forEach((b) => {
      const card = document.createElement('div');
      card.className = 'bidang-card';
      card.innerHTML = `
        <div class="bidang-card-header">
          <img src="${escapeHtml(b.image_url)}" alt="${escapeHtml(b.name)}" loading="lazy">
        </div>
        <div class="bidang-card-content">
          <div class="bidang-card-name">${escapeHtml(b.name)}</div>
          <div class="bidang-card-actions">
            <button class="btn-card btn-card-anggota" type="button" data-action="anggota" data-bidang="${escapeHtml(b.code)}">
              <i class="fas fa-users"></i> Anggota
            </button>
            <button class="btn-card btn-card-program" type="button" data-action="program" data-bidang="${escapeHtml(b.code)}">
              <i class="fas fa-tasks"></i> Program
            </button>
          </div>
        </div>
      `;
      els.bidangGrid.appendChild(card);
    });
  }

  function setupLazyLoading() {
    const lazyImages = document.querySelectorAll('.lazy-load');
    if (!lazyImages.length || !('IntersectionObserver' in window)) {
      lazyImages.forEach((img) => {
        img.src = img.dataset.src || '';
      });
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const image = entry.target;
        image.src = image.dataset.src || '';
        image.classList.remove('lazy-load');
        observer.unobserve(image);
      });
    });
    lazyImages.forEach((image) => observer.observe(image));
  }

  function showAnggota(bidangCode) {
    state.currentBidangCode = bidangCode;
    const selected = getCurrentBidang();
    if (!selected || !els.viewBidangGrid || !els.viewAnggota || !els.anggotaGrid) return;

    els.viewBidangGrid.classList.add('hidden');
    els.viewProgram.classList.remove('active');
    els.viewAnggota.classList.add('active');
    els.anggotaTitle.textContent = selected.name;
    els.anggotaCount.textContent = `${selected.members.length} Anggota`;
    els.anggotaGrid.innerHTML = '';

    if (!selected.members.length) {
      els.anggotaGrid.innerHTML = '<div class="org-empty-state">Belum ada anggota di bidang ini.</div>';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    selected.members.forEach((member) => {
      const card = document.createElement('div');
      card.className = 'anggota-card';
      const initials = member.full_name.split(/\s+/).filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 3);
      card.innerHTML = `
        <div class="anggota-card-photo">
          <img data-src="${escapeHtml(member.photo_url)}" alt="${escapeHtml(member.full_name)}" class="lazy-load" onerror="this.parentElement.classList.add('no-image');">
          <div class="anggota-card-avatar">${escapeHtml(initials || '?')}</div>
        </div>
        <div class="anggota-card-info">
          <div class="anggota-card-name">${escapeHtml(member.full_name)}</div>
          <div class="anggota-card-role">${escapeHtml(member.role_title)}</div>
          <div class="anggota-card-quote">${escapeHtml(member.quote || '')}</div>
          <div class="anggota-card-indicator"><i class="fas fa-chevron-right"></i></div>
        </div>
      `;
      card.addEventListener('click', () => openAnggotaDetail(member, selected));
      els.anggotaGrid.appendChild(card);
    });

    setupLazyLoading();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function showProgram(bidangCode) {
    state.currentBidangCode = bidangCode;
    const selected = getCurrentBidang();
    if (!selected || !els.viewBidangGrid || !els.viewProgram || !els.programList) return;

    els.viewBidangGrid.classList.add('hidden');
    els.viewAnggota.classList.remove('active');
    els.viewProgram.classList.add('active');
    els.programBidangTitle.textContent = selected.name;
    els.programList.innerHTML = '';

    if (!selected.programs.length) {
      els.programList.innerHTML = '<div class="org-empty-state">Program kerja belum diisi.</div>';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    selected.programs.forEach((program) => {
      const card = document.createElement('div');
      card.className = 'program-card';
      card.style.setProperty('--color-bidang', selected.color || '#4A7C5D');

      const statusClass = program.status === 'terlaksana' ? 'status-terlaksana' : 'status-rencana';
      const statusText = program.status === 'terlaksana'
        ? 'Terlaksana'
        : (program.status === 'rencana' ? 'Rencana' : 'Draft');
      card.innerHTML = `
        <div class="program-card-name">${escapeHtml(program.title)}</div>
        <div class="program-card-desc">${escapeHtml(program.description || '-')}</div>
        <div class="program-card-status ${statusClass}">${statusText}</div>
      `;
      els.programList.appendChild(card);
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function backToBidang() {
    els.viewAnggota.classList.remove('active');
    els.viewProgram.classList.remove('active');
    els.viewBidangGrid.classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openAnggotaDetail(member, bidang) {
    if (!els.anggotaDetailOverlay) return;
    const initials = member.full_name.split(/\s+/).filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 3);

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
    if (els.backFromAnggotaBtn) {
      els.backFromAnggotaBtn.addEventListener('click', backToBidang);
    }
    if (els.backFromProgramBtn) {
      els.backFromProgramBtn.addEventListener('click', backToBidang);
    }
    if (els.bidangGrid) {
      els.bidangGrid.addEventListener('click', (event) => {
        const btn = event.target.closest('button[data-action]');
        if (!btn) return;
        const bidangCode = String(btn.getAttribute('data-bidang') || '').trim();
        const action = String(btn.getAttribute('data-action') || '');
        if (!bidangCode) return;
        if (action === 'anggota') showAnggota(bidangCode);
        if (action === 'program') showProgram(bidangCode);
      });
    }

    if (els.anggotaDetailOverlay) {
      els.anggotaDetailOverlay.addEventListener('click', (e) => {
        if (e.target === els.anggotaDetailOverlay) closeAnggotaDetail();
      });
    }
    if (els.anggotaDetailCard) {
      els.anggotaDetailCard.addEventListener('click', (e) => e.stopPropagation());
    }
    if (els.closeAnggotaDetailBtn) {
      els.closeAnggotaDetailBtn.addEventListener('click', closeAnggotaDetail);
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && els.anggotaDetailOverlay?.classList.contains('active')) {
        closeAnggotaDetail();
      }
    });
  }

  async function init() {
    els.loadingOverlay = byId('loading-overlay');
    els.bidangGrid = byId('bidangGrid');
    els.viewBidangGrid = byId('viewBidangGrid');
    els.viewAnggota = byId('viewAnggota');
    els.viewProgram = byId('viewProgram');
    els.anggotaGrid = byId('anggotaGrid');
    els.anggotaTitle = byId('anggotaTitle');
    els.anggotaCount = byId('anggotaCount');
    els.programList = byId('programList');
    els.programBidangTitle = byId('programBidangTitle');
    els.backFromAnggotaBtn = byId('backFromAnggotaBtn');
    els.backFromProgramBtn = byId('backFromProgramBtn');
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
    renderBidangGrid();
    hideLoadingOverlay();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
