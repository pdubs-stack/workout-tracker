import { NextResponse } from 'next/server';
import { SESSION_COOKIE, signSession } from '../../../lib/auth';

export async function POST(req) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: 'Server is not configured yet (AUTH_SECRET is missing). Set it in your Vercel project env vars.' },
      { status: 500 }
    );
  }

  let passcode;
  try {
    const body = await req.json();
    passcode = body.passcode;
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  if (passcode !== secret) {
    return NextResponse.json({ error: 'Incorrect passcode.' }, { status: 401 });
  }

  const token = await signSession(secret);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 90, // 90 days
  });
  return res;
}
