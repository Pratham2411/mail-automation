'use client';
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const [settings, setSettings] = useState({});

  useEffect(() => {
    // Seed database on first load
    fetch('/api/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'seed' }) })
      .then(() => Promise.all([
        fetch('/api/contacts?stats=true').then(r => r.json()),
        fetch('/api/settings').then(r => r.json())
      ]))
      .then(([statsData, settingsData]) => { 
        setStats(statsData); 
        setSettings(settingsData);
        setLoading(false); 
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner"></div>Loading dashboard...</div>;

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p>Overview of your recruiter research and outreach pipeline</p>
      </div>

      {stats && (
        <>
          {(settings.test_mode === 'true' || settings.test_mode === true) && (
            <div className="test-mode-banner">
              <span className="icon">⚠️</span>
              <span><strong>Test Mode is ON</strong> — Emails will be drafted but not sent. Configure Gmail OAuth2 in Settings to enable real sending.</span>
            </div>
          )}

          <div className="card-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total Contacts</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.withEmail}</div>
              <div className="stat-label">With Email</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.verified}</div>
              <div className="stat-label">Verified</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.tier1}</div>
              <div className="stat-label">Tier 1 Contacts</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.sent}</div>
              <div className="stat-label">Emails Sent</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.replied}</div>
              <div className="stat-label">Replies</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.drafts}</div>
              <div className="stat-label">Drafts Pending</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.sentToday || 0}/100</div>
              <div className="stat-label">Sent Today</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div className="card">
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Outreach Pipeline</h3>
              {stats.byStatus && stats.byStatus.map((s, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span className={`badge badge-${s.email_status === 'Sent' ? 'sent' : s.email_status === 'Replied' ? 'replied' : s.email_status === 'Bounced' ? 'bounced' : 'draft'}`}>
                    {s.email_status}
                  </span>
                  <span style={{ fontWeight: 600 }}>{s.count}</span>
                </div>
              ))}
            </div>

            <div className="card">
              <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Top Companies</h3>
              {stats.byCompany && stats.byCompany.slice(0, 10).map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: '13px' }}>{c.company}</span>
                  <span style={{ fontWeight: 600, color: 'var(--accent-light)' }}>{c.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card" style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Quick Actions</h3>
            <div className="btn-group">
              <a href="/contacts" className="btn btn-primary">👥 Browse Contacts</a>
              <a href="/compose" className="btn btn-secondary">✏️ Compose Email</a>
              <a href="/outreach" className="btn btn-secondary">📧 View Outreach</a>
              <a href="/research" className="btn btn-secondary">🔍 Research Sources</a>
              <a href="/settings" className="btn btn-secondary">⚙️ Configure Gmail</a>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
