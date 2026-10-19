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

    // ─── PIECE PRICE (base unit price) ───────────────────────────────────────
    piecePrice: {
      type: Number,
      required: [true, 'Piece price is required'],
      min: 0,
      default: 4,
    },

    // ─── BOX CONFIGURATION ───────────────────────────────────────────────────
    piecesPerBox: {
      type: Number,
      required: [true, 'Pieces per box is required'],
      min: 1,
      default: 24,
    },
    // boxPrice = piecesPerBox × piecePrice  (calculated, not stored)

    // ─── CARTON CONFIGURATION ─────────────────────────────────────────────────
    boxesPerCarton: {
      type: Number,
      required: [true, 'Boxes per carton is required'],
      min: 1,
      default: 12,
    },
    // Backward compatibility alias
    boxesPerCotton: {
      type: Number,
      default: 12,
    },
    // cartonPrice = boxesPerCarton × piecesPerBox × piecePrice  (calculated, not stored)

    // ─── STOCK (stored in PIECES as base unit) ───────────────────────────────
    stockPieces: {
      type: Number,
      default: 0,
      min: 0,
    },
    // minStock is in PIECES
    minStockPieces: {
      type: Number,
      default: 10,
      min: 0,
    },

    // ─── GST (single field, replaces CGST/SGST/IGST) ─────────────────────────
    gstPercent: {
      type: Number,
      default: 5,
      min: 0,
    },
    hsnCode: {
      type: String,
      default: '18069010',
      trim: true,
    },

    // ─── EXPIRY & BATCH ───────────────────────────────────────────────────────
    expiryDate: {
      type: Date,
      default: null,
    },
    batchNumber: {
      type: String,
      default: '',
      trim: true,
    },
    manufacturingDate: {
      type: Date,
      default: null,
    },

    // ─── PRODUCT IMAGE ────────────────────────────────────────────────────────
    imageUrl: {
      type: String,
      default: '',
    },

    // ─── SUPPLIER ─────────────────────────────────────────────────────────────
    supplierName: {
      type: String,
      default: '',
      trim: true,
    },

    // ─── DISCOUNT ─────────────────────────────────────────────────────────────
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

// Virtual: box price (auto-calculated)
productSchema.virtual('boxPrice').get(function () {
  return Number((this.piecesPerBox * this.piecePrice).toFixed(2));
});

// Virtual: carton price (auto-calculated)
productSchema.virtual('cartonPrice').get(function () {
  const bpc = this.boxesPerCarton || this.boxesPerCotton || 12;
  return Number((bpc * this.piecesPerBox * this.piecePrice).toFixed(2));
});
productSchema.virtual('cottonPrice').get(function () {
  return this.cartonPrice;
});

// Virtual: stock in boxes (derived from stockPieces)
productSchema.virtual('stockBoxes').get(function () {
  return Math.floor(this.stockPieces / (this.piecesPerBox || 1));
});

// Virtual: stock in cartons (derived from stockPieces)
productSchema.virtual('stockCartons').get(function () {
  const bpc = this.boxesPerCarton || this.boxesPerCotton || 12;
  return Math.floor(this.stockPieces / ((this.piecesPerBox || 1) * bpc));
});
productSchema.virtual('stockCottons').get(function () {
  return this.stockCartons;
});

productSchema.set('toJSON', { virtuals: true });
productSchema.set('toObject', { virtuals: true });

// Index for search
productSchema.index({ name: 'text', category: 'text', packType: 'text' });

const Product = mongoose.model('Product', productSchema);
export default Product;
