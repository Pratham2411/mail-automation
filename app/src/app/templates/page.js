'use client';
import { useState, useEffect } from 'react';

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchTemplates = async () => {
    const res = await fetch('/api/templates');
    const data = await res.json();
    setTemplates(data.templates || []);
  };

  useEffect(() => { fetchTemplates(); }, []);

  const showToastMsg = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async (template) => {
    if (template.id) {
      await fetch('/api/templates', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(template) });
    } else {
      await fetch('/api/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(template) });
    }
    setShowModal(false);
    setEditing(null);
    showToastMsg('Template saved!');
    fetchTemplates();
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this template?')) return;
    await fetch(`/api/templates?id=${id}`, { method: 'DELETE' });
    showToastMsg('Template deleted');
    fetchTemplates();
  };

  return (
    <div className="animate-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Email Templates</h2>
          <p>Manage your outreach email templates with variable placeholders</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setShowModal(true); }}>+ New Template</button>
      </div>

      <div style={{ display: 'grid', gap: '16px' }}>
        {templates.map(t => (
          <div key={t.id} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700 }}>
                  {t.name}
                  {t.is_default ? <span className="badge badge-verified" style={{ marginLeft: '8px' }}>Default</span> : null}
                </h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>Type: {t.template_type} · Used {t.use_count} times</p>
              </div>
              <div className="btn-group">
                <button className="btn btn-sm btn-secondary" onClick={() => { setEditing(t); setShowModal(true); }}>Edit</button>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id)}>Delete</button>
              </div>
            </div>
            <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Subject: {t.subject}</div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: '150px', overflow: 'hidden' }}>{t.body}</div>
            </div>
            {t.variables && (
              <div style={{ marginTop: '12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {t.variables.split(',').map((v, i) => (
                  <span key={i} style={{ fontSize: '11px', padding: '2px 8px', background: 'var(--accent-glow)', color: 'var(--accent-light)', borderRadius: '4px' }}>
                    {`{{${v.trim()}}}`}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {showModal && <TemplateModal template={editing} onSave={handleSave} onClose={() => { setShowModal(false); setEditing(null); }} />}
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}

function TemplateModal({ template, onSave, onClose }) {
  const [form, setForm] = useState(template || {
    name: '', subject: '', body: '', template_type: 'initial', variables: 'recruiter_name,company,role,my_name,university,skills,project,resume_link,github_link,linkedin_link', is_default: 0
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px' }}>
        <h3>{template ? 'Edit Template' : 'New Template'}</h3>
        <form onSubmit={e => { e.preventDefault(); onSave(form); }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Template Name *</label>
              <input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Type</label>
              <select className="select" value={form.template_type} onChange={e => setForm({ ...form, template_type: e.target.value })}>
                <option value="initial">Initial Outreach</option>
                <option value="internship">Internship</option>
                <option value="follow_up">Follow-up</option>
                <option value="cold_company">Cold Company Email</option>
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Subject Line</label>
            <input className="input" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} placeholder="Use {{variable}} for dynamic values" />
          </div>
          <div className="form-group">
            <label>Email Body</label>
            <textarea className="textarea" style={{ minHeight: '250px' }} value={form.body} onChange={e => setForm({ ...form, body: e.target.value })} placeholder="Write your email template. Use {{variable}} for auto-replacement." />
          </div>
          <div className="form-group">
            <label>Variables (comma-separated)</label>
            <input className="input" value={form.variables} onChange={e => setForm({ ...form, variables: e.target.value })} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <input type="checkbox" checked={!!form.is_default} onChange={e => setForm({ ...form, is_default: e.target.checked ? 1 : 0 })} id="isDefault" />
            <label htmlFor="isDefault" style={{ fontSize: '13px', cursor: 'pointer' }}>Set as default template</label>
          </div>
          <div className="btn-group" style={{ justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Template</button>
          </div>
        </form>
      </div>
    </div>
  );
}
