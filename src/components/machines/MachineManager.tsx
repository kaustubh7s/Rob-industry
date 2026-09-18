import React, { useState } from 'react';
import {
  Cpu,
  Plus,
  Search,
  Filter,
  Download,
  Clock,
  Activity,
  Wrench,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  User,
  Sliders,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { MachineItem, MachineCategory } from '../../types/erp';
import { StatusBadge } from '../common/StatusBadge';
import { exportToExcel, exportToPdfReport } from '../../utils/excelIntegration';
import { Modal } from '../common/Modal';

export const MachineManager: React.FC = () => {
  const { machines, addMachine, updateMachine, deleteMachine, projects } = useERP();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [isNewMachineModalOpen, setIsNewMachineModalOpen] = useState(false);

  const [form, setForm] = useState({
    code: `MCH-${String(machines.length + 1).padStart(2, '0')}`,
    name: '',
    type: '' as MachineCategory,
    assignedProject: projects[0]?.name || '',
    productionHours: 0,
    efficiency: 95.0,
    status: 'running' as 'running' | 'idle' | 'maintenance',
    lastMaintenanceDate: new Date().toISOString().split('T')[0],
    nextMaintenanceDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    operatorAssigned: '',
  });

  const filteredMachines = machines.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.assignedProject && m.assignedProject.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = filterStatus === 'ALL' || m.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleCreateMachine = (e: React.FormEvent) => {
    e.preventDefault();
    addMachine(form);
    setIsNewMachineModalOpen(false);
  };

  const handleExportExcel = () => {
    const data = filteredMachines.map(m => ({
      'Machine Code': m.code,
      'Machine Name': m.name,
      'Category': m.type,
      'Assigned Project': m.assignedProject || 'Unassigned',
      'Production Hours': m.productionHours,
      'OEE Efficiency %': `${m.efficiency}%`,
      'Operational Status': m.status,
      'Assigned Operator': m.operatorAssigned || '-',
      'Last Maintenance': m.lastMaintenanceDate,
      'Next Maintenance': m.nextMaintenanceDate,
    }));
    exportToExcel(data, `RSB_Machine_Shop_Floor_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPdf = () => {
    const headers = ['Machine Code', 'Machine Name', 'Category', 'Project', 'Hours', 'Efficiency %', 'Status'];
    const rows = filteredMachines.map(m => [
      m.code,
      m.name,
      m.type,
      m.assignedProject || '-',
      `${m.productionHours} hrs`,
      `${m.efficiency}%`,
      m.status,
    ]);
    exportToPdfReport('RSB Shop Floor Machine Utilization & OEE Report', headers, rows, 'RSB_Machine_Floor');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
              <Cpu className="w-5 h-5 text-amber-400" />
              Machine Master & Shop Floor Allocation
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
              {filteredMachines.length} Machine Cells
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Monitor CNC lathes, milling rigs, orbital welding jigs, and automated conveyor assembly stations
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsNewMachineModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Machine
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

      {/* Filter */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Machine Code, Name, Category (e.g. Mono Conveyor, Washing Unit, MC-01)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 font-medium focus:outline-hidden"
        >
          <option value="ALL">All Operational Statuses</option>
          <option value="running">Running (Active)</option>
          <option value="idle">Idle (Available)</option>
          <option value="maintenance">Under Maintenance</option>
        </select>
      </div>

      {/* Machine Shop Floor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredMachines.map((mch) => {
          const isRunning = mch.status === 'running';
          const isMaint = mch.status === 'maintenance';

          return (
            <div
              key={mch.id}
              className={`p-5 rounded-2xl bg-slate-900 border shadow-lg space-y-4 transition-all ${
                isRunning
                  ? 'border-emerald-500/40 glow-emerald'
                  : isMaint
                  ? 'border-rose-500/40'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-black text-amber-400">{mch.code}</span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border uppercase ${
                        isRunning
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                          : isMaint
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      }`}
                    >
                      {mch.status}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-white mt-1">{mch.name}</h4>
                  <p className="text-xs text-cyan-400 font-medium">{mch.type}</p>
                </div>
              </div>

              {/* Stats Box */}
              <div className="p-3 rounded-xl bg-slate-850 border border-slate-750 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Assigned Project:</span>
                  <span className="font-bold text-white">{mch.assignedProject || 'Standby'}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">OEE Efficiency:</span>
                  <span className="font-mono font-bold text-amber-400">{mch.efficiency}%</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Run Hours:</span>
                  <span className="font-mono font-bold text-slate-200">{mch.productionHours} hrs</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase font-bold block">Operator:</span>
                  <span className="text-slate-300">{mch.operatorAssigned || 'Unassigned'}</span>
                </div>
              </div>

              {/* Quick Status Toggle */}
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800">
                <span className="text-slate-400">Next Maint: <strong className="text-slate-300 font-mono">{mch.nextMaintenanceDate}</strong></span>
                <select
                  value={mch.status}
                  onChange={(e) => updateMachine(mch.id, { status: e.target.value as any })}
                  className="px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200"
                >
                  <option value="running">Set Running</option>
                  <option value="idle">Set Idle</option>
                  <option value="maintenance">Set Maintenance</option>
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL: ADD MACHINE */}
      <Modal
        isOpen={isNewMachineModalOpen}
        onClose={() => setIsNewMachineModalOpen(false)}
        title="Add Machine Cell to Master"
        subtitle="Register machine tool, welding station, or assembly line"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateMachine} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Machine Code *
              </label>
              <input
                type="text"
                required
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                placeholder="MC-07"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Machine Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                placeholder="Conveyor Assembly Bed 2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Category / Type *
              </label>
              <input
                type="text"
                required
                list="learned-machine-categories"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                placeholder="Type or select category..."
              />
              <datalist id="learned-machine-categories">
                {Array.from(new Set(machines.map((m) => m.type).concat(machines.map((m) => m.name)))).filter(Boolean).map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Assigned Project
              </label>
              <input
                type="text"
                list="assigned-project-options"
                value={form.assignedProject}
                onChange={(e) => setForm({ ...form, assignedProject: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                placeholder="Assign to project..."
              />
              <datalist id="assigned-project-options">
                {projects.map((p) => (
                  <option key={p.id} value={p.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Assigned Operator
              </label>
              <input
                type="text"
                value={form.operatorAssigned}
                onChange={(e) => setForm({ ...form, operatorAssigned: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                placeholder="Mahesh Thakor"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsNewMachineModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md"
            >
              Save Machine Cell
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
