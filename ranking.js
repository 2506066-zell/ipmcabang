document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'https://script.google.com/macros/s/AKfycbzQfRpw3cbu_FOfiA4ftjv-9AcWklpSZieRJZeotvwVSc3lkXC6i3saKYtt4P0V9tVn/exec';

    const top3Container = document.getElementById('top-3-showcase');
    const rankingList = document.getElementById('ranking-list');
    const loadingIndicator = document.getElementById('loading-indicator');
    const mainContent = document.getElementById('main-content');
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');

    function showLoading(isLoading) {
        loadingIndicator.style.display = isLoading ? 'flex' : 'none';
        mainContent.style.display = isLoading ? 'none' : 'block';
        if (isLoading) {
            errorContainer.style.display = 'none';
        }
    }

    function showError(message) {
        errorMessage.textContent = message;
        loadingIndicator.style.display = 'none';
        mainContent.style.display = 'none';
        errorContainer.style.display = 'block';
    }

    async function fetchRankingData() {
        showLoading(true);
        try {
            const response = await fetch(`${API_URL}?action=getResults`);
            if (!response.ok) {
                throw new Error(`Gagal mengambil data dari server (Status: ${response.status}). Ini mungkin karena masalah izin pada Google Apps Script.`);
            }
            
            const data = await response.json();
            if (data.status === 'error') {
                throw new Error(data.message || 'Terjadi kesalahan pada server.');
            }

            renderRanking(data);
        } catch (error) {
            showError(error.message);
            console.error('Gagal mengambil data peringkat:', error);
        } finally {
            showLoading(false);
        }
    }

    function renderRanking(data) {
        if (!data || data.length === 0) {
            rankingList.innerHTML = `<p style="text-align: center;">Belum ada data peringkat.</p>`;
            return;
        }

        const sortedData = data.sort((a, b) => {
            if (b.percent !== a.percent) {
                return b.percent - a.percent;
            }
            return new Date(a.timestamp) - new Date(b.timestamp);
        });

        const top3 = sortedData.slice(0, 3);
        const rest = sortedData.slice(3);

        renderTop3(top3);
        renderRest(rest);
    }

    function renderTop3(top3Data) {
        top3Container.innerHTML = '';
        top3Data.forEach((p, index) => {
            const rank = index + 1;
            const card = document.createElement('div');
            card.className = `rank-card rank-${rank}`;
            
            let positionHTML = `<div class="rank-position">${rank}</div>`;
            if (rank === 1) positionHTML = `<div class="rank-position"><i class="fas fa-crown"></i></div>`;

            card.innerHTML = `
                ${positionHTML}
                <div class="avatar">${p.username.charAt(0).toUpperCase()}</div>
                <div class="name">${p.username}</div>
                <div class="score">${p.score} Poin</div>
                <div class="stats">
                    <span><i class="fas fa-stopwatch"></i> ${p.time_spent} dtk</span>
                    <span><i class="fas fa-redo"></i> ${p.attempt_count}x</span>
                </div>
            `;
            top3Container.appendChild(card);
        });
    }

    function renderRest(restData) {
        rankingList.innerHTML = '';
        if (restData.length === 0) return;

        restData.forEach((p, index) => {
            const rank = index + 4;
            const listItem = document.createElement('div');
            listItem.className = 'list-item';
            listItem.innerHTML = `
                <div class="rank">${rank}</div>
                <div class="name-avatar">
                    <div class="avatar-sm">${p.username.charAt(0).toUpperCase()}</div>
                    <span>${p.username}</span>
                </div>
                <div class="score">${p.percent}%</div>
                <div class="time">${new Date(p.timestamp).toLocaleDateString('id-ID')}</div>
            `;
            rankingList.appendChild(listItem);
        });
    }

    fetchRankingData();
});