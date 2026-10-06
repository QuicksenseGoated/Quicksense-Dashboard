/* global Clerk */
let _clerkInitPromise = null;

function getPublishableKey() {
  const meta = document.querySelector('meta[name="clerk-publishable-key"]')?.content?.trim();
  if (meta) return meta;
  const fromScript = document.querySelector('script[data-clerk-publishable-key]')?.getAttribute(
    'data-clerk-publishable-key',
  );
  return (fromScript || '').trim();
}

function clerkFrontendApi(publishableKey) {
  if (!publishableKey || !publishableKey.startsWith('pk_')) return '';
  const part = publishableKey.split('_')[2];
  if (!part) return '';
  try {
    const host = atob(part).replace(/\$$/, '');
    return host.includes('.') ? host : '';
  } catch {
    return '';
  }
}

function waitFor(fn, timeoutMs, intervalMs) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      try {
        const v = fn();
        if (v) return resolve(v);
      } catch (e) {}
      if (Date.now() - started > timeoutMs) {
        return reject(new Error('Timed out waiting for Clerk'));
      }
      setTimeout(tick, intervalMs);
    };
    tick();
  });
}

function ensureUiBundle(publishableKey) {
  if (window.__internal_ClerkUICtor) return Promise.resolve();
  const fapi = clerkFrontendApi(publishableKey);
  if (!fapi) return Promise.reject(new Error('Invalid Clerk publishable key'));
  const existing = document.querySelector('script[data-clerk-ui-bundle]');
  if (existing) {
    return waitFor(() => window.__internal_ClerkUICtor, 20000, 50);
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.defer = true;
    s.crossOrigin = 'anonymous';
    s.dataset.clerkUiBundle = '1';
    s.src = `https://${fapi}/npm/@clerk/ui@1/dist/ui.browser.js`;
    s.onload = () => waitFor(() => window.__internal_ClerkUICtor, 20000, 50).then(resolve).catch(reject);
    s.onerror = () => reject(new Error('Failed to load Clerk UI bundle'));
    document.head.appendChild(s);
  });
}

function hasClerkSynonym(user) {
  return Boolean(user && String(user.username || '').trim());
}

/** Public handle only — never email or real name */
function clerkDisplayName(user) {
  if (!user) return '';
  const u = String(user.username || '').trim();
  return u ? (u.startsWith('@') ? u : `@${u}`) : '';
}

function sanitizeSynonymInput(raw) {
  let s = String(raw || '')
    .trim()
    .replace(/^@+/, '');
  if (!s || s.includes('@')) return '';
  if (s.length < 2 || s.length > 32) return '';
  if (!/^[a-zA-Z0-9._-]+$/.test(s)) return '';
  return s;
}

function openCowSynonymModal() {
  const modal = document.getElementById('cow-synonym-modal');
  if (modal) {
    modal.classList.add('open');
    const inp = document.getElementById('cow-synonym-inp');
    if (inp) {
      inp.value = '';
      setTimeout(() => inp.focus(), 80);
    }
  }
}

function closeCowSynonymModal() {
  const modal = document.getElementById('cow-synonym-modal');
  if (modal) modal.classList.remove('open');
}

async function saveCowSynonym() {
  const inp = document.getElementById('cow-synonym-inp');
  const err = document.getElementById('cow-synonym-err');
  const un = sanitizeSynonymInput(inp && inp.value);
  if (!un) {
    if (err) {
      err.textContent = 'Use 2–32 characters: letters, numbers, . _ - (no email).';
      err.style.display = 'block';
    }
    return false;
  }
  if (err) err.style.display = 'none';
  try {
    await initClerkAuth();
    if (!window.Clerk || !window.Clerk.user) {
      alert('Sign in first.');
      return false;
    }
    await window.Clerk.user.update({ username: un });
    applyClerkUser(window.Clerk.user);
    closeCowSynonymModal();
    return true;
  } catch (e) {
    console.error(e);
    if (err) {
      err.textContent = e.message || 'That name is taken or not allowed. Try another.';
      err.style.display = 'block';
    }
    return false;
  }
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
      showName: false,
    });
  } catch (e) {
    console.warn('Clerk user button mount failed', e);
  }
}

