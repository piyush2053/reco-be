const express = require('express');
const path = require('path');
const cors = require('cors');
const excelToJson = require('convert-excel-to-json');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.get('/', (req:any,res: any) => {
  res.type('html').send(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>Reco Bath</title>
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
 * Returns data from the Excel file as JSON.
 */
app.get('/getExcelDatatoday', (req:any, res:any) => {
  const filePath = path.join(__dirname, 'test', 'Sales Order Pending.xlsx');
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const result = excelToJson({
    sourceFile: filePath,
    header: {
      rows: 8,
    },
    columnToKey: {
      '*': '{{columnHeader}}',
    },
  });

  let salesOrderData = result['Sales Order Register'] || [];

  // 🔥 Normalize headers (remove spaces, fix casing)
  salesOrderData = salesOrderData.map((row:any) => {
    const normalizedRow: any = {};
    for (const key in row) {
      const cleanKey = key.trim().replace(/\s+/g, ' '); // normalize multiple spaces
      normalizedRow[cleanKey] = row[key];
    }
    return normalizedRow;
  });

  const processedData = salesOrderData.map((row: any) => {
    return {
      date: row['Date'] || '',
      particulars: row['Particulars'] || '',
      voucherType: row['Voucher Type'] || '',
      voucherNo: row['Voucher No.'] || '',
      orderReferenceNo: row['Order Reference No.'] || '',
      narration: row['Narration'] || '',
      quantity: row['Quantity'] || '',
      rate: row['Rate'] || '',
      value: row['Value'] || '',
      grossTotal: row['Gross Total'] || '',
      saleGSTRecoCp: row['Sale GST Reco Cp'] || '',
      sgstOutput: row['SGST Output'] || '',
      cgstOutput: row['CGST Output'] || '',
      roundOff: row['Round Off'] || '',
      // 👇 yaha ab Special Discount hamesha aayega
      specialDiscountOnGSTSale: row['Special Discount on GST Sale'] || '',
      saleGSTAccessories: row['Sale GST Accessories'] || '',
      adhesiveSale: row['Adisive Sale'] || '',
      saleGSTSW: row['Sale GST S/W'] || '',
      saleGSTPVC: row['Sale GST PVC'] || '',
      cashDiscountOnGSTSale: row['Cash Discount on GST Sale'] || '',
      salesReturnReco: row['Sales Return Reco'] || '',
      plumberSchOnGstDiscount: row['Plumber Sch on Gst Discount'] || '',
      fuelFactorGSTSaleFREIGHT: row['Fuel Factor GST Sale FREIGHT'] || '',
      cartageGST: row['Cartage GST'] || '',
      igstOutput: row['IGST (OUTPUT)'] || '',
      displayDiscountOnGstSale: row['Display Discount on Gst Sale'] || '',
      saleGstPTMT: row['Sale Gst PTMT'] || '',
    };
  });

  res.json(processedData);
});


// Health check
app.get('/health', (req:any, res: any) => {
  res.status(200).json({ status: 'ok-reco', timestamp: new Date().toISOString() });
});

app.listen(3001, () => console.log('Server running on http://localhost:3001'));

module.exports = app;
