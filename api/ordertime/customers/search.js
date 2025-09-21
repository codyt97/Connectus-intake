import { searchCustomersByName, assertEnv } from '../../_ot';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const { q = '', take = '25' } = req.query;
    if (!q.trim()) return res.status(400).json({ error: 'Missing query ?q=' });

    assertEnv(); // throws with a clear message if misconfigured
    const items = await searchCustomersByName(q.trim(), take);
    return res.status(200).json(items);
  } catch (err) {
    console.error('customers/search error:', err);
    return res.status(500).json({ error: String(err.message || err) });
  }
}
