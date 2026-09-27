/**
 * test_invoice_serial.mjs
 * ──────────────────────────────────────────────────────────────────────────────
 * Tests invoice serial number generation:
 *   1. Shows current counter state and highest invoice sequence in DB
 *   2. Resyncs the counter to max (same logic as db.js startup)
 *   3. Simulates 20 consecutive "Generate Invoice" calls using the same
 *      retry logic as invoiceController.js
 *   4. Verifies all 20 numbers are unique and in strict ascending order
 *   5. Rolls back (deletes the test invoices) so real data is untouched
 *
 * Run: node --experimental-vm-modules scratch/test_invoice_serial.mjs
 *   or: node scratch/test_invoice_serial.mjs  (Node 22+)
 */

import dns from 'dns';
import mongoose from 'mongoose';
import 'dotenv/config';

// Fix for Windows DNS resolution of MongoDB+SRV records (same as db.js)
try { dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']); } catch (_) {}

// ─── Inline models (avoid import path issues from scratch/) ──────────────────
const counterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } });
const Counter = mongoose.model('Counter', counterSchema);

const invoiceSchema = new mongoose.Schema({
  invoiceNumber: { type: String, unique: true, required: true },
  sequenceNumber: { type: Number },
  _testMarker: { type: Boolean, default: false }, // flag to safely clean up
}, { timestamps: true });
const Invoice = mongoose.model('Invoice', invoiceSchema, 'invoices');

// ─── Helpers ─────────────────────────────────────────────────────────────────
const INVOICE_PREFIX = 'SCKT/2026-27/';
const MAX_RETRIES = 5;

const formatInvoiceNumber = (prefix, seq) =>
  `${prefix}${String(seq).padStart(4, '0')}`;

const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const green = (s) => `\x1b[32m${s}\x1b[0m`;
const red = (s) => `\x1b[31m${s}\x1b[0m`;
const yellow = (s) => `\x1b[33m${s}\x1b[0m`;
const cyan = (s) => `\x1b[36m${s}\x1b[0m`;

