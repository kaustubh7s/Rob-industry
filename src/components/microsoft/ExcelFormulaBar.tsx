import React, { useState, useEffect, useRef } from 'react';
import { Check, X, ChevronDown } from 'lucide-react';

interface ExcelFormulaBarProps {
  activeCell: string;
  cellFormulaOrValue: string;
  onCommitValue: (val: string) => void;
  onQuickFunctionInsert: (fn: string) => void;
}

export const ExcelFormulaBar: React.FC<ExcelFormulaBarProps> = ({
  activeCell,
  cellFormulaOrValue,
  onCommitValue,
  onQuickFunctionInsert,
}) => {
  const [localVal, setLocalVal] = useState(cellFormulaOrValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalVal(cellFormulaOrValue);
  }, [cellFormulaOrValue, activeCell]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      onCommitValue(localVal);
      inputRef.current?.blur();
    } else if (e.key === 'Escape') {
      setLocalVal(cellFormulaOrValue);
      inputRef.current?.blur();
    }
  };

  const handleBlur = () => {
    if (localVal !== cellFormulaOrValue) {
      onCommitValue(localVal);
    }
  };

  return (
    <div className="bg-[#f9fafb] border-b border-[#d1d5db] px-2 py-1 flex items-center gap-1.5 select-none font-sans text-xs">
      {/* 1. Name Box with Dropdown Arrow (e.g. F360 ▾ as in screenshot) */}
      <div className="flex items-center justify-between w-20 px-2 py-1 bg-white border border-[#d1d5db] rounded font-mono font-bold text-slate-800 shrink-0 shadow-2xs">
        <span>{activeCell || 'A1'}</span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </div>

      {/* 2. Formula Action Icons (✕, ✓, fx) */}
      <div className="flex items-center gap-1 shrink-0 text-slate-500">
        <button
          type="button"
          onClick={() => setLocalVal(cellFormulaOrValue)}
          className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-colors"
          title="Cancel (Esc)"
        >
          <X className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={() => onCommitValue(localVal)}
          className="p-1 rounded hover:bg-[#dcfce7] text-[#107c41] transition-colors"
          title="Enter (Commit)"
        >
          <Check className="w-3.5 h-3.5" />
        </button>

        <div className="w-6 h-6 flex items-center justify-center font-serif italic font-bold text-slate-600 text-sm">
          fx
        </div>
      </div>

      {/* 3. Formula / Value Input Box */}
      <div className="flex-1 min-w-0">
        <input
          ref={inputRef}
          type="text"
          value={localVal}
          onChange={(e) => setLocalVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder="Enter text, number, or formula (e.g. =SUM(G2:G50))..."
          className="w-full bg-white border border-[#d1d5db] focus:border-[#107c41] focus:ring-1 focus:ring-[#107c41] rounded px-2.5 py-1 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-hidden transition-all shadow-2xs"
        />
      </div>

      {/* 4. Quick Auto Functions */}
      <div className="hidden lg:flex items-center gap-1 shrink-0 text-[11px] font-mono text-slate-600">
        <span className="text-slate-400 mr-0.5">Quick:</span>
        {['SUM', 'AVERAGE', 'COUNT'].map((fn) => (
          <button
            key={fn}
            type="button"
            onClick={() => onQuickFunctionInsert(fn)}
            className="px-1.5 py-0.5 rounded bg-white hover:bg-[#e5e7eb] hover:text-[#107c41] border border-[#d1d5db] font-semibold transition-colors cursor-pointer"
          >
            ={fn}()
          </button>
        ))}
      </div>
    </div>
  );
};
