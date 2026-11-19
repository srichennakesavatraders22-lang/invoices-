import mongoose from 'mongoose';

// ─── INVOICE ITEM SCHEMA ──────────────────────────────────────────────────────
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
  hsnCode: {
    type: String,
    default: '',
  },
  packType: {
    type: String,
    default: '',
  },

  // ─── Unit snapshot at time of invoice ───────────────────────────────────
  // sellUnit: which unit was selected when selling (Carton / Box / Piece)
  sellUnit: {
    type: String,
    enum: ['Carton', 'Cotton', 'Box', 'Piece'],
    default: 'Box',
  },
  // qty is the count of sellUnit sold (e.g. 3 Cartons)
  qty: {
    type: Number,
    required: true,
    min: 1,
  },
  // piecesPerBox and boxesPerCarton at the time of invoice (snapshot — immutable)
  piecesPerBox: { type: Number, default: 1 },
  boxesPerCarton: { type: Number, default: 1 },
  boxesPerCotton: { type: Number, default: 1 },
  // totalPiecesSold = computed pieces deducted from stock
  totalPiecesSold: { type: Number, default: 0 },

  // ─── Price snapshot at time of invoice (immutable) ──────────────────────
  piecePrice: { type: Number, required: true, min: 0 },   // price per piece at sale time
  unitPrice: { type: Number, required: true, min: 0 },    // price per sellUnit (piece/box/cotton) at sale time

  // ─── Discount ────────────────────────────────────────────────────────────
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  discountAmount: { type: Number, default: 0 },
  taxableAmount: { type: Number, required: true, min: 0 },

  // ─── GST (single, replaces CGST/SGST/IGST) ───────────────────────────────
  gstPercent: { type: Number, default: 5 },
  gstAmount: { type: Number, default: 0 },
  totalTaxAmount: { type: Number, default: 0 },

  amount: { type: Number, required: true, min: 0 },  // final line total incl. GST
});

// ─── PAYMENT BREAKDOWN SCHEMA ─────────────────────────────────────────────────
const paymentBreakdownSchema = new mongoose.Schema({
  method: {
    type: String,
    enum: ['Cash', 'UPI', 'Cheque', 'Bank Transfer', 'Credit'],
    required: true,
  },
  amount: { type: Number, required: true, min: 0 },
  reference: { type: String, default: '' },
  paidAt: { type: Date, default: Date.now },
});

// ─── INVOICE SCHEMA ───────────────────────────────────────────────────────────
const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    sequenceNumber: { type: Number, required: true },
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
      default: () =>
        new Date().toLocaleTimeString('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
    },
    dueDate: { type: Date, default: null },

    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
    },

    // ─── Snapshots (immutable — never change after creation) ──────────────
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

    // ─── Totals ────────────────────────────────────────────────────────────
    totalQty: { type: Number, required: true, default: 0 },
    subTotal: { type: Number, required: true, default: 0 },      // pre-tax total

    // ─── Invoice-level discount ────────────────────────────────────────────
    discountType: { type: String, enum: ['percentage', 'flat'], default: 'percentage' },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    discountAmount: { type: Number, default: 0 },

    // ─── GST (single) ──────────────────────────────────────────────────────
    totalGst: { type: Number, default: 0 },
    totalTax: { type: Number, default: 0 },   // alias = totalGst (for compatibility)

    grandTotal: { type: Number, required: true, default: 0 },
    amountInWords: { type: String, required: true },

    // ─── Payment ───────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['Draft', 'Sent', 'Paid', 'Overdue', 'Cancelled'],
      default: 'Sent',
    },
    paymentMethod: {
      type: String,
      enum: ['Cash', 'UPI', 'Cheque', 'Bank Transfer', 'Credit', 'Mixed', ''],
      default: '',
    },
    paymentBreakdown: [paymentBreakdownSchema],
    amountPaid: { type: Number, default: 0 },
    paymentDate: { type: Date },

    notes: { type: String, default: '' },

    // ─── Transport ─────────────────────────────────────────────────────────
    transportMode: { type: String, default: '' },
    vehicleNumber: { type: String, default: '' },
    lrNumber: { type: String, default: '' },
  },
  { timestamps: true }
);

invoiceSchema.index({ invoiceNumber: 1, createdAt: -1 });

const Invoice = mongoose.model('Invoice', invoiceSchema);
export default Invoice;
