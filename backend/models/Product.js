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
