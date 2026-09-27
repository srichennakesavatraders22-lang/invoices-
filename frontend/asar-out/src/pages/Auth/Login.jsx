import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ReceiptText, Lock, Mail, ArrowRight, Droplets } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export const Login = () => {
  const [email, setEmail] = useState('admin@chennakesava.com');
  const [password, setPassword] = useState('admin123');
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (error) {
      toast.error(error.message || 'Invalid credentials');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center water-bg-ambient p-4 relative overflow-hidden">
      {/* Background water orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sky-200/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-teal-100/60 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md rounded-3xl border border-white/90 bg-white/85 p-5 sm:p-8 shadow-[0_20px_60px_-15px_rgba(14,165,233,0.15)] backdrop-blur-2xl">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-7">
          <div className="mx-auto flex h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-400 via-teal-400 to-emerald-400 text-white shadow-lg shadow-sky-500/25">
            <ReceiptText className="h-6 w-6 sm:h-7 sm:w-7 stroke-[2.3]" />
          </div>
          <h2 className="mt-3.5 text-xl sm:text-2xl font-black tracking-tight text-slate-900">
            SRI CHENNA KESAVA TRADERS
          </h2>
          <p className="mt-1 text-[11px] sm:text-xs font-bold text-sky-600 uppercase tracking-wider flex items-center justify-center gap-1">
            <Droplets className="h-3 w-3 fill-sky-500" />
            Wholesale Invoice & ERP Portal
          </p>
        </div>

        {/* Demo Credentials Alert */}
        <div className="mb-5 rounded-2xl border border-sky-100 bg-sky-50/80 p-3 text-xs text-slate-700 shadow-inner">
          <p className="font-bold text-sky-800 mb-0.5">Demo Credentials Loaded:</p>
          <p className="font-mono text-[11px] text-slate-600 truncate">Email: <span className="text-sky-700 font-bold">admin@chennakesava.com</span></p>
          <p className="font-mono text-[11px] text-slate-600">Pass: <span className="text-sky-700 font-bold">admin123</span></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="email"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@chennakesava.com"
                className="w-full rounded-xl border border-sky-200/90 bg-white/90 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 shadow-sm transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-sky-200/90 bg-white/90 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 shadow-sm transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-teal-500 to-emerald-500 py-3 text-sm font-bold text-white shadow-lg shadow-sky-500/25 transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-50 mt-2"
          >
            {submitting ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs font-medium text-slate-500">
          Need a staff account?{' '}
          <Link to="/register" className="font-bold text-sky-600 hover:underline">
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
