// /api/diag/ot-ping.js
import { listCustomersByName } from '../_ot';

export default async function handler(_req, res) {
  try {
    const data = await listCustomersByName('', 1, 1); // try empty search
    res.status(200).json({ ok: true, count: Array.isArray(data) ? data.length : 0, sample: data?.[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}
