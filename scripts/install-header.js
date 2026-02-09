(() => {
    const ACCEPTED_KEY = 'pwa_install_accepted';
    const DISMISSED_SESSION_KEY = 'pwa_install_dismissed_session';
    const SESSION_ID_KEY = 'pwa_install_session_id';

    let deferredPrompt = null;
    let headerButton = null;
    let navButton = null;

    const safeGet = (key) => {
        try { return localStorage.getItem(key); } catch { return null; }
    };

    const safeSet = (key, value) => {
        try { localStorage.setItem(key, value); } catch {}
    };

    const isStandalone = () => (
        window.matchMedia && window.matchMedia('(display-mode: standalone)').matches
    ) || window.navigator.standalone === true;

    const isEligibleBase = () => !isStandalone() && !safeGet(ACCEPTED_KEY);

    const getSessionId = () => {
        let id = '';
        try {
            id = sessionStorage.getItem(SESSION_ID_KEY) || '';
            if (!id) {
                id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
                sessionStorage.setItem(SESSION_ID_KEY, id);
            }
        } catch {
            id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        }
        return id;
    };

    const dismissedThisSession = () => {
        try {
            return safeGet(DISMISSED_SESSION_KEY) === getSessionId();
        } catch {
            return false;
        }
    };

    const hideButtons = () => {
        if (headerButton) headerButton.hidden = true;
        if (navButton) navButton.hidden = true;
    };

    const showButtons = () => {
        if (!deferredPrompt) return;
        if (!isEligibleBase() || dismissedThisSession()) return;
        if (headerButton) headerButton.hidden = false;
        if (navButton) navButton.hidden = false;
    };

    const ensureHeaderButton = () => {
        if (headerButton) return;
        const headerRight = document.querySelector('.header-right-icons');
        if (!headerRight) return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'install-app-btn';
        btn.className = 'header-icon install-app-btn';
        btn.setAttribute('aria-label', 'Install aplikasi');
        btn.title = 'Install aplikasi';
        btn.hidden = true;
        btn.innerHTML = '<i class="fas fa-arrow-down-to-bracket"></i>';

        const hamburger = headerRight.querySelector('#hamburger-menu');
        const profile = headerRight.querySelector('#profile-header-btn');

        if (hamburger) {
            if (profile && profile.nextSibling) {
                headerRight.insertBefore(btn, profile.nextSibling);
            } else {
                headerRight.insertBefore(btn, hamburger);
            }
        } else {
            headerRight.appendChild(btn);
        }

        headerButton = btn;
    };

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        console.log('[PWA] beforeinstallprompt detected');
        showButtons();
    });

    window.addEventListener('appinstalled', () => {
        safeSet(ACCEPTED_KEY, '1')
        deferredPrompt = null;
        hideButtons();
    });

    const ensureNavButton = () => {
        if (navButton) return;
        const bottomNav = document.querySelector('.bottom-nav .bottom-nav-inner') || document.querySelector('.bottom-nav');
        if (!bottomNav) return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'install-app-btn bottom-nav-install';
        btn.setAttribute('aria-label', 'Install aplikasi');
        btn.title = 'Install aplikasi';
        btn.hidden = true;
        btn.innerHTML = `
            <i class="fas fa-arrow-down-to-bracket"></i>
            <span>Install</span>
        `;

        bottomNav.appendChild(btn);
        navButton = btn;
    };

    const bindClick = (btn) => {
        if (!btn) return;
        if (btn.__pwaBound) return;
        btn.__pwaBound = true;
        btn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            btn.disabled = true;
            deferredPrompt.prompt();
            try {
                const choice = await deferredPrompt.userChoice;
                if (choice && choice.outcome === 'accepted') {
                    safeSet(ACCEPTED_KEY, '1')
                    hideButtons();
                } else {
                    safeSet(DISMISSED_SESSION_KEY, getSessionId())
                    hideButtons();
                }
            } catch {}
            deferredPrompt = null;
            btn.disabled = false;
        });
    };

    const init = () => {
        ensureHeaderButton();
        ensureNavButton();
        bindClick(headerButton);
        bindClick(navButton);
        if (!isEligibleBase()) {
            hideButtons();
            return;
        }
        showButtons();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
