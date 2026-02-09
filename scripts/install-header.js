(() => {
    const ACCEPTED_KEY = 'pwa_install_accepted';
    const DISMISSED_SESSION_KEY = 'pwa_install_dismissed_session';
    const SESSION_ID_KEY = 'pwa_install_session_id';

    let deferredPrompt = null;
    let button = null;

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

    const hideButton = () => {
        if (button) button.hidden = true;
    };

    const showButton = () => {
        if (!button || !deferredPrompt) return;
        if (!isEligibleBase() || dismissedThisSession()) return;
        button.hidden = false;
    };

    const ensureButton = () => {
        if (button) return;
        const headerRight = document.querySelector('.header-right-icons');
        if (!headerRight) return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'install-header-btn';
        btn.className = 'header-icon install-icon-btn';
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

        btn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            btn.disabled = true;
            deferredPrompt.prompt();
            try {
                const choice = await deferredPrompt.userChoice;
                if (choice && choice.outcome === 'accepted') {
                    safeSet(ACCEPTED_KEY, '1')
                    hideButton();
                } else {
                    safeSet(DISMISSED_SESSION_KEY, getSessionId())
                    hideButton();
                }
            } catch {}
            deferredPrompt = null;
            btn.disabled = false;
        });

        button = btn;
    };

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showButton();
    });

    window.addEventListener('appinstalled', () => {
        safeSet(ACCEPTED_KEY, '1')
        deferredPrompt = null;
        hideButton();
    });

    const init = () => {
        ensureButton();
        if (!isEligibleBase()) {
            hideButton();
            return;
        }
        showButton();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
