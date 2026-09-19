import Database from 'better-sqlite3';
import fs from 'fs';

function importSheet() {
  const db = new Database('data/recruiter.db');
  const data = fs.readFileSync('../sheet.md', 'utf-8');
  const lines = data.split('\n');

  const insert = db.prepare(`
    INSERT INTO contacts (name, email, job_title, company, source_type, email_status, emails_sent, tier, priority, verification_status, confidence)
    VALUES (?, ?, ?, ?, '../sheet.md', 'Sent', 1, 2, 'Medium', 'unverified', 'medium')
  `);
  
  const checkEmail = db.prepare('SELECT id FROM contacts WHERE email = ?');
  const checkLog = db.prepare('SELECT id FROM email_log WHERE contact_id = ? AND status = ?');
  const insertLog = db.prepare(`
    INSERT INTO email_log (contact_id, template_id, subject, body, status, sent_at)
    VALUES (?, 1, 'Initial Outreach', 'Imported as sent from sheet.md', 'sent', datetime('now'))
  `);

  let imported = 0;
  let duplicates = 0;

  db.transaction(() => {
    for (const line of lines) {
      const parts = line.split('\t');
      if (parts.length >= 5 && parts[0].trim() !== 'SNo') {
        const name = parts[1]?.trim();
        const email = parts[2]?.trim();
        const title = parts[3]?.trim();
        const company = parts[4]?.trim();

        if (name && email && email.includes('@')) {
          const existing = checkEmail.get(email);
          let contactId;
          
          if (!existing) {
            const result = insert.run(name, email, title, company);
            contactId = result.lastInsertRowid;
            imported++;
          } else {
            contactId = existing.id;
            duplicates++;
            // Update existing contact to Sent if not already
            db.prepare("UPDATE contacts SET email_status = 'Sent', emails_sent = emails_sent + 1 WHERE id = ?").run(contactId);
          }
          
          // Add to email_log so it shows up in outreach page
          const existingLog = checkLog.get(contactId, 'sent');
          if (!existingLog) {
            insertLog.run(contactId);
          }
        }
      }
    }
  })();

  console.log(`Imported ${imported} new contacts. Skipped/Updated ${duplicates} duplicates.`);
}

importSheet();
