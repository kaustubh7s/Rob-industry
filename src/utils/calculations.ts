// Stainless Steel Density in g/cm³ (kg/dm³)
// SS 304 = 7.93, SS 316 = 8.00, SS 316L = 8.00, MS = 7.85, Aluminum = 2.70
export const DENSITIES: Record<string, number> = {
  'SS 304': 7.93,
  'SS 316': 8.00,
  'SS 316L': 8.00,
  'SS 202': 7.86,
  'MS (Mild Steel)': 7.85,
  'Aluminum': 2.70,
  'Brass': 8.50,
};

export interface FlatCalcInput {
  widthMm: number;
  thicknessMm: number;
  lengthMm: number;
  grade?: string;
  quantity?: number;
}

export interface PipeCalcInput {
  outerDiaMm: number;
  innerDiaMm?: number;
  wallThicknessMm?: number;
  lengthMm: number;
  grade?: string;
  quantity?: number;
}

export interface CircleCalcInput {
  outerDiaMm: number;
  thicknessMm: number;
  grade?: string;
  quantity?: number;
}

export interface BarCalcInput {
  diameterMm: number;
  lengthMm: number;
  grade?: string;
  quantity?: number;
}

export interface SheetCalcInput {
  lengthMm: number;
  widthMm: number;
  thicknessMm: number;
  grade?: string;
  quantity?: number;
}

/**
 * Calculate SS Flat weight in KG
 * Formula: (Width × Thickness × Length × Density) / 1,000,000
 */
export function calculateFlatWeight(input: FlatCalcInput): number {
  const density = DENSITIES[input.grade || 'SS 304'] || 7.93;
  const volumeMm3 = input.widthMm * input.thicknessMm * input.lengthMm;
  const weightPerPieceKg = (volumeMm3 * density) / 1000000;
  const total = weightPerPieceKg * (input.quantity || 1);
  return Number(total.toFixed(3));
}

/**
 * Calculate SS Pipe / Tube weight in KG
 * Formula: (OD - WT) × WT × 0.02491 × Length(meters) (for standard SS)
 * Or volumetric: π × [(OD/2)² - (ID/2)²] × Length × Density / 10^6
 */
export function calculatePipeWeight(input: PipeCalcInput): number {
  const density = DENSITIES[input.grade || 'SS 304'] || 7.93;
  let wt = input.wallThicknessMm;
  let id = input.innerDiaMm;

  if (wt === undefined && id !== undefined) {
    wt = (input.outerDiaMm - id) / 2;
  } else if (id === undefined && wt !== undefined) {
    id = input.outerDiaMm - 2 * wt;
  } else if (wt === undefined && id === undefined) {
    wt = 3; // default fallback
    id = input.outerDiaMm - 6;
  }

  const od = input.outerDiaMm;
  const rOuter = od / 2;
  const rInner = Math.max(0, (id || (od - 2 * (wt || 1))) / 2);
  const areaMm2 = Math.PI * (rOuter * rOuter - rInner * rInner);
  const volumeMm3 = areaMm2 * input.lengthMm;
  const weightPerPieceKg = (volumeMm3 * density) / 1000000;
  const total = weightPerPieceKg * (input.quantity || 1);
  return Number(total.toFixed(3));
}

/**
 * Calculate SS Circle / Blank disc weight in KG
 * Formula: π × (OD/2)² × Thickness × Density / 1,000,000
 */
export function calculateCircleWeight(input: CircleCalcInput): number {
  const density = DENSITIES[input.grade || 'SS 304'] || 7.93;
  const radius = input.outerDiaMm / 2;
  const areaMm2 = Math.PI * radius * radius;
  const volumeMm3 = areaMm2 * input.thicknessMm;
  const weightPerPieceKg = (volumeMm3 * density) / 1000000;
  const total = weightPerPieceKg * (input.quantity || 1);
  return Number(total.toFixed(3));
}

/**
 * Calculate SS Round Bar weight in KG
 * Formula: π × (Dia/2)² × Length × Density / 1,000,000
 */
