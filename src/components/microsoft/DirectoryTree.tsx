import React, { useState } from 'react';
import {
  Folder,
  FolderPlus,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  FileSpreadsheet,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  Copy,
  Pin,
  Trash,
  Layers,
  ShoppingCart,
  Truck,
  Wrench,
  Boxes,
  FolderKanban,
  ShieldCheck,
  Calculator,
  Sparkles,
} from 'lucide-react';
import { WorkbookDirectory, Workbook } from '../../types/workbook';

interface DirectoryTreeProps {
  directories: WorkbookDirectory[];
  workbooks: Workbook[];
  activeWorkbookId: string | null;
  selectedDirectoryId: string | null;
  onSelectDirectory: (dirId: string | null) => void;
  onSelectWorkbook: (wb: Workbook) => void;
  onCreateDirectory: (name: string) => void;
  onRenameDirectory: (dirId: string, newName: string) => void;
  onDeleteDirectory: (dirId: string) => void;
  onCreateWorkbook: (dirId?: string) => void;
  onOpenTrash: () => void;
  trashCount: number;
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

export const DirectoryTree: React.FC<DirectoryTreeProps> = ({
  directories,
  workbooks,
  activeWorkbookId,
  selectedDirectoryId,
  onSelectDirectory,
  onSelectWorkbook,
  onCreateDirectory,
  onRenameDirectory,
  onDeleteDirectory,
  onCreateWorkbook,
  onOpenTrash,
  trashCount,
}) => {
  const [expandedDirs, setExpandedDirs] = useState<Record<string, boolean>>(() => {
    // Default expand all directories
    const map: Record<string, boolean> = {};
    directories.forEach((d) => (map[d.id] = true));
    return map;
  });

  const [menuDirId, setMenuDirId] = useState<string | null>(null);
  const [isAddingDir, setIsAddingDir] = useState(false);
  const [newDirName, setNewDirName] = useState('');
  const [renamingDirId, setRenamingDirId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const toggleExpand = (dirId: string) => {
    setExpandedDirs((prev) => ({ ...prev, [dirId]: !prev[dirId] }));
  };

  const handleCreateDirSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDirName.trim()) {
      onCreateDirectory(newDirName.trim());
      setNewDirName('');
      setIsAddingDir(false);
    }
  };

  const handleRenameSubmit = (dirId: string) => {
    if (renameValue.trim()) {
      onRenameDirectory(dirId, renameValue.trim());
    }
    setRenamingDirId(null);
  };

  return (
    <aside className="w-64 sm:w-72 bg-slate-900 border-r border-slate-800 flex flex-col select-none text-slate-300 h-full shrink-0">
      {/* 1. Header with Title & + New Directory Button */}
      <div className="h-12 px-3 flex items-center justify-between border-b border-slate-800 bg-slate-950/50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-black text-xs border border-emerald-500/30">
            📊
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
            Workbook Folders
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsAddingDir(true)}
          className="p-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700 transition-colors shadow-xs"
          title="Create New Directory"
        >
          <FolderPlus className="w-4 h-4 text-emerald-400" />
        </button>
      </div>

