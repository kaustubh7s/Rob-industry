import React from 'react';
import { Clock, User, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import { Modal } from '../common/Modal';
import { Workbook, WorkbookActivityLog } from '../../types/workbook';

interface WorkbookAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  workbook: Workbook | null;
  logs: WorkbookActivityLog[];
}

export const WorkbookAuditModal: React.FC<WorkbookAuditModalProps> = ({
  isOpen,
  onClose,
  workbook,
  logs,
}) => {
  if (!workbook) return null;

  const wbLogs = logs.filter((l) => l.workbook_id === workbook.id);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Audit & History — ${workbook.title}`}
      subtitle="Complete chronological trail of creations, cell updates, imports and modifications"
      maxWidth="2xl"
    >
      <div className="space-y-6 text-slate-200">
        {/* Meta summary card */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs">
          <div>
            <span className="text-slate-400 block mb-1">Created By:</span>
            <div className="flex items-center gap-2 font-bold text-white">
              <User className="w-3.5 h-3.5 text-blue-400" />
              <span>{workbook.created_by_name || 'Staff'}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
              {new Date(workbook.created_at).toLocaleString('en-GB')}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block mb-1">Last Edited By:</span>
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <Clock className="w-3.5 h-3.5" />
              <span>{workbook.last_edited_by_name || 'Staff'}</span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
              {new Date(workbook.last_edited_at).toLocaleString('en-GB')}
            </span>
          </div>
        </div>

        {/* Activity Trail */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Activity Timeline
          </h4>

          <div className="max-h-80 overflow-y-auto space-y-2 custom-scrollbar">
            {wbLogs.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 italic bg-slate-900/50 rounded-xl border border-slate-800">
                Workbook created recently. Detailed cell changes are auto-saved in local cache and cloud mirror.
              </div>
            ) : (
              wbLogs.map((log) => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      {log.action}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">{log.timestamp}</span>
                  </div>
                  <p className="text-[11px] text-slate-300">{log.details}</p>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Staff: <strong className="text-slate-300">{log.user_name}</strong> ({log.user_role})
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Close */}
        <div className="flex justify-end pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Close Audit Log
          </button>
        </div>
      </div>
    </Modal>
  );
};
