// /api/_ot.js
const OT_BASE_URL = process.env.OT_BASE_URL || 'https://api.ordertime.com/api';
const OT_API_KEY  = process.env.OT_API_KEY;

if (!OT_API_KEY) {
  console.warn('[WARN] OT_API_KEY is not set — requests will fail.');
}

// Generic OrderTime caller (Entity/Search, Entity/Get, etc.)
export async function otCall(path, { method = 'POST', body } = {}) {
  const url = `${OT_BASE_URL}${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OT_API_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OrderTime ${method} ${path} failed ${res.status}: ${text}`);
  }
  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

// ---- Search helpers ----

// Customers search by name text
export async function searchCustomersByName(q, take = 25) {
  // Adjust to your OT schema; this assumes Entity/Search on "Customer"
  const body = {
    EntityName: 'Customer',
    Take: Math.min(Math.max(parseInt(take || 25, 10), 1), 100),
    Skip: 0,
    // Simple contains filter; refine if you have exact fields
    Filter: {
      Logic: 'and',
      Filters: [
        { Field: 'Company', Operator: 'contains', Value: q || '' }
      ]
    },
    // Select only what we need
    Select: ['Id','Company','City','State','Zip','BillingContact','BillingPhone','BillingEmail']
  };
  const data = await otCall('/Entity/Search', { body });
  const items = Array.isArray(data?.Items) ? data.Items : [];
  return items.map(normCustomerListItem);
}

// Get a single customer by Id
export async function getCustomerById(id) {
  const body = { EntityName: 'Customer', Id: Number(id) };
  const data = await otCall('/Entity/Get', { body });
  return normCustomerDetail(data);
}

// Sales Orders search (for Clone flow)
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
  const data = await otCall('/Entity/Search', { body });
  const items = Array.isArray(data?.Items) ? data.Items : [];
  return items.map(x => ({
    id: x.Id,
    number: x.Number,
    company: x.CustomerCompany,
    status: x.Status,
    date: x.Date
  }));
}

// Part items search for Items tab
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
  const data = await otCall('/Entity/Search', { body });
  const items = Array.isArray(data?.Items) ? data.Items : [];
  return items.map(x => ({
    id: x.Id,
    sku: x.Sku,
    desc: x.Description,
    mfgPart: x.ManufacturerPartNumber,
    vendor: x.VendorName,
    active: !!x.IsActive,
    stocked: !!x.IsStocked
  }));
}

// ---- Normalizers to match your front-end ----

function normCustomerListItem(x) {
  return {
    id: x.Id,
    company: x.Company,
    city: x.City,
    state: x.State,
    zip: x.Zip,
    billingContact: x.BillingContact,
    billingPhone: x.BillingPhone,
    billingEmail: x.BillingEmail,
  };
}

function normCustomerDetail(x) {
  // Shape expected by applyCustomerFromApi() and paste JSON examples in your UI
  return {
    company: x.Company,
    billing: {
      contact: x.BillingContact || '',
      phone:   x.BillingPhone   || '',
      email:   x.BillingEmail   || '',
      street:  x.BillingAddress1 || '',
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
      shortShip: x.ShortShipPolicy || '',   // adjust if you store this elsewhere
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
