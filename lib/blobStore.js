import { put, list } from '@vercel/blob';

// Everything lives in one JSON blob -- this is a single-user app, so there's no need for a
// relational schema or migrations. Reads/writes are whole-document, matching how the old
// localStorage version worked.
const PATHNAME = 'data/store.json';

export async function readState() {
  const { blobs } = await list({ prefix: PATHNAME });
  const match = blobs.find((b) => b.pathname === PATHNAME);
  if (!match) return null;
  const res = await fetch(match.url, { cache: 'no-store' });
  if (!res.ok) return null;
  return res.json();
}

export async function writeState(data) {
  await put(PATHNAME, JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });
}
