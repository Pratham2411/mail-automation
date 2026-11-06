#!/usr/bin/env node
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  send.js — Multi-Account Recruiter Email Blaster (Anti-Spam Edition)
//
//  Features:
//    • Multi-account rotation with per-sender daily quotas (80/account)
//    • Rotates 5 distinct email templates & varied subject lines
//    • Dynamic greetings & name capitalization (prevents bulk hash matching)
//    • Verified sender-matching Reply-To (prevents DMARC/anti-spoofing flags)
//    • Humanized delays (15–35s) + micro-pauses (30–60s) + batch cooldowns
//    • Local-time midnight quota resets
//
//  Usage:
//    node send.js                Send next batch (rotates active accounts & templates)
//    node send.js --from 1       Send specifically from Account 1
//    node send.js --from 2       Send specifically from Account 2
//    node send.js --from <email> Send specifically from matching email
//    node send.js --accounts     List accounts & today's quotas
//    node send.js --status       Show full campaign & account status
//    node send.js --dry-run      Preview next batch without sending
//    node send.js --count 50     Send 50 instead of default batch
//    node send.js --reset-daily  Reset today's sent count back to 0
//    node send.js --fast         Shorter delays (for quick test runs)
//    node send.js --reset        Reset ALL contacts back to "Not Contacted"
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
    template_id INTEGER,
    subject TEXT,
    sent_at TEXT DEFAULT (datetime('now')),
    status TEXT DEFAULT 'sent',
    error TEXT
  )
