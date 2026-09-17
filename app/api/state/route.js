import { NextResponse } from 'next/server';
import { readState, writeState } from '../../../lib/blobStore';
import { defaultState } from '../../../lib/defaultState';

// This route must always hit Blob storage live, per request -- never statically cached.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const state = await readState();
    return NextResponse.json(state || defaultState());
  } catch (e) {
    console.error('GET /api/state failed', e);
    return NextResponse.json({ error: 'Failed to read state' }, { status: 500 });
  }
}

export async function PUT(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const raw = JSON.stringify(body);
  if (raw.length > 3_000_000) {
    return NextResponse.json({ error: 'Payload too large' }, { status: 413 });
  }

  try {
    await writeState(body);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('PUT /api/state failed', e);
    return NextResponse.json({ error: 'Failed to save state' }, { status: 500 });
  }
}
