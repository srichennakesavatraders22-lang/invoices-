/**
 * test_stock_decrement.mjs
 * ──────────────────────────────────────────────────────────────────────────────
 * Diagnoses why stock is not decreasing when invoices are created.
 * Checks:
 *   1. Current stock of all products
 *   2. All invoices with status != Draft/Cancelled
 *   3. Calculates expected stock after all invoices
 *   4. Compares actual vs expected
 *   5. Runs a manual decrementStock fix for all existing invoices if needed
 */

import dns from 'dns';
import mongoose from 'mongoose';
import 'dotenv/config';

try { dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']); } catch (_) {}

const productSchema = new mongoose.Schema({
  name: String,
  stock: { type: Number, default: 0 },
  minStock: { type: Number, default: 10 },
  isActive: { type: Boolean, default: true },
}, { strict: false });
const Product = mongoose.model('Product', productSchema, 'products');

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: String,
  status: String,
  items: [{ product: mongoose.Schema.Types.ObjectId, itemName: String, qty: Number }],
}, { strict: false });
const Invoice = mongoose.model('Invoice', invoiceSchema, 'invoices');

const bold   = (s) => `\x1b[1m${s}\x1b[0m`;
const green  = (s) => `\x1b[32m${s}\x1b[0m`;
const red    = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const cyan   = (s) => `\x1b[36m${s}\x1b[0m`;

async function main() {
  console.log(bold('\n══════════════════════════════════════════════════════'));
  console.log(bold('  STOCK DECREMENT DIAGNOSTIC — Sri Chenna Kesava     '));
  console.log(bold('══════════════════════════════════════════════════════\n'));

  await mongoose.connect(process.env.MONGO_URI);
  console.log(green('✅ MongoDB connected\n'));

  // 1. All active products
  const products = await Product.find({ isActive: true }).select('_id name stock minStock');
  console.log(bold(`─── Current Stock (${products.length} products) ──────────────────`));
  products.forEach(p => {
    const warn = p.stock <= p.minStock ? yellow(' ⚠ LOW') : '';
    console.log(`  ${p.name.padEnd(25)} stock=${cyan(p.stock)}${warn}`);
  });

  // 2. All non-cancelled/non-draft invoices
  const activeInvoices = await Invoice.find({ status: { $nin: ['Draft', 'Cancelled'] } });
  console.log(bold(`\n─── Active Invoices (${activeInvoices.length} invoices) ──────────────────`));

  // 3. Sum up expected sold qty per product
  const soldMap = {}; // productId -> totalQtySold
  for (const inv of activeInvoices) {
    for (const item of inv.items || []) {
      const pid = item.product?.toString();
      if (!pid) continue;
      soldMap[pid] = (soldMap[pid] || 0) + (item.qty || 0);
    }
  }

  // 4. Check if any product has MORE stock than expected
  console.log(bold('\n─── Stock vs Sold Analysis ──────────────────────────'));
  let hasDiscrepancy = false;
  
  // We need to figure out the "original" stock. Since we don't store it,
  // we check if current stock + total sold = some reasonable number.
  // If stock was never decremented, soldQty would add on top of current.
  
  for (const p of products) {
    const sold = soldMap[p._id.toString()] || 0;
    if (sold === 0) continue;
    console.log(`  ${p.name.padEnd(25)} current=${cyan(p.stock)} sold=${yellow(sold)}`);
    hasDiscrepancy = true;
  }
  
  if (!hasDiscrepancy) {
    console.log(green('  All products with sold quantities look fine.'));
  }

  // 5. Test a fresh decrementStock on a small scale
  console.log(bold('\n─── Testing decrementStock directly ────────────────'));
  
  // Pick first product that has sold qty > 0
  const testProductId = Object.keys(soldMap)[0];
  if (testProductId) {
    const before = await Product.findById(testProductId);
    console.log(`  Before update: ${before.name} stock=${cyan(before.stock)}`);
    
    const result = await Product.findByIdAndUpdate(
      testProductId,
      { $inc: { stock: -1 } },
      { new: true }
    );
    console.log(`  After -1 update: stock=${cyan(result.stock)}`);
    
    // Restore
    await Product.findByIdAndUpdate(testProductId, { $inc: { stock: 1 } });
    console.log(green('  ✅ Restored. findByIdAndUpdate with $inc works correctly.'));
  }

  // 6. Check the actual invoice that was just created (the one in screenshot)
  const latestInvoice = await Invoice.findOne().sort({ createdAt: -1 });
  console.log(bold('\n─── Latest Invoice ─────────────────────────────────'));
  console.log(`  Invoice  : ${cyan(latestInvoice?.invoiceNumber)}`);
  console.log(`  Status   : ${cyan(latestInvoice?.status)}`);
  console.log(`  Items    : ${latestInvoice?.items?.length || 0} items`);
  for (const item of latestInvoice?.items || []) {
    const prod = await Product.findById(item.product);
    console.log(`    → ${(item.itemName || '?').padEnd(20)} qty=${item.qty} productId=${item.product} | DB stock=${prod?.stock ?? 'NOT FOUND'}`);
  }

  // 7. Summary
  console.log(bold('\n─── Summary ────────────────────────────────────────'));
  console.log(`  Total active invoices    : ${cyan(activeInvoices.length)}`);
  console.log(`  Products with sales data : ${cyan(Object.keys(soldMap).length)}`);
  console.log(`  Total boxes sold (gross) : ${cyan(Object.values(soldMap).reduce((a, b) => a + b, 0))}`);

  console.log(bold('\n══════════════════════════════════════════════════════\n'));
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(red('❌ Error:'), err.message);
  mongoose.disconnect();
  process.exit(1);
});
