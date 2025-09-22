import { otPost } from '../../_ot';

function toSOCard(x) {
  return {
    id: x.Id,
    docNo: x.DocNumber || x.Number || x.DocNo || '',
    status: x.Status || x.DocStatus || '',
    customer: x.CustomerRef?.Name || '',
    date: x.TxnDate || x.Date || '',
    total: x.Total || x.GrandTotal || 0,
  };
}

export default async function handler(req, res) {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'Missing q' });

    const filtersByDoc = [{ PropertyName: 'DocNumber', Operator: 12, FilterValueArray: q }]; // LIKE
    const filtersByCust = [{ PropertyName: 'CustomerRef.Name', Operator: 12, FilterValueArray: q }];

    const [byDoc, byCust] = await Promise.all([
      otList({ Type: 7, Filters: filtersByDoc, NumberOfRecords: 25 }),
      otList({ Type: 7, Filters: filtersByCust, NumberOfRecords: 25 }).catch(() => ({ result: [] })),
    ]);

    const seen = new Set();
    const merged = [...(byDoc.result || []), ...(byCust.result || [])].filter(i => (seen.has(i.Id) ? false : (seen.add(i.Id), true)));

    res.json(merged.map(toSOCard));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
