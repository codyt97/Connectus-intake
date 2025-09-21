module.exports = (req, res) => {
  const q = String(req.query.q || "").trim();
  res.status(200).json(q ? [] : []);
};

