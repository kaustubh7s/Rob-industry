import React, { useState } from 'react';
import { Folder, ArrowRight } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Workbook, WorkbookDirectory } from '../../types/workbook';

interface MoveWorkbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  workbook: Workbook | null;
  directories: WorkbookDirectory[];
  onMove: (wbId: string, newDirId: string) => void;
}

export const MoveWorkbookModal: React.FC<MoveWorkbookModalProps> = ({
  isOpen,
  onClose,
  workbook,
  directories,
  onMove,
}) => {
  const [targetDirId, setTargetDirId] = useState<string>(
    workbook?.directory_id || directories[0]?.id || ''
  );

  if (!workbook) return null;

  const currentDir = directories.find((d) => d.id === workbook.directory_id);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetDirId && targetDirId !== workbook.directory_id) {
      onMove(workbook.id, targetDirId);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Move Workbook to Folder"
      subtitle={`Relocate "${workbook.title}" to a different operational directory`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5 text-slate-200">
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
          <span className="text-slate-400 block">Current Location:</span>
          <div className="flex items-center gap-2 font-bold text-white">
            <Folder className="w-4 h-4 text-emerald-400" />
            <span>{currentDir?.name || 'General'}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Select Destination Folder
          </label>
          <select
            value={targetDirId}
            onChange={(e) => setTargetDirId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
          >
            {directories.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} {d.id === workbook.directory_id ? '(Current)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md cursor-pointer flex items-center gap-1.5"
          >
            <span>Move Workbook</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </Modal>
  );
};
