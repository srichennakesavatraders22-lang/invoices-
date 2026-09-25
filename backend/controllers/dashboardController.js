import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';

// @desc    Get dashboard statistics and summaries
// @route   GET /api/dashboard/stats
// @access  Public / Protected
export const getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. Total invoiced this month
    const thisMonthInvoices = await Invoice.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfMonth },
          status: { $ne: 'Cancelled' },
        },
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$grandTotal' },
          count: { $sum: 1 },
        },
      },
    ]);

    const totalInvoicedThisMonth = thisMonthInvoices[0]?.totalAmount || 0;
    const thisMonthCount = thisMonthInvoices[0]?.count || 0;

    // 2. Outstanding amount (Draft, Sent, Overdue)
    const outstandingAggregate = await Invoice.aggregate([
      {
        $match: {
          status: { $in: ['Draft', 'Sent', 'Overdue'] },
        },
      },
      {
        $group: {
          _id: null,
          outstandingAmount: { $sum: '$grandTotal' },
          count: { $sum: 1 },
        },
      },
    ]);

    const outstandingAmount = outstandingAggregate[0]?.outstandingAmount || 0;
    const pendingInvoicesCount = outstandingAggregate[0]?.count || 0;

    // 3. Overall counts
    const totalInvoicesCount = await Invoice.countDocuments();
    const totalPaidInvoices = await Invoice.countDocuments({ status: 'Paid' });
    const totalProductsCount = await Product.countDocuments({ isActive: true });
    const totalCustomersCount = await Customer.countDocuments({ isActive: true });

    // 4. Top-selling SKUs (aggregated from invoice items)
    const topSkus = await Invoice.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.itemName',
          totalQty: { $sum: '$items.qty' },
          totalRevenue: { $sum: '$items.amount' },
        },
      },
      { $sort: { totalQty: -1 } },
      { $limit: 6 },
    ]);

    // 5. Recent 6 invoices
    const recentInvoices = await Invoice.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .select('invoiceNumber invoiceDate customerSnapshot grandTotal status totalQty');

    res.json({
      success: true,
      data: {
        totalInvoicedThisMonth,
        thisMonthCount,
        outstandingAmount,
        pendingInvoicesCount,
        totalInvoicesCount,
        totalPaidInvoices,
        totalProductsCount,
        totalCustomersCount,
        topSkus,
        recentInvoices,
      },
    });
  } catch (error) {
    next(error);
  }
};
