import * as XLSX from 'xlsx';
import {
  Workbook,
  WorkbookDirectory,
  WorkbookSheet,
  WorkbookTrashItem,
  WorkbookActivityLog,
  SheetCell,
} from '../types/workbook';
import {
  INITIAL_WORKBOOK_DIRECTORIES,
  INITIAL_WORKBOOKS,
} from '../data/workbookSeedData';
import { getSupabaseClient } from '../lib/supabaseClient';

const STORAGE_KEYS = {
  DIRECTORIES: 'rsb_wb_directories_v8',
  WORKBOOKS: 'rsb_wb_workbooks_v8',
  TRASH: 'rsb_wb_trash_v8',
  LOGS: 'rsb_wb_logs_v8',
};

// 1. DIRECTORIES STORAGE
export function loadDirectories(): WorkbookDirectory[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.DIRECTORIES);
    if (saved !== null) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error loading directories from cache:', err);
  }
  return INITIAL_WORKBOOK_DIRECTORIES;
}

export function saveDirectories(dirs: WorkbookDirectory[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DIRECTORIES, JSON.stringify(dirs));
  } catch (err) {
    console.error('Error saving directories:', err);
  }
}

const BASE_WORKBOOK_IDS = new Set(['wb-rsb1-daily-po', 'wb-rsb2-dc-book', 'wb-rsb3-spare-parts']);
const CUSTOM_WORKBOOKS_KEY = 'rsb_custom_workbooks_v4';
const BASE_WORKBOOK_EDITS_KEY = 'rsb_base_workbooks_edits_v4';
const DELETED_WORKBOOK_IDS_KEY = 'rsb_deleted_workbook_ids_v4';

// In-memory cache
let inMemoryWorkbooks: Workbook[] | null = null;

export function getDeletedWorkbookIds(): Set<string> {
  try {
    const saved = localStorage.getItem(DELETED_WORKBOOK_IDS_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch (err) {
    console.warn('Error reading deleted workbook ids:', err);
  }
  return new Set<string>();
}

export function saveDeletedWorkbookIds(deletedIds: Set<string>): void {
  try {
    localStorage.setItem(DELETED_WORKBOOK_IDS_KEY, JSON.stringify(Array.from(deletedIds)));
  } catch (err) {
    console.warn('Error saving deleted workbook ids:', err);
  }
}

// 2. WORKBOOKS STORAGE
export function loadWorkbooks(): Workbook[] {
  if (inMemoryWorkbooks !== null) {
    return inMemoryWorkbooks;
  }

  // Seamless migration from v3 if v4 not set
  try {
    if (!localStorage.getItem(CUSTOM_WORKBOOKS_KEY)) {
      const v3Custom = localStorage.getItem('rsb_custom_workbooks_v3');
      if (v3Custom) localStorage.setItem(CUSTOM_WORKBOOKS_KEY, v3Custom);
    }
  } catch (_) {}

  const deletedIds = getDeletedWorkbookIds();

  // 1. Start with base RSB workbooks with accurate Row 1 column headers
  const baseMap = new Map<string, Workbook>();
  INITIAL_WORKBOOKS.forEach((wb) => {
    if (!deletedIds.has(wb.id)) {
      baseMap.set(wb.id, JSON.parse(JSON.stringify(wb)));
    }
  });

  // 2. Apply any saved edits to remaining base workbooks
  try {
    const savedBaseEdits = localStorage.getItem(BASE_WORKBOOK_EDITS_KEY);
    if (savedBaseEdits) {
      const parsedEdits: Record<string, Partial<Workbook>> = JSON.parse(savedBaseEdits);
      Object.entries(parsedEdits).forEach(([id, edits]) => {
        const existing = baseMap.get(id);
        if (existing) {
          baseMap.set(id, { ...existing, ...edits });
        }
      });
    }
  } catch (err) {
    console.warn('Error applying base workbook edits:', err);
  }

  // 3. Load user-created custom workbooks (unless deleted)
  const customWbs: Workbook[] = [];
  try {
    const savedCustom = localStorage.getItem(CUSTOM_WORKBOOKS_KEY);
    if (savedCustom) {
      const parsedCustom: Workbook[] = JSON.parse(savedCustom);
      if (Array.isArray(parsedCustom)) {
        parsedCustom.forEach((wb) => {
          if (!deletedIds.has(wb.id)) {
            customWbs.push(wb);
          }
        });
      }
    }
  } catch (err) {
    console.warn('Error loading custom workbooks:', err);
  }

  // 4. Combine base + custom workbooks
  const result = [...Array.from(baseMap.values()), ...customWbs];
  inMemoryWorkbooks = result;
  return result;
}

export function saveWorkbooks(wbs: Workbook[]): void {
  inMemoryWorkbooks = wbs;

  const currentIds = new Set(wbs.map((w) => w.id));
  const deletedIds = getDeletedWorkbookIds();

  // Any base workbook not in the current list is marked as deleted
  BASE_WORKBOOK_IDS.forEach((id) => {
    if (!currentIds.has(id)) {
      deletedIds.add(id);
    } else {
      deletedIds.delete(id);
    }
  });
  saveDeletedWorkbookIds(deletedIds);

  // Separate custom vs base workbooks
  const customWbs: Workbook[] = [];
  const baseEdits: Record<string, Partial<Workbook>> = {};

  wbs.forEach((wb) => {
    if (!BASE_WORKBOOK_IDS.has(wb.id)) {
      customWbs.push(wb);
    } else {
      baseEdits[wb.id] = {
        title: wb.title,
        description: wb.description,
        is_pinned: wb.is_pinned,
        is_favorite: wb.is_favorite,
        directory_id: wb.directory_id,
        tags: wb.tags,
        sheets: wb.sheets,
        last_edited_at: wb.last_edited_at,
        last_edited_by: wb.last_edited_by,
        last_edited_by_name: wb.last_edited_by_name,
      };
    }
  });

  // Save custom workbooks permanently to localStorage
  try {
    localStorage.setItem(CUSTOM_WORKBOOKS_KEY, JSON.stringify(customWbs));
  } catch (err) {
    console.warn('LocalStorage save custom workbooks warning:', err);
  }

  // Save base workbooks edits permanently to localStorage
  try {
    localStorage.setItem(BASE_WORKBOOK_EDITS_KEY, JSON.stringify(baseEdits));
  } catch (err) {
    console.warn('LocalStorage save base workbook edits warning:', err);
  }
}

// 3. TRASH STORAGE
export function loadTrash(): WorkbookTrashItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.TRASH);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error loading trash:', err);
  }
  return [];
}

