'use client';
import { useState, useEffect } from 'react';

export default function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    fetch('/api/settings').then(r => r.json()).then(data => {
      setSettings(data.settings || {});
      setLoading(false);
    });
  }, []);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const saveSettings = async () => {
    setSaving(true);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    showToast('Settings saved!');
  };

  const testGmail = async () => {
    setTestResult(null);
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'test_connection', ...settings }),
    });
    const data = await res.json();
    setTestResult(data);
  };

  const reseedDb = async () => {
    if (!confirm('This will reseed the database. Existing data will not be overwritten. Continue?')) return;
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'seed' }),
    });
    showToast('Database reseeded!');
  };

  const update = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  if (loading) return <div className="loading"><div className="spinner"></div>Loading settings...</div>;

  return (
    <div className="animate-in">
      <div className="page-header">
        <h2>Settings</h2>
        <p>Configure your profile, Gmail OAuth2, and outreach preferences</p>
      </div>

      <div style={{ display: 'grid', gap: '24px', maxWidth: '800px' }}>
        {/* Profile Section */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>👤 Your Profile</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>These values auto-fill your email templates</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Your Name</label>
              <input className="input" value={settings.my_name || ''} onChange={e => update('my_name', e.target.value)} placeholder="John Doe" />
            </div>
            <div className="form-group">
              <label>Your Email</label>
              <input className="input" type="email" value={settings.my_email || ''} onChange={e => update('my_email', e.target.value)} placeholder="you@gmail.com" />
            </div>
            <div className="form-group">
              <label>University</label>
              <input className="input" value={settings.university || ''} onChange={e => update('university', e.target.value)} placeholder="MIT" />
            </div>
            <div className="form-group">
              <label>Key Skills</label>
              <input className="input" value={settings.skills || ''} onChange={e => update('skills', e.target.value)} placeholder="Python, React, ML" />
            </div>
            <div className="form-group">
              <label>Notable Project</label>
              <input className="input" value={settings.project || ''} onChange={e => update('project', e.target.value)} placeholder="AI-powered data pipeline" />
            </div>
            <div className="form-group">
              <label>Resume Link</label>
              <input className="input" value={settings.resume_link || ''} onChange={e => update('resume_link', e.target.value)} placeholder="https://..." />
            </div>
            <div className="form-group">
              <label>GitHub Link</label>
              <input className="input" value={settings.github_link || ''} onChange={e => update('github_link', e.target.value)} placeholder="https://github.com/..." />
            </div>
            <div className="form-group">
              <label>LinkedIn Link</label>
              <input className="input" value={settings.linkedin_link || ''} onChange={e => update('linkedin_link', e.target.value)} placeholder="https://linkedin.com/in/..." />
            </div>
          </div>
        </div>

        {/* Gmail OAuth2 Section */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>📧 Gmail OAuth2 Configuration</h3>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
            Set up Gmail API credentials to send emails. Follow the{' '}
            <a href="https://developers.google.com/gmail/api/quickstart/nodejs" target="_blank" rel="noopener" style={{ color: 'var(--accent-light)' }}>
              Google Gmail API Quickstart
            </a>{' '}
            to get your credentials.
          </p>
          <div className="form-group">
            <label>Gmail Client ID</label>
            <input className="input" value={settings.gmail_client_id || ''} onChange={e => update('gmail_client_id', e.target.value)} placeholder="xxxx.apps.googleusercontent.com" />
          </div>
          <div className="form-group">
            <label>Gmail Client Secret</label>
            <input className="input" type="password" value={settings.gmail_client_secret || ''} onChange={e => update('gmail_client_secret', e.target.value)} placeholder="••••••" />
          </div>
          <div className="form-group">
            <label>Gmail Refresh Token</label>
            <input className="input" type="password" value={settings.gmail_refresh_token || ''} onChange={e => update('gmail_refresh_token', e.target.value)} placeholder="••••••" />
          </div>
          <div className="btn-group">
            <button className="btn btn-secondary" onClick={testGmail}>🔌 Test Connection</button>
          </div>
          {testResult && (
            <div style={{ marginTop: '12px', padding: '12px', borderRadius: 'var(--radius-sm)', background: testResult.success ? 'var(--success-bg)' : 'var(--danger-bg)', fontSize: '13px' }}>
              {testResult.success ? '✅' : '❌'} {testResult.message}
            </div>
          )}
        </div>

        {/* Outreach Settings */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>🚀 Outreach Settings</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label>Daily Email Limit</label>
              <input className="input" type="number" value={settings.daily_limit || 100} onChange={e => update('daily_limit', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Batch Size</label>
              <input className="input" type="number" value={settings.batch_size || 10} onChange={e => update('batch_size', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Delay Between Emails (ms)</label>
              <input className="input" type="number" value={settings.delay_between_emails_ms || 5000} onChange={e => update('delay_between_emails_ms', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Follow-up After (days)</label>
              <input className="input" type="number" value={settings.follow_up_days || 7} onChange={e => update('follow_up_days', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Max Follow-ups</label>
              <input className="input" type="number" value={settings.max_follow_ups || 2} onChange={e => update('max_follow_ups', e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.test_mode === 'true' || settings.test_mode === true} onChange={e => update('test_mode', e.target.checked ? 'true' : 'false')} />
              <span>🧪 <strong>Test Mode</strong> — Drafts are recorded but not actually sent</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
              <input type="checkbox" checked={settings.require_approval === 'true' || settings.require_approval === true} onChange={e => update('require_approval', e.target.checked ? 'true' : 'false')} />
              <span>✓ Require approval before sending</span>
            </label>
          </div>
        </div>


        {/* Actions */}
        <div className="card">
          <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>🛠 Database Actions</h3>
          <div className="btn-group">
            <button className="btn btn-secondary" onClick={reseedDb}>🔄 Re-seed Database</button>
          </div>
        </div>

        {/* Save Button */}
        <button className="btn btn-primary" onClick={saveSettings} disabled={saving} style={{ width: '100%', padding: '14px', fontSize: '15px' }}>
          {saving ? '⏳ Saving...' : '💾 Save All Settings'}
        </button>
      </div>

      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}
    </div>
  );
}
