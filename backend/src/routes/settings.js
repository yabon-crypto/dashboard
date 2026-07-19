import { Router } from 'express';
import db from '../config/database.js';

const router = Router();

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: '未登入' });
  next();
}

router.put('/notify-time', requireAuth, (req, res) => {
  const { notify_time, notify_email } = req.body;
  if (!notify_time) return res.status(400).json({ error: '通知時間為必填' });

  db.prepare('UPDATE users SET notify_time = ?, notify_email = COALESCE(?, notify_email) WHERE id = ?')
    .run(notify_time, notify_email || null, req.session.userId);

  const user = db.prepare('SELECT id, name, email, notify_time, notify_email FROM users WHERE id = ?').get(req.session.userId);
  res.json({ user });
});

router.delete('/disconnect/:provider', requireAuth, (req, res) => {
  const { provider } = req.params;
  if (!['google', 'microsoft'].includes(provider)) return res.status(400).json({ error: '不支援的服務' });

  const accountEmail = req.query.email;
  if (accountEmail) {
    db.prepare('DELETE FROM oauth_tokens WHERE user_id = ? AND provider = ? AND account_email = ?')
      .run(req.session.userId, provider, accountEmail);
  } else {
    db.prepare('DELETE FROM oauth_tokens WHERE user_id = ? AND provider = ?')
      .run(req.session.userId, provider);
  }
  res.json({ success: true });
});

export default router;
