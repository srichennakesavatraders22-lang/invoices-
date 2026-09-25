import Product from '../models/Product.js';
import numberToWordsIndian from './amountInWords.js';

/**
 * Recalculate invoice items and totals strictly from database product data
 * @param {Array} rawItems - array of { product: productId, qty: number }
 * @param {Boolean} isInterState - true if inter-state (IGST), false if intra-state (CGST / SGST)
 */
export async function recalculateInvoice(rawItems, isInterState = false) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw new Error('At least one item is required to generate an invoice');
  }

  const calculatedItems = [];
  let totalQty = 0;
  let subTotal = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;

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
    const taxableAmount = Number((qty * mrp).toFixed(2));

    let cgstPercent = 0;
    let sgstPercent = 0;
    let igstPercent = 0;

    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (isInterState) {
      // Inter-state: IGST only
      igstPercent = dbProduct.igstPercent || 5.0;
      igstAmount = Number(((taxableAmount * igstPercent) / 100).toFixed(2));
    } else {
      // Intra-state: CGST (+ SGST if configured)
      cgstPercent = dbProduct.cgstPercent !== undefined ? dbProduct.cgstPercent : 2.5;
      sgstPercent = dbProduct.sgstPercent !== undefined ? dbProduct.sgstPercent : 0;
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
  }

  subTotal = Number(subTotal.toFixed(2));
  totalCgst = Number(totalCgst.toFixed(2));
  totalSgst = Number(totalSgst.toFixed(2));
  totalIgst = Number(totalIgst.toFixed(2));
  const totalTax = Number((totalCgst + totalSgst + totalIgst).toFixed(2));
  const grandTotal = Number((subTotal + totalTax).toFixed(2));
  const amountInWords = numberToWordsIndian(grandTotal);

  return {
    items: calculatedItems,
    totalQty,
    subTotal,
    totalCgst,
    totalSgst,
    totalIgst,
    totalTax,
    grandTotal,
    amountInWords,
  };
}

export default recalculateInvoice;
