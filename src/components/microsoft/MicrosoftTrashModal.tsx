import React from 'react';
import { Trash2, RotateCcw, ShieldAlert, FileSpreadsheet, Folder } from 'lucide-react';
import { Modal } from '../common/Modal';
import { WorkbookTrashItem } from '../../types/workbook';
import { User } from '../../types/erp';

interface MicrosoftTrashModalProps {
  isOpen: boolean;
  onClose: () => void;
  trashItems: WorkbookTrashItem[];
  onRestore: (item: WorkbookTrashItem) => void;
  onPermanentDelete: (id: string) => void;
  onEmptyTrash: () => void;
  currentUser: User;
}

export const MicrosoftTrashModal: React.FC<MicrosoftTrashModalProps> = ({
  isOpen,
  onClose,
  trashItems,
  onRestore,
  onPermanentDelete,
  onEmptyTrash,
  currentUser,
}) => {
  const isSuperOrAdmin =
    currentUser.role === 'super_admin' ||
    currentUser.role === 'kaustubh' ||
    currentUser.role === 'admin';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Microsoft Workbook Trash & Recovery"
      subtitle="Safely restore deleted registers or permanently purge unwanted records"
      maxWidth="3xl"
    >
      <div className="space-y-6 text-slate-200">
        {/* Banner */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>
              <strong>{trashItems.length}</strong> items in Microsoft Trash
            </span>
          </div>

          {trashItems.length > 0 && isSuperOrAdmin && (
            <button
              type="button"
              onClick={onEmptyTrash}
              className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/30 text-xs font-bold transition-all cursor-pointer"
            >
              Empty Trash Permanently
            </button>
          )}
        </div>

        {/* Trash Items List */}
        <div className="max-h-96 overflow-y-auto space-y-2 custom-scrollbar">
          {trashItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              Trash is empty. All active workbooks are safe.
            </div>
          ) : (
            trashItems.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4 text-xs hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-rose-600/20 text-rose-400 flex items-center justify-center font-bold shrink-0 border border-rose-500/30">
                    {item.item_type === 'directory' ? (
                      <Folder className="w-4 h-4" />
                    ) : (
                      <FileSpreadsheet className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <span className="font-bold text-white block truncate">{item.title}</span>
                    <span className="text-[11px] text-slate-400">
                      Type: <strong className="uppercase">{item.item_type}</strong> | Deleted by:{' '}
                      {item.deleted_by_name} ({new Date(item.deleted_at).toLocaleString('en-GB')})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onRestore(item)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Restore</span>
                  </button>

                  {isSuperOrAdmin && (
                    <button
                      type="button"
                      onClick={() => onPermanentDelete(item.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 transition-colors"
                      title="Delete Permanently"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Close Trash
          </button>
        </div>
      </div>
    </Modal>
  );
};
