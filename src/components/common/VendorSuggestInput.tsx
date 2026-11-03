import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useERP } from '../../context/ERPContext';
import { Sparkles, Check } from 'lucide-react';

export const DEFAULT_VENDORS: string[] = [
  'Manav Metal',
  'Darshan Enterprises',
  'MOLDEX',
  'KINEKAR',
  'GEAR WORLD',
  'Smart Profile',
  'RAJAT TECHNOCAST',
  'SHIVRAJ INDUSTRIES',
  'BALRAJ RAUUBER',
  'DISHA PLAST',
  'DISHA PLAST MUMBAI',
  'H M TRADERS',
  'LADDAJI',
  'SBR STEEL',
  'SEARCH',
];

export interface VendorSuggestInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  title?: string;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  autoFocus?: boolean;
  id?: string;
  /** Positioning of suggestion badge. Defaults to 'above'. */
  position?: 'above' | 'below';
}

export const VendorSuggestInput: React.FC<VendorSuggestInputProps> = ({
  value = '',
  onChange,
  placeholder = 'Vendor name...',
  className = '',
  inputClassName = '',
  title,
  disabled = false,
  onKeyDown,
  onBlur,
  onFocus,
  autoFocus = false,
  id,
  position = 'above',
}) => {
  const { vendors = [], projects = [], projectRequirements = [] } = useERP();
  const [isFocused, setIsFocused] = useState(false);
  const [dismissedForValue, setDismissedForValue] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Collect all known unique vendor names across the ERP
  const allKnownVendors = useMemo(() => {
    const set = new Set<string>();

    // Priority 1: Default core vendors (starts with Manav Metal)
    DEFAULT_VENDORS.forEach((v) => {
      if (v && v.trim()) set.add(v.trim());
    });

    // Priority 2: Registered vendors master list
    (vendors || []).forEach((v) => {
      if (v?.name && v.name.trim()) set.add(v.name.trim());
    });

    // Priority 3: Vendors used across projects and requirements
    (projects || []).forEach((p) => {
      const v = (p?.vendorName || p?.vendor || '').trim();
      if (v) set.add(v);
    });

    (projectRequirements || []).forEach((r) => {
      const v = (r?.vendorName || r?.vendor || '').trim();
      if (v) set.add(v);
    });

    return Array.from(set);
  }, [vendors, projects, projectRequirements]);

  // Compute matched vendor suggestions based on typed initial / text
  const suggestions = useMemo(() => {
    const query = (value || '').trim().toLowerCase();
    if (!query) return [];

    // Filter out if user has already typed the full matching vendor name
    const startsWithMatches: string[] = [];
    const containsMatches: string[] = [];

    allKnownVendors.forEach((v) => {
      const vLower = v.toLowerCase();
      // Exact match - don't show suggestion badge
      if (vLower === query) return;

      if (vLower.startsWith(query)) {
        startsWithMatches.push(v);
      } else if (vLower.includes(query)) {
        containsMatches.push(v);
      }
    });

    // Prioritize names starting with initial, followed by substring matches
    return [...startsWithMatches, ...containsMatches].slice(0, 4);
  }, [value, allKnownVendors]);

  const topSuggestion = suggestions[0] || null;
  const otherSuggestions = suggestions.slice(1, 3);

  // Apply a suggested vendor name
  const applySuggestion = useCallback(
    (suggestedName: string) => {
      onChange(suggestedName);
      setDismissedForValue(suggestedName.toLowerCase());
      if (inputRef.current) {
        inputRef.current.focus();
      }
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // If suggestion badge is visible, pressing Tab or Enter accepts the top suggestion
    if (topSuggestion && isFocused && dismissedForValue !== value.trim().toLowerCase()) {
      if (e.key === 'Tab') {
        e.preventDefault();
        applySuggestion(topSuggestion);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        applySuggestion(topSuggestion);
        return;
      }
      if (e.key === 'ArrowRight' && inputRef.current && inputRef.current.selectionStart === value.length) {
        e.preventDefault();
        applySuggestion(topSuggestion);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setDismissedForValue(value.trim().toLowerCase());
        return;
      }
    }

    if (onKeyDown) {
      onKeyDown(e);
    }
  };

  const showSuggestionBadge =
    isFocused &&
    suggestions.length > 0 &&
    dismissedForValue !== value.trim().toLowerCase() &&
    !disabled;

  return (
    <div className={`relative inline-block w-full ${className}`}>
      {/* SUGGESTION BADGE: Positioned directly ABOVE the input */}
      {showSuggestionBadge && topSuggestion && (
        <div
          className={`absolute left-0 z-50 flex items-center gap-1 pointer-events-auto whitespace-nowrap animate-fadeIn select-none ${
            position === 'below'
              ? 'top-full mt-1'
              : 'bottom-full mb-1'
          }`}
          style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.15))' }}
        >
          {/* Primary Top Suggestion Pill */}
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => {
              e.preventDefault(); // Prevents input blur
              applySuggestion(topSuggestion);
            }}
            className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-black text-white text-[11px] font-bold border border-slate-700 hover:border-emerald-400 transition-all flex items-center gap-1.5 cursor-pointer shadow-md group"
            title={`Click or press Tab ⇥ to auto-fill "${topSuggestion}"`}
          >
            <Sparkles className="w-3 h-3 text-amber-400 animate-pulse shrink-0" />
            <span className="text-slate-300 font-medium text-[10px]">Suggest:</span>
            <span className="text-emerald-400 font-black tracking-wide underline decoration-emerald-500/50 underline-offset-2">
              {topSuggestion}
            </span>
            <kbd className="text-[9px] text-slate-300 bg-slate-800 px-1 py-0.5 rounded border border-slate-700 font-mono font-bold ml-0.5 group-hover:bg-emerald-950 group-hover:text-emerald-300 transition-colors">
              Tab ⇥
            </kbd>
          </button>

          {/* Secondary Suggestions (Clickable Pills) */}
          {otherSuggestions.map((other) => (
            <button
              key={other}
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault();
                applySuggestion(other);
              }}
              className="px-2 py-0.5 rounded-md bg-white hover:bg-slate-100 text-slate-800 text-[10px] font-bold border border-slate-300 hover:border-blue-500 transition-all cursor-pointer shadow-xs truncate max-w-[130px]"
              title={`Click to fill "${other}"`}
            >
              {other}
            </button>
          ))}
        </div>
      )}

      {/* Manual Input (Completely unrestricted typing) */}
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={(e) => {
          setDismissedForValue(null);
          onChange(e.target.value);
        }}
        onFocus={(e) => {
          setIsFocused(true);
          if (onFocus) onFocus();
        }}
        onBlur={(e) => {
          // Delay blur to allow mouse clicks on suggestion pill to complete
          setTimeout(() => {
            setIsFocused(false);
            if (onBlur) onBlur();
          }, 150);
        }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        title={title}
        disabled={disabled}
        autoFocus={autoFocus}
        autoComplete="off"
        spellCheck={false}
        className={inputClassName}
      />
    </div>
  );
};
