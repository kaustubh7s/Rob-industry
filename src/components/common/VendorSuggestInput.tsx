import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useERP } from '../../context/ERPContext';
import { Sparkles, Check } from 'lucide-react';

export const DEFAULT_VENDORS: string[] = [
  'MANAV METAL',
  'DARSHAN ENTERPRISES',
  'KINEKAR',
  'MOLDEX',
  'GEAR WORLD',
  'Smart Profile',
  'RAJAT TECHNOCAST',
  'SHIVRAJ INDUSTRIES',
  'SEARCH',
  'BALRAJ RAUUBER',
  'LADDAJI',
  'DISHA PLAST',
  'H M TRADERS',
  'DISHA PLAST MUMBAI',
  'SBR STEEL',
  'DARSHAN ELECTRICAL',
  'RAJAT TECHNO CAST',
  'V K',
  'SR METAL',
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
  /** Positioning of suggestion badge. Defaults to 'auto'. */
  position?: 'above' | 'below' | 'auto';
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
  position = 'auto',
}) => {
  const { vendors = [], projects = [], projectRequirements = [] } = useERP();
  const [isFocused, setIsFocused] = useState(false);
  const [dismissedForValue, setDismissedForValue] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Dynamic bounds detection to guarantee badge never gets clipped or goes out of frame
  const [placement, setPlacement] = useState<{
    vertical: 'above' | 'below';
    horizontal: 'left' | 'right';
  }>({ vertical: position === 'below' ? 'below' : 'above', horizontal: 'left' });

  const updatePlacement = useCallback(() => {
    if (!inputRef.current) return;
    const rect = inputRef.current.getBoundingClientRect();

    // 1. Calculate vertical clearance
    let spaceAbove = rect.top;
    let spaceBelow = window.innerHeight - rect.bottom;

    // Check nearest scroll / overflow container (e.g. table container, modal, cards)
    let parent = inputRef.current.parentElement;
    while (parent && parent !== document.body) {
      const style = window.getComputedStyle(parent);
      const isScrollable = /(auto|scroll|hidden)/.test(style.overflowY + style.overflowX);
      if (isScrollable) {
        const parentRect = parent.getBoundingClientRect();
        const distToParentTop = rect.top - parentRect.top;
        const distToParentBottom = parentRect.bottom - rect.bottom;
        if (distToParentTop < spaceAbove) spaceAbove = distToParentTop;
        if (distToParentBottom < spaceBelow) spaceBelow = distToParentBottom;
        break;
      }
      parent = parent.parentElement;
    }

    // If space above is tight (< 35px) and there is more room below, flip to below
    let vertical: 'above' | 'below' = position === 'below' ? 'below' : 'above';
    if (position === 'auto' || !position) {
      vertical = (spaceAbove < 35 && spaceBelow > spaceAbove) ? 'below' : 'above';
    } else if (position === 'above' && spaceAbove < 35 && spaceBelow > spaceAbove) {
      // Auto-fallback if forced 'above' would get clipped out of frame
      vertical = 'below';
    }

    // 2. Calculate horizontal clearance
    let spaceRight = window.innerWidth - rect.left;
    let p = inputRef.current.parentElement;
    while (p && p !== document.body) {
      const style = window.getComputedStyle(p);
      const isScrollable = /(auto|scroll|hidden)/.test(style.overflowX);
      if (isScrollable) {
        const pRect = p.getBoundingClientRect();
        const distToParentRight = pRect.right - rect.left;
        if (distToParentRight < spaceRight) spaceRight = distToParentRight;
        break;
      }
      p = p.parentElement;
    }

    // If space to the right is less than 220px, align to the right edge of input so it expands inwards
    const horizontal: 'left' | 'right' = spaceRight < 220 ? 'right' : 'left';

    setPlacement({ vertical, horizontal });
  }, [position]);

  useEffect(() => {
    if (!isFocused) return;
    updatePlacement();
    window.addEventListener('resize', updatePlacement);
    window.addEventListener('scroll', updatePlacement, true);
    return () => {
      window.removeEventListener('resize', updatePlacement);
      window.removeEventListener('scroll', updatePlacement, true);
    };
  }, [isFocused, updatePlacement, value]);

  // Collect all known unique vendor names across the ERP (preserving official casing)
  const allKnownVendors = useMemo(() => {
    // Map lowercased name -> exact official casing from system
    const map = new Map<string, string>();

    // Priority 1: Real vendors currently listed or created in the system (Master List)
    (vendors || []).forEach((v) => {
      const name = (v?.name || '').trim();
      if (name && !map.has(name.toLowerCase())) {
        map.set(name.toLowerCase(), name);
      }
    });

    // Priority 2: Real vendors used in project requirements & projects
    (projectRequirements || []).forEach((r) => {
      const name = (r?.vendorName || r?.vendor || '').trim();
      if (name && !map.has(name.toLowerCase())) {
        map.set(name.toLowerCase(), name);
      }
    });

    (projects || []).forEach((p) => {
      const name = (p?.vendorName || p?.vendor || '').trim();
      if (name && !map.has(name.toLowerCase())) {
        map.set(name.toLowerCase(), name);
      }
    });

    // Priority 3: Default core vendors (real vendors list)
    DEFAULT_VENDORS.forEach((v) => {
      const name = (v || '').trim();
      if (name && !map.has(name.toLowerCase())) {
        map.set(name.toLowerCase(), name);
      }
    });

    return Array.from(map.values());
  }, [vendors, projects, projectRequirements]);

  // Compute matched vendor suggestions based on typed initial / text
  const suggestions = useMemo(() => {
    const trimmed = (value || '').trim();
    const query = trimmed.toLowerCase();
    if (!query) return [];

    const startsWithMatches: string[] = [];
    const containsMatches: string[] = [];

    allKnownVendors.forEach((v) => {
      // If user has already typed the exact same vendor with identical casing, skip
      if (v === value) return;

      const vLower = v.toLowerCase();
      if (vLower.startsWith(query)) {
        startsWithMatches.push(v);
      } else if (vLower.includes(query)) {
        containsMatches.push(v);
      }
    });

    // Prioritize MANAV METAL when starting with 'm' or 'man'
    startsWithMatches.sort((a, b) => {
      const aUpper = a.toUpperCase();
      const bUpper = b.toUpperCase();
      if (aUpper === 'MANAV METAL') return -1;
      if (bUpper === 'MANAV METAL') return 1;
      return a.localeCompare(b);
    });

    return [...startsWithMatches, ...containsMatches].slice(0, 4);
  }, [value, allKnownVendors]);

  const topSuggestion = suggestions[0] || null;
  const otherSuggestions = suggestions.slice(1, 3);

  // Apply a suggested vendor name
  const applySuggestion = useCallback(
    (suggestedName: string) => {
      onChange(suggestedName);
      setDismissedForValue(suggestedName);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    },
    [onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // If suggestion badge is visible, pressing Tab or Enter accepts the top suggestion
    if (topSuggestion && isFocused && dismissedForValue !== value) {
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
        setDismissedForValue(value);
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
    dismissedForValue !== value &&
    !disabled;

  return (
    <div className={`relative inline-block w-full ${isFocused ? 'z-40' : 'z-10'} ${className}`}>
      {/* SUGGESTION BADGE: Smart auto-positioned to stay 100% inside the visible frame */}
      {showSuggestionBadge && topSuggestion && (
        <div
          className={`absolute z-50 flex items-center gap-1 pointer-events-auto whitespace-nowrap animate-fadeIn select-none ${
            placement.vertical === 'below' ? 'top-full mt-1.5' : 'bottom-full mb-1.5'
          } ${
            placement.horizontal === 'right' ? 'right-0 left-auto' : 'left-0 right-auto'
          }`}
          style={{ filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.2))' }}
        >
          {/* Primary Top Suggestion Pill */}
          <button
            type="button"
            tabIndex={-1}
            onMouseDown={(e) => {
              e.preventDefault(); // Prevents input blur
              applySuggestion(topSuggestion);
            }}
            className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-black text-white text-[11px] font-bold border border-slate-700 hover:border-emerald-400 transition-all flex items-center gap-1.5 cursor-pointer shadow-md group max-w-[calc(100vw-32px)]"
            title={`Click or press Tab ⇥ to auto-fill "${topSuggestion}"`}
          >
            <Sparkles className="w-3 h-3 text-amber-400 animate-pulse shrink-0" />
            <span className="text-slate-300 font-medium text-[10px]">Suggest:</span>
            <span className="text-emerald-400 font-black tracking-wide underline decoration-emerald-500/50 underline-offset-2 truncate max-w-[200px]">
              {topSuggestion}
            </span>
            <kbd className="text-[9px] text-slate-300 bg-slate-800 px-1 py-0.5 rounded border border-slate-700 font-mono font-bold ml-0.5 group-hover:bg-emerald-950 group-hover:text-emerald-300 transition-colors shrink-0">
              Tab ⇥
            </kbd>
          </button>

          {/* Secondary Suggestions: at most 1, hidden on very narrow spaces to avoid pushing badge out of frame */}
          {otherSuggestions.slice(0, 1).map((other) => (
            <button
              key={other}
              type="button"
              tabIndex={-1}
              onMouseDown={(e) => {
                e.preventDefault();
                applySuggestion(other);
              }}
              className="hidden sm:inline-flex px-2 py-0.5 rounded-md bg-white hover:bg-slate-100 text-slate-800 text-[10px] font-bold border border-slate-300 hover:border-blue-500 transition-all cursor-pointer shadow-xs truncate max-w-[120px]"
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
