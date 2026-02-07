(function() {
  const state = {
    enabled: false,
    dirty: false,
    pendingBack: false,
    timer: null,
    message: 'Keluar dari halaman? Perubahan belum disimpan.'
  };

  function enable(message) {
    state.enabled = true;
    if (message) state.message = message;
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('popstate', onPopState);
    try { history.pushState({ ng: true }, '', location.href); } catch {}
    wrapLinks();
  }

  function disable() {
    state.enabled = false;
    state.dirty = false;
    state.pendingBack = false;
    if (state.timer) { clearTimeout(state.timer); state.timer = null; }
    window.removeEventListener('beforeunload', onBeforeUnload);
    window.removeEventListener('popstate', onPopState);
  }

  function markDirty() { state.dirty = true; }
  function clearDirty() { state.dirty = false; }

  function onBeforeUnload(e) {
    if (!state.enabled || !state.dirty) return;
    e.preventDefault();
    e.returnValue = state.message;
    return state.message;
  }

  function onPopState() {
    if (!state.enabled || !state.dirty) return;
    if (!state.pendingBack) {
      state.pendingBack = true;
      try { history.pushState({ ng: true }, '', location.href); } catch {}
      if (window.AppToast && typeof AppToast.show === 'function') {
        AppToast.show('Tekan tombol kembali sekali lagi untuk keluar');
      }
      state.timer = setTimeout(() => { state.pendingBack = false; }, 2000);
    } else {
      disable();
      try { history.back(); } catch {}
    }
  }

  function wrapLinks() {
    document.querySelectorAll('a[href]')
      .forEach(a => {
        if (String(a.dataset.noGuard || '') === 'true') return;
        a.addEventListener('click', ev => {
          if (!state.enabled || !state.dirty) return;
          const ok = window.confirm(state.message);
          if (!ok) {
            ev.preventDefault();
          } else {
            disable();
          }
        }, { capture: true });
      });
  }

  window.NavigationGuard = { enable, disable, markDirty, clearDirty };
})();

