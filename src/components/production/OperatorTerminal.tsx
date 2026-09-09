import React, { useState } from 'react';
import {
  Wrench,
  Play,
  Pause,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  QrCode,
  User,
  Cpu,
  Layers,
  Sparkles,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { JobCard } from '../../types/erp';
import { Modal } from '../common/Modal';

export const OperatorTerminal: React.FC = () => {
  const { jobCards, updateJobCard, machines, currentUser } = useERP();

  const [selectedJob, setSelectedJob] = useState<JobCard>(jobCards[0] || null);
  const [activeMachine, setActiveMachine] = useState<string>('CNC Lathe 01 (LMW LL20T)');
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [scrapCount, setScrapCount] = useState<number>(0);
  const [isScrapModalOpen, setIsScrapModalOpen] = useState(false);
  const [scrapReason, setScrapReason] = useState('Tool Chatter / Rough Surface Finish');

  const operations = selectedJob?.operations || [
    { step: 1, name: 'Raw Material Saw Cutting (80x6x485)', completed: true, operator: 'Mahesh Thakor', timeSpentHours: 0.5 },
    { step: 2, name: 'CNC Turning & Facing (OD 106mm)', completed: true, operator: 'Kailash Sharma', timeSpentHours: 1.2 },
    { step: 3, name: 'Milling Slots & Bolt Holes (PCD 85)', completed: false, operator: 'Mahesh Thakor', timeSpentHours: 0.8 },
    { step: 4, name: 'Edge Deburring & 400 Grit Buffing', completed: false, operator: 'Ramu K.', timeSpentHours: 0.4 },
    { step: 5, name: 'Final Quality Inspection (QC Lead)', completed: false, operator: 'Bharat Panchal', timeSpentHours: 0.3 },
  ];

  const handleToggleOperation = (stepNum: number) => {
    if (!selectedJob) return;
    const updatedOps = operations.map((op) =>
      op.step === stepNum ? { ...op, completed: !op.completed } : op
    );
    const completedOps = updatedOps.filter((o) => o.completed).length;
    const newPct = Math.round((completedOps / updatedOps.length) * 100);

    updateJobCard(selectedJob.id, {
      operations: updatedOps,
      completionPct: newPct,
      status: newPct === 100 ? 'Completed' : 'Cutting',
    });

    setSelectedJob({
      ...selectedJob,
      operations: updatedOps,
      completionPct: newPct,
    });
  };

  const handleLogScrap = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Logged ${scrapCount} scrap piece(s) due to: ${scrapReason}. Material waste ledger updated.`);
    setIsScrapModalOpen(false);
    setScrapCount(0);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              Shop Floor Operator Terminal (मशीन ऑपरेटर टर्मिनल)
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                TOUCH STATION
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Live machinist punch terminal for step-by-step operation signoff and drawing reference.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={activeMachine}
            onChange={(e) => setActiveMachine(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 focus:outline-hidden"
          >
            {machines.map((m) => (
              <option key={m.id} value={`${m.name} (${m.code})`}>
                Station: {m.code} - {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Terminal Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Side: Job Card Queue (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Assigned Job Queue ({jobCards.length})
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">READY TO RUN</span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
            {jobCards.map((job) => {
              const isSelected = selectedJob?.id === job.id;
              return (
                <div
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500 text-white shadow-lg'
                      : 'bg-slate-900 border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-black text-amber-400">{job.jobCardNo}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono">
                      {job.completionPct}% Done
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-white mt-1.5 truncate">{job.project}</h4>
                  <p className="text-[11px] text-slate-400 font-mono truncate">{job.material}</p>

                  <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                    <span>Qty: <strong className="text-slate-200 font-mono">{job.quantity} {job.unit}</strong></span>
                    <span>Op: <strong className="text-slate-200">{job.assignedOperator}</strong></span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Side: Active Operation Punch & Checklists (8 cols) */}
        {selectedJob && (
          <div className="lg:col-span-8 space-y-4">
            {/* Active Job Hero Card */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-black text-amber-400">{selectedJob.jobCardNo}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/30">
                      {selectedJob.customer}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1">{selectedJob.project}</h3>
                  <p className="text-xs text-slate-300 font-mono mt-0.5">
                    Spec: <strong>{selectedJob.material}</strong> | Drawing: <strong>{selectedJob.drawingRef}</strong>
                  </p>
                </div>

                <div className="text-right">
                  <div className="text-2xl font-black font-mono text-emerald-400">
                    {selectedJob.completionPct}%
                  </div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wide">Stage Progress</span>
                </div>
              </div>

              {/* Step-by-Step Machining Checkpoints */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase">
                  <span>Routing Stages & Checkoffs (कारखाना ऑपरेशन चेकलिस्ट)</span>
                  <span className="text-[10px] font-normal text-slate-400">Tap stage to mark complete</span>
                </div>

                <div className="space-y-2">
                  {operations.map((op) => (
                    <div
                      key={op.step}
                      onClick={() => handleToggleOperation(op.step)}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        op.completed
                          ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                          : 'bg-slate-850/80 border-slate-700/80 hover:bg-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            op.completed
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-slate-750 border border-slate-600 text-slate-300'
                          }`}
                        >
                          {op.completed ? <CheckCircle2 className="w-4 h-4" /> : op.step}
                        </div>
                        <div className="min-w-0">
                          <span className={`text-xs font-bold block ${op.completed ? 'line-through text-emerald-300' : 'text-white'}`}>
                            {op.name}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Assigned: {op.operator} • Est: {op.timeSpentHours} hrs
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className={`px-3 py-1 rounded-lg text-xs font-bold shrink-0 transition-colors ${
                          op.completed
                            ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40'
                            : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
                        }`}
                      >
                        {op.completed ? 'Passed ✓' : 'Mark Done'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons for Operator */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setIsScrapModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Report Scrap / Rejection (खराब माल)</span>
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    Drawing Specs Verified: <strong className="text-white font-mono">{selectedJob.drawingRef}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SCRAP / DEFECT MODAL */}
      <Modal
        isOpen={isScrapModalOpen}
        onClose={() => setIsScrapModalOpen(false)}
        title="Log Material Scrap / Machining Defect"
        subtitle="Record defect count and update scrap inventory ledger"
        maxWidth="md"
      >
        <form onSubmit={handleLogScrap} className="space-y-4">
          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
              Quantity Scrapped (संख्या) *
            </label>
            <input
              type="number"
              min="1"
              required
              value={scrapCount}
              onChange={(e) => setScrapCount(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
              Defect Reason / Root Cause *
            </label>
            <select
              value={scrapReason}
              onChange={(e) => setScrapReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-hidden"
            >
              <option value="Tool Chatter / Rough Surface Finish">Tool Chatter / Rough Surface Finish</option>
              <option value="Oversize Bore / Tolerance Exceeded">Oversize Bore / Tolerance Exceeded (साइज बड़ा हो गया)</option>
              <option value="Material Inclusion / Porosity">Material Raw Porosity / Crack</option>
              <option value="Wrong Toolpath Offset">Wrong Toolpath Offset (प्रोग्रामिंग गड़बड़)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsScrapModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-all"
            >
              Log Scrap Entry
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
