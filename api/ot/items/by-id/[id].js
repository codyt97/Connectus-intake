module.exports = (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: "missing id" });
  res.status(404).json({ error: "not implemented" });
};
