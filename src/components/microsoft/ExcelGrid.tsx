import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  WorkbookSheet,
  SheetCell,
  CellSelection,
} from '../../types/workbook';
import {
  colIndexToName,
  coordsToCellId,
  cellIdToCoords,
  evaluateFormula,
  formatCellValue,
} from '../../services/workbookFormula';
import {
  Copy,
  Scissors,
  ClipboardPaste,
  Plus,
  Trash2,
  Sigma,
  Filter,
  ChevronDown,
  Edit2,
  Maximize2,
  ArrowDown,
  ArrowUp,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  MoveHorizontal,
  MoveVertical,
  Settings2,
} from 'lucide-react';
import { ExcelColumnFilterMenu } from './ExcelColumnFilterMenu';

interface ExcelGridProps {
  sheet: WorkbookSheet;
  activeCell: string;
  onActiveCellChange: (cellId: string) => void;
  onCellChange: (cellId: string, updates: Partial<SheetCell>) => void;
  onBatchCellsChange: (updates: Record<string, Partial<SheetCell>>) => void;
  onUpdateSheetMeta?: (updates: Partial<WorkbookSheet>) => void;
  onSelectionChange?: (selection: CellSelection) => void;
  searchQuery: string;
}

const DEFAULT_COL_WIDTH = 135;
const DEFAULT_ROW_HEIGHT = 28;
const HEADER_ROW_HEIGHT = 26;
const ROW_HEADER_WIDTH = 42;
const OVERSCAN_ROWS = 15;
const OVERSCAN_COLS = 5;

