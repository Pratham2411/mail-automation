import Database from 'better-sqlite3';

function cleanupContacts() {
  const db = new Database('data/recruiter.db');
  
  let deletedCount = 0;

  db.transaction(() => {
    // 1. Missing or generic company names
    const cond1 = `company IS NULL OR trim(company) = '' OR company COLLATE NOCASE = 'Company' OR company COLLATE NOCASE = 'Unknown' OR company COLLATE NOCASE = 'N/A'`;
    db.prepare(`DELETE FROM email_log WHERE contact_id IN (SELECT id FROM contacts WHERE ${cond1})`).run();
    const companyResult = db.prepare(`DELETE FROM contacts WHERE ${cond1}`).run();
    console.log(`Deleted ${companyResult.changes} contacts with missing/generic company names.`);
    deletedCount += companyResult.changes;

    // 2. Role-based / generic emails
    const roleBasedPrefixes = [
      'info@', 'contact@', 'sales@', 'support@', 'admin@', 
      'hello@', 'hr@', 'careers@', 'jobs@', 'marketing@', 
      'team@', 'help@', 'office@', 'inquiry@', 'press@',
      'hello@', 'hi@', 'career@', 'recruitment@', 'talent@', 'billing@'
    ];
    const roleClauses = roleBasedPrefixes.map(() => "email LIKE ?").join(" OR ");
    const roleParams = roleBasedPrefixes.map(p => p + '%');
    db.prepare(`DELETE FROM email_log WHERE contact_id IN (SELECT id FROM contacts WHERE ${roleClauses})`).run(...roleParams);
    const roleResult = db.prepare(`DELETE FROM contacts WHERE ${roleClauses}`).run(...roleParams);
    console.log(`Deleted ${roleResult.changes} contacts with role-based/generic emails.`);
    deletedCount += roleResult.changes;

    // 3. Temporary/disposable emails
    const disposableDomains = [
      '%@mailinator.com', '%@guerrillamail.com', '%@10minutemail.com', 
      '%@tempmail.com', '%@yopmail.com', '%@throwawaymail.com', 
      '%@temp-mail.org', '%@fakemail.net', '%@trashmail.com'
    ];
    const dispClauses = disposableDomains.map(() => "email LIKE ?").join(" OR ");
    db.prepare(`DELETE FROM email_log WHERE contact_id IN (SELECT id FROM contacts WHERE ${dispClauses})`).run(...disposableDomains);
    const dispResult = db.prepare(`DELETE FROM contacts WHERE ${dispClauses}`).run(...disposableDomains);
    console.log(`Deleted ${dispResult.changes} contacts with disposable emails.`);
    deletedCount += dispResult.changes;

    // 4. Malformed / corrupted emails
    const cond4 = `email NOT LIKE '%@%.%' OR email LIKE '%.aipavan%' OR email LIKE '%.netrajesh%'`;
    db.prepare(`DELETE FROM email_log WHERE contact_id IN (SELECT id FROM contacts WHERE ${cond4})`).run();
    const malformedResult = db.prepare(`DELETE FROM contacts WHERE ${cond4}`).run();
    console.log(`Deleted ${malformedResult.changes} contacts with completely malformed emails.`);
    deletedCount += malformedResult.changes;

  })();

  console.log(`\nTotal fake/unusable contacts removed: ${deletedCount}`);
}

cleanupContacts();
