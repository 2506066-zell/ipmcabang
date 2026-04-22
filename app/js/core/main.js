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

    // Premium boot animation for public pages that include #loading-overlay.
    (() => {
        const isStandalone = (
            window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
        ) || window.navigator.standalone === true;

        if (!document.body.classList.contains('page-home')) return;

        // In installed PWA, keep only subtle content entrance (no extra overlay).
        if (isStandalone) {
            document.body.classList.add('app-entering');
            requestAnimationFrame(() => {
                setTimeout(() => {
                    document.body.classList.remove('app-entering');
                }, 360);
            });
            return;
        }

        const overlay = document.getElementById('loading-overlay');
        if (!overlay || overlay.dataset.bootInit === '1' || overlay.classList.contains('hidden')) return;
        overlay.dataset.bootInit = '1';

        const minVisibleMs = 560;
        const maxWaitMs = 3000;
        const startedAt = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
        let finalized = false;

        const elapsed = () => {
            const now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
            return now - startedAt;
        };

        const closeOverlay = () => {
            if (overlay.classList.contains('boot-leave')) return;
            overlay.classList.remove('show');
            overlay.classList.add('boot-leave');
            document.body.classList.remove('app-entering');
            setTimeout(() => {
                overlay.classList.remove('boot-leave');
            }, 420);
        };

        const finalizeBoot = () => {
            if (finalized) return;
            finalized = true;
            const wait = Math.max(0, minVisibleMs - elapsed());
            setTimeout(closeOverlay, wait);
        };

        document.body.classList.add('app-entering');
        requestAnimationFrame(() => overlay.classList.add('show'));

        if (document.readyState === 'complete') {
            finalizeBoot();
        } else {
            window.addEventListener('load', finalizeBoot, { once: true });
        }

        setTimeout(finalizeBoot, maxWaitMs);
    })();


    const mobileHeader = document.getElementById('mobile-header');
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const mobileNav = document.getElementById('mobile-nav');
    const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
    const headerRight = document.querySelector('.header-right-icons');

    const syncHeaderScrolledState = () => {
        if (!mobileHeader) return;
        const isScrolled = (window.scrollY || window.pageYOffset || 0) > 8;
        mobileHeader.classList.toggle('is-scrolled', isScrolled);
    };
    syncHeaderScrolledState();
    window.addEventListener('scroll', syncHeaderScrolledState, { passive: true });

    const openMobileNav = () => {
        mobileNav.classList.add('open');
        mobileNav.setAttribute('aria-hidden', 'false');
        if (mobileNavOverlay) mobileNavOverlay.classList.add('open');
        if (hamburgerMenu) {
            hamburgerMenu.setAttribute('aria-expanded', 'true');
            hamburgerMenu.classList.add('is-open');
        }
        document.body.classList.add('body-no-scroll');
        uiBack.open('mobile-nav');
    };

    const closeMobileNav = (fromPop) => {
        mobileNav.classList.remove('open');
        mobileNav.setAttribute('aria-hidden', 'true');
        if (mobileNavOverlay) mobileNavOverlay.classList.remove('open');
        if (hamburgerMenu) {
            hamburgerMenu.setAttribute('aria-expanded', 'false');
            hamburgerMenu.classList.remove('is-open');
        }
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
    function syncProfileHeaderButton(btn) {
        if (!btn) return;
        const session = String(getSession() || '').trim();
        const username = String(getUsername() || '').trim();
        const isLoggedIn = !!session;

        btn.classList.toggle('is-login-state', !isLoggedIn);
        btn.classList.toggle('is-profile-state', isLoggedIn);

        if (!isLoggedIn) {
            btn.setAttribute('aria-label', 'Login');
            btn.title = 'Login';
            btn.textContent = 'Login';
            return;
        }

        btn.setAttribute('aria-label', 'Profil');
        btn.title = username ? `Profil ${username}` : 'Profil';
        btn.innerHTML = '<i class="fas fa-user" aria-hidden="true"></i>';
    }
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

    const ensureGlobalHeaderActions = () => {
        if (!headerRight) return {};

        // Remove duplicate legacy profile icons so we only keep one global profile control.
        const legacyProfiles = Array.from(headerRight.querySelectorAll('a[aria-label="Profil"], a[href="/profile"], a[href="profile.html"]'));
        const existingProfileButton = document.getElementById('profile-header-btn');
        legacyProfiles.forEach((legacy) => {
            if (existingProfileButton && legacy === existingProfileButton) return;
            legacy.remove();
        });

        let trophy = headerRight.querySelector('.header-icon[href="ranking.html"], .header-icon[href="/ranking.html"]');
        if (!trophy) {
            trophy = document.createElement('a');
            trophy.className = 'header-icon header-icon-btn header-trophy-btn';
            trophy.href = '/ranking.html';
            trophy.setAttribute('aria-label', 'Peringkat');
            trophy.innerHTML = '<i class="fas fa-trophy" aria-hidden="true"></i>';
            headerRight.appendChild(trophy);
        } else {
            trophy.classList.add('header-icon-btn', 'header-trophy-btn');
            trophy.setAttribute('aria-label', 'Peringkat');
        }
        try {
            const pathname = String(window.location.pathname || '').toLowerCase();
            const onRankingPage = pathname.endsWith('/ranking.html') || pathname === '/ranking';
            trophy.classList.toggle('is-active', onRankingPage);
            if (onRankingPage) trophy.setAttribute('aria-current', 'page');
            else trophy.removeAttribute('aria-current');
        } catch {}

        let profileBtn = document.getElementById('profile-header-btn');
        if (!profileBtn) {
            profileBtn = document.createElement('button');
            profileBtn.type = 'button';
            profileBtn.id = 'profile-header-btn';
            profileBtn.className = 'header-icon profile-icon-btn header-icon-btn';
            headerRight.appendChild(profileBtn);
        } else {
            profileBtn.classList.add('header-icon-btn');
        }
        profileBtn.setAttribute('aria-haspopup', 'dialog');
        profileBtn.setAttribute('aria-expanded', 'false');

        let bell = document.getElementById('notif-bell');
        if (bell) {
            bell.classList.add('header-icon', 'notif-bell', 'header-icon-btn');
            bell.setAttribute('aria-label', 'Notifikasi');
            if (!bell.getAttribute('type') && bell.tagName === 'BUTTON') bell.setAttribute('type', 'button');
            if (!bell.querySelector('.notif-badge')) {
                const badge = document.createElement('span');
                badge.className = 'notif-badge';
                badge.id = 'notif-badge';
                badge.hidden = true;
                badge.textContent = '0';
                bell.appendChild(badge);
            }
        }

        const hamburger = headerRight.querySelector('#hamburger-menu');
        const order = [bell, trophy, profileBtn, hamburger].filter(Boolean);
        order.forEach((el) => headerRight.appendChild(el));

        return { bell, trophy, profileBtn, hamburger };
    };

    const { profileBtn: profileHeaderBtn } = ensureGlobalHeaderActions();

    if (profileHeaderBtn) {
        syncProfileHeaderButton(profileHeaderBtn);
        if (!profileHeaderBtn.dataset.profileBound) {
            profileHeaderBtn.dataset.profileBound = '1';
            profileHeaderBtn.addEventListener('click', () => {
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

        window.addEventListener('storage', () => {
            syncProfileHeaderButton(profileHeaderBtn);
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
                bell.className = 'header-icon notif-bell header-icon-btn';
                bell.setAttribute('aria-label', 'Notifikasi');
                bell.innerHTML = '<i class="fas fa-bell"></i><span class="notif-badge" id="notif-badge" hidden>0</span>';
                const anchor = headerRight.querySelector('.header-trophy-btn') || headerRight.querySelector('#profile-header-btn') || headerRight.querySelector('#hamburger-menu');
                if (anchor) headerRight.insertBefore(bell, anchor);
                else headerRight.appendChild(bell);
            } else {
                bell.classList.add('header-icon', 'notif-bell', 'header-icon-btn');
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
                        subEl.textContent = endLabel ? `Status: Sedang berlangsung � Berakhir: ${endLabel}` : 'Status: Sedang berlangsung';
                        return;
                    }
                    const diff = Math.max(0, end - now);
                    const totalSeconds = Math.floor(diff / 1000);
                    const days = Math.floor(totalSeconds / 86400);
                    const hours = Math.floor((totalSeconds % 86400) / 3600);
                    const minutes = Math.floor((totalSeconds % 3600) / 60);
                    const seconds = totalSeconds % 60;
                    timerEl.innerHTML = renderSegments(days, hours, minutes, seconds);
                    subEl.textContent = endLabel ? `Status: Sedang berlangsung � Berakhir: ${endLabel}` : 'Status: Sedang berlangsung';
                    return;
                }

                const start = schedule.start_time ? new Date(schedule.start_time).getTime() : 0;
                if (!start || start <= now) {
                    setStateText('Mulai sekarang');
                    subEl.textContent = startLabel ? `Status: Mulai sekarang � Mulai: ${startLabel}` : 'Status: Mulai sekarang';
                    return;
                }
                const diff = Math.max(0, start - now);
                const totalSeconds = Math.floor(diff / 1000);
                const days = Math.floor(totalSeconds / 86400);
                const hours = Math.floor((totalSeconds % 86400) / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                timerEl.innerHTML = renderSegments(days, hours, minutes, seconds);
                subEl.textContent = startLabel ? `Status: Akan dimulai � Mulai: ${startLabel}` : 'Status: Akan dimulai';
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
                    link: getArticleHref(state.latestArticle),
                    image: state.latestArticle.image || ''
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
                    ${item.image ? `<div class="notif-item-thumb"><img src="${item.image}" alt="${item.title}"></div>` : ''}
                    <div class="notif-item-body">
                        <div class="notif-item-title">${item.title}</div>
                        <div class="notif-item-meta">${item.time ? new Date(item.time).toLocaleString('id-ID') : ''}</div>
                        ${item.link ? `<a class="notif-item-link" href="${item.link}">Buka Artikel</a>` : ''}
                    </div>
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

    // --- Lightweight Analytics (Public) ---
    try {
        if (!document.body.classList.contains('page-admin')) {
            const dnt = (navigator.doNotTrack === '1' || window.doNotTrack === '1');
            const getSid = () => {
                const key = 'ipm_analytics_sid';
                try {
                    let sid = localStorage.getItem(key) || sessionStorage.getItem(key) || '';
                    if (!sid) {
                        sid = (crypto?.randomUUID ? crypto.randomUUID() : `sid_${Date.now()}_${Math.random().toString(16).slice(2)}`);
                        localStorage.setItem(key, sid);
                    }
                    return sid;
                } catch {
                    return '';
                }
            };

            const send = (payload) => {
                if (dnt) return;
                const body = JSON.stringify(payload);
                const url = '/api/analytics?action=track';
                if (navigator.sendBeacon) {
                    const blob = new Blob([body], { type: 'application/json' });
                    navigator.sendBeacon(url, blob);
                    return;
                }
                fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body,
                    credentials: 'omit',
                    keepalive: true
                }).catch(() => {});
            };

            send({
                event_name: 'pageview',
                path: `${window.location.pathname || '/'}${window.location.search || ''}`,
                title: document.title || '',
                referrer: document.referrer || '',
                session_id: getSid()
            });
        }
    } catch {}

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

            const subscribeRes = await fetch('/api/push?action=subscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(getSession() ? { Authorization: `Bearer ${getSession()}` } : {})
                },
                body: JSON.stringify({ subscription })
            });
            if (!subscribeRes.ok) throw new Error(`Subscribe gagal (${subscribeRes.status})`);
            const subscribeData = await subscribeRes.json().catch(() => ({}));
            if (subscribeData.status && subscribeData.status !== 'success') {
                throw new Error(subscribeData.message || 'Subscribe gagal');
            }
            pushState.subscribed = true;
            await updatePushUI();
        } catch {
            if (window.Toast) Toast.show('Gagal mengaktifkan notifikasi. Coba lagi.', 'error');
        }
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

    // --- PWA INSTALLATION PROMPT ---
    let deferredPrompt;
    const pwaBanner = document.getElementById('pwa-install-banner');
    const pwaInstallBtn = document.getElementById('btn-pwa-install');
    const pwaCloseBtn = document.getElementById('btn-pwa-close');

    if (pwaBanner && pwaInstallBtn && pwaCloseBtn) {
        const isDismissed = localStorage.getItem('pwa_banner_dismissed') === '1';
        
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            if (!isDismissed) {
                pwaBanner.hidden = false;
                // Wait for other boot animations to clear
                setTimeout(() => pwaBanner.classList.add('show'), 2000);
            }
        });

        pwaInstallBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            pwaBanner.classList.remove('show');
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            deferredPrompt = null;
            if (outcome === 'accepted') {
                pwaBanner.hidden = true;
            }
        });

        pwaCloseBtn.addEventListener('click', () => {
            pwaBanner.classList.remove('show');
            setTimeout(() => { pwaBanner.hidden = true; }, 500);
            localStorage.setItem('pwa_banner_dismissed', '1');
        });
    }

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
        programCountdownTitle.textContent = programCountdownSchedule.title || programCountdownSchedule.description || 'Program Kerja Mendatang';
        const badge = document.getElementById('program-countdown-badge');
        const fmtOpts = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
        const startLabel = programCountdownSchedule.start_time ? new Date(programCountdownSchedule.start_time).toLocaleString('id-ID', fmtOpts) : '';
        const endLabel = programCountdownSchedule.end_time ? new Date(programCountdownSchedule.end_time).toLocaleString('id-ID', fmtOpts) : '';
        const sep = '<div class="countdown-sep"><span class="countdown-sep-dot"></span><span class="countdown-sep-dot"></span></div>';
        const mkS = (v, l) => '<div class="program-countdown-seg"><span class="program-countdown-val">' + v + '</span><span class="program-countdown-unit">' + l + '</span></div>';
        const rnd = (d,h,m,s) => [mkS(String(d).padStart(2,'0'),'Hari'),sep,mkS(String(h).padStart(2,'0'),'Jam'),sep,mkS(String(m).padStart(2,'0'),'Menit'),sep,mkS(String(s).padStart(2,'0'),'Detik')].join('');
        const calc = (diff) => { const t=Math.floor(diff/1000); return rnd(Math.floor(t/86400),Math.floor((t%86400)/3600),Math.floor((t%3600)/60),t%60); };

        if (start && now < start) {
            programCountdownTimer.innerHTML = calc(start - now);
            programCountdownSub.innerHTML = startLabel ? '<i class="far fa-calendar"></i> <strong>Mulai:</strong> ' + startLabel : '<i class="far fa-clock"></i> Akan dimulai';
            if (badge) { badge.className = 'program-countdown-badge upcoming'; badge.innerHTML = '<span class="countdown-pulse"></span> Segera'; }
            programCountdown.hidden = false; return;
        }
        if (end && now < end) {
            programCountdownTimer.innerHTML = calc(end - now);
            programCountdownSub.innerHTML = endLabel ? '<i class="far fa-calendar"></i> <strong>Berakhir:</strong> ' + endLabel : '<i class="fas fa-bolt"></i> Sedang berlangsung';
            if (badge) { badge.className = 'program-countdown-badge live'; badge.innerHTML = '<span class="countdown-pulse"></span> Live'; }
            programCountdown.hidden = false; return;
        }
        programCountdownTimer.innerHTML = '<span class="program-countdown-state"><i class="fas fa-check-circle" style="margin-right:8px"></i>Selesai</span>';
        programCountdownSub.innerHTML = endLabel ? '<i class="far fa-calendar-check"></i> <strong>Berakhir:</strong> ' + endLabel : '<i class="fas fa-check"></i> Selesai';
        if (badge) { badge.className = 'program-countdown-badge done'; badge.innerHTML = 'Selesai'; }
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
        activeDoc.includes('quiz-gamified.html') ||
        activeDoc.includes('ranking.html') ||
        activeDoc.endsWith('/');

    if (isPublicPage && !activeDoc.includes('/admin/')) {
        const fabContainer = document.createElement('div');
        fabContainer.className = 'premium-fab-container';
        fabContainer.innerHTML = `
            <a href="javascript:void(0)" class="fab-option back-to-top" id="back-to-top" data-label="Kembali ke Atas"><i class="fas fa-chevron-up"></i></a>
            <button class="fab-main" id="fab-main"><i class="fas fa-plus"></i></button>
            <div class="fab-options">
                <a href="absen.html" class="fab-option" data-label="Absensi"><i class="fas fa-camera"></i></a>
                <a href="ranking.html" class="fab-option" data-label="Peringkat"><i class="fas fa-trophy"></i></a>
                <a href="quiz-gamified.html" class="fab-option" data-label="Ikuti Kuis"><i class="fas fa-gamepad"></i></a>
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
    const SW_VERSION = '41';
    const SW_URL = `/sw.js?v=${SW_VERSION}`;

    if (isProd && 'serviceWorker' in navigator) {
        // Track whether a controller existed before registration so we can
        // distinguish a first-time install from a genuine update.
        const hadController = !!navigator.serviceWorker.controller;

        window.addEventListener('load', () => {
            navigator.serviceWorker.register(SW_URL)
                .then((reg) => {
                    console.log('SW registered');

                    // Only prompt for update when the user already had an
                    // active SW (i.e. this is a revisit, not the very first load).
                    if (!hadController) return;

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

        // Only reload when there was a previous controller (real update) and
        // only once per page-session to prevent infinite reload loops.
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!hadController) return;           // first install - no reload needed
            if (window.__swReloading) return;     // already reloading
            try {
                if (sessionStorage.getItem('__swReloaded')) return;
                sessionStorage.setItem('__swReloaded', '1');
            } catch (e) {}
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

