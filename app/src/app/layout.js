import "./globals.css";

export const metadata = {
  title: "RecruiterReach — Recruiter Research & Outreach",
  description: "Professional recruiter research and personalized email outreach system",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="app-layout">
          <aside className="sidebar">
            <div className="sidebar-logo">
              <h1>RecruiterReach</h1>
              <p>Research & Outreach</p>
            </div>
            <nav className="sidebar-nav">
              <a href="/" className="nav-link"><span className="icon">📊</span> Dashboard</a>
              <a href="/contacts" className="nav-link"><span className="icon">👥</span> Contacts</a>
              <a href="/outreach" className="nav-link"><span className="icon">📧</span> Outreach</a>
              <a href="/campaigns" className="nav-link"><span className="icon">🎯</span> Campaigns</a>
              <a href="/compose" className="nav-link"><span className="icon">✏️</span> Compose</a>
              <a href="/templates" className="nav-link"><span className="icon">📋</span> Templates</a>
              <a href="/research" className="nav-link"><span className="icon">🔍</span> Research</a>
              <a href="/settings" className="nav-link"><span className="icon">⚙️</span> Settings</a>
            </nav>
          </aside>
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
