(() => {
  let container = null;
  function ensureContainer() {
    if (container && document.body.contains(container)) return container;
    container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '50%';
    container.style.bottom = '24px';
    container.style.transform = 'translateX(-50%)';
    container.style.zIndex = '9999';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.gap = '8px';
    document.body.appendChild(container);
    return container;
  }
  function show(msg, type) {
    const cont = ensureContainer();
    const el = document.createElement('div');
    el.textContent = String(msg || '');
    el.style.padding = '10px 14px';
    el.style.borderRadius = '8px';
    el.style.boxShadow = '0 6px 18px rgba(0,0,0,0.12)';
    el.style.fontSize = '14px';
    el.style.color = '#1f2937';
    el.style.background = type === 'error' ? '#fde68a' : '#d1fae5';
    cont.appendChild(el);
    setTimeout(() => {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 3000);
  }
  window.Toast = { show };
})();
