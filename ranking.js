document.addEventListener('DOMContentLoaded', () => {
    const API_URL = '/api';
    const CACHE_KEY = 'ipm_ranking_cache';
    const CACHE_TTL = 60000; // 60s

    const userRankCard = document.getElementById('user-rank-card');
    const top3Container = document.getElementById('top-3-showcase');
    const rankingList = document.getElementById('ranking-list');
    const loadingIndicator = document.getElementById('loading-indicator');
    const mainContent = document.getElementById('main-content');
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');
    const searchInput = document.getElementById('search-input');
    const filterButtons = document.querySelectorAll('.filter-btn');

    let allData = [];
    let previousRanks = new Map();
    const currentUser = "Anda"; // Ganti dengan nama pengguna yang login jika ada sistem otentikasi

    function showLoading(isLoading) {
        loadingIndicator.style.display = isLoading ? 'flex' : 'none';
        mainContent.style.display = isLoading ? 'none' : 'block';
        if (isLoading) errorContainer.style.display = 'none';
    }

    function showError(message) {
        errorMessage.textContent = message;
        loadingIndicator.style.display = 'none';
        mainContent.style.display = 'none';
        errorContainer.style.display = 'block';
    }

    async function fetchRankingData() {
        if (window.AppLoader) AppLoader.show('Memuat Peringkat...');
        showLoading(true);
        try {
            const response = await fetch(`${API_URL}/results`);
            if (!response.ok) throw new Error(`Gagal mengambil data (Status: ${response.status})`);
            
            const data = await response.json();
            if (!response.ok || data.status !== 'success') throw new Error(data.message || 'Kesalahan server.');
            allData = Array.isArray(data.results) ? data.results.slice() : [];
            allData.sort((a, b) => (b.score || 0) - (a.score || 0));
            try {
                localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data: allData }));
            } catch {}
            const empty = !Array.isArray(allData) || allData.length === 0;
            document.getElementById('empty-state').style.display = empty ? 'block' : 'none';
            document.getElementById('main-content').style.display = empty ? 'none' : 'block';
            if (!empty) renderPage(allData);
            const last = document.getElementById('last-updated');
            if (last) {
                const now = new Date();
                last.textContent = `Terakhir diperbarui: ${now.toLocaleString('id-ID')}`;
            }
            renderAchievements(allData);
            renderStats(allData);

            // Update ranks for next comparison
            const newRanks = new Map();
            allData.forEach((p, index) => {
                newRanks.set(p.username, index + 1);
            });

            // If previousRanks is empty, initialize it without animation
            if (previousRanks.size === 0) {
                previousRanks = newRanks;
            }

        } catch (error) {
            showError(error.message);
            console.error('Gagal mengambil data peringkat:', error);
        } finally {
            showLoading(false);
            if (window.AppLoader) AppLoader.hide();
        }
    }

    function renderPage(data) {
        renderUserRank(data);
        renderTop3(data.slice(0, 3));
        renderRest(data.slice(3));
        applyEntryAnimations();
    }

    function renderUserRank(data) {
        const userIndex = data.findIndex(p => String(p.username||'').toLowerCase() === currentUser.toLowerCase());
        if (userIndex !== -1) {
            const user = data[userIndex];
            const rank = userIndex + 1;
            userRankCard.innerHTML = `
                <div class="position">⭐ Posisi Anda: #${rank}</div>
                <div class="details">
                    <span>Skor: ${user.score}/${user.total || '-'}</span>
                    <span>Waktu: ${user.time_spent || 0} dtk</span>
                </div>
            `;
            userRankCard.style.display = 'block';
        } else {
            userRankCard.style.display = 'none';
        }
    }

    function renderTop3(top3Data) {
        top3Container.innerHTML = '';
        top3Data.forEach((p, index) => {
            const rank = index + 1;
            const card = document.createElement('div');
            card.className = `rank-card rank-${rank}`;
            const pos = document.createElement('div');
            pos.className = 'rank-position';
            pos.innerHTML = rank === 1 ? '<i class="fas fa-crown"></i>' : String(rank);
            const avatar = document.createElement('div');
            avatar.className = 'avatar';
            avatar.textContent = (String(p.username||'').charAt(0) || '').toUpperCase();
            const name = document.createElement('div');
            name.className = 'name';
            name.textContent = String(p.username||'');
            const score = document.createElement('div');
            score.className = 'score';
            score.textContent = `${p.score} Poin`;
            card.appendChild(pos);
            card.appendChild(avatar);
            card.appendChild(name);
            card.appendChild(score);
            card.classList.add('animate');
            card.style.animationDelay = `${index * 0.08}s`;
            top3Container.appendChild(card);
        });
    }

    function renderRest(restData) {
        rankingList.innerHTML = '';
        if (restData.length === 0) return;

        const newRanks = new Map();
        allData.forEach((p, index) => {
            newRanks.set(p.username, index + 1);
        });

        restData.forEach((p, index) => {
            const rank = index + 4;
            const listItem = document.createElement('div');
            listItem.className = 'list-item';
            listItem.dataset.username = p.username;

            const oldRank = previousRanks.get(p.username);
            const newRank = newRanks.get(p.username);

            if (oldRank && newRank) {
                if (newRank < oldRank) {
                    listItem.classList.add('rank-up');
                } else if (newRank > oldRank) {
                    listItem.classList.add('rank-down');
                }
            }

            if (p.username.toLowerCase() === currentUser.toLowerCase()) {
                listItem.classList.add('user-highlight');
            }
            const rankEl = document.createElement('div');
            rankEl.className = 'rank';
            rankEl.textContent = String(rank);
            const nameAvatar = document.createElement('div');
            nameAvatar.className = 'name-avatar';
            const avatarSm = document.createElement('div');
            avatarSm.className = 'avatar-sm';
            avatarSm.textContent = (String(p.username||'').charAt(0) || '').toUpperCase();
            const nameSpan = document.createElement('span');
            nameSpan.textContent = String(p.username||'');
            nameAvatar.appendChild(avatarSm);
            nameAvatar.appendChild(nameSpan);
            const scoreEl = document.createElement('div');
            scoreEl.className = 'score';
            scoreEl.textContent = `${p.score} (${p.percent}%)`;
            const timeEl = document.createElement('div');
            timeEl.className = 'time';
            timeEl.textContent = new Date(p.ts || p.timestamp).toLocaleDateString('id-ID');
            listItem.appendChild(rankEl);
            listItem.appendChild(nameAvatar);
            listItem.appendChild(scoreEl);
            listItem.appendChild(timeEl);
            rankingList.appendChild(listItem);

            // Remove animation classes after animation ends
            setTimeout(() => {
                listItem.classList.remove('rank-up', 'rank-down');
            }, 2000);
        });

        previousRanks = newRanks;
    }

    function renderAchievements(data) {
        const badgesGrid = document.getElementById('badges-grid');
        // Logika untuk menentukan badge (contoh sederhana)
        const topScorer = data.length > 0 ? data[0] : null;
        const badges = [
            { icon: '🎯', title: 'Top Scorer', user: topScorer ? topScorer.username : '-' },
            { icon: '⚡', title: 'Speed Runner', user: 'User C' }, // Placeholder
            { icon: '💯', title: 'Perfect Score', user: 'User A' }, // Placeholder
        ];
        badgesGrid.innerHTML = badges.map(badge => `
            <div class="badge">
                <div class="badge-icon">${badge.icon}</div>
                <div class="badge-title">${badge.title}</div>
                <div class="badge-user">${badge.user}</div>
            </div>
        `).join('');
    }

    function renderStats(data) {
        const statsViz = document.getElementById('stats-visualization');
        // Logika untuk visualisasi data (contoh sederhana)
        const scoreDistribution = { 'A': 0, 'B': 0, 'C': 0 };
        data.forEach(p => {
            if (p.percent >= 80) scoreDistribution['A']++;
            else if (p.percent >= 60) scoreDistribution['B']++;
            else scoreDistribution['C']++;
        });

        // Prevent division by zero
        const total = data.length || 1;
        statsViz.innerHTML = `
            <div class="stat-item">
                <span>Skor > 80% (A)</span>
                <div class="progress-bar"><div style="width: ${(scoreDistribution['A']/total)*100}%"></div></div>
            </div>
            <div class="stat-item">
                <span>Skor 60-79% (B)</span>
                <div class="progress-bar"><div style="width: ${(scoreDistribution['B']/total)*100}%"></div></div>
            </div>
            <div class="stat-item">
                <span>Skor < 60% (C)</span>
                <div class="progress-bar"><div style="width: ${(scoreDistribution['C']/total)*100}%"></div></div>
            </div>
        `;
    }

    function applyEntryAnimations() {
        gsap.from(".list-item", {
            opacity: 0,
            y: 20,
            duration: 0.5,
            stagger: 0.05,
            ease: "power3.out"
        });
    }

    function handleFilterAndSearch() {
        const searchTerm = searchInput.value.toLowerCase();
        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;

        let filteredData = allData.filter(p => p.username.toLowerCase().includes(searchTerm));

        const now = new Date();
        if (activeFilter === 'weekly') {
            const lastWeek = new Date(now.setDate(now.getDate() - 7));
            filteredData = filteredData.filter(p => new Date(p.ts || p.timestamp) >= lastWeek);
        } else if (activeFilter === 'daily') {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            filteredData = filteredData.filter(p => new Date(p.ts || p.timestamp) >= today);
        }

        const empty = filteredData.length === 0;
        document.getElementById('empty-state').style.display = empty ? 'block' : 'none';
        document.getElementById('main-content').style.display = empty ? 'none' : 'block';
        if (!empty) renderPage(filteredData);
    }

    searchInput.addEventListener('input', handleFilterAndSearch);
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            handleFilterAndSearch();
        });
    });

    // Stale-while-revalidate: tampilkan cache jika ada, lalu ambil data terbaru
    try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        if (cached && Array.isArray(cached.data)) {
            allData = cached.data;
            const empty = !Array.isArray(allData) || allData.length === 0;
            document.getElementById('empty-state').style.display = empty ? 'block' : 'none';
            document.getElementById('main-content').style.display = empty ? 'none' : 'block';
            if (!empty) renderPage(allData);
            const last = document.getElementById('last-updated');
            if (last && cached.t) last.textContent = `Terakhir diperbarui: ${new Date(cached.t).toLocaleString('id-ID')}`;
            showLoading(false);
            if (window.AppLoader) AppLoader.hide();
        }
    } catch {}

    fetchRankingData();
    const reloadBtn = document.getElementById('empty-reload');
    if (reloadBtn) reloadBtn.addEventListener('click', () => fetchRankingData());
    initParticles();

    // Optional: Set an interval to fetch data periodically to see rank changes
    // setInterval(fetchRankingData, 15000); // Fetch every 15 seconds
});

