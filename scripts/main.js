document.addEventListener('DOMContentLoaded', () => {
    const hamburgerMenu = document.getElementById('hamburger-menu');
    const mobileNav = document.getElementById('mobile-nav');

    if (hamburgerMenu && mobileNav) {
        hamburgerMenu.addEventListener('click', () => {
            mobileNav.classList.toggle('open');
        });
    }
});