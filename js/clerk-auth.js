/* global Clerk */
let _clerkInitPromise = null;

function clerkRedirectUrl() {
  return window.location.origin + window.location.pathname + (window.location.hash || '');
}

function clerkRedirectPending() {
  const blob = window.location.search + window.location.hash;
  return /__clerk|clerk_status|clerk_created_session/i.test(blob);
}

function getPublishableKey() {
  const meta = document.querySelector('meta[name="clerk-publishable-key"]')?.content?.trim();
  if (meta) return meta;
  const fromScript = document.querySelector('script[data-clerk-publishable-key]')?.getAttribute(
    'data-clerk-publishable-key',
  );
  return (fromScript || '').trim();
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

function synonymFromUser(user) {
  if (!user) return '';
  const u = String(user.username || '').trim();
  if (u) return u;
  const meta = user.unsafeMetadata || user.publicMetadata || {};
  return String(meta.cowSynonym || meta.synonym || '').trim();
}

function userHasSynonym(user) {
  return Boolean(synonymFromUser(user));
}

function clerkDisplayName(user) {
  const u = synonymFromUser(user);
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
    await refreshClerkUser();
    if (!window.Clerk || !window.Clerk.user) {
      alert('Sign in first.');
      return false;
    }
    try {
      await window.Clerk.user.update({ username: un });
    } catch (usernameErr) {
      const msg = String(
        usernameErr?.message ||
          usernameErr?.errors?.[0]?.longMessage ||
          usernameErr?.errors?.[0]?.message ||
          '',
      );
      const usernameDisabled = /username is not a valid parameter/i.test(msg);
      if (usernameDisabled) {
        await window.Clerk.user.update({
          unsafeMetadata: { ...(window.Clerk.user.unsafeMetadata || {}), cowSynonym: un },
        });
      } else {
        throw usernameErr;
      }
    }
    await window.Clerk.user.reload();
    applyClerkUser(window.Clerk.user);
    closeCowSynonymModal();
    return true;
  } catch (e) {
    console.error(e);
    if (err) {
      const msg = String(
        e?.message || e?.errors?.[0]?.longMessage || e?.errors?.[0]?.message || '',
      );
      if (/username is not a valid parameter/i.test(msg)) {
        err.textContent =
          'Clerk username is off for this app. Enable Username under User & authentication in the Clerk dashboard, then try again.';
      } else {
        err.textContent = msg || 'That name is taken or not allowed. Try another.';
      }
      err.style.display = 'block';
    }
    return false;
  }
}

function setBlockVisible(el, show) {
  if (!el) return;
  if (show) {
    el.removeAttribute('hidden');
    el.style.display = '';
  } else {
    el.setAttribute('hidden', '');
    el.style.display = 'none';
  }
}

function mountUserButton(el) {
  if (!el || !window.Clerk || !window.__clerkUserId) return;
  el.innerHTML = '';
  try {
    window.Clerk.mountUserButton(el, {
      afterSignOutUrl: clerkRedirectUrl(),
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
  const needsSynonym = has && !userHasSynonym(user);

  if (signedOut) signedOut.style.display = has ? 'none' : 'block';
  if (synonymBlock) synonymBlock.style.display = needsSynonym ? 'block' : 'none';
  if (formFields && (!has || needsSynonym)) formFields.style.display = 'none';

  if (has && needsSynonym && !window.__cowSynonymPrompted) {
    window.__cowSynonymPrompted = true;
    openCowSynonymModal();
  }
  if (has && userHasSynonym(user)) window.__cowSynonymPrompted = false;

  setBlockVisible(document.getElementById('qs-auth-out'), !has);
  setBlockVisible(document.getElementById('qs-auth-in'), has);

  const nameEl = document.getElementById('qs-auth-name');
  if (nameEl) {
    const label = has ? clerkDisplayName(user) || 'Set synonym' : '';
    nameEl.textContent = label;
    const needsPick = has && !userHasSynonym(user);
    nameEl.classList.toggle('qs-auth-synonym-link', needsPick);
    if (needsPick && !nameEl.dataset.synonymLinkBound) {
      nameEl.dataset.synonymLinkBound = '1';
      nameEl.setAttribute('role', 'button');
      nameEl.setAttribute('tabindex', '0');
      nameEl.addEventListener('click', () => openCowSynonymModal());
      nameEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openCowSynonymModal();
        }
      });
    }
  }

  mountUserButton(document.getElementById('clerk-user-btn'));
  mountUserButton(document.getElementById('qs-clerk-user-btn'));

  if (typeof renderClipsOfWeek === 'function') renderClipsOfWeek();
}

function currentClerkUser() {
  const c = window.Clerk;
  if (!c) return null;
  if (c.user) return c.user;
  const fromSession = c.session?.user;
  if (fromSession) return fromSession;
  return null;
}

function applyClerkUser(user) {
  window.__clerkUser = user || null;
  window.__clerkUserId = user ? user.id : '';
  updateAuthUI();
}

