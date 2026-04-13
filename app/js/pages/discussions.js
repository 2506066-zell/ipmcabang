document.addEventListener('DOMContentLoaded', () => {
    const USER_SESSION_KEY = 'ipmquiz_user_session';
    const getSession = () => sessionStorage.getItem(USER_SESSION_KEY) || localStorage.getItem(USER_SESSION_KEY) || '';

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

    async function loadDiscussions() {
        try {
            const res = await fetch('/api/discussions');
            const data = await res.json();
            
            if (data.status === 'success') {
                renderDiscussions(data.discussions);
            } else {
                feedContainer.innerHTML = '<p style="text-align:center; padding: 20px;">Gagal memuat diskusi.</p>';
            }
        } catch (error) {
            feedContainer.innerHTML = '<p style="text-align:center; padding: 20px;">Terjadi kesalahan koneksi.</p>';
        }
    }

    function renderDiscussions(items) {
        if (!items || items.length === 0) {
            feedContainer.innerHTML = `
                <div style="text-align:center; padding: 40px 20px; color: #64748b;">
                    <i class="fas fa-comments" style="font-size: 3rem; margin-bottom: 16px; opacity: 0.5;"></i>
                    <p>Belum ada topik diskusi. Jadilah yang pertama!</p>
                </div>
            `;
            return;
        }

        feedContainer.innerHTML = items.map(t => `
            <div class="thread-card" data-id="${t.id}">
                <div class="thread-meta">
                    <span class="thread-author">
                        ${t.username}
                        ${t.user_role === 'admin' ? '<span class="author-badge">Admin</span>' : '<span class="author-badge">Kader</span>'}
                    </span>
                    <span>${timeAgo(t.created_at)}</span>
                </div>
                <h3 class="thread-title">${t.title}</h3>
                <div class="thread-snippet">${t.content}</div>
                <div class="thread-footer">
                    <span><i class="fas fa-reply"></i> ${t.reply_count || 0} Balasan</span>
                    <span><i class="fas fa-eye"></i> ${t.views || 0} Dilihat</span>
                </div>
            </div>
        `).join('');

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
        
        threadHead.innerHTML = '<div class="skeleton-card" style="height: 150px;"></div>';
        repliesList.innerHTML = '';
        
        checkAuthForReply();

        try {
            const res = await fetch(`/api/discussions?id=${id}`);
            const data = await res.json();
            
            if (data.status === 'success') {
                const t = data.discussion;
                threadHead.innerHTML = `
                    <div class="thread-meta">
                        <span class="thread-author">
                            ${t.username}
                            ${t.user_role === 'admin' ? '<span class="author-badge">Admin</span>' : '<span class="author-badge">Kader</span>'}
                        </span>
                        <span>${timeAgo(t.created_at)}</span>
                    </div>
                    <h2 class="thread-title">${t.title}</h2>
                    <div class="thread-full-content">${t.content}</div>
                    <div class="thread-footer" style="margin-top:24px;">
                        <span><i class="fas fa-eye"></i> ${t.views || 0}x Dilihat</span>
                    </div>
                `;

                if (data.replies && data.replies.length > 0) {
                    repliesList.innerHTML = data.replies.map(r => `
                        <div class="reply-card">
                            <div class="thread-meta">
                                <span class="thread-author">
                                    ${r.username}
                                    ${r.user_role === 'admin' ? '<span class="author-badge">Admin</span>' : ''}
                                </span>
                                <span>${timeAgo(r.created_at)}</span>
                            </div>
                            <div class="reply-content">${r.content}</div>
                        </div>
                    `).join('');
                } else {
                    repliesList.innerHTML = '<p style="color:#64748b; font-size: 0.9rem; margin-bottom: 16px;">Belum ada balasan.</p>';
                }

                window.scrollTo(0, 0);

            }
        } catch (err) {
            threadHead.innerHTML = '<p>Gagal memuat detail diskusi.</p>';
        }
    }

    function checkAuthForReply() {
        const session = getSession();
        if (session) {
            replyForm.hidden = false;
            replyLoginPrompt.hidden = true;
        } else {
            replyForm.hidden = true;
            replyLoginPrompt.hidden = false;
        }
    }

    document.getElementById('btn-back-to-list').addEventListener('click', () => {
        detailView.hidden = true;
        listView.hidden = false;
        currentDiscussionId = null;
        loadDiscussions(); // Refresh view count
    });

    // New Topic Modal
    btnNewTopic.addEventListener('click', () => {
        if (!getSession()) {
            if (window.Toast) Toast.show('Silakan Login terlebih dahulu untuk menulis', 'info');
            setTimeout(() => { window.location.href = 'login.html'; }, 1000);
            return;
        }
        modalTopic.hidden = false;
        document.body.style.overflow = 'hidden';
    });

    btnCloseTopic.addEventListener('click', () => {
        modalTopic.hidden = true;
        document.body.style.overflow = '';
    });

    // Submit Topic
    btnSubmitTopic.addEventListener('click', async () => {
        const title = document.getElementById('topic-title').value.trim();
        const content = document.getElementById('topic-content').value.trim();

        if (!title || !content) {
            if (window.Toast) Toast.show('Judul dan konten tidak boleh kosong', 'error');
            return;
        }

        btnSubmitTopic.disabled = true;
        btnSubmitTopic.textContent = 'Memposting...';

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
                modalTopic.hidden = true;
                document.body.style.overflow = '';
                document.getElementById('topic-title').value = '';
                document.getElementById('topic-content').value = '';
                loadDiscussions();
            } else {
                if (window.Toast) Toast.show(data.message || 'Gagal memposting', 'error');
            }
        } catch (e) {
            if (window.Toast) Toast.show('Terjadi kesalahan jaringan', 'error');
        } finally {
            btnSubmitTopic.disabled = false;
            btnSubmitTopic.textContent = 'Posting Diskusi';
        }
    });

    // Submit Reply
    btnSubmitReply.addEventListener('click', async () => {
        if (!currentDiscussionId) return;

        const content = document.getElementById('reply-content').value.trim();
        if (!content) return;

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
                openDetail(currentDiscussionId); // Refresh detail
            } else {
                if (window.Toast) Toast.show(data.message || 'Gagal membalas', 'error');
            }
        } catch (e) {
            if (window.Toast) Toast.show('Terjadi kesalahan jaringan', 'error');
        } finally {
            btnSubmitReply.disabled = false;
            btnSubmitReply.textContent = 'Kirim Balasan';
        }
    });

    // Init
    loadDiscussions();
});
