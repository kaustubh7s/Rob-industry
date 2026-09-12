import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileSpreadsheet,
  FileText,
  XCircle,
  TrendingUp,
  Scale,
  Printer,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useERP } from '../../context/ERPContext';
import { InwardEntry, InwardStatus, MaterialType } from '../../types/erp';
import { StatusBadge } from '../common/StatusBadge';
import { exportToExcel, exportToPdfReport } from '../../utils/excelIntegration';
import { Modal } from '../common/Modal';
import { autoCalculateWeightFromSpec } from '../../utils/calculations';
import { EasyGuideBanner } from '../common/EasyGuideBanner';
import { PrintableSlipModal } from '../common/PrintableSlipModal';

interface InwardManagementProps {
  onOpenQuickAction?: (action?: 'order' | 'inward' | 'outward' | 'job' | 'qc') => void;
}

export const InwardManagement: React.FC<InwardManagementProps> = ({ onOpenQuickAction }) => {
  const { inwardEntries, addInwardEntry, updateInwardStatus, deleteInwardEntry, vendors, materials } = useERP();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterVendor, setFilterVendor] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterMaterial, setFilterMaterial] = useState('ALL');

  const [isNewInwardModalOpen, setIsNewInwardModalOpen] = useState(false);
  const [selectedSlipData, setSelectedSlipData] = useState<InwardEntry | null>(null);
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);

  // New inward form
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    vendor: 'Manav Metal',
    poNumber: 'PO-2026-036',
    challanNumber: 'MM-CH-5120',
    invoiceNumber: 'MM-INV-2045',
    materialType: 'SS Flat' as MaterialType,
    sizeSpecs: '80 x 6 x 485',
    quantity: 20,
    unit: 'Nos',
    weightKg: 37.0,
    receivedBy: 'Chandramani',
    qualityStatus: 'Approved' as InwardStatus,
    remarks: 'Dimensional verification passed with test cert',
  });

  const applyInwardPreset = (type: 'flat' | 'pipe' | 'sheet') => {
    if (type === 'flat') {
      const spec = '80 x 6 x 485';
      const qty = 20;
      const weight = autoCalculateWeightFromSpec('SS Flat', spec, 'SS 304', qty) || 36.8;
      setForm({
        ...form,
        vendor: 'Manav Metal',
        materialType: 'SS Flat',
        sizeSpecs: spec,
        quantity: qty,
        weightKg: Number(weight.toFixed(2)),
        poNumber: 'PO-2026-036',
        challanNumber: `MM-${Math.floor(1000 + Math.random() * 9000)}`,
      });
    } else if (type === 'pipe') {
      const spec = 'OD 106 x ID 75 x 110';
      const qty = 10;
      const weight = autoCalculateWeightFromSpec('SS Pipe', spec, 'SS 304', qty) || 38.5;
      setForm({
        ...form,
        vendor: 'Jindal Stainless Steel',
        materialType: 'SS Pipe',
        sizeSpecs: spec,
        quantity: qty,
        weightKg: Number(weight.toFixed(2)),
        poNumber: 'PO-2026-036',
        challanNumber: `JND-${Math.floor(1000 + Math.random() * 9000)}`,
      });
    } else {
      const spec = '1220 x 2440 x 3.0';
      const qty = 2;
      const weight = 142.5;
      setForm({
        ...form,
        vendor: 'Pooja Metal Corp',
        materialType: 'SS Sheet',
        sizeSpecs: spec,
        quantity: qty,
        weightKg: weight,
        poNumber: 'PO-2026-037',
        challanNumber: `PMC-${Math.floor(1000 + Math.random() * 9000)}`,
      });
    }
  };

  // Filtered inward entries
  const filteredInward = inwardEntries.filter((item) => {
    const matchesSearch =
      item.inwardNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.challanNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sizeSpecs.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.vendor.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesVendor = filterVendor === 'ALL' || item.vendor === filterVendor;
    const matchesStatus = filterStatus === 'ALL' || item.qualityStatus === filterStatus;
    const matchesMaterial = filterMaterial === 'ALL' || item.materialType === filterMaterial;

    return matchesSearch && matchesVendor && matchesStatus && matchesMaterial;
  });

  // Analytics Metrics
  const totalInwardCount = inwardEntries.length;
  const approvedCount = inwardEntries.filter(i => i.qualityStatus === 'Approved').length;
  const pendingQCCount = inwardEntries.filter(i => i.qualityStatus === 'QC Pending').length;
  const rejectedCount = inwardEntries.filter(i => i.qualityStatus === 'Rejected').length;
  const totalWeightInwardKg = Math.round(inwardEntries.reduce((acc, i) => acc + (i.weightKg || 0), 0));

  const handleExportExcel = () => {
    const exportData = filteredInward.map(i => ({
      'Inward No': i.inwardNumber,
      'Date': i.date,
      'Vendor': i.vendor,
      'PO No': i.poNumber,
      'Challan No': i.challanNumber,
      'Invoice No': i.invoiceNumber,
      'Material Type': i.materialType,
      'Size Specifications': i.sizeSpecs,
      'Quantity': `${i.quantity} ${i.unit}`,
      'Weight (Kg)': i.weightKg,
      'Received By': i.receivedBy,
      'Quality Status': i.qualityStatus,
      'Remarks': i.remarks,
    }));
    exportToExcel(exportData, `RSB_Inward_Register_${new Date().toISOString().split('T')[0]}`);
  };

  const handleCreateInward = (e: React.FormEvent) => {
    e.preventDefault();
    const inwardNumber = `INW-2026-${Math.floor(100 + Math.random() * 900)}`;
    addInwardEntry({
      ...form,
      inwardNumber,
    });
    alert(`Material Inward ${inwardNumber} recorded successfully!`);
    setIsNewInwardModalOpen(false);
  };

  const handleOpenPrintSlip = (entry: InwardEntry) => {
    setSelectedSlipData(entry);
    setIsSlipModalOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Friendly Guide Banner */}
      <EasyGuideBanner
        moduleName="Material Inward Register"
        hindiTitle="गेट आवक रजिस्टर"
        paperEquivalent="Gate Entry Notebook / आवक बही"
        whatItDoes="This register records raw materials (SS flats, pipes, sheets, rounds) delivered by suppliers (Manav Metal, Jindal, etc.) at the factory gate."
        howToAdd="When a delivery truck arrives, click '+ New Inward Entry'. Select the vendor, enter the size spec (e.g. 80 x 6 x 485), and quantity."
        autoBenefit="The ERP automatically calculates steel weight in Kg using metal density formulas, and adds this quantity to your Godown Stock Ledger without any manual math."
        defaultExpanded={false}
      />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950/20 to-slate-900 border border-slate-700 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                1. Material Inward & Gate Register (आवक रजिस्टर)
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  GATE RECEIPT
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Log incoming steel challans, auto-calculate weight in Kg, and update Godown raw stock.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsNewInwardModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Inward Entry (आवक दर्ज करें)</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition-all"
            title="Export Inward Register to Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline">Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setFilterStatus('ALL')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            filterStatus === 'ALL'
              ? 'bg-slate-850 border-blue-500 ring-1 ring-blue-500'
              : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Inwards</span>
            <Truck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-white font-mono">{totalInwardCount}</span>
            <span className="text-[10px] text-slate-400">Entries</span>
          </div>
          <div className="text-[10px] text-emerald-400 font-mono mt-0.5">{totalWeightInwardKg} Kg Total</div>
        </div>

        <div
          onClick={() => setFilterStatus('Approved')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            filterStatus === 'Approved'
              ? 'bg-slate-850 border-emerald-500 ring-1 ring-emerald-500'
              : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Approved (Stock In)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-emerald-400 font-mono">{approvedCount}</span>
            <span className="text-[10px] text-emerald-400 font-semibold">Active in Stock</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Auto-added to Godown</div>
        </div>

        <div
          onClick={() => setFilterStatus('QC Pending')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            filterStatus === 'QC Pending'
              ? 'bg-slate-850 border-amber-500 ring-1 ring-amber-500'
              : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">QC Inspection Pending</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-amber-400 font-mono">{pendingQCCount}</span>
            <span className="text-[10px] text-amber-400 font-semibold">On Hold</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Awaiting dimensional check</div>
        </div>

        <div
          onClick={() => setFilterStatus('Rejected')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            filterStatus === 'Rejected'
              ? 'bg-slate-850 border-rose-500 ring-1 ring-rose-500'
              : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Rejected Material</span>
            <XCircle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-rose-400 font-mono">{rejectedCount}</span>
            <span className="text-[10px] text-rose-400 font-semibold">Vendor Return</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Defect / Wrong Spec</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search inward no, vendor, challan, PO, specs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:border-emerald-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterVendor}
            onChange={(e) => setFilterVendor(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-hidden"
          >
            <option value="ALL">All Vendors (सभी सप्लायर)</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.name}>
                {v.name}
              </option>
            ))}
          </select>

          <select
            value={filterMaterial}
            onChange={(e) => setFilterMaterial(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-hidden"
          >
            <option value="ALL">All Materials (सभी धातु)</option>
            <option value="SS Flat">SS Flat</option>
            <option value="SS Pipe">SS Pipe</option>
            <option value="SS Circle">SS Circle</option>
            <option value="SS Bar">SS Bar</option>
            <option value="SS Sheet">SS Sheet</option>
          </select>
        </div>
      </div>

      {/* Inward Register Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-700/80 bg-slate-850 text-slate-300 font-bold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-3.5">Inward No & Date</th>
                <th className="py-3 px-3.5">Vendor (सप्लायर)</th>
                <th className="py-3 px-3 font-mono">PO No</th>
                <th className="py-3 px-3">Challan / Inv</th>
                <th className="py-3 px-3.5">Material Specification</th>
                <th className="py-3 px-3 text-center">Inward Qty</th>
                <th className="py-3 px-3 text-center font-mono text-emerald-400">Weight (Kg)</th>
                <th className="py-3 px-3.5">Gatekeeper</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-medium text-slate-300">
              {filteredInward.map((inw) => (
                <tr key={inw.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-3.5">
                    <span className="font-mono font-bold text-emerald-400 block">{inw.inwardNumber}</span>
                    <span className="text-[10px] text-slate-500 font-normal">{inw.date}</span>
                  </td>

                  <td className="py-3 px-3.5">
                    <span className="font-bold text-slate-100">{inw.vendor}</span>
                  </td>

                  <td className="py-3 px-3 font-mono text-amber-400 font-semibold">
                    {inw.poNumber}
                  </td>

                  <td className="py-3 px-3 text-slate-400 text-[11px]">
                    <div>Challan: <span className="text-slate-200 font-mono font-semibold">{inw.challanNumber}</span></div>
                    <div>Inv: <span className="text-slate-200 font-mono">{inw.invoiceNumber}</span></div>
                  </td>

                  <td className="py-3 px-3.5 font-mono">
                    <span className="text-cyan-300 font-bold block">{inw.materialType}</span>
                    <span className="text-slate-300 font-semibold">{inw.sizeSpecs}</span>
                  </td>

                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-100">
                    {inw.quantity} <span className="text-[10px] font-normal text-slate-400">{inw.unit}</span>
                  </td>

                  <td className="py-3 px-3 text-center font-mono font-bold text-emerald-400">
                    {inw.weightKg} kg
                  </td>

                  <td className="py-3 px-3.5 text-slate-300 text-[11px]">
                    {inw.receivedBy}
                  </td>

                  <td className="py-3 px-3.5 text-center">
                    <select
                      value={inw.qualityStatus}
                      onChange={(e) => updateInwardStatus(inw.id, e.target.value as any)}
                      className={`text-xs font-bold rounded-lg px-2 py-1 border cursor-pointer ${
                        inw.qualityStatus === 'Approved'
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                          : inw.qualityStatus === 'QC Pending'
                          ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      <option value="Approved" className="bg-slate-900 text-emerald-400">Approved (Stock In)</option>
                      <option value="QC Pending" className="bg-slate-900 text-amber-400">QC Pending</option>
                      <option value="Received" className="bg-slate-900 text-blue-400">Received</option>
                      <option value="Rejected" className="bg-slate-900 text-rose-400">Rejected</option>
                    </select>
                  </td>

                  <td className="py-3 px-3.5 text-right space-x-1">
                    <button
                      onClick={() => handleOpenPrintSlip(inw)}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                      title="Print Inward Gate Slip"
                    >
                      <Printer className="w-3.5 h-3.5 text-blue-400" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Delete inward record ${inw.inwardNumber}?`)) {
                          deleteInwardEntry(inw.id);
                        }
                      }}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                      title="Delete Entry"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW INWARD ENTRY MODAL */}
      <Modal
        isOpen={isNewInwardModalOpen}
        onClose={() => setIsNewInwardModalOpen(false)}
        title="Record New Material Inward Entry (गेट आवक रसीद)"
        subtitle="Receipt of raw materials from vendor with automatic weight calculation and inventory stock addition"
        maxWidth="3xl"
      >
        <form onSubmit={handleCreateInward} className="space-y-4">
          {/* 1-Click Fast Presets */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                ⚡ 1-Click Fast Presets (ऑटो-फिल उदाहरण):
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Click to test instant fill</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => applyInwardPreset('flat')}
                className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-emerald-600/30 hover:border-emerald-500 text-slate-200 hover:text-emerald-300 text-[11px] font-medium border border-slate-600 transition-colors"
              >
                📦 SS Flat (80x6x485) - Manav Metal
              </button>
              <button
                type="button"
                onClick={() => applyInwardPreset('pipe')}
                className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-emerald-600/30 hover:border-emerald-500 text-slate-200 hover:text-emerald-300 text-[11px] font-medium border border-slate-600 transition-colors"
              >
                📦 SS Pipe (OD 106) - Jindal
              </button>
              <button
                type="button"
                onClick={() => applyInwardPreset('sheet')}
                className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-emerald-600/30 hover:border-emerald-500 text-slate-200 hover:text-emerald-300 text-[11px] font-medium border border-slate-600 transition-colors"
              >
                📦 SS Sheet (3mm) - Pooja Metal
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Vendor Name (सप्लायर) *
              </label>
              <select
                value={form.vendor}
                onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:border-emerald-500 focus:outline-hidden"
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.name}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                PO Reference Number *
              </label>
              <input
                type="text"
                required
                value={form.poNumber}
                onChange={(e) => setForm({ ...form, poNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                placeholder="PO-2026-036"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Vendor Challan No. *
              </label>
              <input
                type="text"
                required
                value={form.challanNumber}
                onChange={(e) => setForm({ ...form, challanNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                placeholder="MM-CH-5120"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Material Type (प्रकार) *
              </label>
              <select
                value={form.materialType}
                onChange={(e) => setForm({ ...form, materialType: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:border-emerald-500 focus:outline-hidden"
              >
                <option value="SS Flat">SS Flat (पत्ती)</option>
                <option value="SS Pipe">SS Pipe (पाइप)</option>
                <option value="SS Circle">SS Circle (सर्कल)</option>
                <option value="SS Bar">SS Bar (गोल रॉड)</option>
                <option value="SS Sheet">SS Sheet (चादर)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Size Specification (माप / साइज) *
              </label>
              <input
                type="text"
                required
                value={form.sizeSpecs}
                onChange={(e) => {
                  const spec = e.target.value;
                  const autoW = autoCalculateWeightFromSpec(form.materialType, spec, 'SS 304', form.quantity);
                  setForm({
                    ...form,
                    sizeSpecs: spec,
                    weightKg: autoW || form.weightKg,
                  });
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                placeholder="80 x 6 x 485"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Quantity (संख्या) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={form.quantity}
                onChange={(e) => {
                  const q = Number(e.target.value);
                  const autoW = autoCalculateWeightFromSpec(form.materialType, form.sizeSpecs, 'SS 304', q);
                  setForm({
                    ...form,
                    quantity: q,
                    weightKg: autoW || form.weightKg,
                  });
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Calculated Weight (Kg)
              </label>
              <input
                type="number"
                step="0.01"
                value={form.weightKg}
                onChange={(e) => setForm({ ...form, weightKg: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono text-emerald-400 font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Quality Status (जांच स्थिति) *
              </label>
              <select
                value={form.qualityStatus}
                onChange={(e) => setForm({ ...form, qualityStatus: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold text-emerald-400"
              >
                <option value="Approved">Approved (Auto-Increases Stock)</option>
                <option value="QC Pending">QC Pending</option>
                <option value="Received">Received</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Received By (गेटकीपर)
              </label>
              <input
                type="text"
                value={form.receivedBy}
                onChange={(e) => setForm({ ...form, receivedBy: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsNewInwardModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Log Material Inward (स्टॉक इन करें)</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* PRINTABLE SLIP MODAL */}
      <PrintableSlipModal
        isOpen={isSlipModalOpen}
        onClose={() => setIsSlipModalOpen(false)}
        type="inward"
        data={selectedSlipData}
      />
    </div>
  );
};
