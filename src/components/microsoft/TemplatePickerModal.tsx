import React, { useState } from 'react';
import {
  FileSpreadsheet,
  ShoppingCart,
  Truck,
  Wrench,
  Boxes,
  Layers,
  Sparkles,
  Check,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { SMART_WORKBOOK_TEMPLATES, SmartTemplate } from '../../data/workbookSeedData';
import { WorkbookDirectory } from '../../types/workbook';

interface TemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  directories: WorkbookDirectory[];
  initialDirectoryId?: string;
  onSelectTemplate: (template: SmartTemplate, title: string, directoryId: string) => void;
}

const TEMPLATE_ICONS: Record<string, React.ElementType> = {
  FileSpreadsheet,
  ShoppingCart,
  Truck,
  Wrench,
  Boxes,
  Layers,
};

export const TemplatePickerModal: React.FC<TemplatePickerModalProps> = ({
  isOpen,
  onClose,
  directories,
  initialDirectoryId,
  onSelectTemplate,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('tmpl-blank');
  const [customTitle, setCustomTitle] = useState('');
  const [targetDirId, setTargetDirId] = useState<string>(
    initialDirectoryId || directories[0]?.id || ''
  );

  const selectedTmpl =
    SMART_WORKBOOK_TEMPLATES.find((t) => t.id === selectedTemplateId) ||
    SMART_WORKBOOK_TEMPLATES[0];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = customTitle.trim() || selectedTmpl.title;
    onSelectTemplate(selectedTmpl, finalTitle, targetDirId);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Spreadsheet Workbook"
      subtitle="Start with a blank sheet or use a ready-to-use industrial template"
      maxWidth="3xl"
    >
      <form onSubmit={handleCreate} className="space-y-6 text-slate-200">
        {/* 1. Choose Template Grid */}
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
            1. Select Workbook Template
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {SMART_WORKBOOK_TEMPLATES.map((tmpl) => {
              const Icon = TEMPLATE_ICONS[tmpl.iconName] || FileSpreadsheet;
              const isSelected = tmpl.id === selectedTemplateId;

              return (
                <div
                  key={tmpl.id}
                  onClick={() => {
                    setSelectedTemplateId(tmpl.id);
                    if (!customTitle || customTitle === selectedTmpl.title) {
                      setCustomTitle(tmpl.title);
                    }
                    if (tmpl.defaultDirId) {
                      const match = directories.find((d) => d.id === tmpl.defaultDirId);
                      if (match) setTargetDirId(match.id);
                    }
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-emerald-950/60 border-emerald-500 shadow-md ring-1 ring-emerald-400'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold">
                        <Icon className="w-4 h-4" />
                      </div>
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-white">{tmpl.title}</h4>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {tmpl.description}
                    </p>
                  </div>

                  <span className="mt-3 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 self-start">
                    {tmpl.category}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Configuration: Title & Target Directory */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-800">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Workbook Name / Title
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder={selectedTmpl.title}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Save in Directory / Folder
            </label>
            <select
              value={targetDirId}
              onChange={(e) => setTargetDirId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-emerald-500"
            >
              {directories.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
          >
            Create Workbook
          </button>
        </div>
      </form>
    </Modal>
  );
};
