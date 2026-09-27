import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { productsAPI } from '../../api/apiClient';

export const ProductList = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [packTypeFilter, setPackTypeFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [packTypes, setPackTypes] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    category: 'Choco',
    packType: '24-pack',
    unit: 'Boxes',
    mrp: '',
    cgstPercent: 2.5,
    sgstPercent: 0,
    igstPercent: 5.0,
    hsnCode: '18069010',
  });

  useEffect(() => {
    fetchProducts();
  }, [categoryFilter, packTypeFilter]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await productsAPI.getAll({
        search: search || undefined,
        category: categoryFilter || undefined,
        packType: packTypeFilter || undefined,
        limit: 50,
      });
      if (res.success && res.data) {
        setProducts(res.data);
        if (res.meta) {
          setCategories(res.meta.categories || []);
          setPackTypes(res.meta.packTypes || []);
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
    fetchProducts();
  };

  const openAddModal = () => {
    setSelectedProduct(null);
    setFormData({
      name: '',
      category: 'Choco',
      packType: '24-pack',
      unit: 'Boxes',
      mrp: '',
      cgstPercent: 2.5,
      sgstPercent: 0,
      igstPercent: 5.0,
      hsnCode: '18069010',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (prod) => {
    setSelectedProduct(prod);
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
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (selectedProduct) {
        await productsAPI.update(selectedProduct._id, formData);
        toast.success('Product updated successfully!');
      } else {
        await productsAPI.create(formData);
        toast.success('New product SKU created!');
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

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Package className="h-6 w-6 text-sky-500" />
            Products & SKU Catalog
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Manage confectionery SKUs, wholesale MRPs, and GST tax percentages
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-sky-500/20 transition-all hover:brightness-105 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>Add New SKU</span>
        </button>
      </div>

      {/* Filter & Search Bar + Quick Category Chips */}
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3 water-glass rounded-2xl p-3 sm:p-4">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-sky-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by SKU name, category, or pack type..."
              className="w-full rounded-xl border border-sky-200/90 bg-white/95 py-2 pl-10 pr-4 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 shadow-sm"
            />
          </form>

          <div className="hidden md:flex items-center gap-3 w-full md:w-auto">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full md:w-44 rounded-xl border border-sky-200/90 bg-white/95 py-2 px-3 text-xs font-semibold text-slate-700 focus:border-sky-500 focus:outline-none shadow-sm"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={packTypeFilter}
              onChange={(e) => setPackTypeFilter(e.target.value)}
              className="w-full md:w-44 rounded-xl border border-sky-200/90 bg-white/95 py-2 px-3 text-xs font-semibold text-slate-700 focus:border-sky-500 focus:outline-none shadow-sm"
            >
              <option value="">All Pack Types</option>
              {packTypes.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* PhonePe / Google Pay Style Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none px-1">
          <button
            type="button"
            onClick={() => setCategoryFilter('')}
            className={`flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-2xs ${
              !categoryFilter
                ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                : 'bg-white/90 text-slate-600 hover:bg-sky-50 border border-sky-100'
            }`}
          >
            All SKUs
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`flex-shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all shadow-2xs ${
                categoryFilter === cat
                  ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/30'
                  : 'bg-white/90 text-slate-600 hover:bg-sky-50 border border-sky-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Catalog: Mobile Cards + Desktop Table */}
      <div className="water-glass rounded-2xl overflow-hidden shadow-lg">
        {/* MOBILE VIEW: PhonePe / Google Pay Item Cards */}
        <div className="block md:hidden divide-y divide-sky-100/70 p-2">
          {loading ? (
            <div className="py-12 text-center text-slate-500">
              <div className="flex justify-center items-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                <span className="text-xs">Loading SKUs...</span>
              </div>
            </div>
          ) : products.length > 0 ? (
            products.map((prod) => (
              <div
                key={prod._id}
                className="p-3.5 bg-white/60 rounded-xl my-2 border border-sky-100/60 shadow-xs space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900 truncate">
                        {prod.name}
                      </span>
                      <span className="rounded-md bg-sky-100 px-2 py-0.2 text-[10px] font-bold text-sky-800">
                        {prod.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                      <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                        {prod.packType}
                      </span>
                      <span>•</span>
                      <span className="font-mono text-slate-400">
                        HSN: {prod.hsnCode || '18069010'}
                      </span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="font-mono text-base font-black text-sky-700">
                      Rs. {Number(prod.mrp || 0).toFixed(2)}
                    </p>
                    <span className="text-[10px] font-bold text-slate-400 block">
                      per {prod.unit || 'Box'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-sky-50 text-xs">
                  <div className="text-[10.5px] text-slate-500 font-medium">
                    CGST: <span className="font-bold text-slate-700">{prod.cgstPercent}%</span> | IGST:{' '}
                    <span className="font-bold text-slate-700">{prod.igstPercent}%</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(prod)}
                      className="flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100 transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProduct(prod);
                        setIsDeleteModalOpen(true);
                      }}
                      className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                      title="Delete Product"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              No products found matching your filters.
            </div>
          )}
        </div>

        {/* DESKTOP VIEW: Full Data Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sky-100 bg-sky-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3.5 pl-5">SKU Name</th>
                <th className="py-3.5">Category</th>
                <th className="py-3.5">Pack Type</th>
                <th className="py-3.5">Unit</th>
                <th className="py-3.5 text-right">Wholesale MRP</th>
                <th className="py-3.5 text-center">CGST %</th>
                <th className="py-3.5 text-center">IGST %</th>
                <th className="py-3.5">HSN Code</th>
                <th className="py-3.5 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100/70">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <div className="flex justify-center items-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                      <span>Loading SKUs...</span>
                    </div>
                  </td>
                </tr>
              ) : products.length > 0 ? (
                products.map((prod) => (
                  <tr
                    key={prod._id}
                    className="hover:bg-sky-50/30 transition-colors"
                  >
                    <td className="py-3.5 pl-5 font-bold text-slate-900">
                      {prod.name}
                    </td>
                    <td className="py-3.5">
                      <span className="inline-block rounded-md bg-sky-100 px-2.5 py-0.5 text-xs font-bold text-sky-800 border border-sky-200">
                        {prod.category}
                      </span>
                    </td>
                    <td className="py-3.5 text-slate-700 font-semibold">
                      {prod.packType}
                    </td>
                    <td className="py-3.5 text-slate-500 text-xs font-medium">
                      {prod.unit}
                    </td>
                    <td className="py-3.5 text-right font-mono font-black text-slate-900 text-base">
                      Rs. {Number(prod.mrp).toFixed(2)}
                    </td>
                    <td className="py-3.5 text-center font-mono text-xs text-slate-600 font-semibold">
                      {prod.cgstPercent}%
                    </td>
                    <td className="py-3.5 text-center font-mono text-xs text-slate-600 font-semibold">
                      {prod.igstPercent}%
                    </td>
                    <td className="py-3.5 font-mono text-xs text-slate-500">
                      {prod.hsnCode || '18069010'}
                    </td>
                    <td className="py-3.5 pr-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(prod)}
                          title="Edit Product"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-sky-50 hover:text-sky-600 transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedProduct(prod);
                            setIsDeleteModalOpen(true);
                          }}
                          title="Delete Product"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-sm text-slate-500">
                    No products found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Product Modal (Bottom Sheet on Mobile) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/30 backdrop-blur-sm">
          <div className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-2xl border border-sky-100 bg-white p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-sky-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {selectedProduct ? 'Edit Product SKU' : 'Add New Product SKU'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    SKU / Product Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g. Choco 24, Vanila Jar"
                    className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-sm text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Category *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    placeholder="e.g. Choco, Vanila, Coffee"
                    className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-sm text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Pack Type *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.packType}
                    onChange={(e) =>
                      setFormData({ ...formData, packType: e.target.value })
                    }
                    placeholder="e.g. 24-pack, Jar, Jumbo, Pilo"
                    className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-sm text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                    placeholder="Boxes"
                    className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-sm text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Wholesale MRP (Rs.) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.mrp}
                    onChange={(e) =>
                      setFormData({ ...formData, mrp: e.target.value })
                    }
                    placeholder="e.g. 480.00"
                    className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-sm font-mono font-bold text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    CGST Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.cgstPercent}
                    onChange={(e) =>
                      setFormData({ ...formData, cgstPercent: e.target.value })
                    }
                    className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-sm font-mono font-bold text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    IGST Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.igstPercent}
                    onChange={(e) =>
                      setFormData({ ...formData, igstPercent: e.target.value })
                    }
                    className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-sm font-mono font-bold text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    HSN Code
                  </label>
                  <input
                    type="text"
                    value={formData.hsnCode}
                    onChange={(e) =>
                      setFormData({ ...formData, hsnCode: e.target.value })
                    }
                    placeholder="18069010"
                    className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-sm font-mono text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none"
                  />
                </div>
              </div>

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
                  disabled={saving}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 px-5 py-2 text-sm font-bold text-white shadow-md shadow-sky-500/20 hover:brightness-105 disabled:opacity-50"
                >
                  {saving ? (
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <span>Save SKU</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Bottom Sheet on Mobile) */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/30 backdrop-blur-sm">
          <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl border border-sky-100 bg-white p-6 shadow-2xl text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">Deactivate SKU?</h3>
            <p className="mt-2 text-xs text-slate-500">
              Are you sure you want to remove{' '}
              <span className="font-bold text-slate-800">
                {selectedProduct?.name}
              </span>
              ? Existing invoices referencing this SKU will keep their historical record.
            </p>

            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 sm:flex-none rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={saving}
                className="flex-1 sm:flex-none rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-rose-500 shadow-md shadow-rose-500/20 disabled:opacity-50"
              >
                {saving ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductList;
