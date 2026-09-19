import { NextResponse } from 'next/server';
import { getAllSources, createSource } from '@/lib/db';

export async function GET() {
  try {
    return NextResponse.json({ sources: getAllSources() });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    createSource(body);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
