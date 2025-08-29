const express = require("express");
const fs = require("fs");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, "db.json");

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// Helpers to read/write DB
function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch {
    return { transactions: [] };
  }
}
function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Get all transactions
app.get("/api/transactions", (req, res) => {
  res.json(readDB().transactions);
});

// Add a new transaction
app.post("/api/transactions", (req, res) => {
  const { type, category, amount, note, date } = req.body;
  if (!["income", "expense"].includes(type)) return res.status(400).send("Invalid type");
  if (!date) return res.status(400).send("Date required");

  const tx = {
    id: uuidv4(),
    type,
    category: category || "Other",
    amount: Number(amount),
    note: note || "",
    date: new Date(date).toISOString()
  };

  const db = readDB();
  db.transactions.push(tx);
  writeDB(db);

  res.status(201).json(tx);
});

// Delete a transaction
app.delete("/api/transactions/:id", (req, res) => {
  const db = readDB();
  const newTx = db.transactions.filter(t => t.id !== req.params.id);
  if (newTx.length === db.transactions.length) return res.status(404).send("Not found");
  db.transactions = newTx;
  writeDB(db);
  res.sendStatus(204);
});

// Export all transactions as CSV
app.get("/api/export", (req, res) => {
  const db = readDB();
  const rows = [["Date","Type","Category","Amount","Note"]];
  const sorted = db.transactions.slice().sort((a,b) => new Date(b.date) - new Date(a.date));
  for (const it of sorted) {
    rows.push([
      new Date(it.date).toLocaleString(),
      it.type, it.category, it.amount.toFixed(2), it.note || ""
    ]);
  }
  const csv = rows.map(r => r.map(field => {
    const s = String(field ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }).join(",")).join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=transactions.csv");
  res.send(csv);
});

// Start server
app.listen(PORT, () => console.log(`✅ Server running at http://localhost:${PORT}`));
