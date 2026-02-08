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
    const session = String(sessionStorage.getItem(USER_SESSION_KEY) || localStorage.getItem(USER_SESSION_KEY) || '').trim();
    const username = String(sessionStorage.getItem(USER_USERNAME_KEY) || localStorage.getItem(USER_USERNAME_KEY) || '').trim();
    if (session && headerRight) {
        const chip = document.createElement('button');
        chip.className = 'user-chip';
        chip.type = 'button';
        chip.innerHTML = '';
        const icon = document.createElement('i');
        icon.className = 'fas fa-user';
        const span = document.createElement('span');
        span.textContent = username || 'Pengguna';
        chip.appendChild(icon);
        chip.appendChild(span);
        const dropdown = document.createElement('div');
        dropdown.className = 'user-dropdown';
        dropdown.innerHTML = `<button id="logout-btn-header"><i class="fas fa-right-from-bracket"></i> Keluar</button>`;
        headerRight.appendChild(chip);
        document.body.appendChild(dropdown);
        chip.addEventListener('click', () => dropdown.classList.toggle('open'));
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target) && !chip.contains(e.target)) dropdown.classList.remove('open');
        });
        const logoutBtn = dropdown.querySelector('#logout-btn-header');
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem(USER_SESSION_KEY);
            sessionStorage.removeItem(USER_USERNAME_KEY);
            localStorage.removeItem(USER_SESSION_KEY);
            localStorage.removeItem(USER_USERNAME_KEY);
            window.location.href = 'login.html';
        });
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
});
