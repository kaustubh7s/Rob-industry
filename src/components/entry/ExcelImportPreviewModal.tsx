import React, { useState } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Layers,
  ChevronDown,
  X,
  Sparkles,
  Info,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  SheetAnalysisResult,
  ERP_TARGET_COLUMNS,
  ParsedImportRow,
  analyzeWorksheet,
} from '../../utils/excelImportEngine';

interface ExcelImportPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  workbook: XLSX.WorkBook | null;
  initialAnalysis: SheetAnalysisResult | null;
  onConfirmImport: (importedRows: ParsedImportRow[], batchInfo: {
    sheetName: string;
    overrideProject?: string;
    overrideMachine?: string;
    overrideVendor?: string;
    overridePoNo?: string;
  }) => void;
}

export const ExcelImportPreviewModal: React.FC<ExcelImportPreviewModalProps> = ({
  isOpen,
  onClose,
  fileName,
  workbook,
  initialAnalysis,
  onConfirmImport,
}) => {
  const [activeSheet, setActiveSheet] = useState<string>(initialAnalysis?.activeSheetName || '');
  const [analysis, setAnalysis] = useState<SheetAnalysisResult | null>(initialAnalysis);

  // Manual mapping overrides per source column index
  const [customMappings, setCustomMappings] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    if (initialAnalysis) {
      initialAnalysis.columnMappings.forEach((m) => {
        init[m.sourceIndex] = m.mappedField;
      });
    }
    return init;
  });

  // Metadata overrides if detected or user wants to customize
  const [targetProject, setTargetProject] = useState<string>(
    initialAnalysis?.detectedMetadata.projectName ||
    initialAnalysis?.detectedMetadata.customerName ||
    ''
  );
  const [targetMachine, setTargetMachine] = useState<string>(
    initialAnalysis?.detectedMetadata.machineName || ''
  );
  const [targetVendor, setTargetVendor] = useState<string>(
    initialAnalysis?.detectedMetadata.vendorName || ''
  );
  const [targetPoNo, setTargetPoNo] = useState<string>(
    initialAnalysis?.detectedMetadata.poNumber || ''
  );

  const handleSheetChange = (sheetName: string) => {
    if (!workbook) return;
    setActiveSheet(sheetName);
    const newAnalysis = analyzeWorksheet(workbook, sheetName);
    setAnalysis(newAnalysis);

    const initMap: Record<number, string> = {};
    newAnalysis.columnMappings.forEach((m) => {
      initMap[m.sourceIndex] = m.mappedField;
    });
    setCustomMappings(initMap);

    if (newAnalysis.detectedMetadata.projectName || newAnalysis.detectedMetadata.customerName) {
      setTargetProject(newAnalysis.detectedMetadata.projectName || newAnalysis.detectedMetadata.customerName || '');
    }
    if (newAnalysis.detectedMetadata.vendorName) {
      setTargetVendor(newAnalysis.detectedMetadata.vendorName);
    }
    if (newAnalysis.detectedMetadata.poNumber) {
      setTargetPoNo(newAnalysis.detectedMetadata.poNumber);
    }
  };

  const handleMappingChange = (colIndex: number, newField: string) => {
    setCustomMappings((prev) => ({
      ...prev,
      [colIndex]: newField,
    }));
  };

  // Re-map rows dynamically if user altered column dropdowns
  const effectiveRows: ParsedImportRow[] = React.useMemo(() => {
    if (!analysis) return [];
    const fieldToColIdx: Record<string, number> = {};
    Object.entries(customMappings).forEach(([idxStr, fieldKey]) => {
      if (fieldKey && fieldKey !== 'ignore') {
        fieldToColIdx[fieldKey] = Number(idxStr);
      }
    });

    return analysis.parsedRows.map((origRow) => {
      const copy: ParsedImportRow = { ...origRow };
      const raw = origRow.rawSourceData;

      // Extract by updated column mapping
      analysis.columnMappings.forEach((col) => {
        const mappedKey = customMappings[col.sourceIndex];
        const val = raw[col.sourceHeader];
        if (mappedKey === 'srNo' && val !== undefined && val !== null && String(val).trim() !== '') {
          copy.srNo = val;
        } else if (mappedKey === 'description' && val) {
          copy.description = String(val).trim();
        } else if (mappedKey === 'sizeSpecs' && val) {
          copy.sizeSpecs = String(val).trim();
        } else if (mappedKey === 'materialType' && val) {
          copy.materialType = String(val).trim() as any;
        } else if (mappedKey === 'quantity' && val !== undefined) {
          const numMatch = String(val).match(/([0-9]+(?:\.[0-9]+)?)/);
          copy.quantity = numMatch ? parseFloat(numMatch[1]) : 1;
        } else if (mappedKey === 'unit' && val) {
          copy.unit = String(val).trim();
        } else if (mappedKey === 'projectName' && val) {
          copy.projectName = String(val).trim();
        } else if (mappedKey === 'machineName' && val) {
          copy.machineName = String(val).trim();
        } else if (mappedKey === 'vendorName' && val) {
          copy.vendorName = String(val).trim();
        } else if (mappedKey === 'poNo' && val) {
          copy.poNo = String(val).trim();
        } else if (mappedKey === 'date' && val) {
          copy.date = String(val).trim();
        }
      });

      // Apply overrides if specified
      if (targetProject) copy.projectName = copy.projectName || targetProject;
      if (targetMachine) copy.machineName = copy.machineName || targetMachine;
      if (targetVendor) copy.vendorName = copy.vendorName || targetVendor;
      if (targetPoNo) copy.poNo = copy.poNo || targetPoNo;

      return copy;
    });
  }, [analysis, customMappings, targetProject, targetMachine, targetVendor, targetPoNo]);

  const handleConfirm = () => {
    onConfirmImport(effectiveRows, {
      sheetName: activeSheet,
      overrideProject: targetProject || undefined,
      overrideMachine: targetMachine || undefined,
      overrideVendor: targetVendor || undefined,
      overridePoNo: targetPoNo || undefined,
    });
  };

  if (!isOpen || !initialAnalysis || !workbook || !analysis) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">Intelligent Excel Import Preview</h2>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Auto-Detected
                </span>
              </div>
              <p className="text-xs text-slate-400">
                File: <span className="font-semibold text-slate-200">{fileName}</span> &bull; Sheet:{' '}
                <span className="font-semibold text-slate-200">{activeSheet}</span> &bull; Detected Header Row #{analysis.headerRowIndex + 1}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Controls: Sheet Selector & Metadata Recognition */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-800/40 border border-slate-800 rounded-xl">
            {/* Sheet Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-blue-400" /> Worksheet
              </label>
              <div className="relative">
                <select
                  value={activeSheet}
                  onChange={(e) => handleSheetChange(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs font-semibold appearance-none focus:outline-none focus:border-blue-500"
                >
                  {analysis.sheetNames.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              </div>
            </div>

            {/* Target Project / Customer Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Target Project / Customer
              </label>
              <input
                type="text"
                value={targetProject}
                onChange={(e) => setTargetProject(e.target.value)}
                placeholder="e.g. Cadila Pharma / Washing Unit"
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Target Machine */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                Machine / Equipment Name
              </label>
              <input
                type="text"
                value={targetMachine}
                onChange={(e) => setTargetMachine(e.target.value)}
                placeholder="e.g. Mono Conveyor Line"
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 text-xs font-medium focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* PO & Vendor */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                PO No & Vendor (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={targetPoNo}
                  onChange={(e) => setTargetPoNo(e.target.value)}
                  placeholder="PO #"
                  className="w-1/2 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium focus:outline-none focus:border-blue-500"
                />
                <input
                  type="text"
                  value={targetVendor}
                  onChange={(e) => setTargetVendor(e.target.value)}
                  placeholder="Vendor"
                  className="w-1/2 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Column Mapping Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <span>Column Mappings</span>
                <span className="text-[11px] font-normal text-slate-500">
                  ({analysis.columnMappings.length} source columns recognized)
                </span>
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Original Excel Sr. No. is preserved identically (duplicates, gaps, and text IDs)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
              {analysis.columnMappings.map((col) => {
                const currentMapped = customMappings[col.sourceIndex] || 'ignore';
                const isMatched = currentMapped !== 'ignore';

                return (
                  <div
                    key={col.sourceIndex}
                    className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                      isMatched
                        ? 'bg-slate-800/80 border-slate-700'
                        : 'bg-slate-900/50 border-slate-800/80 opacity-75'
                    }`}
                  >
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 truncate mb-1">
                        Source: &ldquo;{col.sourceHeader}&rdquo;
                      </div>
                      <div className="text-[10px] text-slate-500 truncate mb-2">
                        Samples: {col.sampleValues.slice(0, 2).map((s) => String(s)).join(', ') || '—'}
                      </div>
                    </div>

                    <div>
                      <select
                        value={currentMapped}
                        onChange={(e) => handleMappingChange(col.sourceIndex, e.target.value)}
                        className={`w-full text-xs font-semibold rounded-lg px-2 py-1.5 border appearance-none focus:outline-none ${
                          isMatched
                            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                            : 'bg-slate-900 border-slate-700 text-slate-400'
                        }`}
                      >
                        <option value="ignore">Skip / Ignore</option>
                        {ERP_TARGET_COLUMNS.map((tc) => (
                          <option key={tc.key} value={tc.key}>
                            &rarr; {tc.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Preview Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Data Preview ({effectiveRows.length} material rows detected)
              </h3>
              <span className="text-xs text-slate-400">
                Displaying first {Math.min(10, effectiveRows.length)} rows
              </span>
            </div>

            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/60 max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-800/90 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2.5 w-16 text-center font-bold text-emerald-400">Sr. No.</th>
                    <th className="px-3 py-2.5 font-bold">Description</th>
                    <th className="px-3 py-2.5 font-bold">Material Type</th>
                    <th className="px-3 py-2.5 font-bold">Size Specs</th>
                    <th className="px-3 py-2.5 w-20 text-right font-bold">Qty</th>
                    <th className="px-3 py-2.5 w-16 font-bold">Unit</th>
                    <th className="px-3 py-2.5 font-bold">Project</th>
                    <th className="px-3 py-2.5 font-bold">Vendor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {effectiveRows.slice(0, 15).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-3 py-2 text-center font-bold text-emerald-400 bg-emerald-500/5">
                        {String(row.srNo)}
                      </td>
                      <td className="px-3 py-2 text-slate-200 font-sans font-medium truncate max-w-xs">
                        {row.description || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-300">
                        {row.materialType || 'SS Flat'}
                      </td>
                      <td className="px-3 py-2 text-slate-300 truncate max-w-xs">
                        {row.sizeSpecs || '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-slate-100">
                        {row.quantity}
                      </td>
                      <td className="px-3 py-2 text-slate-400">
                        {row.unit || 'Nos'}
                      </td>
                      <td className="px-3 py-2 text-slate-400 font-sans truncate max-w-[120px]">
                        {row.projectName || targetProject || '—'}
                      </td>
                      <td className="px-3 py-2 text-slate-400 font-sans truncate max-w-[120px]">
                        {row.vendorName || targetVendor || '—'}
                      </td>
                    </tr>
                  ))}
                  {effectiveRows.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-slate-500 font-sans">
                        No material rows identified. Please verify the header row mapping above.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/90">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              Ready to import <strong className="text-white">{effectiveRows.length}</strong> items into Material Entry Workstation
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={effectiveRows.length === 0}
              className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 active:scale-95 disabled:opacity-50 disabled:pointer-events-none rounded-xl transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2"
            >
              <span>Confirm & Import Material Records</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
