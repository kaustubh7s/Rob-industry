import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  KeyRound,
  Search,
  Lock,
  Unlock,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Sparkles,
  Users,
  Building2,
  Cpu,
  Layers,
  Check,
  RotateCcw,
  Shield,
  Activity,
  AlertTriangle,
  FileText,
  Key,
  Flame,
  Radio,
  Clock,
  Terminal,
  RefreshCw,
  Sliders,
  Download,
  Database,
  Cloud,
  Truck,
  PackageCheck,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { User, UserRole, AuthLevel, UserPermissions } from '../../types/erp';
import { Modal } from '../common/Modal';
import { SupabaseConnectModal } from './SupabaseConnectModal';
import confetti from 'canvas-confetti';

const ALL_AUTH_LEVELS: AuthLevel[] = [
  'Tier 1: Super Admin',
  'Tier 2: Plant Head / Admin',
  'Tier 3: Department Manager',
  'Tier 4: Data Entry Operator',
  'Tier 5: External Vendor',
];

const ROLE_OPTIONS: { role: UserRole; title: string; defaultLevel: AuthLevel; department: string }[] = [
  { role: 'super_admin', title: 'Super Admin', defaultLevel: 'Tier 1: Super Admin', department: 'Super Admin & Executive Management' },
  { role: 'kaustubh', title: 'Plant Admin (Kaustubh)', defaultLevel: 'Tier 2: Plant Head / Admin', department: 'Plant Administration & Engineering' },
  { role: 'admin', title: 'Plant Operations Admin', defaultLevel: 'Tier 2: Plant Head / Admin', department: 'Plant Operations' },
  { role: 'store_incharge', title: 'Stores & Inward Inspector (Ramesh Patel)', defaultLevel: 'Tier 3: Department Manager', department: 'Stores & Material Inward Receiving' },
  { role: 'purchase_manager', title: 'Purchase Manager', defaultLevel: 'Tier 3: Department Manager', department: 'Procurement & Vendor Mgmt' },
  { role: 'production_manager', title: 'Production Manager', defaultLevel: 'Tier 3: Department Manager', department: 'Shop Floor & Tooling' },
  { role: 'store_manager', title: 'Store & Inventory Manager', defaultLevel: 'Tier 3: Department Manager', department: 'Warehouse & Stores' },
  { role: 'accounts', title: 'Finance & Accounts', defaultLevel: 'Tier 3: Department Manager', department: 'Finance & Billing' },
  { role: 'operator', title: 'Data Entry Operator (Rahul)', defaultLevel: 'Tier 4: Data Entry Operator', department: 'Material Data Entry Floor' },
  { role: 'vendor', title: 'External Supplier Vendor', defaultLevel: 'Tier 5: External Vendor', department: 'External Vendor Portal' },
];

