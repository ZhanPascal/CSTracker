const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5000;

// Autoriser les requêtes du frontend (port 3000)
app.use(cors());

// Route API exemple
app.get("/api/message", (req, res) => {
  res.json({ message: "Salut depuis le backend Express !" });
});

app.listen(PORT, () => {
  console.log(`Serveur backend lancé sur http://localhost:${PORT}`);
});
