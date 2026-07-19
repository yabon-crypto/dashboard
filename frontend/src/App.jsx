import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import { getAuthStatus, logout } from './services/api';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import Todos from './pages/Todos';
import Email from './pages/Email';
import Settings from './pages/Settings';

export default function App() {
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getAuthStatus().then(res => {
      setAuth(res.data);
      setLoading(false);
    }).catch(() => {
      setAuth({ authenticated: false });
      setLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    await logout();
    setAuth({ authenticated: false });
    navigate('/');
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a', color: '#94a3b8' }}>
        <p>載入中...</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0' }}>
      <nav style={{ borderBottom: '1px solid #1e293b', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
          <Link to="/" style={{ color: '#38bdf8', textDecoration: 'none', fontWeight: 'bold', fontSize: '18px' }}>每日儀表板</Link>
          {auth?.authenticated && (
            <>
              <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none' }}>首頁</Link>
              <Link to="/schedule" style={{ color: '#94a3b8', textDecoration: 'none' }}>行事曆</Link>
              <Link to="/email" style={{ color: '#94a3b8', textDecoration: 'none' }}>郵件</Link>
              <Link to="/todos" style={{ color: '#94a3b8', textDecoration: 'none' }}>待辦</Link>
              <Link to="/settings" style={{ color: '#94a3b8', textDecoration: 'none' }}>設定</Link>
            </>
          )}
        </div>
        <div>
          {auth?.authenticated ? (
            <button onClick={handleLogout} style={{ background: '#334155', color: '#e2e8f0', border: 'none', padding: '6px 16px', borderRadius: '6px', cursor: 'pointer' }}>
              登出
            </button>
          ) : (
            <span style={{ color: '#94a3b8' }}>未登入</span>
          )}
        </div>
      </nav>

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px' }}>
        <Routes>
          <Route path="/" element={<Dashboard auth={auth} setAuth={setAuth} />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/email" element={<Email />} />
          <Route path="/todos" element={<Todos />} />
          <Route path="/settings" element={<Settings auth={auth} setAuth={setAuth} />} />
        </Routes>
      </main>
    </div>
  );
}
