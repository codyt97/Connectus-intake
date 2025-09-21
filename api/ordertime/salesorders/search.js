// /api/ordertime/salesorders/search.js
import { searchSalesOrders } from '../../_ot';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const { q = '', take = '25' } = req.query;
    if (!q.trim()) return res.status(400).json({ error: 'Missing query ?q=' });

    const items = await searchSalesOrders(q.trim(), take);
    return res.status(200).json(items);
  } catch (err) {
    console.error('salesorders/search error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
