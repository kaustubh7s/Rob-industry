import { SheetCell } from '../types/workbook';

// Converts 0 -> "A", 1 -> "B", 25 -> "Z", 26 -> "AA", 27 -> "AB"
export function colIndexToName(colIdx: number): string {
  let name = '';
  let n = colIdx;
  while (n >= 0) {
    name = String.fromCharCode((n % 26) + 65) + name;
    n = Math.floor(n / 26) - 1;
  }
  return name;
}

// Converts "A" -> 0, "B" -> 1, "AA" -> 26
export function colNameToIndex(colName: string): number {
  const upper = colName.toUpperCase();
  let index = 0;
  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + (upper.charCodeAt(i) - 64);
  }
  return index - 1;
}

// Converts "B5" -> { col: 1, row: 4 } (0-indexed)
export function cellIdToCoords(cellId: string): { col: number; row: number } | null {
  const match = cellId.trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!match) return null;
  const col = colNameToIndex(match[1]);
  const row = parseInt(match[2], 10) - 1;
  return { col, row };
}

// Converts (col=1, row=4) -> "B5"
export function coordsToCellId(col: number, row: number): string {
  return `${colIndexToName(col)}${row + 1}`;
}

// Expands range "A1:B3" to array of cell IDs: ["A1", "A2", "A3", "B1", "B2", "B3"]
export function expandCellRange(rangeStr: string): string[] {
  const parts = rangeStr.trim().toUpperCase().split(':');
  if (parts.length === 1) return [parts[0]];
  if (parts.length !== 2) return [];

  const start = cellIdToCoords(parts[0]);
  const end = cellIdToCoords(parts[1]);
  if (!start || !end) return [];

  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);
  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);

  const cells: string[] = [];
  for (let c = minCol; c <= maxCol; c++) {
    for (let r = minRow; r <= maxRow; r++) {
      cells.push(coordsToCellId(c, r));
    }
  }
  return cells;
}

// Helper to get raw numeric value from cell
export function getNumericCellValue(cell?: SheetCell): number {
  if (!cell) return 0;
  const val = cell.calced !== undefined ? cell.calced : cell.v;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

// Helper to get string/raw value from cell
export function getRawCellValue(cell?: SheetCell): any {
  if (!cell) return '';
  return cell.calced !== undefined ? cell.calced : cell.v;
}

// Evaluates a spreadsheet formula string e.g. "=SUM(G2:G50)" or "=A1+B1"
export function evaluateFormula(
  formula: string,
  cells: Record<string, SheetCell>,
  visited: Set<string> = new Set()
): any {
  if (!formula || typeof formula !== 'string' || !formula.startsWith('=')) {
    return formula;
  }

  const expr = formula.substring(1).trim();

  // 1. Function patterns: SUM, AVERAGE, COUNT, COUNTA, MIN, MAX, ROUND
  const funcMatch = expr.match(/^([A-Z_]+)\s*\((.*)\)$/i);
  if (funcMatch) {
    const funcName = funcMatch[1].toUpperCase();
    const argsRaw = funcMatch[2].trim();

    // Parse comma-separated arguments / ranges
    const argTokens = argsRaw.split(',').map((t) => t.trim());
    const cellIds: string[] = [];

    argTokens.forEach((tok) => {
      if (tok.includes(':')) {
        cellIds.push(...expandCellRange(tok));
      } else if (/^[A-Z]+\d+$/i.test(tok)) {
        cellIds.push(tok.toUpperCase());
      }
    });

    const values = cellIds.map((cid) => {
      const c = cells[cid];
      if (c?.f && !visited.has(cid)) {
        visited.add(cid);
        return getNumericCellValue({ ...c, calced: evaluateFormula(c.f, cells, visited) });
      }
      return getNumericCellValue(c);
    });

    switch (funcName) {
      case 'SUM':
        return values.reduce((sum, n) => sum + n, 0);

      case 'AVERAGE':
      case 'AVG': {
        const nonZeroOrValid = values.length > 0 ? values : [0];
        const sum = nonZeroOrValid.reduce((s, n) => s + n, 0);
        return sum / nonZeroOrValid.length;
      }

      case 'COUNT':
        return values.filter((n) => typeof n === 'number' && !isNaN(n)).length;

      case 'COUNTA':
        return cellIds.filter((cid) => {
          const val = cells[cid]?.v;
          return val !== null && val !== undefined && val !== '';
        }).length;

      case 'MIN':
        return values.length > 0 ? Math.min(...values) : 0;

      case 'MAX':
        return values.length > 0 ? Math.max(...values) : 0;

      case 'ROUND': {
        const num = values[0] || 0;
        const decimals = parseInt(argTokens[1], 10) || 0;
        return Number(Math.round(Number(num + 'e' + decimals)) + 'e-' + decimals);
      }

      default:
        break;
    }
  }

  // 2. Simple Arithmetic: e.g. "=A2*B2" or "=(A2+B2)*0.18"
  try {
    // Replace cell references like A1, BC12 with their numeric values
    const safeExpr = expr.replace(/\b([A-Z]+[0-9]+)\b/gi, (match) => {
      const cid = match.toUpperCase();
      const c = cells[cid];
      if (c?.f && !visited.has(cid)) {
        visited.add(cid);
        const calc = evaluateFormula(c.f, cells, visited);
        return String(getNumericCellValue({ ...c, calced: calc }));
      }
      return String(getNumericCellValue(c));
    });

    // Clean check to prevent unsafe eval: only allow math characters and numbers
    if (/^[0-9+\-*/().\s,]+$/.test(safeExpr)) {
      // Safe math evaluator
      const fn = new Function(`return (${safeExpr});`);
      const res = fn();
      return typeof res === 'number' && !isNaN(res) ? Math.round(res * 1000) / 1000 : res;
    }
  } catch (err) {
    return '#VALUE!';
  }

  return '#NAME?';
}

// Format display value based on CellFormat
export function formatCellValue(cell?: SheetCell): string {
  if (!cell) return '';
  const raw = cell.calced !== undefined ? cell.calced : cell.v;
  if (raw === null || raw === undefined || raw === '') return '';

  const format = cell.format || 'general';

  if (typeof raw === 'number') {
    switch (format) {
      case 'currency':
        return `₹${raw.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      case 'percent':
        return `${(raw * 100).toFixed(1)}%`;
      case 'number':
        return raw.toLocaleString('en-IN', { maximumFractionDigits: 2 });
      case 'date': {
        if (typeof raw === 'string') return raw;
        const d = new Date(raw);
        return isNaN(d.getTime()) ? String(raw) : d.toLocaleDateString('en-GB');
      }
      case 'general':
      default:
        return String(raw);
    }
  }

  // If already string, return directly
  if (typeof raw === 'string') {
    if (format === 'currency') {
      const num = parseFloat(raw.replace(/[^0-9.-]/g, ''));
      if (!isNaN(num)) {
        return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    }
    return raw;
  }

  return String(raw);
}
