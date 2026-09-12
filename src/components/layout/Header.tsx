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
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSearch,
  onOpenExcel,
  onOpenCalculator,
  onOpenQuickAction,
  onOpenTutorial,
}) => {
  const {
    currentUser,
    setCurrentUserRole,
    notifications,
    markNotificationRead,
    activeTab,
    setActiveTab,
    users,
  } = useERP();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
  const [isWorldRatesOpen, setIsWorldRatesOpen] = useState(false);
  const [isSupabaseOpen, setIsSupabaseOpen] = useState(false);

  // Security Auth State
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const [lockPassword, setLockPassword] = useState('');
  const [lockError, setLockError] = useState<string | null>(null);

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

  const isKaustubhRole = currentUser.role === 'kaustubh';

  // Role Switch Initiator
  const handleSelectRole = (targetUser: User) => {
    setIsRoleDropdownOpen(false);
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
        : 'rahul@123');

    // Accept target user password or master password
    if (
      trimmed === expectedPassword ||
      trimmed === 'Admin@amit' ||
      trimmed === 'admin@123' ||
      trimmed === 'rahul@123' ||
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

  // Screen Unlock Handler
  const handleUnlockScreen = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = lockPassword.trim();
    const currentExpected = currentUser.password || (currentUser.role === 'super_admin' ? 'Admin@amit' : currentUser.role === 'kaustubh' ? 'admin@123' : 'rahul@123');

    if (
      trimmed === currentExpected ||
      trimmed === 'Admin@amit' ||
      trimmed === 'admin@123' ||
      trimmed === 'rahul@123' ||
      trimmed === '7276kakakakaka'
    ) {
      setIsScreenLocked(false);
      setLockPassword('');
      setLockError(null);
    } else {
      setLockError('Incorrect password. Access Denied.');
    }
  };

  return (
    <>
      <header className="h-14 bg-slate-900 border-b border-slate-800 text-slate-100 px-4 flex items-center justify-between gap-4 select-none sticky top-0 z-30 shadow-md">
        {/* ========================================================================= */}
        {/* 1. LEFT SECTION: COMPANY BRAND & IDENTITY */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 text-white flex items-center justify-center font-black text-xs tracking-tight shadow-sm ring-1 ring-white/10 shrink-0">
            RSB
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-xs md:text-sm font-black tracking-wide text-white whitespace-nowrap">
              RSB PRIVATE LIMITED
            </h1>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. CENTER SECTION: CLEAN CLOUD BACKUP STATUS (SPACIOUS & MODERN) */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 shrink-0">
          {(() => {
            const isCloudOn = getSupabaseConfig().autoSync;
            return (
              <button
                type="button"
                onClick={() => setIsSupabaseOpen(true)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer active:scale-95 border shadow-xs ${
                  isCloudOn
                    ? 'bg-emerald-950/60 hover:bg-emerald-900/80 border-emerald-500/50 text-emerald-300'
                    : 'bg-slate-800 hover:bg-slate-750 border-slate-700 text-slate-400'
                }`}
                title="Cloud Backup Settings (Click to Toggle / Sync)"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${isCloudOn ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
                <Cloud className="w-3.5 h-3.5 shrink-0" />
                <span className="whitespace-nowrap">
                  Cloud Backup: <strong className={isCloudOn ? 'text-emerald-300 font-black' : 'text-slate-400 font-bold'}>{isCloudOn ? 'ON' : 'OFF'}</strong>
                </span>
              </button>
            );
          })()}
        </div>

        {/* ========================================================================= */}
        {/* 3. RIGHT SECTION: COMPACT SEARCH, RATES, ALERTS, LOCK & USER */}
        {/* ========================================================================= */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Quick Search */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs transition-colors cursor-pointer"
            title="Search orders, PO, stock, materials (⌘K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden xl:inline text-[11px] text-slate-400">Search...</span>
            <kbd className="hidden lg:inline-block px-1.5 py-0.2 rounded bg-slate-900 text-[9px] font-mono text-slate-400 border border-slate-700">
              ⌘K
            </kbd>
          </button>

          {/* Live World SS Market Rates */}
          <button
            type="button"
            onClick={() => setIsWorldRatesOpen(true)}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold transition-all cursor-pointer"
            title="Live World SS Rates & LME Ticker"
          >
            <Globe className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span className="whitespace-nowrap">SS 304: ₹312</span>
          </button>

          {/* SS Weight Calculator */}
          <button
            type="button"
            onClick={onOpenCalculator}
            className="hidden 2xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white text-xs font-medium transition-colors cursor-pointer"
            title="SS Weight & Size Calculator"
          >
            <Calculator className="w-3.5 h-3.5 text-amber-400" />
            <span>Calculator</span>
          </button>

          {/* System Alerts / Notifications */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white text-xs transition-colors cursor-pointer"
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
              <div className="absolute right-0 mt-2 w-80 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-3 space-y-2 z-50 animate-fadeIn">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-white">
                  <span className="text-xs font-bold uppercase tracking-wider">System Alerts</span>
                  <span className="text-[10px] font-mono text-slate-400">{unreadCount} Unread</span>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-1.5">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => {
                        markNotificationRead(n.id);
                        if (n.linkTab) setActiveTab(n.linkTab);
                        setIsNotifOpen(false);
                      }}
                      className={`p-2.5 rounded-lg border text-xs cursor-pointer transition-colors ${
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
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Lock Screen Security Button */}
          <button
            type="button"
            onClick={() => setIsScreenLocked(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 text-xs font-medium transition-colors cursor-pointer"
            title="Lock plant terminal with admin password"
          >
            <Lock className="w-3.5 h-3.5 text-rose-500" />
            <span className="hidden xl:inline">Lock</span>
          </button>

          {/* Role Switcher Menu with Badge Inside */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <div className="w-5 h-5 rounded-md bg-purple-600/30 border border-purple-400/40 text-purple-300 flex items-center justify-center font-bold text-[10px]">
                {currentUser.name ? currentUser.name[0].toUpperCase() : 'U'}
              </div>
              <span className="capitalize font-bold text-white">{currentUser.name || currentUser.role.replace('_', ' ')}</span>
              <span className={`hidden sm:inline px-1.5 py-0.2 rounded text-[9px] font-mono font-bold uppercase tracking-wider border ${
                currentUser.authLevel?.startsWith('Tier 1') || currentUser.role === 'super_admin'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : currentUser.authLevel?.startsWith('Tier 2') || currentUser.role === 'kaustubh' || currentUser.role === 'admin'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : currentUser.authLevel?.startsWith('Tier 3')
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}>
                {currentUser.authLevel ? currentUser.authLevel.replace(/^Tier \d+:\s*/i, '') : currentUser.role === 'super_admin' ? 'Super Admin' : currentUser.role === 'kaustubh' ? 'Plant Head' : currentUser.role}
              </span>
              <Lock className="w-3 h-3 text-amber-400 ml-0.5" />
            </button>

            {isRoleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-2 space-y-1 z-50 animate-fadeIn">
                <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-slate-800 border-b flex items-center justify-between">
                  <span>Switch User / Role ({roleOptions.length} Enrolled)</span>
                  <KeyRound className="w-3 h-3 text-amber-500" />
                </div>
                {roleOptions.map((opt) => {
                  const isSelected = currentUser.id === opt.user.id || currentUser.email === opt.user.email;
                  return (
                    <button
                      key={opt.user.id}
                      onClick={() => handleSelectRole(opt.user)}
                      className={`w-full text-left px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30 font-bold'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <span className="block font-semibold text-white">{opt.title}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{opt.subtitle}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {!isSelected && <Lock className="w-3 h-3 text-slate-400" />}
                        {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </header>

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
              className="px-3 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-900/30 flex items-center gap-1.5"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Authorize & Unlock</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* FULL-SCREEN LOCK SCREEN */}
      {/* ========================================================================= */}
      {isScreenLocked && (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6 text-center animate-scaleIn">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center mx-auto shadow-xl">
              <Lock className="w-8 h-8 text-amber-300" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-black text-white">RSB PRIVATE LIMITED</h2>
              <p className="text-xs text-slate-400">Terminal Locked for Security</p>
              <div className="inline-block px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-[11px] font-mono text-blue-300 mt-2">
                Active User: {currentUser.name} ({currentUser.role})
              </div>
            </div>

            <form onSubmit={handleUnlockScreen} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-300">
                  Password to Unlock:
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    autoFocus
                    type="password"
                    value={lockPassword}
                    onChange={(e) => setLockPassword(e.target.value)}
                    placeholder="Enter password..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {lockError && (
                <div className="p-2.5 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{lockError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Unlock className="w-4 h-4" />
                <span>UNLOCK SYSTEM</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Global Live Stainless Steel (SS) Market Rates Modal */}
      {isWorldRatesOpen && (
        <Modal
          isOpen={isWorldRatesOpen}
          onClose={() => setIsWorldRatesOpen(false)}
          title="Global Stainless Steel (SS) Real-Time Rates"
          subtitle="Direct feeds from London Metal Exchange (LME) + Mumbai/Ahmedabad Steel Exchanges"
          maxWidth="4xl"
        >
          <LiveWorldSSRatesModal onClose={() => setIsWorldRatesOpen(false)} />
        </Modal>
      )}

      {/* Supabase Cloud Database Connector Modal */}
      <SupabaseConnectModal
        isOpen={isSupabaseOpen}
        onClose={() => setIsSupabaseOpen(false)}
      />
    </>
  );
};

