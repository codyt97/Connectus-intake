import { searchPartItemsByText } from "../../ot/_lib/ot.js";

export default async function handler(req, res) {
  try {
    const q = String(req.query.q || "").trim();
    const take = Math.min(Math.max(parseInt(req.query.take || "50", 10), 1), 500);
    const skip = Math.max(parseInt(req.query.skip || "0", 10), 0);
    if (!q || q.length < 2) return res.status(200).json([]);
    const rows = await searchPartItemsByText(q, take, skip);
    res.status(200).json(rows);
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
}
