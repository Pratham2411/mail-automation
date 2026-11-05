# Mail Automation

Simple CLI tool to send personalized cold emails to recruiters at scale.

## Setup

```bash
npm install          # install dependencies (better-sqlite3, nodemailer)
node retier.js       # one-time: auto-rank contacts by company tier
```

## Usage

```bash
node send.js              # send next batch (25 emails)
node send.js --count 50   # send 50 instead
node send.js --dry-run    # preview next batch without sending
node send.js --status     # show campaign stats
node send.js --reset      # reset all contacts to "Not Contacted"
```

## Configuration

Edit `config.json` to set:
- **senders** — Gmail account(s) with OAuth2 credentials
- **message** — subject + body template (supports `{{name}}`, `{{company}}`, `{{resume_link}}`)
- **resume_link** — your resume URL
- **daily_limit** — max emails per day (default: 80)
- **batch_size** — emails per run (default: 25)
- **delay_min_ms / delay_max_ms** — random delay between emails (3-8 sec)

### Gmail OAuth2 Setup

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create an OAuth 2.0 Client ID (Web application)
3. Add `https://developers.google.com/oauthplayground` as an Authorized redirect URI
4. Open [OAuth Playground](https://developers.google.com/oauthplayground)
5. Use your own OAuth credentials (gear icon) → authorize `https://mail.google.com/`
6. Exchange for tokens → copy the **Refresh Token**
7. Paste Client ID, Client Secret, and Refresh Token into `config.json`

## Anti-Spam Features

- Random delays between emails (3-8 sec, not fixed)
- Batch cooldown every 25 emails (2-5 min pause)
- Daily limit (80/day default)
- Plain text only (no HTML/images/tracking pixels)
- Personalized per contact (name, company)
- Sender rotation (if multiple accounts)
- Auto-backoff on rate limits

## Auto-Prioritized Send Order

1. **Tier 1** — FAANG, Quant, Top Product companies
2. **Tier 2** — Top Indian Startups & Unicorns
3. **Tier 3** — Well-Paying MNCs & IT
4. **Untiered** — Everything else

Within each tier, contacts with real person names go before generic ones (HR, Recruiter, Team).

## Database

- `data/recruiter.db` — SQLite database with 16,000+ recruiter contacts
- `data/all_contacts.csv` — raw CSV export of all contacts
