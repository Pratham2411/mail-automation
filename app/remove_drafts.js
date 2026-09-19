import Database from 'better-sqlite3';

function removeDraftsAndComposedMails() {
  const db = new Database('data/recruiter.db');
  
  db.transaction(() => {
    // Delete all email logs (drafts, composed, sent)
    const logsResult = db.prepare(`DELETE FROM email_log`).run();
    console.log(`Deleted ${logsResult.changes} email logs (drafts and composed mails).`);

    // Reset email_status and emails_sent in contacts table
    const contactsResult = db.prepare(`
      UPDATE contacts 
      SET email_status = 'Not Contacted', 
          emails_sent = 0,
          last_contacted = NULL,
          follow_up_date = NULL,
          reply_status = NULL
      WHERE email_status != 'Not Contacted' 
         OR emails_sent > 0
         OR last_contacted IS NOT NULL
    `).run();
    console.log(`Reset status for ${contactsResult.changes} contacts back to 'Not Contacted'.`);
  })();
}

removeDraftsAndComposedMails();
