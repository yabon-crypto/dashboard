import express from 'express';
import cors from 'cors';
import session from 'express-session';
import cron from 'node-cron';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './config/env.js';
import authRoutes from './routes/auth.js';
import calendarRoutes from './routes/calendar.js';
import emailRoutes from './routes/email.js';
import todoRoutes from './routes/todo.js';
import settingsRoutes from './routes/settings.js';
import db from './config/database.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.set('trust proxy', 1);
app.use(cors({ origin: config.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(session({
  secret: config.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: { secure: config.FRONTEND_URL.startsWith('https'), maxAge: 24 * 60 * 60 * 1000 },
}));

app.use('/api/auth', authRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/email', emailRoutes);
app.use('/api/todos', todoRoutes);
app.use('/api/settings', settingsRoutes);

const frontendDist = path.join(__dirname, '..', '..', 'frontend', 'dist');
app.use(express.static(frontendDist));

app.get('/api/summary', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: '未登入' });
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
    const { getPendingTodos, getDailyLog } = await import('./services/todo.js');
    let events = [];
    let emails = [];

    const googleCount = db.prepare('SELECT COUNT(*) as c FROM oauth_tokens WHERE user_id = ? AND provider = ?').get(req.session.userId, 'google').c;
    const msCount = db.prepare('SELECT COUNT(*) as c FROM oauth_tokens WHERE user_id = ? AND provider = ?').get(req.session.userId, 'microsoft').c;

    if (googleCount > 0) {
      const googleService = await import('./services/google.js');
      try {
        const [gEvents, gEmails] = await Promise.all([
          googleService.fetchCalendarEvents(req.session.userId).catch(() => []),
          googleService.fetchEmails(req.session.userId).catch(() => []),
        ]);
        events = [...events, ...gEvents];
        emails = [...emails, ...gEmails];
      } catch {}
    }

    if (msCount > 0) {
      const microsoftService = await import('./services/microsoft.js');
      try {
        const [mEvents, mEmails] = await Promise.all([
          microsoftService.fetchCalendarEvents(req.session.userId).catch(() => []),
          microsoftService.fetchEmails(req.session.userId).catch(() => []),
        ]);
        events = [...events, ...mEvents];
        emails = [...emails, ...mEmails];
      } catch {}
    }

    const todos = getPendingTodos(req.session.userId);
    const log = getDailyLog(req.session.userId);
    res.json({ user, events, emails, todos, log });
  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ error: '取得摘要失敗' });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDist, 'index.html'));
});

const sentToday = {};
cron.schedule('* * * * *', async () => {
  const users = db.prepare('SELECT * FROM users').all();
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  for (const user of users) {
    const [hour, minute] = (user.notify_time || '07:00').split(':').map(Number);
    const key = `${user.id}_${todayStr}`;
    if (now.getHours() === hour && now.getMinutes() === minute && !sentToday[key]) {
      sentToday[key] = true;
      try {
        const { sendDailySummary } = await import('./services/notification.js');
        await sendDailySummary(user.id);
        console.log(`[Cron] Summary sent to user ${user.id}`);
      } catch (err) {
        console.error(`[Cron] Failed:`, err.message);
      }
    }
  }
});

app.listen(config.PORT, () => {
  console.log(`Server running on http://localhost:${config.PORT}`);
  console.log(`Serving frontend from ${frontendDist}`);
});
