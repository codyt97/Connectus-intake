import { getPartItemById, getItemVendors } from "../../../ot/_lib/ot.js";

export default async function handler(req, res) {
  const { id } = req.query;
  try {
    const [item, vendors] = await Promise.all([
      getPartItemById(Number(id)),
      getItemVendors(Number(id)).catch(() => [])
    ]);
    res.status(200).json({ item, vendors });
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
}
