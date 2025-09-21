// /api/diag/ot-ping.js
import { otSmartCall } from '../_ot';

export default async function handler(_req, res) {
  try {
    const result = await otSmartCall({
      entity: 'Customer',
      action: 'Search',
      body: { EntityName: 'Customer', Take: 1, Skip: 0 }
    });
    const keys = result && typeof result === 'object' ? Object.keys(result) : [];
    res.status(200).json({ ok: true, shape: keys, sample: Array.isArray(result?.Items) ? result.Items[0] : result[0] });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}
