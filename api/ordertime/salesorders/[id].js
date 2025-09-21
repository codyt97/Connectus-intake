import { otFetch } from '../../_client';

export default async function handler(req, res) {
  try {
    const id = Number(req.query.id);
    if (!id) return res.status(400).json({ error: 'Missing id' });

    // Native entity endpoint for a Sales Order
    const data = await otFetch(`/salesorder?id=${id}`);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
