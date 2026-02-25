const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();
const PORT = 4000;
const SHARED_PASSWORD = "2010";
const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".bmp",
  ".avif",
]);

const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const safeBase = path
      .parse(file.originalname)
      .name.replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 60);
    const extension = path.extname(file.originalname) || ".jpg";
    cb(null, `${Date.now()}-${safeBase}${extension}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (file.mimetype && file.mimetype.startsWith("image/")) {
    cb(null, true);
    return;
  }

  cb(new Error("Apenas imagens sao permitidas."));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

app.get("/images", (_req, res) => {
  try {
    const files = fs
      .readdirSync(uploadsDir)
      .filter((file) => IMAGE_EXTENSIONS.has(path.extname(file).toLowerCase()))
      .map((file) => {
        const fullPath = path.join(uploadsDir, file);
        const stats = fs.statSync(fullPath);
        return {
          name: file,
          createdAt: stats.mtimeMs,
          url: `http://localhost:${PORT}/uploads/${encodeURIComponent(file)}`,
        };
      })
      .sort((a, b) => b.createdAt - a.createdAt);

    res.json(files);
  } catch (_error) {
    res.status(500).json({ error: "Nao foi possivel listar as imagens." });
  }
});

app.post("/upload", upload.single("image"), (req, res) => {
  const password = req.body.password;
  if (password !== SHARED_PASSWORD) {
    if (req.file && req.file.filename) {
      try {
        fs.unlinkSync(path.join(uploadsDir, req.file.filename));
      } catch (_error) {
        // best effort
      }
    }

    res.status(401).json({ error: "Senha incorreta." });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "Nenhuma imagem enviada." });
    return;
  }

  res.status(201).json({
    message: "Imagem enviada com sucesso.",
    image: {
      name: req.file.filename,
      createdAt: Date.now(),
      url: `http://localhost:${PORT}/uploads/${encodeURIComponent(req.file.filename)}`,
    },
  });
});

app.delete("/images/:name", (req, res) => {
  const decodedName = decodeURIComponent(req.params.name || "");
  const safeName = path.basename(decodedName);
  const extension = path.extname(safeName).toLowerCase();

  if (!safeName || !IMAGE_EXTENSIONS.has(extension)) {
    res.status(400).json({ error: "Imagem invalida." });
    return;
  }

  const imagePath = path.join(uploadsDir, safeName);
  if (!fs.existsSync(imagePath)) {
    res.status(404).json({ error: "Imagem nao encontrada." });
    return;
  }

  try {
    fs.unlinkSync(imagePath);
    res.json({ message: "Imagem removida com sucesso." });
  } catch (_error) {
    res.status(500).json({ error: "Nao foi possivel remover a imagem." });
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    res.status(400).json({ error: "Falha no upload da imagem." });
    return;
  }

  if (error) {
    res.status(400).json({ error: error.message || "Erro inesperado." });
    return;
  }

  res.status(500).json({ error: "Erro interno do servidor." });
});

app.listen(PORT, () => {
  console.log(`Servidor ativo em http://localhost:${PORT}`);
});
