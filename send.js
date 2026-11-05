#!/usr/bin/env node
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  send.js — Simple recruiter email blaster
//
//  Usage:
//    node send.js              Send next batch
//    node send.js --dry-run    Preview without sending
//    node send.js --status     Show campaign stats
//    node send.js --count 100  Send 100 instead of default
//    node send.js --reset      Reset all to Not Contacted
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const Database = require('better-sqlite3');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// ─── Load Config ─────────────────────────────────────
const CONFIG_PATH = path.join(__dirname, 'config.json');
if (!fs.existsSync(CONFIG_PATH)) {
  console.error('❌ config.json not found. Create it first.');
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));

// ─── Database ────────────────────────────────────────
const DB_PATH = path.join(__dirname, 'data', 'recruiter.db');
if (!fs.existsSync(DB_PATH)) {
  console.error('❌ Database not found at data/recruiter.db');
  process.exit(1);
}
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Ensure send_log table for daily tracking
db.exec(`
  CREATE TABLE IF NOT EXISTS send_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER,
    email TEXT,
    sender TEXT,
    sent_at TEXT DEFAULT (datetime('now')),
    status TEXT DEFAULT 'sent',
    error TEXT
  )
`);

// ─── Parse Args ──────────────────────────────────────
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const showStatus = args.includes('--status');
const doReset = args.includes('--reset');

let batchSize = config.batch_size || 25;
const countIdx = args.indexOf('--count');
if (countIdx !== -1 && args[countIdx + 1]) {
  batchSize = parseInt(args[countIdx + 1], 10);
}

// ─── Helpers ─────────────────────────────────────────
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (min, max) => min + Math.random() * (max - min);

const GENERIC_NAMES = new Set([
  'recruiter', 'hr', 'hiring', 'talent', 'team', 'admin', 'careers',
  'recruitment', 'human resources', 'talent acquisition', 'hiring manager',
  'hr team', 'hr department', 'people ops', 'staffing', 'hiring team',
  'university recruiting team', 'campus recruiting', '—', '-', '',
]);

function isGenericName(name) {
  if (!name) return true;
  const n = name.trim().toLowerCase();
  if (n.length < 3) return true;
  if (GENERIC_NAMES.has(n)) return true;
  // Job titles stuck in the name field
  const titleWords = [
    'senior', 'junior', 'lead', 'manager', 'director', 'head', 'chief',
    'specialist', 'coordinator', 'associate', 'partner', 'executive',
    'officer', 'analyst', 'consultant', 'advisor', 'vp', 'president',
    'recruiter', 'acquisition', 'staffing',
  ];
  if (titleWords.some((w) => n.startsWith(w + ' '))) return true;
  if (n.includes(' at ') || n.includes(' - ') || n.includes(' • ')) return true;
  return false;
}

function personalize(template, contact) {
  let firstName = 'Hiring Team';
  if (contact.name && !isGenericName(contact.name)) {
    firstName = contact.name.split(' ')[0];
    // Capitalize properly
    firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  }
  return template
    .replace(/\{\{name\}\}/g, firstName)
    .replace(/\{\{full_name\}\}/g, contact.name || 'Hiring Team')
    .replace(/\{\{company\}\}/g, contact.company || 'your company')
    .replace(/\{\{resume_link\}\}/g, config.resume_link || '');
}

function tierLabel(tier) {
  if (tier === 1) return '🏆 T1';
  if (tier === 2) return '🚀 T2';
  if (tier === 3) return '🏢 T3';
  return '   --';
}

