import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp, Clock, CheckCircle2, Package, Users, FileText, Plus, ArrowUpRight,
  AlertTriangle, ShieldAlert, RefreshCw, BarChart3, Download,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { dashboardAPI, invoicesAPI } from '../../api/apiClient';
import toast from 'react-hot-toast';

// ─── Colours ────────────────────────────────────────────────────────────────────
const PIE_COLORS = ['#0ea5e9', '#14b8a6', '#f59e0b', '#8b5cf6', '#ec4899', '#10b981', '#f97316', '#6366f1'];

const formatINR = (val) =>
  Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const formatShortINR = (val) => {
  const n = Number(val || 0);
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toFixed(0)}`;
};

// ─── EXPIRY ALERT BADGE ─────────────────────────────────────────────────────────
const ExpiryBadge = ({ days }) => {
  if (days == null) return null;
  if (days < 0) return <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[9px] font-bold">EXPIRED</span>;
  if (days <= 7) return <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[9px] font-bold">{days}d left</span>;
  if (days <= 15) return <span className="rounded-full bg-orange-100 text-orange-700 px-2 py-0.5 text-[9px] font-bold">{days}d left</span>;
  return <span className="rounded-full bg-yellow-100 text-yellow-700 px-2 py-0.5 text-[9px] font-bold">{days}d left</span>;
};

export const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [initialLoad, setInitialLoad] = useState(true); // only show full-page spinner on first load
  const [statsLoading, setStatsLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [activeChart, setActiveChart] = useState('revenue');
  const [activePreset, setActivePreset] = useState('all');
  const [analyticsDateRange, setAnalyticsDateRange] = useState({ startDate: '', endDate: '' });

  // Helper: get current IST date as YYYY-MM-DD
  const getISTDate = (offsetDays = 0) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  };

  // Predefined quick filter presets
  const PRESETS = [
    { key: 'all', label: 'All' },
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'this_week', label: 'This Week' },
    { key: 'last_week', label: 'Last Week' },
    { key: 'this_month', label: 'This Month' },
    { key: 'last_month', label: 'Last Month' },
    { key: 'this_year', label: 'This Year' },
  ];

  const applyPreset = (key) => {
    setActivePreset(key);
    const today = getISTDate();
    const yesterday = getISTDate(-1);
    const now = new Date();
    const istNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));

    if (key === 'all') {
      setAnalyticsDateRange({ startDate: '', endDate: '' });
    } else if (key === 'today') {
      setAnalyticsDateRange({ startDate: today, endDate: today });
    } else if (key === 'yesterday') {
      setAnalyticsDateRange({ startDate: yesterday, endDate: yesterday });
    } else if (key === 'this_week') {
      const day = istNow.getDay(); // 0=Sun
      const startOfWeek = new Date(istNow);
      startOfWeek.setDate(istNow.getDate() - day);
      const s = startOfWeek.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      setAnalyticsDateRange({ startDate: s, endDate: today });
    } else if (key === 'last_week') {
      const day = istNow.getDay();
      const startOfLastWeek = new Date(istNow);
      startOfLastWeek.setDate(istNow.getDate() - day - 7);
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(startOfLastWeek.getDate() + 6);
      setAnalyticsDateRange({
        startDate: startOfLastWeek.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
        endDate: endOfLastWeek.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
      });
    } else if (key === 'this_month') {
      const s = `${istNow.getFullYear()}-${String(istNow.getMonth() + 1).padStart(2, '0')}-01`;
      setAnalyticsDateRange({ startDate: s, endDate: today });
    } else if (key === 'last_month') {
      const firstOfThisMonth = new Date(istNow.getFullYear(), istNow.getMonth(), 1);
      const lastOfLastMonth = new Date(firstOfThisMonth - 1);
      const firstOfLastMonth = new Date(lastOfLastMonth.getFullYear(), lastOfLastMonth.getMonth(), 1);
      setAnalyticsDateRange({
        startDate: firstOfLastMonth.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
        endDate: lastOfLastMonth.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
      });
    } else if (key === 'this_year') {
      setAnalyticsDateRange({ startDate: `${istNow.getFullYear()}-01-01`, endDate: today });
    }
  };

  const fetchStats = useCallback(async (startDate, endDate) => {
    try {
      setStatsLoading(true);
      const params = {};
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      const res = await dashboardAPI.getStats(params);
      if (res.success && res.data) setStats(res.data);
    } catch (err) {
      toast.error('Failed to load dashboard stats');
    } finally {
      setStatsLoading(false);
      setInitialLoad(false);
    }
  }, []);

  const fetchAnalytics = useCallback(async (startDate, endDate) => {
    try {
      setAnalyticsLoading(true);
      setAnalytics(null);
      const params = {};
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }
      const res = await dashboardAPI.getAnalytics(params);
      if (res.success && res.data) setAnalytics(res.data);
    } catch { }
    finally { setAnalyticsLoading(false); }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchAnalytics();
  }, [fetchStats, fetchAnalytics]);

  // Re-fetch analytics and stats when date range changes
  useEffect(() => {
    if (analyticsDateRange.startDate && analyticsDateRange.endDate) {
      fetchStats(analyticsDateRange.startDate, analyticsDateRange.endDate);
      fetchAnalytics(analyticsDateRange.startDate, analyticsDateRange.endDate);
    } else if (!analyticsDateRange.startDate && !analyticsDateRange.endDate) {
      fetchStats();
      fetchAnalytics();
    }
  }, [analyticsDateRange.startDate, analyticsDateRange.endDate, fetchStats, fetchAnalytics]);

  const handleExportExcel = () => {
    window.open(invoicesAPI.getExportUrl(), '_blank');
  };

  if (initialLoad) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
          <p className="text-sm font-medium text-slate-500">Loading wholesale metrics...</p>
        </div>
      </div>
    );
  }

  const dateLabel = activePreset === 'all' ? 'All Time' : PRESETS.find(p => p.key === activePreset)?.label || 'Selected Range';

  const statCards = [
    {
      title: `Invoiced (${dateLabel})`,
      value: `Rs. ${formatINR(stats?.totalInvoicedThisMonth)}`,
      subtext: `${stats?.thisMonthCount || 0} invoices generated`,
      icon: TrendingUp,
      gradient: 'from-emerald-400 via-teal-400 to-cyan-500',
      textColor: 'text-emerald-700',
    },
    {
      title: `Pending Receivables (${dateLabel})`,
      value: `Rs. ${formatINR(stats?.outstandingAmount)}`,
      subtext: `${stats?.pendingInvoicesCount || 0} unpaid / draft invoices`,
      icon: Clock,
      gradient: 'from-amber-400 to-orange-400',
      textColor: 'text-amber-700',
    },
    {
      title: `Invoices Issued (${dateLabel})`,
      value: stats?.totalInvoicesCount || 0,
      subtext: `${stats?.totalPaidInvoices || 0} settled & paid`,
      icon: FileText,
      gradient: 'from-sky-400 to-blue-500',
      textColor: 'text-sky-700',
    },
    {
      title: 'Total Stock Value (Current)',
      value: `Rs. ${formatINR(stats?.totalStockValue)}`,
      subtext: `${stats?.totalStock || 0} total boxes in stock`,
      icon: Package,
      gradient: 'from-indigo-400 to-purple-400',
      textColor: 'text-indigo-700',
    },
  ];

  const now = new Date();

  return (
    <div className="space-y-3 sm:space-y-4 pb-8">
      {/* Page Header */}
      <div className="water-glass rounded-2xl border border-sky-200 p-3 sm:p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-lg sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
              Wholesale Operations Dashboard
            </h1>
            <p className="mt-0.5 text-[10px] sm:text-sm font-medium text-slate-500">
              Real-time tax billing, stock tracking & receivables
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchStats(); fetchAnalytics(); }}
              className="flex items-center gap-1.5 rounded-xl border border-sky-200 bg-white px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-50 shadow-xs transition-all"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 shadow-xs transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export Excel</span>
            </button>
            <Link
              to="/invoices/new"
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-sky-500/20 transition-all hover:brightness-105 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span className="hidden sm:inline">New Invoice</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ─── ALERT BANNER ROW ──────────────────────────────────────────────── */}
      <div className="flex overflow-x-auto sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-3 pb-2 sm:pb-0 scrollbar-none snap-x">
        {stats?.expiredProducts > 0 && (
          <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 p-3 flex-shrink-0 w-[260px] sm:w-auto snap-start">
            <ShieldAlert className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-black text-red-700">{stats.expiredProducts} Product(s) EXPIRED</p>
              <p className="text-[10px] text-red-500">Immediate action required</p>
            </div>
          </div>
        )}
        {stats?.expiringIn7 > 0 && (
          <div className="flex items-center gap-3 rounded-xl bg-orange-50 border border-orange-200 p-3 flex-shrink-0 w-[260px] sm:w-auto snap-start">
            <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-black text-orange-700">{stats.expiringIn7} Expiring in 7 days</p>
              <p className="text-[10px] text-orange-500">Review expiry dates</p>
            </div>
          </div>
        )}
        {stats?.lowStockCount > 0 && (
          <div className="flex items-center gap-3 rounded-xl bg-yellow-50 border border-yellow-200 p-3 flex-shrink-0 w-[260px] sm:w-auto snap-start">
            <Package className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <div>
              <p className="text-xs font-black text-yellow-700">{stats.lowStockCount} Low Stock Alert(s)</p>
              <p className="text-[10px] text-yellow-600">Below minimum threshold</p>
            </div>
          </div>
        )}
        {stats?.overdueInvoices?.length > 0 && (
          <div className="flex items-center gap-3 rounded-xl bg-rose-50 border border-rose-200 p-3 flex-shrink-0 w-[260px] sm:w-auto snap-start">
            <Clock className="h-5 w-5 text-rose-500 flex-shrink-0" />
            <div>
              <p className="text-xs font-black text-rose-700">{stats.overdueInvoices.length} Overdue Invoice(s)</p>
              <p className="text-[10px] text-rose-500">Payment pending</p>
            </div>
          </div>
        )}
        {/* Today's Expenses Small Banner */}
        <div className="flex items-center gap-3 rounded-xl bg-pink-50 border border-pink-200 p-3 flex-shrink-0 w-[260px] sm:w-auto snap-start">
          <TrendingUp className="h-5 w-5 text-pink-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-[10px] font-bold text-pink-600">Expenses ({dateLabel})</p>
            <p className="text-sm font-black font-mono text-pink-700">Rs. {formatINR(stats?.todayExpensesAmount)}</p>
          </div>
          <Link to="/expenses" className="text-[9px] font-bold text-pink-700 bg-pink-100 border border-pink-200 px-2 py-1 rounded shadow-sm hover:bg-pink-200 transition-colors">
            Manage
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3.5">
        {statCards.map((card, i) => (
          <div key={i} className="water-glass water-glass-interactive rounded-2xl p-3 sm:p-4 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-2">
              <span className="text-[9.5px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 leading-tight">{card.title}</span>
              <div className={`flex h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr ${card.gradient} text-white shadow-md`}>
                <card.icon className="h-4 w-4 sm:h-5 sm:w-5 stroke-[2.3]" />
              </div>
            </div>
            <div className="mt-2 sm:mt-4">
              <h2 className="text-sm sm:text-2xl font-black tracking-tight text-slate-900 leading-tight">{card.value}</h2>
              <p className={`mt-0.5 text-[9px] sm:text-xs font-semibold ${card.textColor} leading-tight`}>{card.subtext}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ─── ANALYTICS CHARTS SECTION ─────────────────────────────────────── */}
      <div className="water-glass rounded-2xl p-3 sm:p-5 space-y-3 sm:space-y-4">
        <div className="flex flex-col gap-3 border-b border-sky-100 pb-3">
          {/* Top row: title + chart tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-sky-500" />
              <h2 className="text-base font-bold text-slate-900">Analytics & Insights</h2>
              {(analyticsDateRange.startDate && analyticsDateRange.endDate) && (
                <span className="text-[10px] font-bold text-sky-600 bg-sky-50 border border-sky-200 rounded-full px-2 py-0.5">
                  {analyticsDateRange.startDate} → {analyticsDateRange.endDate}
                </span>
              )}
            </div>
            {/* Chart Tab Switcher */}
            <div className="flex items-center gap-1 bg-white border border-sky-100 rounded-xl p-1 shadow-xs overflow-x-auto">
              {[
                { key: 'revenue', label: 'Revenue' },
                { key: 'category', label: 'Category' },
                { key: 'customer', label: 'Customers' },
                { key: 'payment', label: 'Payments' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveChart(key)}
                  className={`flex-shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${activeChart === key ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-600 hover:text-sky-600 hover:bg-sky-50'
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Second row: preset buttons + custom date range */}
          <div className="flex overflow-x-auto items-center gap-2 scrollbar-none pb-1">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => applyPreset(p.key)}
                className={`flex-shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold border transition-all ${activePreset === p.key
                    ? 'bg-sky-500 text-white border-sky-500 shadow-sm'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-sky-400 hover:text-sky-600'
                  }`}
              >
                {p.label}
              </button>
            ))}
            {/* Divider */}
            <span className="hidden sm:inline text-slate-300 text-sm">|</span>
            {/* Custom date range */}
            <div className="flex-shrink-0 flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2 py-1">
              <input
                type="date"
                value={analyticsDateRange.startDate}
                onChange={(e) => {
                  setActivePreset('custom');
                  setAnalyticsDateRange((prev) => ({ ...prev, startDate: e.target.value }));
                }}
                className="bg-transparent text-[10px] font-semibold text-slate-700 outline-none w-[95px]"
              />
              <span className="text-slate-400 text-[10px] font-bold">to</span>
              <input
                type="date"
                value={analyticsDateRange.endDate}
                onChange={(e) => {
                  setActivePreset('custom');
                  setAnalyticsDateRange((prev) => ({ ...prev, endDate: e.target.value }));
                }}
                min={analyticsDateRange.startDate}
                className="bg-transparent text-[10px] font-semibold text-slate-700 outline-none w-[95px]"
              />
              {(analyticsDateRange.startDate || analyticsDateRange.endDate) && (
                <button
                  onClick={() => applyPreset('all')}
                  className="text-slate-400 hover:text-red-500 transition-colors text-sm leading-none"
                  title="Clear"
                >×</button>
              )}
            </div>
          </div>
        </div>

        {analyticsLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
          </div>
        ) : (
          <div className="h-56 sm:h-64">
            {/* Revenue Bar Chart - multi-color with smart grouping */}
            {activeChart === 'revenue' && analytics?.monthlyData?.length > 0 && (
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-1 flex-shrink-0">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {analytics.groupBy === 'hour' ? 'Hourly Breakdown'
                      : analytics.groupBy === 'day' ? 'Daily Breakdown'
                        : analytics.groupBy === 'week' ? 'Weekly Breakdown'
                          : 'Monthly Breakdown'}
                  </span>
                  <span className="text-[10px] text-slate-400">{analytics.monthlyData.length} data point{analytics.monthlyData.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={analytics.monthlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <defs>
                        {analytics.monthlyData.map((_, i) => (
                          <linearGradient key={i} id={`barColor${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={PIE_COLORS[i % PIE_COLORS.length]} stopOpacity={1} />
                            <stop offset="100%" stopColor={PIE_COLORS[i % PIE_COLORS.length]} stopOpacity={0.7} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#64748b' }} interval={0} angle={analytics.monthlyData.length > 8 ? -30 : 0} textAnchor={analytics.monthlyData.length > 8 ? 'end' : 'middle'} height={analytics.monthlyData.length > 8 ? 40 : 20} />
                      <YAxis tickFormatter={formatShortINR} tick={{ fontSize: 10, fill: '#64748b' }} />
                      <Tooltip
                        formatter={(value) => [`Rs. ${formatINR(value)}`, 'Revenue']}
                        contentStyle={{ fontSize: 11, borderRadius: 10, border: '1px solid #e0f2fe' }}
                      />
                      <Bar dataKey="revenue" radius={[6, 6, 0, 0]} maxBarSize={50}>
                        {analytics.monthlyData.map((_, i) => (
                          <Cell key={i} fill={`url(#barColor${i})`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Category Pie Chart */}
            {activeChart === 'category' && analytics?.categorySales?.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.categorySales}
                    dataKey="totalRevenue"
                    nameKey="_id"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ _id, percent }) => `${_id} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {analytics.categorySales.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `Rs. ${formatINR(v)}`} />
                  <Legend formatter={(v) => v || 'Unknown'} />
                </PieChart>
              </ResponsiveContainer>
            )}

            {/* Customer Revenue Bar Chart */}
            {activeChart === 'customer' && analytics?.customerRevenue?.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={analytics.customerRevenue.map((c) => ({ ...c, name: (c._id || 'Unknown').slice(0, 15) }))}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
                >
                  <defs>
                    {analytics.customerRevenue.map((_, i) => (
                      <linearGradient key={i} id={`custColor${i}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={PIE_COLORS[i % PIE_COLORS.length]} stopOpacity={0.8} />
                        <stop offset="100%" stopColor={PIE_COLORS[i % PIE_COLORS.length]} stopOpacity={1} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                  <XAxis type="number" tickFormatter={formatShortINR} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} width={80} />
                  <Tooltip formatter={(v) => `Rs. ${formatINR(v)}`} />
                  <Bar dataKey="totalRevenue" radius={[0, 6, 6, 0]} maxBarSize={30}>
                    {analytics.customerRevenue.map((_, i) => (
                      <Cell key={i} fill={`url(#custColor${i})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Payment Method Pie Chart */}
            {activeChart === 'payment' && analytics?.paymentMethodStats?.length > 0 && (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.paymentMethodStats}
                    dataKey="totalAmount"
                    nameKey="_id"
                    cx="50%"
                    cy="50%"
                    innerRadius="45%"
                    outerRadius="75%"
                    labelLine={false}
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                      if (percent < 0.05) return null;
                      const RADIAN = Math.PI / 180;
                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                      const x = cx + radius * Math.cos(-midAngle * RADIAN);
                      const y = cy + radius * Math.sin(-midAngle * RADIAN);
                      return (
                        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-[10px] font-bold">
                          {`${(percent * 100).toFixed(0)}%`}
                        </text>
                      );
                    }}
                  >
                    {analytics.paymentMethodStats.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => `Rs. ${formatINR(v)}`} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}

            {/* Empty state */}
            {((activeChart === 'revenue' && !analytics?.monthlyData?.length) ||
              (activeChart === 'category' && !analytics?.categorySales?.length) ||
              (activeChart === 'customer' && !analytics?.customerRevenue?.length) ||
              (activeChart === 'payment' && !analytics?.paymentMethodStats?.length)) && (
                <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                  No data available yet. Create invoices to see analytics.
                </div>
              )}
          </div>
        )}
      </div>

      {/* ─── MAIN GRID ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recent Invoices */}
        <div className="lg:col-span-8 water-glass rounded-2xl p-3 sm:p-5">
          <div className="flex items-center justify-between mb-4 border-b border-sky-100 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Recent Tax Invoices</h2>
              <p className="text-[11px] sm:text-xs text-slate-500">Latest wholesale orders and dispatched bills</p>
            </div>
            <Link to="/invoices" className="flex items-center gap-1 text-xs font-bold text-sky-600 hover:text-sky-700 transition-colors bg-sky-50 px-2.5 py-1 rounded-lg">
              <span>View All</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-sky-100 bg-sky-50/40 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="pb-3 pl-2">Invoice No</th>
                  <th className="pb-3">Customer / Store</th>
                  <th className="pb-3 text-center">Date</th>
                  <th className="pb-3 text-center">Payment</th>
                  <th className="pb-3 text-right">Grand Total</th>
                  <th className="pb-3 text-center">Status</th>
                  <th className="pb-3 pr-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100/70">
                {stats?.recentInvoices?.length > 0 ? (
                  stats.recentInvoices.map((inv) => (
                    <tr key={inv._id} className="group transition-colors hover:bg-sky-50/40">
                      <td className="py-3.5 pl-2 font-mono text-xs font-black text-sky-600">
                        <Link to={`/invoices/${inv._id}`} className="hover:underline">{inv.invoiceNumber}</Link>
                      </td>
                      <td className="py-3.5">
                        <p className="font-bold text-slate-900 truncate max-w-[180px]">
                          {inv.customerSnapshot?.businessName || inv.customerSnapshot?.name}
                        </p>
                        <p className="text-xs text-slate-500">{inv.totalQty} Boxes</p>
                      </td>
                      <td className="py-3.5 text-center text-xs font-mono text-slate-600">{inv.invoiceDate}</td>
                      <td className="py-3.5 text-center">
                        {inv.paymentMethod ? (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{inv.paymentMethod}</span>
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3.5 text-right font-mono font-bold text-slate-900">
                        Rs. {formatINR(inv.grandTotal)}
                      </td>
                      <td className="py-3.5 text-center">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : inv.status === 'Sent' ? 'bg-sky-100 text-sky-800 border border-sky-200'
                              : inv.status === 'Draft' ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                : inv.status === 'Overdue' ? 'bg-red-100 text-red-800 border border-red-200'
                                  : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 pr-2 text-right">
                        <Link to={`/invoices/${inv._id}`} className="rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100 transition-colors">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-slate-500">
                      No invoices found. Click "New Invoice" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile list */}
          <div className="block md:hidden divide-y divide-sky-100/70">
            {stats?.recentInvoices?.map((inv) => (
              <Link key={inv._id} to={`/invoices/${inv._id}`} className="flex items-center justify-between py-3 px-1">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-400 to-teal-500 font-extrabold text-white text-sm">
                    {(inv.customerSnapshot?.businessName || 'C').charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-slate-900 truncate">
                      {inv.customerSnapshot?.businessName || inv.customerSnapshot?.name}
                    </p>
                    <span className="font-mono font-semibold text-sky-700 text-[10px]">{inv.invoiceNumber}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-mono text-xs font-black text-slate-900">Rs. {formatINR(inv.grandTotal)}</p>
                  <span className={`inline-block mt-0.5 rounded-md px-1.5 text-[9.5px] font-bold ${inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
                    }`}>{inv.status}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right Column: Top SKUs + Tax Info */}
        <div className="lg:col-span-4 space-y-4">
          {/* Top Selling SKUs */}
          <div className="water-glass rounded-2xl p-3 sm:p-5">
            <div className="flex items-center justify-between mb-4 border-b border-sky-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Top Selling SKUs</h2>
                <p className="text-xs text-slate-500">By quantity sold (boxes)</p>
              </div>
              <Package className="h-5 w-5 text-sky-500" />
            </div>
            <div className="space-y-2">
              {stats?.topSkus?.length > 0 ? (
                stats.topSkus.map((sku, index) => (
                  <div key={sku._id} className="flex items-center justify-between rounded-xl bg-white/80 p-2.5 border border-sky-100 shadow-xs">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sky-100 font-mono text-xs font-black text-sky-700">
                        #{index + 1}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">{sku._id}</p>
                        <p className="text-[10px] text-slate-500">Rs. {formatINR(sku.totalRevenue)}</p>
                      </div>
                    </div>
                    <span className="text-xs font-black font-mono text-sky-600">{sku.totalQty} Boxes</span>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-xs text-slate-400">No sales data yet</p>
              )}
            </div>
          </div>



          {/* Tax Compliance Info */}
          <div className="rounded-xl border border-sky-100 bg-gradient-to-br from-sky-50/80 to-teal-50/60 p-4 text-xs text-slate-600">
            <p className="font-bold text-slate-800 flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="h-4 w-4 text-teal-600" />
              Tax Compliance Ready
            </p>
            <p className="leading-relaxed text-slate-500">
              CGST intrastate & IGST interstate rates auto-switch enforced server-side.
            </p>
          </div>
        </div>
      </div>

      {/* ─── BOTTOM ALERTS ROW ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 items-stretch">
        {/* Expiry Alerts */}
        <div className="water-glass rounded-2xl p-3 sm:p-5 flex flex-col h-full">
          <div className="flex items-center justify-between mb-3 border-b border-red-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Expiry Alerts
              </h2>
              <p className="text-xs text-slate-500">Products expiring within 30 days</p>
            </div>
            <Link to="/products" className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded-lg">View All</Link>
          </div>
          <div className="flex-1 overflow-y-auto min-h-[200px] space-y-2">
            {stats?.expiryAlerts?.length > 0 ? (
              stats.expiryAlerts.map((p) => {
                const daysLeft = Math.ceil((new Date(p.expiryDate) - now) / (1000 * 60 * 60 * 24));
                return (
                  <div key={p._id} className="flex items-center justify-between rounded-xl bg-orange-50/60 p-2.5 border border-orange-100 shadow-xs">
                    <div>
                      <p className="text-xs font-bold text-slate-900">{p.name}</p>
                      <p className="text-[10px] text-slate-500">{p.stock} {p.unit} in stock</p>
                    </div>
                    <ExpiryBadge days={daysLeft} />
                  </div>
                );
              })
            ) : (
              <p className="py-4 text-center text-xs text-slate-400 font-medium">No impending expirations</p>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="water-glass rounded-2xl p-3 sm:p-5 flex flex-col h-full">
          <div className="flex items-center justify-between mb-3 border-b border-yellow-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Package className="h-4 w-4 text-yellow-600" />
                Low Stock
              </h2>
              <p className="text-xs text-slate-500">Below minimum threshold</p>
            </div>
            <Link to="/products" className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded-lg">Manage</Link>
          </div>
          <div className="flex-1 overflow-y-auto min-h-[200px] space-y-2">
            {stats?.lowStockProducts?.length > 0 ? (
              stats.lowStockProducts.map((p) => (
                <div key={p._id} className="flex items-center justify-between rounded-xl bg-yellow-50/60 p-2.5 border border-yellow-100 shadow-xs">
                  <div>
                    <p className="text-xs font-bold text-slate-900">{p.name}</p>
                    <p className="text-[10px] text-slate-500">Min: {p.minStock} {p.unit}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${p.stock === 0 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                    {p.stock === 0 ? 'OUT' : p.stock} {p.unit}
                  </span>
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-xs text-slate-400 font-medium">Stock levels are healthy</p>
            )}
          </div>
        </div>

        {/* Slow Movers */}
        <div className="water-glass rounded-2xl p-3 sm:p-5 flex flex-col h-full">
          <div className="flex items-center justify-between mb-3 border-b border-purple-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-purple-500" />
                Slow Movers
              </h2>
              <p className="text-xs text-slate-500">Products with lowest turnover</p>
            </div>
            <Link to="/products" className="text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded-lg">Analyze</Link>
          </div>
          <div className="flex-1 overflow-y-auto min-h-[200px] space-y-2">
            {stats?.slowMovers?.length > 0 ? (
              stats.slowMovers.map((sku, index) => (
                <div key={sku._id} className="flex items-center justify-between rounded-xl bg-purple-50/60 p-2.5 border border-purple-100 shadow-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-100 font-mono text-xs font-black text-purple-700">
                      #{index + 1}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{sku._id}</p>
                      <p className="text-[10px] text-slate-500">Rs. {formatINR(sku.totalRevenue)}</p>
                    </div>
                  </div>
                  <span className="text-xs font-black font-mono text-purple-600">{sku.totalQty} Boxes</span>
                </div>
              ))
            ) : (
              <p className="py-4 text-center text-xs text-slate-400 font-medium">All products moving optimally</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
