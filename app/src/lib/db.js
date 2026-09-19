import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'recruiter.db');

let db;

export function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables(db);
  }
  return db;
}

function initTables(d) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      company TEXT,
      job_title TEXT,
      recruiting_area TEXT,
      email TEXT,
      linkedin_url TEXT,
      phone TEXT,
      source_url TEXT,
      source_type TEXT DEFAULT 'manual',
      verification_status TEXT DEFAULT 'unverified',
      confidence TEXT DEFAULT 'low',
      tier INTEGER DEFAULT 3,
      last_verified TEXT,
      status TEXT DEFAULT 'active',
      notes TEXT,
      email_status TEXT DEFAULT 'Not Contacted',
      last_contacted TEXT,
      follow_up_date TEXT,
      emails_sent INTEGER DEFAULT 0,
      reply_status TEXT,
      unsubscribe_status INTEGER DEFAULT 0,
      priority TEXT DEFAULT 'Medium',
      category TEXT,
      website TEXT,
      email_type TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      url TEXT,
      platform TEXT,
      source_type TEXT,
      description TEXT,
      relevance TEXT,
      reliability TEXT,
      recency TEXT,
      best_for TEXT,
      contacts_count INTEGER DEFAULT 0,
      last_checked TEXT,
      status TEXT DEFAULT 'active',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      template_type TEXT DEFAULT 'initial',
      variables TEXT,
      is_default INTEGER DEFAULT 0,
      use_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contact_id INTEGER,
      template_id INTEGER,
      subject TEXT,
      body TEXT,
      status TEXT DEFAULT 'draft',
      sent_at TEXT,
      opened_at TEXT,
      replied_at TEXT,
      bounced INTEGER DEFAULT 0,
      error_message TEXT,
      follow_up_number INTEGER DEFAULT 0,
      campaign_tag TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (contact_id) REFERENCES contacts(id),
      FOREIGN KEY (template_id) REFERENCES templates(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS company_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      industry TEXT,
      tech_stack TEXT,
      recent_news TEXT,
      open_roles TEXT,
      internship_program TEXT,
      careers_url TEXT,
      location TEXT,
      size TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company);
    CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
    CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(email_status);
    CREATE INDEX IF NOT EXISTS idx_contacts_tier ON contacts(tier);
    CREATE INDEX IF NOT EXISTS idx_email_log_contact ON email_log(contact_id);
    CREATE INDEX IF NOT EXISTS idx_email_log_status ON email_log(status);
  `);
}

// ─── Contact Operations ───
export function getAllContacts(filters = {}) {
  const d = getDb();
  let query = 'SELECT * FROM contacts WHERE 1=1';
  const params = [];

  if (filters.company) { query += ' AND company LIKE ?'; params.push(`%${filters.company}%`); }
  if (filters.tier) { query += ' AND tier = ?'; params.push(filters.tier); }
  if (filters.verification_status) { query += ' AND verification_status = ?'; params.push(filters.verification_status); }
  if (filters.email_status) { query += ' AND email_status = ?'; params.push(filters.email_status); }
  if (filters.priority) { query += ' AND priority = ?'; params.push(filters.priority); }
  if (filters.search) {
    query += ' AND (name LIKE ? OR company LIKE ? OR email LIKE ? OR job_title LIKE ?)';
    const s = `%${filters.search}%`;
    params.push(s, s, s, s);
  }
  if (filters.hasEmail) { query += " AND email IS NOT NULL AND email != ''"; }

  query += ' ORDER BY tier ASC, priority DESC, company ASC';
  if (filters.limit) { query += ' LIMIT ?'; params.push(filters.limit); }
  if (filters.offset) { query += ' OFFSET ?'; params.push(filters.offset); }

  return d.prepare(query).all(...params);
}

export function getContactById(id) {
  return getDb().prepare('SELECT * FROM contacts WHERE id = ?').get(id);
}

export function createContact(contact) {
  const d = getDb();
  if (contact.email) {
    const existing = d.prepare('SELECT id FROM contacts WHERE email = ?').get(contact.email);
    if (existing) return { duplicate: true, existingId: existing.id };
  }

  const stmt = d.prepare(`
    INSERT INTO contacts (name, company, job_title, recruiting_area, email, linkedin_url, phone,
      source_url, source_type, verification_status, confidence, tier, last_verified, status, notes,
      priority, category, website, email_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    contact.name, contact.company, contact.job_title, contact.recruiting_area,
    contact.email, contact.linkedin_url, contact.phone, contact.source_url,
    contact.source_type || 'manual', contact.verification_status || 'unverified',
    contact.confidence || 'low', contact.tier || 3, contact.last_verified,
    contact.status || 'active', contact.notes, contact.priority || 'Medium',
    contact.category, contact.website, contact.email_type
  );

  return { id: result.lastInsertRowid };
}

