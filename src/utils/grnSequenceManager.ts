import { GRNOptions } from './grnPdfGenerator';

export interface GRNRecord {
  id: string;
  grnNumber: string;
  sequenceNumber: number;
  year: number;
  createdAt: string;
  grnDate: string;
  vendorName: string;
  poNumber?: string;
  challanNumber?: string;
  projectName?: string;
  itemCount: number;
  totalOrderedQty: number;
  totalReceivedQty: number;
  totalShortageQty: number;
  receivedBy: string;
  remarks?: string;
}

const STORAGE_KEY_PREFIX = 'rsb_grn_sequence_';
const HISTORY_STORAGE_KEY = 'rsb_grn_history';

/**
 * Returns the current year (default 2026).
 */
export const getGRNCurrentYear = (): number => {
  return new Date().getFullYear();
};

/**
 * Formats a sequence number into the official RSB format:
 * e.g., seq=1, year=2026 => 'GRN-RSB-2026-0001'
 */
export const formatGRNNumber = (sequence: number, year: number = getGRNCurrentYear()): string => {
  const padded = String(Math.max(1, sequence)).padStart(4, '0');
  return `GRN-RSB-${year}-${padded}`;
};

/**
 * Parses a GRN number to extract sequence number and year.
 * Returns null if string does not match pattern.
 */
export const parseGRNNumber = (grnStr?: string): { year: number; sequence: number } | null => {
  if (!grnStr) return null;
  const match = grnStr.trim().match(/GRN-RSB-(\d{4})-(\d+)/i);
  if (match) {
    return {
      year: parseInt(match[1], 10),
      sequence: parseInt(match[2], 10),
    };
  }
  return null;
};

/**
 * Retrieves the current counter for the given year without incrementing.
 */
export const getCurrentGRNSequence = (year: number = getGRNCurrentYear()): number => {
  try {
    const key = `${STORAGE_KEY_PREFIX}${year}`;
    const stored = localStorage.getItem(key);
    if (stored !== null) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed >= 1) {
        return parsed;
      }
    }

    // If not set yet, check history for highest sequence
    const history = getGRNHistory();
    const yearHistory = history.filter((h) => h.year === year);
    if (yearHistory.length > 0) {
      const maxSeq = Math.max(...yearHistory.map((h) => h.sequenceNumber || 0));
      if (maxSeq > 0) {
        const next = maxSeq + 1;
        localStorage.setItem(key, String(next));
        return next;
      }
    }

    // Default starting sequence is 1
    localStorage.setItem(key, '1');
    return 1;
  } catch (err) {
    console.warn('Could not read GRN sequence from localStorage:', err);
    return 1;
  }
};

/**
 * Peeks what the next sequential GRN number will be (e.g. 'GRN-RSB-2026-0001').
 */
export const peekNextGRNNumber = (year: number = getGRNCurrentYear()): string => {
  const currentSeq = getCurrentGRNSequence(year);
  return formatGRNNumber(currentSeq, year);
};

/**
 * Loads all historical GRN records from localStorage.
 */
export const getGRNHistory = (): GRNRecord[] => {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.warn('Could not read GRN history:', err);
    return [];
  }
};

/**
 * Commits a generated GRN:
 * 1. Saves it to GRN history log.
 * 2. Increments the sequential counter for that year so next GRN will be seq + 1.
 * 3. Broadcasts window event 'rsb:grn-committed'.
 */
export const commitGRNSequence = (options: GRNOptions): string => {
  const year = getGRNCurrentYear();
  let grnNumber = options.grnNumber;

  // Determine sequence number
  const parsed = parseGRNNumber(grnNumber);
  const currentSeq = getCurrentGRNSequence(year);
  const seqNumber = parsed?.year === year && parsed?.sequence ? parsed.sequence : currentSeq;

  if (!grnNumber || !parsed) {
    grnNumber = formatGRNNumber(seqNumber, year);
  }

  // Calculate totals
  const totalOrdered = options.items.reduce(
    (sum, it) => sum + (Number(it.orderedQty ?? it.poQuantity) || 0),
    0
  );
  const totalReceived = options.items.reduce(
    (sum, it) => sum + (Number(it.receivedQty ?? it.receivedQuantity) || 0),
    0
  );
  const totalShortage = options.items.reduce((sum, it) => {
    const ord = Number(it.orderedQty ?? it.poQuantity) || 0;
    const rec = Number(it.receivedQty ?? it.receivedQuantity) || 0;
    return sum + Math.max(0, ord - rec);
  }, 0);

  const newRecord: GRNRecord = {
    id: `grn-rec-${Date.now()}-${seqNumber}`,
    grnNumber,
    sequenceNumber: seqNumber,
    year,
    createdAt: new Date().toISOString(),
    grnDate: options.grnDate || new Date().toISOString().split('T')[0],
    vendorName: options.vendorName || 'General Supplier',
    poNumber: options.poNumber,
    challanNumber: options.challanNumber,
    projectName: options.projectName,
    itemCount: options.items.length,
    totalOrderedQty: totalOrdered,
    totalReceivedQty: totalReceived,
    totalShortageQty: totalShortage,
    receivedBy: options.receivedBy || 'Chandramani (Store Incharge)',
    remarks: options.qcRemarks,
  };

  try {
    // 1. Append to history
    const history = getGRNHistory();
    // Check if duplicate grnNumber already logged
    const existingIdx = history.findIndex((h) => h.grnNumber === grnNumber);
    if (existingIdx >= 0) {
      history[existingIdx] = newRecord;
    } else {
      history.unshift(newRecord);
    }
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history.slice(0, 500)));

    // 2. Increment sequence counter to next (seqNumber + 1)
    const nextSeq = Math.max(currentSeq, seqNumber) + 1;
    const key = `${STORAGE_KEY_PREFIX}${year}`;
    localStorage.setItem(key, String(nextSeq));

    // 3. Dispatch event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('rsb:grn-committed', {
          detail: { grnNumber, nextGRNNumber: formatGRNNumber(nextSeq, year), record: newRecord },
        })
      );
    }
  } catch (err) {
    console.error('Failed to commit GRN sequence:', err);
  }

  return grnNumber;
};

/**
 * Manually set or adjust the next sequence counter (e.g. from an admin/store setting).
 */
export const setNextGRNSequence = (nextSeq: number, year: number = getGRNCurrentYear()): void => {
  const safeSeq = Math.max(1, Math.floor(nextSeq));
  const key = `${STORAGE_KEY_PREFIX}${year}`;
  localStorage.setItem(key, String(safeSeq));

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('rsb:grn-committed', {
        detail: { nextGRNNumber: formatGRNNumber(safeSeq, year) },
      })
    );
  }
};

