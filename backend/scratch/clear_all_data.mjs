/**
 * clear_all_data.mjs
 * ──────────────────────────────────────────────────────────────────────────────
 * Deletes ALL: Invoices, Products, Expenses, Customers
 * Keeps:       CompanyProfile, Users, Counter (resets counter to 0)
 *
 * Run: node scratch/clear_all_data.mjs
 */

import dns from 'dns';
import mongoose from 'mongoose';
import 'dotenv/config';

try { dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']); } catch (_) {}

const bold  = (s) => `\x1b[1m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red   = (s) => `\x1b[31m${s}\x1b[0m`;
const cyan  = (s) => `\x1b[36m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;

async function main() {
  console.log(bold('\n══════════════════════════════════════════════════════'));
  console.log(bold('  CLEAR ALL DATA — Sri Chenna Kesava Traders          '));
  console.log(bold('══════════════════════════════════════════════════════\n'));

  await mongoose.connect(process.env.MONGO_URI);
  console.log(green('✅ MongoDB connected\n'));

  const db = mongoose.connection.db;

  // ─── Show counts before ───────────────────────────────────────────────────
  console.log(bold('─── Before Deletion ────────────────────────────────'));
  const collections = ['invoices', 'products', 'expenses', 'customers', 'counters', 'companyprofiles', 'users'];
  for (const col of collections) {
    const count = await db.collection(col).countDocuments();
    console.log(`  ${col.padEnd(20)} : ${cyan(count)} records`);
  }

  // ─── Delete ───────────────────────────────────────────────────────────────
  console.log(bold('\n─── Deleting Data ──────────────────────────────────'));

  const inv = await db.collection('invoices').deleteMany({});
  console.log(green(`  ✅ Deleted ${inv.deletedCount} invoices`));

  const prod = await db.collection('products').deleteMany({});
  console.log(green(`  ✅ Deleted ${prod.deletedCount} products`));

  const exp = await db.collection('expenses').deleteMany({});
  console.log(green(`  ✅ Deleted ${exp.deletedCount} expenses`));

  const cust = await db.collection('customers').deleteMany({});
  console.log(green(`  ✅ Deleted ${cust.deletedCount} customers`));

  // Reset invoice counter to 0
  const counterRes = await db.collection('counters').updateOne(
    { _id: 'invoiceNumber' },
    { $set: { seq: 0 } },
    { upsert: true }
  );
  console.log(green(`  ✅ Invoice counter reset to 0`));

  // ─── Show counts after ────────────────────────────────────────────────────
  console.log(bold('\n─── After Deletion ─────────────────────────────────'));
  for (const col of collections) {
    const count = await db.collection(col).countDocuments();
    const status = count === 0 ? green('0 ✅') : yellow(`${count} ⚠`);
    console.log(`  ${col.padEnd(20)} : ${status}`);
  }

  console.log(bold('\n══════════════════════════════════════════════════════'));
  console.log(green('  ✅ All data cleared. Company profile preserved.'));
  console.log(bold('══════════════════════════════════════════════════════\n'));

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(red('❌ Error:'), err.message);
  mongoose.disconnect();
  process.exit(1);
});
