const express = require("express");
const cors = require("cors");

const biography = require("./data/biography");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

// Endpoint principal consumido pelo frontend.
app.get("/api/biography", (_req, res) => {
  res.json(biography);
});

app.get("/", (_req, res) => {
  res.type("text").send("Backend online. Use /api/biography.");
});

app.listen(PORT, () => {
  console.log(`Backend disponível em http://localhost:${PORT}`);
});