function initParticles() {
    if (typeof window !== 'undefined' && typeof window.particlesJS !== 'function') return;
    particlesJS('particles-js', {
        "particles": {
            "number": {
                "value": 50,
                "density": {
                    "enable": true,
                    "value_area": 800
                }
            },
            "color": {
                "value": "#00ffa3"
            },
            "shape": {
                "type": "circle",
            },
            "opacity": {
                "value": 0.5,
                "random": true,
            },
            "size": {
                "value": 3,
                "random": true,
            },
            "line_linked": {
                "enable": true,
                "distance": 150,
                "color": "#2d3748",
                "opacity": 0.4,
                "width": 1
            },
            "move": {
                "enable": true,
                "speed": 2,
                "direction": "none",
                "random": false,
                "straight": false,
                "out_mode": "out",
                "bounce": false,
            }
        },
        "interactivity": {
            "detect_on": "canvas",
            "events": {
                "onhover": {
                    "enable": true,
                    "mode": "grab"
                },
                "onclick": {
                    "enable": true,
                    "mode": "push"
                },
                "resize": true
            },
            "modes": {
                "grab": {
                    "distance": 140,
                    "line_linked": {
                        "opacity": 1
                    }
                },
                "push": {
                    "particles_nb": 4
                }
            }
        },
        "retina_detect": true
    });
}
