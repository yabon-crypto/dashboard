import db from '../config/database.js';
import config from '../config/env.js';

const MICROSOFT_AUTH_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize';
const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const MICROSOFT_GRAPH_URL = 'https://graph.microsoft.com/v1.0';

const SCOPES = 'openid profile email User.Read Mail.Read Calendars.Read offline_access Mail.ReadWrite';

export function getAuthUrl() {
  const params = new URLSearchParams({
    client_id: config.MICROSOFT_CLIENT_ID,
    response_type: 'code',
    redirect_uri: config.MICROSOFT_REDIRECT_URI,
    response_mode: 'query',
    scope: SCOPES,
    prompt: 'select_account',
  });
  return `${MICROSOFT_AUTH_URL}?${params.toString()}`;
}

async function getTokenFromCode(code) {
  const body = new URLSearchParams({
    client_id: config.MICROSOFT_CLIENT_ID,
    client_secret: config.MICROSOFT_CLIENT_SECRET,
    code,
    redirect_uri: config.MICROSOFT_REDIRECT_URI,
    grant_type: 'authorization_code',
  });
  const res = await fetch(MICROSOFT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Microsoft token error: ${err}`);
  }
  return res.json();
}

async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    client_id: config.MICROSOFT_CLIENT_ID,
    client_secret: config.MICROSOFT_CLIENT_SECRET,
    refresh_token: refreshToken,
    redirect_uri: config.MICROSOFT_REDIRECT_URI,
    grant_type: 'refresh_token',
  });
  const res = await fetch(MICROSOFT_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Microsoft refresh error: ${err}`);
  }
  return res.json();
}

export async function handleCallback(code, linkUserId = null) {
  const tokens = await getTokenFromCode(code);

  const userRes = await fetch(`${MICROSOFT_GRAPH_URL}/me`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const userInfo = await userRes.json();
  const email = userInfo.mail || userInfo.userPrincipalName;

  let user;
  if (linkUserId) {
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(linkUserId);
  } else {
    user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) {
      const info = db.prepare('INSERT INTO users (name, email, notify_email) VALUES (?, ?, ?)');
      const result = info.run(userInfo.displayName || email, email, email);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    }
  }

  const existing = db.prepare(
    'SELECT id FROM oauth_tokens WHERE user_id = ? AND provider = ? AND account_email = ?'
  ).get(user.id, 'microsoft', email);

  if (existing) {
    db.prepare(`
      UPDATE oauth_tokens SET access_token = ?, refresh_token = ?, expiry_date = ?, scope = ?
      WHERE id = ?
    `).run(tokens.access_token, tokens.refresh_token || null,
      tokens.expiry_date ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
      tokens.scope || SCOPES, existing.id);
  } else {
    db.prepare(`
      INSERT INTO oauth_tokens (user_id, provider, account_email, account_name, access_token, refresh_token, expiry_date, scope)
      VALUES (?, 'microsoft', ?, ?, ?, ?, ?, ?)
    `).run(user.id, email, userInfo.displayName || email,
      tokens.access_token, tokens.refresh_token || null,
      tokens.expiry_date ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
      tokens.scope || SCOPES);
  }

  return user;
}

async function getAccessTokenForRow(row) {
  if (row.expiry_date && new Date(row.expiry_date) < new Date()) {
    if (!row.refresh_token) return null;
    try {
      const tokens = await refreshAccessToken(row.refresh_token);
      db.prepare(`
        UPDATE oauth_tokens SET access_token = ?, refresh_token = ?, expiry_date = ? WHERE id = ?
      `).run(tokens.access_token, tokens.refresh_token || row.refresh_token,
        new Date(Date.now() + tokens.expires_in * 1000).toISOString(), row.id);
      return tokens.access_token;
    } catch { return null; }
  }
  return row.access_token;
}

