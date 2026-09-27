import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    packType: {
      type: String,
      required: [true, 'Pack type is required'],
      trim: true,
    },
    unit: {
      type: String,
      default: 'Boxes',
      trim: true,
    },
    mrp: {
      type: Number,
      required: [true, 'MRP is required'],
      min: 0,
    },
    cgstPercent: {
      type: Number,
      default: 2.5,
      min: 0,
    },
    sgstPercent: {
      type: Number,
      default: 2.5,
      min: 0,
    },
    igstPercent: {
      type: Number,
      default: 5.0,
      min: 0,
    },
    hsnCode: {
      type: String,
      default: '18069010',
      trim: true,
    },
    // ─── NEW: Stock Management ───
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    minStock: {
      type: Number,
      default: 10,
      min: 0,
    },
    // ─── NEW: Expiry Date ───
    expiryDate: {
      type: Date,
      default: null,
    },
    // ─── NEW: Batch / Manufacturing ───
    batchNumber: {
      type: String,
      default: '',
      trim: true,
    },
    manufacturingDate: {
      type: Date,
      default: null,
    },
    // ─── NEW: Product Image ───
    imageUrl: {
      type: String,
      default: '',
    },
    // ─── NEW: Supplier ───
    supplierName: {
      type: String,
      default: '',
      trim: true,
    },
    // ─── NEW: Discount ───
    discountPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Index for search
productSchema.index({ name: 'text', category: 'text', packType: 'text' });

const Product = mongoose.model('Product', productSchema);
export default Product;
