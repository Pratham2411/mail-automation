# Mail Automation

CLI tool to send personalized cold emails to 16,000+ recruiters.

## Quick Start

```bash
node send.js            # send next 25 emails (auto-rotates active accounts)
node send.js --accounts # see your email accounts & today's sent count
node send.js --status   # see full campaign progress
```

## All Commands

| Command | What it does |
|---|---|
| `node send.js` | Send next batch (auto-switches accounts when one hits 80) |
| `node send.js --from 1` | Send specifically from **Account 1** |
| `node send.js --from 2` | Send specifically from **Account 2** |
| `node send.js --from <email>` | Send specifically from a specific email address |
| `node send.js --count 80` | Send custom batch size (e.g. 80 emails) |
| `node send.js --accounts` | Show all configured email accounts & remaining daily quotas |
| `node send.js --status` | Show sent / remaining / tier breakdown & daily quota |
| `node send.js --dry-run` | Preview next batch without sending |
| `node send.js --reset-daily` | **Reset today's sent count to 0** (allows sending again immediately) |
| `node send.js --reset` | Reset all contacts back to "Not Contacted" |

---

## 📬 Multiple Email Accounts (80 Mails / Day Per Account)

Each email account has its own safe daily quota of **80 emails/day**.
- **1 account** = 80 emails / day
- **2 accounts** = 160 emails / day
- **4 accounts** = 320 emails / day

All replies from recruiters will automatically be routed to `reply_to` (`prathamraj1142@gmail.com`).

### How Account Switching Works

1. **Automatic Switching (`node send.js`)**:
   When you run `node send.js`, it automatically checks which accounts have quota remaining. When Account 1 finishes its 80 emails, `send.js` automatically starts sending from Account 2!

2. **Manual Switching (`--from <id|email>`)**:
   You can choose an exact account to send from at any time:
   ```bash
   node send.js --from 1
   node send.js --from 2
   node send.js --from prathamraj24112004@gmail.com
   ```

3. **Check Quotas (`node send.js --accounts`)**:
   ```bash
   node send.js --accounts
   ```

4. **Reset Today's Counter (`node send.js --reset-daily`)**:
   If you want to send more emails today or restart the count:
   ```bash
   node send.js --reset-daily
   ```
   *(Note: This only clears today's daily log count. It does NOT re-send to people you've already contacted.)*
   *(At midnight local time, daily counters automatically reset for the new day).*

---

## Adding Account 3 & Account 4 in `config.json`

Open `config.json`. You will see accounts 1 through 4:

```json
{
  "senders": [
    {
      "id": 1,
      "email": "prathamrajreach1@gmail.com",
      "name": "Pratham Raj",
      "client_id": "...",
      "client_secret": "...",
      "refresh_token": "...",
      "enabled": true
    },
    {
      "id": 2,
      "email": "prathamraj24112004@gmail.com",
      "name": "Pratham Raj",
      "client_id": "...",
      "client_secret": "...",
      "refresh_token": "...",
      "enabled": true
    },
    {
      "id": 3,
      "email": "your-third-email@gmail.com",
      "name": "Pratham Raj",
      "client_id": "PASTE_CLIENT_ID_3",
      "client_secret": "PASTE_CLIENT_SECRET_3",
      "refresh_token": "PASTE_REFRESH_TOKEN_3",
      "enabled": false
    },
    {
      "id": 4,
      "email": "your-fourth-email@gmail.com",
      "name": "Pratham Raj",
      "client_id": "PASTE_CLIENT_ID_4",
      "client_secret": "PASTE_CLIENT_SECRET_4",
      "refresh_token": "PASTE_REFRESH_TOKEN_4",
      "enabled": false
    }
  ],
  "reply_to": "prathamraj1142@gmail.com"
}
```

When you are ready to use Account 3 or 4:
1. Paste its `client_id`, `client_secret`, and `refresh_token`
2. Change `"enabled": false` to `"enabled": true`
3. That's it! It automatically gets its own 80 daily quota.

---

## Get a Refresh Token (for new accounts)

1. Open [OAuth Playground](https://developers.google.com/oauthplayground)
2. Click the gear icon (top-right) → check **"Use your own OAuth credentials"**
3. Paste that account's **Client ID** & **Client Secret**
4. Scroll to **Gmail API v1** → select `https://mail.google.com/` → click **Authorize APIs**
5. Sign in with that Google account → click **Allow**
6. Click **Exchange authorization code for tokens**
7. Copy the **Refresh Token** → paste into `config.json`

---

## Auto-Prioritized Send Order

Emails are sent in priority order — no manual selection needed:

1. 🏆 **Tier 1** — FAANG, Quant, Top Product (Google, Amazon, Adobe...)
2. 🚀 **Tier 2** — Indian Startups & Unicorns (Flipkart, Razorpay...)
3. 🏢 **Tier 3** — MNCs & IT (Accenture, Deloitte, Siemens...)
4. Rest — all other contacts

---

## Anti-Spam Protections

- Random delays between emails (3–8 sec, not fixed)
- Batch cooldown every 25 emails (2–5 min pause)
- Daily limit (80/day per account)
- Plain text only (highest inbox deliverability)
- Personalized per contact (name, company)
- Automatic rotation across active accounts
