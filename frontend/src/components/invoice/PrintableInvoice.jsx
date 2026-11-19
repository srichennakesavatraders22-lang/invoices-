import React from 'react';
import { convertTo12HourFormat } from '../../utils/timeUtils';
import { getPackUnitInfo } from '../../utils/packUnitUtils';

/**
 * Pixel-perfect, compact component matching the Sri Chenna Kesava Traders Tax Invoice Reference
 */
export const PrintableInvoice = ({ invoice, isPrintMode = false }) => {
  if (!invoice) return null;

  const company = invoice.companySnapshot || {};
  const customer = invoice.customerSnapshot || {};
  const items = invoice.items || [];

  const formatINR = (val) => {
    if (val === undefined || val === null) return '0.00';
    return Number(val).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const terms = (company.termsAndConditions && company.termsAndConditions.length > 0)
    ? company.termsAndConditions
    : [
        '1. Goods once sold will not be taken back or exchanged.',
        '2. Interest @ 24% p.a. will be charged if payment is not made within the due date.',
        '3. All disputes are subject to Kadapa jurisdiction only.',
        '4. Please check the goods at the time of delivery.',
        '5. This is a computer generated invoice.',
      ];

  const totalGst = invoice.totalGst || invoice.totalTax || 0;
  const colSpanCount = 7;

  // Compute breakdown of Cartons, Sheets, Boxes, and Pieces dynamically
  const totalCartons = items
    .filter((r) => r.sellUnit === 'Carton' || r.sellUnit === 'Cotton' || r.unit === 'Carton' || r.unit === 'Cotton')
    .reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
  
  const otherUnitCounts = {};
  items.forEach((r) => {
    const u = r.sellUnit || r.unit || 'Box';
    if (u === 'Carton' || u === 'Cotton' || u === 'Piece') return;
    const unitInfo = getPackUnitInfo(r.packType, r.itemName);
    const unitName = unitInfo.plural;
    otherUnitCounts[unitName] = (otherUnitCounts[unitName] || 0) + (Number(r.qty) || 0);
  });

  const totalPieces = items
    .filter((r) => r.sellUnit === 'Piece' || r.unit === 'Piece')
    .reduce((sum, r) => sum + (Number(r.qty) || 0), 0);

  const otherUnitTexts = Object.entries(otherUnitCounts)
    .filter(([_, count]) => count > 0)
    .map(([name, count]) => `${count} ${name}`);

  const totalQtyText = [
    totalCartons > 0 ? `${totalCartons} Carton${totalCartons > 1 ? 's' : ''}` : null,
    ...otherUnitTexts,
    totalPieces > 0 ? `${totalPieces} Pcs` : null,
  ].filter(Boolean).join(' | ') || `${invoice.totalQty || 0} Units`;

  return (
    <div
      className={`invoice-paper bg-white text-black font-sans shadow-md mx-auto transition-all ${
        isPrintMode ? 'w-full' : 'max-w-[760px]'
      }`}
      style={{
        fontFamily: "'Inter', Arial, sans-serif",
      }}
    >
      {/* Outer Border Container */}
      <div className="border-[1.5px] border-black p-2 sm:p-3 text-[11px] leading-tight">
        {/* 1. Header Section - Big logo positioned beside the company details with a clean gap */}
        <div className="pb-1.5 sm:pb-2 flex items-center justify-center gap-3 sm:gap-6">
          {company.logoUrl ? (
            <div className="flex-shrink-0 flex items-center justify-center">
              <img
                src={company.logoUrl}
                alt="Company Logo"
                className="h-16 sm:h-20 w-auto max-w-[85px] sm:max-w-[110px] object-contain"
              />
            </div>
          ) : !isPrintMode ? (
            <div className="flex-shrink-0 flex items-center justify-center h-16 w-16 sm:h-20 sm:w-20 rounded-xl bg-slate-100 border-2 border-dashed border-slate-300">
              <span className="text-[10px] font-bold text-slate-400 text-center px-1">LOGO<br/>HERE</span>
            </div>
          ) : null}
          <div className={company.logoUrl ? "text-left min-w-0" : "text-center min-w-0"}>
            <h1 className="text-sm sm:text-base font-extrabold tracking-wide text-black uppercase leading-tight">
              {company.businessName || 'SRI CHENNA KESAVA TRADERS'}
            </h1>
            <p className="text-[10px] font-semibold text-neutral-800 mt-0.5">
              {company.tagline || 'Wholesale & Distribution – Confectionery / Chocolates & Snacks'}
            </p>
            <p className="text-[9.5px] text-neutral-700 mt-0.5 leading-tight">
              {company.address || 'Beside Apsara Theatre, Chinna Chauku, Andhra Pradesh – 516002'}
            </p>
            <p className="text-[9.5px] text-neutral-800 font-medium mt-0.5">
              Mobile: {company.mobile || '+91 63613 97790'} &nbsp;|&nbsp; Email: {company.email || 'srichennakesavatraders22@gmail.com'}
              {company.gstin && (
                <span className="font-bold text-black ml-1.5 font-mono">| GSTIN: {company.gstin}</span>
              )}
            </p>
          </div>
        </div>

        {/* 2. TAX INVOICE Banner - Compact */}
        <div className="border-t-[1.5px] border-b-[1.5px] border-black py-0.5 text-center bg-neutral-100">
          <h2 className="text-xs sm:text-[11.5px] font-bold tracking-wider uppercase text-black">
            TAX INVOICE
          </h2>
        </div>

        {/* 3. Three-Column Info Block */}
        <div className="grid grid-cols-1 sm:grid-cols-12 border-b-[1.5px] border-black divide-y sm:divide-y-0 sm:divide-x-[1.5px] divide-black text-[10px]">
          {/* Bill To */}
          <div className="sm:col-span-5 p-1.5 sm:p-2 flex flex-col justify-between">
            <div>
              <p className="font-bold text-black text-[10.5px] mb-0.5">Bill To:</p>
              <p className="font-bold text-black">{customer.businessName || customer.name}</p>
              <p className="text-neutral-700 mt-0.5 whitespace-pre-line leading-relaxed">
                {customer.billingAddress}
              </p>
            </div>
            <div className="mt-1.5 pt-1 border-t border-dashed border-neutral-300">
              {customer.gstin && (
                <p className="font-semibold text-black">GSTIN: {customer.gstin}</p>
              )}
              <p className="text-neutral-800">Mobile: {customer.mobile}</p>
            </div>
          </div>

          {/* Ship To */}
          <div className="sm:col-span-4 p-1.5 sm:p-2 flex flex-col justify-between">
            <div>
              <p className="font-bold text-black text-[10.5px] mb-0.5">Ship To:</p>
              <p className="font-bold text-black">{customer.businessName || customer.name}</p>
              <p className="text-neutral-700 mt-0.5 whitespace-pre-line leading-relaxed">
                {customer.shippingAddress || customer.billingAddress}
              </p>
            </div>
            <div className="mt-1.5 pt-1 border-t border-dashed border-neutral-300">
              {customer.gstin && (
                <p className="font-semibold text-black">GSTIN: {customer.gstin}</p>
              )}
              <p className="text-neutral-800">Mobile: {customer.mobile}</p>
            </div>
          </div>

          {/* Invoice Metadata */}
          <div className="sm:col-span-3 p-1.5 sm:p-2 flex flex-col justify-center space-y-1 bg-neutral-50/50">
            <div>
              <span className="font-bold text-black block">Invoice No.:</span>
              <span className="font-bold text-black font-mono text-[10.5px]">
                {invoice.invoiceNumber}
              </span>
            </div>
            <div>
              <span className="font-bold text-black">Invoice Date: </span>
              <span className="font-medium text-black">{invoice.invoiceDate}</span>
            </div>
            <div>
              <span className="font-bold text-black">Invoice Time: </span>
              <span className="font-medium text-black">{convertTo12HourFormat(invoice.invoiceTime)}</span>
            </div>
          </div>
        </div>

        {/* 4. Line Items Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-center text-[9.5px]">
            <thead>
              <tr className="border-b-[1.5px] border-black bg-neutral-100 font-bold text-black">
                <th className="border-r-[1px] border-black py-1 px-1 w-6">S.No</th>
                <th className="border-r-[1px] border-black py-1 px-1.5 text-left">Item Name (SKU)</th>
                <th className="border-r-[1px] border-black py-1 px-1 w-14">HSN</th>
                <th className="border-r-[1px] border-black py-1 px-1 w-16">Qty & Unit</th>
                <th className="border-r-[1px] border-black py-1 px-1 text-right w-14">Rate/Unit<br />(Rs.)</th>
                <th className="border-r-[1px] border-black py-1 px-1 text-right w-14">Taxable<br />(Rs.)</th>
                <th className="border-r-[1px] border-black py-1 px-1 text-center w-12">GST<br />(%)</th>
                <th className="py-1 px-1.5 text-right w-20">Amount<br />(Rs.)</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const unitLabel = item.sellUnit || item.unit || 'Box';
                const unitInfo = getPackUnitInfo(item.packType, item.itemName);
                const formattedUnit = (unitLabel === 'Carton' || unitLabel === 'Cotton') 
                  ? 'Carton' 
                  : unitLabel === 'Piece' 
                  ? 'Pcs' 
                  : unitInfo.plural;
                const rate = item.unitPrice ?? item.mrp ?? 0;
                const taxable = item.taxableAmount !== undefined ? item.taxableAmount : (item.amount - (item.gstAmount || 0));
                const gstRate = item.gstPercent !== undefined ? item.gstPercent : 5;

                return (
                  <tr
                    key={item._id ? `${item._id}-${index}` : index}
                    className="border-b border-black/80 hover:bg-neutral-50/50"
                  >
                    <td className="border-r-[1px] border-black py-0.5 px-1">{index + 1}</td>
                    <td className="border-r-[1px] border-black py-0.5 px-1.5 text-left font-medium">
                      {item.itemName} {item.packType ? `(${item.packType})` : ''}
                    </td>
                    <td className="border-r-[1px] border-black py-0.5 px-1 text-center font-mono text-[9px] text-neutral-800">
                      {item.hsnCode || item.hsn || '-'}
                    </td>
                    <td className="border-r-[1px] border-black py-0.5 px-1 font-semibold whitespace-nowrap">
                      {item.qty} {formattedUnit}
                    </td>
                    <td className="border-r-[1px] border-black py-0.5 px-1 text-right font-mono whitespace-nowrap">
                      {formatINR(rate)}
                    </td>
                    <td className="border-r-[1px] border-black py-0.5 px-1 text-right font-mono whitespace-nowrap">
                      {formatINR(taxable)}
                    </td>
                    <td className="border-r-[1px] border-black py-0.5 px-1 text-center font-mono font-medium whitespace-nowrap">
                      {gstRate}%
                    </td>
                    <td className="py-0.5 px-1.5 text-right font-mono font-medium whitespace-nowrap">
                      {formatINR(item.amount)}
                    </td>
                  </tr>
                );
              })}

              {/* Total Qty / Boxes / Cartons Summary Row */}
              <tr className="border-b-[1px] border-black bg-neutral-100 font-bold text-[9.5px]">
                <td colSpan={3} className="border-r-[1px] border-black py-1 px-2 text-center">
                  <span className="font-extrabold text-black uppercase">Total Qty: </span>
                  <span className="font-black text-black">{totalQtyText}</span>
                </td>
                <td colSpan={4} className="border-r-[1px] border-black py-1 px-2 text-right">
                  Sub Total (Original Price):
                </td>
                <td className="py-1 px-1.5 text-right font-mono whitespace-nowrap">
                  Rs. {formatINR(invoice.subTotal)}
                </td>
              </tr>

              {/* Total GST in Rupees */}
              <tr className="border-b-[1px] border-black bg-neutral-100 font-bold text-[9.5px]">
                <td colSpan={7} className="border-r-[1px] border-black py-1 px-2 text-right">
                  Total GST (All Items):
                </td>
                <td className="py-1 px-1.5 text-right font-mono text-slate-800 whitespace-nowrap">
                  Rs. {formatINR(totalGst)}
                </td>
              </tr>

              {/* Discount Row (Percentage or Flat) */}
              {(Number(invoice.discountAmount || 0) > 0 || Number(invoice.discountPercent || 0) > 0) && (
                <tr className="border-b-[1px] border-black bg-neutral-100 font-bold text-[9.5px]">
                  <td colSpan={7} className="border-r-[1px] border-black py-1 px-2 text-right text-emerald-800">
                    Discount {invoice.discountType === 'flat' ? '(Flat)' : `(${invoice.discountPercent || 0}%)`}:
                  </td>
                  <td className="py-1 px-1.5 text-right font-mono text-emerald-800 font-bold whitespace-nowrap">
                    - Rs. {formatINR(invoice.discountAmount || (Number(invoice.subTotal + totalGst) * (Number(invoice.discountPercent || 0) / 100)))}
                  </td>
                </tr>
              )}

              {/* Grand Total Row */}
              <tr className="border-b-[1.5px] border-black font-bold text-[10.5px] bg-neutral-50">
                <td colSpan={7} className="border-r-[1px] border-black py-1 px-2 text-right uppercase tracking-wider">
                  Grand Total (Incl. GST):
                </td>
                <td className="py-1 px-1.5 text-right font-mono text-black font-black whitespace-nowrap">
                  Rs. {formatINR(invoice.grandTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 5. Amount in Words Row */}
        <div className="border-b-[1.5px] border-black py-1 px-2 text-[10px] bg-neutral-50">
          <span className="font-bold text-black">Amount in Words: </span>
          <span className="font-semibold text-neutral-900 capitalize">
            {invoice.amountInWords}
          </span>
        </div>

        {/* 6. Terms & Conditions and Bank Details Box */}
        <div className="border-b-[1.5px] border-black grid grid-cols-1 sm:grid-cols-12 divide-y sm:divide-y-0 sm:divide-x-[1.5px] divide-black text-[9px] leading-snug">
          {/* Terms & Conditions */}
          <div className="sm:col-span-7 p-1.5 sm:p-2">
            <p className="font-bold text-black mb-0.5">Terms & Conditions:</p>
            <ol className="list-none space-y-0.5 text-neutral-700">
              {terms.map((term, i) => {
                const cleanTerm = typeof term === 'string' ? term.replace(/^\d+[\.\)]\s*/, '').trim() : '';
                return (
                  <li key={i}>
                    {`${i + 1}. ${cleanTerm}`}
                  </li>
                );
              })}
            </ol>
          </div>

          {/* Bank & Remittance Details */}
          <div className="sm:col-span-5 p-1.5 sm:p-2 bg-neutral-50/50 flex flex-col justify-start">
            <p className="font-bold text-black uppercase tracking-wider text-[9px] mb-1">
              Bank Details:
            </p>
            {company.bankDetails?.accountNumber || company.bankDetails?.bankName ? (
              <div className="space-y-0.5 text-neutral-800">
                {company.bankDetails.bankName && (
                  <p><span className="font-bold text-black">Bank:</span> {company.bankDetails.bankName}</p>
                )}
                {company.bankDetails.accountName && (
                  <p><span className="font-bold text-black">A/C Name:</span> {company.bankDetails.accountName}</p>
                )}
                {company.bankDetails.accountNumber && (
                  <p><span className="font-bold text-black">A/C No:</span> <span className="font-mono font-bold text-black">{company.bankDetails.accountNumber}</span></p>
                )}
                {company.bankDetails.ifsc && (
                  <p><span className="font-bold text-black">IFSC Code:</span> <span className="font-mono font-bold text-black">{company.bankDetails.ifsc}</span></p>
                )}
                {company.bankDetails.branch && (
                  <p><span className="font-bold text-black">Branch:</span> {company.bankDetails.branch}</p>
                )}
              </div>
            ) : (
              <p className="text-neutral-500 italic text-[8.5px]">
                Add bank details in Settings to display account number & IFSC on invoice.
              </p>
            )}

            {/* Payment Details Section */}
            {invoice.paymentMethod && (
              <div className="mt-2 pt-1.5 border-t border-black/20">
                <p className="font-bold text-black uppercase tracking-wider text-[9px] mb-0.5">
                  Payment Info:
                </p>
                <div className="space-y-0.5">
                  <p className="text-neutral-800">
                    <span className="font-bold text-black">Method:</span> {invoice.paymentMethod === 'Mixed' ? 'Split / Mixed Payment' : invoice.paymentMethod}
                  </p>
                  {invoice.paymentMethod === 'Mixed' && invoice.paymentBreakdown?.length > 0 && (
                    <div className="mt-1 pl-1">
                      {invoice.paymentBreakdown.map((p, i) => {
                        if (!p.amount) return null;
                        return (
                          <p key={i} className="text-[8.5px] text-neutral-800 leading-tight">
                            • {p.method}: <span className="font-mono font-bold text-black">Rs. {formatINR(p.amount)}</span> {p.reference ? <span className="italic text-neutral-600">(Ref: {p.reference})</span> : ''}
                          </p>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 7. Signatures Block */}
        <div className="grid grid-cols-2 pt-2 pb-1 text-[10px]">
          {/* Left Column: Receiver */}
          <div className="flex flex-col justify-between pr-3 h-18">
            <div>
              <p className="font-bold text-black">Goods Supplied By:</p>
              <p className="text-black">{company.businessName || 'Sri Chenna Kesava Traders'}</p>
              <p className="text-[9px] text-neutral-600">
                Received the above goods in good condition.
              </p>
            </div>
            <div className="pt-2 border-t border-black w-40">
              <p className="text-[9.5px] font-semibold text-black">
                Receiver's Signature
              </p>
            </div>
          </div>

          {/* Right Column: Supplier / Authorised Signatory */}
          <div className="flex flex-col justify-between items-end pl-3 h-18 text-right">
            <div>
              <p className="font-bold text-black uppercase">
                For {company.businessName || 'SRI CHENNA KESAVA TRADERS'}
              </p>
            </div>

            {company.stampUrl && (
              <div className="my-0.5">
                <img
                  src={company.stampUrl}
                  alt="Company Stamp"
                  className="h-8 object-contain opacity-90"
                />
              </div>
            )}

            <div className="pt-2 border-t border-black w-44 text-right">
              <p className="text-[9.5px] font-semibold text-black">
                Authorised Signatory & Stamp
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 8. Bottom Note */}
      <div className="text-center py-1 text-[9px] italic text-neutral-600">
        This is a computer generated invoice and does not require a physical signature to be valid.
      </div>
    </div>
  );
};

export default PrintableInvoice;
