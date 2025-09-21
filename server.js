// server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import axios from "axios";

const app = express();
app.use(express.json({ limit: "256kb" }));
app.use(cors());
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

/** ====== OrderTime REST config ======
 * If you already have these in your droplet, reuse them.
 */
const OT_BASE_URL = process.env.OT_BASE_URL || "https://api.ordertime.com/api";
const OT_API_KEY  = process.env.OT_API_KEY;           // e.g. "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
if (!OT_API_KEY) {
  console.error("Missing OT_API_KEY env var");
}

/** Helper to call OrderTime /Entity/Search with a standard shape */
async function entitySearch(entity, filter, page = 1, pageSize = 25) {
  const url = `${OT_BASE_URL}/Entity/Search`;
  const body = {
    EntityName: entity,           // "Customer", "SalesOrder", "Item"
    Filter: filter || {},         // { "Name": { "Contains": "Ameri" } } etc.
    Page: page,
    PageSize: pageSize
  };
  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${OT_API_KEY}`
  };
  const { data } = await axios.post(url, body, { headers, timeout: 15_000 });
  // Expected shape: { Items: [...], Total: n, Page: 1, PageSize: 25 }
  return data;
}

/** ========= ROUTES ========= **/

// Customers: q matches Company/Name/Code loosely
app.get("/api/ordertime/customers/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json([]);
    // Adjust fields to whatever your OT schema supports
    const filter = {
      Or: [
        { "Company": { "Contains": q } },
        { "Name":    { "Contains": q } },
        { "Code":    { "Contains": q } }
      ]
    };
    const data = await entitySearch("Customer", filter, 1, 50);
    const items = (data.Items || []).map(c => ({
      id: c.Id,
      company: c.Company || c.Name || "",
      billingContact: c.BillingContactName || "",
      billingPhone: c.BillingPhone || "",
      billingEmail: c.BillingEmail || "",
      city: c.BillingCity || "",
      state: c.BillingState || "",
      zip: c.BillingZip || ""
    }));
    res.json(items);
  } catch (err) {
    console.error(err?.response?.data || err.message);
    res.status(500).json({ error: "Customer search failed" });
  }
});

// Sales Orders: q can be SO number or customer text
app.get("/api/ordertime/sales-orders/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json([]);
    const filter = {
      Or: [
        { "Number":   { "Contains": q } },     // SO-2025-...
        { "Customer": { "Contains": q } }      // Customer name/code on header
      ]
    };
    const data = await entitySearch("SalesOrder", filter, 1, 50);
    const items = (data.Items || []).map(so => ({
      id: so.Id,
      number: so.Number,
      date: so.Date,                 // map to your actual field names from OT
      status: so.Status,
      customer: so.Customer,
      total: so.Total
    }));
    res.json(items);
  } catch (err) {
    console.error(err?.response?.data || err.message);
    res.status(500).json({ error: "Sales order search failed" });
  }
});

// Items: q matches ItemCode / Description / Manufacturer / Model
app.get("/api/ordertime/items/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json([]);
    const filter = {
      Or: [
        { "ItemCode":     { "Contains": q } },
        { "Description":  { "Contains": q } },
        { "Manufacturer": { "Contains": q } },
        { "Model":        { "Contains": q } }
      ]
    };
    const data = await entitySearch("Item", filter, 1, 50);
    const items = (data.Items || []).map(it => ({
      id: it.Id,
      sku: it.ItemCode,
      desc: it.Description,
      manufacturer: it.Manufacturer,
      model: it.Model,
      uom: it.SalesUOM,
      active: it.IsActive,
    }));
    res.json(items);
  } catch (err) {
    console.error(err?.response?.data || err.message);
    res.status(500).json({ error: "Item search failed" });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Proxy listening on :${PORT}`));
