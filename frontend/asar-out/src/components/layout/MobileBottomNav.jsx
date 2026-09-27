import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Package,
  Users,
  Building2,
  Plus,
} from 'lucide-react';

export const MobileBottomNav = () => {
  const location = useLocation();

  // Highlight FAB if on /invoices/new
  const isCreateInvoice = location.pathname === '/invoices/new';

  return (
    <nav
      id="mobile-bottom-nav"
      aria-label="Mobile Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 block lg:hidden bg-white/95 backdrop-blur-xl border-t border-sky-100/90 shadow-[0_-8px_25px_rgba(14,165,233,0.12)] px-2 py-1.5 transition-all"
    >
      <div className="flex items-center justify-around max-w-lg mx-auto relative">
        {/* 1. Dashboard */}
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 ${
              isActive
                ? 'text-sky-600 font-bold scale-105'
                : 'text-slate-500 hover:text-slate-800'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`p-1 rounded-xl transition-all ${
                  isActive ? 'bg-sky-100 text-sky-600' : ''
                }`}
              >
                <LayoutDashboard className="h-5 w-5" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">Home</span>
            </>
          )}
        </NavLink>

        {/* 2. Invoices List */}
        <NavLink
          to="/invoices"
          end
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 ${
              isActive
                ? 'text-sky-600 font-bold scale-105'
                : 'text-slate-500 hover:text-slate-800'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`p-1 rounded-xl transition-all ${
                  isActive ? 'bg-sky-100 text-sky-600' : ''
                }`}
              >
                <FileText className="h-5 w-5" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">Invoices</span>
            </>
          )}
        </NavLink>

        {/* 3. CENTER ELEVATED PHONEPE / GPAY ACTION FAB (+ NEW BILL) */}
        <div className="relative -top-5 flex flex-col items-center">
          <NavLink
            to="/invoices/new"
            className={`flex h-13 w-13 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-500 via-teal-500 to-emerald-500 text-white shadow-[0_8px_20px_rgba(14,165,233,0.38)] active:scale-95 transition-all border-2 border-white ${
              isCreateInvoice ? 'ring-4 ring-sky-300' : ''
            }`}
            title="Create New Tax Invoice"
          >
            <Plus className="h-7 w-7 stroke-[2.8]" />
          </NavLink>
          <span className="text-[9.5px] font-extrabold text-sky-700 tracking-tight mt-0.5">
            + New Bill
          </span>
        </div>

        {/* 4. Products */}
        <NavLink
          to="/products"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 ${
              isActive
                ? 'text-sky-600 font-bold scale-105'
                : 'text-slate-500 hover:text-slate-800'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`p-1 rounded-xl transition-all ${
                  isActive ? 'bg-sky-100 text-sky-600' : ''
                }`}
              >
                <Package className="h-5 w-5" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">Catalog</span>
            </>
          )}
        </NavLink>

        {/* 5. Customers */}
        <NavLink
          to="/customers"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 ${
              isActive
                ? 'text-sky-600 font-bold scale-105'
                : 'text-slate-500 hover:text-slate-800'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`p-1 rounded-xl transition-all ${
                  isActive ? 'bg-sky-100 text-sky-600' : ''
                }`}
              >
                <Users className="h-5 w-5" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">Stores</span>
            </>
          )}
        </NavLink>

        {/* 6. Settings */}
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all duration-200 ${
              isActive
                ? 'text-sky-600 font-bold scale-105'
                : 'text-slate-500 hover:text-slate-800'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div
                className={`p-1 rounded-xl transition-all ${
                  isActive ? 'bg-sky-100 text-sky-600' : ''
                }`}
              >
                <Building2 className="h-5 w-5" />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">Profile</span>
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
