import React, { useState, useEffect } from 'react';
import {
  TrendingUp, Plus, Search, Trash2, Calendar, X, Filter, DollarSign, Tag, CreditCard, AlignLeft, Clock, Settings2, Edit2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { expensesAPI } from '../../api/apiClient';
import TimePicker from '../../components/ui/TimePicker';
import ManageCategoriesModal from './ManageCategoriesModal';
import { getISTDateString, getISTTimeString, convertTo12HourFormat } from '../../utils/timeUtils';

export default function ExpensesList() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [categoryFilter, setCategoryFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateError, setDateError] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // UI States
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isManageCategoriesOpen, setIsManageCategoriesOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editExpenseId, setEditExpenseId] = useState(null);
  
  const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'UPI', 'Cheque'];
  
  const today = getISTDateString();

  const [formData, setFormData] = useState({
    amount: '',
    category: 'Other',
    date: today,
    time: getISTTimeString(),
    paymentMethod: 'Cash',
    description: '',
  });

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await expensesAPI.getCategories();
      if (res.success) {
        setCategories(res.data);
        if (formData.category === 'Other' && res.data.length > 0) {
          setFormData(prev => ({ ...prev, category: res.data[0].name }));
        }
      }
    } catch (err) {
      toast.error('Failed to load categories');
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [categoryFilter, startDate, endDate, debouncedSearch, page]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 15 };
      if (categoryFilter) params.category = categoryFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (debouncedSearch) params.search = debouncedSearch;
      
      const res = await expensesAPI.getAll(params);
      if (res.success && res.data) {
        setExpenses(res.data);
        setTotalPages(res.meta?.totalPages || 1);
        setTotalCount(res.meta?.total || res.data.length || 0);
      }
    } catch (err) {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleStartDateChange = (val) => {
    setStartDate(val);
    if (val && endDate && new Date(val) > new Date(endDate)) {
      setDateError('Start date cannot be after end date');
    } else {
      setDateError('');
    }
  };

  const handleEndDateChange = (val) => {
    setEndDate(val);
    if (val && startDate && new Date(startDate) > new Date(val)) {
      setDateError('End date cannot be before start date');
    } else {
      setDateError('');
    }
  };

  const clearDateFilter = () => {
    setStartDate('');
    setEndDate('');
    setDateError('');
  };

  const formatINR = (val) => Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const openAddModal = () => {
    setIsEditing(false);
    setEditExpenseId(null);
    setFormData({
      amount: '',
      category: categories.length > 0 ? categories[0].name : 'Other',
      date: today,
      time: getISTTimeString(),
      paymentMethod: 'Cash',
      description: '',
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (expense) => {
    setIsEditing(true);
    setEditExpenseId(expense._id);
    setFormData({
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      time: expense.time,
      paymentMethod: expense.paymentMethod,
      description: expense.description || '',
    });
    setIsAddModalOpen(true);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    if (!formData.amount || formData.amount <= 0) {
      return toast.error('Please enter a valid amount');
    }
    if (!formData.time) {
      return toast.error('Please enter a time');
    }
    
    setIsSubmitting(true);
    try {
      if (isEditing) {
        await expensesAPI.update(editExpenseId, formData);
        toast.success('Expense updated successfully');
      } else {
        await expensesAPI.create(formData);
        toast.success('Expense recorded successfully');
      }
      setIsAddModalOpen(false);
      fetchExpenses();
    } catch (err) {
      toast.error(err.message || 'Error saving expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedExpense) return;
    setIsSubmitting(true);
    try {
      await expensesAPI.delete(selectedExpense._id);
      toast.success('Expense deleted successfully');
      setIsDeleteModalOpen(false);
      fetchExpenses();
    } catch (err) {
      toast.error(err.message || 'Error deleting expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate totals
  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="space-y-4">
      {/* Compact Header & Controls Wrapper */}
      <div className="water-glass rounded-2xl border border-sky-200 p-3 sm:p-4 mb-4 shadow-sm space-y-3">
        {/* Row 1: Title & Actions & Pagination */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-sky-100/60 pb-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
                <TrendingUp className="h-6 w-6 text-purple-600" />
                Expenses & Outflows
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 font-mono">
                  Rs. {formatINR(totalAmount)}
                </span>
              </div>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-2 bg-sky-50/50 rounded-xl px-2 py-1 border border-sky-100 mt-1 sm:mt-0 sm:ml-4">
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

          <div className="hidden xl:flex items-center gap-2 mt-2 sm:mt-0">
            <button onClick={openAddModal} className="flex items-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-purple-600/20 transition-all hover:bg-purple-700 active:scale-[0.98]">
              <Plus className="h-4 w-4 stroke-[3]" /><span>Record Expense</span>
            </button>
          </div>
        </div>

        {/* Row 2: Search, Filters */}
        <div className="flex flex-col xl:flex-row items-center gap-3">
          <div className="flex items-center gap-2 w-full xl:w-auto flex-1">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-sky-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by category or description..."
                className="w-full rounded-xl border border-sky-200/90 bg-white/90 py-2 pl-10 pr-4 text-xs font-semibold text-slate-700 focus:outline-none focus:border-sky-500 shadow-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="xl:hidden flex items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sky-700 hover:bg-sky-100 transition-colors"
            >
              <Filter className="h-4 w-4" />
            </button>
          </div>

          <div className="hidden xl:flex flex-row items-center gap-3">
            <div className="flex items-center gap-1">
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full md:w-36 rounded-xl border border-sky-200/90 bg-white/95 py-2 px-3 text-xs font-bold text-slate-700 focus:border-sky-500 focus:outline-none shadow-sm">
                <option value="">All Categories</option>
                {categories.map(cat => <option key={cat._id} value={cat.name}>{cat.name}</option>)}
              </select>
              <button onClick={() => setIsManageCategoriesOpen(true)} className="flex items-center justify-center p-2 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors shadow-sm" title="Manage Categories">
                <Settings2 className="h-4 w-4" />
              </button>
            </div>
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


        {/* Mobile Filter Menu */}
        {isMobileMenuOpen && (
          <div className="xl:hidden mt-4 pt-4 border-t border-sky-100/60 flex flex-col gap-4 animate-in slide-in-from-top-2 duration-200">
            <button onClick={() => { openAddModal(); setIsMobileMenuOpen(false); }} className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 px-3 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/20 hover:bg-purple-700">
              <Plus className="h-4 w-4 stroke-[3]" /><span>Record Expense</span>
            </button>
            <div className="flex flex-col gap-3">
               <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
                 <button onClick={() => setCategoryFilter('')} className={`flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-2xs ${categoryFilter === '' ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30' : 'bg-white/90 text-slate-600 hover:bg-sky-50 border border-sky-100'}`}>All</button>
                 {categories.map((cat) => (
                   <button
                     key={cat._id}
                     type="button"
                     onClick={() => setCategoryFilter(cat.name)}
                     className={`flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-2xs ${
                       categoryFilter === cat.name
                         ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/30'
                         : 'bg-white/90 text-slate-600 hover:bg-sky-50 border border-sky-100'
                     }`}
                   >
                     {cat.name}
                   </button>
                 ))}
                 <button onClick={() => { setIsManageCategoriesOpen(true); setIsMobileMenuOpen(false); }} className="flex-shrink-0 flex items-center justify-center p-1.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors shadow-sm" title="Manage Categories">
                   <Settings2 className="h-4 w-4" />
                 </button>
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

      {/* Expenses Table */}
      <div className="water-glass rounded-2xl border border-sky-100 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
            <p className="text-xs font-medium text-slate-500">Loading expenses...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-sky-100 bg-sky-50/40 text-[10px] font-black uppercase tracking-wider text-slate-500">
                  <th className="p-3">Date</th>
                  <th className="p-3 text-center">Time</th>
                  <th className="p-3">Category</th>
                  <th className="p-3">Description</th>
                  <th className="p-3 text-center">Payment</th>
                  <th className="p-3 text-right">Amount</th>
                  <th className="p-3 text-right pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100/70">
                {expenses.length > 0 ? (
                  expenses.map((exp) => (
                    <tr key={exp._id} className="group transition-colors hover:bg-sky-50/40">
                      <td className="p-3 text-xs font-bold text-slate-600 whitespace-nowrap">
                        {exp.date}
                      </td>
                      <td className="p-3 text-[10px] font-semibold text-slate-500 text-center whitespace-nowrap">
                        {convertTo12HourFormat(exp.time)}
                      </td>
                      <td className="p-3">
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {exp.category}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-slate-600 font-medium truncate max-w-[200px]">{exp.description || '—'}</td>
                      <td className="p-3 text-center">
                        <span className="inline-flex rounded-full bg-sky-50 border border-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                          {exp.paymentMethod}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-black text-slate-900">
                        Rs. {formatINR(exp.amount)}
                      </td>
                      <td className="p-3 text-right pr-4">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(exp)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-sky-50 hover:text-sky-600 transition-colors"
                            title="Edit Expense"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => { setSelectedExpense(exp); setIsDeleteModalOpen(true); }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                            title="Delete Expense"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-xs font-semibold text-slate-400">
                      No expenses found for the selected criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Expense Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-sky-100 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 sm:p-5 border-b border-sky-50 bg-gradient-to-r from-sky-50 to-white">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                {isEditing ? <Edit2 className="h-5 w-5 text-purple-600 stroke-[3]" /> : <Plus className="h-5 w-5 text-purple-600 stroke-[3]" />}
                {isEditing ? 'Edit Expense' : 'Record Expense'}
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="p-4 sm:p-5 overflow-y-auto">
              <form id="expense-form" onSubmit={handleSaveExpense} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase text-slate-500 flex items-center gap-1"><DollarSign className="h-3.5 w-3.5 text-sky-500"/>Amount *</label>
                  <input
                    type="number"
                    onWheel={(e) => e.target.blur()}
                    onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
                    required
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-sm font-bold text-slate-900 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 transition-all font-mono"
                    placeholder="0.00"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-slate-500 flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5 text-sky-500"/>Category *
                    </label>
                    <div className="flex gap-1">
                      <select
                        required
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-sm font-bold text-slate-700 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 transition-all"
                      >
                        {categories.map(cat => <option key={cat._id} value={cat.name}>{cat.name}</option>)}
                      </select>
                      <button type="button" onClick={() => setIsManageCategoriesOpen(true)} className="flex items-center justify-center p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:text-purple-600 hover:bg-purple-50 transition-colors" title="Manage Categories">
                        <Settings2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-slate-500 flex items-center gap-1"><Calendar className="h-3.5 w-3.5 text-sky-500"/>Date *</label>
                    <input
                      type="date"
                      required
                      max={today}
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-sm font-bold text-slate-700 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-slate-500 flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-sky-500"/>Time *</label>
                    <TimePicker 
                      value={formData.time} 
                      onChange={(newTime) => setFormData({ ...formData, time: newTime })} 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold uppercase text-slate-500 flex items-center gap-1"><CreditCard className="h-3.5 w-3.5 text-sky-500"/>Payment Method</label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-sm font-bold text-slate-700 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 transition-all"
                    >
                      {PAYMENT_METHODS.map(method => <option key={method} value={method}>{method}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase text-slate-500 flex items-center gap-1"><AlignLeft className="h-3.5 w-3.5 text-sky-500"/>Description (Optional)</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-sm font-semibold text-slate-700 focus:border-sky-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-sky-500/10 transition-all resize-none"
                    placeholder="E.g., Fuel for delivery truck"
                  />
                </div>
              </form>
            </div>
            
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 mt-auto">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 transition-colors"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="expense-form"
                disabled={isSubmitting}
                className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-6 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/20 hover:bg-purple-700 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSubmitting ? 'Saving...' : (isEditing ? 'Update Expense' : 'Save Expense')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-3xl bg-white p-5 sm:p-6 shadow-2xl border border-sky-100 animate-in zoom-in-95 duration-200">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 mb-4">
              <Trash2 className="h-6 w-6 text-rose-600" />
            </div>
            <h3 className="text-center text-lg font-black text-slate-900 mb-2">Delete Expense?</h3>
            <p className="text-center text-sm font-medium text-slate-500 mb-6">
              Are you sure you want to delete this expense of <strong className="text-slate-800">Rs. {formatINR(selectedExpense.amount)}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isSubmitting}
                className="flex-1 rounded-xl bg-slate-100 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isSubmitting}
                className="flex-1 rounded-xl bg-rose-500 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-500/20 hover:bg-rose-600 active:scale-95 transition-all flex items-center justify-center"
              >
                {isSubmitting ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
      {isManageCategoriesOpen && (
        <ManageCategoriesModal
          categories={categories}
          onClose={() => setIsManageCategoriesOpen(false)}
          onCategoryAdded={(newCat) => setCategories([...categories, newCat])}
          onCategoryDeleted={(id) => {
            setCategories(categories.filter(c => c._id !== id));
            if (categoryFilter && categories.find(c => c._id === id)?.name === categoryFilter) {
              setCategoryFilter('');
            }
          }}
        />
      )}
    </div>
  );
}
