import React, { useState } from 'react';
import {
  Folder,
  FolderPlus,
  FileSpreadsheet,
  Plus,
  Search,
  Trash2,
  Pin,
  Clock,
  Layers,
  ShoppingCart,
  Truck,
  Wrench,
  Boxes,
  FolderKanban,
  ShieldCheck,
  Calculator,
  Sparkles,
  Check,
  MoreVertical,
  X,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { Workbook, WorkbookDirectory } from '../../types/workbook';

interface WorkspaceFolderHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  directories: WorkbookDirectory[];
  workbooks: Workbook[];
  activeWorkbookId: string | null;
  onSelectWorkbook: (wb: Workbook) => void;
  onCreateWorkbook: (dirId?: string) => void;
  onCreateDirectory: (name: string) => void;
  onRenameDirectory: (dirId: string, newName: string) => void;
  onDeleteDirectory: (dirId: string) => void;
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

export const WorkspaceFolderHubModal: React.FC<WorkspaceFolderHubModalProps> = ({
  isOpen,
  onClose,
  directories,
  workbooks,
  activeWorkbookId,
  onSelectWorkbook,
  onCreateWorkbook,
  onCreateDirectory,
  onRenameDirectory,
  onDeleteDirectory,
  onOpenTrash,
  trashCount,
}) => {
  const [selectedDirId, setSelectedDirId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingDir, setIsAddingDir] = useState(false);
  const [newDirName, setNewDirName] = useState('');

  const filteredWorkbooks = workbooks.filter((wb) => {
    const matchesDir = selectedDirId ? wb.directory_id === selectedDirId : true;
    const matchesQuery = searchQuery
      ? wb.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        wb.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;
    return matchesDir && matchesQuery;
  });

  const handleCreateDirSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newDirName.trim()) {
      onCreateDirectory(newDirName.trim());
      setNewDirName('');
      setIsAddingDir(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Workspace Folders & Workbooks"
      subtitle="Organize, switch between registers, or create new sheets"
      maxWidth="4xl"
    >
      <div className="space-y-5 text-slate-200">
        {/* 1. TOP CONTROLS: SEARCH + ACTIONS */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search workbooks, registers, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onCreateWorkbook(selectedDirId || undefined);
                onClose();
              }}
              className="px-3 py-2 bg-[#107c41] hover:bg-[#0b5a2f] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Workbook</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddingDir(true)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            >
              <FolderPlus className="w-4 h-4 text-emerald-400" />
              <span>+ Folder</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onOpenTrash();
                onClose();
              }}
              className="px-2.5 py-2 bg-slate-800 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-1 border border-slate-700 transition-colors cursor-pointer"
              title="View Trash"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">({trashCount})</span>
            </button>
          </div>
        </div>

        {/* 2. INLINE ADD FOLDER FORM */}
        {isAddingDir && (
          <form onSubmit={handleCreateDirSubmit} className="p-3 bg-slate-900 border border-emerald-500/50 rounded-xl flex items-center gap-2">
            <input
              type="text"
              placeholder="Enter new folder name..."
              value={newDirName}
              onChange={(e) => setNewDirName(e.target.value)}
              autoFocus
              className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold cursor-pointer"
            >
              Create Folder
            </button>
            <button
              type="button"
              onClick={() => setIsAddingDir(false)}
              className="px-2 py-1.5 text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              Cancel
            </button>
          </form>
        )}

        {/* 3. FOLDERS CAROUSEL / PILLS */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Workspace Folders:
          </label>
          <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
            <button
              type="button"
              onClick={() => setSelectedDirId(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer border ${
                selectedDirId === null
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                  : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>All Workbooks ({workbooks.length})</span>
            </button>

            {directories.map((dir) => {
              const isSelected = selectedDirId === dir.id;
              const count = workbooks.filter((w) => w.directory_id === dir.id).length;
              const DirIcon = (dir.icon && ICON_MAP[dir.icon]) || Folder;

              return (
                <button
                  key={dir.id}
                  type="button"
                  onClick={() => setSelectedDirId(dir.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                  }`}
                >
                  <DirIcon className="w-3.5 h-3.5" style={{ color: isSelected ? '#ffffff' : dir.color || '#10b981' }} />
                  <span>{dir.name}</span>
                  <span className="text-[10px] opacity-75 font-mono">({count})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. WORKBOOKS GRID */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Available Workbooks ({filteredWorkbooks.length})</span>
            {selectedDirId && (
              <button
                type="button"
                onClick={() => setSelectedDirId(null)}
                className="text-emerald-400 hover:underline cursor-pointer"
              >
                Clear Folder Filter
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[45vh] overflow-y-auto custom-scrollbar p-1">
            {filteredWorkbooks.map((wb) => {
              const isActive = wb.id === activeWorkbookId;
              const dir = directories.find((d) => d.id === wb.directory_id);

              return (
                <div
                  key={wb.id}
                  onClick={() => {
                    onSelectWorkbook(wb);
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group ${
                    isActive
                      ? 'bg-emerald-950/60 border-emerald-500 shadow-md ring-1 ring-emerald-400'
                      : 'bg-slate-900 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-[#107c41] text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0">
                          X
                        </div>
                        <h4 className="text-xs font-bold text-white group-hover:text-emerald-400 transition-colors line-clamp-1">
                          {wb.title}
                        </h4>
                      </div>
                      {isActive && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold shrink-0">
                          Active
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2">
                      {wb.description || 'Spreadsheet register'}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="font-semibold text-slate-400 flex items-center gap-1">
                      <Folder className="w-3 h-3 text-slate-500" />
                      {dir?.name || 'General'}
                    </span>
                    <span>{wb.sheets.length} Sheet(s)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
};
