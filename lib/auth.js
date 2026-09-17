// Passcode-based session signing using Web Crypto (works in both Node and the Edge runtime,
// so it can run inside middleware.js without a Node-only `crypto` module dependency).
export const SESSION_COOKIE = 'wt_session';

function toHex(buf) {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function signSession(secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('authenticated'));
  return toHex(sig);
}

export async function isValidSession(token, secret) {
  if (!token || !secret) return false;
  const expected = await signSession(secret);
  return token === expected;
}
