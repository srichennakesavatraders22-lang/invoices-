import dns from 'dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {}

import mongoose from 'mongoose';
import xlsx from 'xlsx';

const MONGO_URI = 'mongodb+srv://srichennakesavatraders22_db_user:JaZu0YsOGvi8RFSV@cluster0.khw803p.mongodb.net/invoices?appName=Cluster0';

async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  // 1. Delete all old invoices
  const delInv = await mongoose.connection.db.collection('invoices').deleteMany({});
  console.log(`Deleted ${delInv.deletedCount} old invoices`);

  // 2. Reset invoice counter
  await mongoose.connection.db.collection('counters').updateOne(
    { _id: 'invoiceNumber' },
    { $set: { seq: 0 } },
    { upsert: true }
  );
  console.log('Reset invoice counter to 0');

  // 3. Delete all old products
  const delProd = await mongoose.connection.db.collection('products').deleteMany({});
  console.log(`Deleted ${delProd.deletedCount} old products`);

  // 4. Seed 8 realistic confectionery/chocolate products with pure Carton/Box/Piece schema
  const newProducts = [
    {
      name: 'Twist & Bites Choco 24',
      category: 'Choco',
      packType: '24-pack',
      piecePrice: 4.00,
      piecesPerBox: 24,
      boxesPerCarton: 12,
      stockPieces: 2880, // 120 boxes = 10 cartons
      minStockPieces: 288,
      gstPercent: 5,
      hsnCode: '18069010',
      batchNumber: 'TB2026-01',
      supplierName: 'Cadbury Confectionery Ltd',
      discountPercent: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Vanilla Milky Bar Jar',
      category: 'Vanilla',
      packType: 'Jar',
      piecePrice: 4.00,
      piecesPerBox: 30,
      boxesPerCarton: 10,
      stockPieces: 3000, // 100 boxes = 10 cartons
      minStockPieces: 300,
      gstPercent: 5,
      hsnCode: '18069010',
      batchNumber: 'VMB2026-01',
      supplierName: 'Nestle India',
      discountPercent: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Butterscotch Crunch 18',
      category: 'Crunch',
      packType: '18-pack',
      piecePrice: 4.00,
      piecesPerBox: 18,
      boxesPerCarton: 16,
      stockPieces: 2880, // 160 boxes = 10 cartons
      minStockPieces: 288,
      gstPercent: 5,
      hsnCode: '18069010',
      batchNumber: 'BSC2026-01',
      supplierName: 'Amul Confections',
      discountPercent: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Dark Cocoa Delight 24',
      category: 'Dark Cocoa',
      packType: '24-pack',
      piecePrice: 5.00,
      piecesPerBox: 24,
      boxesPerCarton: 12,
      stockPieces: 2880,
      minStockPieces: 288,
      gstPercent: 5,
      hsnCode: '18069010',
      batchNumber: 'DCD2026-01',
      supplierName: 'Cadbury Confectionery Ltd',
      discountPercent: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Hazelnut Truffle Box 20',
      category: 'Hazelnut',
      packType: '20-pack',
      piecePrice: 6.00,
      piecesPerBox: 20,
      boxesPerCarton: 10,
      stockPieces: 2000,
      minStockPieces: 200,
      gstPercent: 5,
      hsnCode: '18069010',
      batchNumber: 'HT2026-01',
      supplierName: 'Ferrero India',
      discountPercent: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Mint Chocolate Bites 24',
      category: 'Mint',
      packType: '24-pack',
      piecePrice: 4.00,
      piecesPerBox: 24,
      boxesPerCarton: 12,
      stockPieces: 2880,
      minStockPieces: 288,
      gstPercent: 5,
      hsnCode: '18069010',
      batchNumber: 'MCB2026-01',
      supplierName: 'Parle Confections',
      discountPercent: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Caramel Toffee Pouch 50',
      category: 'Toffee',
      packType: 'Pouch',
      piecePrice: 2.00,
      piecesPerBox: 50,
      boxesPerCarton: 10,
      stockPieces: 5000,
      minStockPieces: 500,
      gstPercent: 5,
      hsnCode: '18069010',
      batchNumber: 'CTP2026-01',
      supplierName: 'Lotte India',
      discountPercent: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      name: 'Strawberry Eclair Jar 40',
      category: 'Eclair',
      packType: 'Jar',
      piecePrice: 3.00,
      piecesPerBox: 40,
      boxesPerCarton: 12,
      stockPieces: 4800,
      minStockPieces: 480,
      gstPercent: 5,
      hsnCode: '18069010',
      batchNumber: 'SEJ2026-01',
      supplierName: 'Cadbury Confectionery Ltd',
      discountPercent: 0,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const insProd = await mongoose.connection.db.collection('products').insertMany(newProducts);
  console.log(`Inserted ${insProd.insertedCount} fresh products with Piece/Box/Carton schema`);

  // 5. Generate Excel Sheet with all new fields
  const excelRows = newProducts.map((p, i) => ({
    'S.No': i + 1,
    'Product Name': p.name,
    'Flavour': p.category,
    'Pack Type': p.packType,
    'Piece Price (Rs.)': p.piecePrice,
    'Pieces Per Box': p.piecesPerBox,
    'Boxes Per Carton': p.boxesPerCarton,
    'Box Price (Rs.)': Number((p.piecePrice * p.piecesPerBox).toFixed(2)),
    'Carton Price (Rs.)': Number((p.piecePrice * p.piecesPerBox * p.boxesPerCarton).toFixed(2)),
    'GST %': p.gstPercent,
    'HSN Code': p.hsnCode,
    'Stock (Pieces)': p.stockPieces,
    'Stock (Boxes)': Math.floor(p.stockPieces / p.piecesPerBox),
    'Stock (Cartons)': Math.floor(p.stockPieces / (p.piecesPerBox * p.boxesPerCarton)),
    'Min Stock (Pieces)': p.minStockPieces,
    'Batch Number': p.batchNumber,
    'Supplier': p.supplierName,
    'Discount %': p.discountPercent,
  }));

  const wb = xlsx.utils.book_new();
  const ws = xlsx.utils.json_to_sheet(excelRows);
  ws['!cols'] = [
    { wch: 6 }, { wch: 28 }, { wch: 15 }, { wch: 12 },
    { wch: 16 }, { wch: 16 }, { wch: 18 }, { wch: 15 }, { wch: 18 },
    { wch: 8 }, { wch: 12 }, { wch: 15 }, { wch: 14 }, { wch: 16 },
    { wch: 18 }, { wch: 14 }, { wch: 25 }, { wch: 12 }
  ];
  xlsx.utils.book_append_sheet(wb, ws, 'Products Catalog');
  
  const destPath = 'c:/Users/shaik/Desktop/chaitanya/invoices-/Products_Catalog_New_Format.xlsx';
  xlsx.writeFile(wb, destPath);
  console.log(`Excel file created successfully at: ${destPath}`);

  await mongoose.disconnect();
  console.log('Done!');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
