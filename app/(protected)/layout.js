import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, isValidSession } from '../../lib/auth';

// Auth gate for everything under this route group, done as a normal Server Component
// (always a standard Node.js render, no separate middleware bundle/runtime to fight).
export default async function ProtectedLayout({ children }) {
  const secret = process.env.AUTH_SECRET;
  const token = cookies().get(SESSION_COOKIE)?.value;
  const ok = await isValidSession(token, secret);
  if (!ok) redirect('/login');
  return children;
}
