import nodemailer from 'nodemailer';
import db from '../config/database.js';
import config from '../config/env.js';
import { getPendingTodos, getDailyLog } from './todo.js';
import * as googleService from './google.js';
import * as microsoftService from './microsoft.js';

function createTransporter() {
  if (!config.SMTP_USER || !config.SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: config.SMTP_PORT === 465,
    auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
  });
}

function buildSummaryHtml(user, events, emails, todos, log) {
  const eventHtml = events.length > 0
    ? events.map(e => `<li><strong>${e.summary}</strong> - ${new Date(e.start).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}</li>`).join('')
    : '<li>今日無行程</li>';

  const emailHtml = emails.length > 0
    ? emails.slice(0, 5).map(e => `<li><strong>${e.subject}</strong> - ${e.from}</li>`).join('')
    : '<li>今日無新郵件</li>';

  const todoHtml = todos.length > 0
    ? todos.map(t => `<li>${t.is_completed ? '✅' : '⬜'} ${t.title}${t.due_date ? ` (到期: ${t.due_date})` : ''}</li>`).join('')
    : '<li>沒有待辦事項</li>';

  return `
    <h2>📋 ${user.name} 的每日摘要</h2>
    <h3>📅 今日行事曆</h3>
    <ul>${eventHtml}</ul>
    <h3>📧 今日郵件</h3>
    <ul>${emailHtml}</ul>
    <h3>✅ 待辦事項 (剩餘 ${todos.filter(t => !t.is_completed).length} 項)</h3>
    <ul>${todoHtml}</ul>
    <h3>📊 今日進度</h3>
    <p>新增: ${log.added_count} 項 | 完成: ${log.completed_count} 項 | 待處理: ${log.total_pending} 項</p>
    <hr>
    <p><small>前往 <a href="${config.FRONTEND_URL}">儀表板</a> 查看完整資訊</small></p>
  `;
}

export async function sendDailySummary(userId) {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) return;

  const googleCount = db.prepare('SELECT COUNT(*) as c FROM oauth_tokens WHERE user_id = ? AND provider = ?').get(userId, 'google').c;
  const msCount = db.prepare('SELECT COUNT(*) as c FROM oauth_tokens WHERE user_id = ? AND provider = ?').get(userId, 'microsoft').c;

  let events = [];
  let emails = [];

  if (googleCount > 0) {
    try {
      const [gEvents, gEmails] = await Promise.all([
        googleService.fetchCalendarEvents(userId),
        googleService.fetchEmails(userId),
      ]);
      events = [...events, ...gEvents];
      emails = [...emails, ...gEmails];
    } catch (err) {
      console.error('Google fetch error:', err.message);
    }
  }

  if (msCount > 0) {
    try {
      const [mEvents, mEmails] = await Promise.all([
        microsoftService.fetchCalendarEvents(userId),
        microsoftService.fetchEmails(userId),
      ]);
      events = [...events, ...mEvents];
      emails = [...emails, ...mEmails];
    } catch (err) {
      console.error('Microsoft fetch error:', err.message);
    }
  }

  const todos = getPendingTodos(userId);
  const log = getDailyLog(userId);

  const transporter = createTransporter();
  if (transporter && user.notify_email) {
    try {
      await transporter.sendMail({
        from: config.SMTP_USER,
        to: user.notify_email,
        subject: `📋 每日摘要 - ${new Date().toLocaleDateString('zh-TW')}`,
        html: buildSummaryHtml(user, events, emails, todos, log),
      });
      console.log(`Summary sent to ${user.notify_email}`);
    } catch (err) {
      console.error('Email send error:', err.message);
    }
  }
}

export async function sendDailySummaries() {
  const users = db.prepare('SELECT * FROM users').all();
  for (const user of users) {
    try {
      await sendDailySummary(user.id);
    } catch (err) {
      console.error(`Error sending summary for user ${user.id}:`, err.message);
    }
  }
}
