import React, { useState, useEffect } from 'react';
import {
  Building2,
  Shield,
  CreditCard,
  Database,
  CheckCircle2,
  Copy,
  Check,
  FileText,
  User,
  Info,
  KeyRound,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  AlertCircle,
  Save,
  ShieldCheck,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { useAccounts } from '../../context/AccountsContext';

export const AccountsSettingsView: React.FC = () => {
  const { currentUser, users, updateUser } = useERP();
  const { companies, deals, payments, documents } = useAccounts();
  const [copiedSql, setCopiedSql] = useState(false);

  // Check if current user has main admin authorization
  const isSuperAdmin =
    currentUser?.role === 'super_admin' || currentUser?.authLevel === 'Tier 1: Super Admin';

  // Locate the accountant user in active users list
  const accountantUser = users.find(
    (u) => u.role === 'accountant' || u.id === 'usr-accountant'
  ) || {
    id: 'usr-accountant',
    name: 'Accountant',
    email: 'accounts@rsbequipments.com',
    password: 'accounts@123',
    role: 'accountant' as const,
    department: 'Finance & Accounts',
    authLevel: 'Tier 3: Department Manager' as const,
    status: 'Active' as const,
  };

  const [accName, setAccName] = useState(accountantUser.name || 'Accountant');
  const [accEmail, setAccEmail] = useState(accountantUser.email || 'accounts@rsbequipments.com');
  const [accPassword, setAccPassword] = useState(
    accountantUser.password ||
      (accountantUser.permissions as any)?.password ||
      'accounts@123'
  );
  const [showPassword, setShowPassword] = useState(false);
  const [credentialSavedToast, setCredentialSavedToast] = useState<string | null>(null);

  // Synchronize when user record updates
  useEffect(() => {
    if (accountantUser) {
      setAccName(accountantUser.name || 'Accountant');
      setAccEmail(accountantUser.email || 'accounts@rsbequipments.com');
      setAccPassword(
        accountantUser.password ||
          (accountantUser.permissions as any)?.password ||
          'accounts@123'
      );
    }
  }, [accountantUser.name, accountantUser.email, accountantUser.password]);

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accName.trim() || !accEmail.trim() || !accPassword.trim()) {
      alert('User ID, Login Email, and Security Password cannot be blank.');
      return;
    }

    updateUser(accountantUser.id, {
      name: accName.trim(),
      email: accEmail.trim(),
      password: accPassword.trim(),
      role: 'accountant',
      department: 'Finance & Accounts',
    });

    setCredentialSavedToast(
      `✓ Accountant credentials updated! Login ID: ${accEmail.trim()} / ${accName.trim()} • Password: ${accPassword.trim()}`
    );
    setTimeout(() => setCredentialSavedToast(null), 8000);
  };

  const ACCOUNTS_SCHEMA_SQL = `-- RSB Accounts Portal Tables
CREATE TABLE IF NOT EXISTS public.accounts_companies (
  id TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  gstin TEXT,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.accounts_deals (
  id TEXT PRIMARY KEY,
  deal_number TEXT NOT NULL UNIQUE,
  company_id TEXT NOT NULL REFERENCES public.accounts_companies(id),
  company_name TEXT NOT NULL,
  company_gstin TEXT,
  company_phone TEXT,
  company_address TEXT,
  contact_person TEXT,
  deal_date DATE NOT NULL,
  decided_amount NUMERIC NOT NULL,
  advance_amount NUMERIC DEFAULT 0,
  total_received NUMERIC DEFAULT 0,
  remaining_balance NUMERIC DEFAULT 0,
  payment_terms TEXT NOT NULL,
  expected_payment_date DATE,
  gst_inclusive BOOLEAN DEFAULT TRUE,
  remarks TEXT,
  status TEXT DEFAULT 'awaiting_advance',
  is_archived BOOLEAN DEFAULT FALSE,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.accounts_payments (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL REFERENCES public.accounts_deals(id),
  payment_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  payment_mode TEXT NOT NULL,
  transaction_reference TEXT,
  remarks TEXT,
  is_advance BOOLEAN DEFAULT FALSE,
  payment_proof_url TEXT,
  payment_proof_name TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.accounts_documents (
  id TEXT PRIMARY KEY,
  deal_id TEXT NOT NULL REFERENCES public.accounts_deals(id),
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size NUMERIC DEFAULT 0,
  file_data TEXT,
  uploaded_by TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  category TEXT DEFAULT 'deal_sheet'
);`;

  const handleCopySql = () => {
    navigator.clipboard.writeText(ACCOUNTS_SCHEMA_SQL);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-150">
      <div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Accounts Portal Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configuration, security access, and database architecture for RSB accounts.
        </p>
      </div>

      {/* Accountant Profile Block */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <User className="w-4 h-4 text-slate-700" />
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Active User & Session
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-500 block mb-0.5">Logged In User:</span>
            <strong className="text-slate-900 font-bold">{currentUser?.name || 'Accountant'}</strong>
          </div>
          <div>
            <span className="text-slate-500 block mb-0.5">Assigned Role:</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-mono font-bold text-[11px]">
              {currentUser?.role || 'accountant'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block mb-0.5">Department:</span>
            <strong className="text-slate-900">{currentUser?.department || 'Finance & Accounts'}</strong>
          </div>
        </div>
      </div>

      {/* 🔐 Accountant Login Credentials & Access Control (Main Admin Authorization) */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Accountant Login Credentials (User ID & Password)
              </h2>
              <p className="text-[11px] text-slate-500">
                Official credentials used to enter the RSB Accounts Portal.
              </p>
            </div>
          </div>

          <div>
            {isSuperAdmin ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs">
                👑 Super Admin Authorization Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                <Lock className="w-3 h-3 text-slate-500" />
                <span>Admin Protected</span>
              </span>
            )}
          </div>
        </div>

        {credentialSavedToast && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{credentialSavedToast}</span>
          </div>
        )}

        {isSuperAdmin ? (
          /* Main Admin Form: Fully Editable */
          <form onSubmit={handleSaveCredentials} className="space-y-4 pt-1">
            <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs text-indigo-900 leading-relaxed">
              <strong>Main Admin Authorization:</strong> You can change the Accountant's User ID (Name), Login Email, and Security Password. Once saved, the new credentials will immediately apply to login.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  User ID / Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={accName}
                  onChange={(e) => setAccName(e.target.value)}
                  placeholder="e.g. Accountant"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Can be entered as Login ID</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Login Email *
                </label>
                <input
                  type="email"
                  required
                  value={accEmail}
                  onChange={(e) => setAccEmail(e.target.value)}
                  placeholder="accounts@rsbequipments.com"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-mono"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Primary email for login</span>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Security Password *
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={accPassword}
                    onChange={(e) => setAccPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full pr-9 pl-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Strictly case-sensitive</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
              <div className="text-[11px] text-slate-500">
                Current active ID: <strong className="font-mono text-slate-800">{accountantUser.email}</strong> or <strong className="font-mono text-slate-800">{accountantUser.name}</strong>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Accountant Credentials</span>
              </button>
            </div>
          </form>
        ) : (
          /* Read-only for regular Accountant */
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[11px] mb-0.5">Accountant Login ID:</span>
                <strong className="text-slate-900 font-mono text-sm">{accountantUser.name}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[11px] mb-0.5">Accountant Login Email:</span>
                <strong className="text-slate-900 font-mono text-sm">{accountantUser.email}</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-500 block text-[11px] mb-0.5">Password Security:</span>
                <span className="font-mono text-slate-600 font-bold tracking-widest">••••••••••••</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Protected by Admin</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                Accountant user ID and security password are managed directly by <strong>Super Admin</strong> authorization. Please contact Main Administration if you require a credential reset.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Database & Storage Status */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
          <Database className="w-4 h-4 text-slate-700" />
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Data Storage & Persistence Architecture
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Companies</span>
            <span className="text-lg font-mono font-bold text-slate-900">{companies.length}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Recorded Deals</span>
            <span className="text-lg font-mono font-bold text-slate-900">{deals.length}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Payments Recorded</span>
            <span className="text-lg font-mono font-bold text-slate-900">{payments.length}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-slate-500 block text-[11px]">Attached Documents</span>
            <span className="text-lg font-mono font-bold text-slate-900">{documents.length}</span>
          </div>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-slate-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Dual-Layer Resilient Persistence Active</span>
          </div>
          <p className="text-[11px] leading-relaxed">
            All company deals, advance receipts, payments, and uploaded deal sheet attachments are stored in high-capacity browser IndexedDB with instantaneous localStorage caching. Automatic cloud synchronization runs whenever Supabase is connected.
          </p>
        </div>

        {/* Supabase Schema SQL script helper */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">Optional Supabase SQL Schema:</span>
            <button
              type="button"
              onClick={handleCopySql}
              className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              {copiedSql ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  <span>Copy SQL</span>
                </>
              )}
            </button>
          </div>
          <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto max-h-40 border border-slate-800">
            {ACCOUNTS_SCHEMA_SQL}
          </pre>
        </div>
      </div>
    </div>
  );
};

