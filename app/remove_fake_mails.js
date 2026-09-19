import Database from 'better-sqlite3';

function removeFakeMails() {
  const db = new Database('data/recruiter.db');
  
  const fakeDomains = [
    '%@gmail.com', '%@yahoo.com', '%@hotmail.com', '%@outlook.com', 
    '%@aol.com', '%@icloud.com', '%@live.com', '%@msn.com', '%@ymail.com', 
    '%@protonmail.com', '%@me.com', '%@mac.com'
  ];

  const likeClauses = fakeDomains.map(() => "email LIKE ?").join(" OR ");
  
  const countStmt = db.prepare(`SELECT count(*) as count FROM contacts WHERE ${likeClauses}`);
  const count = countStmt.get(...fakeDomains).count;

  if (count > 0) {
    // Delete any associated email logs first (due to foreign key constraint)
    const logDeleteStmt = db.prepare(`
      DELETE FROM email_log WHERE contact_id IN (
        SELECT id FROM contacts WHERE ${likeClauses}
      )
    `);
    logDeleteStmt.run(...fakeDomains);

    const deleteStmt = db.prepare(`DELETE FROM contacts WHERE ${likeClauses}`);
    deleteStmt.run(...fakeDomains);
    console.log(`Successfully removed ${count} fake/personal emails from the database.`);
  } else {
    console.log("No fake/personal email contacts found.");
  }
}

removeFakeMails();
