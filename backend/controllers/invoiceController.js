import Invoice from '../models/Invoice.js';
import Customer from '../models/Customer.js';
import CompanyProfile from '../models/CompanyProfile.js';
import Counter from '../models/Counter.js';
import recalculateInvoice from '../utils/gstCalculator.js';
import generateInvoicePDF from '../utils/pdfGenerator.js';

// Helper to format sequence number
const formatInvoiceNumber = (prefix, seq) => {
  const padded = String(seq).padStart(4, '0');
  return `${prefix || 'SCKT/2026-27/'}${padded}`;
};

// @desc    Get all invoices with filters, search, and pagination
// @route   GET /api/invoices
// @access  Public / Protected
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

    if (status) {
      query.status = status;
    }

    if (customerId) {
      query.customer = customerId;
    }

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
    const invoices = await Invoice.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    res.json({
      success: true,
      data: invoices,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single invoice detail
// @route   GET /api/invoices/:id
// @access  Public / Protected
export const getInvoiceById = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    res.json({
      success: true,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new invoice
// @route   POST /api/invoices
// @access  Private
export const createInvoice = async (req, res, next) => {
  try {
    const {
      customerId,
      items,
      notes,
      status = 'Sent',
      invoiceDate,
      invoiceTime,
      shippingAddress,
    } = req.body;

    if (!customerId) {
      return res.status(400).json({ success: false, message: 'Customer is required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one line item is required' });
    }

    // 1. Fetch customer
    const customer = await Customer.findById(customerId);
    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // 2. Fetch company profile
    let company = await CompanyProfile.findOne();
    if (!company) {
      company = await CompanyProfile.create({});
    }

    // 3. Authoritative server-side recalculation of lines & GST
    const isInterState = Boolean(customer.isInterState);
    const calculation = await recalculateInvoice(items, isInterState);

    // 4. Atomic invoice sequence increment
    const counter = await Counter.findByIdAndUpdate(
      { _id: 'invoiceNumber' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const invoiceNumber = formatInvoiceNumber(company.invoicePrefix, counter.seq);

    // 5. Create customer snapshot
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

    // 6. Create company snapshot
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

    // 7. Assemble and save invoice
    const newInvoiceData = {
      invoiceNumber,
      sequenceNumber: counter.seq,
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
      grandTotal: calculation.grandTotal,
      amountInWords: calculation.amountInWords,
      status: status || 'Sent',
      notes: notes || '',
    };

    if (invoiceDate) newInvoiceData.invoiceDate = invoiceDate;
    if (invoiceTime) newInvoiceData.invoiceTime = invoiceTime;

    const invoice = await Invoice.create(newInvoiceData);

    res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update invoice
// @route   PUT /api/invoices/:id
// @access  Private
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
      customerId,
      items,
      notes,
      status,
      invoiceDate,
      invoiceTime,
      shippingAddress,
    } = req.body;

    // Recalculate if customer or items changed
    let isInterState = invoice.customerSnapshot.isInterState;

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
      const calculation = await recalculateInvoice(items, isInterState);
      invoice.items = calculation.items;
      invoice.totalQty = calculation.totalQty;
      invoice.subTotal = calculation.subTotal;
      invoice.totalCgst = calculation.totalCgst;
      invoice.totalSgst = calculation.totalSgst;
      invoice.totalIgst = calculation.totalIgst;
      invoice.totalTax = calculation.totalTax;
      invoice.grandTotal = calculation.grandTotal;
      invoice.amountInWords = calculation.amountInWords;
    }

    if (notes !== undefined) invoice.notes = notes;
    if (status) invoice.status = status;
    if (invoiceDate) invoice.invoiceDate = invoiceDate;
    if (invoiceTime) invoice.invoiceTime = invoiceTime;

    const updated = await invoice.save();

    res.json({
      success: true,
      message: 'Invoice updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update invoice status
// @route   PATCH /api/invoices/:id/status
// @access  Private
export const updateInvoiceStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value' });
    }

    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    invoice.status = status;
    if (status === 'Paid') {
      invoice.paymentDate = new Date();
    }

    await invoice.save();

    res.json({
      success: true,
      message: `Invoice status updated to ${status}`,
      data: invoice,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete invoice (restrict if paid)
// @route   DELETE /api/invoices/:id
// @access  Private
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

    await Invoice.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Invoice deleted successfully',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Stream generated PDF for invoice
// @route   GET /api/invoices/:id/pdf
// @access  Public / Protected
export const streamInvoicePDF = async (req, res, next) => {
  try {
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const filename = `Invoice-${invoice.invoiceNumber.replace(/[\/\\]/g, '_')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    generateInvoicePDF(invoice, res);
  } catch (error) {
    next(error);
  }
};
