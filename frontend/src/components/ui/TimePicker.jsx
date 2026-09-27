import React, { useState, useEffect, useRef } from 'react';
import { Clock, X } from 'lucide-react';

export default function TimePicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('hours'); // 'hours' or 'minutes'
  const [period, setPeriod] = useState('AM');
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const popupRef = useRef(null);

  useEffect(() => {
    if (value) {
      const match = value.match(/(\d{1,2}):(\d{2})\s?(AM|PM)?/i);
      if (match) {
        let h = parseInt(match[1], 10);
        let m = parseInt(match[2], 10);
        let p = match[3] ? match[3].toUpperCase() : (h >= 12 ? 'PM' : 'AM');
        
        // Convert to 12-hour internal state
        if (!match[3]) {
          // It was 24-hour format
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

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleTimeSelect = () => {
    const timeString = getDisplayTime();
    onChange(timeString);
    setIsOpen(false);
  };

  const getDisplayTime = () => {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${period}`;
  };

  const renderClockFace = () => {
    const isHours = mode === 'hours';
    const total = isHours ? 12 : 60;
    const items = [];
    
    // Using standard Tailwind classes h-48 w-48 (192px)
    const radius = 80; // Distance from center to number
    const center = 96; // 192 / 2

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
              setMode('minutes');
            } else {
              setMinute(val);
            }
          }}
          className={`absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xs font-bold transition-all ${
            isSelected
              ? 'bg-purple-600 text-white shadow-md scale-110'
              : 'text-slate-700 hover:bg-purple-100'
          }`}
          style={{ left: `${x}px`, top: `${y}px` }}
        >
          {String(val).padStart(2, '0')}
        </button>
      );
    }

    return (
      <div className="relative h-48 w-48 rounded-full bg-slate-50 border border-slate-200 mx-auto shadow-inner overflow-hidden flex-shrink-0" style={{ height: '192px', width: '192px', minHeight: '192px' }}>
        {/* Center dot */}
        <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600 z-10"></div>
        {/* Connection line */}
        {(() => {
          const selectedVal = isHours ? (hour === 12 ? 0 : hour) : minute;
          const angle = ((selectedVal / total) * 360 - 90);
          return (
            <div 
              className="absolute left-1/2 top-1/2 h-0.5 bg-purple-500 origin-left"
              style={{
                width: `${radius - 12}px`,
                transform: `rotate(${angle}deg)`,
                opacity: 0.6
              }}
            ></div>
          );
        })()}
        {items}
      </div>
    );
  };

  return (
    <div className="relative w-full" ref={popupRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3 text-sm font-bold text-slate-700 focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-purple-500/10 transition-all"
      >
        <span>{getDisplayTime()}</span>
        <Clock className="h-4 w-4 text-purple-500" />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-[110%] z-[9999] w-64 rounded-3xl bg-white p-4 shadow-2xl border border-purple-100 animate-in zoom-in-95 duration-200" style={{ minHeight: '320px' }}>
          <div className="mb-4 flex items-center justify-between px-2">
            <div className="flex gap-1 text-2xl font-black text-slate-800 tracking-tight">
              <button 
                type="button" 
                onClick={() => setMode('hours')}
                className={`rounded-lg px-2 py-1 transition-colors ${mode === 'hours' ? 'bg-purple-100 text-purple-700' : 'hover:bg-slate-100 text-slate-400'}`}
              >
                {String(hour).padStart(2, '0')}
              </button>
              <span className="py-1 text-slate-300 animate-pulse">:</span>
              <button 
                type="button" 
                onClick={() => setMode('minutes')}
                className={`rounded-lg px-2 py-1 transition-colors ${mode === 'minutes' ? 'bg-purple-100 text-purple-700' : 'hover:bg-slate-100 text-slate-400'}`}
              >
                {String(minute).padStart(2, '0')}
              </button>
            </div>
            <div className="flex flex-col gap-1 rounded-lg bg-slate-50 p-1 border border-slate-100">
              <button
                type="button"
                onClick={() => setPeriod('AM')}
                className={`rounded px-2 py-1 text-xs font-bold transition-all ${period === 'AM' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => setPeriod('PM')}
                className={`rounded px-2 py-1 text-xs font-bold transition-all ${period === 'PM' ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                PM
              </button>
            </div>
          </div>

          <div className="mb-5 flex justify-center">
            {renderClockFace()}
          </div>

          <div className="flex justify-between items-center px-1 mt-auto">
             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
               Select {mode}
             </span>
             <button
              type="button"
              onClick={handleTimeSelect}
              className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/20 hover:bg-purple-700 active:scale-95 transition-all"
             >
              Set Time
             </button>
          </div>
        </div>
      )}
    </div>
  );
}
