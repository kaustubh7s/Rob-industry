import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Search,
  Copy,
  CheckCircle2,
  Clock,
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  ChevronRight,
  ChevronDown,
  Trash2,
  Edit2,
  FolderTree,
  ShieldCheck,
  History,
  RefreshCw,
  Sparkles,
  FolderKanban,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { BOMRecord, BOMItem, MachineCategory, BOMStatus } from '../../types/erp';
import { StatusBadge } from '../common/StatusBadge';
import { formatINR } from '../../utils/calculations';
import { exportToExcel, exportToPdfReport } from '../../utils/excelIntegration';
import { Modal } from '../common/Modal';

export const BOMManager: React.FC = () => {
  const {
    boms,
    addBOM,
    updateBOM,
    approveBOM,
    copyBOM,
    deleteBOM,
    currentUser,
    syncProjectToBOM,
    machines,
    learnMachine,
  } = useERP();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBOMId, setSelectedBOMId] = useState<string | null>(boms[0]?.id || null);
  const [expandedSubAssemblies, setExpandedSubAssemblies] = useState<{ [key: string]: boolean }>({
    'bi-1': true,
    'bi-2': true,
    'bi-w1': true,
  });

  const [isNewBOMModalOpen, setIsNewBOMModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // New BOM form
  const [newBomForm, setNewBomForm] = useState({
    bomNumber: `BOM-${Date.now().toString().slice(-4)}`,
    machineType: '',
    assemblyName: '',
    revision: 'Rev A',
    notes: '',
  });

  // Copy BOM form
  const [copyForm, setCopyForm] = useState({
    newBomNumber: `BOM-COPY-${Date.now().toString().slice(-4)}`,
    newAssemblyName: '',
  });

  // Add Item to BOM form
  const [itemForm, setItemForm] = useState({
    itemType: 'raw_material' as BOMItem['itemType'],
    name: '',
    sizeSpecs: '',
    quantity: 1,
    unit: 'Nos',
    unitCost: 100,
    drawingRef: '',
    parentSubAssemblyId: '',
  });

  const filteredBoms = boms.filter((b) => {
    const term = searchTerm.toLowerCase();
    return (
      b.bomNumber.toLowerCase().includes(term) ||
      b.assemblyName.toLowerCase().includes(term) ||
      b.machineType.toLowerCase().includes(term) ||
      (b.customer || '').toLowerCase().includes(term) ||
      (b.projectName || '').toLowerCase().includes(term)
    );
  });

  // Resolve currently selected BOM (falls back to first filtered BOM or first in list)
  const activeSelectedBOM =
    boms.find((b) => b.id === selectedBOMId) ||
    filteredBoms[0] ||
    boms[0] ||
    null;

  const toggleSubAssembly = (id: string) => {
    setExpandedSubAssemblies((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateBOM = (e: React.FormEvent) => {
    e.preventDefault();
    if (newBomForm.machineType) {
      learnMachine(newBomForm.machineType);
    }

    addBOM({
      bomNumber: newBomForm.bomNumber.trim(),
      machineType: (newBomForm.machineType.trim() || 'General Machine') as MachineCategory,
      assemblyName: newBomForm.assemblyName.trim() || 'General Assembly',
      revision: newBomForm.revision.trim() || 'Rev A',
      notes: newBomForm.notes.trim(),
      status: 'Draft',
      effectiveDate: new Date().toISOString().split('T')[0],
      createdBy: currentUser.name,
      totalEstimatedCost: 0,
      items: [],
      history: [
        {
          revision: newBomForm.revision || 'Rev A',
          changedBy: currentUser.name,
          date: new Date().toISOString().split('T')[0],
          changeSummary: 'Initial Bill of Materials created',
        },
      ],
    });
    setIsNewBOMModalOpen(false);
    setNewBomForm({
      bomNumber: `BOM-${Date.now().toString().slice(-4)}`,
      machineType: '',
      assemblyName: '',
      revision: 'Rev A',
      notes: '',
    });
  };

  const handleCopyBOM = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeSelectedBOM) {
      copyBOM(activeSelectedBOM.id, copyForm.newBomNumber, copyForm.newAssemblyName);
      setIsCopyModalOpen(false);
    }
  };

  const handleManualReSync = (bom: BOMRecord) => {
    setIsSyncing(true);
    const identifier = bom.projectName || bom.projectId || bom.assemblyName;
    syncProjectToBOM(identifier);
    setTimeout(() => {
      setIsSyncing(false);
    }, 600);
  };

  const handleAddItemToBOM = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSelectedBOM) return;

    const totalCost = itemForm.quantity * itemForm.unitCost;
    const newItem: BOMItem = {
      id: 'bi-' + Date.now(),
      itemType: itemForm.itemType,
      name: itemForm.name,
      sizeSpecs: itemForm.sizeSpecs,
      quantity: itemForm.quantity,
      unit: itemForm.unit,
      unitCost: itemForm.unitCost,
      totalCost,
      drawingRef: itemForm.drawingRef,
    };

    let updatedItems = [...activeSelectedBOM.items];

    if (itemForm.parentSubAssemblyId) {
      updatedItems = updatedItems.map((parent) => {
        if (parent.id === itemForm.parentSubAssemblyId) {
          const children = parent.children ? [...parent.children, newItem] : [newItem];
          const newParentCost = (parent.unitCost || 0) + totalCost;
          return { ...parent, children, totalCost: newParentCost };
        }
        return parent;
      });
    } else {
      updatedItems.push(newItem);
    }

    const newTotalCost = activeSelectedBOM.totalEstimatedCost + totalCost;
    updateBOM(activeSelectedBOM.id, { items: updatedItems, totalEstimatedCost: newTotalCost });
    setIsAddItemModalOpen(false);
    setItemForm({
      itemType: 'raw_material',
      name: '',
      sizeSpecs: '',
      quantity: 1,
      unit: 'Nos',
      unitCost: 100,
      drawingRef: '',
      parentSubAssemblyId: '',
    });
  };

  const handleExportExcel = () => {
    if (!activeSelectedBOM) return;
    const flattenedRows: any[] = [];

    const traverse = (items: BOMItem[], level: number, parentName: string) => {
      items.forEach((it) => {
        flattenedRows.push({
          'Level': level,
          'Parent Assembly': parentName || activeSelectedBOM.assemblyName,
          'Item Type': it.itemType.replace('_', ' ').toUpperCase(),
          'Item Description': it.name,
          'Size Specs': it.sizeSpecs,
          'Qty': it.quantity,
          'Unit': it.unit,
          'Unit Cost (INR)': it.unitCost,
          'Total Cost (INR)': it.totalCost,
          'Drawing Ref': it.drawingRef || '-',
        });
        if (it.children) {
          traverse(it.children, level + 1, it.name);
        }
      });
    };

    traverse(activeSelectedBOM.items, 1, '');
    exportToExcel(flattenedRows, `RSB_BOM_${activeSelectedBOM.bomNumber}_${activeSelectedBOM.revision}`);
  };

  const handleExportPdf = () => {
    if (!activeSelectedBOM) return;
    const headers = ['Level', 'Item Name / Spec', 'Type', 'Qty', 'Unit Rate (₹)', 'Total (₹)', 'Drawing'];
    const rows: any[] = [];

    const traverse = (items: BOMItem[], prefix: string) => {
      items.forEach((it, idx) => {
        const num = prefix ? `${prefix}.${idx + 1}` : `${idx + 1}`;
        rows.push([
          num,
          it.name,
          it.itemType,
          `${it.quantity} ${it.unit}`,
          formatINR(it.unitCost),
          formatINR(it.totalCost),
          it.drawingRef || '-',
        ]);
        if (it.children) traverse(it.children, num);
      });
    };

    traverse(activeSelectedBOM.items, '');
    exportToPdfReport(
      `Bill of Materials: ${activeSelectedBOM.bomNumber} - ${activeSelectedBOM.assemblyName} (${activeSelectedBOM.revision})`,
      headers,
      rows,
      `RSB_BOM_${activeSelectedBOM.bomNumber}`
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-400" />
              Bill of Materials (BOM) & Engineering Multi-Level Assemblies
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-semibold">
              {boms.length} Active BOMs
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Dynamic engineering BOMs with live project synchronization, custom machine assemblies, and real-time cost rollups
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => {
              setNewBomForm({
                bomNumber: `BOM-${Date.now().toString().slice(-4)}`,
                machineType: '',
                assemblyName: '',
                revision: 'Rev A',
                notes: '',
              });
              setIsNewBOMModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Create New BOM
          </button>
          {activeSelectedBOM && (
            <button
              onClick={() => {
                setCopyForm({
                  newBomNumber: `${activeSelectedBOM.bomNumber}-COPY`,
                  newAssemblyName: `Copy of ${activeSelectedBOM.assemblyName}`,
                });
                setIsCopyModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition-colors"
            >
              <Copy className="w-3.5 h-3.5 text-cyan-400" /> Copy BOM
            </button>
          )}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-xl transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel (.XLSX)
          </button>
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition-colors"
          >
            <FileText className="w-3.5 h-3.5" /> PDF Traveler
          </button>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: BOM Selector Directory */}
        <div className="space-y-3">
          <div className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search BOM No, Assembly, Customer, Project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2 max-h-[720px] overflow-y-auto pr-1">
            {filteredBoms.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-500 space-y-2">
                <FolderKanban className="w-8 h-8 mx-auto text-slate-600" />
                <p className="text-xs font-medium">No BOMs found</p>
                <p className="text-[11px] text-slate-600">Create a project or new BOM to start</p>
              </div>
            ) : (
              filteredBoms.map((b) => {
                const isSelected = activeSelectedBOM?.id === b.id;
                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBOMId(b.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-slate-850 border-blue-500/60 text-white shadow-md ring-1 ring-blue-500/30'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono text-xs font-bold text-blue-400">{b.bomNumber}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-md bg-slate-800 text-slate-300 font-bold border border-slate-700">
                            {b.revision}
                          </span>
                          {b.isProjectBOM && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" /> Project BOM
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-white mt-1 truncate">{b.assemblyName}</h4>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] flex-wrap">
                          <span className="text-cyan-400 font-medium">{b.machineType}</span>
                          {b.customer && (
                            <span className="text-amber-400/90 font-medium truncate">
                              &bull; {b.customer}
                            </span>
                          )}
                        </div>
                      </div>
                      <StatusBadge status={b.status} size="sm" />
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                      <span>
                        Est. Cost:{' '}
                        <strong className="text-emerald-400 font-mono">
                          {formatINR(b.totalEstimatedCost)}
                        </strong>
                      </span>
                      <span className="font-semibold text-slate-300">{b.items.length} Items</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Multi-Level BOM Tree & Component Breakdown */}
        <div className="lg:col-span-2 space-y-4">
          {activeSelectedBOM ? (
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 shadow-lg">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold font-mono text-blue-400">{activeSelectedBOM.bomNumber}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700 font-bold">
                      {activeSelectedBOM.revision}
                    </span>
                    <StatusBadge status={activeSelectedBOM.status} size="sm" />
                    {activeSelectedBOM.isProjectBOM && (
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Live Synced with Project
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">{activeSelectedBOM.assemblyName}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Machine / Assembly: <strong className="text-cyan-300">{activeSelectedBOM.machineType}</strong>
                    {activeSelectedBOM.customer && (
                      <> &bull; Customer: <strong className="text-amber-300">{activeSelectedBOM.customer}</strong></>
                    )}
                    {activeSelectedBOM.projectName && (
                      <> &bull; Project: <strong className="text-indigo-300">{activeSelectedBOM.projectName}</strong></>
                    )}
                    &bull; Effective: {activeSelectedBOM.effectiveDate}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {activeSelectedBOM.status !== 'Approved' && (
                    <button
                      onClick={() => approveBOM(activeSelectedBOM.id)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Approve & Release BOM
                    </button>
                  )}
                  <button
                    onClick={() => setIsAddItemModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-400" /> Add Component
                  </button>
                </div>
              </div>

              {/* Project Live Sync Banner */}
              {activeSelectedBOM.isProjectBOM && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-purple-950/40 via-blue-950/40 to-slate-900 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-inner">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 border border-purple-500/40 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-purple-300" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-purple-200">Auto-Generated Project BOM</span>
                        <span className="text-[10px] font-mono px-2 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
                          Live Synced
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Linked Project: <strong className="text-white font-bold">{activeSelectedBOM.projectName}</strong>
                        {activeSelectedBOM.customer && (
                          <> &bull; Customer: <strong className="text-amber-300 font-semibold">{activeSelectedBOM.customer}</strong></>
                        )}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isSyncing}
                    onClick={() => handleManualReSync(activeSelectedBOM)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 shrink-0"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Re-Sync Live Requirements'}
                  </button>
                </div>
              )}

              {/* Multi-Level Hierarchical Tree Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-850 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="p-3">Component / Specification</th>
                      <th className="p-3 text-center">Type</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Unit Rate (₹)</th>
                      <th className="p-3 text-right">Total Cost (₹)</th>
                      <th className="p-3 text-right">Drawing Ref</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-medium text-slate-300">
                    {activeSelectedBOM.items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500">
                          No components added yet. Click &ldquo;Add Component&rdquo; or save project requirements to populate.
                        </td>
                      </tr>
                    ) : (
                      activeSelectedBOM.items.map((item) => (
                        <React.Fragment key={item.id}>
                          {/* Parent Row */}
                          <tr className="bg-slate-900/60 hover:bg-slate-800/40">
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                {item.children && item.children.length > 0 ? (
                                  <button
                                    onClick={() => toggleSubAssembly(item.id)}
                                    className="p-1 rounded-md hover:bg-slate-800 text-slate-400"
                                  >
                                    {expandedSubAssemblies[item.id] ? (
                                      <ChevronDown className="w-3.5 h-3.5 text-blue-400" />
                                    ) : (
                                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                    )}
                                  </button>
                                ) : (
                                  <span className="w-5.5 inline-block" />
                                )}
                                <span className="font-bold text-white">{item.name}</span>
                                <span className="text-[11px] font-mono text-slate-400">({item.sizeSpecs})</span>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-cyan-300 text-[10px] font-mono uppercase font-semibold">
                                {item.itemType.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="p-3 text-center font-mono font-bold text-white">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="p-3 text-right font-mono text-slate-300">
                              {formatINR(item.unitCost)}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-emerald-400">
                              {formatINR(item.totalCost)}
                            </td>
                            <td className="p-3 text-right font-mono text-amber-300">
                              {item.drawingRef || '-'}
                            </td>
                          </tr>

                          {/* Child Rows (Sub-assemblies) */}
                          {item.children &&
                            expandedSubAssemblies[item.id] &&
                            item.children.map((child) => (
                              <tr
                                key={child.id}
                                className="bg-slate-950/80 hover:bg-slate-900/50 text-slate-300"
                              >
                                <td className="p-2.5 pl-10 border-l-2 border-blue-500/40">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-blue-400 font-mono text-[10px]">└─</span>
                                    <span className="text-slate-100 font-medium">{child.name}</span>
                                    <span className="text-[10px] font-mono text-slate-500">
                                      ({child.sizeSpecs})
                                    </span>
                                  </div>
                                </td>
                                <td className="p-2.5 text-center">
                                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                                    {child.itemType}
                                  </span>
                                </td>
                                <td className="p-2.5 text-center font-mono font-bold text-slate-200">
                                  {child.quantity} {child.unit}
                                </td>
                                <td className="p-2.5 text-right font-mono text-slate-400">
                                  {formatINR(child.unitCost)}
                                </td>
                                <td className="p-2.5 text-right font-mono text-emerald-400">
                                  {formatINR(child.totalCost)}
                                </td>
                                <td className="p-2.5 text-right font-mono text-amber-300/80">
                                  {child.drawingRef || '-'}
                                </td>
                              </tr>
                            ))}
                        </React.Fragment>
                      ))
                    )}

                    <tr className="bg-slate-900 font-bold border-t-2 border-slate-700">
                      <td colSpan={4} className="p-3 text-right text-slate-300">
                        Total Estimated BOM Material & Component Cost:
                      </td>
                      <td className="p-3 text-right font-mono text-sm text-emerald-400 font-black">
                        {formatINR(activeSelectedBOM.totalEstimatedCost)}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Version History */}
              {activeSelectedBOM.history && activeSelectedBOM.history.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <History className="w-3.5 h-3.5 text-blue-400" /> Revision History Control
                  </h4>
                  <div className="space-y-1 text-[11px] text-slate-400">
                    {activeSelectedBOM.history.map((h, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between py-1 border-b border-slate-850 last:border-0"
                      >
                        <span>
                          <strong className="font-mono text-blue-300">{h.revision}:</strong>{' '}
                          {h.changeSummary}
                        </span>
                        <span className="text-slate-500">
                          {h.changedBy} &bull; {h.date}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-500">
              <FolderTree className="w-12 h-12 mx-auto mb-2 opacity-50 text-blue-400" />
              <p>Select a BOM from the directory or create a new project to generate one.</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: CREATE NEW BOM */}
      <Modal
        isOpen={isNewBOMModalOpen}
        onClose={() => setIsNewBOMModalOpen(false)}
        title="Create New Bill of Materials (BOM)"
        subtitle="Define custom machine assembly hierarchy and initial revision"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateBOM} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                BOM Number *
              </label>
              <input
                type="text"
                required
                value={newBomForm.bomNumber}
                onChange={(e) => setNewBomForm({ ...newBomForm, bomNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                placeholder="e.g. BOM-PROJ-01"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Machine / Assembly Category *
              </label>
              <input
                type="text"
                required
                list="learned-bom-machines-list"
                value={newBomForm.machineType}
                onChange={(e) => setNewBomForm({ ...newBomForm, machineType: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                placeholder="Type any machine category..."
              />
              <datalist id="learned-bom-machines-list">
                {machines.map((m) => (
                  <option key={m.id} value={m.name} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Assembly / Project Name *
            </label>
            <input
              type="text"
              required
              value={newBomForm.assemblyName}
              onChange={(e) => setNewBomForm({ ...newBomForm, assemblyName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              placeholder="e.g. Complete Rotary Distributor Indexing Assembly"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Initial Revision *
              </label>
              <input
                type="text"
                required
                value={newBomForm.revision}
                onChange={(e) => setNewBomForm({ ...newBomForm, revision: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Created By
              </label>
              <input
                type="text"
                disabled
                value={currentUser.name}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Notes / Description</label>
            <input
              type="text"
              value={newBomForm.notes}
              onChange={(e) => setNewBomForm({ ...newBomForm, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              placeholder="Engineering or fabrication notes"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsNewBOMModalOpen(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md"
            >
              Create BOM
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: COPY BOM */}
      <Modal
        isOpen={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        title={`Copy BOM: ${activeSelectedBOM?.bomNumber}`}
        subtitle="Clone complete multi-level component structure to a new machine assembly"
        maxWidth="lg"
      >
        <form onSubmit={handleCopyBOM} className="space-y-4 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              New BOM Number *
            </label>
            <input
              type="text"
              required
              value={copyForm.newBomNumber}
              onChange={(e) => setCopyForm({ ...copyForm, newBomNumber: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              New Assembly Name *
            </label>
            <input
              type="text"
              required
              value={copyForm.newAssemblyName}
              onChange={(e) => setCopyForm({ ...copyForm, newAssemblyName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              placeholder="e.g. Custom 8-Meter Line Assembly"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCopyModalOpen(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md"
            >
              Clone BOM Structure
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: ADD ITEM TO BOM */}
      <Modal
        isOpen={isAddItemModalOpen}
        onClose={() => setIsAddItemModalOpen(false)}
        title={`Add Item to ${activeSelectedBOM?.bomNumber}`}
        subtitle="Add raw material, sub-assembly, or standard hardware"
        maxWidth="2xl"
      >
        <form onSubmit={handleAddItemToBOM} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Item Category *
              </label>
              <select
                value={itemForm.itemType}
                onChange={(e) => setItemForm({ ...itemForm, itemType: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              >
                <option value="raw_material">Raw Material (SS Flat, Pipe, Circle)</option>
                <option value="sub_assembly">Sub-Assembly (Grouping)</option>
                <option value="standard_part">Standard Machined Part</option>
                <option value="hardware">Hardware / Fasteners / Bearings</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Parent Sub-Assembly
              </label>
              <select
                value={itemForm.parentSubAssemblyId}
                onChange={(e) => setItemForm({ ...itemForm, parentSubAssemblyId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              >
                <option value="">Root Level Item (No Parent)</option>
                {activeSelectedBOM?.items
                  .filter((i) => i.itemType === 'sub_assembly')
                  .map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      Sub-Assembly: {sub.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Component Name *
              </label>
              <input
                type="text"
                required
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                placeholder="e.g. SS Flat 80 x 6 x 485"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Size Specification *
              </label>
              <input
                type="text"
                required
                value={itemForm.sizeSpecs}
                onChange={(e) => setItemForm({ ...itemForm, sizeSpecs: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                placeholder="80 x 6 x 485"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Quantity *
              </label>
              <input
                type="number"
                required
                min="0.01"
                step="any"
                value={itemForm.quantity}
                onChange={(e) => setItemForm({ ...itemForm, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Unit *
              </label>
              <input
                type="text"
                required
                value={itemForm.unit}
                onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                placeholder="Nos"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                Unit Cost (₹) *
              </label>
              <input
                type="number"
                required
                min="0"
                step="any"
                value={itemForm.unitCost}
                onChange={(e) => setItemForm({ ...itemForm, unitCost: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold text-emerald-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
              Engineering Drawing Ref
            </label>
            <input
              type="text"
              value={itemForm.drawingRef}
              onChange={(e) => setItemForm({ ...itemForm, drawingRef: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
              placeholder="e.g. DWG-RSB-0485"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddItemModalOpen(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md"
            >
              Append to BOM
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
