import React, { useState, useEffect } from 'react';
import { Menu, Calendar, Clock, Lock, Unlock } from 'lucide-react';

export const Navbar = ({ onToggleSidebar, isSidebarLocked, onToggleSidebarLock }) => {
  const [currentDateTime, setCurrentDateTime] = useState({
    date: '',
    time: '',
  });

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dd = String(now.getDate()).padStart(2, '0');
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const yyyy = now.getFullYear();

      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;

      setCurrentDateTime({
        date: `${dd}-${mm}-${yyyy}`,
        time: `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`,
      });
    };

    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-sky-100/80 bg-white/80 px-4 sm:px-6 backdrop-blur-xl shadow-xs">
      <div className="flex items-center gap-2.5">
        {/* Toggle Sidebar Hamburger Button (Always functional) */}
        <button
          onClick={onToggleSidebar}
          className="flex items-center justify-center rounded-xl p-2 text-slate-600 hover:bg-sky-50 hover:text-sky-700 transition-colors border border-sky-150 bg-white shadow-xs"
          title="Toggle Sidebar Open / Close"
        >
          <Menu className="h-4.5 w-4.5" />
        </button>

        {/* Sidebar Mode Quick Toggle Button (desktop/tablet) */}
        <button
          onClick={onToggleSidebarLock}
          className="hidden sm:flex items-center gap-1.5 rounded-xl border border-sky-150 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 shadow-xs hover:bg-sky-50 transition-colors"
          title={isSidebarLocked ? 'Pinned mode. Click to unlock into modal drawer' : 'Modal drawer mode. Click to pin'}
        >
          {isSidebarLocked ? (
            <>
              <Lock className="h-3 w-3 text-sky-600" />
              <span>Pinned</span>
            </>
          ) : (
            <>
              <Unlock className="h-3 w-3 text-amber-500" />
              <span>Drawer</span>
            </>
          )}
        </button>

        {/* Brand/Status indicator for mobile */}
        <div className="flex sm:hidden items-center gap-1.5 text-[11px] font-bold text-slate-700">
          <span className="flex h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
          <span className="truncate max-w-[130px]">Sri Chenna Kesava</span>
        </div>

        <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 ml-2">
          <span className="flex h-2 w-2 rounded-full bg-teal-400 animate-pulse" />
          <span className="font-semibold text-slate-700 text-xs">Live GST Engine</span>
          <span className="text-slate-300">/</span>
          <span className="text-sky-600 font-mono font-bold text-xs">SCKT/2026-27</span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Date & Time Widget (Responsive: time only on xs, full on sm+) */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 rounded-xl bg-white px-2 sm:px-3 py-1 border border-sky-100 shadow-xs text-xs font-mono">
          <div className="hidden sm:flex items-center gap-1.5 text-slate-600 font-medium">
            <Calendar className="h-3 w-3 text-sky-500" />
            <span className="text-[11px]">{currentDateTime.date}</span>
          </div>
          <span className="hidden sm:inline text-slate-200">|</span>
          <div className="flex items-center gap-1.5 text-teal-600 font-bold">
            <Clock className="h-3 w-3" />
            <span className="text-[11px]">{currentDateTime.time}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
