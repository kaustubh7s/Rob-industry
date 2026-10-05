import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronRight, ChevronLeft, X, Play, Pause } from 'lucide-react';
import { useERP } from '../../context/ERPContext';

export interface TourStep {
  id: string;
  targetSelector: string;
  tabId?: string;
  label: string;
  stepNum: number;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'step-entry',
    targetSelector: '[data-tour="tour-entry-station"]',
    tabId: 'entry',
    label: '1. Entry Station',
    stepNum: 1,
  },
  {
    id: 'step-new-project',
    targetSelector: '[data-tour="tour-add-project-btn"]',
    tabId: 'entry',
    label: '2. Create Project',
    stepNum: 2,
  },
  {
    id: 'step-requirements',
    targetSelector: '[data-tour="tour-material-grid"]',
    tabId: 'entry',
    label: '3. Enter Requirements & Specs',
    stepNum: 3,
  },
  {
    id: 'step-save',
    targetSelector: '[data-tour="tour-save-order-btn"]',
    tabId: 'entry',
    label: '4. Save Order to Database',
    stepNum: 4,
  },
  {
    id: 'step-po-basket',
    targetSelector: '[data-tour="tour-po-basket-nav"]',
    tabId: 'procurement',
    label: '5. Open PO Basket',
    stepNum: 5,
  },
  {
    id: 'step-generate-po',
    targetSelector: '[data-tour="tour-issue-direct-po"]',
    tabId: 'procurement',
    label: '6. Assign Vendor & Generate PO',
    stepNum: 6,
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

  // Position calculation
  const updateTargetPosition = useCallback(() => {
    if (!isOpen || !step) return;

    const el = document.querySelector(step.targetSelector);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
    } else {
      setTargetRect(null);
    }
  }, [isOpen, step]);

  // Handle step changes & smooth tab switching
  useEffect(() => {
    if (!isOpen) {
      setCurrentStepIndex(0);
      setIsAutoPlaying(true);
      return;
    }

    if (step?.tabId) {
      setActiveTab(step.tabId);
    }

    const checkElementInterval = setInterval(() => {
      const el = document.querySelector(step.targetSelector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        updateTargetPosition();
        clearInterval(checkElementInterval);
      }
    }, 120);

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

  // Auto-play timer (smoothly glides to next step automatically every 3.5s)
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
          return 0; // Loop or finish
        }
      });
    }, 3800);

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [isOpen, isAutoPlaying]);

  // Keyboard navigation
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

  // Default coordinates fallback
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
          {/* Transparent Glowing Outer Ripple 1 */}
          <span className="absolute w-16 h-16 rounded-full bg-cyan-400/20 animate-ping duration-1000 pointer-events-none" />

          {/* Sizing Pulse Wave 2 */}
          <span className="absolute w-12 h-12 rounded-full border-2 border-cyan-400/50 animate-pulse pointer-events-none" />

          {/* Radial Aura Glow */}
          <div className="absolute w-10 h-10 rounded-full bg-gradient-to-r from-cyan-400/40 to-blue-500/40 blur-md pointer-events-none" />

          {/* Center Dynamic Transparent Glowing Dot */}
          <div className="relative w-7 h-7 rounded-full bg-cyan-400/80 hover:bg-cyan-300 border-2 border-white shadow-xl shadow-cyan-400/80 flex items-center justify-center transition-transform group-hover:scale-125 animate-bounce">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          </div>

          {/* Minimal Floating Micro-Pill Tag */}
          <div className="absolute -top-9 px-2.5 py-1 rounded-full bg-slate-900/90 hover:bg-slate-900 border border-cyan-400/60 shadow-xl shadow-cyan-950/40 flex items-center gap-1.5 text-white text-[11px] font-black tracking-wide whitespace-nowrap backdrop-blur-md transition-all">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
            <span>{step.label}</span>
            <span className="text-[9px] font-mono text-cyan-300 ml-0.5">({step.stepNum}/6)</span>

            {/* Micro Controls */}
            <div className="flex items-center gap-0.5 ml-1 border-l border-slate-700 pl-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                disabled={currentStepIndex === 0}
                className="p-0.5 rounded hover:bg-slate-800 text-slate-300 disabled:opacity-30 cursor-pointer"
                title="Previous"
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
                title={isAutoPlaying ? 'Pause' : 'Play'}
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
                title="Next"
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
                title="Close"
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
