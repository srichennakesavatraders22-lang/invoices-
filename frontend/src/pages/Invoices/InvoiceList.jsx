import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, Plus, Search, Eye, Trash2, FileDown, Download, Calendar, X, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import { invoicesAPI } from '../../api/apiClient';
import { convertTo12HourFormat } from '../../utils/timeUtils';

// Validation: start date must be <= end date
const validateDateRange = (start, end) => {
  if (start && end) {
    if (new Date(start) > new Date(end)) {
      return 'Start date cannot be after end date';
    }
  }
  if (end && new Date(end) > new Date()) {
    return 'End date cannot be in the future';
  }
  return null;
};

export const InvoiceList = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateError, setDateError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!dateError) fetchInvoices();
  }, [statusFilter, page, dateError]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const params = {
        search: search || undefined,
        status: statusFilter || undefined,
        page,
        limit: 15,
      };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await invoicesAPI.getAll(params);
      if (res.success && res.data) {
        setInvoices(res.data);
        setTotalPages(res.pagination?.pages || 1);
        setTotalCount(res.pagination?.total || 0);
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

  const handleStartDateChange = (val) => {
    setStartDate(val);
    const err = validateDateRange(val, endDate);
    setDateError(err || '');
    if (!err) { setPage(1); }
  };

  const handleEndDateChange = (val) => {
    setEndDate(val);
    const err = validateDateRange(startDate, val);
    setDateError(err || '');
    if (!err) { setPage(1); }
  };

  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
    setDateError('');
    setPage(1);
    setTimeout(() => fetchInvoices(), 100);
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await invoicesAPI.updateStatus(id, newStatus);
      toast.success(`Status updated to ${newStatus}`);
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

  const handleExportExcel = () => {
    const params = {};
    if (statusFilter) params.status = statusFilter;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    window.open(invoicesAPI.getExportUrl(params), '_blank');
    toast.success('Excel export started!');
  };

  const formatINR = (val) =>
    Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const statusBadge = (status) => {
    const map = {
      Paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      Sent: 'bg-sky-100 text-sky-800 border-sky-200',
      Draft: 'bg-slate-100 text-slate-700 border-slate-200',
      Overdue: 'bg-red-100 text-red-800 border-red-200',
      Cancelled: 'bg-rose-100 text-rose-800 border-rose-200',
    };
    return map[status] || 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-4">
      {/* Compact Header & Controls Wrapper */}
      <div className="water-glass rounded-2xl border border-sky-200 p-3 sm:p-4 mb-4 shadow-sm space-y-3">
        {/* Row 1: Title & Actions & Pagination */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 border-b border-sky-100/60 pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
                <FileText className="h-6 w-6 text-sky-500" />
                Tax Invoices & Billing
              </h1>
            </div>
            
            {/* Pagination Controls */}
            <div className="flex items-center gap-2 bg-sky-50/50 rounded-xl px-2 py-1 border border-sky-100 mt-1 xl:mt-0 xl:ml-4">
              <span className="flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[10px] font-bold text-sky-700 shadow-sm border border-sky-100">
                Total: {totalCount}
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mx-1">
                Page {page} of {Math.max(1, totalPages)}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="rounded-lg bg-white border border-sky-200 px-2 py-1 text-[10px] font-bold text-slate-600 shadow-sm hover:bg-sky-50 disabled:opacity-40 transition-colors"
                >
                  Prev
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="rounded-lg bg-white border border-sky-200 px-2 py-1 text-[10px] font-bold text-slate-600 shadow-sm hover:bg-sky-50 disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          <div className="hidden xl:flex items-center gap-2 mt-2 xl:mt-0">
            <button onClick={handleExportExcel} className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 shadow-xs transition-all">
              <Download className="h-3.5 w-3.5" /><span>Export</span>
            </button>
            <Link to="/invoices/new" className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-sky-500/20 transition-all hover:bg-sky-600 active:scale-[0.98]">
              <Plus className="h-4 w-4 stroke-[3]" /><span>New Invoice</span>
            </Link>
          </div>
        </div>

        {/* Row 2: Search, Filters */}
        <div className="flex flex-col xl:flex-row items-center gap-3">
          <div className="flex items-center gap-2 w-full xl:w-auto flex-1">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-sky-500" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search invoice or store..."
                className="w-full rounded-xl border border-sky-200/90 bg-white/95 py-2 pl-10 pr-4 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 shadow-sm"
              />
            </form>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="xl:hidden flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sky-700 hover:bg-sky-100 transition-colors"
            >
              <Filter className="h-4 w-4" />
            </button>
          </div>

          <div className="hidden xl:flex flex-row items-center gap-3">
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="w-full md:w-36 rounded-xl border border-sky-200/90 bg-white/95 py-2 px-3 text-xs font-bold text-slate-700 focus:border-sky-500 focus:outline-none shadow-sm">
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Sent">Sent</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <div className="flex items-center gap-1.5">
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sky-500" />
                <input type="date" value={startDate} max={today} onChange={(e) => handleStartDateChange(e.target.value)} className={`w-32 rounded-xl border py-1.5 pl-8 pr-1 text-[10px] font-bold text-slate-700 focus:outline-none shadow-sm ${dateError ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-sky-200/90 bg-white/95 focus:border-sky-500'}`} />
              </div>
              <span className="text-[10px] text-slate-400 font-bold">to</span>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sky-500" />
                <input type="date" value={endDate} max={today} min={startDate || undefined} onChange={(e) => handleEndDateChange(e.target.value)} className={`w-32 rounded-xl border py-1.5 pl-8 pr-1 text-[10px] font-bold text-slate-700 focus:outline-none shadow-sm ${dateError ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-sky-200/90 bg-white/95 focus:border-sky-500'}`} />
              </div>
              {(startDate || endDate) && (
                <button onClick={clearDateFilter} className="flex-shrink-0 rounded-xl border border-slate-200 bg-white p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"><X className="h-3 w-3" /></button>
              )}
            </div>
          </div>
        </div>


        {/* Mobile Filter & Actions Menu */}
        {isMobileMenuOpen && (
          <div className="xl:hidden mt-4 pt-4 border-t border-sky-100/60 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 gap-2">
               <button onClick={handleExportExcel} className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 shadow-xs">
                 <Download className="h-3.5 w-3.5" /><span>Export</span>
               </button>
               <Link to="/invoices/new" className="flex items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-xs font-bold text-white shadow-md shadow-sky-500/20 hover:bg-sky-600">
                 <Plus className="h-4 w-4 stroke-[3]" /><span>New Invoice</span>
               </Link>
            </div>
            <div className="flex flex-col gap-3">
               <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
                 {[
                   { label: 'All Bills', value: '' },
                   { label: '✅ Paid', value: 'Paid' },
                   { label: '📤 Sent', value: 'Sent' },
                   { label: '📝 Drafts', value: 'Draft' },
                   { label: '⚠️ Overdue', value: 'Overdue' },
                   { label: '❌ Cancelled', value: 'Cancelled' },
                 ].map((pill) => (
                   <button
                     key={pill.value}
                     type="button"
                     onClick={() => { setStatusFilter(pill.value); setPage(1); }}
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
               <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sky-500" />
                      <input type="date" value={startDate} max={today} onChange={(e) => handleStartDateChange(e.target.value)} className={`w-36 rounded-xl border py-2 pl-8 pr-2 text-[11px] font-bold text-slate-700 focus:outline-none shadow-sm ${dateError ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-sky-200/90 bg-white/95 focus:border-sky-500'}`} />
                    </div>
                    <span className="text-[10px] text-slate-400 font-bold">to</span>
                    <div className="relative">
                      <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sky-500" />
                      <input type="date" value={endDate} max={today} min={startDate || undefined} onChange={(e) => handleEndDateChange(e.target.value)} className={`w-36 rounded-xl border py-2 pl-8 pr-2 text-[11px] font-bold text-slate-700 focus:outline-none shadow-sm ${dateError ? 'border-red-400 bg-red-50 focus:border-red-500' : 'border-sky-200/90 bg-white/95 focus:border-sky-500'}`} />
                    </div>
                    {(startDate || endDate) && (
                      <button onClick={clearDateFilter} className="flex-shrink-0 rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"><X className="h-4 w-4" /></button>
                    )}
                  </div>
               </div>
               {dateError && <p className="text-[10px] font-semibold text-red-600 flex items-center gap-1"><span>⚠</span> {dateError}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Invoice Table */}
      <div className="water-glass rounded-2xl overflow-hidden shadow-lg">
        {/* Mobile Cards */}
        <div className="block md:hidden divide-y divide-sky-100/70 p-2">
          {loading ? (
            <div className="py-12 text-center">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent mx-auto" />
            </div>
          ) : invoices.length > 0 ? (
            invoices.map((inv) => {
              const customerName = inv.customerSnapshot?.businessName || inv.customerSnapshot?.name || 'Customer';
              return (
                <div key={inv._id} className="p-3 bg-white/60 rounded-xl my-2 border border-sky-100/60 shadow-xs space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-400 to-teal-500 font-black text-white text-sm">
                        {customerName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-900 truncate">{customerName}</p>
                        <p className="text-[10px] text-slate-500 font-mono">
                          <Link to={`/invoices/${inv._id}`} className="text-sky-600 font-bold hover:underline">
                            {inv.invoiceNumber}
                          </Link>{' '} • {inv.invoiceDate}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-mono text-sm font-black text-slate-900">Rs. {formatINR(inv.grandTotal)}</p>
                      {inv.paymentMethod && (
                        <span className="text-[9px] font-bold text-slate-400">{inv.paymentMethod}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-sky-50">
                    <select
                      value={inv.status}
                      onChange={(e) => handleStatusChange(inv._id, e.target.value)}
                      className={`rounded-lg py-0.5 px-2 text-[10px] font-bold border focus:outline-none cursor-pointer ${statusBadge(inv.status)}`}
                    >
                      <option value="Draft">Draft</option>
                      <option value="Sent">Sent</option>
                      <option value="Paid">Paid</option>
                      <option value="Overdue">Overdue</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                    <div className="flex items-center gap-1.5">
                      <Link to={`/invoices/${inv._id}`} className="rounded-lg bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700 hover:bg-sky-100">View</Link>
                      <a href={invoicesAPI.getPDFUrl(inv._id)} target="_blank" rel="noreferrer" title="PDF">
                        <FileDown className="h-4 w-4 text-slate-400 hover:text-sky-600" />
                      </a>
                      {inv.status !== 'Paid' && (
                        <button onClick={() => { setSelectedInvoice(inv); setIsDeleteModalOpen(true); }}>
                          <Trash2 className="h-4 w-4 text-slate-400 hover:text-rose-500" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">No invoices found matching your filters.</div>
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sky-100 bg-sky-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3.5 pl-5">Invoice No.</th>
                <th className="py-3.5">Bill To / Store</th>
                <th className="py-3.5 text-center">Date & Time</th>
                <th className="py-3.5 text-center">Boxes</th>
                <th className="py-3.5 text-center">Payment</th>
                <th className="py-3.5 text-right">Tax (GST)</th>
                <th className="py-3.5 text-right">Grand Total</th>
                <th className="py-3.5 text-center">Status</th>
                <th className="py-3.5 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100/70">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent mx-auto" />
                  </td>
                </tr>
              ) : invoices.length > 0 ? (
                invoices.map((inv) => (
                  <tr key={inv._id} className="hover:bg-sky-50/30 transition-colors">
                    <td className="py-3.5 pl-5 font-mono text-xs font-black text-sky-600">
                      <Link to={`/invoices/${inv._id}`} className="hover:underline">{inv.invoiceNumber}</Link>
                    </td>
                    <td className="py-3.5">
                      <p className="font-bold text-slate-900 max-w-[200px] truncate">
                        {inv.customerSnapshot?.businessName || inv.customerSnapshot?.name}
                      </p>
                      <p className="text-xs text-slate-500 truncate max-w-[200px]">{inv.customerSnapshot?.billingAddress}</p>
                    </td>
                    <td className="py-3.5 text-center text-xs font-mono text-slate-600">
                      <div className="font-semibold text-slate-800">{inv.invoiceDate}</div>
                      <div className="text-[11px] text-slate-400">{convertTo12HourFormat(inv.invoiceTime)}</div>
                    </td>
                    <td className="py-3.5 text-center font-mono text-xs">
                      <span className="font-bold">{inv.totalQty}</span>
                      <span className="text-[11px] text-slate-400 block">({inv.items?.length || 0} SKUs)</span>
                    </td>
                    <td className="py-3.5 text-center">
                      {inv.paymentMethod ? (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          {inv.paymentMethod}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="py-3.5 text-right font-mono text-xs text-slate-600">Rs. {formatINR(inv.totalTax)}</td>
                    <td className="py-3.5 text-right font-mono font-black text-slate-900 text-base">Rs. {formatINR(inv.grandTotal)}</td>
                    <td className="py-3.5 text-center">
                      <select
                        value={inv.status}
                        onChange={(e) => handleStatusChange(inv._id, e.target.value)}
                        className={`rounded-lg py-1 px-2.5 text-xs font-bold border focus:outline-none cursor-pointer shadow-sm ${statusBadge(inv.status)}`}
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
                        <Link to={`/invoices/${inv._id}`} title="View" className="rounded-lg p-1.5 text-slate-500 hover:bg-sky-50 hover:text-sky-600">
                          <Eye className="h-4 w-4" />
                        </Link>
                        <a href={invoicesAPI.getPDFUrl(inv._id)} target="_blank" rel="noreferrer" title="PDF" className="rounded-lg p-1.5 text-slate-500 hover:bg-sky-50 hover:text-sky-600">
                          <FileDown className="h-4 w-4" />
                        </a>
                        {inv.status !== 'Paid' && (
                          <button
                            onClick={() => { setSelectedInvoice(inv); setIsDeleteModalOpen(true); }}
                            title="Delete"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500"
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
                  <td colSpan={9} className="py-12 text-center text-sm text-slate-500">
                    No invoices found. Click "New Invoice" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/30 backdrop-blur-sm">
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl border border-sky-100 bg-white p-6 shadow-2xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <Trash2 className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">Delete Invoice?</h3>
            <p className="mt-2 text-xs text-slate-500">
              Delete{' '}
              <span className="font-bold text-sky-600">{selectedInvoice?.invoiceNumber}</span>?
              Stock will be restored. This cannot be undone.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 sm:flex-none rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                Cancel
              </button>
              <button onClick={confirmDelete} disabled={deleting} className="flex-1 sm:flex-none rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-500 shadow-md shadow-rose-500/20 disabled:opacity-50">
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
