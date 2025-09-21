module.exports = (req, res) => {
  const { id } = req.query;
  // TODO: replace with real OT fetch by id; stub returns 404 when missing
  if (!id) return res.status(400).json({ error: "missing id" });
  res.status(404).json({ error: "not implemented" });
};
