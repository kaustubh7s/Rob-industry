import React, { useRef, useState, useEffect } from 'react';
import {
  Undo,
  Redo,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Download,
  Upload,
  Search,
  Sigma,
  ChevronDown,
  ArrowUpDown,
  Lock,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Columns,
  Rows,
  Filter,
  SortAsc,
  SortDesc,
  Share2,
  Maximize2,
  Minimize2,
  FolderOpen,
  UserCheck,
  Check,
  Plus,
  Trash2,
  Users,
  Database,
  RefreshCw,
  Link2,
  Save,
  Replace,
  X,
  Sparkles,
} from 'lucide-react';
import { SheetCell, CellFormat, Workbook } from '../../types/workbook';
import { User } from '../../types/erp';

interface ExcelToolbarProps {
  workbookTitle: string;
  activeCell: string;
  currentCellData?: SheetCell;
  onFormatChange: (updates: Partial<SheetCell>) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onInsertRow: (position: 'above' | 'below') => void;
  onDeleteRow: () => void;
  onInsertCol: (position: 'left' | 'right') => void;
  onDeleteCol: () => void;
  onApplyFormula: (formulaName: string) => void;
  onSort: (direction: 'asc' | 'desc') => void;
  onToggleFreezeRow: () => void;
  isRowFrozen: boolean;
  onExportXLSX: () => void;
  onExportCSV: () => void;
  onImportExcel: (file: File) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  saveStatus: 'saved' | 'saving' | 'offline';
  currentUser: User;
  allUsers: User[];
  onOpenAudit: () => void;
  onOpenMoveModal: () => void;
  onTitleRename: (newTitle: string) => void;
  onToggleSidebar?: () => void;
  isSidebarOpen?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onCloseWorkbook?: () => void;
  onSyncDB?: () => void;
  isSyncingDB?: boolean;
  onExportToERPDB?: () => void;
  onSave?: () => void;
  onFindReplace?: (findText: string, replaceText: string, replaceAll: boolean, matchCase: boolean) => { count: number };
}

