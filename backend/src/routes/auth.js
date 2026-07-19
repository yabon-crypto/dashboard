import { Router } from 'express';
import * as googleService from '../services/google.js';
import * as microsoftService from '../services/microsoft.js';
import db from '../config/database.js';

const router = Router();

router.get('/google', (req, res) => {
  const state = req.query.link === '1' && req.session.userId ? `link:${req.session.userId}` : '';
  res.redirect(googleService.getAuthUrl(state));
});

router.get('/google/callback', async (req, res) => {
  try {
    let linkUserId = null;
    if (req.query.state && req.query.state.startsWith('link:')) {
      linkUserId = parseInt(req.query.state.split(':')[1]);
    }

    const user = await googleService.handleCallback(req.query.code, linkUserId);
    req.session.userId = user.id;
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173');
  } catch (err) {
    console.error('Google callback error:', err);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?error=google_auth_failed`);
  }
});

router.get('/microsoft', (req, res) => {
  const state = req.query.link === '1' && req.session.userId ? `link:${req.session.userId}` : '';
  const baseUrl = microsoftService.getAuthUrl();
  const separator = baseUrl.includes('?') ? '&' : '?';
  res.redirect(state ? `${baseUrl}${separator}state=${state}` : baseUrl);
});

router.get('/microsoft/callback', async (req, res) => {
  try {
    let linkUserId = null;
    if (req.query.state && req.query.state.startsWith('link:')) {
      linkUserId = parseInt(req.query.state.split(':')[1]);
    }
    const user = await microsoftService.handleCallback(req.query.code, linkUserId);
    req.session.userId = user.id;
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173');
  } catch (err) {
    console.error('Microsoft callback error:', err);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/settings?error=microsoft_auth_failed`);
  }
});

router.get('/status', (req, res) => {
  if (!req.session.userId) return res.json({ authenticated: false });
  const user = db.prepare('SELECT id, name, email, notify_time, notify_email FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.json({ authenticated: false });

  const googleAccounts = db.prepare(
    'SELECT id, account_email, account_name FROM oauth_tokens WHERE user_id = ? AND provider = ?'
  ).all(user.id, 'google');
  const microsoftAccounts = db.prepare(
    'SELECT id, account_email, account_name FROM oauth_tokens WHERE user_id = ? AND provider = ?'
  ).all(user.id, 'microsoft');

  res.json({
    authenticated: true,
    user,
    connections: {
      google: googleAccounts.length > 0,
      microsoft: microsoftAccounts.length > 0,
    },
    accounts: {
      google: googleAccounts.map(a => ({ email: a.account_email, name: a.account_name })),
      microsoft: microsoftAccounts.map(a => ({ email: a.account_email, name: a.account_name })),
    },
  });
});

router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

export default router;
