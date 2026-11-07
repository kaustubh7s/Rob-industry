import React, { useState } from 'react';
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
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { useAccounts } from '../../context/AccountsContext';

export const AccountsSettingsView: React.FC = () => {
  const { currentUser } = useERP();
  const { companies, deals, payments, documents } = useAccounts();
  const [copiedSql, setCopiedSql] = useState(false);

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

