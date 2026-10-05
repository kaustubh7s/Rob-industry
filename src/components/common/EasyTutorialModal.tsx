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
  Sparkles,
  Users,
  Building2,
  FileSpreadsheet,
  KeyRound,
  Layers,
  HelpCircle,
  ExternalLink,
  Zap,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Modal } from './Modal';

interface EasyTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab?: (tabId: string) => void;
}

export const EasyTutorialModal: React.FC<EasyTutorialModalProps> = ({
  isOpen,
  onClose,
  onSelectTab,
}) => {
  const [activeStep, setActiveStep] = useState(0);

  // Helper function to download sample excel templates for quick onboarding
  const downloadSampleTemplate = (type: 'materials' | 'bom' | 'vendors') => {
    let wb = XLSX.utils.book_new();
    let fileName = 'RSB_Sample_Template.xlsx';

    if (type === 'materials') {
      fileName = 'RSB_Raw_Materials_Sample_Template.xlsx';
      const data = [
        {
          'Material Code': 'MAT-SS-FLAT-80-6',
          'Material Name': 'SS Flat Bar 80 x 6',
          'Material Type': 'SS Flat',
          'Grade': 'SS 304',
          'Thickness (mm)': 6,
          'Size & Specs': '80 x 6 x 485 mm',
          'Unit': 'Nos',
          'Unit Weight (Kg)': 1.85,
          'Current Stock': 50,
          'Min Stock': 10,
          'Reorder Level': 15,
          'Unit Cost (₹)': 450,
          'Vendor': 'Manav Metal',
        },
        {
          'Material Code': 'MAT-SS-PIPE-106-75',
          'Material Name': 'SS Seamless Pipe OD 106 x ID 75',
          'Material Type': 'SS Pipe',
          'Grade': 'SS 316L',
          'Thickness (mm)': 15.5,
          'Size & Specs': 'OD 106 x ID 75 x 110 mm',
          'Unit': 'Nos',
          'Unit Weight (Kg)': 3.82,
          'Current Stock': 20,
          'Min Stock': 5,
          'Reorder Level': 10,
          'Unit Cost (₹)': 1950,
          'Vendor': 'Apex Steel',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Materials');
    } else if (type === 'bom') {
      fileName = 'RSB_Project_BOM_Sample_Template.xlsx';
      const data = [
        {
          'Sr No': 1,
          'Description': 'Washing System Carousel Main Disc',
          'Material Type': 'SS Circle',
          'Grade': 'SS 304',
          'Size & Specifications': 'OD 285 x 12 MM',
          'Quantity': 4,
          'Unit': 'Nos',
          'Project Name': 'PRJ-2026-PHARMA-RINSER',
          'Customer Name': 'Cadila Healthcare Ltd',
          'Machine Type': 'Automatic Rotary Rinser',
          'Vendor': 'Manav Metal',
        },
        {
          'Sr No': 2,
          'Description': 'Main Drive Spindle Shaft',
          'Material Type': 'SS Bar',
          'Grade': 'SS 316',
          'Size & Specifications': 'Dia 45 x 350 MM',
          'Quantity': 2,
          'Unit': 'Nos',
          'Project Name': 'PRJ-2026-PHARMA-RINSER',
          'Customer Name': 'Cadila Healthcare Ltd',
          'Machine Type': 'Automatic Rotary Rinser',
          'Vendor': 'Jindal Stainless Hub',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Project Requirements');
    } else {
      fileName = 'RSB_Vendors_List_Sample_Template.xlsx';
      const data = [
        {
          'Vendor Name': 'Manav Metal',
          'Contact Person': 'Sunil Shah',
          'Mobile': '+91 98250 12345',
          'Email': 'orders@manavmetal.in',
          'GSTIN': '24AAECM1234F1Z8',
          'City & Address': 'Plot 44, GIDC Vatva, Ahmedabad',
          'Material Supplied': 'SS Flat, SS Pipe, SS Circle, Laser Blanks',
          'Payment Terms': '30 Days Net',
        },
      ];
      const ws = XLSX.utils.json_to_sheet(data);
      XLSX.utils.book_append_sheet(wb, ws, 'Vendors');
    }

    XLSX.writeFile(wb, fileName);
  };

  const tutorialSteps = [
    {
      stepNum: '01',
      title: 'Material Catalog & Inventory Masters (सामग्री मास्टर)',
      subtitle: 'Step 1: Set up your raw materials, grades, and inventory',
      icon: Package,
      color: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      tag: 'Raw Materials & Stock',
      summary:
        'Manage your factory raw materials catalog across SS Flats, Pipes, Circles, Bars, and Hardware with auto-calculated metal weights and stock alerts.',
      points: [
        'Add standard metal dimensions (e.g. 80 x 6 x 485 mm, OD 106 x ID 75 mm).',
        'Set Minimum Stock and Reorder Level alerts to prevent shopfloor shortages.',
        'Use the built-in SS Engineering Weight Calculator to auto-compute theoretical steel weights.',
        'Bulk import your existing material catalog in 1 click via Excel.',
      ],
      tabId: 'materials',
      btnLabel: 'Go to Materials Catalog',
      templateType: 'materials' as const,
      templateLabel: 'Download Materials Excel Template (.xlsx)',
    },
    {
      stepNum: '02',
      title: 'Project Material BOM & 10-Col Entry (प्रोजेक्ट मटेरियल एंट्री)',
      subtitle: 'Step 2: Create machine orders and BOM breakdowns',
      icon: FileText,
      color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
      tag: 'Projects & BOM',
      summary:
        'When customer machine orders arrive, enter machine specifications in the ultra-fast 10-column spreadsheet grid to track components and procurement requirements.',
      points: [
        'Record Project Name, Customer, Machine Type, Size Specs, and Quantities.',
        'Self-learning auto-complete suggests standard descriptions, sizes, and stainless grades.',
        'Directly links each component to live stock availability and auto-flags shortages.',
        'BOM line items auto-sync with shopfloor job cards and procurement baskets.',
      ],
      tabId: 'requirements',
      btnLabel: 'Open Project BOM Entry',
      templateType: 'bom' as const,
      templateLabel: 'Download Project BOM Excel Template (.xlsx)',
    },
    {
      stepNum: '03',
      title: 'Procurement Basket & One-Click PO Generation (खरीद आदेश)',
      subtitle: 'Step 3: Allocate materials to suppliers and issue POs',
      icon: FileSpreadsheet,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      tag: 'Procurement & PO',
      summary:
        'Bundle material shortages across all active projects by vendor, generate official PDF Purchase Orders, and dispatch directly via WhatsApp in 1 click.',
      points: [
        'Multi-Vendor Allocation Hub bundles requirements for Manav Metal, Apex Steel, or local suppliers.',
        'Generates branded PDF Purchase Orders with clean tabular layouts and terms.',
        'Send official PO directly via WhatsApp Web with one click.',
        'Auto-saves generated POs in the PO Register with live ETA tracking.',
      ],
      tabId: 'procurement',
      btnLabel: 'Open Procurement Basket',
      templateType: 'vendors' as const,
      templateLabel: 'Download Vendors List Template (.xlsx)',
    },
    {
      stepNum: '04',
      title: 'Stores & Inward Material Verification (सामग्री आवक / MRN)',
      subtitle: 'Step 4: Receive goods at factory gate and update stock',
      icon: Truck,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
      tag: 'Stores & Inward',
      summary:
        'Storekeepers and managers verify physical raw steel deliveries at the gate, upload vendor delivery challans, and automatically increase inventory.',
      points: [
        'One-touch "Tick Inward Receipt (आवक)" button in Project Material details for fast gate verification.',
        'Automatic calculation of received weights in Kg vs ordered quantities.',
        'Approved goods immediately increase live available stock balances in the warehouse.',
        'Storekeepers can use the dedicated mobile-optimized interface on shopfloor tablets.',
      ],
      tabId: 'inward',
      btnLabel: 'Open Inward Register',
    },
    {
      stepNum: '05',
      title: 'Microsoft Spreadsheet Center (मास्टर एक्सेल रजिस्टर)',
      subtitle: 'Step 5: Full Excel power with sheets, formulas & live sync',
      icon: Layers,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
      tag: 'Spreadsheet Center',
      summary:
        'Work seamlessly inside high-speed spreadsheet registers for Daily POs, Delivery Challans (DC Book), and Spare Parts with real-time formulas and Excel exports.',
      points: [
        'Full support for mathematical formulas: =SUM(), =A1*B1, and arithmetic expressions.',
        'Add custom directory folders, multiple sheet tabs, color tags, and formatting.',
        'Import any external .xlsx file or export your live registers to Excel anytime.',
        'Automatic real-time saving ensures zero data loss during network hiccups.',
      ],
      tabId: 'microsoft',
      btnLabel: 'Open Spreadsheet Center',
    },
    {
      stepNum: '06',
      title: 'Super Admin Member Security & Controls (सदस्य प्राधिकरण)',
      subtitle: 'Step 6: User roles, username changes & password resets',
      icon: ShieldCheck,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
      tag: 'Security & Access',
      summary:
        'Super Administrators hold complete control over user credentials, username modifications, instant password changes, and granular access gates.',
      points: [
        'Super Admins (Rahul & Administrator) can change employee usernames and passwords anytime.',
        'Password visibility toggle (Eye icon) allows setting or reviewing credentials easily.',
        'Assign Role Tiers: Super Admin, Plant Head, Store Manager, or Data Entry Operator.',
        '1-Click encrypted database snapshot export and cloud backup sync.',
      ],
      tabId: 'admin',
      btnLabel: 'Open Member Authorizations',
    },
  ];

  const current = tutorialSteps[activeStep];
  const Icon = current.icon;

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="RSB Industry Platform — Client Quickstart & System Guide"
      subtitle="Interactive step-by-step walkthrough of factory workflows, procurement, and spreadsheet tools"
      maxWidth="4xl"
    >
      <div className="space-y-6 select-none text-slate-200">
        {/* Step Selector Horizontal Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {tutorialSteps.map((step, idx) => {
            const StepIcon = step.icon;
            const isSelected = activeStep === idx;
            return (
              <button
                key={step.stepNum}
                type="button"
                onClick={() => setActiveStep(idx)}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                  isSelected
                    ? 'bg-purple-600/20 border-purple-500 ring-1 ring-purple-500 text-white shadow-lg shadow-purple-600/20 scale-[1.02]'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      isSelected
                        ? 'bg-purple-500 text-white'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    STEP {step.stepNum}
                  </span>
                  <StepIcon
                    className={`w-4 h-4 ${
                      isSelected ? 'text-purple-400' : 'text-slate-500'
                    }`}
                  />
                </div>
                <div className="text-xs font-bold leading-tight line-clamp-2">
                  {step.tag}
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Step Showcase Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 pb-4 border-b border-slate-800">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0 ${current.color}`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold">
                    STEP {current.stepNum} OF 06
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {current.subtitle}
                  </span>
                </div>
                <h3 className="text-lg font-black text-white mt-1">
                  {current.title}
                </h3>
              </div>
            </div>

            {/* Template Download if available */}
            {current.templateType && (
              <button
                type="button"
                onClick={() => downloadSampleTemplate(current.templateType!)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all shrink-0 cursor-pointer shadow-sm active:scale-95"
                title="Download pre-formatted Excel template"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Sample Excel (.xlsx)</span>
              </button>
            )}
          </div>

          <div className="py-4 space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
              {current.summary}
            </p>

            <div className="space-y-2.5">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Key Operations & Standard Workflow:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {current.points.map((pt, pIdx) => (
                  <div
                    key={pIdx}
                    className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-850/70 border border-slate-800/60 text-xs text-slate-200"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{pt}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Action Navigation Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-slate-800 mt-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Navigate Guide:</span>
              <button
                type="button"
                disabled={activeStep === 0}
                onClick={() => setActiveStep((prev) => Math.max(0, prev - 1))}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-white text-xs font-semibold cursor-pointer"
              >
                ← Previous
              </button>
              <button
                type="button"
                disabled={activeStep === tutorialSteps.length - 1}
                onClick={() =>
                  setActiveStep((prev) =>
                    Math.min(tutorialSteps.length - 1, prev + 1)
                  )
                }
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none text-white text-xs font-semibold cursor-pointer"
              >
                Next →
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Dismiss
              </button>

              {onSelectTab && (
                <button
                  type="button"
                  onClick={() => {
                    onSelectTab(current.tabId);
                    onClose();
                  }}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-extrabold shadow-lg shadow-purple-600/30 transition-all active:scale-95 cursor-pointer"
                >
                  <span>{current.btnLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Tips & Always-Accessible Info Bar */}
        <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Pro-Tip:</strong> You can click the floating{' '}
              <strong className="text-white">📖 Guide icon</strong> at the
              bottom-right corner anytime to reopen this walkthrough.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveStep(0)}
            className="text-purple-400 hover:text-purple-300 font-bold underline shrink-0 cursor-pointer"
          >
            Restart Tutorial
          </button>
        </div>
      </div>
    </Modal>
  );
};

// =========================================================================
// FLOATING CORNER BUTTON COMPONENT (Always accessible in bottom-right corner)
// =========================================================================
interface FloatingTutorialButtonProps {
  onClick: () => void;
}

export const FloatingTutorialButton: React.FC<FloatingTutorialButtonProps> = ({
  onClick,
}) => {
  return (
    <div className="fixed bottom-5 right-5 z-40 group select-none">
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-xs shadow-2xl shadow-purple-600/50 border border-purple-400/40 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer animate-pulse hover:animate-none"
        title="Open Client Quickstart Tutorial & SOP Guide (Click anytime)"
      >
        <div className="relative">
          <BookOpen className="w-4 h-4 text-purple-100" />
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-purple-900" />
        </div>
        <span className="font-bold tracking-wide">Quick Guide</span>
        <span className="hidden group-hover:inline-block text-[10px] bg-white/20 px-1.5 py-0.5 rounded text-white font-mono transition-all">
          SOP
        </span>
      </button>
    </div>
  );
};
