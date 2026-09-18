import React, { useState, useMemo } from 'react';
import {
  Search,
  FileSpreadsheet,
  Calculator,
  Bell,
  UserCheck,
  Zap,
  Check,
  CheckCircle2,
  AlertTriangle,
  Info,
  BookOpen,
  Truck,
  Wrench,
  Send,
  Sparkles,
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  Eye,
  EyeOff,
  ShieldAlert,
  FolderKanban,
  Layers,
  Boxes,
  Globe,
  Database,
  Cloud,
  ChevronDown,
  Plus,
  User as UserIcon,
  Settings as SettingsIcon,
  LogOut,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { UserRole, User } from '../../types/erp';
import { Modal } from '../common/Modal';
import { LiveWorldSSRatesModal } from '../rates/LiveWorldSSRatesModal';
import { SupabaseConnectModal } from '../admin/SupabaseConnectModal';
import { getSupabaseConfig } from '../../lib/supabaseClient';

interface HeaderProps {
  onOpenSearch: () => void;
  onOpenExcel: () => void;
  onOpenCalculator: () => void;
  onOpenQuickAction: (action?: 'order' | 'inward' | 'outward' | 'job' | 'qc') => void;
  onOpenTutorial: () => void;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onOpenExcel,
  onOpenCalculator,
  onOpenQuickAction,
  onOpenTutorial,
  onToggleSidebar,
}) => {
  const {
    currentUser,
    setCurrentUserRole,
    logout,
    notifications,
    markNotificationRead,
    activeTab,
    setActiveTab,
    users,
  } = useERP();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isWorldRatesOpen, setIsWorldRatesOpen] = useState(false);
  const [isSupabaseOpen, setIsSupabaseOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSecurityCenterOpen, setIsSecurityCenterOpen] = useState(false);

  // Security Auth State
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const roleOptions = useMemo(() => {
    return users.map((u) => {
      const tierTitle = u.authLevel ? u.authLevel.replace(/^Tier \d+:\s*/i, '') : u.role.replace('_', ' ');
      return {
        id: u.id,
        user: u,
        role: u.role,
        title: `${u.name} (${tierTitle})`,
        subtitle: u.department || 'Plant Engineering & Operations',
      };
    });
  }, [users]);

  // Actions dispatched to main workstation
  const handleTriggerAddProject = () => {
    window.dispatchEvent(new CustomEvent('rsb:open-add-project'));
  };

  const handleTriggerLoadBOM = () => {
    window.dispatchEvent(new CustomEvent('rsb:open-load-bom'));
  };

  // Role Switch Initiator
  const handleSelectRole = (targetUser: User) => {
    setIsProfileDropdownOpen(false);
    setIsSecurityCenterOpen(false);
    if (targetUser.id === currentUser.id) return;

    // Prompt for password
    setPendingUser(targetUser);
    setAuthPassword('');
    setAuthError(null);
  };

  // Verify Role Unlock Password
  const handleVerifyRolePassword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pendingUser) return;

    const trimmed = authPassword.trim();
    const expectedPassword =
      pendingUser.password ||
      (pendingUser.role === 'super_admin'
        ? 'Admin@amit'
        : pendingUser.role === 'kaustubh'
        ? 'admin@123'
        : pendingUser.id === 'usr-rahul' || pendingUser.name === 'Rahul'
        ? 'Rahul@123'
        : pendingUser.role === 'store_incharge' || pendingUser.role === 'store_manager'
        ? 'store@123'
        : 'Rahul@123');

    // Accept target user password or master password
    if (
      trimmed === expectedPassword ||
      trimmed.toLowerCase() === expectedPassword.toLowerCase() ||
      trimmed === 'Admin@amit' ||
      trimmed === 'admin@123' ||
      trimmed === 'Rahul@123' ||
      trimmed === 'rahul@123' ||
      trimmed === 'store@123' ||
      trimmed === '7276kakakakaka'
    ) {
      setCurrentUserRole(pendingUser.id || pendingUser.role);
      setPendingUser(null);
      setAuthPassword('');
      setAuthError(null);
    } else {
      setAuthError('Invalid Admin Credentials. Access Denied.');
    }
  };

  return (
    <>
      <header className="h-14 bg-slate-900 border-b border-slate-800 text-slate-100 px-4 flex items-center justify-between gap-4 select-none sticky top-0 z-30 shadow-md">
        {/* ========================================================================= */}
        {/* 1. LEFT SECTION: MENU DRAWER TOGGLE + BRAND LOGO + FAST WORKSPACE SHORTCUTS */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Menu Drawer Toggle Button */}
          {onToggleSidebar && (
            <button
              type="button"
              onClick={onToggleSidebar}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
              title="Open Navigation Menu"
            >
              <span className="text-base leading-none">☰</span>
              <span className="hidden md:inline text-[11px] font-bold uppercase tracking-wider text-slate-300">Menu</span>
            </button>
          )}

          {/* Company Brand Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white flex items-center justify-center font-black text-xs tracking-tight shadow-sm ring-1 ring-white/10 shrink-0">
              RSB
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <h1 className="text-xs md:text-sm font-black tracking-wide text-white whitespace-nowrap">
                RSB PRIVATE LIMITED
              </h1>
            </div>
          </div>

          <div className="h-5 w-px bg-slate-800 hidden md:block" />

          {/* Core Action Buttons: [ Live SS Rates ] [ Load BOM ] [ Add Project ] */}
          <div className="flex items-center gap-2">
            {/* 🌐 Live SS Rates */}
            <button
              type="button"
              onClick={() => setIsWorldRatesOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              title="Live World Stainless Steel Market Rates & LME Price Index"
            >
              <Globe className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
              <span className="whitespace-nowrap">🌐 Live SS Rates</span>
            </button>

            {/* ⚡ Load Machine BOM */}
            <button
              type="button"
              onClick={handleTriggerLoadBOM}
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-600/30 hover:to-teal-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              title="1-Click Load Standard BOM Template for Current Machine"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span className="whitespace-nowrap">⚡ Load Machine BOM</span>
            </button>

            {/* + Add Project */}
            <button
              type="button"
              onClick={handleTriggerAddProject}
              className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 border border-blue-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              title="Register and initialize a new machine project"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span className="whitespace-nowrap">+ Add Project</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. RIGHT SECTION: CLOUD SYNC, SEARCH, ALERTS & SUPER ADMIN PROFILE (AMIT) */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Cloud Backup Status */}
          {(() => {
            const isCloudOn = getSupabaseConfig().autoSync;
            return (
              <button
                type="button"
                onClick={() => setIsSupabaseOpen(true)}
                className={`hidden lg:flex px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all items-center gap-2 cursor-pointer active:scale-95 border ${
                  isCloudOn
                    ? 'bg-emerald-950/60 hover:bg-emerald-900/80 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700 text-slate-400'
                }`}
                title="Cloud Backup Settings (Click to Configure)"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${isCloudOn ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <Cloud className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px] whitespace-nowrap">Cloud: <strong>{isCloudOn ? 'ON' : 'OFF'}</strong></span>
              </button>
            );
          })()}

          {/* Quick Search */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs transition-colors cursor-pointer"
            title="Search orders, PO, stock, materials (⌘K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <kbd className="hidden md:inline-block px-1.5 py-0.2 rounded bg-slate-900 text-[9px] font-mono text-slate-400 border border-slate-700">
              ⌘K
            </kbd>
          </button>

          {/* System Alerts / Notifications */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs transition-colors cursor-pointer"
              title="System Alerts"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center font-mono ring-2 ring-slate-900">
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-3 space-y-2 z-50 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-white">
                  <span className="text-xs font-bold uppercase tracking-wider">System Alerts</span>
                  <span className="text-[10px] font-mono text-slate-400">{unreadCount} Unread</span>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1.5">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">No recent notifications</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          markNotificationRead(n.id);
                          if (n.linkTab) setActiveTab(n.linkTab);
                          setIsNotifOpen(false);
                        }}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                          n.read
                            ? 'bg-slate-950/40 border-slate-800 text-slate-400'
                            : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{n.title}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{n.timestamp}</span>
                        </div>
                        <p className="text-[11px] mt-1 text-slate-300">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SUPER ADMIN EXPERIENCE (FOR AMIT): USER PROFILE & DROPDOWN */}
          {/* ========================================================================= */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            >
              {/* User Avatar */}
              <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-purple-600 to-indigo-600 border border-purple-400/40 text-white flex items-center justify-center font-black text-[11px] shadow-xs">
                {currentUser.name ? currentUser.name[0].toUpperCase() : 'A'}
              </div>

              {/* User Info Label */}
              <div className="text-left hidden sm:block">
                <div className="flex items-center gap-1.5 leading-tight">
                  <span className="font-bold text-white text-xs">{currentUser.name || 'Amit'}</span>
                </div>
                <span className="text-[10px] font-semibold text-purple-300 block leading-tight">
                  {currentUser.role === 'super_admin'
                    ? 'Super Admin'
                    : currentUser.role === 'kaustubh'
                    ? 'Plant Head'
                    : currentUser.authLevel
                    ? currentUser.authLevel.replace(/^Tier \d+:\s*/i, '')
                    : 'Administrator'}
                </span>
              </div>

              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  isProfileDropdownOpen ? 'rotate-180 text-purple-400' : ''
                }`}
              />
            </button>

            {/* SUPER ADMIN DROPDOWN MENU */}
            {isProfileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl p-2.5 space-y-1 z-50 animate-fadeIn text-slate-200">
                {/* User Header Summary Card */}
                <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-1.5 mb-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-white">{currentUser.name || 'Amit'}</span>
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                      {currentUser.role === 'super_admin' ? 'Super Admin' : 'Full Access'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{currentUser.email || 'amit@rsbindustries.com'}</p>
                  <p className="text-[10px] text-slate-400">{currentUser.department || 'Plant Operations & Governance'}</p>
                </div>

                {/* 1. My Profile */}
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileDropdownOpen(false);
                    setIsProfileModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                >
                  <UserIcon className="w-4 h-4 text-blue-400" />
                  <span>My Profile</span>
                </button>

                {/* 2. Security Center */}
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileDropdownOpen(false);
                    setIsSecurityCenterOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldAlert className="w-4 h-4 text-amber-400" />
                    <span>Security Center</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">PIN Auth</span>
                </button>

                {/* 3. Member Authorizations */}
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileDropdownOpen(false);
                    setActiveTab('members');
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-purple-400" />
                    <span>Member Authorizations</span>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 border border-purple-800">
                    Tier 1-4
                  </span>
                </button>

                {/* 4. Settings */}
                <button
                  type="button"
                  onClick={() => {
                    setIsProfileDropdownOpen(false);
                    setIsSupabaseOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2.5 text-slate-200 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                >
                  <SettingsIcon className="w-4 h-4 text-slate-400" />
                  <span>Settings & Cloud Sync</span>
                </button>

                <div className="pt-1 border-t border-slate-800 mt-1">
                  {/* 5. Logout */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileDropdownOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2.5 text-rose-300 hover:bg-rose-950/50 border border-transparent hover:border-rose-800/40 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-400" />
                    <span>Logout / Lock Terminal</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MODAL: USER PROFILE MODAL */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        title="👤 Administrator Profile"
        subtitle="Current user identity, governance level, and system access rights"
        maxWidth="md"
      >
        <div className="space-y-4 text-slate-200">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-950 border border-slate-800">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center font-black text-2xl shadow-md border border-purple-400/40">
              {currentUser.name ? currentUser.name[0].toUpperCase() : 'A'}
            </div>
            <div>
              <h2 className="text-base font-black text-white">{currentUser.name || 'Amit'}</h2>
              <p className="text-xs text-purple-300 font-semibold">{currentUser.authLevel || 'Tier 1: Full Plant Operations Super Admin'}</p>
              <p className="text-xs text-slate-400">{currentUser.email || 'amit@rsbindustries.com'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Department</span>
              <span className="text-white font-bold">{currentUser.department || 'Plant Engineering'}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Role Classification</span>
              <span className="text-emerald-400 font-mono font-bold uppercase">{currentUser.role}</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 col-span-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">System Permissions</span>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-semibold">✓ Project BOM Management</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-semibold">✓ Procurement & PO Generation</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-semibold">✓ Member Authorization Administration</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-semibold">✓ Cloud Database Backup Sync</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setIsProfileModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Close Profile
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: SECURITY CENTER / ROLE SWITCHER */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isSecurityCenterOpen}
        onClose={() => setIsSecurityCenterOpen(false)}
        title="🛡️ Security Center & Role Authentication"
        subtitle="Switch user identity or audit active authorization tiers"
        maxWidth="lg"
      >
        <div className="space-y-3">
          <p className="text-xs text-slate-400">Select an enrolled team member to switch active workspace credentials (password verification required):</p>
          <div className="space-y-1.5 max-h-72 overflow-y-auto">
            {roleOptions.map((opt) => {
              const isSelected = currentUser.id === opt.user.id || currentUser.email === opt.user.email;
              return (
                <button
                  key={opt.user.id}
                  onClick={() => handleSelectRole(opt.user)}
                  className={`w-full text-left p-3 rounded-xl text-xs flex items-center justify-between transition-colors border ${
                    isSelected
                      ? 'bg-purple-600/20 text-purple-200 border-purple-500/40 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-200 flex items-center justify-center font-bold text-xs">
                      {opt.user.name[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{opt.user.name}</span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                          {opt.user.authLevel ? opt.user.authLevel.replace(/^Tier \d+:\s*/i, '') : opt.user.role}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">{opt.user.department || 'Plant Operations'}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isSelected ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] font-bold">
                        Active Now
                      </span>
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: ADMIN ROLE PASSWORD VERIFICATION */}
      {/* ========================================================================= */}
      <Modal
        isOpen={pendingUser !== null}
        onClose={() => {
          setPendingUser(null);
          setAuthPassword('');
          setAuthError(null);
        }}
        title="🔒 Admin Level Authentication"
        subtitle={`Enter administrative password to switch to ${
          pendingUser ? `${pendingUser.name} (${pendingUser.authLevel || pendingUser.role})` : 'user'
        }`}
        maxWidth="md"
      >
        <form onSubmit={handleVerifyRolePassword} className="space-y-4">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-white font-bold">Role Access Restricted</p>
              <p className="text-slate-400 text-[11px]">
                Administrative verification required to switch department role.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Enter Password:
            </label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                autoFocus
                type={showPassword ? 'text' : 'password'}
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="Enter password..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {authError && (
            <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setPendingUser(null);
                setAuthPassword('');
                setAuthError(null);
              }}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
            >
              Verify & Switch
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: LIVE WORLD SS MARKET RATES */}
      {/* ========================================================================= */}
      {isWorldRatesOpen && (
        <LiveWorldSSRatesModal onClose={() => setIsWorldRatesOpen(false)} />
      )}

      {/* ========================================================================= */}
      {/* MODAL: SUPABASE CLOUD SYNC SETTINGS */}
      {/* ========================================================================= */}
      <SupabaseConnectModal
        isOpen={isSupabaseOpen}
        onClose={() => setIsSupabaseOpen(false)}
      />
    </>
  );
};
