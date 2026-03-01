document.addEventListener('DOMContentLoaded', () => {
    const API_URL = '/api';
    const CACHE_KEY = 'ipm_ranking_cache';
    const USER_USERNAME_KEY = 'ipmquiz_user_username';

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
    const shareRankingBtn = document.getElementById('share-ranking-btn');
    const archiveSection = document.getElementById('archive-section');
    const archiveMonthSelect = document.getElementById('archive-month-select');
    const archiveMeta = document.getElementById('archive-meta');
    const archiveEmpty = document.getElementById('archive-empty');
    const archivePodium = document.getElementById('archive-podium');
    const hallOfFameWrap = document.getElementById('hall-of-fame-wrap');
    const hallOfFameEl = document.getElementById('hall-of-fame');

    // State
    let allData = [];
    let currentViewData = [];
    let archiveMonths = [];
    const archiveCache = new Map();
    let previousRanks = new Map();
    const currentUser = (() => {
        try {
            return String(sessionStorage.getItem(USER_USERNAME_KEY) || localStorage.getItem(USER_USERNAME_KEY) || '').trim();
        } catch {
            return '';
        }
    })();
    const numberFormatter = new Intl.NumberFormat('id-ID');

    const nameKey = (value) => String(value || '').trim().toLowerCase();
    const safeText = (value, fallback) => {
        const text = String(value ?? '').trim();
        return text ? text : fallback;
    };
    const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    const toNumber = (value) => {
        const num = Number(value);
        return Number.isFinite(num) ? num : 0;
    };
    const formatScore = (value) => numberFormatter.format(Math.max(0, Math.round(toNumber(value))));
    const formatTime = (value) => numberFormatter.format(Math.max(0, Math.round(toNumber(value))));
    const formatName = (value) => safeText(value, 'Anonim');
    const formatPimpinan = (value) => safeText(value, '-');
    const getInitial = (name) => formatName(name).charAt(0).toUpperCase();
    const getAvatarUrl = (entry) => {
        const raw = safeText(entry.avatar || entry.avatar_url || entry.photo || '', '');
        if (!raw) return '';
        if (/^https?:\/\//i.test(raw)) return raw;
        if (/^data:image\//i.test(raw)) return raw;
        return '';
    };
    const formatDate = (value) => {
        const date = new Date(value || 0);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleDateString('id-ID');
    };
    const formatYmLabel = (ym) => {
        const raw = String(ym || '').trim();
        const m = raw.match(/^(\d{4})-(\d{2})$/);
        if (!m) return raw || '-';
        const year = Number(m[1]);
        const month = Number(m[2]);
        if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return raw;
        const d = new Date(Date.UTC(year, month - 1, 1));
        return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' });
    };

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

    function updateShareButtonState() {
        if (!shareRankingBtn) return;
        const hasData = (Array.isArray(currentViewData) && currentViewData.length > 0) || (Array.isArray(allData) && allData.length > 0);
        shareRankingBtn.disabled = !hasData;
    }

    async function shareTopRank() {
        const source = (Array.isArray(currentViewData) && currentViewData.length > 0) ? currentViewData : allData;
        const champion = Array.isArray(source) && source.length > 0 ? source[0] : null;

        if (!champion) {
            if (window.Toast) window.Toast.show('Belum ada data ranking untuk dibagikan.', 'info');
            return;
        }

        const periodText = rankingPeriod ? rankingPeriod.textContent.replace('Periode:', '').trim() : '';
        const periodLabel = periodText || new Date().toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        const championName = formatName(champion.username);
        const championScore = formatScore(champion.score);
        const championTime = formatTime(champion.time_spent);
        const shareUrl = new URL('/ranking.html', window.location.origin).href;

        const shareData = {
            title: 'Juara #1 Ranking Kuis IPM Panawuan',
            text: `Juara #1 periode ${periodLabel}: ${championName} dengan ${championScore} poin (${championTime} detik). Berani geser posisi ini?`,
            url: shareUrl
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
                return;
            }

            const fallbackText = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(fallbackText);
                if (window.Toast) window.Toast.show('Info juara #1 berhasil disalin.', 'success');
                return;
            }

            window.prompt('Salin info juara #1:', fallbackText);
        } catch (error) {
            if (error && error.name === 'AbortError') return;
            if (window.Toast) window.Toast.show('Gagal membagikan ranking.', 'error');
        }
    }

    function renderHallOfFame(rows) {
        if (!hallOfFameWrap || !hallOfFameEl) return;
        const items = Array.isArray(rows) ? rows : [];
        if (!items.length) {
            hallOfFameWrap.hidden = true;
            hallOfFameEl.innerHTML = '';
            return;
        }

        hallOfFameWrap.hidden = false;
        hallOfFameEl.innerHTML = items.map((row, idx) => {
            const username = escapeHtml(formatName(row.username));
            const titles = formatScore(row.title_count || 0);
            return `
                <div class="hof-item">
                    <span class="hof-pos">${idx + 1}</span>
                    <span class="hof-name" title="${username}">${username}</span>
                    <span class="hof-count">${titles} gelar</span>
                </div>
            `;
        }).join('');
    }

    function renderArchivePodium(rows, ym) {
        if (!archiveSection || !archivePodium || !archiveMeta || !archiveEmpty) return;

        const items = Array.isArray(rows) ? rows : [];
        const map = new Map();
        items.forEach((row) => {
            const rank = Number(row.rank_position || row.rank || 0);
            if (rank >= 1 && rank <= 3) map.set(rank, row);
        });

        archiveSection.style.display = 'block';
        const label = formatYmLabel(ym);
        archiveMeta.textContent = `Arsip periode ${label}`;
        archiveEmpty.hidden = true;

        const cards = [];
        for (let rank = 1; rank <= 3; rank++) {
            const row = map.get(rank) || null;
            if (!row) {
                cards.push(`
                    <div class="archive-card rank-${rank} is-empty">
                        <div class="archive-rank">Juara ${rank}</div>
                        <div class="archive-name">Belum ada data</div>
                        <div class="archive-pimpinan">-</div>
                        <div class="archive-stats"><span class="archive-score">0 pts</span><span>0 detik</span></div>
                    </div>
                `);
                continue;
            }

            const name = escapeHtml(formatName(row.username_snapshot || row.username));
            const pimpinan = escapeHtml(formatPimpinan(row.pimpinan_snapshot || row.pimpinan));
            const score = formatScore(row.score);
            const timeSpent = formatTime(row.time_spent);
            cards.push(`
                <div class="archive-card rank-${rank}">
                    <div class="archive-rank">Juara ${rank}</div>
                    <div class="archive-name" title="${name}">${name}</div>
                    <div class="archive-pimpinan" title="${pimpinan}">${pimpinan}</div>
                    <div class="archive-stats"><span class="archive-score">${score} pts</span><span>${timeSpent} detik</span></div>
                </div>
            `);
        }

        archivePodium.innerHTML = cards.join('');
    }

    async function loadArchiveByYm(ym, force = false) {
        if (!archiveSection || !archivePodium || !archiveMeta || !archiveEmpty) return;
        const key = String(ym || '').trim();
        if (!key) return;

        if (!force && archiveCache.has(key)) {
            renderArchivePodium(archiveCache.get(key), key);
            return;
        }

        archiveMeta.textContent = `Memuat arsip ${formatYmLabel(key)}...`;

        try {
            const response = await fetch(`${API_URL}/results?mode=archive&ym=${encodeURIComponent(key)}`);
            if (!response.ok) throw new Error(`Gagal memuat arsip (${response.status})`);
            const payload = await response.json();
            if (payload.status !== 'success') throw new Error(payload.message || 'Gagal memuat arsip');

            const rows = Array.isArray(payload.archives) ? payload.archives : [];
            archiveCache.set(key, rows);
            if (!rows.length) {
                archiveSection.style.display = 'block';
                archivePodium.innerHTML = '';
                archiveMeta.textContent = `Arsip periode ${formatYmLabel(key)}`;
                archiveEmpty.hidden = false;
                archiveEmpty.textContent = 'Belum ada juara tersimpan untuk periode ini.';
                return;
            }

            renderArchivePodium(rows, key);
        } catch (error) {
            archiveSection.style.display = 'block';
            archivePodium.innerHTML = '';
            archiveMeta.textContent = 'Gagal memuat arsip bulanan.';
            archiveEmpty.hidden = false;
            archiveEmpty.textContent = error.message || 'Terjadi kesalahan saat memuat arsip.';
        }
    }

    async function loadArchiveMonths(force = false) {
        if (!archiveSection || !archiveMonthSelect || !archiveMeta || !archiveEmpty) return;

        try {
            const response = await fetch(`${API_URL}/results?mode=archiveMonths`);
            if (!response.ok) throw new Error(`Gagal memuat daftar arsip (${response.status})`);
            const payload = await response.json();
            if (payload.status !== 'success') throw new Error(payload.message || 'Gagal memuat daftar arsip');

            archiveMonths = Array.isArray(payload.months) ? payload.months : [];
            renderHallOfFame(Array.isArray(payload.hall_of_fame) ? payload.hall_of_fame : []);

            archiveSection.style.display = 'block';
            if (!archiveMonths.length) {
                archiveMonthSelect.innerHTML = '<option value="">Belum ada arsip</option>';
                archiveMonthSelect.disabled = true;
                archivePodium.innerHTML = '';
                archiveMeta.textContent = 'Belum ada arsip bulanan.';
                archiveEmpty.hidden = false;
                archiveEmpty.textContent = 'Arsip akan otomatis muncul setiap pergantian bulan.';
                return;
            }

            const selectedBefore = String(archiveMonthSelect.value || '').trim();
            const selectedYm = archiveMonths.some(m => String(m.ym) === selectedBefore)
                ? selectedBefore
                : String(archiveMonths[0].ym || '');

            archiveMonthSelect.disabled = false;
            archiveMonthSelect.innerHTML = archiveMonths.map((m) => {
                const ym = String(m.ym || '');
                const label = formatYmLabel(ym);
                const champ = escapeHtml(formatName(m.champion_name || ''));
                const score = m.champion_score ? `${formatScore(m.champion_score)} pts` : '';
                const suffix = champ ? ` - #1 ${champ}${score ? ` (${score})` : ''}` : '';
                return `<option value="${escapeHtml(ym)}">${escapeHtml(label + suffix)}</option>`;
            }).join('');
            archiveMonthSelect.value = selectedYm;

            await loadArchiveByYm(selectedYm, force);
        } catch (error) {
            archiveSection.style.display = 'block';
            archiveMonthSelect.innerHTML = '<option value="">Gagal memuat arsip</option>';
            archiveMonthSelect.disabled = true;
            archivePodium.innerHTML = '';
            archiveMeta.textContent = 'Gagal memuat daftar arsip.';
            archiveEmpty.hidden = false;
            archiveEmpty.textContent = error.message || 'Terjadi kesalahan saat memuat arsip.';
            renderHallOfFame([]);
        }
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

    function normalizeRankingData(raw) {
        const byUser = new Map();
        (raw || []).forEach((entry, index) => {
            const rawName = String(entry.username || '').trim();
            const username = rawName || 'Anonim';
            const ts = new Date(entry.ts || entry.timestamp || 0).getTime() || 0;
            const key = rawName ? rawName.toLowerCase() : `anonim-${index}-${ts}`;
            const score = toNumber(entry.score || 0);
            const time = toNumber(entry.time_spent || 0);
            const cleanedEntry = {
                ...entry,
                username,
                score,
                time_spent: time
            };

            const current = byUser.get(key);
            if (!current) {
                byUser.set(key, { ...cleanedEntry, _key: key, _score: score, _time: time, _ts: ts });
                return;
            }

            const better =
                score > current._score ||
                (score === current._score && time < current._time) ||
                (score === current._score && time === current._time && ts < current._ts);

            if (better) {
                byUser.set(key, { ...cleanedEntry, _key: key, _score: score, _time: time, _ts: ts });
            }
        });

        return Array.from(byUser.values()).map(item => {
            const cleaned = { ...item };
            delete cleaned._key;
            delete cleaned._score;
            delete cleaned._time;
            delete cleaned._ts;
            return cleaned;
        });
    }

    async function fetchRankingData() {
        if (allData.length === 0 && window.AppLoader) AppLoader.show('Memuat Peringkat...');
        showLoading(true);
        try {
            const response = await fetch(`${API_URL}/results`);
            if (!response.ok) throw new Error(`Gagal mengambil data (Status: ${response.status})`);

            const data = await response.json();
            if (data.status !== 'success') throw new Error(data.message || 'Kesalahan server.');

            const normalized = normalizeRankingData(Array.isArray(data.results) ? data.results.slice() : []);
            const newData = normalized.sort((a, b) => {
                const scoreDiff = (b.score || 0) - (a.score || 0);
                if (scoreDiff !== 0) return scoreDiff;
                const timeDiff = (a.time_spent || 0) - (b.time_spent || 0);
                if (timeDiff !== 0) return timeDiff;
                const tsDiff = (new Date(a.ts || a.timestamp || 0)) - (new Date(b.ts || b.timestamp || 0));
                if (tsDiff !== 0) return tsDiff;
                return String(a.username || '').localeCompare(String(b.username || ''), 'id', { sensitivity: 'base' });
            });

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
                currentViewData = empty ? [] : allData.slice();

                if (!empty) {
                    // Apply current filter
                    handleFilterAndSearch();
                } else {
                    updateShareButtonState();
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
                previousRanks.set(nameKey(p.username), index + 1);
            });
            return;
        }

        const newRankMap = new Map();
        newData.forEach((p, index) => {
            newRankMap.set(nameKey(p.username), index + 1);
        });
        if (!currentUser) {
            previousRanks = newRankMap;
            return;
        }

        const userKey = nameKey(currentUser);
        const userOldRank = previousRanks.get(userKey);
        const userNewRank = newRankMap.get(userKey);

        if (userOldRank && userNewRank) {
            if (userNewRank < userOldRank) {
                // Rank Improved
                showRankToast('Peringkat Naik', `Selamat! Kamu naik dari #${userOldRank} ke #${userNewRank}`, 'gold');
            }
        }

        // Check if user entered Top 3
        if ((!userOldRank || userOldRank > 3) && userNewRank <= 3) {
            showRankToast('Masuk 3 Besar', `Luar biasa! Kamu sekarang berada di posisi #${userNewRank}`, 'gold');
        }

        previousRanks = newRankMap;
    }

    function renderPage(data) {
        renderUserRank(data);
        renderTop3(data.slice(0, 3));
        renderRest(data.slice(3));
    }

    function renderUserRank(data) {
        if (!currentUser) {
            userRankCard.style.display = 'none';
            return;
        }

        const userIndex = data.findIndex(p => nameKey(p.username) === nameKey(currentUser));

        if (userIndex !== -1) {
            const user = data[userIndex];
            const rank = userIndex + 1;
            const displayName = formatName(user.username);
            const safeName = escapeHtml(displayName);

            userRankCard.innerHTML = `
                <div class="user-rank-content">
                    <div class="user-rank-info">
                        <span class="user-rank-name" title="${safeName}">${safeName}</span>
                        <span class="user-rank-label">Peringkat Anda</span>
                        <span class="user-rank-value">#${rank}</span>
                    </div>
                    <div class="user-stats">
                        <span class="user-score">${formatScore(user.score)} Poin</span>
                        <span class="user-time">${formatTime(user.time_spent)} detik</span>
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
        for (let rank = 1; rank <= 3; rank++) {
            const p = top3Data[rank - 1] || null;

            const podiumItem = document.createElement('div');
            podiumItem.className = `podium-item rank-${rank}${p ? '' : ' is-empty'}`;

            if (!p) {
                podiumItem.innerHTML = `
                    <div class="avatar-container placeholder">
                        <span class="avatar-char">-</span>
                    </div>
                    <div class="podium-base">
                        <div class="podium-rank">Posisi ${rank}</div>
                        <div class="podium-name">Belum Ada</div>
                        <div class="podium-pimpinan">Menunggu peserta</div>
                        <div class="podium-score">0 <span>pts</span></div>
                    </div>
                `;
                top3Container.appendChild(podiumItem);
                continue;
            }

            // UX: Active Indicator for Top 3
            const lastActive = new Date(p.ts || p.timestamp || 0);
            const isToday = Number.isFinite(lastActive.getTime()) && lastActive.setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0);
            const activeBadge = isToday ? '<span class="active-dot" title="Aktif Hari Ini"></span>' : '';
            const displayName = formatName(p.username);
            const safeName = escapeHtml(displayName);
            const displayPimpinan = escapeHtml(formatPimpinan(p.pimpinan));
            const displayScore = formatScore(p.score);
            const avatarUrl = getAvatarUrl(p);
            const avatarMarkup = avatarUrl
                ? `<img src="${avatarUrl}" alt="${safeName}" loading="lazy" decoding="async">`
                : `<span class="avatar-char">${getInitial(displayName)}</span>`;

            podiumItem.innerHTML = `
                <div class="avatar-container ring-${rank}">
                    ${rank === 1 ? '<div class="crown-box"><i class="fas fa-crown crown-icon"></i></div>' : ''}
                    ${rank === 1 ? '<div class="badge-box gold">1</div>' : ''}
                    ${rank === 2 ? '<div class="badge-box silver">2</div>' : ''}
                    ${rank === 3 ? '<div class="badge-box bronze">3</div>' : ''}
                    ${avatarMarkup}
                    ${activeBadge}
                </div>
                <div class="podium-base">
                    <div class="podium-rank">Juara ${rank}</div>
                    <div class="podium-name" title="${safeName}">${safeName}</div>
                    <div class="podium-pimpinan" title="${displayPimpinan}">${displayPimpinan}</div>
                    <div class="podium-score">${displayScore} <span>pts</span></div>
                </div>
            `;

            top3Container.appendChild(podiumItem);
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
            const oldRank = previousRanks.get(nameKey(p.username));
            if (oldRank) {
                if (rank < oldRank) movementIcon = '<span class="rank-up" title="Naik Peringkat"><i class="fas fa-caret-up"></i></span>';
                else if (rank > oldRank) movementIcon = '<span class="rank-down" title="Turun Peringkat"><i class="fas fa-caret-down"></i></span>';
                else movementIcon = '<span class="rank-same"><i class="fas fa-minus"></i></span>';
            } else {
                movementIcon = '<span class="rank-new">NEW</span>';
            }

            // UX: Active Today Indicator
            const lastActive = new Date(p.ts || p.timestamp || 0);
            const isToday = Number.isFinite(lastActive.getTime()) && lastActive.setHours(0, 0, 0, 0) === new Date().setHours(0, 0, 0, 0);
            const activeBadge = isToday ? '<span class="active-badge" title="Aktif Hari Ini"><i class="fas fa-fire"></i></span>' : '';
            const displayName = formatName(p.username);
            const safeName = escapeHtml(displayName);
            const displayPimpinan = escapeHtml(formatPimpinan(p.pimpinan));
            const displayScore = formatScore(p.score);
            const displayTime = formatTime(p.time_spent);
            const avatarUrl = getAvatarUrl(p);
            const avatarMarkup = avatarUrl
                ? `<img src="${avatarUrl}" alt="${safeName}" loading="lazy" decoding="async">`
                : `<span class="avatar-char">${getInitial(displayName)}</span>`;

            const item = document.createElement('div');
            item.className = 'rank-item';
            if (nameKey(p.username) === nameKey(currentUser)) {
                item.classList.add('is-me');

                const nextUser = restData[index - 1] || (index === 0 ? allData[2] : null); // the guy above you
                let copy = '';
                if (nextUser) {
                    const diff = toNumber(nextUser.score) - toNumber(p.score);
                    if (diff > 0) copy = `<div class="rank-motivation">Kejar <b>${formatScore(diff)} poin</b> lagi untuk salip ${escapeHtml(formatName(nextUser.username))}.</div>`;
                    else copy = '<div class="rank-motivation">Skor sama. Main lagi untuk menyalip.</div>';
                }

                item.dataset.motivation = copy ? "true" : "false"; // Hook for CSS
            }

            // Animation delay based on index
            item.style.animationDelay = `${index * 0.05}s`;

            item.innerHTML = `
                <div class="rank-pos">
                    ${rank}
                    <div class="rank-move">${movementIcon}</div>
                </div>
                <div class="rank-avatar" title="${safeName}">
                    ${avatarMarkup}
                </div>
                <div class="rank-info">
                    <div class="rank-name">
                        <span title="${safeName}">${safeName}</span> ${activeBadge}
                    </div>
                    <div class="rank-pimpinan" title="${displayPimpinan}">${displayPimpinan}</div>
                    <div class="rank-meta">${formatDate(p.ts || p.timestamp)}</div>
                    ${item.classList.contains('is-me') && index > 0 ? `<div class="rank-motivation-text"><small>Selisih ${formatScore((restData[index - 1] || allData[2]).score - p.score)} poin ke posisi #${rank - 1}</small> <a href="quiz-gamified.html" class="cta-mini">Ejar!</a></div>` : ''}
                </div>
                <div class="rank-score-box">
                    <div class="rank-score">${displayScore}</div>
                    <span class="rank-time">${displayTime}s</span>
                </div>
            `;

            rankingList.appendChild(item);
        });

        // Add Global CTA at bottom
        const ctaParams = document.createElement('div');
        ctaParams.className = 'ranking-footer-cta';
        ctaParams.innerHTML = '<button onclick="window.location.href=\'quiz-gamified.html\'" class="btn-shine">Tantang Pemain Lain</button>';
        rankingList.appendChild(ctaParams);
    }

    function handleFilterAndSearch() {
        const searchTerm = searchInput.value.toLowerCase();
        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;

        let filteredData = allData.filter(p => nameKey(p.username).includes(searchTerm));

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
        currentViewData = filteredData;

        if (empty) {
            rankingList.innerHTML = `<div style="text-align:center; padding: 20px; color: #888;">Tidak ada data yang cocok.</div>`;
            top3Container.innerHTML = '';
        } else {
            renderPage(filteredData);
        }

        updateShareButtonState();
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

    if (archiveMonthSelect) {
        archiveMonthSelect.addEventListener('change', () => {
            const ym = String(archiveMonthSelect.value || '').trim();
            if (!ym) return;
            loadArchiveByYm(ym);
        });
    }

    if (shareRankingBtn) {
        shareRankingBtn.addEventListener('click', shareTopRank);
    }

    const reloadBtn = document.getElementById('empty-reload');
    if (reloadBtn) reloadBtn.addEventListener('click', () => fetchRankingData());

    // Initial Load (Cache then Network)
    setRankingPeriod();
    updateShareButtonState();
    loadArchiveMonths().catch(() => {});
    try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
        if (cached && Array.isArray(cached.data) && (Date.now() - cached.t < 60000 * 5)) {
            allData = cached.data;
            if (allData.length > 0) {
                renderPage(allData);
                currentViewData = allData.slice();
                document.getElementById('empty-state').style.display = 'none';
                document.getElementById('main-content').style.display = 'block';
                showLoading(false);
                updateShareButtonState();
            }
        }
    } catch { }

    // Smart Polling Implementation
    let pollTimeout;
    let archiveRefreshCounter = 0;
    async function startPolling() {
        await fetchRankingData();
        archiveRefreshCounter += 1;
        if (archiveRefreshCounter % 20 === 0) {
            await loadArchiveMonths(true);
        }
        // Schedule next poll only after current finishes
        pollTimeout = setTimeout(startPolling, 30000);
    }

    startPolling();

    // Cleanup on page unload (optional but good practice)
    window.addEventListener('beforeunload', () => clearTimeout(pollTimeout));
});

