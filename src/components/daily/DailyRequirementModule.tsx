import React, { useState, useMemo } from 'react';
import {
  CalendarDays,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Boxes,
  FolderTree,
  Folder,
  Layers,
  Edit2,
  Trash2,
  History,
  Check,
  X,
  Sparkles,
  Zap,
  TrendingUp,
  Tag,
  Building2,
  User,
  MoreVertical,
  CheckSquare,
  Square,
  ArrowUpDown,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import confetti from 'canvas-confetti';
import { useERP } from '../../context/ERPContext';
import {
  DailyRequirementItem,
  DailyRequirementPriority,
  DailyRequirementStatus,
  MasterBOM,
} from '../../types/erp';
import { Modal } from '../common/Modal';
import { MATERIAL_TYPES } from '../../data/materialTypes';

export const DailyRequirementModule: React.FC = () => {
  const {
    dailyRequirements,
    dailyRequirementHistory,
    addDailyRequirement,
    addDailyRequirementsBatch,
    updateDailyRequirement,
    deleteDailyRequirement,
    updateDailyRequirementProgress,
    projects,
    masterMachines,
    masterBOMs,
    vendors,
  } = useERP();

  // ---------------------------------------------------------------------------
  // NAVIGATION & VIEW STATE
  // ---------------------------------------------------------------------------
  // 'dates' = Date-wise Grouped View
  // 'detail' = Focused view for a selected date
  // 'table' = All materials flat table view
  const [activeView, setActiveView] = useState<'dates' | 'detail' | 'table'>('dates');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'ALL' | DailyRequirementStatus>('ALL');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<'ALL' | DailyRequirementPriority>('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBOMImportModalOpen, setIsBOMImportModalOpen] = useState(false);
  const [progressModalItem, setProgressModalItem] = useState<DailyRequirementItem | null>(null);
  const [additionalQtyInput, setAdditionalQtyInput] = useState<number>(0);
  const [progressRemarksInput, setProgressRemarksInput] = useState<string>('');
  const [progressVendorInput, setProgressVendorInput] = useState<string>('');

  const [editModalItem, setEditModalItem] = useState<DailyRequirementItem | null>(null);
  const [deleteModalItem, setDeleteModalItem] = useState<DailyRequirementItem | null>(null);
  const [historyModalItem, setHistoryModalItem] = useState<DailyRequirementItem | null>(null);

  // Form State for Manual Entry
  const [manualForm, setManualForm] = useState({
    requirementDate: selectedDate,
    description: '',
    materialType: 'Hardware',
    sizeSpecification: '',
    requiredQuantity: 10,
    unit: 'Nos',
    projectName: '',
    projectId: '',
    machineName: '',
    priority: 'Normal' as DailyRequirementPriority,
    vendorName: '',
    notes: '',
  });

  // BOM Import Multi-Step State
  const [bomImportMachineId, setBomImportMachineId] = useState<string>('');
  const [bomImportMachineType, setBomImportMachineType] = useState<string>('');
  const [bomImportSelectedBOMId, setBomImportSelectedBOMId] = useState<string>('');
  const [bomImportSelectedItems, setBomImportSelectedItems] = useState<Record<string, { selected: boolean; qty: number }>>({});
  const [bomImportTargetDate, setBomImportTargetDate] = useState<string>(selectedDate);
  const [bomImportTargetProject, setBomImportTargetProject] = useState<string>('');

  // ---------------------------------------------------------------------------
  // FILTERED RECORDS COMPUTATION
  // ---------------------------------------------------------------------------
  const filteredRequirements = useMemo(() => {
    return dailyRequirements.filter((item) => {
      // Search filter
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matches =
          item.description.toLowerCase().includes(query) ||
          item.sizeSpecification.toLowerCase().includes(query) ||
          item.materialType.toLowerCase().includes(query) ||
          (item.projectName && item.projectName.toLowerCase().includes(query)) ||
          (item.machineName && item.machineName.toLowerCase().includes(query)) ||
          (item.vendorName && item.vendorName.toLowerCase().includes(query));
        if (!matches) return false;
      }

      // Project filter
      if (selectedProjectFilter !== 'ALL') {
        if (item.projectName !== selectedProjectFilter && item.projectId !== selectedProjectFilter) {
          return false;
        }
      }

      // Status filter
      if (selectedStatusFilter !== 'ALL') {
        if (item.status !== selectedStatusFilter) return false;
      }

      // Priority filter
      if (selectedPriorityFilter !== 'ALL') {
        if (item.priority !== selectedPriorityFilter) return false;
      }

      return true;
    });
  }, [dailyRequirements, searchTerm, selectedProjectFilter, selectedStatusFilter, selectedPriorityFilter]);

  // Requirements for active selected date (in detail view)
  const detailRequirements = useMemo(() => {
    return filteredRequirements.filter((r) => r.requirementDate === selectedDate);
  }, [filteredRequirements, selectedDate]);

  // Grouped by date (sorted descending)
  const groupedByDate = useMemo(() => {
    const map: Record<string, DailyRequirementItem[]> = {};
    filteredRequirements.forEach((req) => {
      if (!map[req.requirementDate]) {
        map[req.requirementDate] = [];
      }
      map[req.requirementDate].push(req);
    });

    return Object.entries(map).sort(([dateA], [dateB]) => dateB.localeCompare(dateA));
  }, [filteredRequirements]);

  // ---------------------------------------------------------------------------
  // STRICT UNIT-WISE SUMMARIES (NEVER MIX INCOMPATIBLE UNITS)
  // ---------------------------------------------------------------------------
  const computeUnitBreakdown = (items: DailyRequirementItem[]) => {
    const requiredMap: Record<string, number> = {};
    const arrangedMap: Record<string, number> = {};
    const pendingMap: Record<string, number> = {};

    items.forEach((it) => {
      const u = it.unit || 'Nos';
      const req = Number(it.requiredQuantity) || 0;
      const arr = Number(it.arrangedQuantity) || 0;
      const pen = Math.max(0, req - arr);

      requiredMap[u] = (requiredMap[u] || 0) + req;
      arrangedMap[u] = (arrangedMap[u] || 0) + arr;
      pendingMap[u] = (pendingMap[u] || 0) + pen;
    });

    const formatMap = (map: Record<string, number>) => {
      const parts = Object.entries(map).map(([unit, val]) => `${val} ${unit}`);
      return parts.length > 0 ? parts.join(' · ') : '0 Nos';
    };

    return {
      requiredMap,
      arrangedMap,
      pendingMap,
      requiredSummary: formatMap(requiredMap),
      arrangedSummary: formatMap(arrangedMap),
      pendingSummary: formatMap(pendingMap),
    };
  };

  // Top Global Metrics
  const globalMetrics = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayItems = dailyRequirements.filter((r) => r.requirementDate === todayStr);

    const totalCount = dailyRequirements.length;
    const completedItems = dailyRequirements.filter((r) => r.status === 'Completed');
    const pendingItems = dailyRequirements.filter((r) => r.status !== 'Completed');

    const totalUnits = computeUnitBreakdown(dailyRequirements);
    const arrangedUnits = computeUnitBreakdown(dailyRequirements);
    const pendingUnits = computeUnitBreakdown(pendingItems);

    return {
      todayCount: todayItems.length,
      totalCount,
      completedCount: completedItems.length,
      pendingCount: pendingItems.length,
      requiredSummary: totalUnits.requiredSummary,
      arrangedSummary: arrangedUnits.arrangedSummary,
      pendingSummary: pendingUnits.pendingSummary,
    };
  }, [dailyRequirements]);

  // Date Detail Metrics
  const detailMetrics = useMemo(() => {
    return computeUnitBreakdown(detailRequirements);
  }, [detailRequirements]);

  // ---------------------------------------------------------------------------
  // HANDLERS
  // ---------------------------------------------------------------------------
  const handleOpenDetailView = (dateStr: string) => {
    setSelectedDate(dateStr);
    setActiveView('detail');
  };

  const handleOpenAddModal = (presetDate?: string) => {
    setManualForm({
      requirementDate: presetDate || selectedDate,
      description: '',
      materialType: 'Hardware',
      sizeSpecification: '',
      requiredQuantity: 10,
      unit: 'Nos',
      projectName: projects[0]?.name || 'General / Stock',
      projectId: projects[0]?.id || '',
      machineName: '24 HD',
      priority: 'Normal',
      vendorName: '',
      notes: '',
    });
    setIsAddModalOpen(true);
  };

  const handleSaveManualRequirement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.description.trim()) return;

    addDailyRequirement({
      requirementDate: manualForm.requirementDate,
      description: manualForm.description.trim(),
      materialType: manualForm.materialType,
      sizeSpecification: manualForm.sizeSpecification.trim() || 'Standard Specs',
      requiredQuantity: Number(manualForm.requiredQuantity) || 1,
      arrangedQuantity: 0,
      unit: manualForm.unit,
      projectName: manualForm.projectName || 'General',
      projectId: manualForm.projectId,
      machineName: manualForm.machineName,
      priority: manualForm.priority,
      status: 'Pending',
      vendorName: manualForm.vendorName.trim() || undefined,
      notes: manualForm.notes.trim() || undefined,
    });

    setIsAddModalOpen(false);
    confetti({ particleCount: 30, spread: 60 });
  };

  // ---------------------------------------------------------------------------
  // BOM IMPORT WORKFLOW
  // ---------------------------------------------------------------------------
  const handleOpenBOMImportModal = () => {
    const firstMachine = masterMachines[0];
    const firstType = firstMachine?.types?.[0] || '';
    setBomImportMachineId(firstMachine?.id || '');
    setBomImportMachineType(firstType);

    const firstMatchingBOM = masterBOMs.find(
      (b) => b.machineName === firstMachine?.name && b.machineType === firstType
    );
    setBomImportSelectedBOMId(firstMatchingBOM?.id || '');

    const initialItemMap: Record<string, { selected: boolean; qty: number }> = {};
    if (firstMatchingBOM && firstMatchingBOM.items) {
      firstMatchingBOM.items.forEach((item) => {
        initialItemMap[item.id] = { selected: true, qty: Number(item.quantity) || 1 };
      });
    }
    setBomImportSelectedItems(initialItemMap);
    setBomImportTargetDate(selectedDate);
    setBomImportTargetProject(projects[0]?.name || 'General / Stock');
    setIsBOMImportModalOpen(true);
  };

  const currentBOMImportMachine = masterMachines.find((m) => m.id === bomImportMachineId);
  const bomImportAvailableBOMs = masterBOMs.filter(
    (b) =>
      (!currentBOMImportMachine || b.machineName === currentBOMImportMachine.name) &&
      (!bomImportMachineType || b.machineType === bomImportMachineType)
  );
  const currentBOMImportBOM = masterBOMs.find((b) => b.id === bomImportSelectedBOMId);

  const handleBOMSelectionChange = (bomId: string) => {
    setBomImportSelectedBOMId(bomId);
    const targetBOM = masterBOMs.find((b) => b.id === bomId);
    const initialItemMap: Record<string, { selected: boolean; qty: number }> = {};
    if (targetBOM && targetBOM.items) {
      targetBOM.items.forEach((item) => {
        initialItemMap[item.id] = { selected: true, qty: Number(item.quantity) || 1 };
      });
    }
    setBomImportSelectedItems(initialItemMap);
  };

  const handleExecuteBOMImport = () => {
    if (!currentBOMImportBOM || !currentBOMImportBOM.items) return;

    const itemsToImport = currentBOMImportBOM.items.filter(
      (it) => bomImportSelectedItems[it.id]?.selected
    );

    if (itemsToImport.length === 0) {
      alert('Please select at least one material to import.');
      return;
    }

    const payload = itemsToImport.map((it) => {
      const customQty = bomImportSelectedItems[it.id]?.qty ?? it.quantity;
      return {
        requirementDate: bomImportTargetDate,
        description: it.description,
        materialType: it.materialType || 'Component',
        sizeSpecification: it.sizeSpecs || 'Standard',
        requiredQuantity: Number(customQty) || 1,
        arrangedQuantity: 0,
        unit: it.unit || 'Nos',
        projectName: bomImportTargetProject,
        machineName: currentBOMImportBOM.machineName,
        machineType: currentBOMImportBOM.machineType,
        bomId: currentBOMImportBOM.id,
        bomNumber: currentBOMImportBOM.bomNumber,
        priority: 'Normal' as DailyRequirementPriority,
        status: 'Pending' as DailyRequirementStatus,
        notes: `Imported from BOM ${currentBOMImportBOM.bomNumber} (${currentBOMImportBOM.name})`,
      };
    });

    addDailyRequirementsBatch(payload);
    setIsBOMImportModalOpen(false);
    confetti({ particleCount: 45, spread: 70 });
  };

  // ---------------------------------------------------------------------------
  // UPDATE PROGRESS
  // ---------------------------------------------------------------------------
  const handleOpenProgressModal = (item: DailyRequirementItem) => {
    setProgressModalItem(item);
    const remaining = Math.max(0, item.requiredQuantity - item.arrangedQuantity);
    setAdditionalQtyInput(remaining > 0 ? remaining : 1);
    setProgressRemarksInput('');
    setProgressVendorInput(item.vendorName || '');
  };

  const handleSaveProgress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!progressModalItem || additionalQtyInput <= 0) return;

    updateDailyRequirementProgress(
      progressModalItem.id,
      Number(additionalQtyInput),
      progressRemarksInput.trim() || undefined,
      progressVendorInput.trim() || undefined
    );

    setProgressModalItem(null);
    confetti({ particleCount: 25, spread: 45 });
  };

  // ---------------------------------------------------------------------------
  // EXPORT EXCEL & PDF
  // ---------------------------------------------------------------------------
  const handleExportExcel = () => {
    const itemsToExport = activeView === 'detail' ? detailRequirements : filteredRequirements;
    if (itemsToExport.length === 0) {
      alert('No daily requirements to export.');
      return;
    }

    const rows = itemsToExport.map((it, idx) => ({
      'Sr No': idx + 1,
      'Requirement Date': it.requirementDate,
      'Item Description': it.description,
      'Material Type': it.materialType,
      'Size Specification': it.sizeSpecification,
      'Required Qty': it.requiredQuantity,
      'Arranged Qty': it.arrangedQuantity,
      'Pending Qty': Math.max(0, it.requiredQuantity - it.arrangedQuantity),
      'Unit': it.unit,
      'Project': it.projectName || '-',
      'Machine': it.machineName || '-',
      'Status': it.status,
      'Priority': it.priority,
      'Vendor Name': it.vendorName || '-',
      'Notes': it.notes || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Daily Requirements');
    const filename = `RSB_Daily_Requirements_${activeView === 'detail' ? selectedDate : 'All'}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const handleExportPDF = () => {
    const itemsToExport = activeView === 'detail' ? detailRequirements : filteredRequirements;
    if (itemsToExport.length === 0) {
      alert('No daily requirements to export.');
      return;
    }

    const doc = new jsPDF('landscape');
    doc.setFontSize(16);
    doc.text('RSB INDUSTRY — DAILY MATERIAL REQUIREMENT REPORT', 14, 15);
    doc.setFontSize(10);
    doc.text(`Scope: ${activeView === 'detail' ? `Date: ${selectedDate}` : 'All Scheduled Dates'} | Generated: ${new Date().toLocaleString()}`, 14, 22);

    const headers = [
      ['Sr', 'Date', 'Description', 'Type', 'Size Specification', 'Req', 'Arr', 'Pending', 'Unit', 'Project', 'Status']
    ];

    const body = itemsToExport.map((it, idx) => [
      idx + 1,
      it.requirementDate,
      it.description,
      it.materialType,
      it.sizeSpecification,
      it.requiredQuantity,
      it.arrangedQuantity,
      Math.max(0, it.requiredQuantity - it.arrangedQuantity),
      it.unit,
      it.projectName || '-',
      it.status,
    ]);

    autoTable(doc, {
      head: headers,
      body: body,
      startY: 28,
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
    });

    doc.save(`RSB_Daily_Requirements_${activeView === 'detail' ? selectedDate : 'All'}.pdf`);
  };

  // Helper date formatter
  const formatDateFriendly = (dStr: string) => {
    try {
      const d = new Date(dStr);
      return d.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dStr;
    }
  };

  const getStatusBadge = (status: DailyRequirementStatus) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Completed</span>
          </span>
        );
      case 'Partially Arranged':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-600" />
            <span>Partially Arranged</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            <span>Pending</span>
          </span>
        );
    }
  };

  const getPriorityBadge = (p: DailyRequirementPriority) => {
    switch (p) {
      case 'Urgent':
        return <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-800 uppercase tracking-wider">Urgent</span>;
      case 'High':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wider">High</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">Normal</span>;
    }
  };

  return (
    <div className="space-y-6 pb-16 select-text">
      {/* ===================================================================== */}
      {/* 1. TOP HEADER & WORKFLOW BANNER */}
      {/* ===================================================================== */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-emerald-600" />
                <span>Shopfloor Tracking Active</span>
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-medium">Daily Material Inward & Staging</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Daily Material Requirement</span>
            </h1>
            <p className="text-xs text-slate-500 max-w-3xl">
              Live factory tracking: Schedule daily material demands, import directly from Master BOMs, track vendor dispatches, and check off inward quantities unit-by-unit.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => handleOpenAddModal()}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Daily Requirement</span>
            </button>
            <button
              type="button"
              onClick={handleOpenBOMImportModal}
              className="px-3.5 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <FolderTree className="w-4 h-4 text-indigo-600" />
              <span>+ Add from BOM</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="px-3.5 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4 text-rose-600" />
              <span>PDF Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 2. FOUR SUMMARY METRICS CARDS */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Requirements */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Today's Requirements</p>
            <h3 className="text-2xl font-black text-slate-900 mt-1">
              {globalMetrics.todayCount} <span className="text-xs font-semibold text-slate-500">Materials</span>
            </h3>
            <p className="text-[11px] text-blue-600 mt-1 font-medium flex items-center gap-1">
              <CalendarDays className="w-3 h-3" />
              <span>Scheduled for {formatDateFriendly(new Date().toISOString().split('T')[0])}</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
        </div>

        {/* Card 2: Total Required (Strict Unit-Wise) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Required</p>
            <h3 className="text-lg font-black text-slate-900 mt-1 line-clamp-1">
              {globalMetrics.requiredSummary}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Across all {globalMetrics.totalCount} active items</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        {/* Card 3: Completed / Arranged */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Completed / Arranged</p>
            <h3 className="text-lg font-black text-emerald-700 mt-1 line-clamp-1">
              {globalMetrics.arrangedSummary}
            </h3>
            <p className="text-[11px] text-emerald-600 mt-1 font-medium">
              {globalMetrics.completedCount} items fully satisfied
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Card 4: Pending Requirements */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-start justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Shortages</p>
            <h3 className="text-lg font-black text-amber-700 mt-1 line-clamp-1">
              {globalMetrics.pendingSummary}
            </h3>
            <p className="text-[11px] text-amber-600 mt-1 font-medium">
              {globalMetrics.pendingCount} items awaiting fulfillment
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. TOOLBAR & FILTER CONTROLS */}
      {/* ===================================================================== */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by description, size spec, project, vendor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Date Picker & View Mode */}
          <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
              <CalendarDays className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setActiveView('detail');
                }}
                className="bg-transparent text-slate-800 font-bold outline-none cursor-pointer"
              />
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600">
              <button
                type="button"
                onClick={() => setActiveView('dates')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeView === 'dates' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900 text-slate-500'
                }`}
              >
                Date-wise List
              </button>
              <button
                type="button"
                onClick={() => setActiveView('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeView === 'table' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900 text-slate-500'
                }`}
              >
                All Materials
              </button>
            </div>
          </div>
        </div>

        {/* Secondary Filter Chips */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap text-xs">
          {/* Project Filter */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-medium">Project:</span>
            <select
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 font-semibold outline-none cursor-pointer"
            >
              <option value="ALL">All Projects ({projects.length})</option>
              {projects.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name} {p.projectNumber ? `(${p.projectNumber})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-medium">Status:</span>
            {(['ALL', 'Pending', 'Partially Arranged', 'Completed'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setSelectedStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  selectedStatusFilter === st
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {st === 'ALL' ? 'All' : st}
              </button>
            ))}
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-slate-400 font-medium">Priority:</span>
            {(['ALL', 'Urgent', 'High', 'Normal'] as const).map((pr) => (
              <button
                key={pr}
                type="button"
                onClick={() => setSelectedPriorityFilter(pr)}
                className={`px-2 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  selectedPriorityFilter === pr
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {pr}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. MAIN CONTENT DISPLAY (3 MODES)                                     */}
      {/* ===================================================================== */}

      {/* VIEW 1: DATE-WISE GROUPED LIST */}
      {activeView === 'dates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-blue-600" />
              <span>Date-wise Daily Material Schedule</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Showing {groupedByDate.length} {groupedByDate.length === 1 ? 'date' : 'dates'} scheduled
            </span>
          </div>

          {groupedByDate.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <CalendarDays className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-black text-slate-900">No Daily Requirements Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                There are no scheduled daily material requirements matching your filters. Click below to add a new requirement or import from BOM.
              </p>
              <div className="flex justify-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => handleOpenAddModal()}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
                >
                  + Add Requirement
                </button>
                <button
                  type="button"
                  onClick={handleOpenBOMImportModal}
                  className="px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs cursor-pointer"
                >
                  + Add from BOM
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {groupedByDate.map(([dateStr, items]) => {
                const todayStr = new Date().toISOString().split('T')[0];
                const isToday = dateStr === todayStr;
                const isPast = dateStr < todayStr;

                const breakdown = computeUnitBreakdown(items);
                const projectsInvolved = Array.from(new Set(items.map((i) => i.projectName).filter(Boolean)));

                // Calculate progress %
                let totalReqSum = 0;
                let totalArrSum = 0;
                items.forEach((it) => {
                  totalReqSum += Number(it.requiredQuantity) || 0;
                  totalArrSum += Number(it.arrangedQuantity) || 0;
                });
                const progressPct = totalReqSum > 0 ? Math.min(100, Math.round((totalArrSum / totalReqSum) * 100)) : 0;
                const isAllCompleted = items.every((i) => i.status === 'Completed');

                return (
                  <div
                    key={dateStr}
                    onClick={() => handleOpenDetailView(dateStr)}
                    className="group bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Date Header & Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg">
                            {formatDateFriendly(dateStr)}
                          </span>
                          {isToday && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white uppercase tracking-wider">
                              TODAY
                            </span>
                          )}
                          {isPast && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-700">
                              PAST
                            </span>
                          )}
                        </div>
                        {isAllCompleted ? (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            100% Arranged
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full">
                            {progressPct}% Progress
                          </span>
                        )}
                      </div>

                      {/* Summary Information */}
                      <div className="space-y-1">
                        <h3 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                          {items.length} {items.length === 1 ? 'Material' : 'Materials'} Scheduled
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">
                          {projectsInvolved.length > 0 ? projectsInvolved.join(', ') : 'General Shopfloor'}
                        </p>
                      </div>

                      {/* Progress Bar */}
                      <div className="space-y-1">
                        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isAllCompleted ? 'bg-emerald-500' : progressPct > 50 ? 'bg-blue-600' : 'bg-amber-500'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>

                      {/* Strict Unit Summaries */}
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] space-y-1">
                        <div className="flex items-center justify-between text-slate-600 font-medium">
                          <span>Required:</span>
                          <span className="font-bold text-slate-900">{breakdown.requiredSummary}</span>
                        </div>
                        <div className="flex items-center justify-between text-emerald-700 font-medium">
                          <span>Arranged:</span>
                          <span className="font-bold text-emerald-800">{breakdown.arrangedSummary}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-blue-600 group-hover:underline flex items-center gap-1">
                        <span>View Details</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenAddModal(dateStr);
                        }}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800"
                        title="Add Material to this Date"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: DATE-WISE DETAIL VIEW */}
      {activeView === 'detail' && (
        <div className="space-y-5">
          {/* Top Return Banner */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setActiveView('dates')}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                title="Back to All Dates"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-slate-900">
                    {formatDateFriendly(selectedDate)}
                  </h2>
                  <span className="font-mono text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-bold">
                    {selectedDate}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed inspection & arrangement list for this factory day ({detailRequirements.length} items)
                </p>
              </div>
            </div>

            {/* Actions for this specific date */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenAddModal(selectedDate)}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Material</span>
              </button>
              <button
                type="button"
                onClick={handleOpenBOMImportModal}
                className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <FolderTree className="w-3.5 h-3.5 text-indigo-600" />
                <span>+ Add from BOM</span>
              </button>
              <button
                type="button"
                onClick={handleExportExcel}
                className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Export</span>
              </button>
            </div>
          </div>

          {/* Unit-Wise Summary Badges for this Date (Never mixing units) */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Unit Balances:</span>
            {Object.keys(detailMetrics.requiredMap).map((unit) => {
              const req = detailMetrics.requiredMap[unit] || 0;
              const arr = detailMetrics.arrangedMap[unit] || 0;
              const pen = Math.max(0, req - arr);
              return (
                <div
                  key={unit}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs flex items-center gap-2"
                >
                  <span className="font-bold text-slate-900">{unit}:</span>
                  <span className="font-bold text-emerald-700">{arr} Arranged</span>
                  <span className="text-slate-400">/</span>
                  <span className="text-slate-600">{req} Required</span>
                  {pen > 0 && (
                    <span className="font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                      {pen} Pending
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Material Cards List for this Date */}
          {detailRequirements.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center space-y-3">
              <p className="text-xs text-slate-500">No materials scheduled for {selectedDate}.</p>
              <button
                type="button"
                onClick={() => handleOpenAddModal(selectedDate)}
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs"
              >
                + Add Material for {selectedDate}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {detailRequirements.map((item) => {
                const pending = Math.max(0, item.requiredQuantity - item.arrangedQuantity);
                const progressPct =
                  item.requiredQuantity > 0
                    ? Math.min(100, Math.round((item.arrangedQuantity / item.requiredQuantity) * 100))
                    : 0;

                return (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-5 shadow-xs transition-all space-y-4"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      {/* Left: Material Info */}
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-[10px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                            {item.materialType}
                          </span>
                          {getPriorityBadge(item.priority)}
                          {getStatusBadge(item.status)}
                          {item.projectName && (
                            <span className="text-[11px] font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-500" />
                              <span>{item.projectName}</span>
                            </span>
                          )}
                          {item.machineName && (
                            <span className="text-[11px] text-slate-500 font-medium">
                              Machine: {item.machineName}
                            </span>
                          )}
                        </div>

                        <h4 className="text-base font-black text-slate-900 tracking-tight">
                          {item.description}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap">
                          <span>
                            Size: <strong className="font-mono text-slate-900">{item.sizeSpecification}</strong>
                          </span>
                          {item.vendorName && (
                            <span>
                              Vendor: <strong className="text-blue-700">{item.vendorName}</strong>
                            </span>
                          )}
                          {item.bomNumber && (
                            <span className="text-slate-400">
                              (Linked to BOM: {item.bomNumber})
                            </span>
                          )}
                        </div>
                        {item.notes && (
                          <p className="text-xs text-slate-500 italic">
                            Note: {item.notes}
                          </p>
                        )}
                      </div>

                      {/* Right: Quantities & Update Action */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
                        {/* Quantity Stats Box */}
                        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs">
                          <div>
                            <span className="block text-[10px] text-slate-400 font-bold uppercase">Required</span>
                            <span className="text-sm font-black text-slate-900 font-mono">
                              {item.requiredQuantity} {item.unit}
                            </span>
                          </div>
                          <div className="w-[1px] h-6 bg-slate-200" />
                          <div>
                            <span className="block text-[10px] text-emerald-600 font-bold uppercase">Arranged</span>
                            <span className="text-sm font-black text-emerald-700 font-mono">
                              {item.arrangedQuantity} {item.unit}
                            </span>
                          </div>
                          <div className="w-[1px] h-6 bg-slate-200" />
                          <div>
                            <span className="block text-[10px] text-amber-600 font-bold uppercase">Pending</span>
                            <span className="text-sm font-black text-amber-700 font-mono">
                              {pending} {item.unit}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenProgressModal(item)}
                            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                            <span>Update Progress</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setHistoryModalItem(item)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs cursor-pointer"
                            title="View Inward History"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditModalItem(item)}
                            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs cursor-pointer"
                            title="Edit Item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteModalItem(item)}
                            className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs cursor-pointer"
                            title="Delete Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar & History Indicator */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                        <span>Arrangement Progress: {progressPct}%</span>
                        <span>{item.arrangedQuantity} of {item.requiredQuantity} {item.unit} received</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            item.status === 'Completed'
                              ? 'bg-emerald-500'
                              : progressPct > 50
                              ? 'bg-blue-600'
                              : 'bg-amber-500'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 3: ALL MATERIALS FLAT TABLE VIEW */}
      {activeView === 'table' && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900">
              All Scheduled Materials ({filteredRequirements.length})
            </h3>
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              <Download className="w-3 h-3 text-slate-500" />
              <span>Export CSV/Excel</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Description</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Size Specification</th>
                  <th className="py-3 px-4 text-center">Req Qty</th>
                  <th className="py-3 px-4 text-center">Arr Qty</th>
                  <th className="py-3 px-4 text-center">Pending</th>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequirements.map((it) => {
                  const pending = Math.max(0, it.requiredQuantity - it.arrangedQuantity);
                  return (
                    <tr key={it.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">{it.requirementDate}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{it.description}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
                          {it.materialType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">{it.sizeSpecification}</td>
                      <td className="py-3 px-4 text-center font-bold font-mono">{it.requiredQuantity} {it.unit}</td>
                      <td className="py-3 px-4 text-center font-bold font-mono text-emerald-700">{it.arrangedQuantity} {it.unit}</td>
                      <td className="py-3 px-4 text-center font-bold font-mono text-amber-700">{pending} {it.unit}</td>
                      <td className="py-3 px-4 text-slate-600 font-medium">{it.projectName || '-'}</td>
                      <td className="py-3 px-4">{getStatusBadge(it.status)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenProgressModal(it)}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer"
                          >
                            Progress
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditModalItem(it)}
                            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteModalItem(it)}
                            className="p-1 rounded-lg hover:bg-rose-50 text-rose-600"
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
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: ADD MATERIAL (MANUAL ENTRY)                                  */}
      {/* ===================================================================== */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="➕ Add Daily Material Requirement"
          subtitle="Record single or custom material required on shopfloor"
          maxWidth="lg"
          theme="light"
        >
          <form onSubmit={handleSaveManualRequirement} className="space-y-4 text-xs text-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Target Requirement Date *</label>
                <input
                  type="date"
                  required
                  value={manualForm.requirementDate}
                  onChange={(e) => setManualForm({ ...manualForm, requirementDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold outline-none focus:border-blue-600 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Allocated Project</label>
                <select
                  value={manualForm.projectName}
                  onChange={(e) => {
                    const found = projects.find((p) => p.name === e.target.value);
                    setManualForm({
                      ...manualForm,
                      projectName: e.target.value,
                      projectId: found?.id || '',
                      machineName: found?.machineType || '24 HD',
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-semibold outline-none focus:border-blue-600 shadow-2xs"
                >
                  <option value="General / Stock">General / Stock</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} {p.projectNumber ? `(${p.projectNumber})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Item Description / Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. SS 304 Hex Bolt, Neoprene O-Ring, Brass Bushing..."
                value={manualForm.description}
                onChange={(e) => setManualForm({ ...manualForm, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold outline-none focus:border-blue-600 shadow-2xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Material Classification *</label>
                <select
                  value={manualForm.materialType}
                  onChange={(e) => setManualForm({ ...manualForm, materialType: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-semibold outline-none focus:border-blue-600 shadow-2xs"
                >
                  {MATERIAL_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Size Specification *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. M8 X 25 MM, OD 40 X 650 MM..."
                  value={manualForm.sizeSpecification}
                  onChange={(e) => setManualForm({ ...manualForm, sizeSpecification: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-mono outline-none focus:border-blue-600 shadow-2xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Required Quantity *</label>
                <input
                  type="number"
                  min="0.1"
                  step="any"
                  required
                  value={manualForm.requiredQuantity}
                  onChange={(e) => setManualForm({ ...manualForm, requiredQuantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold font-mono outline-none focus:border-blue-600 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Unit *</label>
                <select
                  value={manualForm.unit}
                  onChange={(e) => setManualForm({ ...manualForm, unit: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold outline-none focus:border-blue-600 shadow-2xs"
                >
                  <option value="Nos">Nos</option>
                  <option value="Kg">Kg</option>
                  <option value="Meter">Meter</option>
                  <option value="Pcs">Pcs</option>
                  <option value="Set">Set</option>
                  <option value="Liter">Liter</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Priority</label>
                <select
                  value={manualForm.priority}
                  onChange={(e) => setManualForm({ ...manualForm, priority: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-semibold outline-none focus:border-blue-600 shadow-2xs"
                >
                  <option value="Normal">Normal</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Vendor / Source Supplier</label>
                <input
                  type="text"
                  placeholder="e.g. Apex Fasteners, Shah Metal Syndicate..."
                  value={manualForm.vendorName}
                  onChange={(e) => setManualForm({ ...manualForm, vendorName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-medium outline-none focus:border-blue-600 shadow-2xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Notes / Instructions</label>
                <input
                  type="text"
                  placeholder="Optional assembly location or remarks..."
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-medium outline-none focus:border-blue-600 shadow-2xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
              >
                Save Requirement
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: ADD FROM MASTER BOM (GUIDED IMPORT)                          */}
      {/* ===================================================================== */}
      {isBOMImportModalOpen && (
        <Modal
          isOpen={isBOMImportModalOpen}
          onClose={() => setIsBOMImportModalOpen(false)}
          title="⚡ Import Materials from Master BOM"
          subtitle="Select standard machine assembly specifications and import as daily requirements"
          maxWidth="2xl"
          theme="light"
        >
          <div className="space-y-4 text-xs text-slate-800">
            {/* Step 1 & 2: Machine & Assembly selection */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">1. Machine Folder</label>
                <select
                  value={bomImportMachineId}
                  onChange={(e) => {
                    setBomImportMachineId(e.target.value);
                    const mach = masterMachines.find((m) => m.id === e.target.value);
                    const firstT = mach?.types?.[0] || '';
                    setBomImportMachineType(firstT);
                    const matchingBOM = masterBOMs.find(
                      (b) => b.machineName === mach?.name && b.machineType === firstT
                    );
                    if (matchingBOM) handleBOMSelectionChange(matchingBOM.id);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 font-semibold outline-none cursor-pointer"
                >
                  {masterMachines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">2. Assembly Type</label>
                <select
                  value={bomImportMachineType}
                  onChange={(e) => {
                    setBomImportMachineType(e.target.value);
                    const matchingBOM = masterBOMs.find(
                      (b) => b.machineName === currentBOMImportMachine?.name && b.machineType === e.target.value
                    );
                    if (matchingBOM) handleBOMSelectionChange(matchingBOM.id);
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 font-semibold outline-none cursor-pointer"
                >
                  {(currentBOMImportMachine?.types || []).map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">3. Master BOM Spec</label>
                <select
                  value={bomImportSelectedBOMId}
                  onChange={(e) => handleBOMSelectionChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 font-semibold outline-none cursor-pointer"
                >
                  {bomImportAvailableBOMs.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.bomNumber})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Target Date & Project */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Scheduled Date for Daily Requirement *</label>
                <input
                  type="date"
                  required
                  value={bomImportTargetDate}
                  onChange={(e) => setBomImportTargetDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Target Project *</label>
                <select
                  value={bomImportTargetProject}
                  onChange={(e) => setBomImportTargetProject(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-semibold outline-none"
                >
                  <option value="General / Stock">General / Stock</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.name}>
                      {p.name} {p.projectNumber ? `(${p.projectNumber})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Items Checklist Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-700">
                  Select materials to import ({currentBOMImportBOM?.items?.length || 0} items in BOM):
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (!currentBOMImportBOM?.items) return;
                    const allSelected = currentBOMImportBOM.items.every(
                      (it) => bomImportSelectedItems[it.id]?.selected
                    );
                    const next: Record<string, { selected: boolean; qty: number }> = {};
                    currentBOMImportBOM.items.forEach((it) => {
                      next[it.id] = {
                        selected: !allSelected,
                        qty: bomImportSelectedItems[it.id]?.qty ?? it.quantity,
                      };
                    });
                    setBomImportSelectedItems(next);
                  }}
                  className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Toggle Select All
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 sticky top-0 font-bold z-10">
                    <tr>
                      <th className="py-2 px-3 w-8"></th>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3">Classification</th>
                      <th className="py-2 px-3">Size Specification</th>
                      <th className="py-2 px-3 text-right">Daily Qty</th>
                      <th className="py-2 px-3">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(currentBOMImportBOM?.items || []).map((it) => {
                      const entry = bomImportSelectedItems[it.id] || { selected: false, qty: it.quantity };
                      return (
                        <tr
                          key={it.id}
                          className={`hover:bg-slate-50 transition-colors ${entry.selected ? 'bg-blue-50/30' : ''}`}
                        >
                          <td className="py-2 px-3 text-center">
                            <input
                              type="checkbox"
                              checked={entry.selected}
                              onChange={(e) => {
                                setBomImportSelectedItems({
                                  ...bomImportSelectedItems,
                                  [it.id]: { ...entry, selected: e.target.checked },
                                });
                              }}
                              className="rounded text-blue-600 cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-3 font-bold text-slate-900">{it.description}</td>
                          <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">{it.materialType}</td>
                          <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{it.sizeSpecs}</td>
                          <td className="py-2 px-3 text-right">
                            <input
                              type="number"
                              min="0.1"
                              step="any"
                              value={entry.qty}
                              disabled={!entry.selected}
                              onChange={(e) => {
                                setBomImportSelectedItems({
                                  ...bomImportSelectedItems,
                                  [it.id]: { ...entry, qty: Number(e.target.value) },
                                });
                              }}
                              className="w-16 px-1.5 py-0.5 rounded border border-slate-300 font-bold text-right font-mono text-xs disabled:opacity-40"
                            />
                          </td>
                          <td className="py-2 px-3 font-semibold text-slate-700">{it.unit}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsBOMImportModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteBOMImport}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                <span>Import Selected Materials</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: UPDATE PROGRESS                                              */}
      {/* ===================================================================== */}
      {progressModalItem && (
        <Modal
          isOpen={!!progressModalItem}
          onClose={() => setProgressModalItem(null)}
          title="📈 Update Arranged Material Progress"
          subtitle={`Check off newly received material for: ${progressModalItem.description}`}
          maxWidth="md"
          theme="light"
        >
          <form onSubmit={handleSaveProgress} className="space-y-4 text-xs text-slate-800">
            {/* Current Summary Box */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 grid grid-cols-3 gap-2 text-center">
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Required</span>
                <span className="text-sm font-black text-slate-900 font-mono">
                  {progressModalItem.requiredQuantity} {progressModalItem.unit}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-emerald-600 font-bold uppercase">Current Arranged</span>
                <span className="text-sm font-black text-emerald-700 font-mono">
                  {progressModalItem.arrangedQuantity} {progressModalItem.unit}
                </span>
              </div>
              <div>
                <span className="block text-[10px] text-amber-600 font-bold uppercase">Current Pending</span>
                <span className="text-sm font-black text-amber-700 font-mono">
                  {Math.max(0, progressModalItem.requiredQuantity - progressModalItem.arrangedQuantity)} {progressModalItem.unit}
                </span>
              </div>
            </div>

            {/* Input: Additional Quantity */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Additional Quantity Arranged / Inward Received Today ({progressModalItem.unit}) *
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                required
                value={additionalQtyInput}
                onChange={(e) => setAdditionalQtyInput(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl bg-white border-2 border-blue-500 font-black text-lg text-slate-900 font-mono outline-none shadow-xs"
              />
            </div>

            {/* Live Preview */}
            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-center justify-between">
              <span>New Total Arranged:</span>
              <strong className="text-sm font-mono font-bold">
                {progressModalItem.arrangedQuantity + Number(additionalQtyInput)} / {progressModalItem.requiredQuantity} {progressModalItem.unit}
              </strong>
            </div>

            {/* Input: Vendor */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Vendor / Supplier</label>
              <input
                type="text"
                placeholder="Vendor delivering this lot..."
                value={progressVendorInput}
                onChange={(e) => setProgressVendorInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-medium outline-none"
              />
            </div>

            {/* Input: Remarks */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Inward / Inspection Remarks</label>
              <input
                type="text"
                placeholder="e.g. Received via tempo #MH-12-8877, verified by inspector"
                value={progressRemarksInput}
                onChange={(e) => setProgressRemarksInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 font-medium outline-none"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setProgressModalItem(null)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer"
              >
                Save Progress Update
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* MODAL 4: INWARD HISTORY AUDIT                                         */}
      {/* ===================================================================== */}
      {historyModalItem && (
        <Modal
          isOpen={!!historyModalItem}
          onClose={() => setHistoryModalItem(null)}
          title="📜 Material Inward Audit Trail"
          subtitle={`Chronological record of arranged batches for: ${historyModalItem.description}`}
          maxWidth="lg"
          theme="light"
        >
          <div className="space-y-4 text-xs text-slate-800">
            {dailyRequirementHistory.filter((h) => h.requirementId === historyModalItem.id).length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No progress updates logged for this item yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                {dailyRequirementHistory
                  .filter((h) => h.requirementId === historyModalItem.id)
                  .map((hist) => (
                    <div key={hist.id} className="p-3.5 space-y-1 bg-white hover:bg-slate-50">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-emerald-700 font-mono">
                          +{hist.additionalQty} {hist.unit} (Total: {hist.newArrangedQty} {hist.unit})
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(hist.recordedAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-slate-600">
                        Recorded by: <strong>{hist.recordedBy}</strong>
                        {hist.vendorName && ` • Vendor: ${hist.vendorName}`}
                      </p>
                      {hist.remarks && (
                        <p className="text-slate-500 italic text-[11px]">"{hist.remarks}"</p>
                      )}
                    </div>
                  ))}
              </div>
            )}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setHistoryModalItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* MODAL 5: EDIT MATERIAL                                                */}
      {/* ===================================================================== */}
      {editModalItem && (
        <Modal
          isOpen={!!editModalItem}
          onClose={() => setEditModalItem(null)}
          title="✏️ Edit Daily Requirement"
          subtitle={`Modifying item ${editModalItem.description}`}
          maxWidth="md"
          theme="light"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateDailyRequirement(editModalItem.id, editModalItem);
              setEditModalItem(null);
            }}
            className="space-y-3 text-xs text-slate-800"
          >
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Description</label>
              <input
                type="text"
                required
                value={editModalItem.description}
                onChange={(e) => setEditModalItem({ ...editModalItem, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Size Specification</label>
                <input
                  type="text"
                  value={editModalItem.sizeSpecification}
                  onChange={(e) => setEditModalItem({ ...editModalItem, sizeSpecification: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Required Quantity</label>
                <input
                  type="number"
                  step="any"
                  value={editModalItem.requiredQuantity}
                  onChange={(e) => setEditModalItem({ ...editModalItem, requiredQuantity: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold font-mono"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditModalItem(null)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* MODAL 6: DELETE CONFIRMATION                                          */}
      {/* ===================================================================== */}
      {deleteModalItem && (
        <Modal
          isOpen={!!deleteModalItem}
          onClose={() => setDeleteModalItem(null)}
          title="🗑️ Delete Daily Requirement?"
          subtitle={`Remove ${deleteModalItem.description} (${deleteModalItem.requiredQuantity} ${deleteModalItem.unit}) from daily tracker`}
          maxWidth="sm"
          theme="light"
        >
          <div className="space-y-4 text-xs text-slate-800">
            <p className="text-slate-600">
              Are you sure you want to delete this requirement record? Historical POs and project materials remain untouched.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalItem(null)}
                className="px-4 py-2 rounded-xl bg-white border border-slate-300 font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteDailyRequirement(deleteModalItem.id);
                  setDeleteModalItem(null);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
