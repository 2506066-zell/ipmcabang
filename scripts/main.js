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
        chip.innerHTML = `<i class="fas fa-user"></i><span>${username || 'Pengguna'}</span>`;
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
});
