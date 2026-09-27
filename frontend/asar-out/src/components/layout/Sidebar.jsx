import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Package,
  Users,
  Building2,
  LogOut,
  ReceiptText,
  Droplets,
  Lock,
  Unlock,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/invoices', label: 'Invoices', icon: FileText },
  { to: '/products', label: 'Products & SKUs', icon: Package },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/settings', label: 'Company Profile', icon: Building2 },
];

export const Sidebar = ({ isOpen, onClose, isLocked, onToggleLock }) => {
  const { user, logout } = useAuth();

  // Show backdrop when open in modal mode or on mobile screens
  const showBackdrop = isOpen && (!isLocked || (typeof window !== 'undefined' && window.innerWidth < 1024));

  return (
    <>
      {/* Modal Drawer Backdrop */}
      {showBackdrop && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-xs transition-opacity duration-300"
          title="Click to close sidebar"
        />
      )}

      <aside
        id="sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-72 sm:w-64 max-w-[85vw] flex-col justify-between border-r border-sky-100 bg-white/95 backdrop-blur-2xl shadow-[4px_0_25px_rgba(14,165,233,0.08)] transition-all duration-300 ease-in-out ${
          isLocked
            ? isOpen
              ? 'lg:static lg:translate-x-0'
              : '-translate-x-full lg:-ml-64'
            : isOpen
              ? 'translate-x-0'
              : '-translate-x-full'
        }`}
      >
        {/* Brand Header & Lock Toggle Control */}
        <div className="p-4 border-b border-sky-100/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-sky-400 via-teal-400 to-emerald-400 text-white shadow-md shadow-sky-500/20">
                <ReceiptText className="h-5 w-5 stroke-[2.3]" />
              </div>
              <div>
                <h1 className="text-xs font-black tracking-tight text-slate-850 line-clamp-1">
                  SRI CHENNA KESAVA
                </h1>
                <p className="text-[10px] font-bold text-sky-600 flex items-center gap-1">
                  <Droplets className="h-2.5 w-2.5 fill-sky-500" />
                  Wholesale ERP
                </p>
              </div>
            </div>

            {/* Close Toggle Button */}
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-sky-50 hover:text-slate-700 transition-colors"
              title="Close Sidebar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Advanced Lock Toggle System (Desktop only) */}
          <div className="mt-3 hidden lg:flex items-center justify-between rounded-xl bg-sky-50/70 p-2 border border-sky-200/60">
            <div className="flex items-center gap-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-md ${
                  isLocked
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-amber-100 text-amber-700 border border-amber-300'
                }`}
              >
                {isLocked ? (
                  <Lock className="h-3 w-3" />
                ) : (
                  <Unlock className="h-3 w-3" />
                )}
              </div>
              <div className="text-[10px]">
                <span className="font-bold text-slate-800 block leading-tight">
                  {isLocked ? 'Pinned Mode' : 'Modal Drawer'}
                </span>
                <span className="text-[9px] text-slate-500">
                  {isLocked ? 'Locked in layout' : 'Slide-in modal'}
                </span>
              </div>
            </div>

            <button
              onClick={onToggleLock}
              className={`rounded-lg px-2.5 py-1 text-[10px] font-bold transition-all shadow-xs ${
                isLocked
                  ? 'bg-white text-sky-700 border border-sky-200 hover:bg-sky-50'
                  : 'bg-amber-500 text-white hover:bg-amber-600'
              }`}
              title={isLocked ? 'Click to switch to Modal Drawer' : 'Click to Pin Sidebar'}
            >
              {isLocked ? 'Unlock' : 'Lock'}
            </button>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
          <p className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
            Main Navigation
          </p>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => {
                if (!isLocked || (typeof window !== 'undefined' && window.innerWidth < 1024)) {
                  onClose();
                }
              }}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-gradient-to-r from-sky-50 to-teal-50/80 text-sky-700 border border-sky-200/90 shadow-xs'
                    : 'text-slate-600 hover:bg-sky-50/50 hover:text-slate-900'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Card & Logout */}
        <div className="border-t border-sky-100 p-3">
          <div className="flex items-center justify-between rounded-xl bg-sky-50/60 p-2.5 border border-sky-100">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white font-bold text-sky-600 shadow-xs border border-sky-100 text-xs">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="max-w-[100px]">
                <p className="text-[11px] font-bold text-slate-850 truncate">
                  {user?.name || 'User'}
                </p>
                <span className="inline-block rounded-full bg-sky-100 px-1.5 py-0.2 text-[9px] font-bold text-sky-700">
                  {user?.role || 'Admin'}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              title="Log Out"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
