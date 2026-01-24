
document.addEventListener('DOMContentLoaded', () => {
    const hamburgerMenu = document.getElementById('hamburger-button');
    const dropdownNav = document.getElementById('dropdown-nav');
    const navLinks = dropdownNav.querySelectorAll('a');

    if (hamburgerMenu && dropdownNav) {
        hamburgerMenu.addEventListener('click', (event) => {
            toggleMenu();
            event.stopPropagation();
        });

        document.addEventListener('click', (event) => {
            if (dropdownNav.classList.contains('show') && !dropdownNav.contains(event.target) && !hamburgerMenu.contains(event.target)) {
                toggleMenu();
            }
        });

        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                if (dropdownNav.classList.contains('show')) {
                    toggleMenu();
                }
            });
        });
    }

    function toggleMenu() {
        const isMenuOpen = dropdownNav.classList.toggle('show');
        document.body.classList.toggle('body-no-scroll', isMenuOpen);
    }
});
