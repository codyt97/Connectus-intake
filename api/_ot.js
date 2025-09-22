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

export async function otPost(path, body) {
  return post(path, body);
}

/* ---------- Public helpers ---------- */

// Multi-strategy list search for Customers
export async function listCustomersByName(q, page = 1, pageSize = 25) {
  assertEnv();

  const paths   = ['/list', '/List']; // some tenants care about casing
  const fields  = ['Name', 'CompanyName']; // common name fields
  const payloads = [];

  // Build multiple payload variants (string vs array; Name vs CompanyName)
  for (const field of fields) {
    // Variant A: FilterValueArray as string
    payloads.push({
      Type: 120, // Customer
      Filters: [{ PropertyName: field, Operator: 12, FilterValueArray: q || '' }], // 12 = contains
      PageNumber: Number(page) || 1,
      NumberOfRecords: Math.min(Math.max(Number(pageSize) || 25, 1), 100)
    });
    // Variant B: FilterValueArray as array
    payloads.push({
      Type: 120,
      Filters: [{ PropertyName: field, Operator: 12, FilterValueArray: [q || ''] }],
      PageNumber: Number(page) || 1,
      NumberOfRecords: Math.min(Math.max(Number(pageSize) || 25, 1), 100)
    });
  }

  let lastErr = null;
  for (const p of paths) {
    for (const body of payloads) {
      try {
        const out = await tryPost(p, body);
        if (out.ok) {
          const items = normalizeListResult(out.json);
          if (items.length || q === '') return items; // accept empty only if blank search
          // If 200 but 0 items, keep trying other combos
        } else {
          lastErr = new Error(`${p} ${out.status}: ${out.text.slice(0,200)}`);
        }
      } catch (e) {
        lastErr = e;
      }
    }
  }
  if (lastErr) throw lastErr;
  return []; // fallback
}

export async function getCustomerById(id) {
  assertEnv();
  const res = await fetch(`${BASE}/customer?id=${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: authHeaders(),
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(`/customer ${res.status}: ${txt.slice(0,300)}`);
  const x = safeJSON(txt) || {};

  // Prefer nested Bill/Ship addresses; fall back to flat Billing* fields
  const bill = x.BillAddress || x.BillingAddress || {
    Contact: x.BillingContact, Phone: x.BillingPhone, Email: x.BillingEmail,
    Addr1: x.BillingAddress1 || x.BillingAddress, Addr2: x.BillingAddress2,
    City: x.BillingCity, State: x.BillingState, Zip: x.BillingZip
  };
  const ship = x.ShipAddress || x.ShipToAddress || {
    Contact: x.ShipToContact, Phone: x.ShipToPhone, Email: x.ShipToEmail,
    Addr1: x.ShipToAddress1, Addr2: x.ShipToAddress2,
    City: x.ShipToCity, State: x.ShipToState, Zip: x.ShipToZip,
    IsResidential: x.ShipToIsResidential
  };

  return {
    company: x.Company || x.CompanyName || x.Name || '',
    billing: {
      contact: bill?.Contact || '',
      phone:   bill?.Phone   || '',
      email:   bill?.Email   || '',
      street:  bill?.Addr1   || '',
      suite:   bill?.Addr2   || '',
      city:    bill?.City    || '',
      state:   bill?.State   || '',
      zip:     bill?.Zip     || ''
    },
    shipping: {
      company: x.ShipToCompany || x.Company || '',
      contact: ship?.Contact || '',
      phone:   ship?.Phone   || '',
      email:   ship?.Email   || '',
      street:  ship?.Addr1   || '',
      suite:   ship?.Addr2   || '',
      city:    ship?.City    || '',
      state:   ship?.State   || '',
      zip:     ship?.Zip     || '',
      residence: !!ship?.IsResidential
    },
    payment: {
      method: x.DefaultPaymentMethod || '',
      terms:  x.PaymentTerms         || '',
      taxExempt: !!x.IsTaxExempt,
      agreement: !!x.HasPurchaseAgreement,
    },
    shippingOptions: {
      pay:   x.DefaultShipPaymentMethod || '',
      speed: x.DefaultShipSpeed         || '',
      shortShip: x.ShortShipPolicy || '',
    },
    carrierRep: { name: x.CarrierRepName || '', email: x.CarrierRepEmail || '' },
    rep:        { primary: x.PrimaryRepName || '', secondary: x.SecondaryRepName || '' },
  };
}