`);
try { db.exec('ALTER TABLE send_log ADD COLUMN template_id INTEGER'); } catch (_) {}
try { db.exec('ALTER TABLE send_log ADD COLUMN subject TEXT'); } catch (_) {}

// ─── Parse Args ──────────────────────────────────────
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const showStatus = args.includes('--status');
const showAccounts = args.includes('--accounts');
const doReset = args.includes('--reset');
const doResetDaily = args.includes('--reset-daily') || args.includes('--reset-today');
const isFastMode = args.includes('--fast');
const corporateOnly = args.includes('--corporate-only');

let batchSize = config.batch_size || 25;
const countIdx = args.indexOf('--count');
if (countIdx !== -1 && args[countIdx + 1]) {
  batchSize = parseInt(args[countIdx + 1], 10);
}

let targetSenderArg = null;
const fromIdx = args.indexOf('--from');
if (fromIdx !== -1 && args[fromIdx + 1]) {
  targetSenderArg = args[fromIdx + 1].trim();
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

function cleanCompanyName(raw) {
  if (!raw) return '';
  let s = raw.trim();
  s = s.replace(/^[-–—•\s]+/, '');
  s = s.replace(/\s+(pvt\.?\s*ltd\.?|private\s*limited|ltd\.?|inc\.?|llc|technologies|solutions|corporation|corp\.?)$/i, '');
  return s.trim();
}

const GREETINGS_NAMED = [
  (name) => `Hi ${name},`,
  (name) => `Hello ${name},`,
  (name) => `Dear ${name},`,
];

const GREETINGS_GENERIC = [
  (comp) => `Hi Hiring Team,`,
  (comp) => `Hello ${comp ? comp + ' Team' : 'Hiring Team'},`,
  (comp) => `Dear Hiring Manager,`,
  (comp) => `Hi there,`,
];

function generateGreeting(contact) {
  const comp = cleanCompanyName(contact.company);
  if (contact.name && !isGenericName(contact.name)) {
    let fn = contact.name.trim().split(' ')[0];
    fn = fn.charAt(0).toUpperCase() + fn.slice(1).toLowerCase();
    const gFn = GREETINGS_NAMED[Math.floor(Math.random() * GREETINGS_NAMED.length)];
    return gFn(fn);
  }
  const gGen = GREETINGS_GENERIC[Math.floor(Math.random() * GREETINGS_GENERIC.length)];
  return gGen(comp);
}

function getSubject(contact, templateIdx) {
  const defaultSubjects = [
    'Application for SDE Intern — Pratham Raj | NIT Patna',
    'Software Engineering Internship Inquiry — Pratham Raj (NIT Patna)',
    'Exploring SDE Internship / Fresher Opportunities — Pratham Raj',
    'SDE Intern Role Inquiry — Pratham Raj, NIT Patna \'27',
    'Application: Software Engineer Intern — Pratham Raj',
    'NIT Patna 2027 — SDE Internship Application | Pratham Raj'
  ];
  const pool = (config.subjects && config.subjects.length > 0) ? config.subjects : defaultSubjects;
  const picked = pool[templateIdx % pool.length];
  const comp = cleanCompanyName(contact.company);
  return picked.replace(/\{\{company\}\}/g, comp || 'your company');
}

function getTemplates() {
  if (Array.isArray(config.templates) && config.templates.length > 0) {
    return config.templates;
  }
  if (config.message && config.message.body) {
    return [{ id: 1, name: 'Default', body: config.message.body }];
  }
  throw new Error('No templates found in config.json');
}

function personalize(templateBody, contact, sender) {
  const comp = cleanCompanyName(contact.company) || 'your organization';
  const greeting = generateGreeting(contact);
  let firstName = 'Hiring Team';
  if (contact.name && !isGenericName(contact.name)) {
    firstName = contact.name.trim().split(' ')[0];
    firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  }

  return templateBody
    .replace(/\{\{greeting\}\}/g, greeting)
    .replace(/\{\{name\}\}/g, firstName)
    .replace(/\{\{full_name\}\}/g, contact.name || 'Hiring Team')
    .replace(/\{\{company\}\}/g, comp)
    .replace(/\{\{resume_link\}\}/g, config.resume_link || '')
    .replace(/\{\{portfolio_link\}\}/g, config.portfolio_link || 'https://pratham2411.online')
    .replace(/\{\{github_link\}\}/g, config.github_link || 'https://github.com/Pratham2411')
    .replace(/\{\{linkedin_link\}\}/g, config.linkedin_link || 'https://linkedin.com/in/prathamraj2411')
    .replace(/\{\{phone\}\}/g, config.phone || '7808519486')
    .replace(/\{\{sender_email\}\}/g, sender.email);
}

function tierLabel(tier) {
  if (tier === 1) return '🏆 T1';
  if (tier === 2) return '🚀 T2';
  if (tier === 3) return '🏢 T3';
  return '   --';
}

function getSenderSentToday(email) {
  return db
    .prepare(
      "SELECT count(*) as c FROM send_log WHERE date(sent_at, 'localtime') = date('now', 'localtime') AND LOWER(sender) = LOWER(?) AND status = 'sent'"
    )
    .get(email).c;
}

function isSenderConfigured(s) {
  return (
    s &&
    s.email &&
    !s.email.includes('account3') &&
    !s.email.includes('account4') &&
    s.refresh_token &&
    !s.refresh_token.startsWith('PASTE_') &&
    s.enabled !== false
  );
}

// ─── Accounts List / Status ──────────────────────────
function listAccounts() {
  const allSenders = config.senders || [];
  const limit = config.daily_limit || 80;

  console.log('\n📬  Configured Sender Accounts');
  console.log('═'.repeat(60));

  allSenders.forEach((s, idx) => {
    const id = s.id || idx + 1;
    const configured = isSenderConfigured(s);
    if (!configured) {
      console.log(`  [${id}] ${s.email.padEnd(30)} ⏸️  (Not configured / disabled)`);
      return;
    }

    const sentToday = getSenderSentToday(s.email);
    const left = Math.max(0, limit - sentToday);
    const statusText = left === 0 ? '🔴 Quota reached (80/80)' : `🟢 Active (${left} remaining)`;

    console.log(
      `  [${id}] ${s.email.padEnd(30)} ${String(sentToday).padStart(2)}/${limit} sent today  ${statusText}`
    );
  });

  console.log('─'.repeat(60));
  console.log('💡  Tips:');
  console.log('  • Send using all available accounts: node send.js');
  console.log('  • Send specifically from Account 2:  node send.js --from 2');
  console.log('  • Reset today\'s counter to 0:        node send.js --reset-daily\n');
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

  const limitPerSender = config.daily_limit || 80;

  console.log('');
  console.log('📊  Campaign Status');
  console.log('═'.repeat(60));
  console.log(`  Total contacts:         ${total.toLocaleString()}`);
  console.log(`  With email:             ${withEmail.toLocaleString()}`);
  console.log(
    `  Already sent:           ${sent.toLocaleString()}  (${((sent / withEmail) * 100).toFixed(1)}%)`
  );
  console.log(`  Remaining:              ${remaining.toLocaleString()}`);
  console.log('─'.repeat(60));
  console.log(`  🏆 Tier 1 (FAANG) left: ${t1.toLocaleString()}`);
  console.log(`  🚀 Tier 2 (Startups):   ${t2.toLocaleString()}`);
  console.log(`  🏢 Tier 3 (MNCs):       ${t3.toLocaleString()}`);
  console.log(`     Untiered:            ${untiered.toLocaleString()}`);
  console.log('─'.repeat(60));
  console.log('  📬  Today\'s Quota by Account:');

  let totalSentToday = 0;
  let totalQuotaAvailable = 0;

  (config.senders || []).forEach((s, idx) => {
    const id = s.id || idx + 1;
    if (!isSenderConfigured(s)) {
      console.log(`    [${id}] ${s.email.padEnd(30)} (Not configured)`);
      return;
    }
    const count = getSenderSentToday(s.email);
    totalSentToday += count;
    totalQuotaAvailable += limitPerSender;
    const left = Math.max(0, limitPerSender - count);
    const badge = left === 0 ? '🔴 full' : `🟢 ${left} left`;
    console.log(`    [${id}] ${s.email.padEnd(30)} ${String(count).padStart(2)} / ${limitPerSender}  (${badge})`);
  });

  const totalLeft = Math.max(0, totalQuotaAvailable - totalSentToday);
  console.log('─'.repeat(60));
  console.log(`  Total sent today:       ${totalSentToday} / ${totalQuotaAvailable} (${totalLeft} remaining)`);
  console.log(`  Templates in rotation:  ${getTemplates().length} distinct templates`);
  console.log('');
}

// ─── Reset Functions ─────────────────────────────────
function resetDaily() {
  const res = db
    .prepare("DELETE FROM send_log WHERE date(sent_at, 'localtime') = date('now', 'localtime')")
    .run();
  console.log(`\n🔄 Reset today's sent counter to 0 (${res.changes} logs cleared).`);
  console.log('All configured email accounts can now send their full 80 quota again today!\n');
  listAccounts();
}

