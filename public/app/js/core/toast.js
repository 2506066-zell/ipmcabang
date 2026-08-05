(() => {
    let container = null;

    function ensureContainer() {
        if (container && document.body.contains(container)) return container;
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
    }

    function show(msg, type = 'info') {
        const cont = ensureContainer();
        const el = document.createElement('div');
        
        let icon = '';
        if (type === 'success') icon = '<i class="fas fa-check-circle toast-icon"></i>';
        else if (type === 'error') icon = '<i class="fas fa-exclamation-circle toast-icon"></i>';
        else icon = '<i class="fas fa-info-circle toast-icon"></i>';

        el.className = `toast toast-${type}`;
        el.innerHTML = `${icon}<span>${String(msg || '')}</span>`;
        
        cont.appendChild(el);

        // Remove after delay
        setTimeout(() => {
            el.classList.add('toast-exit');
            el.addEventListener('animationend', () => {
                if (el.parentNode) el.parentNode.removeChild(el);
            });
        }, 3000);
    }

    window.Toast = { show };
})();