export const ExcelToolbar: React.FC<ExcelToolbarProps> = ({
  workbookTitle,
  activeCell,
  currentCellData,
  onFormatChange,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onInsertRow,
  onDeleteRow,
  onInsertCol,
  onDeleteCol,
  onApplyFormula,
  onSort,
  onToggleFreezeRow,
  isRowFrozen,
  onExportXLSX,
  onExportCSV,
  onImportExcel,
  searchQuery,
  onSearchChange,
  saveStatus,
  currentUser,
  allUsers,
  onOpenAudit,
  onOpenMoveModal,
  onTitleRename,
  onToggleSidebar,
  isSidebarOpen,
  isFullscreen,
  onToggleFullscreen,
  onCloseWorkbook,
  onSyncDB,
  isSyncingDB,
  onExportToERPDB,
  onSave,
  onFindReplace,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeRibbonTab, setActiveRibbonTab] = useState<'Home' | 'Data' | 'Formulas' | 'Insert'>('Data');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(workbookTitle);

  // Find & Replace Modal State
  const [isFindReplaceOpen, setIsFindReplaceOpen] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [findReplaceMsg, setFindReplaceMsg] = useState<string | null>(null);

  const searchBarInputRef = useRef<HTMLInputElement>(null);

  // Global Ctrl+F to focus search, Ctrl+H toggle for Find & Replace
  useEffect(() => {
    const handleFindKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        searchBarInputRef.current?.focus();
        searchBarInputRef.current?.select();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        setIsFindReplaceOpen(true);
      }
    };
    window.addEventListener('keydown', handleFindKey);
    return () => window.removeEventListener('keydown', handleFindKey);
  }, []);

  const handleTitleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (titleInput.trim()) {
      onTitleRename(titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportExcel(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExecuteReplace = (replaceAll: boolean) => {
    if (!findText.trim()) return;
    if (onFindReplace) {
      const res = onFindReplace(findText, replaceText, replaceAll, matchCase);
      if (res.count > 0) {
        setFindReplaceMsg(`Replaced ${res.count} occurrence${res.count > 1 ? 's' : ''}!`);
      } else {
        setFindReplaceMsg('No matching text found.');
      }
      setTimeout(() => setFindReplaceMsg(null), 3000);
    }
  };

  return (
    <div className="sticky top-0 z-30 bg-[#f9fafb] text-slate-800 border-b border-[#cbd5e1] shadow-2xs select-none font-sans">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ========================================================================= */}
      {/* 1. TOP MICROSOFT 365 APP BAR */}
      {/* ========================================================================= */}
      <div className="h-10 px-3 bg-[#f3f4f6] border-b border-[#e5e7eb] flex items-center justify-between gap-2 text-xs">
        {/* Left: Folders Toggle / Workspace Hub + App Icon + Title + Quick Save */}
        <div className="flex items-center gap-2 min-w-0">
          {onCloseWorkbook && (
            <button
              type="button"
              onClick={onCloseWorkbook}
              className="px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer bg-white text-slate-800 hover:bg-emerald-50 hover:text-[#107c41] border border-slate-300 hover:border-[#107c41] shadow-2xs shrink-0"
              title="Full-Screen Workspace Hub"
            >
              <FolderOpen className="w-3.5 h-3.5 text-[#107c41]" />
              <span className="font-bold hidden sm:inline">Workspace Hub</span>
            </button>
          )}

          {/* Excel Green Icon */}
          <div className="w-6 h-6 rounded bg-[#107c41] text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0">
            X
          </div>

          {/* File Name (Editable) */}
          <div className="flex items-center gap-1.5 min-w-0">
            {isEditingTitle ? (
              <form onSubmit={handleTitleSubmit} className="flex items-center">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onBlur={handleTitleSubmit}
                  autoFocus
                  className="px-1.5 py-0.5 text-xs font-bold bg-white text-slate-900 rounded border border-[#107c41] focus:outline-hidden"
                />
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setTitleInput(workbookTitle);
                  setIsEditingTitle(true);
                }}
                className="font-bold text-slate-900 hover:bg-slate-200 px-1.5 py-0.5 rounded transition-colors truncate max-w-[200px]"
                title="Click to rename workbook"
              >
                {workbookTitle}
              </button>
            )}

            {/* DEDICATED QUICK SAVE BUTTON (Cmd+S / Ctrl+S) */}
            {onSave && (
              <button
                type="button"
                onClick={onSave}
                className="px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer bg-[#107c41] hover:bg-[#0b5a2f] text-white shadow-xs shrink-0"
                title="Save Workbook (Cmd+S / Ctrl+S)"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saveStatus === 'saving' ? 'Saving...' : 'Save'}</span>
                <span className="text-[10px] opacity-75 font-normal ml-0.5 hidden sm:inline">⌘S</span>
              </button>
            )}

            {/* Live Database Sync Status Badge & Manual Trigger */}
            <button
              type="button"
              onClick={onSyncDB}
              disabled={isSyncingDB}
              className={`px-2 py-0.5 rounded text-[11px] font-bold flex items-center gap-1 border transition-all cursor-pointer shrink-0 ${
                isSyncingDB
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-emerald-50 text-[#107c41] border-emerald-300 hover:bg-emerald-100 shadow-2xs'
              }`}
              title="Click to sync live with enterprise Supabase Database across all ERP modules"
            >
              <Database className={`w-3 h-3 ${isSyncingDB ? 'animate-spin text-amber-600' : 'text-[#107c41]'}`} />
              <span className="hidden sm:inline">{isSyncingDB ? 'Syncing...' : 'Live DB'}</span>
            </button>
          </div>
        </div>

        {/* Center: Search Box */}
        <div className="hidden md:flex items-center flex-1 max-w-sm mx-2">
          <div className="relative w-full flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
            <input
              ref={searchBarInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search sheet, values, POs... (Ctrl+F)"
              className="w-full bg-white border border-[#d1d5db] focus:border-[#107c41] rounded-md pl-8 pr-8 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden shadow-2xs transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  onSearchChange('');
                  searchBarInputRef.current?.focus();
                }}
                className="absolute right-2 top-1.5 p-0.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 cursor-pointer transition-colors"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Simple User Online Status + Fullscreen + Export */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Simple Clean User Online Status Indicator */}
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200/80 rounded-md text-[11px] font-semibold text-emerald-800 shadow-2xs"
            title="3 users currently collaborating in real-time"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>3 Online</span>
          </div>

          {/* Full Screen Toggle Button */}
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              className={`p-1.5 rounded text-xs font-semibold flex items-center gap-1 border transition-colors cursor-pointer ${
                isFullscreen
                  ? 'bg-purple-100 text-purple-800 border-purple-300 font-bold'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-300'
              }`}
              title={isFullscreen ? 'Exit Full Screen (Alt+F)' : 'Full Screen Mode (Alt+F)'}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isFullscreen ? 'Exit' : 'Full Screen'}</span>
            </button>
          )}

          {/* Export to Excel (.xlsx) Button */}
          <button
            type="button"
            onClick={onExportXLSX}
            className="px-3 py-1 bg-[#107c41] hover:bg-[#0b5a2f] text-white rounded text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            title="Export full workbook to Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export .XLSX</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1.5 INLINE FIND & REPLACE FLOATING BAR */}
      {/* ========================================================================= */}
      {isFindReplaceOpen && (
        <div className="bg-[#fffbeb] border-b border-amber-300 px-3 py-2 flex flex-wrap items-center gap-2 text-xs shadow-xs animate-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-1 font-bold text-amber-900 shrink-0">
            <Replace className="w-3.5 h-3.5 text-amber-700" />
            <span>Find & Replace:</span>
          </div>

          <div className="flex items-center gap-1.5 flex-1 min-w-[280px]">
            <input
              type="text"
              value={findText}
              onChange={(e) => setFindText(e.target.value)}
              placeholder="Find text..."
              className="px-2 py-1 bg-white border border-amber-300 rounded text-xs text-slate-900 focus:outline-hidden focus:border-[#107c41] flex-1"
              autoFocus
            />
            <input
              type="text"
              value={replaceText}
              onChange={(e) => setReplaceText(e.target.value)}
              placeholder="Replace with..."
              className="px-2 py-1 bg-white border border-amber-300 rounded text-xs text-slate-900 focus:outline-hidden focus:border-[#107c41] flex-1"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <label className="flex items-center gap-1 text-[11px] text-amber-900 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={matchCase}
                onChange={(e) => setMatchCase(e.target.checked)}
                className="rounded text-[#107c41]"
              />
              <span>Match Case</span>
            </label>

            <button
              type="button"
              onClick={() => handleExecuteReplace(false)}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-bold text-xs cursor-pointer shadow-2xs"
            >
              Replace Next
            </button>

            <button
              type="button"
              onClick={() => handleExecuteReplace(true)}
              className="px-2.5 py-1 bg-[#107c41] hover:bg-[#0b5a2f] text-white rounded font-bold text-xs cursor-pointer shadow-2xs"
            >
              Replace All
            </button>

            {findReplaceMsg && (
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                {findReplaceMsg}
              </span>
            )}

            <button
              type="button"
              onClick={() => setIsFindReplaceOpen(false)}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-amber-200/60 rounded cursor-pointer"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. EXCEL MENU TABS (Data, Home, Formulas, Insert) */}
      {/* ========================================================================= */}
      <div className="flex items-center px-3 pt-1 border-b border-[#e5e7eb] bg-white text-xs">
        {(['Data', 'Home', 'Formulas', 'Insert'] as const).map((tab) => {
          const isActive = activeRibbonTab === tab;activeRibbonTab === tab;
          return (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveRibbonTab(tab)}
              className={`px-3 py-1 font-medium transition-colors cursor-pointer border-b-2 ${
                isActive
                  ? 'text-[#107c41] border-[#107c41] font-bold'
                  : 'text-slate-600 hover:text-slate-900 border-transparent'
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 3. WORKING EXCEL RIBBON TOOLBAR */}
      {/* ========================================================================= */}
      <div className="bg-white px-3 py-1.5 flex flex-wrap items-center gap-2 text-xs shadow-2xs min-h-[44px]">
        {/* DATA TAB */}
        {activeRibbonTab === 'Data' && (
          <div className="flex flex-wrap items-center gap-2 w-full">
            <button
              type="button"
              onClick={() => onSort('asc')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-[#f3f4f6] text-slate-700 font-semibold transition-colors cursor-pointer border border-transparent hover:border-slate-300"
              title="Sort Ascending (A to Z)"
            >
              <SortAsc className="w-4 h-4 text-[#107c41]" />
              <span>Sort A-Z</span>
            </button>

            <button
              type="button"
              onClick={() => onSort('desc')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded hover:bg-[#f3f4f6] text-slate-700 font-semibold transition-colors cursor-pointer border border-transparent hover:border-slate-300"
              title="Sort Descending (Z to A)"
            >
              <SortDesc className="w-4 h-4 text-[#107c41]" />
              <span>Sort Z-A</span>
            </button>

            {/* Prominent AutoFilter Ribbon Button with Shortcut */}
            <button
              type="button"
              onClick={() => {
                // Trigger filter for current column
                const ev = new KeyboardEvent('keydown', {
                  key: 'L',
                  code: 'KeyL',
                  ctrlKey: true,
                  shiftKey: true,
                  bubbles: true,
                });
                window.dispatchEvent(ev);
              }}
              className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#ecfdf5] hover:bg-[#d1fae5] border border-[#a7f3d0] text-[#065f46] font-bold transition-all cursor-pointer shadow-xs"
              title="Filter Column & Values (Ctrl+Shift+L)"
            >
              <Filter className="w-3.5 h-3.5 text-[#107c41]" />
              <span>Filter</span>
              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                Ctrl+Shift+L
              </span>
            </button>

            <div className="h-5 w-px bg-slate-200 mx-1" />

            {/* Quick AutoSum */}
            <button
              type="button"
              onClick={() => onApplyFormula('SUM')}
              className="px-2.5 py-1 rounded bg-[#107c41] hover:bg-[#0b5a2f] text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
              title="Calculate Sum"
            >
              <Sigma className="w-3.5 h-3.5" />
              <span>AutoSum</span>
            </button>

            {/* Freeze Top Row */}
            <button
              type="button"
              onClick={onToggleFreezeRow}
              className={`px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1 border transition-colors ${
                isRowFrozen
                  ? 'bg-[#dcfce7] text-[#107c41] border-[#86efac] font-bold'
                  : 'bg-[#f3f4f6] text-slate-700 border-slate-300 hover:bg-[#e5e7eb]'
              }`}
              title="Freeze / Pin Top Row"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isRowFrozen ? 'Top Row Frozen' : 'Freeze Top Row'}</span>
            </button>



            {/* Find & Replace Trigger Button */}
            <button
              type="button"
              onClick={() => setIsFindReplaceOpen((prev) => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold transition-all cursor-pointer border ${
                isFindReplaceOpen
                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                  : 'bg-[#f3f4f6] hover:bg-[#e5e7eb] text-slate-700 border-slate-300 shadow-2xs'
              }`}
              title="Find & Replace across sheet (Ctrl+H)"
            >
              <Replace className="w-3.5 h-3.5 text-amber-700" />
              <span>Find & Replace</span>
            </button>

            {/* Import Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 rounded bg-[#f3f4f6] hover:bg-[#e5e7eb] border border-slate-300 text-slate-700 font-medium flex items-center gap-1 cursor-pointer ml-auto"
            >
              <Upload className="w-3.5 h-3.5 text-[#107c41]" />
              <span>Import .XLSX</span>
            </button>
          </div>
        )}

        {/* HOME TAB */}
        {activeRibbonTab === 'Home' && (
          <div className="flex flex-wrap items-center gap-2 w-full">
            {/* Undo / Redo */}
            <div className="flex items-center gap-0.5 pr-2 border-r border-[#e5e7eb]">
              <button
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                title="Undo (Ctrl+Z)"
              >
                <Undo className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                className="p-1.5 rounded hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                title="Redo (Ctrl+Y)"
              >
                <Redo className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Font Size & Big / Small Controls */}
            <div className="flex items-center gap-1 pr-2 border-r border-[#e5e7eb]">
              <select
                value={currentCellData?.fontSize || 12}
                onChange={(e) => onFormatChange({ fontSize: Number(e.target.value) })}
                className="border border-slate-300 rounded px-1.5 py-0.5 text-xs bg-white font-medium text-slate-800"
                title="Font Size"
              >
                {[9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32].map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>

              {/* A▲ Increase Font Size */}
              <button
                type="button"
                onClick={() => {
                  const current = currentCellData?.fontSize || 12;
                  onFormatChange({ fontSize: Math.min(48, current + 2) });
                }}
                className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold flex items-center gap-0.5 cursor-pointer text-slate-800"
                title="Increase Font Size (Big)"
              >
                <span>A</span>
                <span className="text-[9px] text-[#107c41]">▲</span>
              </button>

              {/* A▼ Decrease Font Size */}
              <button
                type="button"
                onClick={() => {
                  const current = currentCellData?.fontSize || 12;
                  onFormatChange({ fontSize: Math.max(8, current - 2) });
                }}
                className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-bold flex items-center gap-0.5 cursor-pointer text-slate-800"
                title="Decrease Font Size (Small)"
              >
                <span>A</span>
                <span className="text-[9px] text-amber-600">▼</span>
              </button>
            </div>

            {/* B / I / U & Colors */}
            <div className="flex items-center gap-1 pr-2 border-r border-[#e5e7eb]">
              <button
                type="button"
                onClick={() => onFormatChange({ bold: !currentCellData?.bold })}
                className={`w-6 h-6 rounded flex items-center justify-center font-bold ${
                  currentCellData?.bold ? 'bg-[#dcfce7] text-[#107c41] font-black' : 'hover:bg-slate-100'
                }`}
                title="Bold (Ctrl+B)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onFormatChange({ italic: !currentCellData?.italic })}
                className={`w-6 h-6 rounded flex items-center justify-center ${
                  currentCellData?.italic ? 'bg-[#dcfce7] text-[#107c41]' : 'hover:bg-slate-100'
                }`}
                title="Italic (Ctrl+I)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onFormatChange({ underline: !currentCellData?.underline })}
                className={`w-6 h-6 rounded flex items-center justify-center ${
                  currentCellData?.underline ? 'bg-[#dcfce7] text-[#107c41]' : 'hover:bg-slate-100'
                }`}
                title="Underline (Ctrl+U)"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>

              <div className="h-4 w-px bg-slate-200 mx-0.5" />

              {/* Color Column / Fill Background Color Picker */}
              <div className="flex items-center gap-1" title="Fill Color (Applies to selection or column)">
                <span className="text-[10px] font-bold text-slate-500">Fill:</span>
                <input
                  type="color"
                  value={currentCellData?.bgColor || '#ffffff'}
                  onChange={(e) => onFormatChange({ bgColor: e.target.value })}
                  className="w-5 h-5 rounded cursor-pointer p-0 border border-slate-300"
                  title="Choose Custom Background / Column Color"
                />
                {/* Quick Swatches for Columns */}
                {['#fef08a', '#bbf7d0', '#bae6fd', '#fecdd3', '#fed7aa', '#e9d5ff'].map((clr) => (
                  <button
                    key={clr}
                    type="button"
                    onClick={() => onFormatChange({ bgColor: clr })}
                    className="w-4 h-4 rounded-sm border border-slate-300 hover:scale-110 transition-transform cursor-pointer shadow-2xs"
                    style={{ backgroundColor: clr }}
                    title={`Color Column / Range ${clr}`}
                  />
                ))}
              </div>

              <div className="h-4 w-px bg-slate-200 mx-0.5" />

              {/* Text Font Color */}
              <div className="flex items-center gap-1" title="Font Text Color">
                <span className="text-[10px] font-bold text-slate-500">Text:</span>
                <input
                  type="color"
                  value={currentCellData?.textColor || '#000000'}
                  onChange={(e) => onFormatChange({ textColor: e.target.value })}
                  className="w-5 h-5 rounded cursor-pointer p-0 border border-slate-300"
                  title="Font Color"
                />
              </div>
            </div>

            {/* Alignment */}
            <div className="flex items-center gap-0.5 pr-2 border-r border-[#e5e7eb]">
              <button
                type="button"
                onClick={() => onFormatChange({ align: 'left' })}
                className={`w-6 h-6 rounded flex items-center justify-center ${
                  currentCellData?.align === 'left' ? 'bg-slate-200' : 'hover:bg-slate-100'
                }`}
                title="Align Left"
              >
                <AlignLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onFormatChange({ align: 'center' })}
                className={`w-6 h-6 rounded flex items-center justify-center ${
                  currentCellData?.align === 'center' ? 'bg-slate-200' : 'hover:bg-slate-100'
                }`}
                title="Align Center"
              >
                <AlignCenter className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onFormatChange({ align: 'right' })}
                className={`w-6 h-6 rounded flex items-center justify-center ${
                  currentCellData?.align === 'right' ? 'bg-slate-200' : 'hover:bg-slate-100'
                }`}
                title="Align Right"
              >
                <AlignRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Format Dropdown */}
            <div className="flex items-center gap-1.5 pr-2 border-r border-[#e5e7eb]">
              <select
                value={currentCellData?.format || 'general'}
                onChange={(e) => onFormatChange({ format: e.target.value as CellFormat })}
                className="border border-slate-300 rounded px-2 py-0.5 text-xs bg-white font-medium"
              >
                <option value="general">General</option>
                <option value="currency">₹ Currency</option>
                <option value="number">Number</option>
                <option value="percent">Percentage (%)</option>
                <option value="date">Date</option>
                <option value="text">Text</option>
              </select>
            </div>

            {/* Insert / Delete Rows & Cols */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onInsertRow('below')}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
              >
                + Row
              </button>
              <button
                type="button"
                onClick={() => onInsertCol('right')}
                className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
              >
                + Col
              </button>
              <button
                type="button"
                onClick={onDeleteRow}
                className="px-1.5 py-0.5 rounded hover:bg-rose-50 text-rose-600 font-semibold text-xs"
              >
                - Row
              </button>
              <button
                type="button"
                onClick={onDeleteCol}
                className="px-1.5 py-0.5 rounded hover:bg-rose-50 text-rose-600 font-semibold text-xs"
              >
                - Col
              </button>
            </div>
          </div>
        )}

        {/* FORMULAS TAB */}
        {activeRibbonTab === 'Formulas' && (
          <div className="flex flex-wrap items-center gap-2 w-full">
            {['SUM', 'AVERAGE', 'COUNT', 'MIN', 'MAX', 'ROUND'].map((fn) => (
              <button
                key={fn}
                type="button"
                onClick={() => onApplyFormula(fn)}
                className="px-3 py-1 rounded bg-[#f3f4f6] hover:bg-[#dcfce7] hover:text-[#107c41] border border-slate-300 font-mono font-bold text-xs"
              >
                ={fn}()
              </button>
            ))}
          </div>
        )}

        {/* INSERT TAB */}
        {activeRibbonTab === 'Insert' && (
          <div className="flex items-center gap-2 w-full">
            <button
              type="button"
              onClick={() => onInsertRow('above')}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
            >
              Insert Row Above
            </button>
            <button
              type="button"
              onClick={() => onInsertRow('below')}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
            >
              Insert Row Below
            </button>
            <button
              type="button"
              onClick={() => onInsertCol('left')}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
            >
              Insert Column Left
            </button>
            <button
              type="button"
              onClick={() => onInsertCol('right')}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold"
            >
              Insert Column Right
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