function resetAll() {
  db.prepare(
    "UPDATE contacts SET email_status = 'Not Contacted', emails_sent = 0, last_contacted = NULL"
  ).run();
  db.prepare('DELETE FROM send_log').run();
  console.log('🔄 All contacts reset to "Not Contacted".');
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

// ─── Verify Senders ──────────────────────────────────
async function verifySenders(sendersToVerify) {
  for (const sender of sendersToVerify) {
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
  const limitPerSender = config.daily_limit || 80;
  const allSenders = (config.senders || []).filter(isSenderConfigured);
  const templates = getTemplates();

  if (allSenders.length === 0) {
    console.error('❌ No active sender accounts configured in config.json.');
    process.exit(1);
  }

  // Filter by --from argument if specified
  let selectedSenders = allSenders;
  if (targetSenderArg) {
    const isNum = !isNaN(parseInt(targetSenderArg, 10));
    if (isNum) {
      const targetId = parseInt(targetSenderArg, 10);
      selectedSenders = allSenders.filter((s, idx) => (s.id === targetId || idx + 1 === targetId));
    } else {
      selectedSenders = allSenders.filter((s) =>
        s.email.toLowerCase().includes(targetSenderArg.toLowerCase())
      );
    }

    if (selectedSenders.length === 0) {
      console.error(`❌ No configured account found matching '--from ${targetSenderArg}'.`);
      listAccounts();
      process.exit(1);
    }
  }

  // Determine which senders still have quota today
  const activeSenders = selectedSenders
    .map((s) => {
      const sentToday = getSenderSentToday(s.email);
      const quotaLeft = Math.max(0, limitPerSender - sentToday);
      return { sender: s, sentToday, quotaLeft };
    })
    .filter((item) => item.quotaLeft > 0);

  if (activeSenders.length === 0) {
    console.log(`\n⚠️  Daily limit reached (${limitPerSender}/account) for selected account(s).`);
    listAccounts();
    console.log('👉 To send more:');
    console.log('   1. Switch to a different account: node send.js --from <id>');
    console.log('   2. Or reset today\'s count to 0:    node send.js --reset-daily\n');
    return;
  }

  // Total budget available from active senders
  const totalBudgetLeft = activeSenders.reduce((sum, item) => sum + item.quotaLeft, 0);
  const actualBatch = Math.min(batchSize, totalBudgetLeft);

  let query = `
    SELECT id, name, email, company, tier
    FROM contacts
    WHERE email_status = 'Not Contacted'
      AND email IS NOT NULL AND email != ''
      AND email NOT LIKE '%noreply%'
      AND email NOT LIKE '%no-reply%'
      AND email NOT LIKE '%example.com%'
      AND email NOT LIKE '%test@%'
      AND email NOT LIKE '%unsubscribe%'
  `;

  if (corporateOnly) {
    query += `
      AND email NOT LIKE '%@gmail.com'
      AND email NOT LIKE '%@yahoo.com%'
      AND email NOT LIKE '%@rediffmail.com'
      AND email NOT LIKE '%@hotmail.com'
      AND email NOT LIKE '%@outlook.com'
    `;
  }

  query += `
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
  `;

  const contacts = db.prepare(query).all(actualBatch);

  if (contacts.length === 0) {
    console.log('\n✅ All contacts matching your filter have been emailed!');
    printStatus();
    return;
  }

  console.log(`\n📧  Sending batch of ${contacts.length} emails...`);
  console.log(`    Active sender account(s): ${activeSenders.map((a) => a.sender.email).join(', ')}`);
  console.log(`    Template pool:            ${templates.length} rotating templates`);
  console.log(`    Anti-spam protection:     Humanized pacing + Sender-matching Reply-To`);

  if (isDryRun) {
    console.log('\n🧪  DRY RUN — previewing rotated emails (no actual sends):\n');
  } else {
    console.log('\n🔐  Verifying sender credentials...');
    await verifySenders(activeSenders.map((a) => a.sender));
    console.log('');
  }

  // Pre-create transporters for active senders
  const transporterMap = new Map();
  if (!isDryRun) {
    for (const a of activeSenders) {
      transporterMap.set(a.sender.email, createTransporter(a.sender));
    }
  }

  let sentCount = 0;
  let errorCount = 0;

  // Anti-spam timing settings
  const delayMin = isFastMode ? 3000 : (config.delay_min_ms || 15000);
  const delayMax = isFastMode ? 6000 : (config.delay_max_ms || 35000);
  const microPauseInterval = config.micro_pause_interval || 6;
  const microPauseMin = isFastMode ? 5000 : (config.micro_pause_min_ms || 30000);
  const microPauseMax = isFastMode ? 10000 : (config.micro_pause_max_ms || 60000);
  const cooldownInterval = config.cooldown_interval || 20;

  const updateContact = db.prepare(`
    UPDATE contacts
    SET email_status = 'Sent',
        emails_sent = COALESCE(emails_sent, 0) + 1,
        last_contacted = datetime('now')
    WHERE id = ?
  `);
  const insertLog = db.prepare(`
    INSERT INTO send_log (contact_id, email, sender, template_id, subject, status, error)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  // Active pool of senders that have quota
  const pool = [...activeSenders];
  let poolIdx = 0;

  for (let i = 0; i < contacts.length; i++) {
    if (pool.length === 0) {
      console.log('\n⚠️  All active sender accounts have reached their daily limit.');
      break;
    }

    const currentSenderItem = pool[poolIdx % pool.length];
    const sender = currentSenderItem.sender;
    const transporter = isDryRun ? null : transporterMap.get(sender.email);

    const contact = contacts[i];

    // Pick template in rotation
    const templateIdx = i % templates.length;
    const template = templates[templateIdx];

    const subject = getSubject(contact, i);
    const body = personalize(template.body, contact, sender);
    const tl = tierLabel(contact.tier);

    // ANTI-SPAM RULE: Never spoof Reply-To with a mismatched @gmail.com
    // Use sender.email as reply-to unless user explicitly forced a custom address
    const replyTo = (config.reply_to && config.reply_to !== 'sender')
      ? config.reply_to
      : sender.email;

    if (isDryRun) {
      const templateLabel = `Tpl #${template.id || templateIdx + 1}`;
      console.log(
        `  ${tl}  [${templateLabel}] [via ${sender.email.split('@')[0]}] -> ${contact.email.padEnd(34)} ${(contact.company || '?').padEnd(20)}`
      );
      console.log(`        Subj: "${subject}"`);
      console.log(`        Opening: "${body.split('\n')[0]}"`);
      console.log('');
      sentCount++;
      poolIdx++;
      continue;
    }

    try {
      await transporter.sendMail({
        from: `"${sender.name}" <${sender.email}>`,
        replyTo: replyTo,
        to: contact.email,
        subject,
        text: body, // Plain text only — best deliverability
        headers: {
          'X-Priority': '3',
          'Importance': 'normal',
        },
      });

      updateContact.run(contact.id);
      insertLog.run(contact.id, contact.email, sender.email, template.id || templateIdx + 1, subject, 'sent', null);
      sentCount++;

      // Decrement sender's quota
      currentSenderItem.quotaLeft--;
      if (currentSenderItem.quotaLeft <= 0) {
        console.log(`  ℹ️  ${sender.email} reached daily limit (${limitPerSender}). Switching accounts...`);
        pool.splice(poolIdx % pool.length, 1);
      } else {
        poolIdx++;
      }

      const progress = `[${i + 1}/${contacts.length}]`;
      const templateTag = `Tpl #${template.id || templateIdx + 1}`;
      console.log(
        `  ✅ ${progress.padEnd(9)} ${tl} [${templateTag}] [via ${sender.email.split('@')[0]}] ${contact.email.padEnd(34)} ${contact.company || ''}`
      );
    } catch (err) {
      errorCount++;
      insertLog.run(
        contact.id,
        contact.email,
        sender.email,
        template.id || templateIdx + 1,
        subject,
        'error',
        err.message
      );

      // Mark contact as sent anyway to avoid infinite retry loops on bad addresses
      updateContact.run(contact.id);

      console.log(
        `  ❌ [${i + 1}/${contacts.length}]  ${contact.email} — ${err.message.substring(0, 60)}`
      );

      // Rate limit backoff
      if (
        err.message.includes('rate') ||
        err.message.includes('limit') ||
        err.message.includes('too many') ||
        err.responseCode === 429
      ) {
        const backoff = 5 * 60 * 1000;
        console.log('  ⏸️  Rate limit detected! Backing off for 5 minutes...');
        await sleep(backoff);
      }

      // Authentication failure
      if (
        err.message.includes('invalid_grant') ||
        err.message.includes('Invalid credentials') ||
        err.responseCode === 535
      ) {
        console.error(
          `\n❌ Authentication failed for ${sender.email}. Removing from active pool.`
        );
        pool.splice(poolIdx % pool.length, 1);
      } else {
        poolIdx++;
      }
    }

    // Delay between emails (Anti-spam pacing)
    if (i < contacts.length - 1 && pool.length > 0) {
      const delay = rand(delayMin, delayMax);

      // Major cooldown pause every N emails
      if ((i + 1) % cooldownInterval === 0) {
        const coolMin = isFastMode ? 10000 : (config.cooldown_min_ms || 180000);
        const coolMax = isFastMode ? 15000 : (config.cooldown_max_ms || 360000);
        const cooldown = rand(coolMin, coolMax);
        const mins = (cooldown / 60000).toFixed(1);
        console.log(`\n  ⏸️  Batch cooldown pause: ${mins} min ...\n`);
        await sleep(cooldown);
      }
      // Micro-pause every M emails (mimics human reading between emails)
      else if ((i + 1) % microPauseInterval === 0) {
        const micro = rand(microPauseMin, microPauseMax);
        const secs = Math.round(micro / 1000);
        console.log(`  ⏸️  Micro-pause (human pacing): ${secs}s...`);
        await sleep(micro);
      }
      // Normal randomized interval
      else {
        await sleep(delay);
      }
    }
  }

  // Summary
  console.log('');
  console.log('═'.repeat(60));
  if (isDryRun) {
    console.log(`🧪  DRY RUN preview of ${sentCount} emails completed.`);
    console.log(`    Run without --dry-run to actually send.`);
  } else {
    console.log(`✅  Sent: ${sentCount}   ❌ Errors: ${errorCount}`);
  }
  printStatus();
}

// ─── Entrypoint ──────────────────────────────────────
if (showAccounts) {
  listAccounts();
} else if (showStatus) {
  printStatus();
} else if (doResetDaily) {
  resetDaily();
} else if (doReset) {
  resetAll();
  printStatus();
} else {
  sendBatch().catch((err) => {
    console.error('\n💀 Fatal error:', err.message);
    process.exit(1);
  });
}
