import React, { useState } from 'react';
import {
  FolderKanban,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  Layers,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  FileText,
  User,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { ProjectItem, ProjectStatus, MachineCategory } from '../../types/erp';
import { StatusBadge } from '../common/StatusBadge';
import { formatINR, formatCompactINR } from '../../utils/calculations';
import { exportToExcel, exportToPdfReport } from '../../utils/excelIntegration';
import { Modal } from '../common/Modal';

export const ProjectManager: React.FC = () => {
  const { projects, addProject, updateProject, deleteProject, orders, jobCards, customers, costingRecords, setActiveTab } = useERP();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');

  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);

  // New project form
  const [form, setForm] = useState({
    name: 'FOHA High-Speed Conveyor & Cap Line',
    customer: 'Cadila Healthcare Ltd (Zydus)',
    orderSource: 'Customer PO',
    machineType: 'Mono Conveyor' as MachineCategory,
    startDate: new Date().toISOString().split('T')[0],
    targetCompletionDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    priority: 'high' as 'high' | 'medium' | 'low',
    status: 'Production' as ProjectStatus,
    projectValue: 1850000,
    poNumber: '36',
    notes: 'Full conveyor line with mirror polished SS 316 contact parts.',
  });

  const filteredProjects = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.projectNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.poNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'ALL' || p.status === filterStatus;
    const matchesPriority = filterPriority === 'ALL' || p.priority === filterPriority;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    const count = String(projects.length + 40).padStart(3, '0');
    const projectNumber = `PRJ-2026-${count}`;
    addProject({
      ...form,
      projectNumber,
      progressPct: form.status === 'Completed' ? 100 : form.status === 'Production' ? 50 : 10,
    });
    setIsNewProjectModalOpen(false);
  };

  const handleExportExcel = () => {
    const data = filteredProjects.map(p => ({
      'Project ID': p.projectNumber,
      'Project Name': p.name,
      'Customer': p.customer,
      'Machine Type': p.machineType,
      'Order Source': p.orderSource,
      'PO No': p.poNumber,
      'Start Date': p.startDate,
      'Delivery Date': p.targetCompletionDate,
      'Project Value (INR)': p.projectValue,
      'Priority': p.priority,
      'Status': p.status,
      'Progress %': `${p.progressPct}%`,
    }));
    exportToExcel(data, `RSB_Projects_Master_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPdf = () => {
    const headers = ['Project ID', 'Project Name', 'Customer', 'Machine Type', 'PO No', 'Value (₹)', 'Status', 'Deadline'];
    const rows = filteredProjects.map(p => [
      p.projectNumber,
      p.name,
      p.customer,
      p.machineType,
      p.poNumber,
      formatINR(p.projectValue),
      p.status,
      p.targetCompletionDate,
    ]);
    exportToPdfReport('RSB Project Portfolio & Execution Status Report', headers, rows, 'RSB_Projects_Report');
  };

  const totalPortfolioValue = projects.reduce((acc, p) => acc + p.projectValue, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-blue-400" />
              Project Management & Machine Execution Portfolios
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold">
              {filteredProjects.length} Projects
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Track customer machine orders from inquiry to FAT, SAT, and final dispatch
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsNewProjectModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-400 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> New Project
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
          <span className="text-[11px] font-bold text-slate-400 uppercase">Total Order Book Value</span>
          <p className="text-2xl font-black text-white font-mono mt-1">
            {formatCompactINR(totalPortfolioValue)}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase">In-Production Lines</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-cyan-400 font-mono">
              {projects.filter(p => p.status === 'Production').length}
            </span>
            <span className="text-xs text-cyan-300 font-semibold">Active Assemblies</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Procurement Stage</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-400 font-mono">
              {projects.filter(p => p.status === 'Material Procurement').length}
            </span>
            <span className="text-xs text-amber-300 font-semibold">Awaiting SS Raw Materials</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[11px] font-bold text-slate-400 uppercase">Completed Deliveries</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {projects.filter(p => p.status === 'Completed').length}
            </span>
            <span className="text-xs text-emerald-300 font-semibold">FAT/SAT Passed</span>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Project ID, Name, Customer, PO No (e.g. FOHA, PRJ-2026-036, Cadila)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
          />
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 font-medium focus:outline-hidden"
          >
            <option value="ALL">All Project Statuses</option>
            <option value="New">New</option>
            <option value="Planning">Planning</option>
            <option value="Material Procurement">Material Procurement</option>
            <option value="Production">Production</option>
            <option value="Quality Check">Quality Check</option>
            <option value="Dispatch">Dispatch</option>
            <option value="Completed">Completed</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 font-medium focus:outline-hidden"
          >
            <option value="ALL">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
            <option value="low">Low Priority</option>
          </select>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.map((prj) => (
          <div
            key={prj.id}
            onClick={() => setSelectedProject(prj)}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/50 shadow-lg space-y-4 cursor-pointer transition-all hover:translate-y-[-2px] group"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-xs font-bold text-blue-400">{prj.projectNumber}</span>
                <h4 className="text-sm font-bold text-white group-hover:text-blue-300 transition-colors mt-0.5">
                  {prj.name}
                </h4>
                <p className="text-xs text-slate-400">{prj.customer}</p>
              </div>
              <StatusBadge status={prj.status} size="sm" />
            </div>

            {/* Quick Details */}
            <div className="p-3 rounded-xl bg-slate-850 border border-slate-750 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Machine Type:</span>
                <span className="font-semibold text-slate-200">{prj.machineType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">PO Number:</span>
                <span className="font-mono font-bold text-amber-300">{prj.poNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Project Value:</span>
                <span className="font-mono font-bold text-emerald-400">{formatINR(prj.projectValue)}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-400">Execution Progress:</span>
                <span className="font-mono font-bold text-blue-400">{prj.progressPct}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{ width: `${prj.progressPct}%` }}
                />
              </div>
            </div>

            {/* Footer Dates */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
              <span>Start: {prj.startDate}</span>
              <span className="font-semibold text-amber-300">Target: {prj.targetCompletionDate}</span>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL 1: NEW PROJECT */}
      <Modal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        title="Create New Manufacturing Project"
        subtitle="Book custom machine assembly or fabrication contract"
        maxWidth="3xl"
      >
        <form onSubmit={handleCreateProject} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Project Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                placeholder="FOHA Washing & Conveyor Line"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Customer Name *
              </label>
              <select
                value={form.customer}
                onChange={(e) => setForm({ ...form, customer: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Machine Type *
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
                Customer PO Number *
              </label>
              <input
                type="text"
                required
                value={form.poNumber}
                onChange={(e) => setForm({ ...form, poNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                placeholder="36"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Total Project Value (₹) *
              </label>
              <input
                type="number"
                required
                value={form.projectValue}
                onChange={(e) => setForm({ ...form, projectValue: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold text-emerald-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Target Completion Date *
              </label>
              <input
                type="date"
                required
                value={form.targetCompletionDate}
                onChange={(e) => setForm({ ...form, targetCompletionDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Priority Level
              </label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold text-amber-400"
              >
                <option value="high">High Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="low">Low Priority</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
              Project Scope & Technical Specifications
            </label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              placeholder="e.g. Sanitary SS 316 orbital welding & boroscopy inspection"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsNewProjectModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md"
            >
              Save Project Record
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: PROJECT DETAIL & LINKED ORDERS */}
      <Modal
        isOpen={!!selectedProject}
        onClose={() => setSelectedProject(null)}
        title={selectedProject?.name || 'Project Details'}
        subtitle={`Execution Portfolio: ${selectedProject?.projectNumber}`}
        maxWidth="3xl"
      >
        {selectedProject && (
          <div className="space-y-6">
            <div className="p-4 bg-slate-850 rounded-xl border border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400">Customer:</span>
                <p className="font-bold text-white mt-0.5">{selectedProject.customer}</p>
              </div>
              <div>
                <span className="text-slate-400">Machine Type:</span>
                <p className="font-semibold text-slate-200 mt-0.5">{selectedProject.machineType}</p>
              </div>
              <div>
                <span className="text-slate-400">Contract Value:</span>
                <p className="font-mono font-bold text-emerald-400 mt-0.5">{formatINR(selectedProject.projectValue)}</p>
              </div>
              <div>
                <span className="text-slate-400">Current Phase:</span>
                <div className="mt-0.5">
                  <StatusBadge status={selectedProject.status} size="sm" />
                </div>
              </div>
            </div>

            {/* Linked Production Orders */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Components in Main Production Table
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-850 text-slate-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Order No</th>
                      <th className="p-2.5">Material & Size</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5">Vendor</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-medium">
                    {orders
                      .filter(o => o.project.toLowerCase().includes(selectedProject.name.toLowerCase()) || selectedProject.name.toLowerCase().includes(o.project.toLowerCase()))
                      .map((ord) => (
                        <tr key={ord.id}>
                          <td className="p-2.5 font-mono text-cyan-300">{ord.orderNumber}</td>
                          <td className="p-2.5 font-mono text-slate-200">{ord.materialType} {ord.sizeSpecs}</td>
                          <td className="p-2.5 text-center font-bold">{ord.quantity} {ord.unit}</td>
                          <td className="p-2.5 text-amber-300">{ord.vendor}</td>
                          <td className="p-2.5"><StatusBadge status={ord.status} size="sm" /></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedProject(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Close View
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
