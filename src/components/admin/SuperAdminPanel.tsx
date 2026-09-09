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
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { UserRole } from '../../types/erp';
import { downloadTemplate } from '../../utils/excelIntegration';

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

  const [activeAdminTab, setActiveAdminTab] = useState<'users' | 'company' | 'backup' | 'audit' | 'templates'>('users');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
              <Settings className="w-5 h-5 text-purple-400" />
              Super Admin Control Center & System Settings
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold">
              Enterprise Control
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage user roles, permission access gates, database backups, and factory audit logs
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportDatabaseBackup}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
          >
            <Download className="w-4 h-4" /> Export Full JSON Backup
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 overflow-x-auto">
        {[
          { id: 'users', label: 'Users & Roles', icon: Users },
          { id: 'company', label: 'Company Profile', icon: Building },
          { id: 'backup', label: 'Backup & Restore', icon: Database },
          { id: 'templates', label: 'Excel Templates', icon: FileSpreadsheet },
          { id: 'audit', label: 'System Audit Logs', icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeAdminTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveAdminTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                isActive
                  ? 'bg-purple-500/20 border border-purple-500/40 text-purple-300 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: USERS & ROLES */}
      {activeAdminTab === 'users' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.map((u) => {
              const isCurrent = currentUser.id === u.id;
              return (
                <div
                  key={u.id}
                  className={`p-5 rounded-2xl bg-slate-900 border shadow-lg space-y-3 transition-all ${
                    isCurrent ? 'border-purple-500/50 glow-purple' : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center font-bold text-white text-sm">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">{u.name}</h4>
                        <p className="text-[11px] text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-850 rounded-xl border border-slate-750 text-xs">
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned Role:</span>
                    <span className="font-bold text-purple-300 uppercase font-mono">{u.role.replace('_', ' ')}</span>
                    <p className="text-[11px] text-slate-400 mt-0.5">{u.department}</p>
                  </div>

                  <button
                    onClick={() => setCurrentUserRole(u.role)}
                    className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                      isCurrent
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                    }`}
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{isCurrent ? 'Active Logged-In User' : 'Switch To This User'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: COMPANY PROFILE */}
      {activeAdminTab === 'company' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 max-w-3xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
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
              <input type="text" disabled value="Plot 18/B, Phase 1, GIDC Industrial Estate, Vatva, Ahmedabad - 382445, Gujarat, India" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300" />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Primary Email</label>
              <input type="text" disabled value="operations@rsbmetal.com" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-slate-300" />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">ERP License / Edition</label>
              <input type="text" disabled value="Enterprise Manufacturing v2.0" className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-emerald-400 font-bold" />
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BACKUP & RESTORE */}
      {activeAdminTab === 'backup' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Download className="w-4 h-4 text-purple-400" />
              Full Database JSON Backup
            </h3>
            <p className="text-xs text-slate-400">
              Download a complete offline copy of all manufacturing orders, material stock balances, vendors, customers, job cards, and costing records.
            </p>
            <button
              onClick={exportDatabaseBackup}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md transition-all"
            >
              <Download className="w-4 h-4" /> Download Backup (.JSON)
            </button>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
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
              Clear all custom modifications and restore factory default demo dataset with the official RSB manufacturing table rows (PO 36, Manav Metal, FOHA Conveyor, etc.).
            </p>
            <button
              onClick={resetToDemoData}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all shadow-md"
            >
              Reset to RSB Demo Factory State
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: TEMPLATES */}
      {activeAdminTab === 'templates' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { type: 'materials', title: 'Materials & Stock Template' },
            { type: 'orders', title: 'Manufacturing Orders Template' },
            { type: 'inward', title: 'Inward Register Template' },
            { type: 'vendors', title: 'Vendor Master Template' },
            { type: 'customers', title: 'Customer Master Template' },
            { type: 'projects', title: 'Project Master Template' },
          ].map((t) => (
            <div key={t.type} className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">{t.title}</span>
              <button
                onClick={() => downloadTemplate(t.type as any)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-emerald-600 text-slate-200 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
              >
                <Download className="w-3 h-3" /> XLSX
              </button>
            </div>
          ))}
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeAdminTab === 'audit' && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-850 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Timestamp</th>
                  <th className="p-3">User & Role</th>
                  <th className="p-3">Module</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium text-slate-300">
                {auditLogs.slice(0, 30).map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-mono text-[11px] text-slate-500">{log.timestamp}</td>
                    <td className="p-3">
                      <span className="font-bold text-white block">{log.userName}</span>
                      <span className="text-[10px] text-purple-400 uppercase font-mono">{log.userRole}</span>
                    </td>
                    <td className="p-3 font-semibold text-cyan-400">{log.module}</td>
                    <td className="p-3 font-bold text-amber-300">{log.action}</td>
                    <td className="p-3 text-slate-400 text-[11px]">{log.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
