// /api/_ot.js
const BASE    = process.env.OT_BASE_URL || 'https://services.ordertime.com/api';
const API_KEY = process.env.OT_API_KEY;
const EMAIL   = process.env.OT_EMAIL;
const PASS    = process.env.OT_PASSWORD;
const DEVKEY  = process.env.OT_DEV_KEY;
const DEBUG   = String(process.env.OT_DEBUG || '').toLowerCase() === '1' || String(process.env.OT_DEBUG || '').toLowerCase() === 'true';

function assertEnv() {
  if (!BASE)    throw new Error('Missing OT_BASE_URL');
  if (!API_KEY) throw new Error('Missing OT_API_KEY');
  if (!EMAIL)   throw new Error('Missing OT_EMAIL');
  if (!PASS && !DEVKEY) throw new Error('Provide OT_PASSWORD or OT_DEV_KEY');
}

function authHeaders() {
  const h = { apiKey: API_KEY, email: EMAIL };
  if (DEVKEY) h.DevKey = DEVKEY; else h.password = PASS;
  return h;
}

async function tryPost(path, body) {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body || {}),
  });
  const text = await res.text();
  if (DEBUG) console.log(`[OT] POST ${path} -> ${res.status} ${text.slice(0, 220)}`);
  return { ok: res.ok, status: res.status, text, json: safeJSON(text) };
}

function safeJSON(t) { try { return JSON.parse(t); } catch { return null; } }

function normalizeListResult(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.Items)) return data.Items;
  return [];
}

/* ---------- Public helpers ---------- */

// Multi-strategy list search for Customers
export async function listCustomersByName(q, page = 1, pageSize = 25) {
