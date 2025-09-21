import { listCustomersByName } from '../../_ot';

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
    const { q = '', page = '1', take = '25' } = req.query;
    if (!q.trim()) return res.status(400).json({ error: 'Missing query ?q=' });

    const rows = await listCustomersByName(q.trim(), parseInt(page,10)||1, parseInt(take,10)||25);

    // normalize a bit for your UI
    const items = rows.map(x => ({
      id: x.Id,
      name: x.Name || x.CompanyName || x.Company || '',
      city: x.City || x.BillingCity || '',
      state: x.State || x.BillingState || '',
      zip: x.Zip || x.BillingZip || '',
      email: x.Email || x.BillingEmail || '',
      phone: x.Phone || x.BillingPhone || ''
    }));

    res.status(200).json(items);
  } catch (err) {
    console.error('customers/search', err);
    res.status(500).json({ error: String(err.message || err) });
  }
}