// ─── Core: same logic as invoiceController.js ────────────────────────────────
async function generateNextInvoiceNumber() {
  let invoiceNumber = '';
  let sequenceNum = 0;
  let retryCount = 0;

  while (retryCount < MAX_RETRIES) {
    const counter = await Counter.findByIdAndUpdate(
      { _id: 'invoiceNumber' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    sequenceNum = counter.seq;
    invoiceNumber = formatInvoiceNumber(INVOICE_PREFIX, sequenceNum);

    const existing = await Invoice.findOne({ invoiceNumber });
    if (!existing) break; // ✅ unique

    // Resync counter if collision detected
    const maxSeqDoc = await Invoice.findOne({}, { sequenceNumber: 1 }).sort({ sequenceNumber: -1 });
    const maxSeq = maxSeqDoc?.sequenceNumber || sequenceNum;
    await Counter.findByIdAndUpdate(
      { _id: 'invoiceNumber' },
      { $set: { seq: maxSeq } },
      { upsert: true }
    );
    console.log(yellow(`  ⚠  Collision on ${invoiceNumber} — resynced counter to ${maxSeq}, retrying...`));
    retryCount++;
  }

  return { invoiceNumber, sequenceNum };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(bold('\n══════════════════════════════════════════════════════'));
  console.log(bold('  INVOICE SERIAL NUMBER TEST — Sri Chenna Kesava     '));
  console.log(bold('══════════════════════════════════════════════════════\n'));

  // 1. Connect
  await mongoose.connect(process.env.MONGO_URI);
  console.log(green('✅ MongoDB connected\n'));

  // 2. Show current state
  const currentCounter = await Counter.findById('invoiceNumber');
  const maxSeqDoc = await Invoice.findOne({}, { sequenceNumber: 1, invoiceNumber: 1 })
    .sort({ sequenceNumber: -1 });

  console.log(bold('─── Current DB State ───────────────────────────────'));
  console.log(`  Counter (seq)         : ${cyan(currentCounter?.seq ?? 'NOT FOUND')}`);
  console.log(`  Highest invoiceNumber : ${cyan(maxSeqDoc?.invoiceNumber ?? 'NONE')}`);
  console.log(`  Highest sequenceNumber: ${cyan(maxSeqDoc?.sequenceNumber ?? 0)}`);
  console.log('');

  // 3. Resync counter (same as db.js startup logic)
  const maxSeq = maxSeqDoc?.sequenceNumber || 0;
  if (!currentCounter || currentCounter.seq < maxSeq) {
    await Counter.findByIdAndUpdate(
      { _id: 'invoiceNumber' },
      { $set: { seq: maxSeq } },
      { upsert: true }
    );
    console.log(green(`  ✅ Counter resynced from ${currentCounter?.seq ?? 0} → ${maxSeq}\n`));
  } else {
    console.log(green(`  ✅ Counter already in sync (seq=${currentCounter.seq})\n`));
  }

  // 4. Simulate 20 consecutive invoice creations
  const BATCH = 20;
  console.log(bold(`─── Simulating ${BATCH} Consecutive Invoice Creations ──────`));

  const created = [];
  const startTime = Date.now();

  for (let i = 1; i <= BATCH; i++) {
    const { invoiceNumber, sequenceNum } = await generateNextInvoiceNumber();

    // Insert a minimal test invoice doc (marked with _testMarker for cleanup)
    await Invoice.create({ invoiceNumber, sequenceNumber: sequenceNum, _testMarker: true });
    created.push({ invoiceNumber, sequenceNumber: sequenceNum });
    process.stdout.write(green(`  [${String(i).padStart(2, '0')}] ${invoiceNumber}  (seq=${sequenceNum})\n`));
  }

  const elapsed = Date.now() - startTime;

  // 5. Validate
  console.log(bold('\n─── Validation ─────────────────────────────────────'));

  // Check uniqueness
  const numbersSet = new Set(created.map(c => c.invoiceNumber));
  const allUnique = numbersSet.size === created.length;
  console.log(allUnique
    ? green(`  ✅ All ${BATCH} invoice numbers are UNIQUE`)
    : red(`  ❌ DUPLICATES DETECTED! Only ${numbersSet.size} unique out of ${created.length}`));

  // Check strict ascending order
  let ascending = true;
  for (let i = 1; i < created.length; i++) {
    if (created[i].sequenceNumber !== created[i - 1].sequenceNumber + 1) {
      ascending = false;
      console.log(red(`  ❌ Gap/jump between ${created[i-1].invoiceNumber} and ${created[i].invoiceNumber}`));
    }
  }
  if (ascending) console.log(green(`  ✅ All numbers are in STRICT ASCENDING ORDER (no gaps)`));

  // Show range
  const first = created[0].invoiceNumber;
  const last = created[created.length - 1].invoiceNumber;
  console.log(`  📋 Range   : ${cyan(first)} → ${cyan(last)}`);
  console.log(`  ⏱  Time    : ${cyan(elapsed + 'ms')} for ${BATCH} invoices`);

  // 6. Final counter state
  const finalCounter = await Counter.findById('invoiceNumber');
  console.log(`  🔢 Counter : now at seq=${cyan(finalCounter?.seq)}`);

  // 7. Cleanup — remove test docs
  console.log(bold('\n─── Cleanup ────────────────────────────────────────'));
  const del = await Invoice.deleteMany({ _testMarker: true });
  console.log(green(`  ✅ Removed ${del.deletedCount} test invoice docs from DB`));

  // Also roll back counter to before our test batch
  const rollbackSeq = maxSeq; // restore to where it was before test
  await Counter.findByIdAndUpdate({ _id: 'invoiceNumber' }, { $set: { seq: rollbackSeq } });
  console.log(green(`  ✅ Counter rolled back to ${rollbackSeq} (pre-test state)\n`));

  console.log(bold('══════════════════════════════════════════════════════'));
  console.log(bold('  TEST COMPLETE'));
  console.log(bold('══════════════════════════════════════════════════════\n'));

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(red('\n❌ Test failed with error:'), err.message);
  mongoose.disconnect();
  process.exit(1);
});
