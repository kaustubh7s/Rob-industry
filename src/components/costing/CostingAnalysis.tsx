import React, { useState } from 'react';
import {
  BadgeDollarSign,
  TrendingUp,
  Plus,
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  DollarSign,
  PieChart as PieIcon,
  Layers,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { useERP } from '../../context/ERPContext';
import { ProjectCosting } from '../../types/erp';
import { formatINR, formatCompactINR } from '../../utils/calculations';
import { exportToExcel, exportToPdfReport } from '../../utils/excelIntegration';
import { Modal } from '../common/Modal';

export const CostingAnalysis: React.FC = () => {
  const { costingRecords, saveCostingRecord, projects } = useERP();

  const [isNewCostingModalOpen, setIsNewCostingModalOpen] = useState(false);

  // Form State
  const [form, setForm] = useState({
    projectId: 'prj-1',
    projectName: 'FOHA High-Speed Conveyor & Cap Line',
    customer: 'Cadila Healthcare Ltd (Zydus)',
    materialCost: 520000,
    laborCost: 280000,
    fabricationCost: 190000,
    outsourcingCost: 95000,
    transportCost: 45000,
    machineCost: 80000,
    sellingPrice: 1850000,
    notes: 'Direct raw material purchase from Manav Metal saved 8% procurement cost.',
  });

  const totalCost =
    form.materialCost +
    form.laborCost +
    form.fabricationCost +
    form.outsourcingCost +
    form.transportCost +
    form.machineCost;

  const grossProfit = form.sellingPrice - totalCost;
  const marginPct = Number(((grossProfit / (form.sellingPrice || 1)) * 100).toFixed(2));

  const handleSaveCosting = (e: React.FormEvent) => {
    e.preventDefault();
    saveCostingRecord({
      ...form,
      totalProductionCost: totalCost,
      grossProfit,
      profitMarginPct: marginPct,
    });
    setIsNewCostingModalOpen(false);
  };

  const handleExportExcel = () => {
    const data = costingRecords.map(c => ({
      'Project Name': c.projectName,
      'Customer': c.customer,
      'Raw Material Cost (INR)': c.materialCost,
      'Labor Cost (INR)': c.laborCost,
      'Fabrication Cost (INR)': c.fabricationCost,
      'Outsourcing Cost (INR)': c.outsourcingCost,
      'Transport Cost (INR)': c.transportCost,
      'Machine Overhead (INR)': c.machineCost,
      'Total Production Cost (INR)': c.totalProductionCost,
      'Selling Price (INR)': c.sellingPrice,
      'Gross Profit (INR)': c.grossProfit,
      'Profit Margin %': `${c.profitMarginPct}%`,
      'Notes': c.notes || '-',
    }));
    exportToExcel(data, `RSB_Project_Costing_Profitability_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPdf = () => {
    const headers = ['Project Name', 'Customer', 'Material (₹)', 'Labor (₹)', 'Total Cost (₹)', 'Selling Price (₹)', 'Gross Profit (₹)', 'Margin %'];
    const rows = costingRecords.map(c => [
      c.projectName,
      c.customer,
      formatINR(c.materialCost),
      formatINR(c.laborCost),
      formatINR(c.totalProductionCost),
      formatINR(c.sellingPrice),
      formatINR(c.grossProfit),
      `${c.profitMarginPct}%`,
    ]);
    exportToPdfReport('RSB Project Costing & Profitability Analysis Report', headers, rows, 'RSB_Costing_Profit_Report');
  };

  const chartData = costingRecords.map(c => ({
    name: c.projectName.length > 15 ? c.projectName.slice(0, 15) + '..' : c.projectName,
    cost: c.totalProductionCost,
    revenue: c.sellingPrice,
    profit: c.grossProfit,
    margin: c.profitMarginPct,
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
              <BadgeDollarSign className="w-5 h-5 text-emerald-400" />
              Costing & Profitability Engine
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
              {costingRecords.length} Audited Projects
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automated fabrication cost breakdown: Raw Material + Labor + Machining + Outsourcing vs Contract Price
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsNewCostingModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Analyze Project Cost
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-xl transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel (.XLSX)
          </button>
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition-all"
          >
            <FileText className="w-4 h-4" /> PDF Report
          </button>
        </div>
      </div>

      {/* Comparison Chart */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          Production Cost vs Selling Revenue Comparison (INR)
        </h3>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(val) => `₹${val / 100000}L`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                formatter={(val: any) => formatINR(Number(val))}
              />
              <Bar dataKey="cost" fill="#f43f5e" name="Total Production Cost" radius={[4, 4, 0, 0]} />
              <Bar dataKey="revenue" fill="#06b6d4" name="Selling Contract Value" radius={[4, 4, 0, 0]} />
              <Bar dataKey="profit" fill="#10b981" name="Gross Profit" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Project Costing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {costingRecords.map((c) => (
          <div
            key={c.id}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-lg space-y-4 transition-all"
          >
            <div>
              <h4 className="text-sm font-bold text-white">{c.projectName}</h4>
              <p className="text-xs text-slate-400">{c.customer}</p>
            </div>

            {/* Cost Breakdown Pills */}
            <div className="p-3 bg-slate-850 rounded-xl border border-slate-750 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Raw Material SS:</span>
                <span className="font-mono text-slate-200">{formatINR(c.materialCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Labor & Fitting:</span>
                <span className="font-mono text-slate-200">{formatINR(c.laborCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Fabrication / Welding:</span>
                <span className="font-mono text-slate-200">{formatINR(c.fabricationCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Subcontract / Outsource:</span>
                <span className="font-mono text-slate-200">{formatINR(c.outsourcingCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Transport & Freight:</span>
                <span className="font-mono text-slate-200">{formatINR(c.transportCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Machine Power / Overhead:</span>
                <span className="font-mono text-slate-200">{formatINR(c.machineCost)}</span>
              </div>

              <div className="flex justify-between pt-1.5 border-t border-slate-700 font-bold">
                <span className="text-rose-400">Total Production Cost:</span>
                <span className="font-mono text-rose-400">{formatINR(c.totalProductionCost)}</span>
              </div>
            </div>

            {/* Selling Price & Profit Banner */}
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-1">
              <div className="flex justify-between text-xs font-semibold text-slate-300">
                <span>Contract Selling Price:</span>
                <span className="font-mono font-bold text-white">{formatINR(c.sellingPrice)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-1 border-t border-emerald-500/20">
                <span className="text-xs font-bold text-emerald-400">Gross Profit:</span>
                <div className="text-right">
                  <span className="text-base font-extrabold text-emerald-400 font-mono">
                    {formatINR(c.grossProfit)}
                  </span>
                  <span className="text-xs text-emerald-300 font-bold ml-1 font-mono">
                    ({c.profitMarginPct}%)
                  </span>
                </div>
              </div>
            </div>

            {c.notes && (
              <p className="text-[11px] text-slate-400 bg-slate-800/40 p-2 rounded-lg border border-slate-750">
                {c.notes}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* MODAL: NEW COSTING RECORD */}
      <Modal
        isOpen={isNewCostingModalOpen}
        onClose={() => setIsNewCostingModalOpen(false)}
        title="Analyze Project Costing & Profit Margins"
        subtitle="Breakdown manufacturing cost components against client billing"
        maxWidth="3xl"
      >
        <form onSubmit={handleSaveCosting} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Project *</label>
              <select
                value={form.projectId}
                onChange={(e) => {
                  const prj = projects.find(p => p.id === e.target.value);
                  setForm({
                    ...form,
                    projectId: e.target.value,
                    projectName: prj ? prj.name : form.projectName,
                    customer: prj ? prj.customer : form.customer,
                    sellingPrice: prj ? prj.projectValue : form.sellingPrice,
                  });
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.customer})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Customer Name</label>
              <input
                type="text"
                disabled
                value={form.customer}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/50 border border-slate-750 text-slate-400 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Raw Material Cost (₹) *</label>
              <input
                type="number"
                required
                value={form.materialCost}
                onChange={(e) => setForm({ ...form, materialCost: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Labor Cost (₹) *</label>
              <input
                type="number"
                required
                value={form.laborCost}
                onChange={(e) => setForm({ ...form, laborCost: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Fabrication / Welding (₹) *</label>
              <input
                type="number"
                required
                value={form.fabricationCost}
                onChange={(e) => setForm({ ...form, fabricationCost: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Outsourcing / Heat Treat (₹)</label>
              <input
                type="number"
                value={form.outsourcingCost}
                onChange={(e) => setForm({ ...form, outsourcingCost: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Transport & Freight (₹)</label>
              <input
                type="number"
                value={form.transportCost}
                onChange={(e) => setForm({ ...form, transportCost: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Machine & Power Overhead (₹)</label>
              <input
                type="number"
                value={form.machineCost}
                onChange={(e) => setForm({ ...form, machineCost: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-800">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Contract Selling Price (₹) *</label>
              <input
                type="number"
                required
                value={form.sellingPrice}
                onChange={(e) => setForm({ ...form, sellingPrice: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold text-emerald-400"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-850 border border-slate-750 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 block">Calculated Margin:</span>
                <span className="text-sm font-bold text-emerald-400 font-mono">
                  {formatINR(grossProfit)} ({marginPct}%)
                </span>
              </div>
              <span className="text-xs text-rose-400 font-mono font-bold">Cost: {formatINR(totalCost)}</span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsNewCostingModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md"
            >
              Save Costing Analysis
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
