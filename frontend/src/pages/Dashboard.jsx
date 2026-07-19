import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSummary } from '../services/api';

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
}

export default function Dashboard({ auth }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (auth?.authenticated) {
      getSummary().then(res => setData(res.data)).catch(() => setError('無法載入資料'));
    }
  }, [auth]);

  if (!auth?.authenticated) {
    return (
      <div style={{ textAlign: 'center', marginTop: '80px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '16px' }}>每日儀表板</h1>
        <p style={{ color: '#94a3b8', marginBottom: '24px' }}>整合你的 Email、行事曆與待辦事項</p>
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <a href="/api/auth/google" style={{ background: '#ea4335', color: 'white', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}>
            使用 Google 登入
          </a>
          <a href="/api/auth/microsoft" style={{ background: '#00a4ef', color: 'white', padding: '12px 24px', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold' }}>
            使用 Microsoft 登入
          </a>
        </div>
      </div>
    );
  }

  if (error) {
    return <p style={{ color: '#f87171', textAlign: 'center' }}>{error}</p>;
  }

  if (!data) {
    return <p style={{ color: '#94a3b8', textAlign: 'center' }}>載入中...</p>;
  }

  const completed = data.todos.filter(t => t.is_completed).length;
  const pending = data.todos.filter(t => !t.is_completed).length;
  const total = data.todos.length;

  return (
    <div>
      <h1 style={{ fontSize: '24px', marginBottom: '8px' }}>👋 {data.user.name} 的每日摘要</h1>
      <p style={{ color: '#94a3b8', marginBottom: '24px' }}>
        {new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ marginBottom: '12px', color: '#38bdf8' }}>📅 今日行事曆</h3>
          {data.events.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {data.events.map((e, i) => (
                <li key={i} style={{ padding: '8px 0', borderBottom: '1px solid #334155' }}>
                  <strong>{e.summary}</strong>
                  <span style={{ color: '#94a3b8', marginLeft: '8px' }}>{formatTime(e.start)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#64748b' }}>今日無行程</p>
          )}
        </div>

        <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ marginBottom: '12px', color: '#34d399' }}>📧 今日郵件</h3>
          {data.emails.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {data.emails.slice(0, 5).map((e, i) => (
                <li key={i} style={{ padding: '8px 0', borderBottom: '1px solid #334155', fontSize: '14px' }}>
                  <div style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.subject}</div>
                  <div style={{ color: '#94a3b8', fontSize: '12px' }}>{e.from}</div>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: '#64748b' }}>今日無新郵件</p>
          )}
          <Link to="/email" style={{ color: '#38bdf8', textDecoration: 'none', fontSize: '14px' }}>查看完整郵件 →</Link>
        </div>

        <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px' }}>
          <h3 style={{ marginBottom: '12px', color: '#fbbf24' }}>✅ 待辦事項</h3>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ textAlign: 'center', flex: 1, background: '#0f172a', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#fbbf24' }}>{total}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>全部</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1, background: '#0f172a', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#34d399' }}>{completed}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>已完成</div>
            </div>
            <div style={{ textAlign: 'center', flex: 1, background: '#0f172a', borderRadius: '8px', padding: '12px' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f87171' }}>{pending}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8' }}>待處理</div>
            </div>
          </div>
          <Link to="/todos" style={{ color: '#38bdf8', textDecoration: 'none', fontSize: '14px' }}>管理待辦事項 →</Link>
        </div>
      </div>

      <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ marginBottom: '12px', color: '#a78bfa' }}>📊 今日進度</h3>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <div style={{ color: '#94a3b8', fontSize: '14px' }}>新增待辦</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#60a5fa' }}>{data.log.added_count} 項</div>
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <div style={{ color: '#94a3b8', fontSize: '14px' }}>完成待辦</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#34d399' }}>{data.log.completed_count} 項</div>
          </div>
          <div style={{ flex: 1, minWidth: '150px' }}>
            <div style={{ color: '#94a3b8', fontSize: '14px' }}>待處理</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f87171' }}>{data.log.total_pending} 項</div>
          </div>
        </div>
      </div>
    </div>
  );
}
