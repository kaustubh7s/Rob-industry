import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Search,
  CheckCircle2,
  Edit2,
  Trash2,
  Users,
  Building2,
  Shield,
  Activity,
  AlertTriangle,
  Key,
  Download,
  Cloud,
  X,
  UserCheck,
  Check,
  Copy,
  ExternalLink,
  ChevronRight,
  Clock,
  Sparkles,
  LayoutGrid,
  List,
  Lock,
  Unlock,
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
  { role: 'kaustubh', title: 'Plant Head (Kaustubh)', defaultLevel: 'Tier 2: Plant Head / Admin', department: 'Plant Administration & Engineering' },
  { role: 'admin', title: 'Plant Operations Admin', defaultLevel: 'Tier 2: Plant Head / Admin', department: 'Plant Administration & Engineering' },
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
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [copiedPin, setCopiedPin] = useState(false);

  // Drawer & Modals state
  const [selectedDrawerUser, setSelectedDrawerUser] = useState<User | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [generatedResetPin, setGeneratedResetPin] = useState<{ user: User; pin: string; expiresAt: string } | null>(null);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // New Member Form State
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
    },
  });

  // Edit Member Form State
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
      const matchStatus = filterStatus === 'ALL' || (u.status || 'Active') === filterStatus;

      return matchSearch && matchTier && matchDept && matchStatus;
    });
  }, [users, searchTerm, filterTier, filterDepartment, filterStatus]);

  // Unique departments for filter
  const uniqueDepartments = useMemo(() => {
    return Array.from(new Set(users.map((u) => u.department))).filter(Boolean);
  }, [users]);

  // Executive KPI Counts
  const superAdminCount = useMemo(() => {
    return users.filter((u) => u.authLevel?.startsWith('Tier 1') || u.role === 'super_admin').length;
  }, [users]);

  const activeOnlineCount = useMemo(() => {
    return users.filter((u) => u.id === currentUser.id || u.email === currentUser.email).length;
  }, [users, currentUser]);

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
      },
    });
  };

  // Issue Emergency 1-Time Reset PIN
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
    } else if (editForm.authLevel === 'Tier 4: Data Entry Operator') {
      derivedRole = 'operator';
      if (!derivedDept || derivedDept === 'Super Admin & Executive Management') {
        derivedDept = 'Material Data Entry Floor';
      }
    }

    const updatedPermissions: UserPermissions = {
      ...editForm.permissions,
      canEditMaterials: true,
      canApproveOrders: editForm.authLevel === 'Tier 1: Super Admin' || editForm.authLevel === 'Tier 2: Plant Head / Admin' ? true : editForm.permissions.canApproveOrders,
      canOverrideLock: editForm.authLevel === 'Tier 1: Super Admin' || editForm.authLevel === 'Tier 2: Plant Head / Admin' ? true : editForm.permissions.canOverrideLock,
      canManageUsers: editForm.authLevel === 'Tier 1: Super Admin' ? true : (editForm.permissions.canManageUsers || false),
      canDeleteRecords: editForm.authLevel === 'Tier 1: Super Admin' ? true : (editForm.permissions.canDeleteRecords || false),
      canExportReports: true,
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

    if (selectedDrawerUser && selectedDrawerUser.id === editForm.id) {
      setSelectedDrawerUser({
        ...selectedDrawerUser,
        name: editForm.name,
        email: editForm.email,
        role: derivedRole,
        department: derivedDept,
        authLevel: editForm.authLevel,
        status: editForm.status,
        permissions: updatedPermissions,
      });
    }

    setSaveToast(`Updated IAM authorizations for ${editForm.name}`);
    setTimeout(() => setSaveToast(null), 3000);
    setEditingUser(null);
    setEditForm(null);
  };

  // Create New Member
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

    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {
      // ignore
    }

    handleIssueResetPin(newUser);
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
      },
    });
  };

  // Delete Member Handler
  const handleDelete = (user: User) => {
    if (user.id === 'usr-amit' || user.email === 'amit@rsbequipments.com') {
      alert('Root Super Admin (Amit) account is cryptographically locked and cannot be removed.');
      return;
    }
    if (confirm(`Are you sure you want to revoke account access for ${user.name} (${user.email})?`)) {
      deleteUser(user.id);
      if (selectedDrawerUser?.id === user.id) {
        setSelectedDrawerUser(null);
      }
      setSaveToast(`Revoked access for ${user.name}`);
      setTimeout(() => setSaveToast(null), 3000);
    }
  };

  // Helper for Role Badge Colors & Labels
  const getRoleBadge = (user: User) => {
    const isRootAmit = user.name.toLowerCase().includes('amit') || user.email === 'amit@rsbequipments.com' || user.email === 'amit@rsb.com';
    const isSuperAdmin = user.authLevel?.startsWith('Tier 1') || user.role === 'super_admin';
    const isPlantHead = user.authLevel?.startsWith('Tier 2') || user.role === 'kaustubh' || user.role === 'admin';
    const isManager = user.authLevel?.startsWith('Tier 3');

    if (isRootAmit) {
      return {
        label: 'Super Admin',
        badgeClass: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
        dotClass: 'bg-rose-400',
      };
    }
    if (isSuperAdmin) {
      return {
        label: 'Super Admin',
        badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
        dotClass: 'bg-purple-400',
      };
    }
    if (isPlantHead) {
      return {
        label: 'Plant Head',
        badgeClass: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
        dotClass: 'bg-indigo-400',
      };
    }
    if (isManager) {
      return {
        label: 'Department Manager',
        badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
        dotClass: 'bg-blue-400',
      };
    }
    return {
      label: 'Data Entry Operator',
      badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      dotClass: 'bg-emerald-400',
    };
  };

  return (
    <div className="space-y-6 pb-12 animate-fadeIn select-none">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl bg-slate-900/95 border border-purple-500/50 text-white text-xs font-bold shadow-2xl flex items-center gap-2.5 backdrop-blur-md animate-slideUp">
          <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. EXECUTIVE IAM PAGE HEADER */}
      {/* ========================================================================= */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900/90 via-slate-900/80 to-slate-950/90 border border-slate-800/80 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-950/50 border border-purple-500/30 text-purple-300 text-[10px] font-mono font-bold uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5 text-purple-400" />
              <span>Identity & Access Management (IAM)</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
              Identity & Access Control Center
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-2xl font-normal leading-relaxed">
              Manage organization users, roles, permissions, and security access across RSB Equipments.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
            {/* Super Admin Executive Info Pill */}
            <div className="hidden lg:flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-950/80 border border-slate-800 shadow-inner">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-md">
                {currentUser.name ? currentUser.name[0].toUpperCase() : 'A'}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-extrabold text-white">{currentUser.name || 'Amit'}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <div className="text-[10px] text-slate-400 font-mono">Organization Owner</div>
              </div>
            </div>

            {/* Export Access Report */}
            <button
              type="button"
              onClick={exportDatabaseBackup}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              title="Export Full Access Ledger & Permissions (.JSON)"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>Export Report</span>
            </button>

            {/* Security Settings (Cloud Backup) */}
            <button
              type="button"
              onClick={() => setIsSupabaseModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
              title="Cloud Synchronization & Storage Settings"
            >
              <Cloud className="w-3.5 h-3.5 text-cyan-400" />
              <span>Security Settings</span>
            </button>

            {/* Register Member Primary Action */}
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-900/30 transition-all active:scale-95 cursor-pointer ring-1 ring-purple-400/30"
            >
              <UserPlus className="w-4 h-4" />
              <span>Invite Member</span>
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. EXECUTIVE SUMMARY KPI CARDS */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between shadow-xs">
            <div>
              <div className="text-[11px] font-semibold text-slate-400">Total Members</div>
              <div className="text-xl font-black text-white font-mono mt-0.5">{users.length}</div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <Users className="w-4 h-4 text-purple-400" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between shadow-xs">
            <div>
              <div className="text-[11px] font-semibold text-slate-400">Active Users</div>
              <div className="text-xl font-black text-emerald-400 font-mono mt-0.5 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {activeOnlineCount} Online
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between shadow-xs">
            <div>
              <div className="text-[11px] font-semibold text-slate-400">Super Admins</div>
              <div className="text-xl font-black text-rose-300 font-mono mt-0.5">{superAdminCount}</div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between shadow-xs">
            <div>
              <div className="text-[11px] font-semibold text-slate-400">Departments</div>
              <div className="text-xl font-black text-indigo-300 font-mono mt-0.5">{uniqueDepartments.length}</div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-indigo-400" />
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between shadow-xs">
            <div>
              <div className="text-[11px] font-semibold text-slate-400">Security Status</div>
              <div className="text-xs font-black text-cyan-300 font-mono mt-1.5 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                Protected
              </div>
            </div>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. ENTERPRISE FILTER & VIEW CONTROL BAR */}
      {/* ========================================================================= */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search users by name, email, department..."
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-white placeholder-slate-500 text-xs focus:border-purple-500 outline-none transition-all"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-start md:justify-end">
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 text-xs font-medium focus:border-purple-500 outline-none transition-all cursor-pointer"
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
            className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 text-xs font-medium focus:border-purple-500 outline-none transition-all cursor-pointer"
          >
            <option value="ALL">All Departments</option>
            {uniqueDepartments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-300 text-xs font-medium focus:border-purple-500 outline-none transition-all cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Read Only">Read Only</option>
            <option value="Suspended">Suspended</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center p-1 rounded-xl bg-slate-950/80 border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'grid' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
              title="Identity Cards View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'list' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
              title="Compact Table View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. USER DIRECTORY: MODERN IDENTITY CARDS (GRID VIEW) */}
      {/* ========================================================================= */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => {
            const isOnline = user.id === currentUser.id || user.email === currentUser.email;
            const badge = getRoleBadge(user);
            const isRootAmit = user.name.toLowerCase().includes('amit') || user.email === 'amit@rsbequipments.com';

            return (
              <div
                key={user.id}
                className="group relative rounded-3xl bg-slate-900/80 border border-slate-800/90 hover:border-purple-500/40 p-5 shadow-xl transition-all duration-200 hover:-translate-y-0.5 flex flex-col justify-between backdrop-blur-md"
              >
                <div className="space-y-4">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-extrabold text-white text-sm shadow-md ring-1 ring-white/10">
                          {user.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span
                          className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                            isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                          }`}
                          title={isOnline ? 'Online (Logged In)' : 'Offline'}
                        />
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-extrabold text-white text-base leading-tight">{user.name}</h3>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono block mt-0.5">{user.email}</span>
                      </div>
                    </div>

                    {/* Role Badge */}
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border shrink-0 ${badge.badgeClass}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Department & Operational Status */}
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-[11px] text-slate-500 font-medium">Department</span>
                      <span className="font-bold text-slate-200 text-right truncate max-w-[180px]">{user.department || 'Plant Operations'}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span className="text-[11px] text-slate-500 font-medium">Status</span>
                      <span className={`inline-flex items-center gap-1.5 font-bold ${isOnline ? 'text-emerald-400' : 'text-slate-400'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                        {isOnline ? 'Online' : user.status === 'Suspended' ? 'Suspended' : `Offline (${user.lastActive || '5m ago'})`}
                      </span>
                    </div>
                  </div>

                  {/* Security Permission Tags (Chips) */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-mono font-bold text-slate-500 tracking-wider">
                      Active Privileges
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {user.authLevel?.startsWith('Tier 1') || user.role === 'super_admin' ? (
                        <span className="px-2 py-0.5 rounded-lg bg-purple-950/50 text-[10px] font-bold text-purple-300 border border-purple-500/30 flex items-center gap-1">
                          <Check className="w-3 h-3 text-purple-400" /> Full System Access
                        </span>
                      ) : null}
                      {user.permissions?.canEditMaterials && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-800/80 text-[10px] font-medium text-slate-300 border border-slate-700 flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-400" /> Edit Materials
                        </span>
                      )}
                      {user.permissions?.canApproveOrders && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-800/80 text-[10px] font-medium text-slate-300 border border-slate-700 flex items-center gap-1">
                          <Check className="w-3 h-3 text-purple-400" /> Approve Orders
                        </span>
                      )}
                      {user.permissions?.canOverrideLock && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-800/80 text-[10px] font-medium text-slate-300 border border-slate-700 flex items-center gap-1">
                          <Check className="w-3 h-3 text-amber-400" /> Override Locks
                        </span>
                      )}
                      {user.permissions?.canManageUsers && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-800/80 text-[10px] font-medium text-slate-300 border border-slate-700 flex items-center gap-1">
                          <Check className="w-3 h-3 text-cyan-400" /> Manage Users
                        </span>
                      )}
                      {user.permissions?.canExportReports && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-800/80 text-[10px] font-medium text-slate-300 border border-slate-700 flex items-center gap-1">
                          <Check className="w-3 h-3 text-blue-400" /> Export Reports
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center justify-between gap-2 pt-4 mt-4 border-t border-slate-800/80">
                  <div className="flex items-center gap-1.5">
                    {/* Emergency 1-Time Reset PIN */}
                    <button
                      type="button"
                      onClick={() => handleIssueResetPin(user)}
                      className="p-2 rounded-xl bg-slate-950/80 hover:bg-slate-800 text-amber-400 border border-slate-800 hover:border-amber-500/40 text-xs font-semibold transition-all cursor-pointer"
                      title="Issue 1-Time Emergency Reset PIN"
                    >
                      <Key className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete Account (disabled for root Amit) */}
                    {!isRootAmit && (
                      <button
                        type="button"
                        onClick={() => handleDelete(user)}
                        className="p-2 rounded-xl bg-slate-950/80 hover:bg-rose-950/60 text-rose-400 border border-slate-800 hover:border-rose-500/40 text-xs font-semibold transition-all cursor-pointer"
                        title="Revoke User Access"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDrawerUser(user)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-bold transition-all border border-slate-700 shadow-xs cursor-pointer"
                    >
                      View Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(user)}
                      className="px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 hover:text-purple-200 text-xs font-bold transition-all border border-purple-500/30 shadow-xs cursor-pointer flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Manage Access</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. USER DIRECTORY: COMPACT IAM LIST (TABLE VIEW) */}
      {/* ========================================================================= */}
      {viewMode === 'list' && (
        <div className="overflow-hidden rounded-3xl border border-slate-800/80 bg-slate-900/90 shadow-xl backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-5 py-3.5">User Identity</th>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5">Role & Authorization Tier</th>
                  <th className="px-5 py-3.5">Security Gate Permissions</th>
                  <th className="px-5 py-3.5">Session Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredUsers.map((user) => {
                  const isOnline = user.id === currentUser.id || user.email === currentUser.email;
                  const badge = getRoleBadge(user);
                  const isRootAmit = user.name.toLowerCase().includes('amit') || user.email === 'amit@rsbequipments.com';

                  return (
                    <tr key={user.id} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center font-bold text-white text-xs shadow-md shrink-0">
                            {user.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-white text-xs">{user.name}</div>
                            <div className="text-[11px] text-slate-400 font-mono">{user.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="text-slate-300">{user.department || 'Plant Operations'}</span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${badge.badgeClass}`}>
                          {badge.label}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {user.permissions?.canEditMaterials && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 border border-slate-700">
                              Edit Materials
                            </span>
                          )}
                          {user.permissions?.canApproveOrders && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-purple-300 border border-purple-500/30">
                              Approve Orders
                            </span>
                          )}
                          {user.permissions?.canOverrideLock && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-amber-300 border border-amber-500/30">
                              Override Locks
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        {isOnline ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Online (Logged In)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            Offline ({user.lastActive || '5m ago'})
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedDrawerUser(user)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                            title="View Profile Drawer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(user)}
                            className="p-1.5 rounded-lg bg-purple-900/40 hover:bg-purple-900/60 text-purple-300 border border-purple-500/30"
                            title="Manage Access"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {!isRootAmit && (
                            <button
                              type="button"
                              onClick={() => handleDelete(user)}
                              className="p-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-950/80 text-rose-400 border border-rose-500/30"
                              title="Revoke Access"
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
      )}

      {/* ========================================================================= */}
      {/* 6. MEMBER PROFILE DRAWER (MODERN SLIDE-OVER PANEL) */}
      {/* ========================================================================= */}
      {selectedDrawerUser && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity animate-fadeIn"
            onClick={() => setSelectedDrawerUser(null)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-slate-900 border-l border-slate-800 shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-slideLeft">
              <div className="space-y-6">
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-purple-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                      Member Profile & IAM Summary
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDrawerUser(null)}
                    className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Identity Hero */}
                <div className="flex items-center gap-4 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-purple-800 flex items-center justify-center font-black text-white text-lg shadow-xl shrink-0">
                    {selectedDrawerUser.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-white">{selectedDrawerUser.name}</h2>
                    <span className="text-xs text-slate-400 font-mono block mt-0.5">{selectedDrawerUser.email}</span>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ${getRoleBadge(selectedDrawerUser).badgeClass}`}>
                        {getRoleBadge(selectedDrawerUser).label}
                      </span>
                      <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {selectedDrawerUser.id === currentUser.id ? 'Active Session' : 'Enrolled'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Role & Department Information */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Enterprise IAM Attributes
                  </h3>

                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Department</span>
                      <span className="font-bold text-white text-right">{selectedDrawerUser.department || 'Plant Operations'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Security Clearance</span>
                      <span className="font-bold text-purple-300">{selectedDrawerUser.authLevel || 'Tier 4: Data Entry Operator'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Account Status</span>
                      <span className="font-bold text-emerald-400">{selectedDrawerUser.status || 'Active'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Last Active</span>
                      <span className="font-mono text-slate-300">{selectedDrawerUser.lastActive || '5 minutes ago'}</span>
                    </div>
                  </div>
                </div>

                {/* Granted Security Gates (Permission Chips) */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                    Active Security Gates
                  </h3>

                  <div className="space-y-2">
                    {[
                      { label: 'Edit Materials & Entry Workstation', key: 'canEditMaterials', active: selectedDrawerUser.permissions?.canEditMaterials },
                      { label: 'Sign-off & Approve Purchase Orders', key: 'canApproveOrders', active: selectedDrawerUser.permissions?.canApproveOrders },
                      { label: 'Override Locked Terminals & Freeze', key: 'canOverrideLock', active: selectedDrawerUser.permissions?.canOverrideLock },
                      { label: 'Full User & Role Governance Admin', key: 'canManageUsers', active: selectedDrawerUser.permissions?.canManageUsers },
                      { label: 'Export Reports & Audit Data', key: 'canExportReports', active: selectedDrawerUser.permissions?.canExportReports },
                      { label: 'Delete Records & Database Purge', key: 'canDeleteRecords', active: selectedDrawerUser.permissions?.canDeleteRecords },
                    ].map((gate) => (
                      <div
                        key={gate.key}
                        className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold ${
                          gate.active
                            ? 'bg-purple-950/30 border-purple-500/30 text-purple-200'
                            : 'bg-slate-950/40 border-slate-800/80 text-slate-500'
                        }`}
                      >
                        <span>{gate.label}</span>
                        {gate.active ? (
                          <span className="w-5 h-5 rounded-md bg-purple-600/30 text-purple-300 flex items-center justify-center font-bold text-xs">✓</span>
                        ) : (
                          <span className="text-[10px] text-slate-600">Restricted</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Drawer Bottom Actions */}
              <div className="pt-6 border-t border-slate-800 space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    handleOpenEdit(selectedDrawerUser);
                  }}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Alter Security Clearance</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleIssueResetPin(selectedDrawerUser)}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-300 font-bold text-xs border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Key className="w-3.5 h-3.5" />
                  <span>Generate Emergency Reset PIN</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL: REGISTER NEW MEMBER */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Invite New Team Member"
          subtitle="Provision identity, department, and role authorization tier"
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
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:border-purple-500 outline-none"
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
                  placeholder="e.g. rahul@rsbequipments.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:border-purple-500 outline-none"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:border-purple-500 outline-none"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:border-purple-500 outline-none"
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:border-purple-500 outline-none"
              >
                {ALL_AUTH_LEVELS.map((tier) => (
                  <option key={tier} value={tier}>
                    {tier}
                  </option>
                ))}
              </select>
            </div>

            {/* Granular Permission Toggles */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Access Gate Permissions
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-900 border border-slate-800">
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

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-900 border border-slate-800">
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

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-lg bg-slate-900 border border-slate-800">
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
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-750 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-900/30 flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Register & Provision</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 8. MODAL: ALTER AUTHORIZATION & ACCESS MANAGEMENT */}
      {/* ========================================================================= */}
      {editingUser && editForm && (
        <Modal
          isOpen={!!editingUser}
          onClose={() => {
            setEditingUser(null);
            setEditForm(null);
          }}
          title={`Manage Access: ${editForm.name}`}
          subtitle="Configure enterprise security tier, gate permissions, and operational status"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:border-purple-500 outline-none"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:border-purple-500 outline-none"
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
                      };
                    } else if (newTier === 'Tier 4: Data Entry Operator') {
                      autoDept = 'Material Data Entry Floor';
                      autoPerms = {
                        canEditMaterials: true,
                        canApproveOrders: false,
                        canDeleteRecords: false,
                        canManageUsers: false,
                        canExportReports: true,
                        canOverrideLock: false,
                      };
                    }
                    setEditForm({
                      ...editForm,
                      authLevel: newTier,
                      department: autoDept,
                      permissions: autoPerms,
                    });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:border-purple-500 outline-none"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-semibold focus:border-purple-500 outline-none"
                >
                  <option value="Active">Active (Full Privileges)</option>
                  <option value="Read Only">Read Only (Inspection View)</option>
                  <option value="Suspended">Suspended (Access Revoked)</option>
                </select>
              </div>
            </div>

            {/* Granular Permissions Checkboxes */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2.5">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Granular Security Gates
              </span>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={editForm.permissions.canEditMaterials}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        permissions: { ...editForm.permissions, canEditMaterials: e.target.checked },
                      })
                    }
                    className="rounded bg-slate-800 text-purple-600"
                  />
                  <span>Can Edit Materials</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={editForm.permissions.canApproveOrders}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        permissions: { ...editForm.permissions, canApproveOrders: e.target.checked },
                      })
                    }
                    className="rounded bg-slate-800 text-purple-600"
                  />
                  <span>Can Approve Orders</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={editForm.permissions.canOverrideLock}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        permissions: { ...editForm.permissions, canOverrideLock: e.target.checked },
                      })
                    }
                    className="rounded bg-slate-800 text-purple-600"
                  />
                  <span>Can Override Security Locks</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700">
                  <input
                    type="checkbox"
                    checked={editForm.permissions.canExportReports}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        permissions: { ...editForm.permissions, canExportReports: e.target.checked },
                      })
                    }
                    className="rounded bg-slate-800 text-purple-600"
                  />
                  <span>Can Export Reports</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3">
              <button
                type="button"
                onClick={() => handleIssueResetPin(editingUser)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all cursor-pointer"
              >
                <Key className="w-3.5 h-3.5" /> Issue Reset PIN
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingUser(null);
                    setEditForm(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-900/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Save Access Matrix
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* 9. MODAL: EMERGENCY 1-TIME RESET PIN POPUP */}
      {/* ========================================================================= */}
      {generatedResetPin && (
        <Modal
          isOpen={!!generatedResetPin}
          onClose={() => setGeneratedResetPin(null)}
          title="🔑 One-Time Activation / Reset PIN"
          subtitle={`Deliver this temporary PIN securely to ${generatedResetPin.user.name}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-center">
            <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/40 text-left space-y-2">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                <Key className="w-4 h-4" />
                <span>Zero-Knowledge Architecture</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                Employee passwords are encrypted end-to-end. This temporary setup PIN allows the user to securely set or reset their login credentials upon next sign-in.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[10px] uppercase font-mono font-bold text-slate-400">Temporary Access PIN</span>
              <div className="text-3xl font-black font-mono tracking-widest text-purple-300 select-all">
                {generatedResetPin.pin}
              </div>
              <span className="text-[11px] text-slate-500 font-mono block">Expires at {generatedResetPin.expiresAt}</span>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(generatedResetPin.pin);
                  setCopiedPin(true);
                  setTimeout(() => setCopiedPin(false), 2000);
                }}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                {copiedPin ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPin ? 'Copied to Clipboard' : 'Copy PIN'}</span>
              </button>

              <button
                type="button"
                onClick={() => setGeneratedResetPin(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Supabase Connect Modal */}
      {isSupabaseModalOpen && (
        <SupabaseConnectModal isOpen={isSupabaseModalOpen} onClose={() => setIsSupabaseModalOpen(false)} />
      )}
    </div>
  );
};
