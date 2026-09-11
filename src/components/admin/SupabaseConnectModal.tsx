import React, { useState, useEffect } from 'react';
import {
  Cloud,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  UploadCloud,
  DownloadCloud,
  Check,
  Shield,
  Trash2,
  Lock,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { useERP } from '../../context/ERPContext';
import {
  getSupabaseConfig,
  saveSupabaseConfig,
  clearSupabaseConfig,
  testSupabaseConnection,
  SupabaseConfig,
} from '../../lib/supabaseClient';
import {
  pushAllDataToSupabase,
  pullAllDataFromSupabase,
} from '../../services/supabaseService';

interface SupabaseConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseConnectModal: React.FC<SupabaseConnectModalProps> = ({ isOpen, onClose }) => {
  const {
    projects,
    projectRequirements,
    materials,
    orders,
    jobCards,
    inwardEntries,
    outwardEntries,
    vendors,
    customers,
    users,
    setProjects,
    setProjectRequirements,
  } = useERP();

  const [config, setConfig] = useState<SupabaseConfig>({
    url: '',
    anonKey: '',
    autoSync: true,
  });

  const [testStatus, setTestStatus] = useState<{
    tested: boolean;
    loading: boolean;
    success: boolean;
    message: string;
  }>({
    tested: false,
    loading: false,
    success: false,
    message: '',
  });

  const [syncStatus, setSyncStatus] = useState<{
    pushing: boolean;
    pulling: boolean;
    message: string;
    type?: 'success' | 'danger' | 'info';
  }>({
    pushing: false,
    pulling: false,
    message: '',
  });

  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const currentConfig = getSupabaseConfig();
      setConfig(currentConfig);
      if (currentConfig.url && currentConfig.anonKey) {
        handleQuickTest(currentConfig.url, currentConfig.anonKey);
      }
    }
  }, [isOpen]);

  const handleQuickTest = async (url: string, key: string) => {
    setTestStatus({ tested: false, loading: true, success: false, message: 'Verifying cloud connection...' });
    const result = await testSupabaseConnection(url, key);
    setTestStatus({
      tested: true,
      loading: false,
      success: result.success,
      message: result.message,
    });
  };

  const handleToggleAutoSync = () => {
    const updated = { ...config, autoSync: !config.autoSync };
    setConfig(updated);
    saveSupabaseConfig(updated);
    setSyncStatus({
      pushing: false,
      pulling: false,
      message: updated.autoSync ? 'Cloud Backup enabled (ON)' : 'Cloud Backup paused (OFF)',
      type: 'info',
    });
    setTimeout(() => setSyncStatus({ pushing: false, pulling: false, message: '' }), 3000);
  };

  const handleSaveConfig = () => {
    saveSupabaseConfig(config);
    handleQuickTest(config.url, config.anonKey);
    setShowAdvanced(false);
  };

  const handleDisconnect = () => {
    if (window.confirm('Are you sure you want to disable and clear cloud backup credentials? Your local data will remain intact.')) {
      clearSupabaseConfig();
      setConfig({ url: '', anonKey: '', autoSync: false });
      setTestStatus({ tested: false, loading: false, success: false, message: '' });
      setSyncStatus({ pushing: false, pulling: false, message: 'Cloud backup credentials cleared.', type: 'info' });
    }
  };

  const handlePushData = async () => {
    setSyncStatus({ pushing: true, pulling: false, message: 'Backing up all project and material records to cloud...', type: 'info' });
    const res = await pushAllDataToSupabase({
      projects,
      requirements: projectRequirements,
      materials,
      orders,
      jobCards,
      inwardEntries,
      outwardEntries,
      vendors,
      customers,
      users,
    });

    setSyncStatus({
      pushing: false,
      pulling: false,
      message: res.success ? `Successfully backed up ${res.count} records to cloud!` : res.message,
      type: res.success ? 'success' : 'danger',
    });
  };

  const handlePullData = async () => {
    if (
      !window.confirm(
        'Restoring will sync all cloud projects & material requirements into your local workspace. Continue?'
      )
    ) {
      return;
    }

    setSyncStatus({ pulling: true, pushing: false, message: 'Restoring records from cloud backup...', type: 'info' });
    const res = await pullAllDataFromSupabase();

    if (res.success && res.data) {
      if (res.data.projects && res.data.projects.length > 0) {
        setProjects(res.data.projects);
      }
      if (res.data.requirements && res.data.requirements.length > 0) {
        setProjectRequirements(res.data.requirements);
      }
      setSyncStatus({
        pushing: false,
        pulling: false,
        message: 'Successfully restored data from cloud backup!',
        type: 'success',
      });
    } else {
      setSyncStatus({
        pushing: false,
        pulling: false,
        message: res.message || 'Failed to restore cloud data.',
        type: 'danger',
      });
    }
  };

  const isConnected = testStatus.success || (Boolean(config.url) && Boolean(config.anonKey));
  const isBackupOn = config.autoSync && isConnected;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="☁️ Cloud Backup" maxWidth="lg">
      <div className="space-y-5">
        {/* Simple ON / OFF Master Switch Banner */}
        <div className={`p-4 rounded-2xl border transition-all ${
          isBackupOn
            ? 'bg-gradient-to-r from-emerald-950/70 via-slate-900 to-emerald-950/50 border-emerald-500/40 shadow-lg shadow-emerald-950/30'
            : 'bg-slate-900 border-slate-800'
        }`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold transition-all ${
                isBackupOn
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-800 border border-slate-700 text-slate-400'
              }`}>
                <Cloud className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-white">Cloud Backup</h3>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border flex items-center gap-1 ${
                    isBackupOn
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {isBackupOn ? <CheckCircle2 className="w-3 h-3 text-emerald-400" /> : <AlertTriangle className="w-3 h-3 text-slate-400" />}
                    {isBackupOn ? 'Active (ON)' : 'Disabled (OFF)'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isBackupOn
                    ? 'All factory projects and material records are automatically backed up.'
                    : 'Cloud backup is turned off. Turn on to protect factory records.'}
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              onClick={handleToggleAutoSync}
              className={`relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                isBackupOn ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  isBackupOn ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Live Storage Summary Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Active Projects
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-white font-mono">{projects.length}</span>
              <span className="text-xs text-slate-400">Projects</span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Material Requirements
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-emerald-400 font-mono">{projectRequirements.length}</span>
              <span className="text-xs text-slate-400">Records</span>
            </div>
          </div>
        </div>

        {/* Action Buttons: 1-Click Backup & 1-Click Restore */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={handlePushData}
            disabled={syncStatus.pushing || syncStatus.pulling}
            className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <UploadCloud className={`w-4 h-4 ${syncStatus.pushing ? 'animate-bounce' : ''}`} />
            <span>{syncStatus.pushing ? 'Backing Up Records...' : 'Backup Now'}</span>
          </button>

          <button
            type="button"
            onClick={handlePullData}
            disabled={syncStatus.pushing || syncStatus.pulling}
            className="py-3 px-4 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-800 disabled:text-slate-600 text-slate-200 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <DownloadCloud className={`w-4 h-4 ${syncStatus.pulling ? 'animate-bounce' : ''}`} />
            <span>{syncStatus.pulling ? 'Restoring Data...' : 'Restore from Cloud'}</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {syncStatus.message && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
              syncStatus.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : syncStatus.type === 'danger'
                ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}
          >
            {syncStatus.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : syncStatus.type === 'danger' ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
            )}
            <span className="font-medium">{syncStatus.message}</span>
          </div>
        )}

        {/* Collapsible Advanced Credentials Settings (Clean & Discrete) */}
        <div className="pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <span>Advanced Configuration</span>
            {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showAdvanced && (
            <div className="mt-3 p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Cloud Server Endpoint:
                </label>
                <input
                  type="text"
                  value={config.url}
                  onChange={(e) => setConfig({ ...config, url: e.target.value.trim() })}
                  placeholder="https://your-cloud-endpoint.co"
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">
                  Cloud Access Key:
                </label>
                <input
                  type="password"
                  value={config.anonKey}
                  onChange={(e) => setConfig({ ...config, anonKey: e.target.value.trim() })}
                  placeholder="Access key token..."
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleDisconnect}
                  disabled={!config.url && !config.anonKey}
                  className="flex items-center gap-1 px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 text-xs rounded-lg transition disabled:opacity-40 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> Clear Config
                </button>

                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-xs transition cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" /> Save Configuration
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
