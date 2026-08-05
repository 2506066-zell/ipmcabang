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

    const isEligibleBase = () => !isStandalone();

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

    const hasAccepted = () => safeGet(ACCEPTED_KEY) === '1';

    const updateButtonState = () => {
        if (!button) return;
        if (!isEligibleBase()) {
            hideButton();
            return;
        }

        if (hasAccepted()) {
            hideButton();
            return;
        }

        button.hidden = false;
        const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent || '');
        if (!deferredPrompt || dismissedThisSession()) {
            button.disabled = true;
            button.setAttribute('data-label', isiOS ? 'Tambah ke Layar Utama' : 'Belum siap diinstal');
            button.classList.add('install-disabled');
            return;
        }

        button.disabled = false;
        button.setAttribute('data-label', 'Install aplikasi');
        button.classList.remove('install-disabled');
    };

    const ensureButton = () => {
        if (button) return false;
        const fabOptions = document.querySelector('.premium-fab-container .fab-options');
        if (!fabOptions) return false;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'install-app-btn';
        btn.className = 'fab-option install-app-btn';
        btn.setAttribute('aria-label', 'Install aplikasi');
        btn.title = 'Install aplikasi';
        btn.hidden = true;
        btn.setAttribute('data-label', 'Install aplikasi');
        btn.innerHTML = '<i class="fas fa-arrow-down-to-bracket"></i><span class="fab-option-text">Install</span>';

        fabOptions.appendChild(btn);

        btn.addEventListener('click', async () => {
            if (!deferredPrompt || btn.disabled) return;
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
            updateButtonState();
        });

        button = btn;
        return true;
    };

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        console.log('[PWA] beforeinstallprompt detected');
        updateButtonState();
    });

    window.addEventListener('appinstalled', () => {
        safeSet(ACCEPTED_KEY, '1')
        deferredPrompt = null;
        hideButton();
    });

    const waitForFab = () => {
        let tries = 0;
        const maxTries = 40;
        const tick = () => {
            if (ensureButton()) {
                updateButtonState();
                return;
            }
            tries += 1;
            if (tries >= maxTries) return;
            setTimeout(tick, 150);
        };
        tick();
    };

    const init = () => {
        waitForFab();
        updateButtonState();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
