import React, { useState } from 'react';
import {
  ShieldCheck,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  FileText,
  User,
  Sliders,
  Award,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { QCInspection } from '../../types/erp';
import { StatusBadge } from '../common/StatusBadge';
import { exportToExcel, exportToPdfReport } from '../../utils/excelIntegration';
import { Modal } from '../common/Modal';
import { ActiveProcessingMaterial } from '../../types/erp';

export const QCInspectionManager: React.FC = () => {
  const {
    qcInspections,
    addQCInspection,
    updateQCInspection,
    deleteQCInspection,
    jobCards,
    projects,
    activeProcessingMaterials,
  } = useERP();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [isNewQCModalOpen, setIsNewQCModalOpen] = useState(false);
  const [printQCData, setPrintQCData] = useState<QCInspection | null>(null);
  const [selectedActiveId, setSelectedActiveId] = useState<string>('');

  // Form State
  const [form, setForm] = useState({
    jobCardNo: 'JC-2026-002',
    project: 'FOHA High-Speed Conveyor & Cap Line',
    material: 'SS Pipe OD 106 x ID 75 x 110',
    dimensionsNominal: 'OD 106.00 / ID 75.00 / L 110.00',
    dimensionsMeasured: 'OD 106.02 / ID 75.01 / L 110.05',
    tolerance: '± 0.05 mm',
    surfaceFinish: '0.6 µm Ra (Satin ground)',
    visualInspection: 'Pass' as 'Pass' | 'Fail' | 'Minor Scratch',
    inspector: 'Rajesh B. Patel',
    status: 'Passed' as 'Passed' | 'Rework' | 'Rejected',
    inspectionDate: new Date().toISOString().split('T')[0],
    defectNotes: 'All dimensions well within specified limits. Concentricity 0.02 mm.',
  });

  const handleSelectActiveItem = (item: ActiveProcessingMaterial) => {
    setSelectedActiveId(item.id);
    setForm({
      ...form,
      jobCardNo: item.jobCardNo,
      project: item.projectName,
      material: item.materialName,
      dimensionsNominal: item.nominalDimensions || item.sizeSpecs,
      dimensionsMeasured: item.nominalDimensions || item.sizeSpecs,
      tolerance: item.tolerance || '± 0.05 mm',
      surfaceFinish: item.surfaceFinish || '0.6 µm Ra (Satin ground)',
      defectNotes: `Inspected ${item.materialName} from ${item.displayBadge} (Stage: ${item.currentStage}). Heat No: ${item.lotHeatNo}`,
    });
  };

  const openInspectionForActiveItem = (item: ActiveProcessingMaterial) => {
    handleSelectActiveItem(item);
    setIsNewQCModalOpen(true);
  };

  const filteredQC = qcInspections.filter((qc) => {
    const matchesSearch =
      qc.inspectionNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      qc.jobCardNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      qc.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
      qc.material.toLowerCase().includes(searchTerm.toLowerCase()) ||
      qc.inspector.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'ALL' || qc.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const passedCount = qcInspections.filter(q => q.status === 'Passed').length;
  const reworkCount = qcInspections.filter(q => q.status === 'Rework').length;
  const rejectedCount = qcInspections.filter(q => q.status === 'Rejected').length;

  const handleCreateQC = (e: React.FormEvent) => {
    e.preventDefault();
    const count = String(qcInspections.length + 1).padStart(3, '0');
    const inspectionNo = `QC-2026-${count}`;
    addQCInspection({
      ...form,
      inspectionNo,
    });
    setIsNewQCModalOpen(false);
  };

  const handleExportExcel = () => {
    const data = filteredQC.map(q => ({
      'Inspection No': q.inspectionNo,
      'Date': q.inspectionDate,
      'Job Card': q.jobCardNo,
      'Project': q.project,
      'Material': q.material,
      'Nominal Dim': q.dimensionsNominal,
      'Measured Dim': q.dimensionsMeasured,
      'Tolerance': q.tolerance,
      'Surface Finish': q.surfaceFinish,
      'Visual Check': q.visualInspection,
      'QC Status': q.status,
      'Inspector': q.inspector,
      'Defect Notes': q.defectNotes || '-',
    }));
    exportToExcel(data, `RSB_Quality_Inspections_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPdf = () => {
    const headers = ['QC No', 'Job Card', 'Project & Part', 'Nominal vs Measured', 'Tolerance', 'Status', 'Inspector'];
    const rows = filteredQC.map(q => [
      q.inspectionNo,
      q.jobCardNo,
      `${q.project} (${q.material})`,
      `${q.dimensionsNominal} -> ${q.dimensionsMeasured}`,
      q.tolerance,
      q.status,
      q.inspector,
    ]);
    exportToPdfReport('RSB Quality Control Inspection & Compliance Report', headers, rows, 'RSB_QC_Inspections');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Quality Control (QC) & Dimensional Inspection
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
              {filteredQC.length} Inspections
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Precision vernier/micrometer dimensional tolerance testing, Ra surface roughness, and certificate issuance
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsNewQCModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Record QC Inspection
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

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total Inspected Lots</span>
          <p className="text-2xl font-black text-white font-mono mt-1">{qcInspections.length}</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Passed Lots (100% OK)</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">{passedCount}</span>
            <span className="text-xs text-emerald-300 font-semibold">Cleared for Dispatch</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Rework Required</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400 font-mono">{reworkCount}</span>
            <span className="text-xs text-amber-300 font-semibold">Returned to Floor</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Rejected Lots</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-400 font-mono">{rejectedCount}</span>
            <span className="text-xs text-rose-300 font-semibold">Scrapped</span>
          </div>
        </div>
      </div>

      {/* Synced Live Shopfloor & Inward Processing Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-emerald-950/30 to-slate-900 border border-emerald-500/30 shadow-lg space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              Live Factory Floor & Inward Queue (फ़ैक्टरी में चल रहा माल - {activeProcessingMaterials.length} Lots)
            </h3>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/40">
              Synced Across Admin Levels
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Click any active lot below to auto-fill precision QC drawing specs
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {activeProcessingMaterials.map((item) => (
            <div
              key={item.id}
              onClick={() => openInspectionForActiveItem(item)}
              className="group p-3 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500/60 transition-all cursor-pointer shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-slate-900 text-cyan-300 border border-slate-700">
                    {item.jobCardNo}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
                    {item.displayBadge}
                  </span>
                </div>

                <p className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                  {item.materialName}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Project: <span className="text-slate-200">{item.projectName}</span>
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 font-mono">
                  <span>Stage: <strong className="text-amber-300">{item.currentStage}</strong></span>
                  <span>Heat: <strong className="text-slate-300">{item.lotHeatNo}</strong></span>
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  Qty: <strong className="text-white font-mono">{item.quantity} {item.unit}</strong>
                </span>
                <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                  Inspect Lot →
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filter */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Inspection No, Job Card No, Project, Material, Inspector (e.g. QC-2026-055, JC-2026-002)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
          />
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 font-medium focus:outline-hidden"
          >
            <option value="ALL">All QC Decisions</option>
            <option value="Passed">Passed (Cleared)</option>
            <option value="Rework">Rework Required</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* QC Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredQC.map((qc) => (
          <div
            key={qc.id}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-lg space-y-4 transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-black text-emerald-400">{qc.inspectionNo}</span>
                  <StatusBadge status={qc.status} size="sm" />
                </div>
                <h4 className="text-sm font-bold text-white mt-1">{qc.project}</h4>
                <p className="text-xs text-slate-400 font-mono">Job Card: <span className="text-amber-400">{qc.jobCardNo}</span></p>
              </div>

              <button
                onClick={() => setPrintQCData(qc)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                title="Print QC Compliance Certificate"
              >
                <Award className="w-3.5 h-3.5 text-emerald-400" />
                <span>Certificate</span>
              </button>
            </div>

            {/* Dimensional Data Grid */}
            <div className="p-3 rounded-xl bg-slate-850 border border-slate-750 space-y-2 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Material / Component:</span>
                <span className="font-semibold text-cyan-300 font-mono">{qc.material}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Nominal Drawing Dim:</span>
                  <span className="font-mono text-slate-200 font-bold">{qc.dimensionsNominal}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Measured Floor Dim:</span>
                  <span className="font-mono text-emerald-400 font-bold">{qc.dimensionsMeasured}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-800">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Tolerance Limit:</span>
                  <span className="font-mono text-amber-400">{qc.tolerance}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Surface Finish:</span>
                  <span className="text-slate-300">{qc.surfaceFinish}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Visual Check:</span>
                  <span className="font-bold text-slate-200">{qc.visualInspection}</span>
                </div>
              </div>
            </div>

            {/* Inspector & Defect Notes */}
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-1.5 text-slate-400">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>Inspector: <strong className="text-slate-200">{qc.inspector}</strong></span>
              </div>
              <span className="text-slate-500 font-mono">{qc.inspectionDate}</span>
            </div>

            {qc.defectNotes && (
              <p className="text-xs text-slate-400 bg-slate-800/60 p-2.5 rounded-xl border border-slate-750">
                <strong className="text-slate-300">Notes:</strong> {qc.defectNotes}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* MODAL 1: NEW INSPECTION */}
      <Modal
        isOpen={isNewQCModalOpen}
        onClose={() => setIsNewQCModalOpen(false)}
        title="Log Dimensional Quality Inspection"
        subtitle="Perform vernier/CMM verification against drawing tolerances"
        maxWidth="3xl"
      >
        <form onSubmit={handleCreateQC} className="space-y-4">
          {/* Synced Live Factory Floor Material Selector */}
          <div className="p-3.5 rounded-xl bg-slate-800/90 border border-emerald-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                ⚡ Select Processing Material Currently on Shop Floor / Inward (फ़ैक्टरी में चालू माल):
              </label>
              <span className="text-[10px] text-slate-400 font-mono">1-Click Auto-Fill Drawing Specs</span>
            </div>

            <select
              value={selectedActiveId}
              onChange={(e) => {
                const found = activeProcessingMaterials.find((m) => m.id === e.target.value);
                if (found) {
                  handleSelectActiveItem(found);
                }
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold focus:border-emerald-500 focus:outline-hidden"
            >
              <option value="">-- Choose Live Material Processing in Factory ({activeProcessingMaterials.length} Active) --</option>
              {activeProcessingMaterials.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.jobCardNo} • {item.materialName} ({item.sizeSpecs}) — {item.displayBadge} (Stage: {item.currentStage})
                </option>
              ))}
            </select>

            {/* Quick Chips of active floor items */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] font-bold text-slate-400">Quick Pick:</span>
              {activeProcessingMaterials.slice(0, 4).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectActiveItem(item)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-colors ${
                    selectedActiveId === item.id
                      ? 'bg-emerald-500/30 text-emerald-300 border-emerald-400'
                      : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {item.jobCardNo}: {item.materialName.slice(0, 20)}...
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Job Card / Inward Ref *
              </label>
              <input
                type="text"
                required
                value={form.jobCardNo}
                onChange={(e) => setForm({ ...form, jobCardNo: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold text-cyan-400"
                placeholder="JC-2026-001"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Project Name *
              </label>
              <input
                type="text"
                required
                value={form.project}
                onChange={(e) => setForm({ ...form, project: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Material / Part *
              </label>
              <input
                type="text"
                required
                value={form.material}
                onChange={(e) => setForm({ ...form, material: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono text-emerald-300 font-semibold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Nominal Dimensions (Drawing) *
              </label>
              <input
                type="text"
                required
                value={form.dimensionsNominal}
                onChange={(e) => setForm({ ...form, dimensionsNominal: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                placeholder="e.g. OD 106.00 / ID 75.00 / L 110.00"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Measured Actual Dimensions *
              </label>
              <input
                type="text"
                required
                value={form.dimensionsMeasured}
                onChange={(e) => setForm({ ...form, dimensionsMeasured: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold text-emerald-400"
                placeholder="e.g. OD 106.02 / ID 75.01 / L 110.05"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Tolerance Limit *
              </label>
              <input
                type="text"
                required
                value={form.tolerance}
                onChange={(e) => setForm({ ...form, tolerance: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                placeholder="± 0.05 mm"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Surface Roughness (Ra)
              </label>
              <input
                type="text"
                value={form.surfaceFinish}
                onChange={(e) => setForm({ ...form, surfaceFinish: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                placeholder="0.4 µm Ra (Mirror Polish)"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                QC Decision *
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold text-emerald-400"
              >
                <option value="Passed">Passed (Cleared)</option>
                <option value="Rework">Rework Required</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
              Defect Observations & Verification Notes
            </label>
            <input
              type="text"
              value={form.defectNotes}
              onChange={(e) => setForm({ ...form, defectNotes: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              placeholder="e.g. Dimensions verified with Mitutoyo Vernier Caliper & Bore Gauge"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsNewQCModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md"
            >
              Save QC Inspection Record
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: PRINTABLE QC CERTIFICATE */}
      <Modal
        isOpen={!!printQCData}
        onClose={() => setPrintQCData(null)}
        title="Quality Inspection Certificate & Compliance Report"
        subtitle="Official dimensional inspection sign-off certificate"
        maxWidth="3xl"
      >
        {printQCData && (
          <div className="space-y-6">
            <div className="p-6 bg-white text-slate-900 rounded-xl shadow-lg border border-slate-300 font-sans space-y-6" id="printable-qc">
              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                <div>
                  <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
                    RSB PRIVATE LIMITED
                  </h1>
                  <p className="text-xs font-semibold text-slate-700">
                    Manufacturing Industry • Quality Assurance Lab
                  </p>
                  <p className="text-[10px] text-slate-500">
                    F, 16/4, Naregaon Main Rd, Naregaon, Chilkalthana, Chhatrapati Sambhajinagar, Maharashtra 431007
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold uppercase bg-emerald-700 text-white px-2.5 py-1 rounded-sm">
                    QC CERTIFICATE
                  </span>
                  <p className="text-xs font-mono font-bold mt-1">Cert No: {printQCData.inspectionNo}</p>
                  <p className="text-[11px] text-slate-600">Date: {printQCData.inspectionDate}</p>
                </div>
              </div>

              {/* Inspection Details */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Component Information:</span>
                  <p className="text-slate-700">Project: <strong className="text-slate-900">{printQCData.project}</strong></p>
                  <p className="text-slate-700 mt-0.5">Job Card: <strong className="font-mono text-slate-900">{printQCData.jobCardNo}</strong></p>
                  <p className="text-slate-700 mt-0.5">Material: <strong className="font-mono text-slate-900">{printQCData.material}</strong></p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Test Standards & Tolerance:</span>
                  <p className="text-slate-700">Drawing Tolerance: <strong className="font-mono text-slate-900">{printQCData.tolerance}</strong></p>
                  <p className="text-slate-700 mt-0.5">Surface Finish (Ra): <strong className="text-slate-900">{printQCData.surfaceFinish}</strong></p>
                  <p className="text-slate-700 mt-0.5">Visual Inspection: <strong className="text-slate-900">{printQCData.visualInspection}</strong></p>
                </div>
              </div>

              {/* Dimensional Inspection Comparison */}
              <table className="w-full text-left text-xs border border-slate-300">
                <thead className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2 border-r border-slate-300">Parameter</th>
                    <th className="p-2 border-r border-slate-300">Nominal Dimension</th>
                    <th className="p-2 border-r border-slate-300">Measured Dimension</th>
                    <th className="p-2 border-r border-slate-300">Permissible Limit</th>
                    <th className="p-2 text-center">Result</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="p-2 border-r border-slate-300 font-semibold">Critical Features</td>
                    <td className="p-2 border-r border-slate-300 font-mono">{printQCData.dimensionsNominal}</td>
                    <td className="p-2 border-r border-slate-300 font-mono font-bold text-emerald-700">{printQCData.dimensionsMeasured}</td>
                    <td className="p-2 border-r border-slate-300 font-mono">{printQCData.tolerance}</td>
                    <td className="p-2 text-center font-bold text-emerald-700 uppercase">{printQCData.status}</td>
                  </tr>
                </tbody>
              </table>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <span className="font-bold text-slate-700">Inspector Conclusion & Remarks:</span>
                <p className="text-slate-600 mt-0.5">{printQCData.defectNotes || 'Component cleared for assembly and dispatch.'}</p>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-6 pt-6 text-center text-xs">
                <div className="border-t border-slate-400 pt-1 font-semibold text-slate-700">
                  QC Inspector ({printQCData.inspector})
                </div>
                <div className="border-t border-slate-400 pt-1 font-semibold text-slate-700">
                  Quality Assurance Head (RSB)
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setPrintQCData(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md"
              >
                <Printer className="w-4 h-4" /> Print QC Certificate
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
