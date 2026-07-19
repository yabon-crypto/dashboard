import { Router } from 'express';
import * as googleService from '../services/google.js';
import * as microsoftService from '../services/microsoft.js';

const router = Router();

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: '未登入' });
  next();
}

router.get('/list', requireAuth, async (req, res) => {
  try {
    const [googleEmails, microsoftEmails] = await Promise.all([
      googleService.fetchEmails(req.session.userId).catch(() => []),
      microsoftService.fetchEmails(req.session.userId).catch(() => []),
    ]);
    const merged = [...googleEmails, ...microsoftEmails];
    merged.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json({ emails: merged });
  } catch (err) {
    console.error('Email fetch error:', err);
    res.status(500).json({ error: '取得郵件失敗' });
  }
});

router.get('/detail/:id', requireAuth, async (req, res) => {
  try {
    let detail = await googleService.getEmailDetail(req.session.userId, req.params.id);
    if (!detail) detail = await microsoftService.getEmailDetail(req.session.userId, req.params.id);
    if (!detail) return res.status(404).json({ error: '找不到郵件' });
    res.json({ email: detail });
  } catch (err) {
    console.error('Email detail error:', err);
    res.status(500).json({ error: '取得郵件內容失敗' });
  }
});

router.post('/:id/action', requireAuth, async (req, res) => {
  const { action } = req.body;
  if (!['read', 'unread', 'archive', 'trash', 'delete'].includes(action)) {
    return res.status(400).json({ error: '不支援的操作' });
  }
  try {
    let ok = await googleService.modifyEmail(req.session.userId, req.params.id, action);
    if (!ok) ok = await microsoftService.modifyEmail(req.session.userId, req.params.id, action);
    res.json({ success: ok });
  } catch (err) {
    console.error('Email modify error:', err);
    res.status(500).json({ error: '操作失敗' });
  }
});

export default router;
