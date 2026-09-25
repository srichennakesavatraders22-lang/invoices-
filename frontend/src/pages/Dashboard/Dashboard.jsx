import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  Package,
  Users,
  FileText,
  Plus,
  ArrowUpRight,
  Droplets,
} from 'lucide-react';
import { dashboardAPI } from '../../api/apiClient';

export const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await dashboardAPI.getStats();
      if (res.success && res.data) {
        setStats(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setLoading(false);
    }
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
          <p className="text-sm font-medium text-slate-500">Loading wholesale metrics...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Invoiced This Month',
      value: `Rs. ${formatINR(stats?.totalInvoicedThisMonth)}`,
      subtext: `${stats?.thisMonthCount || 0} invoices generated`,
      icon: TrendingUp,
      gradient: 'from-emerald-400 via-teal-400 to-cyan-500',
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      textColor: 'text-emerald-700',
    },
    {
      title: 'Pending Receivables',
      value: `Rs. ${formatINR(stats?.outstandingAmount)}`,
      subtext: `${stats?.pendingInvoicesCount || 0} unpaid / draft invoices`,
      icon: Clock,
      gradient: 'from-amber-400 to-orange-400',
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      textColor: 'text-amber-700',
    },
    {
      title: 'Total Invoices Issued',
      value: stats?.totalInvoicesCount || 0,
      subtext: `${stats?.totalPaidInvoices || 0} settled & paid`,
      icon: FileText,
      gradient: 'from-sky-400 to-blue-500',
      badgeBg: 'bg-sky-50 text-sky-700 border-sky-200',
      textColor: 'text-sky-700',
    },
    {
      title: 'Catalog SKUs / Stores',
      value: `${stats?.totalProductsCount || 0} SKUs`,
      subtext: `${stats?.totalCustomersCount || 0} active retail clients`,
      icon: Package,
      gradient: 'from-indigo-400 to-purple-400',
      badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      textColor: 'text-indigo-700',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-3xl font-black tracking-tight text-slate-900">
            Wholesale Operations Dashboard
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm font-medium text-slate-500">
            Real-time tax billing, product sales volume & receivables tracker
          </p>
        </div>

        <div className="hidden sm:flex items-center gap-3">
          <Link
            to="/invoices/new"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-sky-500/20 transition-all hover:brightness-105 active:scale-[0.98]"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Generate Tax Invoice</span>
          </Link>
        </div>
      </div>

      {/* PhonePe / Google Pay Style Quick Actions Row */}
      <div className="water-glass rounded-2xl p-3 sm:p-4">
        <p className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 mb-2.5 px-1">
          Quick Shortcuts
        </p>
        <div className="grid grid-cols-4 gap-2 sm:gap-4 text-center">
          <Link
            to="/invoices/new"
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-sky-50/60 active:scale-95 transition-all group"
          >
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 via-teal-500 to-emerald-500 text-white shadow-md shadow-sky-500/25 group-hover:scale-105 transition-transform">
              <Plus className="h-5 w-5 stroke-[2.8]" />
            </div>
            <span className="text-[11px] font-bold text-slate-700 leading-tight">
              New Bill
            </span>
          </Link>

          <Link
            to="/invoices"
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-sky-50/60 active:scale-95 transition-all group"
          >
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 text-white shadow-md shadow-indigo-500/25 group-hover:scale-105 transition-transform">
              <FileText className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-700 leading-tight">
              All Bills
            </span>
          </Link>

          <Link
            to="/products"
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-sky-50/60 active:scale-95 transition-all group"
          >
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-md shadow-orange-500/25 group-hover:scale-105 transition-transform">
              <Package className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-700 leading-tight">
              SKUs / Items
            </span>
          </Link>

          <Link
            to="/customers"
            className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-sky-50/60 active:scale-95 transition-all group"
          >
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 text-white shadow-md shadow-pink-500/25 group-hover:scale-105 transition-transform">
              <Users className="h-5 w-5" />
            </div>
            <span className="text-[11px] font-bold text-slate-700 leading-tight">
              Retail Stores
            </span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid (Responsive 2-col on mobile, 4-col on desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
        {statCards.map((card, i) => (
          <div
            key={i}
            className="water-glass water-glass-interactive rounded-2xl p-3.5 sm:p-5 flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 line-clamp-1">
                {card.title}
              </span>
              <div
                className={`flex h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr ${card.gradient} text-white shadow-md`}
              >
                <card.icon className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.3]" />
              </div>
            </div>
            <div className="mt-2 sm:mt-4">
              <h2 className="text-base sm:text-2xl font-black tracking-tight text-slate-900 line-clamp-1">
                {card.value}
              </h2>
              <p className={`mt-0.5 text-[10.5px] sm:text-xs font-semibold ${card.textColor} line-clamp-1`}>
                {card.subtext}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid: Recent Invoices & Top Selling SKUs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Recent Invoices Table / Mobile Cards */}
        <div className="lg:col-span-8 water-glass rounded-2xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 border-b border-sky-100 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Recent Tax Invoices</h2>
              <p className="text-[11px] sm:text-xs text-slate-500">Latest wholesale orders and dispatched bills</p>
            </div>
            <Link
              to="/invoices"
              className="flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 transition-colors bg-sky-50 px-2.5 py-1 rounded-lg"
            >
              <span>View All</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* MOBILE VIEW: PhonePe / Google Pay Style Transaction List */}
          <div className="block md:hidden divide-y divide-sky-100/70">
            {stats?.recentInvoices && stats.recentInvoices.length > 0 ? (
              stats.recentInvoices.map((inv) => {
                const customerName =
                  inv.customerSnapshot?.businessName ||
                  inv.customerSnapshot?.name ||
                  'Retail Customer';
                const initial = customerName.charAt(0).toUpperCase();

                return (
                  <Link
                    key={inv._id}
                    to={`/invoices/${inv._id}`}
                    className="flex items-center justify-between py-3 px-1 active:bg-sky-50/70 rounded-xl transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-400 to-teal-500 font-extrabold text-white text-sm shadow-sm">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs text-slate-900 truncate">
                          {customerName}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                          <span className="font-mono font-semibold text-sky-700">
                            {inv.invoiceNumber}
                          </span>
                          <span>•</span>
                          <span>{inv.invoiceDate}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="font-mono text-xs font-black text-slate-900">
                        Rs. {formatINR(inv.grandTotal)}
                      </p>
                      <span
                        className={`inline-block mt-0.5 rounded-md px-1.5 py-0.2 text-[9.5px] font-bold ${
                          inv.status === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : inv.status === 'Sent'
                            ? 'bg-sky-100 text-sky-800'
                            : inv.status === 'Draft'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="py-6 text-center text-xs text-slate-500">
                No invoices found. Click "New Bill" to generate one.
              </div>
            )}
          </div>

          {/* DESKTOP TABLE VIEW */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-sky-100 bg-sky-50/40 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="pb-3 pl-2">Invoice No</th>
                  <th className="pb-3">Customer / Store</th>
                  <th className="pb-3 text-center">Date</th>
                  <th className="pb-3 text-right">Grand Total</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 pr-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100/70">
                {stats?.recentInvoices && stats.recentInvoices.length > 0 ? (
                  stats.recentInvoices.map((inv) => (
                    <tr
                      key={inv._id}
                      className="group transition-colors hover:bg-sky-50/40"
                    >
                      <td className="py-3.5 pl-2 font-mono text-xs font-black text-sky-600">
                        <Link to={`/invoices/${inv._id}`} className="hover:underline">
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="py-3.5">
                        <p className="font-bold text-slate-900 truncate max-w-[180px]">
                          {inv.customerSnapshot?.businessName || inv.customerSnapshot?.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {inv.totalQty} Boxes
                        </p>
                      </td>
                      <td className="py-3.5 text-center text-xs font-mono text-slate-600 font-medium">
                        {inv.invoiceDate}
                      </td>
                      <td className="py-3.5 text-right font-mono font-bold text-slate-900">
                        Rs. {formatINR(inv.grandTotal)}
                      </td>
                      <td className="py-3.5 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                            inv.status === 'Paid'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : inv.status === 'Sent'
                              ? 'bg-sky-100 text-sky-800 border border-sky-200'
                              : inv.status === 'Draft'
                              ? 'bg-slate-100 text-slate-700 border border-slate-200'
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 pr-2 text-right">
                        <Link
                          to={`/invoices/${inv._id}`}
                          className="rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 transition-colors"
                        >
                          View / Print
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-slate-500">
                      No invoices found. Click "Generate Tax Invoice" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top-Selling SKUs Section */}
        <div className="lg:col-span-4 water-glass rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5 border-b border-sky-100 pb-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Top Selling SKUs</h2>
                <p className="text-xs text-slate-500">By quantity sold in boxes</p>
              </div>
              <Package className="h-5 w-5 text-sky-500" />
            </div>

            <div className="space-y-3">
              {stats?.topSkus && stats.topSkus.length > 0 ? (
                stats.topSkus.map((sku, index) => (
                  <div
                    key={sku._id}
                    className="flex items-center justify-between rounded-xl bg-white/80 p-3 border border-sky-100 shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 font-mono text-xs font-black text-sky-700">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{sku._id}</p>
                        <p className="text-[11px] text-slate-500">
                          Revenue: Rs. {formatINR(sku.totalRevenue)}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black font-mono text-sky-600">
                        {sku.totalQty}
                      </span>
                      <span className="text-[10px] text-slate-500 ml-1 font-semibold">Boxes</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-500">
                  SKU volume metrics will populate as invoices are created.
                </div>
              )}
            </div>
          </div>

          {/* Wholesale Info Card */}
          <div className="mt-6 rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50/80 to-teal-50/60 p-4 text-xs text-slate-600">
            <p className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="h-4 w-4 text-teal-600" />
              Tax Compliance Ready
            </p>
            <p className="leading-relaxed text-slate-500">
              Standard Intrastate confectionery CGST rates and Interstate IGST
              auto-switch are strictly enforced server-side.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
