'use client';
import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function ComposeContent() {
  const searchParams = useSearchParams();
  const preselectedContactId = searchParams.get('contact');

  const [contacts, setContacts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedContact, setSelectedContact] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');
  const [batchMode, setBatchMode] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState([]);

  useEffect(() => {
    Promise.all([
      fetch('/api/contacts?hasEmail=true').then(r => r.json()),
      fetch('/api/templates').then(r => r.json()),
    ]).then(([c, t]) => {
      setContacts(c.contacts || []);
      setTemplates(t.templates || []);
      if (preselectedContactId) setSelectedContact(preselectedContactId);
      if (t.templates?.length) setSelectedTemplate(String(t.templates.find(tp => tp.is_default)?.id || t.templates[0].id));
    });
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const generateDraft = async () => {
    if (!selectedContact || !selectedTemplate) { showToast('Select a contact and template', 'error'); return; }
    setLoading(true);
    const res = await fetch('/api/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate_draft', contact_id: parseInt(selectedContact), template_id: parseInt(selectedTemplate) }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.error) { showToast(data.error, 'error'); return; }
    setDraft(data);
    showToast('Draft generated!');
  };

  const generateBatchDrafts = async () => {
    if (selectedContacts.length === 0) { showToast('Select contacts first', 'error'); return; }
    setLoading(true);
    let generated = 0;
    for (const cid of selectedContacts) {
      const res = await fetch('/api/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_draft', contact_id: parseInt(cid), template_id: parseInt(selectedTemplate) }),
      });
      const data = await res.json();
      if (!data.error) generated++;
    }
    setLoading(false);
    showToast(`Generated ${generated} drafts!`);
    setSelectedContacts([]);
  };

  const approveDraft = async () => {
    if (!draft) return;
    await fetch('/api/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', email_id: draft.id }),
    });
    showToast('Email approved for sending!');
    setDraft(null);
  };

  const sendDraft = async () => {
    if (!draft) return;
    setLoading(true);
    const res = await fetch('/api/emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'send', email_id: draft.id }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.test_mode) showToast('Test mode: Email recorded (not actually sent)', 'info');
    else if (data.success) showToast('Email sent!');
    else showToast(data.error || 'Failed', 'error');
    setDraft(null);
  };

  const filteredContacts = contacts.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.company?.toLowerCase().includes(search.toLowerCase()) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleContact = (id) => {
    setSelectedContacts(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Compose Email</h2>
        <p>Generate personalized outreach emails with auto-company matching</p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
        <button className={`tab ${!batchMode ? 'active' : ''}`} onClick={() => setBatchMode(false)}>Single Email</button>
        <button className={`tab ${batchMode ? 'active' : ''}`} onClick={() => setBatchMode(true)}>Batch Generate</button>
      </div>

      {!batchMode ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '24px' }}>
          <div className="card">
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Select Recipient</h3>
            <div className="form-group">
              <label>Search Contact</label>
              <input className="input" placeholder="Type to search..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Contact</label>
              <select className="select" value={selectedContact} onChange={e => setSelectedContact(e.target.value)}>
                <option value="">Choose a contact...</option>
                {filteredContacts.map(c => (
                  <option key={c.id} value={c.id}>{c.name} — {c.company} ({c.email})</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Template</label>
              <select className="select" value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}>
                {templates.map(t => (
                  <option key={t.id} value={t.id}>{t.name} {t.is_default ? '(Default)' : ''}</option>
                ))}
              </select>
            </div>
            <button className="btn btn-primary" onClick={generateDraft} disabled={loading} style={{ width: '100%', marginTop: '8px' }}>
              {loading ? '⏳ Generating...' : '✨ Generate Draft'}
            </button>
          </div>

          <div>
            {draft ? (
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Email Preview</h3>
                  <span className="badge badge-draft">Draft</span>
                </div>
                <div className="email-preview">
                  <div className="subject">📧 {draft.subject}</div>
                  <div className="body">{draft.body}</div>
                </div>
                <div className="btn-group" style={{ marginTop: '16px' }}>
                  <button className="btn btn-success" onClick={approveDraft}>✓ Approve</button>
                  <button className="btn btn-primary" onClick={sendDraft}>{loading ? '⏳...' : '🚀 Send Now'}</button>
                  <button className="btn btn-secondary" onClick={generateDraft}>🔄 Regenerate</button>
                </div>
              </div>
            ) : (
              <div className="card">
                <div className="empty-state">
                  <div className="icon">✏️</div>
                  <h3>No draft yet</h3>
                  <p>Select a contact and template, then click "Generate Draft"</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Batch Draft Generation</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div className="form-group">
              <label>Template</label>
              <select className="select" value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Filter Contacts</label>
              <input className="input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>

          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            {selectedContacts.length} contacts selected
          </p>

          <div style={{ maxHeight: '400px', overflow: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input type="checkbox" onChange={e => setSelectedContacts(e.target.checked ? filteredContacts.map(c => c.id) : [])} />
                  </th>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Email</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredContacts.slice(0, 100).map(c => (
                  <tr key={c.id}>
                    <td><input type="checkbox" checked={selectedContacts.includes(c.id)} onChange={() => toggleContact(c.id)} /></td>
                    <td style={{ fontWeight: 500 }}>{c.name}</td>
                    <td>{c.company}</td>
                    <td style={{ fontSize: '12px' }}>{c.email}</td>
                    <td><span className={`badge badge-${c.email_status === 'Not Contacted' ? 'draft' : 'sent'}`}>{c.email_status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="btn-group" style={{ marginTop: '16px' }}>
            <button className="btn btn-primary" onClick={generateBatchDrafts} disabled={loading || selectedContacts.length === 0}>
              {loading ? '⏳ Generating...' : `✨ Generate ${selectedContacts.length} Drafts`}
            </button>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}

export default function ComposePage() {
  return (
    <Suspense fallback={<div className="loading"><div className="spinner"></div>Loading...</div>}>
      <ComposeContent />
    </Suspense>
  );
}
