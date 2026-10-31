import React, { useState, useMemo } from 'react';
import {
  PackageCheck,
  Search,
  CheckCircle2,
  Clock,
  LogOut,
  Check,
  Database,
  Truck,
  Boxes,
  Lock,
  ArrowLeft,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronLeft,
  Cpu,
  CheckCheck,
  CheckSquare,
  CalendarDays,
  Calendar,
  Minus,
  Plus,
  Sparkles,
  AlertCircle,
  Filter,
  Layers,
  RefreshCw,
  FileSpreadsheet,
  Building2,
  Tag,
  RotateCcw,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { getMaterialsForProject } from '../../utils/projectMaterialsHelper';
import { dbBulkUpsertRequirements, dbUpsertDailyRequirement } from '../../services/supabaseService';
import { DailyRequirementItem, DailyRequirementStatus } from '../../types/erp';
import confetti from 'canvas-confetti';

export const MobileStoreInwardApp: React.FC = () => {
  const {
    currentUser,
    projects,
    projectRequirements,
    setProjectRequirements,
    orders,
    toggleMaterialReceived,
    updateMaterialArrivalQty,
    dailyRequirements,
    updateDailyRequirement,
    updateDailyRequirementProgress,
    logout,
    logAudit,
  } = useERP();

  // =========================================================================
  // MAIN NAVIGATION FOLDER STATE:
  // 'DAILY' = Daily Material Requirement Folder (दैनिक आवश्यकता)
  // 'PROJECTS' = Project-wise Inward Folders (प्रोजेक्ट-वाइज फाइल्स)
  // =========================================================================
  const [activeFolderMode, setActiveFolderMode] = useState<'DAILY' | 'PROJECTS'>('PROJECTS');

  // -------------------------------------------------------------------------
  // DAILY MATERIAL REQUIREMENT STATE
  // -------------------------------------------------------------------------
  const [dailySelectedDate, setDailySelectedDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });
  const [dailySearchTerm, setDailySearchTerm] = useState<string>('');
  const [dailyStatusFilter, setDailyStatusFilter] = useState<'ALL' | 'PENDING' | 'ARRIVED'>('ALL');
  const [isAllDatesView, setIsAllDatesView] = useState<boolean>(false);

  // -------------------------------------------------------------------------
  // PROJECT INWARD STATE (EXISTING 3 STEPS)
  // Step 1: selectedProjectId === null (Pick Project Screen)
  // Step 2: selectedProjectId !== null && viewStep === 'MACHINES' (Pick Machine Screen)
  // Step 3: selectedProjectId !== null && viewStep === 'CHECKLIST' (1-Tap Checklist Screen)
  // -------------------------------------------------------------------------
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedMachineFolder, setSelectedMachineFolder] = useState<string>('ALL');
  const [viewStep, setViewStep] = useState<'MACHINES' | 'CHECKLIST'>('MACHINES');

  // Search & Filter State for Projects
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [materialSearchTerm, setMaterialSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'ARRIVED'>('ALL');
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // SWIPE-UP INWARD QUANTITY MODAL STATE (ASK QUANTITY WHEN CLICKING AN ITEM)
  // -------------------------------------------------------------------------
  const [inwardModalItem, setInwardModalItem] = useState<{
    id: string;
    description: string;
    machineName: string;
    sizeSpecs: string;
    quantity: number;
    unit: string;
    arrivedQty: number;
    vendorName?: string;
    isDaily?: boolean;
  } | null>(null);

  const [enteredArrivedQty, setEnteredArrivedQty] = useState<number>(0);

  // Open Swipe-Up Inward Drawer
  const handleOpenInwardModal = (item: {
    id: string;
    description: string;
    machineName: string;
    sizeSpecs: string;
    quantity: number;
    unit: string;
    arrivedQty: number;
    vendorName?: string;
    isDaily?: boolean;
  }) => {
    setInwardModalItem(item);
    // If 0 arrived, pre-fill with total quantity so 1-tap confirms full arrival
    // If already has arrived quantity, start with that
    setEnteredArrivedQty(item.arrivedQty > 0 ? item.arrivedQty : item.quantity);
  };

  // Confirm and Save Inward Quantity from Swipe-Up Sheet
  const handleConfirmInwardQty = () => {
    if (!inwardModalItem) return;
    const total = inwardModalItem.quantity;
    const arrived = Math.max(0, Number(enteredArrivedQty) || 0);

    if (inwardModalItem.isDaily) {
      const newStatus: DailyRequirementStatus =
        arrived >= total ? 'Completed' : arrived > 0 ? 'Partially Arranged' : 'Pending';
      updateDailyRequirement(inwardModalItem.id, {
        arrangedQuantity: arrived,
        status: newStatus,
      });
    } else {
      updateMaterialArrivalQty(inwardModalItem.id, arrived);
    }

    if (arrived >= total) {
      confetti({ particleCount: 35, spread: 60, origin: { y: 0.7 } });
    }

    setSaveToast(`✅ Saved: ${arrived}/${total} ${inwardModalItem.unit} for ${inwardModalItem.description}`);
    setTimeout(() => setSaveToast(null), 2500);
    setInwardModalItem(null);
  };

  // =========================================================================
  // DAILY REQUIREMENT COMPUTATIONS & UNIT SUMMARY
  // =========================================================================
  const filteredDailyRequirements = useMemo(() => {
    return (dailyRequirements || []).filter((item) => {
      if (!isAllDatesView && item.requirementDate !== dailySelectedDate) {
        return false;
      }

      const isCompleted = item.status === 'Completed' || (Number(item.arrangedQuantity) || 0) >= item.requiredQuantity;
      if (dailyStatusFilter === 'ARRIVED' && !isCompleted) return false;
      if (dailyStatusFilter === 'PENDING' && isCompleted) return false;

      if (dailySearchTerm.trim()) {
        const term = dailySearchTerm.toLowerCase();
        return (
          (item.description || '').toLowerCase().includes(term) ||
          (item.sizeSpecification || '').toLowerCase().includes(term) ||
          (item.materialType || '').toLowerCase().includes(term) ||
          (item.machineName || '').toLowerCase().includes(term) ||
          (item.projectName || '').toLowerCase().includes(term) ||
          (item.vendorName || '').toLowerCase().includes(term)
        );
      }

      return true;
    });
  }, [dailyRequirements, dailySelectedDate, isAllDatesView, dailyStatusFilter, dailySearchTerm]);

  const dailyUnitSummary = useMemo(() => {
    const list = (dailyRequirements || []).filter((it) => isAllDatesView || it.requirementDate === dailySelectedDate);
    const requiredByUnit: Record<string, number> = {};
    const arrangedByUnit: Record<string, number> = {};
    const pendingByUnit: Record<string, number> = {};

    list.forEach((it) => {
      const u = it.unit || 'Nos';
      const req = Number(it.requiredQuantity) || 0;
      const arr = Number(it.arrangedQuantity) || 0;
      const pen = Math.max(0, req - arr);

      requiredByUnit[u] = (requiredByUnit[u] || 0) + req;
      arrangedByUnit[u] = (arrangedByUnit[u] || 0) + arr;
      pendingByUnit[u] = (pendingByUnit[u] || 0) + pen;
    });

    const formatMap = (map: Record<string, number>) => {
      const parts = Object.entries(map).map(([unit, val]) => `${val} ${unit}`);
      return parts.length > 0 ? parts.join(' · ') : '0 Nos';
    };

    const totalCount = list.length;
    const arrivedCount = list.filter((i) => i.status === 'Completed' || (Number(i.arrangedQuantity) || 0) >= i.requiredQuantity).length;
    const pendingCount = totalCount - arrivedCount;
    const progressPct = totalCount > 0 ? Math.round((arrivedCount / totalCount) * 100) : 0;

    return {
      requiredByUnit,
      arrangedByUnit,
      pendingByUnit,
      requiredSummary: formatMap(requiredByUnit),
      arrangedSummary: formatMap(arrangedByUnit),
      pendingSummary: formatMap(pendingByUnit),
      totalCount,
      arrivedCount,
      pendingCount,
      progressPct,
    };
  }, [dailyRequirements, dailySelectedDate, isAllDatesView]);

  const handleStepDate = (days: number) => {
    const parts = dailySelectedDate.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setDailySelectedDate(`${y}-${m}-${day}`);
    setIsAllDatesView(false);
  };

  const handleJumpToToday = () => {
    setDailySelectedDate(new Date().toISOString().split('T')[0]);
    setIsAllDatesView(false);
  };

  // Save Daily Requirements to Supabase DB from phone
  const handleSaveDailyToDb = async () => {
    setIsSaving(true);
    setSaveToast(null);

    try {
      const itemsToSync = filteredDailyRequirements.length > 0 ? filteredDailyRequirements : dailyRequirements;
      for (const item of itemsToSync) {
        await dbUpsertDailyRequirement(item);
      }

      logAudit?.(
        'Daily Requirement Inward Saved (Mobile)',
        'Stores Inward',
        `${currentUser?.name || 'Chandramani'} synced ${itemsToSync.length} daily requirement items to database from phone`
      );

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setSaveToast(`✅ Synced ${itemsToSync.length} items to Cloud DB at ${timeStr}`);
      setTimeout(() => setSaveToast(null), 3500);

      if (dailyUnitSummary.progressPct === 100 && dailyUnitSummary.totalCount > 0) {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 } });
      }
    } catch (err) {
      console.error('Error saving daily requirements from mobile:', err);
      setSaveToast('⚠️ Note: Changes saved in local session.');
      setTimeout(() => setSaveToast(null), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  // =========================================================================
  // EXISTING PROJECT INWARD CALCULATIONS (PRESERVED 100%)
  // =========================================================================
  const activeProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  const enrichedProjects = useMemo(() => {
    return projects.map((proj) => {
      const mats = getMaterialsForProject(proj, projectRequirements, orders);
      const arrived = mats.filter((m) => m.isReceived).length;
      const total = mats.length;
      const pct = total > 0 ? Math.round((arrived / total) * 100) : 0;
      const totalQty = mats.reduce((acc, m) => acc + Number(m.quantity || 0), 0);

      const mchSet = new Set<string>();
      mats.forEach((m) => {
        const mch = (m.machineName || m.machineType || '').trim();
        if (mch) mchSet.add(mch);
      });
      if (proj.machineType?.trim()) mchSet.add(proj.machineType.trim());
      if (proj.machineName?.trim()) mchSet.add(proj.machineName.trim());

      return {
        project: proj,
        materials: mats,
        totalItems: total,
        arrivedCount: arrived,
        pendingCount: total - arrived,
        progressPct: pct,
        totalQty,
        machineTypes: Array.from(mchSet),
      };
    });
  }, [projects, projectRequirements, orders]);

  const filteredProjects = useMemo(() => {
    if (!projectSearchTerm) return enrichedProjects;
    const term = projectSearchTerm.toLowerCase();
    return enrichedProjects.filter((ep) => {
      const p = ep.project;
      return (
        (p.name || '').toLowerCase().includes(term) ||
        (p.customer || '').toLowerCase().includes(term) ||
        (p.projectNumber || '').toLowerCase().includes(term) ||
        (p.poNo || p.poNumber || '').toLowerCase().includes(term) ||
        ep.machineTypes.some((m) => m.toLowerCase().includes(term))
      );
    });
  }, [enrichedProjects, projectSearchTerm]);

  const activeProjectMaterials = useMemo(() => {
    if (!activeProject) return [];
    return getMaterialsForProject(activeProject, projectRequirements, orders);
  }, [activeProject, projectRequirements, orders]);

  const activeUniqueMachines = useMemo(() => {
    const set = new Set<string>();
    activeProjectMaterials.forEach((m) => {
      const mch = (m.machineName || m.machineType || '').trim();
      if (
        mch &&
        mch.toLowerCase() !== (activeProject?.name || '').toLowerCase().trim() &&
        !['kaustubh', 'amit', 'admin', 'rahul', 'general'].includes(mch.toLowerCase())
      ) {
        set.add(mch);
      }
    });
    if (
      set.size === 0 &&
      activeProject?.machineName &&
      activeProject.machineName.toLowerCase().trim() !== (activeProject?.name || '').toLowerCase().trim() &&
      !['kaustubh', 'amit', 'admin', 'rahul', 'general'].includes(activeProject.machineName.toLowerCase())
    ) {
      set.add(activeProject.machineName.trim());
    }
    return Array.from(set);
  }, [activeProjectMaterials, activeProject]);

  const machineFolderStats = useMemo(() => {
    const statsMap = new Map<
      string,
      { totalItems: number; totalQty: number; arrivedCount: number; pendingCount: number; progressPct: number }
    >();

    activeUniqueMachines.forEach((mch) => {
      const mats = activeProjectMaterials.filter((m) => {
        const itemMch = (m.machineName || m.machineType || '').trim() || (activeProject?.machineType || '');
        return itemMch === mch;
      });
      const totalItems = mats.length;
      const totalQty = mats.reduce((acc, m) => acc + Number(m.quantity || 0), 0);
      const arrivedCount = mats.filter((m) => m.isReceived).length;
      const pendingCount = totalItems - arrivedCount;
      const progressPct = totalItems > 0 ? Math.round((arrivedCount / totalItems) * 100) : 0;
      statsMap.set(mch, { totalItems, totalQty, arrivedCount, pendingCount, progressPct });
    });

    return statsMap;
  }, [activeUniqueMachines, activeProjectMaterials, activeProject]);

  const materialsInFolder = useMemo(() => {
    if (selectedMachineFolder === 'ALL') return activeProjectMaterials;
    return activeProjectMaterials.filter((m) => {
      const itemMch = (m.machineName || m.machineType || '').trim() || (activeProject?.machineType || '');
      return itemMch === selectedMachineFolder;
    });
  }, [activeProjectMaterials, selectedMachineFolder, activeProject]);

  const filteredMaterials = useMemo(() => {
    return materialsInFolder.filter((m) => {
      if (filterStatus === 'PENDING' && m.isReceived) return false;
      if (filterStatus === 'ARRIVED' && !m.isReceived) return false;

      if (!materialSearchTerm) return true;
      const term = materialSearchTerm.toLowerCase();
      return (
        (m.description || '').toLowerCase().includes(term) ||
        (m.sizeSpecs || '').toLowerCase().includes(term) ||
        (m.materialType || '').toLowerCase().includes(term) ||
        (m.vendorName || m.vendor || '').toLowerCase().includes(term) ||
        (m.machineName || m.machineType || '').toLowerCase().includes(term)
      );
    });
  }, [materialsInFolder, filterStatus, materialSearchTerm]);

  const projectTotalCount = activeProjectMaterials.length;
  const projectArrivedCount = activeProjectMaterials.filter((m) => m.isReceived).length;
  const projectProgressPct =
    projectTotalCount > 0 ? Math.round((projectArrivedCount / projectTotalCount) * 100) : 0;

  const folderTotalCount = materialsInFolder.length;
  const folderArrivedCount = materialsInFolder.filter((m) => m.isReceived).length;
  const folderPendingCount = folderTotalCount - folderArrivedCount;
  const folderProgressPct =
    folderTotalCount > 0 ? Math.round((folderArrivedCount / folderTotalCount) * 100) : 0;

  const handleMarkAllFiltered = () => {
    const unreceived = filteredMaterials.filter((m) => !m.isReceived);
    if (unreceived.length === 0) return;
    unreceived.forEach((m) => {
      toggleMaterialReceived(m.id);
    });
    setSaveToast(`✅ Ticked ${unreceived.length} items as Arrived`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  const handleSaveToDb = async () => {
    if (!activeProject) return;
    setIsSaving(true);
    setSaveToast(null);

    try {
      if (activeProjectMaterials.length > 0) {
        setProjectRequirements((prev) => {
          const matIds = new Set(activeProjectMaterials.map((m) => m.id));
          const otherReqs = prev.filter(
            (r) =>
              !matIds.has(r.id) &&
              (r.projectName || '').trim().toLowerCase() !== (activeProject.name || '').trim().toLowerCase()
          );
          const merged = [...activeProjectMaterials, ...otherReqs];
          try {
            localStorage.setItem('rsb_erp_production_v2.0_requirements', JSON.stringify(merged));
          } catch (e) {}
          return merged;
        });

        await dbBulkUpsertRequirements(activeProjectMaterials);
      }

      logAudit?.(
        'Material Inward Status Verified (Mobile)',
        'Stores Inward',
        `${currentUser?.name || 'Chandramani'} verified & saved arrival receipts (${projectArrivedCount}/${projectTotalCount} Arrived) to DB for Project ${activeProject.name}`
      );

      try {
        const bc = new BroadcastChannel('rsb_erp_live_sync');
        bc.postMessage({ type: 'PROJECTS_UPDATED', projectName: activeProject.name });
        bc.close();
      } catch (e) {}

      if (projectProgressPct === 100 && projectTotalCount > 0) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.7 },
        });
      }

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setSaveToast(`✅ Saved to Database at ${timeStr}`);
      setTimeout(() => {
        setSaveToast(null);
      }, 3500);
    } catch (err) {
      console.error('Error saving to DB from mobile:', err);
    } finally {
      setTimeout(() => {
        setIsSaving(false);
      }, 300);
    }
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedMachineFolder('ALL');
    setViewStep('MACHINES');
    setMaterialSearchTerm('');
    setFilterStatus('ALL');
  };

  const handleSelectMachine = (machineName: string) => {
    setSelectedMachineFolder(machineName);
    setViewStep('CHECKLIST');
    setMaterialSearchTerm('');
    setFilterStatus('ALL');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col justify-between pb-28 font-sans select-none">
      {/* 1. TOP MOBILE HEADER */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-3.5 py-2.5 shadow-xs">
        <div className="flex items-center justify-between gap-2">
          {/* Brand & User */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-sm shadow-xs shrink-0">
              <Truck className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-black text-slate-900 tracking-tight leading-tight">
                STORES INWARD (आवक)
              </h1>
              <p className="text-[11px] text-slate-500 font-medium truncate">
                Inspector: <strong className="text-slate-800">{currentUser?.name || 'Chandramani'}</strong>
              </p>
            </div>
          </div>

          {/* Dedicated Logout Button */}
          <button
            type="button"
            onClick={() => logout()}
            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
            title="Log Out"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-600" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2. DEDICATED FOLDER SWITCHER: DAILY REQUIREMENT vs PROJECT FOLDERS */}
      {/* ========================================================================= */}
      <nav className="bg-white border-b border-slate-200 px-3 py-2 sticky top-[53px] z-20 shadow-xs flex items-center gap-2">
        {/* Folder 1: Daily Requirement */}
        <button
          type="button"
          onClick={() => setActiveFolderMode('DAILY')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeFolderMode === 'DAILY'
              ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/15'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <CalendarDays className={`w-4 h-4 ${activeFolderMode === 'DAILY' ? 'text-amber-400' : 'text-slate-500'}`} />
          <span>Daily Requirement</span>
          <span
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-black ${
              activeFolderMode === 'DAILY' ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {dailyUnitSummary.totalCount}
          </span>
        </button>

        {/* Folder 2: Project Folders */}
        <button
          type="button"
          onClick={() => setActiveFolderMode('PROJECTS')}
          className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeFolderMode === 'PROJECTS'
              ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/15'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
          }`}
        >
          <Folder className={`w-4 h-4 ${activeFolderMode === 'PROJECTS' ? 'text-blue-400' : 'text-slate-500'}`} />
          <span>Project Folders</span>
          <span
            className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-black ${
              activeFolderMode === 'PROJECTS' ? 'bg-blue-400 text-slate-950' : 'bg-slate-200 text-slate-700'
            }`}
          >
            {projects.length}
          </span>
        </button>
      </nav>

      {/* ========================================================================= */}
      {/* MODE A: DAILY MATERIAL REQUIREMENT FOLDER */}
      {/* ========================================================================= */}
      {activeFolderMode === 'DAILY' && (
        <main className="p-3.5 space-y-3 flex-1 overflow-y-auto">
          {/* Top Folder Header / Date Switcher */}
          <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                  <CalendarDays className="w-4 h-4 text-white" />
                </span>
                <div>
                  <h2 className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    Daily Material Requirement
                  </h2>
                  <p className="text-[10px] text-slate-500 font-medium">
                    दैनिक सामग्री आवक व कमी ट्रैकिंग (Shopfloor Schedule)
                  </p>
                </div>
              </div>

              {/* Today / All Toggle */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleJumpToToday}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                    !isAllDatesView && dailySelectedDate === new Date().toISOString().split('T')[0]
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setIsAllDatesView(!isAllDatesView)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-all ${
                    isAllDatesView
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Dates
                </button>
              </div>
            </div>

            {/* Date Navigator Strip (When not in All Dates view) */}
            {!isAllDatesView ? (
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-1.5 gap-1">
                <button
                  type="button"
                  onClick={() => handleStepDate(-1)}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95 shadow-xs"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex-1 flex items-center justify-center gap-1.5 min-w-0">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <input
                    type="date"
                    value={dailySelectedDate}
                    onChange={(e) => {
                      if (e.target.value) {
                        setDailySelectedDate(e.target.value);
                        setIsAllDatesView(false);
                      }
                    }}
                    className="text-xs font-black text-slate-800 bg-transparent border-0 p-0 focus:ring-0 cursor-pointer font-mono"
                  />
                  {dailySelectedDate === new Date().toISOString().split('T')[0] && (
                    <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold text-[9px] shrink-0">
                      LIVE TODAY
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleStepDate(1)}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95 shadow-xs"
                  title="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="p-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold flex items-center justify-between">
                <span>Showing ALL scheduled material dates</span>
                <button
                  type="button"
                  onClick={handleJumpToToday}
                  className="underline text-blue-700 text-[11px]"
                >
                  Switch to Today
                </button>
              </div>
            )}
          </div>

          {/* Quick Summary Bar: Scheduled | Pending | Arrived */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-white border border-slate-200 rounded-2xl p-2.5 text-center shadow-xs">
              <span className="block text-[10px] uppercase font-bold text-slate-500">Scheduled</span>
              <span className="text-base font-black text-slate-900 font-mono mt-0.5 block">
                {dailyUnitSummary.totalCount} <span className="text-xs font-normal text-slate-500">Items</span>
              </span>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-2.5 text-center shadow-xs">
              <span className="block text-[10px] uppercase font-bold text-amber-800">Pending (बाकी)</span>
              <span className="text-base font-black text-amber-700 font-mono mt-0.5 block">
                {dailyUnitSummary.pendingCount} <span className="text-xs font-normal text-amber-700">Items</span>
              </span>
              <div className="text-[10px] text-amber-900/80 font-mono mt-0.5 font-bold truncate">
                {dailyUnitSummary.pendingSummary}
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-2.5 text-center shadow-xs">
              <span className="block text-[10px] uppercase font-bold text-emerald-800">Arrived (आया)</span>
              <span className="text-base font-black text-emerald-700 font-mono mt-0.5 block">
                {dailyUnitSummary.arrivedCount} <span className="text-xs font-normal text-emerald-700">Items</span>
              </span>
              <div className="text-[10px] text-emerald-900/80 font-mono mt-0.5 font-bold truncate">
                {dailyUnitSummary.arrangedSummary}
              </div>
            </div>
          </div>

          {/* Quick Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={dailySearchTerm}
              onChange={(e) => setDailySearchTerm(e.target.value)}
              placeholder="Search description, size, vendor, machine..."
              className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-9 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-xs"
            />
            {dailySearchTerm && (
              <button
                type="button"
                onClick={() => setDailySearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1.5"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => setDailyStatusFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${
                dailyStatusFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200'
              }`}
            >
              All Items ({dailyUnitSummary.totalCount})
            </button>
            <button
              type="button"
              onClick={() => setDailyStatusFilter('PENDING')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                dailyStatusFilter === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-amber-700 border border-amber-200'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Pending ({dailyUnitSummary.pendingCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setDailyStatusFilter('ARRIVED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all flex items-center gap-1.5 ${
                dailyStatusFilter === 'ARRIVED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-emerald-700 border border-emerald-200'
              }`}
            >
              <Check className="w-3.5 h-3.5 text-emerald-500" />
              <span>Arrived ({dailyUnitSummary.arrivedCount})</span>
            </button>
          </div>

          {/* Daily Requirements List in Exact Clean Format */}
          <div className="space-y-2.5">
            {filteredDailyRequirements.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-3 shadow-xs">
                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <CalendarDays className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">No Materials Found</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    {dailySearchTerm
                      ? `No match for "${dailySearchTerm}" in this filter.`
                      : `No daily material requirements scheduled for ${dailySelectedDate}.`}
                  </p>
                </div>
                <div className="pt-2 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={handleJumpToToday}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold"
                  >
                    Jump to Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAllDatesView(true)}
                    className="px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold"
                  >
                    View All Dates
                  </button>
                </div>
              </div>
            ) : (
              filteredDailyRequirements.map((item) => {
                const total = Number(item.requiredQuantity) || 1;
                const arrived = Number(item.arrangedQuantity) || 0;
                const pending = Math.max(0, total - arrived);
                const isArrived = arrived >= total && total > 0;
                const isPartial = arrived > 0 && arrived < total;

                return (
                  <div
                    key={item.id}
                    onClick={() =>
                      handleOpenInwardModal({
                        id: item.id,
                        description: item.description,
                        machineName: item.machineName || 'Machine',
                        sizeSpecs: item.sizeSpecification || 'Standard',
                        quantity: total,
                        unit: item.unit || 'Nos',
                        arrivedQty: arrived,
                        vendorName: item.vendorName,
                        isDaily: true,
                      })
                    }
                    className={`p-3 rounded-2xl bg-white border transition-all duration-150 shadow-xs cursor-pointer active:scale-[0.99] flex items-center justify-between gap-3 ${
                      isArrived
                        ? 'border-emerald-400 ring-2 ring-emerald-400/25 bg-emerald-50/25'
                        : isPartial
                        ? 'border-amber-300 ring-1 ring-amber-400/20 bg-amber-50/15'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Black Machine Tag & Blue Size Tag */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.machineName && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono font-black text-[10px]">
                            {item.machineName}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono font-bold text-[10px] border border-blue-200">
                          {item.sizeSpecification || 'Standard'}
                        </span>
                        {item.projectName && (
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[9px] font-bold">
                            {item.projectName}
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <h4 className="text-xs font-extrabold text-slate-900 leading-tight">
                        {item.description}
                      </h4>

                      {/* Qty, Arrived, Pending and Vendor Line */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
                        <span className="font-mono font-black text-slate-900">
                          Qty: {total} {item.unit || 'Nos'}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 text-[11px]">
                          Arrived: {arrived}
                        </span>
                        <span className="font-mono font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 text-[11px]">
                          Pending: {pending}
                        </span>
                        {item.vendorName && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="truncate text-slate-600">
                              Vendor: <strong className="text-slate-800">{item.vendorName}</strong>
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Big Checkbox */}
                    <div className="shrink-0 flex flex-col items-center justify-center pl-1">
                      <div
                        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-150 shadow-xs ${
                          isArrived
                            ? 'bg-emerald-600 text-white scale-105'
                            : isPartial
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 text-slate-400'
                        }`}
                      >
                        {isArrived ? (
                          <Check className="w-7 h-7 stroke-[3.5] text-white" />
                        ) : isPartial ? (
                          <span className="font-mono font-black text-xs text-white">
                            {arrived}/{total}
                          </span>
                        ) : (
                          <div className="w-5 h-5 rounded-lg border-2 border-slate-400" />
                        )}
                      </div>
                      {isArrived && (
                        <div className="text-[9px] text-emerald-800 font-mono font-black text-center mt-1 flex items-center justify-center gap-0.5 bg-emerald-100 px-1 py-0.2 rounded border border-emerald-300">
                          <Lock className="w-2.5 h-2.5 text-emerald-700 shrink-0" />
                          <span>CP</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>
      )}

      {/* ========================================================================= */}
      {/* MODE B: PROJECT INWARD WORKFLOW (STEP 1 -> STEP 2 -> STEP 3) */}
      {/* ========================================================================= */}
      {activeFolderMode === 'PROJECTS' && (
        <>
          {/* STEP 1: PICK PROJECT (प्रोजेक्ट चुनें) */}
          {!activeProject && (
            <main className="p-3.5 space-y-3 flex-1 overflow-y-auto">
              {/* Highlight Card: Jump to Daily Requirement Folder */}
              <div
                onClick={() => setActiveFolderMode('DAILY')}
                className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-sm flex items-center justify-between cursor-pointer active:scale-[0.99] transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center shadow-xs shrink-0">
                    <CalendarDays className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wide text-slate-950 flex items-center gap-1.5">
                      <span>Daily Requirement Folder</span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-950 text-amber-300 text-[10px] font-mono">
                        {dailyUnitSummary.totalCount}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-900/80 font-medium">
                      {dailyUnitSummary.arrivedCount} Arrived • {dailyUnitSummary.pendingCount} Pending today
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-950 shrink-0" />
              </div>

              {/* Step Indicator Header */}
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center">
                    1
                  </span>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Step 1: Pick Project (प्रोजेक्ट चुनें)
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500">
                  {projects.length} Projects
                </span>
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={projectSearchTerm}
                  onChange={(e) => setProjectSearchTerm(e.target.value)}
                  placeholder="Search project name or client..."
                  className="w-full bg-white border border-slate-300 rounded-xl pl-10 pr-9 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
                />
                {projectSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setProjectSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm px-1.5"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Project Cards List */}
              <div className="space-y-2.5">
                {filteredProjects.map((ep) => {
                  const p = ep.project;
                  const isComplete = ep.progressPct === 100 && ep.totalItems > 0;
                  return (
                    <div
                      key={p.id}
                      onClick={() => handleSelectProject(p.id)}
                      className={`p-3.5 rounded-2xl bg-white border transition-all duration-150 shadow-xs cursor-pointer active:scale-[0.99] flex flex-col gap-2.5 ${
                        isComplete
                          ? 'border-emerald-300 ring-1 ring-emerald-400/20 bg-emerald-50/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono font-black text-xs">
                              {p.name}
                            </span>
                            {p.projectNumber && (
                              <span className="text-xs font-mono font-bold text-slate-500">
                                {p.projectNumber}
                              </span>
                            )}
                          </div>
                          <p className="text-xs font-bold text-slate-800 mt-1 truncate">
                            Client: {p.customer || 'General Client'}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            PO: <strong className="text-indigo-700 font-mono">{p.poNo || p.poNumber || '36'}</strong>
                            {p.targetDate && ` • Delivery: ${p.targetDate}`}
                          </p>
                        </div>

                        <div className="flex flex-col items-end shrink-0">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-black font-mono flex items-center gap-1 ${
                              isComplete
                                ? 'bg-emerald-100 text-emerald-800'
                                : ep.arrivedCount > 0
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isComplete && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                            <span>{ep.progressPct}%</span>
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {ep.arrivedCount}/{ep.totalItems} Arrived
                          </span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isComplete ? 'bg-emerald-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${ep.progressPct}%` }}
                        />
                      </div>

                      {/* Machine Folders preview & arrow */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-500 text-[11px] truncate">
                          <Folder className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {ep.machineTypes.length > 0 ? ep.machineTypes.join(', ') : 'All Machines'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-blue-600 font-bold text-xs shrink-0">
                          <span>Open</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </main>
          )}

          {/* STEP 2: PICK MACHINE FOLDER */}
          {activeProject && viewStep === 'MACHINES' && (
            <main className="p-3.5 space-y-3 flex-1 overflow-y-auto">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedProjectId(null)}
                  className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>All Projects</span>
                </button>
                <div className="text-right">
                  <span className="text-xs font-black text-slate-900 block font-mono">
                    {activeProject.name}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {activeProject.customer || 'General Client'}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center">
                    2
                  </span>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Step 2: Pick Machine Folder
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500">
                  {activeUniqueMachines.length} Categories
                </span>
              </div>

              <div className="space-y-2.5">
                {/* 1. "ALL MACHINES" Combined Folder */}
                <div
                  onClick={() => handleSelectMachine('ALL')}
                  className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 transition-all shadow-xs cursor-pointer active:scale-[0.99] flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900">
                          ALL MACHINES (सभी मशीनें)
                        </h3>
                        <p className="text-xs text-slate-500">
                          Complete project checklist ({projectTotalCount} total items)
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-black font-mono text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">
                      {projectProgressPct}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full"
                      style={{ width: `${projectProgressPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-100">
                    <span>{projectArrivedCount} Arrived • {projectTotalCount - projectArrivedCount} Pending</span>
                    <span className="text-blue-600 font-bold flex items-center gap-0.5">
                      Open Folder <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>

                {/* Individual Machine Folders */}
                {activeUniqueMachines.map((mch) => {
                  const stats = machineFolderStats.get(mch) || {
                    totalItems: 0,
                    totalQty: 0,
                    arrivedCount: 0,
                    pendingCount: 0,
                    progressPct: 0,
                  };
                  const isFolderDone = stats.progressPct === 100 && stats.totalItems > 0;

                  return (
                    <div
                      key={mch}
                      onClick={() => handleSelectMachine(mch)}
                      className={`p-3.5 rounded-2xl bg-white border transition-all shadow-xs cursor-pointer active:scale-[0.99] flex flex-col gap-2 ${
                        isFolderDone
                          ? 'border-emerald-300 ring-1 ring-emerald-400/20 bg-emerald-50/20'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-mono font-black text-xs">
                            <FolderOpen className="w-5 h-5 text-amber-400" />
                          </div>
                          <div>
                            <h3 className="text-sm font-black text-slate-900 font-mono">
                              {mch}
                            </h3>
                            <p className="text-xs text-slate-500">
                              {stats.totalItems} Items • {stats.totalQty} Units
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-black font-mono ${
                              isFolderDone
                                ? 'bg-emerald-100 text-emerald-800'
                                : stats.arrivedCount > 0
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {stats.progressPct}%
                          </span>
                        </div>
                      </div>

                      <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isFolderDone ? 'bg-emerald-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${stats.progressPct}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono pt-1 border-t border-slate-100">
                        <span>{stats.arrivedCount} Arrived • {stats.pendingCount} Pending</span>
                        <span className="text-blue-600 font-bold flex items-center gap-0.5">
                          Open Checklist <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </main>
          )}

          {/* STEP 3: 1-TAP INWARD CHECKLIST (Exact layout user requested) */}
          {activeProject && viewStep === 'CHECKLIST' && (
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Back to Step 2 Header */}
              <div className="bg-white border-b border-slate-200 px-3.5 py-2.5 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setViewStep('MACHINES')}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Folders</span>
                  </button>

                  <div className="text-right">
                    <span className="text-xs font-black text-slate-900 block font-mono">
                      {activeProject.name} • {selectedMachineFolder}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Step 3: 1-Tap Material Inward Checklist
                    </span>
                  </div>
                </div>

                {/* Folder Stats Strip */}
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-700">
                      Progress: {folderArrivedCount}/{folderTotalCount}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-mono font-bold text-[10px]">
                      {folderProgressPct}%
                    </span>
                  </div>
                  {folderPendingCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllFiltered}
                      className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Mark All Arrived</span>
                    </button>
                  )}
                </div>

                {/* Filter Pills & Search */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={materialSearchTerm}
                      onChange={(e) => setMaterialSearchTerm(e.target.value)}
                      placeholder="Search material..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-7 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white"
                    />
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setFilterStatus('ALL')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                        filterStatus === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      All ({folderTotalCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterStatus('PENDING')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                        filterStatus === 'PENDING' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-amber-700'
                      }`}
                    >
                      Pending ({folderPendingCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterStatus('ARRIVED')}
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                        filterStatus === 'ARRIVED' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-emerald-700'
                      }`}
                    >
                      Arrived ({folderArrivedCount})
                    </button>
                  </div>
                </div>
              </div>

              {/* Checklist Items List (Cards with Arrived & Pending quantity right in line) */}
              <main className="p-3.5 space-y-2.5 flex-1 overflow-y-auto">
                {filteredMaterials.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
                    No materials found in this folder.
                  </div>
                ) : (
                  filteredMaterials.map((m) => {
                    const total = Number(m.quantity) || 1;
                    const arrived = Number(m.receivedQuantity ?? (m.isReceived ? total : 0)) || 0;
                    const pending = Math.max(0, total - arrived);
                    const isArrived = arrived >= total && total > 0;
                    const isPartial = arrived > 0 && arrived < total;

                    return (
                      <div
                        key={m.id}
                        onClick={() =>
                          handleOpenInwardModal({
                            id: m.id,
                            description: m.description,
                            machineName: m.machineName || m.machineType || selectedMachineFolder,
                            sizeSpecs: m.sizeSpecs || 'Standard',
                            quantity: total,
                            unit: m.unit || 'Nos',
                            arrivedQty: arrived,
                            vendorName: m.vendorName || m.vendor,
                            isDaily: false,
                          })
                        }
                        className={`p-3 rounded-2xl bg-white border transition-all duration-150 shadow-xs cursor-pointer active:scale-[0.99] flex items-center justify-between gap-3 ${
                          isArrived
                            ? 'border-emerald-400 ring-2 ring-emerald-400/25 bg-emerald-50/25'
                            : isPartial
                            ? 'border-amber-300 ring-1 ring-amber-400/20 bg-amber-50/15'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex-1 min-w-0 space-y-1">
                          {/* Machine Black Tag & Size Blue Tag */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono font-black text-[10px]">
                              {m.machineName || m.machineType || selectedMachineFolder}
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono font-bold text-[10px] border border-blue-200">
                              {m.sizeSpecs || 'Standard'}
                            </span>
                          </div>

                          {/* Title */}
                          <p className="text-xs font-extrabold text-slate-900 leading-tight">
                            {m.description}
                          </p>

                          {/* Line with Qty, Arrived, Pending and Vendor */}
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
                            <span className="font-mono font-black text-slate-900">
                              Qty: {m.quantity} {m.unit || 'Nos'}
                            </span>
                            <span className="text-slate-300">•</span>
                            <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 text-[11px]">
                              Arrived: {arrived}
                            </span>
                            <span className="font-mono font-bold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 text-[11px]">
                              Pending: {pending}
                            </span>
                            {(m.vendorName || m.vendor) && (
                              <>
                                <span className="text-slate-300">•</span>
                                <span className="truncate text-slate-600">
                                  Vendor: <strong className="text-slate-800">{m.vendorName || m.vendor}</strong>
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Big Checkbox */}
                        <div className="shrink-0 flex flex-col items-center justify-center pl-1">
                          <div
                            className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-150 shadow-xs ${
                              isArrived
                                ? 'bg-emerald-600 text-white scale-105'
                                : isPartial
                                ? 'bg-amber-500 text-white'
                                : 'bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 text-slate-400'
                            }`}
                          >
                            {isArrived ? (
                              <Check className="w-7 h-7 stroke-[3.5] text-white" />
                            ) : isPartial ? (
                              <span className="font-mono font-black text-xs text-white">
                                {arrived}/{total}
                              </span>
                            ) : (
                              <div className="w-5 h-5 rounded-lg border-2 border-slate-400" />
                            )}
                          </div>
                          {isArrived && (
                            <div className="text-[9px] text-emerald-800 font-mono font-black text-center mt-1 flex items-center justify-center gap-0.5 bg-emerald-100 px-1 py-0.2 rounded border border-emerald-300">
                              <Lock className="w-2.5 h-2.5 text-emerald-700 shrink-0" />
                              <span>{m.receivedByInitials || 'CP'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </main>
            </div>
          )}
        </>
      )}

      {/* ========================================================================= */}
      {/* 3. FLOATING BOTTOM BAR: NORMAL SAVE TO DB */}
      {/* Before clicking an item, keeps this exact clean green button */}
      {/* ========================================================================= */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-lg">
        <div className="max-w-md mx-auto space-y-1.5">
          {saveToast && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-mono font-bold text-center shadow-xs">
              {saveToast}
            </div>
          )}

          {activeFolderMode === 'DAILY' ? (
            <button
              type="button"
              onClick={handleSaveDailyToDb}
              disabled={isSaving}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving Inward Receipts...</span>
                </>
              ) : (
                <>
                  <Database className="w-5 h-5 text-white" />
                  <span>Save Inward Receipts (सेव करें)</span>
                </>
              )}
            </button>
          ) : (
            activeProject && (
              <button
                type="button"
                onClick={handleSaveToDb}
                disabled={isSaving}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving Inward...</span>
                  </>
                ) : (
                  <>
                    <Database className="w-5 h-5 text-emerald-100" />
                    <span>Save Inward Receipts (सेव करें)</span>
                  </>
                )}
              </button>
            )
          )}
        </div>
      </footer>

      {/* ========================================================================= */}
      {/* 4. SWIPE-UP DRAWER: ASK QUANTITY WHEN CLICKING AN ITEM */}
      {/* Slides up from bottom when an item is tapped */}
      {/* ========================================================================= */}
      {inwardModalItem && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div
            onClick={() => setInwardModalItem(null)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
          />

          {/* Swipe-Up Sheet */}
          <div className="relative z-10 bg-white rounded-t-3xl border-t border-slate-200 shadow-2xl p-4 max-w-md w-full mx-auto space-y-3.5 animate-in slide-in-from-bottom duration-200">
            {/* Grab Handle */}
            <div className="w-12 h-1.5 rounded-full bg-slate-300 mx-auto" />

            {/* Header: Item & Machine */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-slate-900 text-white font-mono font-black text-[10px]">
                    {inwardModalItem.machineName}
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-mono font-bold text-[10px] border border-blue-200">
                    {inwardModalItem.sizeSpecs}
                  </span>
                </div>
                <h3 className="text-sm font-extrabold text-slate-900 leading-tight">
                  {inwardModalItem.description}
                </h3>
                {inwardModalItem.vendorName && (
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Vendor: <strong className="text-slate-800">{inwardModalItem.vendorName}</strong>
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setInwardModalItem(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* 3 Number Display: Required | Arrived | Pending */}
            {(() => {
              const req = inwardModalItem.quantity;
              const arr = Math.max(0, Number(enteredArrivedQty) || 0);
              const pen = Math.max(0, req - arr);
              return (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-slate-100 border border-slate-200">
                    <span className="block text-[9px] font-bold text-slate-500 uppercase">Required (कुल)</span>
                    <span className="text-sm font-black text-slate-900 font-mono mt-0.5 block">
                      {req} <span className="text-[10px] font-normal text-slate-600">{inwardModalItem.unit}</span>
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-300">
                    <span className="block text-[9px] font-bold text-emerald-800 uppercase">Arrived (आया)</span>
                    <span className="text-sm font-black text-emerald-700 font-mono mt-0.5 block">
                      {arr} <span className="text-[10px] font-normal text-emerald-600">{inwardModalItem.unit}</span>
                    </span>
                  </div>

                  <div className="p-2 rounded-xl bg-amber-50 border border-amber-300">
                    <span className="block text-[9px] font-bold text-amber-800 uppercase">Pending (बाकी)</span>
                    <span className="text-sm font-black text-amber-700 font-mono mt-0.5 block">
                      {pen} <span className="text-[10px] font-normal text-amber-600">{inwardModalItem.unit}</span>
                    </span>
                  </div>
                </div>
              );
            })()}

            {/* Stepper & Input for Arrived Quantity */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <label className="block text-xs font-bold text-slate-800 text-center">
                Enter Arrived Quantity (आई हुई संख्या दर्ज करें):
              </label>

              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => setEnteredArrivedQty((prev) => Math.max(0, prev - 1))}
                  className="w-11 h-11 rounded-xl bg-white border border-slate-300 text-slate-800 font-bold text-xl flex items-center justify-center active:scale-90 shadow-2xs cursor-pointer"
                >
                  -
                </button>
                <input
                  type="number"
                  min="0"
                  max={inwardModalItem.quantity}
                  value={enteredArrivedQty}
                  onChange={(e) => setEnteredArrivedQty(Number(e.target.value))}
                  className="w-24 text-center py-2 font-mono font-black text-slate-900 bg-white border border-slate-300 rounded-xl text-lg focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setEnteredArrivedQty((prev) => Math.min(inwardModalItem.quantity, prev + 1))}
                  className="w-11 h-11 rounded-xl bg-white border border-slate-300 text-slate-800 font-bold text-xl flex items-center justify-center active:scale-90 shadow-2xs cursor-pointer"
                >
                  +
                </button>
                <span className="text-slate-600 font-mono text-xs font-bold">{inwardModalItem.unit}</span>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setEnteredArrivedQty(inwardModalItem.quantity)}
                  className="flex-1 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-xs font-black text-emerald-800 active:scale-95 transition-all"
                >
                  ✓ All Arrived ({inwardModalItem.quantity})
                </button>
                <button
                  type="button"
                  onClick={() => setEnteredArrivedQty(0)}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold active:scale-95 transition-all"
                >
                  Reset (0)
                </button>
              </div>
            </div>

            {/* Confirm & Save Button */}
            <button
              type="button"
              onClick={handleConfirmInwardQty}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer transition-all"
            >
              <Check className="w-5 h-5 stroke-[3]" />
              <span>Save Inward Receipts (सेव करें)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
