import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronLeft, X, Sparkles, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';
import { useERP } from '../../context/ERPContext';

export interface TourStep {
  id: string;
  targetSelector: string;
  tabId?: string;
  label: string;
  stepNum: number;
  openModalEvent?: string;
  isShortcutOverlay?: boolean;
  offsetX?: number;
  offsetY?: number;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'step-1-create-project',
    targetSelector: '[data-tour="tour-select-new-project-btn"], [data-tour="tour-add-project-btn"]',
    tabId: 'entry',
    label: '1. Click + New Project & Create',
    stepNum: 1,
  },
  {
    id: 'step-2-add-material',
    targetSelector: '[data-tour="tour-material-input-form"], [data-tour="tour-material-grid"]',
    tabId: 'entry',
    label: '2. Fill Description, Size, Qty & Click + Add',
    stepNum: 2,
  },
  {
    id: 'step-3-save-order',
    targetSelector: '[data-tour="tour-save-order-btn"]',
    tabId: 'entry',
    label: '3. Click Save Order',
    stepNum: 3,
  },
  {
    id: 'step-4-ctrl-2-shortcut',
    targetSelector: '[data-tour="tour-directory-basket-btn"], [data-tour="tour-directory-first-project-card"], [data-tour="tour-projects-grid"]',
    label: '4. Press Ctrl+2 to Go to Projects Directory',
    stepNum: 4,
    isShortcutOverlay: true,
  },
  {
    id: 'step-5-select-directory-project',
    targetSelector: '[data-tour="tour-directory-basket-btn"], [data-tour="tour-directory-open-project"], [data-tour="tour-directory-first-project-card"]',
    tabId: 'projects',
    label: '5. Click Basket on Project Card',
    stepNum: 5,
  },
  {
    id: 'step-6-tick-checkbox',
    targetSelector: '[data-tour="tour-basket-first-checkbox"], input[type="checkbox"]',
    tabId: 'procurement',
    label: '6. Tick Material Row Checkbox',
    stepNum: 6,
    offsetX: 48, // Offset to the right so the checkbox remains 100% accessible and unobstructed
    offsetY: -12,
  },
  {
    id: 'step-7-assign-vendor',
    targetSelector: '[data-tour="tour-basket-assign-vendor"], [data-tour="tour-basket-generate-po"]',
    tabId: 'procurement',
    label: '7. Click Assign Vendor & Confirm',
    stepNum: 7,
  },
  {
    id: 'step-8-generate-po',
    targetSelector: '[data-tour="tour-basket-generate-po"], [data-tour="tour-issue-direct-po"]',
    tabId: 'procurement',
    label: '8. Click Generate PO - Complete! 🎉',
    stepNum: 8,
  },
];

