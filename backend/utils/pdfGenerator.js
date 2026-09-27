import PDFDocument from 'pdfkit';
import https from 'https';
import http from 'http';

function fetchImage(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode !== 200) return resolve(null);
      const data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', () => resolve(null));
  });
}

/**
 * Generates a print-ready PDF stream matching the Sri Chenna Kesava Traders invoice reference
 * @param {Object} invoice - Full invoice document with snapshot details
 * @param {Stream.Writable} res - HTTP response stream or file write stream
 */
export async function generateInvoicePDF(invoice, res) {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 30,
    bufferPages: true,
  });

  doc.pipe(res);

  const left = 30;
  const right = 565; // A4 width is ~595.28, margin 30 => right is 565.28
  const contentWidth = right - left; // 535
  const top = 30;

  // Outer Border around entire invoice
  const pageHeight = 770;
  doc.rect(left, top, contentWidth, pageHeight).lineWidth(1).stroke('#222222');

  let currentY = top + 15;

  // 1. Company Header
  const company = invoice.companySnapshot || {};
  
  let logoBuffer = null;
  if (company.logoUrl) {
    logoBuffer = await fetchImage(company.logoUrl);
  }

  // Draw Logo if exists
  if (logoBuffer) {
    try {
      doc.image(logoBuffer, left + 40, currentY - 5, { fit: [70, 70], align: 'center', valign: 'center' });
    } catch (e) {
      // fail silently if image format is unsupported
      logoBuffer = null;
    }
  }

  const textStartX = logoBuffer ? left + 130 : left;
  const textWidth = logoBuffer ? contentWidth - 140 : contentWidth;
  const textAlign = logoBuffer ? 'left' : 'center';

  doc.font('Helvetica-Bold').fontSize(16).fillColor('#000000').text(
    company.businessName || 'SRI CHENNA KESAVA TRADERS',
    textStartX,
    currentY,
    { align: textAlign, width: textWidth }
  );

  currentY += 18;
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1f2937').text(
    company.tagline || 'Wholesale & Distribution – Confectionery / Chocolates & Snacks',
    textStartX,
    currentY,
    { align: textAlign, width: textWidth }
  );

  currentY += 12;
  doc.font('Helvetica').fontSize(8).fillColor('#374151').text(
    company.address || 'Beside Apsara Theatre, Chinna Chauku, Andhra Pradesh – 516002',
    textStartX,
    currentY,
    { align: textAlign, width: textWidth }
  );

  currentY += 12;
  const contactText = `Mobile: ${company.mobile || '+91 63613 97790'} | Email: ${company.email || 'srichennakesavatraders22@gmail.com'}${company.gstin ? ` | GSTIN: ${company.gstin}` : ''}`;
  doc.text(contactText, textStartX, currentY, { align: textAlign, width: textWidth });

  currentY = Math.max(currentY + 18, top + 85);
  // Divider above TAX INVOICE
  doc.moveTo(left, currentY).lineTo(right, currentY).lineWidth(0.8).stroke('#222222');

  // 2. TAX INVOICE Banner
  doc.rect(left, currentY, contentWidth, 22).fill('#f9fafb');
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#111827').text('TAX INVOICE', left, currentY + 5, {
    align: 'center',
    width: contentWidth,
  });

  currentY += 22;
  doc.moveTo(left, currentY).lineTo(right, currentY).lineWidth(0.8).stroke('#222222');

  // 3. Three-column block: Bill To, Ship To, Invoice Details
  const col1Width = 190;
  const col2Width = 190;
  const col3Width = contentWidth - col1Width - col2Width; // 155
  const colHeight = 78;

  const col1X = left;
  const col2X = col1X + col1Width;
  const col3X = col2X + col2Width;

  // Background
  doc.rect(left, currentY, contentWidth, colHeight).fill('#ffffff');

  // Vertical lines
  doc.moveTo(col2X, currentY).lineTo(col2X, currentY + colHeight).lineWidth(0.8).stroke('#222222');
  doc.moveTo(col3X, currentY).lineTo(col3X, currentY + colHeight).lineWidth(0.8).stroke('#222222');

  const customer = invoice.customerSnapshot || {};

  // Bill To Content
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#111827').text('Bill To:', col1X + 8, currentY + 6);
  doc.font('Helvetica-Bold').fontSize(8).text(customer.businessName || customer.name || '', col1X + 8, currentY + 18, { width: col1Width - 16 });
  doc.font('Helvetica').fontSize(7.5).fillColor('#374151');
  doc.text(customer.billingAddress || '', col1X + 8, currentY + 28, { width: col1Width - 16, height: 26 });
  if (customer.gstin) {
    doc.font('Helvetica-Bold').fontSize(7.5).text(`GSTIN: ${customer.gstin}`, col1X + 8, currentY + 54);
  }
  doc.font('Helvetica').fontSize(7.5).text(`Mobile: ${customer.mobile || ''}`, col1X + 8, currentY + 64);

  // Ship To Content
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#111827').text('Ship To:', col2X + 8, currentY + 6);
  doc.font('Helvetica-Bold').fontSize(8).text(customer.businessName || customer.name || '', col2X + 8, currentY + 18, { width: col2Width - 16 });
  doc.font('Helvetica').fontSize(7.5).fillColor('#374151');
  doc.text(customer.shippingAddress || customer.billingAddress || '', col2X + 8, currentY + 28, { width: col2Width - 16, height: 26 });
  if (customer.gstin) {
    doc.font('Helvetica-Bold').fontSize(7.5).text(`GSTIN: ${customer.gstin}`, col2X + 8, currentY + 54);
  }
  doc.font('Helvetica').fontSize(7.5).text(`Mobile: ${customer.mobile || ''}`, col2X + 8, currentY + 64);

  // Invoice Details Content
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#111827');
  doc.text('Invoice No.:', col3X + 8, currentY + 8);
  doc.font('Helvetica').fontSize(8).text(invoice.invoiceNumber, col3X + 8, currentY + 20);

  doc.font('Helvetica-Bold').fontSize(8).text('Invoice Date: ', col3X + 8, currentY + 36);
  doc.font('Helvetica').text(invoice.invoiceDate, col3X + 68, currentY + 36);

  doc.font('Helvetica-Bold').fontSize(8).text('Invoice Time: ', col3X + 8, currentY + 50);
  doc.font('Helvetica').text(invoice.invoiceTime, col3X + 68, currentY + 50);

  currentY += colHeight;
  doc.moveTo(left, currentY).lineTo(right, currentY).lineWidth(0.8).stroke('#222222');

  // 4. Line Items Table
  // Columns: S.No (30), Item Name (180), Qty (Boxes) (55), MRP (Rs.) (65), CGST (Rs.) (65), IGST (Rs.) (65), Amount (Rs.) (75)
  const totalCgst = invoice.totalCgst || 0;
  const totalSgst = invoice.totalSgst || 0;
  const totalIgst = invoice.totalIgst || 0;
  let showCgst = totalCgst > 0;
  let showSgst = totalSgst > 0;
  let showIgst = totalIgst > 0;

  if (!showCgst && !showSgst && !showIgst) {
    if (invoice.customerSnapshot?.isInterState) showIgst = true;
    else { showCgst = true; showSgst = true; }
  }

  const cols = [
    { id: 'sno', title: 'S.No', width: 32, align: 'center' },
    { id: 'name', title: 'Item Name (SKU)', width: 178, align: 'left' },
    { id: 'qty', title: 'Qty\n(Boxes)', width: 45, align: 'center' },
    { id: 'mrp', title: 'MRP\n(Rs.)', width: 55, align: 'right' },
  ];
  if (showCgst) cols.push({ id: 'cgst', title: 'CGST\n(Rs.)', width: 55, align: 'right' });
  if (showSgst) cols.push({ id: 'sgst', title: 'SGST\n(Rs.)', width: 55, align: 'right' });
  if (showIgst) cols.push({ id: 'igst', title: 'IGST\n(Rs.)', width: 55, align: 'right' });
  cols.push({ id: 'amount', title: 'Amount\n(Rs.)', width: 75, align: 'right' });

  const totalColsWidth = cols.reduce((sum, col) => sum + col.width, 0);
  const diff = 550 - totalColsWidth;
  if (diff > 0) {
    cols.find(c => c.id === 'name').width += diff;
  }

  const tableHeaderHeight = 24;
  doc.rect(left, currentY, contentWidth, tableHeaderHeight).fill('#f9fafb');

  // Draw Header Labels
  let curX = left;
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#111827');
  cols.forEach((col) => {
    doc.text(col.title, curX + 2, currentY + 4, {
      width: col.width - 4,
      align: col.align,
    });
    curX += col.width;
  });

  // Vertical lines in header
  curX = left;
  cols.forEach((col, idx) => {
    if (idx > 0) {
      doc.moveTo(curX, currentY).lineTo(curX, currentY + tableHeaderHeight).lineWidth(0.5).stroke('#222222');
    }
    curX += col.width;
  });

  currentY += tableHeaderHeight;
  doc.moveTo(left, currentY).lineTo(right, currentY).lineWidth(0.8).stroke('#222222');

  // Table Body Rows
  const items = invoice.items || [];
  const rowHeight = 16;
  const startBodyY = currentY;

  items.forEach((item, index) => {
    const isEven = index % 2 === 1;
    if (isEven) {
      doc.rect(left, currentY, contentWidth, rowHeight).fill('#fafafa');
    }

    doc.font('Helvetica').fontSize(7.5).fillColor('#1f2937');
    let x = left;

    cols.forEach(col => {
      let val = '';
      if (col.id === 'sno') val = `${index + 1}`;
      else if (col.id === 'name') val = item.itemName || '';
      else if (col.id === 'qty') val = `${item.qty}`;
      else if (col.id === 'mrp') val = Number(item.mrp).toFixed(2);
      else if (col.id === 'cgst') val = item.cgstAmount && item.cgstAmount > 0 ? Number(item.cgstAmount).toFixed(2) : '-';
      else if (col.id === 'sgst') val = item.sgstAmount && item.sgstAmount > 0 ? Number(item.sgstAmount).toFixed(2) : '-';
      else if (col.id === 'igst') val = item.igstAmount && item.igstAmount > 0 ? Number(item.igstAmount).toFixed(2) : '-';
      else if (col.id === 'amount') val = Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      
      const isLeft = col.align === 'left';
      doc.text(val, x + (isLeft ? 6 : 0), currentY + 4, { 
         width: col.width - (isLeft ? 8 : (col.id === 'sno' ? 0 : 6)), 
         align: col.align 
      });
      x += col.width;
    });

    currentY += rowHeight;
    doc.moveTo(left, currentY).lineTo(right, currentY).lineWidth(0.4).stroke('#e5e7eb');
  });

  // Vertical lines across all body rows
  curX = left;
  cols.forEach((col, idx) => {
    if (idx > 0) {
      doc.moveTo(curX, startBodyY).lineTo(curX, currentY).lineWidth(0.5).stroke('#222222');
    }
    curX += col.width;
  });

  doc.moveTo(left, currentY).lineTo(right, currentY).lineWidth(0.8).stroke('#222222');

  // 5. Sub Total Row
  const subTotalHeight = 18;
  doc.rect(left, currentY, contentWidth, subTotalHeight).fill('#f9fafb');

  doc.font('Helvetica-Bold').fontSize(8).fillColor('#111827');
  
  let subLabelWidth = 0;
  for (let i = 0; i < cols.length; i++) {
    if (['cgst', 'sgst', 'igst', 'amount'].includes(cols[i].id)) break;
    subLabelWidth += cols[i].width;
  }
  
  doc.text('Sub Total', left + 8, currentY + 5, { width: subLabelWidth - 16, align: 'right' });

  let subX = left + subLabelWidth;
  doc.moveTo(subX, currentY).lineTo(subX, currentY + subTotalHeight).lineWidth(0.5).stroke('#222222');

  for (let i = 0; i < cols.length; i++) {
    const col = cols[i];
    if (!['cgst', 'sgst', 'igst', 'amount'].includes(col.id)) continue;

    let val = '';
    if (col.id === 'cgst') val = Number(invoice.totalCgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    else if (col.id === 'sgst') val = Number(invoice.totalSgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    else if (col.id === 'igst') val = Number(invoice.totalIgst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    else if (col.id === 'amount') val = Number(invoice.subTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

    doc.text(val, subX, currentY + 5, { width: col.width - 6, align: 'right' });
    subX += col.width;
    
    // Don't draw the final vertical line on the right edge, the outer border handles it
    if (col.id !== 'amount') {
      doc.moveTo(subX, currentY).lineTo(subX, currentY + subTotalHeight).lineWidth(0.5).stroke('#222222');
    }
  }

  currentY += subTotalHeight;
  doc.moveTo(left, currentY).lineTo(right, currentY).lineWidth(0.8).stroke('#222222');

  // 6. Grand Total Row
  const grandTotalHeight = 20;
  doc.rect(left, currentY, contentWidth, grandTotalHeight).fill('#ffffff');
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#111827');
  doc.text('Grand Total', left, currentY + 5, { width: contentWidth - 110, align: 'right' });
  doc.text(
    `Rs. ${Number(invoice.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
    right - 105,
    currentY + 5,
    { width: 100, align: 'right' }
  );

  currentY += grandTotalHeight;
  doc.moveTo(left, currentY).lineTo(right, currentY).lineWidth(0.8).stroke('#222222');

  // 7. Amount in Words Row
  const wordsHeight = 20;
  doc.rect(left, currentY, contentWidth, wordsHeight).fill('#fafafa');
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#111827').text('Amount in Words: ', left + 8, currentY + 5, { continued: true });
  doc.font('Helvetica').fontSize(8).fillColor('#1f2937').text(invoice.amountInWords || '');

  currentY += wordsHeight;
  doc.moveTo(left, currentY).lineTo(right, currentY).lineWidth(0.8).stroke('#222222');

  // 8. Terms & Conditions Block
  const terms = (company.termsAndConditions && company.termsAndConditions.length > 0)
    ? company.termsAndConditions
    : [
        '1. Goods once sold will not be taken back or exchanged.',
        '2. Interest @ 24% p.a. will be charged if payment is not made within the due date.',
        '3. All disputes are subject to Kadapa jurisdiction only.',
        '4. Please check the goods at the time of delivery.',
        '5. This is a computer generated invoice.',
      ];

  const termsBoxHeight = 85;
  const termsColWidth = (contentWidth * 7) / 12;
  const bankColWidth = (contentWidth * 5) / 12;
  const bankColX = left + termsColWidth;

  doc.rect(left, currentY, termsColWidth, termsBoxHeight).fill('#ffffff');
  doc.rect(bankColX, currentY, bankColWidth, termsBoxHeight).fill('#f9fafb');
  
  // Vertical line
  doc.moveTo(bankColX, currentY).lineTo(bankColX, currentY + termsBoxHeight).lineWidth(0.8).stroke('#222222');

  // TERMS
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#111827').text('Terms & Conditions:', left + 8, currentY + 5);
  doc.font('Helvetica').fontSize(6.5).fillColor('#374151');
  let termY = currentY + 14;
  terms.forEach((t, i) => {
    const formattedTerm = t.match(/^\d+\./) ? t : `${i + 1}. ${t}`;
    doc.text(formattedTerm, left + 8, termY, { width: termsColWidth - 16 });
    termY += 8;
  });

  // BANK DETAILS
  let bankY = currentY + 5;
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#111827').text('BANK DETAILS:', bankColX + 8, bankY);
  
  if (company.bankDetails?.accountNumber || company.bankDetails?.bankName) {
    bankY += 10;
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#111827').text('Bank: ', bankColX + 8, bankY, { continued: true });
    doc.font('Helvetica').fillColor('#374151').text(company.bankDetails.bankName || '');
    
    bankY += 8;
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#111827').text('A/C Name: ', bankColX + 8, bankY, { continued: true });
    doc.font('Helvetica').fillColor('#374151').text(company.bankDetails.accountName || '');
    
    bankY += 8;
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#111827').text('A/C No: ', bankColX + 8, bankY, { continued: true });
    doc.font('Helvetica').fillColor('#374151').text(company.bankDetails.accountNumber || '');
    
    bankY += 8;
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#111827').text('IFSC Code: ', bankColX + 8, bankY, { continued: true });
    doc.font('Helvetica').fillColor('#374151').text(company.bankDetails.ifsc || '');
    
    bankY += 8;
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#111827').text('Branch: ', bankColX + 8, bankY, { continued: true });
    doc.font('Helvetica').fillColor('#374151').text(company.bankDetails.branch || '');
  } else {
    bankY += 10;
    doc.font('Helvetica-Oblique').fontSize(6).fillColor('#6b7280').text('Add bank details in Settings to display account number & IFSC on invoice.', bankColX + 8, bankY, { width: bankColWidth - 16 });
  }

  // PAYMENT INFO
  if (invoice.paymentMethod) {
    bankY += 14;
    doc.moveTo(bankColX + 6, bankY - 4).lineTo(right - 6, bankY - 4).lineWidth(0.5).stroke('#d1d5db');
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor('#111827').text('PAYMENT INFO:', bankColX + 8, bankY);
    bankY += 10;
    const methodText = invoice.paymentMethod === 'Mixed' ? 'Split / Mixed Payment' : invoice.paymentMethod;
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#111827').text('Method: ', bankColX + 8, bankY, { continued: true });
    doc.font('Helvetica').fillColor('#374151').text(methodText);

    if (invoice.paymentMethod === 'Mixed' && invoice.paymentBreakdown && invoice.paymentBreakdown.length > 0) {
      bankY += 8;
      invoice.paymentBreakdown.forEach((p) => {
        if (!p.amount) return;
        const refStr = p.reference ? ` (Ref: ${p.reference})` : '';
        doc.font('Helvetica').fontSize(6.5).fillColor('#374151').text(`- ${p.method}: Rs. ${Number(p.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}${refStr}`, bankColX + 12, bankY);
        bankY += 8;
      });
    }
  }

  currentY += termsBoxHeight;
  doc.moveTo(left, currentY).lineTo(right, currentY).lineWidth(0.8).stroke('#222222');

  // 9. Signatures Block
  const signHeight = 70;
  doc.rect(left, currentY, contentWidth, signHeight).fill('#ffffff');

  // Left signature
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#111827').text('Goods Supplied By:', left + 10, currentY + 8);
  doc.font('Helvetica').fontSize(8).text(company.businessName || 'Sri Chenna Kesava Traders', left + 10, currentY + 18);
  doc.fontSize(7.5).text('Received the above goods in good condition.', left + 10, currentY + 34);
  doc.moveTo(left + 10, currentY + 55).lineTo(left + 160, currentY + 55).lineWidth(0.5).stroke('#6b7280');
  doc.fontSize(7.5).fillColor('#4b5563').text("Receiver's Signature", left + 10, currentY + 58);

  // Right signature
  const rightSignX = right - 220;
  doc.font('Helvetica-Bold').fontSize(8).fillColor('#111827').text(`For ${company.businessName || 'SRI CHENNA KESAVA TRADERS'}`, rightSignX, currentY + 8, { width: 210, align: 'right' });
  doc.moveTo(right - 180, currentY + 55).lineTo(right - 10, currentY + 55).lineWidth(0.5).stroke('#6b7280');
  doc.fontSize(7.5).fillColor('#4b5563').text('Authorised Signatory & Stamp', rightSignX, currentY + 58, { width: 210, align: 'right' });

  // 10. Computer generated invoice note at very bottom outside or inside border
  doc.font('Helvetica-Oblique').fontSize(7.5).fillColor('#6b7280').text(
    'This is a computer generated invoice and does not require a physical signature to be valid.',
    left,
    pageHeight + 35,
    { align: 'center', width: contentWidth }
  );

  doc.end();
}

export default generateInvoicePDF;
