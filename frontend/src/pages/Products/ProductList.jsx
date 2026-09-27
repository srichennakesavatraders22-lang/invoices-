import React, { useState, useEffect, useRef } from 'react';
import {
  Package, Plus, Search, Edit2, Trash2, X, AlertTriangle,
  Download, Upload, Image, BarChart3, RefreshCw, Eye, Filter
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import { productsAPI } from '../../api/apiClient';

const EMPTY_FORM = {
  name: '',
  category: 'Choco',
  packType: '24-pack',
  unit: 'Boxes',
  mrp: '',
  cgstPercent: 2.5,
  sgstPercent: 2.5,
  igstPercent: 5.0,
  hsnCode: '18069010',
  stock: 0,
  minStock: 10,
  expiryDate: '',
  batchNumber: '',
  manufacturingDate: '',
  supplierName: '',
  discountPercent: 0,
  imageUrl: '',
};

// Validation rules
const validateProductForm = (data) => {
  const errors = {};
  if (!data.name.trim()) errors.name = 'Product name is required';
  if (!data.category.trim()) errors.category = 'Category is required';
  if (!data.packType.trim()) errors.packType = 'Pack type is required';
  if (!data.mrp || Number(data.mrp) <= 0) errors.mrp = 'MRP must be greater than 0';
  if (Number(data.cgstPercent) < 0 || Number(data.cgstPercent) > 50) errors.cgstPercent = 'CGST must be 0–50%';
  if (Number(data.igstPercent) < 0 || Number(data.igstPercent) > 100) errors.igstPercent = 'IGST must be 0–100%';
  if (Number(data.stock) < 0) errors.stock = 'Stock cannot be negative';
  if (Number(data.minStock) < 0) errors.minStock = 'Min stock cannot be negative';
  if (data.expiryDate) {
    const expiry = new Date(data.expiryDate);
    if (isNaN(expiry)) errors.expiryDate = 'Invalid expiry date';
  }
  return errors;
};

const getDaysUntilExpiry = (expiryDate) => {
  if (!expiryDate) return null;
  const diff = new Date(expiryDate) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const ExpiryChip = ({ expiryDate }) => {
  const days = getDaysUntilExpiry(expiryDate);
  if (days === null) return <span className="text-slate-300 text-xs">—</span>;
  if (days < 0) return <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[9px] font-black">EXPIRED</span>;
  if (days <= 7) return <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[9px] font-bold animate-pulse">{days}d left</span>;
  if (days <= 15) return <span className="rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-[9px] font-bold">{days}d</span>;
  if (days <= 30) return <span className="rounded-full bg-yellow-100 text-yellow-700 px-2 py-0.5 text-[9px] font-bold">{days}d</span>;
  return <span className="text-[9px] text-slate-400 font-mono">{new Date(expiryDate).toLocaleDateString('en-IN')}</span>;
};

export const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [packTypeFilter, setPackTypeFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [packTypes, setPackTypes] = useState([]);
  const [meta, setMeta] = useState({});
  const [stockFilter, setStockFilter] = useState(''); // '' | 'low' | 'expiring'
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Image upload state
  const [imageFile, setImageFile] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef(null);

  // Import state
  const [importing, setImporting] = useState(false);
  const importInputRef = useRef(null);
  const [isBulkImportPreviewOpen, setIsBulkImportPreviewOpen] = useState(false);
  const [bulkImportFile, setBulkImportFile] = useState(null);
  const [bulkImportPreviewData, setBulkImportPreviewData] = useState([]);
  const [bulkImportHeaders, setBulkImportHeaders] = useState([]);

  // Form State
  const [formData, setFormData] = useState(EMPTY_FORM);

  useEffect(() => {
    fetchProducts();
  }, [categoryFilter, packTypeFilter, stockFilter, page]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {
        search: search || undefined,
        category: categoryFilter || undefined,
        packType: packTypeFilter || undefined,
        lowStock: stockFilter === 'low' ? 'true' : undefined,
        expiringSoon: stockFilter === 'expiring' ? 'true' : undefined,
        page,
        limit: 20,
      };
      const res = await productsAPI.getAll(params);
      if (res.success && res.data) {
        setProducts(res.data);
        setTotalPages(res.pagination?.pages || 1);
        setTotalCount(res.pagination?.total || 0);
        if (res.meta) {
          setCategories(res.meta.categories || []);
          setPackTypes(res.meta.packTypes || []);
          setMeta(res.meta);
        }
      }
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const openAddModal = () => {
    setSelectedProduct(null);
    setFormData(EMPTY_FORM);
    setFormErrors({});
    setImageFile(null);
    setIsModalOpen(true);
  };

  const openEditModal = (prod) => {
    setSelectedProduct(prod);
    setFormErrors({});
    setImageFile(null);
    setFormData({
      name: prod.name,
      category: prod.category,
      packType: prod.packType,
      unit: prod.unit || 'Boxes',
      mrp: prod.mrp,
      cgstPercent: prod.cgstPercent,
      sgstPercent: prod.sgstPercent,
      igstPercent: prod.igstPercent,
      hsnCode: prod.hsnCode || '18069010',
      stock: prod.stock ?? 0,
      minStock: prod.minStock ?? 10,
      expiryDate: prod.expiryDate ? prod.expiryDate.split('T')[0] : '',
      batchNumber: prod.batchNumber || '',
      manufacturingDate: prod.manufacturingDate ? prod.manufacturingDate.split('T')[0] : '',
      supplierName: prod.supplierName || '',
      discountPercent: prod.discountPercent || 0,
      imageUrl: prod.imageUrl || '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const errors = validateProductForm(formData);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Please fix the form errors before saving');
      return;
    }
    setFormErrors({});
    setSaving(true);
    try {
      let savedProduct;
      if (selectedProduct) {
        const res = await productsAPI.update(selectedProduct._id, formData);
        savedProduct = res.data;
        toast.success('Product updated successfully!');
      } else {
        const res = await productsAPI.create(formData);
        savedProduct = res.data;
        toast.success('New product SKU created!');
      }

      // Upload image if selected
      if (imageFile && savedProduct?._id) {
        setImageUploading(true);
        try {
          const fd = new FormData();
          fd.append('image', imageFile);
          await productsAPI.uploadImage(savedProduct._id, fd);
          toast.success('Product image uploaded!');
        } catch {
          toast.error('Image upload failed but product saved');
        } finally {
          setImageUploading(false);
        }
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.message || 'Error saving product');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedProduct) return;
    setSaving(true);
    try {
      await productsAPI.delete(selectedProduct._id);
      toast.success('Product deleted successfully');
      setIsDeleteModalOpen(false);
      fetchProducts();
    } catch (err) {
      toast.error(err.message || 'Error deleting product');
    } finally {
      setSaving(false);
    }
  };

  const handleExportExcel = () => {
    window.open(productsAPI.getExportUrl(), '_blank');
    toast.success('Downloading products catalog...');
  };

  const handleDownloadTemplate = () => {
    window.open(productsAPI.getTemplateUrl(), '_blank');
    toast.success('Downloading import template...');
  };

  const handleBulkImportFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('Please upload an Excel or CSV file (.xlsx, .xls, .csv)');
      return;
    }
    setBulkImportFile(file);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (data.length > 0) {
          setBulkImportHeaders(data[0]);
          setBulkImportPreviewData(data.slice(1)); // show all rows
        }
      } catch (err) {
        toast.error('Could not read preview of excel file.');
      }
    };
    reader.readAsBinaryString(file);
    if (importInputRef.current) importInputRef.current.value = '';
  };

  const openBulkImportModal = () => {
    setBulkImportFile(null);
    setBulkImportPreviewData([]);
    setBulkImportHeaders([]);
    setIsBulkImportPreviewOpen(true);
  };
  const confirmBulkImport = async () => {
    if (!bulkImportFile) return;
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', bulkImportFile);
      const res = await productsAPI.bulkImport(fd);
      if (res.success) {
        toast.success(res.message || 'Import successful!');
        if (res.data?.errors?.length > 0) {
          toast(`${res.data.errors.length} rows had errors`, { icon: '⚠️' });
        }
        setIsBulkImportPreviewOpen(false);
        setBulkImportFile(null);
        fetchProducts();
      }
    } catch (err) {
      toast.error(err.message || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const updateField = (field, value) => {
    setFormData((f) => ({ ...f, [field]: value }));
    if (formErrors[field]) {
      setFormErrors((e) => { const { [field]: _, ...rest } = e; return rest; });
    }
  };

  return (
    <div className="space-y-3 lg:space-y-5">
      <div className="water-glass rounded-2xl border border-sky-200 p-3 lg:p-4 shadow-sm">
        {/* Row 1: Title, Alerts, Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-4 mb-3 pb-3 lg:mb-4 lg:pb-4 border-b border-sky-100/60">
          
          {/* Left: Title & Pagination */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div>
              <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <Package className="h-5 w-5 text-sky-500" />
                Products & SKU Catalog
              </h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">{totalCount} SKUs Available</p>
            </div>
            
            {/* Pagination Controls */}
            <div className="flex items-center gap-2 bg-sky-50/50 rounded-xl px-2 py-1 border border-sky-100 mt-1 sm:mt-0 sm:ml-2">
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

          {/* Middle: Compact Alerts */}
          {(meta.expiredCount > 0 || meta.expiringCount > 0 || meta.lowStockCount > 0) && (
            <div className="hidden xl:flex flex-1 justify-center min-w-0 px-4">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 max-w-full">
                {meta.expiredCount > 0 && (
                  <div
                    onClick={() => { setStockFilter('expiring'); setPage(1); }}
                    className="flex-shrink-0 flex items-center gap-1.5 bg-red-50 text-red-700 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-red-200 cursor-pointer hover:bg-red-100 transition-colors shadow-xs"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    {meta.expiredCount} EXPIRED
                  </div>
                )}
                {meta.expiringCount > 0 && (
                  <div
                    onClick={() => { setStockFilter('expiring'); setPage(1); }}
                    className="flex-shrink-0 flex items-center gap-1.5 bg-orange-50 text-orange-700 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-orange-200 cursor-pointer hover:bg-orange-100 transition-colors shadow-xs"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    {meta.expiringCount} Expiring
                  </div>
                )}
                {meta.lowStockCount > 0 && (
                  <div
                    onClick={() => { setStockFilter('low'); setPage(1); }}
                    className="flex-shrink-0 flex items-center gap-1.5 bg-yellow-50 text-yellow-700 px-2.5 py-1.5 rounded-lg text-xs font-bold border border-yellow-200 cursor-pointer hover:bg-yellow-100 transition-colors shadow-xs"
                  >
                    <Package className="h-4 w-4" />
                    {meta.lowStockCount} Low Stock
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Right: Actions */}
          <div className="hidden xl:flex flex-wrap items-center justify-end gap-2">
            <button onClick={() => window.open(productsAPI.getExportUrl(), '_blank')} className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 shadow-xs transition-all">
              <Download className="h-3.5 w-3.5" /><span>Export</span>
            </button>
            <button onClick={handleDownloadTemplate} className="flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 shadow-xs transition-all">
              <Download className="h-3.5 w-3.5" /><span>Template</span>
            </button>
            <button onClick={openBulkImportModal} disabled={importing} className="flex items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100 shadow-xs transition-all disabled:opacity-60">
              {importing ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" /> : <Upload className="h-3.5 w-3.5" />}
              <span>{importing ? 'Importing...' : 'Bulk Import'}</span>
            </button>
            <input ref={importInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleBulkImportFileSelect} />
            
            {/* Total Boxes Stat Badge */}
            <div className="flex items-center gap-2 rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50 to-teal-50 px-3 py-1.5 shadow-xs">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-400 to-teal-500 text-white shadow-sm">
                <Package className="h-3.5 w-3.5 stroke-[2.5]" />
              </div>
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Total Boxes</p>
                <p className="text-sm font-black text-slate-800 leading-tight font-mono">{(meta.totalStock || 0).toLocaleString('en-IN')}</p>
              </div>
              {meta.totalStockValue > 0 && (
                <div className="pl-2 border-l border-sky-200 ml-1">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Stock Value</p>
                  <p className="text-[11px] font-black text-teal-700 font-mono">Rs. {Number(meta.totalStockValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
              )}
            </div>
            
            <button onClick={openAddModal} className="flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-sky-500/20 transition-all hover:bg-sky-600 active:scale-[0.98]">
              <Plus className="h-4 w-4 stroke-[3]" /><span>Add SKU</span>
            </button>
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
                placeholder="Search by SKU, category, pack type..."
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
            <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="w-full md:w-40 rounded-xl border border-sky-200/90 bg-white/95 py-2 px-3 text-xs font-bold text-slate-700 focus:border-sky-500 focus:outline-none shadow-sm">
              <option value="">All Categories</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={packTypeFilter} onChange={(e) => { setPackTypeFilter(e.target.value); setPage(1); }} className="w-full md:w-36 rounded-xl border border-sky-200/90 bg-white/95 py-2 px-3 text-xs font-bold text-slate-700 focus:border-sky-500 focus:outline-none shadow-sm">
              <option value="">All Pack Types</option>
              {packTypes.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select value={stockFilter} onChange={(e) => { setStockFilter(e.target.value); setPage(1); }} className="w-full md:w-36 rounded-xl border border-sky-200/90 bg-white/95 py-2 px-3 text-xs font-bold text-slate-700 focus:border-sky-500 focus:outline-none shadow-sm">
              <option value="">All Stock</option>
              <option value="low">⚠️ Low Stock</option>
              <option value="expiring">📅 Expiring Soon</option>
            </select>
            <button onClick={() => { setSearch(''); setCategoryFilter(''); setPackTypeFilter(''); setStockFilter(''); setPage(1); }} className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-xs transition-all" title="Reset Filters">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Mobile Filter & Actions Menu */}
        {isMobileMenuOpen && (
          <div className="xl:hidden mt-3 pt-3 border-t border-sky-100/60 flex flex-col gap-3 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => window.open(productsAPI.getExportUrl(), '_blank')} className="flex items-center justify-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 shadow-xs">
                <Download className="h-3.5 w-3.5" /><span>Export</span>
              </button>
              <button onClick={handleDownloadTemplate} className="flex items-center justify-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 shadow-xs">
                <Download className="h-3.5 w-3.5" /><span>Template</span>
              </button>
              <button onClick={openBulkImportModal} disabled={importing} className="flex items-center justify-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-2 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100 shadow-xs disabled:opacity-60">
                {importing ? <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" /> : <Upload className="h-3.5 w-3.5" />}
                <span>Import</span>
              </button>
              <button onClick={openAddModal} className="flex items-center justify-center gap-1.5 rounded-lg bg-sky-500 px-2 py-1.5 text-xs font-bold text-white shadow-md shadow-sky-500/20 hover:bg-sky-600">
                <Plus className="h-4 w-4 stroke-[3]" /><span>Add SKU</span>
              </button>
            </div>

            {/* Mobile Stat Badge */}
            <div className="flex items-center gap-2 rounded-xl border border-sky-100 bg-gradient-to-r from-sky-50 to-teal-50 px-3 py-2 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-tr from-sky-400 to-teal-500 text-white shadow-sm">
                <Package className="h-3.5 w-3.5 stroke-[2.5]" />
              </div>
              <div className="flex-1">
                <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Total Boxes</p>
                <p className="text-sm font-black text-slate-800 leading-tight font-mono">{(meta.totalStock || 0).toLocaleString('en-IN')}</p>
              </div>
              {meta.totalStockValue > 0 && (
                <div className="pl-2 border-l border-sky-200">
                  <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Stock Value</p>
                  <p className="text-[11px] font-black text-teal-700 font-mono">Rs. {Number(meta.totalStockValue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
                </div>
              )}
            </div>

            {/* Mobile Alerts */}
            {(meta.expiredCount > 0 || meta.expiringCount > 0 || meta.lowStockCount > 0) && (
              <div className="flex flex-wrap gap-2">
                {meta.expiredCount > 0 && (
                  <div
                    onClick={() => { setStockFilter('expiring'); setPage(1); setIsMobileMenuOpen(false); }}
                    className="flex-1 min-w-[100px] flex justify-center items-center gap-1.5 bg-red-50 text-red-700 px-2 py-1.5 rounded-xl text-xs font-bold border border-red-200 cursor-pointer shadow-sm"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {meta.expiredCount} EXPIRED
                  </div>
                )}
                {meta.expiringCount > 0 && (
                  <div
                    onClick={() => { setStockFilter('expiring'); setPage(1); setIsMobileMenuOpen(false); }}
                    className="flex-1 min-w-[100px] flex justify-center items-center gap-1.5 bg-orange-50 text-orange-700 px-2 py-1.5 rounded-xl text-xs font-bold border border-orange-200 cursor-pointer shadow-sm"
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {meta.expiringCount} Expiring
                  </div>
                )}
                {meta.lowStockCount > 0 && (
                  <div
                    onClick={() => { setStockFilter('low'); setPage(1); setIsMobileMenuOpen(false); }}
                    className="flex-1 min-w-[100px] flex justify-center items-center gap-1.5 bg-yellow-50 text-yellow-700 px-2 py-1.5 rounded-xl text-xs font-bold border border-yellow-200 cursor-pointer shadow-sm"
                  >
                    <Package className="h-3.5 w-3.5" />
                    {meta.lowStockCount} Low Stock
                  </div>
                )}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-2 pb-1">
              <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className="w-full rounded-xl border border-sky-200/90 bg-white/95 py-2 px-2 text-xs font-bold text-slate-700 focus:border-sky-500 focus:outline-none shadow-sm">
                <option value="">All Categories</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={packTypeFilter} onChange={(e) => { setPackTypeFilter(e.target.value); setPage(1); }} className="w-full rounded-xl border border-sky-200/90 bg-white/95 py-2 px-2 text-xs font-bold text-slate-700 focus:border-sky-500 focus:outline-none shadow-sm">
                <option value="">All Pack Types</option>
                {packTypes.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={stockFilter} onChange={(e) => { setStockFilter(e.target.value); setPage(1); }} className="w-full rounded-xl border border-sky-200/90 bg-white/95 py-2 px-2 text-xs font-bold text-slate-700 focus:border-sky-500 focus:outline-none shadow-sm">
                <option value="">All Stock</option>
                <option value="low">⚠️ Low Stock</option>
                <option value="expiring">📅 Expiring Soon</option>
              </select>
              <button onClick={() => { setSearch(''); setCategoryFilter(''); setPackTypeFilter(''); setStockFilter(''); setPage(1); }} className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 shadow-xs" title="Reset Filters">
                <RefreshCw className="h-3.5 w-3.5" /> Reset
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Products Table */}
      <div className="water-glass rounded-2xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm min-w-[1000px]">
            <thead>
              <tr className="border-b border-sky-100 bg-sky-50/50 text-[10.5px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3.5 pl-4 w-12">Image</th>
                <th className="py-3.5">Product Name</th>
                <th className="py-3.5">Category</th>
                <th className="py-3.5">Pack Type</th>
                <th className="py-3.5 text-center">Stock</th>
                <th className="py-3.5 text-center">Unit</th>
                <th className="py-3.5 text-center hidden md:table-cell">Mfg Date</th>
                <th className="py-3.5 text-center hidden md:table-cell">Exp Date</th>
                <th className="py-3.5 text-right">MRP (Rs.)</th>
                <th className="py-3.5 text-center hidden lg:table-cell">GST</th>
                <th className="py-3.5 text-center hidden xl:table-cell">HSN</th>
                <th className="py-3.5 pr-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100/70">
              {loading ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center">
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent mx-auto" />
                  </td>
                </tr>
              ) : products.length > 0 ? (
                products.map((prod) => {
                  const isLowStock = prod.stock <= prod.minStock;
                  const isOutOfStock = prod.stock === 0;
                  return (
                    <tr key={prod._id} className="hover:bg-sky-50/30 transition-colors group">
                      {/* Image Cell */}
                      <td className="py-3 pl-4">
                        {prod.imageUrl ? (
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="h-9 w-9 rounded-xl object-cover border border-sky-100 shadow-sm"
                          />
                        ) : (
                          <div className="h-9 w-9 rounded-xl bg-sky-50 border border-sky-100 flex items-center justify-center text-slate-300">
                            <Package className="h-4 w-4" />
                          </div>
                        )}
                      </td>
                      {/* Name */}
                      <td className="py-3 whitespace-nowrap">
                        <span className="font-bold text-slate-900 text-sm">{prod.name}</span>
                        {prod.discountPercent > 0 && (
                          <span className="ml-2 rounded-md bg-green-50 px-1.5 py-0.5 text-[9px] font-bold text-green-700 border border-green-100">
                            {prod.discountPercent}% OFF
                          </span>
                        )}
                      </td>
                      {/* Category */}
                      <td className="py-3">
                        <span className="rounded-md bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-700 border border-sky-100">
                          {prod.category}
                        </span>
                      </td>
                      {/* Pack Type */}
                      <td className="py-3">
                        <span className="rounded-md bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-600 border border-slate-100">
                          {prod.packType}
                        </span>
                      </td>
                      {/* Stock */}
                      <td className="py-3 text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`text-base font-black font-mono ${
                            isOutOfStock ? 'text-red-600' : isLowStock ? 'text-orange-600' : 'text-slate-900'
                          }`}>
                            {prod.stock}
                          </span>
                          {isLowStock && (
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                              isOutOfStock ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                            }`}>
                              {isOutOfStock ? 'OUT' : 'LOW'}
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Unit */}
                      <td className="py-3 text-center text-xs font-semibold text-slate-500">
                        {prod.unit}
                      </td>
                      {/* Mfg Date */}
                      <td className="py-3 text-center hidden md:table-cell text-[11px] font-semibold text-slate-500">
                        {prod.manufacturingDate ? new Date(prod.manufacturingDate).toLocaleDateString('en-IN') : '-'}
                      </td>
                      {/* Expiry */}
                      <td className="py-3 text-center hidden md:table-cell">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-[11px] font-bold text-slate-700">
                            {prod.expiryDate ? new Date(prod.expiryDate).toLocaleDateString('en-IN') : '-'}
                          </span>
                          {prod.expiryDate && <ExpiryChip expiryDate={prod.expiryDate} />}
                        </div>
                      </td>
                      {/* MRP */}
                      <td className="py-3 text-right font-mono font-bold text-slate-900">
                        Rs. {Number(prod.mrp).toFixed(2)}
                      </td>
                      {/* GST */}
                      <td className="py-3 text-center hidden lg:table-cell">
                        <div className="flex flex-col items-center gap-0.5 text-[10px] text-slate-600">
                          <span className="font-bold">C: {prod.cgstPercent}%</span>
                          <span className="font-bold">I: {prod.igstPercent}%</span>
                        </div>
                      </td>
                      {/* HSN */}
                      <td className="py-3 text-center font-mono text-[10px] text-slate-500 hidden xl:table-cell">
                        {prod.hsnCode}
                      </td>
                      {/* Actions */}
                      <td className="py-3 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(prod)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-sky-50 hover:text-sky-600 transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => { setSelectedProduct(prod); setIsDeleteModalOpen(true); }}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-sm text-slate-500">
                    No products found. Click "Add New SKU" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Add / Edit Product Modal ─── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/30 backdrop-blur-sm">
          <div className="relative w-full sm:max-w-2xl rounded-t-3xl sm:rounded-2xl border border-sky-100 bg-white p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-sky-100 pb-4 mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {selectedProduct ? 'Edit Product SKU' : 'Add New Product SKU'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {/* ─── Section 1: Basic Info ─── */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-3">Product Information</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">SKU / Product Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => updateField('name', e.target.value)}
                      placeholder="e.g. Choco 24, Vanilla Jar"
                      className={`w-full rounded-xl border px-3.5 py-2 text-sm text-slate-800 focus:outline-none ${formErrors.name ? 'border-red-400 bg-red-50' : 'border-sky-200 bg-white focus:border-sky-500'}`}
                    />
                    {formErrors.name && <p className="text-[10px] text-red-500 mt-0.5">⚠ {formErrors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Category *</label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => updateField('category', e.target.value)}
                      placeholder="e.g. Choco, Vanilla"
                      className={`w-full rounded-xl border px-3.5 py-2 text-sm text-slate-800 focus:outline-none ${formErrors.category ? 'border-red-400 bg-red-50' : 'border-sky-200 bg-white focus:border-sky-500'}`}
                    />
                    {formErrors.category && <p className="text-[10px] text-red-500 mt-0.5">⚠ {formErrors.category}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Pack Type *</label>
                    <input
                      type="text"
                      value={formData.packType}
                      onChange={(e) => updateField('packType', e.target.value)}
                      placeholder="e.g. 24-pack, Jar, Jumbo"
                      className={`w-full rounded-xl border px-3.5 py-2 text-sm text-slate-800 focus:outline-none ${formErrors.packType ? 'border-red-400 bg-red-50' : 'border-sky-200 bg-white focus:border-sky-500'}`}
                    />
                    {formErrors.packType && <p className="text-[10px] text-red-500 mt-0.5">⚠ {formErrors.packType}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Unit</label>
                    <input
                      type="text"
                      value={formData.unit}
                      onChange={(e) => updateField('unit', e.target.value)}
                      placeholder="Boxes"
                      className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Wholesale MRP (Rs.) *</label>
                    <input
                      type="number"
                      onWheel={(e) => e.target.blur()}
                      onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
                      step="0.01"
                      min="0"
                      value={formData.mrp}
                      onChange={(e) => updateField('mrp', e.target.value)}
                      placeholder="e.g. 480.00"
                      className={`w-full rounded-xl border px-3.5 py-2 text-sm font-mono font-bold text-slate-800 focus:outline-none ${formErrors.mrp ? 'border-red-400 bg-red-50' : 'border-sky-200 bg-white focus:border-sky-500'}`}
                    />
                    {formErrors.mrp && <p className="text-[10px] text-red-500 mt-0.5">⚠ {formErrors.mrp}</p>}
                  </div>
                </div>
              </div>

              {/* ─── Section 2: GST ─── */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-3">GST & HSN</p>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">CGST %</label>
                    <input type="number" onWheel={(e) => e.target.blur()} onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()} step="0.1" min="0" value={formData.cgstPercent} onChange={(e) => updateField('cgstPercent', e.target.value)} className="w-full rounded-xl border border-sky-200 bg-white px-2.5 py-2 text-sm font-mono text-slate-800 focus:border-sky-500 focus:outline-none" />
                    {formErrors.cgstPercent && <p className="text-[10px] text-red-500 mt-0.5">⚠ {formErrors.cgstPercent}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">SGST %</label>
                    <input type="number" onWheel={(e) => e.target.blur()} onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()} step="0.1" min="0" value={formData.sgstPercent} onChange={(e) => updateField('sgstPercent', e.target.value)} className="w-full rounded-xl border border-sky-200 bg-white px-2.5 py-2 text-sm font-mono text-slate-800 focus:border-sky-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">IGST %</label>
                    <input type="number" onWheel={(e) => e.target.blur()} onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()} step="0.1" min="0" value={formData.igstPercent} onChange={(e) => updateField('igstPercent', e.target.value)} className="w-full rounded-xl border border-sky-200 bg-white px-2.5 py-2 text-sm font-mono text-slate-800 focus:border-sky-500 focus:outline-none" />
                    {formErrors.igstPercent && <p className="text-[10px] text-red-500 mt-0.5">⚠ {formErrors.igstPercent}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">HSN Code</label>
                    <input type="text" value={formData.hsnCode} onChange={(e) => updateField('hsnCode', e.target.value)} placeholder="18069010" className="w-full rounded-xl border border-sky-200 bg-white px-2.5 py-2 text-sm font-mono text-slate-800 focus:border-sky-500 focus:outline-none" />
                  </div>
                </div>
              </div>

              {/* ─── Section 3: Stock ─── */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-3">Stock Management</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Current Stock (Boxes)</label>
                    <input
                      type="number"
                      onWheel={(e) => e.target.blur()}
                      onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
                      min="0"
                      value={formData.stock}
                      onChange={(e) => updateField('stock', e.target.value)}
                      className={`w-full rounded-xl border px-3.5 py-2 text-sm font-mono font-bold text-slate-800 focus:outline-none ${formErrors.stock ? 'border-red-400 bg-red-50' : 'border-sky-200 bg-white focus:border-sky-500'}`}
                    />
                    {formErrors.stock && <p className="text-[10px] text-red-500 mt-0.5">⚠ {formErrors.stock}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Min Stock Alert</label>
                    <input
                      type="number"
                      onWheel={(e) => e.target.blur()}
                      onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
                      min="0"
                      value={formData.minStock}
                      onChange={(e) => updateField('minStock', e.target.value)}
                      className={`w-full rounded-xl border px-3.5 py-2 text-sm font-mono text-slate-800 focus:outline-none ${formErrors.minStock ? 'border-red-400 bg-red-50' : 'border-sky-200 bg-white focus:border-sky-500'}`}
                    />
                    {formErrors.minStock && <p className="text-[10px] text-red-500 mt-0.5">⚠ {formErrors.minStock}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Discount %</label>
                    <input
                      type="number"
                      onWheel={(e) => e.target.blur()}
                      onKeyDown={(e) => ['-', '+', 'e', 'E'].includes(e.key) && e.preventDefault()}
                      min="0"
                      max="100"
                      step="0.5"
                      value={formData.discountPercent}
                      onChange={(e) => updateField('discountPercent', e.target.value)}
                      className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-sm font-mono text-slate-800 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* ─── Section 4: Expiry & Batch ─── */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-3">Expiry & Batch Info</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) => updateField('expiryDate', e.target.value)}
                      className={`w-full rounded-xl border px-3.5 py-2 text-sm text-slate-800 focus:outline-none ${formErrors.expiryDate ? 'border-red-400 bg-red-50' : 'border-sky-200 bg-white focus:border-sky-500'}`}
                    />
                    {formErrors.expiryDate && <p className="text-[10px] text-red-500 mt-0.5">⚠ {formErrors.expiryDate}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Manufacturing Date</label>
                    <input
                      type="date"
                      value={formData.manufacturingDate}
                      onChange={(e) => updateField('manufacturingDate', e.target.value)}
                      className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Batch Number</label>
                    <input
                      type="text"
                      value={formData.batchNumber}
                      onChange={(e) => updateField('batchNumber', e.target.value)}
                      placeholder="e.g. BATCH001"
                      className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-sm font-mono text-slate-800 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Supplier Name</label>
                    <input
                      type="text"
                      value={formData.supplierName}
                      onChange={(e) => updateField('supplierName', e.target.value)}
                      placeholder="Supplier company name"
                      className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-sm text-slate-800 focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* ─── Section 5: Product Image ─── */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-3">Product Image</p>
                <div className="flex items-center gap-4">
                  {(formData.imageUrl || imageFile) && (
                    <img
                      src={imageFile ? URL.createObjectURL(imageFile) : formData.imageUrl}
                      alt="Preview"
                      className="h-16 w-16 rounded-xl object-cover border border-sky-200 shadow-sm"
                    />
                  )}
                  <div className="flex-1">
                    <input
                      ref={imageInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files[0];
                        if (f) {
                          if (f.size > 5 * 1024 * 1024) {
                            toast.error('Image must be less than 5MB');
                            return;
                          }
                          setImageFile(f);
                          toast(`Image selected: ${f.name}`, { icon: '🖼️' });
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="flex items-center gap-2 rounded-xl border-2 border-dashed border-sky-200 bg-sky-50/50 px-4 py-2.5 text-xs font-bold text-sky-700 hover:bg-sky-100/60 transition-all"
                    >
                      <Image className="h-4 w-4" />
                      {imageFile ? `${imageFile.name.slice(0, 20)}...` : formData.imageUrl ? 'Change Image' : 'Upload Product Image'}
                    </button>
                    {formData.imageUrl && !imageFile && (
                      <button
                        type="button"
                        onClick={() => updateField('imageUrl', '')}
                        className="mt-1.5 text-[10px] text-rose-500 hover:underline"
                      >
                        Remove current image
                      </button>
                    )}
                    <p className="text-[10px] text-slate-400 mt-1">Max 5MB. JPG, PNG, WebP supported.</p>
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-sky-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || imageUploading}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-5 py-2 text-sm font-bold text-white shadow-md shadow-sky-500/20 hover:brightness-105 disabled:opacity-50"
                >
                  {(saving || imageUploading) ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : null}
                  <span>{saving ? 'Saving...' : imageUploading ? 'Uploading Image...' : 'Save SKU'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/30 backdrop-blur-sm">
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl border border-sky-100 bg-white p-6 shadow-2xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">Deactivate SKU?</h3>
            <p className="mt-2 text-xs text-slate-500">
              Remove <span className="font-bold text-slate-800">{selectedProduct?.name}</span>?
              Existing invoices will keep their historical record.
            </p>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 sm:flex-none rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200">
                Cancel
              </button>
              <button onClick={confirmDelete} disabled={saving} className="flex-1 sm:flex-none rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-500 shadow-md shadow-rose-500/20 disabled:opacity-50">
                {saving ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Import Preview Modal */}
      {isBulkImportPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Upload className="h-5 w-5 text-violet-500" />
                Bulk Import Preview
              </h3>
              <button onClick={() => setIsBulkImportPreviewOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5">
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-4">
                  <h4 className="text-xs font-bold text-rose-800 uppercase tracking-wider mb-2">Required Columns</h4>
                  <p className="text-xs font-mono text-rose-600 font-medium">name, category, packType, unit, mrp</p>
                </div>
                <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4">
                  <h4 className="text-xs font-bold text-sky-800 uppercase tracking-wider mb-2">Optional Columns</h4>
                  <p className="text-xs font-mono text-sky-600 font-medium leading-relaxed whitespace-normal break-words">cgstPercent, sgstPercent, igstPercent, hsnCode, stock, minStock, expiryDate, batchNumber, manufacturingDate, supplierName, discountPercent</p>
                </div>
              </div>

              <div className="mb-4 flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-800">
                  {bulkImportFile ? (
                    <>Previewing {bulkImportPreviewData.length} rows from: <span className="text-sky-600 font-mono">{bulkImportFile.name}</span></>
                  ) : (
                    'No file selected yet.'
                  )}
                </h4>
                <button onClick={() => importInputRef.current?.click()} className="text-xs font-bold flex items-center gap-1 text-violet-600 bg-violet-50 px-3 py-1.5 rounded-lg hover:bg-violet-100 transition-colors">
                  <Upload className="h-3.5 w-3.5" />
                  {bulkImportFile ? 'Change File' : 'Select Excel File'}
                </button>
              </div>

              {bulkImportFile && (
                <div className="rounded-xl border border-slate-200 overflow-x-auto">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        {bulkImportHeaders.map((header, idx) => (
                          <th key={idx} className="px-4 py-2 font-bold">{header}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bulkImportPreviewData.map((row, rowIdx) => (
                        <tr key={rowIdx}>
                          {bulkImportHeaders.map((_, colIdx) => (
                            <td key={colIdx} className="px-4 py-2 text-slate-700 font-mono">{row[colIdx] || ''}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 p-5 bg-slate-50 rounded-b-2xl">
              <button
                onClick={() => setIsBulkImportPreviewOpen(false)}
                className="rounded-xl bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 shadow-sm"
              >
                Cancel
              </button>
              <button
                onClick={confirmBulkImport}
                disabled={importing || !bulkImportFile}
                className="flex items-center gap-2 rounded-xl bg-violet-600 px-6 py-2 text-sm font-bold text-white hover:bg-violet-500 shadow-md shadow-violet-500/20 disabled:opacity-50"
              >
                {importing ? 'Importing...' : 'Confirm & Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductList;
