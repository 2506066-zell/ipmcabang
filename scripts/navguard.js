(() => {
  const USER_SESSION_KEY = 'ipmquiz_user_session';
  const USER_USERNAME_KEY = 'ipmquiz_user_username';
  function getSession() {
    return sessionStorage.getItem(USER_SESSION_KEY) || localStorage.getItem(USER_SESSION_KEY) || '';
  }
  function guard() {
    const bodyClass = document.body && document.body.className || '';
    if (/\bpage-quiz\b/.test(bodyClass)) {
      const s = getSession();
      if (!s) {
        try {
          if (!sessionStorage.getItem('ipmquiz_flash')) {
            sessionStorage.setItem('ipmquiz_flash', 'Silakan login untuk melanjutkan.');
          }
        } catch {}
        window.location.href = 'login.html';
      }
    }
  }
  document.addEventListener('DOMContentLoaded', guard);
  window.NavGuard = { getSession };
})();
