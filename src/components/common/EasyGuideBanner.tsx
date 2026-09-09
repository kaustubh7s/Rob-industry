import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Sparkles, CheckCircle2, ArrowRight } from 'lucide-react';

interface EasyGuideBannerProps {
  moduleName: string;
  hindiTitle?: string;
  paperEquivalent: string; // e.g. "Gate Inward Register / आवक बही"
  whatItDoes: string;
  howToAdd: string;
  autoBenefit: string;
  defaultExpanded?: boolean;
}

export const EasyGuideBanner: React.FC<EasyGuideBannerProps> = ({
  moduleName,
  hindiTitle,
  paperEquivalent,
  whatItDoes,
  howToAdd,
  autoBenefit,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-xl bg-gradient-to-r from-blue-950/40 via-slate-900 to-slate-900 border border-blue-500/30 overflow-hidden shadow-md text-xs mb-4">
      {/* Top Title Bar (Always Visible) */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-5 h-5 rounded-md bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
            💡
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-blue-200">
              Quick Guide (सरल गाइड): {moduleName}
            </span>
            {hindiTitle && (
              <span className="text-slate-300 font-medium">({hindiTitle})</span>
            )}
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono">
              Old paper: {paperEquivalent}
            </span>
          </div>
        </div>

        <button
          type="button"
          className="flex items-center gap-1 text-[11px] text-blue-400 hover:text-blue-300 font-semibold shrink-0 ml-2"
        >
          <span>{isExpanded ? 'Hide Help' : 'How does this work? (यहाँ क्या करें?)'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expandable Explanation Body */}
      {isExpanded && (
        <div className="p-4 pt-2 border-t border-slate-800/80 bg-slate-950/50 space-y-2.5 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Box 1: What is this */}
            <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-blue-400 font-bold text-[11px]">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>1. What is this page for?</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">{whatItDoes}</p>
            </div>

            {/* Box 2: How to enter */}
            <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>2. How do I record an entry?</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">{howToAdd}</p>
            </div>

            {/* Box 3: Automatic Calculation */}
            <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
              <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>3. Automatic calculations</span>
              </div>
              <p className="text-slate-300 text-[11px] leading-relaxed">{autoBenefit}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
