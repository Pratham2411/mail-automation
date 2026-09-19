'use client';
import { useState, useEffect } from 'react';

export default function OutreachPage() {
  const [emails, setEmails] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [sendingBatch, setSendingBatch] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [confirmSend, setConfirmSend] = useState(false);

  const fetchEmails = async () => {
    const params = filter ? `?status=${filter}` : '';
    const res = await fetch(`/api/emails${params}`);
    const data = await res.json();
    setEmails(data.emails || []);
    setLoading(false);
  };

  useEffect(() => { fetchEmails(); }, [filter]);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const statusStyle = (s) => {
    const map = {
      draft: { bg: '#f59e0b22', color: '#f59e0b', border: '#f59e0b44', label: 'Draft' },
      approved: { bg: '#06b6d422', color: '#22d3ee', border: '#06b6d444', label: 'Ready' },
      sent: { bg: '#22c55e22', color: '#22c55e', border: '#22c55e44', label: 'Sent' },
      test_sent: { bg: '#22c55e22', color: '#22c55e', border: '#22c55e44', label: 'Test' },
      failed: { bg: '#ef444422', color: '#f87171', border: '#ef444444', label: 'Failed' },
    };
    return map[s] || { bg: '#66666622', color: '#666', border: '#66666644', label: s };
  };

  const approveEmail = async (id) => {
    await fetch('/api/emails', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', email_id: id }),
    });
    fetchEmails();
  };

  const sendEmail = async (id) => {
    const res = await fetch('/api/emails', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send', email_id: id }),
    });
    const data = await res.json();
    if (data.test_mode) showToast('Test mode: recorded', 'info');
    else if (data.success) showToast('Sent! ✉️');
    else showToast(data.error || 'Failed', 'error');
    fetchEmails();
  };

  const approveAllDrafts = async () => {
    const drafts = emails.filter(e => e.status === 'draft');
    await fetch('/api/emails', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve_batch', email_ids: drafts.map(e => e.id) }),
    });
    showToast(`Approved ${drafts.length}`);
    fetchEmails();
  };

  const sendBatch = async () => {
    setSendingBatch(true);
    setConfirmSend(false);
    try {
      const res = await fetch('/api/emails', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_batch' }),
      });
      const data = await res.json();
      if (data.test_mode) showToast(`Test: ${data.sent} recorded`);
      else showToast(`Sent ${data.sent}${data.failed > 0 ? `, ${data.failed} failed` : ''} 🎉`);
    } catch (e) { showToast('Error', 'error'); }
    setSendingBatch(false);
    fetchEmails();
  };

  const deleteDraft = async (id) => {
    await fetch('/api/campaigns', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_draft', email_id: id }),
    });
    if (expandedId === id) setExpandedId(null);
    if (editingId === id) setEditingId(null);
    showToast('Deleted');
    fetchEmails();
  };

  const startEdit = (email) => {
    setEditingId(email.id);
    setEditSubject(email.subject || '');
    setEditBody(email.body || '');
    setExpandedId(null);
  };

  const saveEdit = async () => {
    await fetch('/api/campaigns', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_draft', email_id: editingId, subject: editSubject, body: editBody }),
    });
    showToast('Saved ✓');
    setEditingId(null);
    fetchEmails();
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
    if (editingId) setEditingId(null);
  };

  const allEmails = emails;
  const draftsCount = allEmails.filter(e => e.status === 'draft').length;
  const approvedCount = allEmails.filter(e => e.status === 'approved').length;
  const sentCount = allEmails.filter(e => e.status === 'sent' || e.status === 'test_sent').length;
  const failedCount = allEmails.filter(e => e.status === 'failed').length;

  const statusTabs = [
    { key: '', label: 'All', count: allEmails.length },
    { key: 'draft', label: 'Drafts', count: draftsCount },
    { key: 'approved', label: 'Ready', count: approvedCount },
    { key: 'sent', label: 'Sent', count: sentCount },
    { key: 'failed', label: 'Failed', count: failedCount },
  ];

  return (
    <div className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 800, margin: 0 }}>📧 Outreach Pipeline</h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>Review, approve, and send all outreach emails</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {draftsCount > 0 && (
            <button onClick={approveAllDrafts}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(6,182,212,0.4)',
                background: 'rgba(6,182,212,0.1)', color: '#22d3ee', cursor: 'pointer', fontWeight: 600,
                fontSize: '13px', fontFamily: 'inherit' }}>
              ✓ Approve All ({draftsCount})
            </button>
          )}
          {approvedCount > 0 && (
            <button onClick={() => setConfirmSend(true)} disabled={sendingBatch}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.4)',
                background: 'rgba(34,197,94,0.1)', color: '#22c55e', cursor: 'pointer', fontWeight: 600,
                fontSize: '13px', fontFamily: 'inherit' }}>
              {sendingBatch ? '⏳ Sending...' : `🚀 Send Batch (${approvedCount})`}
            </button>
          )}
        </div>
      </div>

      {/* Confirm */}
      {confirmSend && (
        <div style={{
          marginBottom: '16px', padding: '12px 16px', borderRadius: '8px',
          background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px'
        }}>
          <span style={{ fontSize: '13px' }}>⚠️ Send {approvedCount} approved emails? Cannot undo.</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setConfirmSend(false)}
              style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                background: 'var(--bg-input)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>
              Cancel
            </button>
            <button onClick={sendBatch}
              style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', background: '#22c55e',
                color: '#fff', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit', fontWeight: 600 }}>
              🚀 Confirm
            </button>
          </div>
        </div>
      )}

      {sendingBatch && (
        <div style={{
          padding: '14px', marginBottom: '16px', borderRadius: '8px',
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '12px'
        }}>
          <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px', borderTopColor: '#22c55e' }}></div>
          <span style={{ fontSize: '13px' }}>Sending emails... don't close this page.</span>
        </div>
      )}

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: 0, borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '16px' }}>
        {statusTabs.map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            style={{ padding: '8px 16px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              border: 'none', borderRight: '1px solid var(--border)',
              background: filter === t.key ? 'var(--accent)' : 'var(--bg-input)',
              color: filter === t.key ? '#fff' : 'var(--text-secondary)', flex: 1, textAlign: 'center' }}>
            {t.label} ({t.count})
          </button>
        ))}
      </div>

      {/* Email list */}
      {loading ? (
        <div className="loading"><div className="spinner"></div>Loading...</div>
      ) : emails.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.3 }}>📧</div>
          <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>No emails yet</h3>
          <p style={{ fontSize: '13px' }}>Go to <strong>Campaigns</strong> to generate drafts by company</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '4px' }}>
          {emails.map(e => {
            const ss = statusStyle(e.status);
            const isExpanded = expandedId === e.id;
            const isEditing = editingId === e.id;

            return (
              <div key={e.id} style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                borderLeft: `3px solid ${ss.color}`, overflow: 'hidden'
              }}>
                {/* Row */}
                <div style={{
                  padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer'
                }} onClick={() => toggleExpand(e.id)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: '13px' }}>{e.contact_name || 'Unknown'}</span>
                      <span style={{
                        padding: '2px 7px', borderRadius: '10px', fontSize: '9px', fontWeight: 700,
                        background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`
                      }}>{ss.label}</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {e.contact_company || ''}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.subject}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }} onClick={ev => ev.stopPropagation()}>
                    <button onClick={() => toggleExpand(e.id)}
                      style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit',
                        background: isExpanded ? 'var(--accent)' : 'var(--accent-glow)',
                        border: '1px solid var(--accent)',
                        color: isExpanded ? '#fff' : 'var(--accent-light)', fontWeight: 600 }}>
                      {isExpanded ? '▲' : '👁'}
                    </button>
                    {(e.status === 'draft' || e.status === 'approved') && (
                      <button onClick={() => startEdit(e)}
                        style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit',
                          background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                        ✏️
                      </button>
                    )}
                    {e.status === 'draft' && (
                      <button onClick={() => approveEmail(e.id)}
                        style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit',
                          background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)', color: '#22d3ee' }}>
                        ✓
                      </button>
                    )}
                    {(e.status === 'approved' || e.status === 'failed') && (
                      <button onClick={() => sendEmail(e.id)}
                        style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit',
                          background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#22c55e' }}>
                        {e.status === 'failed' ? '↻' : '▶'}
                      </button>
                    )}
                    {(e.status === 'draft' || e.status === 'approved') && (
                      <button onClick={() => deleteDraft(e.id)}
                        style={{ padding: '4px 6px', borderRadius: '6px', fontSize: '10px', cursor: 'pointer', fontFamily: 'inherit',
                          background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                        🗑
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline preview */}
                {isExpanded && !isEditing && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '14px', background: 'var(--bg-secondary)' }}>
                    <div style={{ background: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#1a1a1a', marginBottom: '4px' }}>{e.subject}</div>
                        <div style={{ fontSize: '11px', color: '#888' }}>To: {e.contact_name} &lt;{e.contact_email}&gt;</div>
                      </div>
                      <div style={{ padding: '14px 16px', fontSize: '13px', lineHeight: '1.7', whiteSpace: 'pre-wrap', color: '#333' }}>
                        {e.body}
                      </div>
                    </div>
                    {e.error_message && (
                      <div style={{ marginTop: '6px', padding: '6px 10px', borderRadius: '6px',
                        background: 'rgba(239,68,68,0.1)', fontSize: '11px', color: '#f87171' }}>
                        ❌ {e.error_message}
                      </div>
                    )}
                  </div>
                )}

                {/* Inline edit */}
                {isEditing && (
                  <div style={{ borderTop: '1px solid var(--border)', padding: '14px', background: 'var(--bg-secondary)' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>Subject</label>
                      <input value={editSubject} onChange={ev => setEditSubject(ev.target.value)}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid var(--border)',
                          background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit' }} />
                    </div>
                    <div style={{ marginBottom: '10px' }}>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '3px' }}>Body</label>
                      <textarea value={editBody} onChange={ev => setEditBody(ev.target.value)}
                        style={{ width: '100%', minHeight: '200px', padding: '8px 10px', borderRadius: '6px',
                          border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)',
                          fontSize: '13px', fontFamily: 'inherit', lineHeight: '1.7', resize: 'vertical' }} />
                    </div>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button onClick={() => setEditingId(null)}
                        style={{ padding: '7px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                          background: 'var(--bg-input)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>
                        Cancel
                      </button>
                      <button onClick={saveEdit}
                        style={{ padding: '7px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                          background: 'var(--accent-gradient)', color: '#fff', fontWeight: 600, fontSize: '12px', fontFamily: 'inherit' }}>
                        💾 Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
