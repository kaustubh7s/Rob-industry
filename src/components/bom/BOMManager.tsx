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
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { BOMRecord, BOMItem, MachineCategory, BOMStatus } from '../../types/erp';
import { StatusBadge } from '../common/StatusBadge';
import { formatINR } from '../../utils/calculations';
import { exportToExcel, exportToPdfReport } from '../../utils/excelIntegration';
import { Modal } from '../common/Modal';

export const BOMManager: React.FC = () => {
  const { boms, addBOM, updateBOM, approveBOM, copyBOM, deleteBOM, currentUser } = useERP();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBOM, setSelectedBOM] = useState<BOMRecord | null>(boms[0] || null);
  const [expandedSubAssemblies, setExpandedSubAssemblies] = useState<{ [key: string]: boolean }>({
    'bi-1': true,
    'bi-2': true,
    'bi-w1': true,
  });

  const [isNewBOMModalOpen, setIsNewBOMModalOpen] = useState(false);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);

  // New BOM form
  const [newBomForm, setNewBomForm] = useState({
    bomNumber: 'BOM-DST-03',
    machineType: 'Distributor' as MachineCategory,
    assemblyName: '6-Station Rotary Bottle Distributor Indexing Assembly',
    revision: 'Rev A',
    notes: 'Sanitary grade distributor for liquid filling line',
  });

  // Copy BOM form
  const [copyForm, setCopyForm] = useState({
    newBomNumber: 'BOM-MC-02-CUSTOM',
    newAssemblyName: 'Custom 8-Meter Mono Conveyor Line',
  });

  // Add Item to BOM form
  const [itemForm, setItemForm] = useState({
    itemType: 'raw_material' as BOMItem['itemType'],
    name: 'SS Flat Bar 80 x 6 x 485',
    sizeSpecs: '80 x 6 x 485',
    quantity: 4,
    unit: 'Nos',
    unitCost: 450,
    drawingRef: 'DWG-RSB-MC-0485',
    parentSubAssemblyId: '',
  });

  const filteredBoms = boms.filter(
    (b) =>
      b.bomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.assemblyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.machineType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSubAssembly = (id: string) => {
    setExpandedSubAssemblies((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateBOM = (e: React.FormEvent) => {
    e.preventDefault();
    addBOM({
      ...newBomForm,
      status: 'Draft',
      effectiveDate: new Date().toISOString().split('T')[0],
      createdBy: currentUser.name,
      totalEstimatedCost: 0,
      items: [],
      history: [
        {
          revision: newBomForm.revision,
          changedBy: currentUser.name,
          date: new Date().toISOString().split('T')[0],
          changeSummary: 'Initial Bill of Materials created',
        },
      ],
    });
    setIsNewBOMModalOpen(false);
  };

  const handleCopyBOM = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedBOM) {
      copyBOM(selectedBOM.id, copyForm.newBomNumber, copyForm.newAssemblyName);
      setIsCopyModalOpen(false);
    }
  };

  const handleAddItemToBOM = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBOM) return;

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

    let updatedItems = [...selectedBOM.items];

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

    const newTotalCost = selectedBOM.totalEstimatedCost + totalCost;
    updateBOM(selectedBOM.id, { items: updatedItems, totalEstimatedCost: newTotalCost });
    setSelectedBOM({ ...selectedBOM, items: updatedItems, totalEstimatedCost: newTotalCost });
    setIsAddItemModalOpen(false);
  };

  const handleExportExcel = () => {
    if (!selectedBOM) return;
    const flattenedRows: any[] = [];

    const traverse = (items: BOMItem[], level: number, parentName: string) => {
      items.forEach((it) => {
        flattenedRows.push({
          'Level': level,
          'Parent Assembly': parentName || selectedBOM.assemblyName,
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

    traverse(selectedBOM.items, 1, '');
    exportToExcel(flattenedRows, `RSB_BOM_${selectedBOM.bomNumber}_${selectedBOM.revision}`);
  };

  const handleExportPdf = () => {
    if (!selectedBOM) return;
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

    traverse(selectedBOM.items, '');
    exportToPdfReport(`Bill of Materials: ${selectedBOM.bomNumber} - ${selectedBOM.assemblyName} (${selectedBOM.revision})`, headers, rows, `RSB_BOM_${selectedBOM.bomNumber}`);
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
              {boms.length} Master BOMs
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Maintain hierarchical parent-child BOMs, revision versions, engineering approval workflows, and material cost rollups
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsNewBOMModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Create New BOM
          </button>
          {selectedBOM && (
            <button
              onClick={() => setIsCopyModalOpen(true)}
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
                placeholder="Search BOM No, Assembly, Machine..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            {filteredBoms.map((b) => {
              const isSelected = selectedBOM?.id === b.id;
              return (
                <div
                  key={b.id}
                  onClick={() => setSelectedBOM(b)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-850 border-blue-500/60 text-white shadow-md'
                      : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-blue-400">{b.bomNumber}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 font-bold border border-slate-700">
                          {b.revision}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white mt-1">{b.assemblyName}</h4>
                      <p className="text-[11px] text-cyan-400 font-medium">{b.machineType}</p>
                    </div>
                    <StatusBadge status={b.status} size="sm" />
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Est. Cost: <strong className="text-emerald-400 font-mono">{formatINR(b.totalEstimatedCost)}</strong></span>
                    <span className="font-semibold text-slate-300">{b.items.length} Root Items</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Multi-Level BOM Tree & Component Breakdown */}
        <div className="lg:col-span-2 space-y-4">
          {selectedBOM ? (
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-5 shadow-lg">
              {/* Header Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold font-mono text-blue-400">{selectedBOM.bomNumber}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 border border-slate-700 font-bold">
                      {selectedBOM.revision}
                    </span>
                    <StatusBadge status={selectedBOM.status} size="sm" />
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">{selectedBOM.assemblyName}</h3>
                  <p className="text-xs text-slate-400">
                    Category: <strong className="text-cyan-300">{selectedBOM.machineType}</strong> &bull; Effective: {selectedBOM.effectiveDate}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {selectedBOM.status !== 'Approved' && (
                    <button
                      onClick={() => approveBOM(selectedBOM.id)}
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
                    {selectedBOM.items.map((item, idx) => (
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
                          <td className="p-3 text-center font-mono font-bold text-white">{item.quantity} {item.unit}</td>
                          <td className="p-3 text-right font-mono text-slate-300">{formatINR(item.unitCost)}</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-400">{formatINR(item.totalCost)}</td>
                          <td className="p-3 text-right font-mono text-amber-300">{item.drawingRef || '-'}</td>
                        </tr>

                        {/* Child Rows (Sub-assemblies) */}
                        {item.children &&
                          expandedSubAssemblies[item.id] &&
                          item.children.map((child, cIdx) => (
                            <tr key={child.id} className="bg-slate-950/80 hover:bg-slate-900/50 text-slate-300">
                              <td className="p-2.5 pl-10 border-l-2 border-blue-500/40">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-blue-400 font-mono text-[10px]">└─</span>
                                  <span className="text-slate-100 font-medium">{child.name}</span>
                                  <span className="text-[10px] font-mono text-slate-500">({child.sizeSpecs})</span>
                                </div>
                              </td>
                              <td className="p-2.5 text-center">
                                <span className="text-[10px] font-mono text-slate-400 uppercase">{child.itemType}</span>
                              </td>
                              <td className="p-2.5 text-center font-mono font-bold text-slate-200">{child.quantity} {child.unit}</td>
                              <td className="p-2.5 text-right font-mono text-slate-400">{formatINR(child.unitCost)}</td>
                              <td className="p-2.5 text-right font-mono text-emerald-400">{formatINR(child.totalCost)}</td>
                              <td className="p-2.5 text-right font-mono text-amber-300/80">{child.drawingRef || '-'}</td>
                            </tr>
                          ))}
                      </React.Fragment>
                    ))}

                    <tr className="bg-slate-900 font-bold border-t-2 border-slate-700">
                      <td colSpan={4} className="p-3 text-right text-slate-300">
                        Total Estimated BOM Material & Component Cost:
                      </td>
                      <td className="p-3 text-right font-mono text-sm text-emerald-400 font-black">
                        {formatINR(selectedBOM.totalEstimatedCost)}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Version History */}
              {selectedBOM.history && selectedBOM.history.length > 0 && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider">
                    <History className="w-3.5 h-3.5 text-blue-400" /> Revision History Control
                  </h4>
                  <div className="space-y-1 text-[11px] text-slate-400">
                    {selectedBOM.history.map((h, i) => (
                      <div key={i} className="flex items-center justify-between py-1 border-b border-slate-850 last:border-0">
                        <span><strong className="font-mono text-blue-300">{h.revision}:</strong> {h.changeSummary}</span>
                        <span className="text-slate-500">{h.changedBy} &bull; {h.date}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-900 rounded-2xl border border-slate-800 text-slate-500">
              <FolderTree className="w-12 h-12 mx-auto mb-2 opacity-50 text-blue-400" />
              <p>Select a BOM from the left directory to view structure</p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: CREATE NEW BOM */}
      <Modal
        isOpen={isNewBOMModalOpen}
        onClose={() => setIsNewBOMModalOpen(false)}
        title="Create New Bill of Materials (BOM)"
        subtitle="Define machine assembly hierarchy and initial revision"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateBOM} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">BOM Number *</label>
              <input
                type="text"
                required
                value={newBomForm.bomNumber}
                onChange={(e) => setNewBomForm({ ...newBomForm, bomNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Machine Category *</label>
              <select
                value={newBomForm.machineType}
                onChange={(e) => setNewBomForm({ ...newBomForm, machineType: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              >
                <option value="Mono Conveyor">Mono Conveyor</option>
                <option value="Washing Unit">Washing Unit</option>
                <option value="Distributor">Distributor</option>
                <option value="Sealing Unit">Sealing Unit</option>
                <option value="Cap Transfer">Cap Transfer</option>
                <option value="Pipeline System">Pipeline System</option>
                <option value="Conveyor Assembly">Conveyor Assembly</option>
                <option value="Custom Machine">Custom Machine</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Assembly Name *</label>
            <input
              type="text"
              required
              value={newBomForm.assemblyName}
              onChange={(e) => setNewBomForm({ ...newBomForm, assemblyName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              placeholder="e.g. 6-Station Rotary Bottle Distributor Indexing Assembly"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Initial Revision *</label>
              <input
                type="text"
                required
                value={newBomForm.revision}
                onChange={(e) => setNewBomForm({ ...newBomForm, revision: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Created By</label>
              <input
                type="text"
                disabled
                value={currentUser.name}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700 text-slate-400"
              />
            </div>
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
              Create BOM Header
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: COPY BOM */}
      <Modal
        isOpen={isCopyModalOpen}
        onClose={() => setIsCopyModalOpen(false)}
        title={`Copy BOM: ${selectedBOM?.bomNumber}`}
        subtitle="Clone complete multi-level component structure to a new machine assembly"
        maxWidth="lg"
      >
        <form onSubmit={handleCopyBOM} className="space-y-4 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">New BOM Number *</label>
            <input
              type="text"
              required
              value={copyForm.newBomNumber}
              onChange={(e) => setCopyForm({ ...copyForm, newBomNumber: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">New Assembly Name *</label>
            <input
              type="text"
              required
              value={copyForm.newAssemblyName}
              onChange={(e) => setCopyForm({ ...copyForm, newAssemblyName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
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
        title={`Add Item to ${selectedBOM?.bomNumber}`}
        subtitle="Add raw material, sub-assembly, or standard hardware"
        maxWidth="2xl"
      >
        <form onSubmit={handleAddItemToBOM} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Item Category *</label>
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
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Parent Sub-Assembly</label>
              <select
                value={itemForm.parentSubAssemblyId}
                onChange={(e) => setItemForm({ ...itemForm, parentSubAssemblyId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              >
                <option value="">Root Level Item (No Parent)</option>
                {selectedBOM?.items
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
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Component Name *</label>
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
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Size Specification *</label>
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
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Quantity *</label>
              <input
                type="number"
                required
                value={itemForm.quantity}
                onChange={(e) => setItemForm({ ...itemForm, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Unit *</label>
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
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Unit Cost (₹) *</label>
              <input
                type="number"
                required
                value={itemForm.unitCost}
                onChange={(e) => setItemForm({ ...itemForm, unitCost: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold text-emerald-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Engineering Drawing Ref</label>
            <input
              type="text"
              value={itemForm.drawingRef}
              onChange={(e) => setItemForm({ ...itemForm, drawingRef: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
              placeholder="DWG-RSB-MC-0485"
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
