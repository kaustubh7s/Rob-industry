import React, { useState } from 'react';
import {
  Calculator,
  Layers,
  Circle,
  Cylinder,
  Sparkles,
  Copy,
  Check,
  Plus,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import {
  DENSITIES,
  calculateFlatWeight,
  calculatePipeWeight,
  calculateCircleWeight,
  calculateBarWeight,
  calculateSheetWeight,
  formatINR,
} from '../../utils/calculations';
import { useERP } from '../../context/ERPContext';

interface WeightCalculatorProps {
  onAddToMaster?: (material: any) => void;
  isModal?: boolean;
  onClose?: () => void;
}

export const WeightCalculator: React.FC<WeightCalculatorProps> = ({ isModal, onClose }) => {
  const { addMaterial } = useERP();

  const [activeShape, setActiveShape] = useState<'flat' | 'pipe' | 'circle' | 'bar' | 'sheet'>('flat');
  const [grade, setGrade] = useState<string>('SS 304');
  const [ratePerKg, setRatePerKg] = useState<number>(310);
  const [copied, setCopied] = useState<boolean>(false);

  // Flat state
  const [flatWidth, setFlatWidth] = useState<number>(80);
  const [flatThick, setFlatThick] = useState<number>(6);
  const [flatLength, setFlatLength] = useState<number>(485);
  const [flatQty, setFlatQty] = useState<number>(2);

  // Pipe state
  const [pipeOD, setPipeOD] = useState<number>(106);
  const [pipeID, setPipeID] = useState<number>(75);
  const [pipeLength, setPipeLength] = useState<number>(110);
  const [pipeQty, setPipeQty] = useState<number>(2);

  // Circle state
  const [circleOD, setCircleOD] = useState<number>(285);
  const [circleThick, setCircleThick] = useState<number>(12);
  const [circleQty, setCircleQty] = useState<number>(1);

  // Bar state
  const [barDia, setBarDia] = useState<number>(45);
  const [barLength, setBarLength] = useState<number>(350);
  const [barQty, setBarQty] = useState<number>(1);

  // Sheet state
  const [sheetLength, setSheetLength] = useState<number>(1250);
  const [sheetWidth, setSheetWidth] = useState<number>(2500);
  const [sheetThick, setSheetThick] = useState<number>(3);
  const [sheetQty, setSheetQty] = useState<number>(1);

  // Calculate current weight
  let singleWeightKg = 0;
  let totalWeightKg = 0;
  let sizeSpecString = '';
  let materialTypeString = '';

  if (activeShape === 'flat') {
    singleWeightKg = calculateFlatWeight({ widthMm: flatWidth, thicknessMm: flatThick, lengthMm: flatLength, grade, quantity: 1 });
    totalWeightKg = calculateFlatWeight({ widthMm: flatWidth, thicknessMm: flatThick, lengthMm: flatLength, grade, quantity: flatQty });
    sizeSpecString = `${flatWidth} x ${flatThick} x ${flatLength}`;
    materialTypeString = 'SS Flat';
  } else if (activeShape === 'pipe') {
    singleWeightKg = calculatePipeWeight({ outerDiaMm: pipeOD, innerDiaMm: pipeID, lengthMm: pipeLength, grade, quantity: 1 });
    totalWeightKg = calculatePipeWeight({ outerDiaMm: pipeOD, innerDiaMm: pipeID, lengthMm: pipeLength, grade, quantity: pipeQty });
    sizeSpecString = `OD ${pipeOD} x ID ${pipeID} x ${pipeLength}`;
    materialTypeString = 'SS Pipe';
  } else if (activeShape === 'circle') {
    singleWeightKg = calculateCircleWeight({ outerDiaMm: circleOD, thicknessMm: circleThick, grade, quantity: 1 });
    totalWeightKg = calculateCircleWeight({ outerDiaMm: circleOD, thicknessMm: circleThick, grade, quantity: circleQty });
    sizeSpecString = `OD ${circleOD} x ${circleThick} MM`;
    materialTypeString = 'SS Circle';
  } else if (activeShape === 'bar') {
    singleWeightKg = calculateBarWeight({ diameterMm: barDia, lengthMm: barLength, grade, quantity: 1 });
    totalWeightKg = calculateBarWeight({ diameterMm: barDia, lengthMm: barLength, grade, quantity: barQty });
    sizeSpecString = `Dia ${barDia} x ${barLength} MM`;
    materialTypeString = 'SS Bar';
  } else if (activeShape === 'sheet') {
    singleWeightKg = calculateSheetWeight({ lengthMm: sheetLength, widthMm: sheetWidth, thicknessMm: sheetThick, grade, quantity: 1 });
    totalWeightKg = calculateSheetWeight({ lengthMm: sheetLength, widthMm: sheetWidth, thicknessMm: sheetThick, grade, quantity: sheetQty });
    sizeSpecString = `${sheetLength} x ${sheetWidth} x ${sheetThick} MM`;
    materialTypeString = 'SS Sheet';
  }

  const estimatedMaterialCost = totalWeightKg * ratePerKg;

  const handleCopySpec = () => {
    navigator.clipboard.writeText(`${materialTypeString} ${sizeSpecString} (${grade}) - Total: ${totalWeightKg} Kg`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddToMaterialMaster = () => {
    addMaterial({
      code: `MAT-${materialTypeString.replace(' ', '-').toUpperCase()}-${Date.now().toString().slice(-4)}`,
      name: `${grade} ${materialTypeString} ${sizeSpecString}`,
      type: materialTypeString as any,
      grade,
      thickness: activeShape === 'flat' ? flatThick : activeShape === 'circle' ? circleThick : activeShape === 'pipe' ? (pipeOD - pipeID) / 2 : undefined,
      sizeSpecs: sizeSpecString,
      unit: 'Nos',
      unitWeightKg: singleWeightKg,
      currentStock: 10,
      minStock: 5,
      reorderLevel: 8,
      unitCost: Math.round(singleWeightKg * ratePerKg),
      vendor: 'Manav Metal',
      notes: `Calculated from Engineering Weight Calculator (${DENSITIES[grade]} g/cm³)`,
    });
    alert(`Material "${grade} ${materialTypeString} ${sizeSpecString}" added to Master Catalog!`);
    if (onClose) onClose();
  };

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border border-slate-700/70">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-cyan-400" />
            Stainless Steel Engineering Weight & Cost Calculator
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Exact mathematical volume & density formulas for SS 304, SS 316, SS 316L, and custom alloys
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">Material Grade:</span>
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-cyan-300 focus:outline-hidden"
          >
            {Object.keys(DENSITIES).map((g) => (
              <option key={g} value={g}>
                {g} (Density: {DENSITIES[g]} g/cm³)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Shape Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {[
          { id: 'flat', label: 'SS Flat Bar', icon: Layers, example: '80 x 6 x 485' },
          { id: 'pipe', label: 'SS Seamless Pipe', icon: Cylinder, example: 'OD 106 x ID 75 x 110' },
          { id: 'circle', label: 'SS Circle / Disc', icon: Circle, example: 'OD 285 x 12 MM' },
          { id: 'bar', label: 'SS Round Bar', icon: Cylinder, example: 'Dia 45 x 350 MM' },
          { id: 'sheet', label: 'SS Sheet / Plate', icon: Layers, example: '2500 x 1250 x 3 MM' },
        ].map((s) => {
          const Icon = s.icon;
          const isActive = activeShape === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setActiveShape(s.id as any)}
              className={`p-3 rounded-xl border text-left transition-all ${
                isActive
                  ? 'bg-cyan-500/15 border-cyan-400/80 shadow-xs shadow-cyan-950/50'
                  : 'bg-slate-800/40 border-slate-700/70 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span className={`text-xs font-bold ${isActive ? 'text-cyan-300' : 'text-slate-200'}`}>
                  {s.label}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono mt-1">{s.example}</p>
            </button>
          );
        })}
      </div>

      {/* Quick RSB Factory Presets */}
      <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-2">
          RSB Standard Presets:
        </span>
        <div className="inline-flex flex-wrap gap-1.5 mt-1 sm:mt-0">
          {/* Flats */}
          <button
            onClick={() => { setActiveShape('flat'); setFlatWidth(80); setFlatThick(6); setFlatLength(485); }}
            className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white border border-slate-700"
          >
            Flat 80x6x485 (FOHA)
          </button>
          <button
            onClick={() => { setActiveShape('flat'); setFlatWidth(60); setFlatThick(16); setFlatLength(110); }}
            className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white border border-slate-700"
          >
            Flat 60x16x110
          </button>
          <button
            onClick={() => { setActiveShape('flat'); setFlatWidth(50); setFlatThick(16); setFlatLength(112); }}
            className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white border border-slate-700"
          >
            Flat 50x16x112
          </button>
          <button
            onClick={() => { setActiveShape('flat'); setFlatWidth(40); setFlatThick(12); setFlatLength(537); }}
            className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white border border-slate-700"
          >
            Flat 40x12x537
          </button>

          {/* Pipes */}
          <button
            onClick={() => { setActiveShape('pipe'); setPipeOD(106); setPipeID(75); setPipeLength(110); }}
            className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white border border-slate-700"
          >
            Pipe OD 106xID 75x110
          </button>
          <button
            onClick={() => { setActiveShape('pipe'); setPipeOD(160); setPipeID(120); setPipeLength(145); }}
            className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white border border-slate-700"
          >
            Pipe OD 160xID 120x145
          </button>

          {/* Circles */}
          <button
            onClick={() => { setActiveShape('circle'); setCircleOD(285); setCircleThick(12); }}
            className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white border border-slate-700"
          >
            Circle OD 285x12 MM
          </button>
          <button
            onClick={() => { setActiveShape('circle'); setCircleOD(220); setCircleThick(12); }}
            className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white border border-slate-700"
          >
            Circle OD 220x12 MM
          </button>
          <button
            onClick={() => { setActiveShape('circle'); setCircleOD(173); setCircleThick(22); }}
            className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 hover:bg-cyan-600 text-slate-300 hover:text-white border border-slate-700"
          >
            Circle OD 173x22 MM
          </button>
        </div>
      </div>

      {/* Main Calculation Inputs & Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Input Form (7 cols) */}
        <div className="lg:col-span-7 space-y-4 p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-400">
            Dimensional Input (Millimeters)
          </h3>

          {/* FLAT FORM */}
          {activeShape === 'flat' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Width (W) mm</label>
                <input
                  type="number"
                  value={flatWidth}
                  onChange={(e) => setFlatWidth(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Thickness (T) mm</label>
                <input
                  type="number"
                  value={flatThick}
                  onChange={(e) => setFlatThick(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Length (L) mm</label>
                <input
                  type="number"
                  value={flatLength}
                  onChange={(e) => setFlatLength(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Quantity (Nos)</label>
                <input
                  type="number"
                  min="1"
                  value={flatQty}
                  onChange={(e) => setFlatQty(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold"
                />
              </div>
            </div>
          )}

          {/* PIPE FORM */}
          {activeShape === 'pipe' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Outer Dia (OD) mm</label>
                <input
                  type="number"
                  value={pipeOD}
                  onChange={(e) => setPipeOD(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Inner Dia (ID) mm</label>
                <input
                  type="number"
                  value={pipeID}
                  onChange={(e) => setPipeID(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Length (L) mm</label>
                <input
                  type="number"
                  value={pipeLength}
                  onChange={(e) => setPipeLength(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Quantity (Nos)</label>
                <input
                  type="number"
                  min="1"
                  value={pipeQty}
                  onChange={(e) => setPipeQty(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold"
                />
              </div>
            </div>
          )}

          {/* CIRCLE FORM */}
          {activeShape === 'circle' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Outer Diameter (OD) mm</label>
                <input
                  type="number"
                  value={circleOD}
                  onChange={(e) => setCircleOD(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Thickness (T) mm</label>
                <input
                  type="number"
                  value={circleThick}
                  onChange={(e) => setCircleThick(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Quantity (Nos)</label>
                <input
                  type="number"
                  min="1"
                  value={circleQty}
                  onChange={(e) => setCircleQty(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold"
                />
              </div>
            </div>
          )}

          {/* BAR FORM */}
          {activeShape === 'bar' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Diameter (Ø) mm</label>
                <input
                  type="number"
                  value={barDia}
                  onChange={(e) => setBarDia(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Length (L) mm</label>
                <input
                  type="number"
                  value={barLength}
                  onChange={(e) => setBarLength(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Quantity (Nos)</label>
                <input
                  type="number"
                  min="1"
                  value={barQty}
                  onChange={(e) => setBarQty(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold"
                />
              </div>
            </div>
          )}

          {/* SHEET FORM */}
          {activeShape === 'sheet' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Length mm</label>
                <input
                  type="number"
                  value={sheetLength}
                  onChange={(e) => setSheetLength(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Width mm</label>
                <input
                  type="number"
                  value={sheetWidth}
                  onChange={(e) => setSheetWidth(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Thickness mm</label>
                <input
                  type="number"
                  value={sheetThick}
                  onChange={(e) => setSheetThick(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 mb-1">Quantity (Sheets)</label>
                <input
                  type="number"
                  min="1"
                  value={sheetQty}
                  onChange={(e) => setSheetQty(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold"
                />
              </div>
            </div>
          )}

          {/* Pricing Estimation input */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-300">Procurement Rate (₹/Kg):</label>
              <input
                type="number"
                value={ratePerKg}
                onChange={(e) => setRatePerKg(Number(e.target.value))}
                className="w-28 px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold text-amber-400"
              />
            </div>
            <span className="text-[11px] text-slate-400">Current Market: ₹300-340 / Kg</span>
          </div>
        </div>

        {/* Right: Output Calculation Card (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-cyan-500/40 shadow-xl space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
                RESULT
              </span>
              <span className="text-xs font-bold text-slate-400">{grade} Standard</span>
            </div>

            <div className="mt-4">
              <span className="text-xs text-slate-400 font-medium">Specification:</span>
              <h4 className="text-base font-bold text-slate-100 font-mono mt-0.5">
                {materialTypeString} {sizeSpecString}
              </h4>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="text-[11px] text-slate-400">Weight / Piece</span>
                <p className="text-lg font-extrabold text-white font-mono mt-0.5">
                  {singleWeightKg} <span className="text-xs font-normal text-slate-400">Kg</span>
                </p>
              </div>

              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
                <span className="text-[11px] text-cyan-300 font-medium">Total Lot Weight</span>
                <p className="text-lg font-extrabold text-cyan-400 font-mono mt-0.5">
                  {totalWeightKg} <span className="text-xs font-normal text-cyan-300">Kg</span>
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 mt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-300">Est. Material Cost:</span>
                <span className="text-base font-extrabold text-emerald-400 font-mono">
                  {formatINR(estimatedMaterialCost)}
                </span>
              </div>
              <p className="text-[10px] text-emerald-400/80 mt-0.5">
                {totalWeightKg} Kg @ {formatINR(ratePerKg)}/Kg
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <button
              onClick={handleAddToMaterialMaster}
              className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-98"
            >
              <Plus className="w-4 h-4" /> Save to Material Master Catalog
            </button>

            <button
              onClick={handleCopySpec}
              className="w-full py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-slate-700 transition-all"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied Specification!' : 'Copy Dimension & Weight'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
