document.addEventListener('DOMContentLoaded', () => {
    const USER_SESSION_KEY = 'ipmquiz_user_session';
    const getSession = () => sessionStorage.getItem(USER_SESSION_KEY) || localStorage.getItem(USER_SESSION_KEY) || '';
    const uiBack = window.__uiBack;

    // Views
    const listView = document.getElementById('discussions-list-view');
    const detailView = document.getElementById('discussion-detail-view');
    const feedContainer = document.getElementById('discussions-feed');
    const searchBar = document.getElementById('forum-search-bar');
    
    // Detail Elements
    const threadHead = document.getElementById('thread-head');
    const repliesList = document.getElementById('replies-list');
    
    // Forms & Modals
    const btnNewTopic = document.getElementById('btn-new-topic');
    const modalTopic = document.getElementById('topic-modal');
    const btnCloseTopic = document.getElementById('btn-close-topic');
    const btnSubmitTopic = document.getElementById('btn-submit-topic');
    const topicTitleInput = document.getElementById('topic-title');
    const topicTitleCount = document.getElementById('topic-title-count');
    const searchInput = document.getElementById('forum-search-input');
    
    const replyForm = document.getElementById('reply-form');
    const replyLoginPrompt = document.getElementById('reply-login-prompt');
    const btnSubmitReply = document.getElementById('btn-submit-reply');
    
    // Stats
    const statTopics = document.getElementById('stat-topics');
    const statReplies = document.getElementById('stat-replies');
    const statViews = document.getElementById('stat-views');
    
    let currentDiscussionId = null;
    let allDiscussions = [];
    let searchDebounce = null;

    function escapeHtml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function getInitial(name) {
        return String(name || '?').charAt(0).toUpperCase();
    }

    function timeAgo(dateString) {
        const date = new Date(dateString);
        const seconds = Math.floor((new Date() - date) / 1000);
        if (seconds < 60) return "baru saja";
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " tahun lalu";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " bulan lalu";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " hari lalu";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " jam lalu";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " menit lalu";
        return "baru saja";
    }

    // ── Character Counter ────────────────────────
    if (topicTitleInput && topicTitleCount) {
        topicTitleInput.addEventListener('input', () => {
            topicTitleCount.textContent = `${topicTitleInput.value.length} / 150`;
        });
    }

    // ── Search ───────────────────────────────────
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => {
                const q = searchInput.value.trim().toLowerCase();
                if (!q) {
                    renderDiscussions(allDiscussions);
                    return;
                }
                const filtered = allDiscussions.filter(t =>
                    (t.title || '').toLowerCase().includes(q) ||
                    (t.content || '').toLowerCase().includes(q) ||
                    (t.username || '').toLowerCase().includes(q)
                );
                renderDiscussions(filtered);
            }, 250);
        });
    }

    // ── Load Discussions ─────────────────────────
    async function loadDiscussions(quiet = false) {
        if (!quiet) {
            feedContainer.innerHTML = `
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
                <div class="skeleton-card"></div>
            `;
        }

        try {
            const res = await fetch('/api/discussions');
            const data = await res.json();
            
            if (data.status === 'success') {
                allDiscussions = data.discussions || [];
                renderDiscussions(allDiscussions);
                updateStats(allDiscussions);
            } else {
                feedContainer.innerHTML = `<div class="error-placeholder"><i class="fas fa-exclamation-circle"></i> <p>${escapeHtml(data.message || 'Gagal memuat diskusi.')}</p></div>`;
            }
        } catch (error) {
            feedContainer.innerHTML = '<div class="error-placeholder"><i class="fas fa-wifi-slash"></i> <p>Tidak bisa terhubung ke server.</p><span>Periksa koneksi internet lalu coba lagi.</span></div>';
        }
    }

    function updateStats(items) {
        if (!items || !items.length) {
            if (statTopics) statTopics.textContent = '0';
            if (statReplies) statReplies.textContent = '0';
            if (statViews) statViews.textContent = '0';
            return;
        }
        const totalReplies = items.reduce((sum, t) => sum + (Number(t.reply_count) || 0), 0);
        const totalViews = items.reduce((sum, t) => sum + (Number(t.views) || 0), 0);
        if (statTopics) statTopics.textContent = items.length;
        if (statReplies) statReplies.textContent = totalReplies;
        if (statViews) statViews.textContent = totalViews > 999 ? `${(totalViews/1000).toFixed(1)}k` : totalViews;
    }

    function renderDiscussions(items) {
        if (!items || items.length === 0) {
            feedContainer.innerHTML = `
                <div class="empty-placeholder">
                    <i class="fas fa-comments"></i>
                    <p>Belum ada topik diskusi.</p>
                    <span>Jadilah yang pertama membagikan ide!</span>
                </div>
            `;
            return;
        }

        feedContainer.innerHTML = items.map(t => `
            <article class="thread-card reveal" data-id="${t.id}">
                <div class="thread-meta">
                    <div class="author-info">
                        <div class="thread-avatar">${getInitial(t.nama_panjang || t.username)}</div>
                        <div>
                            <span class="thread-author">${escapeHtml(t.nama_panjang || t.username)}</span>
                            <span class="author-badge ${t.user_role === 'admin' ? 'admin' : 'member'}">
                                ${t.user_role === 'admin' ? 'Admin' : 'Kader'}
                            </span>
                        </div>
                    </div>
                    <span class="thread-time">${timeAgo(t.created_at)}</span>
                </div>
                ${t.category && t.category !== 'Umum' ? `<span class="thread-category-tag">${escapeHtml(t.category)}</span>` : ''}
                <h3 class="thread-title">${escapeHtml(t.title)}</h3>
                <p class="thread-snippet">${escapeHtml(t.content)}</p>
                <div class="thread-footer">
                    <span><i class="far fa-comment-dots"></i> ${t.reply_count || 0} Balasan</span>
                    <span><i class="far fa-eye"></i> ${t.views || 0}</span>
                </div>
            </article>
        `).join('');

        // Reveal animations
        if (window.revealObserver) {
            document.querySelectorAll('.thread-card.reveal').forEach(el => window.revealObserver.observe(el));
        }

        // Attach click listeners
        document.querySelectorAll('.thread-card').forEach(card => {
            card.addEventListener('click', () => {
                openDetail(card.getAttribute('data-id'));
            });
        });
    }

    // ── Detail View ──────────────────────────────
    async function openDetail(id) {
        currentDiscussionId = id;
        listView.hidden = true;
        detailView.hidden = false;
        if (searchBar) searchBar.hidden = true;
        
        threadHead.innerHTML = '<div class="skeleton-card" style="height: 180px;"></div>';
        repliesList.innerHTML = '';
        
        checkAuthForReply();

        if (uiBack) uiBack.open('discussion-detail');

        try {
            const res = await fetch(`/api/discussions?id=${id}`);
            const data = await res.json();
            
            if (data.status === 'success') {
                const t = data.discussion;
                threadHead.innerHTML = `
                    <div class="thread-meta">
                        <div class="author-info">
                            <div class="thread-avatar">${getInitial(t.nama_panjang || t.username)}</div>
                            <div>
                                <span class="thread-author">${escapeHtml(t.nama_panjang || t.username)}</span>
                                <span class="author-badge ${t.user_role === 'admin' ? 'admin' : 'member'}">
                                    ${t.user_role === 'admin' ? 'Admin' : 'Kader'}
                                </span>
                            </div>
                        </div>
                        <span class="thread-time">${timeAgo(t.created_at)}</span>
                    </div>
                    <h2 class="thread-title-full">${escapeHtml(t.title)}</h2>
                    <div class="thread-full-content">${escapeHtml(t.content)}</div>
                    <div class="thread-stats">
                        <span><i class="far fa-eye"></i> Dilihat ${t.views || 0} kali</span>
                        <span><i class="far fa-calendar"></i> ${new Date(t.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                    </div>
                `;

                if (data.replies && data.replies.length > 0) {
                    repliesList.innerHTML = data.replies.map(r => `
                        <div class="reply-card">
                            <div class="thread-meta">
                                <div class="author-info">
                                    <div class="thread-avatar">${getInitial(r.nama_panjang || r.username)}</div>
                                    <div>
                                        <span class="thread-author">${escapeHtml(r.nama_panjang || r.username)}</span>
                                        <span class="author-badge ${r.user_role === 'admin' ? 'admin' : 'member'}">
                                            ${r.user_role === 'admin' ? 'Admin' : 'Kader'}
                                        </span>
                                    </div>
                                </div>
                                <span class="thread-time">${timeAgo(r.created_at)}</span>
                            </div>
                            <div class="reply-content">${escapeHtml(r.content)}</div>
                        </div>
                    `).join('');
                } else {
                    repliesList.innerHTML = '<div class="no-replies"><i class="far fa-comment-dots" style="font-size: 1.5rem; margin-bottom: 8px; display: block; opacity: 0.3;"></i>Belum ada balasan. Jadilah yang pertama!</div>';
                }

                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (err) {
            threadHead.innerHTML = '<div class="error-placeholder"><p>Gagal memuat detail diskusi.</p></div>';
        }
    }

    function checkAuthForReply() {
        const session = getSession();
        if (session) {
            if (replyForm) replyForm.style.display = 'flex';
            if (replyLoginPrompt) replyLoginPrompt.hidden = true;
        } else {
            if (replyForm) replyForm.style.display = 'none';
            if (replyLoginPrompt) replyLoginPrompt.hidden = false;
        }
    }

    function closeDetail(fromPop = false) {
        detailView.hidden = true;
        listView.hidden = false;
        if (searchBar) searchBar.hidden = false;
        currentDiscussionId = null;
        if (!fromPop && uiBack) uiBack.requestClose('discussion-detail');
        loadDiscussions(true);
    }

    document.getElementById('btn-back-to-list')?.addEventListener('click', () => closeDetail());

    // ── Modal Controls ───────────────────────────
    function toggleModalTopic(show) {
        if (show) {
            if (!getSession()) {
                if (window.Toast) Toast.show('Silakan Login untuk menulis topik', 'info');
                setTimeout(() => { window.location.href = 'login.html'; }, 800);
                return;
            }
            modalTopic.hidden = false;
            document.body.classList.add('body-no-scroll');
            if (uiBack) uiBack.open('discussions-modal');
        } else {
            modalTopic.hidden = true;
            document.body.classList.remove('body-no-scroll');
        }
    }

    btnNewTopic?.addEventListener('click', () => toggleModalTopic(true));
    btnCloseTopic?.addEventListener('click', () => {
        if (uiBack) uiBack.requestClose('discussions-modal');
        else toggleModalTopic(false);
    });

    // Close modal on overlay click
    modalTopic?.addEventListener('click', (e) => {
        if (e.target === modalTopic) {
            if (uiBack) uiBack.requestClose('discussions-modal');
            else toggleModalTopic(false);
        }
    });

    // uiBack Registrations
    if (uiBack) {
        uiBack.register('discussion-detail', (fromPop) => closeDetail(fromPop));
        uiBack.register('discussions-modal', () => {
            modalTopic.hidden = true;
            document.body.classList.remove('body-no-scroll');
        });
    }

    // ── Submit Topic ─────────────────────────────
    btnSubmitTopic?.addEventListener('click', async () => {
        const title = topicTitleInput?.value.trim();
        const content = document.getElementById('topic-content')?.value.trim();

        if (!title || title.length < 3) {
            if (window.Toast) Toast.show('Judul minimal 3 karakter', 'error');
            return;
        }
        if (!content || content.length < 5) {
            if (window.Toast) Toast.show('Isi diskusi minimal 5 karakter', 'error');
            return;
        }

        btnSubmitTopic.disabled = true;
        const originalText = btnSubmitTopic.innerHTML;
        btnSubmitTopic.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memposting...';

        try {
            const res = await fetch('/api/discussions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getSession()}`
                },
                body: JSON.stringify({ title, content })
            });

            const data = await res.json();
            if (data.status === 'success') {
                if (window.Toast) Toast.show('Diskusi berhasil diposting!', 'success');
                if (uiBack) uiBack.requestClose('discussions-modal');
                else toggleModalTopic(false);
                
                if (topicTitleInput) topicTitleInput.value = '';
                if (document.getElementById('topic-content')) document.getElementById('topic-content').value = '';
                if (topicTitleCount) topicTitleCount.textContent = '0 / 150';
                loadDiscussions();
            } else {
                if (window.Toast) Toast.show(data.message || 'Gagal memposting', 'error');
            }
        } catch (e) {
            if (window.Toast) Toast.show('Kesalahan jaringan', 'error');
        } finally {
            btnSubmitTopic.disabled = false;
            btnSubmitTopic.innerHTML = originalText;
        }
    });

    // ── Submit Reply ─────────────────────────────
    btnSubmitReply?.addEventListener('click', async () => {
        if (!currentDiscussionId) return;

        const replyContent = document.getElementById('reply-content');
        const content = replyContent?.value.trim();
        if (!content || content.length < 2) {
            if (window.Toast) Toast.show('Balasan minimal 2 karakter', 'info');
            return;
        }

        btnSubmitReply.disabled = true;
        const originalText = btnSubmitReply.innerHTML;
        btnSubmitReply.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Mengirim...';

        try {
            const res = await fetch('/api/discussions?action=reply', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getSession()}`
                },
                body: JSON.stringify({ discussion_id: currentDiscussionId, content })
            });

            const data = await res.json();
            if (data.status === 'success') {
                if (window.Toast) Toast.show('Balasan terkirim!', 'success');
                if (replyContent) replyContent.value = '';
                openDetail(currentDiscussionId);
            } else {
                if (window.Toast) Toast.show(data.message || 'Gagal membalas', 'error');
            }
        } catch (e) {
            if (window.Toast) Toast.show('Kesalahan jaringan', 'error');
        } finally {
            btnSubmitReply.disabled = false;
            btnSubmitReply.innerHTML = originalText;
        }
    });

    // ── Init ─────────────────────────────────────
    loadDiscussions();
});
