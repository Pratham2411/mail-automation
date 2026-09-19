# RecruiterReach User Guide

Welcome to RecruiterReach! This guide will walk you through the entire process of managing your contacts, composing emails, and sending out personalized professional outreach at scale.

## 🔑 1. Gmail OAuth2 Setup (First Time)

### Part A — Create OAuth Client ID & Secret

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials?project=mail-automation-508306).
2. Click **"+ CREATE CREDENTIALS"** at the top → select **"OAuth client ID"**.
3. For **Application type**, choose **"Web application"**.
4. Give it a name (e.g. `RecruiterReach`).
5. Under **"Authorized redirect URIs"**, click **"+ ADD URI"** and add:
   ```
   https://developers.google.com/oauthplayground
   ```
6. Click **"Create"**.
7. A popup will show your **Client ID** and **Client Secret** — copy both and save them.

> **Your Client ID** looks like: `123456789-xxxxxxxxx.apps.googleusercontent.com`  
> **Your Client Secret** looks like: `GOCSPX-xxxxxxxxxxxxx`

### Part A.2 — Add Your Email as a Test User
*Because your app is in testing mode, Google blocks any email from signing in unless you explicitly allow it.*
1. In the Google Cloud Console, go to **APIs & Services → OAuth consent screen**.
2. Scroll down to the **"Test users"** section.
3. Click **"+ ADD USERS"**.
4. Type in the exact Gmail address you plan to send emails from (e.g., `prathamraj2411@gmail.com`).
5. Click **Save**.

### Part B — Generate a Refresh Token

8. Open [Google OAuth Playground](https://developers.google.com/oauthplayground).
9. Click the **⚙️ Gear icon** (top right) → check **"Use your own OAuth credentials"**.
10. Paste your **Client ID** and **Client Secret** from Part A.
11. In the left panel (Step 1), scroll to **"Gmail API v1"** → select `https://mail.google.com/`.
12. Click **"Authorize APIs"**.
13. Sign in with your Gmail account and click **"Allow"**.
14. On the next screen (Step 2), click **"Exchange authorization code for tokens"**.
15. Copy the **Refresh token** from the response.

### Part C — Enter Credentials in the App

16. Open [http://localhost:3000/settings](http://localhost:3000/settings) in your browser.
17. Paste the **Client ID**, **Client Secret**, and **Refresh Token** into the Gmail OAuth2 fields.
18. Click **"💾 Save All Settings"** first.
19. Then click **"🔌 Test Connection"** — it should show ✅.

---

## 🔄 1b. Refreshing Tokens (Every 7 Days)

Because your Google Cloud app is in "Testing" mode, **your Refresh Token expires every 7 days**.

When the connection test fails or emails stop sending, repeat **Part B only** (steps 8–15 above) to get a new Refresh Token, then paste it in Settings and save.

---

## 🏃 2. How to Run the App Daily

Since you will be running this manually every day, follow this simple routine:

1. **Start the App:** Open a terminal in the `app` folder and run:
   cd app
   npm run dev
   
2. **Open your browser:** Go to `http://localhost:3000`.
3. **Send Emails:** Navigate to the **Outreach** tab and click **"Approve & Send Batch"**. It will automatically send to the next 100 people in your database.
4. **Close Down:** Once the batch finishes, you can close the browser and press `Ctrl+C` in the terminal to shut down the server until tomorrow.

---

## 🔄 3. Updating the Database

If you have downloaded new PDF, TXT, or CSV files of contacts:
1. Drop them directly into the root folder of this project.
2. Go to the **Settings** page in the app.
3. Scroll down and click the **"🔄 Update Database from Local Files"** button.
4. The app will automatically parse the new files, extract the emails, add them to your database, and run a deduplication sweep to keep your list clean!

---

## 🚀 4. Features & How to Use Them

### Step 1: Update Your Profile (Settings)
1. Go to the **Settings** page.
2. Fill out your details: **Your Name, University, Key Skills, Resume Link**, etc.
3. *Why?* The system uses these details to dynamically inject personalized text into your email templates. 

### Step 2: Ensure "Test Mode" is OFF
1. In Settings, scroll to **Outreach Settings**.
2. Uncheck **"Enable Test Mode"**. 
3. *Why?* If Test Mode is ON, the system will only simulate sending emails without actually delivering them.

### Step 3: Go to Outreach & Start Sending!
1. Go to the **Outreach** page.
2. This page automatically pulls a daily batch of contacts (up to your daily limit, e.g., 100) from your database who haven't been contacted yet.
3. Click the **"Approve & Send Batch"** button at the top right.
4. Watch the progress bar as your emails are sent 1-by-1 in the background!

---

## 🛠️ 3. Features & How to Use Them

### 👥 Contact Manager (`/contacts`)
* **What it does:** Displays your 18,000+ clean recruiter contacts.
* **How to use:** 
  * Use the Search bar to find specific companies (e.g., "Amazon" or "Google").
  * Filter by "Not Contacted" or "Emailed" to keep track of your pipeline.

### ✍️ Template Manager (`/templates`)
* **What it does:** This is where you write the core structures of your cold emails.
* **How to use:** 
  * You can use "Variables" wrapped in curly braces like `{{ recruiter_name }}` or `{{ company }}`.
  * When sending an email, the system automatically replaces `{{ recruiter_name }}` with the contact's actual name, and `{{ skills }}` with your skills from the Settings page.

### ✉️ Single Compose Mode (`/compose`)
* **What it does:** Allows you to send a highly targeted, manual email to one specific person.
* **How to use:**
  * Go to **Compose**.
  * Search for a contact in the "Select Contact" dropdown.
  * The system will instantly generate a live preview of the final email.
  * You can manually edit the text right there before clicking **Send**.

### 📈 Dashboard (`/`)
* **What it does:** Your command center.
* **How to use:** 
  * Check your daily progress (e.g., "45 / 100 Sent Today").
  * Keep an eye on your overall database statistics and top targeted companies.
