import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const dbPath = path.resolve('./data/recruiter.db');
const csvPath = path.resolve('../outreach-emails/unified_emails.csv');

if (!fs.existsSync(csvPath)) {
  console.error('File not found:', csvPath);
  process.exit(1);
}

const db = new Database(dbPath);

console.log('Reading unified_emails.csv...');
const content = fs.readFileSync(csvPath, 'utf8');
const lines = content.split('\n');

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const insert = db.prepare(`
  INSERT OR IGNORE INTO contacts (name, email, company, job_title, recruiting_area, category, source_url, source_type, notes, status, email_status)
  VALUES (?, ?, ?, ?, ?, ?, ?, 'unified_csv', ?, 'active', 'Not Contacted')
`);

let added = 0;
let skipped = 0;

const insertMany = db.transaction((rows) => {
  for (const row of rows) {
    const res = insert.run(row.name, row.email, row.company, row.title, row.category, row.location, row.source, row.notes);
    if (res.changes > 0) added++;
    else skipped++;
  }
});

const rowsToInsert = [];

// Header: Company,Email,Person,Title,Location,Source,Notes
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  // Simple CSV line parsing respecting quotes if any
  const parts = [];
  let current = '';
  let inQuotes = false;
  for (let c = 0; c < line.length; c++) {
    const char = line[c];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);

  const company = parts[0]?.trim() || '';
  let email = parts[1]?.trim().toLowerCase() || '';
  const person = parts[2]?.trim() || '';
  const title = parts[3]?.trim() || '';
  const location = parts[4]?.trim() || '';
  const source = parts[5]?.trim() || 'outreach-emails';
  const notes = parts[6]?.trim() || '';

  // Clean email
  if (email.includes(';')) email = email.split(';')[0].trim();
  if (email.includes(' ')) email = email.split(' ')[0].trim();

  // Validate email
  if (!email || !emailRegex.test(email) || email.includes('*')) {
    skipped++;
    continue;
  }

  rowsToInsert.push({
    name: person || (title ? `${title} at ${company}` : `Recruiter at ${company}`),
    email,
    company: company || 'Company',
    title: title || 'Recruiter',
    category: title || 'Tech',
    location,
    source: `unified_emails (${source})`,
    notes,
  });
}

console.log(`Parsed ${rowsToInsert.length} valid contact rows. Inserting in transaction...`);
insertMany(rowsToInsert);

const total = db.prepare('SELECT count(*) as count FROM contacts').get();
console.log(`\nImport Complete!`);
console.log(`Newly Added: ${added}`);
console.log(`Skipped (Duplicates / Invalid): ${skipped}`);
console.log(`Total Contacts in Database: ${total.count}`);
