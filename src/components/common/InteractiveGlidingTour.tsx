import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  X,
  CheckCircle2,
  Play,
  RotateCcw,
  Zap,
  FolderPlus,
  Table,
  Save,
  ShoppingCart,
  Send,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';

export interface TourStep {
  id: string;
  targetSelector: string;
  tabId?: string;
  title: string;
  subtitle: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  placement?: 'bottom' | 'top' | 'left' | 'right';
  actionHint?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'step-entry',
    targetSelector: '[data-tour="tour-entry-station"]',
    tabId: 'entry',
    title: '1. Primary Entry Station',
    subtitle: 'Factory Command Center',
    description:
      'Directly start here on the Material Entry Station. This is where active machine BOMs, daily requirements, and project orders are configured with live database synchronization.',
    icon: Zap,
    badge: 'Step 1 of 6',
    placement: 'bottom',
    actionHint: 'Auto-navigated to Entry Station',
  },
  {
    id: 'step-new-project',
    targetSelector: '[data-tour="tour-add-project-btn"]',
    tabId: 'entry',
    title: '2. Create New Project',
    subtitle: 'Self-Learning Customer Memory',
    description:
      'Click "+ Add Project" to register a new client and machine project. The system auto-remembers customer contact details and sets up an isolated, structured BOM sheet.',
    icon: FolderPlus,
    badge: 'Step 2 of 6',
    placement: 'bottom',
    actionHint: 'Click to open project modal',
  },
  {
    id: 'step-requirements',
    targetSelector: '[data-tour="tour-material-grid"]',
    tabId: 'entry',
    title: '3. Enter BOM Requirements',
    subtitle: '10-Column Precision Matrix',
    description:
      'Fill in Machine / Assembly, Component Descriptions, Material Types (SS 304, MS, Brass, Teflon), Custom Size Specs (OD × ID × Length), and Quantities with smart typeahead.',
    icon: Table,
    badge: 'Step 3 of 6',
    placement: 'top',
    actionHint: 'Interactive 10-column table',
  },
  {
    id: 'step-save',
    targetSelector: '[data-tour="tour-save-order-btn"]',
    tabId: 'entry',
    title: '4. Save & Lock BOM',
    subtitle: 'Cloud Persistence & Queueing',
    description:
      'Click "SAVE ORDER" to instantly persist the full bill of materials to your secure database and automatically push requirements into the procurement queue.',
    icon: Save,
    badge: 'Step 4 of 6',
    placement: 'top',
    actionHint: 'Saves directly to database',
  },
  {
    id: 'step-po-basket',
    targetSelector: '[data-tour="tour-po-basket-nav"]',
    tabId: 'procurement',
    title: '5. Open PO Basket',
    subtitle: 'Auto-Accumulated Procurement',
    description:
      'All saved project requirements automatically flow into your PO Basket. Materials are grouped by project and vendor for seamless bulk ordering.',
    icon: ShoppingCart,
    badge: 'Step 5 of 6',
    placement: 'bottom',
    actionHint: 'Auto-navigated to PO Basket',
  },
  {
    id: 'step-generate-po',
    targetSelector: '[data-tour="tour-issue-direct-po"]',
    tabId: 'procurement',
    title: '6. Assign Vendor & Generate PO',
    subtitle: '1-Click PDF & WhatsApp Dispatch',
    description:
      'Assign your preferred material supplier, review negotiated rates, and generate official formatted Purchase Orders ready for instant PDF download and direct WhatsApp dispatch!',
    icon: Send,
    badge: 'Step 6 of 6',
    placement: 'bottom',
    actionHint: 'Generate official PO',
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
  const { setActiveTab } = useERP();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isGliding, setIsGliding] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);

  const step = TOUR_STEPS[currentStepIndex];
  const autoPlayTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Position calculation and element tracking
  const updateTargetPosition = useCallback(() => {
    if (!isOpen || !step) return;

    const el = document.querySelector(step.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      // Fallback center position if selector not currently in DOM
      setTargetRect(null);
    }
  }, [isOpen, step]);

  // Navigate to step tab and scroll target into view
  useEffect(() => {
    if (!isOpen) {
      setCurrentStepIndex(0);
      setAutoPlay(false);
      return;
    }

    if (step.tabId) {
      setActiveTab(step.tabId);
    }

    setIsGliding(true);
    const glideTimeout = setTimeout(() => {
      setIsGliding(false);
    }, 700);

    const checkElementInterval = setInterval(() => {
      const el = document.querySelector(step.targetSelector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        updateTargetPosition();
        clearInterval(checkElementInterval);
      }
    }, 100);

    const safetyTimeout = setTimeout(() => {
      clearInterval(checkElementInterval);
      updateTargetPosition();
    }, 1500);

    return () => {
      clearTimeout(glideTimeout);
      clearInterval(checkElementInterval);
      clearTimeout(safetyTimeout);
    };
  }, [currentStepIndex, isOpen, step, setActiveTab, updateTargetPosition]);

  // Handle Window Resize and Scroll to keep beacon locked on target
  useEffect(() => {
    if (!isOpen) return;

    window.addEventListener('resize', updateTargetPosition);
    window.addEventListener('scroll', updateTargetPosition, true);

    return () => {
      window.removeEventListener('resize', updateTargetPosition);
      window.removeEventListener('scroll', updateTargetPosition, true);
    };
  }, [isOpen, updateTargetPosition]);

  // Keyboard navigation: Left/Right arrow and Escape
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex]);

  // Auto-play timer
  useEffect(() => {
    if (!isOpen || !autoPlay) {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
      return;
    }

    autoPlayTimerRef.current = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < TOUR_STEPS.length - 1) {
          return prev + 1;
        } else {
          setAutoPlay(false);
          return prev;
        }
      });
    }, 4500);

    return () => {
      if (autoPlayTimerRef.current) clearInterval(autoPlayTimerRef.current);
    };
  }, [isOpen, autoPlay]);

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  const handleRestart = () => {
    setCurrentStepIndex(0);
  };

  if (!isOpen) return null;

  // Calculate coordinates for the floating beacon and card
  let beaconX = window.innerWidth / 2;
  let beaconY = window.innerHeight / 2;

  let cardTop = window.innerHeight / 2 - 120;
  let cardLeft = window.innerWidth / 2 - 180;

  if (targetRect) {
    beaconX = targetRect.left + targetRect.width / 2;
    beaconY = targetRect.top + targetRect.height / 2;

    // Smart placement of card relative to target
    if (beaconY > window.innerHeight * 0.6) {
      // Target is near bottom -> place card above
      cardTop = Math.max(20, targetRect.top - 240);
      cardLeft = Math.min(
        window.innerWidth - 380,
        Math.max(20, beaconX - 180)
      );
    } else {
      // Target is near top -> place card below
      cardTop = Math.min(
        window.innerHeight - 260,
        targetRect.bottom + 24
      );
      cardLeft = Math.min(
        window.innerWidth - 380,
        Math.max(20, beaconX - 180)
      );
    }
  }

  const StepIcon = step.icon;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none select-none overflow-hidden font-sans">
      {/* 1. Subtle Dark Vignette Backdrop (Leaves UI Visible) */}
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] pointer-events-auto transition-opacity duration-500"
        onClick={onClose}
      />

      {/* 2. GLIDING TARGET SPOTLIGHT BEACON */}
      <div
        className="absolute pointer-events-none transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] z-20"
        style={{
          transform: `translate3d(${beaconX}px, ${beaconY}px, 0)`,
          willChange: 'transform',
        }}
      >
        <div className="relative -top-6 -left-6 w-12 h-12 flex items-center justify-center">
          {/* Animated Transparent Outer Ripple Glow 1 */}
          <span className="absolute w-16 h-16 rounded-full bg-cyan-400/25 animate-ping duration-1000" />

          {/* Animated Transparent Outer Pulse Aura 2 */}
          <span className="absolute w-20 h-20 rounded-full border-2 border-cyan-400/40 animate-pulse" />

          {/* Glowing Radial Halo */}
          <div className="absolute w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500/50 via-blue-500/40 to-indigo-500/50 blur-md" />

          {/* Center Dynamic Sizing Change Beacon Dot */}
          <div className="relative w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-400 to-blue-600 border-2 border-white shadow-xl shadow-cyan-500/70 flex items-center justify-center text-white font-black text-xs animate-bounce">
            <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
          </div>

          {/* Target Callout Arrow Indicator */}
          <div className="absolute -top-7 px-2 py-0.5 rounded-md bg-cyan-500 text-slate-950 text-[10px] font-black tracking-wider uppercase shadow-md shadow-cyan-500/40 whitespace-nowrap animate-pulse">
            Target Focus
          </div>
        </div>
      </div>

      {/* 3. GLIDING INTERACTIVE GUIDE CARD */}
      <div
        className="absolute pointer-events-auto transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] z-30"
        style={{
          top: `${cardTop}px`,
          left: `${cardLeft}px`,
          width: '360px',
          maxWidth: 'calc(100vw - 40px)',
          willChange: 'top, left',
        }}
      >
        <div className="bg-slate-900/95 backdrop-blur-xl border border-cyan-500/40 text-white rounded-2xl p-5 shadow-2xl shadow-cyan-950/60 ring-1 ring-white/10 space-y-3.5">
          {/* Top Bar: Icon, Step Badge & Close */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-cyan-500/30 shrink-0">
                <StepIcon className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-black tracking-widest text-cyan-400 block leading-tight">
                  {step.badge}
                </span>
                <span className="text-xs font-bold text-slate-300 block leading-tight">
                  {step.subtitle}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Auto Play Toggle */}
              <button
                type="button"
                onClick={() => setAutoPlay(!autoPlay)}
                className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer ${
                  autoPlay
                    ? 'bg-cyan-500 text-slate-950 shadow-xs'
                    : 'bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700'
                }`}
                title="Toggle Auto-Play Gliding Tour"
              >
                <Play className={`w-3 h-3 ${autoPlay ? 'animate-spin' : ''}`} />
                <span>{autoPlay ? 'Auto' : 'Play'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="Exit Walkthrough (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress Line Bar */}
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full transition-all duration-500"
              style={{
                width: `${((currentStepIndex + 1) / TOUR_STEPS.length) * 100}%`,
              }}
            />
          </div>

          {/* Step Content */}
          <div className="space-y-1.5">
            <h3 className="text-sm font-black text-white tracking-wide flex items-center gap-2">
              <span>{step.title}</span>
              {step.actionHint && (
                <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[9px] font-mono">
                  {step.actionHint}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed font-normal">
              {step.description}
            </p>
          </div>

          {/* Controls Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 gap-2">
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleRestart}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition-all cursor-pointer"
                title="Restart Tour from Step 1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={currentStepIndex === 0}
                onClick={handlePrev}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 disabled:opacity-40 disabled:hover:bg-slate-800 text-slate-300 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
              >
                Skip Tour
              </button>

              <button
                type="button"
                onClick={handleNext}
                className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs transition-all shadow-md shadow-cyan-500/30 flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                {currentStepIndex === TOUR_STEPS.length - 1 ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Finish Tour</span>
                  </>
                ) : (
                  <>
                    <span>Next Step</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
