import { NextResponse } from 'next/server';
import { getAllSettings, setSetting } from '@/lib/db';
import { testConnection } from '@/lib/email';
import { seedDatabase } from '@/lib/seed';

export async function GET() {
  try {
    const settings = getAllSettings();
    const safe = { ...settings };
    if (safe.gmail_client_secret) safe.gmail_client_secret = '••••••' + String(safe.gmail_client_secret).slice(-4);
    if (safe.gmail_refresh_token) safe.gmail_refresh_token = '••••••' + String(safe.gmail_refresh_token).slice(-4);
    return NextResponse.json({ settings: safe });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (body.action === 'test_connection') {
      const settings = getAllSettings();
      // Use values from request body if provided (fresh user input), otherwise fall back to saved DB values
      const clientId = (body.gmail_client_id && !body.gmail_client_id.startsWith('••••••')) ? body.gmail_client_id : settings.gmail_client_id;
      const clientSecret = (body.gmail_client_secret && !body.gmail_client_secret.startsWith('••••••')) ? body.gmail_client_secret : settings.gmail_client_secret;
      const refreshToken = (body.gmail_refresh_token && !body.gmail_refresh_token.startsWith('••••••')) ? body.gmail_refresh_token : settings.gmail_refresh_token;
      const result = await testConnection({
        email: body.my_email || settings.my_email,
        clientId,
        clientSecret,
        refreshToken,
      });
      return NextResponse.json(result);
    }

    if (body.action === 'seed') {
      seedDatabase();
      return NextResponse.json({ success: true, message: 'Database seeded' });
    }

    for (const [key, value] of Object.entries(body)) {
      if (key === 'action') continue;
      const strVal = typeof value === 'object' ? JSON.stringify(value) : String(value);
      // Never overwrite real secrets with masked placeholder values
      if (strVal.startsWith('••••••')) continue;
      setSetting(key, strVal);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
