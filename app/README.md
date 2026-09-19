# 🚀 RecruiterReach

**Automated recruiter outreach & email automation for freshers/new grads.**

Manage recruiter contacts, create personalized email campaigns, and send at scale — all from a beautiful local dashboard.

> Built by a fresher, for freshers. Open source. No SaaS fees.

---

## ✨ Features

### 🎯 Company Campaign Outreach
- Group contacts by company → generate personalized drafts for everyone at once
- **Inline editing** — edit subject/body before sending
- **Email preview** — see exactly what the recipient will see inline without modals
- Approve all → batch send with configurable delays
- Track sent/draft/failed status per company

### 📧 Email Automation
- Gmail OAuth2 integration — send real emails from your Gmail
- Template system with `{{variables}}` — auto-fills your name, skills, company, etc.
- Batch sending with rate limiting and daily limits
- Test mode — record emails without actually sending
- Retry failed emails with one click

### 👥 Contact Management
- Import contacts from CSV/Excel/PDF
- Tier system (1-3) for prioritization
- Email verification status tracking
- Company profiles with tech stack and careers URL

### 📊 Dashboard
- Real-time stats: contacts, emails sent, drafts pending
- Status breakdown by company
- Quick actions from one central view

---

## 🏁 Quick Start & Setup Guide

### Prerequisites
- [Node.js](https://nodejs.org/) v18+ (LTS recommended)

### One-Click Setup (Recommended)

**Windows:**
1. Download or clone this repository.
2. Double-click `setup.bat`.
3. The script will automatically install dependencies, set up the SQLite database, and open `http://localhost:3000` in your browser.

**macOS / Linux:**
1. Open your terminal.
2. Run `chmod +x setup.sh`
3. Run `./setup.sh`
4. This will install dependencies, setup the database, and launch the dashboard.

### Manual Setup
If you prefer setting it up manually:
```bash
# 1. Navigate to the app directory
cd app

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev

# 4. Open http://localhost:3000 in your browser
```

---

## ⚙️ Configuration

### Gmail OAuth2 Setup (for sending emails)

You can use the contact management and template features without Gmail setup. Set this up only when you're ready to send emails.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project → Enable **Gmail API**
3. Create **OAuth 2.0 credentials** (Desktop app type)
4. Add your email as a test user under **OAuth consent screen**
5. Use the [OAuth Playground](https://developers.google.com/oauthplayground/) to get a refresh token:
   - Authorize with scope `https://mail.google.com/`
   - Exchange the code for a refresh token
6. Enter your Client ID, Client Secret, and Refresh Token in **Settings** → **Gmail OAuth2** in the app.
7. Click **Test Connection** to verify.

---

## 🛠 Troubleshooting & Common Issues

| Issue | Cause / Solution |
|-------|-----------------|
| **`npm install` fails** | Ensure you have Node.js installed correctly. Try running `npm cache clean --force` and run `npm install` again. |
| **"Cannot find module better-sqlite3"** | Your SQLite binary might need to be rebuilt. Run `npm rebuild better-sqlite3` in the `app` folder. |
| **Gmail OAuth Error / "Invalid Grant"** | Your Refresh Token has expired (often happens if your app is in "Testing" mode on Google Cloud after 7 days). Re-authenticate via Google OAuth Playground to get a new token. |
| **Emails are failing to send** | Check your daily limit in Settings. Gmail restricts daily sending limits (typically 500 for standard accounts). Also, verify your internet connection. |
| **Port 3000 is already in use** | Stop any other processes using port 3000, or run the app on a different port using `npm run dev -- -p 3001` (update your URL accordingly). |

---

## 📁 Project Structure

```
RecruiterReach/
├── setup.bat          # Windows one-click launcher
├── setup.sh           # macOS/Linux one-click launcher
├── app/               # Next.js application
│   ├── src/
│   │   ├── app/       # Pages & API routes
│   │   │   ├── api/   # REST API endpoints
│   │   │   ├── campaigns/ # Company outreach campaigns
│   │   │   ├── outreach/  # Email pipeline
│   │   │   ├── compose/   # Single email composer
│   │   │   ├── contacts/  # Contact management
│   │   │   ├── templates/ # Email templates
│   │   │   └── settings/  # Configuration
│   │   └── lib/       # Database, email, utilities
│   ├── data/          # SQLite database (auto-created - ignored in Git)
│   └── package.json
└── README.md
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19 |
| Backend | Next.js API Routes |
| Database | SQLite (better-sqlite3) |
| Email | Nodemailer + Gmail OAuth2 |
| Styling | Vanilla CSS (dark mode) |

**Zero external services required.** Everything runs locally. Your data stays on your machine.

---

## 🤝 Contributing

PRs welcome! Some ideas:
- Add email open tracking
- Add follow-up automation
- Build a Chrome extension for contact collection
- Add more import formats (Google Sheets, Notion)

---

## 📝 License

MIT — use it, modify it, share it.

---

**Built with ❤️ for the job search grind. Star ⭐ this repo if it helps!**
