// Background service worker for MV3
// - Polls Firestore members collection for today's logins
// - Shows notifications and plays a short chime via offscreen doc on new logins
// - Updates toolbar badge with today's count

const firebaseConfig = {
  apiKey: "AIzaSyDRLoc9WMYgiZSjm29c_BSyuwbumwYk9o8",
  authDomain: "bbms-1283c.firebaseapp.com",
  databaseURL: "https://bbms-1283c.firebaseio.com",
  projectId: "bbms-1283c",
  storageBucket: "bbms-1283c.appspot.com",
  messagingSenderId: "280681404231",
  appId: "1:280681404231:web:86c2a944a9bdfa07"
};

const TOKEN_URL = `https://securetoken.googleapis.com/v1/token?key=${firebaseConfig.apiKey}`;
const FS_MEMBERS_BASE = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/members`;

// Helpers
function toLocalYmd(d) { return [d.getFullYear(), d.getMonth(), d.getDate()].join('-'); }
function isTodayLocal(d) { const now = new Date(); return toLocalYmd(d) === toLocalYmd(now); }
function parseLoginDate(str) { const d = new Date(str); return isNaN(d.getTime()) ? null : d; }
function fieldString(doc, name) { return (doc && doc.fields && doc.fields[name] && doc.fields[name].stringValue) || ''; }
function docIdFromName(name) { if (!name) return ''; const parts = name.split('/'); return parts[parts.length - 1] || name; }

function storageGet(key) { return new Promise((resolve) => { try { chrome.storage.local.get(key, (r) => resolve(r[key])); } catch { resolve(undefined); } }); }
function storageSet(obj) { return new Promise((resolve) => { try { chrome.storage.local.set(obj, () => resolve()); } catch { resolve(); } }); }

function buildAuthState(resp, prev) {
  const idToken = resp.idToken || resp.id_token || prev?.idToken;
  const refreshToken = resp.refreshToken || resp.refresh_token || prev?.refreshToken;
  const expiresIn = parseInt(resp.expiresIn || resp.expires_in || '3600', 10);
  const accessToken = resp.access_token || undefined;
  const accessTokenExpiresAt = accessToken ? Date.now() + Math.max(parseInt(resp.expires_in || '0', 10) - 60, 1) * 1000 : prev?.accessTokenExpiresAt;
  const expiresAt = idToken ? Date.now() + Math.max(expiresIn - 60, 1) * 1000 : prev?.expiresAt;
  return { ...prev, idToken, refreshToken, expiresAt, accessToken, accessTokenExpiresAt };
}

async function refreshIdToken(refreshToken, prev) {
  const body = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refreshToken });
  const res = await fetch(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { throw new Error((data && data.error && data.error.message) || `HTTP ${res.status}`); }
  return buildAuthState(data, prev);
}

async function ensureFreshAuth() {
  let auth = await storageGet('bbms_auth');
  if (!auth || !auth.refreshToken) return null;
  const now = Date.now();
  const needRefresh = !(auth.expiresAt && auth.expiresAt > now + 15 * 1000);
  const accessExpired = auth.accessTokenExpiresAt && auth.accessTokenExpiresAt <= now + 15 * 1000;
  if (needRefresh || accessExpired || !auth.accessToken) {
    try {
      const updated = await refreshIdToken(auth.refreshToken, auth);
      auth = { ...auth, ...updated };
      await storageSet({ bbms_auth: auth });
    } catch (e) {
      return null;
    }
  }
  return auth;
}

async function fetchMembersDocs(auth) {
  const docs = [];
  let pageToken;
  for (let i = 0; i < 10; i++) {
    const url = new URL(FS_MEMBERS_BASE);
    url.searchParams.set('pageSize', '100');
    if (pageToken) url.searchParams.set('pageToken', pageToken);
    url.searchParams.set('key', firebaseConfig.apiKey);

    const headers = { 'Accept': 'application/json' };
    if (auth?.accessToken) headers['Authorization'] = `Bearer ${auth.accessToken}`;
    else if (auth?.idToken) headers['Authorization'] = `Bearer ${auth.idToken}`;

    const res = await fetch(url.toString(), { method: 'GET', headers });
    if (res.status === 401 || res.status === 403) throw new Error('AUTH_REQUIRED');
    if (!res.ok) { const body = await res.text().catch(() => ''); throw new Error(`Firestore error ${res.status}: ${body}`); }
    const data = await res.json().catch(() => ({}));
    if (Array.isArray(data.documents)) docs.push(...data.documents);
    if (!data.nextPageToken) break; else pageToken = data.nextPageToken;
  }
  return docs;
}

async function updateBadge(count) {
  try {
    await chrome.action.setBadgeBackgroundColor({ color: '#2563eb' });
    await chrome.action.setBadgeText({ text: count > 0 ? String(count) : '' });
  } catch (e) { /* ignore */ }
}

// Safely send a runtime message without causing unhandled rejections
function safeSendMessage(message) {
  try {
    const maybePromise = chrome.runtime.sendMessage(message);
    if (maybePromise && typeof maybePromise.catch === 'function') {
      // In MV3, sendMessage may return a Promise; ignore rejection if no receiver
      maybePromise.catch(() => {});
    }
  } catch (e) { /* ignore */ }
}

async function ensureOffscreen() {
  if (!chrome.offscreen || !chrome.offscreen.createDocument) return;
  try {
    await chrome.offscreen.createDocument({
      url: 'offscreen.html',
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Play a short chime when a new login occurs'
    });
  } catch (e) {
    // If it already exists, ignore
  }
}

async function playChime() {
  try {
    await ensureOffscreen();
    safeSendMessage({ type: 'playChime' });
  } catch (e) { /* ignore */ }
}

async function notifyNewLogin(name) {
  try {
    await chrome.notifications.create('', {
      type: 'basic',
      iconUrl: 'icons/favicon.png',
      title: 'New login',
      message: name ? `${name} just logged in.` : 'A member just logged in.'
    });
  } catch (e) { /* ignore */ }
}

async function pollAndNotify() {
  const auth = await ensureFreshAuth();
  if (!auth) { await updateBadge(0); return; }

  let docs;
  try {
    docs = await fetchMembersDocs(auth);
  } catch (e) {
    if (e && e.message === 'AUTH_REQUIRED') {
      try { const updated = await refreshIdToken(auth.refreshToken, auth); await storageSet({ bbms_auth: { ...auth, ...updated } }); docs = await fetchMembersDocs({ ...auth, ...updated }); }
      catch { return; }
    } else {
      return;
    }
  }

  const todayMembers = [];
  const now = new Date();
  for (const doc of docs) {
    const fName = fieldString(doc, 'fName');
    const lName = fieldString(doc, 'lName');
    const email = fieldString(doc, 'email');
    const lastLoginStr = fieldString(doc, 'lastLogin');
    const loginDate = parseLoginDate(lastLoginStr);
    if (loginDate && isTodayLocal(loginDate)) {
      todayMembers.push({ id: docIdFromName(doc.name), fName, lName, email, lastLogin: lastLoginStr, loginDateMs: loginDate.getTime() });
    }
  }
  // Sort newest first
  todayMembers.sort((a, b) => b.loginDateMs - a.loginDateMs);

  // Seen set
  const todayKey = toLocalYmd(now);
  const seen = (await storageGet('bbms_seen_logins')) || { date: todayKey, keys: {} };
  if (seen.date !== todayKey) { seen.date = todayKey; seen.keys = {}; }

  // First poll of the day: initialize seen without notifying to avoid flooding
  const initDate = (await storageGet('bbms_seen_init_date')) || '';
  if (initDate !== todayKey) {
    for (const m of todayMembers) {
      const k = `${m.id}|${m.lastLogin}`;
      seen.keys[k] = true;
    }
    await storageSet({ bbms_today_members: todayMembers, bbms_seen_logins: seen, bbms_seen_init_date: todayKey });
    await updateBadge(todayMembers.length);
    safeSendMessage({ type: 'membersUpdated', members: todayMembers, count: todayMembers.length });
    return;
  }

  const newOnes = [];
  for (const m of todayMembers) {
    const key = `${m.id}|${m.lastLogin}`;
    if (!seen.keys[key]) {
      // Only consider as new if this login is within recent time window (optional), but here we accept any unseen today
      newOnes.push(m);
      seen.keys[key] = true;
    }
  }

  await storageSet({ bbms_today_members: todayMembers, bbms_seen_logins: seen });
  await updateBadge(todayMembers.length);

  if (newOnes.length) {
    for (const m of newOnes) {
      const name = `${m.fName || ''} ${m.lName || ''}`.trim() || '(No name)';
      await notifyNewLogin(name);
    }
    await playChime();
    // Notify popup(s) to refresh
    safeSendMessage({ type: 'membersUpdated', members: todayMembers, count: todayMembers.length });
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('pollMembers', { periodInMinutes: 1 });
  // Initial badge color
  chrome.action.setBadgeBackgroundColor({ color: '#2563eb' });
  // Run an initial poll shortly after install
  pollAndNotify();
});

chrome.runtime.onStartup?.addListener(() => {
  chrome.alarms.create('pollMembers', { periodInMinutes: 1 });
  chrome.action.setBadgeBackgroundColor({ color: '#2563eb' });
  pollAndNotify();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm && alarm.name === 'pollMembers') {
    pollAndNotify();
  }
});

// Allow popup to trigger an immediate poll after sign-in
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'triggerPoll') {
    pollAndNotify()
      .then(() => sendResponse && sendResponse({ ok: true }))
      .catch(() => sendResponse && sendResponse({ ok: false }));
    return true; // keep the message channel open for async response
  }
});
