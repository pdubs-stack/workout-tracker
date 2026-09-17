import { NextResponse } from 'next/server';
import { SESSION_COOKIE, isValidSession } from './lib/auth';

export async function middleware(req) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const secret = process.env.AUTH_SECRET;
  const ok = await isValidSession(token, secret);
  if (ok) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = '/login';
  return NextResponse.redirect(url);
}

// Everything requires a valid session except: Next internals, the login page itself,
// the auth API route that issues sessions, and the static CSS/JS the login page needs to render.
export const config = {
  matcher: ['/((?!_next|favicon.ico|login|api/auth|style.css|js/).*)'],
};
