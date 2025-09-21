// /api/_ot.js
const OT_BASE_URL = process.env.OT_BASE_URL || 'https://api.ordertime.com/api';
const OT_API_KEY  = process.env.OT_API_KEY;

// Hard fail early if key is missing
export function assertEnv() {
  if (!OT_BASE_URL) throw new Error('Missing OT_BASE_URL');
  if (!OT_API_KEY)  throw new Error('Missing OT_API_KEY (use a server-side API token, not email/password)');
}

export async function otCall(path, { method = 'POST', body } = {}) {
  assertEnv();
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
export async function searchCustomersByName(q, take = 25) {
  // Try multiple likely fields: Company, Name, CompanyName
  const body = {
    EntityName: 'Customer',
    Take: Math.min(Math.max(parseInt(take || 25, 10), 1), 100),
    Skip: 0,
    Filter: {
      Logic: 'or',
      Filters: [
        { Field: 'Company',      Operator: 'contains', Value: q || '' },
        { Field: 'Name',         Operator: 'contains', Value: q || '' },
        { Field: 'CompanyName',  Operator: 'contains', Value: q || '' },
      ]
    },
    Select: [
      'Id','Company','Name','City','State','Zip',
      'BillingContact','BillingPhone','BillingEmail'
    ]
  };
  const data = await otCall('/Entity/Search', { body });
  const items = Array.isArray(data?.Items) ? data.Items : [];
  return items.map(x => ({
    id: x.Id,
    company: x.Company || x.CompanyName || x.Name || '',
    city: x.City, state: x.State, zip: x.Zip,
    billingContact: x.BillingContact,
    billingPhone: x.BillingPhone,
    billingEmail: x.BillingEmail,
  }));
}

export async function getCustomerById(id) {
  const body = { EntityName: 'Customer', Id: Number(id) };
  const x = await otCall('/Entity/Get', { body });
  return {
    company: x.Company || x.CompanyName || x.Name || '',
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