interface InteractiveGlidingTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InteractiveGlidingTour: React.FC<InteractiveGlidingTourProps> = ({
  isOpen,
  onClose,
}) => {
  const { activeTab, setActiveTab } = useERP();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const step = TOUR_STEPS[currentStepIndex];

  // Calculate target element coordinates
  const updateTargetPosition = useCallback(() => {
    if (!isOpen || !step || step.isShortcutOverlay) {
      setTargetRect(null);
      return;
    }

    const selectors = step.targetSelector.split(',').map((s) => s.trim());
    let el: Element | null = null;
    for (const sel of selectors) {
      const found = document.querySelector(sel);
      if (found) {
        el = found;
        break;
      }
    }

    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [isOpen, step]);

  // Handle step transitions & smooth scrolling to elements
  useEffect(() => {
    if (!isOpen) {
      setCurrentStepIndex(0);
      setIsCompleted(false);
      return;
    }

    // Redirect to tab ONLY for step 1, 2, 3 (initial entry) - Step 4 prompts user first without auto-redirecting
    if (step?.tabId && currentStepIndex !== 3) {
      if (activeTab !== step.tabId && currentStepIndex <= 2) {
        setActiveTab(step.tabId);
      }
    }

    if (step?.openModalEvent) {
      window.dispatchEvent(new CustomEvent(step.openModalEvent));
    }

    const checkElementInterval = setInterval(() => {
      if (!step.isShortcutOverlay) {
        const selectors = step.targetSelector.split(',').map((s) => s.trim());
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            updateTargetPosition();
            clearInterval(checkElementInterval);
            break;
          }
        }
      }
    }, 100);

    const safetyTimeout = setTimeout(() => {
      clearInterval(checkElementInterval);
      updateTargetPosition();
    }, 1000);

    return () => {
      clearInterval(checkElementInterval);
      clearTimeout(safetyTimeout);
    };
  }, [currentStepIndex, isOpen, step, updateTargetPosition, activeTab, setActiveTab]);

  // Window resize & scroll listeners
  useEffect(() => {
    if (!isOpen) return;

    window.addEventListener('resize', updateTargetPosition);
    window.addEventListener('scroll', updateTargetPosition, true);

    return () => {
      window.removeEventListener('resize', updateTargetPosition);
      window.removeEventListener('scroll', updateTargetPosition, true);
    };
  }, [isOpen, updateTargetPosition]);

  // Reactive Listeners for Real User Actions
  useEffect(() => {
    if (!isOpen) return;

    // 1. Project Created -> Advance from Step 1 to Step 2
    const handleProjectCreated = () => {
      if (currentStepIndex === 0) {
        setCurrentStepIndex(1);
      }
    };

    // 2. Material Added -> Advance from Step 2 to Step 3
    const handleMaterialAdded = () => {
      if (currentStepIndex === 1) {
        setCurrentStepIndex(2);
      }
    };

    // 3. Order Saved -> Advance from Step 3 to Step 4 (Show Ctrl+2 to Projects Directory)
    const handleOrderSaved = () => {
      if (currentStepIndex === 2) {
        setCurrentStepIndex(3);
      }
    };

    // 5. Directory Project Selected -> Advance from Step 5 to Step 6
    const handleDirectoryProjectSelected = () => {
      if (currentStepIndex === 4) {
        setCurrentStepIndex(5);
      }
    };

    // 5b. Basket Project Selected -> Advance from Step 5 to Step 6
    const handleBasketProjectSelected = () => {
      if (currentStepIndex === 4) {
        setCurrentStepIndex(5);
      }
    };

    // 6. Item Checkbox Ticked -> Advance from Step 6 to Step 7
    const handleItemSelected = () => {
      if (currentStepIndex === 5) {
        setCurrentStepIndex(6);
      }
    };

    // 7. Vendor Assigned -> Advance from Step 7 to Step 8
    const handleVendorAssigned = () => {
      if (currentStepIndex === 6) {
        setCurrentStepIndex(7);
      }
    };

    // 8. PO Generated -> Complete Tutorial
    const handlePOGenerated = () => {
      if (currentStepIndex === 7) {
        setIsCompleted(true);
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
      }
    };

    window.addEventListener('rsb:tour:project-created', handleProjectCreated);
    window.addEventListener('rsb:tour:material-added', handleMaterialAdded);
    window.addEventListener('rsb:tour:order-saved', handleOrderSaved);
    window.addEventListener('rsb:tour:directory-project-selected', handleDirectoryProjectSelected);
    window.addEventListener('rsb:tour:basket-project-selected', handleBasketProjectSelected);
    window.addEventListener('rsb:tour:item-selected', handleItemSelected);
    window.addEventListener('rsb:tour:vendor-assigned', handleVendorAssigned);
    window.addEventListener('rsb:tour:po-generated', handlePOGenerated);

    return () => {
      window.removeEventListener('rsb:tour:project-created', handleProjectCreated);
      window.removeEventListener('rsb:tour:material-added', handleMaterialAdded);
      window.removeEventListener('rsb:tour:order-saved', handleOrderSaved);
      window.removeEventListener('rsb:tour:directory-project-selected', handleDirectoryProjectSelected);
      window.removeEventListener('rsb:tour:basket-project-selected', handleBasketProjectSelected);
      window.removeEventListener('rsb:tour:item-selected', handleItemSelected);
      window.removeEventListener('rsb:tour:vendor-assigned', handleVendorAssigned);
      window.removeEventListener('rsb:tour:po-generated', handlePOGenerated);
    };
  }, [isOpen, currentStepIndex]);

  // Keyboard navigation & Ctrl+2 detection during Step 4
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }

      // Detect Ctrl+2 when waiting on step 4
      if ((e.ctrlKey || e.metaKey) && e.key === '2') {
        if (currentStepIndex === 3) {
          e.preventDefault();
          setActiveTab('projects');
          setCurrentStepIndex(4);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex, setActiveTab, onClose]);

  // Tab change detection for step 4
  useEffect(() => {
    if (!isOpen) return;
    if (currentStepIndex === 3 && activeTab === 'projects') {
      setCurrentStepIndex(4);
    }
  }, [isOpen, activeTab, currentStepIndex]);

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      if (currentStepIndex === 3) {
        setActiveTab('projects');
      } else if (currentStepIndex === 4) {
        setActiveTab('procurement');
      }
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      setIsCompleted(true);
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.5 } });
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  if (!isOpen) return null;

  // Center fallback coordinates
  let beaconX = window.innerWidth / 2;
  let beaconY = window.innerHeight / 2;

  if (targetRect) {
    beaconX = targetRect.left + targetRect.width / 2 + (step?.offsetX || 0);
    beaconY = targetRect.top + targetRect.height / 2 + (step?.offsetY || 0);
  }

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none select-none overflow-hidden font-sans">
      {/* STEP 4: BIG PROMINENT CTRL+2 ON SCREEN (NAVIGATES TO PROJECTS DIRECTORY) */}
      {step?.isShortcutOverlay && !isCompleted && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto z-[10000] animate-fadeIn">
          <div className="bg-gradient-to-b from-slate-900 via-slate-850 to-indigo-950 border-2 border-cyan-400/80 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-center shadow-2xl shadow-cyan-500/20 space-y-6 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-center justify-center gap-2 text-cyan-400 text-xs font-black tracking-widest uppercase">
              <Sparkles className="w-4 h-4 animate-spin-slow" />
              <span>Step 4 of 8 • Factory Navigation</span>
            </div>

            <div className="space-y-3">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                Order Saved Successfully!
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Now proceed to the <span className="text-cyan-300 font-bold">Projects Directory</span> to view and manage your factory projects.
              </p>
            </div>

            {/* BIG HIGHLIGHTED SHORTCUT KEY BADGE */}
            <div className="py-6 px-6 bg-slate-950/85 rounded-2xl border-2 border-cyan-400/50 shadow-inner flex flex-col items-center justify-center gap-3.5">
              <span className="text-xs font-black uppercase tracking-widest text-cyan-400/90">
                Press Keyboard Shortcut
              </span>
              <div className="flex items-center gap-3">
                <kbd className="px-5 py-3 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 border-2 border-slate-600 text-cyan-300 font-mono text-2xl sm:text-3xl font-black shadow-xl shadow-black/70">
                  Ctrl
                </kbd>
                <span className="text-2xl font-black text-cyan-400">+</span>
                <kbd className="px-6 py-3 rounded-2xl bg-gradient-to-b from-cyan-500 via-blue-600 to-indigo-600 border-2 border-cyan-300 text-white font-mono text-2xl sm:text-3xl font-black shadow-xl shadow-cyan-500/50 animate-pulse">
                  2
                </kbd>
              </div>
            </div>

            {/* Direct Click Alternative */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('projects');
                  setCurrentStepIndex(4);
                }}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/30 cursor-pointer active:scale-95"
              >
                <span>Open Projects Directory Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all cursor-pointer"
              >
                Exit Tutorial
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COMPLETION MODAL */}
      {isCompleted && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 pointer-events-auto z-[10000] animate-fadeIn">
          <div className="bg-gradient-to-b from-slate-900 via-slate-850 to-indigo-950 border-2 border-emerald-400/80 rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl shadow-emerald-500/20 space-y-5 relative">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-400 flex items-center justify-center mx-auto text-3xl shadow-lg shadow-emerald-500/30">
              🎉
            </div>

            <div className="space-y-2">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-wide">
                Tutorial Completed!
              </h2>
              <p className="text-xs text-slate-300">
                You've mastered the entire factory workflow: Project Creation ➔ Material Entry ➔ Projects Directory ➔ Vendor Assignment ➔ Purchase Order Generation.
              </p>
            </div>

            <div className="pt-3">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-black transition-all shadow-lg shadow-emerald-500/30 cursor-pointer active:scale-95"
              >
                Start Working in RSB Industrial System
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GLIDING TRANSPARENT GLOWING SIZING-CHANGE BEACON (FOR NON-OVERLAY STEPS) */}
      {!step?.isShortcutOverlay && !isCompleted && (
        <div
          className="absolute pointer-events-none transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            transform: `translate3d(${beaconX}px, ${beaconY}px, 0)`,
            willChange: 'transform',
          }}
        >
          <div className="relative -top-7 -left-7 w-14 h-14 flex items-center justify-center pointer-events-none group">
            {/* Animated Transparent Outer Ripple 1 */}
            <span className="absolute w-16 h-16 rounded-full bg-cyan-400/25 animate-ping duration-1000 pointer-events-none" />

            {/* Sizing Pulse Wave 2 */}
            <span className="absolute w-12 h-12 rounded-full border-2 border-cyan-400/50 animate-pulse pointer-events-none" />

            {/* Radiant Halo Aura */}
            <div className="absolute w-10 h-10 rounded-full bg-gradient-to-r from-cyan-400/40 to-blue-500/40 blur-md pointer-events-none" />

            {/* Center Dynamic Sizing Dot */}
            <div className="relative w-7 h-7 rounded-full bg-cyan-400/90 hover:bg-cyan-300 border-2 border-white shadow-xl shadow-cyan-400/80 flex items-center justify-center transition-transform group-hover:scale-125 animate-bounce pointer-events-none">
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            </div>

            {/* Minimal Floating Micro-Pill Tag (Interactive Controls) */}
            <div className="absolute -top-9 px-3 py-1 rounded-full bg-slate-900/95 hover:bg-slate-900 border border-cyan-400/70 shadow-2xl shadow-cyan-950/60 flex items-center gap-2 text-white text-[11px] font-black tracking-wide whitespace-nowrap backdrop-blur-md transition-all ring-1 ring-white/10 pointer-events-auto">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
              <span className="text-white">{step?.label}</span>
              <span className="text-[10px] font-mono text-cyan-300 ml-0.5 font-bold">
                ({step?.stepNum}/8)
              </span>

              {/* Micro Controls (Manual Skip / Close) */}
              <div className="flex items-center gap-0.5 ml-1 border-l border-slate-700 pl-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrev();
                  }}
                  disabled={currentStepIndex === 0}
                  className="p-0.5 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 cursor-pointer"
                  title="Previous Step"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  className="p-0.5 rounded hover:bg-slate-800 text-cyan-300 cursor-pointer"
                  title="Next Step"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClose();
                  }}
                  className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer ml-0.5"
                  title="Close Tutorial"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
