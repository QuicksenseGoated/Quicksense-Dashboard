/* global Clerk */
let _clerkInitPromise = null;

function clerkDisplayName(user) {
  if (!user) return '';
  if (user.username) return user.username;
  const email = user.primaryEmailAddress && user.primaryEmailAddress.emailAddress;
  return email || 'Account';
}

function setBlockVisible(el, show) {
  if (!el) return;
  if (show) el.removeAttribute('hidden');
  else el.setAttribute('hidden', '');
}

function mountUserButton(el) {
  if (!el || !window.Clerk || !window.__clerkUserId) return;
  el.innerHTML = '';
  try {
    window.Clerk.mountUserButton(el, {
      afterSignOutUrl: window.location.href,
    });
  } catch (e) {
    console.warn('Clerk user button mount failed', e);
  }
}

function updateAuthUI() {
  const has = !!window.__clerkUserId;
  const user = window.__clerkUser;

  const signedOut = document.getElementById('cow-signed-out-block');
  const formFields = document.getElementById('cow-form-fields');
  if (signedOut) signedOut.style.display = has ? 'none' : 'block';
  if (formFields && !has) formFields.style.display = 'none';

  setBlockVisible(document.getElementById('qs-auth-out'), !has);
  setBlockVisible(document.getElementById('qs-auth-in'), has);

  const nameEl = document.getElementById('qs-auth-name');
  if (nameEl) nameEl.textContent = has ? clerkDisplayName(user) : '';

  mountUserButton(document.getElementById('clerk-user-btn'));
  mountUserButton(document.getElementById('qs-clerk-user-btn'));

  if (typeof renderClipsOfWeek === 'function') renderClipsOfWeek();
}

function applyClerkUser(user) {
  window.__clerkUser = user || null;
  window.__clerkUserId = user ? user.id : '';
  updateAuthUI();
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
      console.warn('Clerk: set CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY (Vercel or .env.local)');
      updateAuthUI();
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
    alert('Sign-in is not configured yet. Add Clerk keys in Vercel or run `clerk env pull`.');
    return;
  }
  window.Clerk.openSignIn({
    redirectUrl: window.location.href,
    signUpForceRedirectUrl: window.location.href,
  });
}

async function openCowSignUp() {
  await initClerkAuth();
  if (!window.Clerk) {
    alert('Sign-up is not configured yet. Add Clerk keys in Vercel or run `clerk env pull`.');
    return;
  }
  window.Clerk.openSignUp({
    redirectUrl: window.location.href,
    signInForceRedirectUrl: window.location.href,
  });
}

async function openClerkAccount() {
  await initClerkAuth();
  if (!window.Clerk) return;
  window.Clerk.openUserProfile();
}

window.initClerkAuth = initClerkAuth;
window.openCowSignIn = openCowSignIn;
window.openCowSignUp = openCowSignUp;
window.openClerkAccount = openClerkAccount;

document.addEventListener('DOMContentLoaded', () => {
  initClerkAuth();
});
