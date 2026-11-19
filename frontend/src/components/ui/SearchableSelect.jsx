import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check, X } from 'lucide-react';

export default function SearchableSelect({
  value,
  onChange,
  options = [],
  placeholder = '-- Choose --',
  searchPlaceholder = 'Search...',
  emptyText = 'No matching items found',
  className = '',
  buttonClassName = '',
  title = 'Select Option',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const searchInputRef = useRef(null);
  const containerRef = useRef(null);

  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  const handleClose = (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
    setIsOpen(false);
  };

  // Manage desktop positioning and focus
  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      updateCoords();

      // Only listen to window-level scroll without capture so modal list scrolling does not trigger re-renders
      const handleWindowScroll = () => {
        updateCoords();
      };
      window.addEventListener('scroll', handleWindowScroll);
      window.addEventListener('resize', handleWindowScroll);

      // On desktop, auto-focus search input. On mobile, do NOT force focus
      // so virtual keyboard doesn't open immediately and block scrolling of the list
      const isMobile = window.innerWidth < 640;
      if (!isMobile) {
        setTimeout(() => {
          if (searchInputRef.current) {
            searchInputRef.current.focus();
          }
        }, 50);
      }

      return () => {
        window.removeEventListener('scroll', handleWindowScroll);
        window.removeEventListener('resize', handleWindowScroll);
      };
    }
  }, [isOpen]);

  // Close on outside click (for desktop)
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        !e.target.closest?.('.searchable-select-portal')
      ) {
        handleClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filteredOptions = options.filter((opt) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const searchString = opt.searchString
      ? opt.searchString.toLowerCase()
      : `${opt.label || ''} ${opt.sublabel || ''} ${opt.badge || ''}`.toLowerCase();
    return searchString.includes(term);
  });

  const handleSelect = (val) => {
    onChange(val);
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    e.preventDefault();
    onChange('');
  };

  return (
    <div className={`relative w-full ${className}`} ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-1.5 rounded-xl border border-sky-200/90 bg-white px-2.5 py-1.5 text-left text-xs font-semibold text-slate-800 shadow-2xs hover:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 transition-all ${buttonClassName}`}
      >
        <div className="flex-1 min-w-0">
          {selectedOption ? (
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-bold text-slate-900 truncate">
                {selectedOption.label}
              </span>
              {selectedOption.badge && (
                <span className="shrink-0 rounded-md bg-sky-50 px-1.5 py-0.2 text-[9.5px] font-bold text-sky-700 border border-sky-100">
                  {selectedOption.badge}
                </span>
              )}
            </div>
          ) : (
            <span className="text-slate-400">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {selectedOption && (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              className="p-0.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
              title="Clear selection"
            >
              <X className="h-3.5 w-3.5" />
            </span>
          )}
          <ChevronDown
            className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-150 ${
              isOpen ? 'rotate-180 text-sky-600' : ''
            }`}
          />
        </div>
      </button>

      {/* Dropdown / Mobile Modal Sheet via React Portal directly into document.body */}
      {isOpen &&
        createPortal(
          <div className="searchable-select-portal">
            {/* Mobile backdrop */}
            <div
              className="fixed inset-0 z-[99998] bg-slate-950/60 backdrop-blur-xs sm:hidden"
              onClick={handleClose}
            />

            {/* Mobile Bottom Sheet Modal */}
            <div 
              className="fixed inset-x-0 bottom-0 z-[99999] max-h-[85vh] flex flex-col rounded-t-3xl bg-white shadow-2xl border-t border-sky-100 sm:hidden animate-in slide-in-from-bottom duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with Title & X button */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/90 rounded-t-3xl">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  {title}
                </span>
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1.5 -mr-1 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 active:bg-slate-300 transition-colors"
                  title="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Search Bar */}
              <div className="p-3 border-b border-sky-100 bg-sky-50/40">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-sky-500" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full rounded-xl border border-sky-200 bg-white pl-9 pr-9 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-none"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable Items List - Standard touch scrolling with onClick only (no pointerdown) */}
              <div 
                className="overflow-y-auto divide-y divide-slate-100 flex-1 overscroll-contain touch-pan-y pb-6"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((opt) => {
                    const isSelected = String(opt.value) === String(value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelect(opt.value)}
                        className={`w-full text-left px-4 py-3 flex items-start justify-between gap-2 transition-colors ${
                          isSelected ? 'bg-sky-50/80 text-sky-950 font-bold' : 'hover:bg-slate-50 text-slate-800 active:bg-sky-50/50'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-xs ${isSelected ? 'font-black text-sky-900' : 'font-bold'}`}>
                              {opt.label}
                            </span>
                            {opt.badge && (
                              <span className="rounded bg-sky-100 px-1.5 py-0.2 text-[9px] font-bold text-sky-800 shrink-0">
                                {opt.badge}
                              </span>
                            )}
                          </div>
                          {opt.sublabel && (
                            <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5 font-normal">
                              {opt.sublabel}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-xs text-slate-400 italic">
                    {emptyText}
                  </div>
                )}
              </div>
            </div>

            {/* Desktop Floating Dropdown */}
            <div
              style={{
                position: 'fixed',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                width: `${Math.max(coords.width, 260)}px`,
                zIndex: 99999,
              }}
              className="hidden sm:flex max-h-72 flex-col rounded-xl bg-white shadow-2xl border border-sky-200 animate-in fade-in zoom-in-95 duration-100 overflow-hidden"
            >
              <div className="p-2 border-b border-sky-100 bg-sky-50/50">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-sky-500" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={searchPlaceholder}
                    className="w-full rounded-lg border border-sky-200 bg-white pl-8 pr-7 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-sky-500 focus:outline-none"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-y-auto divide-y divide-slate-100 flex-1">
                {filteredOptions.length > 0 ? (
                  filteredOptions.map((opt) => {
                    const isSelected = String(opt.value) === String(value);
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelect(opt.value)}
                        className={`w-full text-left px-3 py-2 flex items-start justify-between gap-2 transition-colors ${
                          isSelected ? 'bg-sky-50/80 text-sky-950 font-bold' : 'hover:bg-slate-50 text-slate-800'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-xs ${isSelected ? 'font-black text-sky-900' : 'font-bold'}`}>
                              {opt.label}
                            </span>
                            {opt.badge && (
                              <span className="rounded bg-sky-100 px-1.5 py-0.2 text-[9px] font-bold text-sky-800 shrink-0">
                                {opt.badge}
                              </span>
                            )}
                          </div>
                          {opt.sublabel && (
                            <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5 font-normal">
                              {opt.sublabel}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="h-4 w-4 text-sky-600 shrink-0 mt-0.5" />
                        )}
                      </button>
                    );
                  })
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400 italic">
                    {emptyText}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
