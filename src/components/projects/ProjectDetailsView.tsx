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
  Lock,
  Tag,
  CheckCircle2,
  Clock,
  Truck,
  UserCheck,
  Save,
  Check,
  Database,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { ProjectItem, ProjectMaterialRequirementItem, MaterialType, MachineCategory } from '../../types/erp';
import { exportToExcel, exportToPdfReport } from '../../utils/excelIntegration';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { dbBulkUpsertRequirements } from '../../services/supabaseService';
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
    deleteProject,
    orders,
    vendors,
    currentUser,
    toggleMaterialReceived,
    logAudit,
  } = useERP();

  const isSuperAdmin =
    currentUser?.role === 'super_admin' || currentUser?.name?.toLowerCase().includes('amit');
  const isStoreIncharge = currentUser?.role === 'store_incharge';

  // DB Sync State
  const [isSavingToDb, setIsSavingToDb] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Search & Filters within this project's materials
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMaterialType, setFilterMaterialType] = useState('ALL');
  const [filterMachine, setFilterMachine] = useState('ALL');
  const [filterVendor, setFilterVendor] = useState('ALL');
  const [filterReceived, setFilterReceived] = useState<'ALL' | 'RECEIVED' | 'PENDING'>('ALL');

  // Modal State for Adding / Editing Material & Deleting Project
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);
  const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] = useState(false);
  const [cascadeDeleteReqs, setCascadeDeleteReqs] = useState(true);
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

  // Arrival / Receiving Statistics
  const receivedMaterialsCount = useMemo(() => {
    return displayMaterials.filter((m) => m.isReceived).length;
  }, [displayMaterials]);

  const pendingMaterialsCount = displayMaterials.length - receivedMaterialsCount;
  const receivingProgressPct = displayMaterials.length > 0
    ? Math.round((receivedMaterialsCount / displayMaterials.length) * 100)
    : 0;

  // Aggregate all unique machine types from project definition and all materials
  const uniqueMachineTypes = useMemo(() => {
    const set = new Set<string>();
    if (project.machineName) set.add(project.machineName);
    if (project.machineType) set.add(project.machineType);
    displayMaterials.forEach((m) => {
      if (m.machineName) set.add(m.machineName);
      if (m.machineType) set.add(m.machineType);
    });
    const res = Array.from(set).filter(Boolean);
    return res.length > 0 ? res : ['16 HD'];
  }, [project, displayMaterials]);

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return displayMaterials.filter((m) => {
      const matchSearch =
        searchTerm === '' ||
        m.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.sizeSpecs.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.materialType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.vendor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.machineType || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.receivedBy || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.receivedByInitials || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchMat = filterMaterialType === 'ALL' || m.materialType === filterMaterialType;
      const matchMch = filterMachine === 'ALL' || m.machineType === filterMachine;
      const matchVnd = filterVendor === 'ALL' || m.vendor === filterVendor;
      const matchRecv =
        filterReceived === 'ALL'
          ? true
          : filterReceived === 'RECEIVED'
          ? Boolean(m.isReceived)
          : !m.isReceived;

      return matchSearch && matchMat && matchMch && matchVnd && matchRecv;
    });
  }, [displayMaterials, searchTerm, filterMaterialType, filterMachine, filterVendor, filterReceived]);

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

  // Save / Sync Inward Verification directly to Database & Cloud
  const handleSaveInwardToDb = async () => {
    setIsSavingToDb(true);
    setSaveSuccessMessage(null);
    try {
      const currentReqs = projectRequirements.filter(
        (r) => (r.projectName || '').toLowerCase() === project.name.toLowerCase()
      );
      if (currentReqs.length > 0) {
        await dbBulkUpsertRequirements(currentReqs);
      }
      logAudit?.(
        'Material Inward Status Verified & Saved',
        'Stores & Inward',
        `${currentUser?.name || 'Stores Inspector'} (${currentUser?.role}) verified & saved arrival receipts (${receivedMaterialsCount}/${displayMaterials.length} Arrived) to database for Project: ${project.name}`
      );
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastSavedTime(timeStr);
      setSaveSuccessMessage(`Arrival verification successfully saved to database at ${timeStr}`);
      setTimeout(() => {
        setSaveSuccessMessage(null);
      }, 5000);
    } catch (err) {
      console.error('Error saving inward status:', err);
    } finally {
      setTimeout(() => {
        setIsSavingToDb(false);
      }, 350);
    }
  };

  // Export Project Excel (Exact 10 Columns)
  const handleExportExcel = () => {
    const data = filteredMaterials.map((m, idx) => ({
      'Machine Name': m.machineName || m.machineType || project.machineName || project.machineType || '16 HD',
      'Date': m.date || project.date || project.startDate || '01-09-2026',
      'PO No': m.poNo || m.poNumber || project.poNo || project.poNumber || '36',
      'Sr No': idx + 1,
      'Material Type': m.materialType,
      'Size Specification': m.sizeSpecs,
      'Qty': m.quantity,
      'Vendor Name': m.vendorName || m.vendor || project.vendorName || project.vendor || 'Manav Metal',
      'Description': m.description,
      'Ordered By': m.orderedBy || project.orderedBy || currentUser.name || 'Amit',
    }));
    exportToExcel(data, `RSB_Project_${(project.machineName || project.name).replace(/[^a-zA-Z0-9_-]/g, '_')}_10Col`);
  };

  // Export PDF Report
  const handleExportPdf = () => {
    const headers = [
      'Machine Name',
      'Date',
      'PO No',
      'Sr No',
      'Material Type',
      'Size Specification',
      'Qty',
      'Vendor Name',
      'Description',
      'Ordered By',
    ];
    const rows = filteredMaterials.map((m, idx) => [
      m.machineName || m.machineType || project.machineName || project.machineType || '16 HD',
      m.date || project.date || project.startDate || '01-09-2026',
      m.poNo || m.poNumber || project.poNo || project.poNumber || '36',
      String(idx + 1),
      m.materialType,
      m.sizeSpecs,
      `${m.quantity} ${m.unit || 'Nos'}`,
      m.vendorName || m.vendor || project.vendor || 'Manav Metal',
      m.description,
      m.orderedBy || project.orderedBy || currentUser.name || 'Amit',
    ]);

    exportToPdfReport(
      `RSB Equipment Material Requirement Specification: ${project.name}`,
      headers,
      rows,
      `Project_${project.name}_10Col_Spec`
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
              <div className="flex items-center gap-1.5 flex-wrap">
                {uniqueMachineTypes.map((mch) => (
                  <span
                    key={mch}
                    className="px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold font-mono"
                  >
                    {mch}
                  </span>
                ))}
              </div>
              <StatusBadge status={project.status} size="sm" />
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Client: <strong className="text-slate-800">{project.customer}</strong> • RSB Standard 10-Column Material Workflow
            </p>
          </div>

          {/* Action Hub */}
          <div className="flex flex-wrap items-center gap-2">
            {onOpenInEntrySheet && !isStoreIncharge && (
              <button
                type="button"
                onClick={() => onOpenInEntrySheet(project.name)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                title="Open in Rapid 4-Step Material Entry Workstation"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Open in Entry Workstation</span>
              </button>
            )}

            {!isStoreIncharge && (
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
                <span>Add Row</span>
              </button>
            )}

            {/* Save / Sync Inward Verification to Database */}
            <button
              type="button"
              onClick={handleSaveInwardToDb}
              disabled={isSavingToDb}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-md shadow-emerald-900/30 flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title="Save & verify all marked inward receipts directly into ERP database"
            >
              {isSavingToDb ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving to DB...</span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Save</span>
                </>
              )}
            </button>

            {lastSavedTime && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 text-[11px] font-mono font-bold animate-fadeIn">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Synced: {lastSavedTime}</span>
              </span>
            )}

            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Export 10-Column Material Table to Excel"
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

            {isSuperAdmin && !isStoreIncharge && (
              <button
                type="button"
                onClick={() => setIsDeleteProjectModalOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                title="Delete Project (Super Admin Access)"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Delete Project</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. PROJECT INFORMATION BANNER (Machine Categories, Client, Dates, Ordered By) */}
      {/* ========================================================================= */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-5 shadow-md">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-200">
              Project Specification & Overview
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            RSB Workflow Record
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 font-mono text-xs">
          {/* 1. Machine Categories */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 font-sans flex items-center gap-1">
              <Cpu className="w-3 h-3 text-purple-400" />
              Machine Categories
            </span>
            <div className="flex items-center gap-1 flex-wrap mt-0.5">
              {uniqueMachineTypes.map((mch) => (
                <span key={mch} className="text-xs font-bold text-purple-300 bg-purple-950/70 border border-purple-800 px-1.5 py-0.5 rounded">
                  {mch}
                </span>
              ))}
            </div>
          </div>

          {/* 2. Client */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 font-sans flex items-center gap-1">
              <Building2 className="w-3 h-3 text-blue-400" />
              Client
            </span>
            <p className="text-sm font-black text-white truncate font-sans" title={project.customer || project.clientName || 'Cadila Healthcare Ltd'}>
              {project.customer || project.clientName || 'Cadila Healthcare Ltd'}
            </p>
          </div>

          {/* 3. Start Date */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1 font-sans flex items-center gap-1">
              <Calendar className="w-3 h-3 text-emerald-400" />
              Start Date
            </span>
            <p className="text-base font-black text-emerald-300 truncate">
              {project.startDate || project.date || '01-09-2026'}
            </p>
          </div>

          {/* 4. Delivery Date */}
          <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-800/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1 font-sans flex items-center gap-1">
              <Calendar className="w-3 h-3 text-amber-400" />
              Delivery Date
            </span>
            <p className="text-base font-black text-amber-300 truncate">
              {project.targetCompletionDate || project.targetDate || '30-10-2026'}
            </p>
          </div>

          {/* 5. Ordered By */}
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1 font-sans flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-400" />
              Ordered By (Locked)
            </span>
            <p className="text-base font-black text-emerald-300 truncate">
              {project.orderedBy || currentUser?.name || 'Amit'}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. CLIENT FRIENDLY FEATURE: "PROJECT SUMMARY" CARD WITH MATERIAL ARRIVAL PROGRESS */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-blue-50 via-indigo-50/50 to-slate-50 border border-blue-200/80 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-blue-100">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Project Summary & Material Inward Progression
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              Live factory tracking: Material specifications, arrival checkoffs, and vendor allocations
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
              receivingProgressPct === 100
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : receivingProgressPct > 0
                ? 'bg-blue-100 text-blue-800 border-blue-300'
                : 'bg-amber-100 text-amber-800 border-amber-300'
            }`}>
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{receivingProgressPct}% Materials Received</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* 1. Material Inward Progress Bar Card */}
          <div className="bg-white rounded-xl p-4 border border-blue-100/80 shadow-2xs col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">Inward Progress</span>
              <Truck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900 font-mono">{receivedMaterialsCount}/{displayMaterials.length}</span>
              <span className="text-xs font-bold text-emerald-600">({receivingProgressPct}%)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mt-2">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  receivingProgressPct === 100 ? 'bg-emerald-500' : receivingProgressPct > 0 ? 'bg-blue-600' : 'bg-slate-300'
                }`}
                style={{ width: `${receivingProgressPct}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-500 font-medium mt-1">
              <strong className="text-emerald-700">{receivedMaterialsCount} Arrived</strong> • <strong className="text-amber-700">{pendingMaterialsCount} Pending</strong>
            </p>
          </div>

          {/* 2. Total Material Entries */}
          <div className="bg-white rounded-xl p-4 border border-blue-100/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Items</span>
              <Boxes className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900 font-mono">{projectSummary.totalEntries}</span>
              <span className="text-xs font-semibold text-slate-500">Specs</span>
            </div>
            <p className="text-[10px] text-blue-600 font-medium mt-1">Directly Linked</p>
          </div>

          {/* 3. Total Quantity */}
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

          {/* 4. Machine Type */}
          <div className="bg-white rounded-xl p-4 border border-blue-100/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Machine Categories</span>
              <Cpu className="w-4 h-4 text-purple-600" />
            </div>
            <div className="flex items-center gap-1 flex-wrap mt-1">
              {uniqueMachineTypes.map((mch) => (
                <span key={mch} className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200 text-[10px] font-bold">
                  {mch}
                </span>
              ))}
            </div>
          </div>

          {/* 5. Start & Delivery Dates */}
          <div className="bg-white rounded-xl p-4 border border-blue-100/80 shadow-2xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Target Delivery</span>
              <Calendar className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-sm font-black text-amber-900 font-mono mt-1">
              {project.targetCompletionDate || project.targetDate || '30-10-2026'}
            </p>
            <p className="text-[10px] text-slate-500 font-medium mt-1">
              Started: {project.startDate || project.date || '01-09-2026'}
            </p>
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
            placeholder="Search material type, size specs, description, vendor, verified initials in this project..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-blue-500 focus:bg-white"
          />
        </div>

        {/* Quick Filter Inward Status */}
        <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setFilterReceived('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filterReceived === 'ALL'
                ? 'bg-white text-slate-900 shadow-2xs font-black'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            All ({displayMaterials.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterReceived('RECEIVED')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              filterReceived === 'RECEIVED'
                ? 'bg-emerald-600 text-white shadow-2xs font-black'
                : 'text-emerald-700 hover:text-emerald-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Arrived ({receivedMaterialsCount})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterReceived('PENDING')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              filterReceived === 'PENDING'
                ? 'bg-amber-500 text-white shadow-2xs font-black'
                : 'text-amber-700 hover:text-amber-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending ({pendingMaterialsCount})</span>
          </button>
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
      {/* 5. COMPLETE MATERIAL LIST TABLE WITH VERIFIED ARRIVAL CHECKOFF */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Boxes className="w-4 h-4 text-blue-600" />
              Project Material Specification List ({filteredMaterials.length} Items)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tick to confirm material arrival from vendor • Logged with inspector initial & locked timestamp
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-xs font-mono font-bold text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
              Total Qty: <span className="text-emerald-600 font-black">{filteredMaterials.reduce((acc, m) => acc + Number(m.quantity || 0), 0)} Units</span>
            </div>
            <div className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
              Inward: <span className="font-black">{receivedMaterialsCount}/{displayMaterials.length}</span>
            </div>
          </div>
        </div>

        {filteredMaterials.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Boxes className="w-12 h-12 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">No material records found for this project filter</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Try adjusting your search criteria or filters, or add new component requirements using the "Add Row" button.
            </p>
            <button
              onClick={() => setIsAddMaterialModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Material Row
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="p-3 min-w-[150px] whitespace-nowrap bg-emerald-50/70 border-r border-emerald-200 text-emerald-900 text-center">
                    Material Arrived (आवक)
                  </th>
                  <th className="p-3 whitespace-nowrap">Machine Name</th>
                  <th className="p-3 whitespace-nowrap">Date</th>
                  <th className="p-3 whitespace-nowrap">PO No</th>
                  <th className="p-3 w-12 text-center whitespace-nowrap">Sr No</th>
                  <th className="p-3 min-w-[130px] whitespace-nowrap">Material Type</th>
                  <th className="p-3 min-w-[160px] whitespace-nowrap">Size Specification</th>
                  <th className="p-3 min-w-[90px] text-center whitespace-nowrap">Qty</th>
                  <th className="p-3 min-w-[140px] whitespace-nowrap">Vendor Name</th>
                  <th className="p-3 min-w-[180px] whitespace-nowrap">Description</th>
                  <th className="p-3 min-w-[120px] whitespace-nowrap">Ordered By</th>
                  <th className="p-3 w-28 text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {filteredMaterials.map((m, idx) => (
                  <tr key={m.id || idx} className={`transition-colors ${m.isReceived ? 'bg-emerald-50/30 hover:bg-emerald-50/60' : 'hover:bg-blue-50/40'}`}>
                    {/* Material Arrived / Inward Verification Cell */}
                    <td className="p-3 text-center whitespace-nowrap border-r border-emerald-100 bg-emerald-50/20">
                      {m.isReceived ? (
                        <button
                          type="button"
                          onClick={() => toggleMaterialReceived(m.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs font-bold text-xs transition-all active:scale-95 cursor-pointer"
                          title={`✅ Verified Arrival by ${m.receivedBy || 'Admin'} (${m.receivedByRole || 'Verifier'}) on ${m.receivedAt || 'Recent'}. Click to toggle.`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                          <span>Arrived</span>
                          <span className="font-mono text-[10px] font-black bg-emerald-800/80 text-emerald-100 px-1.5 py-0.5 rounded border border-emerald-500/40 flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5 text-emerald-300" />
                            {m.receivedByInitials || (m.receivedBy ? m.receivedBy.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : 'AM')}
                          </span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => toggleMaterialReceived(m.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-emerald-50 border border-slate-300 hover:border-emerald-400 text-slate-700 hover:text-emerald-800 transition-all cursor-pointer active:scale-95 text-xs font-bold shadow-2xs"
                          title="Click when material is physically received at factory / stores"
                        >
                          <span className="w-3.5 h-3.5 rounded border border-slate-400 flex items-center justify-center bg-white" />
                          <span>Mark Arrived</span>
                        </button>
                      )}
                    </td>

                    {/* 1. Machine Name */}
                    <td className="p-3 font-bold text-purple-900 whitespace-nowrap">
                      {m.machineName || m.machineType || project.machineName || project.machineType || '16 HD'}
                    </td>

                    {/* 2. Date */}
                    <td className="p-3 font-mono text-slate-700 whitespace-nowrap">
                      {m.date || project.date || project.startDate || '01-09-2026'}
                    </td>

                    {/* 3. PO No */}
                    <td className="p-3 font-mono font-bold text-indigo-700 whitespace-nowrap">
                      {m.poNo || m.poNumber || project.poNo || project.poNumber || '36'}
                    </td>

                    {/* 4. Sr No */}
                    <td className="p-3 text-center font-mono font-bold text-slate-400 whitespace-nowrap">
                      {idx + 1}
                    </td>

                    {/* 5. Material Type */}
                    <td className="p-3 whitespace-nowrap">
                      <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 border border-slate-200 font-bold text-[11px]">
                        {m.materialType}
                      </span>
                    </td>

                    {/* 6. Size Specification */}
                    <td className="p-3 font-mono font-bold text-blue-700 whitespace-nowrap">
                      {m.sizeSpecs}
                    </td>

                    {/* 7. Quantity */}
                    <td className="p-3 text-center whitespace-nowrap">
                      <span className="inline-flex items-center justify-center min-w-[80px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 font-mono font-black text-xs rounded-lg shadow-2xs">
                        {m.quantity}&nbsp;<span className="text-slate-600 font-bold text-[10px]">{m.unit || 'Nos'}</span>
                      </span>
                    </td>

                    {/* 8. Vendor Name */}
                    <td className="p-3 font-semibold text-amber-800 whitespace-nowrap">
                      {m.vendorName || m.vendor || project.vendorName || project.vendor || 'Manav Metal'}
                    </td>

                    {/* 9. Description */}
                    <td className="p-3 font-semibold text-slate-900 min-w-[180px]">
                      {m.description}
                    </td>

                    {/* 10. Ordered By */}
                    <td className="p-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-black">
                        <Lock className="w-3 h-3 text-emerald-600" />
                        {m.orderedBy || project.orderedBy || currentUser?.name || 'Amit'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-center whitespace-nowrap">
                      {isStoreIncharge ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-500 font-mono text-[10px] font-bold">
                          <Lock className="w-3 h-3 text-slate-400" />
                          View Only
                        </span>
                      ) : (
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
                      )}
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

      {/* Delete Project Confirmation Modal (Super Admin) */}
      <Modal
        isOpen={isDeleteProjectModalOpen}
        onClose={() => setIsDeleteProjectModalOpen(false)}
        title="⚠️ Confirm Permanent Project Deletion"
        maxWidth="md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
              <Trash2 className="w-5 h-5 text-rose-600" />
              <span>Delete "{project.name}"?</span>
            </div>
            <p className="text-xs text-rose-700 leading-relaxed">
              You are about to permanently delete this project from the live RSB ERP system and Supabase cloud. This action cannot be undone.
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Project ID:</span>
              <span className="font-bold text-slate-800">{project.projectNumber || project.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Machine Type:</span>
              <span className="font-bold text-slate-800">{project.machineName || project.machineType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-sans">Total Materials:</span>
              <span className="font-bold text-blue-600">{displayMaterials.length} items</span>
            </div>
          </div>

          <label className="flex items-center gap-2 p-2.5 bg-slate-100 rounded-xl text-xs text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={cascadeDeleteReqs}
              onChange={(e) => setCascadeDeleteReqs(e.target.checked)}
              className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
            />
            <span className="font-medium">Also delete all linked material requirement rows ({displayMaterials.length} items)</span>
          </label>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsDeleteProjectModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                deleteProject(project.id, cascadeDeleteReqs);
                setIsDeleteProjectModalOpen(false);
                onBack();
              }}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md cursor-pointer transition active:scale-95 flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Permanently Delete Project</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
