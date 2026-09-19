'use client';
import { useState, useEffect } from 'react';

export default function CampaignsPage() {
  const [companies, setCompanies] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [companyContacts, setCompanyContacts] = useState([]);
  const [companyEmails, setCompanyEmails] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState(null);
  const [filterMode, setFilterMode] = useState('all');
  const [expandedId, setExpandedId] = useState(null); // which email is expanded for preview
  const [editingId, setEditingId] = useState(null);   // which email is being edited inline
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchCompanies = async () => {
    try {
      const [compRes, tmpRes] = await Promise.all([
        fetch('/api/campaigns'),
        fetch('/api/templates'),
      ]);
      const compData = await compRes.json();
      const tmpData = await tmpRes.json();
      setCompanies(compData.companies || []);
      setTemplates(tmpData.templates || []);
      if (tmpData.templates?.length) {
        setSelectedTemplate(String(tmpData.templates.find(t => t.is_default)?.id || tmpData.templates[0].id));
      }
    } catch (e) {
      showToast('Failed to load', 'error');
    }
    setLoading(false);
  };

  useEffect(() => { fetchCompanies(); }, []);

  const openCompany = async (company) => {
    setSelectedCompany(company);
    setCompanyEmails([]);
    setCompanyContacts([]);
    setExpandedId(null);
    setEditingId(null);
    try {
      const res = await fetch(`/api/campaigns?company=${encodeURIComponent(company)}`);
      const data = await res.json();
      setCompanyContacts(data.contacts || []);
      setCompanyEmails(data.emails || []);
    } catch {
      showToast('Failed to load company', 'error');
    }
  };

  const refreshCompany = async () => {
    if (!selectedCompany) return;
    const res = await fetch(`/api/campaigns?company=${encodeURIComponent(selectedCompany)}`);
    const data = await res.json();
    setCompanyContacts(data.contacts || []);
    setCompanyEmails(data.emails || []);
    fetchCompanies();
  };

  const generateCampaign = async () => {
    if (!selectedCompany || !selectedTemplate) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_campaign', company: selectedCompany, template_id: parseInt(selectedTemplate) }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✨ Created ${data.drafts_created} drafts${data.skipped > 0 ? ` (${data.skipped} skipped)` : ''}`);
        refreshCompany();
      } else {
        showToast(data.error || 'Failed', 'error');
      }
    } catch { showToast('Network error', 'error'); }
    setGenerating(false);
  };

  const startEdit = (email) => {
    setEditingId(email.id);
    setEditSubject(email.subject || '');
    setEditBody(email.body || '');
    setExpandedId(null);
  };

  const cancelEdit = () => { setEditingId(null); };

  const saveEdit = async () => {
    await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update_draft', email_id: editingId, subject: editSubject, body: editBody }),
    });
    showToast('Draft saved ✓');
    setEditingId(null);
    refreshCompany();
  };

  const deleteDraft = async (id) => {
    await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_draft', email_id: id }),
    });
    showToast('Deleted');
    if (expandedId === id) setExpandedId(null);
    if (editingId === id) setEditingId(null);
    refreshCompany();
  };

  const approveAll = async () => {
    await fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve_campaign', company: selectedCompany }),
    });
    showToast('All drafts approved ✓');
    setConfirmAction(null);
    refreshCompany();
  };

  const approveSingle = async (id) => {
    await fetch('/api/emails', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', email_id: id }),
    });
    refreshCompany();
  };

  const sendSingle = async (id) => {
    const res = await fetch('/api/emails', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send', email_id: id }),
    });
    const data = await res.json();
    if (data.test_mode) showToast('Test mode: recorded', 'info');
    else if (data.success) showToast('Sent! ✉️');
    else showToast(data.error || 'Failed', 'error');
    refreshCompany();
  };

  const sendApproved = async () => {
    setSending(true);
    setConfirmAction(null);
    try {
      const res = await fetch('/api/emails', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'send_batch' }),
      });
      const data = await res.json();
      if (data.test_mode) showToast(`Test: ${data.sent} recorded`);
      else showToast(`Sent ${data.sent}${data.failed > 0 ? `, ${data.failed} failed` : ''} 🎉`);
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
    setSending(false);
    refreshCompany();
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
    if (editingId) setEditingId(null);
  };

  const filteredCompanies = companies.filter(c => {
    if (search && !c.company.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterMode === 'unsent') return c.contacts_with_email > 0 && c.sent === 0;
    if (filterMode === 'has_drafts') return c.drafts > 0 || c.approved > 0;
    if (filterMode === 'sent') return c.sent > 0;
    return true;
  });

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

  if (loading) return <div className="loading"><div className="spinner"></div>Loading...</div>;

  // ═══════════════════════════════════════
  //  COMPANY DETAIL VIEW
  // ═══════════════════════════════════════
  if (selectedCompany) {
    const drafts = companyEmails.filter(e => e.status === 'draft');
    const approved = companyEmails.filter(e => e.status === 'approved');
    const sent = companyEmails.filter(e => e.status === 'sent' || e.status === 'test_sent');
    const failed = companyEmails.filter(e => e.status === 'failed');

    return (
      <div className="animate-in">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <button onClick={() => { setSelectedCompany(null); setConfirmAction(null); }}
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: '8px',
              padding: '8px 14px', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '14px', fontFamily: 'inherit' }}>
            ← Back
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px' }}>🏢 {selectedCompany}</h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
              {companyContacts.length} contacts · {companyEmails.length} emails
            </p>
          </div>
        </div>

        {/* Action Bar */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          padding: '16px', marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}
              style={{ flex: 1, minWidth: '180px', maxWidth: '300px', padding: '8px 12px', borderRadius: '8px',
                background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)',
                fontSize: '13px', fontFamily: 'inherit' }}>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>

            <button onClick={generateCampaign} disabled={generating}
              style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
                background: 'var(--accent-gradient)', color: '#fff', fontWeight: 600, fontSize: '13px',
                fontFamily: 'inherit', opacity: generating ? 0.6 : 1 }}>
              {generating ? '⏳ Generating...' : '✨ Generate Drafts'}
            </button>

            {drafts.length > 0 && (
              <button onClick={() => setConfirmAction('approve')}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(6,182,212,0.4)',
                  background: 'rgba(6,182,212,0.1)', color: '#22d3ee', cursor: 'pointer', fontWeight: 600,
                  fontSize: '13px', fontFamily: 'inherit' }}>
                ✓ Approve All ({drafts.length})
              </button>
            )}

            {approved.length > 0 && (
              <button onClick={() => setConfirmAction('send')} disabled={sending}
                style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid rgba(34,197,94,0.4)',
                  background: 'rgba(34,197,94,0.1)', color: '#22c55e', cursor: 'pointer', fontWeight: 600,
                  fontSize: '13px', fontFamily: 'inherit', opacity: sending ? 0.6 : 1 }}>
                {sending ? '⏳ Sending...' : `🚀 Send ${approved.length} Emails`}
              </button>
            )}
          </div>

          {/* Confirm */}
          {confirmAction && (
            <div style={{
              marginTop: '12px', padding: '12px 16px', borderRadius: '8px',
              background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px'
            }}>
              <span style={{ fontSize: '13px' }}>
                {confirmAction === 'approve'
                  ? `⚠️ Approve ${drafts.length} drafts?`
                  : `⚠️ Send ${approved.length} emails? Cannot undo.`}
              </span>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setConfirmAction(null)}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                    background: 'var(--bg-input)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '12px', fontFamily: 'inherit' }}>
                  Cancel
                </button>
                <button onClick={confirmAction === 'approve' ? approveAll : sendApproved}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px',
                    fontFamily: 'inherit', fontWeight: 600, color: '#fff',
                    background: confirmAction === 'send' ? '#22c55e' : '#06b6d4' }}>
                  {confirmAction === 'approve' ? '✓ Confirm' : '🚀 Confirm Send'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', marginBottom: '20px' }}>
          {[
            { label: 'Contacts', value: companyContacts.length, color: 'var(--accent)' },
            { label: 'Drafts', value: drafts.length, color: '#f59e0b' },
            { label: 'Ready', value: approved.length, color: '#06b6d4' },
            { label: 'Sent', value: sent.length, color: '#22c55e' },
            { label: 'Failed', value: failed.length, color: '#ef4444' },
          ].map(s => (
            <div key={s.label} style={{
              textAlign: 'center', padding: '14px 8px', background: 'var(--bg-card)',
              border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)'
            }}>
              <div style={{ fontSize: '24px', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Email List */}
        {companyEmails.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.3 }}>✉️</div>
            <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>No emails yet</h3>
            <p style={{ fontSize: '13px' }}>Click "Generate Drafts" above</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '6px' }}>
            {companyEmails.map(email => {
              const isExpanded = expandedId === email.id;
              const isEditing = editingId === email.id;
              const ss = statusStyle(email.status);

              return (
                <div key={email.id} style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                  borderLeft: `3px solid ${ss.color}`, overflow: 'hidden'
                }}>
                  {/* Row header */}
                  <div style={{
                    padding: '12px 16px', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', gap: '12px', cursor: 'pointer'
                  }} onClick={() => toggleExpand(email.id)}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px' }}>{email.contact_name || 'Unknown'}</span>
                        <span style={{
                          padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700,
                          background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`
                        }}>{ss.label}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          — {email.contact_email}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        📌 {email.subject}
                      </div>
                    </div>

                    {/* Action buttons (stop propagation so click doesn't toggle expand) */}
                    <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => toggleExpand(email.id)}
                        style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                          fontFamily: 'inherit', fontWeight: 600,
                          background: isExpanded ? 'var(--accent)' : 'var(--accent-glow)',
                          border: `1px solid var(--accent)`,
                          color: isExpanded ? '#fff' : 'var(--accent-light)' }}>
                        {isExpanded ? '▲ Close' : '👁 Preview'}
                      </button>

                      {email.status === 'draft' && (
                        <>
                          <button onClick={() => startEdit(email)}
                            style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                              fontFamily: 'inherit', background: 'var(--bg-input)', border: '1px solid var(--border)',
                              color: 'var(--text-primary)' }}>
                            ✏️ Edit
                          </button>
                          <button onClick={() => approveSingle(email.id)}
                            style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                              fontFamily: 'inherit', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)',
                              color: '#22d3ee' }}>
                            ✓
                          </button>
                        </>
                      )}

                      {email.status === 'approved' && (
                        <button onClick={() => sendSingle(email.id)}
                          style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                            fontFamily: 'inherit', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)',
                            color: '#22c55e', fontWeight: 600 }}>
                          🚀 Send
                        </button>
                      )}

                      {email.status === 'failed' && (
                        <button onClick={() => sendSingle(email.id)}
                          style={{ padding: '5px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                            fontFamily: 'inherit', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                            color: '#f87171' }}>
                          ↻ Retry
                        </button>
                      )}

                      {(email.status === 'draft' || email.status === 'approved') && (
                        <button onClick={() => deleteDraft(email.id)}
                          style={{ padding: '5px 8px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer',
                            fontFamily: 'inherit', background: 'transparent', border: '1px solid var(--border)',
                            color: 'var(--text-secondary)' }}>
                          🗑
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Inline Preview (no modal!) */}
                  {isExpanded && !isEditing && (
                    <div style={{
                      borderTop: '1px solid var(--border)', padding: '16px',
                      background: 'var(--bg-secondary)', animation: 'slideDown 0.15s ease'
                    }}>
                      {/* Gmail-style preview */}
                      <div style={{
                        background: '#ffffff', borderRadius: '8px', overflow: 'hidden',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f0f0f0' }}>
                          <div style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a1a', marginBottom: '6px' }}>
                            {email.subject}
                          </div>
                          <div style={{ fontSize: '12px', color: '#888' }}>
                            To: {email.contact_name} &lt;{email.contact_email}&gt;
                          </div>
                        </div>
                        <div style={{ padding: '18px', fontSize: '13px', lineHeight: '1.8', whiteSpace: 'pre-wrap', color: '#333' }}>
                          {email.body}
                        </div>
                      </div>
                      {email.error_message && (
                        <div style={{ marginTop: '8px', padding: '8px 12px', borderRadius: '6px',
                          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                          fontSize: '12px', color: '#f87171' }}>
                          ❌ Error: {email.error_message}
                        </div>
                      )}
                      {email.sent_at && (
                        <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Sent: {new Date(email.sent_at).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Inline Edit (no modal!) */}
                  {isEditing && (
                    <div style={{
                      borderTop: '1px solid var(--border)', padding: '16px',
                      background: 'var(--bg-secondary)'
                    }}>
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Subject</label>
                        <input value={editSubject} onChange={e => setEditSubject(e.target.value)}
                          style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border)',
                            background: 'var(--bg-input)', color: 'var(--text-primary)', fontSize: '13px', fontFamily: 'inherit' }} />
                      </div>
                      <div style={{ marginBottom: '12px' }}>
                        <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Body</label>
                        <textarea value={editBody} onChange={e => setEditBody(e.target.value)}
                          style={{ width: '100%', minHeight: '220px', padding: '10px 12px', borderRadius: '6px',
                            border: '1px solid var(--border)', background: 'var(--bg-input)', color: 'var(--text-primary)',
                            fontSize: '13px', fontFamily: 'inherit', lineHeight: '1.7', resize: 'vertical' }} />
                      </div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button onClick={cancelEdit}
                          style={{ padding: '7px 14px', borderRadius: '6px', border: '1px solid var(--border)',
                            background: 'var(--bg-input)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '13px', fontFamily: 'inherit' }}>
                          Cancel
                        </button>
                        <button onClick={saveEdit}
                          style={{ padding: '7px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer',
                            background: 'var(--accent-gradient)', color: '#fff', fontWeight: 600, fontSize: '13px', fontFamily: 'inherit' }}>
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

  // ═══════════════════════════════════════
  //  COMPANY LIST VIEW
  // ═══════════════════════════════════════
  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>🎯 Campaigns</h2>
        <p>Target companies with personalized outreach for every contact</p>
      </div>

      {/* Search + Filter */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="🔍 Search companies..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: '200px', padding: '10px 14px', borderRadius: '8px',
            background: 'var(--bg-input)', border: '1px solid var(--border)', color: 'var(--text-primary)',
            fontSize: '13px', fontFamily: 'inherit' }} />
        <div style={{ display: 'flex', gap: 0, borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
          {[
            { key: 'all', label: 'All' },
            { key: 'unsent', label: 'Not Contacted' },
            { key: 'has_drafts', label: 'Pending' },
            { key: 'sent', label: 'Contacted' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilterMode(f.key)}
              style={{ padding: '8px 14px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
                border: 'none', borderRight: '1px solid var(--border)',
                background: filterMode === f.key ? 'var(--accent)' : 'var(--bg-input)',
                color: filterMode === f.key ? '#fff' : 'var(--text-secondary)' }}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
        {filteredCompanies.length} companies
      </div>

      {/* Company cards */}
      <div style={{ display: 'grid', gap: '6px' }}>
        {filteredCompanies.map(c => {
          const hasActivity = c.sent > 0 || c.drafts > 0 || c.approved > 0;
          return (
            <div key={c.company} onClick={() => openCompany(c.company)}
              style={{
                padding: '14px 18px', cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                borderLeft: `3px solid ${c.sent > 0 ? '#22c55e' : hasActivity ? '#f59e0b' : 'var(--border)'}`,
                transition: 'transform 0.1s ease',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateX(3px)'}
              onMouseLeave={e => e.currentTarget.style.transform = ''}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>{c.company}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {c.contacts_with_email} contacts
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {c.drafts > 0 && <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700,
                  background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b44' }}>{c.drafts} drafts</span>}
                {c.approved > 0 && <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700,
                  background: '#06b6d422', color: '#22d3ee', border: '1px solid #06b6d444' }}>{c.approved} ready</span>}
                {c.sent > 0 && <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700,
                  background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44' }}>✓ {c.sent}</span>}
                {c.failed > 0 && <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: 700,
                  background: '#ef444422', color: '#f87171', border: '1px solid #ef444444' }}>{c.failed} failed</span>}
                <span style={{ color: 'var(--text-secondary)', fontSize: '16px', marginLeft: '4px' }}>›</span>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCompanies.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.3 }}>🏢</div>
          <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>No companies found</h3>
          <p style={{ fontSize: '13px' }}>Import contacts with company names to start</p>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
