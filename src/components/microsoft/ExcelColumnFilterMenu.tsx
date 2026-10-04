import React, { useState, useMemo } from 'react';
import {
  SortAsc,
  SortDesc,
  Filter,
  Check,
  Search,
  X,
  Edit2,
  Trash2,
} from 'lucide-react';
import { colIndexToName, coordsToCellId } from '../../services/workbookFormula';
import { SheetCell } from '../../types/workbook';

interface ExcelColumnFilterMenuProps {
  colIdx: number;
  colName: string;
  customColName?: string;
  position: { x: number; y: number };
  onClose: () => void;
  cells: Record<string, SheetCell>;
  totalRows: number;
  currentFilters?: string[];
  onApplyFilter: (selectedValues: string[] | null) => void;
  onSortCol: (dir: 'asc' | 'desc') => void;
  onRenameCol: (newName: string) => void;
}

export const ExcelColumnFilterMenu: React.FC<ExcelColumnFilterMenuProps> = ({
  colIdx,
  colName,
  customColName,
  position,
  onClose,
  cells,
  totalRows,
  currentFilters,
  onApplyFilter,
  onSortCol,
  onRenameCol,
}) => {
  const [searchVal, setSearchVal] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [tempColName, setTempColName] = useState(customColName || colName);

  // Extract distinct values in this column (excluding Row 1 header)
  const uniqueValues = useMemo(() => {
    const set = new Set<string>();
    for (let r = 1; r < totalRows; r++) {
      const cid = coordsToCellId(colIdx, r);
      const cell = cells[cid];
      const val = cell?.calced !== undefined ? cell.calced : cell?.v;
      if (val !== undefined && val !== null && String(val).trim() !== '') {
        set.add(String(val).trim());
      } else {
        set.add('(Blanks)');
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [colIdx, cells, totalRows]);

  // Selected values state
  const [selectedSet, setSelectedSet] = useState<Set<string>>(() => {
    if (currentFilters && currentFilters.length > 0) {
      return new Set(currentFilters);
    }
    return new Set(uniqueValues);
  });

  // Filtered by searchVal
  const filteredUniqueValues = useMemo(() => {
    if (!searchVal.trim()) return uniqueValues;
    return uniqueValues.filter((v) =>
      v.toLowerCase().includes(searchVal.toLowerCase())
    );
  }, [uniqueValues, searchVal]);

  const allVisibleSelected =
    filteredUniqueValues.length > 0 &&
    filteredUniqueValues.every((v) => selectedSet.has(v));

  const toggleSelectAll = () => {
    const next = new Set(selectedSet);
    if (allVisibleSelected) {
      filteredUniqueValues.forEach((v) => next.delete(v));
    } else {
      filteredUniqueValues.forEach((v) => next.add(v));
    }
    setSelectedSet(next);
  };

  const toggleValue = (val: string) => {
    const next = new Set(selectedSet);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    setSelectedSet(next);
  };

  const handleApply = () => {
    if (selectedSet.size === uniqueValues.length) {
      onApplyFilter(null); // No filter active (all selected)
    } else {
      onApplyFilter(Array.from(selectedSet));
    }
    onClose();
  };

  const handleClear = () => {
    onApplyFilter(null);
    onClose();
  };

  const handleSaveColName = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempColName.trim()) {
      onRenameCol(tempColName.trim());
    }
    setIsRenaming(false);
  };

  return (
    <div
      className="fixed bg-white border border-[#d1d5db] rounded-lg shadow-2xl z-50 w-64 text-xs text-slate-800 animate-fadeIn font-sans select-none"
      style={{
        left: Math.min(position.x, window.innerWidth - 270),
        top: Math.min(position.y, window.innerHeight - 380),
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header: Column Name & Rename */}
      <div className="p-2.5 bg-[#f3f4f6] border-b border-[#e5e7eb] rounded-t-lg flex items-center justify-between">
        {isRenaming ? (
          <form onSubmit={handleSaveColName} className="flex items-center gap-1 w-full">
            <input
              type="text"
              value={tempColName}
              onChange={(e) => setTempColName(e.target.value)}
              autoFocus
              className="flex-1 bg-white border border-[#107c41] rounded px-1.5 py-0.5 text-xs font-bold text-slate-900 focus:outline-hidden"
            />
            <button
              type="submit"
              className="px-2 py-0.5 bg-[#107c41] text-white rounded text-[10px] font-bold"
            >
              Save
            </button>
          </form>
        ) : (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-[#107c41]">Col {colName}:</span>
              <span className="font-semibold text-slate-800 truncate max-w-[140px]">
                {customColName || 'Default'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsRenaming(true)}
              className="p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800"
              title="Edit Column Header Name"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* 1. Sort Options */}
      <div className="p-1.5 border-b border-[#e5e7eb] space-y-0.5">
        <button
          type="button"
          onClick={() => {
            onSortCol('asc');
            onClose();
          }}
          className="w-full text-left px-2 py-1.5 rounded hover:bg-[#f3f4f6] flex items-center gap-2 text-slate-700"
        >
          <SortAsc className="w-3.5 h-3.5 text-[#107c41]" />
          <span>Sort A to Z / Smallest to Largest</span>
        </button>

        <button
          type="button"
          onClick={() => {
            onSortCol('desc');
            onClose();
          }}
          className="w-full text-left px-2 py-1.5 rounded hover:bg-[#f3f4f6] flex items-center gap-2 text-slate-700"
        >
          <SortDesc className="w-3.5 h-3.5 text-[#107c41]" />
          <span>Sort Z to A / Largest to Smallest</span>
        </button>
      </div>

      {/* 2. Filter Search & List */}
      <div className="p-2 space-y-2">
        <div className="relative">
          <input
            type="text"
            placeholder="Search items..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="w-full bg-white border border-[#d1d5db] rounded px-2 py-1 pl-7 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#107c41]"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
        </div>

        {/* Checkbox List */}
        <div className="max-h-40 overflow-y-auto border border-[#e5e7eb] rounded p-1 space-y-0.5 bg-slate-50 custom-scrollbar">
          {/* Select All */}
          <label className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-white cursor-pointer font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={allVisibleSelected}
              onChange={toggleSelectAll}
              className="rounded text-[#107c41] focus:ring-0 cursor-pointer"
            />
            <span>(Select All)</span>
          </label>

          {filteredUniqueValues.length === 0 ? (
            <div className="text-[11px] text-slate-400 p-2 text-center">No matching values</div>
          ) : (
            filteredUniqueValues.map((val) => {
              const isChecked = selectedSet.has(val);
              return (
                <label
                  key={val}
                  className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-white cursor-pointer text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleValue(val)}
                    className="rounded text-[#107c41] focus:ring-0 cursor-pointer"
                  />
                  <span className="truncate">{val}</span>
                </label>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Footer Action Buttons */}
      <div className="p-2 bg-[#f9fafb] border-t border-[#e5e7eb] rounded-b-lg flex items-center justify-between">
        {currentFilters && currentFilters.length > 0 ? (
          <button
            type="button"
            onClick={handleClear}
            className="text-[11px] font-semibold text-rose-600 hover:underline"
          >
            Clear Filter
          </button>
        ) : (
          <span className="text-[10px] text-slate-400 font-mono">
            {selectedSet.size} of {uniqueValues.length} selected
          </span>
        )}

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onClose}
            className="px-2.5 py-1 rounded text-slate-600 hover:bg-slate-200 text-xs font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="px-3 py-1 rounded bg-[#107c41] hover:bg-[#0b5a2f] text-white text-xs font-bold shadow-xs cursor-pointer"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};
