import React, { useState, useMemo } from 'react';
import {
  PackageCheck,
  Search,
  CheckCircle2,
  Clock,
  Building2,
  Layers,
  Lock,
  LogOut,
  RefreshCw,
  Sparkles,
  Check,
  ChevronDown,
  Database,
  Truck,
  Boxes,
  Calendar,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { ProjectItem, ProjectMaterialRequirementItem, MaterialType } from '../../types/erp';
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
    return projects[0]?.name || 'FOHA';
  });

  const activeProject = useMemo(() => {
    return projects.find((p) => p.name === selectedProjectName) || projects[0] || null;
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

  // Handle Save Inward to DB
  const handleSaveToDb = async () => {
    if (!activeProject) return;
    setIsSaving(true);
    setSaveToast(null);

    try {
      const currentReqs = projectRequirements.filter(
        (r) => (r.projectName || '').toLowerCase() === activeProject.name.toLowerCase()
      );
      if (currentReqs.length > 0) {
        await dbBulkUpsertRequirements(currentReqs);
      }

      logAudit?.(
        'Material Inward Status Verified (Mobile)',
        'Stores Inward',
        `${currentUser?.name || 'Ramesh Patel'} verified & synced arrival receipts (${arrivedCount}/${totalCount} Arrived) to DB for Project ${activeProject.name}`
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
      setSaveToast(`✅ Successfully saved & synced to DB at ${timeStr}`);
      setTimeout(() => {
        setSaveToast(null);
      }, 4000);
    } catch (err) {
      console.error('Error saving to DB from mobile:', err);
    } finally {
      setTimeout(() => {
        setIsSaving(false);
      }, 350);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between pb-24 font-sans select-none">
      
      {/* 1. TOP MOBILE HEADER */}
      <header className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-emerald-900/40">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-black text-white tracking-tight">STORES INWARD (आवक)</h1>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-mono font-bold">
                  MOBILE
                </span>
              </div>
              <p className="text-[10px] text-slate-400">Vendor Material Receiving Terminal</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-mono font-bold text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>[RP] Ramesh</span>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-300 border border-slate-700 transition-colors"
              title="Lock Screen / Log Out"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
            </button>
          </div>
        </div>
      </header>

      {/* 2. PROJECT SELECTOR & PROGRESS BANNER */}
      <section className="p-3.5 space-y-3 bg-slate-950/40 border-b border-slate-800">
        
        {/* Project Selector Dropdown */}
        <div className="space-y-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <Boxes className="w-3 h-3 text-blue-400" /> Select Active Project:
          </label>
          <div className="relative">
            <select
              value={selectedProjectName}
              onChange={(e) => {
                setSelectedProjectName(e.target.value);
                setSearchTerm('');
              }}
              className="w-full appearance-none bg-slate-800 border border-slate-700 text-white font-black text-sm rounded-xl px-3.5 py-2.5 pr-10 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 shadow-inner cursor-pointer"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name} • {p.machineType || p.machineName || 'Machine'} (PO: {p.poNo || p.poNumber || 'PO'})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Horizontal Project Quick Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {projects.map((p) => {
            const isSelected = p.name === selectedProjectName;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelectedProjectName(p.name);
                  setSearchTerm('');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1 border ${
                  isSelected
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-750'
                }`}
              >
                <span>{p.name}</span>
                {isSelected && <Check className="w-3 h-3 text-white" />}
              </button>
            );
          })}
        </div>

        {/* Project Metrics & Live Arrival Progress Bar */}
        {activeProject && (
          <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-850 border border-slate-700/80 shadow-md space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 font-medium block">Client / Customer</span>
                <strong className="text-white text-xs font-bold truncate">
                  {activeProject.customer || activeProject.clientName || 'Cadila Healthcare Ltd'}
                </strong>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 font-medium block">PO Number</span>
                <strong className="text-blue-400 font-mono text-xs">
                  {activeProject.poNo || activeProject.poNumber || '36'}
                </strong>
              </div>
            </div>

            {/* Arrival Progress Bar */}
            <div className="space-y-1 pt-1 border-t border-slate-700/60">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                  <PackageCheck className="w-3.5 h-3.5" />
                  Material Arrival Status:
                </span>
                <span className="font-mono text-white text-xs">
                  {arrivedCount} / {totalCount} Items ({progressPct}%)
                </span>
              </div>

              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-700">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    progressPct === 100
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : 'bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500'
                  }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 3. SEARCH & QUICK FILTER TABS */}
      <section className="p-3.5 space-y-2.5">
        
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search size (e.g. 80 x 6), vendor, or part name..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs px-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-950/80 border border-slate-800 text-xs font-bold text-center">
          <button
            type="button"
            onClick={() => setFilterStatus('ALL')}
            className={`py-1.5 rounded-lg transition-all ${
              filterStatus === 'ALL'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('PENDING')}
            className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
              filterStatus === 'PENDING'
                ? 'bg-amber-600/30 text-amber-300 border border-amber-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Pending</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-400 text-[10px] font-mono">
              {pendingCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilterStatus('ARRIVED')}
            className={`py-1.5 rounded-lg transition-all flex items-center justify-center gap-1 ${
              filterStatus === 'ARRIVED'
                ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Arrived</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-400 text-[10px] font-mono">
              {arrivedCount}
            </span>
          </button>
        </div>
      </section>

      {/* 4. MATERIAL CARDS LIST (LARGE TOUCH TARGETS) */}
      <main className="px-3.5 space-y-3 flex-1 overflow-y-auto">
        
        {filteredMaterials.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800 space-y-2">
            <PackageCheck className="w-10 h-10 text-slate-500 mx-auto" />
            <h4 className="text-sm font-bold text-slate-300">No matching materials found</h4>
            <p className="text-xs text-slate-400">Try changing the filter or search term above.</p>
          </div>
        ) : (
          filteredMaterials.map((m, idx) => {
            const isArrived = Boolean(m.isReceived);

            return (
              <div
                key={m.id || idx}
                className={`rounded-2xl p-4 border transition-all duration-150 space-y-3 ${
                  isArrived
                    ? 'bg-emerald-950/20 border-emerald-500/30 shadow-sm'
                    : 'bg-slate-800/90 border-slate-700/80 shadow-md'
                }`}
              >
                {/* Header: Type Tag, Quantity & Sr No */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-300 text-[10px] font-bold font-mono">
                      {m.materialType || 'SS Flat'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-mono">
                      {m.machineName || m.machineType || activeProject?.machineType || '16 HD'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">#{idx + 1}</span>
                  </div>

                  <div className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono font-black text-xs">
                    {m.quantity} {m.unit || 'Nos'}
                  </div>
                </div>

                {/* Size Specification (Large & Bold) */}
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Size Specification:</span>
                  <div className="text-base font-black text-blue-400 font-mono tracking-wide">
                    {m.sizeSpecs}
                  </div>
                </div>

                {/* Description & Vendor Info */}
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-slate-200 leading-snug">
                    {m.description}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-700/50">
                    <span>Vendor: <strong className="text-amber-300">{m.vendorName || m.vendor || activeProject?.vendor || 'Manav Metal'}</strong></span>
                    <span>PO: <strong className="text-slate-300 font-mono">{m.poNo || m.poNumber || activeProject?.poNo || '36'}</strong></span>
                  </div>
                </div>

                {/* BIG INTERACTIVE TOGGLE BUTTON */}
                <button
                  type="button"
                  onClick={() => toggleMaterialReceived(m.id)}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 shadow-md ${
                    isArrived
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border border-emerald-400/40 shadow-emerald-900/30'
                      : 'bg-slate-700/80 hover:bg-slate-700 text-slate-200 border border-slate-600/80 hover:border-emerald-500'
                  }`}
                >
                  {isArrived ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>ARRIVED • Verified by [{m.receivedByInitials || 'RP'}]</span>
                    </>
                  ) : (
                    <>
                      <span className="w-3 h-3 rounded-full border-2 border-slate-400" />
                      <span>TAP TO MARK ARRIVED (आवक)</span>
                    </>
                  )}
                </button>

                {/* Timestamp & Verifier Details */}
                {isArrived && (
                  <div className="text-[10px] text-emerald-400/90 font-mono text-center flex items-center justify-center gap-1.5 pt-0.5">
                    <Clock className="w-3 h-3 text-emerald-400" />
                    <span>Stamped: {m.receivedAt ? new Date(m.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}</span>
                    <span>•</span>
                    <span>{m.receivedBy || 'Ramesh Patel'}</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>

      {/* 5. FLOATING BOTTOM BAR: SAVE TO DB ACTION */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 p-3 shadow-2xl">
        <div className="max-w-md mx-auto space-y-2">
          
          {saveToast && (
            <div className="p-2 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-mono font-bold text-center animate-fadeIn">
              {saveToast}
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveToDb}
              disabled={isSaving}
              className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer disabled:opacity-50"
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
            <span>Inspector: {currentUser?.name || 'Ramesh Patel'} • RSB Machinery Inward</span>
          </div>
        </div>
      </footer>

    </div>
  );
};
