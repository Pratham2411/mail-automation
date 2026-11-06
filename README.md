# Mail Automation

Simple, high-deliverability CLI tool to send personalized cold emails to 16,000+ recruiters.

---

## ⚡ Quick Start

```bash
node send.js            # Send next batch (auto-rotates accounts & templates)
node send.js --accounts # Check your sender accounts & today's quotas
node send.js --status   # Check overall campaign progress
node send.js --dry-run  # Preview upcoming emails without sending
```

---

## 📋 All Commands Reference

| Command | Description |
|---|---|
| `node send.js` | Send next batch (25 emails). Auto-rotates accounts and templates. |
| `node send.js --from 1` | Send specifically from **Account 1** |
| `node send.js --from 2` | Send specifically from **Account 2** |
| `node send.js --from <email>` | Send specifically from a matching email address |
| `node send.js --count 50` | Send custom batch size (e.g., 50 emails in one run) |
| `node send.js --accounts` | Display all configured accounts and remaining daily quotas |
| `node send.js --status` | Display full database progress (Tiers, sent, remaining, quotas) |
| `node send.js --dry-run` | Preview which contacts, templates & subjects will be used |
| `node send.js --corporate-only` | Send ONLY to corporate company emails (skips @gmail, @yahoo, etc.) |
| `node send.js --fast` | Use shorter delays (3–6s) for rapid test runs |
| `node send.js --reset-daily` | **Reset today's sent count to 0** (allows sending more today) |
| `node send.js --reset` | ⚠️ Reset ALL contacts back to *"Not Contacted"* (starts over) |

---

## 🛡️ Anti-Spam Protections (Why Mails Were Blocked & How It's Fixed)

### 1. 5 Rotating Templates & 6 Diverse Subject Lines
- Previously: Identical subject lines and identical text triggered Google's bulk fuzzy-hash filters.
- Now: The tool rotates through **5 distinct templates** and **6 natural subject lines**. Every email sent is unique.

### 2. Dynamic Greetings
- Automatically generates natural variations:
  - Named recruiters: `Hi [Name],`, `Hello [Name],`, `Dear [Name],`
  - Unnamed recruiters: `Hi Hiring Team,`, `Hello [Company] Team,`, `Dear Hiring Manager,`

### 3. Matched Reply-To (SPF/DKIM Alignment)
- Previously: Setting `Reply-To: prathamraj1142@gmail.com` on an email sent from `prathamrajreach1@gmail.com` triggered Google's anti-phishing/spoofing heuristic.
- Now: By default, `replyTo` matches the sending account, ensuring 100% clean authentication.
- **Tip for centralized replies:** Inside each of your secondary Gmail accounts, go to `Settings -> Forwarding and POP/IMAP -> Add a forwarding address` and forward all mail to `prathamraj1142@gmail.com`. This is legitimate and never affects spam scores.

### 4. Humanized Pacing
- Normal send delay: **15–35 seconds** randomized between emails (instead of robotic 3s bursts).
- **Micro-pause:** Pauses 30–60s every 6 emails.
- **Batch cooldown:** Pauses 3–6 minutes every 20 emails.

### 5. Clean Resume Link
- Removed bot tracking query parameters (`?usp=drivesdk`) so links are clean and trusted.

---

## 📬 Multiple Email Accounts (80 Mails / Day Per Account)

Each email account has its own safe daily quota of **80 emails/day**:
- **1 account** = 80 emails / day
- **2 accounts** = 160 emails / day
- **4 accounts** = 320 emails / day

### Account Switching:
1. **Automatic (`node send.js`)**:  
   When Account 1 finishes its 80 emails, `send.js` automatically starts sending from Account 2, then Account 3, then Account 4.
2. **Manual (`--from <id|email>`)**:  
   Target a specific account whenever you want:
   ```bash
   node send.js --from 1
   node send.js --from 2
   node send.js --from 3
   node send.js --from 4
   ```

---

## ✏️ Customizing Templates & Settings in `config.json`

Open `config.json` to edit:
- `templates`: Array of 5 message templates
- `subjects`: Array of subject lines
- `resume_link`: Your resume link
- `portfolio_link`: Your portfolio URL
- `github_link` / `linkedin_link`
- `delay_min_ms` / `delay_max_ms`: Pacing controls
