import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Upload,
  Pin,
  Clock,
  Search,
  Layers,
  Trash2,
  Copy,
  FolderKanban,
  CheckCircle2,
  FilePlus2,
  FolderOpen,
  Folder,
  FolderPlus,
  LayoutGrid,
  List,
  Sparkles,
  ExternalLink,
  Users,
  ShoppingCart,
  Truck,
  Wrench,
  Boxes,
  ShieldCheck,
  Calculator,
} from 'lucide-react';
import { Workbook, WorkbookDirectory } from '../../types/workbook';
import { User } from '../../types/erp';

interface WorkbookLandingPageProps {
  workbooks: Workbook[];
  directories: WorkbookDirectory[];
  selectedDirectoryId: string | null;
  onSelectDirectory?: (dirId: string | null) => void;
  onCreateDirectory?: (name: string) => void;
  onSelectWorkbook: (wb: Workbook) => void;
  onCreateWorkbook: (dirId?: string) => void;
  onImportExcel: (file: File) => void;
  onTogglePin: (wbId: string) => void;
  onDuplicateWorkbook: (wbId: string) => void;
  onDeleteWorkbook: (wbId: string) => void;
  currentUser: User;
  allUsers: User[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  ShoppingCart,
  Layers,
  Truck,
  Wrench,
  Boxes,
  FolderKanban,
  ShieldCheck,
  Calculator,
  Sparkles,
};

export const WorkbookLandingPage: React.FC<WorkbookLandingPageProps> = ({
  workbooks,
  directories,
  selectedDirectoryId,
  onSelectDirectory,
  onCreateDirectory,
  onSelectWorkbook,
  onCreateWorkbook,
  onImportExcel,
  onTogglePin,
  onDuplicateWorkbook,
  onDeleteWorkbook,
  currentUser,
  allUsers,
  searchQuery,
  onSearchChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [activeDirFilter, setActiveDirFilter] = useState<string | null>(selectedDirectoryId);
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const currentDirId = activeDirFilter !== undefined ? activeDirFilter : selectedDirectoryId;
  const selectedDir = directories.find((d) => d.id === currentDirId);

  // Filtered list
  const filteredWorkbooks = workbooks.filter((wb) => {
    const matchesDir = currentDirId ? wb.directory_id === currentDirId : true;
    const matchesQuery = searchQuery
      ? wb.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wb.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())) ||
        wb.description?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    return matchesDir && matchesQuery;
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportExcel(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim() && onCreateDirectory) {
      onCreateDirectory(newFolderName.trim());
      setNewFolderName('');
      setIsAddingFolder(false);
    }
  };

  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-[#f8fafc] p-6 space-y-6 custom-scrollbar text-slate-900 select-none font-sans">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* ========================================================================= */}
      {/* 1. TOP HEADER: TITLE + SEARCH + CARD / TABLE VIEW TOGGLE + ACTIONS */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        {/* Left: App Title */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#107c41] text-white flex items-center justify-center font-black text-xl shadow-md">
            X
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">
                Workspace Registers & Folders
              </h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-[#107c41] border border-emerald-300">
                {filteredWorkbooks.length} Workbooks
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Browse, organize, and manage plant registers with Card & Table views
            </p>
          </div>
        </div>

        {/* Right: Search + Card/Table Toggle + Quick Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Quick Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search workbooks, POs, tags..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#107c41] shadow-2xs"
            />
          </div>

          {/* Card View / Table View Segmented Toggle */}
          <div className="flex items-center p-0.5 bg-slate-200 rounded-xl border border-slate-300 shadow-2xs">
            <button
              type="button"
              onClick={() => setViewMode('card')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'card'
                  ? 'bg-white text-[#107c41] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Card View</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-[#107c41] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Table List View"
            >
              <List className="w-3.5 h-3.5" />
              <span>Table View</span>
            </button>
          </div>

          {/* One-Touch New Workbook */}
          <button
            type="button"
            onClick={() => onCreateWorkbook(currentDirId || undefined)}
            className="px-3.5 py-1.5 bg-[#107c41] hover:bg-[#0b5a2f] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Workbook</span>
          </button>

          {/* Import XLSX */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            <span>Import</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. HORIZONTAL FOLDER PILLS BAR */}
      {/* ========================================================================= */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <Folder className="w-3.5 h-3.5 text-slate-400" />
            <span>Workspace Folders</span>
          </label>

          <button
            type="button"
            onClick={() => setIsAddingFolder((prev) => !prev)}
            className="text-xs font-bold text-[#107c41] hover:text-[#0b5a2f] flex items-center gap-1 cursor-pointer"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>+ New Folder</span>
          </button>
        </div>

        {/* Inline Create Folder Input Form */}
        {isAddingFolder && (
          <form onSubmit={handleCreateFolder} className="p-2.5 bg-white border border-emerald-400 rounded-xl flex items-center gap-2 shadow-sm max-w-md">
            <input
              type="text"
              placeholder="Enter folder name (e.g. Accounts)..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              autoFocus
              className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 focus:outline-hidden focus:border-[#107c41]"
            />
            <button
              type="submit"
              className="px-3 py-1 bg-[#107c41] hover:bg-[#0b5a2f] text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Add Folder
            </button>
            <button
              type="button"
              onClick={() => setIsAddingFolder(false)}
              className="px-2 py-1 text-slate-500 hover:text-slate-800 text-xs cursor-pointer"
            >
              Cancel
            </button>
          </form>
        )}

        {/* Folder Pills Carousel */}
        <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
          <button
            type="button"
            onClick={() => {
              setActiveDirFilter(null);
              onSelectDirectory?.(null);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer border ${
              currentDirId === null
                ? 'bg-[#107c41] text-white border-[#0b5a2f] shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Workbooks ({workbooks.length})</span>
          </button>

          {directories.map((dir) => {
            const isSelected = currentDirId === dir.id;
            const count = workbooks.filter((w) => w.directory_id === dir.id).length;
            const DirIcon = (dir.icon && ICON_MAP[dir.icon]) || Folder;

            return (
              <button
                key={dir.id}
                type="button"
                onClick={() => {
                  setActiveDirFilter(dir.id);
                  onSelectDirectory?.(dir.id);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer border ${
                  isSelected
                    ? 'bg-[#107c41] text-white border-[#0b5a2f] shadow-xs'
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300'
                }`}
              >
                <DirIcon className="w-3.5 h-3.5" style={{ color: isSelected ? '#ffffff' : dir.color || '#10b981' }} />
                <span>{dir.name}</span>
                <span className={`text-[10px] font-mono px-1 rounded ${isSelected ? 'bg-[#0b5a2f] text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CARD VIEW MODE */}
      {/* ========================================================================= */}
      {viewMode === 'card' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider">
              {selectedDir ? `${selectedDir.name} Register Cards` : 'All Register Cards'} ({filteredWorkbooks.length})
            </span>
            {currentDirId && (
              <button
                type="button"
                onClick={() => {
                  setActiveDirFilter(null);
                  onSelectDirectory?.(null);
                }}
                className="text-[#107c41] font-bold hover:underline cursor-pointer"
              >
                Show All Folders
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredWorkbooks.map((wb) => {
              const dir = directories.find((d) => d.id === wb.directory_id);

              return (
                <div
                  key={wb.id}
                  onClick={() => onSelectWorkbook(wb)}
                  className="group bg-white hover:bg-emerald-50/20 border border-slate-200 hover:border-[#107c41] rounded-2xl p-4.5 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header: Icon + Folder Badge + Pin */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#107c41]/10 group-hover:bg-[#107c41] text-[#107c41] group-hover:text-white flex items-center justify-center font-black text-sm border border-[#107c41]/30 transition-colors shadow-2xs shrink-0">
                          X
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#107c41] transition-colors line-clamp-1">
                            {wb.title}
                          </h3>
                          <span className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                            <Folder className="w-3 h-3 text-slate-400" />
                            {dir?.name || 'General'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onTogglePin(wb.id);
                        }}
                        className={`p-1 rounded-lg hover:bg-slate-100 ${
                          wb.is_pinned ? 'text-amber-500' : 'text-slate-300 hover:text-slate-600'
                        }`}
                        title={wb.is_pinned ? 'Unpin' : 'Pin to Top'}
                      >
                        <Pin className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {wb.description || 'Plant operational register with real-time spreadsheet data.'}
                    </p>

                    {/* Tags */}
                    {wb.tags && wb.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {wb.tags.slice(0, 3).map((tag, tIdx) => (
                          <span
                            key={tIdx}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bottom Footer: Sheet Count + Editor Info + Action Icons */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1 text-[11px] font-mono text-slate-600 font-semibold">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-[#107c41]" />
                      <span>{wb.sheets.length} Sheet(s)</span>
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onDuplicateWorkbook(wb.id)}
                        className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                        title="Duplicate"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteWorkbook(wb.id)}
                        className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TABLE VIEW MODE */}
      {/* ========================================================================= */}
      {viewMode === 'table' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-bold uppercase tracking-wider">
              {selectedDir ? `${selectedDir.name} Register Table` : 'All Registers Table'} ({filteredWorkbooks.length})
            </span>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead>
                <tr className="bg-[#f8fafc] text-slate-600 border-b border-slate-200 font-bold text-[11px]">
                  <th className="py-3 px-4">Register / Workbook</th>
                  <th className="py-3 px-4">Folder</th>
                  <th className="py-3 px-4">Sheets</th>
                  <th className="py-3 px-4">Tags</th>
                  <th className="py-3 px-4">Last Modified</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWorkbooks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-slate-400">
                      No workbooks found in this folder. Click <strong>+ New Workbook</strong> or <strong>Import</strong> to begin.
                    </td>
                  </tr>
                ) : (
                  filteredWorkbooks.map((wb) => {
                    const dir = directories.find((d) => d.id === wb.directory_id);

                    return (
                      <tr
                        key={wb.id}
                        onClick={() => onSelectWorkbook(wb)}
                        className="hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-[#107c41]/10 text-[#107c41] flex items-center justify-center font-bold text-xs border border-[#107c41]/20 shrink-0">
                              <FileSpreadsheet className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 group-hover:text-[#107c41] transition-colors block text-xs">
                                {wb.title}
                              </span>
                              <span className="text-[11px] text-slate-400 line-clamp-1">
                                {wb.description || 'Operational spreadsheet'}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-[11px] font-semibold flex items-center gap-1 w-fit">
                            <Folder className="w-3 h-3 text-slate-400" />
                            {dir?.name || 'General'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-slate-600">
                          <strong className="text-slate-900">{wb.sheets.length}</strong> ({wb.sheets.map((s) => s.name).join(', ')})
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {wb.tags?.slice(0, 2).map((t, idx) => (
                              <span key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-[11px] text-slate-500">
                          {wb.last_edited_by_name ? `By ${wb.last_edited_by_name}` : 'Staff'} •{' '}
                          {new Date(wb.last_edited_at).toLocaleDateString('en-GB')}
                        </td>

                        <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => onTogglePin(wb.id)}
                              className={`p-1.5 rounded hover:bg-slate-100 ${
                                wb.is_pinned ? 'text-amber-500' : 'text-slate-400 hover:text-slate-600'
                              }`}
                              title={wb.is_pinned ? 'Unpin' : 'Pin to Top'}
                            >
                              <Pin className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onDuplicateWorkbook(wb.id)}
                              className="p-1.5 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                              title="Duplicate"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => onDeleteWorkbook(wb.id)}
                              className="p-1.5 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
