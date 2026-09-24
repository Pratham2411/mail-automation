import fs from 'fs';
import path from 'path';
import { createContact, createSource, createTemplate, setSetting, getDb } from './db.js';

export function seedDatabase() {
  const db = getDb();

  const count = db.prepare('SELECT COUNT(*) as c FROM contacts').get().c;
  if (count > 0) {
    console.log(`Database already has ${count} contacts. Skipping seed.`);
    return;
  }

  console.log('Seeding database with contacts...');

  // ─── Import from all_contacts.csv (16k+ contacts) ───
  const csvPath = path.join(process.cwd(), '..', 'data', 'all_contacts.csv');
  if (fs.existsSync(csvPath)) {
    const csvData = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvData.split('\n').filter(l => l.trim());
    let imported = 0;

    // Header: Name,Company,Job Title,Recruiting Area,Email,LinkedIn,Phone,Source Type,Verification,Confidence,Tier,Notes,Priority,Category,Website,Email Type
    const insertAll = db.transaction(() => {
      for (let i = 1; i < lines.length; i++) {
        const parts = parseCSVLine(lines[i]);
        if (parts.length < 5) continue;
        const [name, company, jobTitle, recruitingArea, email, linkedin, phone, sourceType, verification, confidence, tier, notes, priority, category, website, emailType] = parts;
        if (!email || !email.includes('@')) continue;

        createContact({
          name: (name || '').trim() || 'Unknown',
          company: (company || '').trim(),
          job_title: (jobTitle || '').trim(),
          recruiting_area: (recruitingArea || '').trim(),
          email: email.trim(),
          linkedin_url: (linkedin || '').trim() || null,
          phone: (phone || '').trim() || null,
          source_type: (sourceType || 'csv').trim(),
          verification_status: (verification || 'unverified').trim(),
          confidence: (confidence || 'medium').trim(),
          tier: parseInt(tier) || 9,
          notes: (notes || '').trim(),
          priority: (priority || 'Medium').trim(),
          category: (category || '').trim(),
          website: (website || '').trim() || null,
          email_type: (emailType || '').trim() || null,
        });
        imported++;
      }
    });

    try {
      insertAll();
      console.log(`  ✓ Imported ${imported} contacts from all_contacts.csv`);
    } catch (err) {
      console.error('  ✗ Error importing contacts:', err.message);
    }
  } else {
    // Fallback: try old emails.csv
    const fallbackPath = path.join(process.cwd(), '..', 'data', 'emails.csv');
    if (fs.existsSync(fallbackPath)) {
      const csvData = fs.readFileSync(fallbackPath, 'utf-8');
      const lines = csvData.split('\n').filter(l => l.trim());
      let imported = 0;

      const insertCsv = db.transaction(() => {
        for (let i = 1; i < lines.length; i++) {
          const parts = parseCSVLine(lines[i]);
          if (parts.length < 5) continue;
          const [num, company, website, category, generalEmail, emailType, hrName, hrTitle, hrDirectEmail, linkedIn, priority, notes] = parts;
          if (generalEmail && generalEmail.includes('@')) {
            const contactName = hrName && hrName.trim() ? hrName.trim() : `${(company || '').trim()} Team`;
            const contactEmail = hrDirectEmail && hrDirectEmail.includes('@') ? hrDirectEmail.trim() : generalEmail.trim();
            createContact({
              name: contactName, company: (company || '').trim(), job_title: (hrTitle || '').trim() || 'Contact',
              email: contactEmail, linkedin_url: linkedIn ? linkedIn.trim() : null,
              source_type: 'github_csv', verification_status: emailType === 'careers' ? 'verified' : 'unverified',
              confidence: emailType === 'careers' ? 'high' : 'medium', tier: emailType === 'careers' ? 2 : 3,
              priority: (priority || 'Medium').trim(), notes: (notes || '').trim(),
              category: (category || '').trim(), website: (website || '').trim(),
              email_type: (emailType || 'contact').trim(), recruiting_area: (category || 'General').trim(),
            });
            imported++;
          }
        }
      });

      try { insertCsv(); console.log(`  ✓ Imported ${imported} contacts from emails.csv`); }
      catch (err) { console.error('  ✗ Error importing CSV:', err.message); }
    } else {
      console.log('  ⚠ No contact CSV found. Import contacts manually via the Contacts page.');
    }
  }

  // ─── Seed research sources ───
  const sources = [
    { name: 'SimplifyJobs Summer2027-Internships', url: 'https://github.com/SimplifyJobs/Summer2027-Internships', platform: 'GitHub', source_type: 'tracker', description: 'Daily-updated SWE/AI internship postings', reliability: 'HIGH', best_for: 'Internships' },
    { name: 'SimplifyJobs New-Grad-Positions', url: 'https://github.com/SimplifyJobs/New-Grad-Positions', platform: 'GitHub', source_type: 'tracker', description: 'Entry-level SWE/PM roles', reliability: 'HIGH', best_for: 'New Grad' },
    { name: 'tracker-man/RecruiterDB', url: 'https://github.com/tracker-man/RecruiterDB', platform: 'GitHub', source_type: 'database', description: 'Historical recruiter contacts', reliability: 'MEDIUM', best_for: 'Staffing recruiters' },
    { name: 'eeshsaxena/outreach-emails', url: 'https://github.com/eeshsaxena/outreach-emails', platform: 'GitHub', source_type: 'database', description: '~400 company contacts CSV', reliability: 'MEDIUM', best_for: 'Outreach' },
    { name: 'Intern Dock', url: 'https://interndock.com/', platform: 'Web', source_type: 'aggregator', description: 'Tracks open internship programs', reliability: 'MEDIUM', best_for: 'Internship tracking' },
  ];

  const insertSources = db.transaction(() => { for (const s of sources) createSource(s); });
  insertSources();
  console.log(`  ✓ Seeded ${sources.length} research sources`);

  // ─── Seed email templates ───
  const templates = [
    { name: 'Initial Outreach — Software Engineering', subject: 'Software Engineering Opportunity — {{my_name}}', body: `Hi {{recruiter_name}},\n\nI hope this email finds you well. My name is {{my_name}}, and I'm a {{university}} student passionate about software engineering. I came across {{company}}'s work and was genuinely impressed.\n\nI have hands-on experience with {{skills}} and have built projects involving {{project}}. I'm particularly interested in {{role}} opportunities at {{company}}.\n\nI'd love to learn more about any current or upcoming positions that might be a good fit.\n\nResume: {{resume_link}}\nGitHub: {{github_link}}\nLinkedIn: {{linkedin_link}}\n\nThank you for your time,\n{{my_name}}`, template_type: 'initial', variables: 'recruiter_name,company,role,my_name,university,skills,project,resume_link,github_link,linkedin_link', is_default: 1 },
    { name: 'Internship Outreach', subject: 'Software Engineering Internship Interest — {{my_name}}', body: `Hi {{recruiter_name}},\n\nI'm {{my_name}}, a software engineering student at {{university}}. I'm reaching out because I'm very interested in internship opportunities at {{company}}.\n\nMy technical background includes {{skills}}, and I've worked on {{project}}.\n\nWould you be open to a brief conversation about the {{role}} internship program?\n\nPortfolio: {{resume_link}}\nGitHub: {{github_link}}\nLinkedIn: {{linkedin_link}}\n\nBest regards,\n{{my_name}}`, template_type: 'internship', variables: 'recruiter_name,company,role,my_name,university,skills,project,resume_link,github_link,linkedin_link', is_default: 0 },
    { name: 'Follow-up Email', subject: 'Following Up — {{my_name}} | {{company}}', body: `Hi {{recruiter_name}},\n\nI wanted to follow up on my previous email regarding {{role}} opportunities at {{company}}. I remain very interested.\n\nSince my last message, I've been working on {{project}}, further developing my skills in {{skills}}.\n\nWould you have a few minutes to chat?\n\nBest regards,\n{{my_name}}\n\nResume: {{resume_link}}\nGitHub: {{github_link}}`, template_type: 'follow_up', variables: 'recruiter_name,company,role,my_name,skills,project,resume_link,github_link', is_default: 0 },
    { name: 'Cold Email — Company Contact', subject: 'Interested in Engineering Opportunities at {{company}}', body: `Hello,\n\nMy name is {{my_name}} and I'm a software engineering student at {{university}}. I'm writing to express my interest in engineering opportunities at {{company}}.\n\nI have experience with {{skills}} and have worked on projects like {{project}}. I'm passionate about {{company}}'s work in {{category}}.\n\nCould you direct me to the right person regarding hiring?\n\nResume: {{resume_link}}\nGitHub: {{github_link}}\nLinkedIn: {{linkedin_link}}\n\nThank you,\n{{my_name}}`, template_type: 'cold_company', variables: 'company,my_name,university,skills,project,category,resume_link,github_link,linkedin_link', is_default: 0 },
  ];

  const insertTemplates = db.transaction(() => { for (const t of templates) createTemplate(t); });
  insertTemplates();
  console.log(`  ✓ Seeded ${templates.length} email templates`);

  // ─── Seed default settings ───
  const defaultSettings = {
    daily_limit: '100', batch_size: '10', delay_between_emails_ms: '5000', max_emails_per_run: '25',
    require_approval: 'true', test_mode: 'true', follow_up_days: '7', max_follow_ups: '2',
    my_name: '', my_email: '', university: '', skills: '', project: '',
    resume_link: '', github_link: '', linkedin_link: '',
    gmail_client_id: '', gmail_client_secret: '', gmail_refresh_token: '',
  };

  const insertSettings = db.transaction(() => { for (const [k, v] of Object.entries(defaultSettings)) setSetting(k, v); });
  insertSettings();
  console.log('  ✓ Seeded default settings');
  console.log('Database seeding complete! 🎉');
}

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else if (ch !== '\r') current += ch;
  }
  result.push(current.trim());
  return result;
}
