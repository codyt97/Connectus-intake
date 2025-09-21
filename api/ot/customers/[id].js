import { getCustomerById } from "../_lib/ot.js";

export default async function handler(req, res) {
  const { id } = req.query;
  try {
    const cust = await getCustomerById(Number(id));
    res.status(200).json(cust);
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
}
