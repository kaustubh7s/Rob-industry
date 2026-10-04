import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Plus,
  MoreVertical,
  Edit2,
  Copy,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Menu,
  Minus,
  Check,
  X,
  Palette,
  AlertTriangle,
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

const TAB_COLORS = [
  { name: 'Default', value: '' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Green', value: '#107c41' },
  { name: 'Teal', value: '#14b8a6' },
  { name: 'Blue', value: '#0284c7' },
  { name: 'Indigo', value: '#6366f1' },
  { name: 'Purple', value: '#a855f7' },
  { name: 'Rose', value: '#f43f5e' },
];

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
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [isRenamingId, setIsRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [sheetToDelete, setSheetToDelete] = useState<WorkbookSheet | null>(null);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [showColorPickerForId, setShowColorPickerForId] = useState<string | null>(null);

  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const activeSheet = sheets.find((s) => s.id === activeSheetId) || sheets[0];

  // Close menus on outside click
  useEffect(() => {
    const handleWindowClick = () => {
      setMenuSheetId(null);
      setContextMenuPos(null);
      setShowColorPickerForId(null);
    };
    window.addEventListener('click', handleWindowClick);
    return () => window.removeEventListener('click', handleWindowClick);
  }, []);

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
    setContextMenuPos(null);
  };

  const handleSaveRename = (sheetId: string) => {
    if (renameValue.trim()) {
      onRenameSheet(sheetId, renameValue.trim());
    }
    setIsRenamingId(null);
  };

  const promptDeleteSheet = (sheet: WorkbookSheet) => {
    if (sheets.length <= 1) return;
    setSheetToDelete(sheet);
    setMenuSheetId(null);
    setContextMenuPos(null);
  };

  const handleConfirmDelete = () => {
    if (sheetToDelete) {
      onDeleteSheet(sheetToDelete.id);
      setSheetToDelete(null);
    }
  };

  const handleScrollTabs = (direction: 'left' | 'right') => {
    if (tabsScrollRef.current) {
      tabsScrollRef.current.scrollBy({
        left: direction === 'left' ? -150 : 150,
        behavior: 'smooth',
      });
    }
  };

  return (
    <>
      <div className="h-8 bg-[#f3f4f6] border-t border-[#d1d5db] px-2 flex items-center justify-between select-none text-xs font-sans text-slate-700 relative z-30">
        {/* 1. LEFT: SHEET TABS NAVIGATION (<, >, Sheet1, Sheet2, +) */}
        <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar max-w-[55vw] h-full" ref={tabsScrollRef}>
          {/* Navigation Arrows */}
          <div className="flex items-center text-slate-500 mr-1 shrink-0">
            <button
              type="button"
              onClick={() => handleScrollTabs('left')}
              className="p-1 hover:bg-slate-200 rounded text-slate-600 cursor-pointer"
              title="Scroll Sheets Left"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleScrollTabs('right')}
              className="p-1 hover:bg-slate-200 rounded text-slate-600 cursor-pointer"
              title="Scroll Sheets Right"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Sheets Tab Bar */}
          {sheets.map((sheet) => {
            const isActive = sheet.id === activeSheetId;
            const isRenaming = sheet.id === isRenamingId;
            const tabColor = sheet.tab_color;

            return (
              <div
                key={sheet.id}
                className={`relative group flex items-center shrink-0 px-2.5 h-full text-xs transition-all cursor-pointer border-r border-slate-300 ${
                  isActive
                    ? 'bg-white font-bold text-[#107c41] shadow-2xs'
                    : 'bg-slate-100 font-medium text-slate-700 hover:bg-slate-200'
                }`}
                style={{
                  borderBottom: isActive
                    ? `3px solid ${tabColor || '#107c41'}`
                    : tabColor
                    ? `2px solid ${tabColor}`
                    : undefined,
                }}
                onClick={() => {
                  if (!isRenaming) onSelectSheet(sheet.id);
                }}
                onDoubleClick={() => startRename(sheet)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelectSheet(sheet.id);
                  setMenuSheetId(sheet.id);
                  setContextMenuPos({ x: e.clientX, y: e.clientY });
                }}
                title={`${sheet.name} (Double click to rename | Right click for options)`}
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
                    {/* Tab Color Dot */}
                    {tabColor && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: tabColor }}
                      />
                    )}
                    <span className="truncate max-w-[130px]">{sheet.name}</span>

                    {/* Sheet Options 3-Dots Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuSheetId(menuSheetId === sheet.id ? null : sheet.id);
                        setContextMenuPos(null);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-300/80 text-slate-500 transition-opacity"
                      title="Sheet options"
                    >
                      <MoreVertical className="w-3 h-3" />
                    </button>

                    {/* Direct Quick-Delete ✕ Button (Visible on hover when more than 1 sheet) */}
                    {sheets.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          promptDeleteSheet(sheet);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-all ml-0.5"
                        title={`Delete sheet ${sheet.name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                )}

                {/* SHEET TAB CONTEXT MENU (Pop-over) */}
                {menuSheetId === sheet.id && (
                  <div
                    className="absolute bottom-full left-0 mb-1 bg-white border border-slate-300 rounded-lg shadow-xl py-1 z-50 w-48 text-xs text-slate-700 animate-fadeIn"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-3 py-1 font-bold text-[10px] text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      {sheet.name}
                    </div>

                    <button
                      type="button"
                      onClick={() => startRename(sheet)}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#f3f4f6] flex items-center gap-2 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Rename (Double click)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onDuplicateSheet(sheet.id);
                        setMenuSheetId(null);
                      }}
                      className="w-full text-left px-3 py-1.5 hover:bg-[#f3f4f6] flex items-center gap-2 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-[#107c41]" />
                      <span>Duplicate Sheet</span>
                    </button>

                    {/* Color picker dropdown */}
                    <div className="px-3 py-1.5 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                        <Palette className="w-3.5 h-3.5 text-amber-600" />
                        <span className="font-semibold text-[11px]">Tab Color</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        {TAB_COLORS.map((c) => (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => {
                              onChangeTabColor(sheet.id, c.value);
                              setMenuSheetId(null);
                            }}
                            className={`w-4 h-4 rounded-full border border-slate-300 hover:scale-125 transition-transform ${
                              !c.value ? 'bg-white' : ''
                            } ${sheet.tab_color === c.value ? 'ring-2 ring-offset-1 ring-slate-800' : ''}`}
                            style={{ backgroundColor: c.value || '#ffffff' }}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Delete Sheet Option */}
                    {sheets.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => promptDeleteSheet(sheet)}
                        className="w-full text-left px-3 py-1.5 text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-100 cursor-pointer font-semibold"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Delete Sheet</span>
                      </button>
                    ) : (
                      <div className="px-3 py-1 text-[10px] text-slate-400 italic border-t border-slate-100">
                        Cannot delete the only sheet
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* + Add New Sheet Button */}
          <button
            type="button"
            onClick={onAddSheet}
            className="w-6 h-6 rounded flex items-center justify-center text-slate-600 hover:bg-emerald-100 hover:text-[#107c41] transition-colors cursor-pointer ml-1 shrink-0"
            title="Insert Worksheet (+)"
          >
            <Plus className="w-4 h-4 text-[#107c41]" />
          </button>
        </div>

        {/* 2. RIGHT: STATUS BAR (Rows Count, Expand Rows, Stats, Zoom) */}
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
              className="p-0.5 hover:bg-slate-200 rounded cursor-pointer"
              title="Zoom Out"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="font-mono text-[10px] w-8 text-center">{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(z + 10, 200))}
              className="p-0.5 hover:bg-slate-200 rounded cursor-pointer"
              title="Zoom In"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* DELETE SHEET CONFIRMATION MODAL */}
      {sheetToDelete && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 overflow-hidden">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-slate-900 text-sm">Delete Worksheet?</h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Are you sure you want to delete <strong className="text-slate-900 font-semibold">"{sheetToDelete.name}"</strong>? Microsoft Excel will permanently delete this sheet and all cell data within it.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSheetToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Sheet</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

