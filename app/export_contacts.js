import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

function exportContacts() {
  const db = new Database('data/recruiter.db');
  
  const contacts = db.prepare(`
    SELECT company, name, job_title, email, email_status, linkedin_url, source_type, tier
    FROM contacts
    WHERE email IS NOT NULL AND email != ''
    ORDER BY tier ASC, company ASC, name ASC
  `).all();

  const csvRows = [];
  
  // Headers
  csvRows.push(['Tier', 'Company', 'Name', 'Job Title', 'Email', 'Email Status', 'LinkedIn', 'Source'].map(h => `"${h}"`).join(','));

  // Data
  for (const c of contacts) {
    const row = [
      c.tier || 9,
      c.company || 'Unknown',
      c.name || 'Unknown',
      c.job_title || '',
      c.email || '',
      c.email_status || 'Not Contacted',
      c.linkedin_url || '',
      c.source_type || 'Unknown'
    ].map(val => `"${String(val).replace(/"/g, '""')}"`);
    csvRows.push(row.join(','));
  }

  const outputPath = path.join(process.cwd(), '..', 'Compiled_Contacts_Database.csv');
  fs.writeFileSync(outputPath, csvRows.join('\n'), 'utf8');
  
  console.log(`Exported ${contacts.length} contacts to ${outputPath}`);
}

exportContacts();
