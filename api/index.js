const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());
app.use(express.json());
function formatDate(dateString) {
  if (!dateString) return "";

  const d = new Date(dateString);
  if (isNaN(d.getTime())) return "";

  return d
    .toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    })
    .replace(",", " -");
}

/* ---------------- PATH SETUP ---------------- */

const DATA_DIR = path.join(process.cwd(), "api", "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DATA_FILE = path.join(DATA_DIR, "kitchen_hisaab.json");
const USERS = ["piyush", "rishi"];

/* ---------------- JSON HELPERS ---------------- */

function ensureDataFile() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(
      DATA_FILE,
      JSON.stringify(
        { contributions: [], expenses: [], settlements: [] },
        null,
        2
      )
    );
  }
}

function readData() {
  const raw = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));

  return {
    contributions: Array.isArray(raw.contributions) ? raw.contributions : [],
    expenses: Array.isArray(raw.expenses) ? raw.expenses : [],
    settlements: Array.isArray(raw.settlements) ? raw.settlements : [],
  };
}


function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

/* ---------------- INIT ---------------- */

ensureDataFile();

function calculateSettlement(data) {
  const rishiExpenses = data.expenses.reduce(
    (s, e) => (e.paidBy === "rishi" ? s + Number(e.amount || 0) : s),
    0
  );

  const settledAmount = data.settlements.reduce(
    (s, st) => s + Number(st.amount || 0),
    0
  );

  return Math.max(0, rishiExpenses - settledAmount);
}

/* ---------------- ROUTES ---------------- */

