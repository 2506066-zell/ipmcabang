(() => {
  let timer;
  function ensure() {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    return el;
  }
  window.AppToast = {
    show(text) {
      const el = ensure();
      el.textContent = text || '';
      el.classList.add('show');
      clearTimeout(timer);
      timer = setTimeout(() => el.classList.remove('show'), 2000);
    }
  };
})();
