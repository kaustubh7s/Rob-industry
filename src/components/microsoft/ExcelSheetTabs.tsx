import React, { useState, useMemo } from 'react';
import {
  Plus,
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Menu,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Minus,
  Check,
  ChevronDown,
} from 'lucide-react';
import { WorkbookSheet } from '../../types/workbook';

interface ExcelSheetTabsProps {
  sheets: WorkbookSheet[];
  activeSheetId: string;
  onSelectSheet: (id: string) => void;
  onAddSheet: () => void;
  onRenameSheet: (id: string, newName: string) => void;
  onDuplicateSheet: (id: string) => void;
  onDeleteSheet: (id: string) => void;
  onChangeTabColor: (id: string, color: string) => void;
  onAddRows?: (count: number) => void;
  totalRows: number;
  totalCols: number;
  cellCount: number;
}

export const ExcelSheetTabs: React.FC<ExcelSheetTabsProps> = ({
  sheets,
  activeSheetId,
  onSelectSheet,
  onAddSheet,
  onRenameSheet,
  onDuplicateSheet,
  onDeleteSheet,
  onChangeTabColor,
  onAddRows,
  totalRows,
  totalCols,
  cellCount,
}) => {
  const [menuSheetId, setMenuSheetId] = useState<string | null>(null);
  const [isRenamingId, setIsRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [zoomLevel, setZoomLevel] = useState(100);

  const activeSheet = sheets.find((s) => s.id === activeSheetId) || sheets[0];

  // Calculate live Statistics for active sheet (Average, Count, Sum)
  const stats = useMemo(() => {
    if (!activeSheet) return { avg: 0, count: 0, sum: 0 };
    let sum = 0;
    let count = 0;
    let numericCount = 0;

    Object.values(activeSheet.cells).forEach((c) => {
      const val = c.calced !== undefined ? c.calced : c.v;
      if (val !== undefined && val !== null && val !== '') {
        count++;
        if (typeof val === 'number') {
          sum += val;
          numericCount++;
        } else if (typeof val === 'string') {
          const parsed = parseFloat(val.replace(/[^0-9.-]/g, ''));
          if (!isNaN(parsed)) {
            sum += parsed;
            numericCount++;
          }
        }
      }
    });

    const avg = numericCount > 0 ? Math.round((sum / numericCount) * 100) / 100 : 0;
    return { avg, count, sum: Math.round(sum * 100) / 100 };
  }, [activeSheet]);

  const startRename = (sheet: WorkbookSheet) => {
    setIsRenamingId(sheet.id);
    setRenameValue(sheet.name);
    setMenuSheetId(null);
  };

  const handleSaveRename = (sheetId: string) => {
    if (renameValue.trim()) {
      onRenameSheet(sheetId, renameValue.trim());
    }
    setIsRenamingId(null);
  };

  return (
    <div className="h-8 bg-[#f3f4f6] border-t border-[#d1d5db] px-2 flex items-center justify-between select-none text-xs font-sans text-slate-700">
      {/* 1. LEFT: SHEET TABS NAVIGATION (<, >, ☰, Sheet1, 150 BPM, +) */}
      <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar max-w-[55vw] h-full">
        {/* Navigation Arrows */}
        <div className="flex items-center text-slate-500 mr-1">
          <button
            type="button"
            className="p-1 hover:bg-slate-200 rounded text-slate-600"
            title="Scroll Sheets Left"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className="p-1 hover:bg-slate-200 rounded text-slate-600"
            title="Scroll Sheets Right"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className="p-1 hover:bg-slate-200 rounded text-slate-600"
            title="All Sheets Menu"
          >
            <Menu className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Sheets Tab Bar */}
        {sheets.map((sheet) => {
          const isActive = sheet.id === activeSheetId;
          const isRenaming = sheet.id === isRenamingId;

          return (
            <div
              key={sheet.id}
              className={`relative group flex items-center shrink-0 px-3 h-full text-xs transition-all cursor-pointer ${
                isActive
                  ? 'bg-white font-bold text-[#107c41] border-b-2 border-b-[#107c41] shadow-2xs'
                  : 'bg-transparent font-medium text-slate-700 hover:bg-slate-200'
              }`}
              onClick={() => {
                if (!isRenaming) onSelectSheet(sheet.id);
              }}
            >
              {isRenaming ? (
                <input
                  type="text"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => handleSaveRename(sheet.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRename(sheet.id);
                    if (e.key === 'Escape') setIsRenamingId(null);
                  }}
                  autoFocus
                  className="px-1.5 py-0.5 text-xs font-bold bg-white text-slate-900 rounded border border-[#107c41] focus:outline-hidden w-24"
                />
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="truncate max-w-[130px]">{sheet.name}</span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuSheetId(menuSheetId === sheet.id ? null : sheet.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-200 text-slate-500"
                  >
                    <MoreVertical className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* SHEET TAB MENU */}
              {menuSheetId === sheet.id && (
                <div
                  className="absolute bottom-full left-0 mb-1 bg-white border border-slate-300 rounded shadow-xl py-1 z-50 w-44 text-xs text-slate-700 animate-fadeIn"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => startRename(sheet)}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#f3f4f6] flex items-center gap-2"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Rename</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDuplicateSheet(sheet.id);
                      setMenuSheetId(null);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-[#f3f4f6] flex items-center gap-2"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#107c41]" />
                    <span>Duplicate</span>
                  </button>

                  {sheets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteSheet(sheet.id);
                        setMenuSheetId(null);
                      }}
                      className="w-full text-left px-3 py-1.5 text-rose-600 hover:bg-[#fee2e2] flex items-center gap-2 border-t border-slate-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* + Add New Sheet */}
        <button
          type="button"
          onClick={onAddSheet}
          className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer ml-0.5"
          title="Insert Worksheet"
        >
          <Plus className="w-3.5 h-3.5 text-[#107c41]" />
        </button>
      </div>

      {/* 2. RIGHT: EXACT EXCEL BOTTOM STATUS BAR (Rows Count, Expand Rows, Stats, Zoom) */}
      <div className="flex items-center gap-3 text-[11px] text-slate-600 font-medium shrink-0">
        {/* Row Capacity Controls */}
        <div className="flex items-center gap-1.5 pr-2 border-r border-slate-300">
          <span className="font-mono text-[11px] text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-300 font-bold">
            {totalRows.toLocaleString('en-IN')} Rows
          </span>

          {onAddRows && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onAddRows(1000)}
                className="px-1.5 py-0.5 rounded bg-white hover:bg-emerald-50 text-[#107c41] border border-slate-300 hover:border-[#107c41] font-bold text-[10px] transition-colors cursor-pointer shadow-2xs"
                title="Add 1,000 More Rows"
              >
                + 1,000 Rows
              </button>
              <button
                type="button"
                onClick={() => onAddRows(5000)}
                className="px-1.5 py-0.5 rounded bg-white hover:bg-emerald-50 text-[#107c41] border border-slate-300 hover:border-[#107c41] font-bold text-[10px] transition-colors cursor-pointer shadow-2xs"
                title="Add 5,000 More Rows"
              >
                + 5,000 Rows
              </button>
            </div>
          )}
        </div>

        <div className="hidden md:flex items-center gap-2.5 font-mono text-slate-700">
          <span>
            Avg: <strong className="text-slate-900">{stats.avg.toLocaleString('en-IN')}</strong>
          </span>
          <span>
            Count: <strong className="text-slate-900">{stats.count}</strong>
          </span>
          <span>
            Sum: <strong className="text-[#107c41] font-bold">{stats.sum.toLocaleString('en-IN')}</strong>
          </span>
        </div>

        {/* Zoom Controls */}
        <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-300">
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.max(z - 10, 50))}
            className="p-0.5 hover:bg-slate-200 rounded"
            title="Zoom Out"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="font-mono text-[10px] w-8 text-center">{zoomLevel}%</span>
          <button
            type="button"
            onClick={() => setZoomLevel((z) => Math.min(z + 10, 200))}
            className="p-0.5 hover:bg-slate-200 rounded"
            title="Zoom In"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
