# Mail Automation

Simple, high-deliverability CLI tool to send personalized cold emails to 16,000+ recruiters.

---

## ⚡ Quick Start

```bash
node send.js            # Send next 25 emails (auto-rotates active accounts)
node send.js --accounts # Check your sender accounts & today's quotas
node send.js --status   # Check overall campaign progress
```

---

## 📋 All Commands Reference

| Command | Description |
|---|---|
| `node send.js` | Send next batch (25 emails). Auto-switches accounts when one hits 80. |
| `node send.js --from 1` | Send specifically from **Account 1** (`prathamrajreach1@gmail.com`) |
| `node send.js --from 2` | Send specifically from **Account 2** (`prathamraj24112004@gmail.com`) |
| `node send.js --from <email>` | Send specifically from a matching email address |
| `node send.js --count 80` | Send custom batch size (e.g., 50 or 80 emails in one run) |
| `node send.js --accounts` | Display all configured accounts and remaining daily quotas |
| `node send.js --status` | Display full database progress (Tiers, sent, remaining, quotas) |
| `node send.js --dry-run` | Preview which contacts will be emailed without sending |
| `node send.js --reset-daily` | **Reset today's sent count to 0** (allows sending more today) |
| `node send.js --reset` | ⚠️ Reset ALL contacts back to *"Not Contacted"* (starts over) |

---

## 📬 Multiple Email Accounts (80 Mails / Day Per Account)

Each email account has its own safe daily quota of **80 emails/day** to prevent Gmail spam flags:
- **1 account** = 80 emails / day
- **2 accounts** = 160 emails / day
- **4 accounts** = 320 emails / day

All replies from recruiters will automatically land in `reply_to` (**`prathamraj1142@gmail.com`**), regardless of which account sent the email.

### How Account Switching Works

1. **Automatic Switching (`node send.js`)**:  
   `send.js` checks which accounts have quota left today. When **Account 1** finishes its 80 emails, it seamlessly continues with **Account 2** without stopping.

2. **Manual Switching (`--from <id|email>`)**:  
   Target a specific account whenever you want:
   ```bash
   node send.js --from 1
   node send.js --from 2
   node send.js --from prathamraj24112004@gmail.com
   ```

3. **Check Quotas Anytime (`node send.js --accounts`)**:  
   ```bash
   node send.js --accounts
   ```

4. **Reset Today's Counter (`node send.js --reset-daily`)**:  
   If you sent 80 emails and want to reset the count back to 0:
   ```bash
   node send.js --reset-daily
   ```
   *(Note: This only resets today's quota counter. It will **never** re-send to recruiters you have already contacted.)*  
   *(At midnight local time, daily counters automatically reset for the new day).*

---

## ✏️ Changing the Email Template & Resume Link

Open `config.json` to customize your email message:

```json
{
  "reply_to": "prathamraj1142@gmail.com",
  "resume_link": "https://drive.google.com/file/d/YOUR_RESUME_LINK/view",
  "message": {
    "subject": "Application for SDE Intern — Pratham Raj | NIT Patna",
    "body": "Hi {{name}},\n\nI hope you are doing well...\n\nResume: {{resume_link}}\nPortfolio: https://pratham2411.online\n..."
  }
}
```

### Available Placeholders:
- `{{name}}` → Recruiter's first name (e.g. *Hi Sarah*), or *"Hiring Team"* if generic/unknown
- `{{company}}` → Company name (e.g. *Google*, *Amazon*, *Razorpay*)
- `{{resume_link}}` → Automatically inserts your `resume_link` URL

---

## ➕ Adding Account 3 & Account 4

In `config.json`, slots for Accounts 1 through 4 are pre-structured:

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
  ]
}
```

### To Activate a New Account:
1. Paste its `client_id`, `client_secret`, and `refresh_token`.
2. Change `"enabled": false` to `"enabled": true`.
3. That account immediately joins the pool and gets its own 80 daily email quota!

### How to Get a Refresh Token (OAuth Playground):
1. Open [Google OAuth Playground](https://developers.google.com/oauthplayground).
2. Click the gear icon ⚙️ (top right) → check **"Use your own OAuth credentials"**.
3. Paste that account's **Client ID** & **Client Secret**.
4. In Step 1, scroll to **Gmail API v1** → select `https://mail.google.com/` → click **Authorize APIs**.
5. Sign in with that Google account → click **Allow**.
6. In Step 2, click **Exchange authorization code for tokens**.
7. Copy the **Refresh Token** → paste into `config.json`.

---

## 🏆 Auto-Prioritized Send Order

Contacts are emailed in strict tier priority — zero manual selection needed:

1. 🏆 **Tier 1 (FAANG / Quant / Top Product)**: Google, Amazon, Microsoft, Adobe, Meta, Nvidia, Apple, Uber, etc.
2. 🚀 **Tier 2 (High-Growth Startups & Unicorns)**: Flipkart, Razorpay, PhonePe, Swiggy, Zomato, Cred, Zepto, etc.
3. 🏢 **Tier 3 (Well-Paying MNCs & IT)**: Siemens, Cisco, Deloitte, Accenture, SAP, IBM, etc.
4. **Untiered**: All remaining companies.

*(Within each tier, contacts with verified individual person names are always emailed before generic addresses like HR/Recruiter).*

---

## 🛡️ Anti-Spam Deliverability Protections

- **Randomized Delays**: 3–8 seconds between emails (not a mechanical fixed interval).
- **Batch Cooldowns**: Pauses for 2–5 minutes every 25 emails.
- **Daily Caps**: 80 emails/day per sender account.
- **Plain Text Deliverability**: Emails are sent as clean plain text (no HTML tracking pixels or bloated wrappers that trigger spam filters).
- **Individual Addressing**: Every email is individually addressed with `Reply-To: prathamraj1142@gmail.com`.
