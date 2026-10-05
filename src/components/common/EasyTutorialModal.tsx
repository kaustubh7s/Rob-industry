import React, { useState } from 'react';
import {
  BookOpen,
  X,
  FileText,
  Truck,
  Wrench,
  ShieldCheck,
  Send,
  Package,
  CheckCircle2,
  ArrowRight,
  Calculator,
  Download,
} from 'lucide-react';
import { Modal } from './Modal';

interface EasyTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab?: (tabId: string) => void;
}

export const EasyTutorialModal: React.FC<EasyTutorialModalProps> = ({ isOpen, onClose, onSelectTab }) => {
  const [activeStep, setActiveStep] = useState(0);

  const tutorialSteps = [
    {
      stepNum: '01',
      title: 'Customer Work Orders & Item Scheduling (कार्य आदेश)',
      subtitle: 'Paper Reference: Customer Order Book / Diary',
      icon: FileText,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      summary: 'When purchase orders arrive from Cadila, Zydus, Torrent, or other pharmaceutical clients, each machine component is entered into the work order schedule.',
      points: [
        'Every drawing reference (e.g. DWG-RSB-MC-0485) and dimension spec is recorded.',
        'Immediate calculation of raw material requirement and delivery deadline.',
        'Full traceability from customer PO to dispatch.',
      ],
      tabId: 'requirements',
      btnLabel: 'Open Requirements Matrix',
    },
    {
      stepNum: '02',
      title: 'Goods Inward & Gate Receipt (सामग्री आवक / GRN)',
      subtitle: 'Paper Reference: Security Gate Inward Book',
      icon: Truck,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      summary: 'When raw stainless steel (plates, flats, pipes) arrives at the factory gate from Manav Metal, Jindal, or Pooja Metal, the GRN voucher is posted.',
      points: [
        'Record vendor challan number, PO number, and metal dimensions.',
        'System automatically computes steel weight in Kg from standard metal density formulas.',
        'Approved goods immediately increase raw material stock balances.',
      ],
      tabId: 'inward',
      btnLabel: 'Open Inward Register',
    },
    {
      stepNum: '03',
      title: 'Shopfloor Job Cards & Routing (कारखाना जॉब कार्ड)',
      subtitle: 'Paper Reference: Machine Chalkboard / Route Slip',
      icon: Wrench,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      summary: 'Shopfloor machinists receive structured job cards for saw cutting, turning, milling, deburring, and welding.',
      points: [
        'Contains drawing tolerances (± 0.05 mm), target quantities, and assigned machine.',
        'Machinists sign off each operation on station terminals.',
        'Supervisors monitor live stage completion % across all cells.',
      ],
      tabId: 'production',
      btnLabel: 'Open Job Card Register',
    },
    {
      stepNum: '04',
      title: 'Quality Assurance & Inspection (गुणवत्ता जांच)',
      subtitle: 'Paper Reference: QC Inspection Log',
      icon: ShieldCheck,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      summary: 'Before assembly or shipment, QA inspectors verify dimensions, Ra surface roughness, and positive material identification (PMI).',
      points: [
        'Record measured dimensions against nominal drawing tolerance.',
        'Generate official Mill Test Certificates (MTC) and Certificates of Conformance (CoC).',
        'Approved lots are cleared for packaging and dispatch.',
      ],
      tabId: 'quality',
      btnLabel: 'Open QA/QC Module',
    },
    {
      stepNum: '05',
      title: 'Delivery Challan & Gate Pass (जावक चालान व गेट पास)',
      subtitle: 'Paper Reference: Delivery Challan Book',
      icon: Send,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      summary: 'When finished machines or components are loaded for transport, the Delivery Challan (DC) and Gate Pass are generated.',
      points: [
        'Logs vehicle number, transporter name, driver contact, and E-Way bill number.',
        'Finished goods inventory is automatically reduced from warehouse stock.',
        'Generates standard printable delivery challans for logistics.',
      ],
      tabId: 'outward',
      btnLabel: 'Open Dispatch Register',
    },
    {
      stepNum: '06',
      title: 'Stock Ledger & Reorder Monitoring (स्टॉक लेजर)',
      subtitle: 'Paper Reference: Warehouse Ledger Register',
      icon: Package,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
      summary: 'Warehouse stock balances for all raw materials, hardware, and finished assemblies are maintained in real time.',
      points: [
        'Automatic debit and credit on goods inward (GRN) and dispatch (DC).',
        'Reorder level indicators notify stores before raw material stock runs out.',
        'Physical stock adjustment and verification audit trails.',
      ],
      tabId: 'materials',
      btnLabel: 'Open Stock Master',
    },
  ];

  const current = tutorialSteps[activeStep];
  const Icon = current.icon;

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="RSB ERP System — Process Manual & SOP"
      subtitle="Standard operating procedures for plant operations, stores, shopfloor, and dispatch"
      maxWidth="4xl"
    >
      <div className="space-y-5 select-none">
        {/* Step Selector Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {tutorialSteps.map((step, idx) => {
            const StepIcon = step.icon;
            const isSelected = activeStep === idx;
            return (
              <button
                key={step.stepNum}
                type="button"
                onClick={() => setActiveStep(idx)}
                className={`p-2.5 rounded-xl border text-left transition-colors flex flex-col justify-between gap-1.5 ${
                  isSelected
                    ? 'bg-blue-600/20 border-blue-500 ring-1 ring-blue-500 text-white'
                    : 'bg-slate-850 border-slate-750 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700">
                    {step.stepNum}
                  </span>
                  <StepIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-blue-400' : 'text-slate-400'}`} />
                </div>
                <span className="text-[11px] font-bold truncate">{step.title.split(' ')[0]} {step.title.split(' ')[1]}</span>
              </button>
            );
          })}
        </div>

        {/* Active Step Content Card */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl border ${current.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-blue-400">Process {current.stepNum} of 06</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {current.subtitle}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mt-0.5">{current.title}</h3>
              </div>
            </div>

            {onSelectTab && (
              <button
                type="button"
                onClick={() => {
                  onSelectTab(current.tabId);
                  onClose();
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
              >
                <span>{current.btnLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-3 rounded-lg border border-slate-800">
            {current.summary}
          </p>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Key Process Requirements & Ledger Impact:
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {current.points.map((pt, i) => (
                <div key={i} className="p-3 rounded-lg bg-slate-850 border border-slate-750 flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <span className="text-[11px] text-slate-300 leading-snug">{pt}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            disabled={activeStep === 0}
            onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-slate-300 text-xs font-medium border border-slate-700"
          >
            ← Previous Section
          </button>

          <div className="flex items-center gap-1.5">
            {tutorialSteps.map((_, i) => (
              <span
                key={i}
                onClick={() => setActiveStep(i)}
                className={`w-2 h-2 rounded-full cursor-pointer transition-all ${
                  activeStep === i ? 'bg-blue-500 w-4' : 'bg-slate-700 hover:bg-slate-600'
                }`}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              if (activeStep < tutorialSteps.length - 1) {
                setActiveStep((prev) => prev + 1);
              } else {
                onClose();
              }
            }}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition-colors"
          >
            {activeStep < tutorialSteps.length - 1 ? 'Next Section →' : 'Close Guide'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
