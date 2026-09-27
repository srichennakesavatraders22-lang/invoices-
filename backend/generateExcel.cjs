const XLSX = require('xlsx');
const path = require('path');

const data = [
  { name: 'Dairy Milk Silk', category: 'Choco', packType: '12-pack', unit: 'Boxes', mrp: 850, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '18069010', stock: 50, minStock: 10, discountPercent: 2 },
  { name: 'KitKat Chunky', category: 'Choco', packType: '24-pack', unit: 'Boxes', mrp: 480, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '18069010', stock: 120, minStock: 20, discountPercent: 0 },
  { name: 'Snickers Almond', category: 'Choco', packType: 'Jumbo', unit: 'Boxes', mrp: 950, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '18069010', stock: 35, minStock: 15, discountPercent: 5 },
  { name: 'Milkybar Choo', category: 'Vanila', packType: 'Pilo', unit: 'Boxes', mrp: 300, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '18069010', stock: 200, minStock: 30, discountPercent: 0 },
  { name: 'Bounty Coconut', category: 'Choco', packType: 'Jar', unit: 'Boxes', mrp: 600, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '18069010', stock: 15, minStock: 20, discountPercent: 0 },
  { name: 'Ferrero Rocher T24', category: 'Choco', packType: '24-pack', unit: 'Boxes', mrp: 1250, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '18069010', stock: 45, minStock: 10, discountPercent: 10 },
  { name: 'Lindt Excellence Dark', category: 'Choco', packType: '12-pack', unit: 'Boxes', mrp: 1800, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '18069010', stock: 20, minStock: 5, discountPercent: 0 },
  { name: 'Hershey Kisses', category: 'Choco', packType: 'Jar', unit: 'Boxes', mrp: 550, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '18069010', stock: 80, minStock: 15, discountPercent: 0 },
  { name: 'Twix Caramel', category: 'Choco', packType: 'Pilo', unit: 'Boxes', mrp: 400, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '18069010', stock: 65, minStock: 15, discountPercent: 0 },
  { name: 'Toblerone Swiss', category: 'Choco', packType: 'Jumbo', unit: 'Boxes', mrp: 1100, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '18069010', stock: 40, minStock: 10, discountPercent: 0 },
  { name: 'Nescafe Gold Blend', category: 'Coffee', packType: 'Jar', unit: 'Boxes', mrp: 950, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '09012190', stock: 90, minStock: 20, discountPercent: 3 },
  { name: 'Bru Classic', category: 'Coffee', packType: 'Pilo', unit: 'Boxes', mrp: 350, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '09012190', stock: 150, minStock: 30, discountPercent: 0 },
  { name: 'Davidoff Rich', category: 'Coffee', packType: 'Jar', unit: 'Boxes', mrp: 1400, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '09012190', stock: 25, minStock: 10, discountPercent: 5 },
  { name: 'Kissan Strawberry Jam', category: 'Strawberry', packType: 'Jar', unit: 'Boxes', mrp: 280, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '20079990', stock: 110, minStock: 20, discountPercent: 0 },
  { name: 'Mapro Strawberry Crush', category: 'Strawberry', packType: 'Jumbo', unit: 'Boxes', mrp: 450, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '20079990', stock: 60, minStock: 15, discountPercent: 0 },
  { name: 'Britannia Bourbon', category: 'Choco', packType: '24-pack', unit: 'Boxes', mrp: 360, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '19053100', stock: 250, minStock: 50, discountPercent: 0 },
  { name: 'Oreo Original', category: 'Vanila', packType: '24-pack', unit: 'Boxes', mrp: 400, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '19053100', stock: 180, minStock: 40, discountPercent: 2 },
  { name: 'Sunfeast Dark Fantasy', category: 'Choco', packType: '24-pack', unit: 'Boxes', mrp: 720, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '19053100', stock: 95, minStock: 25, discountPercent: 0 },
  { name: 'Amul Vanilla Magic', category: 'Vanila', packType: 'Jumbo', unit: 'Boxes', mrp: 500, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '21050000', stock: 45, minStock: 15, discountPercent: 0 },
  { name: 'Kwality Walls Strawberry', category: 'Strawberry', packType: 'Jumbo', unit: 'Boxes', mrp: 480, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '21050000', stock: 35, minStock: 15, discountPercent: 0 }
];

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Products");

const outPath = path.join(__dirname, 'sample_products_import.xlsx');
XLSX.writeFile(wb, outPath);

console.log('Successfully created', outPath);
