import { NextResponse } from 'next/server';
import { getAllContacts, createContact, updateContact, deleteContact, getContactStats } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    if (searchParams.get('stats') === 'true') {
      return NextResponse.json(getContactStats());
    }
    const filters = {};
    for (const key of ['company', 'tier', 'verification_status', 'email_status', 'priority', 'search', 'limit', 'offset']) {
      const val = searchParams.get(key);
      if (val) filters[key] = key === 'tier' || key === 'limit' || key === 'offset' ? parseInt(val) : val;
    }
    if (searchParams.get('hasEmail') === 'true') filters.hasEmail = true;
    const contacts = getAllContacts(filters);
    return NextResponse.json({ contacts, total: contacts.length });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (body.bulk && Array.isArray(body.contacts)) {
      const results = { imported: 0, duplicates: 0, errors: 0 };
      for (const contact of body.contacts) {
        const result = createContact(contact);
        if (result.duplicate) results.duplicates++;
        else if (result.id) results.imported++;
        else results.errors++;
      }
      return NextResponse.json(results);
    }
    const result = createContact(body);
    if (result.duplicate) return NextResponse.json({ error: 'Duplicate email', existingId: result.existingId }, { status: 409 });
    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    updateContact(id, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    deleteContact(parseInt(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
