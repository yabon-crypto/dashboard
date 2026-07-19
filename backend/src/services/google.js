import { google } from 'googleapis';
import db from '../config/database.js';
import config from '../config/env.js';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

function getOAuth2Client() {
  return new google.auth.OAuth2(
    config.GOOGLE_CLIENT_ID,
    config.GOOGLE_CLIENT_SECRET,
    config.GOOGLE_REDIRECT_URI
  );
}

export function getAuthUrl(state = '') {
  const oauth2 = getOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
  });
}

export async function handleCallback(code, linkUserId = null) {
  const oauth2 = getOAuth2Client();
  const { tokens } = await oauth2.getToken(code);
  oauth2.setCredentials(tokens);

  const oauth2api = google.oauth2({ version: 'v2', auth: oauth2 });
  const { data: userInfo } = await oauth2api.userinfo.get();

  let user;
  if (linkUserId) {
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(linkUserId);
  } else {
    user = db.prepare('SELECT * FROM users WHERE email = ?').get(userInfo.email);
    if (!user) {
      const info = db.prepare('INSERT INTO users (name, email, notify_email) VALUES (?, ?, ?)');
      const result = info.run(userInfo.name, userInfo.email, userInfo.email);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    }
  }

  const existing = db.prepare(
    'SELECT id FROM oauth_tokens WHERE user_id = ? AND provider = ? AND account_email = ?'
  ).get(user.id, 'google', userInfo.email);

  if (existing) {
    db.prepare(`
      UPDATE oauth_tokens SET access_token = ?, refresh_token = ?, expiry_date = ?, scope = ?
      WHERE id = ?
    `).run(tokens.access_token, tokens.refresh_token || null,
      tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null, tokens.scope, existing.id);
  } else {
    db.prepare(`
      INSERT INTO oauth_tokens (user_id, provider, account_email, account_name, access_token, refresh_token, expiry_date, scope)
      VALUES (?, 'google', ?, ?, ?, ?, ?, ?)
    `).run(user.id, userInfo.email, userInfo.name, tokens.access_token, tokens.refresh_token || null,
      tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null, tokens.scope);
  }

  return user;
}

export function getAccounts(userId) {
  return db.prepare(
    'SELECT id, account_email, account_name FROM oauth_tokens WHERE user_id = ? AND provider = ?'
  ).all(userId, 'google');
}

async function getOAuthForRow(row) {
  const oauth2 = getOAuth2Client();
  oauth2.setCredentials({ access_token: row.access_token, refresh_token: row.refresh_token });
  return oauth2;
}

export async function fetchEmails(userId, maxResults = 50) {
  const rows = db.prepare('SELECT * FROM oauth_tokens WHERE user_id = ? AND provider = ?').all(userId, 'google');
  if (!rows.length) return [];

  const allEmails = [];
    for (const row of rows) {
    try {
      const auth = await getOAuthForRow(row);
      const gmail = google.gmail({ version: 'v1', auth });
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const afterTimestamp = Math.floor(today.getTime() / 1000);

      const res = await gmail.users.messages.list({ userId: 'me', q: `after:${afterTimestamp}`, maxResults });
      if (!res.data.messages) continue;

      const messages = await Promise.all(
        res.data.messages.map(async (msg) => {
          const detail = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'metadata' });
          const headers = detail.data.payload.headers;
          return {
            id: msg.id,
            account: row.account_email,
            subject: headers.find(h => h.name === 'Subject')?.value || '(無主旨)',
            from: headers.find(h => h.name === 'From')?.value || '',
            date: headers.find(h => h.name === 'Date')?.value || '',
            snippet: detail.data.snippet || '',
            isRead: !detail.data.labelIds?.includes('UNREAD'),
            labelIds: detail.data.labelIds || [],
          };
        })
      );
      allEmails.push(...messages);
    } catch (err) {
      console.error(`Google email fetch error for ${row.account_email}:`, err.message);
    }
  }

  return allEmails.sort((a, b) => new Date(b.date) - new Date(a.date));
}

export async function getEmailDetail(userId, messageId) {
  const rows = db.prepare('SELECT * FROM oauth_tokens WHERE user_id = ? AND provider = ?').all(userId, 'google');
  for (const row of rows) {
    try {
      const auth = await getOAuthForRow(row);
      const gmail = google.gmail({ version: 'v1', auth });
      const detail = await gmail.users.messages.get({
        userId: 'me', id: messageId, format: 'full',
      });
      const headers = detail.data.payload.headers;
      let body = '';
      if (detail.data.payload.parts) {
        const part = detail.data.payload.parts.find(p => p.mimeType === 'text/plain')
          || detail.data.payload.parts.find(p => p.mimeType === 'text/html');
        if (part?.body?.data) body = Buffer.from(part.body.data, 'base64').toString('utf-8');
      } else if (detail.data.payload.body?.data) {
        body = Buffer.from(detail.data.payload.body.data, 'base64').toString('utf-8');
      }
      return {
        id: messageId,
        account: row.account_email,
        subject: headers.find(h => h.name === 'Subject')?.value || '',
        from: headers.find(h => h.name === 'From')?.value || '',
        to: headers.find(h => h.name === 'To')?.value || '',
        date: headers.find(h => h.name === 'Date')?.value || '',
        body,
        isRead: !detail.data.labelIds?.includes('UNREAD'),
      };
    } catch {}
  }
  return null;
}

export async function modifyEmail(userId, messageId, action) {
  const rows = db.prepare('SELECT * FROM oauth_tokens WHERE user_id = ? AND provider = ?').all(userId, 'google');
  for (const row of rows) {
    try {
      const auth = await getOAuthForRow(row);
      const gmail = google.gmail({ version: 'v1', auth });
      switch (action) {
        case 'read':
          await gmail.users.messages.modify({ userId: 'me', id: messageId, requestBody: { removeLabelIds: ['UNREAD'] } });
          break;
        case 'unread':
          await gmail.users.messages.modify({ userId: 'me', id: messageId, requestBody: { addLabelIds: ['UNREAD'] } });
          break;
        case 'archive':
          await gmail.users.messages.modify({ userId: 'me', id: messageId, requestBody: { removeLabelIds: ['INBOX'] } });
          break;
        case 'trash':
          await gmail.users.messages.trash({ userId: 'me', id: messageId });
          break;
        case 'delete':
          await gmail.users.messages.delete({ userId: 'me', id: messageId });
          break;
      }
      return true;
    } catch {}
  }
  return false;
}

export async function fetchCalendarEvents(userId, maxResults = 20) {
  const rows = db.prepare('SELECT * FROM oauth_tokens WHERE user_id = ? AND provider = ?').all(userId, 'google');
  if (!rows.length) return [];

  const allEvents = [];
  for (const row of rows) {
    try {
      const oauth2 = getOAuth2Client();
      oauth2.setCredentials({ access_token: row.access_token, refresh_token: row.refresh_token });

      const calendar = google.calendar({ version: 'v3', auth: oauth2 });
      const now = new Date();
      const endOfDay = new Date(now);
      endOfDay.setHours(23, 59, 59, 999);

      const res = await calendar.events.list({
        calendarId: 'primary',
        timeMin: now.toISOString(),
        timeMax: endOfDay.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults,
      });

      const events = (res.data.items || []).map(event => ({
        id: event.id,
        account: row.account_email,
        summary: event.summary || '(無標題)',
        description: event.description || '',
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        location: event.location || '',
      }));
      allEvents.push(...events);
    } catch (err) {
      console.error(`Google calendar fetch error for ${row.account_email}:`, err.message);
    }
  }

  return allEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
}
