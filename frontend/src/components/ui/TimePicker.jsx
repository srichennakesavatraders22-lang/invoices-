import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Clock, X } from 'lucide-react';

export default function TimePicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('hours'); // 'hours' or 'minutes'
  const [period, setPeriod] = useState('AM');
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const popupRef = useRef(null);

  useEffect(() => {
    if (value) {
      const match = value.match(/(\d{1,2}):(\d{2})\s?(AM|PM)?/i);
      if (match) {
        let h = parseInt(match[1], 10);
        let m = parseInt(match[2], 10);
        let p = match[3] ? match[3].toUpperCase() : (h >= 12 ? 'PM' : 'AM');
        
        if (!match[3]) {
          if (h >= 12) {
            p = 'PM';
            if (h > 12) h -= 12;
          } else {
            p = 'AM';
            if (h === 0) h = 12;
          }
        }
        
        setHour(h);
        setPeriod(p);
        setMinute(m);
      }
    }
  }, [value]);

  const updateCoords = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const popupWidth = 270;
      let left = rect.left;
      if (left + popupWidth > window.innerWidth - 10) {
        left = window.innerWidth - popupWidth - 10;
      }
      setCoords({
        top: rect.bottom + 6,
        left: Math.max(10, left),
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      updateCoords();
      window.addEventListener('scroll', updateCoords, true);
      window.addEventListener('resize', updateCoords);
      return () => {
        window.removeEventListener('scroll', updateCoords, true);
        window.removeEventListener('resize', updateCoords);
      };
    }
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(event.target) &&
        popupRef.current &&
        !popupRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleClose = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setIsOpen(false);
  };

  const handleTimeSelect = () => {
    const timeString = getDisplayTime();
    if (onChange) onChange(timeString);
    setIsOpen(false);
  };

  const getDisplayTime = () => {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;
  };

  const updateAndNotify = (newH = hour, newM = minute, newP = period) => {
    const str = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')} ${newP}`;
    if (onChange) onChange(str);
  };

  const renderClockFace = () => {
    const isHours = mode === 'hours';
    const total = isHours ? 12 : 60;
    const items = [];
    
    const radius = 75;
    const center = 90;
    const step = isHours ? 1 : 5;

    for (let i = 0; i < total; i += step) {
      const val = isHours ? (i === 0 ? 12 : i) : i;
      const angle = ((i / total) * 360 - 90) * (Math.PI / 180);
      const x = center + radius * Math.cos(angle);
      const y = center + radius * Math.sin(angle);
      const isSelected = isHours ? hour === val : minute === val;

      items.push(
        <button
          key={`clock-${isHours ? 'h' : 'm'}-${i}`}
          type="button"
          onClick={() => {
            if (isHours) {
              setHour(val);
              updateAndNotify(val, minute, period);
              setMode('minutes');
            } else {
              setMinute(val);
              updateAndNotify(hour, val, period);
            }
          }}
          className={`absolute flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold transition-all ${
            isSelected
              ? 'bg-sky-600 text-white shadow-md scale-110 font-black'
              : 'text-slate-700 hover:bg-sky-100'
          }`}
          style={{ left: `${x}px`, top: `${y}px` }}
        >
          {val}
        </button>
      );
    }

    return (
      <div className="relative h-[180px] w-[180px] rounded-full border border-sky-150 bg-slate-50/70 p-2 shadow-inner">
        <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-sky-600 shadow-xs z-10" />
        {(() => {
          const activeVal = isHours ? hour : minute;
          const activeTotal = isHours ? 12 : 60;
          const angle = (activeVal / activeTotal) * 360 - 90;
          return (
            <div
              className="absolute left-1/2 top-1/2 h-0.5 origin-left bg-sky-600"
              style={{
                width: `${radius - 12}px`,
                transform: `rotate(${angle}deg)`,
                opacity: 0.6
              }}
            />
          );
        })()}
        {items}
      </div>
    );
  };

  return (
    <div className="relative w-full" ref={triggerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-xl border border-sky-200 bg-white py-1.5 px-3 text-xs font-mono font-bold text-slate-800 shadow-2xs hover:border-sky-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-200 transition-all"
      >
        <span className="flex items-center gap-1.5">
          <span className="text-slate-900">{String(hour).padStart(2, '0')}:{String(minute).padStart(2, '0')}</span>
          <span className="rounded bg-sky-100 text-sky-800 font-black text-[10px] px-1.5 py-0.2">{period}</span>
        </span>
        <Clock className="h-3.5 w-3.5 text-sky-600" />
      </button>

      {/* Popover via React Portal directly into document.body */}
      {isOpen &&
        createPortal(
          <div className="time-picker-portal">
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[99998] bg-slate-950/40 backdrop-blur-xs sm:bg-transparent"
              onPointerDown={handleClose}
              onClick={handleClose}
            />

            {/* Mobile Modal */}
            <div
              ref={popupRef}
              className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[99999] rounded-3xl bg-white p-4 shadow-2xl border border-sky-100 sm:hidden animate-in zoom-in-95 duration-100 max-w-xs mx-auto"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Select Invoice Time
                </span>
                <button
                  type="button"
                  onPointerDown={handleClose}
                  onClick={handleClose}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mb-3 flex items-center justify-between px-1">
                <div className="flex gap-1 text-2xl font-black text-slate-800 tracking-tight">
                  <button 
                    type="button" 
                    onClick={() => setMode('hours')}
                    className={`rounded-lg px-2 py-1 transition-colors ${mode === 'hours' ? 'bg-sky-100 text-sky-700' : 'hover:bg-slate-100 text-slate-400'}`}
                  >
                    {String(hour).padStart(2, '0')}
                  </button>
                  <span className="py-1 text-slate-300 animate-pulse">:</span>
                  <button 
                    type="button" 
                    onClick={() => setMode('minutes')}
                    className={`rounded-lg px-2 py-1 transition-colors ${mode === 'minutes' ? 'bg-sky-100 text-sky-700' : 'hover:bg-slate-100 text-slate-400'}`}
                  >
                    {String(minute).padStart(2, '0')}
                  </button>
                </div>
                <div className="flex gap-1 rounded-lg bg-slate-100 p-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setPeriod('AM');
                      updateAndNotify(hour, minute, 'AM');
                    }}
                    className={`rounded px-2.5 py-1 text-xs font-black transition-all ${period === 'AM' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPeriod('PM');
                      updateAndNotify(hour, minute, 'PM');
                    }}
                    className={`rounded px-2.5 py-1 text-xs font-black transition-all ${period === 'PM' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    PM
                  </button>
                </div>
              </div>

              <div className="mb-3 flex justify-center">
                {renderClockFace()}
              </div>

              <div className="flex justify-between items-center px-1 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {mode === 'hours' ? 'Tap Hour (1-12)' : 'Tap Minute (0-55)'}
                </span>
                <button
                  type="button"
                  onClick={handleTimeSelect}
                  className="rounded-xl bg-sky-600 px-4 py-1.5 text-xs font-bold text-white shadow-md shadow-sky-600/20 hover:bg-sky-700 active:scale-95 transition-all"
                >
                  Done
                </button>
              </div>
            </div>

            {/* Desktop Floating Popover */}
            <div
              ref={popupRef}
              style={{
                position: 'fixed',
                top: `${coords.top}px`,
                left: `${coords.left}px`,
                zIndex: 99999,
              }}
              className="hidden sm:block rounded-2xl bg-white p-3.5 shadow-2xl border border-sky-200 animate-in zoom-in-95 duration-100 w-64"
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <div className="flex gap-1 text-xl font-black text-slate-800 tracking-tight">
                  <button 
                    type="button" 
                    onClick={() => setMode('hours')}
                    className={`rounded-lg px-2 py-0.5 transition-colors ${mode === 'hours' ? 'bg-sky-100 text-sky-700' : 'hover:bg-slate-100 text-slate-400'}`}
                  >
                    {String(hour).padStart(2, '0')}
                  </button>
                  <span className="text-slate-300 animate-pulse">:</span>
                  <button 
                    type="button" 
                    onClick={() => setMode('minutes')}
                    className={`rounded-lg px-2 py-0.5 transition-colors ${mode === 'minutes' ? 'bg-sky-100 text-sky-700' : 'hover:bg-slate-100 text-slate-400'}`}
                  >
                    {String(minute).padStart(2, '0')}
                  </button>
                </div>
                <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setPeriod('AM');
                      updateAndNotify(hour, minute, 'AM');
                    }}
                    className={`rounded px-2 py-0.5 text-xs font-black transition-all ${period === 'AM' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPeriod('PM');
                      updateAndNotify(hour, minute, 'PM');
                    }}
                    className={`rounded px-2 py-0.5 text-xs font-black transition-all ${period === 'PM' ? 'bg-sky-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    PM
                  </button>
                </div>
              </div>

              <div className="mb-2 flex justify-center scale-95 origin-top">
                {renderClockFace()}
              </div>

              <div className="flex justify-between items-center px-1 pt-2 border-t border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {mode === 'hours' ? 'Hour' : 'Minute'}
                </span>
                <button
                  type="button"
                  onClick={handleTimeSelect}
                  className="rounded-xl bg-sky-600 px-3 py-1 text-xs font-bold text-white shadow-md shadow-sky-600/20 hover:bg-sky-700 active:scale-95 transition-all"
                >
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
