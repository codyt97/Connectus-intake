// api/ot/_lib/ot.js
// Minimal OrderTime client for Vercel Functions (Node 20)

const BASE = process.env.OT_BASE_URL || "https://services.ordertime.com/api";
const DEFAULT_TIMEOUT_MS = 20000;

function headers() {
  const h = {
    accept: "application/json",
    "content-type": "application/json",
    apiKey: process.env.OT_API_KEY,
    email: process.env.OT_EMAIL,
    password: process.env.OT_PASSWORD
  };
  if (process.env.OT_DEVKEY) h.DevKey = process.env.OT_DEVKEY; // some tenants require this
  return h;
}

async function doFetch(path, init = {}) {
  const url = `${BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      ...init,
      headers: { ...headers(), ...(init.headers || {}) },
      signal: ctrl.signal
    });

    const ct = res.headers.get("content-type") || "";
    const body = ct.includes("application/json") ? await res.json().catch(() => null)
                                                 : await res.text().catch(() => "");

    if (!res.ok) {
      const msg = typeof body === "string" ? body : JSON.stringify(body || {});
      throw new Error(`${init.method || "GET"} ${path} → ${res.status}: ${msg}`);
    }
    return body;
  } finally {
    clearTimeout(t);
  }
}

export const otGet  = (pathWithQs)      => doFetch(pathWithQs, { method: "GET" });
export const otPost = (path, body = {}) => doFetch(path, { method: "POST", body: JSON.stringify(body) });

/** ---- High-level helpers ---- **/

// Some tenants support POST /entityref with names; some need GUID record types.
// We try entityref by name first; if it fails, return [] (we can add GUID mode later).
export async function searchCustomersByName(q, take = 25, skip = 0) {
  try {
    const rows = await otPost("/entityref", { entityName: "Customer", searchText: q, take, skip });
    return Array.isArray(rows)
      ? rows.map(r => ({ id: r.Id ?? r.id, name: r.Name ?? r.name })).filter(r => r.id && r.name)
      : [];
  } catch {
    return [];
  }
}

export async function getCustomerById(id) {
  if (id === undefined || id === null) throw new Error("customer id required");
  return otGet(`/customer?id=${encodeURIComponent(id)}`);
}

export async function searchPartItemsByText(q, take = 100, skip = 0) {
  try {
    const rows = await otPost("/entityref", { entityName: "PartItem", searchText: q, take, skip });
    return Array.isArray(rows)
      ? rows.map(r => ({ id: r.Id ?? r.id, name: r.Name ?? r.name })).filter(r => r.id && r.name)
      : [];
  } catch {
    return [];
  }
}

export async function getPartItemById(id) {
  if (id === undefined || id === null) throw new Error("item id required");
  return otGet(`/partitem?id=${encodeURIComponent(id)}`);
}

export async function getItemVendors(itemId) {
  try {
    const rows = await otGet(`/itemvendor?itemId=${encodeURIComponent(itemId)}`);
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}
