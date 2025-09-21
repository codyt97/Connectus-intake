const { getCustomerById, getCustomerAddresses, mapCustomerToWebsite } = require("../_ot-client");

module.exports = async (req, res) => {
  try {
    const { id } = req.query; // Vercel dynamic segment
    const [cust, _addrs] = await Promise.all([
      getCustomerById(Number(id)),
      getCustomerAddresses(Number(id)).catch(() => [])
    ]);
    res.status(200).json(mapCustomerToWebsite(cust));
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
};
