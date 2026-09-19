import { NextResponse } from 'next/server';
import { getCompaniesSummary, getContactsByCompany, getEmailLogsByCompany, getAllTemplates, getAllSettings, createEmailLog, updateEmailLog, deleteEmailLog } from '@/lib/db';
import { generateEmailForContact } from '@/lib/email';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');

    if (company) {
      // Get detailed view for a single company
      const contacts = getContactsByCompany(company);
      const emails = getEmailLogsByCompany(company);
      return NextResponse.json({ contacts, emails });
    }

    // List all companies with stats
    const companies = getCompaniesSummary();
    return NextResponse.json({ companies });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'generate_campaign') {
      const { company, template_id } = body;
      const contacts = getContactsByCompany(company);
      if (contacts.length === 0) return NextResponse.json({ error: 'No contacts with email found at this company' }, { status: 404 });

      const settings = getAllSettings();
      const templates = getAllTemplates();
      const template = template_id
        ? templates.find(t => t.id === template_id)
        : templates.find(t => t.is_default) || templates[0];
      if (!template) return NextResponse.json({ error: 'No template found' }, { status: 404 });

      const campaignTag = `${company}_${Date.now()}`;
      const drafts = [];

      for (const contact of contacts) {
        // Skip contacts already with pending drafts/approved for this company
        const existingEmails = getEmailLogsByCompany(company);
        const hasPending = existingEmails.some(e =>
          e.contact_id === contact.id && (e.status === 'draft' || e.status === 'approved')
        );
        if (hasPending) continue;

        const { subject, body: emailBody } = generateEmailForContact(contact, template, settings);
        const log = createEmailLog({
          contact_id: contact.id,
          template_id: template.id,
          subject,
          body: emailBody,
          status: 'draft',
          campaign_tag: campaignTag,
        });
        drafts.push({ id: log.id, contact_name: contact.name, contact_email: contact.email, subject });
      }

      return NextResponse.json({
        success: true,
        campaign_tag: campaignTag,
        drafts_created: drafts.length,
        skipped: contacts.length - drafts.length,
        drafts,
      });
    }

    if (action === 'update_draft') {
      const { email_id, subject, body: emailBody } = body;
      const updates = {};
      if (subject !== undefined) updates.subject = subject;
      if (emailBody !== undefined) updates.body = emailBody;
      updateEmailLog(email_id, updates);
      return NextResponse.json({ success: true });
    }

    if (action === 'delete_draft') {
      deleteEmailLog(body.email_id);
      return NextResponse.json({ success: true });
    }

    if (action === 'approve_campaign') {
      const emails = getEmailLogsByCompany(body.company);
      const drafts = emails.filter(e => e.status === 'draft');
      for (const d of drafts) updateEmailLog(d.id, { status: 'approved' });
      return NextResponse.json({ success: true, approved: drafts.length });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
