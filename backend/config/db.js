import mongoose from 'mongoose';
import dns from 'dns';

// Fix for Windows DNS resolution of MongoDB+SRV records
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  // Ignore if not supported
}

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // ─── Auto-resync invoice counter ─────────────────────────────────────────
    // Prevents "Duplicate invoiceNumber" errors caused by bulk DB seeding
    // that bypassed the Counter collection.
    try {
      const Invoice = (await import('../models/Invoice.js')).default;
      const Counter = (await import('../models/Counter.js')).default;
      const maxDoc = await Invoice.findOne({}, { sequenceNumber: 1 }).sort({ sequenceNumber: -1 });
      const maxSeq = maxDoc?.sequenceNumber || 0;
      const counter = await Counter.findById('invoiceNumber');
      if (!counter || counter.seq < maxSeq) {
        await Counter.findByIdAndUpdate(
          { _id: 'invoiceNumber' },
          { $set: { seq: maxSeq } },
          { upsert: true }
        );
        console.log(`✅ Invoice counter resynced to ${maxSeq}`);
      }
    } catch (syncErr) {
      console.warn('Counter resync skipped:', syncErr.message);
    }
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;

