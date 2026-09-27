import mongoose from 'mongoose';

const invoiceItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  itemName: {
    type: String,
    required: true,
  },
  packType: {
    type: String,
    default: '',
  },
  unit: {
    type: String,
    default: 'Boxes',
  },
  qty: {
    type: Number,
    required: true,
    min: 1,
  },
  mrp: {
    type: Number,
    required: true,
    min: 0,
  },
  // ─── NEW: Discount per item ───
  discountPercent: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  discountAmount: {
    type: Number,
    default: 0,
  },
  taxableAmount: {
    type: Number,
    required: true,
    min: 0,
  },
  cgstPercent: {
    type: Number,
    default: 0,
  },
  sgstPercent: {
    type: Number,
    default: 0,
  },
  igstPercent: {
    type: Number,
    default: 0,
  },
  cgstAmount: {
    type: Number,
    default: 0,
  },
  sgstAmount: {
    type: Number,
    default: 0,
  },
  igstAmount: {
    type: Number,
    default: 0,
  },
  totalTaxAmount: {
    type: Number,
    default: 0,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
});

// ─── NEW: Payment breakdown schema ───
const paymentBreakdownSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ['Cash', 'UPI', 'Cheque', 'Bank Transfer', 'Credit'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  reference: {
    type: String,
    default: '', // UPI txn ID, cheque number, etc.
  },
  paidAt: {
    type: Date,
    default: Date.now,
  },
});

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    sequenceNumber: {
      type: Number,
      required: true,
    },
    invoiceDate: {
      type: String,
      required: true,
      default: () => {
        const d = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        const [yyyy, mm, dd] = d.split('-');
        return `${dd}-${mm}-${yyyy}`;
      },
    },
    invoiceTime: {
      type: String,
      required: true,
      default: () => new Date().toLocaleTimeString('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }),
    },
    // ─── NEW: Due date ───
    dueDate: {
      type: Date,
      default: null,
    },
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },
    customerSnapshot: {
      name: { type: String, required: true },
      businessName: { type: String, required: true },
      billingAddress: { type: String, required: true },
      shippingAddress: { type: String, required: true },
      gstin: { type: String, default: '' },
      mobile: { type: String, required: true },
      email: { type: String, default: '' },
      isInterState: { type: Boolean, default: false },
    },
    companySnapshot: {
      businessName: { type: String, required: true },
      tagline: { type: String, default: '' },
      address: { type: String, required: true },
      mobile: { type: String, required: true },
      email: { type: String, default: '' },
      gstin: { type: String, default: '' },
      logoUrl: { type: String, default: '' },
      stampUrl: { type: String, default: '' },
      bankDetails: {
        accountName: String,
        accountNumber: String,
        ifsc: String,
        bankName: String,
        branch: String,
      },
      termsAndConditions: [String],
    },
    items: [invoiceItemSchema],
    totalQty: {
      type: Number,
      required: true,
      default: 0,
    },
    subTotal: {
      type: Number,
      required: true,
      default: 0,
    },
    // ─── NEW: Invoice-level discount ───
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    totalCgst: {
      type: Number,
      default: 0,
    },
    totalSgst: {
      type: Number,
      default: 0,
    },
    totalIgst: {
      type: Number,
      default: 0,
    },
    totalTax: {
      type: Number,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      default: 0,
    },
    amountInWords: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'],
      default: 'Sent',
    },
    // ─── NEW: Payment method (primary) ───
    paymentMethod: {
      type: String,
      enum: ['Cash', 'UPI', 'Cheque', 'Bank Transfer', 'Credit', 'Mixed', ''],
      default: '',
    },
    // ─── NEW: Mixed payment breakdown ───
    paymentBreakdown: [paymentBreakdownSchema],
    // ─── NEW: Amount paid so far ───
    amountPaid: {
      type: Number,
      default: 0,
    },
    paymentDate: {
      type: Date,
    },
    notes: {
      type: String,
      default: '',
    },
    // ─── NEW: Transport details ───
    transportMode: {
      type: String,
      default: '',
    },
    vehicleNumber: {
      type: String,
      default: '',
    },
    lrNumber: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

invoiceSchema.index({ invoiceNumber: 1, createdAt: -1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
