const { getPartItemById, getItemVendors, mapItemToRow } = require("../../_ot-client");

module.exports = async (req, res) => {
  try {
    const { id } = req.query;
    const [item, vendors] = await Promise.all([
      getPartItemById(Number(id)),
      getItemVendors(Number(id)).catch(() => [])
    ]);
    res.status(200).json(mapItemToRow(item, vendors));
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
};
