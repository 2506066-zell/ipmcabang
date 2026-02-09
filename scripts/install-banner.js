(() => {
    const DISMISS_KEY = 'pwa_install_dismissed_at';
    const INSTALLED_KEY = 'pwa_install_installed';
    const PENDING_KEY = 'pwa_install_pending';
    const SHOWN_SESSION_KEY = 'pwa_install_shown_session';
    const DISMISS_WINDOW = 7 * 24 * 60 * 60 * 1000;
    const PENDING_MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

    let deferredPrompt = null;
    let bannerEl = null;

    function isStandalone() {
        return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    }

    function isDismissedRecently() {
        const ts = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10);
        return ts && (Date.now() - ts) < DISMISS_WINDOW;
    }

    function isInstalled() {
        return localStorage.getItem(INSTALLED_KEY) === '1';
    }

    function canShow() {
        if (!deferredPrompt) return false;
        if (isStandalone()) return false;
        if (isInstalled()) return false;
        if (isDismissedRecently()) return false;
        if (sessionStorage.getItem(SHOWN_SESSION_KEY)) return false;
        return true;
    }

    function ensureBanner() {
        if (bannerEl) return bannerEl;
        const banner = document.createElement('div');
        banner.className = 'pwa-install-banner';
        banner.innerHTML = `
            <div class="pwa-banner-badge">Recommended</div>
            <div class="pwa-banner-content">
                <div class="pwa-banner-icon">⚡</div>
                <div>
                    <div class="pwa-banner-title">Install Aplikasi untuk Pengalaman Terbaik ⚡</div>
                    <div class="pwa-banner-subtext">Versi aplikasi lebih cepat, lebih stabil, dan lebih nyaman digunakan.</div>
                    <div class="pwa-banner-urgency">Disarankan untuk pengalaman optimal.</div>
                </div>
            </div>
            <div class="pwa-banner-actions">
                <button type="button" class="pwa-btn-primary">Install Sekarang</button>
                <button type="button" class="pwa-btn-secondary">Nanti</button>
            </div>
        `;
        document.body.appendChild(banner);
        const installBtn = banner.querySelector('.pwa-btn-primary');
        const laterBtn = banner.querySelector('.pwa-btn-secondary');

        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            banner.classList.remove('show');
            deferredPrompt.prompt();
            try {
                const choice = await deferredPrompt.userChoice;
                if (choice && choice.outcome === 'accepted') {
                    localStorage.setItem(INSTALLED_KEY, '1');
                } else {
                    localStorage.setItem(DISMISS_KEY, Date.now().toString());
                }
            } catch {
                localStorage.setItem(DISMISS_KEY, Date.now().toString());
            }
            deferredPrompt = null;
        });

        laterBtn.addEventListener('click', () => {
            localStorage.setItem(DISMISS_KEY, Date.now().toString());
            banner.classList.remove('show');
        });

        bannerEl = banner;
        return bannerEl;
    }

    function showBanner(source) {
        if (!canShow()) return false;
        const banner = ensureBanner();
        banner.dataset.source = source || 'auto';
        banner.classList.add('show');
        sessionStorage.setItem(SHOWN_SESSION_KEY, '1');
        return true;
    }

    function setPending(source) {
        try {
            localStorage.setItem(PENDING_KEY, JSON.stringify({ source, ts: Date.now() }));
        } catch {}
    }

    function getPending() {
        try {
            const raw = localStorage.getItem(PENDING_KEY);
            if (!raw) return null;
            const data = JSON.parse(raw);
            if (!data || !data.ts) {
                localStorage.removeItem(PENDING_KEY);
                return null;
            }
            if ((Date.now() - data.ts) > PENDING_MAX_AGE) {
                localStorage.removeItem(PENDING_KEY);
                return null;
            }
            return data;
        } catch {
            return null;
        }
    }

    function clearPending() {
        try { localStorage.removeItem(PENDING_KEY); } catch {}
    }

    function consumePending() {
        const data = getPending();
        if (!data) return null;
        clearPending();
        return data;
    }

    function trigger(source) {
        if (!source) source = 'auto';
        if (showBanner(source)) return;
        setPending(source);
    }

    window.PWAInstallPrompt = { trigger };

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        const pending = consumePending();
        if (pending) {
            showBanner(pending.source);
        }
    });

    window.addEventListener('appinstalled', () => {
        localStorage.setItem(INSTALLED_KEY, '1');
        if (bannerEl) bannerEl.classList.remove('show');
    });

    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => trigger('time'), 7000);
        const pending = getPending();
        if (pending && deferredPrompt && canShow()) {
            clearPending();
            showBanner(pending.source);
        }
    });
})();

