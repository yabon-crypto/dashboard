import React, { useState, useEffect } from 'react';
import { getTodos, createTodo, updateTodo, deleteTodo, createSubtask, updateSubtask, deleteSubtask, getWeeklyLog } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

export default function Todos() {
  const [todos, setTodos] = useState([]);
  const [weeklyLog, setWeeklyLog] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [priority, setPriority] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [expandedTodo, setExpandedTodo] = useState(null);
  const [newSubtasks, setNewSubtasks] = useState({});
  const [editNotes, setEditNotes] = useState({});
  const [editPct, setEditPct] = useState({});

  const loadTodos = () => {
    getTodos().then(res => setTodos(res.data.todos)).catch(() => {});
    getWeeklyLog().then(res => setWeeklyLog(res.data)).catch(() => {});
  };

  useEffect(() => { loadTodos(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    await createTodo({
      title, description,
      due_date: dueDate || null,
      start_time: startTime ? `${dueDate}T${startTime}` : null,
      end_time: endTime ? `${dueDate}T${endTime}` : null,
      priority,
    });
    setTitle(''); setDescription(''); setDueDate(''); setStartTime(''); setEndTime(''); setPriority(0);
    setShowForm(false);
    loadTodos();
  };

  const handleToggle = async (todo) => {
    await updateTodo(todo.id, { is_completed: !todo.is_completed });
    loadTodos();
  };

  const handleDelete = async (id) => {
    await deleteTodo(id);
    loadTodos();
  };

  const handlePctChange = async (todoId, val) => {
    const pct = Math.min(100, Math.max(0, parseInt(val) || 0));
    await updateTodo(todoId, { progress_pct: pct });
    loadTodos();
  };

  const handleNotesSave = async (todoId) => {
    await updateTodo(todoId, { notes: editNotes[todoId] || '' });
    loadTodos();
  };

  const handleAddSubtask = async (todoId) => {
    const text = newSubtasks[todoId];
    if (!text?.trim()) return;
    await createSubtask(todoId, text);
    setNewSubtasks(prev => ({ ...prev, [todoId]: '' }));
    loadTodos();
  };

  const handleToggleSubtask = async (sub) => {
    await updateSubtask(sub.id, !sub.is_completed);
    loadTodos();
  };

  const handleDeleteSubtask = async (id) => {
    await deleteSubtask(id);
    loadTodos();
  };

  const pendingTodos = todos.filter(t => !t.is_completed);
  const completedTodos = todos.filter(t => t.is_completed);
  const avgPct = todos.length > 0 ? Math.round(todos.reduce((s, t) => s + (t.pct || 0), 0) / todos.length) : 0;

  const bar = (pct) => (
    <div style={{ width: '80px', height: '6px', background: '#0f172a', borderRadius: '3px', display: 'inline-block', verticalAlign: 'middle', marginLeft: '6px' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? '#34d399' : '#fbbf24', borderRadius: '3px', transition: 'width 0.3s' }} />
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', margin: '0 0 4px 0' }}>✅ 待辦事項</h1>
          {todos.length > 0 && (
            <div style={{ fontSize: '13px', color: '#94a3b8' }}>
              平均完成度: {avgPct}%{bar(avgPct)}
            </div>
          )}
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          {showForm ? '取消' : '新增待辦'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
          <div style={{ marginBottom: '12px' }}>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="待辦事項標題 *" required
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="描述（選填）"
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', boxSizing: 'border-box', minHeight: '60px' }} />
          </div>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              style={{ flex: '1 1 180px', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0' }} />
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} placeholder="開始時間"
              style={{ flex: '1 1 140px', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0' }} />
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} placeholder="結束時間"
              style={{ flex: '1 1 140px', padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0' }} />
            <select value={priority} onChange={e => setPriority(Number(e.target.value))}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0' }}>
              <option value={0}>一般</option>
              <option value={1}>重要</option>
              <option value={2}>緊急</option>
            </select>
          </div>
          <button type="submit" style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
            新增
          </button>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #334155', fontWeight: 'bold', color: '#fbbf24' }}>
            ⏳ 待處理 ({pendingTodos.length})
          </div>
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {pendingTodos.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '24px', margin: 0 }}>全部完成了 🎉</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px', borderBottom: '1px solid #0f172a', width: '28px' }}></th>
                    <th style={{ padding: '8px 12px', borderBottom: '1px solid #0f172a' }}>標題</th>
                    <th style={{ padding: '8px 12px', borderBottom: '1px solid #0f172a', width: '90px' }}>完成度</th>
                    <th style={{ padding: '8px 12px', borderBottom: '1px solid #0f172a', width: '80px' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingTodos.map(todo => (
                    <React.Fragment key={todo.id}>
                      <tr style={{ borderBottom: '1px solid #0f172a' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <input type="checkbox" checked={false} onChange={() => handleToggle(todo)}
                            style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#3b82f6' }} />
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '14px' }}>
                          {todo.priority === 2 && <span style={{ color: '#ef4444', marginRight: '4px' }}>🔴</span>}
                          {todo.priority === 1 && <span style={{ color: '#f59e0b', marginRight: '4px' }}>🟡</span>}
                          {todo.title}
                          {todo.start_time && (
                            <span style={{ color: '#94a3b8', fontSize: '12px', marginLeft: '8px' }}>
                              {new Date(todo.start_time).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                              {todo.end_time ? ` ~ ${new Date(todo.end_time).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}` : ''}
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <input type="number" min="0" max="100" value={editPct[todo.id] ?? todo.pct ?? 0}
                              onChange={e => setEditPct(prev => ({ ...prev, [todo.id]: e.target.value }))}
                              onBlur={e => handlePctChange(todo.id, e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handlePctChange(todo.id, e.target.value)}
                              style={{ width: '40px', padding: '2px 4px', borderRadius: '4px', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', fontSize: '12px', textAlign: 'center' }} />
                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>%</span>
                            {bar(todo.pct || 0)}
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <button onClick={() => {
                            const id = todo.id;
                            setExpandedTodo(expandedTodo === id ? null : id);
                            setEditNotes(prev => ({ ...prev, [id]: todo.notes || '' }));
                            setEditPct(prev => ({ ...prev, [id]: todo.pct ?? 0 }));
                          }} style={{ background: '#334155', color: '#e2e8f0', border: 'none', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', marginRight: '4px' }}>
                            {expandedTodo === todo.id ? '▲' : '詳'}
                          </button>
                          <button onClick={() => handleDelete(todo.id)}
                            style={{ background: 'transparent', border: '1px solid #f87171', color: '#f87171', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                            刪
                          </button>
                        </td>
                      </tr>
                      {expandedTodo === todo.id && (
                        <tr>
                          <td colSpan={4} style={{ padding: '0 16px 12px 16px', background: '#0f172a' }}>
                            <div style={{ marginBottom: '8px' }}>
                              <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>備註 / 尚未完成的部分：</div>
                              <textarea value={editNotes[todo.id] || ''} onChange={e => setEditNotes(prev => ({ ...prev, [todo.id]: e.target.value }))}
                                placeholder="寫下還有哪些部分尚未完成..."
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: '13px', minHeight: '50px', boxSizing: 'border-box' }} />
                              <button onClick={() => handleNotesSave(todo.id)} style={{ marginTop: '4px', background: '#2563eb', color: 'white', border: 'none', padding: '4px 14px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                                儲存備註
                              </button>
                            </div>
                            <div style={{ borderTop: '1px solid #334155', paddingTop: '8px' }}>
                              <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>子任務：</div>
                              {todo.subtasks?.map(sub => (
                                <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 0' }}>
                                  <input type="checkbox" checked={!!sub.is_completed} onChange={() => handleToggleSubtask(sub)}
                                    style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: '#3b82f6' }} />
                                  <span style={{ fontSize: '13px', textDecoration: sub.is_completed ? 'line-through' : 'none', color: sub.is_completed ? '#64748b' : '#e2e8f0', flex: 1 }}>
                                    {sub.title}
                                  </span>
                                  <button onClick={() => handleDeleteSubtask(sub.id)} style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '12px' }}>✕</button>
                                </div>
                              ))}
                              <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                                <input type="text" value={newSubtasks[todo.id] || ''} onChange={e => setNewSubtasks(prev => ({ ...prev, [todo.id]: e.target.value }))}
                                  placeholder="新增子任務..." onKeyDown={e => e.key === 'Enter' && handleAddSubtask(todo.id)}
                                  style={{ flex: 1, padding: '6px 10px', borderRadius: '6px', border: '1px solid #334155', background: '#1e293b', color: '#e2e8f0', fontSize: '13px' }} />
                                <button onClick={() => handleAddSubtask(todo.id)} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>+</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div style={{ background: '#1e293b', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #334155', fontWeight: 'bold', color: '#34d399' }}>
            ✅ 已完成 ({completedTodos.length})
          </div>
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {completedTodos.length === 0 ? (
              <p style={{ color: '#64748b', textAlign: 'center', padding: '24px', margin: 0 }}>尚無已完成事項</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ color: '#94a3b8', fontSize: '12px', textAlign: 'left' }}>
                    <th style={{ padding: '8px 12px', borderBottom: '1px solid #0f172a', width: '28px' }}></th>
                    <th style={{ padding: '8px 12px', borderBottom: '1px solid #0f172a' }}>標題</th>
                    <th style={{ padding: '8px 12px', borderBottom: '1px solid #0f172a', width: '60px' }}>完成度</th>
                    <th style={{ padding: '8px 12px', borderBottom: '1px solid #0f172a', width: '80px' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {completedTodos.map(todo => (
                    <tr key={todo.id} style={{ borderBottom: '1px solid #0f172a' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <input type="checkbox" checked={true} onChange={() => handleToggle(todo)}
                          style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#34d399' }} />
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '14px', textDecoration: 'line-through', color: '#64748b' }}>
                        {todo.title}
                        {todo.notes && <div style={{ fontSize: '12px', color: '#64748b', textDecoration: 'none', marginTop: '2px' }}>📝 {todo.notes}</div>}
                      </td>
                      <td style={{ padding: '10px 12px', fontSize: '12px', color: '#34d399' }}>100%</td>
                      <td style={{ padding: '10px 12px' }}>
                        <button onClick={() => handleToggle(todo)} style={{ background: 'transparent', border: '1px solid #94a3b8', color: '#94a3b8', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>
                          復原
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {weeklyLog && (
        <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ marginBottom: '16px', color: '#a78bfa' }}>📊 本週待辦完成趨勢</h3>
          <div style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '12px' }}>
            待處理總數: <strong style={{ color: '#f87171' }}>{weeklyLog.total_pending}</strong>
          </div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={weeklyLog.daily}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="date" tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={val => val.slice(5)} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#e2e8f0' }} />
              <Bar dataKey="added_count" name="新增" fill="#60a5fa" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed_count" name="完成" fill="#34d399" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