      {/* 2. New Directory Inline Input Form */}
      {isAddingDir && (
        <form onSubmit={handleCreateDirSubmit} className="p-2 border-b border-slate-800 bg-slate-950/70">
          <input
            type="text"
            placeholder="Folder name (e.g. Accounts)..."
            value={newDirName}
            onChange={(e) => setNewDirName(e.target.value)}
            autoFocus
            className="w-full bg-slate-900 border border-emerald-500 rounded px-2.5 py-1 text-xs text-white placeholder-slate-500 focus:outline-hidden mb-1.5"
          />
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setIsAddingDir(false)}
              className="px-2 py-0.5 rounded text-[11px] text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-2.5 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold"
            >
              Add
            </button>
          </div>
        </form>
      )}

      {/* 3. Action Buttons: All Workbooks & New Workbook */}
      <div className="p-2 space-y-1 border-b border-slate-800">
        <button
          type="button"
          onClick={() => onSelectDirectory(null)}
          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            selectedDirectoryId === null && activeWorkbookId === null
              ? 'bg-blue-600 text-white shadow-xs'
              : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5" />
            <span>All Workbooks</span>
          </div>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">
            {workbooks.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onCreateWorkbook(selectedDirectoryId || undefined)}
          className="w-full flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ New Workbook</span>
        </button>
      </div>

      {/* 4. Directory & Workbook Tree */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {directories.map((dir) => {
          const isExpanded = !!expandedDirs[dir.id];
          const dirWorkbooks = workbooks.filter((wb) => wb.directory_id === dir.id);
          const isSelected = selectedDirectoryId === dir.id && activeWorkbookId === null;
          const isRenaming = renamingDirId === dir.id;
          const DirIcon = (dir.icon && ICON_MAP[dir.icon]) || Folder;

          return (
            <div key={dir.id} className="space-y-0.5">
              {/* Directory Item Row */}
              <div
                className={`group flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800 text-emerald-400 font-bold'
                    : 'hover:bg-slate-800/60 text-slate-300'
                }`}
                onClick={() => {
                  onSelectDirectory(dir.id);
                  toggleExpand(dir.id);
                }}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand(dir.id);
                    }}
                    className="p-0.5 text-slate-400 hover:text-white"
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <DirIcon
                    className="w-3.5 h-3.5 shrink-0"
                    style={{ color: dir.color || '#10b981' }}
                  />

                  {isRenaming ? (
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => handleRenameSubmit(dir.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRenameSubmit(dir.id);
                        if (e.key === 'Escape') setRenamingDirId(null);
                      }}
                      autoFocus
                      className="px-1 py-0.5 text-xs bg-slate-950 text-white rounded border border-emerald-500 focus:outline-hidden w-28"
                    />
                  ) : (
                    <span className="truncate text-slate-200">{dir.name}</span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-[10px] font-mono px-1 rounded bg-slate-800/80 text-slate-400">
                    {dirWorkbooks.length}
                  </span>

                  {/* Context Menu Toggle */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuDirId(menuDirId === dir.id ? null : dir.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-opacity"
                    >
                      <MoreVertical className="w-3 h-3" />
                    </button>

                    {menuDirId === dir.id && (
                      <div
                        className="absolute right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1 z-50 w-36 space-y-0.5 text-slate-200 text-xs animate-fadeIn"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingDirId(dir.id);
                            setRenameValue(dir.name);
                            setMenuDirId(null);
                          }}
                          className="w-full text-left px-2 py-1 hover:bg-slate-800 rounded flex items-center gap-2"
                        >
                          <Edit2 className="w-3 h-3 text-blue-400" />
                          <span>Rename</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onCreateWorkbook(dir.id);
                            setMenuDirId(null);
                          }}
                          className="w-full text-left px-2 py-1 hover:bg-slate-800 rounded flex items-center gap-2"
                        >
                          <Plus className="w-3 h-3 text-emerald-400" />
                          <span>+ Workbook</span>
                        </button>
                        {!dir.is_system && (
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteDirectory(dir.id);
                              setMenuDirId(null);
                            }}
                            className="w-full text-left px-2 py-1 text-rose-400 hover:bg-rose-950/40 rounded flex items-center gap-2 border-t border-slate-800 mt-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Workbooks inside this Directory */}
              {isExpanded && (
                <div className="pl-6 space-y-0.5 border-l border-slate-800/80 ml-3 py-0.5">
                  {dirWorkbooks.length === 0 ? (
                    <div className="text-[11px] text-slate-400 italic py-1 px-2">
                      No workbooks
                    </div>
                  ) : (
                    dirWorkbooks.map((wb) => {
                      const isWbActive = activeWorkbookId === wb.id;

                      return (
                        <button
                          key={wb.id}
                          type="button"
                          onClick={() => onSelectWorkbook(wb)}
                          className={`w-full text-left flex items-center justify-between px-2 py-1.5 rounded-lg text-xs transition-colors group cursor-pointer ${
                            isWbActive
                              ? 'bg-emerald-600 text-white font-bold shadow-xs'
                              : 'hover:bg-slate-800 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileSpreadsheet
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isWbActive ? 'text-white' : 'text-emerald-400'
                              }`}
                            />
                            <span className="truncate">{wb.title}</span>
                          </div>

                          {wb.is_pinned && (
                            <Pin
                              className={`w-3 h-3 shrink-0 ${
                                isWbActive ? 'text-white' : 'text-amber-400'
                              }`}
                            />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 5. Footer: Microsoft Trash & Recovery */}
      <div className="p-2 border-t border-slate-800 bg-slate-950/40">
        <button
          type="button"
          onClick={onOpenTrash}
          className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Trash className="w-3.5 h-3.5 text-rose-400" />
            <span>Microsoft Trash</span>
          </div>
          {trashCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {trashCount}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
};
