import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  FileDown,
  Edit2,
  AlertCircle,
  Copy,
  CheckCircle2,
  Share2,
  Clock,
  Sparkles,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { invoicesAPI } from '../../api/apiClient';
import PrintableInvoice from '../../components/invoice/PrintableInvoice';

const INVOICE_NATURAL_WIDTH = 760;
const InvoiceScaler = ({ children }) => {
  const wrapperRef = useRef(null);
  const innerRef = useRef(null);

  const recalc = useCallback(() => {
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    if (!wrapper || !inner) return;

    inner.style.transform = 'none';
    inner.style.width = `${INVOICE_NATURAL_WIDTH}px`;

    const containerWidth = wrapper.parentElement?.clientWidth || wrapper.clientWidth || INVOICE_NATURAL_WIDTH;
    const naturalHeight = inner.scrollHeight;
    const scale = Math.min(1, containerWidth / INVOICE_NATURAL_WIDTH);

    const scaledWidth = INVOICE_NATURAL_WIDTH * scale;
    const offsetX = Math.max(0, (containerWidth - scaledWidth) / 2);

    inner.style.transformOrigin = 'top left';
    inner.style.transform = `translateX(${offsetX}px) scale(${scale})`;
    wrapper.style.height = `${naturalHeight * scale}px`;
  }, []);

  useEffect(() => {
    const t = setTimeout(recalc, 50);
    const ro = new ResizeObserver(recalc);
    if (wrapperRef.current?.parentElement) ro.observe(wrapperRef.current.parentElement);
    window.addEventListener('resize', recalc);
    return () => { clearTimeout(t); ro.disconnect(); window.removeEventListener('resize', recalc); };
  }, [recalc, children]);

  return (
    <div ref={wrapperRef} className="relative overflow-hidden w-full">
      <div ref={innerRef}>
        {children}
      </div>
    </div>
  );
};

