import { Router } from 'express';
import * as googleService from '../services/google.js';
import * as microsoftService from '../services/microsoft.js';

const router = Router();

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: '未登入' });
  next();
}

router.get('/events', requireAuth, async (req, res) => {
  try {
    const [googleEvents, microsoftEvents] = await Promise.all([
      googleService.fetchCalendarEvents(req.session.userId).catch(() => []),
      microsoftService.fetchCalendarEvents(req.session.userId).catch(() => []),
    ]);
    res.json({ events: [...googleEvents, ...microsoftEvents] });
  } catch (err) {
    console.error('Calendar fetch error:', err);
    res.status(500).json({ error: '取得行事曆失敗' });
  }
});

export default router;
