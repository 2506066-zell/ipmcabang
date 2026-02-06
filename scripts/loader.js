(() => {
  const OVERLAY_ID = 'loading-overlay';
  const TEXT_ID = 'loading-text';

  function createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = OVERLAY_ID;
    const content = document.createElement('div');
    content.className = 'loading-content';
    const picture = document.createElement('picture');
    const source = document.createElement('source');
    source.setAttribute('srcset', 'ipm (2).webp');
    source.setAttribute('type', 'image/webp');
    const img = document.createElement('img');
    img.setAttribute('src', 'ipm (2).png');
    img.setAttribute('alt', 'Loading...');
    img.className = 'loading-logo';
    picture.appendChild(source);
    picture.appendChild(img);
    const text = document.createElement('p');
    text.id = TEXT_ID;
    text.textContent = 'Memuat...';
    content.appendChild(picture);
    content.appendChild(text);
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    return overlay;
  }

  function ensureOverlay() {
    let overlay = document.getElementById(OVERLAY_ID);
    if (!overlay) overlay = createOverlay();
    return overlay;
  }

  window.AppLoader = {
    show(text) {
      const overlay = ensureOverlay();
      const textEl = document.getElementById(TEXT_ID);
      if (textEl) textEl.textContent = text || 'Memuat...';
      overlay.classList.add('show');
    },
    hide() {
      const overlay = document.getElementById(OVERLAY_ID);
      if (overlay) overlay.classList.remove('show');
    }
  };
})();