async function graphFetchWithToken(token, endpoint, method = 'GET', body = null) {
  const opts = { method, headers: { Authorization: `Bearer ${token}` } };
  if (body) { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
  const res = await fetch(`${MICROSOFT_GRAPH_URL}${endpoint}`, opts);
  if (!res.ok && res.status !== 204) return null;
  return method === 'GET' ? res.json() : true;
}

function getRows(userId) {
  return db.prepare('SELECT * FROM oauth_tokens WHERE user_id = ? AND provider = ?').all(userId, 'microsoft');
}

export function getAccounts(userId) {
  return db.prepare(
    'SELECT id, account_email, account_name FROM oauth_tokens WHERE user_id = ? AND provider = ?'
  ).all(userId, 'microsoft');
}

export async function fetchEmails(userId, top = 50) {
  const rows = getRows(userId);
  if (!rows.length) return [];

  const allEmails = [];
  for (const row of rows) {
    try {
      const token = await getAccessTokenForRow(row);
      if (!token) continue;
      const data = await graphFetchWithToken(token,
        `/me/messages?\$top=${top}&\$select=id,subject,from,receivedDateTime,bodyPreview,isRead&\$filter=receivedDateTime ge ${new Date().toISOString().split('T')[0]}Z&\$orderby=receivedDateTime desc`);
      if (!data?.value) continue;
      const msgs = data.value.map(msg => ({
        id: msg.id,
        account: row.account_email,
        subject: msg.subject || '(無主旨)',
        from: msg.from?.emailAddress?.address || '',
        date: msg.receivedDateTime || '',
        snippet: msg.bodyPreview || '',
        isRead: msg.isRead,
      }));
      allEmails.push(...msgs);
    } catch (err) {
      console.error(`MS email fetch error for ${row.account_email}:`, err.message);
    }
  }
  return allEmails.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function getEmailDetail(userId, messageId) {
  const rows = getRows(userId);
  for (const row of rows) {
    try {
      const token = await getAccessTokenForRow(row);
      if (!token) continue;
      const data = await graphFetchWithToken(token,
        `/me/messages/${messageId}?\$select=id,subject,from,toRecipients,receivedDateTime,body,isRead`);
      if (!data) continue;
      return {
        id: messageId,
        account: row.account_email,
        subject: data.subject || '',
        from: data.from?.emailAddress?.address || '',
        to: data.toRecipients?.map(r => r.emailAddress?.address).join(', ') || '',
        date: data.receivedDateTime || '',
        body: data.body?.content || '',
        isRead: data.isRead,
      };
    } catch {}
  }
  return null;
}

export async function modifyEmail(userId, messageId, action) {
  const rows = getRows(userId);
  for (const row of rows) {
    try {
      const token = await getAccessTokenForRow(row);
      if (!token) continue;
      switch (action) {
        case 'read':
          return await graphFetchWithToken(token, `/me/messages/${messageId}`, 'PATCH', { isRead: true });
        case 'unread':
          return await graphFetchWithToken(token, `/me/messages/${messageId}`, 'PATCH', { isRead: false });
        case 'archive':
          return await graphFetchWithToken(token, `/me/messages/${messageId}/move`, 'POST', { destinationId: 'archive' });
        case 'trash':
          return await graphFetchWithToken(token, `/me/messages/${messageId}/move`, 'POST', { destinationId: 'deleteditems' });
        case 'delete':
          return await graphFetchWithToken(token, `/me/messages/${messageId}`, 'DELETE');
      }
    } catch {}
  }
  return false;
}

export async function fetchCalendarEvents(userId, top = 20) {
  const rows = getRows(userId);
  if (!rows.length) return [];
  const allEvents = [];
  const now = new Date();
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  for (const row of rows) {
    try {
      const token = await getAccessTokenForRow(row);
      if (!token) continue;
      const data = await graphFetchWithToken(token,
        `/me/calendarView?\$top=${top}&\$select=id,subject,bodyPreview,start,end,location&\$orderby=start/dateTime`);
      if (!data?.value) continue;
      const events = data.value.map(event => ({
        id: event.id, account: row.account_email,
        summary: event.subject || '(無標題)', description: event.bodyPreview || '',
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date, location: event.location?.displayName || '',
      }));
      allEvents.push(...events);
    } catch {}
  }
  return allEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
}
