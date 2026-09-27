import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  AlertTriangle,
  Phone,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { customersAPI } from '../../api/apiClient';

export const CustomerList = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    businessName: '',
    billingAddress: '',
    shippingAddress: '',
    sameAsBilling: true,
    gstin: '',
    mobile: '',
    email: '',
    isInterState: false,
    state: 'Andhra Pradesh',
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await customersAPI.getAll({
        search: search || undefined,
        limit: 50,
      });
      if (res.success && res.data) {
        setCustomers(res.data);
      }
    } catch (err) {
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCustomers();
  };

  const openAddModal = () => {
    setSelectedCustomer(null);
    setFormData({
      name: '',
      businessName: '',
      billingAddress: '',
      shippingAddress: '',
      sameAsBilling: true,
      gstin: '',
      mobile: '',
      email: '',
      isInterState: false,
      state: 'Andhra Pradesh',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (cust) => {
    setSelectedCustomer(cust);
    setFormData({
      name: cust.name,
      businessName: cust.businessName,
      billingAddress: cust.billingAddress,
      shippingAddress: cust.shippingAddress || cust.billingAddress,
      sameAsBilling: cust.sameAsBilling !== undefined ? cust.sameAsBilling : true,
      gstin: cust.gstin || '',
      mobile: cust.mobile,
      email: cust.email || '',
      isInterState: Boolean(cust.isInterState),
      state: cust.state || 'Andhra Pradesh',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (selectedCustomer) {
        await customersAPI.update(selectedCustomer._id, formData);
        toast.success('Customer updated successfully!');
      } else {
        await customersAPI.create(formData);
        toast.success('New retail customer added!');
      }
      setIsModalOpen(false);
      fetchCustomers();
    } catch (err) {
      toast.error(err.message || 'Error saving customer');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!selectedCustomer) return;
    setSaving(true);
    try {
      await customersAPI.delete(selectedCustomer._id);
      toast.success('Customer removed successfully');
      setIsDeleteModalOpen(false);
      fetchCustomers();
    } catch (err) {
      toast.error(err.message || 'Error removing customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 flex items-center gap-2.5">
            <Users className="h-6 w-6 text-sky-500" />
            Wholesale Customer Accounts
          </h1>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Manage retail stores, GSTIN registrations, and interstate billing rules
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-sky-500/20 transition-all hover:brightness-105 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>Add New Customer</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="water-glass rounded-2xl p-4">
        <form onSubmit={handleSearchSubmit} className="relative w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-sky-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer by store name, contact person, mobile, or GSTIN..."
            className="w-full rounded-xl border border-sky-200/90 bg-white/95 py-2 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 shadow-sm"
          />
        </form>
      </div>

      {/* Customers Directory: Mobile Cards + Desktop Table */}
      <div className="water-glass rounded-2xl overflow-hidden shadow-lg">
        {/* MOBILE VIEW: PhonePe / Google Pay Merchant Contact Cards */}
        <div className="block md:hidden divide-y divide-sky-100/70 p-2">
          {loading ? (
            <div className="py-12 text-center text-slate-500">
              <div className="flex justify-center items-center gap-2">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                <span className="text-xs">Loading retail stores...</span>
              </div>
            </div>
          ) : customers.length > 0 ? (
            customers.map((cust) => {
              const initial = (cust.businessName || cust.name || 'C').charAt(0).toUpperCase();

              return (
                <div
                  key={cust._id}
                  className="p-3.5 bg-white/60 rounded-xl my-2 border border-sky-100/60 shadow-xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-600 font-black text-white text-base shadow-xs">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="font-extrabold text-sm text-slate-900 truncate">
                          {cust.businessName}
                        </p>
                        <p className="text-xs font-semibold text-slate-600">
                          {cust.name}
                        </p>
                        <p className="text-[10.5px] text-slate-400 truncate mt-0.5">
                          {cust.billingAddress}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => openEditModal(cust)}
                        className="rounded-lg p-1.5 text-slate-500 hover:bg-sky-50 hover:text-sky-600 transition-colors"
                        title="Edit Customer"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCustomer(cust);
                          setIsDeleteModalOpen(true);
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
                        title="Delete Customer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-sky-50 text-xs">
                    <div className="flex items-center gap-2">
                      {cust.isInterState ? (
                        <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          IGST (Interstate)
                        </span>
                      ) : (
                        <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          CGST (Intrastate)
                        </span>
                      )}
                      <span className="font-mono text-[10px] text-slate-500">
                        {cust.gstin || 'Unregistered'}
                      </span>
                    </div>

                    {cust.mobile && (
                      <a
                        href={`tel:${cust.mobile}`}
                        className="flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 hover:bg-sky-100 active:scale-95 transition-all"
                      >
                        <Phone className="h-3 w-3" />
                        <span>{cust.mobile}</span>
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-12 text-center text-xs text-slate-500">
              No customers found matching your search.
            </div>
          )}
        </div>

        {/* DESKTOP VIEW: Full Data Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-sky-100 bg-sky-50/50 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th className="py-3.5 pl-5">Business / Store Name</th>
                <th className="py-3.5">Contact Person</th>
                <th className="py-3.5">GSTIN</th>
                <th className="py-3.5">Mobile</th>
                <th className="py-3.5">Tax Regime</th>
                <th className="py-3.5">State</th>
                <th className="py-3.5 pr-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sky-100/70">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <div className="flex justify-center items-center gap-2">
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                      <span>Loading customer list...</span>
                    </div>
                  </td>
                </tr>
              ) : customers.length > 0 ? (
                customers.map((cust) => (
                  <tr
                    key={cust._id}
                    className="hover:bg-sky-50/30 transition-colors"
                  >
                    <td className="py-3.5 pl-5">
                      <p className="font-bold text-slate-900">{cust.businessName}</p>
                      <p className="text-xs text-slate-500 truncate max-w-xs">
                        {cust.billingAddress}
                      </p>
                    </td>
                    <td className="py-3.5 text-slate-700 font-semibold">
                      {cust.name}
                    </td>
                    <td className="py-3.5 font-mono text-xs text-slate-600 font-medium">
                      {cust.gstin || <span className="text-slate-400 italic">Unregistered</span>}
                    </td>
                    <td className="py-3.5 font-mono text-xs text-slate-600 font-medium">
                      {cust.mobile}
                    </td>
                    <td className="py-3.5">
                      {cust.isInterState ? (
                        <span className="inline-block rounded-md bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 border border-amber-200">
                          Interstate (IGST)
                        </span>
                      ) : (
                        <span className="inline-block rounded-md bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 border border-emerald-200">
                          Intrastate (CGST+SGST)
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 text-slate-600 text-xs font-medium">
                      {cust.state || 'Andhra Pradesh'}
                    </td>
                    <td className="py-3.5 pr-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(cust)}
                          title="Edit Customer"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-sky-50 hover:text-sky-600 transition-colors"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedCustomer(cust);
                            setIsDeleteModalOpen(true);
                          }}
                          title="Delete Customer"
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
                  <td colSpan={7} className="py-12 text-center text-sm text-slate-500">
                    No customers found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal (Bottom Sheet on Mobile) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/30 backdrop-blur-sm">
          <div className="relative w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl border border-sky-100 bg-white p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-sky-100 pb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {selectedCustomer ? 'Edit Customer' : 'Add New Customer'}
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
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Store / Business Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.businessName}
                    onChange={(e) =>
                      setFormData({ ...formData, businessName: e.target.value })
                    }
                    placeholder="M/s Example Retail Store"
                    className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-sm text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Contact Person Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Suresh Kumar"
                    className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-sm text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Mobile Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.mobile}
                    onChange={(e) =>
                      setFormData({ ...formData, mobile: e.target.value })
                    }
                    placeholder="+91 90000 00000"
                    className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-sm font-mono text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    GSTIN (15 Digits)
                  </label>
                  <input
                    type="text"
                    value={formData.gstin}
                    onChange={(e) =>
                      setFormData({ ...formData, gstin: e.target.value.toUpperCase() })
                    }
                    placeholder="37XXXXX0000X1ZX"
                    className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-sm font-mono uppercase text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Billing Address *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={formData.billingAddress}
                    onChange={(e) =>
                      setFormData({ ...formData, billingAddress: e.target.value })
                    }
                    placeholder="Main Road, Kadapa, Andhra Pradesh - 516001"
                    className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-sm text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none"
                  />
                </div>

                {/* Same as Billing Checkbox */}
                <div className="col-span-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.sameAsBilling}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sameAsBilling: e.target.checked,
                          shippingAddress: e.target.checked
                            ? formData.billingAddress
                            : formData.shippingAddress,
                        })
                      }
                      className="rounded text-sky-600 h-4 w-4"
                    />
                    <span>Shipping address is the same as Billing address</span>
                  </label>
                </div>

                {!formData.sameAsBilling && (
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      Shipping / Delivery Address
                    </label>
                    <textarea
                      rows={2}
                      value={formData.shippingAddress}
                      onChange={(e) =>
                        setFormData({ ...formData, shippingAddress: e.target.value })
                      }
                      placeholder="Warehouse or shop floor address..."
                      className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-sm text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                )}

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                    placeholder="Andhra Pradesh"
                    className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-sm text-slate-800 shadow-sm focus:border-sky-500 focus:outline-none"
                  />
                </div>

                {/* Interstate supply toggle */}
                <div className="col-span-2 sm:col-span-1 flex flex-col justify-end pb-1">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer bg-sky-50 p-2.5 rounded-xl border border-sky-200">
                    <input
                      type="checkbox"
                      checked={formData.isInterState}
                      onChange={(e) =>
                        setFormData({ ...formData, isInterState: e.target.checked })
                      }
                      className="rounded text-amber-600 h-4 w-4"
                    />
                    <span>Interstate Supply (Apply IGST)</span>
                  </label>
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
                    <span>Save Customer</span>
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
            <h3 className="mt-4 text-lg font-bold text-slate-900">Deactivate Customer?</h3>
            <p className="mt-2 text-xs text-slate-500">
              Are you sure you want to remove{' '}
              <span className="font-bold text-slate-800">
                {selectedCustomer?.businessName}
              </span>
              ? Existing invoices issued to this customer will retain their original data.
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

export default CustomerList;