export function updateContact(id, updates) {
  const d = getDb();
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(updates)) {
    if (key !== 'id' && key !== 'created_at') { fields.push(`${key} = ?`); values.push(value); }
  }
  fields.push("updated_at = datetime('now')");
  values.push(id);
  d.prepare(`UPDATE contacts SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteContact(id) {
  getDb().prepare('DELETE FROM contacts WHERE id = ?').run(id);
}

export function getContactStats() {
  const d = getDb();
  return {
    total: d.prepare('SELECT COUNT(*) as count FROM contacts').get().count,
    withEmail: d.prepare("SELECT COUNT(*) as count FROM contacts WHERE email IS NOT NULL AND email != ''").get().count,
    verified: d.prepare("SELECT COUNT(*) as count FROM contacts WHERE verification_status = 'verified'").get().count,
    unverified: d.prepare("SELECT COUNT(*) as count FROM contacts WHERE verification_status = 'unverified'").get().count,
    tier1: d.prepare('SELECT COUNT(*) as count FROM contacts WHERE tier = 1').get().count,
    tier2: d.prepare('SELECT COUNT(*) as count FROM contacts WHERE tier = 2').get().count,
    tier3: d.prepare('SELECT COUNT(*) as count FROM contacts WHERE tier = 3').get().count,
    notContacted: d.prepare("SELECT COUNT(*) as count FROM contacts WHERE email_status = 'Not Contacted'").get().count,
    sent: d.prepare("SELECT COUNT(*) as count FROM contacts WHERE email_status = 'Sent'").get().count,
    replied: d.prepare("SELECT COUNT(*) as count FROM contacts WHERE email_status = 'Replied'").get().count,
    interested: d.prepare("SELECT COUNT(*) as count FROM contacts WHERE email_status = 'Interested'").get().count,
    drafts: d.prepare("SELECT COUNT(*) as count FROM email_log WHERE status = 'draft'").get().count,
    approved: d.prepare("SELECT COUNT(*) as count FROM email_log WHERE status = 'approved'").get().count,
    bounced: d.prepare("SELECT COUNT(*) as count FROM contacts WHERE email_status = 'Bounced'").get().count,
    doNotContact: d.prepare("SELECT COUNT(*) as count FROM contacts WHERE email_status = 'Do Not Contact'").get().count,
    followUpDue: d.prepare("SELECT COUNT(*) as count FROM contacts WHERE follow_up_date IS NOT NULL AND follow_up_date <= datetime('now')").get().count,
    byCompany: d.prepare('SELECT company, COUNT(*) as count FROM contacts WHERE company IS NOT NULL GROUP BY company ORDER BY count DESC LIMIT 20').all(),
    byStatus: d.prepare('SELECT email_status, COUNT(*) as count FROM contacts GROUP BY email_status').all(),
    sentToday: d.prepare("SELECT COUNT(*) as count FROM email_log WHERE status = 'sent' AND date(sent_at) = date('now')").get().count,
  };
}

// ─── Source Operations ───
export function getAllSources() {
  return getDb().prepare('SELECT * FROM sources ORDER BY reliability DESC, name ASC').all();
}

export function createSource(source) {
  return getDb().prepare(`
    INSERT OR IGNORE INTO sources (name, url, platform, source_type, description, relevance, reliability, recency, best_for, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(source.name, source.url, source.platform, source.source_type,
    source.description, source.relevance, source.reliability, source.recency,
    source.best_for, source.notes);
}

// ─── Template Operations ───
export function getAllTemplates() {
  return getDb().prepare('SELECT * FROM templates ORDER BY is_default DESC, name ASC').all();
}

export function getTemplateById(id) {
  return getDb().prepare('SELECT * FROM templates WHERE id = ?').get(id);
}

export function createTemplate(template) {
  const result = getDb().prepare(`
    INSERT INTO templates (name, subject, body, template_type, variables, is_default)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(template.name, template.subject, template.body,
    template.template_type || 'initial', template.variables || '', template.is_default || 0);
  return { id: result.lastInsertRowid };
}

export function updateTemplate(id, updates) {
  const d = getDb();
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(updates)) {
    if (key !== 'id' && key !== 'created_at') { fields.push(`${key} = ?`); values.push(value); }
  }
  fields.push("updated_at = datetime('now')");
  values.push(id);
  d.prepare(`UPDATE templates SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteTemplate(id) {
  getDb().prepare('DELETE FROM templates WHERE id = ?').run(id);
}

// ─── Email Log Operations ───
export function getEmailLogs(filters = {}) {
  const d = getDb();
  let query = `SELECT el.*, c.name as contact_name, c.company as contact_company, c.email as contact_email
    FROM email_log el LEFT JOIN contacts c ON el.contact_id = c.id WHERE 1=1`;
  const params = [];
  if (filters.status) { query += ' AND el.status = ?'; params.push(filters.status); }
  if (filters.contact_id) { query += ' AND el.contact_id = ?'; params.push(filters.contact_id); }
  query += ' ORDER BY el.created_at DESC';
  if (filters.limit) { query += ' LIMIT ?'; params.push(filters.limit); }
  return d.prepare(query).all(...params);
}

export function createEmailLog(log) {
  const result = getDb().prepare(`
    INSERT INTO email_log (contact_id, template_id, subject, body, status, follow_up_number, campaign_tag)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(log.contact_id, log.template_id, log.subject, log.body,
    log.status || 'draft', log.follow_up_number || 0, log.campaign_tag || null);
  return { id: result.lastInsertRowid };
}

export function updateEmailLog(id, updates) {
  const d = getDb();
  const fields = [];
  const values = [];
  for (const [key, value] of Object.entries(updates)) {
    if (key !== 'id' && key !== 'created_at') { fields.push(`${key} = ?`); values.push(value); }
  }
  values.push(id);
  d.prepare(`UPDATE email_log SET ${fields.join(', ')} WHERE id = ?`).run(...values);
}

export function deleteEmailLog(id) {
  getDb().prepare("DELETE FROM email_log WHERE id = ? AND status IN ('draft', 'approved')").run(id);
}

export function getCompaniesSummary() {
  const d = getDb();
  return d.prepare(`
    SELECT
      c.company,
      COUNT(DISTINCT c.id) as contact_count,
      COUNT(DISTINCT CASE WHEN c.email IS NOT NULL AND c.email != '' THEN c.id END) as contacts_with_email,
      COUNT(DISTINCT CASE WHEN el.status = 'draft' THEN el.id END) as drafts,
      COUNT(DISTINCT CASE WHEN el.status = 'approved' THEN el.id END) as approved,
      COUNT(DISTINCT CASE WHEN el.status = 'sent' OR el.status = 'test_sent' THEN el.id END) as sent,
      COUNT(DISTINCT CASE WHEN el.status = 'failed' THEN el.id END) as failed
    FROM contacts c
    LEFT JOIN email_log el ON el.contact_id = c.id
    WHERE c.company IS NOT NULL AND c.company != ''
    GROUP BY c.company
    ORDER BY contact_count DESC
  `).all();
}

export function getContactsByCompany(companyName) {
  if (!companyName) return [];
  return getDb().prepare(
    `SELECT * FROM contacts WHERE company = ? AND email IS NOT NULL AND email != '' ORDER BY tier ASC, name ASC`
  ).all(companyName);
}

export function getEmailLogsByCompany(companyName) {
  if (!companyName) return [];
  return getDb().prepare(`
    SELECT el.*, c.name as contact_name, c.company as contact_company, c.email as contact_email
    FROM email_log el
    JOIN contacts c ON el.contact_id = c.id
    WHERE c.company = ?
    ORDER BY el.created_at DESC
  `).all(companyName);
}

// ─── Settings Operations ───
export function getSetting(key) {
  const row = getDb().prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

export function setSetting(key, value) {
  getDb().prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, datetime('now'))
    ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now')
  `).run(key, value, value);
}

export function getAllSettings() {
  const rows = getDb().prepare('SELECT * FROM settings').all();
  const settings = {};
  for (const row of rows) {
    try { settings[row.key] = JSON.parse(row.value); }
    catch { settings[row.key] = row.value; }
  }
  return settings;
}

// ─── Company Profile Operations ───
export function getCompanyProfile(name) {
  return getDb().prepare('SELECT * FROM company_profiles WHERE name = ?').get(name);
}

export function upsertCompanyProfile(profile) {
  getDb().prepare(`
    INSERT INTO company_profiles (name, industry, tech_stack, recent_news, open_roles, internship_program, careers_url, location, size, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
      industry = COALESCE(?, industry), tech_stack = COALESCE(?, tech_stack),
      recent_news = COALESCE(?, recent_news), open_roles = COALESCE(?, open_roles),
      internship_program = COALESCE(?, internship_program), careers_url = COALESCE(?, careers_url),
      location = COALESCE(?, location), size = COALESCE(?, size), notes = COALESCE(?, notes),
      updated_at = datetime('now')
  `).run(
    profile.name, profile.industry, profile.tech_stack, profile.recent_news,
    profile.open_roles, profile.internship_program, profile.careers_url,
    profile.location, profile.size, profile.notes,
    profile.industry, profile.tech_stack, profile.recent_news, profile.open_roles,
    profile.internship_program, profile.careers_url, profile.location, profile.size, profile.notes
  );
}

export function getAllCompanyProfiles() {
  return getDb().prepare('SELECT * FROM company_profiles ORDER BY name ASC').all();
}



export function findContactsByCompany(companyName) {
  if (!companyName) return [];
  const d = getDb();
  const words = companyName.split(/\s+/).filter(w => w.length > 2);
  if (words.length === 0) return [];
  const conditions = words.map(() => 'company LIKE ?');
  const params = words.map(w => `%${w}%`);
  return d.prepare(
    `SELECT * FROM contacts WHERE (${conditions.join(' OR ')}) AND email IS NOT NULL AND email != '' ORDER BY tier ASC, priority DESC LIMIT 20`
  ).all(...params);
}
