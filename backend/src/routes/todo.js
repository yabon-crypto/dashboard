import { Router } from 'express';
import * as todoService from '../services/todo.js';

const router = Router();

function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: '未登入' });
  next();
}

router.get('/', requireAuth, (req, res) => {
  const { date } = req.query;
  const todos = todoService.getTodos(req.session.userId, date || null);
  res.json({ todos });
});

router.get('/range', requireAuth, (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) return res.status(400).json({ error: '需要 start 和 end 參數' });
  const todos = todoService.getTodosByDateRange(req.session.userId, start, end);
  res.json({ todos });
});

router.get('/pending', requireAuth, (req, res) => {
  const todos = todoService.getPendingTodos(req.session.userId);
  res.json({ todos });
});

router.post('/', requireAuth, (req, res) => {
  const { title, description, due_date, priority } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: '標題為必填' });
  const todo = todoService.createTodo(req.session.userId, { title, description, due_date, priority });
  res.status(201).json({ todo });
});

router.put('/:id', requireAuth, (req, res) => {
  const todo = todoService.updateTodo(req.session.userId, parseInt(req.params.id), req.body);
  if (!todo) return res.status(404).json({ error: '待辦事項不存在' });
  res.json({ todo });
});

router.delete('/:id', requireAuth, (req, res) => {
  const ok = todoService.deleteTodo(req.session.userId, parseInt(req.params.id));
  if (!ok) return res.status(404).json({ error: '待辦事項不存在' });
  res.json({ success: true });
});

router.get('/:id/subtasks', requireAuth, (req, res) => {
  const subs = todoService.getSubtasks(req.session.userId, parseInt(req.params.id));
  res.json({ subtasks: subs });
});

router.post('/:id/subtasks', requireAuth, (req, res) => {
  const { title } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: '子任務標題為必填' });
  const sub = todoService.createSubtask(req.session.userId, parseInt(req.params.id), title);
  if (!sub) return res.status(404).json({ error: '待辦事項不存在' });
  res.status(201).json({ subtask: sub });
});

router.put('/subtasks/:subtaskId', requireAuth, (req, res) => {
  const { is_completed } = req.body;
  const sub = todoService.updateSubtask(req.session.userId, parseInt(req.params.subtaskId), is_completed);
  if (!sub) return res.status(404).json({ error: '子任務不存在' });
  res.json({ subtask: sub });
});

router.delete('/subtasks/:subtaskId', requireAuth, (req, res) => {
  const ok = todoService.deleteSubtask(req.session.userId, parseInt(req.params.subtaskId));
  if (!ok) return res.status(404).json({ error: '子任務不存在' });
  res.json({ success: true });
});

router.get('/daily-log', requireAuth, (req, res) => {
  const { date } = req.query;
  const log = todoService.getDailyLog(req.session.userId, date || null);
  res.json({ log });
});

router.get('/weekly-log', requireAuth, (req, res) => {
  const data = todoService.getWeeklyLog(req.session.userId);
  res.json(data);
});

export default router;