export function saveTrash(items: WorkbookTrashItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.TRASH, JSON.stringify(items));
  } catch (err) {
    console.error('Error saving trash:', err);
  }
}

// 4. ACTIVITY LOGS
export function loadActivityLogs(): WorkbookActivityLog[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.LOGS);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error loading logs:', err);
  }
  return [];
}

export function logWorkbookActivity(
  workbookId: string,
  action: string,
  userName: string,
  userRole: string,
  details: string
): void {
  try {
    const logs = loadActivityLogs();
    const newLog: WorkbookActivityLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      workbook_id: workbookId,
      action,
      user_name: userName,
      user_role: userRole,
      details,
      timestamp: new Date().toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
    logs.unshift(newLog);
    // Keep max 500 logs
    const trimmed = logs.slice(0, 500);
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(trimmed));
  } catch (err) {
    console.error('Error logging activity:', err);
  }
}

// 5. IMPORT EXCEL FILE TO WORKBOOK
export async function importExcelFileToWorkbook(
  file: File,
  directoryId: string,
  userId: string,
  userName: string
): Promise<Workbook> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const readWb = XLSX.read(data, { type: 'array', cellFormula: true, cellDates: true });

        const wbId = `wb-import-${Date.now()}`;
        const baseTitle = file.name.replace(/\.[^/.]+$/, '').toUpperCase();

        const sheets: WorkbookSheet[] = readWb.SheetNames.map((sheetName, sIdx) => {
          const ws = readWb.Sheets[sheetName];
          const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:Z50');
          const rowCount = Math.max(range.e.r + 1, 50);
          const colCount = Math.max(range.e.c + 1, 26);

          const cells: Record<string, SheetCell> = {};
          const colWidths: Record<string, number> = {};

          // Extract cells
          for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
              const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
              const cell = ws[cellAddress];
              if (!cell) continue;

              const isHeader = R === 0;
              let val = cell.v;
              let formula: string | undefined = undefined;

              if (cell.f) {
                formula = `=${cell.f}`;
              }

              // Date formatting
              let format: 'general' | 'number' | 'currency' | 'percent' | 'date' | 'time' | 'text' = 'general';
              if (cell.t === 'd' || (typeof val === 'string' && /^\d{2,4}[-/]\d{1,2}[-/]\d{1,4}/.test(val))) {
                format = 'date';
                if (val instanceof Date) {
                  val = val.toLocaleDateString('en-GB');
                }
              } else if (cell.t === 'n') {
                format = 'number';
              }

              cells[cellAddress] = {
                v: formula ? null : val,
                f: formula,
                bold: isHeader || cell.s?.font?.bold,
                italic: cell.s?.font?.italic,
                align: isHeader ? 'center' : cell.t === 'n' ? 'right' : 'left',
                format,
                bgColor: isHeader ? '#1e293b' : undefined,
                textColor: isHeader ? '#ffffff' : undefined,
              };

              // Width estimate
              const colKey = XLSX.utils.encode_col(C);
              const valStr = String(val || '');
              const estWidth = Math.min(Math.max(valStr.length * 9 + 30, 80), 300);
              if (!colWidths[colKey] || estWidth > colWidths[colKey]) {
                colWidths[colKey] = estWidth;
              }
            }
          }

          return {
            id: `sheet-${Date.now()}-${sIdx}`,
            workbook_id: wbId,
            name: sheetName,
            tab_color: sIdx === 0 ? '#10b981' : '#3b82f6',
            order_index: sIdx,
            row_count: rowCount,
            col_count: colCount,
            col_widths: colWidths,
            frozen_rows: 1,
            frozen_cols: 0,
            cells,
          };
        });

        const newWorkbook: Workbook = {
          id: wbId,
          directory_id: directoryId,
          title: baseTitle,
          description: `Imported from ${file.name} (${sheets.length} sheets)`,
          created_by: userId,
          created_by_name: userName,
          created_at: new Date().toISOString(),
          last_edited_by: userId,
          last_edited_by_name: userName,
          last_edited_at: new Date().toISOString(),
          is_pinned: false,
          is_favorite: false,
          tags: ['Imported', file.name.split('.').pop()?.toUpperCase() || 'XLSX'],
          sheets: sheets.length > 0 ? sheets : [
            {
              id: `sheet-${Date.now()}-1`,
              workbook_id: wbId,
              name: 'Sheet1',
              tab_color: '#3b82f6',
              order_index: 0,
              row_count: 50,
              col_count: 26,
              col_widths: {},
              frozen_rows: 1,
              frozen_cols: 0,
              cells: {},
            },
          ],
        };

        resolve(newWorkbook);
      } catch (err) {
        console.error('Error importing Excel file:', err);
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

// 6. EXPORT WORKBOOK TO REAL XLSX FILE
export function exportWorkbookToXLSX(workbook: Workbook): void {
  const wb = XLSX.utils.book_new();

  workbook.sheets.forEach((sheet) => {
    const dataMatrix: any[][] = [];

    // Find max row and col in cells
    let maxR = 0;
    let maxC = 0;

    Object.keys(sheet.cells).forEach((coord) => {
      const decoded = XLSX.utils.decode_cell(coord);
      if (decoded.r > maxR) maxR = decoded.r;
      if (decoded.c > maxC) maxC = decoded.c;
    });

    maxR = Math.max(maxR, 20);
    maxC = Math.max(maxC, 10);

    for (let r = 0; r <= maxR; r++) {
      const row: any[] = [];
      for (let c = 0; c <= maxC; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = sheet.cells[addr];
        if (cell) {
          if (cell.f) {
            row.push({ f: cell.f.startsWith('=') ? cell.f.substring(1) : cell.f });
          } else {
            row.push(cell.v !== undefined && cell.v !== null ? cell.v : '');
          }
        } else {
          row.push('');
        }
      }
      dataMatrix.push(row);
    }

    const ws = XLSX.utils.aoa_to_sheet(dataMatrix);

    // Apply column widths if present
    if (sheet.col_widths) {
      ws['!cols'] = Object.keys(sheet.col_widths).map((colKey) => {
        const w = sheet.col_widths?.[colKey] || 100;
        return { wch: Math.round(w / 8) };
      });
    }

    XLSX.utils.book_append_sheet(wb, ws, sheet.name.substring(0, 31)); // max 31 chars in Excel sheet names
  });

  const fileName = `${workbook.title.replace(/[/\\?%*:|"<>]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

// 7. EXPORT CURRENT SHEET AS CSV
export function exportSheetToCSV(sheet: WorkbookSheet, workbookTitle: string): void {
  const dataMatrix: any[][] = [];
  let maxR = 0;
  let maxC = 0;

  Object.keys(sheet.cells).forEach((coord) => {
    const decoded = XLSX.utils.decode_cell(coord);
    if (decoded.r > maxR) maxR = decoded.r;
    if (decoded.c > maxC) maxC = decoded.c;
  });

  for (let r = 0; r <= maxR; r++) {
    const row: any[] = [];
    for (let c = 0; c <= maxC; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = sheet.cells[addr];
      const val = cell ? (cell.calced !== undefined ? cell.calced : cell.v) : '';
      row.push(val !== undefined && val !== null ? val : '');
    }
    dataMatrix.push(row);
  }

  const ws = XLSX.utils.aoa_to_sheet(dataMatrix);
  const csvContent = XLSX.utils.sheet_to_csv(ws);

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${workbookTitle}_${sheet.name}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 8. SUPABASE SYNC (Optional Cloud Mirror)
export async function syncWorkbooksWithSupabase(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;

  try {
    const workbooks = loadWorkbooks();
    const directories = loadDirectories();

    // Push directories
    for (const dir of directories) {
      await client.from('workbook_directories').upsert({
        id: dir.id,
        name: dir.name,
        icon: dir.icon,
        color: dir.color,
        created_by: dir.created_by,
        order_index: dir.order_index,
        updated_at: new Date().toISOString(),
      });
    }

    // Push workbooks metadata
    for (const wb of workbooks) {
      await client.from('workbooks').upsert({
        id: wb.id,
        directory_id: wb.directory_id,
        title: wb.title,
        description: wb.description,
        created_by: wb.created_by,
        created_by_name: wb.created_by_name,
        created_at: wb.created_at,
        last_edited_by: wb.last_edited_by,
        last_edited_by_name: wb.last_edited_by_name,
        last_edited_at: wb.last_edited_at,
        is_pinned: wb.is_pinned,
        is_favorite: wb.is_favorite,
        tags: wb.tags,
        sheets_data: wb.sheets,
        updated_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.warn('Supabase sync skipped/failed:', err);
  }
}
