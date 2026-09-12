import React, { useState, useMemo } from 'react';
import {
  FolderKanban,
  Plus,
  Search,
  LayoutGrid,
  List,
  Layers,
  Building2,
  Cpu,
  Calendar,
  Package,
  Boxes,
  ArrowRight,
  Download,
  FileSpreadsheet,
  FileText,
  Clock,
  Sparkles,
  Tag,
  Filter,
  Lock,
  Trash2,
  Database,
  Cloud,
  RotateCcw,
  CheckCircle2,
  Truck,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { ProjectItem, ProjectStatus, MachineCategory } from '../../types/erp';
import { StatusBadge } from '../common/StatusBadge';
import { formatINR } from '../../utils/calculations';
import { exportToExcel, exportToPdfReport } from '../../utils/excelIntegration';
import { Modal } from '../common/Modal';
import { SupabaseConnectModal } from '../admin/SupabaseConnectModal';

import { getMaterialsForProject } from '../../utils/projectMaterialsHelper';

interface ProjectsDirectoryProps {
  onSelectProject: (project: ProjectItem) => void;
  onOpenEntrySheetWithProject?: (projectName: string) => void;
}

const MACHINE_CATEGORIES: MachineCategory[] = [
  '10 HD',
  '12 HD',
  '16 HD',
  '20 HD',
  '24 HD',
  '30 HD',
  '40 HD',
  'Mono Conveyor',
  'Washing Unit',
  'Distributor',
  'Sealing Unit',
  'Cap Transfer',
  'Pipeline System',
  'Conveyor Assembly',
  'Custom Machine',
  'Custom Fabrication',
];

const ORDER_SOURCES = [
  'Customer PO',
  'Internal Fabrication',
  'BOM Release',
  'Spare Requirement',
  'Drawing Spec',
  'Annual Contract',
  'Direct Inquiry',
  'Urgent Maintenance',
];

export const ProjectsDirectory: React.FC<ProjectsDirectoryProps> = ({
  onSelectProject,
  onOpenEntrySheetWithProject,
}) => {
  const {
    projects,
    addProject,
    deleteProject,
    projectRequirements,
    orders,
    vendors,
    customers,
    currentUser,
    trashItems,
    restoreFromTrash,
    permanentlyDeleteFromTrash,
    emptyTrash,
  } = useERP();

  const isSuperAdmin =
    currentUser?.role === 'super_admin' || currentUser?.name?.toLowerCase().includes('amit');
  const isStoreIncharge = currentUser?.role === 'store_incharge';

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMachine, setFilterMachine] = useState('ALL');
  const [filterVendor, setFilterVendor] = useState('ALL');
  const [filterDate, setFilterDate] = useState('');
  const [filterOrderSource, setFilterOrderSource] = useState('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Modal for New Project, Delete Project, Supabase Sync, and Trash Bin
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<ProjectItem | null>(null);
  const [cascadeDeleteReqs, setCascadeDeleteReqs] = useState(true);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({
    name: '',
    clientName: '',
    clientNumber: '',
    startDate: new Date().toISOString().split('T')[0],
    targetDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  });

  // Calculate live dynamic material counts, quantities and all machine categories per project
  const enrichedProjects = useMemo(() => {
    return projects.map((p) => {
      const mats = getMaterialsForProject(p, projectRequirements, orders);
      const totalMaterials = mats.length;
      const totalQuantity = mats.reduce((acc, m) => acc + (Number(m.quantity) || 0), 0);
      const vendor = p.vendor || mats[0]?.vendor || 'Manav Metal';
      const createdDate = p.createdDate || p.startDate || '2026-08-10';
      const lastUpdatedDate = p.lastUpdatedDate || 'Today';

      // Aggregate all unique machine types from project and all its material requirements
      const machineSet = new Set<string>();
      if (p.machineName && p.machineName !== '16 HD') machineSet.add(p.machineName);
      if (p.machineType && p.machineType !== '16 HD') machineSet.add(p.machineType);
      mats.forEach((m) => {
        if (m.machineName) machineSet.add(m.machineName);
        if (m.machineType) machineSet.add(m.machineType);
      });
      if (p.machineName) machineSet.add(p.machineName);
      if (p.machineType) machineSet.add(p.machineType);
      const machineTypes = Array.from(machineSet).filter(Boolean);

      const receivedMaterials = mats.filter((m) => m.isReceived).length;
      const arrivalPct = totalMaterials > 0 ? Math.round((receivedMaterials / totalMaterials) * 100) : 0;

      return {
        ...p,
        totalMaterials,
        totalQuantity,
        vendor,
        createdDate,
        lastUpdatedDate,
        machineTypes,
        receivedMaterials,
        arrivalPct,
      };
    });
  }, [projects, projectRequirements, orders]);

  // Apply search and all filters
  const filteredProjects = useMemo(() => {
    return enrichedProjects.filter((p) => {
      const matchesSearch =
        searchTerm === '' ||
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.projectNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.vendor && p.vendor.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.machineType && p.machineType.toLowerCase().includes(searchTerm.toLowerCase())) ||
        p.machineTypes.some((m) => m.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesMachine =
        filterMachine === 'ALL' ||
        p.machineType === filterMachine ||
        p.machineTypes.includes(filterMachine);
      const matchesVendor = filterVendor === 'ALL' || p.vendor === filterVendor;
      const matchesOrderSource = filterOrderSource === 'ALL' || p.orderSource === filterOrderSource;
      const matchesDate = !filterDate || p.startDate === filterDate || p.createdDate === filterDate;

      return matchesSearch && matchesMachine && matchesVendor && matchesOrderSource && matchesDate;
    });
  }, [enrichedProjects, searchTerm, filterMachine, filterVendor, filterOrderSource, filterDate]);

  // Aggregated Overall Portfolio Metrics
  const summaryMetrics = useMemo(() => {
    const totalProjects = filteredProjects.length;
    const totalMaterialsSum = filteredProjects.reduce((acc, p) => acc + p.totalMaterials, 0);
    const totalQtySum = filteredProjects.reduce((acc, p) => acc + p.totalQuantity, 0);
    const totalVendors = new Set(filteredProjects.map((p) => p.vendor)).size;

    return {
      totalProjects,
      totalMaterialsSum,
      totalQtySum,
      totalVendors,
    };
  }, [filteredProjects]);

  // Handle New Project Creation
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectForm.name.trim()) return;

    const count = String(projects.length + 10).padStart(3, '0');
    const projectNumber = `PRJ-2026-${count}`;
    const clientNameVal = newProjectForm.clientName.trim() || 'Cadila Healthcare Ltd';
    const clientNumVal = newProjectForm.clientNumber.trim();
    const customerDisplay = clientNumVal ? `${clientNameVal} (${clientNumVal})` : clientNameVal;

    const newPrj: ProjectItem = {
      id: `prj-${Date.now()}`,
      name: newProjectForm.name.trim(),
      customer: customerDisplay,
      clientName: clientNameVal,
      clientNumber: clientNumVal,
      projectNumber,
      orderSource: 'Customer PO',
      machineType: '' as any,
      machineName: '',
      vendor: 'Manav Metal',
      vendorName: 'Manav Metal',
      poNumber: `PO-2026-${projects.length + 1}`,
      poNo: `PO-2026-${projects.length + 1}`,
      startDate: newProjectForm.startDate,
      date: newProjectForm.startDate,
      targetCompletionDate: newProjectForm.targetDate,
      priority: 'high',
      status: 'Production',
      projectValue: 500000,
      progressPct: 15,
      createdDate: newProjectForm.startDate,
      lastUpdatedDate: 'Just now',
      materialsCount: 0,
      totalQuantity: 0,
      notes: `Project: ${newProjectForm.name} - Client: ${clientNameVal} | Phone: ${clientNumVal || 'N/A'}`,
    };

    addProject(newPrj);
    setIsNewProjectModalOpen(false);
    onSelectProject(newPrj);
    setNewProjectForm({
      name: '',
      clientName: '',
      clientNumber: '',
      startDate: new Date().toISOString().split('T')[0],
      targetDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    });
  };

  // Export Projects Directory Excel
  const handleExportExcel = () => {
    const data = filteredProjects.map((p) => ({
      'Project Number': p.projectNumber,
      'Project Name': p.name,
      'Machine Type': p.machineType,
      'Vendor': p.vendor,
      'Total Materials': `${p.totalMaterials} Items`,
      'Total Quantity': p.totalQuantity,
      'Created Date': p.createdDate,
      'Last Updated Date': p.lastUpdatedDate,
      'Order Source': p.orderSource,
      'PO Number': p.poNumber,
      'Customer': p.customer,
      'Status': p.status,
    }));
    exportToExcel(data, `RSB_Projects_Directory_${new Date().toISOString().split('T')[0]}`);
  };

  // Export PDF
  const handleExportPdf = () => {
    const headers = [
      'Project Name',
      'Machine Type',
      'Vendor',
      'Materials',
      'Total Qty',
      'Created Date',
      'Last Updated',
    ];
    const rows = filteredProjects.map((p) => [
      p.name,
      p.machineType,
      p.vendor,
      `${p.totalMaterials} Items`,
      String(p.totalQuantity),
      p.createdDate,
      p.lastUpdatedDate,
    ]);
    exportToPdfReport(
      'RSB Projects Directory & Manufacturing Portfolio',
      headers,
      rows,
      'RSB_Projects_Directory_Report'
    );
  };

  return (
    <div className="space-y-6 select-text">
      {/* ========================================================================= */}
      {/* 1. HEADER & ACTIONS BAR */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                <FolderKanban className="w-3.5 h-3.5" />
                Dedicated Projects Section
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                {filteredProjects.length} Projects Registered
              </span>
            </div>

            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              Projects Portfolio & History
            </h1>
            <p className="text-xs text-slate-500 max-w-2xl">
              Centralized project-centric repository. View, filter, and track all manufacturing entries, component specifications, and vendor allocations per project.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-600">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'hover:text-slate-900 text-slate-500'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Card View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'hover:text-slate-900 text-slate-500'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Table View</span>
              </button>
            </div>

            {!isStoreIncharge && (
              <>
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Project</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsSupabaseModalOpen(true)}
                  className="px-3 py-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 hover:text-emerald-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                  title="Cloud Backup Settings"
                >
                  <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cloud Backup</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsTrashModalOpen(true)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 border ${
                    trashItems.length > 0
                      ? 'bg-rose-50 text-rose-750 border-rose-300 hover:bg-rose-100 shadow-2xs'
                      : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  }`}
                  title="Open Trash Bin to restore deleted projects or materials"
                >
                  <Trash2 className={`w-3.5 h-3.5 ${trashItems.length > 0 ? 'text-rose-600 animate-bounce' : 'text-slate-500'}`} />
                  <span>Trash Bin ({trashItems.length})</span>
                </button>
              </>
            )}

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>PDF Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. EXECUTIVE METRICS BAR */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Projects</span>
            <FolderKanban className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono mt-1">
            {summaryMetrics.totalProjects}
          </p>
          <p className="text-[10px] text-blue-600 font-medium mt-1">Manufacturing Portfolios</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Materials</span>
            <Boxes className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono mt-1">
            {summaryMetrics.totalMaterialsSum}
          </p>
          <p className="text-[10px] text-purple-600 font-medium mt-1">Across All Projects</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Quantity</span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono mt-1">
            {summaryMetrics.totalQtySum}
          </p>
          <p className="text-[10px] text-emerald-600 font-medium mt-1">Units Fabricated / Required</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Suppliers</span>
            <Building2 className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono mt-1">
            {summaryMetrics.totalVendors}
          </p>
          <p className="text-[10px] text-amber-600 font-medium mt-1">Allocated Vendors</p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SEARCH & FILTERS (Search Project, Machine Type, Vendor, Date, Order Source) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Project */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Project Name, ID, Customer, PO Number (e.g. FOHA, Project 1, Manav Metal)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            {/* Filter by Machine Type */}
            <select
              value={filterMachine}
              onChange={(e) => setFilterMachine(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold focus:outline-hidden"
            >
              <option value="ALL">All Machine Types</option>
              {MACHINE_CATEGORIES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {/* Filter by Vendor */}
            <select
              value={filterVendor}
              onChange={(e) => setFilterVendor(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold focus:outline-hidden"
            >
              <option value="ALL">All Vendors</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.name}>
                  {v.name}
                </option>
              ))}
            </select>

            {/* Filter by Order Source */}
            <select
              value={filterOrderSource}
              onChange={(e) => setFilterOrderSource(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold focus:outline-hidden"
            >
              <option value="ALL">All Order Sources</option>
              {ORDER_SOURCES.map((os) => (
                <option key={os} value={os}>
                  {os}
                </option>
              ))}
            </select>

            {/* Filter by Date */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="bg-transparent text-xs text-slate-700 font-medium focus:outline-hidden"
              />
              {filterDate && (
                <button
                  type="button"
                  onClick={() => setFilterDate('')}
                  className="text-[10px] text-slate-400 hover:text-red-500 font-bold ml-1 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. PROFESSIONAL CARD VIEW & TABLE VIEW */}
      {/* ========================================================================= */}
      {filteredProjects.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
          <FolderKanban className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No matching projects found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try adjusting your search criteria or filters, or create a new project using the "New Project" button.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setFilterMachine('ALL');
              setFilterVendor('ALL');
              setFilterOrderSource('ALL');
              setFilterDate('');
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((prj) => {
            const prjDate = prj.startDate || prj.date || prj.createdDate || '01-09-2026';
            const deliveryDate = prj.targetCompletionDate || prj.targetDate || '30-10-2026';
            const clientName = prj.customer || prj.clientName || 'Cadila Healthcare Ltd';
            const matCount = prj.totalMaterials ?? prj.materialsCount ?? 0;
            const ordBy = prj.orderedBy || 'Amit';
            const machineList = prj.machineTypes && prj.machineTypes.length > 0
              ? prj.machineTypes
              : (prj.machineName || prj.machineType ? [prj.machineName || prj.machineType] : []);

            return (
              <div
                key={prj.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs hover:shadow-md hover:border-blue-400 transition-all space-y-4 group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Header: Machine Names & Project Title */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {machineList.map((mch: string) => (
                          <span
                            key={mch}
                            className="font-mono text-xs font-black text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-lg border border-purple-200"
                          >
                            {mch}
                          </span>
                        ))}
                        <span className="font-mono text-[10px] font-bold text-slate-400">
                          {prj.projectNumber}
                        </span>
                      </div>
                      <h3 className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                        {prj.name}
                      </h3>
                    </div>
                    <StatusBadge status={prj.status} size="sm" />
                  </div>

                  {/* Specification Table Box */}
                  <div className="space-y-2 text-xs font-mono">
                    {/* Client */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-500 font-sans font-medium flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-blue-600" />
                        Client:
                      </span>
                      <strong className="text-slate-800 truncate font-sans text-xs">{clientName}</strong>
                    </div>

                    {/* Start Date */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-500 font-sans font-medium flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-600" />
                        Start Date:
                      </span>
                      <strong className="text-slate-800">{prjDate}</strong>
                    </div>

                    {/* Delivery Date */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50/70 border border-amber-200">
                      <span className="text-amber-900 font-sans font-bold flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-600" />
                        Delivery Date:
                      </span>
                      <strong className="text-amber-900 font-bold">{deliveryDate}</strong>
                    </div>

                    {/* Materials */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-slate-500 font-sans font-medium flex items-center gap-1.5">
                        <Boxes className="w-3.5 h-3.5 text-blue-600" />
                        Materials:
                      </span>
                      <strong className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        {matCount} Items ({prj.totalQuantity} Units)
                      </strong>
                    </div>

                    {/* Material Inward Progress */}
                    <div className="space-y-1.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-600 font-sans flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-emerald-600" />
                          Material Inward:
                        </span>
                        <strong className="font-mono text-slate-900 font-bold">
                          {prj.receivedMaterials || 0}/{matCount} ({prj.arrivalPct || 0}%)
                        </strong>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            prj.arrivalPct === 100
                              ? 'bg-emerald-500'
                              : (prj.arrivalPct || 0) > 0
                              ? 'bg-blue-600'
                              : 'bg-slate-300'
                          }`}
                          style={{ width: `${prj.arrivalPct || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Ordered By */}
                    <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-50/70 border border-emerald-200">
                      <span className="text-emerald-900 font-sans font-bold flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-emerald-600" />
                        Ordered By:
                      </span>
                      <strong className="text-emerald-800">{ordBy}</strong>
                    </div>
                  </div>
                </div>

                {/* Open Project Action Button & Super Admin Delete */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectProject(prj)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
                  >
                    <span>Open Project</span>
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                  {isSuperAdmin && (
                    <button
                      type="button"
                      title="Delete Project (Super Admin Access)"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectToDelete(prj);
                      }}
                      className="p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition active:scale-95 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="p-3.5 min-w-[200px] whitespace-nowrap">Project Name</th>
                  <th className="p-3.5 min-w-[160px] whitespace-nowrap">Machine Categories</th>
                  <th className="p-3.5 min-w-[140px] whitespace-nowrap">Client</th>
                  <th className="p-3.5 min-w-[120px] whitespace-nowrap">Delivery Date</th>
                  <th className="p-3.5 min-w-[130px] whitespace-nowrap">Material Inward</th>
                  <th className="p-3.5 min-w-[120px] text-center whitespace-nowrap">Total Materials</th>
                  <th className="p-3.5 min-w-[110px] text-center whitespace-nowrap">Total Quantity</th>
                  <th className="p-3.5 min-w-[100px] whitespace-nowrap">Start Date</th>
                  <th className="p-3.5 min-w-[100px] text-center whitespace-nowrap">Status</th>
                  <th className="p-3.5 w-32 text-center whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {filteredProjects.map((prj) => {
                  const clientName = prj.customer || prj.clientName || 'Cadila Healthcare Ltd';
                  const deliveryDate = prj.targetCompletionDate || prj.targetDate || '30-10-2026';
                  const machineList = prj.machineTypes && prj.machineTypes.length > 0
                    ? prj.machineTypes
                    : (prj.machineName || prj.machineType ? [prj.machineName || prj.machineType] : []);

                  return (
                    <tr key={prj.id} className="hover:bg-blue-50/40 transition-colors">
                      {/* Project Name & Number */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div>
                          <span className="font-bold text-slate-900 text-sm">{prj.name}</span>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                            <span className="font-mono font-semibold text-blue-600">{prj.projectNumber}</span>
                          </div>
                        </div>
                      </td>

                      {/* Machine Categories */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {machineList.map((mch: string) => (
                            <span
                              key={mch}
                              className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 font-bold text-[11px] whitespace-nowrap"
                            >
                              {mch}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Client */}
                      <td className="p-3.5 font-semibold text-slate-800 whitespace-nowrap">
                        <span className="truncate max-w-[160px] block">{clientName}</span>
                      </td>

                      {/* Delivery Date */}
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="px-2 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200 font-bold text-xs">
                          {deliveryDate}
                        </span>
                      </td>

                      {/* Material Inward Progress */}
                      <td className="p-3.5 whitespace-nowrap">
                        <div className="w-28 space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono font-bold">
                            <span className="text-slate-700">{prj.receivedMaterials || 0}/{prj.totalMaterials}</span>
                            <span className={prj.arrivalPct === 100 ? 'text-emerald-700 font-black' : 'text-blue-700 font-bold'}>{prj.arrivalPct || 0}%</span>
                          </div>
                          <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                prj.arrivalPct === 100
                                  ? 'bg-emerald-500'
                                  : (prj.arrivalPct || 0) > 0
                                  ? 'bg-blue-600'
                                  : 'bg-slate-300'
                              }`}
                              style={{ width: `${prj.arrivalPct || 0}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Total Materials */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span className="inline-flex items-center justify-center min-w-[70px] font-extrabold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                          {prj.totalMaterials} Items
                        </span>
                      </td>

                      {/* Total Quantity */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span className="inline-flex items-center justify-center min-w-[70px] font-extrabold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                          {prj.totalQuantity} Units
                        </span>
                      </td>

                      {/* Start Date */}
                      <td className="p-3.5 font-mono text-slate-600 whitespace-nowrap">
                        {prj.startDate || prj.date || prj.createdDate}
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <StatusBadge status={prj.status} size="sm" />
                      </td>

                      {/* Action */}
                      <td className="p-3.5 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectProject(prj)}
                            className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-2xs inline-flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                          >
                            <span>View</span>
                            <ArrowRight className="w-3 h-3 text-emerald-400" />
                          </button>
                          {isSuperAdmin && (
                            <button
                              type="button"
                              title="Delete Project (Super Admin Access)"
                              onClick={(e) => {
                                e.stopPropagation();
                                setProjectToDelete(prj);
                              }}
                              className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition active:scale-95 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL: CREATE NEW PROJECT */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isNewProjectModalOpen}
        onClose={() => setIsNewProjectModalOpen(false)}
        title="Create New Project"
        subtitle="Establish dedicated project with client details and project timeline"
        maxWidth="md"
      >
        <form onSubmit={handleCreateProject} className="space-y-4 text-xs font-sans">
          {/* 1. Project Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={newProjectForm.name}
              onChange={(e) => setNewProjectForm({ ...newProjectForm, name: e.target.value })}
              placeholder="e.g. Mahalaxmi 2, FOHA, Project 1"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-bold focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all"
              autoFocus
            />
          </div>

          {/* 2. Client Name & 3. Client Number (Separate Inputs) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Client Name *
              </label>
              <input
                type="text"
                required
                value={newProjectForm.clientName}
                onChange={(e) => setNewProjectForm({ ...newProjectForm, clientName: e.target.value })}
                placeholder="e.g. Cadila Healthcare Ltd"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-semibold focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Client Number *
              </label>
              <input
                type="text"
                required
                value={newProjectForm.clientNumber}
                onChange={(e) => setNewProjectForm({ ...newProjectForm, clientNumber: e.target.value })}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-semibold focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-sm transition-all font-mono"
              />
            </div>
          </div>

          {/* 3. Start Date & 4. Target Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={newProjectForm.startDate}
                onChange={(e) => setNewProjectForm({ ...newProjectForm, startDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-bold focus:bg-white focus:border-blue-600 outline-none font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Target Date *
              </label>
              <input
                type="date"
                required
                value={newProjectForm.targetDate}
                onChange={(e) => setNewProjectForm({ ...newProjectForm, targetDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-bold focus:bg-white focus:border-blue-600 outline-none font-mono text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsNewProjectModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-md shadow-blue-500/20 cursor-pointer active:scale-95 transition-all"
            >
              Create Project
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Project Confirmation Modal (Super Admin) */}
      <Modal
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        title="⚠️ Confirm Permanent Project Deletion"
        maxWidth="md"
      >
        {projectToDelete && (
          <div className="space-y-4">
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                <Trash2 className="w-5 h-5 text-rose-600" />
                <span>Delete "{projectToDelete.name}"?</span>
              </div>
              <p className="text-xs text-rose-700 leading-relaxed">
                You are about to permanently delete this project from the live RSB ERP database and cloud backup. This action cannot be undone.
              </p>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Project Number:</span>
                <span className="font-bold text-slate-800">{projectToDelete.projectNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Machine Type:</span>
                <span className="font-bold text-slate-800">{projectToDelete.machineType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Customer:</span>
                <span className="font-bold text-slate-800">{projectToDelete.customer}</span>
              </div>
            </div>

            <label className="flex items-center gap-2 p-2.5 bg-slate-100 rounded-xl text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={cascadeDeleteReqs}
                onChange={(e) => setCascadeDeleteReqs(e.target.checked)}
                className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
              />
              <span className="font-medium">Also delete all linked material requirements for this project</span>
            </label>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteProject(projectToDelete.id, cascadeDeleteReqs);
                  setProjectToDelete(null);
                }}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer transition active:scale-95 flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Permanently Delete Project</span>
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Supabase Integration Modal */}
      <SupabaseConnectModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />

      {/* ========================================================================= */}
      {/* MODAL: TRASH / RECYCLE BIN & INSTANT RECOVERY */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isTrashModalOpen}
        onClose={() => setIsTrashModalOpen(false)}
        title="🗑️ Trash & Recovery Vault"
        subtitle="Recover accidentally deleted projects and material rows, or permanently empty trash"
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs font-sans">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${trashItems.length > 0 ? 'bg-rose-500 animate-pulse' : 'bg-slate-400'}`} />
              <span className="text-slate-700 font-bold">
                {trashItems.length} Deleted Items in Vault
              </span>
            </div>
            {trashItems.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Permanently purge all items from trash? This cannot be undone.')) {
                    emptyTrash();
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-[11px] font-bold cursor-pointer transition-all active:scale-95"
              >
                Empty Entire Trash
              </button>
            )}
          </div>

          {trashItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Trash2 className="w-10 h-10 mx-auto text-slate-300 opacity-60" />
              <p className="font-bold text-slate-600">Trash Vault is Empty</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Any projects or material rows you delete will appear here and can be recovered with 1 click.
              </p>
            </div>
          ) : (
            <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {trashItems.map((item) => (
                <div key={item.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        item.type === 'project'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {item.type === 'project' ? '📁 Project' : '📦 Material'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Deleted: {item.deletedAt} • by {item.deletedBy}
                      </span>
                    </div>
                    <h4 className="text-xs font-black text-slate-900 truncate">{item.title}</h4>
                    <p className="text-[11px] text-slate-500 truncate font-mono">{item.subtitle}</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        restoreFromTrash(item.id);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer active:scale-95"
                      title="Restore back to active ERP and database"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Recover</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => permanentlyDeleteFromTrash(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Delete permanently"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setIsTrashModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
            >
              Close Vault
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
