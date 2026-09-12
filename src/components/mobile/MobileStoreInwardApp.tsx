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
  Cpu,
  CheckCheck,
  CheckSquare,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { getMaterialsForProject } from '../../utils/projectMaterialsHelper';
import { dbBulkUpsertRequirements } from '../../services/supabaseService';
import confetti from 'canvas-confetti';

export const MobileStoreInwardApp: React.FC = () => {
  const {
    currentUser,
    projects,
    projectRequirements,
    setProjectRequirements,
    orders,
    toggleMaterialReceived,
    logout,
    logAudit,
  } = useERP();

  // Navigation State:
  // Step 1: selectedProjectId === null (Pick Project Screen)
  // Step 2: selectedProjectId !== null && viewStep === 'MACHINES' (Pick Machine Screen)
  // Step 3: selectedProjectId !== null && viewStep === 'CHECKLIST' (1-Tap Checklist Screen)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedMachineFolder, setSelectedMachineFolder] = useState<string>('ALL');
  const [viewStep, setViewStep] = useState<'MACHINES' | 'CHECKLIST'>('MACHINES');

  // Search & Filter State
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [materialSearchTerm, setMaterialSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'ARRIVED'>('ALL');
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Active Project object
  const activeProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  // Compute stats for all projects for Step 1
  const enrichedProjects = useMemo(() => {
    return projects.map((proj) => {
      const mats = getMaterialsForProject(proj, projectRequirements, orders);
      const arrived = mats.filter((m) => m.isReceived).length;
      const total = mats.length;
      const pct = total > 0 ? Math.round((arrived / total) * 100) : 0;
      const totalQty = mats.reduce((acc, m) => acc + Number(m.quantity || 0), 0);

      // Unique machine types
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

  // Filtered projects for Step 1
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

  // Materials for active project
  const activeProjectMaterials = useMemo(() => {
    if (!activeProject) return [];
    return getMaterialsForProject(activeProject, projectRequirements, orders);
  }, [activeProject, projectRequirements, orders]);

  // Unique machine categories in active project
  const activeUniqueMachines = useMemo(() => {
    const set = new Set<string>();
    activeProjectMaterials.forEach((m) => {
      const mch = (m.machineName || m.machineType || '').trim();
      if (mch) set.add(mch);
    });
    if (activeProject?.machineType?.trim()) set.add(activeProject.machineType.trim());
    if (activeProject?.machineName?.trim()) set.add(activeProject.machineName.trim());
    return Array.from(set);
  }, [activeProjectMaterials, activeProject]);

  // Per-machine stats
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

  // Materials scoped to selected machine folder
  const materialsInFolder = useMemo(() => {
    if (selectedMachineFolder === 'ALL') return activeProjectMaterials;
    return activeProjectMaterials.filter((m) => {
      const itemMch = (m.machineName || m.machineType || '').trim() || (activeProject?.machineType || '');
      return itemMch === selectedMachineFolder;
    });
  }, [activeProjectMaterials, selectedMachineFolder, activeProject]);

  // Filtered materials based on search and status
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

  // Active project inward stats
  const projectTotalCount = activeProjectMaterials.length;
  const projectArrivedCount = activeProjectMaterials.filter((m) => m.isReceived).length;
  const projectProgressPct =
    projectTotalCount > 0 ? Math.round((projectArrivedCount / projectTotalCount) * 100) : 0;

  // Active folder inward stats
  const folderTotalCount = materialsInFolder.length;
  const folderArrivedCount = materialsInFolder.filter((m) => m.isReceived).length;
  const folderPendingCount = folderTotalCount - folderArrivedCount;
  const folderProgressPct =
    folderTotalCount > 0 ? Math.round((folderArrivedCount / folderTotalCount) * 100) : 0;

  // Quick Batch: Mark all filtered as Arrived
  const handleMarkAllFiltered = () => {
    const unreceived = filteredMaterials.filter((m) => !m.isReceived);
    if (unreceived.length === 0) return;
    unreceived.forEach((m) => {
      toggleMaterialReceived(m.id);
    });
    setSaveToast(`✅ Ticked ${unreceived.length} items as Arrived`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Handle Save Inward to DB
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

  // Step 1 -> Step 2
  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setSelectedMachineFolder('ALL');
    setViewStep('MACHINES');
    setMaterialSearchTerm('');
    setFilterStatus('ALL');
  };

  // Step 2 -> Step 3
  const handleSelectMachine = (machineName: string) => {
    setSelectedMachineFolder(machineName);
    setViewStep('CHECKLIST');
    setMaterialSearchTerm('');
    setFilterStatus('ALL');
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col justify-between pb-28 font-sans select-none">
      {/* 1. TOP MOBILE HEADER */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-3.5 py-3 shadow-xs">
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
      {/* STEP 1: PICK PROJECT (प्रोजेक्ट चुनें) */}
      {/* ========================================================================= */}
      {!activeProject ? (
        <main className="p-3.5 space-y-3 flex-1 overflow-y-auto">
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
            {filteredProjects.length === 0 ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
                <Boxes className="w-10 h-10 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700">No projects found</h4>
                <p className="text-xs text-slate-500">Try searching with a different name.</p>
              </div>
            ) : (
              filteredProjects.map((ep) => {
                const { project: p, totalItems, arrivedCount, progressPct, machineTypes } = ep;

                return (
                  <div
                    key={p.id}
                    onClick={() => handleSelectProject(p.id)}
                    className="rounded-2xl p-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all shadow-xs cursor-pointer active:scale-[0.99] space-y-2.5 group"
                  >
                    {/* Top Row: Big Project Name & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                          {p.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Client: <strong className="text-slate-800">{p.customer || 'Factory Customer'}</strong>
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border font-mono ${
                          progressPct === 100
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : progressPct > 0
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {progressPct}% Inward
                        </span>
                      </div>
                    </div>

                    {/* Machine Categories Tags */}
                    {machineTypes.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] text-slate-500 font-medium mr-0.5 flex items-center gap-1">
                          <Cpu className="w-3.5 h-3.5 text-slate-400" /> Machines:
                        </span>
                        {machineTypes.map((mch) => (
                          <span
                            key={mch}
                            className="px-2.5 py-0.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold font-mono"
                          >
                            {mch}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Progress Bar & Open Action */}
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600 font-semibold flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>{arrivedCount} of {totalItems} Items Arrived</span>
                        </span>
                        <span className="text-blue-600 font-bold flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                          <span>Select Machines</span>
                          <ChevronRight className="w-4 h-4" />
                        </span>
                      </div>

                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            progressPct === 100 ? 'bg-emerald-600' : 'bg-emerald-500'
                          }`}
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </main>
      ) : (
        /* ========================================================================= */
        /* STEP 2 & 3: ACTIVE PROJECT WORKSPACE */
        /* ========================================================================= */
        <div className="flex flex-col flex-1">
          {/* Top Project Navigation Bar */}
          <section className="p-3 bg-white border-b border-slate-200 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSelectedProjectId(null)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl border border-slate-300 transition-all cursor-pointer active:scale-95"
              >
                <ArrowLeft className="w-4 h-4 text-slate-600" />
                <span>← Change Project</span>
              </button>

              <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-mono font-bold">
                {projectProgressPct}% Arrived ({projectArrivedCount}/{projectTotalCount})
              </span>
            </div>

            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Boxes className="w-4 h-4 text-blue-600" />
                <span>{activeProject.name}</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Client: <strong className="text-slate-800">{activeProject.customer || 'Factory Client'}</strong> • PO: {activeProject.poNo || activeProject.poNumber || '36'}
              </p>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* STEP 2: PICK MACHINE CATEGORY (मशीन चुनें) */}
          {/* ========================================================================= */}
          {viewStep === 'MACHINES' ? (
            <main className="p-3.5 space-y-3 flex-1 overflow-y-auto">
              {/* Step 2 Indicator */}
              <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center">
                    2
                  </span>
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Step 2: Pick Machine (मशीन चुनें)
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-500">
                  {activeUniqueMachines.length} Machine Folders
                </span>
              </div>

              <div className="space-y-2.5">
                {/* 1. All Machines Card */}
                <div
                  onClick={() => handleSelectMachine('ALL')}
                  className="rounded-2xl p-4 bg-white border-2 border-slate-200 hover:border-blue-500 transition-all shadow-xs cursor-pointer active:scale-[0.99] space-y-2 group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                        <FolderOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                          All Machines (पूरा प्रोजेक्ट)
                        </h4>
                        <p className="text-xs text-slate-500">
                          {activeProjectMaterials.length} Total Material Items
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-500">Inward Arrival:</span>
                    <span className="text-emerald-700 font-mono font-bold">
                      {projectArrivedCount} / {projectTotalCount} ({projectProgressPct}%)
                    </span>
                  </div>
                </div>

                {/* 2. Individual Machine Folders */}
                {activeUniqueMachines.map((mch) => {
                  const stats = machineFolderStats.get(mch) || {
                    totalItems: 0,
                    totalQty: 0,
                    arrivedCount: 0,
                    pendingCount: 0,
                    progressPct: 0,
                  };

                  return (
                    <div
                      key={mch}
                      onClick={() => handleSelectMachine(mch)}
                      className="rounded-2xl p-4 bg-white border-2 border-slate-200 hover:border-blue-500 transition-all shadow-xs cursor-pointer active:scale-[0.99] space-y-2 group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700">
                            <Folder className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors font-mono">
                              {mch} Folder
                            </h4>
                            <p className="text-xs text-slate-500">
                              {stats.totalItems} Specs • {stats.totalQty} Units
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-md font-mono ${
                            stats.progressPct === 100
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {stats.progressPct}%
                          </span>
                          <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-500">Arrivals:</span>
                        <span className="text-emerald-700 font-mono font-bold">
                          {stats.arrivedCount} of {stats.totalItems} Arrived
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </main>
          ) : (
            /* ========================================================================= */
            /* STEP 3: 1-TAP CHECKLIST FOR SELECTED MACHINE (सामान टिक करें) */
            /* ========================================================================= */
            <div className="flex flex-col flex-1">
              {/* Machine Selection Header Strip */}
              <section className="px-3 py-2.5 bg-white border-b border-slate-200 space-y-2 shadow-xs">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setViewStep('MACHINES')}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-xl border border-slate-300 transition-all cursor-pointer active:scale-95"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>← Change Machine ({selectedMachineFolder})</span>
                  </button>

                  <span className="text-xs font-mono font-bold text-emerald-700">
                    {folderArrivedCount}/{folderTotalCount} Arrived ({folderProgressPct}%)
                  </span>
                </div>

                {/* Quick Horizontal Machine Switcher */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setSelectedMachineFolder('ALL')}
                    className={`px-3 py-1 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer shrink-0 border ${
                      selectedMachineFolder === 'ALL'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    All Machines ({activeProjectMaterials.length})
                  </button>
                  {activeUniqueMachines.map((mch) => (
                    <button
                      key={mch}
                      type="button"
                      onClick={() => setSelectedMachineFolder(mch)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer shrink-0 border ${
                        selectedMachineFolder === mch
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {mch}
                    </button>
                  ))}
                </div>
              </section>

              {/* Search & 3 Big Filter Tabs */}
              <section className="px-3 pt-2.5 pb-1.5 space-y-2">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={materialSearchTerm}
                    onChange={(e) => setMaterialSearchTerm(e.target.value)}
                    placeholder="Search size (e.g. 80 x 6) or item..."
                    className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 shadow-xs"
                  />
                  {materialSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setMaterialSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs px-1"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter Tabs & Tick All */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="grid grid-cols-3 gap-1 flex-1 p-1 rounded-xl bg-slate-200/80 border border-slate-300 text-xs font-bold text-center">
                    <button
                      type="button"
                      onClick={() => setFilterStatus('ALL')}
                      className={`py-1.5 rounded-lg transition-all ${
                        filterStatus === 'ALL'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All ({folderTotalCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterStatus('PENDING')}
                      className={`py-1.5 rounded-lg transition-all ${
                        filterStatus === 'PENDING'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Pending ({folderPendingCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilterStatus('ARRIVED')}
                      className={`py-1.5 rounded-lg transition-all ${
                        filterStatus === 'ARRIVED'
                          ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Arrived ({folderArrivedCount})
                    </button>
                  </div>

                  {folderPendingCount > 0 && filterStatus !== 'ARRIVED' && (
                    <button
                      type="button"
                      onClick={handleMarkAllFiltered}
                      className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 transition-all active:scale-95 cursor-pointer flex items-center gap-1 shadow-xs"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Tick All</span>
                    </button>
                  )}
                </div>
              </section>

              {/* Material Checklist Cards */}
              <main className="px-3 py-2 space-y-2.5 flex-1 overflow-y-auto">
                {filteredMaterials.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
                    <PackageCheck className="w-8 h-8 text-slate-400 mx-auto" />
                    <h4 className="text-xs font-bold text-slate-700">No items found in this filter</h4>
                    <p className="text-[11px] text-slate-500">Try changing filter tab or search text.</p>
                  </div>
                ) : (
                  filteredMaterials.map((m, idx) => {
                    const isArrived = Boolean(m.isReceived);

                    return (
                      <div
                        key={m.id || idx}
                        onClick={() => toggleMaterialReceived(m.id)}
                        className={`rounded-2xl p-3.5 border-2 transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] ${
                          isArrived
                            ? 'bg-emerald-50/80 border-emerald-500 shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200 shadow-xs'
                        }`}
                      >
                        {/* Material Info */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          {/* Machine & Material Tag */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-mono font-bold">
                              {m.machineName || m.machineType || activeProject?.machineType || '16 HD'}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-mono">
                              {m.materialType || 'SS Flat'}
                            </span>
                          </div>

                          {/* Big Bold Size Spec */}
                          <div className="text-base font-black text-slate-900 font-mono tracking-wide">
                            {m.sizeSpecs}
                          </div>

                          {/* Part Description */}
                          <p className="text-xs font-medium text-slate-600 truncate">
                            {m.description}
                          </p>

                          {/* Quantity & Vendor */}
                          <div className="flex items-center gap-2 text-xs text-slate-500 pt-0.5">
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono font-black text-slate-900">
                              Qty: {m.quantity} {m.unit || 'Nos'}
                            </span>
                            <span className="truncate">
                              Vendor: <strong className="text-slate-800">{m.vendorName || m.vendor || activeProject?.vendor || 'Manav Metal'}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Big 1-Tap Checkbox */}
                        <div className="shrink-0 flex flex-col items-center justify-center pl-1">
                          <div
                            className={`w-13 h-13 rounded-2xl flex items-center justify-center transition-all duration-150 shadow-xs ${
                              isArrived
                                ? 'bg-emerald-600 text-white scale-105'
                                : 'bg-slate-100 hover:bg-slate-200 border-2 border-slate-300 text-slate-400'
                            }`}
                          >
                            {isArrived ? (
                              <Check className="w-8 h-8 stroke-[3.5] text-white" />
                            ) : (
                              <div className="w-6 h-6 rounded-lg border-2 border-slate-400" />
                            )}
                          </div>

                          {/* Inspector Initials Lock Stamp */}
                          {isArrived && (
                            <div className="text-[10px] text-emerald-800 font-mono font-black text-center mt-1 flex items-center justify-center gap-0.5 bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-300">
                              <Lock className="w-2.5 h-2.5 text-emerald-700 shrink-0" />
                              <span>
                                {m.receivedByInitials ||
                                  (m.receivedBy?.toLowerCase().includes('amit')
                                    ? 'AM'
                                    : m.receivedBy?.toLowerCase().includes('kaustubh')
                                    ? 'KA'
                                    : 'CP')}
                              </span>
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
        </div>
      )}

      {/* 5. FLOATING BOTTOM BAR: SAVE TO DB ACTION */}
      {activeProject && (
        <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-lg">
          <div className="max-w-md mx-auto space-y-1.5">
            {saveToast && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-mono font-bold text-center shadow-xs">
                {saveToast}
              </div>
            )}

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
          </div>
        </footer>
      )}
    </div>
  );
};
