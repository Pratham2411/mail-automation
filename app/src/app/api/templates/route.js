import { NextResponse } from 'next/server';
import { getAllTemplates, getTemplateById, createTemplate, updateTemplate, deleteTemplate } from '@/lib/db';
import { personalizeTemplate } from '@/lib/email';

export async function GET() {
  try {
    return NextResponse.json({ templates: getAllTemplates() });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (body.action === 'preview') {
      const template = getTemplateById(body.template_id);
      if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      const subject = personalizeTemplate(template.subject, body.variables || {});
      const bodyText = personalizeTemplate(template.body, body.variables || {});
      return NextResponse.json({ subject, body: bodyText });
    }
    const result = createTemplate(body);
    return NextResponse.json({ id: result.id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, ...updates } = body;
    updateTemplate(id, updates);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    deleteTemplate(parseInt(searchParams.get('id')));
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
