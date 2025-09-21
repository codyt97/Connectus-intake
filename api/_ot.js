const BASE = process.env.OT_BASE_URL || 'https://services.ordertime.com/api';
const API_KEY = process.env.OT_API_KEY;
const EMAIL = process.env.OT_EMAIL;
const PASSWORD = process.env.OT_PASSWORD;
const DEVKEY = process.env.OT_DEV_KEY; // optional alternative to PASSWORD

function assertEnv() {
  if (!BASE) throw new Error('Missing OT_BASE_URL');
  if (!API_KEY) throw new Error('Missing OT_API_KEY');
  if (!EMAIL) throw new Error('Missing OT_EMAIL');
  if (!PASSWORD && !DEVKEY) {
    throw new Error('Provide OT_PASSWORD or OT_DEV_KEY');
  }
}

function authHeaders() {
  const h = { apiKey: API_KEY, email: EMAIL };
  if (DEVKEY) h.DevKey = DEVKEY; else h.password = PASSWORD;
  return h;
}

async function post(path, body) {
  assertEnv();
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body || {}),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${path} ${res.status}: ${text.slice(0,300)}`);
  try { return JSON.parse(text); } catch { return text; }
}

// --- API helpers ---

// /list with ListInfo for Customers (RecordTypeEnum 120)
export async function listCustomersByName(q, page = 1, pageSize = 25) {
  const body = {
    Type: 120, // Customer
    Filters: [{
      PropertyName: 'Name',
      Operator: 12,             // 12 = contains (per FilterOpEnum)
      FilterValueArray: q || ''
    }],
    PageNumber: page,
    NumberOfRecords: Math.min(Math.max(parseInt(pageSize,10) || 25,1),100)
  };
  const data = await post('/list', body);
  return Array.isArray(data) ? data : (Array.isArray(data?.Items) ? data.Items : []);
}

// /customer GET by id (OrderTime supports /customer)
export async function getCustomer(id) {
  const res = await fetch(`${BASE}/customer?id=${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`/customer ${res.status}: ${text.slice(0,300)}`);
  return JSON.parse(text);
}
