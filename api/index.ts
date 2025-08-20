// api/index.js
const express = require('express');
const path = require('path');

const app = express();
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (req: any, res: any) => {
  res.type('html').send(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>Express on Vercel</title>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body>
       <p>Test Latik hit /getExcelDatatoday /health </p>
      </body>
    </html>
  `);
});

/**
 * NEW: /getExcelDatatoday
 * Returns dummy data shaped like a Tally Excel export in JSON form.
 * You can add a ?date=YYYY-MM-DD query to override "today".
 */
app.get('/getExcelDatatoday', (req:any, res:any) => {
  const todayIso = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const exportDate = req.query.date || todayIso;

  // Dummy Tally-like payload
  const data = {
    companyName: "Demo Traders Pvt Ltd",
    exportDate,                       // e.g. 2025-08-21
    currency: "INR",
    bookName: "Day Book",
    vouchers: [
      {
        date: exportDate,
        voucherType: "Sales",
        voucherNumber: "S-000123",
        partyLedger: "ABC Retailers",
        placeOfSupply: "Gujarat",
        narration: "Sale of goods",
        refNo: "INV-123",
        items: [
          { stockItem: "Item A", qty: 5, uom: "Nos", rate: 120.0, amount: 600.0, tax: { cgst: 9, sgst: 9 } },
          { stockItem: "Item B", qty: 2, uom: "Nos", rate: 350.0, amount: 700.0, tax: { cgst: 9, sgst: 9 } }
        ],
        ledgers: [
          { ledgerName: "Sales @18%", amount: -1100.0 },
          { ledgerName: "CGST @9%", amount: -99.0 },
          { ledgerName: "SGST @9%", amount: -99.0 },
          { ledgerName: "ABC Retailers", amount: 1298.0 }
        ],
        totals: { taxable: 1100.0, cgst: 99.0, sgst: 99.0, igst: 0.0, roundOff: 0.0, grandTotal: 1298.0 }
      },
      {
        date: exportDate,
        voucherType: "Receipt",
        voucherNumber: "R-000045",
        partyLedger: "ABC Retailers",
        narration: "Payment received via UPI",
        ledgers: [
          { ledgerName: "ABC Retailers", amount: -1298.0 },
          { ledgerName: "Bank - HDFC", amount: 1298.0 }
        ],
        totals: { amount: 1298.0 }
      },
      {
        date: exportDate,
        voucherType: "Purchase",
        voucherNumber: "P-000210",
        partyLedger: "XYZ Wholesalers",
        narration: "Purchase of stock",
        items: [
          { stockItem: "Item A", qty: 10, uom: "Nos", rate: 100.0, amount: 1000.0, tax: { cgst: 9, sgst: 9 } }
        ],
        ledgers: [
          { ledgerName: "XYZ Wholesalers", amount: -1180.0 },
          { ledgerName: "Purchases @18%", amount: 1000.0 },
          { ledgerName: "CGST @9%", amount: 90.0 },
          { ledgerName: "SGST @9%", amount: 90.0 }
        ],
        totals: { taxable: 1000.0, cgst: 90.0, sgst: 90.0, igst: 0.0, roundOff: 0.0, grandTotal: 1180.0 }
      }
    ],
    summary: {
      totalVouchers: 3,
      salesValue: 1298.0,
      purchaseValue: 1180.0,
      receipts: 1298.0,
      payments: 0.0,
      taxes: { cgst: 189.0, sgst: 189.0, igst: 0.0 }
    }
  };

  res.json(data);
});
// Health check
app.get('/health', (req: any, res: any) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));

module.exports = app;
