import Product from '../models/Product.js';
import numberToWordsIndian from './amountInWords.js';

/**
 * Recalculate invoice items with Cotton / Box / Piece unit support + single GST
 *
 * Each rawItem:
 *   {
 *     product: <productId>,
 *     qty: <number>,           — count of sellUnit
 *     sellUnit: 'Cotton'|'Box'|'Piece',
 *     discountPercent?: number
 *   }
 *
 * Stock is always reduced in PIECES regardless of sellUnit.
 * Past invoices are immutable — this always reads fresh product data for new invoices.
 */
export async function recalculateInvoice(
  rawItems,
  _isInterState = false,
  invoiceDiscountPercent = 0,
  invoiceDiscountType = 'percentage',
  invoiceDiscountAmount = 0
) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('At least one item is required to generate an invoice');
  }

  const calculatedItems = [];
  let totalQty = 0;
  let subTotal = 0;
  let totalGst = 0;
  let totalDiscountAmount = 0;

  for (const item of rawItems) {
    const qty = parseInt(item.qty, 10);
    if (!qty || qty <= 0) {
      throw new Error(`Invalid quantity for item ${item.product || item.itemName}`);
    }

    // Always fetch authoritative product from DB (price snapshot for this invoice)
    const dbProduct = await Product.findById(item.product);
    if (!dbProduct) {
      throw new Error(`Product with ID ${item.product} not found`);
    }

    const piecePrice    = (item.piecePrice !== undefined && item.piecePrice !== '' && !isNaN(Number(item.piecePrice)))
      ? Number(item.piecePrice)
      : Number(dbProduct.piecePrice);
    const piecesPerBox  = Number(dbProduct.piecesPerBox || 1);
    const boxesPerCarton = Number(dbProduct.boxesPerCarton || dbProduct.boxesPerCotton || 1);

    // Calculate unit price and total pieces based on sellUnit
    let sellUnit = item.sellUnit || 'Box';
    if (sellUnit === 'Cotton') sellUnit = 'Carton';

    let unitPrice = piecePrice;
    let totalPiecesSold = qty;

    if (sellUnit === 'Box') {
      unitPrice = Number((piecePrice * piecesPerBox).toFixed(2));
      totalPiecesSold = qty * piecesPerBox;
    } else if (sellUnit === 'Carton') {
      unitPrice = Number((piecePrice * piecesPerBox * boxesPerCarton).toFixed(2));
      totalPiecesSold = qty * piecesPerBox * boxesPerCarton;
    }
    // sellUnit === 'Piece' → unitPrice = piecePrice, totalPiecesSold = qty

    const grossAmount = Number((qty * unitPrice).toFixed(2));

    // Per-item discount
    const itemDiscountPercent = Number(item.discountPercent || 0);
    const itemDiscountAmount  = Number(((grossAmount * itemDiscountPercent) / 100).toFixed(2));
    const taxableAmount       = Number((grossAmount - itemDiscountAmount).toFixed(2));

    // Single GST
    const gstPercent = Number(dbProduct.gstPercent ?? 5);
    const gstAmount  = Number(((taxableAmount * gstPercent) / 100).toFixed(2));
    const totalTaxAmount = gstAmount;

    const lineAmount = Number((taxableAmount + totalTaxAmount).toFixed(2));

    calculatedItems.push({
      product:         dbProduct._id,
      itemName:        dbProduct.name,
      packType:        dbProduct.packType,
      sellUnit,
      qty,
      piecesPerBox,
      boxesPerCarton,
      boxesPerCotton:  boxesPerCarton,
      totalPiecesSold,
      piecePrice,
      unitPrice,
      discountPercent:  itemDiscountPercent,
      discountAmount:   itemDiscountAmount,
      taxableAmount,
      gstPercent,
      gstAmount,
      totalTaxAmount,
      amount: lineAmount,
    });

    totalQty           += qty;
    subTotal           += taxableAmount;
    totalGst           += gstAmount;
    totalDiscountAmount += itemDiscountAmount;
  }

  subTotal = Number(subTotal.toFixed(2));
  totalGst = Number(totalGst.toFixed(2));
  const totalTax = totalGst;

  // Invoice-level discount (applied after sub + tax)
  const totalBeforeDiscount = Number((subTotal + totalGst).toFixed(2));
  let invoiceDiscountAmt = 0;
  let invoiceDiscount = Number(invoiceDiscountPercent || 0);

  if (invoiceDiscountType === 'flat') {
    invoiceDiscountAmt = Math.min(totalBeforeDiscount, Math.max(0, Number(invoiceDiscountAmount || 0)));
    invoiceDiscountAmt = Number(invoiceDiscountAmt.toFixed(2));
    invoiceDiscount = totalBeforeDiscount > 0
      ? Number(((invoiceDiscountAmt / totalBeforeDiscount) * 100).toFixed(2))
      : 0;
  } else {
    invoiceDiscount = Math.min(100, Math.max(0, invoiceDiscount));
    invoiceDiscountAmt = Number(((totalBeforeDiscount * invoiceDiscount) / 100).toFixed(2));
  }

  const grandTotal = Math.max(0, Number((totalBeforeDiscount - invoiceDiscountAmt).toFixed(2)));
  const amountInWords = numberToWordsIndian(grandTotal);

  return {
    items: calculatedItems,
    totalQty,
    subTotal,
    totalGst,
    totalTax,
    discountType: invoiceDiscountType || 'percentage',
    discountPercent: invoiceDiscount,
    discountAmount: Number((totalDiscountAmount + invoiceDiscountAmt).toFixed(2)),
    grandTotal,
    amountInWords,
  };
}

export default recalculateInvoice;