function updateAuthUI() {
  const has = !!window.__clerkUserId;
  const user = window.__clerkUser;

  const signedOut = document.getElementById('cow-signed-out-block');
  const synonymBlock = document.getElementById('cow-synonym-block');
  const formFields = document.getElementById('cow-form-fields');
  const needsSynonym = has && !hasClerkSynonym(user);

  if (signedOut) signedOut.style.display = has ? 'none' : 'block';
  if (synonymBlock) synonymBlock.style.display = needsSynonym ? 'block' : 'none';
  if (formFields && (!has || needsSynonym)) formFields.style.display = 'none';

  if (has && needsSynonym && !window.__cowSynonymPrompted) {
    window.__cowSynonymPrompted = true;
    openCowSynonymModal();
  }
  if (has && hasClerkSynonym(user)) window.__cowSynonymPrompted = false;

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

async function resolvePublishableKey() {
  let cfg = {};
  try {
    const r = await fetch('/api/auth/config', { cache: 'no-store' });
    if (r.ok) cfg = await r.json();
  } catch (e) {}
  return (cfg.publishableKey || getPublishableKey() || '').trim();
}

async function initClerkAuth() {
  if (_clerkInitPromise) return _clerkInitPromise;
  _clerkInitPromise = (async () => {
    try {
      const publishableKey = await resolvePublishableKey();
      if (!publishableKey) {
        console.warn('Clerk: missing publishable key');
        updateAuthUI();
        return false;
      }

      await ensureUiBundle(publishableKey);
      await waitFor(() => window.Clerk, 20000, 50);

      await window.Clerk.load({
        publishableKey,
        ui: { ClerkUI: window.__internal_ClerkUICtor },
      });

      window.Clerk.addListener(({ user }) => applyClerkUser(user));
      applyClerkUser(window.Clerk.user);
      return true;
    } catch (e) {
      console.error('Clerk init failed', e);
      _clerkInitPromise = null;
      updateAuthUI();
      return false;
    }
  })();
  return _clerkInitPromise;
}

async function openCowSignIn() {
  try {
    const ok = await initClerkAuth();
    if (!ok || !window.Clerk) {
      alert('Sign-in could not start. Run npm run dev and git pull the latest branch.');
      return;
    }
    window.Clerk.openSignIn({
      redirectUrl: window.location.href,
      signUpForceRedirectUrl: window.location.href,
    });
  } catch (e) {
    console.error(e);
    alert('Sign-in error: ' + (e.message || e));
  }
}

async function openCowSignUp() {
  try {
    const ok = await initClerkAuth();
    if (!ok || !window.Clerk) {
      alert('Sign-up could not start. Run npm run dev and git pull the latest branch.');
      return;
    }
    window.Clerk.openSignUp({
      redirectUrl: window.location.href,
      signInForceRedirectUrl: window.location.href,
    });
  } catch (e) {
    console.error(e);
    alert('Sign-up error: ' + (e.message || e));
  }
}

async function openClerkAccount() {
  await initClerkAuth();
  if (!window.Clerk) return;
  openCowSynonymModal();
}

function bindAuthButtons() {
  const pairs = [
    ['#qs-auth-out .qs-auth-btn:not(.qs-auth-btn-primary)', openCowSignIn],
    ['#qs-auth-out .qs-auth-btn-primary', openCowSignUp],
    ['#cow-btn-sign-in', openCowSignIn],
    ['#cow-btn-sign-up', openCowSignUp],
  ];
  pairs.forEach(([sel, fn]) => {
    const el = document.querySelector(sel);
    if (!el || el.dataset.clerkBound) return;
    el.dataset.clerkBound = '1';
    el.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      fn();
    });
  });
}

window.initClerkAuth = initClerkAuth;
window.openCowSignIn = openCowSignIn;
window.openCowSignUp = openCowSignUp;
window.openClerkAccount = openClerkAccount;
window.hasClerkSynonym = () => hasClerkSynonym(window.__clerkUser);
window.getClerkSynonym = () => clerkDisplayName(window.__clerkUser);
window.openCowSynonymModal = openCowSynonymModal;
window.closeCowSynonymModal = closeCowSynonymModal;
window.saveCowSynonym = saveCowSynonym;
window.hasCowIdentity = () => !!window.__clerkUserId && hasClerkSynonym(window.__clerkUser);

document.addEventListener('DOMContentLoaded', () => {
  bindAuthButtons();
  initClerkAuth();
});
