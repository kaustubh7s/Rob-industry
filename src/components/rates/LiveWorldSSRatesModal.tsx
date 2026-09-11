import React, { useState } from 'react';
import {
  Globe,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Zap,
  Calculator,
  Building2,
  DollarSign,
  Activity,
  CheckCircle2,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  Scale,
} from 'lucide-react';
import { LIVE_SS_RATES, METAL_INDEX_SUMMARY, MarketRateItem } from '../../data/liveMarketRates';
import { formatINR } from '../../utils/calculations';

interface LiveWorldSSRatesModalProps {
  onClose: () => void;
  onSelectRate?: (grade: string, rateINR: number, form: string) => void;
}

export const LiveWorldSSRatesModal: React.FC<LiveWorldSSRatesModalProps> = ({
  onClose,
  onSelectRate,
}) => {
  const [selectedHub, setSelectedHub] = useState<'mumbai' | 'ahmedabad' | 'delhi'>('mumbai');
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState('Just Now');

  // Quick Calculator State inside Modal
  const [calcWeightKg, setCalcWeightKg] = useState<number>(25.4);
  const [calcGradeItem, setCalcGradeItem] = useState<MarketRateItem>(LIVE_SS_RATES[0]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastRefreshed('Live Synced: ' + new Date().toLocaleTimeString());
    }, 600);
  };

  const filteredRates = LIVE_SS_RATES.filter(
    (item) => selectedCategory === 'ALL' || item.category === selectedCategory
  );

  const getRateForHub = (item: MarketRateItem) => {
    if (currency === 'USD') {
      return `$${(item.globalRateUSD / 1000).toFixed(2)}/kg`;
    }
    if (selectedHub === 'mumbai') return `₹${item.mumbaiRateINR}`;
    if (selectedHub === 'ahmedabad') return `₹${item.ahmedabadRateINR}`;
    return `₹${item.delhiRateINR}`;
  };

  const getRateValueINR = (item: MarketRateItem) => {
    if (selectedHub === 'mumbai') return item.mumbaiRateINR;
    if (selectedHub === 'ahmedabad') return item.ahmedabadRateINR;
    return item.delhiRateINR;
  };

  const calcEstimatedCost = calcWeightKg * getRateValueINR(calcGradeItem);

  return (
    <div className="space-y-6 text-slate-100">
      {/* Live Global Banner & Index Ticker */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-indigo-500/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-300 animate-pulse">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white tracking-tight">
                  Global Stainless Steel (SS) Real-Time Intelligence
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-bold font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  LIVE LME & MANDI
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Direct spot feeds from London Metal Exchange (LME) & Kalamboli Steel Exchange
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-400">{lastRefreshed}</span>
            <button
              onClick={handleRefresh}
              className={`p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition-all ${
                isRefreshing ? 'animate-spin' : ''
              }`}
              title="Refresh Live Rates"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Global Key Commodities Tickers */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[10px] font-mono uppercase text-slate-400">LME Nickel Cash</div>
            <div className="text-sm font-extrabold text-white font-mono mt-0.5">
              ${METAL_INDEX_SUMMARY.nickelLME.priceUSD.toLocaleString()} / MT
            </div>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 mt-0.5">
              <TrendingUp className="w-3 h-3" />
              +{METAL_INDEX_SUMMARY.nickelLME.changePct}% (${METAL_INDEX_SUMMARY.nickelLME.changeUSD})
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[10px] font-mono uppercase text-slate-400">Mumbai Mandi SS 304</div>
            <div className="text-sm font-extrabold text-amber-400 font-mono mt-0.5">
              ₹312.00 / KG
            </div>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 mt-0.5">
              <TrendingUp className="w-3 h-3" /> +1.2% (₹3.50/kg)
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[10px] font-mono uppercase text-slate-400">Pharma SS 316L Tube</div>
            <div className="text-sm font-extrabold text-purple-400 font-mono mt-0.5">
              ₹465.00 / KG
            </div>
            <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400 mt-0.5">
              <TrendingUp className="w-3 h-3" /> +1.8% Strong
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-[10px] font-mono uppercase text-slate-400">USD / INR Benchmark</div>
            <div className="text-sm font-extrabold text-cyan-400 font-mono mt-0.5">
              ₹{METAL_INDEX_SUMMARY.usdinrRate}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">RBI Reference Rate</div>
          </div>
        </div>
      </div>

      {/* Control Bar: Mandi Hubs, Currency & Category Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mandi Hub:</span>
          {(['mumbai', 'ahmedabad', 'delhi'] as const).map((hub) => (
            <button
              key={hub}
              onClick={() => setSelectedHub(hub)}
              className={`px-3 py-1 rounded-lg text-xs font-bold uppercase transition-all ${
                selectedHub === hub
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {hub}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-800 border border-slate-700">
            <button
              onClick={() => setCurrency('INR')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                currency === 'INR' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400'
              }`}
            >
              ₹ INR
            </button>
            <button
              onClick={() => setCurrency('USD')}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                currency === 'USD' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400'
              }`}
            >
              $ USD
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            {['ALL', 'Austenitic', 'Marine Grade', 'Ferritic', 'Raw Commodity'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  selectedCategory === cat
                    ? 'bg-slate-700 text-white border border-slate-600'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Rates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredRates.map((item) => {
          const isSelected = calcGradeItem.id === item.id;
          return (
            <div
              key={item.id}
              onClick={() => setCalcGradeItem(item)}
              className={`p-4 rounded-xl border transition-all cursor-pointer relative group ${
                isSelected
                  ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/20'
                  : 'bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-white font-mono">{item.grade}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                      {item.form}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400">{item.category}</span>
                </div>

                <div className="text-right">
                  <div className="text-base font-extrabold text-amber-400 font-mono">
                    {getRateForHub(item)}
                    <span className="text-[10px] text-slate-400 font-normal"> / KG</span>
                  </div>
                  <div
                    className={`flex items-center justify-end gap-0.5 text-[10px] font-bold ${
                      item.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {item.change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {item.change24h >= 0 ? `+${item.change24h}%` : `${item.change24h}%`}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span className="truncate max-w-[200px]" title={item.applications}>
                  {item.applications}
                </span>
                {onSelectRate && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRate(item.grade, getRateValueINR(item), item.form);
                      onClose();
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] shadow transition-transform active:scale-95"
                  >
                    <Zap className="w-3 h-3" /> Use Rate
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Raw Material Auto-Cost Calculator Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Live Auto-Cost Estimator ({calcGradeItem.grade} {calcGradeItem.form})
            </div>
            <div className="text-sm font-semibold text-white">
              Based on today's {selectedHub.toUpperCase()} spot rate of ₹{getRateValueINR(calcGradeItem)}/KG
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Batch Weight:</span>
            <div className="relative">
              <input
                type="number"
                value={calcWeightKg}
                onChange={(e) => setCalcWeightKg(Math.max(0.1, parseFloat(e.target.value) || 0))}
                className="w-24 px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white font-mono text-xs font-bold focus:border-indigo-500 outline-none"
              />
              <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-mono">KG</span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] uppercase font-mono text-slate-400">Estimated Raw Cost</div>
            <div className="text-base font-extrabold text-emerald-400 font-mono">
              {formatINR(calcEstimatedCost)}
            </div>
          </div>

          {onSelectRate && (
            <button
              onClick={() => {
                onSelectRate(calcGradeItem.grade, getRateValueINR(calcGradeItem), calcGradeItem.form);
                onClose();
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
            >
              <Zap className="w-3.5 h-3.5" /> Apply Rate
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
