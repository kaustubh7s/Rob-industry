import React, { useState } from 'react';
import {
  Settings,
  Users,
  Shield,
  History,
  Database,
  Download,
  Upload,
  RefreshCw,
  Building,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  Trash2,
  UserCheck,
  ShieldCheck,
  Globe,
  Sliders,
  Terminal,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { UserRole } from '../../types/erp';
import { downloadTemplate } from '../../utils/excelIntegration';
import { MemberAuthorizationManager } from './MemberAuthorizationManager';

export const SuperAdminPanel: React.FC = () => {
  const {
    users,
    currentUser,
    setCurrentUserRole,
    auditLogs,
    resetToDemoData,
    exportDatabaseBackup,
    importDatabaseBackup,
  } = useERP();

  const [activeAdminTab, setActiveAdminTab] = useState<'security_matrix' | 'company' | 'backup' | 'audit' | 'templates'>('security_matrix');
  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleBackupFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const success = importDatabaseBackup(text);
        if (success) {
          setImportStatus(`Database successfully restored from ${file.name}!`);
        } else {
          alert('Invalid backup JSON format.');
        }
      } catch (err) {
        alert('Failed to parse backup JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Super Admin Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950 to-slate-900 border border-purple-500/30 shadow-2xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
              Super Admin Executive Command Center
            </h2>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
              Root Tier-1 Master
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Global access gate governance, zero-knowledge identity administration, and factory resilience controls
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportDatabaseBackup}
            className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-purple-600/30 transition-all active:scale-95"
          >
            <Download className="w-4 h-4" /> Export Encrypted JSON Vault
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 overflow-x-auto">
        {[
          { id: 'security_matrix', label: 'Security & Authorization Matrix', icon: ShieldCheck },
          { id: 'company', label: 'Corporate Entity & Tax Profiles', icon: Building },
          { id: 'backup', label: 'Disaster Recovery & JSON Vault', icon: Database },
          { id: 'templates', label: 'Master Excel Schema Templates', icon: FileSpreadsheet },
          { id: 'audit', label: 'System Forensics & Audit Trail', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeAdminTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveAdminTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: SECURITY MATRIX & ZERO-KNOWLEDGE AUTHORIZATION */}
      {activeAdminTab === 'security_matrix' && (
        <MemberAuthorizationManager />
      )}

      {/* TAB 2: COMPANY PROFILE */}
      {activeAdminTab === 'company' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 max-w-4xl shadow-xl">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
            <Building className="w-4 h-4 text-cyan-400" />
            RSB Private Limited Corporate Identity
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Company Legal Name</label>
              <input type="text" disabled value="RSB Private Limited" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white font-bold" />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">GSTIN Number</label>
              <input type="text" disabled value="24AABCR1234F1Z5" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-amber-300 font-mono font-bold" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Plant 1 Address</label>
              <input type="text" disabled value="F, 16/4, Naregaon Main Rd, Naregaon, Chilkalthana, Chhatrapati Sambhajinagar, Maharashtra 431007" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300" />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Primary Email</label>
              <input type="text" disabled value="operations@rsbmetal.com" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300" />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">ERP License / Edition</label>
              <input type="text" disabled value="Enterprise Manufacturing v2.0 (Super Admin Protected)" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-emerald-400 font-bold" />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BACKUP & RESTORE */}
      {activeAdminTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-purple-400" />
              Full Database JSON Vault Export
            </h3>
            <p className="text-xs text-slate-400">
              Download a complete offline copy of all manufacturing orders, material stock balances, vendors, customers, job cards, and costing records.
            </p>
            <button
              onClick={exportDatabaseBackup}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition-all"
            >
              <Download className="w-4 h-4" /> Download Backup (.JSON)
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <Upload className="w-4 h-4 text-cyan-400" />
              Restore from Backup File
            </h3>
            <p className="text-xs text-slate-400">
              Upload a previously exported JSON backup file to restore full system state.
            </p>
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleBackupFile}
                className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-cyan-600 file:text-white hover:file:bg-cyan-500 cursor-pointer"
              />
            </div>
            {importStatus && (
              <p className="text-xs text-emerald-400 font-semibold">{importStatus}</p>
            )}
          </div>

          <div className="sm:col-span-2 p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-3">
            <div className="flex items-center gap-2 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h4 className="text-sm font-bold">Factory Demo State Reset</h4>
            </div>
            <p className="text-xs text-slate-400">
              Clear all custom modifications and restore factory default demo dataset with official RSB manufacturing records (PO 36, Manav Metal, FOHA Conveyor, etc.).
            </p>
            <button
              onClick={resetToDemoData}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all shadow-md"
            >
              Reset to Factory Seed Baseline
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: EXCEL TEMPLATES */}
      {activeAdminTab === 'templates' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Standard Bulk Excel Import & Export Templates
          </h3>
          <p className="text-xs text-slate-400">
            Download standard Excel spreadsheets with headers matching RSB Equipments schema for bulk data ingestion.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            {[
              { type: 'materials', title: 'Raw Materials Master', count: '12 standard columns' },
              { type: 'orders', title: 'Machine Production Orders', count: '10 columns' },
              { type: 'vendors', title: 'Approved Supplier Directory', count: '8 columns' },
            ].map((tmpl) => (
              <div key={tmpl.type} className="p-4 rounded-xl bg-slate-850 border border-slate-800 flex flex-col justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-white">{tmpl.title}</h4>
                  <span className="text-[11px] text-slate-400 font-mono">{tmpl.count}</span>
                </div>
                <button
                  onClick={() => downloadTemplate(tmpl.type as any)}
                  className="w-full py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5" /> Download Template
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeAdminTab === 'audit' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-extrabold text-white">Tamper-Proof Audit Forensics</h3>
              <p className="text-xs text-slate-400">Ledger of all operations conducted across user accounts</p>
            </div>
            <span className="text-xs font-mono text-purple-300 bg-purple-950/60 border border-purple-600/40 px-3 py-1 rounded-lg">
              {auditLogs.length} Total Logs
            </span>
          </div>

          <div className="divide-y divide-slate-800/80 max-h-96 overflow-y-auto font-mono text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between hover:bg-slate-850 px-2 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-purple-300 text-[10px] font-bold">
                    {log.action}
                  </span>
                  <span className="text-slate-300">{log.details}</span>
                </div>
                <span className="text-slate-400 text-[11px] font-sans">by {log.userName}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
