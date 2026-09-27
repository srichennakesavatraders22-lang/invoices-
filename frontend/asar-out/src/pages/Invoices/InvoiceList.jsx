import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Eye,
  Trash2,
  FileDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { invoicesAPI } from '../../api/apiClient';

export const InvoiceList = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter, page]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const res = await invoicesAPI.getAll({
        search: search || undefined,
        status: statusFilter || undefined,
        page,
        limit: 15,
      });
      if (res.success && res.data) {
        setInvoices(res.data);
        if (res.pagination) {
          setTotalPages(res.pagination.pages || 1);
        }
      }
    } catch (err) {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchInvoices();
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await invoicesAPI.updateStatus(id, newStatus);
      toast.success(`Invoice status updated to ${newStatus}`);
      fetchInvoices();
    } catch (err) {
      toast.error(err.message || 'Error updating status');
    }
  };

  const confirmDelete = async () => {
    if (!selectedInvoice) return;
    setDeleting(true);
    try {
      await invoicesAPI.delete(selectedInvoice._id);
      toast.success('Invoice deleted successfully');
      setIsDeleteModalOpen(false);
      fetchInvoices();
    } catch (err) {
      toast.error(err.message || 'Error deleting invoice');
    } finally {
      setDeleting(false);
    }
  };

  const formatINR = (val) => {
    return Number(val || 0).toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <FileText className="h-6 w-6 text-sky-500" />
            Tax Invoices & Billing Records
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Browse, export print-ready PDFs, and manage wholesale settlement statuses
          </p>
        </div>

        <Link
          to="/invoices/new"
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-sky-500/20 transition-all hover:brightness-105 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>New Tax Invoice</span>
        </Link>
      </div>

      {/* Filter & Search Bar + PhonePe Style Filter Pills */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3 water-glass rounded-2xl p-3 sm:p-4">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-sky-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search invoice number or customer store name..."
              className="w-full rounded-xl border border-sky-200/90 bg-white/95 py-2 pl-10 pr-4 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 shadow-sm"
            />
          </form>

          <div className="hidden md:flex items-center gap-3 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="w-full md:w-48 rounded-xl border border-sky-200/90 bg-white/95 py-2 px-3 text-xs font-semibold text-slate-700 focus:border-sky-500 focus:outline-none shadow-sm"
            >
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Sent">Sent (Pending Payment)</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* PhonePe / Google Pay Style Horizontal Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none px-1">
          {[
            { label: 'All Bills', value: '' },
            { label: 'Paid', value: 'Paid' },
            { label: 'Sent (Pending)', value: 'Sent' },
            { label: 'Drafts', value: 'Draft' },
            { label: 'Overdue', value: 'Overdue' },
          ].map((pill) => (
            <button
              key={pill.value}
              type="button"
              onClick={() => {
                setStatusFilter(pill.value);
                setPage(1);
              }}
              className={`flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-2xs ${
                statusFilter === pill.value
                  ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                  : 'bg-white/90 text-slate-600 hover:bg-sky-50 border border-sky-100'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoice Records: Mobile Card Feed + Desktop Table */}
      <div className="water-glass rounded-2xl overflow-hidden shadow-lg">
        {/* MOBILE VIEW: PhonePe / Google Pay Passbook Card Feed */}
        <div className="block md:hidden divide-y divide-sky-100/70 p-2">
          {loading ? (
            <div className="py-12 text-center text-slate-500">
              <div className="flex justify-center items-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                <span className="text-xs">Loading invoices...</span>
              </div>
            </div>
          ) : invoices.length > 0 ? (
            invoices.map((inv) => {
              const customerName =
                inv.customerSnapshot?.businessName ||
                inv.customerSnapshot?.name ||
                'Customer';
              const initial = customerName.charAt(0).toUpperCase();

              return (
                <div
                  key={inv._id}
                  className="p-3 bg-white/60 rounded-xl my-2 border border-sky-100/60 shadow-xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-400 to-teal-500 font-black text-white text-sm shadow-xs">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-900 truncate">
                          {customerName}
                        </p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          <Link
                            to={`/invoices/${inv._id}`}
                            className="text-sky-600 font-bold hover:underline"
                          >
                            {inv.invoiceNumber}
                          </Link>{' '}
                          • {inv.invoiceDate}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="font-mono text-sm font-black text-slate-900">
                        Rs. {formatINR(inv.grandTotal)}
                      </p>
                      <p className="text-[9.5px] text-slate-400">
                        Tax: Rs. {formatINR(inv.totalTax)}
                      </p>
                    </div>
                  </div>

                  {/* Badges & Actions row */}
                  <div className="flex items-center justify-between pt-1 border-t border-sky-50 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {inv.totalQty} Boxes
                      </span>
                      <select
                        value={inv.status}
                        onChange={(e) => handleStatusChange(inv._id, e.target.value)}
                        className={`rounded-lg py-0.5 px-2 text-[10px] font-bold border focus:outline-none cursor-pointer shadow-xs ${
                          inv.status === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : inv.status === 'Sent'
                            ? 'bg-sky-100 text-sky-800 border-sky-300'
                            : inv.status === 'Draft'
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

                    <div className="flex items-center gap-1.5">
                      <Link
                        to={`/invoices/${inv._id}`}
                        className="rounded-lg bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700 hover:bg-sky-100 transition-colors"
                      >
                        View / Print
                      </Link>
                      <a
                        href={invoicesAPI.getPDFUrl(inv._id)}
                        target="_blank"
                        rel="noreferrer"
                        title="Download PDF"
                        className="rounded-lg p-1 text-slate-500 hover:bg-sky-50 hover:text-sky-600 transition-colors"
                      >
                        <FileDown className="h-4 w-4" />
                      </a>
                      {inv.status !== 'Paid' && (
                        <button
                          onClick={() => {
                            setSelectedInvoice(inv);
                            setIsDeleteModalOpen(true);
                          }}
                          title="Delete Invoice"
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              No invoices found matching your filters.
            </div>
          )}
        </div>

        {/* DESKTOP VIEW: Full Data Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sky-100 bg-sky-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3.5 pl-5">Invoice No.</th>
                <th className="py-3.5">Bill To / Store</th>
                <th className="py-3.5 text-center">Date & Time</th>
                <th className="py-3.5 text-center">Items (Boxes)</th>
                <th className="py-3.5 text-right">Tax (GST)</th>
                <th className="py-3.5 text-right">Grand Total</th>
                <th className="py-3.5 text-center">Status</th>
                <th className="py-3.5 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100/70">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <div className="flex justify-center items-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                      <span>Loading invoices...</span>
                    </div>
                  </td>
                </tr>
              ) : invoices.length > 0 ? (
                invoices.map((inv) => (
                  <tr
                    key={inv._id}
                    className="hover:bg-sky-50/30 transition-colors"
                  >
                    <td className="py-3.5 pl-5 font-mono text-xs font-black text-sky-600">
                      <Link to={`/invoices/${inv._id}`} className="hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-3.5">
                      <p className="font-bold text-slate-900 max-w-[200px] truncate">
                        {inv.customerSnapshot?.businessName || inv.customerSnapshot?.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate max-w-[200px]">
                        {inv.customerSnapshot?.billingAddress}
                      </p>
                    </td>
                    <td className="py-3.5 text-center text-xs font-mono text-slate-600">
                      <div className="font-semibold text-slate-800">{inv.invoiceDate}</div>
                      <div className="text-[11px] text-slate-400">{inv.invoiceTime}</div>
                    </td>
                    <td className="py-3.5 text-center font-mono text-xs text-slate-700">
                      <span className="font-bold">{inv.totalQty} Boxes</span>
                      <span className="block text-[11px] text-slate-400">
                        ({inv.items?.length || 0} SKUs)
                      </span>
                    </td>
                    <td className="py-3.5 text-right font-mono text-xs font-semibold text-slate-600">
                      Rs. {formatINR(inv.totalTax)}
                    </td>
                    <td className="py-3.5 text-right font-mono font-black text-slate-900 text-base">
                      Rs. {formatINR(inv.grandTotal)}
                    </td>
                    <td className="py-3.5 text-center">
                      <select
                        value={inv.status}
                        onChange={(e) => handleStatusChange(inv._id, e.target.value)}
                        className={`rounded-lg py-1 px-2.5 text-xs font-bold border focus:outline-none cursor-pointer shadow-sm ${
                          inv.status === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : inv.status === 'Sent'
                            ? 'bg-sky-100 text-sky-800 border-sky-300'
                            : inv.status === 'Draft'
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
                    </td>
                    <td className="py-3.5 pr-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link
                          to={`/invoices/${inv._id}`}
                          title="View & Print Invoice"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-sky-50 hover:text-sky-600 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <a
                          href={invoicesAPI.getPDFUrl(inv._id)}
                          target="_blank"
                          rel="noreferrer"
                          title="Download PDF"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-sky-50 hover:text-sky-600 transition-colors"
                        >
                          <FileDown className="h-4 w-4" />
                        </a>
                        {inv.status !== 'Paid' && (
                          <button
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setIsDeleteModalOpen(true);
                            }}
                            title="Delete Invoice"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-slate-500">
                    No invoices found. Click "New Tax Invoice" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-sky-100 bg-white/50 px-5 py-3 text-xs text-slate-500">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="rounded-lg bg-white border border-sky-200 px-3 py-1 font-semibold text-slate-700 shadow-sm disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="rounded-lg bg-white border border-sky-200 px-3 py-1 font-semibold text-slate-700 shadow-sm disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal (Responsive bottom sheet on mobile) */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/30 backdrop-blur-sm">
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl border border-sky-100 bg-white p-6 shadow-2xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">Delete Invoice?</h3>
            <p className="mt-2 text-xs text-slate-500">
              Are you sure you want to delete{' '}
              <span className="font-bold text-sky-600">
                {selectedInvoice?.invoiceNumber}
              </span>
              ? This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 sm:flex-none rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 sm:flex-none rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-500 shadow-md shadow-rose-500/20 disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceList;
