document.addEventListener('DOMContentLoaded', () => {
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const mobileNav = document.getElementById('mobile-nav');
    const mobileNavOverlay = document.getElementById('mobile-nav-overlay');
    const headerRight = document.querySelector('.header-right-icons');

    if (hamburgerMenu && mobileNav) {
        hamburgerMenu.addEventListener('click', () => {
            const isOpen = mobileNav.classList.toggle('open');
            if (mobileNavOverlay) mobileNavOverlay.classList.toggle('open', isOpen);
            document.body.classList.toggle('body-no-scroll', isOpen);
        });
    }
    if (mobileNavOverlay && mobileNav) {
        mobileNavOverlay.addEventListener('click', () => {
            mobileNav.classList.remove('open');
            mobileNavOverlay.classList.remove('open');
            document.body.classList.remove('body-no-scroll');
        });
    }

    const USER_SESSION_KEY = 'ipmquiz_user_session';
    const USER_USERNAME_KEY = 'ipmquiz_user_username';
    const ARTICLE_SEEN_KEY = 'ipm_last_seen_article_ts';
    const getSession = () => sessionStorage.getItem(USER_SESSION_KEY) || localStorage.getItem(USER_SESSION_KEY) || '';
    const getUsername = () => sessionStorage.getItem(USER_USERNAME_KEY) || localStorage.getItem(USER_USERNAME_KEY) || '';

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
                    <div class="notif-panel-list" id="notif-panel-list"></div>
                    <button class="notif-mark-read" id="notif-mark-read">Tandai semua dibaca</button>
                `;
                document.body.appendChild(panel);
            }
            return { overlay, panel };
        };

        const state = { notifications: [], unread: 0, articleUnread: 0, latestArticle: null };
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
                        state.notifications = data.notifications;
                        state.unread = data.notifications.filter(n => !n.is_read).length;
                    }
                }
            } catch {}
        };

        const fetchNotifications = async () => {
            await fetchArticleNotif();
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
                    link: `articles.html?id=${state.latestArticle.id}`
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
            renderNotifList();
            updateNotifBadge();
            panel.hidden = false;
            overlay.hidden = false;
        };
        const closePanel = () => {
            panel.hidden = true;
            overlay.hidden = true;
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

        // Update last seen when opening article detail page
        try {
            const url = new URL(window.location.href);
            const isArticleDetail = window.location.pathname.includes('article.html') || (window.location.pathname.includes('articles.html') && (url.searchParams.get('id') || url.searchParams.get('slug')));
            if (isArticleDetail) {
                const id = url.searchParams.get('id');
                const slug = url.searchParams.get('slug');
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

    function renderHighlights(articles) {
        if (!highlightsGrid) return;
        if (articles.length === 0) {
            highlightsGrid.innerHTML = '<p>Belum ada program kerja mendatang.</p>';
            return;
        }

        highlightsGrid.innerHTML = articles.map(art => {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = art.content;
            const snippet = tempDiv.textContent.substring(0, 150) + '...';
            const date = new Date(art.publish_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

            return `
                <a href="articles.html?id=${art.id}" class="highlight-item">
                    <div class="highlight-date">
                        <i class="fas fa-calendar-alt"></i> ${date}
                    </div>
                    <h3 class="highlight-item-title">${art.title}</h3>
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
            return `
                <article class="article-card reveal">
                    <div class="article-card-image">
                        <img src="${art.image || 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?q=80&w=800'}" alt="${art.title}" loading="lazy">
                    </div>
                    <div class="article-card-content">
                        <span class="article-badge">${art.category || 'Umum'}</span>
                        <h3 class="article-card-title">${art.title}</h3>
                        <div class="article-card-meta">
                            <span><i class="fas fa-user-edit"></i> ${art.author}</span>
                            <span><i class="fas fa-calendar-day"></i> ${date}</span>
                        </div>
                        <a href="articles.html?id=${art.id}" class="stretched-link" style="position:absolute; inset:0; z-index:1;"></a>
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
        activeDoc.includes('articles.html') ||
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
            fabContainer.classList.toggle('open');
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
            }
        });
    }

    // 3. Scroll Progress Bar (for Article Detail)
    if (activeDoc.includes('article.html') && !activeDoc.includes('articles.html')) {
        const progressContainer = document.createElement('div');
        progressContainer.className = 'scroll-progress-container';
        progressContainer.innerHTML = '<div class="scroll-progress-bar" id="scroll-bar"></div>';
        document.body.appendChild(progressContainer);

        const scrollBar = document.getElementById('scroll-bar');
        window.addEventListener('scroll', () => {
            const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrolled = (winScroll / height) * 100;
            if (scrollBar) scrollBar.style.width = scrolled + "%";
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








