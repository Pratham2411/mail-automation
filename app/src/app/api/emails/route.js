import { NextResponse } from 'next/server';
import { getEmailLogs, createEmailLog, getContactById, updateContact, getAllSettings, getCompanyProfile, getAllTemplates, getContactStats, updateEmailLog } from '@/lib/db';
import { generateEmailForContact, validateEmail, sendEmail, createTransporter } from '@/lib/email';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = {};
    if (searchParams.get('status')) filters.status = searchParams.get('status');
    if (searchParams.get('contact_id')) filters.contact_id = parseInt(searchParams.get('contact_id'));
    if (searchParams.get('limit')) filters.limit = parseInt(searchParams.get('limit'));
    const logs = getEmailLogs(filters);
    return NextResponse.json({ emails: logs });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'generate_draft') {
      const { contact_id, template_id } = body;
      const contact = getContactById(contact_id);
      if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
      if (contact.email_status === 'Do Not Contact' || contact.unsubscribe_status) {
        return NextResponse.json({ error: 'Contact is marked Do Not Contact' }, { status: 403 });
      }
      const validation = validateEmail(contact.email);
      if (!validation.valid) return NextResponse.json({ error: `Invalid email: ${validation.reason}` }, { status: 400 });

      const settings = getAllSettings();
      const templates = getAllTemplates();
      const template = template_id ? templates.find(t => t.id === template_id) : templates.find(t => t.is_default);
      if (!template) return NextResponse.json({ error: 'No template found' }, { status: 404 });

      const companyProfile = contact.company ? getCompanyProfile(contact.company) : null;
      const { subject, body: emailBody } = generateEmailForContact(contact, template, settings, companyProfile);
      const log = createEmailLog({ contact_id, template_id: template.id, subject, body: emailBody, status: 'draft' });

      return NextResponse.json({ id: log.id, subject, body: emailBody, template: template.name });
    }

    if (action === 'approve') {
      updateEmailLog(body.email_id, { status: 'approved' });
      return NextResponse.json({ success: true });
    }

    if (action === 'approve_batch') {
      for (const id of body.email_ids) updateEmailLog(id, { status: 'approved' });
      return NextResponse.json({ success: true, approved: body.email_ids.length });
    }

    if (action === 'send') {
      const settings = getAllSettings();
      if (settings.test_mode === 'true' || settings.test_mode === true) {
        updateEmailLog(body.email_id, { status: 'test_sent', sent_at: new Date().toISOString() });
        return NextResponse.json({ success: true, test_mode: true, message: 'Test mode: email recorded but not actually sent' });
      }
      const logs = getEmailLogs({});
      const emailLog = logs.find(l => l.id === body.email_id);
      if (!emailLog) return NextResponse.json({ error: 'Email not found' }, { status: 404 });

      const dailyLimit = parseInt(settings.daily_limit) || 100;
      const stats = getContactStats();
      if (stats.sentToday >= dailyLimit) return NextResponse.json({ error: `Daily limit reached (${dailyLimit})` }, { status: 429 });

      createTransporter({ email: settings.my_email, clientId: settings.gmail_client_id, clientSecret: settings.gmail_client_secret, refreshToken: settings.gmail_refresh_token });
      try {
        const result = await sendEmail({ to: emailLog.contact_email, subject: emailLog.subject, body: emailLog.body, from: settings.my_email });
        updateEmailLog(body.email_id, { status: 'sent', sent_at: new Date().toISOString() });
        updateContact(emailLog.contact_id, { email_status: 'Sent', last_contacted: new Date().toISOString() });
        return NextResponse.json({ success: true, messageId: result.messageId });
      } catch (err) {
        updateEmailLog(body.email_id, { status: 'failed', error_message: err.message });
        return NextResponse.json({ error: err.message }, { status: 500 });
      }
    }

    if (action === 'send_batch') {
      const settings = getAllSettings();
      const approvedEmails = getEmailLogs({ status: 'approved' });
      const batchSize = parseInt(settings.batch_size) || 10;
      const delay = parseInt(settings.delay_between_emails_ms) || 5000;

      if (settings.test_mode === 'true' || settings.test_mode === true) {
        const batch = approvedEmails.slice(0, batchSize);
        for (const email of batch) updateEmailLog(email.id, { status: 'test_sent', sent_at: new Date().toISOString() });
        return NextResponse.json({ success: true, test_mode: true, sent: batch.length });
      }

      createTransporter({ email: settings.my_email, clientId: settings.gmail_client_id, clientSecret: settings.gmail_client_secret, refreshToken: settings.gmail_refresh_token });
      const batch = approvedEmails.slice(0, batchSize);
      let sent = 0, failed = 0;
      const dailyLimit = parseInt(settings.daily_limit) || 100;
      for (const email of batch) {
        if (getContactStats().sentToday >= dailyLimit) break;
        try {
          await sendEmail({ to: email.contact_email, subject: email.subject, body: email.body, from: settings.my_email });
          updateEmailLog(email.id, { status: 'sent', sent_at: new Date().toISOString() });
          updateContact(email.contact_id, { email_status: 'Sent', last_contacted: new Date().toISOString() });
          sent++;
          if (sent < batch.length) await new Promise(r => setTimeout(r, delay));
        } catch (err) {
          updateEmailLog(email.id, { status: 'failed', error_message: err.message });
          failed++;
        }
      }
      return NextResponse.json({ success: true, sent, failed, remaining: approvedEmails.length - sent });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
