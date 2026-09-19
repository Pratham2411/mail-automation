'use client';
import { useState, useEffect } from 'react';

export default function ResearchPage() {
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetch('/api/research').then(r => r.json()).then(data => {
      setSources(data.sources || []);
      setLoading(false);
    });
  }, []);

  const handleAdd = async (source) => {
    await fetch('/api/research', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(source) });
    setShowModal(false);
    const res = await fetch('/api/research');
    const data = await res.json();
    setSources(data.sources || []);
  };

  const grouped = {};
  for (const s of sources) {
    const key = s.platform || 'Other';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(s);
  }

  return (
    <div className="animate-in">
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Research Sources</h2>
          <p>{sources.length} curated sources for recruiter discovery</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Source</button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner"></div>Loading sources...</div>
      ) : (
        Object.entries(grouped).map(([platform, items]) => (
          <div key={platform} style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              {platform === 'GitHub' ? '🐙' : platform === 'Web' ? '🌐' : platform === 'Company' ? '🏢' : platform === 'University' ? '🎓' : '📋'} {platform}
            </h3>
            <div style={{ display: 'grid', gap: '12px' }}>
              {items.map(s => (
                <div key={s.id} className="card" style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h4 style={{ fontSize: '14px', fontWeight: 600 }}>{s.name}</h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>{s.description}</p>
                      {s.best_for && <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>Best for: {s.best_for}</p>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {s.reliability && (
                        <span className={`badge ${s.reliability === 'HIGH' ? 'badge-verified' : s.reliability === 'MEDIUM-HIGH' ? 'badge-tier2' : 'badge-tier3'}`}>
                          {s.reliability}
                        </span>
                      )}
                      {s.url && <a href={s.url} target="_blank" rel="noopener" className="btn btn-sm btn-secondary">Open →</a>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Add Research Source</h3>
            <SourceForm onSave={handleAdd} onClose={() => setShowModal(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

function SourceForm({ onSave, onClose }) {
  const [form, setForm] = useState({ name: '', url: '', platform: 'Web', source_type: 'directory', description: '', reliability: 'MEDIUM', best_for: '' });
  return (
    <form onSubmit={e => { e.preventDefault(); onSave(form); }}>
      <div className="form-group"><label>Name *</label><input className="input" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
      <div className="form-group"><label>URL</label><input className="input" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="form-group"><label>Platform</label>
          <select className="select" value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>
            <option>GitHub</option><option>Web</option><option>Company</option><option>University</option><option>Google Docs</option><option>Other</option>
          </select>
        </div>
        <div className="form-group"><label>Reliability</label>
          <select className="select" value={form.reliability} onChange={e => setForm({ ...form, reliability: e.target.value })}>
            <option>HIGH</option><option>MEDIUM-HIGH</option><option>MEDIUM</option><option>LOW</option>
          </select>
        </div>
      </div>
      <div className="form-group"><label>Description</label><textarea className="textarea" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
      <div className="form-group"><label>Best For</label><input className="input" value={form.best_for} onChange={e => setForm({ ...form, best_for: e.target.value })} /></div>
      <div className="btn-group" style={{ marginTop: '16px', justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
        <button type="submit" className="btn btn-primary">Add Source</button>
      </div>
    </form>
  );
}
