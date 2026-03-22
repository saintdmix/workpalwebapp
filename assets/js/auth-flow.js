(() => {
  const AUTH_KEY = 'workpal_artisan_auth';
  const ONBOARD_KEY = 'workpal_onboarding_complete';

  function getAuth() {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function isAuthenticated() {
    const auth = getAuth();
    return Boolean(auth && auth.role === 'artisan' && auth.email);
  }

  function redirect(path) {
    window.location.href = path;
  }

  function deriveName(email) {
    if (!email || !email.includes('@')) return 'Master Artisan';
    const base = email.split('@')[0].replace(/[._-]+/g, ' ').trim();
    if (!base) return 'Master Artisan';
    return base.replace(/\b\w/g, (match) => match.toUpperCase());
  }

  function initHome() {
    if (!isAuthenticated()) {
      redirect('onboarding.html');
      return;
    }

    const auth = getAuth();
    const nameEls = document.querySelectorAll('[data-artisan-name]');
    const emailEls = document.querySelectorAll('[data-artisan-email]');

    nameEls.forEach((el) => {
      el.textContent = auth.name || deriveName(auth.email);
    });

    emailEls.forEach((el) => {
      el.textContent = auth.email;
    });

    document.querySelectorAll('[data-logout]').forEach((btn) => {
      btn.addEventListener('click', () => {
        localStorage.removeItem(AUTH_KEY);
        redirect('signin.html');
      });
    });
  }

  function initOnboarding() {
    if (isAuthenticated()) {
      redirect('index.html');
      return;
    }

    const nextButtons = document.querySelectorAll('[data-onboarding-next]');
    nextButtons.forEach((nextBtn) => {
      nextBtn.addEventListener('click', (event) => {
        event.preventDefault();
        localStorage.setItem(ONBOARD_KEY, 'true');
        redirect('signin.html');
      });
    });
  }

  function initSignin() {
    if (isAuthenticated()) {
      redirect('index.html');
      return;
    }

    const artisanBtn = document.querySelector('[data-signin-artisan]');
    if (artisanBtn) {
      artisanBtn.addEventListener('click', () => {
        redirect('signin.html');
      });
    }

    const onboardingBack = document.querySelector('[data-back-onboarding]');
    if (onboardingBack) {
      onboardingBack.addEventListener('click', () => {
        redirect('onboarding.html');
      });
    }
  }

  function initArtisanLogin() {
    if (isAuthenticated()) {
      redirect('index.html');
      return;
    }

    const form = document.querySelector('[data-artisan-login-form]');
    const back = document.querySelector('[data-back-signin]');

    if (back) {
      back.addEventListener('click', () => redirect('onboarding.html'));
    }

    if (!form) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();

      const emailInput = form.querySelector('[name="email"]');
      const passwordInput = form.querySelector('[name="password"]');
      const feedback = form.querySelector('[data-login-feedback]');

      const email = (emailInput?.value || '').trim();
      const password = passwordInput?.value || '';

      if (!email || !password) {
        if (feedback) {
          feedback.textContent = 'Please enter both email and password.';
        }
        return;
      }

      const authPayload = {
        role: 'artisan',
        email,
        name: deriveName(email),
        signedInAt: new Date().toISOString()
      };

      localStorage.setItem(AUTH_KEY, JSON.stringify(authPayload));
      localStorage.setItem(ONBOARD_KEY, 'true');

      if (feedback) {
        feedback.textContent = 'Login successful. Redirecting to homepage...';
      }

      setTimeout(() => redirect('index.html'), 250);
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    const page = document.body.dataset.authPage;

    if (page === 'home') initHome();
    if (page === 'onboarding') initOnboarding();
    if (page === 'signin') initSignin();
    if (page === 'artisan-login') initArtisanLogin();
  });
})();
