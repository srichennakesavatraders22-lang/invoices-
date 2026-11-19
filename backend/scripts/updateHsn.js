import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  console.warn('DNS server override failed', e);
}

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const HSN_CODE = '19053290';

async function updateAllHSN() {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI is not defined in backend/.env');
    }

    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB.');

    // 1. Update all products
    const productResult = await mongoose.connection.collection('products').updateMany(
      {},
      { $set: { hsnCode: HSN_CODE } }
    );
    console.log(`Updated ${productResult.modifiedCount} products with HSN: ${HSN_CODE}`);

    // 2. Update all invoices (items array)
    const invoiceResult = await mongoose.connection.collection('invoices').updateMany(
      {},
      { $set: { 'items.$[].hsnCode': HSN_CODE } }
    );
    console.log(`Updated ${invoiceResult.modifiedCount} invoices with HSN: ${HSN_CODE}`);

    console.log('HSN code update completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error updating HSN codes:', error);
    process.exit(1);
  }
}

updateAllHSN();
