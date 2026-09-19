import http from 'http';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log('\n=== Gmail OAuth2 Refresh Token Generator ===\n');
  console.log('Ensure you added "http://localhost:8089" or "https://developers.google.com/oauthplayground"');
  console.log('to "Authorized redirect URIs" in your Google Cloud Console project.\n');

  const clientId = (await question('Enter Client ID: ')).trim();
  const clientSecret = (await question('Enter Client Secret: ')).trim();

  if (!clientId || !clientSecret) {
    console.error('Error: Both Client ID and Client Secret are required.');
    process.exit(1);
  }

  const redirectUri = 'http://localhost:8089';
  const scope = 'https://mail.google.com/';
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(
    redirectUri
  )}&response_type=code&scope=${encodeURIComponent(
    scope
  )}&access_type=offline&prompt=consent`;

  console.log('\nStarting local server on http://localhost:8089 to capture authorization code...');

  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost:8089');
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(`<h1>Authentication Failed</h1><p>${error}</p>`);
        console.error('Authentication error:', error);
        server.close();
        rl.close();
        return;
      }

      if (code) {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(`
          <div style="font-family: sans-serif; text-align: center; padding: 50px;">
            <h1 style="color: #10b981;">Authentication Successful!</h1>
            <p>You can close this tab and return to the terminal.</p>
          </div>
        `);

        console.log('\nAuthorization code received. Exchanging for Refresh Token...');

        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        });

        const tokenData = await tokenRes.json();

        if (tokenData.error) {
          console.error('\nError exchanging token:', tokenData);
        } else {
          console.log('\n=============================================');
          console.log('🎉 SUCCESS! Here is your Refresh Token:');
          console.log('---------------------------------------------');
          console.log(tokenData.refresh_token || '(No refresh token returned; try revoking app access and running again with prompt=consent)');
          console.log('=============================================\n');
          console.log('Now paste this into Settings -> "Gmail Refresh Token" at http://localhost:3000/settings\n');
        }

        server.close();
        rl.close();
      }
    } catch (err) {
      console.error('Server error:', err);
    }
  });

  server.listen(8089, () => {
    console.log('\n👉 Open this URL in your browser to sign in with your Gmail:\n');
    console.log(authUrl);
    console.log('\nWaiting for login...');
  });
}

main();
