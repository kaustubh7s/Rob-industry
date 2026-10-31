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
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  FileText,
  Boxes,
  FolderTree,
  Folder,
  FolderOpen,
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
  Square,
  Minus,
  CheckSquare,
  LayoutGrid,
  Table as TableIcon,
  Maximize2,
  Minimize2,
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
  } = useERP();

  // ---------------------------------------------------------------------------
  // NAVIGATION & VIEW STATE
  // ---------------------------------------------------------------------------
  // 'dates' = Date-wise Detail Folders with Projection Bar (Default view requested by shopfloor)
  // 'detail' = Focused single date view
  const [activeView, setActiveView] = useState<'dates' | 'detail'>('dates');
  const [displayMode, setDisplayMode] = useState<'table' | 'cards'>('table');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [expandedDateFolders, setExpandedDateFolders] = useState<Record<string, boolean>>({});

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('ALL');
  const [quickStatusFilter, setQuickStatusFilter] = useState<'ALL' | 'ARRIVED' | 'PENDING'>('ALL');
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

      // Quick Arrival / Pending Filter
      const isCompleted = item.status === 'Completed' || item.arrangedQuantity >= item.requiredQuantity;
      if (quickStatusFilter === 'ARRIVED' && !isCompleted) return false;
      if (quickStatusFilter === 'PENDING' && isCompleted) return false;

      // Priority filter
      if (selectedPriorityFilter !== 'ALL') {
        if (item.priority !== selectedPriorityFilter) return false;
      }

      return true;
    });
  }, [dailyRequirements, searchTerm, selectedProjectFilter, quickStatusFilter, selectedPriorityFilter]);

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
  // 1-CLICK ACTIONS: MARK ARRIVED & INLINE ADJUSTMENTS
  // ---------------------------------------------------------------------------
  const handleToggleArrived = (item: DailyRequirementItem) => {
    const isCompleted = item.status === 'Completed' || item.arrangedQuantity >= item.requiredQuantity;
    if (isCompleted) {
      // Toggle back to Pending
      updateDailyRequirement(item.id, {
        arrangedQuantity: 0,
        status: 'Pending',
      });
    } else {
      // 1-Click: Mark completely arrived!
      updateDailyRequirementProgress(
        item.id,
        Math.max(0, item.requiredQuantity - item.arrangedQuantity),
        'Confirmed material arrival on shop floor',
        item.vendorName
      );
      confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
    }
  };

  const handleQuickAdjustArrived = (item: DailyRequirementItem, delta: number) => {
    const newQty = Math.max(0, (Number(item.arrangedQuantity) || 0) + delta);
    const newStatus: DailyRequirementStatus =
      newQty >= item.requiredQuantity
        ? 'Completed'
        : newQty > 0
        ? 'Partially Arranged'
        : 'Pending';

    updateDailyRequirement(item.id, {
      arrangedQuantity: newQty,
      status: newStatus,
    });
  };

  const handleSetExactArrived = (item: DailyRequirementItem, exactVal: number) => {
    const validQty = Math.max(0, Number(exactVal) || 0);
    const newStatus: DailyRequirementStatus =
      validQty >= item.requiredQuantity
        ? 'Completed'
        : validQty > 0
        ? 'Partially Arranged'
        : 'Pending';

    updateDailyRequirement(item.id, {
      arrangedQuantity: validQty,
      status: newStatus,
    });
  };

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
    const completedItems = dailyRequirements.filter(
      (r) => r.status === 'Completed' || r.arrangedQuantity >= r.requiredQuantity
    );
    const pendingItems = dailyRequirements.filter(
      (r) => r.status !== 'Completed' && r.arrangedQuantity < r.requiredQuantity
    );

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

  // Counts for All / Arrived / Pending quick tabs
  const activeList = activeView === 'detail' ? detailRequirements : filteredRequirements;
  const arrivedCount = activeList.filter(
    (i) => i.status === 'Completed' || i.arrangedQuantity >= i.requiredQuantity
  ).length;
  const pendingCount = activeList.filter(
    (i) => i.status !== 'Completed' && i.arrangedQuantity < i.requiredQuantity
  ).length;

  // ---------------------------------------------------------------------------
  // FOLDER EXPANSION & DATE WORKFLOW ACTIONS
  // ---------------------------------------------------------------------------
  const isDateExpanded = (dateStr: string) => {
    return expandedDateFolders[dateStr] !== false; // defaults to true so all days are shown immediately!
  };

  const toggleDateFolder = (dateStr: string) => {
    setExpandedDateFolders((prev) => ({
      ...prev,
      [dateStr]: prev[dateStr] === false ? true : false,
    }));
  };

  const areAllExpanded = useMemo(() => {
    if (groupedByDate.length === 0) return true;
    return groupedByDate.every(([d]) => expandedDateFolders[d] !== false);
  }, [groupedByDate, expandedDateFolders]);

  const handleToggleAllFolders = () => {
    const nextVal = !areAllExpanded;
    const nextMap: Record<string, boolean> = {};
    groupedByDate.forEach(([d]) => {
      nextMap[d] = nextVal;
    });
    setExpandedDateFolders(nextMap);
  };

  const handleOpenBOMImportModalForDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    setBomImportTargetDate(dateStr);
    handleOpenBOMImportModal();
  };

  const handleExportExcelForDate = (dateStr: string, itemsToExport: DailyRequirementItem[]) => {
    if (itemsToExport.length === 0) {
      alert(`No materials to export for ${dateStr}.`);
      return;
    }

    const rows = itemsToExport.map((it, idx) => ({
      'Sr No': idx + 1,
      'Requirement Date': it.requirementDate,
      'Item Description': it.description,
      'Material Type': it.materialType,
      'Size Specification': it.sizeSpecification,
      'Required Qty': it.requiredQuantity,
      'Arrived Qty': it.arrangedQuantity,
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
    XLSX.utils.book_append_sheet(wb, ws, `Req_${dateStr}`);
    const filename = `RSB_Daily_Requirements_${dateStr}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  // ---------------------------------------------------------------------------
  // FULL 11-COLUMN WORKSTATION TABLE (EXACT DETAIL VIEW FOR EACH DAY)
  // ---------------------------------------------------------------------------
  const renderRequirementsTable = (items: DailyRequirementItem[], emptyMessage: string) => (
    <div className="bg-white border-t border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
              <th className="p-3 w-44 min-w-[150px] text-center bg-emerald-50/70 border-r border-emerald-200 text-emerald-900 whitespace-nowrap">
                Material Arrived (आवक)
              </th>
              <th className="p-3 min-w-[200px]">Description & Item Name</th>
              <th className="p-3 min-w-[110px]">Type</th>
              <th className="p-3 min-w-[140px]">Size Specification</th>
              <th className="p-3 min-w-[100px] text-center bg-slate-100">Total Qty</th>
              <th className="p-3 min-w-[160px] text-center bg-emerald-50/60 text-emerald-900 border-x border-emerald-200/70">
                Arrived Qty (आवक)
              </th>
              <th className="p-3 min-w-[120px] text-center bg-amber-50/60 text-amber-900 border-r border-amber-200/70">
                Pending Qty (बाकी)
              </th>
              <th className="p-3 min-w-[100px]">Project</th>
              <th className="p-3 min-w-[90px]">Machine</th>
              <th className="p-3 min-w-[130px]">Vendor</th>
              <th className="p-3 w-24 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 font-medium">
            {items.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-8 text-center text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const isArrived = item.status === 'Completed' || item.arrangedQuantity >= item.requiredQuantity;
                const pending = Math.max(0, item.requiredQuantity - item.arrangedQuantity);

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      isArrived ? 'bg-emerald-50/30 hover:bg-emerald-50/60' : 'hover:bg-blue-50/40'
                    }`}
                  >
                    {/* 1. Quick 1-Click Toggle: Mark Arrived / Arrived (आवक) */}
                    <td className="p-3 text-center whitespace-nowrap border-r border-emerald-100 bg-emerald-50/20">
                      {isArrived ? (
                        <button
                          type="button"
                          onClick={() => handleToggleArrived(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs font-bold text-xs transition-all active:scale-95 cursor-pointer"
                          title="Click to toggle back to pending"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
                          <span>Arrived (आवक)</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleArrived(item)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border-2 border-dashed border-emerald-400 hover:border-emerald-600 font-bold text-xs transition-all active:scale-95 cursor-pointer shadow-2xs"
                          title="Click to mark 100% arrived"
                        >
                          <Square className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Mark Arrived</span>
                        </button>
                      )}
                    </td>

                    {/* 2. Description & Item Name */}
                    <td className="p-3 font-bold text-slate-900">
                      <div>{item.description}</div>
                      {item.notes && <div className="text-[10px] text-slate-500 font-normal italic">{item.notes}</div>}
                    </td>

                    {/* 3. Type */}
                    <td className="p-3">
                      <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                        {item.materialType}
                      </span>
                    </td>

                    {/* 4. Size Specification */}
                    <td className="p-3 font-mono text-slate-700 font-bold">
                      {item.sizeSpecification}
                    </td>

                    {/* 5. Total Required Qty */}
                    <td className="p-3 text-center font-mono font-bold text-slate-900 bg-slate-50/50">
                      {item.requiredQuantity} {item.unit}
                    </td>

                    {/* 6. Arrived Qty (आवक) (Inline Stepper & Input) */}
                    <td className="p-2.5 text-center bg-emerald-50/30 border-x border-emerald-100">
                      <div className="inline-flex items-center gap-1 bg-white border border-emerald-300 rounded-xl p-0.5 shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleQuickAdjustArrived(item, -1)}
                          className="w-6 h-6 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 cursor-pointer active:scale-90 transition-all font-bold"
                          title="Decrease 1"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.arrangedQuantity}
                          onChange={(e) => handleSetExactArrived(item, Number(e.target.value))}
                          className="w-14 text-center font-mono font-black text-xs text-emerald-800 bg-transparent outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleQuickAdjustArrived(item, 1)}
                          className="w-6 h-6 rounded-lg bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center text-emerald-800 cursor-pointer active:scale-90 transition-all font-bold"
                          title="Increase 1"
                        >
                          +
                        </button>
                        <span className="text-[10px] font-bold text-slate-500 pr-1">{item.unit}</span>
                      </div>
                    </td>

                    {/* 7. Pending Qty (बाकी) */}
                    <td className="p-3 text-center border-r border-amber-100 bg-amber-50/20 font-mono">
                      {pending === 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-0.5 rounded-full border border-emerald-300">
                          <Check className="w-3 h-3" />
                          <span>0 {item.unit} (Done)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
                          <span>{pending} {item.unit}</span>
                        </span>
                      )}
                    </td>

                    {/* 8. Project */}
                    <td className="p-3 text-slate-700 font-semibold">
                      {item.projectName || '-'}
                    </td>

                    {/* 9. Machine */}
                    <td className="p-3 text-slate-500 font-medium">
                      {item.machineName || '-'}
                    </td>

                    {/* 10. Vendor */}
                    <td className="p-3 text-blue-700 font-medium">
                      {item.vendorName || '-'}
                    </td>

                    {/* 11. Actions */}
                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => setHistoryModalItem(item)}
                          className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
                          title="View History"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditModalItem(item)}
                          className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteModalItem(item)}
                          className="p-1 rounded-lg hover:bg-rose-50 text-rose-600 cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

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
  // UPDATE PROGRESS MODAL
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
      'Arrived Qty': it.arrangedQuantity,
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
      ['Sr', 'Date', 'Description', 'Type', 'Size Specification', 'Req', 'Arrived', 'Pending', 'Unit', 'Project', 'Status']
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

  return (
    <div className="space-y-6 pb-20 select-text">
      {/* ===================================================================== */}
      {/* 1. TOP HEADER BANNER                                                  */}
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
              <span className="text-xs text-slate-500 font-medium">Daily Material Inward (आवक) & Staging</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span>Daily Material Requirement</span>
            </h1>
            <p className="text-xs text-slate-500 max-w-3xl">
              Tick to confirm material arrival (आवक) from vendor, track pending shortages, and adjust received quantities inline.
            </p>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleOpenAddModal()}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Requirement</span>
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
      {/* 2. SIMPLE SUMMARY METRICS STRIP                                       */}
      {/* ===================================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Metric 1: Today */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Today's Schedule</span>
          <div className="text-xl font-black text-slate-900 mt-1">
            {globalMetrics.todayCount} <span className="text-xs font-semibold text-slate-400">Items</span>
          </div>
        </div>

        {/* Metric 2: Total Required */}
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Total Required</span>
          <div className="text-xl font-black text-slate-900 font-mono mt-1 truncate">
            {globalMetrics.requiredSummary}
          </div>
        </div>

        {/* Metric 3: Arrived */}
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">Arrived (आवक)</span>
          <div className="text-xl font-black text-emerald-700 font-mono mt-1 truncate">
            {globalMetrics.arrangedSummary}
          </div>
        </div>

        {/* Metric 4: Pending */}
        <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">Pending (बाकी)</span>
          <div className="text-xl font-black text-amber-700 font-mono mt-1 truncate">
            {globalMetrics.pendingSummary}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 3. SIMPLIFIED TOOLBAR & WORKSTATION TABS                              */}
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

          {/* Quick Date Selector & View Navigation */}
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

            {/* View Mode Tabs */}
            <div className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs">
              <button
                type="button"
                onClick={() => setActiveView('dates')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'dates' ? 'bg-white text-blue-700 shadow-2xs' : 'hover:text-slate-900 text-slate-500'
                }`}
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Date Folders ({groupedByDate.length} Days)</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveView('detail')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeView === 'detail' ? 'bg-white text-blue-700 shadow-2xs' : 'hover:text-slate-900 text-slate-500'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Single Date Focus ({detailRequirements.length})</span>
              </button>
            </div>

            {/* Table / Cards toggle for active view */}
            {activeView === 'detail' && (
              <div className="flex items-center p-0.5 rounded-xl bg-slate-100 border border-slate-200 text-slate-600">
                <button
                  type="button"
                  onClick={() => setDisplayMode('table')}
                  title="Table View (Workstation)"
                  className={`p-1.5 rounded-lg cursor-pointer ${displayMode === 'table' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500'}`}
                >
                  <TableIcon className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode('cards')}
                  title="Card View"
                  className={`p-1.5 rounded-lg cursor-pointer ${displayMode === 'cards' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-500'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Quick Filter Tabs: All, Arrived, Pending */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setQuickStatusFilter('ALL')}
              className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer ${
                quickStatusFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              All ({activeList.length})
            </button>
            <button
              type="button"
              onClick={() => setQuickStatusFilter('ARRIVED')}
              className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                quickStatusFilter === 'ARRIVED'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Arrived ({arrivedCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setQuickStatusFilter('PENDING')}
              className={`px-3 py-1 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1 ${
                quickStatusFilter === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Pending ({pendingCount})</span>
            </button>
          </div>

          {/* Project Dropdown */}
          <div className="flex items-center gap-1.5">
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
        </div>
      </div>

      {/* ===================================================================== */}
      {/* 4. DETAIL WORKSTATION VIEW (PRIMARY & INTUITIVE)                       */}
      {/* ===================================================================== */}
      {activeView === 'detail' && (
        <div className="space-y-4">
          {/* Header Banner for Date */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                <CalendarDays className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-black text-slate-900">
                  {formatDateFriendly(selectedDate)}
                </h2>
                <p className="text-[11px] text-slate-500">
                  Tick to confirm arrival (आवक) • Adjust arrived qty inline • Pending auto-calculates
                </p>
              </div>
            </div>

            {/* Strict Unit Balances for this date */}
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {Object.keys(detailMetrics.requiredMap).map((unit) => {
                const req = detailMetrics.requiredMap[unit] || 0;
                const arr = detailMetrics.arrangedMap[unit] || 0;
                const pen = Math.max(0, req - arr);
                return (
                  <div
                    key={unit}
                    className="px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs flex items-center gap-2 font-mono"
                  >
                    <span className="font-bold text-slate-900">{unit}:</span>
                    <span className="font-bold text-emerald-700">{arr} Arrived</span>
                    <span className="text-slate-400">/</span>
                    <span className="text-slate-600">{req} Req</span>
                    {pen > 0 && (
                      <span className="font-bold text-amber-700 bg-amber-100/60 px-1.5 py-0.2 rounded">
                        {pen} Pending
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* TABLE DISPLAY MODE (FAST, EXCEL-LIKE WORKSTATION) */}
          {displayMode === 'table' ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
              {renderRequirementsTable(
                detailRequirements,
                `No materials found for ${selectedDate}. Click "+ New Requirement" to get started.`
              )}
            </div>
          ) : (
            /* CARDS DISPLAY MODE (CLEAN & HORIZONTAL) */
            <div className="space-y-3">
              {detailRequirements.map((item) => {
                const isArrived = item.status === 'Completed' || item.arrangedQuantity >= item.requiredQuantity;
                const pending = Math.max(0, item.requiredQuantity - item.arrangedQuantity);

                return (
                  <div
                    key={item.id}
                    className={`bg-white border rounded-2xl p-4 shadow-xs transition-all space-y-3 ${
                      isArrived ? 'border-emerald-200 bg-emerald-50/15' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Button + Description */}
                      <div className="flex items-start gap-3">
                        {isArrived ? (
                          <button
                            type="button"
                            onClick={() => handleToggleArrived(item)}
                            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                            <span>Arrived (आवक)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleArrived(item)}
                            className="px-3 py-2 rounded-xl bg-white hover:bg-emerald-50 text-slate-800 hover:text-emerald-800 border-2 border-dashed border-emerald-400 font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer shrink-0"
                          >
                            <Square className="w-4 h-4 text-emerald-600" />
                            <span>Mark Arrived</span>
                          </button>
                        )}

                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                              {item.materialType}
                            </span>
                            {item.projectName && (
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">
                                {item.projectName}
                              </span>
                            )}
                            {item.machineName && (
                              <span className="text-[10px] text-slate-500 font-medium">
                                Machine: {item.machineName}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-black text-slate-900">{item.description}</h4>
                          <p className="text-xs text-slate-600 font-mono">Size: {item.sizeSpecification}</p>
                        </div>
                      </div>

                      {/* Right: Quantity Blocks */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Required */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-center min-w-[80px]">
                          <span className="block text-[9px] font-bold text-slate-400 uppercase">Required</span>
                          <span className="font-mono font-black text-slate-900 text-xs">
                            {item.requiredQuantity} {item.unit}
                          </span>
                        </div>

                        {/* Arrived with Stepper */}
                        <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl px-2 py-1 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleQuickAdjustArrived(item, -1)}
                            className="w-5 h-5 rounded bg-white hover:bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs cursor-pointer"
                          >
                            -
                          </button>
                          <div className="text-center px-1">
                            <span className="block text-[9px] font-bold text-emerald-700 uppercase">Arrived</span>
                            <span className="font-mono font-black text-emerald-900 text-xs">
                              {item.arrangedQuantity} {item.unit}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleQuickAdjustArrived(item, 1)}
                            className="w-5 h-5 rounded bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center font-bold text-xs cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {/* Pending */}
                        <div className={`rounded-xl px-3 py-1.5 text-center min-w-[80px] border ${
                          pending === 0
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}>
                          <span className="block text-[9px] font-bold uppercase">Pending</span>
                          <span className="font-mono font-black text-xs">
                            {pending} {item.unit}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            type="button"
                            onClick={() => setEditModalItem(item)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteModalItem(item)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-600"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW: DATE-WISE DETAIL TABLE FOLDERS (SHOW OF EACH DAY) */}
      {activeView === 'dates' && (
        <div className="space-y-5">
          {/* Section Toolbar: Total Days & Expand/Collapse All */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
            <div className="flex items-center gap-2.5">
              <span className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                <FolderOpen className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <span>Date-wise Daily Material Schedule Folders</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Showing {groupedByDate.length} {groupedByDate.length === 1 ? 'day folder' : 'day folders'} with live inward projection bars & 11-column checklist tables for each day
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleAllFolders}
                className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                {areAllExpanded ? (
                  <>
                    <Minimize2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Collapse All Days</span>
                  </>
                ) : (
                  <>
                    <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>Expand All Days</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Date Folder Cards List */}
          <div className="space-y-4">
            {groupedByDate.map(([dateStr, items]) => {
              const todayStr = new Date().toISOString().split('T')[0];
              const isToday = dateStr === todayStr;
              const breakdown = computeUnitBreakdown(items);

              let totalReqSum = 0;
              let totalArrSum = 0;
              items.forEach((it) => {
                totalReqSum += Number(it.requiredQuantity) || 0;
                totalArrSum += Number(it.arrangedQuantity) || 0;
              });
              const progressPct = totalReqSum > 0 ? Math.min(100, Math.round((totalArrSum / totalReqSum) * 100)) : 0;
              const isAllCompleted = items.length > 0 && items.every((i) => i.status === 'Completed' || i.arrangedQuantity >= i.requiredQuantity);
              const isExpanded = isDateExpanded(dateStr);

              return (
                <div
                  key={dateStr}
                  className="bg-white border-2 border-slate-200 hover:border-slate-300 rounded-2xl shadow-xs overflow-hidden transition-all"
                >
                  {/* FOLDER ACCORDION HEADER (CLEAN & SIMPLE) */}
                  <div
                    onClick={() => toggleDateFolder(dateStr)}
                    className="p-3.5 sm:p-4 bg-slate-50/90 hover:bg-slate-100/90 cursor-pointer border-b border-slate-200 transition-colors"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6">
                      {/* Left: Chevron + Date + Today Badge + Item Count */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleDateFolder(dateStr);
                          }}
                          className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-blue-600 shadow-2xs shrink-0 cursor-pointer"
                          title={isExpanded ? 'Collapse Folder' : 'Expand Folder'}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-blue-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                          )}
                        </button>

                        <div className="flex items-center gap-2 flex-wrap min-w-0">
                          <h3 className="font-black text-slate-900 text-sm sm:text-base tracking-tight">
                            {formatDateFriendly(dateStr)}
                          </h3>
                          {isToday && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-600 text-white uppercase tracking-wider shrink-0">
                              TODAY
                            </span>
                          )}
                          <span className="text-[11px] font-bold text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-md shrink-0">
                            {items.length} {items.length === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                      </div>

                      {/* Right: Clean Progress Bar & Pending Summary */}
                      <div className="flex items-center gap-3 sm:gap-4 shrink-0 justify-between sm:justify-end">
                        <div className="w-48 sm:w-64 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className={`font-black ${isAllCompleted ? 'text-emerald-700' : 'text-blue-700'}`}>
                              {isAllCompleted ? '✓ 100% Arrived' : `${progressPct}% Arrived`}
                            </span>
                            <span className="text-[11px] font-bold text-amber-800">
                              {isAllCompleted ? (
                                <span className="text-emerald-700 font-bold">All Done</span>
                              ) : (
                                `Pending: ${breakdown.pendingSummary}`
                              )}
                            </span>
                          </div>
                          {/* Sleek single progress bar */}
                          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                isAllCompleted
                                  ? 'bg-emerald-500'
                                  : progressPct >= 50
                                  ? 'bg-blue-600'
                                  : progressPct > 0
                                  ? 'bg-amber-500'
                                  : 'bg-slate-300'
                              }`}
                              style={{ width: `${progressPct}%` }}
                            />
                          </div>
                        </div>

                        {/* Export Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportExcelForDate(dateStr, items);
                          }}
                          className="p-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs cursor-pointer shrink-0"
                          title="Export this date to Excel"
                        >
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* FOLDER BODY: FULL 11-COLUMN WORKSTATION TABLE */}
                  {isExpanded && renderRequirementsTable(items, `No materials scheduled for ${dateStr}.`)}
                </div>
              );
            })}

            {groupedByDate.length === 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
                <Boxes className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                <h3 className="text-base font-bold text-slate-700">No scheduled requirements found</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Try clearing your search filters or click "+ New Requirement" to schedule materials.
                </p>
              </div>
            )}
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
      {/* MODAL 3: INWARD HISTORY AUDIT                                         */}
      {/* ===================================================================== */}
      {historyModalItem && (
        <Modal
          isOpen={!!historyModalItem}
          onClose={() => setHistoryModalItem(null)}
          title="📜 Material Inward Audit Trail"
          subtitle={`Chronological record of arrival checkoffs for: ${historyModalItem.description}`}
          maxWidth="lg"
          theme="light"
        >
          <div className="space-y-4 text-xs text-slate-800">
            {dailyRequirementHistory.filter((h) => h.requirementId === historyModalItem.id).length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No arrival history logged for this item yet. Click "Mark Arrived" to log an arrival.
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
      {/* MODAL 4: EDIT MATERIAL                                                */}
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
      {/* MODAL 5: DELETE CONFIRMATION                                          */}
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
