module.exports = (req, res) => {
  const q = String(req.query.q || "").trim();
  // TODO: replace with OT search; stub returns [] so UI won't crash
  res.status(200).json(q ? [] : []);
};
