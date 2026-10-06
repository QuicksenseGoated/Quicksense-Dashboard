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

function clerkFrontendApi(publishableKey) {
  if (!publishableKey || !publishableKey.startsWith('pk_')) return '';
  const encoded = publishableKey.replace(/^pk_(test|live)_/, '');
  try {
    const host = atob(encoded).replace(/\$$/, '');
    return host.includes('.') ? host : '';
  } catch {
    return '';
  }
}

function waitForClerk(timeoutMs) {
  if (window.Clerk) return Promise.resolve(window.Clerk);
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (window.Clerk) return resolve(window.Clerk);
      if (Date.now() - started > timeoutMs) {
        return reject(new Error('Clerk script did not load'));
      }
      requestAnimationFrame(tick);
    };
    tick();
  });
}

function loadClerkScript(publishableKey) {
  if (window.Clerk) return Promise.resolve(window.Clerk);

  const existing = document.querySelector('script[data-clerk-publishable-key]');
  if (existing) return waitForClerk(15000);

  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.crossOrigin = 'anonymous';
    s.defer = true;
    s.dataset.clerkPublishableKey = publishableKey;
    const fapi = clerkFrontendApi(publishableKey);
    s.src = fapi
      ? `https://${fapi}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`
      : 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@6/dist/clerk.browser.js';
    s.onload = () => waitForClerk(10000).then(resolve).catch(reject);
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

    const metaPk =
      document.querySelector('meta[name="clerk-publishable-key"]')?.content?.trim() || '';
    const publishableKey = (cfg.publishableKey || metaPk || '').trim();

    if (!publishableKey) {
      console.warn('Clerk: set CLERK_PUBLISHABLE_KEY in .env.local (dev) or Vercel env');
      updateAuthUI();
      return false;
    }

    const Clerk = await loadClerkScript(publishableKey);
    await Clerk.load({ publishableKey });
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
