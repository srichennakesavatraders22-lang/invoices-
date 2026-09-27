import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js';
import CompanyProfile from '../models/CompanyProfile.js';
import Counter from '../models/Counter.js';
import Product from '../models/Product.js';
import recalculateInvoice from '../utils/gstCalculator.js';
import generateInvoicePDF from '../utils/pdfGenerator.js';
import xlsx from 'xlsx';

// Helper to format sequence number
const formatInvoiceNumber = (prefix, seq) => {
  const padded = String(seq).padStart(4, '0');
  return `${prefix || 'SCKT/2026-27/'}${padded}`;
};

// Helper: decrement stock for all items in an invoice
const decrementStock = async (items) => {
  for (const item of items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: -item.qty },
    });
  }
};

// Helper: restore stock when invoice is deleted/cancelled
const restoreStock = async (items) => {
  for (const item of items) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stock: item.qty },
    });
  }
};

// ─── GET ALL INVOICES ──────────────────────────────────────────────────────────
export const getInvoices = async (req, res, next) => {
  try {
    const { search, status, customerId, startDate, endDate, page = 1, limit = 15 } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'customerSnapshot.businessName': { $regex: search, $options: 'i' } },
        { 'customerSnapshot.name': { $regex: search, $options: 'i' } },
      ];
    }

    if (status) query.status = status;
    if (customerId) query.customer = customerId;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 15;
    const skip = (pageNum - 1) * limitNum;

    const total = await Invoice.countDocuments(query);
    const invoices = await Invoice.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum);

    res.json({
      success: true,
      data: invoices,
      pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum), limit: limitNum },
    });
  } catch (error) {
    next(error);
  }
};

// ─── GET SINGLE INVOICE ────────────────────────────────────────────────────────
export const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }
    res.json({ success: true, data: invoice });
  } catch (error) {
    next(error);
  }
};

