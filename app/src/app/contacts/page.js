'use client';
import { useState, useEffect } from 'react';

export default function ContactsPage() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ tier: '', email_status: '', priority: '', hasEmail: false });
  const [showModal, setShowModal] = useState(false);
  const [editContact, setEditContact] = useState(null);

  const fetchContacts = async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (filters.tier) params.set('tier', filters.tier);
    if (filters.email_status) params.set('email_status', filters.email_status);
    if (filters.priority) params.set('priority', filters.priority);
    if (filters.hasEmail) params.set('hasEmail', 'true');

    const res = await fetch(`/api/contacts?${params}`);
    const data = await res.json();
    setContacts(data.contacts || []);
    setLoading(false);
  };

  useEffect(() => { fetchContacts(); }, [search, filters]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this contact?')) return;
    await fetch(`/api/contacts?id=${id}`, { method: 'DELETE' });
    fetchContacts();
  };

  const handleSave = async (contact) => {
    if (contact.id) {
      await fetch('/api/contacts', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(contact) });
    } else {
      await fetch('/api/contacts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(contact) });
    }
    setShowModal(false);
    setEditContact(null);
    fetchContacts();
  };

  return (
    <div className="animate-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Contacts</h2>
          <p>{contacts.length} recruiter contacts loaded</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditContact(null); setShowModal(true); }}>+ Add Contact</button>
      </div>

      <div className="filters-bar">
        <input className="input search-input" placeholder="Search by name, company, email..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="select" value={filters.tier} onChange={e => setFilters(p => ({ ...p, tier: e.target.value }))}>
          <option value="">All Tiers</option>
          <option value="1">Tier 1 — Verified</option>
          <option value="2">Tier 2 — Likely Valid</option>
          <option value="3">Tier 3 — Unverified</option>
        </select>
        <select className="select" value={filters.email_status} onChange={e => setFilters(p => ({ ...p, email_status: e.target.value }))}>
          <option value="">All Statuses</option>
          <option value="Not Contacted">Not Contacted</option>
          <option value="Sent">Sent</option>
          <option value="Replied">Replied</option>
          <option value="Interested">Interested</option>
          <option value="Bounced">Bounced</option>
          <option value="Do Not Contact">Do Not Contact</option>
        </select>
        <select className="select" value={filters.priority} onChange={e => setFilters(p => ({ ...p, priority: e.target.value }))}>
          <option value="">All Priorities</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
          <input type="checkbox" checked={filters.hasEmail} onChange={e => setFilters(p => ({ ...p, hasEmail: e.target.checked }))} /> Has Email
        </label>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner"></div>Loading contacts...</div>
      ) : contacts.length === 0 ? (
        <div className="empty-state">
          <div className="icon">👥</div>
          <h3>No contacts found</h3>
          <p>Adjust your filters or add new contacts</p>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Company</th>
                <th>Title</th>
                <th>Email</th>
                <th>Tier</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>{c.company}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{c.job_title}</td>
                  <td style={{ fontSize: '12px' }}>{c.email || <span style={{ color: 'var(--text-muted)' }}>No email</span>}</td>
                  <td><span className={`badge badge-tier${c.tier}`}>Tier {c.tier}</span></td>
                  <td><span className={`badge badge-${(c.priority || 'medium').toLowerCase()}`}>{c.priority}</span></td>
                  <td><span className={`badge badge-${c.email_status === 'Not Contacted' ? 'draft' : c.email_status === 'Sent' ? 'sent' : c.email_status === 'Replied' ? 'replied' : c.email_status === 'Bounced' ? 'bounced' : 'draft'}`}>{c.email_status}</span></td>
                  <td>
                    <div className="btn-group">
                      <button className="btn btn-sm btn-secondary" onClick={() => { setEditContact(c); setShowModal(true); }}>Edit</button>
                      <a href={`/compose?contact=${c.id}`} className="btn btn-sm btn-primary">Email</a>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id)}>×</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <ContactModal contact={editContact} onSave={handleSave} onClose={() => { setShowModal(false); setEditContact(null); }} />
      )}
    </div>
  );
}

function ContactModal({ contact, onSave, onClose }) {
  const [form, setForm] = useState(contact || { name: '', company: '', job_title: '', email: '', phone: '', linkedin_url: '', tier: 3, priority: 'Medium', notes: '', category: '', verification_status: 'unverified' });

  const handleSubmit = (e) => { e.preventDefault(); onSave(form); };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>{contact ? 'Edit Contact' : 'Add Contact'}</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Name *</label>
              <input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Company</label>
              <input className="input" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Job Title</label>
              <input className="input" value={form.job_title} onChange={e => setForm({ ...form, job_title: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input className="input" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input className="input" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="form-group">
              <label>LinkedIn URL</label>
              <input className="input" value={form.linkedin_url || ''} onChange={e => setForm({ ...form, linkedin_url: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Tier</label>
              <select className="select" value={form.tier} onChange={e => setForm({ ...form, tier: parseInt(e.target.value) })}>
                <option value={1}>Tier 1 — Verified</option>
                <option value={2}>Tier 2 — Likely Valid</option>
                <option value={3}>Tier 3 — Unverified</option>
              </select>
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select className="select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Notes</label>
            <textarea className="textarea" value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div className="btn-group" style={{ marginTop: '16px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">Save Contact</button>
          </div>
        </form>
      </div>
    </div>
  );
}