// ─── Status Report ───────────────────────────────────
function printStatus() {
  const total = db.prepare('SELECT count(*) as c FROM contacts').get().c;
  const withEmail = db
    .prepare(
      "SELECT count(*) as c FROM contacts WHERE email IS NOT NULL AND email != ''"
    )
    .get().c;
  const sent = db
    .prepare("SELECT count(*) as c FROM contacts WHERE email_status = 'Sent'")
    .get().c;
  const remaining = db
    .prepare(
      "SELECT count(*) as c FROM contacts WHERE email_status = 'Not Contacted' AND email IS NOT NULL AND email != ''"
    )
    .get().c;

  const t1 = db
    .prepare(
      "SELECT count(*) as c FROM contacts WHERE email_status = 'Not Contacted' AND tier = 1 AND email IS NOT NULL AND email != ''"
    )
    .get().c;
  const t2 = db
    .prepare(
      "SELECT count(*) as c FROM contacts WHERE email_status = 'Not Contacted' AND tier = 2 AND email IS NOT NULL AND email != ''"
    )
    .get().c;
  const t3 = db
    .prepare(
      "SELECT count(*) as c FROM contacts WHERE email_status = 'Not Contacted' AND tier = 3 AND email IS NOT NULL AND email != ''"
    )
    .get().c;
  const untiered = db
    .prepare(
      "SELECT count(*) as c FROM contacts WHERE email_status = 'Not Contacted' AND (tier IS NULL OR tier > 3) AND email IS NOT NULL AND email != ''"
    )
    .get().c;

  const todaySent = db
    .prepare(
      "SELECT count(*) as c FROM send_log WHERE date(sent_at) = date('now')"
    )
    .get().c;

  console.log('');
  console.log('📊  Campaign Status');
  console.log('═'.repeat(50));
  console.log(`  Total contacts:         ${total.toLocaleString()}`);
  console.log(`  With email:             ${withEmail.toLocaleString()}`);
  console.log(
    `  Already sent:           ${sent.toLocaleString()}  (${((sent / withEmail) * 100).toFixed(1)}%)`
  );
  console.log(`  Remaining:              ${remaining.toLocaleString()}`);
  console.log('─'.repeat(50));
  console.log(`  🏆 Tier 1 (FAANG) left: ${t1}`);
  console.log(`  🚀 Tier 2 (Startups):   ${t2}`);
  console.log(`  🏢 Tier 3 (MNCs):       ${t3}`);
  console.log(`     Untiered:            ${untiered}`);
  console.log('─'.repeat(50));
  console.log(
    `  Sent today:             ${todaySent} / ${config.daily_limit || 80}`
  );
  console.log('');
}

// ─── Reset ───────────────────────────────────────────
function resetAll() {
  db.prepare(
    "UPDATE contacts SET email_status = 'Not Contacted', emails_sent = 0, last_contacted = NULL"
  ).run();
  db.prepare('DELETE FROM send_log').run();
  console.log('🔄  All contacts reset to "Not Contacted".');
}

// ─── Create Gmail Transporter ────────────────────────
function createTransporter(sender) {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: sender.email,
      clientId: sender.client_id,
      clientSecret: sender.client_secret,
      refreshToken: sender.refresh_token,
    },
  });
}

// ─── Verify Sender Credentials ──────────────────────
async function verifySenders() {
  for (const sender of config.senders) {
    if (
      !sender.refresh_token ||
      sender.refresh_token === 'PASTE_NEW_REFRESH_TOKEN_HERE'
    ) {
      console.error(
        `\n❌ Refresh token not set for ${sender.email}.\n   Open config.json and paste your token into "refresh_token".\n   Get one at: https://developers.google.com/oauthplayground\n`
      );
      process.exit(1);
    }

    try {
      const t = createTransporter(sender);
      await t.verify();
      console.log(`  ✅ ${sender.email} — connected`);
    } catch (err) {
      console.error(
        `\n❌ ${sender.email} failed: ${err.message}\n   Your refresh token may have expired. Regenerate it at:\n   https://developers.google.com/oauthplayground\n`
      );
      process.exit(1);
    }
  }
}

