import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
});

export function getAuthStatus() {
  return api.get('/auth/status');
}

export function getSummary() {
  return api.get('/summary');
}

export function getTodos(params = {}) {
  return api.get('/todos', { params });
}

export function getTodosByRange(start, end) {
  return api.get('/todos/range', { params: { start, end } });
}

export function getPendingTodos() {
  return api.get('/todos/pending');
}

export function createTodo(data) {
  return api.post('/todos', data);
}

export function updateTodo(id, data) {
  return api.put(`/todos/${id}`, data);
}

export function deleteTodo(id) {
  return api.delete(`/todos/${id}`);
}

export function getSubtasks(todoId) {
  return api.get(`/todos/${todoId}/subtasks`);
}

export function createSubtask(todoId, title) {
  return api.post(`/todos/${todoId}/subtasks`, { title });
}

export function updateSubtask(subtaskId, isCompleted) {
  return api.put(`/todos/subtasks/${subtaskId}`, { is_completed: isCompleted });
}

export function deleteSubtask(subtaskId) {
  return api.delete(`/todos/subtasks/${subtaskId}`);
}

export function getDailyLog(params = {}) {
  return api.get('/todos/daily-log', { params });
}

export function getWeeklyLog() {
  return api.get('/todos/weekly-log');
}

export function getCalendarEvents() {
  return api.get('/calendar/events');
}

export function getEmails() {
  return api.get('/email/list');
}

export function getEmailDetail(id) {
  return api.get(`/email/detail/${id}`);
}

export function emailAction(id, action) {
  return api.post(`/email/${id}/action`, { action });
}

export function updateSettings(data) {
  return api.put('/settings/notify-time', data);
}

export function disconnectProvider(provider, email) {
  const params = email ? { email } : {};
  return api.delete(`/settings/disconnect/${provider}`, { params });
}

export function logout() {
  return api.post('/auth/logout');
}
