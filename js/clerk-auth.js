/* global Clerk */
let _clerkInitPromise = null;

function updateCowAuthUI() {
  const signedOut = document.getElementById('cow-signed-out-block');
  const formFields = document.getElementById('cow-form-fields');
  const userBtn = document.getElementById('clerk-user-btn');
  const has = !!window.__clerkUserId;

  if (signedOut) signedOut.style.display = has ? 'none' : 'block';
  if (formFields && !has) formFields.style.display = 'none';

  if (userBtn && window.Clerk && has) {
    userBtn.innerHTML = '';
    try {
      window.Clerk.mountUserButton(userBtn, {
        afterSignOutUrl: window.location.href,
      });
    } catch (e) {
      console.warn('Clerk user button mount failed', e);
    }
  }

  if (typeof renderClipsOfWeek === 'function') renderClipsOfWeek();
}

function applyClerkUser(user) {
  window.__clerkUser = user || null;
  window.__clerkUserId = user ? user.id : '';
  updateCowAuthUI();
}

function loadClerkScript() {
  if (window.Clerk) return Promise.resolve(window.Clerk);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js';
    s.crossOrigin = 'anonymous';
    s.async = true;
    s.onload = () => resolve(window.Clerk);
    s.onerror = () => reject(new Error('Failed to load Clerk'));
    document.head.appendChild(s);
  });
}

async function initClerkAuth() {
  if (_clerkInitPromise) return _clerkInitPromise;
  _clerkInitPromise = (async () => {
    let cfg = {};
    try {
      const r = await fetch('/api/auth/config', { cache: 'no-store' });
      if (r.ok) cfg = await r.json();
    } catch (e) {}

    if (!cfg.publishableKey) {
      console.warn('Clerk: add CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY on Vercel');
      updateCowAuthUI();
      return false;
    }

    const Clerk = await loadClerkScript();
    await Clerk.load({ publishableKey: cfg.publishableKey });
    Clerk.addListener(({ user }) => applyClerkUser(user));
    applyClerkUser(Clerk.user);
    return true;
  })();
  return _clerkInitPromise;
}

async function openCowSignIn() {
  await initClerkAuth();
  if (!window.Clerk) {
    alert('Sign-in is not configured yet. Add Clerk keys in Vercel project settings.');
    return;
  }
  window.Clerk.openSignIn({
    redirectUrl: window.location.href,
    signUpForceRedirectUrl: window.location.href,
  });
}

async function openClerkAccount() {
  await initClerkAuth();
  if (!window.Clerk) return;
  window.Clerk.openUserProfile();
}

window.initClerkAuth = initClerkAuth;
window.openCowSignIn = openCowSignIn;
window.openClerkAccount = openClerkAccount;

document.addEventListener('DOMContentLoaded', () => {
  initClerkAuth();
});