// ─── CREATE INVOICE ────────────────────────────────────────────────────────────
export const createInvoice = async (req, res, next) => {
  try {
    const {
      customerId, items, notes, status = 'Sent',
      invoiceDate, invoiceTime, shippingAddress,
      paymentMethod, paymentBreakdown, dueDate,
      discountPercent, transportMode, vehicleNumber, lrNumber,
    } = req.body;

    if (!customerId) {
      return res.status(400).json({ success: false, message: 'Customer is required' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one line item is required' });
    }

    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    let company = await CompanyProfile.findOne();
    if (!company) company = await CompanyProfile.create({});

    const isInterState = Boolean(customer.isInterState);
    const invoiceDiscount = Number(discountPercent || 0);
    const calculation = await recalculateInvoice(items, isInterState, invoiceDiscount);

    // ─── Generate invoice number with retry on duplicate ──────────────────────
    let invoiceNumber = '';
    let sequenceNum = 0;
    let retryCount = 0;
    const MAX_RETRIES = 5;

    while (retryCount < MAX_RETRIES) {
      const counter = await Counter.findByIdAndUpdate(
        { _id: 'invoiceNumber' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );
      sequenceNum = counter.seq;
      invoiceNumber = formatInvoiceNumber(company.invoicePrefix, sequenceNum);

      // Check if this number already exists
      const existing = await Invoice.findOne({ invoiceNumber });
      if (!existing) break; // Unique — proceed

      // Already taken — resync counter to the actual max in DB and retry
      const maxSeqDoc = await Invoice.findOne({}, { sequenceNumber: 1 }).sort({ sequenceNumber: -1 });
      const maxSeq = maxSeqDoc?.sequenceNumber || sequenceNum;
      await Counter.findByIdAndUpdate(
        { _id: 'invoiceNumber' },
        { $set: { seq: maxSeq } },
        { upsert: true }
      );
      retryCount++;
    }

    if (!invoiceNumber) {
      return res.status(500).json({ success: false, message: 'Unable to generate a unique invoice number. Please try again.' });
    }

    const customerSnapshot = {
      name: customer.name,
      businessName: customer.businessName,
      billingAddress: customer.billingAddress,
      shippingAddress: shippingAddress || customer.shippingAddress || customer.billingAddress,
      gstin: customer.gstin || '',
      mobile: customer.mobile,
      email: customer.email || '',
      isInterState,
    };

    const companySnapshot = {
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
    };

    // Determine payment method
    let finalPaymentMethod = paymentMethod || '';
    if (paymentBreakdown && Array.isArray(paymentBreakdown) && paymentBreakdown.length > 1) {
      finalPaymentMethod = 'Mixed';
    }

    // Calculate amount paid from breakdown
    let amountPaid = 0;
    if (paymentBreakdown && Array.isArray(paymentBreakdown)) {
      amountPaid = paymentBreakdown.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    } else if (finalPaymentMethod && finalPaymentMethod !== '' && finalPaymentMethod !== 'Credit') {
      amountPaid = calculation.grandTotal;
    }

    const newInvoiceData = {
      invoiceNumber,
      sequenceNumber: sequenceNum,
      customer: customer._id,
      customerSnapshot,
      companySnapshot,
      items: calculation.items,
      totalQty: calculation.totalQty,
      subTotal: calculation.subTotal,
      totalCgst: calculation.totalCgst,
      totalSgst: calculation.totalSgst,
      totalIgst: calculation.totalIgst,
      totalTax: calculation.totalTax,
      discountPercent: calculation.discountPercent,
      discountAmount: calculation.discountAmount,
      grandTotal: calculation.grandTotal,
      amountInWords: calculation.amountInWords,
      status: status || 'Sent',
      paymentMethod: finalPaymentMethod,
      paymentBreakdown: paymentBreakdown || [],
      amountPaid,
      notes: notes || '',
      dueDate: dueDate || null,
      transportMode: transportMode || '',
      vehicleNumber: vehicleNumber || '',
      lrNumber: lrNumber || '',
    };

    if (invoiceDate) newInvoiceData.invoiceDate = invoiceDate;
    if (invoiceTime) newInvoiceData.invoiceTime = invoiceTime;

    const invoice = await Invoice.create(newInvoiceData);

    // ─── Decrement stock for each item ───────────────────────────────────────
    if (status !== 'Draft' && status !== 'Cancelled') {
      await decrementStock(calculation.items);
    }

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// ─── UPDATE INVOICE ────────────────────────────────────────────────────────────
export const updateInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (invoice.status === 'Paid') {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit an invoice that is already marked as Paid',
      });
    }

    const {
      customerId, items, notes, status, invoiceDate, invoiceTime,
      shippingAddress, paymentMethod, paymentBreakdown, dueDate,
      discountPercent, transportMode, vehicleNumber, lrNumber,
    } = req.body;

    let isInterState = invoice.customerSnapshot.isInterState;
    const oldItems = invoice.items; // save for stock restoration
    const wasNonDraft = invoice.status !== 'Draft' && invoice.status !== 'Cancelled';

    if (customerId && customerId !== invoice.customer.toString()) {
      const customer = await Customer.findById(customerId);
      if (!customer) {
        return res.status(404).json({ success: false, message: 'Customer not found' });
      }
      isInterState = customer.isInterState;
      invoice.customer = customer._id;
      invoice.customerSnapshot = {
        name: customer.name,
        businessName: customer.businessName,
        billingAddress: customer.billingAddress,
        shippingAddress: shippingAddress || customer.shippingAddress || customer.billingAddress,
        gstin: customer.gstin || '',
        mobile: customer.mobile,
        email: customer.email || '',
        isInterState,
      };
    } else if (shippingAddress) {
      invoice.customerSnapshot.shippingAddress = shippingAddress;
    }

    if (items && Array.isArray(items) && items.length > 0) {
      const invoiceDiscount = Number(discountPercent || invoice.discountPercent || 0);
      const calculation = await recalculateInvoice(items, isInterState, invoiceDiscount);

      // Restore old stock, then deduct new stock
      if (wasNonDraft) await restoreStock(oldItems);

      invoice.items = calculation.items;
      invoice.totalQty = calculation.totalQty;
      invoice.subTotal = calculation.subTotal;
      invoice.totalCgst = calculation.totalCgst;
      invoice.totalSgst = calculation.totalSgst;
      invoice.totalIgst = calculation.totalIgst;
      invoice.totalTax = calculation.totalTax;
      invoice.discountPercent = calculation.discountPercent;
      invoice.discountAmount = calculation.discountAmount;
      invoice.grandTotal = calculation.grandTotal;
      invoice.amountInWords = calculation.amountInWords;

      const newStatus = status || invoice.status;
      if (newStatus !== 'Draft' && newStatus !== 'Cancelled') {
        await decrementStock(calculation.items);
      }
    } else if (status && status !== invoice.status) {
      // If only status changed and items were not updated
      const prevStatus = invoice.status;
      if (status === 'Cancelled' && prevStatus !== 'Cancelled' && prevStatus !== 'Draft') {
        await restoreStock(invoice.items);
      }
      if ((prevStatus === 'Cancelled' || prevStatus === 'Draft') && status !== 'Cancelled' && status !== 'Draft') {
        await decrementStock(invoice.items);
      }
    }

    if (notes !== undefined) invoice.notes = notes;
    if (status) invoice.status = status;
    if (invoiceDate) invoice.invoiceDate = invoiceDate;
    if (invoiceTime) invoice.invoiceTime = invoiceTime;
    if (dueDate !== undefined) invoice.dueDate = dueDate;
    if (transportMode !== undefined) invoice.transportMode = transportMode;
    if (vehicleNumber !== undefined) invoice.vehicleNumber = vehicleNumber;
    if (lrNumber !== undefined) invoice.lrNumber = lrNumber;

    // Payment fields
    if (paymentMethod !== undefined) invoice.paymentMethod = paymentMethod;
    if (paymentBreakdown !== undefined) {
      invoice.paymentBreakdown = paymentBreakdown;
      if (Array.isArray(paymentBreakdown) && paymentBreakdown.length > 1) {
        invoice.paymentMethod = 'Mixed';
      }
      invoice.amountPaid = paymentBreakdown.reduce((s, p) => s + Number(p.amount || 0), 0);
    }

    const updated = await invoice.save();
    res.json({ success: true, message: 'Invoice updated successfully', data: updated });
  } catch (error) {
    next(error);
  }
};

// ─── UPDATE STATUS ─────────────────────────────────────────────────────────────
export const updateInvoiceStatus = async (req, res, next) => {
  try {
    const { status, paymentMethod } = req.body;
    const validStatuses = ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const prevStatus = invoice.status;
    invoice.status = status;

    if (status === 'Paid') {
      invoice.paymentDate = new Date();
      invoice.amountPaid = invoice.grandTotal;
      if (paymentMethod) invoice.paymentMethod = paymentMethod;
    }

    // If moving TO Cancelled from a valid state, restore stock
    if (status === 'Cancelled' && prevStatus !== 'Cancelled' && prevStatus !== 'Draft') {
      await restoreStock(invoice.items);
    }

    // If moving FROM Cancelled or Draft TO a valid state, deduct stock
    if ((prevStatus === 'Cancelled' || prevStatus === 'Draft') && status !== 'Cancelled' && status !== 'Draft') {
      await decrementStock(invoice.items);
    }

    await invoice.save();
    res.json({ success: true, message: `Invoice status updated to ${status}`, data: invoice });
  } catch (error) {
    next(error);
  }
};

// ─── DELETE INVOICE ────────────────────────────────────────────────────────────
export const deleteInvoice = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (invoice.status === 'Paid') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete an invoice that is already marked as Paid.',
      });
    }

    // Restore stock if not draft/cancelled
    if (invoice.status !== 'Draft' && invoice.status !== 'Cancelled') {
      await restoreStock(invoice.items);
    }

    await Invoice.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// ─── STREAM PDF ────────────────────────────────────────────────────────────────
