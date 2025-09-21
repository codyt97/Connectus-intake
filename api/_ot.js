// /api/_ot.js
const OT_BASE_URL = process.env.OT_BASE_URL || 'https://api.ordertime.com/api';
const OT_API_KEY  = process.env.OT_API_KEY;
const OT_DEBUG    = process.env.OT_DEBUG === '1' || process.env.OT_DEBUG === 'true';

function assertEnv() {
  if (!OT_BASE_URL) throw new Error('Missing OT_BASE_URL');
  if (!OT_API_KEY)  throw new Error('Missing OT_API_KEY (use a server-side API token/key, not email/password)');
}

function headersFor(authMode) {
  switch (authMode) {
    case 'bearer':   return { 'Authorization': `Bearer ${OT_API_KEY}` };
    case 'apikey':   return { 'ApiKey': OT_API_KEY };
    case 'x-api-key':return { 'X-API-Key': OT_API_KEY };
    default:         return {};
  }
}

async function tryCall(path, body, authMode) {
  const url = `${OT_BASE_URL}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headersFor(authMode),
    },
    body: JSON.stringify(body || {}),
  });
  const text = await res.text();
  if (OT_DEBUG) console.log(`[OT ${authMode}] ${path} -> ${res.status} ${text.slice(0, 300)}`);
  return { ok: res.ok, status: res.status, text, json: safeJson(text) };
}

function safeJson(t) {
  try { return JSON.parse(t); } catch { return null; }
}

// Tries multiple auth header styles and multiple API routes that exist across OT tenants.
export async function otSmartCall({ entity, action, body }) {
  assertEnv();

  const paths = [];
  // generic entity routes
  if (action === 'Search') paths.push('/Entity/Search');
  if (action === 'Get')    paths.push('/Entity/Get');
  // direct entity routes (some tenants expose these)
  if (entity && action === 'Search') paths.push(`/${entity}/Search`);
  if (entity && action === 'Get')    paths.push(`/${entity}/Get`);

  const authModes = ['bearer', 'apikey', 'x-api-key'];

  let lastErr = null;
  for (const p of paths) {
    for (const a of authModes) {
      try {
        const out = await tryCall(p, body, a);
        if (out.ok && (out.json || out.text)) return out.json ?? out.text;
        lastErr = new Error(`Upstream ${p} with ${a} returned ${out.status}: ${(out.text||'').slice(0,200)}`);
      } catch (e) {
        lastErr = e;
      }
    }
  }
  throw lastErr || new Error('No working OT route/auth combination found');
}

/* ---------- High-level helpers wired to your UI needs ---------- */

export async function searchCustomersByName(q, take = 25) {
  // Try flexible filters/fields across tenants
  const body = {
    EntityName: 'Customer',
    Take: Math.min(Math.max(parseInt(take || 25, 10), 1), 100),
    Skip: 0,
    Filter: {
      Logic: 'or',
      Filters: [
        { Field: 'Company',      Operator: 'contains', Value: q || '' },
        { Field: 'CompanyName',  Operator: 'contains', Value: q || '' },
        { Field: 'Name',         Operator: 'contains', Value: q || '' },
      ]
    },
    Select: [
      'Id','Company','CompanyName','Name','City','State','Zip',
      'BillingContact','BillingPhone','BillingEmail'
    ]
  };

  const data = await otSmartCall({ entity: 'Customer', action: 'Search', body });
  const items = Array.isArray(data?.Items) ? data.Items : Array.isArray(data) ? data : [];

  if (OT_DEBUG && (!items || items.length === 0)) {
    console.log('[OT DEBUG] Customer search returned 0 items. Raw payload keys:', Object.keys(data || {}));
  }

  return items.map(x => ({
    id: x.Id ?? x.ID ?? x.id,
    company: x.Company || x.CompanyName || x.Name || '',
    city: x.City || x.BillingCity || '',
    state: x.State || x.BillingState || '',
    zip: x.Zip || x.BillingZip || '',
    billingContact: x.BillingContact || '',
    billingPhone:   x.BillingPhone || '',
    billingEmail:   x.BillingEmail || '',
  }));
}

export async function getCustomerById(id) {
  const body = { EntityName: 'Customer', Id: Number(id) };
  const x = await otSmartCall({ entity: 'Customer', action: 'Get', body });

  return {
    company: x.Company || x.CompanyName || x.Name || '',
    billing: {
      contact: x.BillingContact || '',
      phone:   x.BillingPhone   || '',
      email:   x.BillingEmail   || '',
      street:  x.BillingAddress1 || x.BillingAddress || '',
      suite:   x.BillingAddress2 || '',
      city:    x.BillingCity     || '',
      state:   x.BillingState    || '',
      zip:     x.BillingZip      || '',
    },
    shipping: {
      company: x.ShipToCompany || x.Company || '',
      contact: x.ShipToContact || '',
      phone:   x.ShipToPhone   || '',
      email:   x.ShipToEmail   || '',
      street:  x.ShipToAddress1 || '',
      suite:   x.ShipToAddress2 || '',
      city:    x.ShipToCity     || '',
      state:   x.ShipToState    || '',
      zip:     x.ShipToZip      || '',
      residence: !!x.ShipToIsResidential,
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
    carrierRep: {
      name:  x.CarrierRepName  || '',
      email: x.CarrierRepEmail || '',
    },
    rep: {
      primary:   x.PrimaryRepName   || '',
      secondary: x.SecondaryRepName || '',
    }
  };
}

// simple SO + items if/when you need them later:
export async function searchSalesOrders(q, take = 25) {
  const body = {
    EntityName: 'SalesOrder',
    Take: Math.min(Math.max(parseInt(take || 25, 10), 1), 100),
    Skip: 0,
    Filter: {
      Logic: 'or',
      Filters: [
        { Field: 'Number', Operator: 'contains', Value: q || '' },
        { Field: 'CustomerCompany', Operator: 'contains', Value: q || '' }
      ]
    },
    Select: ['Id','Number','CustomerCompany','Status','Date']
  };
  const data = await otSmartCall({ entity: 'SalesOrder', action: 'Search', body });
  const items = Array.isArray(data?.Items) ? data.Items : Array.isArray(data) ? data : [];
  return items.map(x => ({
    id: x.Id ?? x.ID ?? x.id,
    number: x.Number,
    company: x.CustomerCompany || '',
    status: x.Status || '',
    date: x.Date || '',
  }));
}

export async function searchPartItems(text, take = 50) {
  const body = {
    EntityName: 'PartItem',
    Take: Math.min(Math.max(parseInt(take || 50, 10), 1), 100),
    Skip: 0,
    Filter: {
      Logic: 'or',
      Filters: [
        { Field: 'Sku', Operator: 'contains', Value: text || '' },
        { Field: 'Description', Operator: 'contains', Value: text || '' },
        { Field: 'ManufacturerPartNumber', Operator: 'contains', Value: text || '' }
      ]
    },
    Select: ['Id','Sku','Description','ManufacturerPartNumber','VendorName','IsActive','IsStocked']
  };
  const data = await otSmartCall({ entity: 'PartItem', action: 'Search', body });
  const items = Array.isArray(data?.Items) ? data.Items : Array.isArray(data) ? data : [];
  return items.map(x => ({
    id: x.Id ?? x.ID ?? x.id,
    sku: x.Sku,
    desc: x.Description,
    mfgPart: x.ManufacturerPartNumber,
    vendor: x.VendorName,
    active: !!x.IsActive,
    stocked: !!x.IsStocked
  }));
}