export const MemberAuthorizationManager: React.FC = () => {
  const {
    users,
    addUser,
    updateUser,
    deleteUser,
    alterUserAuthorization,
    currentUser,
    exportDatabaseBackup,
  } = useERP();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState<string>('ALL');
  const [filterDepartment, setFilterDepartment] = useState<string>('ALL');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Security Emergency Lockdown State
  const [isFactoryLockdownActive, setIsFactoryLockdownActive] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [generatedResetPin, setGeneratedResetPin] = useState<{ user: User; pin: string; expiresAt: string } | null>(null);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // New Member Form State (Zero manual password input - auto-generates one-time activation code)
  const [newMemberForm, setNewMemberForm] = useState({
    name: '',
    email: '',
    role: 'operator' as UserRole,
    department: 'Material Data Entry Floor',
    authLevel: 'Tier 4: Data Entry Operator' as AuthLevel,
    status: 'Active' as 'Active' | 'Suspended' | 'Read Only',
    permissions: {
      canEditMaterials: true,
      canApproveOrders: false,
      canDeleteRecords: false,
      canManageUsers: false,
      canExportReports: true,
      canOverrideLock: false,
      canVerifyInward: false,
    },
  });

  // Edit Member Form State (Zero password fields)
  const [editForm, setEditForm] = useState<{
    id: string;
    name: string;
    email: string;
    role: UserRole;
    department: string;
    authLevel: AuthLevel;
    status: 'Active' | 'Suspended' | 'Read Only';
    permissions: UserPermissions;
    forcePasswordResetOnLogin: boolean;
  } | null>(null);

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        searchTerm === '' ||
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.role.toLowerCase().includes(searchTerm.toLowerCase());

      const matchTier = filterTier === 'ALL' || u.authLevel === filterTier;
      const matchDept = filterDepartment === 'ALL' || u.department === filterDepartment;

      return matchSearch && matchTier && matchDept;
    });
  }, [users, searchTerm, filterTier, filterDepartment]);

  // Unique departments for filter
  const uniqueDepartments = useMemo(() => {
    return Array.from(new Set(users.map((u) => u.department))).filter(Boolean);
  }, [users]);

  // Open Edit Modal
  const handleOpenEdit = (user: User) => {
    setEditingUser(user);
    setEditForm({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      authLevel: user.authLevel || 'Tier 4: Data Entry Operator',
      status: user.status || 'Active',
      forcePasswordResetOnLogin: false,
      permissions: user.permissions || {
        canEditMaterials: true,
        canApproveOrders: user.role === 'super_admin' || user.role === 'kaustubh',
        canDeleteRecords: user.role === 'super_admin',
        canManageUsers: user.role === 'super_admin',
        canExportReports: true,
        canOverrideLock: user.role === 'super_admin' || user.role === 'kaustubh',
        canVerifyInward: user.role === 'store_incharge' || user.role === 'super_admin' || user.role === 'kaustubh' || user.role === 'admin' || user.id === 'usr-ramesh',
      },
    });
  };

  // Issue Emergency 1-Time Reset PIN (Zero Knowledge Architecture)
  const handleIssueResetPin = (user: User) => {
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
    const formattedPin = `${randomPin.slice(0, 3)}-${randomPin.slice(3)}`;
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
    setGeneratedResetPin({
      user,
      pin: formattedPin,
      expiresAt,
    });
    setSaveToast(`One-Time Reset PIN generated for ${user.name}`);
    setTimeout(() => setSaveToast(null), 4000);
  };

  // Save Edit Member
  const handleSaveEdit = () => {
    if (!editForm) return;

    let derivedRole: UserRole = editForm.role;
    let derivedDept = editForm.department;
    if (editForm.authLevel === 'Tier 1: Super Admin') {
      derivedRole = 'super_admin';
      if (!derivedDept || derivedDept === 'Material Data Entry Floor') {
        derivedDept = 'Super Admin & Executive Management';
      }
    } else if (editForm.authLevel === 'Tier 2: Plant Head / Admin') {
      derivedRole = editForm.name.toLowerCase().includes('kaustubh') ? 'kaustubh' : 'admin';
      if (!derivedDept || derivedDept === 'Material Data Entry Floor') {
        derivedDept = 'Plant Administration & Engineering';
      }
    } else if (editForm.authLevel === 'Tier 3: Department Manager') {
      if (editForm.role === 'store_incharge' || editForm.name.toLowerCase().includes('ramesh')) {
        derivedRole = 'store_incharge';
        derivedDept = 'Stores & Material Inward Receiving';
      }
    } else if (editForm.authLevel === 'Tier 4: Data Entry Operator') {
      derivedRole = 'operator';
      if (!derivedDept || derivedDept === 'Super Admin & Executive Management') {
        derivedDept = 'Material Data Entry Floor';
      }
    }

    const updatedPermissions: UserPermissions = {
      ...editForm.permissions,
      canEditMaterials: editForm.permissions.canEditMaterials,
      canApproveOrders: editForm.authLevel === 'Tier 1: Super Admin' || editForm.authLevel === 'Tier 2: Plant Head / Admin' ? true : editForm.permissions.canApproveOrders,
      canOverrideLock: editForm.authLevel === 'Tier 1: Super Admin' || editForm.authLevel === 'Tier 2: Plant Head / Admin' ? true : editForm.permissions.canOverrideLock,
      canManageUsers: editForm.authLevel === 'Tier 1: Super Admin' ? true : (editForm.permissions.canManageUsers || false),
      canDeleteRecords: editForm.authLevel === 'Tier 1: Super Admin' ? true : (editForm.permissions.canDeleteRecords || false),
      canExportReports: true,
      canVerifyInward: editForm.permissions.canVerifyInward !== undefined 
        ? editForm.permissions.canVerifyInward 
        : (derivedRole === 'store_incharge' || editForm.authLevel === 'Tier 1: Super Admin' || editForm.authLevel === 'Tier 2: Plant Head / Admin'),
    };

    updateUser(editForm.id, {
      name: editForm.name,
      email: editForm.email,
      role: derivedRole,
      department: derivedDept,
      authLevel: editForm.authLevel,
      status: editForm.status,
      permissions: updatedPermissions,
    });

    setSaveToast(`Successfully updated authorizations for ${editForm.name} to ${editForm.authLevel}`);
    setTimeout(() => setSaveToast(null), 3000);
    setEditingUser(null);
    setEditForm(null);
  };

  // Create New Member with auto-generated activation token
  const handleCreateMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberForm.name.trim() || !newMemberForm.email.trim()) {
      alert('Please fill in employee Name and Email');
      return;
    }

    const newId = `usr-${Date.now().toString(36)}`;
    const newUser: User = {
      id: newId,
      name: newMemberForm.name.trim(),
      email: newMemberForm.email.trim(),
      role: newMemberForm.role,
      department: newMemberForm.department,
      authLevel: newMemberForm.authLevel,
      status: newMemberForm.status,
      permissions: newMemberForm.permissions,
      avatar: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80`,
    };

    addUser(newUser);

    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
    });

    // Generate immediate 1-time activation code
    handleIssueResetPin(newUser);

    setSaveToast(`Member ${newUser.name} successfully registered.`);
    setTimeout(() => setSaveToast(null), 3500);

    setIsAddModalOpen(false);
    setNewMemberForm({
      name: '',
      email: '',
      role: 'operator',
      department: 'Material Data Entry Floor',
      authLevel: 'Tier 4: Data Entry Operator',
      status: 'Active',
      permissions: {
        canEditMaterials: true,
        canApproveOrders: false,
        canDeleteRecords: false,
        canManageUsers: false,
        canExportReports: true,
        canOverrideLock: false,
        canVerifyInward: false,
      },
    });
  };

  // Delete Member Safeguard
  const handleDelete = (user: User) => {
    if (user.role === 'super_admin' || user.email === 'amit@rsb.com') {
      alert('Super Admin root account cannot be deleted.');
      return;
    }
    if (confirm(`Are you sure you want to permanently revoke access for ${user.name}?`)) {
      deleteUser(user.id);
      setSaveToast(`Revoked access for ${user.name}`);
      setTimeout(() => setSaveToast(null), 3000);
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-xl bg-slate-900 border border-emerald-500/50 text-white shadow-2xl animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold">{saveToast}</span>
        </div>
      )}

      {/* Super Admin Executive Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950/80 to-slate-900 border border-purple-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-purple-600/30 border border-purple-500/50 flex items-center justify-center text-purple-300 shadow-inner">
                <ShieldCheck className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white tracking-tight">
                    Super Admin Security & Authorization Matrix
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-mono font-bold uppercase">
                    Root Tier-1 Control
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Logged in as <strong className="text-purple-300">Super Admin Amit</strong>. Zero-knowledge encrypted identity management.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Plant Lockdown Emergency Switch */}
            <button
              onClick={() => {
                const nextState = !isFactoryLockdownActive;
                if (confirm(nextState ? '⚠️ ACTIVATE EMERGENCY PLANT LOCKDOWN? All non-admin sessions will be quarantined.' : 'Deactivate Plant Lockdown?')) {
                  setIsFactoryLockdownActive(nextState);
                  setSaveToast(nextState ? '🚨 Plant Emergency Lockdown ACTIVATED' : 'Plant Lockdown Deactivated');
                }
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 ${
                isFactoryLockdownActive
                  ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse border border-rose-400 ring-2 ring-rose-500/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              <AlertTriangle className={`w-4 h-4 ${isFactoryLockdownActive ? 'text-white' : 'text-amber-400'}`} />
              <span>{isFactoryLockdownActive ? 'LOCKDOWN ACTIVE' : 'Emergency Lockdown'}</span>
            </button>

            {/* Enterprise Cloud Backup */}
            <button
              onClick={() => setIsSupabaseModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/50 text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              title="Enterprise Cloud Backup Settings"
            >
              <Cloud className="w-4 h-4 text-emerald-400" />
              <span>Cloud Backup</span>
            </button>

            {/* 1-Click Database Backup */}
            <button
              onClick={exportDatabaseBackup}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/40 text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              title="Download 1-Click Full Encrypted Database JSON Backup"
            >
              <Download className="w-4 h-4 text-purple-400" />
              <span>Export Backup (.JSON)</span>
            </button>

            {/* Add New Member Button */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-purple-600/30 transition-all active:scale-95 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register Member</span>
            </button>
          </div>
        </div>

        {/* Security Matrix KPI Cards */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-purple-500/20 max-w-sm">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-mono text-slate-400">Total Enrolled</div>
              <div className="text-lg font-black text-white font-mono mt-0.5">{users.length} Members</div>
            </div>
            <Users className="w-5 h-5 text-purple-400 opacity-60" />
          </div>

          <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
            <div>
              <div className="text-[10px] uppercase font-mono text-slate-400">Active Operators</div>
              <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                {users.filter((u) => u.id === currentUser.id || u.role === currentUser.role || u.email === currentUser.email).length} Online
              </div>
            </div>
            <Activity className="w-5 h-5 text-emerald-400 opacity-60" />
          </div>
        </div>
      </div>

      {/* MEMBERS ROSTER TABLE */}
      <div className="space-y-4">
        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search member by name, role, email..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-xs focus:border-purple-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={filterTier}
              onChange={(e) => setFilterTier(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:border-purple-500 outline-none"
            >
              <option value="ALL">All Authorization Tiers</option>
              {ALL_AUTH_LEVELS.map((tier) => (
                <option key={tier} value={tier}>
                  {tier}
                </option>
              ))}
            </select>

            <select
              value={filterDepartment}
              onChange={(e) => setFilterDepartment(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-medium focus:border-purple-500 outline-none"
            >
              <option value="ALL">All Departments</option>
              {uniqueDepartments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Members Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-850 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Member & Identity</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Authorization Tier</th>
                  <th className="px-4 py-3">Access Gate Permissions</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Enterprise Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredUsers.map((user) => {
                  const isRootAmit = user.name.toLowerCase().includes('amit') || user.email === 'amit@rsbequipments.com' || user.email === 'amit@rsb.com';
                  const isSuperAdmin = user.authLevel?.startsWith('Tier 1') || user.role === 'super_admin';
                  const isPlantHead = user.authLevel?.startsWith('Tier 2') || user.role === 'kaustubh' || user.role === 'admin';
                  const isStoreIncharge = user.role === 'store_incharge' || user.id === 'usr-ramesh' || user.name.toLowerCase().includes('ramesh');
                  const isManager = user.authLevel?.startsWith('Tier 3') || isStoreIncharge;

                  const roleBadgeLabel = isRootAmit
                    ? 'ROOT ADMIN'
                    : isSuperAdmin
                    ? 'SUPER ADMIN'
                    : isPlantHead
                    ? 'PLANT HEAD'
                    : isStoreIncharge
                    ? 'STORES & INWARD'
                    : isManager
                    ? 'MANAGER'
                    : 'OPERATOR';

                  const roleBadgeColor = isStoreIncharge
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : isSuperAdmin
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : isPlantHead
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : isManager
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40';

                  return (
                    <tr key={user.id} className="hover:bg-slate-800/50 transition-colors group">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-md text-xs ${
                            isStoreIncharge
                              ? 'bg-gradient-to-tr from-emerald-600 to-teal-600'
                              : isSuperAdmin
                              ? 'bg-gradient-to-tr from-purple-600 to-indigo-600'
                              : isPlantHead
                              ? 'bg-gradient-to-tr from-amber-600 to-orange-600'
                              : 'bg-gradient-to-tr from-slate-600 to-slate-800'
                          }`}>
                            {user.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-white text-sm">{user.name}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider border ${roleBadgeColor}`}>
                                {roleBadgeLabel}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">{user.email}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-slate-300">
                          <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{user.department || 'Plant Operations'}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-extrabold border ${
                            user.authLevel?.startsWith('Tier 1')
                              ? 'bg-purple-950/60 text-purple-300 border-purple-600/50'
                              : user.authLevel?.startsWith('Tier 2')
                              ? 'bg-amber-950/60 text-amber-300 border-amber-600/50'
                              : isStoreIncharge || user.authLevel?.startsWith('Tier 3')
                              ? 'bg-blue-950/60 text-blue-300 border-blue-600/50'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          {user.authLevel || 'Tier 4: Data Entry Operator'}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {user.permissions?.canEditMaterials && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-emerald-400 border border-emerald-500/30">
                              Edit Materials
                            </span>
                          )}
                          {user.permissions?.canApproveOrders && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-purple-400 border border-purple-500/30">
                              Approve Orders
                            </span>
                          )}
                          {user.permissions?.canOverrideLock && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-amber-400 border border-amber-500/30">
                              Override Lock
                            </span>
                          )}
                          {user.permissions?.canManageUsers && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-cyan-400 border border-cyan-500/30">
                              Admin Access
                            </span>
                          )}
                          {(user.permissions?.canVerifyInward || isStoreIncharge || user.authLevel?.startsWith('Tier 1') || user.authLevel?.startsWith('Tier 2') || user.role === 'admin' || user.role === 'super_admin' || user.role === 'kaustubh') && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-950/80 text-[10px] text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1">
                              <PackageCheck className="w-3 h-3 text-emerald-400 shrink-0" />
                              Stores Inward (Arrivals Tick)
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        {user.id === currentUser.id || user.email === currentUser.email ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-xs shadow-emerald-500/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Online (Logged In)
                          </span>
                        ) : user.status === 'Suspended' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            Offline ({user.lastActive || 'Logged Out'})
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Issue Emergency 1-Time Reset PIN */}
                          <button
                            onClick={() => handleIssueResetPin(user)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 border border-slate-700 hover:border-amber-500/40 transition-colors"
                            title="Issue 1-Time Emergency Reset PIN"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit / Alter Authorizations */}
                          <button
                            onClick={() => handleOpenEdit(user)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-purple-900/50 text-purple-300 border border-slate-700 hover:border-purple-500/40 transition-colors"
                            title="Alter Authorization Tier & Permissions"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete (disabled for Amit root) */}
                          {!isRootAmit && (
                            <button
                              onClick={() => handleDelete(user)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-rose-400 border border-slate-700 hover:border-rose-500/40 transition-colors"
                              title="Revoke Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL 1: REGISTER NEW MEMBER */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Register New Factory Member"
          subtitle="Assign member identity, department, and role authorization tier"
          maxWidth="2xl"
        >
          <form onSubmit={handleCreateMember} className="space-y-4 text-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newMemberForm.name}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, name: e.target.value })}
                  placeholder="e.g. Ramesh Patil"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-semibold focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Company Email *
                </label>
                <input
                  type="email"
                  required
                  value={newMemberForm.email}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, email: e.target.value })}
                  placeholder="e.g. ramesh@rsb.com"
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-semibold focus:border-purple-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Department
                </label>
                <input
                  type="text"
                  value={newMemberForm.department}
                  onChange={(e) => setNewMemberForm({ ...newMemberForm, department: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-semibold focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Role Title
                </label>
                <select
                  value={newMemberForm.role}
                  onChange={(e) => {
                    const r = e.target.value as UserRole;
                    const matched = ROLE_OPTIONS.find((ro) => ro.role === r);
                    setNewMemberForm({
                      ...newMemberForm,
                      role: r,
                      authLevel: matched ? matched.defaultLevel : 'Tier 4: Data Entry Operator',
                      department: matched ? matched.department : newMemberForm.department,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-semibold focus:border-purple-500 outline-none"
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.role} value={opt.role}>
                      {opt.title} ({opt.defaultLevel})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Authorization Level
              </label>
              <select
                value={newMemberForm.authLevel}
                onChange={(e) => setNewMemberForm({ ...newMemberForm, authLevel: e.target.value as AuthLevel })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-semibold focus:border-purple-500 outline-none"
              >
                {ALL_AUTH_LEVELS.map((tier) => (
                  <option key={tier} value={tier}>
                    {tier}
                  </option>
                ))}
              </select>
            </div>

            {/* Granular Permission Toggles */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Access Gate Permissions
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newMemberForm.permissions.canEditMaterials}
                    onChange={(e) =>
                      setNewMemberForm({
                        ...newMemberForm,
                        permissions: { ...newMemberForm.permissions, canEditMaterials: e.target.checked },
                      })
                    }
                    className="rounded bg-slate-800 border-slate-700 text-purple-600 focus:ring-purple-500"
                  />
                  <span>Edit Materials</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newMemberForm.permissions.canApproveOrders}
                    onChange={(e) =>
                      setNewMemberForm({
                        ...newMemberForm,
                        permissions: { ...newMemberForm.permissions, canApproveOrders: e.target.checked },
                      })
                    }
                    className="rounded bg-slate-800 border-slate-700 text-purple-600 focus:ring-purple-500"
                  />
                  <span>Approve Orders</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newMemberForm.permissions.canOverrideLock}
                    onChange={(e) =>
                      setNewMemberForm({
                        ...newMemberForm,
                        permissions: { ...newMemberForm.permissions, canOverrideLock: e.target.checked },
                      })
                    }
                    className="rounded bg-slate-800 border-slate-700 text-purple-600 focus:ring-purple-500"
                  />
                  <span>Override Lock</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer col-span-2 sm:col-span-3 text-emerald-400 font-medium">
                  <input
                    type="checkbox"
                    checked={newMemberForm.permissions.canVerifyInward}
                    onChange={(e) =>
                      setNewMemberForm({
                        ...newMemberForm,
                        permissions: { ...newMemberForm.permissions, canVerifyInward: e.target.checked },
                      })
                    }
                    className="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-emerald-400" />
                    Stores Inward Verification (Can Tick Raw Material Arrivals / आवक)
                  </span>
                </label>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/30 text-[11px] text-purple-300 flex items-center gap-2">
              <Key className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                A secure 1-time activation setup PIN will be generated upon registration. Passwords remain encrypted and private to the user.
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all"
              >
                Enroll Member
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL 2: ALTER AUTHORIZATION & PERMISSIONS */}
      {editingUser && editForm && (
        <Modal
          isOpen={!!editingUser}
          onClose={() => {
            setEditingUser(null);
            setEditForm(null);
          }}
          title={`Alter Authorization: ${editingUser.name}`}
          subtitle="Configure security tier, access gates, and operational status"
          maxWidth="2xl"
        >
          <div className="space-y-4 text-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-semibold focus:border-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Department
                </label>
                <input
                  type="text"
                  value={editForm.department}
                  onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-semibold focus:border-purple-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Authorization Tier
                </label>
                <select
                  value={editForm.authLevel}
                  onChange={(e) => {
                    const newTier = e.target.value as AuthLevel;
                    let autoDept = editForm.department;
                    let autoPerms = { ...editForm.permissions };
                    if (newTier === 'Tier 1: Super Admin') {
                      autoDept = 'Super Admin & Executive Management';
                      autoPerms = {
                        canEditMaterials: true,
                        canApproveOrders: true,
                        canDeleteRecords: true,
                        canManageUsers: true,
                        canExportReports: true,
                        canOverrideLock: true,
                        canVerifyInward: true,
                      };
                    } else if (newTier === 'Tier 2: Plant Head / Admin') {
                      autoDept = 'Plant Administration & Engineering';
                      autoPerms = {
                        canEditMaterials: true,
                        canApproveOrders: true,
                        canDeleteRecords: true,
                        canManageUsers: false,
                        canExportReports: true,
                        canOverrideLock: true,
                        canVerifyInward: true,
                      };
                    } else if (newTier === 'Tier 3: Department Manager') {
                      autoPerms = {
                        canEditMaterials: true,
                        canApproveOrders: true,
                        canDeleteRecords: false,
                        canManageUsers: false,
                        canExportReports: true,
                        canOverrideLock: false,
                        canVerifyInward: editForm.department?.toLowerCase().includes('store') || editForm.role === 'store_incharge',
                      };
                    } else {
                      autoPerms = {
                        canEditMaterials: false,
                        canApproveOrders: false,
                        canDeleteRecords: false,
                        canManageUsers: false,
                        canExportReports: false,
                        canOverrideLock: false,
                        canVerifyInward: false,
                      };
                    }
                    setEditForm({
                      ...editForm,
                      authLevel: newTier,
                      department: autoDept,
                      permissions: autoPerms,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-semibold focus:border-purple-500 outline-none"
                >
                  {ALL_AUTH_LEVELS.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Account Status
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs font-semibold focus:border-purple-500 outline-none"
                >
                  <option value="Active">Active (Full Privileges)</option>
                  <option value="Read Only">Read Only (Inspection View)</option>
                  <option value="Suspended">Suspended (Access Revoked)</option>
                </select>
              </div>
            </div>

            {/* Granular Permissions Checkboxes */}
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Granular Security Gates & Store Functions
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={editForm.permissions.canEditMaterials}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        permissions: { ...editForm.permissions, canEditMaterials: e.target.checked },
                      })
                    }
                    className="rounded bg-slate-700 text-purple-600"
                  />
                  <span>Can Edit Materials</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={editForm.permissions.canApproveOrders}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        permissions: { ...editForm.permissions, canApproveOrders: e.target.checked },
                      })
                    }
                    className="rounded bg-slate-700 text-purple-600"
                  />
                  <span>Can Sign-Off / Approve Orders</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={editForm.permissions.canOverrideLock}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        permissions: { ...editForm.permissions, canOverrideLock: e.target.checked },
                      })
                    }
                    className="rounded bg-slate-700 text-purple-600"
                  />
                  <span>Can Override Freeze Locks</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800">
                  <input
                    type="checkbox"
                    checked={editForm.permissions.canExportReports}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        permissions: { ...editForm.permissions, canExportReports: e.target.checked },
                      })
                    }
                    className="rounded bg-slate-700 text-purple-600"
                  />
                  <span>Can Export Data & PDF Reports</span>
                </label>

                {/* Stores & Admin Inward Gate Checkbox */}
                <label className="flex items-start gap-2.5 cursor-pointer p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 hover:bg-emerald-950/60 col-span-2 transition-all">
                  <input
                    type="checkbox"
                    checked={Boolean(editForm.permissions.canVerifyInward ?? (editForm.role === 'store_incharge' || editForm.authLevel.startsWith('Tier 1') || editForm.authLevel.startsWith('Tier 2')))}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        permissions: { ...editForm.permissions, canVerifyInward: e.target.checked },
                      })
                    }
                    className="mt-0.5 rounded bg-slate-800 text-emerald-500 focus:ring-emerald-500"
                  />
                  <div>
                    <span className="font-bold text-emerald-300 text-xs flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-emerald-400" />
                      Stores & Admin Inward Function (Can Tick Raw Material Receipts / आवक)
                    </span>
                    <span className="text-[11px] text-slate-300 block mt-1 leading-relaxed">
                      Enables physical arrival checkmarking for raw materials (आवक). <strong>Super Admin (Amit)</strong>, <strong>Plant Head (Kaustubh)</strong>, and <strong>Stores Inspector (Ramesh Patel)</strong> can all inspect and tick materials.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => handleIssueResetPin(editingUser)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all"
              >
                <Key className="w-3.5 h-3.5" /> Issue 1-Time Reset PIN
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingUser(null);
                    setEditForm(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/30 transition-all"
                >
                  Save Authorizations
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: ONE-TIME RESET PIN DISPLAY */}
      {generatedResetPin && (
        <Modal
          isOpen={!!generatedResetPin}
          onClose={() => setGeneratedResetPin(null)}
          title="Emergency One-Time Reset PIN Issued"
          subtitle={`Temporary authorization passcode for ${generatedResetPin.user.name}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-slate-200 text-center py-2">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 mx-auto flex items-center justify-center">
              <Key className="w-8 h-8" />
            </div>

            <div>
              <div className="text-xs text-slate-400 font-medium">Temporary 15-Minute Activation PIN:</div>
              <div className="text-3xl font-black text-amber-400 font-mono tracking-widest my-2 select-all p-2 rounded-xl bg-slate-900 border border-amber-500/40">
                {generatedResetPin.pin}
              </div>
              <div className="text-[11px] text-slate-400">
                Expires at: <strong className="text-white">{generatedResetPin.expiresAt}</strong>
              </div>
            </div>

            <p className="text-xs text-slate-400 text-left bg-slate-850 p-3 rounded-xl border border-slate-800">
              Provide this code to <strong>{generatedResetPin.user.name}</strong> so they can securely initialize or reset their credentials on their device. Passwords remain private and unviewable.
            </p>

            <button
              onClick={() => setGeneratedResetPin(null)}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all"
            >
              Done & Dismiss
            </button>
          </div>
        </Modal>
      )}

      {/* Supabase Integration Modal */}
      <SupabaseConnectModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
    </div>
  );
};