app.get("/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

/**
 * ADD CONTRIBUTION
 * one user -> auto equal for other
 */
app.post("/contribution", (req, res) => {
  try {
    const { user, amount } = req.body;

    if (!USERS.includes(user) || !amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const other = user === "piyush" ? "rishi" : "piyush";
    const dateTime = new Date().toISOString();
    const data = readData();

    data.contributions.push(
      { dateTime, user, amount },
      { dateTime, user: other, amount }
    );

    writeData(data);

    res.json({ message: "Contribution added" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to write contribution" });
  }
});

/**
 * ADD EXPENSE
 */
app.post("/expense", (req, res) => {
  try {
    const { paidBy = "piyush", amount, description = "" } = req.body;

    if (!USERS.includes(paidBy) || !amount || amount <= 0) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const dateTime = new Date().toISOString();

    const data = readData();
    data.expenses.push({ dateTime, paidBy, amount, description });

    writeData(data);

    res.json({ message: "Expense added" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to write expense" });
  }
});

/**
 * WALLET SUMMARY
 */
app.get("/wallet", (_req, res) => {
  const data = readData();

  const totalContributions = data.contributions.reduce(
    (s, c) => s + Number(c.amount || 0),
    0
  );

  const totalExpenses = data.expenses.reduce(
    (s, e) => s + Number(e.amount || 0),
    0
  );

  res.json({
    balance: totalContributions - totalExpenses,
    totalContributions,
    totalExpenses,
  });
});

/**
 * ACCOUNT STATEMENT (HTML REPORT)
 */
/**
 * ACCOUNT STATEMENT (HTML REPORT)
 */
app.get("/statement", (_req, res) => {
  const data = readData();

  /* ---------- Settlement Calculation ---------- */
  const piyushOwesRishi = calculateSettlement(data);
  const settlementRows = data.settlements
    .map(
      s => `
    <tr>
      <td>${formatDate(s.dateTime)}</td>
      <td>${s.from}</td>
      <td>${s.to}</td>
      <td class="amount-cell amount-green">₹ ${s.amount}</td>
    </tr>
    `
    )
    .join("");

  const totalContributions = data.contributions.reduce(
    (s, c) => s + Number(c.amount || 0),
    0
  );

  const totalExpenses = data.expenses.reduce(
    (s, e) => s + Number(e.amount || 0),
    0
  );

  const settlementText =
    piyushOwesRishi > 0
      ? `Piyush owes Rishi ₹${piyushOwesRishi}`
      : `All dues settled`;

  const settlementClass =
    piyushOwesRishi > 0 ? "danger" : "success";

  /* ---------- Rows ---------- */

  const contributionRows = data.contributions
    .map(
      c => `
      <tr>
        <td>${formatDate(c.dateTime)}</td>
        <td>${c.user}</td>
        <td class="amount-cell amount-green">₹ ${c.amount}</td>
      </tr>
      `
    )
    .join("");

  const expenseRows = data.expenses
    .map(
      e => `
      <tr>
        <td>${formatDate(e.dateTime)}</td>
        <td>${e.paidBy}</td>
        <td>${e.description}</td>
        <td class="amount-cell amount-red">₹ ${e.amount}</td>
      </tr>
      `
    )
    .join("");

  const contributionCards = data.contributions
    .map(
      c => `
      <div class="list-card">
        <div>
          <strong>${c.user}</strong>
          <div class="muted">${formatDate(c.dateTime)}</div>
        </div>
        <div class="amount green">+ ₹${c.amount}</div>
      </div>
      `
    )
    .join("");
  const settlementCards = data.settlements
    .map(
      s => `
    <div class="list-card">
      <div>
        <strong>Settlement</strong>
        <div class="muted">
          ${s.from} → ${s.to} · ${formatDate(s.dateTime)}
        </div>
      </div>
      <div class="amount green">₹${s.amount}</div>
    </div>
    `
    )
    .join("");

  const expenseCards = data.expenses
    .map(
      e => `
      <div class="list-card">
        <div>
          <strong>${e.description || "Expense"}</strong>
          <div class="muted">Paid by ${e.paidBy} · ${formatDate(e.dateTime)}</div>
        </div>
        <div class="amount red">₹${e.amount}</div>
      </div>
      `
    )
    .join("");

  /* ---------- HTML ---------- */
  const html = `
  <html>
  <head>
    <title>Kitchen Hisaab – Statement</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />

    <style>
      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont;
        background: #f6f7fb;
        margin: 0;
        padding: 16px;
      }

      h1 { margin-bottom: 16px; }

      .container {
        max-width: 1100px;
        margin: auto;
      }

      .grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin-bottom: 24px;
      }

      .card {
        background: #fff;
        border-radius: 10px;
        padding: 16px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      }

      .card h3 {
        margin: 0 0 6px 0;
        font-size: 14px;
        color: #666;
      }

      .card .value {
        font-size: 22px;
        font-weight: 700;
      }

      .danger { color: #e53935; }
      .success { color: #2e7d32; }

      table {
        width: 100%;
        border-collapse: collapse;
        background: #fff;
        border-radius: 10px;
        overflow: hidden;
        margin-bottom: 24px;
      }

      th, td {
        padding: 12px;
        text-align: left;
      }

      th {
        background: #f1f3f6;
        font-size: 13px;
        color: #555;
      }

      .list-card {
        background: #fff;
        border-radius: 10px;
        padding: 14px;
        margin-bottom: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 1px 4px rgba(0,0,0,0.08);
      }

      .muted {
        font-size: 12px;
        color: #777;
      }

      .amount {
        font-weight: 700;
        font-size: 16px;
      }

      .green { color: #2e7d32; }
      .red { color: #e53935; }

      /* -------- MOBILE -------- */
      @media (max-width: 768px) {
        .grid { grid-template-columns: 1fr; }
        table { display: none; }
      }

      /* -------- DESKTOP (PRO UI) -------- */
      @media (min-width: 769px) {
        .mobile-only { display: none; }

        table {
          border: 1px solid #e0e0e0;
        }

        th {
          border-bottom: 1px solid #dcdcdc;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.4px;
        }

        td {
          border-bottom: 1px solid #f0f0f0;
          font-size: 14px;
        }

        .amount-cell {
          font-weight: 700;
          text-align: right;
          border-radius: 6px;
        }

        .amount-green {
          color: #2e7d32;
          background: #e8f5e9;
        }

        .amount-red {
          color: #c62828;
          background: #fdecea;
        }
      }
    </style>
  </head>

  <body>
    <div class="container">
      <h1>Account Statement</h1>

      <div class="grid">
        <div class="card">
          <h3>Settlement</h3>
          <div class="value ${settlementClass}">
            ${settlementText}
          </div>
        </div>

        <div class="card">
          <h3>Total Wallet Recharge</h3>
          <div class="value">₹ ${totalContributions}</div>
        </div>

        <div class="card">
          <h3>Total Expenses</h3>
          <div class="value">₹ ${totalExpenses}</div>
        </div>
      </div>

      <h2>Wallet History</h2>

      <table>
        <tr>
          <th>Date</th>
          <th>User</th>
          <th>Wallet Recharge</th>
        </tr>
        ${contributionRows}
      </table>

      <div class="mobile-only">
        ${contributionCards}
      </div>

      <h2>Expenses</h2>

      <table>
        <tr>
          <th>Date</th>
          <th>Paid By</th>
          <th>Description</th>
          <th>Amount</th>
        </tr>
        ${expenseRows}
      </table>

      <div class="mobile-only">
        ${expenseCards}
      </div>
      <h2>Settlements</h2>

<table>
  <tr>
    <th>Date</th>
    <th>From</th>
    <th>To</th>
    <th>Amount</th>
  </tr>
  ${settlementRows || ""}
</table>

<div class="mobile-only">
  ${settlementCards || ""}
</div>

    </div>
  </body>
  </html>
  `;

  res.type("html").send(html);
});

/**
 * SETTLE DUES
 * Clears dues WITHOUT touching wallet
 */
app.post("/settle", (_req, res) => {
  try {
    const data = readData();
    const due = calculateSettlement(data);

    if (due <= 0) {
      return res.json({ message: "Nothing to settle" });
    }

    data.settlements.push({
      dateTime: new Date().toISOString(),
      amount: due,
      from: "piyush",
      to: "rishi",
    });

    writeData(data);

    res.json({
      message: "Settlement cleared",
      settledAmount: due,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Settlement failed" });
  }
});

app.get("/settlement", (_req, res) => {
  const data = readData();
  const piyushOwesRishi = calculateSettlement(data);

  res.json({ piyushOwesRishi });
});


/* ---------------- SERVER ---------------- */

const PORT = 3001;
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`Kitchen Hisaab API running on http://localhost:${PORT}`);
  });
}

module.exports = app;
