import React, { useState } from 'react';
import { updateSettings, disconnectProvider } from '../services/api';

export default function Settings({ auth, setAuth }) {
  const [notifyTime, setNotifyTime] = useState(auth?.user?.notify_time || '07:00');
  const [notifyEmail, setNotifyEmail] = useState(auth?.user?.notify_email || '');
  const [saved, setSaved] = useState(false);

  if (!auth?.authenticated) {
    return <p style={{ color: '#94a3b8', textAlign: 'center' }}>請先登入</p>;
  }

  const handleSave = async () => {
    try {
      const res = await updateSettings({ notify_time: notifyTime, notify_email: notifyEmail });
      setAuth(prev => ({ ...prev, user: res.data.user }));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      alert('儲存失敗');
    }
  };

  const handleDisconnect = async (provider, email) => {
    const name = provider === 'google' ? 'Google' : 'Microsoft';
    if (!confirm(`確定要斷開 ${name} 帳號 ${email || ''} 的連接？`)) return;
    await disconnectProvider(provider, email);
    setAuth(prev => {
      const accounts = { ...prev.accounts };
      if (email) {
        accounts[provider] = (accounts[provider] || []).filter(a => a.email !== email);
      } else {
        accounts[provider] = [];
      }
      const connections = {
        google: accounts.google?.length > 0,
        microsoft: accounts.microsoft?.length > 0,
      };
      return { ...prev, accounts, connections };
    });
  };

  const accounts = auth.accounts || { google: [], microsoft: [] };
  const googleAccounts = accounts.google || [];
  const msAccounts = accounts.microsoft || [];
  const hasGoogle = googleAccounts.length > 0;
  const hasMs = msAccounts.length > 0;

  return (
    <div>
      <h1 style={{ fontSize: '24px', marginBottom: '24px' }}>⚙️ 設定</h1>

      <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
        <h3 style={{ marginBottom: '16px', color: '#38bdf8' }}>🔗 已連接的服務</h3>

        <div style={{ marginBottom: '16px' }}>
          <h4 style={{ color: '#ea4335', marginBottom: '8px' }}>Google 帳號</h4>
          {googleAccounts.map(acct => (
            <div key={acct.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#0f172a', borderRadius: '8px', marginBottom: '8px' }}>
              <div>
                <span style={{ fontWeight: 'bold' }}>{acct.name || acct.email}</span>
                <span style={{ color: '#94a3b8', fontSize: '13px', marginLeft: '8px' }}>{acct.email}</span>
              </div>
              <button onClick={() => handleDisconnect('google', acct.email)} style={{ background: 'transparent', border: '1px solid #f87171', color: '#f87171', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                移除
              </button>
            </div>
          ))}
          {!hasGoogle && <p style={{ color: '#64748b', fontSize: '14px' }}>尚未連接 Google 帳號</p>}
          <a href="/api/auth/google?link=1" style={{ display: 'inline-block', marginTop: '8px', background: '#ea4335', color: 'white', padding: '6px 16px', borderRadius: '6px', textDecoration: 'none', fontSize: '13px' }}>
            + 新增 Google 帳號
          </a>
        </div>

        <div>
          <h4 style={{ color: '#00a4ef', marginBottom: '8px' }}>Microsoft 帳號</h4>
          {msAccounts.map(acct => (
            <div key={acct.email} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: '#0f172a', borderRadius: '8px', marginBottom: '8px' }}>
              <div>
                <span style={{ fontWeight: 'bold' }}>{acct.name || acct.email}</span>
                <span style={{ color: '#94a3b8', fontSize: '13px', marginLeft: '8px' }}>{acct.email}</span>
              </div>
              <button onClick={() => handleDisconnect('microsoft', acct.email)} style={{ background: 'transparent', border: '1px solid #f87171', color: '#f87171', padding: '4px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                移除
              </button>
            </div>
          ))}
          {!hasMs && <p style={{ color: '#64748b', fontSize: '14px' }}>尚未連接 Microsoft 帳號</p>}
          <a href="/api/auth/microsoft?link=1" style={{ display: 'inline-block', marginTop: '8px', background: '#00a4ef', color: 'white', padding: '6px 16px', borderRadius: '6px', textDecoration: 'none', fontSize: '13px' }}>
            + 新增 Microsoft 帳號（用於學校信箱）
          </a>
        </div>
      </div>

      <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', marginBottom: '16px' }}>
        <h3 style={{ marginBottom: '16px', color: '#38bdf8' }}>⏰ 每日通知設定</h3>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px', fontSize: '14px' }}>通知時間</label>
          <input type="time" value={notifyTime} onChange={e => setNotifyTime(e.target.value)}
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', width: '200px' }} />
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', color: '#94a3b8', marginBottom: '4px', fontSize: '14px' }}>通知 Email</label>
          <input type="email" value={notifyEmail} onChange={e => setNotifyEmail(e.target.value)} placeholder="your@email.com"
            style={{ padding: '10px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', width: '100%', maxWidth: '400px', boxSizing: 'border-box' }} />
        </div>
        <button onClick={handleSave} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          {saved ? '✅ 已儲存' : '儲存設定'}
        </button>
      </div>

      <div style={{ background: '#1e293b', borderRadius: '12px', padding: '20px' }}>
        <h3 style={{ marginBottom: '12px', color: '#94a3b8' }}>💡 使用說明</h3>
        <ul style={{ color: '#94a3b8', lineHeight: '1.8' }}>
          <li>可連接多個 Google / Microsoft 帳號，同時查看所有郵件與行事曆</li>
          <li>臺科大 Email 可使用 Microsoft 登入加入（學校通常使用 Office 365）</li>
          <li>在待辦事項頁面管理你的每日工作清單</li>
          <li>設定通知時間（預設 07:00），系統將自動發送每日摘要到你的 Email</li>
          <li>儀表板會顯示所有帳號的當日行程、郵件以及待辦完成度統計</li>
          <li>待辦事項的新增/完成數據會自動記錄並顯示在趨勢圖中</li>
        </ul>
      </div>
    </div>
  );
}
