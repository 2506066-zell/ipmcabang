document.addEventListener('DOMContentLoaded', () => {
    const USER_SESSION_KEY = 'ipmquiz_user_session';
    const getSession = () => sessionStorage.getItem(USER_SESSION_KEY) || localStorage.getItem(USER_SESSION_KEY) || '';
    const uiBack = window.__uiBack;

    // Views
    const listView = document.getElementById('discussions-list-view');
    const detailView = document.getElementById('discussion-detail-view');
    const feedContainer = document.getElementById('discussions-feed');
    
    // Detail Elements
    const threadHead = document.getElementById('thread-head');
    const repliesList = document.getElementById('replies-list');
    
    // Forms & Modals
    const btnNewTopic = document.getElementById('btn-new-topic');
    const modalTopic = document.getElementById('topic-modal');
    const btnCloseTopic = document.getElementById('btn-close-topic');
    const btnSubmitTopic = document.getElementById('btn-submit-topic');
    
    const replyForm = document.getElementById('reply-form');
    const replyLoginPrompt = document.getElementById('reply-login-prompt');
    const btnSubmitReply = document.getElementById('btn-submit-reply');
    
    let currentDiscussionId = null;

    // Relative Time Helper
    function timeAgo(dateString) {
        const date = new Date(dateString);
        const seconds = Math.floor((new Date() - date) / 1000);
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
                renderDiscussions(data.discussions);
            } else {
                feedContainer.innerHTML = `<div class="error-placeholder"><i class="fas fa-exclamation-circle"></i> <p>${data.message || 'Gagal memuat diskusi.'}</p></div>`;
            }
        } catch (error) {
            feedContainer.innerHTML = '<div class="error-placeholder"><i class="fas fa-wifi"></i> <p>Terjadi kesalahan koneksi.</p></div>';
        }
    }

    function renderDiscussions(items) {
        if (!items || items.length === 0) {
            feedContainer.innerHTML = `
                <div class="empty-placeholder">
                    <i class="fas fa-comments"></i>
                    <p>Belum ada diskusi.</p>
                    <span>Mulai bagikan idemu sekarang!</span>
                </div>
            `;
            return;
        }

        feedContainer.innerHTML = items.map(t => `
            <article class="thread-card reveal" data-id="${t.id}">
                <div class="thread-meta">
                    <div class="author-info">
                        <span class="thread-author">${t.username}</span>
                        <span class="author-badge ${t.user_role === 'admin' ? 'admin' : 'member'}">
                            ${t.user_role === 'admin' ? 'Admin' : 'Kader'}
                        </span>
                    </div>
                    <span class="thread-time">${timeAgo(t.created_at)}</span>
                </div>
                <h3 class="thread-title">${t.title}</h3>
                <p class="thread-snippet">${t.content}</p>
                <div class="thread-footer">
                    <span><i class="far fa-comment-dots"></i> ${t.reply_count || 0} Balasan</span>
                    <span><i class="far fa-eye"></i> ${t.views || 0}</span>
                </div>
            </article>
        `).join('');

        // Re-run reveal animations
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

    async function openDetail(id) {
        currentDiscussionId = id;
        listView.hidden = true;
        detailView.hidden = false;
        
        threadHead.innerHTML = '<div class="skeleton-card shimmer" style="height: 140px;"></div>';
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
                            <span class="thread-author">${t.username}</span>
                            <span class="author-badge ${t.user_role === 'admin' ? 'admin' : 'member'}">
                                ${t.user_role === 'admin' ? 'Admin' : 'Kader'}
                            </span>
                        </div>
                        <span class="thread-time">${timeAgo(t.created_at)}</span>
                    </div>
                    <h2 class="thread-title-full">${t.title}</h2>
                    <div class="thread-full-content">${t.content}</div>
                    <div class="thread-stats">
                        <span><i class="far fa-eye"></i> Dilihat ${t.views || 0} kali</span>
                    </div>
                `;

                if (data.replies && data.replies.length > 0) {
                    repliesList.innerHTML = data.replies.map(r => `
                        <div class="reply-card">
                            <div class="thread-meta">
                                <span class="thread-author">${r.username}</span>
                                <span>${timeAgo(r.created_at)}</span>
                            </div>
                            <div class="reply-content">${r.content}</div>
                        </div>
                    `).join('');
                } else {
                    repliesList.innerHTML = '<div class="no-replies">Belum ada balasan. Jadilah yang pertama membalas!</div>';
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
            replyForm.style.display = 'flex';
            replyLoginPrompt.hidden = true;
        } else {
            replyForm.style.display = 'none';
            replyLoginPrompt.hidden = false;
        }
    }

    function closeDetail(fromPop = false) {
        detailView.hidden = true;
        listView.hidden = false;
        currentDiscussionId = null;
        if (!fromPop && uiBack) uiBack.requestClose('discussion-detail');
        loadDiscussions(true); // Quiet refresh
    }

    document.getElementById('btn-back-to-list').addEventListener('click', () => closeDetail());

    // New Topic Modal Control
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

    btnNewTopic.addEventListener('click', () => toggleModalTopic(true));
    btnCloseTopic.addEventListener('click', () => {
        if (uiBack) uiBack.requestClose('discussions-modal');
        else toggleModalTopic(false);
    });

    // uiBack Registrations
    if (uiBack) {
        uiBack.register('discussion-detail', (fromPop) => closeDetail(fromPop));
        uiBack.register('discussions-modal', (fromPop) => {
            modalTopic.hidden = true;
            document.body.classList.remove('body-no-scroll');
        });
    }

    // Submit Topic
    btnSubmitTopic.addEventListener('click', async () => {
        const title = document.getElementById('topic-title').value.trim();
        const content = document.getElementById('topic-content').value.trim();

        if (!title || !content) {
            if (window.Toast) Toast.show('Judul dan isi tidak boleh kosong', 'error');
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
                
                document.getElementById('topic-title').value = '';
                document.getElementById('topic-content').value = '';
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

    // Submit Reply
    btnSubmitReply.addEventListener('click', async () => {
        if (!currentDiscussionId) return;

        const content = document.getElementById('reply-content').value.trim();
        if (!content) {
            if (window.Toast) Toast.show('Balasan tidak boleh kosong', 'info');
            return;
        }

        btnSubmitReply.disabled = true;
        btnSubmitReply.textContent = 'Mengirim...';

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
                if (window.Toast) Toast.show('Balasan terkirim', 'success');
                document.getElementById('reply-content').value = '';
                openDetail(currentDiscussionId);
            } else {
                if (window.Toast) Toast.show(data.message || 'Gagal membalas', 'error');
            }
        } catch (e) {
            if (window.Toast) Toast.show('Kesalahan jaringan', 'error');
        } finally {
            btnSubmitReply.disabled = false;
            btnSubmitReply.textContent = 'Kirim Balasan';
        }
    });

    // Init
    loadDiscussions();
});

