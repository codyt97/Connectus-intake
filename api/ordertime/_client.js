const BASE = process.env.OT_BASE_URL || 'https://services.ordertime.com/api';
const KEY  = process.env.OT_API_KEY;

export async function otFetch(path, { method='GET', body } = {}) {
  if (!KEY) throw new Error('Missing OT_API_KEY env var');
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': KEY,           // OT uses an API key; keep it in a header
    },
    body: body ? JSON.stringify(body) : undefined,
    // Vercel: opt out of caching for search endpoints
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    const text = await res.text().catch(()=> '');
    throw new Error(`OT ${method} ${path} ${res.status}: ${text}`);
  }
  return res.json();
}

// /list helper (Lists endpoint)
export async function otList({ Type, Filters = [], PageNumber = 1, NumberOfRecords = 25, Sortation }) {
  return otFetch('/list', { method: 'POST', body: { Type, Filters, PageNumber, NumberOfRecords, Sortation } });
}
