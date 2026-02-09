document.addEventListener('DOMContentLoaded', () => {
    const API_URL = '/api';
    const CACHE_KEY = 'ipm_ranking_cache';

    // Elements
    const userRankCard = document.getElementById('user-rank-card');
    const top3Container = document.getElementById('top-3-showcase');
    const rankingList = document.getElementById('ranking-list');
    const loadingIndicator = document.getElementById('loading-indicator');
    const mainContent = document.getElementById('main-content');
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');
    const searchInput = document.getElementById('search-input');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const rankToast = document.getElementById('rank-toast');
    const rankingPeriod = document.getElementById('ranking-period');

    // State
    let allData = [];
    let previousRanks = new Map();
    const currentUser = "Anda"; // Placeholder for auth user

    function showLoading(isLoading) {
        loadingIndicator.style.display = isLoading ? 'flex' : 'none';
        // Only hide main content on initial load, not subsequent refreshes
        if (isLoading && allData.length === 0) {
            mainContent.style.display = 'none';
        } else if (!isLoading) {
            mainContent.style.display = 'block';
        }
        if (isLoading) errorContainer.style.display = 'none';
    }
    
    function setRankingPeriod() {
        if (!rankingPeriod) return;
        const now = new Date();
        const month = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        rankingPeriod.textContent = `Periode: ${month}`;
    }

    function showError(message) {
        errorMessage.textContent = message;
        loadingIndicator.style.display = 'none';
        if (allData.length === 0) {
            mainContent.style.display = 'none';
            errorContainer.style.display = 'block';
        } else {
            // Show toast error if we have data but update failed
            console.error(message);
        }
    }

    async function fetchRankingData() {
        if (allData.length === 0 && window.AppLoader) AppLoader.show('Memuat Peringkat...');
        showLoading(true);
        try {
            const response = await fetch(`${API_URL}/results`);
            if (!response.ok) throw new Error(`Gagal mengambil data (Status: ${response.status})`);

            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.message || 'Kesalahan server.');

            const newData = Array.isArray(data.results) ? data.results.slice() : [];
            newData.sort((a, b) => (b.score || 0) - (a.score || 0)); // Sort DESC by score

            // OPTIMIZATION: Only update if data changed
            const isChanged = JSON.stringify(newData) !== JSON.stringify(allData);

            if (isChanged) {
                // Cache data
                try {
                    localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data: newData }));
                } catch { }

                // Process Rank Changes
                processRankChanges(newData);

                allData = newData;

                const empty = !Array.isArray(allData) || allData.length === 0;
                document.getElementById('empty-state').style.display = empty ? 'block' : 'none';
                document.getElementById('main-content').style.display = empty ? 'none' : 'block';

                if (!empty) {
                    // Apply current filter
                    handleFilterAndSearch();
                }
            }

            const last = document.getElementById('last-updated');
            if (last) {
                const now = new Date();
                last.textContent = `Terakhir diperbarui: ${now.toLocaleString('id-ID')}`;
            }

        } catch (error) {
            showError(error.message);
        } finally {
            showLoading(false);
            if (window.AppLoader) AppLoader.hide();
        }
    }

    function processRankChanges(newData) {
        if (previousRanks.size === 0) {
            // First load, just map ranks
            newData.forEach((p, index) => {
                previousRanks.set(p.username, index + 1);
            });
            return;
        }

        const newRankMap = new Map();
        newData.forEach((p, index) => {
            newRankMap.set(p.username, index + 1);
        });

        // Check for "Anda" (User) rank change
        const userOldRank = previousRanks.get(currentUser);
        const userNewRank = newRankMap.get(currentUser);

        if (userOldRank && userNewRank) {
            if (userNewRank < userOldRank) {
                // Rank Improved
                showRankToast('Peringkat Naik! 🚀', `Selamat! Anda naik dari #${userOldRank} ke #${userNewRank}`, 'gold');
            }
        }

        // Check if user entered Top 3
        if ((!userOldRank || userOldRank > 3) && userNewRank <= 3) {
            showRankToast('Masuk 3 Besar! 🏆', `Luar biasa! Anda sekarang berada di posisi #${userNewRank}`, 'gold');
        }

        previousRanks = newRankMap;
    }

    function renderPage(data) {
        renderUserRank(data);
        renderTop3(data.slice(0, 3));
        renderRest(data.slice(3));
    }

    function renderUserRank(data) {
        const userIndex = data.findIndex(p => String(p.username || '').toLowerCase() === currentUser.toLowerCase());

        if (userIndex !== -1) {
            const user = data[userIndex];
            const rank = userIndex + 1;

            userRankCard.innerHTML = `
                <div class="user-rank-content">
                    <div class="user-rank-info">
                        <span class="user-rank-label">Peringkat Anda</span>
                        <span class="user-rank-value">#${rank}</span>
                    </div>
                    <div class="user-stats">
                        <span class="user-score">${user.score} Poin</span>
                        <span class="user-time">${user.time_spent || 0} detik</span>
                    </div>
                </div>
            `;
            userRankCard.style.display = 'block';
        } else {
            userRankCard.style.display = 'none';
        }
    }

    function renderTop3(top3Data) {
        top3Container.innerHTML = '';

        // Order for podium: 2, 1, 3
        const reordered = [null, null, null];

        // FIX: Handle cases where there are fewer than 3 players
        if (top3Data.length === 1) {
            reordered[1] = top3Data[0]; // Center
        } else if (top3Data.length === 2) {
            reordered[1] = top3Data[0]; // Center (1st)
            reordered[0] = top3Data[1]; // Left (2nd)
        } else {
            reordered[1] = top3Data[0]; // Rank 1 -> Center
            reordered[0] = top3Data[1]; // Rank 2 -> Left
            reordered[2] = top3Data[2]; // Rank 3 -> Right
        }

        reordered.forEach((p, i) => {
            if (!p) return;

            // Determine actual rank based on position in reordered array
            let rank;
            if (i === 1) rank = 1;
            else if (i === 0) rank = 2;
            else rank = 3;

            const podiumItem = document.createElement('div');
            podiumItem.className = `podium-item rank-${rank}`;

            // UX: Active Indicator for Top 3
            const lastActive = new Date(p.ts || p.timestamp);
            const isToday = lastActive.setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0);
            const activeBadge = isToday ? '<span class="active-dot" title="Aktif Hari Ini"></span>' : '';

            podiumItem.innerHTML = `
                <div class="avatar-container ring-${rank}">
                    ${rank === 1 ? '<div class="crown-box"><i class="fas fa-crown crown-icon"></i></div>' : ''}
                    ${rank === 1 ? '<div class="badge-box gold">1</div>' : ''}
                    ${rank === 2 ? '<div class="badge-box silver">2</div>' : ''}
                    ${rank === 3 ? '<div class="badge-box bronze">3</div>' : ''}
                    <div class="avatar-char">${(p.username || '?').charAt(0).toUpperCase()}</div>
                    ${activeBadge}
                </div>
                <div class="podium-base">
                    <div class="podium-rank">Juara ${rank}</div>
                    <div class="podium-name">${p.username}</div>
                    <div class="podium-score">${p.score} <span>pts</span></div>
                </div>
            `;

            top3Container.appendChild(podiumItem);
        });

        // Cinematic GSAP entry for Top 3
        if (window.gsap) {
            gsap.from(".podium-item", {
                y: 60,
                opacity: 0,
                scale: 0.9,
                duration: 0.8,
                stagger: 0.2,
                ease: "back.out(1.7)"
            });
        }
    }

    function renderRest(restData) {
        rankingList.innerHTML = '';

        restData.forEach((p, index) => {
            const rank = index + 4; // Start from 4

            // UX: Determine Rank Movement (Simulated or Real if we had history)
            // For now, let's use a simple randomized simulation for "feeling" if it's a new session, 
            // OR strict comparison if we have previous data.
            // Since we persist previousRanks in memory during session, we can use that.
            let movementIcon = '';
            const oldRank = previousRanks.get(p.username);
            if (oldRank) {
                if (rank < oldRank) movementIcon = '<span class="rank-up" title="Naik Peringkat"><i class="fas fa-caret-up"></i></span>';
                else if (rank > oldRank) movementIcon = '<span class="rank-down" title="Turun Peringkat"><i class="fas fa-caret-down"></i></span>';
                else movementIcon = '<span class="rank-same"><i class="fas fa-minus"></i></span>';
            } else {
                movementIcon = '<span class="rank-new">NEW</span>';
            }

            // UX: Active Today Indicator
            const lastActive = new Date(p.ts || p.timestamp);
            const isToday = lastActive.setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0);
            const activeBadge = isToday ? '<span class="active-badge" title="Aktif Hari Ini">🔥</span>' : '';

            const item = document.createElement('div');
            item.className = 'rank-item';
            if (p.username.toLowerCase() === currentUser.toLowerCase()) {
                item.classList.add('is-me');

                // Add motivational copy for YOU
                const nextUser = restData[index - 1] || (index === 0 ? allData[2] : null); // the guy above you
                let copy = '';
                if (nextUser) {
                    const diff = nextUser.score - p.score;
                    if (diff > 0) copy = `<div class="rank-motivation">Kejar <b>${diff} poin</b> lagi untuk salip ${nextUser.username}! 🚀</div>`;
                    else copy = `<div class="rank-motivation">Skor sama! Ayo main lagi untuk menyalip! 🔥</div>`;
                }

                // Append copy to item later or handle structure
                // Let's modify structure slightly for 'is-me'
                item.dataset.motivation = copy ? "true" : "false"; // Hook for CSS
            }

            // Animation delay based on index
            item.style.animationDelay = `${index * 0.05}s`;

            item.innerHTML = `
                <div class="rank-pos">
                    ${rank}
                    <div class="rank-move">${movementIcon}</div>
                </div>
                <div class="rank-info">
                    <div class="rank-name">
                        ${p.username} ${activeBadge}
                    </div>
                    <div class="rank-meta">${new Date(p.ts || p.timestamp).toLocaleDateString('id-ID')}</div>
                    ${item.classList.contains('is-me') && index > 0 ? `<div class="rank-motivation-text"><small>Selisih ${(restData[index - 1] || allData[2]).score - p.score} poin ke posisi #${rank - 1}</small> <a href="quiz.html" class="cta-mini">Ejar!</a></div>` : ''}
                </div>
                <div class="rank-score-box">
                    <div class="rank-score">${p.score}</div>
                    <span class="rank-time">${p.time_spent || 0}s</span>
                </div>
            `;

            rankingList.appendChild(item);
        });

        // Add Global CTA at bottom
        const ctaParams = document.createElement('div');
        ctaParams.className = 'ranking-footer-cta';
        ctaParams.innerHTML = `<button onclick="window.location.href='quiz.html'" class="btn-shine">🔥 Tantang Pemain Lain!</button>`;
        rankingList.appendChild(ctaParams);
    }

    function handleFilterAndSearch() {
        const searchTerm = searchInput.value.toLowerCase();
        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;

        let filteredData = allData.filter(p => (p.username || '').toLowerCase().includes(searchTerm));

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

        if (empty) {
            rankingList.innerHTML = `<div style="text-align:center; padding: 20px; color: #888;">Tidak ada data yang cocok.</div>`;
            top3Container.innerHTML = '';
        } else {
            renderPage(filteredData);
        }
    }

    function showRankToast(title, msg, type = 'normal') {
        const toast = rankToast;
        const titleEl = toast.querySelector('.rank-toast-title');
        const msgEl = toast.querySelector('.rank-toast-msg');
        const iconEl = toast.querySelector('.rank-toast-icon');

        titleEl.textContent = title;
        msgEl.textContent = msg;

        if (type === 'gold') {
            iconEl.innerHTML = '<i class="fas fa-trophy" style="color: #FFD700;"></i>';
        } else {
            iconEl.innerHTML = '<i class="fas fa-arrow-up"></i>';
        }

        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    }

    // Event Listeners
    searchInput.addEventListener('input', handleFilterAndSearch);

    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            handleFilterAndSearch();
        });
    });

    const reloadBtn = document.getElementById('empty-reload');
    if (reloadBtn) reloadBtn.addEventListener('click', () => fetchRankingData());

    // Initial Load (Cache then Network)
    setRankingPeriod();
    try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        if (cached && Array.isArray(cached.data) && (Date.now() - cached.t < 60000 * 5)) {
            allData = cached.data;
            if (allData.length > 0) {
                renderPage(allData);
                document.getElementById('empty-state').style.display = 'none';
                document.getElementById('main-content').style.display = 'block';
                showLoading(false);
            }
        }
    } catch { }

    // Smart Polling Implementation
    let pollTimeout;
    async function startPolling() {
        await fetchRankingData();
        // Schedule next poll only after current finishes
        pollTimeout = setTimeout(startPolling, 30000);
    }

    startPolling();

    // Cleanup on page unload (optional but good practice)
    window.addEventListener('beforeunload', () => clearTimeout(pollTimeout));
});
