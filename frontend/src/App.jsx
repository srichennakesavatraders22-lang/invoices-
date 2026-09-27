import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster, ToastBar, toast } from 'react-hot-toast';
import { X } from 'lucide-react';

import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/common/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

// Pages
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import ProductList from './pages/Products/ProductList';
import CustomerList from './pages/Customers/CustomerList';
import InvoiceList from './pages/Invoices/InvoiceList';
import CreateEditInvoice from './pages/Invoices/CreateEditInvoice';
import InvoiceDetail from './pages/Invoices/InvoiceDetail';
import CompanySettings from './pages/Settings/CompanySettings';
import ExpensesList from './pages/Expenses/ExpensesList';

export const App = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0f172a',
              color: '#f8fafc',
              border: '1px solid #1e293b',
              fontSize: '13px',
              maxWidth: '400px',
            },
            success: { iconTheme: { primary: '#22c55e', secondary: '#0f172a' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#0f172a' } },
          }}
        >
          {(t) => (
            <div
              onTouchStart={(e) => { t.startX = e.touches[0].clientX; }}
              onTouchEnd={(e) => {
                const diffX = e.changedTouches[0].clientX - t.startX;
                // Swipe left or right by at least 50px dismisses the toast
                if (Math.abs(diffX) > 50) toast.dismiss(t.id);
              }}
              style={{
                opacity: t.visible ? 1 : 0,
                transition: 'opacity 0.2s',
                animation: t.visible ? 'custom-enter 0.2s ease-out' : 'custom-exit 0.2s ease-in',
              }}
            >
              <ToastBar toast={t}>
                {({ icon, message }) => (
                  <>
                    {icon}
                    <div className="flex-1 whitespace-pre-wrap">{message}</div>
                    {t.type !== 'loading' && (
                      <button
                        onClick={() => toast.dismiss(t.id)}
                        className="ml-2 flex-shrink-0 rounded p-1 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </>
                )}
              </ToastBar>
            </div>
          )}
        </Toaster>

        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Application Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={
              <NotificationProvider>
                <AppLayout />
              </NotificationProvider>
            }>
              <Route path="/" element={<Dashboard />} />
              <Route path="/invoices" element={<InvoiceList />} />
              <Route path="/invoices/new" element={<CreateEditInvoice />} />
              <Route path="/invoices/:id" element={<InvoiceDetail />} />
              <Route path="/invoices/:id/edit" element={<CreateEditInvoice />} />
              <Route path="/products" element={<ProductList />} />
              <Route path="/customers" element={<CustomerList />} />
              <Route path="/expenses" element={<ExpensesList />} />
              <Route path="/settings" element={<CompanySettings />} />
            </Route>
          </Route>

          {/* Catch all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
};

export default App;
