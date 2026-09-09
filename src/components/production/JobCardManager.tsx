import React, { useState } from 'react';
import {
  HardHat,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  QrCode,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Play,
  Check,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  User,
  Sliders,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { JobCard, ProductionStatus, MachineCategory } from '../../types/erp';
import { StatusBadge } from '../common/StatusBadge';
import { exportToExcel, exportToPdfReport } from '../../utils/excelIntegration';
import { Modal } from '../common/Modal';
import { EasyGuideBanner } from '../common/EasyGuideBanner';

export const JobCardManager: React.FC = () => {
  const { jobCards, addJobCard, updateJobCard, toggleJobOperation, deleteJobCard, currentUser, projects, machines } = useERP();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterMachine, setFilterMachine] = useState('ALL');

  const [isNewJobModalOpen, setIsNewJobModalOpen] = useState(false);
  const [printJobCard, setPrintJobCard] = useState<JobCard | null>(null);

  // New Job Card Form
  const [form, setForm] = useState({
    project: 'FOHA High-Speed Conveyor & Cap Line',
    customer: 'Cadila Healthcare Ltd (Zydus)',
    drawingRef: 'DWG-RSB-MC-0485',
    material: 'SS Flat 80 x 6 x 485',
    sizeSpecs: '80 x 6 x 485',
    quantity: 2,
    unit: 'Nos',
    machineType: 'Mono Conveyor' as MachineCategory,
    assignedOperator: 'Mahesh Thakor',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    completionPct: 0,
    status: 'Pending' as ProductionStatus,
    notes: 'Maintain hole center distance ± 0.05 mm.',
  });

  const filteredJobs = jobCards.filter((jc) => {
    const matchesSearch =
      jc.jobCardNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jc.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jc.material.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jc.assignedOperator.toLowerCase().includes(searchTerm.toLowerCase()) ||
      jc.drawingRef.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'ALL' || jc.status === filterStatus;
    const matchesMachine = filterMachine === 'ALL' || jc.machineType === filterMachine;

    return matchesSearch && matchesStatus && matchesMachine;
  });

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    const count = String(jobCards.length + 1).padStart(3, '0');
    const jobCardNo = `JC-2026-${count}`;
    addJobCard({
      ...form,
      jobCardNo,
      qrPayload: `RSB-JC-2026-${count}|${form.project}|${form.sizeSpecs}|QTY:${form.quantity}`,
      operations: [
        { step: 1, name: 'Precision Bandsaw Cutting', completed: false, operator: form.assignedOperator, timeSpentHours: 0 },
        { step: 2, name: 'CNC Turning & Slot Milling', completed: false, operator: form.assignedOperator, timeSpentHours: 0 },
        { step: 3, name: 'TIG Welding & Tacking', completed: false, operator: 'Gopal Rawal', timeSpentHours: 0 },
        { step: 4, name: 'Surface Polishing & Buffing', completed: false, operator: 'Dinesh Solanki', timeSpentHours: 0 },
        { step: 5, name: 'Final Dimensional Inspection', completed: false, operator: 'Rajesh Patel', timeSpentHours: 0 },
      ],
    });
    setIsNewJobModalOpen(false);
  };

  const handleExportExcel = () => {
    const data = filteredJobs.map(j => ({
      'Job Card No': j.jobCardNo,
      'Project': j.project,
      'Customer': j.customer,
      'Drawing Ref': j.drawingRef,
      'Material': j.material,
      'Quantity': `${j.quantity} ${j.unit}`,
      'Machine Type': j.machineType,
      'Assigned Operator': j.assignedOperator,
      'Start Date': j.startDate,
      'End Date': j.endDate,
      'Completion %': `${j.completionPct}%`,
      'Status': j.status,
    }));
    exportToExcel(data, `RSB_Production_Job_Cards_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPdf = () => {
    const headers = ['Job Card No', 'Project', 'Drawing', 'Material', 'Qty', 'Machine', 'Operator', 'Progress', 'Status'];
    const rows = filteredJobs.map(j => [
      j.jobCardNo,
      j.project,
      j.drawingRef,
      j.material,
      `${j.quantity} ${j.unit}`,
      j.machineType,
      j.assignedOperator,
      `${j.completionPct}%`,
      j.status,
    ]);
    exportToPdfReport('RSB Shop Floor Production Job Cards Report', headers, rows, 'RSB_Job_Cards');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Friendly Guide Banner */}
      <EasyGuideBanner
        moduleName="Shopfloor Job Cards & Routing"
        hindiTitle="कारखाना जॉब कार्ड व रूटिंग"
        paperEquivalent="Shop Floor Chalkboard / ऑपरेटर पर्ची"
        whatItDoes="Job cards give machine operators (CNC lathe, milling, welding) clear step-by-step instructions with drawing numbers, tolerances, and quantities."
        howToAdd="Click '+ Create Job Card' to assign work to a machine and machinist. Operators can check off stages as they finish cutting, turning, and buffing."
        autoBenefit="Supervisors can see live shopfloor completion % in real time without needing to walk over to every machine or ask for oral status updates."
        defaultExpanded={false}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
              <HardHat className="w-5 h-5 text-amber-400" />
              Production Planning & Job Card Generation
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
              {filteredJobs.length} Job Cards
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Generate digital & printable routing slips with QR barcodes, machine assignments, and operator stage checkoffs
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsNewJobModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Create Job Card
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

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Job Card No, Project, Material, Operator, Drawing (e.g. JC-2026-001, Mahesh, DWG-RSB)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
          />
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 font-medium focus:outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Production">In Production</option>
            <option value="QC">QC Inspection</option>
            <option value="Completed">Completed</option>
          </select>

          <select
            value={filterMachine}
            onChange={(e) => setFilterMachine(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 font-medium focus:outline-hidden"
          >
            <option value="ALL">All Machines</option>
            <option value="Mono Conveyor">Mono Conveyor</option>
            <option value="Washing Unit">Washing Unit</option>
            <option value="Distributor">Distributor</option>
            <option value="Sealing Unit">Sealing Unit</option>
            <option value="Cap Transfer">Cap Transfer</option>
            <option value="Pipeline System">Pipeline System</option>
          </select>
        </div>
      </div>

      {/* Job Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredJobs.map((jc) => {
          const isFinished = jc.completionPct === 100;
          return (
            <div
              key={jc.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-lg space-y-4 transition-all"
            >
              {/* Header Strip */}
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black text-amber-400">{jc.jobCardNo}</span>
                    <StatusBadge status={jc.status} size="sm" />
                  </div>
                  <h4 className="text-sm font-bold text-white mt-1">{jc.project}</h4>
                  <p className="text-xs text-slate-400">{jc.customer}</p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPrintJobCard(jc)}
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    title="Print Shop Floor Job Routing Slip with Barcode"
                  >
                    <Printer className="w-3.5 h-3.5 text-amber-400" />
                    <span>Print Card</span>
                  </button>
                </div>
              </div>

              {/* Part Details Pill */}
              <div className="p-3 rounded-xl bg-slate-850 border border-slate-750 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Material:</span>
                  <span className="font-semibold text-cyan-300 font-mono">{jc.material}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Quantity:</span>
                  <span className="font-bold text-white">{jc.quantity} {jc.unit}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Machine Cell:</span>
                  <span className="text-slate-200">{jc.machineType}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Operator:</span>
                  <span className="text-amber-300 font-semibold">{jc.assignedOperator}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-300">Shop Floor Progress:</span>
                  <span className="font-mono font-bold text-cyan-400">{jc.completionPct}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      isFinished
                        ? 'bg-emerald-500'
                        : jc.completionPct > 50
                        ? 'bg-cyan-500'
                        : 'bg-amber-500'
                    }`}
                    style={{ width: `${jc.completionPct}%` }}
                  />
                </div>
              </div>

              {/* Step-by-Step Operations Checklist (Operator Touch Console) */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Sequential Routing Operations (Click to Check-off):
                </span>
                <div className="space-y-1">
                  {jc.operations.map((op, idx) => (
                    <div
                      key={idx}
                      onClick={() => toggleJobOperation(jc.id, idx)}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer border transition-all ${
                        op.completed
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                          : 'bg-slate-800/60 border-slate-750 text-slate-300 hover:border-cyan-500/50 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-5 h-5 rounded-md flex items-center justify-center border text-[11px] font-bold ${
                            op.completed
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                              : 'border-slate-600 text-slate-400'
                          }`}
                        >
                          {op.completed ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                        </div>
                        <span className={`font-semibold ${op.completed ? 'line-through opacity-80' : ''}`}>
                          {op.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>{op.operator}</span>
                        {op.completedAt && (
                          <span className="font-mono text-emerald-400">{op.completedAt}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: NEW JOB CARD */}
      <Modal
        isOpen={isNewJobModalOpen}
        onClose={() => setIsNewJobModalOpen(false)}
        title="Generate New Production Job Card"
        subtitle="Issue job card for lathe turning, milling, welding, or assembly"
        maxWidth="3xl"
      >
        <form onSubmit={handleCreateJob} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Project Name *
              </label>
              <input
                type="text"
                required
                value={form.project}
                onChange={(e) => setForm({ ...form, project: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                placeholder="FOHA Conveyor Line"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Customer Name *
              </label>
              <input
                type="text"
                required
                value={form.customer}
                onChange={(e) => setForm({ ...form, customer: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Drawing Reference
              </label>
              <input
                type="text"
                value={form.drawingRef}
                onChange={(e) => setForm({ ...form, drawingRef: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                placeholder="DWG-RSB-MC-0485"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Machine Cell Assignment *
              </label>
              <select
                value={form.machineType}
                onChange={(e) => setForm({ ...form, machineType: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
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

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Assigned Operator *
              </label>
              <input
                type="text"
                required
                value={form.assignedOperator}
                onChange={(e) => setForm({ ...form, assignedOperator: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                placeholder="Mahesh Thakor"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Raw Material & Size *
              </label>
              <input
                type="text"
                required
                value={form.material}
                onChange={(e) => setForm({ ...form, material: e.target.value, sizeSpecs: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                placeholder="SS Flat 80 x 6 x 485"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Quantity *
              </label>
              <input
                type="number"
                min="1"
                required
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Target Completion Date *
              </label>
              <input
                type="date"
                required
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
              Shop Floor Special Instructions / Tolerances
            </label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              placeholder="e.g. Mirror finish Ra < 0.4 on internal bore, maintain hole pitch ± 0.05 mm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsNewJobModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md"
            >
              Issue Job Card to Floor
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: PRINTABLE PHYSICAL JOB CARD WITH BARCODE */}
      <Modal
        isOpen={!!printJobCard}
        onClose={() => setPrintJobCard(null)}
        title="Physical Job Card & Routing Sheet"
        subtitle="Shop floor production traveler with drawing reference and barcode tracking"
        maxWidth="3xl"
      >
        {printJobCard && (
          <div className="space-y-6">
            <div className="p-6 bg-white text-slate-900 rounded-xl shadow-lg border border-slate-300 font-sans space-y-5" id="printable-job-card">
              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                <div>
                  <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
                    RSB PRIVATE LIMITED
                  </h1>
                  <p className="text-xs font-medium text-slate-600">
                    Precision Machine Component Manufacturing & SS Fabrication
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Shop Floor Production Traveler / Job Routing Card
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold uppercase bg-amber-500 text-slate-950 px-2.5 py-1 rounded-sm">
                    JOB CARD
                  </span>
                  <p className="text-xs font-mono font-bold mt-1">{printJobCard.jobCardNo}</p>
                </div>
              </div>

              {/* Barcode & QR Box Simulation */}
              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-300 rounded-lg">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Barcode Tracking / Routing Ref:</span>
                  <div className="font-mono text-xs font-bold text-slate-900 tracking-widest mt-0.5">
                    ||||| |||| || |||||| ||||| ||||||| {printJobCard.jobCardNo} ||||
                  </div>
                  <p className="text-[10px] font-mono text-slate-500 mt-0.5">{printJobCard.qrPayload}</p>
                </div>
                <div className="w-14 h-14 border border-slate-400 bg-white p-1 rounded-sm flex items-center justify-center">
                  <QrCode className="w-12 h-12 text-slate-900" />
                </div>
              </div>

              {/* Specs Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Project:</span>
                  <span className="font-bold text-slate-900">{printJobCard.project}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Customer:</span>
                  <span className="font-semibold text-slate-800">{printJobCard.customer}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Drawing Ref:</span>
                  <span className="font-mono font-bold text-slate-900">{printJobCard.drawingRef}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Quantity:</span>
                  <span className="font-mono font-bold text-slate-900">{printJobCard.quantity} {printJobCard.unit}</span>
                </div>
              </div>

              {/* Material Spec & Machine */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Material & Size Specification:</span>
                  <span className="font-mono font-bold text-slate-900">{printJobCard.material}</span>
                </div>
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Assigned Machine / Cell:</span>
                  <span className="font-bold text-slate-900">{printJobCard.machineType} (Operator: {printJobCard.assignedOperator})</span>
                </div>
              </div>

              {/* Sequential Routing Table */}
              <div>
                <span className="text-[11px] font-bold uppercase text-slate-700 block mb-1.5">
                  Sequential Routing Operations & Sign-Offs:
                </span>
                <table className="w-full text-left text-xs border border-slate-300">
                  <thead className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2 border-r border-slate-300 text-center">Step</th>
                      <th className="p-2 border-r border-slate-300">Operation Name</th>
                      <th className="p-2 border-r border-slate-300">Machine / Station</th>
                      <th className="p-2 border-r border-slate-300">Operator</th>
                      <th className="p-2 text-center">Sign / Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {printJobCard.operations.map((op) => (
                      <tr key={op.step}>
                        <td className="p-2 border-r border-slate-300 text-center font-mono font-bold">{op.step}</td>
                        <td className="p-2 border-r border-slate-300 font-semibold text-slate-900">{op.name}</td>
                        <td className="p-2 border-r border-slate-300 text-slate-700">{printJobCard.machineType}</td>
                        <td className="p-2 border-r border-slate-300 text-slate-700">{op.operator}</td>
                        <td className="p-2 text-center font-mono text-xs">
                          {op.completed ? `✓ Signed (${op.completedAt || 'Done'})` : '___________'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Floor Notes */}
              {printJobCard.notes && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900">
                  <span className="font-bold">Important Notes:</span> {printJobCard.notes}
                </div>
              )}
            </div>

            {/* Print Action Button */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setPrintJobCard(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md"
              >
                <Printer className="w-4 h-4" /> Print Job Card Slip
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
