document.addEventListener('DOMContentLoaded', () => {
    const viewBidangGrid = document.getElementById('viewBidangGrid');
    const viewAnggota = document.getElementById('viewAnggota');
    const viewProgram = document.getElementById('viewProgram');

    const bidangGridContainer = document.querySelector('.bidang-grid');
    const anggotaGridContainer = document.querySelector('.anggota-grid');
    const programListContainer = document.querySelector('.program-list');

    const anggotaHeaderTitle = document.querySelector('#viewAnggota .header-title');
    const anggotaHeaderCount = document.querySelector('#viewAnggota .header-count');
    const programHeaderTitle = document.querySelector('#viewProgram .program-title');
    const programHeaderSubtitle = document.querySelector('#viewProgram .program-subtitle');

    const backBtnAnggota = document.querySelector('#viewAnggota .back-btn');
    const backBtnProgram = document.querySelector('#viewProgram .back-btn');

    const anggotaDetailModal = document.getElementById('anggotaDetailModal');
    const closeAnggotaDetailBtn = document.querySelector('.anggota-detail-close-btn');

    // Data Bidang dan Anggota (asumsikan sudah ada)
    const bidang = [
    { id: 'ketuaUmum', name: 'Ketua Umum', image: 'images/bidang/umum.jpeg', color: '#2C5F4F' },
    { id: 'sekretaris', name: 'Sekretaris', image: 'images/bidang/sekretaris.jpg', color: '#4A7C5D' },
    { id: 'bendahara', name: 'Bendahara', image: 'images/bidang/bendahara.jpg', color: '#F39C12' },
    { id: 'perkaderan', name: 'Perkaderan', image: 'images/bidang/pkd.png', color: '#E74C3C' },
    { id: 'pengkajianIlmu', name: 'Pengkajian Ilmu Pengetahuan', image: 'images/bidang/pengkajianIlmu.jpeg', color: '#3498DB' },
    { id: 'kajianDakwah', name: 'Kajian Dakwah Islam', image: 'images/bidang/kajianDakwah.jpg', color: '#9B59B6' },
    { id: 'apresiasiBudaya', name: 'Apresiasi Budaya & Olahraga', image: 'images/bidang/apresiasiBudaya.jpg', color: '#1ABC9C' },
    { id: 'advokasi', name: 'Advokasi', image: 'images/bidang/advokasi.JPEG', color: '#E67E22' },
    { id: 'ipmawati', name: 'Ipmawati', image: 'images/bidang/ipmawati.jpeg', color: '#D946A6' }
];

const members = [
    // ketua umum//
    { name: 'Anwar', role: 'Ketua Umum', quote: 'Kepemimpinan adalah tanggung jawab.', photo: 'images/members/', bidangId: 'ketuaUmum' },
    // sekretaris//
    { name: 'Nauval', role: 'Sekretaris', quote: 'Administrasi adalah fondasi organisasi yang kuat.', photo: 'images/members/hendra-gunawan.jpg', bidangId: 'sekretaris' },
    // bendahara//
    { name: 'Yasifa Permata', role: 'Bendahara Umum', quote: 'Transparansi keuangan adalah kunci kepercayaan.', photo: '', bidangId: 'bendahara', instagram: 'https://www.instagram.com/username' },
    { name: 'Syifa Nursafitri', role: 'Bendahara I', quote: 'Transparansi keuangan adalah kunci kepercayaan.', photo: '', bidangId: 'bendahara' },
    // perkaderan//
    { name: 'Arief Bijaksana', role: 'Ketua', quote: '', photo: '', bidangId: 'perkaderan' },
    { name: 'Hafiy Muhammad Fhaza', role: 'Sekretaris', quote: '', photo: '', bidangId: 'perkaderan' },
    { name: 'Moch Ridwan Nulhakim', role: 'Anggota', quote: '', photo: '', bidangId: 'perkaderan' },
    { name: 'Ajril Ahmad Fazar', role: 'Anggota', quote: '', photo: '', bidangId: 'perkaderan' },
    // pengkajian ilmu pengetahuan//
    { name: 'Gilang Muhammad Riziq', role: 'Ketua Bidang', quote: '', photo: 'images/members/gilang1.jpeg', bidangId: 'pengkajianIlmu' },
    { name: 'Zaldy Muhammad Fazri', role: 'Sekretaris Bidang', quote: '', photo: 'images/members/zaldy.jpeg', bidangId: 'pengkajianIlmu' },
    { name: 'Sudarisman', role: 'Anggota', quote: '', photo: '', bidangId: 'pengkajianIlmu' },
    { name: 'Fathir Nasrulhaq', role: 'Anggota', quote: '', photo: '', bidangId: 'pengkajianIlmu' },
    { name: 'Muhammad Fadilah', role: 'Anggota', quote: '', photo: '', bidangId: 'pengkajianIlmu' },
    { name: 'Ayudia Cempaka Gratia', role: 'Anggota', quote: '', photo: 'images/members/ayudia.jpeg', bidangId: 'pengkajianIlmu' },
    { name: 'Halida Muna Nurmufidah', role: 'Anggota', quote: '', photo: '', bidangId: 'pengkajianIlmu' },
    { name: 'Haura Azkya', role: 'Anggota', quote: '', photo: '', bidangId: 'pengkajianIlmu' },
    { name: 'Debi Rahmawati', role: 'Anggota', quote: '', photo: '', bidangId: 'pengkajianIlmu' },

    // kajian dakwah islam//

    { name: 'Ahsan Hadian Assidiqi', role: 'Ketua Bidang', quote: '', photo: '', bidangId: 'kajianDakwah' },
    { name: 'Syifa Khoerunnisa', role: 'Sekretaris Bidang', quote: '', photo: '', bidangId: 'kajianDakwah' },
    { name: 'Siti Rahmawati', role: 'Anggota', quote: '', photo: '', bidangId: 'kajianDakwah' },
    { name: 'Muhammad Iqbal', role: 'Anggota', quote: '', photo: '', bidangId: 'kajianDakwah' },
    // apresiasi budaya & olahraga//
    { name: 'Hasna Aurora Ginan Nurillah', role: 'Ketua Bidang', quote: '', photo: '', bidangId: 'apresiasiBudaya' },
     { name: 'Najril Muhammad Solfa', role: 'Sekretaris Bidang', quote: '', photo: '', bidangId: 'apresiasiBudaya' },
     { name: 'Ganjar', role: 'Anggota', quote: '', photo: '', bidangId: 'apresiasiBudaya' },
     { name: 'asep', role: 'Anggota', quote: '', photo: '', bidangId: 'apresiasiBudaya' },
     { name: 'wiri', role: 'Anggota', quote: '', photo: '', bidangId: 'apresiasiBudaya' },
     { name: 'Tegar', role: 'Anggota', quote: '', photo: '', bidangId: 'apresiasiBudaya' },
     { name: 'anwar', role: 'Anggota', quote: '', photo: '', bidangId: 'apresiasiBudaya' },
    // advokasi//
    { name: 'Muhammad Yopi', role: 'Ketua Bidang', quote: '', photo: 'images/members/yopi.jpeg', bidangId: 'advokasi' },
     { name: 'Rehan Nurfahmi', role: 'Sekretaris Bidang', quote: '', photo: 'images/members/rehan.jpeg', bidangId: 'advokasi' },
     { name: 'Raisa Hidayatul Marwah', role: 'Anggota', quote: '', photo: '', bidangId: 'advokasi' },
    // ipmawati//
    { name: 'Raida Rahma Annastasya', role: 'Ketua Bidang', quote: '', photo: '', bidangId: 'ipmawati' },
     { name: 'Sira Tiara Wangi', role: 'Sekretaris Bidang', quote: '', photo: '', bidangId: 'ipmawati' },
     { name: 'Shabrina Diwamah Rifki 33', role: 'Anggota', quote: '', photo: '', bidangId: 'ipmawati' },
     { name: 'Ramira Ramandita', role: 'Anggota', quote: '', photo: '', bidangId: 'ipmawati' },
     { name: 'Ismi Nurazizah', role: 'Anggota', quote: '', photo: '', bidangId: 'ipmawati' },
     { name: 'Iklia Wahdiah Nurfitriah', role: 'Anggota', quote: '', photo: '', bidangId: 'ipmawati' },
     { name: 'Kheisya Zahra Oktavia', role: 'Anggota', quote: '', photo: '', bidangId: 'ipmawati' },
     { name: 'Anida Uswah Mujahidah', role: 'Anggota', quote: '', photo: '', bidangId: 'ipmawati' },
   
];

const programs = [
    { bidangId: 'ketuaUmum', name: '', desc: '', status: '' },
    { bidangId: 'ketuaUmum', name: '', desc: '', status: '' },
    { bidangId: 'sekretaris', name: '', desc: '', status: '' },
    { bidangId: 'bendahara', name: '', desc: '', status: '' },
    { bidangId: 'perkaderan', name: '', desc: '', status: '' },
    { bidangId: 'perkaderan', name: '', desc: '', status: '' },
    { bidangId: 'pengkajianIlmu', name: '', desc: '', status: '' },
    { bidangId: 'pengkajianIlmu', name: '', desc: '', status: '' },
    { bidangId: 'kajianDakwah', name: '', desc: '', status: '' },
    { bidangId: 'apresiasiBudaya', name: '', desc: '', status: '' },
    { bidangId: 'advokasi', name: '', desc: '', status: '' },
    { bidangId: 'ipmawati', name: '', desc: '', status: '' },
    { bidangId: 'ipmawati', name: '', desc: '', status: '' }
];

    // Render Bidang Grid
    function renderBidangGrid() {
        bidangGridContainer.innerHTML = '';
        bidang.forEach(b => {
            const card = document.createElement('div');
            card.className = 'bidang-card';
            card.style.setProperty('--color-bidang', b.color);
            card.style.setProperty('--color-bidang-light', b.colorLight);
            card.innerHTML = `
                <div class="bidang-card-header">
                    <img src="${b.image}" alt="${b.name}" loading="lazy">
                </div>
                <div class="bidang-card-content">
                    <h3 class="bidang-card-name">${b.name}</h3>
                    <div class="bidang-card-actions">
                        <button class="btn-card btn-card-anggota" data-bidang="${b.id}">
                            <i class="fas fa-users"></i> Lihat Anggota
                        </button>
                        <button class="btn-card btn-card-program" data-bidang="${b.id}">
                            <i class="fas fa-tasks"></i> Program Kerja
                        </button>
                    </div>
                </div>
            `;
            bidangGridContainer.appendChild(card);
        });
    }

    // Show Anggota View
    function showAnggota(bidangId) {
        const bidangData = bidang.find(b => b.id === bidangId);
        const anggotaData = members[bidangId] || [];

        anggotaHeaderTitle.textContent = bidangData.name;
        anggotaHeaderCount.textContent = `${anggotaData.length} Anggota`;
        anggotaGridContainer.innerHTML = '';

        if (anggotaData.length > 0) {
            anggotaData.forEach(member => {
                const initial = member.name.charAt(0).toUpperCase();
                const card = document.createElement('div');
                card.className = `anggota-card ${!member.photo ? 'no-photo' : ''}`;
                card.innerHTML = `
                    <div class="anggota-card-photo ${!member.photo ? 'no-image' : ''}">
                        ${member.photo ? `<img src="${member.photo}" alt="${member.name}" loading="lazy">` : `<div class="anggota-card-avatar">${initial}</div>`}
                    </div>
                    <div class="anggota-card-info">
                        <h4 class="anggota-card-name">${member.name}</h4>
                        <span class="anggota-card-role">${member.role}</span>
                    </div>
                `;
                card.addEventListener('click', () => openAnggotaDetail(member, bidangData));
                anggotaGridContainer.appendChild(card);
            });
        } else {
            anggotaGridContainer.innerHTML = '<p>Belum ada data anggota untuk bidang ini.</p>';
        }

        viewBidangGrid.classList.add('hidden');
        viewProgram.classList.remove('active');
        viewAnggota.classList.add('active');
        window.scrollTo(0, 0);
    }

    // Show Program Kerja View
    function showProgram(bidangId) {
        const bidangData = bidang.find(b => b.id === bidangId);
        const programData = programKerja[bidangId] || [];

        programHeaderTitle.textContent = `Program Kerja`;
        programHeaderSubtitle.textContent = bidangData.name;
        programListContainer.innerHTML = '';

        if (programData.length > 0) {
            programData.forEach(program => {
                const card = document.createElement('div');
                card.className = 'program-card';
                card.style.setProperty('--color-bidang', bidangData.color);
                card.style.setProperty('--color-bidang-light', bidangData.colorLight);
                card.innerHTML = `
                    <h4 class="program-card-name">${program.name}</h4>
                    <p class="program-card-desc">${program.description}</p>
                    <div class="program-card-status status-${program.status}">
                        ${program.status.charAt(0).toUpperCase() + program.status.slice(1)}
                    </div>
                    ${program.ig_post ? `<a href="${program.ig_post}" target="_blank" class="btn-instagram"><i class="fab fa-instagram"></i> Lihat Postingan</a>` : ''}
                `;
                programListContainer.appendChild(card);
            });
        } else {
            programListContainer.innerHTML = '<p>Belum ada program kerja untuk bidang ini.</p>';
        }

        viewBidangGrid.classList.add('hidden');
        viewAnggota.classList.remove('active');
        viewProgram.classList.add('active');
        window.scrollTo(0, 0);
    }

    // Back to Bidang Grid
    function backToBidang() {
        viewAnggota.classList.remove('active');
        viewProgram.classList.remove('active');
        viewBidangGrid.classList.remove('hidden');
        window.scrollTo(0, 0);
    }

    // Open Anggota Detail Modal
    function openAnggotaDetail(member, bidangData) {
        document.getElementById('detailPhoto').src = member.photo || 'assets/default-avatar.png';
        document.getElementById('detailName').textContent = member.name;
        document.getElementById('detailRole').textContent = member.role;
        document.getElementById('detailBidang').textContent = bidangData.name;
        document.getElementById('detailQuote').textContent = member.quote || 'Tidak ada quote.';
        
        const igLink = document.getElementById('detailInstagram');
        if (member.ig) {
            igLink.href = `https://instagram.com/${member.ig}`;
            igLink.style.display = 'flex';
        } else {
            igLink.style.display = 'none';
        }

        anggotaDetailModal.classList.add('active');
    }

    // Close Anggota Detail Modal
    function closeAnggotaDetail() {
        anggotaDetailModal.classList.remove('active');
    }

    // Event Listeners
    bidangGridContainer.addEventListener('click', (e) => {
        const anggotaBtn = e.target.closest('.btn-card-anggota');
        const programBtn = e.target.closest('.btn-card-program');
        if (anggotaBtn) {
            showAnggota(anggotaBtn.dataset.bidang);
        } else if (programBtn) {
            showProgram(programBtn.dataset.bidang);
        }
    });

    backBtnAnggota.addEventListener('click', backToBidang);
    backBtnProgram.addEventListener('click', backToBidang);

    closeAnggotaDetailBtn.addEventListener('click', closeAnggotaDetail);
    anggotaDetailModal.addEventListener('click', (e) => {
        if (e.target === anggotaDetailModal) {
            closeAnggotaDetail();
        }
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && anggotaDetailModal.classList.contains('active')) {
            closeAnggotaDetail();
        }
    });

    // Initial Render
    renderBidangGrid();
});