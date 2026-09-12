import React, { useState, useMemo } from 'react';
import {
  PackageCheck,
  Search,
  CheckCircle2,
  Clock,
  LogOut,
  Check,
  ChevronDown,
  Database,
  Truck,
  Boxes,
  CheckSquare,
  Square,
  Sparkles,
  Layers,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { ProjectItem, ProjectMaterialRequirementItem } from '../../types/erp';
import { getMaterialsForProject } from '../../utils/projectMaterialsHelper';
import { dbBulkUpsertRequirements } from '../../services/supabaseService';
import confetti from 'canvas-confetti';

export const MobileStoreInwardApp: React.FC = () => {
  const {
    currentUser,
    projects,
    projectRequirements,
    orders,
    toggleMaterialReceived,
    logout,
    logAudit,
  } = useERP();

  // Selected Project State
  const [selectedProjectName, setSelectedProjectName] = useState<string>(() => {
    return projects[0]?.name || '16 HD';
  });

  const activeProject = useMemo(() => {
    return (
      projects.find(
        (p) => p.name.trim().toLowerCase() === selectedProjectName.trim().toLowerCase()
      ) ||
      projects[0] ||
      null
    );
  }, [projects, selectedProjectName]);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDING' | 'ARRIVED'>('ALL');
  const [isSaving, setIsSaving] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Materials for active project
  const projectMaterials = useMemo(() => {
    if (!activeProject) return [];
    return getMaterialsForProject(activeProject, projectRequirements, orders);
  }, [activeProject, projectRequirements, orders]);

  // Statistics
  const totalCount = projectMaterials.length;
  const arrivedCount = projectMaterials.filter((m) => m.isReceived).length;
  const pendingCount = totalCount - arrivedCount;
  const progressPct = totalCount > 0 ? Math.round((arrivedCount / totalCount) * 100) : 0;

  // Filtered List
  const filteredMaterials = useMemo(() => {
    return projectMaterials.filter((m) => {
      // Status Filter
      if (filterStatus === 'PENDING' && m.isReceived) return false;
      if (filterStatus === 'ARRIVED' && !m.isReceived) return false;

      // Search Term
      if (!searchTerm) return true;
      const term = searchTerm.toLowerCase();
      return (
        (m.description || '').toLowerCase().includes(term) ||
        (m.sizeSpecs || '').toLowerCase().includes(term) ||
        (m.materialType || '').toLowerCase().includes(term) ||
        (m.vendorName || m.vendor || '').toLowerCase().includes(term) ||
        (m.machineName || m.machineType || '').toLowerCase().includes(term)
      );
    });
  }, [projectMaterials, filterStatus, searchTerm]);

  // Quick Batch: Mark all filtered as Arrived
  const handleMarkAllFiltered = () => {
    const unreceived = filteredMaterials.filter((m) => !m.isReceived);
    if (unreceived.length === 0) return;
    unreceived.forEach((m) => {
      toggleMaterialReceived(m.id);
    });
    setSaveToast(`Ticked ${unreceived.length} items as Arrived`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Handle Save Inward to DB
  const handleSaveToDb = async () => {
    if (!activeProject) return;
    setIsSaving(true);
    setSaveToast(null);

    try {
      const currentReqs = projectRequirements.filter(
        (r) => (r.projectName || '').trim().toLowerCase() === activeProject.name.trim().toLowerCase()
      );
      if (currentReqs.length > 0) {
        await dbBulkUpsertRequirements(currentReqs);
      }

      logAudit?.(
        'Material Inward Status Verified (Mobile)',
        'Stores Inward',
        `${currentUser?.name || 'Ramesh Patel'} verified & saved arrival receipts (${arrivedCount}/${totalCount} Arrived) to DB for Project ${activeProject.name}`
      );

      // Trigger celebratory confetti on 100% arrival
      if (progressPct === 100 && totalCount > 0) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.7 },
        });
      }

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setSaveToast(`✅ Saved to DB at ${timeStr}`);
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between pb-28 font-sans select-none">
      
      {/* 1. TOP MOBILE HEADER */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-xl border-b border-slate-800 px-3.5 py-2.5 shadow-lg">
        <div className="flex items-center justify-between gap-2">
          
          {/* Logo & Role Title */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white font-black text-xs shadow-md shadow-emerald-900/40">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs font-black text-white tracking-tight">STORES INWARD</h1>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-mono font-bold">
                  LIVE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Arrival Verification Terminal</p>
            </div>
          </div>

          {/* User Badge & Logout */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-slate-800/90 border border-slate-700 text-[10px] font-mono font-bold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{currentUser?.name ? currentUser.name.split(' ')[0] : 'Ramesh'}</span>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700 transition-colors"
              title="Lock Screen / Log Out"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
            </button>
          </div>

        </div>
      </header>

      {/* 2. PROJECT SELECTOR & LIVE ARRIVAL PROGRESS */}
      <section className="p-3 space-y-2.5 bg-slate-900/60 border-b border-slate-800">
        
        {/* Project Selector Dropdown */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Boxes className="w-3 h-3 text-emerald-400" /> Project:
            </span>
            <span className="text-slate-300 font-mono">
              PO: {activeProject?.poNo || activeProject?.poNumber || '36'}
            </span>
          </div>

          <div className="relative">
            <select
              value={selectedProjectName}
              onChange={(e) => {
                setSelectedProjectName(e.target.value);
                setSearchTerm('');
              }}
              className="w-full appearance-none bg-slate-800 border border-slate-700 text-white font-black text-xs rounded-xl px-3 py-2 pr-9 focus:outline-none focus:border-emerald-500 shadow-inner cursor-pointer"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name} • {p.machineType || p.machineName || 'Machine'}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Progress Strip */}
        <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Arrivals: <strong className="text-white ml-0.5">{arrivedCount} / {totalCount}</strong>
            </span>
            <span className="font-mono text-emerald-300 font-black text-xs">
              {progressPct}%
            </span>
          </div>

          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-700/80">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                progressPct === 100
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                  : 'bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-400'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

      </section>

      {/* 3. SEARCH & QUICK FILTER TABS */}
      <section className="px-3 pt-2.5 pb-1 space-y-2">
        
        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search size (e.g. 80 x 6), vendor, or part name..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8.5 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs px-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center justify-between gap-1.5">
          <div className="grid grid-cols-3 gap-1 flex-1 p-0.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] font-bold text-center">
            <button
              type="button"
              onClick={() => setFilterStatus('ALL')}
              className={`py-1 rounded-lg transition-all ${
                filterStatus === 'ALL'
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('PENDING')}
              className={`py-1 rounded-lg transition-all ${
                filterStatus === 'PENDING'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-xs'
                  : 'text-slate-400'
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('ARRIVED')}
              className={`py-1 rounded-lg transition-all ${
                filterStatus === 'ARRIVED'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-xs'
                  : 'text-slate-400'
              }`}
            >
              Arrived ({arrivedCount})
            </button>
          </div>

          {pendingCount > 0 && filterStatus !== 'ARRIVED' && (
            <button
              type="button"
              onClick={handleMarkAllFiltered}
              className="px-2.5 py-1 rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold shrink-0 transition-all active:scale-95 cursor-pointer"
            >
              Tick All
            </button>
          )}
        </div>

      </section>

      {/* 4. MATERIAL CARDS LIST (GREEN TICK TOUCH TARGETS) */}
      <main className="px-3 py-2 space-y-2.5 flex-1 overflow-y-auto">
        {filteredMaterials.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/40 rounded-2xl border border-slate-800 space-y-2">
            <PackageCheck className="w-8 h-8 text-slate-500 mx-auto" />
            <h4 className="text-xs font-bold text-slate-300">No matching materials found</h4>
            <p className="text-[11px] text-slate-400">Try changing the filter or search term above.</p>
          </div>
        ) : (
          filteredMaterials.map((m, idx) => {
            const isArrived = Boolean(m.isReceived);

            return (
              <div
                key={m.id || idx}
                onClick={() => toggleMaterialReceived(m.id)}
                className={`rounded-2xl p-3 border transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer active:scale-[0.99] ${
                  isArrived
                    ? 'bg-emerald-950/25 border-emerald-500/40 shadow-sm ring-1 ring-emerald-500/20'
                    : 'bg-slate-900/90 hover:bg-slate-900 border-slate-800 shadow-md'
                }`}
              >
                {/* Left Side: Specs & Component Details */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  
                  {/* Top Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-slate-400 font-mono font-bold">#{idx + 1}</span>
                    <span className="px-1.5 py-0.2 rounded bg-blue-500/15 border border-blue-500/30 text-blue-300 text-[10px] font-mono font-bold">
                      {m.materialType || 'SS Flat'}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-purple-500/15 border border-purple-500/30 text-purple-300 text-[10px] font-mono font-bold">
                      {m.machineName || m.machineType || activeProject?.machineType || '16 HD'}
                    </span>
                  </div>

                  {/* Large Size Specification */}
                  <div className="text-sm font-black text-white font-mono tracking-wide">
                    {m.sizeSpecs}
                  </div>

                  {/* Description */}
                  <p className="text-xs font-semibold text-slate-300 truncate">
                    {m.description}
                  </p>

                  {/* Quantity & Vendor Strip */}
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-0.5">
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 font-mono font-black text-emerald-300 text-xs">
                      {m.quantity} {m.unit || 'Nos'}
                    </span>
                    <span className="truncate">
                      Vendor: <strong className="text-amber-300 font-medium">{m.vendorName || m.vendor || activeProject?.vendor || 'Manav Metal'}</strong>
                    </span>
                  </div>

                </div>

                {/* Right Side: GREEN TICK BUTTON (DIRECT 1-TAP CHECKBOX) */}
                <div className="shrink-0 flex flex-col items-center justify-center pl-1">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 shadow-md ${
                      isArrived
                        ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 shadow-emerald-500/30 scale-105'
                        : 'bg-slate-800 hover:bg-slate-750 border-2 border-slate-700 hover:border-emerald-500/60 text-slate-500'
                    }`}
                  >
                    {isArrived ? (
                      <Check className="w-7 h-7 stroke-[3.5] text-slate-950" />
                    ) : (
                      <div className="w-5 h-5 rounded-lg border-2 border-slate-600" />
                    )}
                  </div>

                  {/* Verification Stamp info */}
                  {isArrived && (
                    <div className="text-[9px] text-emerald-400 font-mono font-bold text-center mt-1">
                      [{m.receivedByInitials || 'RP'}]
                    </div>
                  )}
                </div>

              </div>
            );
          })
        )}
      </main>

      {/* 5. FLOATING BOTTOM BAR: SAVE TO DB ACTION */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 p-3 shadow-2xl">
        <div className="max-w-md mx-auto space-y-1.5">
          
          {saveToast && (
            <div className="p-2 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-xs font-mono font-bold text-center animate-fadeIn shadow-lg">
              {saveToast}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveToDb}
              disabled={isSaving}
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-lg shadow-emerald-950 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 text-emerald-200" />
                  <span>Save</span>
                </>
              )}
            </button>
          </div>

          <div className="text-center text-[10px] text-slate-400 font-mono">
            <span>Inspector: {currentUser?.name || 'Ramesh Patel'} • RSB Material Inward</span>
          </div>

        </div>
      </footer>

    </div>
  );
};
