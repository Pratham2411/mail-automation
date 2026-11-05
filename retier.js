#!/usr/bin/env node
'use strict';

/**
 * retier.js — One-time script to re-tag every contact in the SQLite database
 * with proper tier values based on company name matching.
 *
 * Tier 1: FAANG / Quant / Top Product (₹25L+ PPO)
 * Tier 2: Top Indian Startups / Unicorns (₹12L+ PPO)
 * Tier 3: Well-Paying MNCs / IT (₹8L+ PPO)
 * Tier 99: Unmatched
 *
 * Usage: node retier.js
 */

const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = path.join(__dirname, 'data', 'recruiter.db');

// ---------------------------------------------------------------------------
// Tier keyword lists (all lowercase). Order matters: Tier 1 checked first.
// ---------------------------------------------------------------------------

const TIER_1_KEYWORDS = [
  // FAANG / Big Tech
  'google', 'meta', 'facebook', 'amazon', 'apple', 'microsoft', 'netflix',
  'nvidia', 'tesla', 'openai', 'anthropic', 'deepmind', 'palantir', 'stripe',
  'databricks', 'snowflake', 'cloudflare', 'datadog', 'confluent', 'elastic',
  'hashicorp', 'mongodb', 'twilio', 'atlassian', 'servicenow', 'workday',
  'salesforce', 'adobe', 'oracle', 'sap', 'vmware', 'intuit',
  // Ride-hailing / Delivery / Consumer (US)
  'uber', 'lyft', 'airbnb', 'doordash', 'instacart', 'snap', 'pinterest',
  'twitter', 'x corp', 'linkedin', 'github', 'figma', 'canva', 'notion',
  'airtable', 'retool', 'vercel', 'supabase', 'grafana', 'gitlab', 'jetbrains',
  'slack', 'zoom', 'dropbox', 'box', 'hubspot', 'zendesk', 'okta',
  // Cybersecurity
  'palo alto networks', 'crowdstrike', 'zscaler', 'fortinet', 'splunk',
  'dynatrace', 'new relic',
  // Hardware / Semiconductors
  'cisco', 'qualcomm', 'intel', 'amd', 'arm', 'broadcom', 'marvell',
  'samsung', 'sony', 'lg', 'panasonic', 'dell', 'hp', 'hpe', 'ibm',
  // Finance / Quant
  'goldman sachs', 'morgan stanley', 'jpmorgan', 'jp morgan', 'jane street',
  'citadel', 'two sigma', 'de shaw', 'd.e. shaw', 'tower research',
  'jump trading', 'virtu', 'akuna capital', 'optiver', 'imc', 'drw',
  'hudson river trading', 'susquehanna', 'point72', 'renaissance',
  'bridgewater', 'aqr', 'worldquant', 'balyasny', 'millennium',
];

const TIER_2_KEYWORDS = [
  // Indian E-commerce / Fintech
  'flipkart', 'myntra', 'phonepe', 'razorpay', 'cred', 'meesho', 'swiggy',
  'zomato', 'zerodha', 'groww', 'upstox', 'paytm', 'ola', 'rapido',
  // Edtech
  'byju', 'unacademy', 'vedantu',
  // SaaS / Dev Tools (India)
  'freshworks', 'zoho', 'postman', 'browserstack', 'hasura', 'druva',
  'icertis', 'highradius', 'darwinbox', 'leadsquared', 'chargebee',
  'clevertap', 'moengage', 'whatfix', 'yellowai', 'yellow.ai', 'haptik',
  // D2C / Consumer (India)
  'licious', 'bigbasket', 'dunzo', 'blinkit', 'zepto', 'nykaa', 'mamaearth',
  'boat', 'noise', 'fire-boltt', 'pepperfry', 'urban company', 'urbancompany',
  'urban ladder', 'lenskart', '1mg', 'tata 1mg', 'pharmeasy', 'practo',
  'cult.fit', 'healthifyme',
  // Gaming
  'dream11', 'dream sports', 'mpl', 'winzo', 'games24x7',
  // Fintech Infra
  'juspay', 'setu', 'm2p', 'decentro', 'perfios', 'signzy', 'bureau',
  'hyperverge',
  // B2B SaaS (India)
  'mindtickle', 'leena ai', 'sprinklr', 'gupshup', 'netcore', 'exotel',
  'eka', 'innovaccer', 'pristyn care',
  // Mobility / Auto
  'spinny', 'cars24', 'droom', 'park+', 'yulu', 'ather', 'ola electric',
  'simple energy',
  // Logistics
  'rivigo', 'delhivery', 'ecom express', 'shadowfax', 'porter', 'blackbuck',
  'loadshare',
  // B2B Commerce
  'udaan', 'infra.market', 'moglix', 'ofbusiness', 'jumbotail', 'ninjacart',
  // Neobanks / Lending
  'khatabook', 'vyapar', 'open financial', 'jupiter', 'fi', 'slice',
  'uni cards', 'fampay', 'niyo', 'epifi', 'stashfin', 'kreditbee',
  'moneyview', 'kissht', 'rupeek', 'gold rush',
  // Social / Media (India)
  'inmobi', 'glance', 'sharechat', 'moj', 'koo', 'verse innovation',
  'dailyhunt', 'pratilipi', 'pocket fm', 'stage', 'apna', 'unstop', 'hike',
  // Travel (India)
  'ixigo', 'oyo', 'treebo', 'fabhotels', 'makemytrip', 'goibibo',
  'cleartrip', 'thrillophilia',
];

