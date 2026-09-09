import React, { useState } from 'react';
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
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { UserRole } from '../../types/erp';
import { Modal } from '../common/Modal';

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
    setActiveTab,
    users,
  } = useERP();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);

  // Security Auth State
  const [pendingRole, setPendingRole] = useState<UserRole | null>(null);
  const [authPassword, setAuthPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const [lockPassword, setLockPassword] = useState('');
  const [lockError, setLockError] = useState<string | null>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const roleOptions: { role: UserRole; title: string; subtitle: string; lockLevel: string }[] = [
    { role: 'kaustubh', title: 'Kaustubh (Admin)', subtitle: 'Project Material Entry Portal', lockLevel: 'Password: admin@123' },
    { role: 'super_admin', title: 'Super Admin', subtitle: 'Full Access & Settings', lockLevel: 'Master: 7276kakakakaka' },
    { role: 'admin', title: 'Admin / Plant Head', subtitle: 'Operations & Planning', lockLevel: 'Master: 7276kakakakaka' },
    { role: 'purchase_manager', title: 'Purchase Manager', subtitle: 'Vendors, RFQ & Inward', lockLevel: 'Master: 7276kakakakaka' },
    { role: 'production_manager', title: 'Production Manager', subtitle: 'Shop Floor & Job Cards', lockLevel: 'Master: 7276kakakakaka' },
    { role: 'store_manager', title: 'Store Manager', subtitle: 'Stock & Outward', lockLevel: 'Master: 7276kakakakaka' },
    { role: 'accounts', title: 'Accounts & Finance', subtitle: 'Invoices & P&L', lockLevel: 'Master: 7276kakakakaka' },
    { role: 'operator', title: 'Machine Operator', subtitle: 'Job Checklists', lockLevel: 'Master: 7276kakakakaka' },
    { role: 'vendor', title: 'Supplier (Vendor Portal)', subtitle: 'Bid RFQs & Upload Docs', lockLevel: 'Master: 7276kakakakaka' },
  ];

  const isKaustubhRole = currentUser.role === 'kaustubh';

  // Role Switch Initiator
  const handleSelectRole = (targetRole: UserRole) => {
    setIsRoleDropdownOpen(false);
    if (targetRole === currentUser.role) return;

    // Prompt for password
    setPendingRole(targetRole);
    setAuthPassword('');
    setAuthError(null);
  };

  // Verify Role Unlock Password
  const handleVerifyRolePassword = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pendingRole) return;

    const trimmed = authPassword.trim();
    const targetUser = users.find((u) => u.role === pendingRole);
    const expectedPassword = targetUser?.password || (pendingRole === 'kaustubh' ? 'admin@123' : '7276kakakakaka');

    // Accept target user password or master password
    if (trimmed === expectedPassword || trimmed === '7276kakakakaka' || (pendingRole === 'kaustubh' && trimmed === 'admin@123')) {
      setCurrentUserRole(pendingRole);
      setPendingRole(null);
      setAuthPassword('');
      setAuthError(null);
    } else {
      setAuthError(
        pendingRole === 'kaustubh'
          ? 'Invalid password for Kaustubh. Required: admin@123'
          : 'Invalid Admin Authorization. Required Master Password: 7276kakakakaka'
      );
    }
  };

  // Screen Unlock Handler
  const handleUnlockScreen = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = lockPassword.trim();
    const currentExpected = currentUser.password || (currentUser.role === 'kaustubh' ? 'admin@123' : '7276kakakakaka');

    if (trimmed === currentExpected || trimmed === '7276kakakakaka' || (currentUser.role === 'kaustubh' && trimmed === 'admin@123')) {
      setIsScreenLocked(false);
      setLockPassword('');
      setLockError(null);
    } else {
      setLockError(
        currentUser.role === 'kaustubh'
          ? 'Incorrect password. Enter admin@123 or master password to unlock.'
          : 'Incorrect password. Enter 7276kakakakaka to unlock.'
      );
    }
  };

  return (
    <>
      <header className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between gap-3 select-none sticky top-0 z-30 shadow-md">
        {/* Left Section */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-black text-white text-xs tracking-tight shadow-md shrink-0">
              RSB
            </div>
            <div className="min-w-0">
              <h1 className="text-xs font-black text-white tracking-wide truncate">RSB PRIVATE LIMITED</h1>
              <p className="text-[10px] text-blue-400 font-mono truncate">
                {isKaustubhRole ? 'PROJECT MATERIAL ENTRY' : 'MANUFACTURING ERP'}
              </p>
            </div>
          </div>

          {!isKaustubhRole && (
            <>
              <button
                onClick={onOpenSearch}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 text-xs transition-colors group"
              >
                <Search className="w-3.5 h-3.5 group-hover:text-blue-400" />
                <span className="hidden xl:inline">Search orders, PO, stock, BOMs, vendors...</span>
                <span className="xl:hidden">Search...</span>
                <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded-sm bg-slate-900 text-[10px] font-mono text-slate-400 border border-slate-700">
                  ⌘K
                </kbd>
              </button>

              {/* 1-Click Daily Entry Button */}
              <button
                onClick={() => onOpenQuickAction('inward')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 shrink-0"
              >
                <Zap className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">+ Daily Entry (नया काम)</span>
                <span className="sm:hidden">+ Entry</span>
              </button>

              {/* Quick Jump Buttons to Top 3 Daily Registers */}
              <div className="hidden lg:flex items-center gap-1 border-l border-slate-800 pl-2">
                <button
                  onClick={() => setActiveTab('inward')}
                  className="px-2 py-1 rounded-md text-[11px] font-medium text-emerald-400 hover:bg-emerald-950/40 border border-emerald-500/20 flex items-center gap-1"
                >
                  <Truck className="w-3 h-3" />
                  <span>Inward (आवक)</span>
                </button>
                <button
                  onClick={() => setActiveTab('production')}
                  className="px-2 py-1 rounded-md text-[11px] font-medium text-amber-400 hover:bg-amber-950/40 border border-amber-500/20 flex items-center gap-1"
                >
                  <Wrench className="w-3 h-3" />
                  <span>Jobs (कारखाना)</span>
                </button>
                <button
                  onClick={() => setActiveTab('outward')}
                  className="px-2 py-1 rounded-md text-[11px] font-medium text-purple-400 hover:bg-purple-950/40 border border-purple-500/20 flex items-center gap-1"
                >
                  <Send className="w-3 h-3" />
                  <span>Outward (जावक)</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right: Lock Screen, Tools, Notifications, Role Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Lock Screen Security Button */}
          <button
            type="button"
            onClick={() => setIsScreenLocked(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-500/40 text-slate-300 hover:text-rose-300 text-xs font-semibold transition-colors"
            title="Lock plant terminal with admin password"
          >
            <Lock className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden md:inline">Lock Screen</span>
          </button>

          {!isKaustubhRole && (
            <>
              {/* Easy Tutorial Walkthrough Button */}
              <button
                onClick={onOpenTutorial}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 hover:text-white text-xs font-bold transition-colors shadow-xs"
                title="How ERP Works (सरल गाइड)"
              >
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden md:inline">Easy Guide (सरल गाइड)</span>
              </button>

              {/* Microsoft & Excel Hub Button */}
              <button
                onClick={onOpenExcel}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white text-xs font-medium transition-colors"
                title="Microsoft Excel & CSV Integration"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden xl:inline">Excel Hub</span>
              </button>
            </>
          )}

          {/* SS Weight Calculator */}
          <button
            onClick={onOpenCalculator}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white text-xs font-medium transition-colors"
            title="SS Weight & Cost Calculator"
          >
            <Calculator className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">SS Calculator</span>
          </button>

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white transition-colors"
              title="System Alerts"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center font-mono">
                  {unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-xl bg-slate-900 border border-slate-700 shadow-xl p-3 space-y-2 z-50">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">System Alerts</span>
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
                      <p className="text-[11px] text-slate-300 mt-1">{n.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Role Switcher Menu (Locked behind Admin Password) */}
          <div className="relative">
            <button
              onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors"
            >
              <UserCheck className="w-3.5 h-3.5 text-blue-400" />
              <span className="capitalize">{currentUser.name || currentUser.role.replace('_', ' ')}</span>
              <Lock className="w-3 h-3 text-amber-400" />
            </button>

            {isRoleDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-700 shadow-xl p-2 space-y-1 z-50">
                <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 flex items-center justify-between">
                  <span>Switch Role (Password Protected)</span>
                  <KeyRound className="w-3 h-3 text-amber-400" />
                </div>
                {roleOptions.map((opt) => {
                  const isSelected = currentUser.role === opt.role;
                  return (
                    <button
                      key={opt.role}
                      onClick={() => handleSelectRole(opt.role)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30 font-bold'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <span className="block">{opt.title}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{opt.subtitle}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {!isSelected && <Lock className="w-3 h-3 text-slate-500" />}
                        {isSelected && <Check className="w-4 h-4 text-blue-400 shrink-0" />}
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
        isOpen={pendingRole !== null}
        onClose={() => {
          setPendingRole(null);
          setAuthPassword('');
          setAuthError(null);
        }}
        title="🔒 Admin Level Authentication"
        subtitle={`Enter administrative password to switch to ${
          pendingRole ? roleOptions.find((r) => r.role === pendingRole)?.title : 'role'
        }`}
        maxWidth="md"
      >
        <form onSubmit={handleVerifyRolePassword} className="space-y-4">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-white font-bold">Role Access Restricted</p>
              <p className="text-slate-400 text-[11px]">
                {pendingRole === 'kaustubh'
                  ? 'Kaustubh Admin Password required: admin@123'
                  : 'All Admin Modules protected with Master Password: 7276kakakakaka'}
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
                setPendingRole(null);
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
                    placeholder={currentUser.role === 'kaustubh' ? 'Enter admin@123...' : 'Enter 7276kakakakaka...'}
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
    </>
  );
};

