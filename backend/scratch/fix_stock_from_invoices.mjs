/**
 * fix_stock_from_invoices.mjs
 * ──────────────────────────────────────────────────────────────────────────────
 * ONE-TIME FIX: Recalculates correct stock for every product based on:
 *   - The "initial" stock set in the DB (current stock, since no decrement happened)
 *   - Total qty sold across all non-Draft/non-Cancelled invoices
 *
 * Because the seeded invoices never ran decrementStock, current stock values
 * are the "original" stock before any sales.
 * After this script: new_stock = current_stock - total_sold
 * (floored at 0 to avoid negatives)
 *
 * Run: node scratch/fix_stock_from_invoices.mjs
 */

import dns from 'dns';
import mongoose from 'mongoose';
import 'dotenv/config';

try { dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']); } catch (_) {}

const productSchema = new mongoose.Schema({ name: String, stock: Number, isActive: Boolean }, { strict: false });
const Product = mongoose.model('Product', productSchema, 'products');

const invoiceSchema = new mongoose.Schema({
  status: String,
  items: [{ product: mongoose.Schema.Types.ObjectId, itemName: String, qty: Number }],
}, { strict: false });
const Invoice = mongoose.model('Invoice', invoiceSchema, 'invoices');

const bold  = (s) => `\x1b[1m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red   = (s) => `\x1b[31m${s}\x1b[0m`;
const cyan  = (s) => `\x1b[36m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;

async function main() {
  console.log(bold('\n══════════════════════════════════════════════════════'));
  console.log(bold('  STOCK RECALCULATION FIX — Sri Chenna Kesava        '));
  console.log(bold('══════════════════════════════════════════════════════\n'));

  await mongoose.connect(process.env.MONGO_URI);
  console.log(green('✅ MongoDB connected\n'));

  // 1. Get all active invoices (exclude Draft & Cancelled)
  const activeInvoices = await Invoice.find({ status: { $nin: ['Draft', 'Cancelled'] } });
  console.log(`  Active invoices: ${cyan(activeInvoices.length)}`);

  // 2. Build sold map: productId → totalQtySold
  const soldMap = {};
  for (const inv of activeInvoices) {
    for (const item of inv.items || []) {
      const pid = item.product?.toString();
      if (!pid) continue;
      soldMap[pid] = (soldMap[pid] || 0) + (item.qty || 0);
    }
  }
  console.log(`  Products with sales: ${cyan(Object.keys(soldMap).length)}\n`);

  // 3. Update each product's stock
  console.log(bold('─── Applying Stock Corrections ─────────────────────'));
  const products = await Product.find({ isActive: true });
  let updated = 0;

  for (const p of products) {
    const sold = soldMap[p._id.toString()] || 0;
    if (sold === 0) {
      console.log(`  ${p.name.padEnd(25)} no sales — stock unchanged (${cyan(p.stock)})`);
      continue;
    }

    const correctedStock = Math.max(0, p.stock - sold);
    await Product.findByIdAndUpdate(p._id, { $set: { stock: correctedStock } });
    const diff = p.stock - correctedStock;
    console.log(`  ${p.name.padEnd(25)} ${cyan(p.stock)} → ${green(correctedStock)} (sold=${yellow(sold)}, reduced=${yellow(diff)})`);
    updated++;
  }

  console.log(bold(`\n─── Done ───────────────────────────────────────────`));
  console.log(green(`  ✅ Updated ${updated} product stock values`));
  console.log('  ℹ  Future invoices will now decrement stock in real-time.\n');
  console.log(bold('══════════════════════════════════════════════════════\n'));

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(red('❌ Error:'), err.message);
  mongoose.disconnect();
  process.exit(1);
});
