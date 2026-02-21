document.addEventListener('DOMContentLoaded', () => {

    const uiBack = (() => {
        const state = { current: null, closers: {} };

        const register = (name, closeFn) => {
            if (!name || typeof closeFn !== 'function') return;
            state.closers[name] = closeFn;
        };

        const open = (name) => {
            if (!name || !window.history || !window.history.pushState) return;
            if (state.current === name) return;
            if (state.current && state.closers[state.current]) {
                state.closers[state.current](true);
            }
            state.current = name;
            window.history.pushState({ __ui: name }, '', window.location.href);
        };

        const isActive = (name) => state.current === name;

        const requestClose = (name) => {
            if (!name) return;
            if (isActive(name) && window.history && window.history.state && window.history.state.__ui === name) {
                window.history.back();
                return;
            }
            if (state.closers[name]) state.closers[name](true);
            if (state.current === name) state.current = null;
        };

        window.addEventListener('popstate', () => {
            if (!state.current) return;
            const closeFn = state.closers[state.current];
            if (closeFn) closeFn(true);
            state.current = null;
        });

        return { register, open, requestClose, isActive };
    })();

    window.__uiBack = uiBack;


    const hamburgerMenu = document.getElementById('hamburger-menu');
    const mobileNav = document.getElementById('mobile-nav');
    const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
    const headerRight = document.querySelector('.header-right-icons');

    const openMobileNav = () => {
        mobileNav.classList.add('open');
        mobileNav.setAttribute('aria-hidden', 'false');
        if (mobileNavOverlay) mobileNavOverlay.classList.add('open');
        if (hamburgerMenu) hamburgerMenu.setAttribute('aria-expanded', 'true');
        document.body.classList.add('body-no-scroll');
        uiBack.open('mobile-nav');
    };

    const closeMobileNav = (fromPop) => {
        mobileNav.classList.remove('open');
        mobileNav.setAttribute('aria-hidden', 'true');
        if (mobileNavOverlay) mobileNavOverlay.classList.remove('open');
        if (hamburgerMenu) hamburgerMenu.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('body-no-scroll');
        if (!fromPop) uiBack.requestClose('mobile-nav');
    };

    if (hamburgerMenu && mobileNav) {
        uiBack.register('mobile-nav', closeMobileNav);
        hamburgerMenu.addEventListener('click', () => {
            const isOpen = mobileNav.classList.contains('open');
            if (isOpen) closeMobileNav();
            else openMobileNav();
        });
    }
    if (mobileNavOverlay && mobileNav) {
        mobileNavOverlay.addEventListener('click', () => {
            closeMobileNav();
        });
    }

    const quizInstrToggle = document.getElementById('quiz-instructions-toggle');
    const quizInstrBody = document.getElementById('quiz-instructions-body');
    if (quizInstrToggle && quizInstrBody) {
        quizInstrToggle.addEventListener('click', (e) => {
            e.preventDefault();
            const collapsed = quizInstrBody.classList.toggle('collapsed');
            quizInstrToggle.classList.toggle('collapsed', collapsed);
        });
    }

    const USER_SESSION_KEY = 'ipmquiz_user_session';
    const USER_USERNAME_KEY = 'ipmquiz_user_username';
    const ARTICLE_SEEN_KEY = 'ipm_last_seen_article_ts';
    const getSession = () => sessionStorage.getItem(USER_SESSION_KEY) || localStorage.getItem(USER_SESSION_KEY) || '';
    const getUsername = () => sessionStorage.getItem(USER_USERNAME_KEY) || localStorage.getItem(USER_USERNAME_KEY) || '';
    function isArticlesPagePath(pathname) {
        const path = String(pathname || '');
        return path.includes('articles.html') || path === '/articles' || path.startsWith('/articles/');
    }

    function getArticleHref(article) {
        const slug = String(article?.slug || '').trim();
        if (slug) return `/articles/${encodeURIComponent(slug)}`;
        return `/articles?id=${encodeURIComponent(article?.id || '')}`;
    }

    function getArticleSlugFromPath(pathname) {
        const path = String(pathname || '');
        const match = path.match(/^\/articles\/([^/?#]+)/i);
        if (!match || !match[1]) return '';
        try {
            return decodeURIComponent(match[1]);
        } catch {
            return match[1];
        }
    }

    if (headerRight && !document.getElementById('profile-header-btn')) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'profile-header-btn';
        btn.className = 'header-icon profile-icon-btn';
        btn.setAttribute('aria-label', 'Profil');
        const icon = document.createElement('i');
        icon.className = 'fas fa-user';
        btn.appendChild(icon);
        const anchor = headerRight.querySelector('#hamburger-menu');
        if (anchor) headerRight.insertBefore(btn, anchor);
        else headerRight.appendChild(btn);

        const username = String(getUsername() || '').trim();
        if (username) btn.title = `Profil ${username}`;

        btn.addEventListener('click', () => {
            const session = getSession();
            if (!session) {
                window.location.href = '/login.html';
                return;
            }
            if (window.ProfilePage && window.ProfilePage.open) {
                window.ProfilePage.open();
            } else {
                console.warn('[Profile] Modal belum siap');
            }
        });
    }

    // Open profile modal if redirected from /profile page
    try {
        if (sessionStorage.getItem('open_profile_modal') === '1') {
            sessionStorage.removeItem('open_profile_modal');
            if (window.ProfilePage && window.ProfilePage.open) {
                window.ProfilePage.open();
            }
        }
    } catch {}

    // --- Notifications (Global) ---
    if (!window.__notifInitialized && headerRight) {
        window.__notifInitialized = true;

        const ensureNotifBell = () => {
            let bell = document.getElementById('notif-bell');
            if (!bell) {
                bell = document.createElement('button');
                bell.type = 'button';
                bell.id = 'notif-bell';
                bell.className = 'header-icon notif-bell';
                bell.setAttribute('aria-label', 'Notifikasi');
                bell.innerHTML = '<i class="fas fa-bell"></i><span class="notif-badge" id="notif-badge" hidden>0</span>';
                const anchor = headerRight.querySelector('#profile-header-btn') || headerRight.querySelector('#hamburger-menu');
                if (anchor) headerRight.insertBefore(bell, anchor);
                else headerRight.appendChild(bell);
            }
            return bell;
        };

        const ensureNotifPanel = () => {
            let overlay = document.getElementById('notif-overlay');
            let panel = document.getElementById('notif-panel');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'notif-overlay';
                overlay.id = 'notif-overlay';
                overlay.hidden = true;
                document.body.appendChild(overlay);
            }
            if (!panel) {
                panel = document.createElement('div');
                panel.className = 'notif-panel';
                panel.id = 'notif-panel';
                panel.hidden = true;
                panel.innerHTML = `
                    <div class="notif-panel-header">
                        <span>Notifikasi</span>
                        <button class="notif-close" id="notif-close" aria-label="Tutup">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="notif-push" id="notif-push" hidden>
                        <div class="notif-push-text">
                            Aktifkan notifikasi agar update muncul di lock screen.
                        </div>
                        <div class="notif-push-warning" id="notif-push-warning" hidden>
                            Notifikasi belum aktif di server. Hubungi admin.
                        </div>
                        <button class="notif-push-btn" id="notif-push-btn">Aktifkan Notifikasi</button>
                    </div>
                    <div class="notif-countdown" id="notif-countdown" hidden>
                        <div class="notif-countdown-label">Program Kerja Mendatang</div>
                        <div class="notif-countdown-title" id="notif-countdown-title"></div>
                        <div class="notif-countdown-timer" id="notif-countdown-timer"></div>
                        <div class="notif-countdown-sub" id="notif-countdown-sub"></div>
                    </div>
                    <div class="notif-panel-list" id="notif-panel-list"></div>
                    <button class="notif-mark-read" id="notif-mark-read">Tandai semua dibaca</button>
                `;
                document.body.appendChild(panel);
            }
            return { overlay, panel };
        };

        const state = { notifications: [], unread: 0, articleUnread: 0, latestArticle: null, schedule: null, scheduleMode: '', scheduleTimer: null };
        const session = getSession();

        const updateNotifBadge = () => {
            const badge = document.getElementById('notif-badge');
            const bell = document.getElementById('notif-bell');
            const totalBadge = state.unread + state.articleUnread;
            if (badge) {
                badge.textContent = String(totalBadge);
                badge.hidden = totalBadge === 0;
            }
            if (bell) bell.title = `${totalBadge} notifikasi`;
        };

        const fetchArticleNotif = async () => {
            try {
                const artRes = await fetch('/api/articles?size=1&sort=newest');
                if (artRes.ok) {
                    const artData = await artRes.json();
                    const latest = Array.isArray(artData.articles) ? artData.articles[0] : null;
                    if (latest) {
                        const published = new Date(latest.publish_date || latest.created_at || Date.now()).getTime();
                        const lastSeen = Number(localStorage.getItem(ARTICLE_SEEN_KEY) || 0);
                        if (published > lastSeen) {
                            state.articleUnread = 1;
                            state.latestArticle = latest;
                        } else {
                            state.articleUnread = 0;
                            state.latestArticle = null;
                        }
                    }
                }
            } catch {}
        };

        const filterRecentNotifications = (items) => {
            const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
            return (items || []).filter(n => {
                const ts = new Date(n.created_at || n.createdAt || n.time || n.date || 0).getTime();
                if (!ts) return true;
                return ts >= cutoff;
            });
        };

        const fetchUserNotifications = async () => {
            if (!session || state.authFailed) return;
            try {
                let res = await fetch('/api/users?action=notifications', { headers: { Authorization: `Bearer ${session}` } });
                if (res.status === 401 || res.status === 403) {
                    state.authFailed = true;
                    return;
                }
                if (res.status === 404) {
                    res = await fetch('/api/notifications', { headers: { Authorization: `Bearer ${session}` } });
                    if (res.status === 401 || res.status === 403) {
                        state.authFailed = true;
                        return;
                    }
                }
                if (res.ok) {
                    const data = await res.json();
                    if (data.status === 'success' && Array.isArray(data.notifications)) {
                        const recent = filterRecentNotifications(data.notifications);
                        state.notifications = recent;
                        state.unread = recent.filter(n => !n.is_read).length;
                    }
                }
            } catch {}
        };

        const selectScheduleForNotif = (schedules) => {
            const now = Date.now();
            const filtered = (schedules || []).filter(s => s && (s.show_in_notif === true || s.show_in_notif === 'true'));
            if (!filtered.length) return null;
            const active = filtered.find(s => {
                const start = s.start_time ? new Date(s.start_time).getTime() : 0;
                const end = s.end_time ? new Date(s.end_time).getTime() : Infinity;
                return start <= now && now < end;
            });
            if (active) return { schedule: active, mode: 'end' };
            const upcoming = filtered.filter(s => s.start_time && new Date(s.start_time).getTime() > now)
                .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))[0];
            if (upcoming) return { schedule: upcoming, mode: 'start' };
            return null;
        };

        const formatScheduleDateTime = (value) => {
            if (!value) return '';
            const d = new Date(value);
            if (Number.isNaN(d.getTime())) return '';
            return d.toLocaleString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        };

        const renderNotifCountdown = () => {
            const wrap = document.getElementById('notif-countdown');
            const titleEl = document.getElementById('notif-countdown-title');
            const timerEl = document.getElementById('notif-countdown-timer');
            const subEl = document.getElementById('notif-countdown-sub');
            if (!wrap || !titleEl || !timerEl || !subEl) return;

            if (!state.schedule) {
                wrap.hidden = true;
                return;
            }

            const { schedule, scheduleMode } = state;
            const title = schedule.title || schedule.description || 'Program Kerja Mendatang';
            const startLabel = formatScheduleDateTime(schedule.start_time);
            const endLabel = formatScheduleDateTime(schedule.end_time);
            titleEl.textContent = title;
            wrap.hidden = false;

            const renderSegments = (days, hours, minutes, seconds) => {
                const makeSeg = (value, label) => `
                    <span class="notif-countdown-seg">
                        <span class="notif-countdown-val">${value}</span>
                        <span class="notif-countdown-unit">${label}</span>
                    </span>
                `;
                return [
                    makeSeg(String(days).padStart(2, '0'), 'Hari'),
                    makeSeg(String(hours).padStart(2, '0'), 'Jam'),
                    makeSeg(String(minutes).padStart(2, '0'), 'Menit'),
                    makeSeg(String(seconds).padStart(2, '0'), 'Detik')
                ].join('');
            };

            const setStateText = (text) => {
                timerEl.innerHTML = `<span class="notif-countdown-state">${text}</span>`;
            };

            const update = () => {
                const now = Date.now();
                if (scheduleMode === 'end') {
                    const end = schedule.end_time ? new Date(schedule.end_time).getTime() : 0;
                    if (!end || end <= now) {
                        setStateText('Sedang berlangsung');
                        subEl.textContent = endLabel ? `Status: Sedang berlangsung • Berakhir: ${endLabel}` : 'Status: Sedang berlangsung';
                        return;
                    }
                    const diff = Math.max(0, end - now);
                    const totalSeconds = Math.floor(diff / 1000);
                    const days = Math.floor(totalSeconds / 86400);
                    const hours = Math.floor((totalSeconds % 86400) / 3600);
                    const minutes = Math.floor((totalSeconds % 3600) / 60);
                    const seconds = totalSeconds % 60;
                    timerEl.innerHTML = renderSegments(days, hours, minutes, seconds);
                    subEl.textContent = endLabel ? `Status: Sedang berlangsung • Berakhir: ${endLabel}` : 'Status: Sedang berlangsung';
                    return;
                }

                const start = schedule.start_time ? new Date(schedule.start_time).getTime() : 0;
                if (!start || start <= now) {
                    setStateText('Mulai sekarang');
                    subEl.textContent = startLabel ? `Status: Mulai sekarang • Mulai: ${startLabel}` : 'Status: Mulai sekarang';
                    return;
                }
                const diff = Math.max(0, start - now);
                const totalSeconds = Math.floor(diff / 1000);
                const days = Math.floor(totalSeconds / 86400);
                const hours = Math.floor((totalSeconds % 86400) / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                timerEl.innerHTML = renderSegments(days, hours, minutes, seconds);
                subEl.textContent = startLabel ? `Status: Akan dimulai • Mulai: ${startLabel}` : 'Status: Akan dimulai';
            };

            update();
            if (state.scheduleTimer) clearInterval(state.scheduleTimer);
            state.scheduleTimer = setInterval(update, 1000);
        };

        const fetchCountdownSchedule = async () => {
            try {
                const res = await fetch('/api/questions?mode=schedules');
                if (!res.ok) return;
                const data = await res.json();
                if (data.status !== 'success') return;
                const pick = selectScheduleForNotif(data.schedules || []);
                if (pick) {
                    state.schedule = pick.schedule;
                    state.scheduleMode = pick.mode;
                } else {
                    state.schedule = null;
                    state.scheduleMode = '';
                }
                renderNotifCountdown();
            } catch {}
        };

        const fetchNotifications = async () => {
            await fetchArticleNotif();
            await fetchCountdownSchedule();
            updateNotifBadge();
            if (state.articleUnread && window.Toast) {
                window.Toast.show('Ada artikel terbaru. Lihat di notifikasi.', 'info');
            }
        };

        const renderNotifList = () => {
            const list = document.getElementById('notif-panel-list');
            if (!list) return;
            const items = [];
            if (state.latestArticle && state.articleUnread) {
                items.push({
                    title: `Artikel baru: ${state.latestArticle.title}`,
                    time: state.latestArticle.publish_date || state.latestArticle.created_at,
                    unread: true,
                    link: getArticleHref(state.latestArticle)
                });
            }
            state.notifications.forEach(n => {
                items.push({
                    title: n.message || 'Ada pembaruan pada kuis.',
                    time: n.created_at,
                    unread: !n.is_read
                });
            });
            if (!items.length) {
                list.innerHTML = '<div class="notif-empty">Belum ada notifikasi.</div>';
                return;
            }
            list.innerHTML = items.map(item => `
                <div class="notif-item ${item.unread ? 'unread' : ''}">
                    <div class="notif-item-title">${item.title}</div>
                    <div class="notif-item-meta">${item.time ? new Date(item.time).toLocaleString('id-ID') : ''}</div>
                    ${item.link ? `<a class="notif-item-link" href="${item.link}">Buka Artikel</a>` : ''}
                </div>
            `).join('');
        };

        const { overlay, panel } = ensureNotifPanel();
        const bell = ensureNotifBell();

        const openPanel = async () => {
            await fetchUserNotifications();
            await fetchCountdownSchedule();
            renderNotifList();
            renderNotifCountdown();
            await updatePushUI();
            updateNotifBadge();
            panel.hidden = false;
            overlay.hidden = false;
            uiBack.open('notif-panel');
        };
        const closePanel = (fromPop) => {
            panel.hidden = true;
            overlay.hidden = true;
            if (state.scheduleTimer) {
                clearInterval(state.scheduleTimer);
                state.scheduleTimer = null;
            }
            if (!fromPop) uiBack.requestClose('notif-panel');
        };

        bell?.addEventListener('click', () => {
            if (panel.hidden) openPanel();
            else closePanel();
        });
        overlay?.addEventListener('click', closePanel);
        document.getElementById('notif-close')?.addEventListener('click', closePanel);
        document.getElementById('notif-mark-read')?.addEventListener('click', () => {
            if (state.latestArticle) {
                const published = new Date(state.latestArticle.publish_date || state.latestArticle.created_at || Date.now()).getTime();
                localStorage.setItem(ARTICLE_SEEN_KEY, String(published));
            }
            state.unread = 0;
            state.articleUnread = 0;
            updateNotifBadge();
            closePanel();
        });

        // Fallback: event delegation to always close
        document.addEventListener('click', (e) => {
            if (e.target && e.target.closest && e.target.closest('#notif-close')) closePanel();
            if (e.target && e.target.closest && e.target.closest('#notif-overlay')) closePanel();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closePanel();
        });

        uiBack.register('notif-panel', closePanel);

        // Update last seen when opening article detail page
        try {
            const url = new URL(window.location.href);
            const slugFromPath = getArticleSlugFromPath(window.location.pathname);
            const isArticleDetail = isArticlesPagePath(window.location.pathname) && (url.searchParams.get('id') || url.searchParams.get('slug') || slugFromPath);
            if (isArticleDetail) {
                const id = url.searchParams.get('id');
                const slug = url.searchParams.get('slug') || slugFromPath;
                fetch(`/api/articles?${id ? `id=${encodeURIComponent(id)}` : `slug=${encodeURIComponent(slug)}`}`)
                    .then(r => r.json())
                    .then(data => {
                        if (data.status === 'success' && data.article) {
                            const published = new Date(data.article.publish_date || data.article.created_at || Date.now()).getTime();
                            localStorage.setItem(ARTICLE_SEEN_KEY, String(published));
                        }
                    })
                    .catch(() => {});
            }
        } catch {}

        fetchNotifications();
    }

    // --- PUSH SUBSCRIPTION (PWA) ---
    const pushState = { subscribed: false, inFlight: false, vapidMissing: false };

    const urlBase64ToUint8Array = (base64String) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
        const rawData = atob(base64);
        return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
    };

    const getVapidKey = async () => {
        if (pushState.vapidMissing) return null;
        try {
            const res = await fetch('/api/push?action=publicKey');
            if (!res.ok) {
                pushState.vapidMissing = true;
                return null;
            }
            const data = await res.json();
            const key = data.publicKey || null;
            pushState.vapidMissing = !key;
            return key;
        } catch {
            pushState.vapidMissing = true;
            return null;
        }
    };

    async function ensurePushSubscription() {
        if (pushState.inFlight || pushState.subscribed) return;
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        if (Notification.permission === 'denied') return;

        pushState.inFlight = true;
        try {
            const registration = await navigator.serviceWorker.ready;
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                const permission = await Notification.requestPermission();
                if (permission !== 'granted') {
                    pushState.inFlight = false;
                    return;
                }
                const publicKey = await getVapidKey();
                await updatePushUI();
                if (!publicKey) {
                    if (window.Toast) Toast.show('Notifikasi belum aktif di server.', 'error');
                    pushState.inFlight = false;
                    return;
                }
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(publicKey)
                });
            }

            await fetch('/api/push?action=subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(getSession() ? { Authorization: `Bearer ${getSession()}` } : {})
                },
                body: JSON.stringify({ subscription })
            });
            pushState.subscribed = true;
            await updatePushUI();
        } catch {}
        finally {
            pushState.inFlight = false;
        }
    }

    async function detectPushSubscription() {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            pushState.subscribed = !!subscription;
            return pushState.subscribed;
        } catch {
            return false;
        }
    }

    async function updatePushUI() {
        const wrap = document.getElementById('notif-push');
        const btn = document.getElementById('notif-push-btn');
        const warn = document.getElementById('notif-push-warning');
        if (!wrap || !btn) return;
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            wrap.hidden = true;
            return;
        }
        if (Notification.permission === 'denied') {
            wrap.hidden = true;
            return;
        }
        await detectPushSubscription();
        if (pushState.subscribed) {
            wrap.hidden = true;
            return;
        }
        if (warn) warn.hidden = !pushState.vapidMissing;
        wrap.hidden = false;
        btn.disabled = pushState.inFlight;
    }

    document.addEventListener('click', (e) => {
        if (e.target && e.target.closest && e.target.closest('#notif-push-btn')) {
            ensurePushSubscription();
        }
    });

    // --- DYNAMIC FEATURES (Phase 4) ---

    // Typewriter Effect
    const typewriterEl = document.getElementById('typewriter');
    if (typewriterEl) {
        const phrases = [
            "\"Dari Pemahaman, Menata Arah Gerak\"",
            "PC IPM Panawuan",
            "Pelajar Berkemajuan",
            "Nuun Wal Qolami Wamaa Yasthuruun"
        ];
        let i = 0, j = 0, isDeleting = false;

        function type() {
            const current = phrases[i];
            if (isDeleting) {
                typewriterEl.textContent = current.substring(0, j - 1);
                j--;
            } else {
                typewriterEl.textContent = current.substring(0, j + 1);
                j++;
            }

            let speed = isDeleting ? 50 : 100;
            if (!isDeleting && j === current.length) {
                isDeleting = true;
                speed = 2000; // Pause at end
            } else if (isDeleting && j === 0) {
                isDeleting = false;
                i = (i + 1) % phrases.length;
                speed = 500;
            }
            setTimeout(type, speed);
        }
        type();
    }

    // Mouse Parallax for Hero Logo
    const heroLogo = document.querySelector('.hero-logo');
    if (heroLogo && window.innerWidth > 768) {
        document.addEventListener('mousemove', (e) => {
            const moveX = (e.clientX - window.innerWidth / 2) / 50;
            const moveY = (e.clientY - window.innerHeight / 2) / 50;
            heroLogo.style.transform = `translate(${moveX}px, ${moveY}px) rotate(${moveX / 2}deg)`;
        });
    }

    // Scroll Reveal
    const revealElements = document.querySelectorAll('.reveal');
    const observerOptions = {
        threshold: 0.15,
        rootMargin: "0px 0px -50px 0px"
    };

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                revealObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    revealElements.forEach(el => revealObserver.observe(el));

    // Fetch Program Kerja Highlights
    const highlightsGrid = document.getElementById('highlights-content');
    if (highlightsGrid) {
        fetch('/api/articles?page=1&size=3&category=Program Kerja&sort=newest')
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success' && data.articles) {
                    renderHighlights(data.articles);
                }
            })
            .catch(err => console.error('Error fetching highlights:', err));
    }

    // Countdown Program Kerja (Homepage)
    const programCountdown = document.getElementById('program-countdown');
    const programCountdownTitle = document.getElementById('program-countdown-title');
    const programCountdownTimer = document.getElementById('program-countdown-timer');
    const programCountdownSub = document.getElementById('program-countdown-sub');
    let programCountdownInterval = null;
    let programCountdownSchedule = null;

    const selectScheduleForHome = (schedules) => {
        const now = Date.now();
        // Ikuti aturan yang sama dengan countdown notifikasi (show_in_notif)
        const filtered = (schedules || []).filter(s => s && (s.show_in_notif === true || s.show_in_notif === 'true'));
        if (!filtered.length) return null;
        const active = filtered.find(s => {
            const start = s.start_time ? new Date(s.start_time).getTime() : 0;
            const end = s.end_time ? new Date(s.end_time).getTime() : Infinity;
            return start <= now && now < end;
        });
        if (active) return active;
        const upcoming = filtered.filter(s => s.start_time && new Date(s.start_time).getTime() > now)
            .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))[0];
        return upcoming || null;
    };

        const updateProgramCountdown = () => {
            if (!programCountdownSchedule || !programCountdown || !programCountdownTitle || !programCountdownTimer || !programCountdownSub) return;
            const now = Date.now();
            const start = programCountdownSchedule.start_time ? new Date(programCountdownSchedule.start_time).getTime() : 0;
            const end = programCountdownSchedule.end_time ? new Date(programCountdownSchedule.end_time).getTime() : 0;
            const title = programCountdownSchedule.title || programCountdownSchedule.description || 'Program Kerja Mendatang';
            programCountdownTitle.textContent = title;
        const startLabel = programCountdownSchedule.start_time ? new Date(programCountdownSchedule.start_time).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : '';
        const endLabel = programCountdownSchedule.end_time ? new Date(programCountdownSchedule.end_time).toLocaleString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) : '';

        if (start && now < start) {
            const diff = Math.max(0, start - now);
            const totalSeconds = Math.floor(diff / 1000);
            const days = Math.floor(totalSeconds / 86400);
            const hours = Math.floor((totalSeconds % 86400) / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            programCountdownTimer.textContent = `${String(days).padStart(2, '0')}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
            programCountdownSub.textContent = startLabel ? `Status: Akan dimulai • Mulai: ${startLabel}` : 'Status: Akan dimulai';
            programCountdown.hidden = false;
            return;
        }

        if (end && now < end) {
            const diff = Math.max(0, end - now);
            const totalSeconds = Math.floor(diff / 1000);
            const days = Math.floor(totalSeconds / 86400);
            const hours = Math.floor((totalSeconds % 86400) / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            programCountdownTimer.textContent = `${String(days).padStart(2, '0')}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
            programCountdownSub.textContent = endLabel ? `Status: Sedang berlangsung • Berakhir: ${endLabel}` : 'Status: Sedang berlangsung';
            programCountdown.hidden = false;
            return;
        }

        programCountdownTimer.textContent = 'Selesai';
        programCountdownSub.textContent = endLabel ? `Status: Selesai • Berakhir: ${endLabel}` : 'Status: Selesai';
        programCountdown.hidden = false;
    };

    const fetchProgramCountdown = async () => {
        if (!programCountdown) return;
        try {
            const res = await fetch('/api/questions?mode=schedules');
            if (!res.ok) return;
            const data = await res.json();
            if (data.status !== 'success') return;
            const picked = selectScheduleForHome(data.schedules || []);
            programCountdownSchedule = picked;
            if (!picked) {
                programCountdown.hidden = true;
                if (programCountdownInterval) clearInterval(programCountdownInterval);
                return;
            }
            updateProgramCountdown();
            if (programCountdownInterval) clearInterval(programCountdownInterval);
            programCountdownInterval = setInterval(updateProgramCountdown, 1000);
        } catch {}
    };

    if (programCountdown) {
        fetchProgramCountdown();
    }

    const escapeHtml = (value) => String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    const sanitizeUrl = (raw, fallback) => {
        const val = String(raw || '').trim();
        if (!val) return fallback;
        if (/^javascript:/i.test(val)) return fallback;
        if (/^data:image\//i.test(val)) return val;
        if (/^data:/i.test(val)) return fallback;
        if (/^(https?:)?\/\//i.test(val) || val.startsWith('/')) return val;
        return fallback;
    };

    function renderHighlights(articles) {
        if (!highlightsGrid) return;
        if (articles.length === 0) {
            highlightsGrid.innerHTML = '<p>Belum ada program kerja mendatang.</p>';
            return;
        }

        highlightsGrid.innerHTML = articles.map(art => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = art.content;
            const snippet = escapeHtml((tempDiv.textContent || '').substring(0, 150) + '...');
            const date = new Date(art.publish_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            const safeTitle = escapeHtml(art.title || 'Tanpa Judul');

            return `
                <a href="${getArticleHref(art)}" class="highlight-item">
                    <div class="highlight-date">
                        <i class="fas fa-calendar-alt"></i> ${date}
                    </div>
                    <h3 class="highlight-item-title">${safeTitle}</h3>
                    <p class="highlight-item-snippet">${snippet}</p>
                </a>
            `;
        }).join('');
    }

    // Fetch Latest Articles (excluding Program Kerja to avoid duplication)
    const articlesGrid = document.getElementById('featured-articles-grid');
    if (articlesGrid) {
        fetch('/api/articles?page=1&size=3&category=!Program Kerja&sort=newest')
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success' && data.articles) {
                    renderLatestArticles(data.articles);
                }
            })
            .catch(err => console.error('Error fetching latest articles:', err));
    }

    function renderLatestArticles(articles) {
        if (!articlesGrid) return;
        if (articles.length === 0) {
            articlesGrid.innerHTML = '<p>Belum ada artikel terbaru.</p>';
            return;
        }

        articlesGrid.innerHTML = articles.map(art => {
            const date = new Date(art.publish_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            const safeImage = sanitizeUrl(art.image, '/ipm%20(2).png');
            const safeTitle = escapeHtml(art.title || 'Tanpa Judul');
            const safeCategory = escapeHtml(art.category || 'Umum');
            const safeAuthor = escapeHtml(art.author || 'Admin');
            return `
                <article class="article-card reveal">
                    <div class="article-card-image">
                        <img src="${escapeHtml(safeImage)}" alt="${safeTitle}" loading="lazy" onerror="this.onerror=null;this.src='/ipm%20(2).png'">
                    </div>
                    <div class="article-card-content">
                        <span class="article-badge">${safeCategory}</span>
                        <h3 class="article-card-title">${safeTitle}</h3>
                        <div class="article-card-meta">
                            <span><i class="fas fa-user-edit"></i> ${safeAuthor}</span>
                            <span><i class="fas fa-calendar-day"></i> ${date}</span>
                        </div>
                        <a href="${getArticleHref(art)}" class="stretched-link" style="position:absolute; inset:0; z-index:1;"></a>
                    </div>
                </article>
            `;
        }).join('');

        // Re-observe new elements
        document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));
    }

    // --- PREMIUM UX POLISH (Phase 5) ---

    // 1. Smooth Page Transitions
    const transitionOverlay = document.createElement('div');
    transitionOverlay.className = 'page-transition-overlay';
    document.body.appendChild(transitionOverlay);

    // Fade out on load
    requestAnimationFrame(() => {
        transitionOverlay.classList.add('fade-out');
    });

    // Fix blank screen on mobile back (bfcache restore)
    const resetTransitionOverlay = () => {
        transitionOverlay.classList.add('fade-out');
        transitionOverlay.style.pointerEvents = 'none';
    };

    window.addEventListener('pageshow', (e) => {
        resetTransitionOverlay();
        if (e.persisted) {
            // Ensure scroll + nav are usable after bfcache restore
            document.body.classList.remove('body-no-scroll');
            const mobileNav = document.getElementById('mobile-nav');
            const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
            if (mobileNav) mobileNav.classList.remove('open');
            if (mobileNavOverlay) mobileNavOverlay.classList.remove('open');
        }
    });

    // Use Event Delegation for all links (handles dynamic content too)
    document.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        if (!link) return;

        // Check if internal link and not a special case
        const isInternal = link.hostname === window.location.hostname;
        const isSelf = link.target === '_self' || !link.target;
        const noTransition = link.classList.contains('no-transition');
        const isAction = link.href.includes('javascript:') || link.getAttribute('href')?.startsWith('#');

        if (isInternal && isSelf && !noTransition && !isAction && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
            const href = link.href;
            if (!href) return;

            e.preventDefault();

            // Prevent multiple rapid clicks
            if (!transitionOverlay.classList.contains('fade-out')) return;

            transitionOverlay.classList.remove('fade-out');
            transitionOverlay.style.pointerEvents = 'all'; // Block interactions while transitioning

            setTimeout(() => {
                window.location.href = href;
            }, 300); // Faster for better responsiveness
        }
    });

    // 2. Premium Floating Action Button (FAB)
    const activeDoc = window.location.pathname;
    const isPublicPage = activeDoc.includes('index.html') ||
        isArticlesPagePath(activeDoc) ||
        activeDoc.includes('quiz.html') ||
        activeDoc.includes('ranking.html') ||
        activeDoc.endsWith('/');

    if (isPublicPage && !activeDoc.includes('/admin/')) {
        const fabContainer = document.createElement('div');
        fabContainer.className = 'premium-fab-container';
        fabContainer.innerHTML = `
            <a href="javascript:void(0)" class="fab-option back-to-top" id="back-to-top" data-label="Kembali ke Atas"><i class="fas fa-chevron-up"></i></a>
            <button class="fab-main" id="fab-main"><i class="fas fa-plus"></i></button>
            <div class="fab-options">
                <a href="ranking.html" class="fab-option" data-label="Peringkat"><i class="fas fa-trophy"></i></a>
                <a href="quiz.html" class="fab-option" data-label="Ikuti Kuis"><i class="fas fa-gamepad"></i></a>
                <a href="help.html" class="fab-option" data-label="Bantuan"><i class="fas fa-question"></i></a>
            </div>
        `;
        document.body.appendChild(fabContainer);

        const fabMain = document.getElementById('fab-main');
        const backToTopBtn = document.getElementById('back-to-top');

        fabMain.addEventListener('click', () => {
            const isOpen = fabContainer.classList.toggle('open');
            if (isOpen) uiBack.open('fab-menu');
            else uiBack.requestClose('fab-menu');
        });

        backToTopBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // Show/Hide Back to Top on Scroll
        window.addEventListener('scroll', () => {
            if (window.scrollY > 400) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        });

        // Close FAB when clicking outside
        document.addEventListener('click', (e) => {
            if (!fabContainer.contains(e.target)) {
                fabContainer.classList.remove('open');
                uiBack.requestClose('fab-menu');
            }
        });

        uiBack.register('fab-menu', () => {
            fabContainer.classList.remove('open');
        });
    }

    // Quiz instructions toggle (global)
    const instrToggle = document.getElementById('quiz-instructions-toggle');
    const instrBody = document.getElementById('quiz-instructions-body');
    if (instrToggle && instrBody) {
        instrToggle.addEventListener('click', () => {
            instrBody.classList.toggle('collapsed');
            instrToggle.classList.toggle('collapsed');
        });
    }
});

/* PWA Setup */
(() => {
    const isLocalhost = ['localhost', '127.0.0.1'].includes(location.hostname);
    const isProd = !isLocalhost && location.protocol === 'https:';

    if (isProd && 'serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then((reg) => {
                    console.log('SW registered');
                    reg.update();

                    if (reg.waiting) {
                        reg.waiting.postMessage('SKIP_WAITING');
                    }

                    reg.addEventListener('updatefound', () => {
                        const newWorker = reg.installing;
                        if (!newWorker) return;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                newWorker.postMessage('SKIP_WAITING');
                            }
                        });
                    });
                })
                .catch((err) => console.log('SW failed', err));
        });

        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (window.__swReloading) return;
            window.__swReloading = true;
            window.location.reload();
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('img:not([loading])').forEach((img) => {
            if (!img.hasAttribute('fetchpriority')) img.loading = 'lazy';
        });
    });
})();
