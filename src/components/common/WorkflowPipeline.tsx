import React from 'react';
import {
  FileText,
  Truck,
  Wrench,
  ShieldCheck,
  Send,
  Package,
  ArrowRight,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';

interface WorkflowPipelineProps {
  onOpenQuickAction?: (action?: 'order' | 'inward' | 'outward' | 'job' | 'qc') => void;
  compact?: boolean;
}

export const WorkflowPipeline: React.FC<WorkflowPipelineProps> = ({ onOpenQuickAction, compact = false }) => {
  const {
    activeTab,
    setActiveTab,
    orders,
    inwardEntries,
    jobCards,
    qcInspections,
    outwardEntries,
    materials,
  } = useERP();

  // Step counts
  const pendingOrders = orders.filter((o) => o.status !== 'Completed').length;
  const recentInwards = inwardEntries.length;
  const activeJobs = jobCards.filter((j) => j.status !== 'Completed').length;
  const pendingQC = qcInspections.filter((q) => q.status !== 'Passed').length;
  const activeOutward = outwardEntries.filter((o) => o.deliveryStatus === 'Dispatched' || o.deliveryStatus === 'Ready').length;
  const lowStockCount = materials.filter((m) => m.currentStock <= m.minStock).length;

  const steps = [
    {
      id: 'orders',
      stepNum: '1',
      title: 'Order / PO',
      hindiTitle: 'ग्राहक ऑर्डर',
      desc: 'Customer PO 36 & parts required',
      icon: FileText,
      color: 'blue',
      badge: `${pendingOrders} Active`,
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      actionType: 'order' as const,
      actionLabel: '+ New Order',
    },
    {
      id: 'inward',
      stepNum: '2',
      title: 'Material Inward',
      hindiTitle: 'आवक रजिस्टर',
      desc: 'Raw steel arrives at factory gate',
      icon: Truck,
      color: 'emerald',
      badge: `${recentInwards} Logged`,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      actionType: 'inward' as const,
      actionLabel: '+ Inward (GRN)',
    },
    {
      id: 'production',
      stepNum: '3',
      title: 'Shopfloor Jobs',
      hindiTitle: 'कारखाना कटिंग व मशीनिंग',
      desc: 'Lathe, milling, welding & assembly',
      icon: Wrench,
      color: 'amber',
      badge: `${activeJobs} In Progress`,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      actionType: 'job' as const,
      actionLabel: '+ Job Card',
    },
    {
      id: 'quality',
      stepNum: '4',
      title: 'Quality Check',
      hindiTitle: 'जांच व अप्रूवल',
      desc: 'Dimensional & surface QC check',
      icon: ShieldCheck,
      color: 'cyan',
      badge: `${pendingQC > 0 ? pendingQC + ' Pending' : '100% Passed'}`,
      badgeColor: pendingQC > 0 ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      actionType: 'qc' as const,
      actionLabel: '+ QC Report',
    },
    {
      id: 'outward',
      stepNum: '5',
      title: 'Dispatch & Challan',
      hindiTitle: 'जावक डिलीवरी',
      desc: 'Vehicle loaded & DC / E-Way bill',
      icon: Send,
      color: 'purple',
      badge: `${activeOutward} Dispatches`,
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      actionType: 'outward' as const,
      actionLabel: '+ Outward DC',
    },
    {
      id: 'materials',
      stepNum: '6',
      title: 'Godown Stock',
      hindiTitle: 'गोदाम स्टॉक लेजर',
      desc: 'Auto-updated stock & balances',
      icon: Package,
      color: 'indigo',
      badge: `${lowStockCount > 0 ? lowStockCount + ' Reorder Alert' : 'Stock OK'}`,
      badgeColor: lowStockCount > 0 ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      actionType: undefined,
      actionLabel: 'View Ledger',
    },
  ];

  return (
    <div className="w-full rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-700/80 p-4 shadow-xl overflow-hidden">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 font-bold text-xs">
            ⚡
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Factory Digital Workflow (कारखाना कार्यप्रवाह)
              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-blue-600/20 text-blue-300 border border-blue-500/30 font-mono">
                Step-by-Step
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              How orders flow from Gate Entry ➔ Machine Shop ➔ Quality ➔ Dispatch ➔ Stock Ledger
            </p>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 flex items-center gap-1.5 self-start sm:self-auto bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Click any stage below to jump to that register</span>
        </div>
      </div>

      {/* Workflow Step Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 relative">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          const isCurrentTab = activeTab === step.id;

          return (
            <div
              key={step.id}
              className={`relative flex flex-col justify-between p-3 rounded-xl border transition-all cursor-pointer group ${
                isCurrentTab
                  ? 'bg-blue-950/40 border-blue-500 ring-1 ring-blue-500 shadow-lg'
                  : 'bg-slate-800/60 border-slate-700/70 hover:bg-slate-800 hover:border-slate-600'
              }`}
              onClick={() => setActiveTab(step.id)}
            >
              {/* Step Number Tag */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-slate-700 text-[11px] font-mono font-bold text-white flex items-center justify-center border border-slate-600">
                    {step.stepNum}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${step.badgeColor}`}>
                    {step.badge}
                  </span>
                </div>
                {idx < steps.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-slate-600 hidden lg:block absolute -right-2.5 top-1/2 -translate-y-1/2 z-10" />
                )}
              </div>

              {/* Step Title & Subtitle */}
              <div className="space-y-0.5 mb-2">
                <div className="flex items-center gap-1.5">
                  <Icon className="w-4 h-4 text-slate-300 group-hover:text-blue-400 transition-colors" />
                  <span className="text-xs font-bold text-white truncate">{step.title}</span>
                </div>
                <div className="text-[10px] font-medium text-blue-400 font-sans">{step.hindiTitle}</div>
                {!compact && <p className="text-[10px] text-slate-400 leading-tight">{step.desc}</p>}
              </div>

              {/* Quick Action Button */}
              {onOpenQuickAction && step.actionType && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenQuickAction(step.actionType);
                  }}
                  className="w-full mt-1 py-1 px-2 rounded-lg bg-slate-700/80 hover:bg-blue-600 text-slate-200 hover:text-white text-[10px] font-bold flex items-center justify-center gap-1 transition-all border border-slate-600"
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>{step.actionLabel}</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
