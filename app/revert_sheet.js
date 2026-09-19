import Database from 'better-sqlite3';

function revertImport() {
  const db = new Database('data/recruiter.db');

  const affectedLogs = db.prepare("SELECT contact_id FROM email_log WHERE body = 'Imported as sent from sheet.md'").all();
  const contactIds = affectedLogs.map(l => l.contact_id);

  db.transaction(() => {
    for (const id of contactIds) {
      db.prepare("UPDATE contacts SET email_status = 'Not Contacted', emails_sent = MAX(0, emails_sent - 1) WHERE id = ?").run(id);
    }
    db.prepare("DELETE FROM email_log WHERE body = 'Imported as sent from sheet.md'").run();
  })();

  console.log(`Reverted ${contactIds.length} contacts back to 'Not Contacted'.`);
}

revertImport();