export const streamInvoicePDF = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const filename = `Invoice-${invoice.invoiceNumber.replace(/[\/\\]/g, '_')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    await generateInvoicePDF(invoice, res);
  } catch (error) {
    next(error);
  }
};

// ─── EXPORT INVOICES TO EXCEL ──────────────────────────────────────────────────
export const exportInvoicesExcel = async (req, res, next) => {
  try {
    const { startDate, endDate, status } = req.query;
    const query = {};

    if (status) query.status = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const invoices = await Invoice.find(query).sort({ createdAt: -1 });

    const rows = invoices.map((inv, i) => ({
      'S.No': i + 1,
      'Invoice No': inv.invoiceNumber,
      'Date': inv.invoiceDate,
      'Customer': inv.customerSnapshot?.businessName || inv.customerSnapshot?.name,
      'Mobile': inv.customerSnapshot?.mobile,
      'Billing Address': inv.customerSnapshot?.billingAddress,
      'GSTIN': inv.customerSnapshot?.gstin,
      'Total Boxes': inv.totalQty,
      'Sub Total (Rs.)': inv.subTotal,
      'CGST (Rs.)': inv.totalCgst,
      'SGST (Rs.)': inv.totalSgst,
      'IGST (Rs.)': inv.totalIgst,
      'Tax Total (Rs.)': inv.totalTax,
      'Discount (Rs.)': inv.discountAmount || 0,
      'Grand Total (Rs.)': inv.grandTotal,
      'Payment Method': inv.paymentMethod || '',
      'Amount Paid (Rs.)': inv.amountPaid || 0,
      'Status': inv.status,
      'Due Date': inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-IN') : '',
      'Notes': inv.notes,
    }));

    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(rows);
    ws['!cols'] = [
      { wch: 6 }, { wch: 18 }, { wch: 12 }, { wch: 24 }, { wch: 14 },
      { wch: 30 }, { wch: 18 }, { wch: 10 }, { wch: 14 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 },
      { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 24 },
    ];

    xlsx.utils.book_append_sheet(wb, ws, 'Invoices');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Invoices_Report.xlsx"');
    res.send(buffer);
  } catch (error) {
    next(error);
  }
};
