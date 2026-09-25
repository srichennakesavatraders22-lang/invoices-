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
        const d = new Date();
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        return `${dd}-${mm}-${yyyy}`;
      },
    },
    invoiceTime: {
      type: String,
      required: true,
      default: () => {
        const d = new Date();
        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
      },
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
    paymentDate: {
      type: Date,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

invoiceSchema.index({ invoiceNumber: 1, createdAt: -1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