export const InvoiceDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fitToScreen, setFitToScreen] = useState(true);

  useEffect(() => {
    fetchInvoice();
  }, [id]);

  const fetchInvoice = async () => {
    setLoading(true);
    try {
      const res = await invoicesAPI.getById(id);
      if (res.success && res.data) {
        setInvoice(res.data);
      }
    } catch (err) {
      toast.error('Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await invoicesAPI.updateStatus(id, newStatus);
      toast.success(`Invoice marked as ${newStatus}`);
      fetchInvoice();
    } catch (err) {
      toast.error(err.message || 'Failed to update invoice status');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const copyInvoiceNumber = () => {
    if (invoice?.invoiceNumber) {
      navigator.clipboard.writeText(invoice.invoiceNumber);
      toast.success(`Copied ${invoice.invoiceNumber} to clipboard`);
    }
  };

  const shareOnWhatsApp = () => {
    if (!invoice) return;
    const text = encodeURIComponent(
      `*Sri Chenna Kesava Traders - Tax Invoice*\n` +
      `Invoice No: ${invoice.invoiceNumber}\n` +
      `Customer: ${invoice.customerSnapshot?.businessName || invoice.customerSnapshot?.name}\n` +
      `Total: Rs. ${Number(invoice.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}\n` +
      `Status: ${invoice.status}\n` +
      `View Bill: ${window.location.href}`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const formatINR = (val) => {
    return Number(val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Rendering invoice document...</p>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="water-glass rounded-2xl p-12 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-rose-500" />
        <h2 className="mt-4 text-lg font-bold text-slate-900">Invoice Not Found</h2>
        <p className="mt-2 text-sm text-slate-500">
          The requested invoice record does not exist or has been removed.
        </p>
        <Link
          to="/invoices"
          className="mt-6 inline-block rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-sky-500"
        >
          Back to Invoices
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-6 pb-6 lg:pb-8 items-start">
      {/* Left Sidebar: Controls & Information */}
      <div className="lg:col-span-4 xl:col-span-3 space-y-3 sm:space-y-4 lg:sticky lg:top-6">
        <div className="no-print water-glass rounded-xl sm:rounded-2xl p-2.5 sm:p-4 lg:p-5 shadow-sm border border-sky-100 space-y-2.5 sm:space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/invoices"
              className="rounded-xl border border-sky-100 bg-white p-2 text-slate-600 hover:bg-sky-50 hover:text-sky-600 shadow-xs transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="font-mono text-[13px] sm:text-base font-black text-slate-900 leading-none">
                  {invoice.invoiceNumber}
                </span>
                <button
                  onClick={copyInvoiceNumber}
                  title="Copy Invoice Number"
                  className="text-slate-400 hover:text-sky-600 transition-colors p-1 -ml-1 sm:ml-0"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[10px] sm:text-xs font-semibold text-slate-600 truncate max-w-[140px] xs:max-w-[180px] sm:max-w-md mt-0.5 sm:mt-0 leading-tight">
                {invoice.customerSnapshot?.businessName || invoice.customerSnapshot?.name}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <select
              value={invoice.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`rounded-lg sm:rounded-xl px-1.5 sm:px-2.5 py-1 sm:py-1.5 text-[10px] sm:text-xs font-bold border focus:outline-none cursor-pointer shadow-xs ${
                invoice.status === 'Paid'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : invoice.status === 'Sent'
                  ? 'bg-sky-100 text-sky-800 border-sky-300'
                  : invoice.status === 'Draft'
                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-rose-100 text-rose-800 border-rose-300'
              }`}
            >
              <option value="Draft">Draft</option>
              <option value="Sent">Sent</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Big Amount Card (Google Pay / PhonePe style) */}
        <div className="rounded-xl sm:rounded-2xl bg-gradient-to-br from-sky-50 via-white to-teal-50/60 p-2.5 sm:p-4 border border-sky-100/90 flex flex-row items-center justify-between gap-2 shadow-inner">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-500 text-white shadow-md shadow-teal-500/25 shrink-0">
              <CheckCircle2 className="h-5 w-5 sm:h-7 sm:w-7 stroke-[2.3]" />
            </div>
            <div>
              <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block leading-tight">
                Grand Total
              </span>
              <h2 className="text-[17px] sm:text-2xl lg:text-xl xl:text-2xl font-black font-mono text-slate-900 tracking-tight leading-none mt-0.5">
                Rs. {formatINR(invoice.grandTotal)}
              </h2>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 text-[9px] sm:text-[11px] text-slate-600 font-medium">
            <span className="bg-white px-1.5 sm:px-2 py-0.5 rounded-md border border-sky-100 shadow-2xs whitespace-nowrap">
              {invoice.totalQty} Boxes
            </span>
            <span className="bg-white px-1.5 sm:px-2 py-0.5 rounded-md border border-sky-100 shadow-2xs font-mono whitespace-nowrap">
              {invoice.invoiceDate}
            </span>
          </div>
        </div>

        {/* Quick Actions Bar (Print, Download PDF, WhatsApp, Edit) */}
        <div className="grid grid-cols-4 lg:grid-cols-2 gap-1.5 sm:gap-2 pt-0.5 sm:pt-2">
          <button
            onClick={handlePrint}
            className="flex flex-col lg:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 py-1.5 sm:py-2 px-1 text-[9px] sm:text-[11px] font-bold text-white shadow-md shadow-sky-500/20 active:scale-98 transition-all"
          >
            <Printer className="h-4 w-4 sm:h-3.5 sm:w-3.5 stroke-[2.3]" />
            <span>Print</span>
          </button>

          <a
            href={invoicesAPI.getPDFUrl(invoice._id)}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col lg:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl border border-sky-200 bg-white py-1.5 sm:py-2 px-1 text-[9px] sm:text-[11px] font-bold text-sky-700 hover:bg-sky-50 shadow-xs active:scale-98 transition-all text-center"
          >
            <FileDown className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
            <span>PDF</span>
          </a>

          <button
            onClick={shareOnWhatsApp}
            className="flex flex-col lg:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl border border-emerald-200 bg-emerald-50/60 py-1.5 sm:py-2 px-1 text-[9px] sm:text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 shadow-xs active:scale-98 transition-all"
          >
            <Share2 className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-emerald-600" />
            <span>WhatsApp</span>
          </button>

          {invoice.status !== 'Paid' ? (
            <Link
              to={`/invoices/${invoice._id}/edit`}
              className="flex flex-col lg:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl border border-slate-200 bg-white py-1.5 sm:py-2 px-1 text-[9px] sm:text-[11px] font-bold text-slate-700 hover:bg-slate-50 shadow-xs active:scale-98 transition-all text-center"
            >
              <Edit2 className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-slate-500" />
              <span>Edit</span>
            </Link>
          ) : (
            <div className="flex flex-col lg:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl bg-emerald-50 border border-emerald-200 py-1.5 sm:py-2 px-1 text-[9px] sm:text-[11px] font-bold text-emerald-800 text-center">
              <CheckCircle2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              <span>Settled</span>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Right Column: Invoice Document Preview Card */}
      <div className="lg:col-span-8 xl:col-span-9 water-glass rounded-2xl p-3 sm:p-4 shadow-md w-full overflow-hidden">
        {/* Scale / Fit Toggle for Mobile */}
        <div className="no-print flex items-center justify-between pb-3 mb-2 border-b border-sky-100 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800">Tax Invoice Sheet</span>
            <span className="text-[10px] text-slate-500 hidden sm:inline">
              (A4 Standard Official Invoice Format)
            </span>
          </div>

          <button
            onClick={() => setFitToScreen(!fitToScreen)}
            className="flex items-center gap-1.5 text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200 shadow-2xs hover:bg-sky-100"
          >
            {fitToScreen ? (
              <>
                <Maximize2 className="h-3.5 w-3.5" />
                <span className="text-[11px]">100% Size</span>
              </>
            ) : (
              <>
                <Minimize2 className="h-3.5 w-3.5" />
                <span className="text-[11px]">Fit View</span>
              </>
            )}
          </button>
        </div>

        {/* Viewport scaling container */}
        <div className="overflow-x-auto py-2">
          {fitToScreen ? (
            <InvoiceScaler>
              <PrintableInvoice invoice={invoice} />
            </InvoiceScaler>
          ) : (
            <div className="w-max mx-auto">
              <PrintableInvoice invoice={invoice} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;
