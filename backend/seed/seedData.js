import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';
import User from '../models/User.js';

try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) {
  // Ignore if not supported
}

import CompanyProfile from '../models/CompanyProfile.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Invoice from '../models/Invoice.js';
import Counter from '../models/Counter.js';
import recalculateInvoice from '../utils/gstCalculator.js';

dotenv.config();

const sampleProducts = [
  { name: 'Choco 24', category: 'Choco', packType: '24-pack', unit: 'Boxes', mrp: 480, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '18069010' },
  { name: 'Vanila 24', category: 'Vanila', packType: '24-pack', unit: 'Boxes', mrp: 480, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '18069010' },
  { name: 'Strawberry 24', category: 'Strawberry', packType: '24-pack', unit: 'Boxes', mrp: 480, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '18069010' },
  { name: 'Coffee 24', category: 'Coffee', packType: '24-pack', unit: 'Boxes', mrp: 480, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '18069010' },
  { name: 'Choco Jar', category: 'Choco', packType: 'Jar', unit: 'Boxes', mrp: 620, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '18069010' },
  { name: 'Vanila Jar', category: 'Vanila', packType: 'Jar', unit: 'Boxes', mrp: 620, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '18069010' },
  { name: 'Strawberry Jar', category: 'Strawberry', packType: 'Jar', unit: 'Boxes', mrp: 620, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '18069010' },
  { name: 'Coffee Jar', category: 'Coffee', packType: 'Jar', unit: 'Boxes', mrp: 620, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '18069010' },
  { name: 'Choco Jumbo', category: 'Choco', packType: 'Jumbo', unit: 'Boxes', mrp: 750, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '18069010' },
  { name: 'Vanila Jumbo', category: 'Vanila', packType: 'Jumbo', unit: 'Boxes', mrp: 750, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '18069010' },
  { name: 'Strawberry Jumbo', category: 'Strawberry', packType: 'Jumbo', unit: 'Boxes', mrp: 750, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '18069010' },
  { name: 'Coffee Jumbo', category: 'Coffee', packType: 'Jumbo', unit: 'Boxes', mrp: 750, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '18069010' },
  { name: 'Choco Pilo', category: 'Choco', packType: 'Pilo', unit: 'Boxes', mrp: 540, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '18069010' },
  { name: 'Vanila Pilo', category: 'Vanila', packType: 'Pilo', unit: 'Boxes', mrp: 540, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '18069010' },
  { name: 'Strawberry Pilo', category: 'Strawberry', packType: 'Pilo', unit: 'Boxes', mrp: 540, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '18069010' },
  { name: 'Coffee Pilo', category: 'Coffee', packType: 'Pilo', unit: 'Boxes', mrp: 540, cgstPercent: 2.5, sgstPercent: 0, igstPercent: 5, hsnCode: '18069010' },
];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB Atlas...');

    // 1. Reset / Seed User
    await User.deleteMany({});
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@chennakesava.com',
      password: 'admin123',
      role: 'Admin',
    });
    console.log('Admin user created: admin@chennakesava.com / admin123');

    // 2. Reset / Seed Company Profile
    await CompanyProfile.deleteMany({});
    const company = await CompanyProfile.create({
      businessName: 'SRI CHENNA KESAVA TRADERS',
      tagline: 'Wholesale & Distribution – Confectionery / Chocolates & Snacks',
      address: 'Beside Apsara Theatre, Chinna Chauku, Andhra Pradesh – 516002',
      mobile: '+91 63613 97790',
      email: 'srichennakesavatraders22@gmail.com',
      gstin: '37XXXXX0000X1ZX',
      invoicePrefix: 'SCKT/2026-27/',
      bankDetails: {
        accountName: 'SRI CHENNA KESAVA TRADERS',
        accountNumber: '389201948291',
        ifsc: 'SBIN0001234',
        bankName: 'State Bank of India',
        branch: 'Kadapa Main Branch',
      },
      termsAndConditions: [
        '1. Goods once sold will not be taken back or exchanged.',
        '2. Interest @ 24% p.a. will be charged if payment is not made within the due date.',
        '3. All disputes are subject to Kadapa jurisdiction only.',
        '4. Please check the goods at the time of delivery.',
        '5. This is a computer generated invoice.',
      ],
    });
    console.log('Company profile seeded: SRI CHENNA KESAVA TRADERS');

    // 3. Reset / Seed Products
    await Product.deleteMany({});
    const createdProducts = await Product.insertMany(sampleProducts);
    console.log(`Seeded ${createdProducts.length} SKUs matching reference invoice.`);

    // 4. Reset / Seed Customers
    await Customer.deleteMany({});
    const sampleCustomer = await Customer.create({
      name: 'Suresh Kumar',
      businessName: 'M/s Example Retail Store',
      billingAddress: 'Main Road, Kadapa, Andhra Pradesh - 516001',
      shippingAddress: 'Main Road, Kadapa, Andhra Pradesh - 516001',
      sameAsBilling: true,
      gstin: '37XXXXX0000X1ZX',
      mobile: '+91 90000 00000',
      email: 'examplestore@retail.in',
      isInterState: false,
      state: 'Andhra Pradesh',
    });

    const interstateCustomer = await Customer.create({
      name: 'Ramesh Patel',
      businessName: 'Bangalore Sweet & Snack Hub',
      billingAddress: 'Commercial Street, Bangalore, Karnataka - 560001',
      shippingAddress: 'Commercial Street, Bangalore, Karnataka - 560001',
      sameAsBilling: true,
      gstin: '29AAAAA0000A1Z5',
      mobile: '+91 98765 43210',
      email: 'bangaloresweets@hub.com',
      isInterState: true,
      state: 'Karnataka',
    });
    console.log('Sample customers seeded (Intrastate & Interstate).');

    // 5. Reset Counter
    await Counter.deleteMany({});
    await Counter.create({ _id: 'invoiceNumber', seq: 1 });

    // 6. Reset / Seed Reference Invoice SCKT/2026-27/0001
    await Invoice.deleteMany({});

    // Line items matching reference PDF quantities:
    // Choco 24 (10), Vanila 24 (8), Strawberry 24 (6), Coffee 24 (6)
    // Choco Jar (5), Vanila Jar (4), Strawberry Jar (3), Coffee Jar (3)
    // Choco Jumbo (4), Vanila Jumbo (3), Strawberry Jumbo (2), Coffee Jumbo (2)
    // Choco Pilo (6), Vanila Pilo (5), Strawberry Pilo (4), Coffee Pilo (4)
    const quantities = [10, 8, 6, 6, 5, 4, 3, 3, 4, 3, 2, 2, 6, 5, 4, 4];
    const rawItems = createdProducts.map((p, idx) => ({
      product: p._id,
      qty: quantities[idx],
    }));

    const calc = await recalculateInvoice(rawItems, false);

    await Invoice.create({
      invoiceNumber: 'SCKT/2026-27/0001',
      sequenceNumber: 1,
      invoiceDate: '11-09-2026',
      invoiceTime: '11:45 AM',
      customer: sampleCustomer._id,
      customerSnapshot: {
        name: sampleCustomer.name,
        businessName: sampleCustomer.businessName,
        billingAddress: sampleCustomer.billingAddress,
        shippingAddress: sampleCustomer.shippingAddress,
        gstin: sampleCustomer.gstin,
        mobile: sampleCustomer.mobile,
        email: sampleCustomer.email,
        isInterState: false,
      },
      companySnapshot: {
        businessName: company.businessName,
        tagline: company.tagline,
        address: company.address,
        mobile: company.mobile,
        email: company.email,
        gstin: company.gstin,
        logoUrl: company.logoUrl,
        stampUrl: company.stampUrl,
        bankDetails: company.bankDetails,
        termsAndConditions: company.termsAndConditions,
      },
      items: calc.items,
      totalQty: calc.totalQty,
      subTotal: calc.subTotal,
      totalCgst: calc.totalCgst,
      totalSgst: calc.totalSgst,
      totalIgst: calc.totalIgst,
      totalTax: calc.totalTax,
      grandTotal: calc.grandTotal,
      amountInWords: calc.amountInWords,
      status: 'Sent',
      notes: 'Standard distribution delivery via Chinna Chauku dispatch.',
    });

    console.log(`Reference Invoice SCKT/2026-27/0001 successfully seeded!`);
    console.log(`Sub Total: Rs. ${calc.subTotal}, CGST: Rs. ${calc.totalCgst}, Grand Total: Rs. ${calc.grandTotal}`);
    console.log(`Words: ${calc.amountInWords}`);

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
};

seedDB();
