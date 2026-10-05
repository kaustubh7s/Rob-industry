import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, ChevronLeft, X, Play, Pause, Sparkles } from 'lucide-react';
import { useERP } from '../../context/ERPContext';

export interface TourStep {
  id: string;
  targetSelector: string;
  tabId?: string;
  label: string;
  stepNum: number;
  openModalEvent?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'step-1-new-project',
    targetSelector: '[data-tour="tour-select-new-project-btn"], [data-tour="tour-add-project-btn"]',
    tabId: 'entry',
    label: '1. Click + New Project',
    stepNum: 1,
    openModalEvent: 'rsb:open-add-project',
  },
  {
    id: 'step-2-create-project-modal',
    targetSelector: '[data-tour="tour-modal-create-project-btn"], [data-tour="tour-select-new-project-btn"]',
    tabId: 'entry',
    label: '2. Fill Details & Click Create Project',
    stepNum: 2,
  },
  {
    id: 'step-3-requirements',
    targetSelector: '[data-tour="tour-material-grid"], [data-tour="tour-save-order-btn"]',
    tabId: 'entry',
    label: '3. Add Material Requirements',
    stepNum: 3,
  },
  {
    id: 'step-4-save-order',
    targetSelector: '[data-tour="tour-save-order-btn"]',
    tabId: 'entry',
    label: '4. Click Save Order',
    stepNum: 4,
  },
  {
    id: 'step-5-ctrl-3-basket',
    targetSelector: '[data-tour="tour-po-basket-nav"]',
    tabId: 'procurement',
    label: '5. Press Ctrl+3 to Open Order Basket',
    stepNum: 5,
  },
  {
    id: 'step-6-switch-project',
    targetSelector: '[data-tour="tour-basket-project-select"], [data-tour="tour-po-basket-nav"]',
    tabId: 'procurement',
    label: '6. Switch / Choose Project',
    stepNum: 6,
  },
  {
    id: 'step-7-select-vendor',
    targetSelector: '[data-tour="tour-basket-assign-vendor"], [data-tour="tour-basket-first-checkbox"], [data-tour="tour-po-basket-nav"]',
    tabId: 'procurement',
    label: '7. Select Item & Assign Vendor',
    stepNum: 7,
  },
  {
    id: 'step-8-generate-po',
    targetSelector: '[data-tour="tour-basket-generate-po"], [data-tour="tour-issue-direct-po"]',
    tabId: 'procurement',
    label: '8. Click Generate PO - Done! 🎉',
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
  const { setActiveTab } = useERP();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const step = TOUR_STEPS[currentStepIndex];
  const autoPlayRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Calculate target element coordinates
  const updateTargetPosition = useCallback(() => {
    if (!isOpen || !step) return;

    // Support comma-separated selectors fallback
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

  // Handle step transitions & tab navigation
  useEffect(() => {
    if (!isOpen) {
      setCurrentStepIndex(0);
      setIsAutoPlaying(true);
      return;
    }

    // Redirect to respective tab
    if (step?.tabId) {
      setActiveTab(step.tabId);
    }

    // Trigger auto-open events if step needs it
    if (step?.openModalEvent) {
      window.dispatchEvent(new CustomEvent(step.openModalEvent));
    }

    const checkElementInterval = setInterval(() => {
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
    }, 100);

    const safetyTimeout = setTimeout(() => {
      clearInterval(checkElementInterval);
      updateTargetPosition();
    }, 1200);

    return () => {
      clearInterval(checkElementInterval);
      clearTimeout(safetyTimeout);
    };
  }, [currentStepIndex, isOpen, step, setActiveTab, updateTargetPosition]);

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

  // Auto-play timer: glides smoothly across the 8 steps
  useEffect(() => {
    if (!isOpen || !isAutoPlaying) {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
      return;
    }

    autoPlayRef.current = setInterval(() => {
      setCurrentStepIndex((prev) => {
        if (prev < TOUR_STEPS.length - 1) {
          return prev + 1;
        } else {
          return 0; // Finished or loop
        }
      });
    }, 4200);

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isOpen, isAutoPlaying]);

  // Keyboard navigation & Ctrl+3 detector
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      } else if ((e.ctrlKey || e.metaKey) && e.key === '3') {
        // User pressed Ctrl+3 during step 5
        if (currentStepIndex === 4) {
          setCurrentStepIndex(5);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex]);

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

  if (!isOpen) return null;

  // Center fallback coordinates
  let beaconX = window.innerWidth / 2;
  let beaconY = window.innerHeight / 2;

  if (targetRect) {
    beaconX = targetRect.left + targetRect.width / 2;
    beaconY = targetRect.top + targetRect.height / 2;
  }

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none select-none overflow-hidden font-sans">
      {/* GLIDING TRANSPARENT GLOWING SIZING-CHANGE BEACON */}
      <div
        className="absolute pointer-events-auto transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
        style={{
          transform: `translate3d(${beaconX}px, ${beaconY}px, 0)`,
          willChange: 'transform',
        }}
        onClick={handleNext}
      >
        <div className="relative -top-7 -left-7 w-14 h-14 flex items-center justify-center cursor-pointer group">
          {/* Animated Transparent Outer Ripple 1 */}
          <span className="absolute w-16 h-16 rounded-full bg-cyan-400/25 animate-ping duration-1000 pointer-events-none" />

          {/* Sizing Pulse Wave 2 */}
          <span className="absolute w-12 h-12 rounded-full border-2 border-cyan-400/50 animate-pulse pointer-events-none" />

          {/* Radiant Halo Aura */}
          <div className="absolute w-10 h-10 rounded-full bg-gradient-to-r from-cyan-400/40 to-blue-500/40 blur-md pointer-events-none" />

          {/* Center Dynamic Sizing Dot */}
          <div className="relative w-7 h-7 rounded-full bg-cyan-400/90 hover:bg-cyan-300 border-2 border-white shadow-xl shadow-cyan-400/80 flex items-center justify-center transition-transform group-hover:scale-125 animate-bounce">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          </div>

          {/* Minimal Floating Micro-Pill Tag */}
          <div className="absolute -top-9 px-3 py-1 rounded-full bg-slate-900/95 hover:bg-slate-900 border border-cyan-400/70 shadow-2xl shadow-cyan-950/60 flex items-center gap-2 text-white text-[11px] font-black tracking-wide whitespace-nowrap backdrop-blur-md transition-all ring-1 ring-white/10">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            <span className="text-white">{step.label}</span>
            <span className="text-[10px] font-mono text-cyan-300 ml-0.5 font-bold">
              ({step.stepNum}/8)
            </span>

            {/* Micro Controls */}
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
                  setIsAutoPlaying(!isAutoPlaying);
                }}
                className="p-0.5 rounded hover:bg-slate-800 text-cyan-300 cursor-pointer"
                title={isAutoPlaying ? 'Pause Auto-Play' : 'Resume Auto-Play'}
              >
                {isAutoPlaying ? <Pause className="w-2.5 h-2.5" /> : <Play className="w-2.5 h-2.5" />}
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
    </div>
  );
};
