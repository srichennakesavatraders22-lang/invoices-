import React, { useState, useEffect } from 'react';
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
    <div className="space-y-5 pb-8">
      {/* PhonePe / Google Pay Style Top Receipt Banner */}
      <div className="no-print water-glass rounded-3xl p-5 sm:p-6 shadow-md border border-white/90 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              to="/invoices"
              className="rounded-xl border border-sky-100 bg-white p-2 text-slate-600 hover:bg-sky-50 hover:text-sky-600 shadow-xs transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm sm:text-base font-black text-slate-900">
                  {invoice.invoiceNumber}
                </span>
                <button
                  onClick={copyInvoiceNumber}
                  title="Copy Invoice Number"
                  className="text-slate-400 hover:text-sky-600 transition-colors p-1"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-xs font-semibold text-slate-600 truncate max-w-[220px] sm:max-w-md">
                {invoice.customerSnapshot?.businessName || invoice.customerSnapshot?.name}
              </p>
            </div>
          </div>

          <div className="text-right">
            <select
              value={invoice.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold border focus:outline-none cursor-pointer shadow-xs ${
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
        <div className="rounded-2xl bg-gradient-to-br from-sky-50 via-white to-teal-50/60 p-4 border border-sky-100/90 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-inner">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-400 to-teal-500 text-white shadow-md shadow-teal-500/25">
              <CheckCircle2 className="h-7 w-7 stroke-[2.3]" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Grand Total Amount
              </span>
              <h2 className="text-2xl sm:text-3xl font-black font-mono text-slate-900 tracking-tight">
                Rs. {formatINR(invoice.grandTotal)}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <span className="bg-white px-2.5 py-1 rounded-lg border border-sky-100 shadow-2xs">
              {invoice.totalQty} Boxes
            </span>
            <span className="bg-white px-2.5 py-1 rounded-lg border border-sky-100 shadow-2xs font-mono">
              {invoice.invoiceDate}
            </span>
          </div>
        </div>

        {/* Quick Actions Bar (Print, Download PDF, WhatsApp, Edit) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 py-2.5 px-3 text-xs font-bold text-white shadow-md shadow-sky-500/20 active:scale-98 transition-all"
          >
            <Printer className="h-4 w-4 stroke-[2.3]" />
            <span>Print Invoice</span>
          </button>

          <a
            href={invoicesAPI.getPDFUrl(invoice._id)}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-white py-2.5 px-3 text-xs font-bold text-sky-700 hover:bg-sky-50 shadow-xs active:scale-98 transition-all text-center"
          >
            <FileDown className="h-4 w-4" />
            <span>PDF File</span>
          </a>

          <button
            onClick={shareOnWhatsApp}
            className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/60 py-2.5 px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-100 shadow-xs active:scale-98 transition-all"
          >
            <Share2 className="h-4 w-4 text-emerald-600" />
            <span>WhatsApp</span>
          </button>

          {invoice.status !== 'Paid' ? (
            <Link
              to={`/invoices/${invoice._id}/edit`}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2.5 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs active:scale-98 transition-all text-center"
            >
              <Edit2 className="h-4 w-4 text-slate-500" />
              <span>Edit Bill</span>
            </Link>
          ) : (
            <div className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 py-2 px-3 text-xs font-bold text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              <span>Settled</span>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Document Preview Card */}
      <div className="water-glass rounded-2xl p-3 sm:p-4 shadow-md">
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
          <div
            className={`transition-all duration-200 ${
              fitToScreen
                ? 'origin-top-left sm:origin-top transform scale-[0.62] xs:scale-[0.72] sm:scale-[0.88] lg:scale-100 my-[-20px] sm:my-0'
                : 'w-max mx-auto'
            }`}
          >
            <PrintableInvoice invoice={invoice} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceDetail;
