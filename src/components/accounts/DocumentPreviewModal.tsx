import React from 'react';
import { X, Download, FileText, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { AccountDealDocument } from '../../types/accounts';

interface DocumentPreviewModalProps {
  document: AccountDealDocument | null;
  onClose: () => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document: doc,
  onClose,
}) => {
  if (!doc) return null;

  const isPdf =
    doc.fileType.includes('pdf') ||
    doc.fileName.toLowerCase().endsWith('.pdf') ||
    doc.fileData.startsWith('data:application/pdf');

  const handleDownload = () => {
    const a = window.document.createElement('a');
    a.href = doc.fileData;
    a.download = doc.fileName;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center">
              {isPdf ? <FileText className="w-5 h-5 text-rose-600" /> : <ImageIcon className="w-5 h-5 text-blue-600" />}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 truncate max-w-md">
                {doc.fileName}
              </h3>
              <p className="text-xs text-slate-500">
                Uploaded by {doc.uploadedBy} • {(doc.fileSize / 1024).toFixed(1)} KB
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Download</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Preview Area */}
        <div className="flex-1 overflow-auto p-4 bg-slate-100 flex items-center justify-center min-h-[400px]">
          {isPdf ? (
            <iframe
              src={doc.fileData}
              title={doc.fileName}
              className="w-full h-[650px] rounded-lg border border-slate-300 bg-white shadow-inner"
            />
          ) : (
            <div className="max-w-full max-h-[70vh] flex items-center justify-center">
              <img
                src={doc.fileData}
                alt={doc.fileName}
                className="max-w-full max-h-[70vh] object-contain rounded-lg border border-slate-300 shadow-md bg-white"
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>Official Deal Attachment Document</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors cursor-pointer"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
