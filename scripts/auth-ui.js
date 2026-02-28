(() => {
  function isAuthPage() {
    return !!(document.body && document.body.classList.contains('page-auth'));
  }

  function setPasswordToggleState(button, input) {
    if (!button || !input) return;
    const icon = button.querySelector('i');
    const visible = input.type === 'text';
    button.setAttribute('aria-pressed', visible ? 'true' : 'false');
    button.setAttribute('aria-label', visible ? 'Sembunyikan password' : 'Tampilkan password');
    if (icon) {
      icon.classList.toggle('fa-eye', !visible);
      icon.classList.toggle('fa-eye-slash', visible);
    }
  }

  function bindPasswordToggles() {
    const toggles = document.querySelectorAll('.password-toggle');
    toggles.forEach((button) => {
      const wrapper = button.closest('.password-wrapper');
      const input = wrapper ? wrapper.querySelector('input') : null;
      if (!input) return;

      setPasswordToggleState(button, input);
      button.addEventListener('click', () => {
        input.type = input.type === 'password' ? 'text' : 'password';
        setPasswordToggleState(button, input);
        input.focus({ preventScroll: true });
        try { input.setSelectionRange(input.value.length, input.value.length); } catch {}
      });
    });
  }

  function bindFormMessageReset() {
    const forms = document.querySelectorAll('form');
    forms.forEach((form) => {
      const message = form.querySelector('.form-message');
      const hideMessage = () => {
        if (!message) return;
        message.textContent = '';
        message.hidden = true;
        message.classList.remove('error', 'success');
      };

      const clearFieldState = (event) => {
        const target = event.target;
        if (!(target instanceof HTMLElement)) return;
        const control = target.matches('input, textarea, select')
          ? target
          : target.closest('input, textarea, select');
        if (!(control instanceof HTMLElement)) return;
        control.classList.remove('is-invalid');
        control.setAttribute('aria-invalid', 'false');
        const group = control.closest('.input-group');
        const fieldError = group ? group.querySelector('.field-error') : null;
        if (fieldError instanceof HTMLElement) {
          fieldError.textContent = '';
          fieldError.hidden = true;
        }
      };

      form.addEventListener('input', (event) => {
        hideMessage();
        clearFieldState(event);
      });
      form.addEventListener('change', (event) => {
        hideMessage();
        clearFieldState(event);
      });
    });
  }

  function bindKeyboardConsistency() {
    if (!window.visualViewport || !document.body) return;

    const update = () => {
      const viewportHeight = Number(window.visualViewport.height || 0);
      const layoutHeight = Number(window.innerHeight || 0);
      const keyboardGap = Math.max(0, layoutHeight - viewportHeight);
      const isKeyboardOpen = keyboardGap > 150;
      document.body.classList.toggle('keyboard-open', isKeyboardOpen);
    };

    window.visualViewport.addEventListener('resize', update);
    window.visualViewport.addEventListener('scroll', update);
    window.addEventListener('orientationchange', () => setTimeout(update, 140));

    document.addEventListener('focusin', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const canEdit = target.matches('input, textarea, select');
      if (!canEdit) return;
      setTimeout(update, 80);
      setTimeout(() => {
        if (!document.body.classList.contains('keyboard-open')) return;
        target.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
      }, 120);
    });

    document.addEventListener('focusout', () => {
      setTimeout(update, 160);
    });

    update();
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!isAuthPage()) return;
    bindPasswordToggles();
    bindFormMessageReset();
    bindKeyboardConsistency();
  });
})();
