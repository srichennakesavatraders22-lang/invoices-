import Invoice from '../models/Invoice.js';
import Product from '../models/Product.js';
import Customer from '../models/Customer.js';
import Expense from '../models/Expense.js';

// ─── MAIN DASHBOARD STATS ──────────────────────────────────────────────────────
export const getDashboardStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const now = new Date();
    
    // Base match for time-filtered queries
    const dateMatch = {};
    if (startDate && endDate) {
      dateMatch.createdAt = {
        $gte: new Date(`${startDate}T00:00:00.000Z`),
        $lte: new Date(`${endDate}T23:59:59.999Z`),
      };
    } else if (startDate) {
      dateMatch.createdAt = { $gte: new Date(`${startDate}T00:00:00.000Z`) };
    } else if (endDate) {
      dateMatch.createdAt = { $lte: new Date(`${endDate}T23:59:59.999Z`) };
    } else {
      // Default to start of month if no date range provided
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      dateMatch.createdAt = { $gte: startOfMonth };
    }

    // 1. Total invoiced in range
    const rangeInvoices = await Invoice.aggregate([
      { $match: { ...dateMatch, status: { $ne: 'Cancelled' } } },
      { $group: { _id: null, totalAmount: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
    ]);

    // 2. Outstanding amount in range
    const outstandingAggregate = await Invoice.aggregate([
      { $match: { ...dateMatch, status: { $in: ['Draft', 'Sent', 'Overdue'] } } },
      { $group: { _id: null, outstandingAmount: { $sum: '$grandTotal' }, count: { $sum: 1 } } },
    ]);

    // 3. Overall counts in range
    const totalInvoicesCount = await Invoice.countDocuments(dateMatch);
    const totalPaidInvoices = await Invoice.countDocuments({ ...dateMatch, status: 'Paid' });
    const totalProductsCount = await Product.countDocuments({ isActive: true });
    const totalCustomersCount = await Customer.countDocuments({ isActive: true });

    // 4. Total stock value
    const stockAggregate = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, totalStock: { $sum: '$stock' }, totalValue: { $sum: { $multiply: ['$stock', '$mrp'] } } } },
    ]);

    // 5. Top-selling SKUs
    const topSkus = await Invoice.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.itemName', totalQty: { $sum: '$items.qty' }, totalRevenue: { $sum: '$items.amount' } } },
      { $sort: { totalQty: -1 } },
      { $limit: 6 },
    ]);

    // 5b. Slow-moving SKUs
    const slowMovers = await Invoice.aggregate([
      { $match: { status: { $ne: 'Cancelled' } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.itemName', totalQty: { $sum: '$items.qty' }, totalRevenue: { $sum: '$items.amount' } } },
      { $sort: { totalQty: 1 } },
      { $limit: 6 },
    ]);

    // 6. Recent 6 invoices
    const recentInvoices = await Invoice.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .select('invoiceNumber invoiceDate customerSnapshot grandTotal status totalQty paymentMethod');

    // 7. Low stock products
    const lowStockProducts = await Product.find({
      isActive: true,
      $expr: { $lte: ['$stock', '$minStock'] },
    }).sort({ stock: 1 }).limit(10).select('name category stock minStock unit');

    // 8. Expiry alerts
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const in15Days = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const expiryAlerts = await Product.find({
      isActive: true,
      expiryDate: { $ne: null, $lte: in30Days },
    }).sort({ expiryDate: 1 }).limit(10).select('name category stock expiryDate unit');

    const expiredProducts = await Product.find({
      isActive: true,
      expiryDate: { $ne: null, $lt: now },
    }).countDocuments();

    const expiringIn7 = await Product.countDocuments({
      isActive: true,
      expiryDate: { $ne: null, $gte: now, $lte: in7Days },
    });
    const expiringIn15 = await Product.countDocuments({
      isActive: true,
      expiryDate: { $ne: null, $gt: in7Days, $lte: in15Days },
    });
    const expiringIn30 = await Product.countDocuments({
      isActive: true,
      expiryDate: { $ne: null, $gt: in15Days, $lte: in30Days },
    });

    // 9. Overdue invoices
    const overdueInvoices = await Invoice.find({ status: 'Overdue' })
      .sort({ createdAt: 1 })
      .limit(5)
      .select('invoiceNumber invoiceDate customerSnapshot grandTotal dueDate');

    // 10. Expenses in range
    const expenseMatch = {};
    if (startDate && endDate) {
      expenseMatch.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      expenseMatch.date = { $gte: startDate };
    } else if (endDate) {
      expenseMatch.date = { $lte: endDate };
    } else {
      const todayStr = now.toISOString().split('T')[0];
      expenseMatch.date = todayStr;
    }
    
    const expensesList = await Expense.find(expenseMatch).sort({ createdAt: -1 });
    const expensesAmount = expensesList.reduce((sum, exp) => sum + exp.amount, 0);

    res.json({
      success: true,
      data: {
        totalInvoicedThisMonth: rangeInvoices[0]?.totalAmount || 0,
        thisMonthCount: rangeInvoices[0]?.count || 0,
        outstandingAmount: outstandingAggregate[0]?.outstandingAmount || 0,
        pendingInvoicesCount: outstandingAggregate[0]?.count || 0,
        totalInvoicesCount,
        totalPaidInvoices,
        totalProductsCount,
        totalCustomersCount,
        totalStock: stockAggregate[0]?.totalStock || 0,
        totalStockValue: stockAggregate[0]?.totalValue || 0,
        topSkus,
        slowMovers,
        recentInvoices,
        lowStockProducts,
        expiryAlerts,
        expiredProducts,
        expiringIn7,
        expiringIn15,
        expiringIn30,
        overdueInvoices,
        todayExpensesList: expensesList,
        todayExpensesAmount: expensesAmount,
        lowStockCount: lowStockProducts.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── ANALYTICS: Monthly Revenue Chart ─────────────────────────────────────────
export const getAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const now = new Date();
    
    // Build date filter
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate + 'T23:59:59.999Z')
      };
    } else {
      // Default: last 12 months
      const months = 12;
      dateFilter.createdAt = { $gte: new Date(now.getFullYear(), now.getMonth() - months + 1, 1) };
    }

    // Base match for invoices (exclude cancelled)
    const baseMatch = { status: { $ne: 'Cancelled' }, ...dateFilter };

    // Smart auto-detect grouping based on the date span
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    let groupBy = 'month'; // default
    if (startDate && endDate) {
      const s = new Date(startDate);
      const e = new Date(endDate + 'T23:59:59.999Z');
      const daySpan = Math.ceil((e - s) / (1000 * 60 * 60 * 24));

      if (daySpan <= 1) groupBy = 'hour';
      else if (daySpan <= 14) groupBy = 'day';
      else if (daySpan <= 90) groupBy = 'week';
      else groupBy = 'month';
    }

    let groupCondition;
    let sortCondition;
    if (groupBy === 'hour') {
      groupCondition = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' },
        hour: { $hour: '$createdAt' },
      };
      sortCondition = { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 };
    } else if (groupBy === 'day') {
      groupCondition = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
        day: { $dayOfMonth: '$createdAt' },
        dayOfWeek: { $dayOfWeek: '$createdAt' }, // 1=Sun, 7=Sat
      };
      sortCondition = { '_id.year': 1, '_id.month': 1, '_id.day': 1 };
    } else if (groupBy === 'week') {
      groupCondition = {
        year: { $year: '$createdAt' },
        week: { $isoWeek: '$createdAt' },
      };
      sortCondition = { '_id.year': 1, '_id.week': 1 };
    } else {
      // month
      groupCondition = {
        year: { $year: '$createdAt' },
        month: { $month: '$createdAt' },
      };
      sortCondition = { '_id.year': 1, '_id.month': 1 };
    }

    // Revenue for selected range
    const monthlyRevenue = await Invoice.aggregate([
      { $match: baseMatch },
      {
        $group: {
          _id: groupCondition,
          revenue: { $sum: '$grandTotal' },
          invoiceCount: { $sum: 1 },
          totalBoxes: { $sum: '$totalQty' },
        },
      },
      { $sort: sortCondition },
    ]);

    const monthlyData = monthlyRevenue.map((m, idx) => {
      let label = '';
      if (groupBy === 'hour') {
        const h = m._id.hour;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        label = `${h12}${ampm} ${String(m._id.day).padStart(2, '0')}/${m._id.month}`;
      } else if (groupBy === 'day') {
        const dowIdx = (m._id.dayOfWeek - 1 + 7) % 7; // convert 1-7 to 0-6
        const dow = dayNames[dowIdx];
        label = `${dow} ${String(m._id.day).padStart(2, '0')} ${monthNames[m._id.month - 1]}`;
      } else if (groupBy === 'week') {
        label = `Wk${m._id.week} '${String(m._id.year).slice(2)}`;
      } else {
        label = `${monthNames[m._id.month - 1]} ${m._id.year}`;
      }
      return {
        month: label,
        revenue: m.revenue,
        invoiceCount: m.invoiceCount,
        totalBoxes: m.totalBoxes,
        colorIndex: idx, // used for multi-color bars on frontend
      };
    });

    // Top SKUs (for pie chart)
    const topSkusPie = await Invoice.aggregate([
      { $match: baseMatch },
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

    // Category-wise sales (pie chart)
    const categorySales = await Invoice.aggregate([
      { $match: baseMatch },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productInfo',
        },
      },
      { $unwind: { path: '$productInfo', preserveNullAndEmptyArrays: true } },
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

    // Customer-wise revenue (bar chart top 10)
    const customerRevenue = await Invoice.aggregate([
      { $match: baseMatch },
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

    // Payment method breakdown
    const paymentMethodStats = await Invoice.aggregate([
      { $match: { ...baseMatch, paymentMethod: { $nin: [null, ''] } } },
      {
        $project: {
          payments: {
            $cond: {
              if: { $eq: ['$paymentMethod', 'Mixed'] },
              then: {
                $map: {
                  input: { $ifNull: ['$paymentBreakdown', []] },
                  as: 'pb',
                  in: { method: '$$pb.method', amount: '$$pb.amount' }
                }
              },
              else: [{ method: '$paymentMethod', amount: '$grandTotal' }]
            }
          }
        }
      },
      { $unwind: '$payments' },
      { $match: { 'payments.method': { $nin: [null, ''] } } },
      {
        $group: {
          _id: '$payments.method',
          count: { $sum: 1 },
          totalAmount: { $sum: '$payments.amount' },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    // Status distribution (donut chart)
    const statusDistribution = await Invoice.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$status', count: { $sum: 1 }, totalAmount: { $sum: '$grandTotal' } } },
    ]);

    res.json({
      success: true,
      data: {
        monthlyData,
        groupBy, // tell frontend what grouping is active
        topSkusPie,
        categorySales,
        customerRevenue,
        paymentMethodStats,
        statusDistribution,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ─── REAL-TIME ALERTS ──────────────────────────────────────────────────────────
export const getAlerts = async (req, res, next) => {
  try {
    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const [expiryAlerts, lowStockAlerts, overdueInvoices, expiredProducts] = await Promise.all([
      Product.find({
        isActive: true,
        expiryDate: { $ne: null, $gte: now, $lte: in30Days },
      }).sort({ expiryDate: 1 }).select('name category stock expiryDate unit'),

      Product.find({
        isActive: true,
        $expr: { $lte: ['$stock', '$minStock'] },
      }).sort({ stock: 1 }).select('name category stock minStock unit'),

      Invoice.find({ status: 'Overdue' })
        .sort({ createdAt: 1 })
        .select('invoiceNumber invoiceDate customerSnapshot grandTotal dueDate'),

      Product.find({
        isActive: true,
        expiryDate: { $ne: null, $lt: now },
      }).sort({ expiryDate: 1 }).select('name category stock expiryDate unit'),
    ]);

    const alerts = [];

    expiredProducts.forEach((p) => {
      alerts.push({
        type: 'expired',
        severity: 'critical',
        title: `${p.name} has EXPIRED`,
        message: `Stock: ${p.stock} ${p.unit}. Expired on ${new Date(p.expiryDate).toLocaleDateString('en-IN')}`,
        productId: p._id,
      });
    });

    expiryAlerts.forEach((p) => {
      const daysLeft = Math.ceil((new Date(p.expiryDate) - now) / (1000 * 60 * 60 * 24));
      alerts.push({
        type: 'expiry',
        severity: daysLeft <= 7 ? 'high' : daysLeft <= 15 ? 'medium' : 'low',
        title: `${p.name} expires in ${daysLeft} days`,
        message: `Stock: ${p.stock} ${p.unit}. Expiry: ${new Date(p.expiryDate).toLocaleDateString('en-IN')}`,
        productId: p._id,
        daysLeft,
      });
    });

    lowStockAlerts.forEach((p) => {
      alerts.push({
        type: 'lowStock',
        severity: p.stock === 0 ? 'critical' : 'medium',
        title: p.stock === 0 ? `${p.name} is OUT OF STOCK` : `${p.name} is low on stock`,
        message: `Current: ${p.stock} ${p.unit} | Minimum: ${p.minStock} ${p.unit}`,
        productId: p._id,
      });
    });

    overdueInvoices.forEach((inv) => {
      alerts.push({
        type: 'overdue',
        severity: 'high',
        title: `Invoice ${inv.invoiceNumber} is OVERDUE`,
        message: `Customer: ${inv.customerSnapshot?.businessName} | Amount: Rs. ${inv.grandTotal}`,
        invoiceId: inv._id,
      });
    });

    res.json({
      success: true,
      data: {
        alerts,
        counts: {
          expired: expiredProducts.length,
          expiring: expiryAlerts.length,
          lowStock: lowStockAlerts.length,
          overdue: overdueInvoices.length,
          total: alerts.length,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
