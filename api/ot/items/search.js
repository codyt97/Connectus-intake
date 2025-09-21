const { searchPartItemsByText } = require("../_ot-client");

module.exports = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const take = Math.min(Math.max(parseInt(req.query.take || "100", 10) || 100, 1), 500);
    const skip = Math.max(parseInt(req.query.skip || "0", 10) || 0, 0);
    if (!q) return res.status(400).json({ error: "Missing ?q" });
    const rows = await searchPartItemsByText(q, take, skip);
    res.status(200).json(rows);
  } catch (e) {
    res.status(502).json({ error: `item search failed: ${e.message}` });
  }
};
