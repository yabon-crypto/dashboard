import React, { useState, useEffect } from 'react';
import { getTodosByRange, updateTodo, createSubtask, updateSubtask, deleteSubtask } from '../services/api';

const HOURS = Array.from({ length: 24 }, (_, i) => i);

function pad(n) { return String(n).padStart(2, '0'); }

function formatDate(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

export default function Schedule() {
  const today = formatDate(new Date());
  const [focusDate, setFocusDate] = useState(today);
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return formatDate(d);
  });
  const [todos, setTodos] = useState([]);
  const [expandedTodo, setExpandedTodo] = useState(null);
  const [newSubtask, setNewSubtask] = useState('');

  const weekEnd = (() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return formatDate(d);
  })();

  useEffect(() => {
    getTodosByRange(weekStart, weekEnd).then(res => setTodos(res.data.todos)).catch(() => {});
  }, [weekStart]);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return formatDate(d);
  });

  const dayTodos = todos.filter(t => t.due_date === focusDate);
  const completedDay = dayTodos.filter(t => t.is_completed);
  const pendingDay = dayTodos.filter(t => !t.is_completed);

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(formatDate(d));
  };
  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(formatDate(d));
  };
  const goToday = () => {
    const d = new Date();
    setFocusDate(formatDate(d));
    const s = new Date();
    s.setDate(s.getDate() - s.getDay());
    setWeekStart(formatDate(s));
  };

  const toggleTodo = async (todo) => {
    await updateTodo(todo.id, { is_completed: !todo.is_completed });
    getTodosByRange(weekStart, weekEnd).then(res => setTodos(res.data.todos));
  };

  const handleAddSubtask = async (todoId) => {
    if (!newSubtask.trim()) return;
    await createSubtask(todoId, newSubtask);
    setNewSubtask('');
    getTodosByRange(weekStart, weekEnd).then(res => setTodos(res.data.todos));
  };

  const toggleSubtask = async (sub) => {
    await updateSubtask(sub.id, !sub.is_completed);
    getTodosByRange(weekStart, weekEnd).then(res => setTodos(res.data.todos));
  };

  const handleDeleteSubtask = async (id) => {
    await deleteSubtask(id);
    getTodosByRange(weekStart, weekEnd).then(res => setTodos(res.data.todos));
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h1 style={{ fontSize: '24px', margin: 0 }}>📅 行程行事曆</h1>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={prevWeek} style={{ background: '#334155', color: '#e2e8f0', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>‹</button>
          <span style={{ color: '#94a3b8', fontSize: '14px' }}>{weekStart} ~ {weekEnd}</span>
          <button onClick={nextWeek} style={{ background: '#334155', color: '#e2e8f0', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>›</button>
          <button onClick={goToday} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>今天</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto' }}>
        {weekDays.map(day => {
          const count = todos.filter(t => t.due_date === day).length;
          const done = todos.filter(t => t.due_date === day && t.is_completed).length;
          const isToday = day === today;
          const isSelected = day === focusDate;
          const d = new Date(day);
          return (
            <div key={day} onClick={() => setFocusDate(day)}
              style={{
                flex: '0 0 auto', padding: '10px 16px', borderRadius: '10px', cursor: 'pointer', textAlign: 'center', minWidth: '70px',
                background: isSelected ? '#2563eb' : isToday ? '#1e3a5f' : '#1e293b',
                border: isToday ? '1px solid #3b82f6' : '1px solid transparent',
              }}>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>{WEEKDAYS[d.getDay()]}</div>
              <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{d.getDate()}</div>
              {count > 0 && <div style={{ fontSize: '11px', color: done === count ? '#34d399' : '#fbbf24' }}>{done}/{count}</div>}
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #334155', fontWeight: 'bold', color: '#fbbf24' }}>
            未完成 ({pendingDay.length})
          </div>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {pendingDay.length === 0 ? (
              <p style={{ color: '#64748b', padding: '16px', textAlign: 'center', margin: 0 }}>全部完成了 🎉</p>
            ) : pendingDay.map(todo => (
              <div key={todo.id} style={{ borderBottom: '1px solid #0f172a' }}>
                <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" checked={false} onChange={() => toggleTodo(todo)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#3b82f6' }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontSize: '14px' }}>{todo.title}</span>
                    {todo.subtask_total > 0 && (
                      <span style={{ marginLeft: '8px', fontSize: '12px', color: todo.progress_pct === 100 ? '#34d399' : '#fbbf24' }}>
                        {todo.subtask_done}/{todo.subtask_total} ({todo.progress_pct}%)
                      </span>
                    )}
                  </div>
                  <button onClick={() => setExpandedTodo(expandedTodo === todo.id ? null : todo.id)}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '12px' }}>
                    {expandedTodo === todo.id ? '收合' : '子任務'}
                  </button>
                </div>
                {expandedTodo === todo.id && (
                  <div style={{ padding: '0 16px 10px 40px' }}>
                    {todo.subtasks?.map(sub => (
                      <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0' }}>
                        <input type="checkbox" checked={!!sub.is_completed} onChange={() => toggleSubtask(sub)}
                          style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: '#3b82f6' }} />
                        <span style={{ fontSize: '13px', textDecoration: sub.is_completed ? 'line-through' : 'none', color: sub.is_completed ? '#64748b' : '#e2e8f0' }}>
                          {sub.title}
                        </span>
                        <button onClick={() => handleDeleteSubtask(sub.id)} style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                      <input type="text" value={newSubtask} onChange={e => setNewSubtask(e.target.value)} placeholder="新增子任務..."
                        style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '13px' }} />
                      <button onClick={() => handleAddSubtask(todo.id)} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>新增</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #334155', fontWeight: 'bold', color: '#34d399' }}>
            已完成 ({completedDay.length})
          </div>
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {completedDay.length === 0 ? (
              <p style={{ color: '#64748b', padding: '16px', textAlign: 'center', margin: 0 }}>尚無已完成事項</p>
            ) : completedDay.map(todo => (
              <div key={todo.id} style={{ padding: '10px 16px', borderBottom: '1px solid #0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={true} onChange={() => toggleTodo(todo)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#34d399' }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '14px', textDecoration: 'line-through', color: '#64748b' }}>{todo.title}</span>
                  {todo.subtask_total > 0 && (
                    <span style={{ marginLeft: '8px', fontSize: '12px', color: '#34d399' }}>({todo.subtask_done}/{todo.subtask_total})</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ background: '#1e293b', borderRadius: '12px', padding: '16px', marginTop: '16px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '15px', color: '#38bdf8' }}>⏰ {focusDate} 時間軸（24小時）</h3>
        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          {HOURS.map(hour => {
            const label = `${pad(hour)}:00`;
            const todoAtHour = dayTodos.filter(t => t.title && !t.is_completed);
            return (
              <div key={hour} style={{ display: 'flex', borderBottom: '1px solid #0f172a', minHeight: '40px' }}>
                <div style={{ width: '60px', padding: '4px 8px', color: '#64748b', fontSize: '12px', flexShrink: 0, textAlign: 'right', borderRight: '1px solid #334155' }}>
                  {label}
                </div>
                <div style={{ flex: 1, padding: '4px 12px', fontSize: '13px', color: '#94a3b8' }}>
                  {hour === 8 && todoAtHour.slice(0, 1).map(t => (
                    <div key={t.id} style={{ color: '#fbbf24' }}>📌 {t.title}{t.subtask_total > 0 ? ` (${t.progress_pct}%)` : ''}</div>
                  ))}
                  {hour === 12 && <span>🍽️ 午休</span>}
                  {hour === 18 && <span>🌆 傍晚</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
