import path from 'path';
import Database from 'better-sqlite3';

const dbPath = path.resolve('./data/recruiter.db');
const db = new Database(dbPath);

console.log('Starting database cleanup...');

// 1. Get initial count
const initialCount = db.prepare('SELECT count(*) as count FROM contacts').get().count;
console.log(`Initial contacts: ${initialCount}`);

// 2. Remove duplicates (keep the one with the lowest ID)
const deleteDuplicatesInfo = db.prepare(`
  DELETE FROM contacts
  WHERE id NOT IN (
    SELECT MIN(id)
    FROM contacts
    GROUP BY LOWER(email)
  )
`).run();
console.log(`Deleted duplicates: ${deleteDuplicatesInfo.changes}`);
 
// 3. Remove fake/invalid domains
const fakeDomains = [
  '%@example.com', '%@test.com', '%@domain.com', '%@yourcompany.com',
  '%@company.com', '%@email.com', '%@sentry.io', '%@localhost%',
  '%.png', '%.jpg', '%.jpeg', '%.gif', '%.webp' 
];

let fakeDomainDeletes = 0;
for (const domain of fakeDomains) {
  const info = db.prepare(`DELETE FROM contacts WHERE LOWER(email) LIKE ?`).run(domain);
  fakeDomainDeletes += info.changes;
}
console.log(`Deleted fake domains: ${fakeDomainDeletes}`);

// 4. Remove generic/support emails that are NOT recruiters
// We want to keep hr@, careers@, jobs@, talent@, recruiting@
const genericPrefixes = [
  'no-reply@%', 'noreply@%', 'donotreply@%', 'admin@%', 'support@%',
  'info@%', 'contact@%', 'sales@%', 'marketing@%', 'hello@%', 'webmaster@%',
  'help@%', 'billing@%', 'press@%', 'media@%'
];

let genericDeletes = 0;
for (const prefix of genericPrefixes) {
  const info = db.prepare(`DELETE FROM contacts WHERE LOWER(email) LIKE ?`).run(prefix);
  genericDeletes += info.changes;
}
console.log(`Deleted generic/support emails: ${genericDeletes}`);

// 5. Remove any emails that don't look like valid emails (no @ symbol, spaces)
const invalidInfo = db.prepare(`
  DELETE FROM contacts 
  WHERE email NOT LIKE '%@%.%' 
  OR email LIKE '% %'
  OR email LIKE '%,%'
  OR email LIKE '%<%'
  OR email LIKE '%>%'
`).run();
console.log(`Deleted invalid email formats: ${invalidInfo.changes}`);

// 6. Get final count
const finalCount = db.prepare('SELECT count(*) as count FROM contacts').get().count;
console.log(`\nCleanup Complete!`);
console.log(`Total contacts removed: ${initialCount - finalCount}`);
console.log(`Final Contacts in Database: ${finalCount}`);