async function ensureActiveSession() {
  const c = window.Clerk;
  if (!c?.setActive || c.session) return;
  const sessions = c.client?.sessions;
  if (!Array.isArray(sessions) || !sessions.length) return;
  const target =
    sessions.find((s) => s.status === 'active') ||
    sessions.find((s) => s.lastActiveAt) ||
    sessions[0];
  if (!target?.id) return;
  try {
    await c.setActive({ session: target.id });
  } catch (e) {
    console.warn('Clerk setActive', e);
  }
}

async function refreshClerkUser() {
  if (!window.Clerk) return;
  try {
    await ensureActiveSession();
    if (window.Clerk.session?.reload) {
      await window.Clerk.session.reload();
    }
    if (window.Clerk.user?.reload) {
      await window.Clerk.user.reload();
    }
  } catch (e) {
    console.warn('Clerk session refresh', e);
  }
  applyClerkUser(currentClerkUser());
}

function schedulePostSignInRefresh() {
  [400, 1000, 2200, 4500].forEach((ms) => {
    setTimeout(() => refreshClerkUser(), ms);
  });
}

async function resolvePublishableKey() {
  let cfg = {};
  try {
    const r = await fetch('/api/auth/config', { cache: 'no-store' });
    if (r.ok) cfg = await r.json();
  } catch (e) {}
  return (cfg.publishableKey || getPublishableKey() || '').trim();
}

async function completeClerkRedirectHandoff() {
  if (!window.Clerk?.handleRedirectCallback || !clerkRedirectPending()) return;
  const dest = clerkRedirectUrl();
  try {
    await window.Clerk.handleRedirectCallback(
      {
        redirectUrl: dest,
        signInForceRedirectUrl: dest,
        signUpForceRedirectUrl: dest,
      },
      (to) => {
        window.history.replaceState({}, '', to);
        return Promise.resolve();
      },
    );
  } catch (e) {
    console.warn('Clerk redirect handoff', e);
  }
}

function bindClerkListeners() {
  if (!window.Clerk || window.__clerkListenersBound) return;
  window.__clerkListenersBound = true;
  window.Clerk.addListener(({ user, session }) => {
    // While Clerk is loading, session/user are undefined — do not flip to signed-out.
    if (session === undefined && user === undefined) return;
    if (session === null && user === null) {
      applyClerkUser(null);
      return;
    }
    const resolved = user || session?.user || currentClerkUser();
    if (session && resolved) {
      applyClerkUser(resolved);
      return;
    }
    if (!session) applyClerkUser(null);
    else void refreshClerkUser();
  });
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

      await waitFor(
        () => window.Clerk && window.__internal_ClerkUICtor,
        25000,
        50,
      );

      await window.Clerk.load({
        publishableKey,
        ui: { ClerkUI: window.__internal_ClerkUICtor },
      });

      bindClerkListeners();
      await completeClerkRedirectHandoff();
      if (clerkRedirectPending()) {
        try {
          window.history.replaceState({}, '', clerkRedirectUrl());
        } catch (e) {}
      }
      await refreshClerkUser();
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

function signInRedirectOptions() {
  const url = clerkRedirectUrl();
  return {
    afterSignInUrl: url,
    afterSignUpUrl: url,
    redirectUrl: url,
    fallbackRedirectUrl: url,
    forceRedirectUrl: url,
    signInForceRedirectUrl: url,
    signUpForceRedirectUrl: url,
    signUpFallbackRedirectUrl: url,
  };
}

async function openCowSignIn() {
  try {
    const ok = await initClerkAuth();
    if (!ok || !window.Clerk) {
      alert('Sign-in is not configured. Hard refresh and try again.');
      return;
    }
    window.Clerk.openSignIn(signInRedirectOptions());
    schedulePostSignInRefresh();
  } catch (e) {
    console.error(e);
    alert('Sign-in error: ' + (e.message || e));
  }
}

async function openCowSignUp() {
  try {
    const ok = await initClerkAuth();
    if (!ok || !window.Clerk) {
      alert('Sign-up is not configured. Hard refresh and try again.');
      return;
    }
    window.Clerk.openSignUp(signInRedirectOptions());
    schedulePostSignInRefresh();
  } catch (e) {
    console.error(e);
    alert('Sign-up error: ' + (e.message || e));
  }
}

async function openClerkAccount() {
  await initClerkAuth();
  await refreshClerkUser();
  if (!window.Clerk?.user) {
    openCowSignIn();
    return;
  }
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
window.hasClerkSynonym = () => userHasSynonym(window.__clerkUser);
window.getClerkSynonym = () => clerkDisplayName(window.__clerkUser);
window.openCowSynonymModal = openCowSynonymModal;
window.closeCowSynonymModal = closeCowSynonymModal;
window.saveCowSynonym = saveCowSynonym;
window.hasCowIdentity = () => !!window.__clerkUserId && userHasSynonym(window.__clerkUser);
window.refreshClerkUser = refreshClerkUser;

document.addEventListener('DOMContentLoaded', () => {
  bindAuthButtons();
  initClerkAuth();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') refreshClerkUser();
});

window.addEventListener('focus', () => refreshClerkUser());