const TIER_3_KEYWORDS = [
  // Indian IT Services
  'tcs', 'infosys', 'wipro', 'hcl', 'tech mahindra', 'mindtree',
  'ltimindtree', 'lti', 'mphasis', 'hexaware', 'cyient', 'persistent',
  'coforge', 'zensar', 'birlasoft', 'niit', 'mastech', 'sonata software',
  'happiest minds', 'sasken', 'l&t infotech', 'l&t technology', 'kpit',
  'tata elxsi',
  // Industrial / Manufacturing MNCs
  'siemens', 'bosch', 'honeywell', 'ge', 'schneider', 'abb', 'emerson',
  'rockwell', 'johnson controls', 'eaton', 'continental', 'zf', 'denso',
  'magna', 'aptiv', 'lear', 'valeo',
  // Indian Conglomerates
  'mahindra', 'reliance', 'tata', 'adani', 'godrej', 'aditya birla', 'bajaj',
  'hero', 'tvs', 'ashok leyland', 'larsen', 'l&t', 'jsw', 'vedanta',
  'hindalco', 'grasim', 'ultratech',
  // FMCG / Consumer (India)
  'asian paints', 'berger', 'pidilite', 'dabur', 'marico',
  'hindustan unilever', 'hul', 'itc', 'nestle', 'britannia', 'parle', 'amul',
  'haldiram', 'mtr', 'id fresh', 'country delight', 'rebel foods',
  'zomato hyperpure', 'swiggy instamart', 'grofers', 'jiomart',
  'amazon fresh', 'dunzo daily',
  // Consulting / Professional Services
  'accenture', 'deloitte', 'ey', 'ernst young', 'pwc', 'kpmg', 'mckinsey',
  'bcg', 'bain', 'capgemini', 'cognizant', 'genpact', 'concentrix',
  'teleperformance', 'atos', 'dxc', 'ntt data', 'cgi', 'epam', 'globant',
  'thoughtworks', 'publicis sapient', 'virtusa', 'syntel', 'igate', 'patni',
  'polaris',
  // Analytics / Data
  'mu sigma', 'fractal', 'tiger analytics', 'latentview', 'manthan',
  'bridgei2i', 'absyz', 'kellton', 'cuelogic', 'sigmoid', 'gramener',
  'tredence',
  // Healthcare IT
  'athenahealth', 'veeva', 'medidata', 'iqvia', 'labcorp', 'syneos',
  'parexel', 'icon plc', 'covance',
  // Others mentioned
  'subex', 'tanla', 'firstsource', 'css corp',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strip common corporate suffixes and noise from a company name so that
 * substring matching works reliably.
 */
function normalizeCompany(raw) {
  if (!raw) return '';
  let s = raw.toLowerCase().trim();

  // Remove common suffixes / noise words (order: longest phrases first)
  const suffixes = [
    'private limited', 'pvt limited', 'pvt. limited', 'pvt ltd', 'pvt. ltd.',
    'pvt. ltd', 'limited', 'ltd.', 'ltd', 'inc.', 'inc', 'corp.', 'corp',
    'corporation', 'incorporated', 'llc', 'llp', 'l.l.c.', 'l.l.p.',
    'co.', 'company', 'group', 'holdings', 'holding',
    'technologies', 'technology', 'tech', 'solutions', 'software',
    'services', 'systems', 'consulting', 'consultancy', 'enterprises',
    'global', 'international', 'worldwide',
    'india', 'india pvt', 'india private',
    '(india)', '(p)', '(opc)',
  ];

  for (const suf of suffixes) {
    // Remove suffix only at word boundaries
    const re = new RegExp(`\\b${escapeRegex(suf)}\\b`, 'gi');
    s = s.replace(re, ' ');
  }

  // Collapse whitespace and trim
  s = s.replace(/[.,\-()]/g, ' ').replace(/\s+/g, ' ').trim();
  return s;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Determine tier for a normalized company string.
 * Returns 1, 2, 3, or 99.
 *
 * We check higher tiers first so that a company appearing in multiple lists
 * (shouldn't happen, but just in case) gets the best tier.
 */
function determineTier(normalizedCompany) {
  if (!normalizedCompany) return 99;

  for (const kw of TIER_1_KEYWORDS) {
    if (normalizedCompany.includes(kw)) return 1;
  }
  for (const kw of TIER_2_KEYWORDS) {
    if (normalizedCompany.includes(kw)) return 2;
  }
  for (const kw of TIER_3_KEYWORDS) {
    if (normalizedCompany.includes(kw)) return 3;
  }
  return 99;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  console.log('='.repeat(60));
  console.log('  RETIER — Re-tagging contacts with proper tier values');
  console.log('='.repeat(60));
  console.log(`\nDatabase: ${DB_PATH}\n`);

  // Open database
  let db;
  try {
    db = new Database(DB_PATH);
  } catch (err) {
    console.error(`ERROR: Could not open database at ${DB_PATH}`);
    console.error(err.message);
    process.exit(1);
  }

  // Enable WAL for performance
  db.pragma('journal_mode = WAL');

  // ---- Before distribution ----
  const totalBefore = db.prepare('SELECT COUNT(*) AS cnt FROM contacts').get().cnt;
  console.log(`Total contacts: ${totalBefore}\n`);

  const distBefore = db.prepare(
    'SELECT tier, COUNT(*) AS cnt FROM contacts GROUP BY tier ORDER BY tier'
  ).all();
  console.log('BEFORE tier distribution:');
  for (const row of distBefore) {
    console.log(`  Tier ${String(row.tier).padStart(2)}: ${String(row.cnt).padStart(6)} contacts`);
  }
  console.log();

  // ---- Fetch all contacts ----
  const contacts = db.prepare('SELECT id, company FROM contacts').all();

  // ---- Compute new tiers ----
  const updates = []; // { id, tier }
  const tierCounts = { 1: 0, 2: 0, 3: 0, 99: 0 };
  const unmatchedSamples = []; // keep first 20 unmatched for debugging

  for (const c of contacts) {
    const norm = normalizeCompany(c.company);
    const tier = determineTier(norm);
    updates.push({ id: c.id, tier });
    tierCounts[tier] = (tierCounts[tier] || 0) + 1;

    if (tier === 99 && unmatchedSamples.length < 20) {
      unmatchedSamples.push({ raw: c.company, normalized: norm });
    }
  }

  // ---- Apply updates in a transaction ----
  console.log('Applying tier updates...');
  const updateStmt = db.prepare('UPDATE contacts SET tier = ? WHERE id = ?');

  const applyAll = db.transaction(() => {
    for (const u of updates) {
      updateStmt.run(u.tier, u.id);
    }
  });
  applyAll();

  console.log('Done!\n');

  // ---- After distribution ----
  const distAfter = db.prepare(
    'SELECT tier, COUNT(*) AS cnt FROM contacts GROUP BY tier ORDER BY tier'
  ).all();
  console.log('AFTER tier distribution:');
  for (const row of distAfter) {
    const label =
      row.tier === 1 ? 'FAANG / Quant / Top Product' :
      row.tier === 2 ? 'Top Indian Startups / Unicorns' :
      row.tier === 3 ? 'Well-Paying MNCs / IT' :
      'Unmatched';
    console.log(
      `  Tier ${String(row.tier).padStart(2)}: ${String(row.cnt).padStart(6)} contacts  (${label})`
    );
  }

  // ---- Summary ----
  console.log('\n' + '-'.repeat(60));
  console.log('Summary of changes:');
  console.log(`  Tier  1: ${tierCounts[1]} contacts`);
  console.log(`  Tier  2: ${tierCounts[2]} contacts`);
  console.log(`  Tier  3: ${tierCounts[3]} contacts`);
  console.log(`  Tier 99: ${tierCounts[99]} contacts (unmatched)`);
  console.log(`  Total  : ${updates.length} contacts processed`);

  if (unmatchedSamples.length > 0) {
    console.log(`\nSample unmatched companies (first ${unmatchedSamples.length}):`);
    for (const s of unmatchedSamples) {
      console.log(`  "${s.raw}" → normalized: "${s.normalized}"`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('  Re-tiering complete.');
  console.log('='.repeat(60));

  db.close();
}

main();
