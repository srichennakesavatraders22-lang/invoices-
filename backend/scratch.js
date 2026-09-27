import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Invoice from './models/Invoice.js';
import Product from './models/Product.js';

dotenv.config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB');

    const now = new Date();
    const months = 12;

    console.log('Running monthlyRevenue...');
    const monthlyRevenue = await Invoice.aggregate([
      {
        $match: {
          status: { $ne: 'Cancelled' },
          createdAt: { $gte: new Date(now.getFullYear(), now.getMonth() - months + 1, 1) },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          revenue: { $sum: '$grandTotal' },
          invoiceCount: { $sum: 1 },
          totalBoxes: { $sum: '$totalQty' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    console.log('Running topSkusPie...');
    const topSkusPie = await Invoice.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.itemName',
          totalQty: { $sum: '$items.qty' },
          totalRevenue: { $sum: '$items.amount' },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 8 },
    ]);

    console.log('Running categorySales...');
    const categorySales = await Invoice.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productInfo',
        },
      },
      { $unwind: { path: '$productInfo', preserveNullAndEmpty: true } },
      {
        $group: {
          _id: '$productInfo.category',
          totalRevenue: { $sum: '$items.amount' },
          totalQty: { $sum: '$items.qty' },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
    ]);

    console.log('Running customerRevenue...');
    const customerRevenue = await Invoice.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      {
        $group: {
          _id: '$customerSnapshot.businessName',
          totalRevenue: { $sum: '$grandTotal' },
          invoiceCount: { $sum: 1 },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 },
    ]);

    console.log('Running paymentMethodStats...');
    const paymentMethodStats = await Invoice.aggregate([
      { $match: { status: { $ne: 'Cancelled' }, paymentMethod: { $ne: '' } } },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$grandTotal' },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    console.log('Running statusDistribution...');
    const statusDistribution = await Invoice.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$grandTotal' } } },
    ]);

    console.log('All succeeded!');
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    mongoose.disconnect();
  }
};

run();
