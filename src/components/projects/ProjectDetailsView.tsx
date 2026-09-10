import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Download,
  FileText,
  Plus,
  Search,
  Layers,
  Building2,
  Cpu,
  Package,
  Boxes,
  Calendar,
  Edit2,
  Trash2,
  Copy,
  Sparkles,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { ProjectItem, ProjectMaterialRequirementItem, MaterialType, MachineCategory } from '../../types/erp';
import { exportToExcel, exportToPdfReport } from '../../utils/excelIntegration';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';

import { getMaterialsForProject } from '../../utils/projectMaterialsHelper';

interface ProjectDetailsViewProps {
  project: ProjectItem;
  onBack: () => void;
  onOpenInEntrySheet?: (projectName: string) => void;
}

const MATERIAL_TYPES: MaterialType[] = [
  'SS Flat',
  'SS Pipe',
  'SS Circle',
  'SS Bar',
  'SS Sheet',
  'SS Angle',
  'Hardware',
  'Consumables',
  'Other',
];

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

export const ProjectDetailsView: React.FC<ProjectDetailsViewProps> = ({
  project,
  onBack,
  onOpenInEntrySheet,
}) => {
  const {
    projectRequirements,
    addProjectRequirement,
    updateProjectRequirement,
    deleteProjectRequirement,
    orders,
    vendors,
  } = useERP();

  // Search & Filters within this project's materials
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMaterialType, setFilterMaterialType] = useState('ALL');
  const [filterMachine, setFilterMachine] = useState('ALL');
  const [filterVendor, setFilterVendor] = useState('ALL');

  // Modal State for Adding / Editing Material
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ProjectMaterialRequirementItem | null>(null);

  // Form State
  const [matForm, setMatForm] = useState({
    description: '',
    materialType: 'SS Flat' as MaterialType,
    materialGrade: 'SS 304',
    sizeSpecs: '',
    quantity: 1,
    unit: 'Nos',
    vendor: project.vendor || 'Manav Metal',
    machineType: project.machineType || '16 HD',
    orderSource: project.orderSource || 'Customer PO',
    poNumber: project.poNumber || '36',
    notes: '',
  });

  // Dynamically resolve all materials for this project
  const displayMaterials = useMemo(() => {
    return getMaterialsForProject(project, projectRequirements, orders);
  }, [project, projectRequirements, orders]);

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return displayMaterials.filter((m) => {
      const matchSearch =
        searchTerm === '' ||
        m.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.sizeSpecs.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.materialType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.vendor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.machineType || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchMat = filterMaterialType === 'ALL' || m.materialType === filterMaterialType;
      const matchMch = filterMachine === 'ALL' || m.machineType === filterMachine;
      const matchVnd = filterVendor === 'ALL' || m.vendor === filterVendor;

      return matchSearch && matchMat && matchMch && matchVnd;
    });
  }, [displayMaterials, searchTerm, filterMaterialType, filterMachine, filterVendor]);

  // Aggregated Summary Statistics for this project
  const projectSummary = useMemo(() => {
    const totalEntries = displayMaterials.length;
    const totalQty = displayMaterials.reduce((acc, m) => acc + (Number(m.quantity) || 0), 0);
    const vendorName = project.vendor || displayMaterials[0]?.vendor || 'Manav Metal';
    const machineType = project.machineType || displayMaterials[0]?.machineType || '16 HD';
    const createdDate = project.createdDate || project.startDate || new Date().toISOString().split('T')[0];
    const lastUpdated = project.lastUpdatedDate || 'Today';
    const totalCostSum = displayMaterials.reduce((acc, m) => acc + (Number(m.totalCost) || 0), 0);

    return {
      totalEntries,
      totalQty,
      vendorName,
      machineType,
      createdDate,
      lastUpdated,
      totalCostSum,
    };
  }, [displayMaterials, project]);

  // Handle Add / Edit Submission
  const handleSaveMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      updateProjectRequirement(editingItem.id, {
        description: matForm.description,
        materialType: matForm.materialType,
        materialGrade: matForm.materialGrade,
        sizeSpecs: matForm.sizeSpecs,
        quantity: Number(matForm.quantity) || 1,
        unit: matForm.unit,
        vendor: matForm.vendor,
        machineType: matForm.machineType,
        orderSource: matForm.orderSource,
        poNumber: matForm.poNumber,
        notes: matForm.notes,
      });
      setEditingItem(null);
    } else {
      const qty = Number(matForm.quantity) || 1;
      const matCost = qty * 450;
      const laborCost = Math.round(matCost * 0.4);
      const machineCost = Math.round(matCost * 0.25);
      const totalCost = matCost + laborCost + machineCost;

      addProjectRequirement({
        description: matForm.description || 'Project Fabricated Component',
        materialType: matForm.materialType,
        materialGrade: matForm.materialGrade,
        sizeSpecs: matForm.sizeSpecs || '80 x 6 x 485',
        quantity: qty,
        unit: matForm.unit,
        projectName: project.name,
        customerName: project.customer,
        poNumber: matForm.poNumber,
        poDate: project.startDate || new Date().toISOString().split('T')[0],
        machineType: matForm.machineType,
        orderSource: matForm.orderSource,
        deliveryDate: project.targetCompletionDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        vendor: matForm.vendor,
        bomRef: `BOM-${project.name.substring(0, 4)}`,
        stockStatus: 'Available',
        availableStock: 25,
        shortageQty: 0,
        productionStatus: 'Pending',
        qcStatus: 'Not Started',
        dispatchStatus: 'Not Ready',
        materialCost: matCost,
        laborCost,
        machineCost,
        outsourcingCost: 0,
        totalCost,
      });
    }

    setIsAddMaterialModalOpen(false);
    setMatForm({
      description: '',
      materialType: 'SS Flat',
      materialGrade: 'SS 304',
      sizeSpecs: '',
      quantity: 1,
      unit: 'Nos',
      vendor: project.vendor || 'Manav Metal',
      machineType: project.machineType || '16 HD',
      orderSource: project.orderSource || 'Customer PO',
      poNumber: project.poNumber || '36',
      notes: '',
    });
  };

  const openEditModal = (item: ProjectMaterialRequirementItem) => {
    setEditingItem(item);
    setMatForm({
      description: item.description,
      materialType: item.materialType,
      materialGrade: item.materialGrade || 'SS 304',
      sizeSpecs: item.sizeSpecs,
      quantity: item.quantity,
      unit: item.unit,
      vendor: item.vendor || project.vendor || 'Manav Metal',
      machineType: item.machineType || project.machineType || '16 HD',
      orderSource: item.orderSource || project.orderSource || 'Customer PO',
      poNumber: item.poNumber || project.poNumber || '36',
      notes: item.notes || '',
    });
    setIsAddMaterialModalOpen(true);
  };

  const handleDuplicate = (item: ProjectMaterialRequirementItem) => {
    const { id, srNo, ...rest } = item;
    addProjectRequirement({
      ...rest,
      description: `${item.description} (Copy)`,
      projectName: project.name,
    });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to remove this material entry from this project?')) {
      deleteProjectRequirement(id);
    }
  };

  // Export Project Excel
  const handleExportExcel = () => {
    const data = filteredMaterials.map((m, idx) => ({
      'Sr No': idx + 1,
      'Project': project.name,
      'Machine Type': m.machineType,
      'Vendor': m.vendor,
      'Order Source': m.orderSource,
      'PO Number': m.poNumber,
      'Material Type': m.materialType,
      'Size Specification': m.sizeSpecs,
      'Quantity': m.quantity,
      'Unit': m.unit,
      'Description': m.description,
      'Grade': m.materialGrade,
      'Stock Status': m.stockStatus,
    }));
    exportToExcel(data, `RSB_Project_${project.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_Materials`);
  };

  // Export PDF Report
  const handleExportPdf = () => {
    const headers = [
      'Sr',
      'Material Type',
      'Size Specification',
      'Quantity',
      'Vendor',
      'Machine Type',
      'Project',
      'Order Source',
    ];
    const rows = filteredMaterials.map((m, idx) => [
      String(idx + 1),
      m.materialType,
      m.sizeSpecs,
      `${m.quantity} ${m.unit}`,
      m.vendor || project.vendor || 'Manav Metal',
      m.machineType || project.machineType,
      project.name,
      m.orderSource || project.orderSource,
    ]);

    exportToPdfReport(
      `RSB Manufacturing Material Requirement: ${project.name}`,
      headers,
      rows,
      `Project_${project.name}_Materials_Spec`
    );
  };

  return (
    <div className="space-y-6 select-text">
      {/* ========================================================================= */}
      {/* 1. TOP BREADCRUMB & PRIMARY ACTION BAR */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg border border-blue-200 transition-all active:scale-95 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to All Projects</span>
            </button>

            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Layers className="w-6 h-6 text-blue-600" />
                {project.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold font-mono">
                {project.projectNumber || 'PRJ-2026-FOHA'}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold">
                {project.machineType}
              </span>
              <StatusBadge status={project.status} size="sm" />
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Client: <strong className="text-slate-800">{project.customer}</strong> • Machine Execution & Dedicated Material Specification Matrix
            </p>
          </div>

          {/* Action Hub */}
          <div className="flex flex-wrap items-center gap-2">
            {onOpenInEntrySheet && (
              <button
                type="button"
                onClick={() => onOpenInEntrySheet(project.name)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                title="Open and edit this project in the fast spreadsheet entry workstation"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Open in Entry Workstation</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                setEditingItem(null);
                setMatForm({
                  description: '',
                  materialType: 'SS Flat',
                  materialGrade: 'SS 304',
                  sizeSpecs: '',
                  quantity: 1,
                  unit: 'Nos',
                  vendor: project.vendor || 'Manav Metal',
                  machineType: project.machineType || '16 HD',
                  orderSource: project.orderSource || 'Customer PO',
                  poNumber: project.poNumber || '36',
                  notes: '',
                });
                setIsAddMaterialModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Material</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export Excel</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>PDF Spec</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PROJECT INFORMATION BANNER (MANDATORY SPEC REQUIREMENT) */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-5 shadow-md">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-200">
              Project Information
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Auto-Linked Master Record
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Project Name
            </span>
            <p className="text-sm font-bold text-white truncate" title={project.name}>
              {project.name}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Machine Type
            </span>
            <p className="text-sm font-bold text-cyan-300 truncate">
              {project.machineType}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Vendor
            </span>
            <p className="text-sm font-bold text-amber-300 truncate">
              {project.vendor || 'Manav Metal'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Order Source
            </span>
            <p className="text-sm font-bold text-slate-200 truncate">
              {project.orderSource || 'Customer PO'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              PO Number
            </span>
            <p className="text-sm font-bold font-mono text-emerald-400 truncate">
              {project.poNumber || 'PO-2026-36'}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Date
            </span>
            <p className="text-sm font-bold font-mono text-slate-300 truncate">
              {project.startDate || project.createdDate || '2026-08-10'}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CLIENT FRIENDLY FEATURE: "PROJECT SUMMARY" CARD */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50/50 to-slate-50 border border-blue-200/80 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-blue-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Project Summary & Management Overview
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Instant executive summary for client demonstration and plant coordination
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
              Active Project Focus
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
          {/* Total Material Entries */}
          <div className="bg-white rounded-xl p-4 border border-blue-100/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Material Entries</span>
              <Boxes className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900 font-mono">{projectSummary.totalEntries}</span>
              <span className="text-xs font-semibold text-slate-500">Items</span>
            </div>
            <p className="text-[10px] text-blue-600 font-medium mt-1">Directly Linked</p>
          </div>

          {/* Total Quantity */}
          <div className="bg-white rounded-xl p-4 border border-blue-100/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Quantity</span>
              <Package className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900 font-mono">{projectSummary.totalQty}</span>
              <span className="text-xs font-semibold text-slate-500">Units</span>
            </div>
            <p className="text-[10px] text-emerald-600 font-medium mt-1">Fabrication Sum</p>
          </div>

          {/* Vendor */}
          <div className="bg-white rounded-xl p-4 border border-blue-100/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Vendor</span>
              <Building2 className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-sm font-bold text-slate-900 truncate mt-1.5">{projectSummary.vendorName}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-1">Primary Supplier</p>
          </div>

          {/* Machine Type */}
          <div className="bg-white rounded-xl p-4 border border-blue-100/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Machine Type</span>
              <Cpu className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-sm font-bold text-slate-900 truncate mt-1.5">{projectSummary.machineType}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-1">Execution Line</p>
          </div>

          {/* Created Date */}
          <div className="bg-white rounded-xl p-4 border border-blue-100/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Created Date</span>
              <Calendar className="w-4 h-4 text-slate-600" />
            </div>
            <p className="text-sm font-bold text-slate-900 font-mono mt-1.5">{projectSummary.createdDate}</p>
            <p className="text-[10px] text-slate-500 font-medium mt-1">Updated: {projectSummary.lastUpdated}</p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. SEARCH & FILTER TOOLBAR FOR THIS PROJECT'S MATERIALS */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search material type, size specs, description, vendor in this project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white"
          />
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <select
            value={filterMaterialType}
            onChange={(e) => setFilterMaterialType(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold focus:outline-hidden"
          >
            <option value="ALL">All Material Types</option>
            {MATERIAL_TYPES.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          <select
            value={filterMachine}
            onChange={(e) => setFilterMachine(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 font-semibold focus:outline-hidden"
          >
            <option value="ALL">All Machine Types</option>
            {MACHINE_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>

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
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. COMPLETE MATERIAL LIST TABLE ONLY FOR THIS PROJECT */}
      {/* Table columns required: Material Type, Size Specification, Quantity, */}
      {/* Vendor, Machine Type, Project, Order Source */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Boxes className="w-4 h-4 text-blue-600" />
              Project Material Specification List ({filteredMaterials.length} Items)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              All materials strictly linked to project <strong className="text-slate-800">{project.name}</strong>
            </p>
          </div>

          <div className="text-xs font-mono font-bold text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
            Total Qty: <span className="text-emerald-600 font-black">{filteredMaterials.reduce((acc, m) => acc + Number(m.quantity || 0), 0)} Units</span>
          </div>
        </div>

        {filteredMaterials.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Boxes className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">No material records found for this project</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Add component requirements using the "Add Material" button or load the standard 14 RSB parts preset in the Material Entry Workstation.
            </p>
            <button
              onClick={() => setIsAddMaterialModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add First Material
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="p-3.5 w-12 text-center whitespace-nowrap">Sr</th>
                  <th className="p-3.5 min-w-[160px] whitespace-nowrap">Material Type</th>
                  <th className="p-3.5 min-w-[200px] whitespace-nowrap">Size Specification</th>
                  <th className="p-3.5 min-w-[130px] w-36 text-center whitespace-nowrap">Quantity</th>
                  <th className="p-3.5 min-w-[140px] whitespace-nowrap">Vendor</th>
                  <th className="p-3.5 min-w-[140px] whitespace-nowrap">Machine Type</th>
                  <th className="p-3.5 min-w-[150px] whitespace-nowrap">Project</th>
                  <th className="p-3.5 min-w-[120px] whitespace-nowrap">Order Source</th>
                  <th className="p-3.5 w-28 text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {filteredMaterials.map((m, idx) => (
                  <tr key={m.id || idx} className="hover:bg-blue-50/40 transition-colors">
                    <td className="p-3.5 text-center font-mono font-bold text-slate-400 whitespace-nowrap">
                      {idx + 1}
                    </td>

                    {/* Material Type */}
                    <td className="p-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-bold text-[11px]">
                          {m.materialType}
                        </span>
                        {m.description && (
                          <span className="text-slate-500 text-[11px] truncate max-w-[150px]" title={m.description}>
                            • {m.description}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Size Specification */}
                    <td className="p-3.5 font-mono font-bold text-blue-700 whitespace-nowrap">
                      {m.sizeSpecs}
                    </td>

                    {/* Quantity */}
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <span className="inline-flex items-center justify-center min-w-[84px] px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 font-mono font-black text-xs rounded-lg shadow-2xs">
                        {m.quantity}&nbsp;<span className="text-slate-600 font-bold text-[11px]">{m.unit || 'Nos'}</span>
                      </span>
                    </td>

                    {/* Vendor */}
                    <td className="p-3.5 font-semibold text-amber-700 whitespace-nowrap">
                      {m.vendor || project.vendor || 'Manav Metal'}
                    </td>

                    {/* Machine Type */}
                    <td className="p-3.5 font-semibold text-purple-700 whitespace-nowrap">
                      {m.machineType || project.machineType}
                    </td>

                    {/* Project */}
                    <td className="p-3.5 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[11px]">
                        {project.name}
                      </span>
                    </td>

                    {/* Order Source */}
                    <td className="p-3.5 text-slate-600 whitespace-nowrap">
                      {m.orderSource || project.orderSource || 'Customer PO'}
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(m)}
                          className="p-1.5 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                          title="Edit Row"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicate(m)}
                          className="p-1.5 rounded-md text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                          title="Duplicate Row"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(m.id)}
                          className="p-1.5 rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete Row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 6. MODAL: ADD / EDIT MATERIAL SPECIFICATION */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddMaterialModalOpen}
        onClose={() => setIsAddMaterialModalOpen(false)}
        title={editingItem ? 'Edit Project Material' : 'Add Material to Project'}
        subtitle={`Linking component directly to ${project.name}`}
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveMaterial} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Component Description *
              </label>
              <input
                type="text"
                required
                value={matForm.description}
                onChange={(e) => setMatForm({ ...matForm, description: e.target.value })}
                placeholder="e.g. Mono Conveyor Inlet Patti"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Material Type *
              </label>
              <select
                value={matForm.materialType}
                onChange={(e) => setMatForm({ ...matForm, materialType: e.target.value as MaterialType })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold"
              >
                {MATERIAL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Size Specification *
              </label>
              <input
                type="text"
                required
                value={matForm.sizeSpecs}
                onChange={(e) => setMatForm({ ...matForm, sizeSpecs: e.target.value })}
                placeholder="e.g. 80 x 6 x 485"
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-mono font-bold text-blue-700"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Quantity *
              </label>
              <input
                type="number"
                min="1"
                required
                value={matForm.quantity}
                onChange={(e) => setMatForm({ ...matForm, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Unit
              </label>
              <select
                value={matForm.unit}
                onChange={(e) => setMatForm({ ...matForm, unit: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium"
              >
                <option value="Nos">Nos</option>
                <option value="Kg">Kg</option>
                <option value="Meters">Meters</option>
                <option value="Set">Set</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Vendor
              </label>
              <input
                type="text"
                value={matForm.vendor}
                onChange={(e) => setMatForm({ ...matForm, vendor: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Machine Type
              </label>
              <select
                value={matForm.machineType}
                onChange={(e) => setMatForm({ ...matForm, machineType: e.target.value as MachineCategory })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium"
              >
                {MACHINE_CATEGORIES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Order Source
              </label>
              <input
                type="text"
                value={matForm.orderSource}
                onChange={(e) => setMatForm({ ...matForm, orderSource: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 font-medium"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAddMaterialModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
            >
              {editingItem ? 'Update Material' : 'Save to Project'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
