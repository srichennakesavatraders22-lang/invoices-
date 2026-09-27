import Product from '../models/Product.js';
import numberToWordsIndian from './amountInWords.js';

/**
 * Recalculate invoice items and totals strictly from database product data
 * Supports per-item discount and invoice-level discount
 * @param {Array} rawItems - array of { product: productId, qty: number, discountPercent?: number }
 * @param {Boolean} isInterState - true if inter-state (IGST), false if intra-state (CGST / SGST)
 * @param {Number} invoiceDiscountPercent - invoice-level discount %
 */
export async function recalculateInvoice(rawItems, isInterState = false, invoiceDiscountPercent = 0) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('At least one item is required to generate an invoice');
  }

  const calculatedItems = [];
  let totalQty = 0;
  let subTotal = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalDiscountAmount = 0;

  for (const item of rawItems) {
    const qty = parseInt(item.qty, 10);
    if (!qty || qty <= 0) {
      throw new Error(`Invalid quantity for item ${item.product || item.itemName}`);
    }

    // Fetch authoritative product from DB
    const dbProduct = await Product.findById(item.product);
    if (!dbProduct) {
      throw new Error(`Product with ID ${item.product} not found`);
    }

    const mrp = Number(dbProduct.mrp);
    const grossAmount = Number((qty * mrp).toFixed(2));

    // Per-item discount
    const itemDiscountPercent = Number(item.discountPercent || 0);
    const itemDiscountAmount = Number(((grossAmount * itemDiscountPercent) / 100).toFixed(2));
    const taxableAmount = Number((grossAmount - itemDiscountAmount).toFixed(2));

    let cp = parseFloat(dbProduct.cgstPercent) || 0;
    let sp = parseFloat(dbProduct.sgstPercent) || 0;
    let ip = parseFloat(dbProduct.igstPercent) || 0;

    if (cp === 0 && sp === 0 && ip === 0) {
      cp = 2.5; sp = 2.5; ip = 5.0;
    }

    let useIgst = isInterState;
    if (ip === 0 && (cp > 0 || sp > 0)) useIgst = false;
    else if (cp === 0 && sp === 0 && ip > 0) useIgst = true;

    let cgstPercent = 0;
    let sgstPercent = 0;
    let igstPercent = 0;

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (useIgst) {
      igstPercent = ip;
      igstAmount = Number(((taxableAmount * igstPercent) / 100).toFixed(2));
    } else {
      cgstPercent = cp;
      sgstPercent = sp;
      cgstAmount = Number(((taxableAmount * cgstPercent) / 100).toFixed(2));
      sgstAmount = Number(((taxableAmount * sgstPercent) / 100).toFixed(2));
    }

    const totalTaxAmount = Number((cgstAmount + sgstAmount + igstAmount).toFixed(2));
    const lineAmount = Number((taxableAmount + totalTaxAmount).toFixed(2));

    calculatedItems.push({
      product: dbProduct._id,
      itemName: dbProduct.name,
      packType: dbProduct.packType,
      unit: dbProduct.unit || 'Boxes',
      qty,
      mrp,
      discountPercent: itemDiscountPercent,
      discountAmount: itemDiscountAmount,
      taxableAmount,
      cgstPercent,
      sgstPercent,
      igstPercent,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalTaxAmount,
      amount: lineAmount,
    });

    totalQty += qty;
    subTotal += taxableAmount;
    totalCgst += cgstAmount;
    totalSgst += sgstAmount;
    totalIgst += igstAmount;
    totalDiscountAmount += itemDiscountAmount;
  }

  subTotal = Number(subTotal.toFixed(2));
  totalCgst = Number(totalCgst.toFixed(2));
  totalSgst = Number(totalSgst.toFixed(2));
  totalIgst = Number(totalIgst.toFixed(2));
  const totalTax = Number((totalCgst + totalSgst + totalIgst).toFixed(2));

  // Invoice-level discount applied after items subtotal + tax
  const invoiceDiscount = Number(invoiceDiscountPercent || 0);
  const invoiceDiscountAmt = Number(((subTotal + totalTax) * invoiceDiscount / 100).toFixed(2));

  const grandTotal = Number((subTotal + totalTax - invoiceDiscountAmt).toFixed(2));
  const amountInWords = numberToWordsIndian(grandTotal);

  return {
    items: calculatedItems,
    totalQty,
    subTotal,
    totalCgst,
    totalSgst,
    totalIgst,
    totalTax,
    discountPercent: invoiceDiscount,
    discountAmount: Number((totalDiscountAmount + invoiceDiscountAmt).toFixed(2)),
    grandTotal,
    amountInWords,
  };
}

export default recalculateInvoice;
