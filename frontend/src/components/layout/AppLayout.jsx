import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import MobileBottomNav from './MobileBottomNav';

export const AppLayout = () => {
  // Sidebar lock mode: 'true' = pinned statically in layout; 'false' = floating modal drawer
  const [isSidebarLocked, setIsSidebarLocked] = useState(() => {
    const saved = localStorage.getItem('sidebar_locked');
    return saved !== null ? saved === 'true' : false; // Default to flexible drawer mode
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    // If locked, start open; if drawer mode, start closed so invoice creator has maximum space
    const saved = localStorage.getItem('sidebar_locked');
    return saved === 'true';
  });

  const toggleSidebarLock = () => {
    const nextLocked = !isSidebarLocked;
    setIsSidebarLocked(nextLocked);
    localStorage.setItem('sidebar_locked', String(nextLocked));
    if (nextLocked) {
      setIsSidebarOpen(true);
    }
  };

  const toggleSidebarOpen = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div className="flex h-screen overflow-hidden water-bg-ambient relative">
      {/* Decorative Water Glass ambient orbs in background */}
      <div className="absolute top-[-10%] left-[20%] w-[500px] h-[500px] rounded-full bg-sky-200/40 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] rounded-full bg-teal-100/50 blur-[140px] pointer-events-none" />

      {/* Sidebar with Advanced Lock and Modal Drawer System */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isLocked={isSidebarLocked}
        onToggleLock={toggleSidebarLock}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden relative z-10 min-w-0 transition-all duration-300">
        <Navbar
          onToggleSidebar={toggleSidebarOpen}
          isSidebarLocked={isSidebarLocked}
          onToggleSidebarLock={toggleSidebarLock}
        />

        <main className="flex-1 overflow-y-auto p-3 sm:p-4 pb-28 lg:pb-4">
          <div className="mx-auto max-w-full">
            <Outlet />
          </div>
        </main>

        {/* PhonePe / Google Pay Style Mobile Bottom Navigation Dock */}
        <MobileBottomNav />
      </div>
    </div>
  );
};

export default AppLayout;
