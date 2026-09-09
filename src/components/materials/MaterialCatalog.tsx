import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Download,
  AlertTriangle,
  Layers,
  Circle,
  Cylinder,
  FileSpreadsheet,
  FileText,
  Calculator,
  ArrowUpDown,
  TrendingDown,
  TrendingUp,
  SlidersHorizontal,
  Edit2,
  Trash2,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { MaterialItem, MaterialType } from '../../types/erp';
import { formatINR, formatCompactINR } from '../../utils/calculations';
import { exportToExcel, exportToPdfReport } from '../../utils/excelIntegration';
import { Modal } from '../common/Modal';
import { EasyGuideBanner } from '../common/EasyGuideBanner';

interface MaterialCatalogProps {
  onOpenCalculator: () => void;
}

export const MaterialCatalog: React.FC<MaterialCatalogProps> = ({ onOpenCalculator }) => {
  const { materials, addMaterial, updateMaterial, deleteMaterial, adjustStock, vendors } = useERP();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterGrade, setFilterGrade] = useState('ALL');
  const [filterStockStatus, setFilterStockStatus] = useState('ALL');

  const [isNewMatModalOpen, setIsNewMatModalOpen] = useState(false);
  const [adjustStockModalItem, setAdjustStockModalItem] = useState<MaterialItem | null>(null);
  const [adjustQty, setAdjustQty] = useState<number>(5);
  const [adjustType, setAdjustType] = useState<'add' | 'subtract'>('add');
  const [adjustReason, setAdjustReason] = useState<string>('Physical stock verification count');

  // New material form
  const [form, setForm] = useState({
    code: 'MAT-SS-FLAT-80-6',
    name: 'SS 304 Flat Bar 80x6',
    type: 'SS Flat' as MaterialType,
    grade: 'SS 304',
    thickness: 6,
    sizeSpecs: '80 x 6 x 485',
    unit: 'Nos',
    unitWeightKg: 1.85,
    currentStock: 48,
    minStock: 15,
    reorderLevel: 20,
    unitCost: 450,
    vendor: 'Manav Metal',
    notes: 'For conveyor guide rail brackets',
  });

  const filteredMaterials = materials.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.sizeSpecs.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.vendor.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'ALL' || m.type === filterType;
    const matchesGrade = filterGrade === 'ALL' || m.grade === filterGrade;
    const isLow = m.currentStock <= m.minStock;
    const matchesStock =
      filterStockStatus === 'ALL' ||
      (filterStockStatus === 'LOW' && isLow) ||
      (filterStockStatus === 'OK' && !isLow);

    return matchesSearch && matchesType && matchesGrade && matchesStock;
  });

  const totalStockValuation = materials.reduce((acc, m) => acc + m.currentStock * m.unitCost, 0);
  const lowStockCount = materials.filter(m => m.currentStock <= m.minStock).length;

  const handleExportExcel = () => {
    const exportData = filteredMaterials.map(m => ({
      'Material Code': m.code,
      'Material Name': m.name,
      'Type': m.type,
      'Grade': m.grade,
      'Size Specifications': m.sizeSpecs,
      'Unit': m.unit,
      'Unit Weight (Kg)': m.unitWeightKg || '-',
      'Unit Cost (INR)': m.unitCost,
      'Current Stock': m.currentStock,
      'Min Stock': m.minStock,
      'Reorder Level': m.reorderLevel,
      'Total Value (INR)': m.currentStock * m.unitCost,
      'Preferred Vendor': m.vendor,
    }));
    exportToExcel(exportData, `RSB_Material_Inventory_Master_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPdf = () => {
    const headers = ['Code', 'Material Name', 'Type / Grade', 'Size Specs', 'Stock', 'Rate (₹)', 'Value (₹)'];
    const rows = filteredMaterials.map(m => [
      m.code,
      m.name,
      `${m.type} (${m.grade})`,
      m.sizeSpecs,
      `${m.currentStock} ${m.unit}`,
      formatINR(m.unitCost),
      formatINR(m.currentStock * m.unitCost),
    ]);
    exportToPdfReport('RSB Material Master & Inventory Stock Valuation Report', headers, rows, 'RSB_Material_Stock');
  };

  const handleCreateMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    addMaterial(form);
    setIsNewMatModalOpen(false);
  };

  const handleApplyAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustStockModalItem) return;
    const delta = adjustType === 'add' ? adjustQty : -adjustQty;
    adjustStock(adjustStockModalItem.id, delta, adjustReason);
    setAdjustStockModalItem(null);
  };

  return (
    <div className="space-y-4">
      {/* Friendly Guide Banner */}
      <EasyGuideBanner
        moduleName="Godown Stock Master"
        hindiTitle="गोदाम स्टॉक लेजर (कच्चा माल व तैयार माल)"
        paperEquivalent="Stock Ledger Book / माल स्टॉक बही"
        whatItDoes="This live ledger shows your exact stock of Stainless Steel sheets, pipes, flats, and rounds in real time."
        howToAdd="You DO NOT need to calculate stock balance manually! When you log an Inward entry, stock adds automatically. When you log an Outward dispatch, stock deducts automatically."
        autoBenefit="Red alerts automatically show when stock falls below reorder minimum level so you never run out of raw material mid-production."
        defaultExpanded={false}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
              <Package className="w-5 h-5 text-cyan-400" />
              Raw Material Master & Warehouse Inventory
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
              {filteredMaterials.length} Specifications
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Standard stainless steel flats, pipes, circles, and bars with density-based valuation and reorder automation
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenCalculator}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs font-bold rounded-xl transition-all"
          >
            <Calculator className="w-4 h-4" /> Weight Calculator
          </button>
          <button
            onClick={() => setIsNewMatModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Material
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

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total Inventory Value</span>
          <p className="text-2xl font-black text-white font-mono mt-1">
            {formatCompactINR(totalStockValuation)}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Active Catalog Items</span>
          <p className="text-2xl font-black text-cyan-400 font-mono mt-1">
            {materials.length} <span className="text-xs text-slate-400 font-sans">SKUs</span>
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Low Stock Alerts</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-400 font-mono">{lowStockCount}</span>
            <span className="text-xs text-rose-300 font-semibold">Below Min Level</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Primary Supplier</span>
          <p className="text-lg font-bold text-amber-300 truncate mt-1">
            Manav Metal
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Material Code, Name, Size Specs (e.g. 80 x 6, OD 106, Flat, Pipe, Circle)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
          />
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 font-medium focus:outline-hidden"
          >
            <option value="ALL">All Types (Flat, Pipe, Circle, Bar)</option>
            <option value="SS Flat">SS Flat</option>
            <option value="SS Pipe">SS Pipe</option>
            <option value="SS Circle">SS Circle</option>
            <option value="SS Bar">SS Bar</option>
            <option value="SS Sheet">SS Sheet</option>
          </select>

          <select
            value={filterGrade}
            onChange={(e) => setFilterGrade(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 font-medium focus:outline-hidden"
          >
            <option value="ALL">All Grades</option>
            <option value="SS 304">SS 304</option>
            <option value="SS 316">SS 316</option>
            <option value="SS 316L">SS 316L</option>
          </select>

          <select
            value={filterStockStatus}
            onChange={(e) => setFilterStockStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 font-medium focus:outline-hidden"
          >
            <option value="ALL">All Stock Levels</option>
            <option value="LOW">⚠️ Low Stock Alerts</option>
            <option value="OK">Optimal Stock</option>
          </select>
        </div>
      </div>

      {/* Materials Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-700/80 bg-slate-850 text-slate-300 font-bold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-3.5">Code & Material Name</th>
                <th className="py-3 px-3.5">Type & Grade</th>
                <th className="py-3 px-3.5">Size Specifications</th>
                <th className="py-3 px-3 text-center">Unit Wt (Kg)</th>
                <th className="py-3 px-3 text-right">Unit Rate</th>
                <th className="py-3 px-3.5 text-center">Current Stock</th>
                <th className="py-3 px-3 text-center">Min / Reorder</th>
                <th className="py-3 px-3.5 text-right font-mono">Stock Value</th>
                <th className="py-3 px-3.5">Vendor</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-medium text-slate-300">
              {filteredMaterials.map((mat) => {
                const isLow = mat.currentStock <= mat.minStock;
                const stockVal = mat.currentStock * mat.unitCost;
                return (
                  <tr key={mat.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-3.5">
                      <span className="font-mono text-cyan-400 font-bold block">{mat.code}</span>
                      <span className="text-slate-100 font-semibold">{mat.name}</span>
                    </td>

                    <td className="py-3 px-3.5">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-200 font-bold text-[11px]">
                        {mat.type}
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">{mat.grade}</span>
                    </td>

                    <td className="py-3 px-3.5 font-mono text-cyan-300 font-bold">
                      {mat.sizeSpecs}
                    </td>

                    <td className="py-3 px-3 text-center font-mono text-slate-300">
                      {mat.unitWeightKg ? `${mat.unitWeightKg} kg` : '-'}
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-200">
                      {formatINR(mat.unitCost)}
                    </td>

                    <td className="py-3 px-3.5 text-center">
                      <span
                        className={`font-mono text-sm font-black px-2.5 py-1 rounded-lg border ${
                          isLow
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        }`}
                      >
                        {mat.currentStock} {mat.unit}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-center text-slate-400 font-mono text-[11px]">
                      {mat.minStock} / <span className="text-amber-400 font-semibold">{mat.reorderLevel}</span>
                    </td>

                    <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-400">
                      {formatINR(stockVal)}
                    </td>

                    <td className="py-3 px-3.5 text-slate-300 font-medium">
                      {mat.vendor}
                    </td>

                    <td className="py-3 px-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Adjust Stock */}
                        <button
                          onClick={() => setAdjustStockModalItem(mat)}
                          className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition-colors"
                          title="Adjust Stock In / Stock Out"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`Delete material ${mat.code}?`)) {
                              deleteMaterial(mat.id);
                            }
                          }}
                          className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                          title="Delete Material"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: ADD MATERIAL */}
      <Modal
        isOpen={isNewMatModalOpen}
        onClose={() => setIsNewMatModalOpen(false)}
        title="Add New Raw Material to Master"
        subtitle="Catalog SS Flat, Pipe, Circle, Bar with weight formulas"
        maxWidth="3xl"
      >
        <form onSubmit={handleCreateMaterial} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Material Code *
              </label>
              <input
                type="text"
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Material Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Material Type *
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              >
                <option value="SS Flat">SS Flat</option>
                <option value="SS Pipe">SS Pipe</option>
                <option value="SS Circle">SS Circle</option>
                <option value="SS Bar">SS Bar</option>
                <option value="SS Sheet">SS Sheet</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Steel Grade *
              </label>
              <select
                value={form.grade}
                onChange={(e) => setForm({ ...form, grade: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              >
                <option value="SS 304">SS 304</option>
                <option value="SS 316">SS 316</option>
                <option value="SS 316L">SS 316L</option>
                <option value="SS 202">SS 202</option>
                <option value="MS (Mild Steel)">MS (Mild Steel)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Size Specifications *
              </label>
              <input
                type="text"
                required
                value={form.sizeSpecs}
                onChange={(e) => setForm({ ...form, sizeSpecs: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                placeholder="80 x 6 x 485"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Initial Stock
              </label>
              <input
                type="number"
                value={form.currentStock}
                onChange={(e) => setForm({ ...form, currentStock: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Min Stock Level
              </label>
              <input
                type="number"
                value={form.minStock}
                onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Reorder Trigger Level
              </label>
              <input
                type="number"
                value={form.reorderLevel}
                onChange={(e) => setForm({ ...form, reorderLevel: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold text-amber-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Unit Cost (₹)
              </label>
              <input
                type="number"
                value={form.unitCost}
                onChange={(e) => setForm({ ...form, unitCost: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold text-emerald-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
              Preferred Raw Material Vendor
            </label>
            <select
              value={form.vendor}
              onChange={(e) => setForm({ ...form, vendor: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
            >
              {vendors.map((v) => (
                <option key={v.id} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsNewMatModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md"
            >
              Save to Material Catalog
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: ADJUST STOCK */}
      <Modal
        isOpen={!!adjustStockModalItem}
        onClose={() => setAdjustStockModalItem(null)}
        title="Stock Adjustment / Scrap Entry"
        subtitle={`Manual inventory count or floor adjustment for ${adjustStockModalItem?.name}`}
        maxWidth="md"
      >
        {adjustStockModalItem && (
          <form onSubmit={handleApplyAdjustment} className="space-y-4">
            <div className="p-3 bg-slate-850 rounded-xl border border-slate-750 text-xs">
              <span className="text-slate-400">Current Stock in System:</span>
              <p className="text-lg font-black text-cyan-400 font-mono mt-0.5">
                {adjustStockModalItem.currentStock} {adjustStockModalItem.unit}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAdjustType('add')}
                className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                  adjustType === 'add'
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                + Stock In / Found
              </button>
              <button
                type="button"
                onClick={() => setAdjustType('subtract')}
                className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                  adjustType === 'subtract'
                    ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                - Scrap / Wastage / Out
              </button>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Adjustment Quantity ({adjustStockModalItem.unit}) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={adjustQty}
                onChange={(e) => setAdjustQty(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Reason / Note *
              </label>
              <input
                type="text"
                required
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                placeholder="e.g. Cut-off scrap, damaged raw material, audit count"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setAdjustStockModalItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md"
              >
                Update Stock Balance
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
