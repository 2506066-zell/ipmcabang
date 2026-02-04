document.addEventListener('DOMContentLoaded', () => {
    const navToggle = document.getElementById('nav-toggle');
    const navLinks = document.getElementById('nav-links');

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            // Toggle the 'show' class on the nav links to display/hide them
            navLinks.classList.toggle('show');
            
            // Toggle the 'active' class on the button to animate the icon
            navToggle.classList.toggle('active');
            
            // Lock/unlock body scroll when the mobile menu is open/closed
            const isMenuOpen = navLinks.classList.contains('show');
            document.body.classList.toggle('body-no-scroll', isMenuOpen);
        });
    }

    // Set active nav link based on current page
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const links = navLinks.querySelectorAll('a');
    
    links.forEach(link => {
        const href = link.getAttribute('href').split('/').pop();
        if (href === currentPage) {
            link.classList.add('active');
        }
    });
});