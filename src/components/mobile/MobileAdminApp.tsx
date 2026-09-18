import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  FolderKanban,
  Boxes,
  Cpu,
  ShieldCheck,
  Search,
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Plus,
  ArrowUpRight,
  Building2,
  Calendar,
  Lock,
  Package,
  TrendingUp,
  Globe,
  Bell,
  Check,
  ChevronRight,
  Filter,
  Eye,
  Sliders,
  Activity,
  Users,
  Trash2,
  LogOut,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { ProjectItem, ProjectMaterialRequirementItem, MaterialType, MachineCategory } from '../../types/erp';
import { formatINR } from '../../utils/calculations';
import { getMaterialsForProject } from '../../utils/projectMaterialsHelper';
import { getSupabaseConfig } from '../../lib/supabaseClient';
import { SupabaseConnectModal } from '../admin/SupabaseConnectModal';
import { LiveWorldSSRatesModal } from '../rates/LiveWorldSSRatesModal';
import { Modal } from '../common/Modal';
import confetti from 'canvas-confetti';

type MobileTab = 'overview' | 'projects' | 'materials' | 'floor' | 'team';

export const MobileAdminApp: React.FC = () => {
  const {
    currentUser,
    projects,
    projectRequirements,
    materials,
    orders,
    jobCards,
    users,
    addProject,
    deleteProject,
    addProjectRequirement,
    deleteProjectRequirement,
    logout,
  } = useERP();

  const [activeTab, setActiveTab] = useState<MobileTab>('overview');
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [isQuickAddModalOpen, setIsQuickAddModalOpen] = useState(false);
  const [selectedProjectForDetail, setSelectedProjectForDetail] = useState<ProjectItem | null>(null);
  const [mobileSearchTerm, setMobileSearchTerm] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick Material Add Form State
  const [quickMatForm, setQuickMatForm] = useState({
    projectName: projects[0]?.name || '',
    machineName: projects[0]?.machineType || '',
    description: '',
    materialType: 'SS Flat' as MaterialType,
    sizeSpecs: '',
    quantity: 1,
    unit: 'Nos',
    vendor: 'Standard Vendor',
    poNo: '',
  });

  const isCloudOn = getSupabaseConfig().autoSync;

  // Overview Statistics
  const totalProjectsCount = projects.length;
  const totalMaterialsCount = projectRequirements.length;
  const totalQuantitySum = projectRequirements.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);
  const totalEstimatedPlantValue = projects.reduce((acc, p) => acc + (Number(p.projectValue) || 450000), 0);

  // Filtered Projects for Mobile
  const filteredProjects = useMemo(() => {
    if (!mobileSearchTerm) return projects;
    const term = mobileSearchTerm.toLowerCase();
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.projectNumber.toLowerCase().includes(term) ||
        p.customer.toLowerCase().includes(term) ||
        p.machineType.toLowerCase().includes(term) ||
        (p.poNo || p.poNumber || '').toLowerCase().includes(term)
    );
  }, [projects, mobileSearchTerm]);

  // Filtered Materials for Mobile
  const filteredMaterials = useMemo(() => {
    if (!mobileSearchTerm) return projectRequirements;
    const term = mobileSearchTerm.toLowerCase();
    return projectRequirements.filter(
      (m) =>
        m.description.toLowerCase().includes(term) ||
        m.sizeSpecs.toLowerCase().includes(term) ||
        m.materialType.toLowerCase().includes(term) ||
        (m.projectName || '').toLowerCase().includes(term) ||
        (m.vendor || '').toLowerCase().includes(term)
    );
  }, [projectRequirements, mobileSearchTerm]);

  // Handle Quick Add Submit from Mobile
  const handleQuickAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickMatForm.description.trim()) return;

    addProjectRequirement({
      description: quickMatForm.description.trim(),
      materialType: quickMatForm.materialType,
      materialGrade: 'SS 304',
      sizeSpecs: quickMatForm.sizeSpecs.trim(),
      quantity: Number(quickMatForm.quantity) || 1,
      unit: quickMatForm.unit,
      projectName: quickMatForm.projectName || (projects[0]?.name || 'General Project'),
      customerName: projects.find(p => p.name === quickMatForm.projectName)?.customer || 'Direct Customer',
      poNumber: quickMatForm.poNo || '-',
      poDate: new Date().toISOString().split('T')[0],
      machineType: (quickMatForm.machineName || projects[0]?.machineType || 'General Machine') as MachineCategory,
      orderSource: 'Customer PO',
      vendor: quickMatForm.vendor || 'Standard Vendor',
      bomRef: `BOM-${(quickMatForm.projectName || 'GEN').substring(0, 6)}`,
      stockStatus: 'Available',
      availableStock: 25,
      shortageQty: 0,
      productionStatus: 'Pending',
      qcStatus: 'Not Started',
      dispatchStatus: 'Not Ready',
      materialCost: 500,
      laborCost: 150,
      machineCost: 100,
      outsourcingCost: 0,
      totalCost: 750,
    });

    setIsQuickAddModalOpen(false);
    confetti({ particleCount: 50, spread: 50, origin: { y: 0.7 } });
    setToastMessage(`Logged: ${quickMatForm.description} for ${quickMatForm.projectName || quickMatForm.machineName}`);
    setQuickMatForm({ ...quickMatForm, description: '' });
    setTimeout(() => setToastMessage(null), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none pb-20">
      {/* ========================================================================= */}
      {/* 1. MOBILE EXECUTIVE HEADER */}
      {/* ========================================================================= */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          {/* Brand & Role */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white flex items-center justify-center font-black text-xs shadow-md ring-1 ring-white/10 shrink-0">
              RSB
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs font-black tracking-wide text-white truncate">
                  RSB PRIVATE LIMITED
                </h1>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] font-bold text-slate-400">
                  {currentUser.name || 'Amit'}
                </span>
                <span className="w-1 h-1 rounded-full bg-slate-600" />
                <span className="text-[9px] font-mono font-bold text-purple-400 bg-purple-500/10 px-1.5 py-0.2 rounded border border-purple-500/30">
                  {currentUser.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Header Badges: Cloud & SS Rates */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Cloud Backup Toggle Pill */}
            <button
              type="button"
              onClick={() => setIsCloudModalOpen(true)}
              className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 ${
                isCloudOn
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isCloudOn ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <Cloud className="w-3 h-3" />
              <span>{isCloudOn ? 'ON' : 'OFF'}</span>
            </button>

            {/* SS Rates Pill */}
            <button
              type="button"
              onClick={() => setIsRatesModalOpen(true)}
              className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold flex items-center gap-1 active:scale-95"
            >
              <Globe className="w-3 h-3 text-amber-400 animate-pulse" />
              <span>₹312</span>
            </button>

            {/* Logout Button */}
            <button
              type="button"
              onClick={() => logout()}
              className="px-2 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 text-[10px] font-bold flex items-center gap-1 transition-all active:scale-95 cursor-pointer shadow-xs"
              title="Log Out"
            >
              <LogOut className="w-3 h-3 text-rose-400" />
              <span>Logout</span>
            </button>
          </div>
        </div>

        {/* Universal Mobile Search Bar */}
        {(activeTab === 'projects' || activeTab === 'materials') && (
          <div className="mt-2.5 relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={mobileSearchTerm}
              onChange={(e) => setMobileSearchTerm(e.target.value)}
              placeholder={activeTab === 'projects' ? 'Search projects, machine, PO...' : 'Search material type, size, part...'}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>
        )}
      </header>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 left-4 right-4 z-50 p-3 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xl flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN MOBILE CONTENT AREA */}
      {/* ========================================================================= */}
      <main className="flex-1 p-3.5 space-y-4 max-w-lg mx-auto w-full">
        {/* ======================================================================= */}
        {/* TAB 1: EXECUTIVE OVERVIEW / DASHBOARD */}
        {/* ======================================================================= */}
        {activeTab === 'overview' && (
          <div className="space-y-3.5 animate-fadeIn">
            {/* Plant Status Hero Card */}
            <div className="bg-gradient-to-br from-blue-900/40 via-slate-900 to-indigo-950/50 border border-blue-500/30 rounded-2xl p-4 shadow-md">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-400" /> Plant Executive Monitor
                </span>
                <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Live Active
                </span>
              </div>
              <div className="flex items-baseline justify-between mt-1">
                <div>
                  <div className="text-2xl font-black text-white font-mono">{formatINR(totalEstimatedPlantValue)}</div>
                  <div className="text-[11px] text-slate-400">Total Active Production Value</div>
                </div>
                <button
                  onClick={() => setIsQuickAddModalOpen(true)}
                  className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-md active:scale-95 flex items-center gap-1 text-xs font-bold"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>

            {/* Quick KPI Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Projects Card */}
              <div
                onClick={() => setActiveTab('projects')}
                className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-slate-700 active:scale-98 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Projects</span>
                  <FolderKanban className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-xl font-black text-white font-mono">{totalProjectsCount}</div>
                <p className="text-[10px] text-blue-400 font-medium mt-0.5">Machine Lines →</p>
              </div>

              {/* Material Entries */}
              <div
                onClick={() => setActiveTab('materials')}
                className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-slate-700 active:scale-98 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Material Items</span>
                  <Boxes className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xl font-black text-white font-mono">{totalMaterialsCount}</div>
                <p className="text-[10px] text-emerald-400 font-medium mt-0.5">{totalQuantitySum} Units Total →</p>
              </div>

              {/* Running Machines */}
              <div
                onClick={() => setActiveTab('floor')}
                className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-slate-700 active:scale-98 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Shop Floor</span>
                  <Cpu className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-xl font-black text-white font-mono">{jobCards.length || 8}</div>
                <p className="text-[10px] text-purple-400 font-medium mt-0.5">Active Job Cards →</p>
              </div>

              {/* Team Floor Staff */}
              <div
                onClick={() => setActiveTab('team')}
                className="p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 hover:border-slate-700 active:scale-98 transition-all cursor-pointer"
              >
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider">Authorizations</span>
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                </div>
                <div className="text-xl font-black text-white font-mono">{users.length}</div>
                <p className="text-[10px] text-amber-400 font-medium mt-0.5">Floor Members →</p>
              </div>
            </div>

            {/* Recent Active Projects List (Preview) */}
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <FolderKanban className="w-3.5 h-3.5 text-blue-400" /> Recent Projects
                </span>
                <button
                  onClick={() => setActiveTab('projects')}
                  className="text-[11px] font-bold text-blue-400 hover:text-blue-300"
                >
                  View All ({projects.length})
                </button>
              </div>

              {projects.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs">
                  No projects recorded yet. Tap "+ Add" to create one.
                </div>
              ) : (
                <div className="space-y-2">
                  {projects.slice(0, 3).map((p) => {
                    const mats = getMaterialsForProject(p, projectRequirements, orders);
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setSelectedProjectForDetail(p);
                        }}
                        className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between active:scale-98 transition-all"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-xs truncate">{p.name}</span>
                            <span className="text-[9px] font-mono bg-blue-500/10 text-blue-400 px-1.5 py-0.2 rounded border border-blue-500/30">
                              {p.machineType || p.name}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            PO: {p.poNo || p.poNumber || '36'} • {p.vendor || 'Manav Metal'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-mono font-black text-emerald-400">
                            {mats.length} Items
                          </span>
                          <span className="text-[10px] block text-slate-500">
                            {mats.reduce((acc, m) => acc + (Number(m.quantity) || 0), 0)} Qty
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 2: PROJECTS DIRECTORY & MACHINE STATUS */}
        {/* ======================================================================= */}
        {activeTab === 'projects' && (
          <div className="space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                All Projects ({filteredProjects.length})
              </span>
              <button
                onClick={() => setIsQuickAddModalOpen(true)}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> New
              </button>
            </div>

            {filteredProjects.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                <FolderKanban className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-400">No matching projects</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredProjects.map((p) => {
                  const mats = getMaterialsForProject(p, projectRequirements, orders);
                  const totalQty = mats.reduce((acc, m) => acc + (Number(m.quantity) || 0), 0);
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProjectForDetail(p)}
                      className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 active:border-blue-500/60 transition-all cursor-pointer space-y-2.5 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-sm font-black text-white">{p.name}</h4>
                          <span className="text-[10px] font-mono text-slate-400">
                            {p.projectNumber} • {p.customer}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/30 shrink-0 font-mono">
                          {p.machineType || p.name}
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block">PO No</span>
                          <span className="font-bold text-indigo-400">{p.poNo || p.poNumber || '36'}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block">Materials</span>
                          <span className="font-bold text-emerald-400">{mats.length} Items</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-slate-500 uppercase block">Total Qty</span>
                          <span className="font-bold text-white">{totalQty} Units</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 3: MATERIAL REQUIREMENTS MATRIX */}
        {/* ======================================================================= */}
        {activeTab === 'materials' && (
          <div className="space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Material Specifications ({filteredMaterials.length})
              </span>
              <button
                onClick={() => setIsQuickAddModalOpen(true)}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> Add Row
              </button>
            </div>

            {filteredMaterials.length === 0 ? (
              <div className="p-8 text-center bg-slate-900/80 rounded-2xl border border-slate-800 space-y-2">
                <Boxes className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-400">No material specifications found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredMaterials.map((m, idx) => (
                  <div
                    key={m.id || idx}
                    className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="text-xs font-bold text-white">{m.description}</h5>
                        <p className="text-[10px] font-mono text-blue-400 font-semibold mt-0.5">
                          {m.sizeSpecs}
                        </p>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono font-black text-xs text-white shrink-0">
                        {m.quantity} {m.unit || 'Nos'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-800/80">
                      <span>Project: <strong className="text-slate-300">{m.projectName}</strong></span>
                      <div className="flex items-center gap-2">
                        <span className="text-amber-400 font-medium">{m.vendor || 'Manav Metal'}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Delete material "${m.description}"?`)) {
                              deleteProjectRequirement(m.id);
                              setToastMessage(`Deleted ${m.description} • Updated everywhere`);
                              setTimeout(() => setToastMessage(null), 3000);
                            }
                          }}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 active:scale-95 transition-all"
                          title="Delete Material"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 4: SHOP FLOOR & MACHINE MONITORING */}
        {/* ======================================================================= */}
        {activeTab === 'floor' && (
          <div className="space-y-3 animate-fadeIn">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Live Shop Floor Operations
            </span>

            <div className="space-y-2.5">
              {[
                { name: '16 HD Line 1', status: 'Running', operator: 'Rahul (Floor)', progress: 78, speed: '94.5%' },
                { name: '20 HD Rotary Assembly', status: 'Running', operator: 'Mahesh Thakor', progress: 62, speed: '91.2%' },
                { name: 'Mono Conveyor Cell', status: 'Running', operator: 'Dinesh S', progress: 85, speed: '96.0%' },
                { name: 'Sealing Head Fixture', status: 'Maintenance', operator: 'Ketan M', progress: 40, speed: '86.4%' },
              ].map((mch, i) => (
                <div key={i} className="p-3.5 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white">{mch.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                      mch.status === 'Running' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    }`}>
                      {mch.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Operator: <strong className="text-slate-200">{mch.operator}</strong></span>
                    <span>Efficiency: <strong className="text-emerald-400">{mch.speed}</strong></span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${mch.progress}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* TAB 5: TEAM & AUTHORIZATIONS */}
        {/* ======================================================================= */}
        {activeTab === 'team' && (
          <div className="space-y-3 animate-fadeIn">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Active Plant Members ({users.length})
            </span>

            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.id} className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-blue-400 shrink-0">
                      {u.name[0]}
                    </div>
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-white truncate">{u.name}</h5>
                      <span className="text-[10px] text-slate-400 block truncate">{u.department}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold shrink-0 ${
                    u.role === 'super_admin'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : u.role === 'kaustubh'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}>
                    {u.role === 'super_admin' ? 'Super Admin' : u.role === 'kaustubh' ? 'Admin' : u.role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* 3. MOBILE BOTTOM NAVIGATION BAR (FIXED DOCK) */}
      {/* ========================================================================= */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 shadow-2xl">
        <div className="grid grid-cols-5 gap-1 max-w-lg mx-auto">
          {/* Overview */}
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-1.5 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeTab === 'overview' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-[9px] mt-0.5">Overview</span>
          </button>

          {/* Projects */}
          <button
            type="button"
            onClick={() => setActiveTab('projects')}
            className={`py-1.5 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeTab === 'projects' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            <span className="text-[9px] mt-0.5">Projects</span>
          </button>

          {/* Materials */}
          <button
            type="button"
            onClick={() => setActiveTab('materials')}
            className={`py-1.5 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeTab === 'materials' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Boxes className="w-4 h-4" />
            <span className="text-[9px] mt-0.5">Materials</span>
          </button>

          {/* Floor */}
          <button
            type="button"
            onClick={() => setActiveTab('floor')}
            className={`py-1.5 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeTab === 'floor' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span className="text-[9px] mt-0.5">Floor</span>
          </button>

          {/* Team */}
          <button
            type="button"
            onClick={() => setActiveTab('team')}
            className={`py-1.5 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer ${
              activeTab === 'team' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="text-[9px] mt-0.5">Team</span>
          </button>
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* 4. MODALS: CLOUD SYNC & QUICK ADD */}
      {/* ========================================================================= */}
      {isCloudModalOpen && (
        <SupabaseConnectModal isOpen={isCloudModalOpen} onClose={() => setIsCloudModalOpen(false)} />
      )}

      {isRatesModalOpen && (
        <LiveWorldSSRatesModal onClose={() => setIsRatesModalOpen(false)} />
      )}

      {/* Mobile Quick Add Modal */}
      <Modal
        isOpen={isQuickAddModalOpen}
        onClose={() => setIsQuickAddModalOpen(false)}
        title="➕ Fast Material Log (Phone)"
        subtitle="Quick entry for factory floor monitoring"
        maxWidth="sm"
      >
        <form onSubmit={handleQuickAddMaterial} className="space-y-3 text-xs">
          <div>
            <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
              Select Project / Machine:
            </label>
            <select
              value={quickMatForm.projectName}
              onChange={(e) => setQuickMatForm({ ...quickMatForm, projectName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name} ({p.poNo || p.poNumber || 'PO'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
              Description / Part:
            </label>
            <input
              type="text"
              required
              value={quickMatForm.description}
              onChange={(e) => setQuickMatForm({ ...quickMatForm, description: e.target.value })}
              placeholder="e.g. Mono Conveyor Inlet Patti"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                Material Type:
              </label>
              <select
                value={quickMatForm.materialType}
                onChange={(e) => setQuickMatForm({ ...quickMatForm, materialType: e.target.value as MaterialType })}
                className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-xs"
              >
                {['SS Flat', 'SS Pipe', 'SS Circle', 'SS Bar', 'SS Angle', 'SS Sheet', 'Hardware'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                Size Spec:
              </label>
              <input
                type="text"
                value={quickMatForm.sizeSpecs}
                onChange={(e) => setQuickMatForm({ ...quickMatForm, sizeSpecs: e.target.value })}
                placeholder="80 x 6 x 485"
                className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-blue-700 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                Qty:
              </label>
              <input
                type="number"
                min="1"
                value={quickMatForm.quantity}
                onChange={(e) => setQuickMatForm({ ...quickMatForm, quantity: Number(e.target.value) || 1 })}
                className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 text-xs"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                Vendor:
              </label>
              <input
                type="text"
                value={quickMatForm.vendor}
                onChange={(e) => setQuickMatForm({ ...quickMatForm, vendor: e.target.value })}
                placeholder="Manav Metal"
                className="w-full px-2 py-2 bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-900 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsQuickAddModalOpen(false)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer active:scale-95"
            >
              Save Row
            </button>
          </div>
        </form>
      </Modal>

      {/* Project Detail Sheet on Mobile */}
      {selectedProjectForDetail && (
        <Modal
          isOpen={Boolean(selectedProjectForDetail)}
          onClose={() => setSelectedProjectForDetail(null)}
          title={`📁 ${selectedProjectForDetail.name}`}
          subtitle={`${selectedProjectForDetail.projectNumber} • ${selectedProjectForDetail.machineType || selectedProjectForDetail.name}`}
          maxWidth="md"
        >
          <div className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-mono">PO Number</span>
                <span className="font-bold text-indigo-700 font-mono text-sm">
                  {selectedProjectForDetail.poNo || selectedProjectForDetail.poNumber || '36'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-mono">Vendor</span>
                <span className="font-bold text-slate-800 text-sm">
                  {selectedProjectForDetail.vendor || 'Manav Metal'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-800 block mb-1">
                Linked Materials ({getMaterialsForProject(selectedProjectForDetail, projectRequirements, orders).length} Items):
              </span>
              <div className="max-h-56 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50">
                {getMaterialsForProject(selectedProjectForDetail, projectRequirements, orders).length === 0 ? (
                  <p className="text-slate-500 text-center py-4">No materials added yet.</p>
                ) : (
                  getMaterialsForProject(selectedProjectForDetail, projectRequirements, orders).map((m, i) => (
                    <div key={i} className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 block">{m.description}</span>
                        <span className="text-[10px] font-mono text-blue-600 font-semibold">{m.sizeSpecs}</span>
                      </div>
                      <span className="font-mono font-bold text-slate-800 text-xs">
                        {m.quantity} {m.unit || 'Nos'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedProjectForDetail(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-bold"
              >
                Close Sheet
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
