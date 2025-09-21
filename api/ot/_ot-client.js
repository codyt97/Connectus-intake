// api/ot/_ot-client.
// CommonJS; works in Vercel Node 18+. Uses global fetch.

const BASE = process.env.OT_BASE_URL || "https://services.ordertime.com/api";
const DEFAULT_TIMEOUT_MS = 20000;

function baseHeaders() {
  const h = {
    accept: "application/json",
    "content-type": "application/json",
    apiKey: process.env.OT_API_KEY,
    email: process.env.OT_EMAIL,
    password: process.env.OT_PASSWORD
  };
  if (process.env.OT_DEVKEY) h.DevKey = process.env.OT_DEVKEY; // some tenants need this exact case
  return h;
}

async function doFetch(path, init = {}) {
  const url = `${BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), DEFAULT_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, { ...init, headers: { ...baseHeaders(), ...(init.headers || {}) }, signal: ctrl.signal });
  } finally { clearTimeout(to); }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`OT ${init.method || "GET"} ${path} ${res.status}: ${text}`);
  }
  const ct = res.headers.get("content-type") || "";
  return res.status === 204 ? null : ct.includes("application/json") ? res.json() : res.text();
}

const otGet  = (pathWithQs)      => doFetch(pathWithQs, { method: "GET" });
const otPost = (path, body = {}) => doFetch(path, { method: "POST", body: JSON.stringify(body) });

async function entityRef(entityName, searchText, take = 25, skip = 0) {
  return otPost("/entityref", { entityName, searchText, take, skip });
}

async function searchCustomersByName(q, take = 25, skip = 0) {
  try {
    const rows = await entityRef("Customer", q, take, skip);
    return Array.isArray(rows)
      ? rows.map(r => ({ id: r.Id ?? r.id, name: r.Name ?? r.name })).filter(r => r.id && r.name)
      : [];
  } catch { return []; }
}

async function getCustomerById(id) {
  if (id === undefined || id === null) throw new Error("customer id required");
  return otGet(`/customer?id=${encodeURIComponent(id)}`);
}

async function getCustomerAddresses(customerId) {
  if (customerId === undefined || customerId === null) return [];
  try {
    const cust = await getCustomerById(Number(customerId));
    const b = cust?.BillAddress || {};
    const s = cust?.PrimaryShipAddress || {};
    const out = [];
    if (b && (b.Addr1 || b.City)) out.push({ Type:"Bill", Company:b.Addr1||"", Contact:b.Contact||"", Phone:b.Phone||"", Email:b.Email||"", Street:b.Addr2||"", Suite:b.Addr3||"", City:b.City||"", State:b.State||"", Zip:b.Zip||"" });
    if (s && (s.Addr1 || s.City)) out.push({ Type:"Ship", Name:s.Name||"Primary", Company:s.Addr1||"", Contact:s.Contact||"", Phone:s.Phone||"", Email:s.Email||"", Street:s.Addr2||"", Suite:s.Addr3||"", City:s.City||"", State:s.State||"", Zip:s.Zip||"" });
    return out;
  } catch { return []; }
}

async function searchPartItemsByText(q, take = 100, skip = 0) {
  try {
    const rows = await entityRef("PartItem", q, take, skip);
    return Array.isArray(rows)
      ? rows.map(r => ({ id: r.Id ?? r.id, name: r.Name ?? r.name })).filter(r => r.id && r.name)
      : [];
  } catch { return []; }
}

async function getPartItemById(id) {
  if (id === undefined || id === null) throw new Error("item id required");
  return otGet(`/partitem?id=${encodeURIComponent(id)}`);
}

async function getItemVendors(itemId) {
  if (itemId === undefined || itemId === null) return [];
  try {
    const rows = await otGet(`/itemvendor?itemId=${encodeURIComponent(itemId)}`);
    return Array.isArray(rows) ? rows : [];
  } catch { return []; }
}

function pick(...vals) { return vals.find(v => v != null && String(v).trim() !== "") || ""; }

function mapCustomerToWebsite(cust = {}) {
  const b = cust?.BillAddress || {};
  const s = cust?.PrimaryShipAddress || {};
  return {
    company: pick(cust.Name, cust.CompanyName),
    billing:  { company:b.Addr1||"", contact:b.Contact||"", phone:b.Phone||"", email:b.Email||"", street:b.Addr2||"", suite:b.Addr3||"", city:b.City||"", state:b.State||"", zip:b.Zip||"" },
    shipping: { company:s.Addr1||"", contact:s.Contact||"", phone:s.Phone||"", email:s.Email||"", street:s.Addr2||"", suite:s.Addr3||"", city:s.City||"", state:s.State||"", zip:s.Zip||"" },
    payment: {
      method: pick(cust.PaymentMethodRef?.Name, "Net Terms"),
      terms:  pick(cust.TermRef?.Name),
      taxExempt: Boolean(cust.SalesTaxCodeRef?.Name?.toLowerCase?.().includes("non") || cust.NonTaxable)
    }
  };
}

function mapItemToRow(item = {}, vendors = []) {
  const cf = Object.fromEntries((item.CustomFields || []).map(c => [c.Caption || c.Name, c.Value]));
  const v = vendors[0] || {};
  const carrier = cf["Carrier"] || cf["ItemCust5"] || "";
  const model   = cf["Model #"] || cf["Mfg Part #"] || cf["ItemCust3"] || cf["ItemCust17"] || "";
  const color   = cf["Color"] || "";
  return {
    descriptionFull: [cf["Manufacturer"] || "", model || "", color || ""].filter(Boolean).join(" / "),
    modelPartNo: model,
    color,
    orderTimeSku: pick(item.Name, item.SKU),
    qty: 1,
    lteWifi: (cf["Networking Type"] || "").toString().toUpperCase().includes("WIFI")
      ? ((cf["Networking Type"] || "").toString().toUpperCase().includes("LTE") ? "Both" : "Wi-Fi")
      : "LTE",
    carrier,
    msrp: item.MSRP ?? cf["MSRP"] ?? "",
    sellPrice: item.Price ?? "",
    condition: (cf["Condition"] || "").toString() || "CPO",
    vendor: v.Vendor?.Name || v.VendorRef?.Name || "",
    quotedCost: item.StdCost ?? item.StandardCost ?? "",
    sku: pick(item.Name, item.SKU),
    desc: pick(item.GeneralDescription, item.Description),
    sell: item.Price ?? "",
    cost: item.StdCost ?? item.StandardCost ?? "",
    itemId: item.Id ?? item.ID ?? ""
  };
}

module.exports = {
  searchCustomersByName,
  getCustomerById,
  getCustomerAddresses,
  searchPartItemsByText,
  getPartItemById,
  getItemVendors,
  mapCustomerToWebsite,
  mapItemToRow
};
