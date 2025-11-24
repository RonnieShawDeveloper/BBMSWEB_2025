(function () {
  const firebaseConfig = {
    apiKey: "AIzaSyDRLoc9WMYgiZSjm29c_BSyuwbumwYk9o8",
    authDomain: "bbms-1283c.firebaseapp.com",
    databaseURL: "https://bbms-1283c.firebaseio.com",
    projectId: "bbms-1283c",
    storageBucket: "bbms-1283c.appspot.com",
    messagingSenderId: "280681404231",
    appId: "1:280681404231:web:86c2a944a9bdfa07"
  };

  const SIGNIN_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseConfig.apiKey}`;
  const TOKEN_URL = `https://securetoken.googleapis.com/v1/token?key=${firebaseConfig.apiKey}`;
  const FS_MEMBERS_BASE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/members`;

  function qs(id) { return document.getElementById(id); }

  function setMessage(elId, text, type) {
    const el = qs(elId);
    if (!el) return;
    el.textContent = text || '';
    el.className = 'message' + (text ? ' show' : '') + (type ? ' ' + type : '');
  }

  function showLogin() {
    const loginView = qs('loginView');
    const authedView = qs('authedView');
    if (loginView) loginView.hidden = false;
    if (authedView) authedView.hidden = true;
    setMessage('message', '');
    setMessage('authedMessage', '');
  }

  function showAuthed(email) {
    const loginView = qs('loginView');
    const authedView = qs('authedView');
    const emailEl = qs('userEmail');
    if (emailEl) emailEl.textContent = email || '';
    if (loginView) loginView.hidden = true;
    if (authedView) authedView.hidden = false;
    setMessage('message', '');
  }

  // Utilities for dates and parsing Firestore document fields
  function toLocalYmd(d) {
    return [d.getFullYear(), d.getMonth(), d.getDate()].join('-');
  }
  function isTodayLocal(d) {
    const now = new Date();
    return toLocalYmd(d) === toLocalYmd(now);
  }
  function parseLoginDate(str) {
    // Example: "Fri, 15 Aug 2025 13:54:22 GMT"
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }
  function fmtDateTime(d) {
    return d.toLocaleString(undefined, {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    });
  }

  function fieldString(doc, name) {
    return doc && doc.fields && doc.fields[name] && doc.fields[name].stringValue || '';
  }

  // Fetch members from Firestore REST with pagination
  async function fetchMembersDocs(useAuth) {
    const docs = [];
    let pageToken = undefined;
    let attempts = 0;
    while (attempts < 10) { // cap total requests
      attempts++;
      const url = new URL(FS_MEMBERS_BASE);
      url.searchParams.set('pageSize', '100');
      if (pageToken) url.searchParams.set('pageToken', pageToken);
      // Including API key can help quota/accounting; auth is via Bearer
      url.searchParams.set('key', firebaseConfig.apiKey);

      const headers = { 'Accept': 'application/json' };
      if (useAuth && useAuth.accessToken) {
        headers['Authorization'] = `Bearer ${useAuth.accessToken}`;
      } else if (useAuth && useAuth.idToken) {
        headers['Authorization'] = `Bearer ${useAuth.idToken}`;
      }

      const res = await fetch(url.toString(), { method: 'GET', headers });
      if (res.status === 401 || res.status === 403) {
        const err = new Error('AUTH_REQUIRED');
        err.code = res.status;
        throw err;
      }
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new Error(`Firestore error ${res.status}: ${body}`);
      }
      const data = await res.json().catch(() => ({}));
      if (Array.isArray(data.documents)) {
        docs.push(...data.documents);
      }
      if (data.nextPageToken) {
        pageToken = data.nextPageToken;
      } else {
        break;
      }
    }
    return docs;
  }

  async function getAuthState() {
    return await storageGet('bbms_auth');
  }

  async function ensureFreshAuth() {
    let auth = await getAuthState();
    if (!auth) return null;
    const now = Date.now();
    // Refresh ID/access token if expired or about to expire
    const needRefresh = !(auth.expiresAt && auth.expiresAt > now + 15 * 1000);
    const accessExpired = auth.accessTokenExpiresAt && auth.accessTokenExpiresAt <= now + 15 * 1000;
    if (needRefresh || accessExpired || !auth.accessToken) {
      try {
        const updated = await refreshIdToken(auth.refreshToken);
        auth = { ...auth, ...updated };
        await storageSet({ bbms_auth: auth });
      } catch (e) {
        return null;
      }
    }
    return auth;
  }

  async function loadMembersToday() {
    const tbody = qs('membersTbody');
    const msgElId = 'authedMessage';
    if (tbody) tbody.innerHTML = '';
    setMessage(msgElId, 'Loading members…');

    let auth = await ensureFreshAuth();
    if (!auth) {
      setMessage(msgElId, 'Authentication required. Please sign in again.', 'error');
      showLogin();
      return;
    }

    try {
      let docs = await fetchMembersDocs(auth);
      // Filter for today and map fields
      let members = docs.map(doc => {
        const fName = fieldString(doc, 'fName');
        const lName = fieldString(doc, 'lName');
        const email = fieldString(doc, 'email');
        const lastLoginStr = fieldString(doc, 'lastLogin');
        const loginDate = parseLoginDate(lastLoginStr);
        return { fName, lName, email, loginDate, lastLoginStr };
      }).filter(m => m.loginDate && isTodayLocal(m.loginDate));

      // Sort by time desc
      members.sort((a, b) => b.loginDate.getTime() - a.loginDate.getTime());

      if (!members.length) {
        setMessage(msgElId, 'No members have logged in today.');
        if (tbody) tbody.innerHTML = '';
        return;
      }

      if (tbody) {
        const rows = members.map(m => {
          const name = `${m.fName || ''} ${m.lName || ''}`.trim() || '(No name)';
          const when = m.loginDate ? fmtDateTime(m.loginDate) : m.lastLoginStr || '';
          return `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(m.email || '')}</td><td>${escapeHtml(when)}</td></tr>`;
        }).join('');
        tbody.innerHTML = rows;
      }
      setMessage(msgElId, '');
    } catch (err) {
      if (err && err.message === 'AUTH_REQUIRED') {
        // Retry once after refresh
        try {
          const updated = await refreshIdToken(auth.refreshToken);
          auth = { ...auth, ...updated };
          await storageSet({ bbms_auth: auth });
          const docs = await fetchMembersDocs(auth);
          const members = docs.map(doc => {
            const fName = fieldString(doc, 'fName');
            const lName = fieldString(doc, 'lName');
            const email = fieldString(doc, 'email');
            const lastLoginStr = fieldString(doc, 'lastLogin');
            const loginDate = parseLoginDate(lastLoginStr);
            return { fName, lName, email, loginDate, lastLoginStr };
          }).filter(m => m.loginDate && isTodayLocal(m.loginDate))
            .sort((a, b) => b.loginDate.getTime() - a.loginDate.getTime());
          if (tbody) {
            tbody.innerHTML = members.map(m => {
              const name = `${m.fName || ''} ${m.lName || ''}`.trim() || '(No name)';
              const when = m.loginDate ? fmtDateTime(m.loginDate) : m.lastLoginStr || '';
              return `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(m.email || '')}</td><td>${escapeHtml(when)}</td></tr>`;
            }).join('');
          }
          setMessage(msgElId, members.length ? '' : 'No members have logged in today.');
        } catch (e2) {
          setMessage(msgElId, 'Unable to load members. Please try again later.', 'error');
        }
      } else {
        setMessage(msgElId, 'Unable to load members. Please try again later.', 'error');
      }
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  }

  // Render helpers for members table
  function renderMembersTable(members) {
    const tbody = qs('membersTbody');
    if (!tbody) return;
    if (!Array.isArray(members) || members.length === 0) {
      tbody.innerHTML = '';
      setMessage('authedMessage', 'No members have logged in today.');
      return;
    }
    const rows = members.map(m => {
      const name = `${(m.fName || '').trim()} ${(m.lName || '').trim()}`.trim() || '(No name)';
      let when = '';
      if (m.loginDate instanceof Date) {
        when = fmtDateTime(m.loginDate);
      } else if (m.loginDateMs) {
        when = fmtDateTime(new Date(m.loginDateMs));
      } else if (m.lastLoginStr || m.lastLogin) {
        const d = parseLoginDate(m.lastLoginStr || m.lastLogin);
        when = d ? fmtDateTime(d) : (m.lastLoginStr || m.lastLogin || '');
      }
      return `<tr><td>${escapeHtml(name)}</td><td>${escapeHtml(m.email || '')}</td><td>${escapeHtml(when)}</td></tr>`;
    }).join('');
    tbody.innerHTML = rows;
    setMessage('authedMessage', '');
  }

  async function primeMembersView() {
    try {
      const cached = await storageGet('bbms_today_members');
      if (cached && Array.isArray(cached)) {
        showAuthed((await storageGet('bbms_auth'))?.email || '');
        renderMembersTable(cached);
      } else {
        // Fallback to network if no cache yet
        await loadMembersToday();
      }
      try {
        const maybePromise = chrome.runtime.sendMessage({ type: 'triggerPoll' });
        if (maybePromise && typeof maybePromise.catch === 'function') {
          maybePromise.catch(() => {});
        }
      } catch (e) { /* ignore */ }
    } catch (e) {
      await loadMembersToday();
    }
  }

  // chrome.storage helpers (Promise wrappers)
  function storageGet(key) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get(key, (result) => resolve(result[key]));
      } catch (e) {
        resolve(undefined);
      }
    });
  }

  function storageSet(obj) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.set(obj, () => resolve());
      } catch (e) {
        resolve();
      }
    });
  }

  function storageRemove(key) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.remove(key, () => resolve());
      } catch (e) {
        resolve();
      }
    });
  }

  function buildAuthState(resp, emailFromInput) {
    const idToken = resp.idToken || resp.id_token;
    const refreshToken = resp.refreshToken || resp.refresh_token;
    const expiresIn = parseInt(resp.expiresIn || resp.expires_in || '3600', 10);
    const email = resp.email || emailFromInput || '';
    const localId = resp.localId || resp.user_id || '';
    const expiresAt = Date.now() + Math.max(expiresIn - 60, 1) * 1000; // 60s safety buffer for ID token

    // OAuth access token returned by Secure Token endpoint (when refreshing)
    const accessToken = resp.access_token || undefined;
    const accessTokenExpiresIn = parseInt(resp.expires_in || resp.accessTokenExpiresIn || '0', 10);
    const accessTokenExpiresAt = accessToken
      ? Date.now() + Math.max(accessTokenExpiresIn - 60, 1) * 1000
      : undefined;

    return { idToken, refreshToken, expiresAt, email, userId: localId, accessToken, accessTokenExpiresAt };
  }

  async function signInWithPassword(email, password) {
    const res = await fetch(SIGNIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (data && data.error && data.error.message) ? data.error.message : `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return buildAuthState(data, email);
  }

  async function refreshIdToken(refreshToken) {
    const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken });
    const res = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = (data && data.error && data.error.message) ? data.error.message : `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return buildAuthState(data);
  }

  async function restoreSession() {
    const auth = await storageGet('bbms_auth');
    if (!auth || !auth.idToken || !auth.refreshToken) {
      showLogin();
      return;
    }
    const now = Date.now();
    if (auth.expiresAt && auth.expiresAt > now + 15 * 1000) { // still valid
      showAuthed(auth.email);
      // Show cached list immediately, then refresh from network
      primeMembersView();
      return;
    }
    // Try to refresh
    try {
      setMessage('message', 'Refreshing session…');
      const updated = await refreshIdToken(auth.refreshToken);
      const merged = { ...auth, ...updated };
      await storageSet({ bbms_auth: merged });
      showAuthed(merged.email);
      setMessage('message', '');
      loadMembersToday();
    } catch (e) {
      await storageRemove('bbms_auth');
      showLogin();
      setMessage('message', 'Session expired. Please sign in again.', 'error');
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const form = qs('loginForm');
    const usernameEl = qs('username');
    const passwordEl = qs('password');
    const rememberEl = qs('remember');
    const forgotLink = qs('forgotLink');
    const logoutBtn = qs('logoutBtn');
    const refreshBtn = qs('refreshBtn');

    // Prefill username if previously remembered
    try {
      const savedUser = localStorage.getItem('bbms_login_username');
      if (savedUser && usernameEl) {
        usernameEl.value = savedUser;
        if (rememberEl) rememberEl.checked = true;
      }
    } catch (e) { /* ignore */ }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = (usernameEl && usernameEl.value || '').trim();
        const password = (passwordEl && passwordEl.value || '').trim();
        const remember = !!(rememberEl && rememberEl.checked);

        if (!email || !password) {
          setMessage('message', 'Please enter both email and password.', 'error');
          return;
        }

        setMessage('message', 'Signing in…');
        try {
          const auth = await signInWithPassword(email, password);
          await storageSet({ bbms_auth: auth });

          // Remember email preference
          try {
            if (remember) {
              localStorage.setItem('bbms_login_username', email);
            } else {
              localStorage.removeItem('bbms_login_username');
            }
          } catch (e) { /* ignore */ }

          setMessage('message', '');
          showAuthed(auth.email);
          loadMembersToday();
          try {
            const maybePromise = chrome.runtime.sendMessage({ type: 'triggerPoll' });
            if (maybePromise && typeof maybePromise.catch === 'function') {
              maybePromise.catch(() => {});
            }
          } catch (e) { /* ignore */ }
        } catch (err) {
          const raw = (err && err.message) || '';
          let friendly = 'Sign-in failed. Please check your credentials and try again.';
          if (/INVALID_PASSWORD|EMAIL_NOT_FOUND|USER_DISABLED/.test(raw)) {
            friendly = 'Invalid email or password.';
          } else if (/TOO_MANY_ATTEMPTS_TRY_LATER/.test(raw)) {
            friendly = 'Too many attempts. Try again later.';
          } else if (/NETWORK_ERROR|Failed to fetch|HTTP 4|HTTP 5/.test(raw)) {
            friendly = 'Network error. Please check your connection and try again.';
          }
          setMessage('message', friendly, 'error');
        }
      });
    }

    if (forgotLink) {
      forgotLink.addEventListener('click', (e) => {
        e.preventDefault();
        setMessage('message', 'Password reset flow is not implemented in this demo.', 'error');
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async () => {
        await storageRemove('bbms_auth');
        showLogin();
        setMessage('message', 'Signed out.', 'success');
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        loadMembersToday();
      });
    }

    // Listen for background updates to refresh the table live
    try {
      chrome.runtime.onMessage.addListener((msg) => {
        if (msg && msg.type === 'membersUpdated') {
          const authedView = qs('authedView');
          if (authedView && !authedView.hidden) {
            renderMembersTable(msg.members || []);
            setMessage('authedMessage', '');
          }
        }
      });
    } catch (e) { /* ignore */ }

    // On open, try to restore session
    restoreSession();
  });
})();
