import React, { useState, useEffect } from 'react';
import { getEmails, getEmailDetail, emailAction } from '../services/api';

export default function Email() {
  const [emails, setEmails] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadEmails = async () => {
    try {
      const res = await getEmails();
      setEmails(res.data.emails);
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEmails(); }, []);

  const selectEmail = async (id) => {
    setSelectedId(id);
    setDetailLoading(true);
    setDetail(null);
    try {
      const res = await getEmailDetail(id);
      setDetail(res.data.email);
      if (!res.data.email.isRead) {
        emailAction(id, 'read');
        setEmails(prev => prev.map(e => e.id === id ? { ...e, isRead: true } : e));
      }
    } catch {} finally {
      setDetailLoading(false);
    }
  };

  const handleAction = async (action) => {
    if (!selectedId) return;
    await emailAction(selectedId, action);
    if (action === 'trash' || action === 'delete' || action === 'archive') {
      setEmails(prev => prev.filter(e => e.id !== selectedId));
      setSelectedId(null);
      setDetail(null);
    } else if (action === 'read') {
      setEmails(prev => prev.map(e => e.id === selectedId ? { ...e, isRead: true } : e));
      setDetail(prev => prev ? { ...prev, isRead: true } : prev);
    } else if (action === 'unread') {
      setEmails(prev => prev.map(e => e.id === selectedId ? { ...e, isRead: false } : e));
      setDetail(prev => prev ? { ...prev, isRead: false } : prev);
    }
  };

  if (loading) return <p style={{ color: '#94a3b8' }}>載入中...</p>;

  return (
    <div style={{ display: 'flex', gap: '16px', height: 'calc(100vh - 100px)' }}>
      <div style={{ width: selectedId ? '380px' : '100%', minWidth: '300px', background: '#1e293b', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #334155' }}>
          <h2 style={{ fontSize: '18px', margin: 0 }}>📧 郵件列表</h2>
          <p style={{ color: '#94a3b8', fontSize: '12px', margin: '4px 0 0 0' }}>{emails.filter(e => !e.isRead).length} 封未讀</p>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {emails.length === 0 ? (
            <p style={{ color: '#64748b', textAlign: 'center', padding: '24px' }}>今日無新郵件</p>
          ) : (
            emails.map(email => (
              <div key={email.id} onClick={() => selectEmail(email.id)}
                style={{
                  padding: '12px 16px', borderBottom: '1px solid #0f172a', cursor: 'pointer',
                  background: selectedId === email.id ? '#334155' : 'transparent',
                  borderLeft: email.isRead ? '3px solid transparent' : '3px solid #38bdf8',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: email.isRead ? 'normal' : 'bold', fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {email.subject || '(無主旨)'}
                  </span>
                  <span style={{ color: '#94a3b8', fontSize: '11px', whiteSpace: 'nowrap', marginLeft: '8px' }}>
                    {new Date(email.date).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>{email.from}</div>
                <div style={{ color: '#64748b', fontSize: '12px', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {email.snippet}
                </div>
                <div style={{ fontSize: '11px', color: '#60a5fa', marginTop: '4px' }}>{email.account}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedId && (
        <div style={{ flex: 1, background: '#1e293b', borderRadius: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {detailLoading ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: '#94a3b8' }}>載入中...</p>
            </div>
          ) : detail ? (
            <>
              <div style={{ padding: '20px', borderBottom: '1px solid #334155' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>{detail.subject}</h2>
                <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '4px' }}>
                  <span style={{ color: '#e2e8f0' }}>寄件者：</span>{detail.from}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '4px' }}>
                  <span style={{ color: '#e2e8f0' }}>收件者：</span>{detail.to}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '4px' }}>
                  <span style={{ color: '#e2e8f0' }}>時間：</span>{new Date(detail.date).toLocaleString('zh-TW')}
                </div>
                <div style={{ color: '#94a3b8', fontSize: '13px' }}>
                  <span style={{ color: '#e2e8f0' }}>帳號：</span>{detail.account}
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
                <div style={{ lineHeight: '1.6', fontSize: '14px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                  dangerouslySetInnerHTML={{ __html: detail.body || '(無內容)' }} />
              </div>

              <div style={{ padding: '12px 20px', borderTop: '1px solid #334155', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button onClick={() => handleAction(detail.isRead ? 'unread' : 'read')}
                  style={{ background: '#1d4ed8', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  {detail.isRead ? '標記為未讀' : '標記為已讀'}
                </button>
                <button onClick={() => handleAction('archive')}
                  style={{ background: '#d97706', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  封存
                </button>
                <button onClick={() => handleAction('trash')}
                  style={{ background: '#dc2626', color: 'white', border: 'none', padding: '6px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}>
                  刪除
                </button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: '#64748b' }}>無法載入郵件內容</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