// ─── Main Send ───────────────────────────────────────
async function sendBatch() {
  const dailyLimit = config.daily_limit || 80;
  const todaySent = db
    .prepare(
      "SELECT count(*) as c FROM send_log WHERE date(sent_at) = date('now')"
    )
    .get().c;
  const budgetLeft = dailyLimit - todaySent;

  if (budgetLeft <= 0) {
    console.log(
      `\n⚠️  Daily limit reached (${dailyLimit}). Try again tomorrow.`
    );
    printStatus();
    return;
  }

  const actualBatch = Math.min(batchSize, budgetLeft);

  // Priority query: tier 1 → 2 → 3 → rest, real names first
  const contacts = db
    .prepare(
      `
    SELECT id, name, email, company, tier
    FROM contacts
    WHERE email_status = 'Not Contacted'
      AND email IS NOT NULL AND email != ''
      AND email NOT LIKE '%noreply%'
      AND email NOT LIKE '%no-reply%'
      AND email NOT LIKE '%example.com%'
      AND email NOT LIKE '%test@%'
      AND email NOT LIKE '%unsubscribe%'
    ORDER BY
      CASE
        WHEN tier = 1 THEN 1
        WHEN tier = 2 THEN 2
        WHEN tier = 3 THEN 3
        ELSE 4
      END ASC,
      CASE
        WHEN LOWER(TRIM(name)) IN ('recruiter','hr','hiring','team','talent','admin','careers','recruitment','human resources','hiring team','—','-','')
        THEN 1 ELSE 0
      END ASC,
      company ASC
    LIMIT ?
  `
    )
    .all(actualBatch);

  if (contacts.length === 0) {
    console.log('\n✅  All contacts have been emailed!');
    printStatus();
    return;
  }

  console.log(`\n📧  Sending ${contacts.length} emails...`);
  if (isDryRun) {
    console.log('🧪  DRY RUN — no emails will actually be sent\n');
  } else {
    console.log('🔐  Verifying sender credentials...');
    await verifySenders();
    console.log('');
  }

  const senders = config.senders || [];
  if (senders.length === 0) {
    console.error('❌  No senders configured in config.json');
    return;
  }

  // Create transporters for live sends
  const transporters = senders.map((s) => ({
    sender: s,
    transporter: isDryRun ? null : createTransporter(s),
  }));

  let sentCount = 0;
  let errorCount = 0;
  const cooldownInterval = config.cooldown_interval || 25;

  const updateContact = db.prepare(`
    UPDATE contacts
    SET email_status = 'Sent',
        emails_sent = COALESCE(emails_sent, 0) + 1,
        last_contacted = datetime('now')
    WHERE id = ?
  `);
  const insertLog = db.prepare(`
    INSERT INTO send_log (contact_id, email, sender, status, error)
    VALUES (?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const { sender, transporter } = transporters[i % transporters.length];

    const subject = personalize(config.message.subject, contact);
    const body = personalize(config.message.body, contact);
    const tl = tierLabel(contact.tier);

    if (isDryRun) {
      console.log(
        `  ${tl}  ${contact.email.padEnd(40)} ${(contact.company || '?').padEnd(25)} ${contact.name || ''}`
      );
      sentCount++;
      continue;
    }

    try {
      await transporter.sendMail({
        from: `"${sender.name}" <${sender.email}>`,
        replyTo: sender.email,
        to: contact.email,
        subject,
        text: body, // Plain text only — best deliverability
      });

      updateContact.run(contact.id);
      insertLog.run(contact.id, contact.email, sender.email, 'sent', null);
      sentCount++;

      const progress = `[${i + 1}/${contacts.length}]`;
      console.log(
        `  ✅ ${progress.padEnd(10)} ${tl}  ${contact.email.padEnd(40)} ${contact.company || ''}`
      );
    } catch (err) {
      errorCount++;
      insertLog.run(
        contact.id,
        contact.email,
        sender.email,
        'error',
        err.message
      );

      // Mark as sent anyway to avoid retrying bad addresses forever
      updateContact.run(contact.id);

      console.log(
        `  ❌ [${i + 1}/${contacts.length}]  ${contact.email} — ${err.message.substring(0, 60)}`
      );

      // Rate limit → back off hard
      if (
        err.message.includes('rate') ||
        err.message.includes('limit') ||
        err.message.includes('too many') ||
        err.responseCode === 429
      ) {
        const backoff = 5 * 60 * 1000; // 5 minutes
        console.log('  ⏸️  Rate limited! Backing off 5 minutes...');
        await sleep(backoff);
      }

      // Auth error → stop
      if (
        err.message.includes('invalid_grant') ||
        err.message.includes('Invalid credentials') ||
        err.responseCode === 535
      ) {
        console.error(
          '\n❌  Authentication failed. Refresh token may be expired.'
        );
        console.error(
          '   Regenerate at: https://developers.google.com/oauthplayground\n'
        );
        break;
      }
    }

    // Delay between emails
    if (i < contacts.length - 1) {
      const delayMin = config.delay_min_ms || 3000;
      const delayMax = config.delay_max_ms || 8000;
      const delay = rand(delayMin, delayMax);

      // Batch cooldown every N emails
      if ((i + 1) % cooldownInterval === 0) {
        const coolMin = config.cooldown_min_ms || 120000;
        const coolMax = config.cooldown_max_ms || 300000;
        const cooldown = rand(coolMin, coolMax);
        const mins = (cooldown / 60000).toFixed(1);
        console.log(`\n  ⏸️  Cooldown: ${mins} min ...\n`);
        await sleep(cooldown);
      } else {
        await sleep(delay);
      }
    }
  }

  // Summary
  console.log('');
  console.log('═'.repeat(50));
  if (isDryRun) {
    console.log(`🧪  DRY RUN preview of ${sentCount} emails above`);
    console.log(`    Run without --dry-run to actually send.`);
  } else {
    console.log(`✅  Sent: ${sentCount}   ❌ Errors: ${errorCount}`);
  }
  printStatus();
}

// ─── Entrypoint ──────────────────────────────────────
if (showStatus) {
  printStatus();
} else if (doReset) {
  resetAll();
  printStatus();
} else {
  sendBatch().catch((err) => {
    console.error('\n💀  Fatal error:', err.message);
    process.exit(1);
  });
}

