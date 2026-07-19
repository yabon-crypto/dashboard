import db from '../config/database.js';

function attachSubtasks(todos) {
  if (!todos.length) return todos;
  const ids = todos.map(t => t.id);
  const placeholders = ids.map(() => '?').join(',');
  const subtasks = db.prepare(
    `SELECT * FROM subtasks WHERE todo_id IN (${placeholders}) ORDER BY created_at ASC`
  ).all(...ids);
  const map = {};
  for (const s of subtasks) {
    if (!map[s.todo_id]) map[s.todo_id] = [];
    map[s.todo_id].push(s);
  }
  return todos.map(t => ({
    ...t,
    subtasks: map[t.id] || [],
    subtask_total: (map[t.id] || []).length,
    subtask_done: (map[t.id] || []).filter(s => s.is_completed).length,
    pct: t.progress_pct != null ? t.progress_pct : (t.is_completed ? 100 : 0),
  }));
}

export function getTodos(userId, date = null) {
  let query = 'SELECT * FROM todos WHERE user_id = ?';
  const params = [userId];
  if (date) {
    query += ' AND date(due_date) = date(?)';
    params.push(date);
  }
  query += ' ORDER BY priority DESC, created_at DESC';
  return attachSubtasks(db.prepare(query).all(...params));
}

export function getTodosByDateRange(userId, startDate, endDate) {
  const todos = db.prepare(
    'SELECT * FROM todos WHERE user_id = ? AND due_date IS NOT NULL AND date(due_date) >= date(?) AND date(due_date) <= date(?) ORDER BY due_date ASC, priority DESC'
  ).all(userId, startDate, endDate);
  return attachSubtasks(todos);
}

export function getPendingTodos(userId) {
  return attachSubtasks(db.prepare(
    'SELECT * FROM todos WHERE user_id = ? AND is_completed = 0 ORDER BY priority DESC, due_date ASC'
  ).all(userId));
}

export function createTodo(userId, { title, description, due_date, start_time, end_time, priority = 0, progress_pct = 0, notes = '' }) {
  const result = db.prepare(
    'INSERT INTO todos (user_id, title, description, due_date, start_time, end_time, priority, progress_pct, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(userId, title, description, due_date || null, start_time || null, end_time || null, priority, progress_pct, notes);

  const today = new Date().toISOString().split('T')[0];
  db.prepare(`
    INSERT INTO todo_daily_log (user_id, date, added_count) VALUES (?, ?, 1)
    ON CONFLICT(user_id, date) DO UPDATE SET added_count = added_count + 1
  `).run(userId, today);

  return attachSubtasks([db.prepare('SELECT * FROM todos WHERE id = ?').get(result.lastInsertRowid)])[0];
}

export function updateTodo(userId, todoId, updates) {
  const todo = db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?').get(todoId, userId);
  if (!todo) return null;

  const fields = [];
  const values = [];
  if (updates.title !== undefined) { fields.push('title = ?'); values.push(updates.title); }
  if (updates.description !== undefined) { fields.push('description = ?'); values.push(updates.description); }
  if (updates.due_date !== undefined) { fields.push('due_date = ?'); values.push(updates.due_date); }
  if (updates.start_time !== undefined) { fields.push('start_time = ?'); values.push(updates.start_time); }
  if (updates.end_time !== undefined) { fields.push('end_time = ?'); values.push(updates.end_time); }
  if (updates.priority !== undefined) { fields.push('priority = ?'); values.push(updates.priority); }
  if (updates.progress_pct !== undefined) { fields.push('progress_pct = ?'); values.push(updates.progress_pct); }
  if (updates.notes !== undefined) { fields.push('notes = ?'); values.push(updates.notes); }

  if (updates.is_completed !== undefined) {
    fields.push('is_completed = ?'); values.push(updates.is_completed ? 1 : 0);
    fields.push('completed_at = ?'); values.push(updates.is_completed ? new Date().toISOString() : null);
    if (updates.is_completed) fields.push('progress_pct = ?'); values.push(100);
    if (updates.is_completed && !todo.is_completed) {
      const today = new Date().toISOString().split('T')[0];
      db.prepare(`
        INSERT INTO todo_daily_log (user_id, date, completed_count) VALUES (?, ?, 1)
        ON CONFLICT(user_id, date) DO UPDATE SET completed_count = completed_count + 1
      `).run(userId, today);
    }
  }

  if (fields.length === 0) return attachSubtasks([todo])[0];
  fields.push('id = ?'); values.push(todoId);
  db.prepare(`UPDATE todos SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`).run(...values, todoId, userId);
  return attachSubtasks([db.prepare('SELECT * FROM todos WHERE id = ?').get(todoId)])[0];
}

export function deleteTodo(userId, todoId) {
  db.prepare('DELETE FROM subtasks WHERE todo_id = ? AND user_id = ?').run(todoId, userId);
  const result = db.prepare('DELETE FROM todos WHERE id = ? AND user_id = ?').run(todoId, userId);
  return result.changes > 0;
}

export function getSubtasks(userId, todoId) {
  return db.prepare('SELECT * FROM subtasks WHERE todo_id = ? AND user_id = ? ORDER BY created_at ASC').all(todoId, userId);
}

export function createSubtask(userId, todoId, title) {
  const todo = db.prepare('SELECT * FROM todos WHERE id = ? AND user_id = ?').get(todoId, userId);
  if (!todo) return null;
  const result = db.prepare('INSERT INTO subtasks (todo_id, user_id, title) VALUES (?, ?, ?)').run(todoId, userId, title);
  return db.prepare('SELECT * FROM subtasks WHERE id = ?').get(result.lastInsertRowid);
}

export function updateSubtask(userId, subtaskId, is_completed) {
  const sub = db.prepare('SELECT * FROM subtasks WHERE id = ? AND user_id = ?').get(subtaskId, userId);
  if (!sub) return null;
  db.prepare('UPDATE subtasks SET is_completed = ?, completed_at = ? WHERE id = ?')
    .run(is_completed ? 1 : 0, is_completed ? new Date().toISOString() : null, subtaskId);
  return db.prepare('SELECT * FROM subtasks WHERE id = ?').get(subtaskId);
}

export function deleteSubtask(userId, subtaskId) {
  const result = db.prepare('DELETE FROM subtasks WHERE id = ? AND user_id = ?').run(subtaskId, userId);
  return result.changes > 0;
}

export function getDailyLog(userId, date = null) {
  const targetDate = date || new Date().toISOString().split('T')[0];
  let log = db.prepare('SELECT * FROM todo_daily_log WHERE user_id = ? AND date = ?').get(userId, targetDate);
  const pending = db.prepare('SELECT COUNT(*) as count FROM todos WHERE user_id = ? AND is_completed = 0').get(userId);
  if (!log) return { date: targetDate, added_count: 0, completed_count: 0, total_pending: pending.count };
  return { ...log, total_pending: pending.count };
}

export function getWeeklyLog(userId) {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);
  const start = weekAgo.toISOString().split('T')[0];
  const end = today.toISOString().split('T')[0];
  const logs = db.prepare('SELECT * FROM todo_daily_log WHERE user_id = ? AND date >= ? AND date <= ? ORDER BY date ASC').all(userId, start, end);
  const pending = db.prepare('SELECT COUNT(*) as count FROM todos WHERE user_id = ? AND is_completed = 0').get(userId);
  const dates = [];
  for (let d = new Date(weekAgo); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const log = logs.find(l => l.date === dateStr);
    dates.push({ date: dateStr, added_count: log?.added_count || 0, completed_count: log?.completed_count || 0 });
  }
  return { daily: dates, total_pending: pending.count };
}
