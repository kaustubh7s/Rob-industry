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
const HEADER_ROW_HEIGHT = 42;
const ROW_HEADER_WIDTH = 42;
const OVERSCAN_ROWS = 15;
const OVERSCAN_COLS = 5;

const DEFAULT_COLUMN_TITLES: Record<string, string> = {
  A: 'Sr. No',
  B: 'Date',
  C: 'Order / Type',
  D: 'PO No',
  E: 'Material / Description',
  F: 'Size & Specs',
  G: 'Quantity',
  H: 'Weight / Notes',
  I: 'Vendor / Supplier',
  J: 'Rate (₹)',
  K: 'Amount (₹)',
  L: 'Status / Remarks',
  M: 'Delivery Date',
  N: 'Challan No',
  O: 'Vehicle / Transporter',
  P: 'Location / Plant',
};

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
    cellId: string;
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

  // Global mouseup handler to ensure drag selection always terminates cleanly
  useEffect(() => {
    if (!isSelecting) return;
    const handleGlobalMouseUp = () => {
      setIsSelecting(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isSelecting]);

  // Sync selection to parent for multi-cell formatting & column coloring
  useEffect(() => {
    onSelectionChange?.(selection);
  }, [selection, onSelectionChange]);

  // Column resizing state
  const [resizingCol, setResizingCol] = useState<{ colIdx: number; startX: number; startW: number } | null>(null);
  const [colWidths, setColWidths] = useState<Record<string, number>>(() => sheet.col_widths || {});

  useEffect(() => {
    setColWidths(sheet.col_widths || {});
  }, [sheet.col_widths]);

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
      return sheet.row_heights?.[rIdx] || DEFAULT_ROW_HEIGHT;
    },
    [sheet.row_heights]
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
          if (!clipText) return;
          const rows = clipText.split(/\r?\n/).filter((r) => r.length > 0);
          const startCoords = cellIdToCoords(activeCell) || { col: 0, row: 0 };
          const batchUpdates: Record<string, Partial<SheetCell>> = {};

          rows.forEach((rowStr, rOffset) => {
            const cols = rowStr.split('\t');
            cols.forEach((valStr, cOffset) => {
              const targetR = startCoords.row + rOffset;
              const targetC = startCoords.col + cOffset;
              if (targetR < totalRawRows && targetC < totalCols) {
                const targetCid = coordsToCellId(targetC, targetR);
                const isFormula = valStr.startsWith('=');
                const isNum = !isFormula && !isNaN(Number(valStr)) && valStr.trim() !== '';
                batchUpdates[targetCid] = {
                  v: isFormula ? null : isNum ? Number(valStr) : valStr,
                  f: isFormula ? valStr : undefined,
                };
              }
            });
          });
          onBatchCellsChange(batchUpdates);
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

  const handleColResizeMouseDown = (e: React.MouseEvent, cIdx: number) => {
    e.stopPropagation();
    setResizingCol({
      colIdx: cIdx,
      startX: e.clientX,
      startW: getColWidth(cIdx),
    });
  };

  useEffect(() => {
    if (!resizingCol) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizingCol.startX;
      const newWidth = Math.max(60, resizingCol.startW + deltaX);
      const colLetter = colIndexToName(resizingCol.colIdx);
      setColWidths((prev) => ({ ...prev, [colLetter]: newWidth }));
    };

    const handleMouseUp = () => {
      setResizingCol(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizingCol]);

  const handleContextMenu = (e: React.MouseEvent, cellId: string) => {
    e.preventDefault();
    onActiveCellChange(cellId);
    setContextMenu({
      x: Math.min(e.clientX, window.innerWidth - 200),
      y: Math.min(e.clientY, window.innerHeight - 250),
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
          className="sticky top-0 left-0 z-30 bg-[#107c41] border-r border-b border-[#0b5a2f] flex items-center justify-center cursor-pointer hover:bg-[#0b5a2f] transition-colors"
          style={{ width: rowHeaderWidth, height: HEADER_ROW_HEIGHT }}
          title="Select All (Ctrl+A)"
        >
          <div className="w-2.5 h-2.5 border-r border-b border-white/60" />
        </div>

        {/* ========================================================================= */}
        {/* 2. STICKY TOP COLUMN HEADERS (A, B, C...) — CLEAN EXCEL GREEN LETTERS */}
        {/* ========================================================================= */}
        <div
          className="sticky top-0 z-20 flex bg-[#107c41] border-b border-[#0b5a2f]"
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
                className={`absolute top-0 border-r border-[#0b5a2f] flex flex-col items-center justify-center font-bold text-xs text-white transition-colors cursor-pointer select-none px-1 ${
                  isColActive || isColSelected
                    ? 'bg-[#084222] text-white ring-1 ring-white/50'
                    : 'hover:bg-[#0d6e38]'
                }`}
                style={{
                  left: colLeft,
                  width: colWidth,
                  height: HEADER_ROW_HEIGHT,
                }}
                title={`Column ${colName}: ${sheet.custom_col_headers?.[colName] || DEFAULT_COLUMN_TITLES[colName] || ''} (Double-click to rename)`}
              >
                {renamingColIdx === cIdx ? (
                  <input
                    type="text"
                    value={colRenameValue}
                    autoFocus
                    onChange={(e) => setColRenameValue(e.target.value)}
                    onBlur={() => handleSaveColRename(cIdx)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveColRename(cIdx);
                      if (e.key === 'Escape') setRenamingColIdx(null);
                    }}
                    className="w-full text-[11px] font-semibold text-slate-900 bg-white px-1 py-0.5 rounded text-center outline-none ring-2 ring-emerald-300"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <div
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setRenamingColIdx(cIdx);
                      setColRenameValue(sheet.custom_col_headers?.[colName] || DEFAULT_COLUMN_TITLES[colName] || '');
                    }}
                    className="flex flex-col items-center justify-center text-center leading-tight w-full truncate pointer-events-auto"
                  >
                    <span className="text-[11px] font-bold text-white tracking-wider uppercase opacity-95">
                      {colName}
                    </span>
                    <span className="text-[9.5px] font-medium text-emerald-100/90 truncate w-full tracking-tight">
                      {sheet.custom_col_headers?.[colName] || DEFAULT_COLUMN_TITLES[colName] || ''}
                    </span>
                  </div>
                )}

                {/* Column Resize Handle */}
                <div
                  onMouseDown={(e) => handleColResizeMouseDown(e, cIdx)}
                  className="absolute right-0 top-0 bottom-0 w-1.5 hover:w-2 hover:bg-white cursor-col-resize z-30"
                />
              </div>
            );
          })}
        </div>

        {/* ========================================================================= */}
        {/* 3. STICKY LEFT ROW HEADERS (1, 2, 3...) — DARK EXCEL GREEN */}
        {/* ========================================================================= */}
        <div
          className="sticky left-0 z-10 bg-[#107c41] border-r border-[#0b5a2f]"
          style={{
            width: rowHeaderWidth,
            height: totalContentHeight,
          }}
        >
          {Array.from({ length: visibleRowEnd - visibleRowStart + 1 }).map((_, idx) => {
            const vRowIdx = visibleRowStart + idx;
            const origRowIndex = filteredRowIndices[vRowIdx];
            const rowTop = rowPositions[vRowIdx] + HEADER_ROW_HEIGHT;
            const rowHeight = getRowHeight(origRowIndex);
            const isRowActive = origRowIndex === activeCoords.row;
            const isRowSelected = origRowIndex >= minSelRow && origRowIndex <= maxSelRow;

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
                className={`absolute left-0 border-b border-[#0b5a2f] flex items-center justify-center text-xs font-bold text-white transition-colors cursor-pointer select-none ${
                  isRowActive || isRowSelected
                    ? 'bg-[#084222] text-white ring-1 ring-white/50'
                    : 'hover:bg-[#0d6e38]'
                }`}
                style={{
                  top: rowTop,
                  width: rowHeaderWidth,
                  height: rowHeight,
                }}
                title={`Row ${origRowIndex + 1}`}
              >
                {origRowIndex + 1}
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
          {Array.from({ length: visibleRowEnd - visibleRowStart + 1 }).map((_, rOffset) => {
            const vRowIdx = visibleRowStart + rOffset;
            const rIdx = filteredRowIndices[vRowIdx];
            const isRow1Header = rIdx === 0;
            const rowTop = rowPositions[vRowIdx];
            const rowHeight = getRowHeight(rIdx);

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
                  onContextMenu={(e) => handleContextMenu(e, cellId)}
                  className={`absolute border-r border-b border-[#64748b]/40 px-2 flex items-center overflow-hidden whitespace-nowrap cursor-cell font-sans select-none transition-none ${
                    isActive
                      ? 'ring-2 ring-[#107c41] z-10 shadow-xs'
                      : inSelection
                      ? 'bg-[#bae6fd]/40 ring-1 ring-[#0284c7]/40'
                      : isMatch
                      ? 'bg-amber-100 ring-1 ring-amber-400 font-bold'
                      : ''
                  } ${isRow1Header ? 'font-bold text-slate-900 justify-between' : ''}`}
                  style={{
                    left: cellLeft,
                    top: rowTop,
                    width: cellWidth,
                    height: rowHeight,
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
                    <span className={`truncate flex-1 ${isRow1Header ? 'font-bold text-slate-900 tracking-tight' : ''}`}>
                      {formattedVal}
                    </span>
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
                    <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-[#107c41] border border-white cursor-crosshair z-20" />
                  )}
                </div>
              );
            });
          })}
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
      {/* 6. RIGHT-CLICK CONTEXT MENU */}
      {/* ========================================================================= */}
      {contextMenu && (
        <div
          className="fixed bg-white border border-slate-300 rounded-lg shadow-xl py-1 z-50 w-48 text-xs text-slate-700 animate-fadeIn"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              const cell = sheet.cells[contextMenu.cellId];
              navigator.clipboard.writeText(String(cell?.f || cell?.v || ''));
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[#f3f4f6] flex items-center gap-2"
          >
            <Copy className="w-3.5 h-3.5 text-slate-500" />
            <span>Copy</span>
          </button>

          <button
            type="button"
            onClick={() => {
              navigator.clipboard.readText().then((txt) => {
                if (txt) onCellChange(contextMenu.cellId, { v: txt });
              });
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[#f3f4f6] flex items-center gap-2"
          >
            <ClipboardPaste className="w-3.5 h-3.5 text-[#107c41]" />
            <span>Paste</span>
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
            <span>Edit Cell</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onCellChange(contextMenu.cellId, { v: '', f: undefined });
              setContextMenu(null);
            }}
            className="w-full text-left px-3 py-1.5 hover:bg-[#fee2e2] text-rose-600 flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Contents</span>
          </button>
        </div>
      )}
    </div>
  );
};