export function calculateBarWeight(input: BarCalcInput): number {
  const density = DENSITIES[input.grade || 'SS 304'] || 7.93;
  const radius = input.diameterMm / 2;
  const areaMm2 = Math.PI * radius * radius;
  const volumeMm3 = areaMm2 * input.lengthMm;
  const weightPerPieceKg = (volumeMm3 * density) / 1000000;
  const total = weightPerPieceKg * (input.quantity || 1);
  return Number(total.toFixed(3));
}

/**
 * Calculate SS Sheet weight in KG
 */
export function calculateSheetWeight(input: SheetCalcInput): number {
  const density = DENSITIES[input.grade || 'SS 304'] || 7.93;
  const volumeMm3 = input.lengthMm * input.widthMm * input.thicknessMm;
  const weightPerPieceKg = (volumeMm3 * density) / 1000000;
  const total = weightPerPieceKg * (input.quantity || 1);
  return Number(total.toFixed(3));
}

/**
 * Parse size specification strings like "80 x 6 x 485" or "OD 106 x ID 75 x 110" or "OD 285 x 12 MM"
 */
export function autoCalculateWeightFromSpec(type: string, sizeSpecs: string, grade = 'SS 304', qty = 1): number {
  try {
    const clean = sizeSpecs.toUpperCase();
    if (type.includes('Flat') || type.includes('Sheet')) {
      const parts = clean.replace(/MM/g, '').split(/[xX*]/).map(p => parseFloat(p.trim())).filter(n => !isNaN(n));
      if (parts.length >= 3) {
        return calculateFlatWeight({ widthMm: parts[0], thicknessMm: parts[1], lengthMm: parts[2], grade, quantity: qty });
      }
    } else if (type.includes('Pipe')) {
      // e.g. OD 106 x ID 75 x 110
      const odMatch = clean.match(/OD\s*([0-9.]+)/i);
      const idMatch = clean.match(/ID\s*([0-9.]+)/i);
      const parts = clean.replace(/OD|ID|MM/gi, '').split(/[xX*]/).map(p => parseFloat(p.trim())).filter(n => !isNaN(n));
      
      const od = odMatch ? parseFloat(odMatch[1]) : (parts[0] || 100);
      const id = idMatch ? parseFloat(idMatch[1]) : (parts[1] || (od - 6));
      const length = parts[parts.length - 1] || 100;
      return calculatePipeWeight({ outerDiaMm: od, innerDiaMm: id, lengthMm: length, grade, quantity: qty });
    } else if (type.includes('Circle')) {
      // e.g. OD 285 x 12 MM
      const odMatch = clean.match(/OD\s*([0-9.]+)/i);
      const parts = clean.replace(/OD|MM/gi, '').split(/[xX*]/).map(p => parseFloat(p.trim())).filter(n => !isNaN(n));
      const od = odMatch ? parseFloat(odMatch[1]) : (parts[0] || 200);
      const thickness = parts.length > 1 ? parts[1] : 10;
      return calculateCircleWeight({ outerDiaMm: od, thicknessMm: thickness, grade, quantity: qty });
    } else if (type.includes('Bar')) {
      const parts = clean.replace(/DIA|Ø|MM/gi, '').split(/[xX*]/).map(p => parseFloat(p.trim())).filter(n => !isNaN(n));
      if (parts.length >= 2) {
        return calculateBarWeight({ diameterMm: parts[0], lengthMm: parts[1], grade, quantity: qty });
      }
    }
  } catch (e) {
    console.warn('Auto calculate weight failed for:', sizeSpecs, e);
  }
  return 0;
}

/**
 * Currency Formatter (INR ₹)
 */
export function formatINR(val: number): string {
  if (isNaN(val)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}

/**
 * Compact Indian Number Formatter (e.g. ₹ 4.5 L or ₹ 1.2 Cr)
 */
export function formatCompactINR(val: number): string {
  if (isNaN(val)) return '₹0';
  if (val >= 10000000) {
    return `₹${(val / 10000000).toFixed(2)} Cr`;
  }
  if (val >= 100000) {
    return `₹${(val / 100000).toFixed(2)} L`;
  }
  if (val >= 1000) {
    return `₹${(val / 1000).toFixed(1)} K`;
  }
  return `₹${val.toFixed(0)}`;
}

/**
 * Date Formatter
 */
export function formatDate(dateString: string): string {
  if (!dateString) return '-';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}
