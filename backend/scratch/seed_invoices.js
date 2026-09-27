import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });
import mongoose from 'mongoose';
import dns from 'dns';
try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch(e) {}
import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import CompanyProfile from '../models/CompanyProfile.js';

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];

const generateInvoices = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const products = await Product.find({ isActive: true });
    const customers = await Customer.find({ isActive: true });
    const settings = await CompanyProfile.findOne();

    if (!products.length || !customers.length || !settings) {
      console.log('Missing basic data (products, customers, or company profile).');
      process.exit(1);
    }

    const companySnapshot = {
      businessName: settings.companyName || 'Company', // fallback if different schema
      address: settings.address,
      mobile: settings.mobile || settings.phone,
      email: settings.email,
      gstin: settings.gstin,
      bankDetails: {
        accountName: settings.bankAccountName || '',
        accountNumber: settings.bankAccountNumber || '',
        ifsc: settings.bankIfsc || '',
        bankName: settings.bankName || '',
        branch: settings.bankBranch || '',
      },
      termsAndConditions: settings.termsAndConditions || [],
    };

    // Get latest sequence to avoid duplicate errors
    const lastInvoice = await Invoice.findOne().sort({ sequenceNumber: -1 });
    let seq = (lastInvoice?.sequenceNumber || 0) + 1;

    let newInvoices = [];
    const today = new Date();
    // 90 days ago
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - 90);

    let currentDate = new Date(startDate);
    const paymentMethods = ['Cash', 'UPI', 'Cheque', 'Bank Transfer'];

    while (currentDate <= today) {
      const dailyCount = randomInt(5, 12); // Slightly lower to avoid taking too long, 5-12 per day is ~800 invoices

      for (let i = 0; i < dailyCount; i++) {
        const cust = randomChoice(customers);
        const customerSnapshot = {
          name: cust.name,
          businessName: cust.businessName,
          billingAddress: cust.billingAddress,
          shippingAddress: cust.shippingAddress || cust.billingAddress,
          gstin: cust.gstin,
          mobile: cust.mobile,
          email: cust.email,
          isInterState: cust.state !== (settings.state || 'Andhra Pradesh'),
        };

        const numItems = randomInt(1, 4);
        const items = [];
        let totalQty = 0;
        let subTotal = 0;
        let totalCgst = 0;
        let totalSgst = 0;
        let totalIgst = 0;

        for (let j = 0; j < numItems; j++) {
          const prod = randomChoice(products);
          const qty = randomInt(1, 20);
          const mrp = prod.mrp || 100;
          const gstRate = prod.gstRate || 0;
          
          const discountPercent = 0;
          const discountAmount = 0;
          const basePrice = mrp / (1 + gstRate / 100);
          const taxableAmount = basePrice * qty;
          
          let cgstPercent = 0, sgstPercent = 0, igstPercent = 0;
          let cgstAmount = 0, sgstAmount = 0, igstAmount = 0;

          if (customerSnapshot.isInterState) {
            igstPercent = gstRate;
            igstAmount = taxableAmount * (igstPercent / 100);
          } else {
            cgstPercent = gstRate / 2;
            sgstPercent = gstRate / 2;
            cgstAmount = taxableAmount * (cgstPercent / 100);
            sgstAmount = taxableAmount * (sgstPercent / 100);
          }

          const totalTaxAmount = cgstAmount + sgstAmount + igstAmount;
          const amount = taxableAmount + totalTaxAmount;

          items.push({
            product: prod._id,
            itemName: prod.name,
            packType: prod.packType || '',
            unit: prod.unit || 'Boxes',
            qty,
            mrp,
            discountPercent,
            discountAmount,
            taxableAmount: parseFloat(taxableAmount.toFixed(2)),
            cgstPercent,
            sgstPercent,
            igstPercent,
            cgstAmount: parseFloat(cgstAmount.toFixed(2)),
            sgstAmount: parseFloat(sgstAmount.toFixed(2)),
            igstAmount: parseFloat(igstAmount.toFixed(2)),
            totalTaxAmount: parseFloat(totalTaxAmount.toFixed(2)),
            amount: parseFloat(amount.toFixed(2)),
          });

          totalQty += qty;
          subTotal += taxableAmount;
          totalCgst += cgstAmount;
          totalSgst += sgstAmount;
          totalIgst += igstAmount;
        }

        const grandTotal = Math.round(subTotal + totalCgst + totalSgst + totalIgst);
        const amountInWords = `Rupees ${grandTotal} Only`;
        
        const padSeq = String(seq).padStart(4, '0');
        const invoiceNumber = `SCKT/2026-27/${padSeq}`;

        const pm = randomChoice(paymentMethods);
        
        // Randomly set hours/minutes to spread throughout the day
        const h = randomInt(9, 20);
        const m = randomInt(0, 59);
        const invDateObj = new Date(currentDate);
        invDateObj.setHours(h, m, 0);

        const dString = invDateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const [yyyy, mm, dd] = dString.split('-');
        const invoiceDate = `${dd}-${mm}-${yyyy}`;
        const invoiceTime = invDateObj.toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });

        newInvoices.push({
          invoiceNumber,
          sequenceNumber: seq,
          invoiceDate,
          invoiceTime,
          customer: cust._id,
          customerSnapshot,
          companySnapshot,
          items,
          totalQty,
          subTotal: parseFloat(subTotal.toFixed(2)),
          discountPercent: 0,
          discountAmount: 0,
          totalCgst: parseFloat(totalCgst.toFixed(2)),
          totalSgst: parseFloat(totalSgst.toFixed(2)),
          totalIgst: parseFloat(totalIgst.toFixed(2)),
          totalTax: parseFloat((totalCgst + totalSgst + totalIgst).toFixed(2)),
          grandTotal,
          amountInWords,
          status: 'Paid',
          paymentMethod: pm,
          amountPaid: grandTotal,
          paymentDate: invDateObj,
          createdAt: invDateObj, // Override createdAt for analytics!
          updatedAt: invDateObj,
        });

        seq++;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Insert in batches of 100
    for (let i = 0; i < newInvoices.length; i += 100) {
      await Invoice.insertMany(newInvoices.slice(i, i + 100));
    }
    
    console.log(`Successfully generated ${newInvoices.length} invoices!`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

generateInvoices();
