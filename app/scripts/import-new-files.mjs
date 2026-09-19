import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

const dbPath = path.resolve('./data/recruiter.db');
const db = new Database(dbPath);

const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const insert = db.prepare(`
  INSERT OR IGNORE INTO contacts (name, email, company, job_title, category, source_url, source_type, status, email_status)
  VALUES (?, ?, ?, ?, 'Tech', ?, 'pdf_txt_upload', 'active', 'Not Contacted')
`);

let added = 0;
let duplicates = 0;

function addContacts(text, sourceName) {
  const lines = text.split('\n');
  const insertMany = db.transaction((contacts) => {
    for (const c of contacts) {
      const res = insert.run(c.name, c.email, c.company, c.job_title, c.sourceName);
      if (res.changes > 0) added++;
      else duplicates++;
    }
  });

  const contactsToInsert = [];
  
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    
    // Extract emails
    const emails = line.match(emailRegex);
    if (!emails) continue;
    
    const email = emails[0].toLowerCase();
    
    // Try to guess company and name if possible
    let company = 'Unknown Company';
    let name = 'Recruiter';
    let job_title = 'HR / Recruiter';
    
    // Simple heuristic: if it looks like the txt file structure
    // Sr.No. Location HR Contact Name Designation Email Contact(Landline) Contact(Mobile)
    // Actually, we can just split by multiple spaces
    const parts = line.split(/\s{2,}/);
    if (parts.length >= 4 && !line.includes('|')) {
      // Very basic guessing based on the txt file structure
      company = parts[1]?.trim() || company;
      name = parts[3]?.trim() || name;
      job_title = parts[4]?.trim() || job_title;
    } else {
       // Just grab domain as company name
       try {
           const domain = email.split('@')[1];
           company = domain.split('.')[0];
           company = company.charAt(0).toUpperCase() + company.slice(1);
       } catch(e){}
    }

    if (name.includes('@')) name = 'Hiring Team';

    contactsToInsert.push({
      name,
      email,
      company,
      job_title,
      sourceName
    });
  }
  
  insertMany(contactsToInsert);
}

async function processFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const ext = path.extname(filePath).toLowerCase();
  console.log(`Processing ${path.basename(filePath)}...`);
  
  try {
    if (ext === '.txt') {
      const text = fs.readFileSync(filePath, 'utf8');
      addContacts(text, path.basename(filePath));
    } else if (ext === '.pdf') {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdfParse(dataBuffer);
      addContacts(data.text, path.basename(filePath));
    }
  } catch (error) {
    console.error(`Error processing ${path.basename(filePath)}:`, error.message);
  }
}

async function main() {
  const rootDir = path.resolve('..');
  const files = fs.readdirSync(rootDir);
  
  for (const file of files) {
    if (file.endsWith('.txt') || file.endsWith('.pdf')) {
      await processFile(path.join(rootDir, file));
    }
  }
  
  const total = db.prepare('SELECT count(*) as count FROM contacts').get();
  console.log(`\nImport Complete!`);
  console.log(`Newly Added: ${added}`);
  console.log(`Duplicates Skipped: ${duplicates}`);
  console.log(`Total Contacts in Database: ${total.count}`);
}

main();
