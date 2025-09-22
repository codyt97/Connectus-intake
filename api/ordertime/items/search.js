import { otPost } from '../../_ot';


// Map OT item -> minimal UI card
function toItemCard(x) {
  return {
    id: x.Id,
    name: x.Name || x.ItemName || x.Number || '',
    number: x.Number || x.Sku || '',
    uom: x.SalesUOMRef?.Name || x.UOMRef?.Name || '',
    price: x.SalesPrice ?? x.Price ?? 0,
    type: x.ItemType || x.Type || '',
  };
}

export default async function handler(req, res) {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.status(400).json({ error: 'Missing q' });

    // Item All list (RecordTypeEnum 115). Name LIKE q.
    // If you’d like to include item number too, do a second call and merge.
    const baseFilter = [{ PropertyName: 'Name', Operator: 12, FilterValueArray: q }]; // 12 = Like
    const { result = [] } = await otList({ Type: 115, Filters: baseFilter, NumberOfRecords: 25 });

    // optional: also search Number LIKE q, then merge uniques
    const { result: byNumber = [] } = await otList({ Type: 115, Filters: [{ PropertyName: 'Number', Operator: 12, FilterValueArray: q }], NumberOfRecords: 25 })
      .catch(() => ({ result: [] }));

    const seen = new Set();
    const merged = [...result, ...byNumber].filter(i => (seen.has(i.Id) ? false : (seen.add(i.Id), true)));

    res.json(merged.map(toItemCard));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
