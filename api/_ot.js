// /api/_ot.js
const BASE    = process.env.OT_BASE_URL || 'https://services.ordertime.com/api';
const API_KEY = process.env.OT_API_KEY;
const EMAIL   = process.env.OT_EMAIL || '';
const PASS    = process.env.OT_PASSWORD || '';
const DEVKEY  = process.env.OT_DEV_KEY || '';

function assertEnv() {
  if (!BASE) throw new Error('Missing OT_BASE_URL');
  if (!API_KEY) throw new Error('Missing OT_API_KEY');
}

function authHeaders() {
  // Be generous with header names (some tenants differ)
  const h = {
    'Content-Type': 'application/json',
    ApiKey: API_KEY,
    apiKey: API_KEY,
    'x-api-key': API_KEY,
  };
  if (EMAIL) h.email = EMAIL;
  if (DEVKEY) h.DevKey = DEVKEY;
  else if (PASS) h.password = PASS;
  return h;
}

function safeJSON(txt) { try { return JSON.parse(txt); } catch { return null; } }

async function post(path, body) {
  assertEnv();
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body || {}),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`OT POST ${path} ${res.status}: ${text}`);
  return safeJSON(text) ?? text;
}

async function get(path) {
  assertEnv();
  const res = await fetch(`${
