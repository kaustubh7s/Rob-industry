import React, { useState } from 'react';
import {
  Cpu,
  RefreshCw,
  Search,
  ShoppingCart,
  Download,
  FileSpreadsheet,
  FileText,
  AlertOctagon,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ArrowRight,
  Package,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { MRPRecord } from '../../types/erp';
import { formatINR } from '../../utils/calculations';
import { exportToExcel, exportToPdfReport } from '../../utils/excelIntegration';
import { Modal } from '../common/Modal';

export const MRPEngine: React.FC = () => {
  const { mrpRecords, generateAutoPurchaseRequests, purchaseOrders } = useERP();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'available' | 'partial' | 'purchase_required'>('ALL');
  const [selectedMaterialDetail, setSelectedMaterialDetail] = useState<MRPRecord | null>(null);
  const [isGeneratedModalOpen, setIsGeneratedModalOpen] = useState(false);

  const filteredMRP = mrpRecords.filter((r) => {
    const matchesSearch =
      r.materialName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.materialCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.sizeSpecs.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.preferredVendor.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const shortages = mrpRecords.filter((r) => r.status === 'purchase_required' || r.status === 'partial');
  const criticalShortages = mrpRecords.filter((r) => r.status === 'purchase_required');

  const handleGeneratePOs = () => {
    generateAutoPurchaseRequests(shortages);
    setIsGeneratedModalOpen(true);
  };

  const handleExportExcel = () => {
    const data = filteredMRP.map((r) => ({
      'Material Code': r.materialCode,
      'Material Name': r.materialName,
      'Type': r.materialType,
      'Size Specs': r.sizeSpecs,
      'Required Qty': `${r.requiredQty} ${r.unit}`,
      'Available Stock': `${r.availableStock} ${r.unit}`,
      'Reserved Stock': `${r.reservedStock} ${r.unit}`,
      'Incoming PO Qty': `${r.incomingPOQty} ${r.unit}`,
      'Shortage Qty': `${r.shortageQty} ${r.unit}`,
      'MRP Status': r.status.replace('_', ' ').toUpperCase(),
      'Unit Rate (INR)': r.unitCost,
      'Preferred Supplier': r.preferredVendor,
      'Allocated Projects': r.allocatedProjects.join(', '),
    }));
    exportToExcel(data, `RSB_MRP_Requirements_Planning_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPdf = () => {
    const headers = ['Material Spec', 'Required', 'Available', 'Shortage', 'Status', 'Supplier', 'Est Value (₹)'];
    const rows = filteredMRP.map((r) => [
      `${r.materialType} ${r.sizeSpecs}`,
      `${r.requiredQty} ${r.unit}`,
      `${r.availableStock} ${r.unit}`,
      `${r.shortageQty} ${r.unit}`,
      r.status.replace('_', ' ').toUpperCase(),
      r.preferredVendor,
      formatINR(r.shortageQty * r.unitCost),
    ]);
    exportToPdfReport('RSB Material Requirement Planning (MRP) Shortage Matrix', headers, rows, 'RSB_MRP_Report');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Cpu className="w-5 h-5 text-blue-400" />
              Material Requirement Planning (MRP Engine)
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-semibold">
              Live BOM-Driven Shortage Calculator
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Aggregates BOM demands across active projects, checks free and incoming PO stock, and triggers automatic purchase requisitions
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {shortages.length > 0 && (
            <button
              onClick={handleGeneratePOs}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors shadow-md active:scale-95"
            >
              <ShoppingCart className="w-4 h-4" /> Auto-Generate Purchase Orders ({shortages.length})
            </button>
          )}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-xl transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4" /> Export Excel
          </button>
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition-colors"
          >
            <FileText className="w-4 h-4" /> Export PDF
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Items Tracked</span>
          <p className="text-2xl font-bold text-white font-mono mt-1">{mrpRecords.length}</p>
          <span className="text-xs text-slate-400">Raw materials & hardware</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">🟢 Full Stock Ready</span>
          <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">
            {mrpRecords.filter((r) => r.status === 'available').length}
          </p>
          <span className="text-xs text-emerald-300">100% allocation met</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">🟡 Partial Shortage</span>
          <p className="text-2xl font-bold text-amber-400 font-mono mt-1">
            {mrpRecords.filter((r) => r.status === 'partial').length}
          </p>
          <span className="text-xs text-amber-300">Buffer or incoming PO covers</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">🔴 Critical Shortages</span>
          <p className="text-2xl font-bold text-rose-400 font-mono mt-1">
            {criticalShortages.length}
          </p>
          <span className="text-xs text-rose-300">Immediate PO required</span>
        </div>
      </div>

      {/* Filters */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search material code, spec, supplier (e.g. 80x6x485, UC205, Manav Metal)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500 font-mono"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {(['ALL', 'available', 'partial', 'purchase_required'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                filterStatus === st
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'bg-slate-800 text-slate-300 border border-slate-700 hover:text-white'
              }`}
            >
              {st === 'ALL' && 'All Items'}
              {st === 'available' && '🟢 Available'}
              {st === 'partial' && '🟡 Partial'}
              {st === 'purchase_required' && '🔴 Shortage (PO Req)'}
            </button>
          ))}
        </div>
      </div>

      {/* Required MRP Table: Material | Required Qty | Available Qty | Shortage Qty | Status */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-850 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800 tracking-wider">
              <tr>
                <th className="p-3">Material & Specifications</th>
                <th className="p-3 text-center">Required Qty</th>
                <th className="p-3 text-center">Available Stock</th>
                <th className="p-3 text-center">Reserved Stock</th>
                <th className="p-3 text-center">Incoming POs</th>
                <th className="p-3 text-center">Shortage Qty</th>
                <th className="p-3 text-center">MRP Status</th>
                <th className="p-3">Preferred Supplier</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-medium text-slate-300">
              {filteredMRP.map((rec) => {
                const isShortage = rec.status === 'purchase_required';
                const isPartial = rec.status === 'partial';

                return (
                  <tr key={rec.materialId} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-white text-xs">{rec.materialName}</div>
                      <div className="text-[11px] font-mono text-cyan-400">{rec.sizeSpecs}</div>
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-white">
                      {rec.requiredQty} {rec.unit}
                    </td>
                    <td className="p-3 text-center font-mono text-slate-200">
                      {rec.availableStock} {rec.unit}
                    </td>
                    <td className="p-3 text-center font-mono text-amber-300">
                      {rec.reservedStock} {rec.unit}
                    </td>
                    <td className="p-3 text-center font-mono text-blue-300">
                      {rec.incomingPOQty > 0 ? `+${rec.incomingPOQty} ${rec.unit}` : '-'}
                    </td>
                    <td className="p-3 text-center font-mono font-bold">
                      {rec.shortageQty > 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-extrabold">
                          {rec.shortageQty} {rec.unit}
                        </span>
                      ) : (
                        <span className="text-slate-500">0</span>
                      )}
                    </td>
                    <td className="p-3 text-center font-mono">
                      {rec.status === 'available' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-950/60 text-emerald-300 text-[10px] font-bold border border-emerald-800/80">
                          🟢 Available
                        </span>
                      )}
                      {rec.status === 'partial' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-950/60 text-amber-300 text-[10px] font-bold border border-amber-800/80">
                          🟡 Partial Available
                        </span>
                      )}
                      {rec.status === 'purchase_required' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-rose-950/60 text-rose-300 text-[10px] font-bold border border-rose-800/80">
                          🔴 Purchase Required
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-[11px] text-slate-300">
                      <span className="font-semibold text-white">{rec.preferredVendor}</span>
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setSelectedMaterialDetail(rec)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Details
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: MATERIAL ALLOCATION DETAILS */}
      <Modal
        isOpen={!!selectedMaterialDetail}
        onClose={() => setSelectedMaterialDetail(null)}
        title={`MRP Demand & Reservation Trace: ${selectedMaterialDetail?.materialName}`}
        subtitle={`Specification: ${selectedMaterialDetail?.sizeSpecs}`}
        maxWidth="2xl"
      >
        {selectedMaterialDetail && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-3 gap-2 p-3.5 bg-slate-900 rounded-xl border border-slate-800 text-center">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Gross Requirement</span>
                <span className="font-mono text-sm font-bold text-white mt-0.5 block">
                  {selectedMaterialDetail.requiredQty} {selectedMaterialDetail.unit}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Effective Stock</span>
                <span className="font-mono text-sm font-bold text-cyan-300 mt-0.5 block">
                  {selectedMaterialDetail.availableStock - selectedMaterialDetail.reservedStock + selectedMaterialDetail.incomingPOQty} {selectedMaterialDetail.unit}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Net Shortage</span>
                <span className="font-mono text-sm font-bold text-rose-400 mt-0.5 block">
                  {selectedMaterialDetail.shortageQty} {selectedMaterialDetail.unit}
                </span>
              </div>
            </div>

            <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
              <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">Demanding Projects & Orders</h4>
              <ul className="space-y-1.5 text-slate-300">
                {selectedMaterialDetail.allocatedProjects.map((p, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-blue-400 font-mono text-[11px]">&bull;</span>
                    <span className="font-semibold text-white">{p}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 flex justify-between items-center text-[11px]">
              <div>
                <span className="text-slate-400 block">Preferred Supplier:</span>
                <strong className="text-white text-xs">{selectedMaterialDetail.preferredVendor}</strong>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block">Estimated Reorder Cost:</span>
                <strong className="text-emerald-400 text-xs font-mono font-bold">
                  {formatINR(selectedMaterialDetail.shortageQty * selectedMaterialDetail.unitCost)}
                </strong>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedMaterialDetail(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 2: AUTO PURCHASE ORDER GENERATED CONFIRMATION */}
      <Modal
        isOpen={isGeneratedModalOpen}
        onClose={() => setIsGeneratedModalOpen(false)}
        title="Automated Purchase Orders Generated"
        subtitle="MRP engine created draft Purchase Orders grouped by supplier"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs text-slate-300">
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-white text-sm">Purchase Requisitions Successfully Created</h4>
              <p className="text-slate-400 text-xs mt-1">
                Draft Purchase Orders have been generated and routed to the <strong>Purchase & Commercials</strong> department for review, supplier negotiation, and final dispatch.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              onClick={() => setIsGeneratedModalOpen(false)}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
