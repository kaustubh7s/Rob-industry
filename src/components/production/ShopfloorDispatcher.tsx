import React, { useState } from 'react';
import {
  Cpu,
  Clock,
  Play,
  Pause,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Users,
  Layers,
  ArrowRight,
  Filter,
  Download,
  Plus,
  Activity,
  Wrench,
  Zap,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { formatINR } from '../../utils/calculations';
import { Modal } from '../common/Modal';

export const ShopfloorDispatcher: React.FC = () => {
  const { machines, jobCards, updateJobCard, currentUser } = useERP();

  const [activeShift, setActiveShift] = useState<'Shift 1 (08:00 - 16:30)' | 'Shift 2 (16:30 - 01:00)' | 'Night Shift'>('Shift 1 (08:00 - 16:30)');
  const [selectedMachineId, setSelectedMachineId] = useState<string>('ALL');
  const [isLogDowntimeModalOpen, setIsLogDowntimeModalOpen] = useState(false);
  const [downtimeMachine, setDowntimeMachine] = useState(machines[0]?.name || '');
  const [downtimeReason, setDowntimeReason] = useState('Tool Insert Wear / Replacement');
  const [downtimeMinutes, setDowntimeMinutes] = useState(25);

  const shifts = [
    { id: 'Shift 1 (08:00 - 16:30)', label: '🌅 Shift 1 (08:00 - 16:30)', supervisor: 'Kishore Parmar' },
    { id: 'Shift 2 (16:30 - 01:00)', label: '🌆 Shift 2 (16:30 - 01:00)', supervisor: 'Rakesh Patel' },
    { id: 'Night Shift', label: '🌙 Night Shift (01:00 - 08:00)', supervisor: 'Dinesh Solanki' },
  ];

  // Timeline slots (Hours of shift)
  const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00 (Lunch)', '14:00', '15:00', '16:00'];

  const filteredMachines = machines.filter(
    (m) => selectedMachineId === 'ALL' || m.id === selectedMachineId || m.code === selectedMachineId
  );

  const handleLogDowntime = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Downtime of ${downtimeMinutes} mins logged for ${downtimeMachine}. Maintenance team notified.`);
    setIsLogDowntimeModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-700 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                MES Shop Floor Machine Dispatcher & Shift Schedule
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                  LIVE SPINDLE TELEMETRY
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Machine capacity allocation, real-time stage scheduling, and Andon bottleneck monitoring.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Shift Selector */}
          <select
            value={activeShift}
            onChange={(e) => setActiveShift(e.target.value as any)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold focus:outline-hidden"
          >
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setIsLogDowntimeModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold transition-all shadow-xs"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Log Stoppage / Andon</span>
          </button>
        </div>
      </div>

      {/* Live Machine Shop Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {machines.map((m) => {
          const isRunning = m.status === 'running';
          const isIdle = m.status === 'idle';
          return (
            <div
              key={m.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                isRunning
                  ? 'bg-slate-900 border-emerald-500/40 ring-1 ring-emerald-500/30'
                  : isIdle
                  ? 'bg-slate-900 border-amber-500/40'
                  : 'bg-slate-900 border-rose-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-black text-slate-400">{m.code}</span>
                <span
                  className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded uppercase flex items-center gap-1 ${
                    isRunning
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : isIdle
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-emerald-400 animate-pulse' : isIdle ? 'bg-amber-400' : 'bg-rose-400'}`} />
                  {m.status}
                </span>
              </div>

              <h4 className="text-xs font-bold text-white mt-1 truncate" title={m.name}>
                {m.name}
              </h4>
              <p className="text-[10px] text-slate-400 truncate">Op: {m.operatorAssigned || 'Unassigned'}</p>

              <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">OEE Rate:</span>
                <span className="font-mono font-bold text-emerald-400">{m.efficiency}%</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Visual Gantt Timeline / Dispatch Matrix */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              Hourly Machine Work Load & Dispatch Timeline ({activeShift})
            </h3>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-[11px] text-slate-300">
              <span className="w-2.5 h-2.5 rounded bg-blue-600 inline-block" /> Active Job
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-300">
              <span className="w-2.5 h-2.5 rounded bg-emerald-600 inline-block" /> QC Verification
            </span>
            <span className="flex items-center gap-1 text-[11px] text-slate-300">
              <span className="w-2.5 h-2.5 rounded bg-slate-800 border border-slate-700 inline-block" /> Available Slot
            </span>
          </div>
        </div>

        {/* Timeline Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-850 text-slate-400 font-mono text-[10px] uppercase">
                <th className="py-2.5 px-3 min-w-[180px] border-r border-slate-800">Machine & Station</th>
                {timeSlots.map((slot) => (
                  <th key={slot} className="py-2.5 px-2 text-center min-w-[110px] border-r border-slate-800/60">
                    {slot}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300 font-sans">
              {filteredMachines.map((m, idx) => {
                const assignedJob = jobCards[idx % jobCards.length];
                return (
                  <tr key={m.id} className="hover:bg-slate-850/40 transition-colors">
                    {/* Machine Column */}
                    <td className="py-3 px-3 border-r border-slate-800 bg-slate-900/90 font-medium">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <div>
                          <span className="font-bold text-white text-xs block">{m.code}</span>
                          <span className="text-[10px] text-slate-400 truncate block max-w-[160px]">{m.name}</span>
                        </div>
                      </div>
                    </td>

                    {/* Timeline Slots */}
                    {timeSlots.map((slot, sIdx) => {
                      if (slot.includes('Lunch')) {
                        return (
                          <td key={sIdx} className="py-2 px-1 text-center bg-slate-950/40 border-r border-slate-800/60 text-[10px] text-slate-600 font-mono">
                            Lunch Break
                          </td>
                        );
                      }

                      const hasActiveWork = (idx + sIdx) % 3 !== 0;
                      if (hasActiveWork && assignedJob) {
                        return (
                          <td key={sIdx} className="p-1 border-r border-slate-800/60">
                            <div className="p-1.5 rounded-lg bg-blue-600/20 border border-blue-500/40 text-[10px] space-y-0.5 hover:bg-blue-600/30 transition-colors cursor-pointer group">
                              <div className="font-mono font-bold text-blue-300 truncate">
                                {assignedJob.jobCardNo}
                              </div>
                              <div className="text-slate-300 truncate font-semibold">
                                {assignedJob.material.split(' ')[0]} {assignedJob.material.split(' ')[1]}
                              </div>
                              <div className="text-[9px] text-slate-400 flex items-center justify-between">
                                <span>{assignedJob.assignedOperator.split(' ')[0]}</span>
                                <span className="text-emerald-400 font-mono font-bold">{assignedJob.completionPct}%</span>
                              </div>
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={sIdx} className="p-1 border-r border-slate-800/60 text-center">
                          <div className="h-full min-h-[44px] rounded-lg border border-dashed border-slate-800/80 hover:border-slate-700 flex items-center justify-center text-[10px] text-slate-600 hover:text-slate-400 cursor-pointer">
                            + Dispatch
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* DOWNTIME / ANDON MODAL */}
      <Modal
        isOpen={isLogDowntimeModalOpen}
        onClose={() => setIsLogDowntimeModalOpen(false)}
        title="Log Machine Stoppage / Andon Breakdown"
        subtitle="Record shopfloor stoppage time, root cause, and auto-dispatch maintenance"
        maxWidth="lg"
      >
        <form onSubmit={handleLogDowntime} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
              Select Machine *
            </label>
            <select
              value={downtimeMachine}
              onChange={(e) => setDowntimeMachine(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-hidden"
            >
              {machines.map((m) => (
                <option key={m.id} value={m.name}>
                  {m.code} - {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
              Breakdown Reason / Category *
            </label>
            <select
              value={downtimeReason}
              onChange={(e) => setDowntimeReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-hidden"
            >
              <option value="Tool Insert Wear / Replacement">Tool Insert Wear / Replacement (कटिंग टूल बदला)</option>
              <option value="Hydraulic Chuck Pressure Drop">Hydraulic Chuck Pressure Drop</option>
              <option value="Coolant Pump Failure">Coolant Pump Failure / Refill</option>
              <option value="Waiting for Raw SS Material">Waiting for Raw SS Material (कच्चा माल नहीं मिला)</option>
              <option value="Program Debugging / CAD Offset">Program Debugging / CAD Offset Fix</option>
              <option value="First-Piece QC Approval Delay">First-Piece QC Approval Delay (जांच में देरी)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
              Estimated Stoppage Duration (Minutes) *
            </label>
            <input
              type="number"
              min="5"
              step="5"
              required
              value={downtimeMinutes}
              onChange={(e) => setDowntimeMinutes(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsLogDowntimeModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Log Stoppage (डाउनटाइम दर्ज करें)</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
