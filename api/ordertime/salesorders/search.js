export default async function handler(req, res) {
  const BASE = process.env.OT_BASE_URL;         // e.g. https://services.ordertime.com/api
  const KEY  = process.env.OT_API_KEY;

  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.status(200).json({ results: [] });

    // Helpers for filter rows
    const like = (prop) => ({
      PropertyName: prop,
      FieldType: 1,          // String
      Operator: 12,          // Like
      FilterValueArray: `%${q}%`
    });

    const filters = /^\d+$/.test(q)
      // Numeric -> exact DocNo match
      ? [{ PropertyName: 'DocNo', FieldType: 3, Operator: 1, FilterValueArray: String(parseInt(q, 10)) }]
      // Text -> OR across useful text fields
      : [
          like('CustomerPO'),
          like('Memo'),
          like('CustomerRef.Name') // works against the EntityRef name
        ];

    const body = {
      Type: 7,                    // Sales Order
      NumberOfRecords: 50,
      PageNumber: 1,
      Sortation: { PropertyName: 'DocNo', Direction: 2 }, // Desc
      Filters: filters
    };

    const r = await fetch(`${BASE}/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ApiKey: KEY },
      body: JSON.stringify(body)
    });
    const data = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(data));

    // normalize a thin list row
    const results = (data?.List || data || []).map(row => ({
      docNo: row.DocNo ?? row.docNo,
      date: row.Date ?? row.date,
      customer: row.CustomerRef?.Name ?? row.CustomerName ?? '',
      status: row.StatusRef?.Name ?? '',
    }));

    res.status(200).json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Sales order search failed' });
  }
}