export const ExcelGrid: React.FC<ExcelGridProps> = ({
  sheet,
  activeCell,
  onActiveCellChange,
  onCellChange,
  onBatchCellsChange,
  onUpdateSheetMeta,
  onSelectionChange,
  searchQuery,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');

  // Column Header Rename Inline Mode
  const [renamingColIdx, setRenamingColIdx] = useState<number | null>(null);
  const [colRenameValue, setColRenameValue] = useState('');

  // Right-click Context Menu
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    targetType: 'cell' | 'row' | 'col';
    cellId?: string;
    rowIndex?: number;
    colIndex?: number;
  } | null>(null);

  // Column Filter Dropdown Menu
  const [filterMenu, setFilterMenu] = useState<{
    colIdx: number;
    colName: string;
    customColName?: string;
    position: { x: number; y: number };
  } | null>(null);

  const activeFilters = sheet.active_filters || {};
  const customHeaders = sheet.custom_col_headers || {};

  // Selection Range
  const [selection, setSelection] = useState<CellSelection>(() => {
    const coords = cellIdToCoords(activeCell) || { col: 0, row: 0 };
    return {
      startRow: coords.row,
      startCol: coords.col,
      endRow: coords.row,
      endCol: coords.col,
    };
  });

  const [isSelecting, setIsSelecting] = useState(false);
  const [isFilling, setIsFilling] = useState(false);
  const [fillRange, setFillRange] = useState<{ startRow: number; endRow: number; startCol: number; endCol: number } | null>(null);

  // Sync selection to parent for multi-cell formatting & column coloring
  useEffect(() => {
    onSelectionChange?.(selection);
  }, [selection, onSelectionChange]);

  // Column resizing state
  const [resizingCol, setResizingCol] = useState<{ colIdx: number; startX: number; startW: number; currentW: number } | null>(null);
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => sheet.col_widths || {});

  useEffect(() => {
    setColWidths(sheet.col_widths || {});
  }, [sheet.col_widths]);

  // Row resizing state
  const [resizingRow, setResizingRow] = useState<{ rowIdx: number; startY: number; startH: number; currentH: number } | null>(null);
  const [rowHeights, setRowHeights] = useState<Record<number, number>>(() => sheet.row_heights || {});

  useEffect(() => {
    setRowHeights(sheet.row_heights || {});
  }, [sheet.row_heights]);

  // Custom Size Modal
  const [customSizeModal, setCustomSizeModal] = useState<{
    type: 'col' | 'row';
    targetIndex: number;
    currentSize: number;
  } | null>(null);
  const [customSizeInput, setCustomSizeInput] = useState<string>('');

  // Virtual Scrolling Viewport
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [viewportWidth, setViewportWidth] = useState(1000);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setViewportHeight(containerRef.current.clientHeight || 600);
        setViewportWidth(containerRef.current.clientWidth || 1000);
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
    setScrollLeft(e.currentTarget.scrollLeft);
    if (contextMenu) setContextMenu(null);
    if (filterMenu) setFilterMenu(null);
  };

  const totalRawRows = Math.max(sheet.row_count || 1000, 1000);
  const totalCols = Math.max(sheet.col_count || 26, 26);
  const rowHeaderWidth = totalRawRows >= 10000 ? 58 : totalRawRows >= 1000 ? 50 : 44;

  // Optimized Evaluated Cells Cache (Only formulas evaluated; simple cells passed through directly)
  const evaluatedCells = useMemo(() => {
    const result: Record<string, SheetCell> = {};
    const cells = sheet.cells || {};
    for (const coord in cells) {
      const cell = cells[coord];
      if (cell.f) {
        const calced = evaluateFormula(cell.f, cells);
        result[coord] = { ...cell, calced };
      } else {
        result[coord] = cell;
      }
    }
    return result;
  }, [sheet.cells]);

  // Dynamic Row Filtering Engine (Zero-latency fast scan)
  const filteredRowIndices = useMemo(() => {
    const activeFilterEntries = Object.entries(activeFilters);
    if (activeFilterEntries.length === 0) {
      return Array.from({ length: totalRawRows }, (_, i) => i);
    }

    const matchingRows: number[] = [0]; // Row 0 is header

    for (let r = 1; r < totalRawRows; r++) {
      let isMatch = true;
      for (let fIdx = 0; fIdx < activeFilterEntries.length; fIdx++) {
        const [colLetter, allowedValues] = activeFilterEntries[fIdx];
        if (!allowedValues || allowedValues.length === 0) continue;
        const cid = `${colLetter}${r + 1}`;
        const cell = evaluatedCells[cid];
        const valStr =
          cell?.calced !== undefined
            ? String(cell.calced).trim()
            : cell?.v !== undefined && cell?.v !== null
            ? String(cell.v).trim()
            : '(Blanks)';

        if (!allowedValues.includes(valStr)) {
          isMatch = false;
          break;
        }
      }
      if (isMatch) {
        matchingRows.push(r);
      }
    }
    return matchingRows;
  }, [totalRawRows, activeFilters, evaluatedCells]);

  const totalFilteredRows = filteredRowIndices.length;

  const getColWidth = useCallback(
    (cIdx: number) => {
      const colLetter = colIndexToName(cIdx);
      return colWidths[colLetter] || DEFAULT_COL_WIDTH;
    },
    [colWidths]
  );

  const getRowHeight = useCallback(
    (rIdx: number) => {
      return rowHeights[rIdx] || sheet.row_heights?.[rIdx] || DEFAULT_ROW_HEIGHT;
    },
    [rowHeights, sheet.row_heights]
  );

  // Cumulative positions
  const colPositions = useMemo(() => {
    const pos = [0];
    for (let c = 0; c < totalCols; c++) {
      pos.push(pos[c] + getColWidth(c));
    }
    return pos;
  }, [totalCols, getColWidth]);

  const rowPositions = useMemo(() => {
    const pos = [0];
    for (let r = 0; r < totalFilteredRows; r++) {
      const origRowIndex = filteredRowIndices[r];
      pos.push(pos[r] + getRowHeight(origRowIndex));
    }
    return pos;
  }, [totalFilteredRows, filteredRowIndices, getRowHeight]);

  const totalContentWidth = colPositions[totalCols];
  const totalContentHeight = rowPositions[totalFilteredRows];

  const activeCoords = useMemo(() => cellIdToCoords(activeCell) || { col: 0, row: 0 }, [activeCell]);

  // Visible Range
  const visibleRowStart = useMemo(() => {
    let low = 0;
    let high = totalFilteredRows - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (rowPositions[mid] < scrollTop) low = mid + 1;
      else high = mid - 1;
    }
    return Math.max(0, low - 1 - OVERSCAN_ROWS);
  }, [scrollTop, totalFilteredRows, rowPositions]);

  const visibleRowEnd = useMemo(() => {
    let low = visibleRowStart;
    let high = totalFilteredRows - 1;
    const target = scrollTop + viewportHeight;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (rowPositions[mid] < target) low = mid + 1;
      else high = mid - 1;
    }
    return Math.min(totalFilteredRows - 1, low + OVERSCAN_ROWS);
  }, [scrollTop, viewportHeight, visibleRowStart, totalFilteredRows, rowPositions]);

  const isRowFrozen = sheet.frozen_rows === 1;

  // Rendered Row Indices (Always keeps Row 0 mounted if frozen so headers stay locked when scrolling)
  const renderedRowIndices = useMemo(() => {
    const list: number[] = [];
    const added = new Set<number>();

    if (isRowFrozen && filteredRowIndices.length > 0) {
      list.push(0);
      added.add(0);
    }

    for (let idx = visibleRowStart; idx <= visibleRowEnd; idx++) {
      if (idx < filteredRowIndices.length) {
        if (!added.has(idx)) {
          list.push(idx);
          added.add(idx);
        }
      }
    }
    return list;
  }, [isRowFrozen, visibleRowStart, visibleRowEnd, filteredRowIndices]);

  const visibleColStart = useMemo(() => {
    let low = 0;
    let high = totalCols - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (colPositions[mid] < scrollLeft) low = mid + 1;
      else high = mid - 1;
    }
    return Math.max(0, low - 1 - OVERSCAN_COLS);
  }, [scrollLeft, totalCols, colPositions]);

  const visibleColEnd = useMemo(() => {
    let low = visibleColStart;
    let high = totalCols - 1;
    const target = scrollLeft + viewportWidth;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (colPositions[mid] < target) low = mid + 1;
      else high = mid - 1;
    }
    return Math.min(totalCols - 1, low + OVERSCAN_COLS);
  }, [scrollLeft, viewportWidth, visibleColStart, totalCols, colPositions]);

  useEffect(() => {
    const coords = cellIdToCoords(activeCell);
    if (coords) {
      setSelection({
        startRow: coords.row,
        startCol: coords.col,
        endRow: coords.row,
        endCol: coords.col,
      });
    }
  }, [activeCell]);

  // Convert mouse pixel coordinates to row & column indices in virtual grid
  const getCellCoordsFromMouse = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return null;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left - rowHeaderWidth + containerRef.current.scrollLeft;
      const y = clientY - rect.top - HEADER_ROW_HEIGHT + containerRef.current.scrollTop;

      // Find column index
      let targetCol = 0;
      for (let c = 0; c < totalCols; c++) {
        if (x >= colPositions[c] && x < colPositions[c + 1]) {
          targetCol = c;
          break;
        }
        if (x >= colPositions[c + 1]) targetCol = c;
      }

      // Find row index
      let targetRow = 0;
      for (let r = 0; r < totalFilteredRows; r++) {
        if (y >= rowPositions[r] && y < rowPositions[r + 1]) {
          targetRow = filteredRowIndices[r];
          break;
        }
        if (y >= rowPositions[r + 1]) targetRow = filteredRowIndices[r];
      }

      return {
        col: Math.max(0, Math.min(targetCol, totalCols - 1)),
        row: Math.max(0, Math.min(targetRow, totalRawRows - 1)),
      };
    },
    [rowHeaderWidth, totalCols, totalFilteredRows, totalRawRows, colPositions, rowPositions, filteredRowIndices]
  );

  // ---------------------------------------------------------------------------
  // CLIPBOARD PARSER & PASTE ENGINE (Excel, Google Sheets, CSV, TSV)
  // ---------------------------------------------------------------------------
  const parseClipboardData = (text: string): string[][] => {
    if (!text) return [];
    const lines = text.split(/\r\n|\n|\r/);
    if (lines.length > 1 && lines[lines.length - 1] === '') {
      lines.pop();
    }
    return lines.map((line) => {
      if (line.includes('\t')) {
        return line.split('\t');
      }
      // Standard CSV parsing with quote preservation
      const result: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          inQuotes = !inQuotes;
        } else if (ch === ',' && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += ch;
        }
      }
      result.push(cur.trim());
      return result;
    });
  };

  const handlePasteData = useCallback(
    (clipText: string, startCol?: number, startRow?: number) => {
      if (!clipText) return;
      const grid = parseClipboardData(clipText);
      if (grid.length === 0) return;

      const baseCoords =
        startCol !== undefined && startRow !== undefined
          ? { col: startCol, row: startRow }
          : cellIdToCoords(activeCell) || { col: 0, row: 0 };

      const batchUpdates: Record<string, Partial<SheetCell>> = {};
      let maxC = baseCoords.col;
      let maxR = baseCoords.row;

      grid.forEach((rowVals, rOffset) => {
        const targetR = baseCoords.row + rOffset;
        if (targetR >= totalRawRows) return;
        maxR = Math.max(maxR, targetR);

        rowVals.forEach((rawVal, cOffset) => {
          const targetC = baseCoords.col + cOffset;
          if (targetC >= totalCols) return;
          maxC = Math.max(maxC, targetC);

          const cleanVal = rawVal.replace(/^"|"$/g, '').trim();
          const cid = coordsToCellId(targetC, targetR);
          const isFormula = cleanVal.startsWith('=');
          const isNum = !isFormula && !isNaN(Number(cleanVal)) && cleanVal !== '';

          batchUpdates[cid] = {
            v: isFormula ? null : isNum ? Number(cleanVal) : cleanVal,
            f: isFormula ? cleanVal : undefined,
          };
        });
      });

      if (Object.keys(batchUpdates).length > 0) {
        onBatchCellsChange(batchUpdates);
        setSelection({
          startRow: baseCoords.row,
          startCol: baseCoords.col,
          endRow: maxR,
          endCol: maxC,
        });
      }
    },
    [activeCell, totalRawRows, totalCols, onBatchCellsChange]
  );

  // ---------------------------------------------------------------------------
  // ROW & COLUMN INSERTION / DELETION / AUTO-FIT OPERATIONS
  // ---------------------------------------------------------------------------
  const handleInsertRow = useCallback(
    (targetRow: number) => {
      const newCells: Record<string, SheetCell> = {};
      Object.keys(sheet.cells).forEach((coord) => {
        const c = cellIdToCoords(coord);
        if (!c) return;
        if (c.row < targetRow) {
          newCells[coord] = sheet.cells[coord];
        } else {
          newCells[coordsToCellId(c.col, c.row + 1)] = sheet.cells[coord];
        }
      });
      onBatchCellsChange(newCells);
    },
    [sheet.cells, onBatchCellsChange]
  );

  const handleDeleteRow = useCallback(
    (targetRow: number) => {
      if (targetRow === 0) return; // Protect header row
      const newCells: Record<string, SheetCell> = {};
      Object.keys(sheet.cells).forEach((coord) => {
        const c = cellIdToCoords(coord);
        if (!c) return;
        if (c.row < targetRow) {
          newCells[coord] = sheet.cells[coord];
        } else if (c.row > targetRow) {
          newCells[coordsToCellId(c.col, c.row - 1)] = sheet.cells[coord];
        }
      });
      onBatchCellsChange(newCells);
    },
    [sheet.cells, onBatchCellsChange]
  );

  const handleInsertCol = useCallback(
    (targetCol: number) => {
      const newCells: Record<string, SheetCell> = {};
      Object.keys(sheet.cells).forEach((coord) => {
        const c = cellIdToCoords(coord);
        if (!c) return;
        if (c.col < targetCol) {
          newCells[coord] = sheet.cells[coord];
        } else {
          newCells[coordsToCellId(c.col + 1, c.row)] = sheet.cells[coord];
        }
      });
      onBatchCellsChange(newCells);
    },
    [sheet.cells, onBatchCellsChange]
  );

  const handleDeleteCol = useCallback(
    (targetCol: number) => {
      const newCells: Record<string, SheetCell> = {};
      Object.keys(sheet.cells).forEach((coord) => {
        const c = cellIdToCoords(coord);
        if (!c) return;
        if (c.col < targetCol) {
          newCells[coord] = sheet.cells[coord];
        } else if (c.col > targetCol) {
          newCells[coordsToCellId(c.col - 1, c.row)] = sheet.cells[coord];
        }
      });
      onBatchCellsChange(newCells);
    },
    [sheet.cells, onBatchCellsChange]
  );

  // ---------------------------------------------------------------------------
  // SMART AUTO-FILL ENGINE (Numbers, Dates, Alphanumerics, Formulas)
  // ---------------------------------------------------------------------------
  const handleExecuteAutoFill = useCallback(
    (
      srcSel: CellSelection,
      targetRange: { startRow: number; endRow: number; startCol: number; endCol: number }
    ) => {
      const srcMinRow = Math.min(srcSel.startRow, srcSel.endRow);
      const srcMaxRow = Math.max(srcSel.startRow, srcSel.endRow);
      const srcMinCol = Math.min(srcSel.startCol, srcSel.endCol);
      const srcMaxCol = Math.max(srcSel.startCol, srcSel.endCol);

      const targetMaxRow = targetRange.endRow;
      if (targetMaxRow <= srcMaxRow) return;

      const batchUpdates: Record<string, Partial<SheetCell>> = {};
      const numSourceRows = srcMaxRow - srcMinRow + 1;

      for (let c = srcMinCol; c <= srcMaxCol; c++) {
        const srcValues: Array<any> = [];
        let allNumbers = true;

        for (let r = srcMinRow; r <= srcMaxRow; r++) {
          const cid = coordsToCellId(c, r);
          const cell = sheet.cells[cid];
          const v = cell?.v;
          srcValues.push(v !== undefined ? v : null);
          if (typeof v !== 'number' && (v === '' || isNaN(Number(v)))) {
            allNumbers = false;
          }
        }

        let step = 1;
        if (allNumbers && srcValues.length >= 2) {
          const first = Number(srcValues[0]);
          const last = Number(srcValues[srcValues.length - 1]);
          step = (last - first) / (srcValues.length - 1) || 1;
        }

        for (let r = srcMaxRow + 1; r <= targetMaxRow; r++) {
          const targetCid = coordsToCellId(c, r);
          const offset = r - srcMaxRow;
          const srcIdx = (r - srcMinRow) % numSourceRows;
          const templateCid = coordsToCellId(c, srcMinRow + srcIdx);
          const templateCell = sheet.cells[templateCid] || {};

          // 1. Pure numbers series
          if (allNumbers && srcValues[srcIdx] !== null && srcValues[srcIdx] !== undefined) {
            const baseVal = Number(srcValues[srcValues.length - 1]);
            const newVal = baseVal + step * offset;
            batchUpdates[targetCid] = {
              ...templateCell,
              v: newVal,
            };
          }
          // 2. Date incrementing (e.g. 03/08/2026 or 2026-08-03)
          else if (
            typeof templateCell.v === 'string' &&
            /^\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}$/.test(templateCell.v.trim())
          ) {
            const parts = templateCell.v.trim().split(/[-/.]/);
            if (parts.length === 3) {
              const day = parseInt(parts[0], 10);
              const month = parseInt(parts[1], 10);
              const year = parseInt(parts[2], 10);
              const d = new Date(year < 100 ? 2000 + year : year, month - 1, day + offset);
              const formattedDate = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
              batchUpdates[targetCid] = {
                ...templateCell,
                v: formattedDate,
              };
            }
          }
          // 3. Alphanumeric series like PO-001 -> PO-002
          else if (typeof templateCell.v === 'string' && /(\D+)(\d+)$/.test(templateCell.v.trim())) {
            const match = templateCell.v.trim().match(/^(\D+)(\d+)$/);
            if (match) {
              const prefix = match[1];
              const numStr = match[2];
              const nextNum = parseInt(numStr, 10) + offset;
              const formatted = `${prefix}${String(nextNum).padStart(numStr.length, '0')}`;
              batchUpdates[targetCid] = {
                ...templateCell,
                v: formatted,
              };
            }
          }
          // 4. Formula relative row shift (e.g. =A1+B1 -> =A2+B2)
          else if (templateCell.f) {
            const shiftedFormula = templateCell.f.replace(/([A-Z]+)(\d+)/g, (_, col, rowStr) => {
              const rowNum = parseInt(rowStr, 10);
              return `${col}${rowNum + offset}`;
            });
            batchUpdates[targetCid] = {
              ...templateCell,
              f: shiftedFormula,
              v: null,
            };
          }
          // 5. Default replicate template cell
          else {
            batchUpdates[targetCid] = {
              ...templateCell,
            };
          }
        }
      }

      if (Object.keys(batchUpdates).length > 0) {
        onBatchCellsChange(batchUpdates);
        setSelection({
          startRow: srcMinRow,
          endRow: targetMaxRow,
          startCol: srcMinCol,
          endCol: srcMaxCol,
        });
      }
    },
    [sheet.cells, onBatchCellsChange]
  );

  // Smooth Auto-Scroll and Continuous Drag Loop
  const mousePosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!isSelecting && !isFilling) return;

    let animId: number;

    const handleWindowMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
      const coords = getCellCoordsFromMouse(e.clientX, e.clientY);
      if (coords) {
        if (isSelecting) {
          setSelection((prev) => ({
            ...prev,
            endRow: coords.row,
            endCol: coords.col,
          }));
        } else if (isFilling) {
          setFillRange({
            startRow: Math.min(selection.startRow, selection.endRow),
            endRow: Math.max(coords.row, Math.max(selection.startRow, selection.endRow)),
            startCol: Math.min(selection.startCol, selection.endCol),
            endCol: Math.max(selection.startCol, selection.endCol),
          });
        }
      }
    };

    const scrollLoop = () => {
      if (containerRef.current && mousePosRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const { x, y } = mousePosRef.current;
        const edgeZone = 45;
        let scrolled = false;

        // Auto-scroll down smoothly when dragging near/beyond bottom
        if (y > rect.bottom - edgeZone) {
          const delta = Math.min(Math.max((y - (rect.bottom - edgeZone)) * 0.35, 3), 25);
          containerRef.current.scrollTop += delta;
          scrolled = true;
        } else if (y < rect.top + HEADER_ROW_HEIGHT + edgeZone && y > rect.top) {
          const delta = Math.min(Math.max((rect.top + HEADER_ROW_HEIGHT + edgeZone - y) * 0.35, 3), 25);
          containerRef.current.scrollTop -= delta;
          scrolled = true;
        }

        // Horizontal scroll
        if (x > rect.right - edgeZone) {
          const delta = Math.min(Math.max((x - (rect.right - edgeZone)) * 0.35, 3), 25);
          containerRef.current.scrollLeft += delta;
          scrolled = true;
        } else if (x < rect.left + rowHeaderWidth + edgeZone && x > rect.left) {
          const delta = Math.min(Math.max((rect.left + rowHeaderWidth + edgeZone - x) * 0.35, 3), 25);
          containerRef.current.scrollLeft -= delta;
          scrolled = true;
        }

        if (scrolled) {
          const coords = getCellCoordsFromMouse(x, y);
          if (coords) {
            if (isSelecting) {
              setSelection((prev) => ({
                ...prev,
                endRow: coords.row,
                endCol: coords.col,
              }));
            } else if (isFilling) {
              setFillRange({
                startRow: Math.min(selection.startRow, selection.endRow),
                endRow: Math.max(coords.row, Math.max(selection.startRow, selection.endRow)),
                startCol: Math.min(selection.startCol, selection.endCol),
                endCol: Math.max(selection.startCol, selection.endCol),
              });
            }
          }
        }
      }
      animId = requestAnimationFrame(scrollLoop);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    animId = requestAnimationFrame(scrollLoop);

    const handleGlobalMouseUp = () => {
      if (isFilling && fillRange) {
        handleExecuteAutoFill(selection, fillRange);
      }
      setIsSelecting(false);
      setIsFilling(false);
      setFillRange(null);
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isSelecting, isFilling, getCellCoordsFromMouse, selection, fillRange, handleExecuteAutoFill, rowHeaderWidth]);

  const startEditing = useCallback(
    (initialChar?: string) => {
      const cell = sheet.cells[activeCell];
      const val = initialChar !== undefined ? initialChar : cell?.f || (cell?.v !== undefined && cell?.v !== null ? String(cell.v) : '');
      setEditValue(val);
      setIsEditing(true);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          if (initialChar === undefined) {
            inputRef.current.select();
          }
        }
      }, 10);
    },
    [activeCell, sheet.cells]
  );

  const commitEdit = useCallback(() => {
    if (!isEditing) return;
    setIsEditing(false);

    const isFormula = editValue.startsWith('=');
    const isNum = !isFormula && !isNaN(Number(editValue)) && editValue.trim() !== '';

    onCellChange(activeCell, {
      v: isFormula ? null : isNum ? Number(editValue) : editValue,
      f: isFormula ? editValue : undefined,
    });
  }, [isEditing, editValue, activeCell, onCellChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const coords = cellIdToCoords(activeCell);
      if (!coords) return;

      if (isEditing) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
          commitEdit();
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          commitEdit();
          if (coords.row < totalRawRows - 1) {
            onActiveCellChange(coordsToCellId(coords.col, coords.row + 1));
          }
        } else if (e.key === 'Tab') {
          e.preventDefault();
          commitEdit();
          if (coords.col < totalCols - 1) {
            onActiveCellChange(coordsToCellId(coords.col + 1, coords.row));
          }
        } else if (e.key === 'Escape') {
          setIsEditing(false);
        }
        return;
      }

      // Filter Shortcut: Ctrl+Shift+L or Cmd+Shift+L
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
        e.preventDefault();
        const colLetter = colIndexToName(coords.col);
        const cell = sheet.cells[`${colLetter}1`];
        const customName = cell?.v ? String(cell.v) : colLetter;
        // Open or toggle filter menu
        setFilterMenu((prev) =>
          prev && prev.colIdx === coords.col
            ? null
            : {
                colIdx: coords.col,
                colName: colLetter,
                customColName: customName,
                position: { x: Math.min(window.innerWidth / 2 - 150, 400), y: 180 },
              }
        );
        return;
      }

      // Alt + ArrowDown: Open filter on active column
      if (e.altKey && e.key === 'ArrowDown') {
        e.preventDefault();
        const colLetter = colIndexToName(coords.col);
        const cell = sheet.cells[`${colLetter}1`];
        const customName = cell?.v ? String(cell.v) : colLetter;
        setFilterMenu({
          colIdx: coords.col,
          colName: colLetter,
          customColName: customName,
          position: { x: Math.min(window.innerWidth / 2 - 150, 400), y: 180 },
        });
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (coords.row < totalRawRows - 1) {
          onActiveCellChange(coordsToCellId(coords.col, coords.row + 1));
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (coords.row > 0) {
          onActiveCellChange(coordsToCellId(coords.col, coords.row - 1));
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (coords.col < totalCols - 1) {
          onActiveCellChange(coordsToCellId(coords.col + 1, coords.row));
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (coords.col > 0) {
          onActiveCellChange(coordsToCellId(coords.col - 1, coords.row));
        }
      } else if (e.key === 'Tab') {
        e.preventDefault();
        if (e.shiftKey) {
          if (coords.col > 0) onActiveCellChange(coordsToCellId(coords.col - 1, coords.row));
        } else {
          if (coords.col < totalCols - 1) onActiveCellChange(coordsToCellId(coords.col + 1, coords.row));
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (e.shiftKey) {
          if (coords.row > 0) onActiveCellChange(coordsToCellId(coords.col, coords.row - 1));
        } else {
          startEditing();
        }
      } else if (e.key === 'F2') {
        e.preventDefault();
        startEditing();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        const minR = Math.min(selection.startRow, selection.endRow);
        const maxR = Math.max(selection.startRow, selection.endRow);
        const minC = Math.min(selection.startCol, selection.endCol);
        const maxC = Math.max(selection.startCol, selection.endCol);

        const updates: Record<string, Partial<SheetCell>> = {};
        for (let r = minR; r <= maxR; r++) {
          for (let c = minC; c <= maxC; c++) {
            updates[coordsToCellId(c, r)] = { v: '', f: undefined };
          }
        }
        onBatchCellsChange(updates);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        const minR = Math.min(selection.startRow, selection.endRow);
        const maxR = Math.max(selection.startRow, selection.endRow);
        const minC = Math.min(selection.startCol, selection.endCol);
        const maxC = Math.max(selection.startCol, selection.endCol);

        const rowsText: string[] = [];
        for (let r = minR; r <= maxR; r++) {
          const rowVals: string[] = [];
          for (let c = minC; c <= maxC; c++) {
            const cid = coordsToCellId(c, r);
            const cell = sheet.cells[cid];
            rowVals.push(cell?.f || (cell?.v !== undefined && cell?.v !== null ? String(cell.v) : ''));
          }
          rowsText.push(rowVals.join('\t'));
        }
        navigator.clipboard.writeText(rowsText.join('\n'));
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        navigator.clipboard.readText().then((clipText) => {
          handlePasteData(clipText);
        });
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setSelection({
          startRow: 0,
          startCol: 0,
          endRow: totalRawRows - 1,
          endCol: totalCols - 1,
        });
      } else if (
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        startEditing(e.key);
      }
    },
    [
      activeCell,
      isEditing,
      selection,
      sheet.cells,
      totalRawRows,
      totalCols,
      onActiveCellChange,
      startEditing,
      commitEdit,
      onBatchCellsChange,
    ]
  );

  // --- COLUMN STRETCH / RESIZING ---
  const handleColResizeMouseDown = (e: React.MouseEvent, cIdx: number) => {
    e.stopPropagation();
    e.preventDefault();
    const curW = getColWidth(cIdx);
    setResizingCol({
      colIdx: cIdx,
      startX: e.clientX,
      startW: curW,
      currentW: curW,
    });
  };

  useEffect(() => {
    if (!resizingCol) return;

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizingCol.startX;
      const newWidth = Math.max(45, Math.min(900, Math.round(resizingCol.startW + deltaX)));
      const colLetter = colIndexToName(resizingCol.colIdx);
      setColWidths((prev) => ({ ...prev, [colLetter]: newWidth }));
      setResizingCol((prev) => (prev ? { ...prev, currentW: newWidth } : null));
    };

    const handleMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (resizingCol) {
        const colLetter = colIndexToName(resizingCol.colIdx);
        const finalWidth = resizingCol.currentW;
        const nextColWidths = { ...colWidths, [colLetter]: finalWidth };
        setColWidths(nextColWidths);
        onUpdateSheetMeta?.({ col_widths: nextColWidths });
        setResizingCol(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingCol, colWidths, onUpdateSheetMeta]);

  // --- ROW STRETCH / RESIZING ---
  const handleRowResizeMouseDown = (e: React.MouseEvent, rIdx: number) => {
    e.stopPropagation();
    e.preventDefault();
    const curH = getRowHeight(rIdx);
    setResizingRow({
      rowIdx: rIdx,
      startY: e.clientY,
      startH: curH,
      currentH: curH,
    });
  };

  useEffect(() => {
    if (!resizingRow) return;

    document.body.style.cursor = 'row-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - resizingRow.startY;
      const newHeight = Math.max(20, Math.min(500, Math.round(resizingRow.startH + deltaY)));
      setRowHeights((prev) => ({ ...prev, [resizingRow.rowIdx]: newHeight }));
      setResizingRow((prev) => (prev ? { ...prev, currentH: newHeight } : null));
    };

    const handleMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (resizingRow) {
        const finalHeight = resizingRow.currentH;
        const nextRowHeights = { ...rowHeights, [resizingRow.rowIdx]: finalHeight };
        setRowHeights(nextRowHeights);
        onUpdateSheetMeta?.({ row_heights: nextRowHeights });
        setResizingRow(null);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingRow, rowHeights, onUpdateSheetMeta]);

  // Auto-fit & Reset Helpers
  const handleAutoFitCol = (cIdx: number) => {
    const colName = colIndexToName(cIdx);
    let maxChars = (sheet.custom_col_headers?.[colName] || colName).length;
    for (let r = 0; r < Math.min(totalRawRows, 200); r++) {
      const val = sheet.cells[coordsToCellId(cIdx, r)]?.v;
      if (val !== undefined && val !== null) {
        maxChars = Math.max(maxChars, String(val).length);
      }
    }
    const autoWidth = Math.max(80, Math.min(450, Math.round(maxChars * 9 + 40)));
    const nextWidths = { ...colWidths, [colName]: autoWidth };
    setColWidths(nextWidths);
    onUpdateSheetMeta?.({ col_widths: nextWidths });
  };

  const handleResetColWidth = (cIdx: number) => {
    const colName = colIndexToName(cIdx);
    const nextWidths = { ...colWidths };
    delete nextWidths[colName];
    setColWidths(nextWidths);
    onUpdateSheetMeta?.({ col_widths: nextWidths });
  };

  const handleAutoFitRow = (rIdx: number) => {
    const autoHeight = DEFAULT_ROW_HEIGHT;
    const nextHeights = { ...rowHeights, [rIdx]: autoHeight };
    setRowHeights(nextHeights);
    onUpdateSheetMeta?.({ row_heights: nextHeights });
  };

  const handleResetRowHeight = (rIdx: number) => {
    const nextHeights = { ...rowHeights };
    delete nextHeights[rIdx];
    setRowHeights(nextHeights);
    onUpdateSheetMeta?.({ row_heights: nextHeights });
  };

  const handleApplyCustomSize = () => {
    if (!customSizeModal) return;
    const num = parseInt(customSizeInput, 10);
    if (isNaN(num) || num <= 0) return;

    if (customSizeModal.type === 'col') {
      const colLetter = colIndexToName(customSizeModal.targetIndex);
      const nextWidths = { ...colWidths, [colLetter]: Math.max(40, Math.min(1000, num)) };
      setColWidths(nextWidths);
      onUpdateSheetMeta?.({ col_widths: nextWidths });
    } else {
      const nextHeights = { ...rowHeights, [customSizeModal.targetIndex]: Math.max(20, Math.min(600, num)) };
      setRowHeights(nextHeights);
      onUpdateSheetMeta?.({ row_heights: nextHeights });
    }
    setCustomSizeModal(null);
  };

  const handleContextMenu = (e: React.MouseEvent, cellId: string) => {
    e.preventDefault();
    onActiveCellChange(cellId);
    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 220),
      y: Math.min(e.clientY, window.innerHeight - 300),
      targetType: 'cell',
      cellId,
    });
  };

  const handleSaveColRename = (cIdx: number) => {
    const colLetter = colIndexToName(cIdx);
    const trimmed = colRenameValue.trim();
    if (trimmed) {
      if (onUpdateSheetMeta) {
        onUpdateSheetMeta({
          custom_col_headers: {
            ...(sheet.custom_col_headers || {}),
            [colLetter]: trimmed,
          },
        });
      }
      // Also update row 1 cell directly so it displays everywhere
      onCellChange(coordsToCellId(cIdx, 0), { v: trimmed });
    }
    setRenamingColIdx(null);
  };

  const handleApplyColumnFilter = (colLetter: string, selectedValues: string[] | null) => {
    if (!onUpdateSheetMeta) return;
    const nextFilters = { ...(sheet.active_filters || {}) };
    if (selectedValues === null || selectedValues.length === 0) {
      delete nextFilters[colLetter];
    } else {
      nextFilters[colLetter] = selectedValues;
    }
    onUpdateSheetMeta({
      active_filters: nextFilters,
      is_filter_active: Object.keys(nextFilters).length > 0,
    });
  };

  // Active collaborators cursor state (multiplayer presence simulation)
  const collaborators = useMemo(
    () => [
      {
        id: 'rahul',
        name: 'Rahul',
        initials: 'RH',
        color: '#8b5cf6', // purple
        cellId: 'C14',
        isTyping: true,
      },
      {
        id: 'amit',
        name: 'Amit',
        initials: 'AM',
        color: '#0284c7', // blue
        cellId: 'E20',
        isTyping: false,
      },
    ],
    []
  );

  const minSelRow = Math.min(selection.startRow, selection.endRow);
  const maxSelRow = Math.max(selection.startRow, selection.endRow);
  const minSelCol = Math.min(selection.startCol, selection.endCol);
  const maxSelCol = Math.max(selection.startCol, selection.endCol);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onScroll={handleScroll}
      onPaste={(e) => {
        const text = e.clipboardData?.getData('text');
        if (text) {
          e.preventDefault();
          handlePasteData(text);
        }
      }}
      onClick={() => {
        if (contextMenu) setContextMenu(null);
      }}
      className="flex-1 w-full h-full overflow-auto bg-white relative select-none focus:outline-hidden custom-scrollbar font-sans"
    >
      <div
        className="relative bg-white"
        style={{
          width: totalContentWidth + rowHeaderWidth,
          height: totalContentHeight + HEADER_ROW_HEIGHT,
        }}
      >
        {/* ========================================================================= */}
        {/* 1. TOP-LEFT CORNER SELECT-ALL BOX */}
        {/* ========================================================================= */}
        <div
          onClick={() => {
            setSelection({
              startRow: 0,
              startCol: 0,
              endRow: totalRawRows - 1,
              endCol: totalCols - 1,
            });
          }}
          className="sticky top-0 left-0 z-30 bg-[#f1f5f9] hover:bg-[#e2e8f0] border-r border-b border-[#cbd5e1] flex items-center justify-center cursor-pointer transition-colors"
          style={{ width: rowHeaderWidth, height: HEADER_ROW_HEIGHT }}
          title="Select All (Ctrl+A)"
        >
          <div className="w-2.5 h-2.5 border-r border-b border-slate-400" />
        </div>

        {/* ========================================================================= */}
        {/* 2. STICKY TOP COLUMN HEADERS (A, B, C...) — CLASSIC DISTINCT EXCEL LETTER ROW */}
        {/* ========================================================================= */}
        <div
          className="sticky top-0 z-20 flex bg-[#f8fafc] border-b border-[#cbd5e1]"
          style={{
            height: HEADER_ROW_HEIGHT,
            marginLeft: rowHeaderWidth,
            width: totalContentWidth,
          }}
        >
          {Array.from({ length: visibleColEnd - visibleColStart + 1 }).map((_, idx) => {
            const cIdx = visibleColStart + idx;
            const colName = colIndexToName(cIdx);
            const colLeft = colPositions[cIdx];
            const colWidth = getColWidth(cIdx);
            const isColActive = cIdx === activeCoords.col;
            const isColSelected = cIdx >= minSelCol && cIdx <= maxSelCol;

            return (
              <div
                key={colName}
                onMouseDown={(e) => {
                  if (e.button === 0) {
                    onActiveCellChange(coordsToCellId(cIdx, 0));
                    setIsSelecting(true);
                    setSelection({
                      startRow: 0,
                      startCol: cIdx,
                      endRow: totalRawRows - 1,
                      endCol: cIdx,
                    });
                  }
                }}
                onMouseEnter={() => {
                  if (isSelecting) {
                    setSelection((prev) => ({
                      ...prev,
                      startRow: 0,
                      endRow: totalRawRows - 1,
                      endCol: cIdx,
                    }));
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenu({
                    x: Math.min(e.clientX, window.innerWidth - 220),
                    y: Math.min(e.clientY, window.innerHeight - 300),
                    targetType: 'col',
                    colIndex: cIdx,
                  });
                }}
                className={`absolute top-0 border-r border-[#cbd5e1] flex items-center justify-center font-semibold text-xs transition-colors cursor-pointer select-none ${
                  isColActive || isColSelected
                    ? 'bg-[#dcfce7] text-[#107c41] font-bold border-b-2 border-[#107c41]'
                    : 'bg-[#f8fafc] text-slate-700 hover:bg-[#e2e8f0]'
                }`}
                style={{
                  left: colLeft,
                  width: colWidth,
                  height: HEADER_ROW_HEIGHT,
                }}
                title={`Column ${colName} (Right-click for options)`}
              >
                <span>{colName}</span>

                {/* Column Resize Handle & Double-Click Auto-Fit */}
                <div
                  onMouseDown={(e) => handleColResizeMouseDown(e, cIdx)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleAutoFitCol(cIdx);
                  }}
                  className="absolute -right-1.5 top-0 bottom-0 w-3 hover:bg-emerald-500/20 active:bg-emerald-600/30 cursor-col-resize z-40 transition-all group flex items-center justify-center"
                  title="Drag left/right to stretch column width | Double-click to auto-fit"
                >
                  <div className="h-full w-[2px] bg-slate-300 group-hover:bg-[#107c41] transition-colors" />
                </div>
              </div>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* 3. STICKY LEFT ROW HEADERS (1, 2, 3...) — DISTINCT EXCEL NUMBER COLUMN */}
        {/* ========================================================================= */}
        <div
          className="sticky left-0 z-10 bg-[#f8fafc] border-r border-[#cbd5e1]"
          style={{
            width: rowHeaderWidth,
            height: totalContentHeight,
          }}
        >
          {renderedRowIndices.map((vRowIdx) => {
            const origRowIndex = filteredRowIndices[vRowIdx];
            const isRow1Frozen = origRowIndex === 0 && isRowFrozen;
            const rowTop = isRow1Frozen ? (scrollTop > 0 ? scrollTop : 0) : rowPositions[vRowIdx];
            const rowHeight = getRowHeight(origRowIndex);
            const isRowActive = origRowIndex === activeCoords.row;
            const isRowSelected = origRowIndex >= minSelRow && origRowIndex <= maxSelRow;
            const zIndex = isRow1Frozen ? 25 : 10;

            return (
              <div
                key={origRowIndex}
                onMouseDown={(e) => {
                  if (e.button === 0) {
                    onActiveCellChange(coordsToCellId(0, origRowIndex));
                    setIsSelecting(true);
                    setSelection({
                      startRow: origRowIndex,
                      startCol: 0,
                      endRow: origRowIndex,
                      endCol: totalCols - 1,
                    });
                  }
                }}
                onMouseEnter={() => {
                  if (isSelecting) {
                    setSelection((prev) => ({
                      ...prev,
                      startCol: 0,
                      endCol: totalCols - 1,
                      endRow: origRowIndex,
                    }));
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMenu({
                    x: Math.min(e.clientX, window.innerWidth - 220),
                    y: Math.min(e.clientY, window.innerHeight - 300),
                    targetType: 'row',
                    rowIndex: origRowIndex,
                  });
                }}
                className={`absolute left-0 border-b border-[#cbd5e1] flex items-center justify-center text-xs font-semibold transition-colors cursor-pointer select-none ${
                  isRowActive || isRowSelected
                    ? 'bg-[#dcfce7] text-[#107c41] font-bold border-r-2 border-[#107c41]'
                    : 'bg-[#f8fafc] text-slate-700 hover:bg-[#e2e8f0]'
                } ${isRow1Frozen && scrollTop > 0 ? 'shadow-md border-b-2 border-slate-400 bg-[#e2e8f0]' : ''}`}
                style={{
                  top: rowTop,
                  width: rowHeaderWidth,
                  height: rowHeight,
                  zIndex,
                }}
                title={`Row ${origRowIndex + 1} (Right-click for options | Drag bottom line to stretch)`}
              >
                <span>{origRowIndex + 1}</span>

                {/* Row Resize Handle for stretching row height */}
                <div
                  onMouseDown={(e) => handleRowResizeMouseDown(e, origRowIndex)}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleAutoFitRow(origRowIndex);
                  }}
                  className="absolute left-0 right-0 -bottom-1.5 h-3 hover:bg-emerald-500/20 active:bg-emerald-600/30 cursor-row-resize z-40 transition-all group flex flex-col items-center justify-center"
                  title="Drag up/down to stretch row height | Double-click to reset"
                >
                  <div className="w-full h-[2px] bg-slate-300 group-hover:bg-[#107c41] transition-colors" />
                </div>
              </div>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* 4. SPREADSHEET CELLS (ROW 1 HEADERS WITH DROPDOWN FILTERS) */}
        {/* ========================================================================= */}
        <div
          className="absolute"
          style={{
            left: rowHeaderWidth,
            top: HEADER_ROW_HEIGHT,
            width: totalContentWidth,
            height: totalContentHeight,
          }}
        >
          {renderedRowIndices.map((vRowIdx) => {
            const rIdx = filteredRowIndices[vRowIdx];
            const isRow1Header = rIdx === 0;
            const isRow1Frozen = isRow1Header && isRowFrozen;
            const rowTop = isRow1Frozen ? (scrollTop > 0 ? scrollTop : 0) : rowPositions[vRowIdx];
            const rowHeight = getRowHeight(rIdx);
            const zIndex = isRow1Frozen ? (activeCoords.row === 0 ? 25 : 20) : activeCell && cellIdToCoords(activeCell)?.row === rIdx ? 10 : 1;

            return Array.from({ length: visibleColEnd - visibleColStart + 1 }).map((_, cOffset) => {
              const cIdx = visibleColStart + cOffset;
              const colName = colIndexToName(cIdx);
              const cellId = coordsToCellId(cIdx, rIdx);
              const cellLeft = colPositions[cIdx];
              const cellWidth = getColWidth(cIdx);

              const cell = evaluatedCells[cellId];
              const isActive = activeCell === cellId;
              const inSelection =
                rIdx >= minSelRow && rIdx <= maxSelRow && cIdx >= minSelCol && cIdx <= maxSelCol;

              const isMatch =
                searchQuery &&
                cell &&
                String(cell.calced !== undefined ? cell.calced : cell.v || '')
                  .toLowerCase()
                  .includes(searchQuery.toLowerCase());

              const formattedVal = formatCellValue(cell);
              const isColFiltered = !!activeFilters[colName];
              const cellCollaborator = collaborators.find((c) => c.cellId === cellId);

              // Default styling from screenshot:
              // Column C (PO Number) has a warm tan background
              // Column E, F (Material & Specs) have very subtle green tint
              const defaultBg =
                cell?.bgColor ||
                (isRow1Header
                  ? '#ffffff'
                  : cIdx === 1 // Column C
                  ? '#ecd6be'
                  : cIdx === 3 || cIdx === 4 // Column E, F
                  ? '#eef5f2'
                  : '#ffffff');

              return (
                <div
                  key={cellId}
                  onMouseDown={(e) => {
                    if (e.button === 0) {
                      commitEdit();
                      onActiveCellChange(cellId);
                      setIsSelecting(true);
                      setSelection({
                        startRow: rIdx,
                        startCol: cIdx,
                        endRow: rIdx,
                        endCol: cIdx,
                      });
                    }
                  }}
                  onMouseEnter={() => {
                    if (isSelecting) {
                      setSelection((prev) => ({
                        ...prev,
                        endRow: rIdx,
                        endCol: cIdx,
                      }));
                    }
                  }}
                  onMouseUp={() => setIsSelecting(false)}
                  onDoubleClick={() => startEditing()}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    commitEdit();
                    onActiveCellChange(cellId);
                    setContextMenu({
                      x: Math.min(e.clientX, window.innerWidth - 220),
                      y: Math.min(e.clientY, window.innerHeight - 300),
                      targetType: 'cell',
                      cellId,
                    });
                  }}
                  className={`absolute border-r border-b border-[#64748b]/40 px-2 flex items-center overflow-hidden whitespace-nowrap cursor-cell font-sans select-none transition-none ${
                    isActive
                      ? 'ring-2 ring-[#107c41] z-10 shadow-xs'
                      : inSelection
                      ? 'bg-[#bae6fd]/40 ring-1 ring-[#0284c7]/40'
                      : isMatch
                      ? 'bg-amber-100 ring-1 ring-amber-400 font-bold'
                      : ''
                  } ${isRow1Header ? 'font-bold text-slate-900 justify-between' : ''} ${
                    isRow1Frozen && scrollTop > 0 ? 'border-b-2 border-slate-400/90 shadow-sm' : ''
                  }`}
                  style={{
                    left: cellLeft,
                    top: rowTop,
                    width: cellWidth,
                    height: rowHeight,
                    zIndex: isRow1Frozen ? (isActive ? 25 : 20) : isActive ? 10 : 1,
                    backgroundColor: inSelection && !isActive ? undefined : defaultBg,
                    color: cell?.textColor || '#0f172a',
                    fontSize: cell?.fontSize ? `${cell.fontSize}px` : isRow1Header ? '12px' : '11.5px',
                    fontWeight: isRow1Header || cell?.bold ? 'bold' : 'normal',
                    fontStyle: cell?.italic ? 'italic' : 'normal',
                    textDecoration: cell?.underline ? 'underline' : 'none',
                    outline: cellCollaborator && !isActive ? `2px solid ${cellCollaborator.color}` : undefined,
                    outlineOffset: '-1px',
                    justifyContent: isRow1Header
                      ? 'space-between'
                      : cell?.align === 'right'
                      ? 'flex-end'
                      : cell?.align === 'center'
                      ? 'center'
                      : 'flex-start',
                  }}
                >
                  {/* Active Collaborator Live Cursor Tag */}
                  {cellCollaborator && (
                    <div
                      className="absolute -top-3.5 right-0 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 z-30 pointer-events-none"
                      style={{ backgroundColor: cellCollaborator.color }}
                    >
                      <span>{cellCollaborator.initials}</span>
                      {cellCollaborator.isTyping ? (
                        <span className="flex items-center gap-0.5">
                          <span>typing</span>
                          <span className="inline-block w-1 h-1 rounded-full bg-white animate-ping" />
                        </span>
                      ) : (
                        <span>active</span>
                      )}
                    </div>
                  )}

                  {isActive && isEditing ? (
                    <input
                      ref={inputRef}
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={commitEdit}
                      className="w-full h-full bg-white text-slate-900 border-0 focus:outline-hidden font-bold text-xs px-0"
                    />
                  ) : (
                    (() => {
                      const valStr = String(formattedVal).trim();
                      const valLower = valStr.toLowerCase();
                      const isStatus =
                        !isRow1Header &&
                        (valLower === 'received' ||
                          valLower === 'pending' ||
                          valLower === 'po sent' ||
                          valLower === 'complete' ||
                          valLower === 'completed' ||
                          valLower === 'shortage' ||
                          valLower === 'delivered' ||
                          valLower === 'approved');

                      if (isStatus) {
                        const isGood =
                          valLower === 'received' ||
                          valLower === 'complete' ||
                          valLower === 'completed' ||
                          valLower === 'delivered' ||
                          valLower === 'approved';
                        const isWarn = valLower === 'pending' || valLower === 'shortage';

                        const badgeCls = isGood
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-semibold'
                          : isWarn
                          ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold'
                          : 'bg-sky-100 text-sky-900 border-sky-300 font-semibold';

                        return (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] border leading-none shadow-2xs ${badgeCls}`}
                          >
                            {valStr}
                          </span>
                        );
                      }

                      return (
                        <span className={`truncate flex-1 ${isRow1Header ? 'font-bold text-slate-900 tracking-tight' : ''}`}>
                          {formattedVal}
                        </span>
                      );
                    })()
                  )}

                  {/* Excel Filter Dropdown Button on Row 1 Headers (as in user screenshot) */}
                  {isRow1Header && !isEditing && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setFilterMenu({
                          colIdx: cIdx,
                          colName,
                          customColName: String(cell?.v || colName),
                          position: { x: Math.min(rect.left, window.innerWidth - 320), y: rect.bottom + 4 },
                        });
                      }}
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ml-1.5 transition-all cursor-pointer shadow-2xs ${
                        isColFiltered
                          ? 'bg-[#107c41] border-[#107c41] text-white'
                          : 'bg-[#e2e8f0] hover:bg-[#cbd5e1] border-[#94a3b8] text-slate-700'
                      }`}
                      title={`Filter & Sort ${cell?.v || colName}`}
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Excel Fill Handle */}
                  {isActive && !isEditing && (
                    <div
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setIsFilling(true);
                        setFillRange({
                          startRow: minSelRow,
                          endRow: maxSelRow,
                          startCol: minSelCol,
                          endCol: maxSelCol,
                        });
                      }}
                      className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-[#107c41] border border-white cursor-crosshair z-20 hover:scale-125 transition-transform"
                      title="Drag down to auto-fill series or duplicate"
                    />
                  )}
                </div>
              );
            });
          })}

          {/* Active Auto-Fill Drag Preview Box */}
          {isFilling && fillRange && (
            <div
              className="absolute pointer-events-none border-2 border-dashed border-[#107c41] bg-[#107c41]/10 z-25 transition-none"
              style={{
                left: colPositions[fillRange.startCol],
                top: rowPositions[fillRange.startRow],
                width: colPositions[fillRange.endCol + 1] - colPositions[fillRange.startCol],
                height: rowPositions[fillRange.endRow + 1] - rowPositions[fillRange.startRow],
              }}
            />
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. COLUMN FILTER POPUP MODAL */}
      {/* ========================================================================= */}
      {filterMenu && (
        <ExcelColumnFilterMenu
          colIdx={filterMenu.colIdx}
          colName={filterMenu.colName}
          customColName={filterMenu.customColName}
          position={filterMenu.position}
          onClose={() => setFilterMenu(null)}
          cells={sheet.cells}
          totalRows={totalRawRows}
          currentFilters={sheet.active_filters?.[filterMenu.colName]}
          onApplyFilter={(selected) => handleApplyColumnFilter(filterMenu.colName, selected)}
          onSortCol={(dir) => {
            const targetCol = filterMenu.colIdx;
            const rowsMap: Map<number, Record<string, SheetCell>> = new Map();
            Object.keys(sheet.cells).forEach((coord) => {
              const c = cellIdToCoords(coord);
              if (!c || c.row === 0) return;
              if (!rowsMap.has(c.row)) rowsMap.set(c.row, {});
              rowsMap.get(c.row)![coord] = sheet.cells[coord];
            });

            const rowIndices = Array.from(rowsMap.keys());
            rowIndices.sort((rA, rB) => {
              const valA = sheet.cells[coordsToCellId(targetCol, rA)]?.v || '';
              const valB = sheet.cells[coordsToCellId(targetCol, rB)]?.v || '';
              if (valA < valB) return dir === 'asc' ? -1 : 1;
              if (valA > valB) return dir === 'asc' ? 1 : -1;
              return 0;
            });

            const newCells: Record<string, SheetCell> = {};
            Object.keys(sheet.cells).forEach((coord) => {
              const c = cellIdToCoords(coord);
              if (c?.row === 0) newCells[coord] = sheet.cells[coord];
            });

            rowIndices.forEach((origR, newIdx) => {
              const targetRow = newIdx + 1;
              const rowCells = rowsMap.get(origR) || {};
              Object.keys(rowCells).forEach((origCoord) => {
                const c = cellIdToCoords(origCoord)!;
                newCells[coordsToCellId(c.col, targetRow)] = rowCells[origCoord];
              });
            });

            onBatchCellsChange(newCells);
          }}
          onRenameCol={(newName) => {
            onCellChange(coordsToCellId(filterMenu.colIdx, 0), { v: newName });
          }}
        />
      )}

      {/* ========================================================================= */}
      {/* 6. RIGHT-CLICK CONTEXT MENU (CELL, ROW, OR COLUMN ACTIONS) */}
      {/* ========================================================================= */}
      {contextMenu && (
        <div
          className="fixed bg-white border border-slate-300 rounded-lg shadow-2xl py-1 z-50 w-52 text-xs text-slate-700 animate-fadeIn"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* A. CELL CONTEXT MENU */}
          {contextMenu.targetType === 'cell' && (
            <>
              <button
                type="button"
                onClick={() => {
                  const minR = Math.min(selection.startRow, selection.endRow);
                  const maxR = Math.max(selection.startRow, selection.endRow);
                  const minC = Math.min(selection.startCol, selection.endCol);
                  const maxC = Math.max(selection.startCol, selection.endCol);
                  const rowsText: string[] = [];
                  for (let r = minR; r <= maxR; r++) {
                    const rowVals: string[] = [];
                    for (let c = minC; c <= maxC; c++) {
                      const cid = coordsToCellId(c, r);
                      const cell = sheet.cells[cid];
                      rowVals.push(cell?.f || (cell?.v !== undefined && cell?.v !== null ? String(cell.v) : ''));
                    }
                    rowsText.push(rowVals.join('\t'));
                  }
                  navigator.clipboard.writeText(rowsText.join('\n'));
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#f3f4f6] flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Copy</span>
                </div>
                <span className="text-[10px] text-slate-400">Ctrl+C</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.readText().then((txt) => {
                    handlePasteData(txt);
                  });
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#f3f4f6] flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <ClipboardPaste className="w-3.5 h-3.5 text-[#107c41]" />
                  <span>Paste</span>
                </div>
                <span className="text-[10px] text-slate-400">Ctrl+V</span>
              </button>

              <div className="my-1 border-t border-slate-200" />

              <button
                type="button"
                onClick={() => {
                  const coords = cellIdToCoords(contextMenu.cellId || activeCell);
                  if (coords) handleInsertRow(coords.row);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#f3f4f6] flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>Insert Row Above</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const coords = cellIdToCoords(contextMenu.cellId || activeCell);
                  if (coords) handleInsertRow(coords.row + 1);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#f3f4f6] flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-600" />
                <span>Insert Row Below</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const coords = cellIdToCoords(contextMenu.cellId || activeCell);
                  if (coords) handleDeleteRow(coords.row);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#fee2e2] text-rose-600 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Row</span>
              </button>

              <div className="my-1 border-t border-slate-200" />

              <button
                type="button"
                onClick={() => {
                  startEditing();
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#f3f4f6] flex items-center gap-2"
              >
                <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                <span>Edit Cell (F2)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const minR = Math.min(selection.startRow, selection.endRow);
                  const maxR = Math.max(selection.startRow, selection.endRow);
                  const minC = Math.min(selection.startCol, selection.endCol);
                  const maxC = Math.max(selection.startCol, selection.endCol);
                  const updates: Record<string, Partial<SheetCell>> = {};
                  for (let r = minR; r <= maxR; r++) {
                    for (let c = minC; c <= maxC; c++) {
                      updates[coordsToCellId(c, r)] = { v: '', f: undefined };
                    }
                  }
                  onBatchCellsChange(updates);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#fee2e2] text-rose-600 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Selection</span>
              </button>
            </>
          )}

          {/* B. ROW CONTEXT MENU */}
          {contextMenu.targetType === 'row' && contextMenu.rowIndex !== undefined && (
            <>
              <div className="px-3 py-1 font-bold text-[11px] text-slate-400 uppercase tracking-wider">
                Row {contextMenu.rowIndex + 1} ({getRowHeight(contextMenu.rowIndex)}px)
              </div>
              
              <button
                type="button"
                onClick={() => {
                  const rIdx = contextMenu.rowIndex!;
                  setCustomSizeModal({
                    type: 'row',
                    targetIndex: rIdx,
                    currentSize: getRowHeight(rIdx),
                  });
                  setCustomSizeInput(String(getRowHeight(rIdx)));
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#f3f4f6] flex items-center gap-2 text-blue-700 font-medium"
              >
                <MoveVertical className="w-3.5 h-3.5 text-blue-600" />
                <span>Stretch / Set Row Height...</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleAutoFitRow(contextMenu.rowIndex!);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#f3f4f6] flex items-center gap-2"
              >
                <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Auto-Fit Row Height</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleResetRowHeight(contextMenu.rowIndex!);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#f3f4f6] flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset to Default Height (28px)</span>
              </button>

              <div className="my-1 border-t border-slate-200" />

              <button
                type="button"
                onClick={() => {
                  handleInsertRow(contextMenu.rowIndex!);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#f3f4f6] flex items-center gap-2"
              >
                <ArrowUp className="w-3.5 h-3.5 text-emerald-600" />
                <span>Insert 1 Row Above</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleInsertRow(contextMenu.rowIndex! + 1);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#f3f4f6] flex items-center gap-2"
              >
                <ArrowDown className="w-3.5 h-3.5 text-emerald-600" />
                <span>Insert 1 Row Below</span>
              </button>

              <div className="my-1 border-t border-slate-200" />

              <button
                type="button"
                onClick={() => {
                  handleDeleteRow(contextMenu.rowIndex!);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#fee2e2] text-rose-600 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Row {contextMenu.rowIndex + 1}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const updates: Record<string, Partial<SheetCell>> = {};
                  for (let c = 0; c < totalCols; c++) {
                    updates[coordsToCellId(c, contextMenu.rowIndex!)] = { v: '', f: undefined };
                  }
                  onBatchCellsChange(updates);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#fee2e2] text-rose-600 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Row Contents</span>
              </button>
            </>
          )}

          {/* C. COLUMN CONTEXT MENU */}
          {contextMenu.targetType === 'col' && contextMenu.colIndex !== undefined && (
            <>
              <div className="px-3 py-1 font-bold text-[11px] text-slate-400 uppercase tracking-wider">
                Column {colIndexToName(contextMenu.colIndex)} ({getColWidth(contextMenu.colIndex)}px)
              </div>

              <button
                type="button"
                onClick={() => {
                  const cIdx = contextMenu.colIndex!;
                  setCustomSizeModal({
                    type: 'col',
                    targetIndex: cIdx,
                    currentSize: getColWidth(cIdx),
                  });
                  setCustomSizeInput(String(getColWidth(cIdx)));
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#f3f4f6] flex items-center gap-2 text-blue-700 font-medium"
              >
                <MoveHorizontal className="w-3.5 h-3.5 text-blue-600" />
                <span>Stretch / Set Column Width...</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleAutoFitCol(contextMenu.colIndex!);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#f3f4f6] flex items-center gap-2"
              >
                <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
                <span>Auto-Fit Column Width</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleResetColWidth(contextMenu.colIndex!);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#f3f4f6] flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset to Default Width (135px)</span>
              </button>

              <div className="my-1 border-t border-slate-200" />

              <button
                type="button"
                onClick={() => {
                  handleInsertCol(contextMenu.colIndex!);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#f3f4f6] flex items-center gap-2"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-emerald-600" />
                <span>Insert Column Left</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleInsertCol(contextMenu.colIndex! + 1);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#f3f4f6] flex items-center gap-2"
              >
                <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                <span>Insert Column Right</span>
              </button>

              <div className="my-1 border-t border-slate-200" />

              <button
                type="button"
                onClick={() => {
                  handleDeleteCol(contextMenu.colIndex!);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#fee2e2] text-rose-600 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Column</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const updates: Record<string, Partial<SheetCell>> = {};
                  for (let r = 0; r < totalRawRows; r++) {
                    updates[coordsToCellId(contextMenu.colIndex!, r)] = { v: '', f: undefined };
                  }
                  onBatchCellsChange(updates);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-[#fee2e2] text-rose-600 flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Column Contents</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. VISUAL RESIZE GUIDELINES WHILE DRAGGING */}
      {/* ========================================================================= */}
      {resizingCol && (
        <div
          className="absolute top-0 bottom-0 pointer-events-none z-50 border-r-2 border-dashed border-[#107c41]"
          style={{
            left: rowHeaderWidth + colPositions[resizingCol.colIdx] + resizingCol.currentW,
            height: totalContentHeight + HEADER_ROW_HEIGHT,
          }}
        >
          <div className="fixed top-28 bg-[#107c41] text-white font-mono font-bold text-xs px-2.5 py-1 rounded shadow-xl -translate-x-1/2 whitespace-nowrap z-50 flex items-center gap-1.5">
            <MoveHorizontal className="w-3.5 h-3.5" />
            <span>Col {colIndexToName(resizingCol.colIdx)}: {resizingCol.currentW}px</span>
          </div>
        </div>
      )}

      {resizingRow && (
        <div
          className="absolute left-0 right-0 pointer-events-none z-50 border-b-2 border-dashed border-[#107c41]"
          style={{
            top: HEADER_ROW_HEIGHT + (rowPositions[filteredRowIndices.indexOf(resizingRow.rowIdx)] || 0) + resizingRow.currentH,
            width: totalContentWidth + rowHeaderWidth,
          }}
        >
          <div className="fixed left-20 bg-[#107c41] text-white font-mono font-bold text-xs px-2.5 py-1 rounded shadow-xl -translate-y-1/2 whitespace-nowrap z-50 flex items-center gap-1.5">
            <MoveVertical className="w-3.5 h-3.5" />
            <span>Row {resizingRow.rowIdx + 1}: {resizingRow.currentH}px</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. CUSTOM SIZE (WIDTH / HEIGHT) PROMPT MODAL */}
      {/* ========================================================================= */}
      {customSizeModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-300 w-80 overflow-hidden text-slate-800">
            <div className="bg-gradient-to-r from-emerald-800 to-emerald-700 px-4 py-3 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                {customSizeModal.type === 'col' ? (
                  <MoveHorizontal className="w-4 h-4 text-emerald-300" />
                ) : (
                  <MoveVertical className="w-4 h-4 text-emerald-300" />
                )}
                <span className="font-semibold text-sm">
                  {customSizeModal.type === 'col'
                    ? `Column Width (${colIndexToName(customSizeModal.targetIndex)})`
                    : `Row Height (Row ${customSizeModal.targetIndex + 1})`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setCustomSizeModal(null)}
                className="text-emerald-200 hover:text-white text-base leading-none cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleApplyCustomSize();
              }}
              className="p-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Enter {customSizeModal.type === 'col' ? 'Width' : 'Height'} (in pixels):
                </label>
                <div className="relative">
                  <input
                    type="number"
                    autoFocus
                    min={customSizeModal.type === 'col' ? 40 : 20}
                    max={customSizeModal.type === 'col' ? 1000 : 600}
                    value={customSizeInput}
                    onChange={(e) => setCustomSizeInput(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-10"
                    placeholder="e.g. 150"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">px</span>
                </div>
              </div>

              {/* Quick Presets */}
              <div>
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Quick Presets
                </span>
                <div className="grid grid-cols-4 gap-1.5">
                  {customSizeModal.type === 'col' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setCustomSizeInput('90')}
                        className="px-2 py-1 text-xs border border-slate-200 rounded hover:bg-emerald-50 hover:border-emerald-300 text-slate-700"
                      >
                        90px
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomSizeInput('135')}
                        className="px-2 py-1 text-xs border border-slate-200 rounded hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 font-bold"
                      >
                        135px
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomSizeInput('220')}
                        className="px-2 py-1 text-xs border border-slate-200 rounded hover:bg-emerald-50 hover:border-emerald-300 text-slate-700"
                      >
                        220px
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomSizeInput('320')}
                        className="px-2 py-1 text-xs border border-slate-200 rounded hover:bg-emerald-50 hover:border-emerald-300 text-slate-700"
                      >
                        320px
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setCustomSizeInput('24')}
                        className="px-2 py-1 text-xs border border-slate-200 rounded hover:bg-emerald-50 hover:border-emerald-300 text-slate-700"
                      >
                        24px
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomSizeInput('28')}
                        className="px-2 py-1 text-xs border border-slate-200 rounded hover:bg-emerald-50 hover:border-emerald-300 text-slate-700 font-bold"
                      >
                        28px
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomSizeInput('45')}
                        className="px-2 py-1 text-xs border border-slate-200 rounded hover:bg-emerald-50 hover:border-emerald-300 text-slate-700"
                      >
                        45px
                      </button>
                      <button
                        type="button"
                        onClick={() => setCustomSizeInput('70')}
                        className="px-2 py-1 text-xs border border-slate-200 rounded hover:bg-emerald-50 hover:border-emerald-300 text-slate-700"
                      >
                        70px
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCustomSizeModal(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold bg-[#107c41] hover:bg-[#0b5c30] text-white rounded-lg shadow cursor-pointer transition-colors"
                >
                  Apply Size
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
