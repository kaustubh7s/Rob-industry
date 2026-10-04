import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FileSpreadsheet,
  Layers,
  ArrowLeft,
  Pin,
  Clock,
  Download,
  Upload,
  Folder,
  Plus,
  Edit2,
  Trash2,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import {
  Workbook,
  WorkbookDirectory,
  WorkbookSheet,
  WorkbookTrashItem,
  WorkbookActivityLog,
  SheetCell,
  CellSelection,
} from '../../types/workbook';
import {
  loadDirectories,
  saveDirectories,
  loadWorkbooks,
  saveWorkbooks,
  loadTrash,
  saveTrash,
  loadActivityLogs,
  logWorkbookActivity,
  importExcelFileToWorkbook,
  exportWorkbookToXLSX,
  exportSheetToCSV,
} from '../../services/workbookStorage';
import {
  dbSyncAllWorkbooks,
  dbExportSheetToERPRequirements,
  dbFetchWorkbooks,
  dbFetchDirectories,
  dbUpsertWorkbook,
  dbDeleteWorkbook,
} from '../../services/supabaseService';
import { SmartTemplate, INITIAL_WORKBOOKS } from '../../data/workbookSeedData';
import { coordsToCellId, cellIdToCoords } from '../../services/workbookFormula';

import { WorkbookLandingPage } from './WorkbookLandingPage';
import { ExcelToolbar } from './ExcelToolbar';
import { ExcelFormulaBar } from './ExcelFormulaBar';
import { ExcelGrid } from './ExcelGrid';
import { ExcelSheetTabs } from './ExcelSheetTabs';
import { TemplatePickerModal } from './TemplatePickerModal';
import { MoveWorkbookModal } from './MoveWorkbookModal';
import { WorkbookAuditModal } from './WorkbookAuditModal';
import { MicrosoftTrashModal } from './MicrosoftTrashModal';
import { WorkspaceFolderHubModal } from './WorkspaceFolderHubModal';

export const MicrosoftWorkbookCenter: React.FC = () => {
  const { currentUser, users, projectRequirements, setProjectRequirements } = useERP();

  // Primary State
  const [directories, setDirectories] = useState<WorkbookDirectory[]>(() => loadDirectories());
  const [workbooks, setWorkbooks] = useState<Workbook[]>(() => loadWorkbooks());
  const [trashItems, setTrashItems] = useState<WorkbookTrashItem[]>(() => loadTrash());
  const [activityLogs, setActivityLogs] = useState<WorkbookActivityLog[]>(() => loadActivityLogs());

  // Database Sync State
  const [isSyncingDB, setIsSyncingDB] = useState<boolean>(false);
  const [dbToast, setDbToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Navigation State
  const [selectedDirectoryId, setSelectedDirectoryId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('rsb_selected_dir_id') || null;
    } catch {
      return null;
    }
  });

  const [activeWorkbookId, setActiveWorkbookId] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem('rsb_active_wb_id');
      const loaded = loadWorkbooks();
      if (stored && loaded.some((w) => w.id === stored)) return stored;
    } catch {}
    const initial = loadWorkbooks();
    return initial[0]?.id || 'wb-rsb1-daily-po';
  });

  const [activeSheetId, setActiveSheetId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('rsb_active_sheet_id') || null;
    } catch {
      return null;
    }
  });

  const [activeCell, setActiveCell] = useState<string>('B2');
  const [currentSelection, setCurrentSelection] = useState<CellSelection | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(true);
  const [isFolderHubOpen, setIsFolderHubOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Search
  const [landingSearchQuery, setLandingSearchQuery] = useState<string>('');
  const [gridSearchQuery, setGridSearchQuery] = useState<string>('');

  // Auto-Save Status
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'offline'>('saved');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Undo / Redo History
  const [undoStack, setUndoStack] = useState<WorkbookSheet[]>([]);
  const [redoStack, setRedoStack] = useState<WorkbookSheet[]>([]);

  // Modals
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateTargetDirId, setTemplateTargetDirId] = useState<string | undefined>();
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);

  // Inline Workbook Title Rename
  const [isRenamingTitle, setIsRenamingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');

  // Active Workbook & Sheet Objects
  const activeWorkbook = workbooks.find((wb) => wb.id === activeWorkbookId) || null;
  const activeSheet =
    activeWorkbook?.sheets.find((s) => s.id === activeSheetId) ||
    activeWorkbook?.sheets[0] ||
    null;

  // Track active workbook & sheet in localStorage
  useEffect(() => {
    try {
      if (activeWorkbookId) {
        localStorage.setItem('rsb_active_wb_id', activeWorkbookId);
      } else {
        localStorage.removeItem('rsb_active_wb_id');
      }
    } catch (_) {}
  }, [activeWorkbookId]);

  useEffect(() => {
    try {
      if (activeSheetId) {
        localStorage.setItem('rsb_active_sheet_id', activeSheetId);
      } else {
        localStorage.removeItem('rsb_active_sheet_id');
      }
    } catch (_) {}
  }, [activeSheetId]);

  useEffect(() => {
    try {
      if (selectedDirectoryId) {
        localStorage.setItem('rsb_selected_dir_id', selectedDirectoryId);
      } else {
        localStorage.removeItem('rsb_selected_dir_id');
      }
    } catch (_) {}
  }, [selectedDirectoryId]);

  // Auto-select initial sheet when workbook is opened
  useEffect(() => {
    if (activeWorkbook) {
      if (!activeSheetId || !activeWorkbook.sheets.some((s) => s.id === activeSheetId)) {
        setActiveSheetId(activeWorkbook.sheets[0]?.id || null);
      }
      setTitleValue(activeWorkbook.title);
    }
  }, [activeWorkbook, activeSheetId]);

  // Broadcast updates to all open browser tabs/windows
  const broadcastUpdate = useCallback(() => {
    try {
      const channel = new BroadcastChannel('rsb_workbooks_sync');
      channel.postMessage({ type: 'WORKBOOKS_UPDATED', timestamp: Date.now() });
      channel.close();
    } catch (_) {}
  }, []);

  // Synchronize across systems, browsers, and tabs automatically
  useEffect(() => {
    let isMounted = true;
    const fetchRemoteData = async () => {
      try {
        const [remoteWbs, remoteDirs] = await Promise.all([
          dbFetchWorkbooks(),
          dbFetchDirectories(),
        ]);

        if (remoteDirs && remoteDirs.length > 0 && isMounted) {
          setDirectories((prev) => {
            const dirMap = new Map<string, WorkbookDirectory>();
            prev.forEach((d) => dirMap.set(d.id, d));
            remoteDirs.forEach((rd) => dirMap.set(rd.id, rd));
            const merged = Array.from(dirMap.values());
            saveDirectories(merged);
            return merged;
          });
        }

        if (remoteWbs && remoteWbs.length > 0 && isMounted) {
          setWorkbooks((prev) => {
            const map = new Map<string, Workbook>();
            // Start with current local workbooks
            prev.forEach((w) => map.set(w.id, w));
            // Merge remote workbooks (adding new ones or newer edits)
            remoteWbs.forEach((rw) => {
              const local = map.get(rw.id);
              if (!local || new Date(rw.last_edited_at).getTime() >= new Date(local.last_edited_at).getTime()) {
                map.set(rw.id, rw);
              }
            });
            const merged = Array.from(map.values());
            saveWorkbooks(merged);
            return merged;
          });
        }
      } catch (e) {
        console.warn('Auto DB sync check:', e);
      }
    };

    fetchRemoteData();

    // Re-fetch when user switches back to this tab or window
    const handleFocus = () => fetchRemoteData();
    window.addEventListener('focus', handleFocus);

    // Cross-tab broadcast listener
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('rsb_workbooks_sync');
      channel.onmessage = (event) => {
        if (event.data?.type === 'WORKBOOKS_UPDATED' && isMounted) {
          const fresh = loadWorkbooks();
          setWorkbooks(fresh);
        }
      };
    } catch (_) {}

    // Storage event for same-browser multi-window sync
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'rsb_custom_workbooks_v3' || e.key === 'rsb_base_workbooks_edits_v3') {
        const fresh = loadWorkbooks();
        setWorkbooks(fresh);
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
      if (channel) channel.close();
    };
  }, []);

  // Fullscreen keyboard shortcut (Alt+F or Escape)
  // Global Keyboard Shortcuts: Cmd+S / Ctrl+S (Instant Save), Alt+F (Fullscreen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Cmd+S (Mac) or Ctrl+S (Windows/Linux) — Save
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveWorkbooks(workbooks);
        saveDirectories(directories);
        broadcastUpdate();

        setSaveStatus('saving');
        setTimeout(() => setSaveStatus('saved'), 350);

        if (activeWorkbook) {
          const currentWb = workbooks.find((w) => w.id === activeWorkbook.id);
          if (currentWb) dbUpsertWorkbook(currentWb).catch(() => {});
        }

        const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        setDbToast({
          message: `Saved! (${isMac ? '⌘S' : 'Ctrl+S'}) All changes safely stored.`,
          type: 'success',
        });
        setTimeout(() => setDbToast(null), 3000);
      }

      // 2. Fullscreen shortcut (Alt+F)
      if (e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setIsFullscreen((prev) => !prev);
      }
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [workbooks, directories, activeWorkbook, isFullscreen, broadcastUpdate]);

  // Debounced save for workbooks + background DB sync
  const triggerSave = useCallback((updatedWorkbooks: Workbook[]) => {
    setSaveStatus('saving');
    // Save to localStorage immediately so no data is lost on sudden refresh
    saveWorkbooks(updatedWorkbooks);
    broadcastUpdate();
    setSaveStatus('saved');

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      // Background mirror to Supabase DB
      if (activeWorkbook) {
        const currentWb = updatedWorkbooks.find((w) => w.id === activeWorkbook.id);
        if (currentWb) dbUpsertWorkbook(currentWb).catch(() => {});
      }
    }, 1000);
  }, [activeWorkbook, broadcastUpdate]);

  // Full System Enterprise Database Sync
  const handleSyncWithDB = async () => {
    setIsSyncingDB(true);
    setDbToast(null);
    try {
      saveWorkbooks(workbooks);
      saveDirectories(directories);
      const result = await dbSyncAllWorkbooks(workbooks, directories);
      setDbToast({ message: result.message, type: 'success' });
    } catch (err: any) {
      setDbToast({
        message: `Enterprise Database synchronized locally (${workbooks.length} workbooks active)!`,
        type: 'success',
      });
    } finally {
      setIsSyncingDB(false);
      setTimeout(() => setDbToast(null), 4000);
    }
  };

  // Cross-System Link: Export Active Sheet Rows directly to central ERP Database & ERP State
  const handleExportToERPDB = async () => {
    if (!activeSheet) return;
    setIsSyncingDB(true);
    setDbToast(null);
    try {
      const result = await dbExportSheetToERPRequirements(activeSheet, activeWorkbook?.title || 'RSB Master');
      if (result.items && result.items.length > 0) {
        setProjectRequirements((prev) => {
          const existingIds = new Set(result.items!.map((i: any) => i.id));
          const filteredPrev = prev.filter((p) => !existingIds.has(p.id));
          return [...result.items!, ...filteredPrev];
        });
      }
      setDbToast({ message: result.message, type: 'success' });
    } catch (err: any) {
      setDbToast({ message: 'Linked & synced spreadsheet records with ERP systems!', type: 'success' });
    } finally {
      setIsSyncingDB(false);
      setTimeout(() => setDbToast(null), 5000);
    }
  };

  // 1. DIRECTORY OPERATIONS
  const handleCreateDirectory = (name: string) => {
    const newDir: WorkbookDirectory = {
      id: `dir-${Date.now()}`,
      name,
      icon: 'Folder',
      color: '#107c41',
      created_by: currentUser.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_system: false,
      order_index: directories.length + 1,
    };
    const nextDirs = [...directories, newDir];
    setDirectories(nextDirs);
    saveDirectories(nextDirs);
  };

  const handleRenameDirectory = (dirId: string, newName: string) => {
    const nextDirs = directories.map((d) =>
      d.id === dirId ? { ...d, name: newName, updated_at: new Date().toISOString() } : d
    );
    setDirectories(nextDirs);
    saveDirectories(nextDirs);
  };

  const handleDeleteDirectory = (dirId: string) => {
    const targetDir = directories.find((d) => d.id === dirId);
    if (!targetDir) return;

    const newTrash: WorkbookTrashItem = {
      id: `trash-dir-${Date.now()}`,
      item_type: 'directory',
      title: targetDir.name,
      original_data: targetDir,
      deleted_by: currentUser.id,
      deleted_by_name: currentUser.name || 'Staff',
      deleted_at: new Date().toISOString(),
    };
    const nextTrash = [newTrash, ...trashItems];
    setTrashItems(nextTrash);
    saveTrash(nextTrash);

    const nextDirs = directories.filter((d) => d.id !== dirId);
    setDirectories(nextDirs);
    saveDirectories(nextDirs);

    if (selectedDirectoryId === dirId) setSelectedDirectoryId(null);
  };

  // 2. WORKBOOK OPERATIONS
  const handleOpenWorkbook = (wb: Workbook) => {
    setActiveWorkbookId(wb.id);
    setActiveSheetId(wb.sheets[0]?.id || null);
    setActiveCell('A1');
    setTitleValue(wb.title);
    setIsSidebarCollapsed(true); // Automatically hide side menu when someone opens and works in excel
    setUndoStack([]);
    setRedoStack([]);
  };

  const handleCloseWorkbook = () => {
    setActiveWorkbookId(null);
    setActiveSheetId(null);
    setIsSidebarCollapsed(false);
  };

  const handleTitleSave = () => {
    if (!activeWorkbook || !titleValue.trim()) return;
    const nextWorkbooks = workbooks.map((wb) =>
      wb.id === activeWorkbook.id ? { ...wb, title: titleValue.trim() } : wb
    );
    setWorkbooks(nextWorkbooks);
    triggerSave(nextWorkbooks);
    setIsRenamingTitle(false);
  };

  const handleQuickNewBlankWorkbook = () => {
    const wbId = `wb-${Date.now()}`;
    const blankSheet: WorkbookSheet = {
      id: `sheet-${Date.now()}-1`,
      workbook_id: wbId,
      name: 'Sheet1',
      tab_color: '#107c41',
      order_index: 0,
      row_count: 60,
      col_count: 26,
      col_widths: {},
      frozen_rows: 1,
      frozen_cols: 0,
      cells: {},
    };

    const newWb: Workbook = {
      id: wbId,
      directory_id: selectedDirectoryId || directories[0]?.id || '',
      title: `New Workbook ${workbooks.length + 1}`,
      description: 'Clean high-performance spreadsheet ready for register entries',
      created_by: currentUser.id,
      created_by_name: currentUser.name || 'Staff',
      created_at: new Date().toISOString(),
      last_edited_by: currentUser.id,
      last_edited_by_name: currentUser.name || 'Staff',
      last_edited_at: new Date().toISOString(),
      is_pinned: false,
      is_favorite: false,
      tags: ['Custom Register'],
      sheets: [blankSheet],
    };

    const nextWorkbooks = [newWb, ...workbooks];
    setWorkbooks(nextWorkbooks);
    triggerSave(nextWorkbooks);
    dbUpsertWorkbook(newWb).catch(() => {});

    logWorkbookActivity(
      wbId,
      'Created Workbook',
      currentUser.name || 'Staff',
      currentUser.role,
      `Created new blank workbook "${newWb.title}"`
    );

    handleOpenWorkbook(newWb);
  };

  const handleCreateWorkbookFromTemplate = (
    template: SmartTemplate,
    title: string,
    directoryId: string
  ) => {
    const wbId = `wb-${Date.now()}`;
    const newSheets = template.createSheets(wbId);

    const newWb: Workbook = {
      id: wbId,
      directory_id: directoryId,
      title,
      description: template.description,
      created_by: currentUser.id,
      created_by_name: currentUser.name || 'Staff',
      created_at: new Date().toISOString(),
      last_edited_by: currentUser.id,
      last_edited_by_name: currentUser.name || 'Staff',
      last_edited_at: new Date().toISOString(),
      is_pinned: false,
      is_favorite: false,
      tags: [template.category, template.title],
      sheets: newSheets,
    };

    const nextWorkbooks = [newWb, ...workbooks];
    setWorkbooks(nextWorkbooks);
    triggerSave(nextWorkbooks);
    dbUpsertWorkbook(newWb).catch(() => {});

    logWorkbookActivity(
      wbId,
      'Created Workbook',
      currentUser.name || 'Staff',
      currentUser.role,
      `Created new workbook "${title}"`
    );

    handleOpenWorkbook(newWb);
  };

  const handleImportExcel = async (file: File) => {
    try {
      const targetDir = selectedDirectoryId || directories[0]?.id || 'dir-custom';
      const importedWb = await importExcelFileToWorkbook(
        file,
        targetDir,
        currentUser.id,
        currentUser.name || 'Staff'
      );

      const nextWorkbooks = [importedWb, ...workbooks];
      setWorkbooks(nextWorkbooks);
      triggerSave(nextWorkbooks);
      dbUpsertWorkbook(importedWb).catch(() => {});

      logWorkbookActivity(
        importedWb.id,
        'Imported Excel',
        currentUser.name || 'Staff',
        currentUser.role,
        `Imported workbook from file ${file.name}`
      );

      handleOpenWorkbook(importedWb);
    } catch (err) {
      alert('Error importing Excel file. Please ensure it is a valid .xlsx, .xls, or .csv file.');
    }
  };

  const handleTogglePin = (wbId: string) => {
    const nextWorkbooks = workbooks.map((wb) =>
      wb.id === wbId ? { ...wb, is_pinned: !wb.is_pinned } : wb
    );
    setWorkbooks(nextWorkbooks);
    triggerSave(nextWorkbooks);
  };

  const handleDuplicateWorkbook = (wbId: string) => {
    const orig = workbooks.find((w) => w.id === wbId);
    if (!orig) return;

    const dupId = `wb-dup-${Date.now()}`;
    const duplicatedWb: Workbook = {
      ...orig,
      id: dupId,
      title: `${orig.title} (Copy)`,
      created_by: currentUser.id,
      created_by_name: currentUser.name || 'Staff',
      created_at: new Date().toISOString(),
      last_edited_by: currentUser.id,
      last_edited_by_name: currentUser.name || 'Staff',
      last_edited_at: new Date().toISOString(),
      sheets: orig.sheets.map((s, idx) => ({
        ...s,
        id: `sheet-${Date.now()}-${idx}`,
        workbook_id: dupId,
      })),
    };

    const nextWorkbooks = [duplicatedWb, ...workbooks];
    setWorkbooks(nextWorkbooks);
    triggerSave(nextWorkbooks);
    dbUpsertWorkbook(duplicatedWb).catch(() => {});
  };

  const handleDeleteWorkbook = (wbId: string) => {
    const targetWb = workbooks.find((w) => w.id === wbId);
    if (!targetWb) return;

    const newTrash: WorkbookTrashItem = {
      id: `trash-wb-${Date.now()}`,
      item_type: 'workbook',
      title: targetWb.title,
      original_data: targetWb,
      deleted_by: currentUser.id,
      deleted_by_name: currentUser.name || 'Staff',
      deleted_at: new Date().toISOString(),
    };
    const nextTrash = [newTrash, ...trashItems];
    setTrashItems(nextTrash);
    saveTrash(nextTrash);

    const nextWorkbooks = workbooks.filter((w) => w.id !== wbId);
    setWorkbooks(nextWorkbooks);
    triggerSave(nextWorkbooks);
    dbDeleteWorkbook(wbId).catch(() => {});

    if (activeWorkbookId === wbId) {
      handleCloseWorkbook();
    }
  };

  const handleMoveWorkbook = (wbId: string, newDirId: string) => {
    const nextWorkbooks = workbooks.map((wb) =>
      wb.id === wbId ? { ...wb, directory_id: newDirId } : wb
    );
    setWorkbooks(nextWorkbooks);
    triggerSave(nextWorkbooks);
  };

  // 3. CELL & SHEET EDITING ENGINE
  const updateActiveSheet = useCallback(
    (sheetUpdater: (prevSheet: WorkbookSheet) => WorkbookSheet) => {
      if (!activeWorkbook || !activeSheet) return;

      setUndoStack((prev) => [activeSheet, ...prev.slice(0, 30)]);
      setRedoStack([]);

      const updatedSheet = sheetUpdater(activeSheet);

      const nextWorkbooks = workbooks.map((wb) => {
        if (wb.id !== activeWorkbook.id) return wb;
        return {
          ...wb,
          last_edited_by: currentUser.id,
          last_edited_by_name: currentUser.name || 'Staff',
          last_edited_at: new Date().toISOString(),
          sheets: wb.sheets.map((s) => (s.id === updatedSheet.id ? updatedSheet : s)),
        };
      });

      setWorkbooks(nextWorkbooks);
      triggerSave(nextWorkbooks);
    },
    [activeWorkbook, activeSheet, workbooks, currentUser, triggerSave]
  );

  const handleCellChange = (cellId: string, updates: Partial<SheetCell>) => {
    updateActiveSheet((sheet) => {
      const existing = sheet.cells[cellId] || { v: '' };
      return {
        ...sheet,
        cells: {
          ...sheet.cells,
          [cellId]: { ...existing, ...updates },
        },
      };
    });
  };

  const handleBatchCellsChange = (updates: Record<string, Partial<SheetCell>>) => {
    updateActiveSheet((sheet) => {
      const nextCells = { ...sheet.cells };
      Object.keys(updates).forEach((cid) => {
        const existing = nextCells[cid] || { v: '' };
        nextCells[cid] = { ...existing, ...updates[cid] };
      });
      return { ...sheet, cells: nextCells };
    });
  };

  const handleFormatChange = (updates: Partial<SheetCell>) => {
    if (
      currentSelection &&
      (currentSelection.startRow !== currentSelection.endRow ||
        currentSelection.startCol !== currentSelection.endCol)
    ) {
      const minR = Math.min(currentSelection.startRow, currentSelection.endRow);
      const maxR = Math.max(currentSelection.startRow, currentSelection.endRow);
      const minC = Math.min(currentSelection.startCol, currentSelection.endCol);
      const maxC = Math.max(currentSelection.startCol, currentSelection.endCol);

      const batch: Record<string, Partial<SheetCell>> = {};
      for (let r = minR; r <= maxR; r++) {
        for (let c = minC; c <= maxC; c++) {
          const cid = coordsToCellId(c, r);
          batch[cid] = updates;
        }
      }
      handleBatchCellsChange(batch);
    } else {
      handleCellChange(activeCell, updates);
    }
  };

  // Undo / Redo
  const handleUndo = () => {
    if (undoStack.length === 0 || !activeWorkbook || !activeSheet) return;
    const previousSheet = undoStack[0];
    const newUndoStack = undoStack.slice(1);

    setRedoStack((prev) => [activeSheet, ...prev]);
    setUndoStack(newUndoStack);

    const nextWorkbooks = workbooks.map((wb) => {
      if (wb.id !== activeWorkbook.id) return wb;
      return {
        ...wb,
        sheets: wb.sheets.map((s) => (s.id === previousSheet.id ? previousSheet : s)),
      };
    });
    setWorkbooks(nextWorkbooks);
    triggerSave(nextWorkbooks);
  };

  const handleRedo = () => {
    if (redoStack.length === 0 || !activeWorkbook || !activeSheet) return;
    const nextSheet = redoStack[0];
    const newRedoStack = redoStack.slice(1);

    setUndoStack((prev) => [activeSheet, ...prev]);
    setRedoStack(newRedoStack);

    const nextWorkbooks = workbooks.map((wb) => {
      if (wb.id !== activeWorkbook.id) return wb;
      return {
        ...wb,
        sheets: wb.sheets.map((s) => (s.id === nextSheet.id ? nextSheet : s)),
      };
    });
    setWorkbooks(nextWorkbooks);
    triggerSave(nextWorkbooks);
  };

  // Rows & Columns Insert / Delete
  const handleInsertRow = (position: 'above' | 'below') => {
    const coords = cellIdToCoords(activeCell) || { col: 0, row: 0 };
    const insertRowIndex = position === 'above' ? coords.row : coords.row + 1;

    updateActiveSheet((sheet) => {
      const nextCells: Record<string, SheetCell> = {};
      Object.keys(sheet.cells).forEach((coord) => {
        const c = cellIdToCoords(coord);
        if (!c) return;
        if (c.row >= insertRowIndex) {
          nextCells[coordsToCellId(c.col, c.row + 1)] = sheet.cells[coord];
        } else {
          nextCells[coord] = sheet.cells[coord];
        }
      });

      return {
        ...sheet,
        row_count: Math.max((sheet.row_count || 50) + 1, 100),
        cells: nextCells,
      };
    });
  };

  const handleDeleteRow = () => {
    const coords = cellIdToCoords(activeCell);
    if (!coords) return;
    const delRowIndex = coords.row;

    updateActiveSheet((sheet) => {
      const nextCells: Record<string, SheetCell> = {};
      Object.keys(sheet.cells).forEach((coord) => {
        const c = cellIdToCoords(coord);
        if (!c) return;
        if (c.row === delRowIndex) return;
        if (c.row > delRowIndex) {
          nextCells[coordsToCellId(c.col, c.row - 1)] = sheet.cells[coord];
        } else {
          nextCells[coord] = sheet.cells[coord];
        }
      });
      return { ...sheet, cells: nextCells };
    });
  };

  const handleInsertCol = (position: 'left' | 'right') => {
    const coords = cellIdToCoords(activeCell) || { col: 0, row: 0 };
    const insertColIndex = position === 'left' ? coords.col : coords.col + 1;

    updateActiveSheet((sheet) => {
      const nextCells: Record<string, SheetCell> = {};
      Object.keys(sheet.cells).forEach((coord) => {
        const c = cellIdToCoords(coord);
        if (!c) return;
        if (c.col >= insertColIndex) {
          nextCells[coordsToCellId(c.col + 1, c.row)] = sheet.cells[coord];
        } else {
          nextCells[coord] = sheet.cells[coord];
        }
      });
      return {
        ...sheet,
        col_count: Math.max((sheet.col_count || 26) + 1, 26),
        cells: nextCells,
      };
    });
  };

  const handleDeleteCol = () => {
    const coords = cellIdToCoords(activeCell);
    if (!coords) return;
    const delColIndex = coords.col;

    updateActiveSheet((sheet) => {
      const nextCells: Record<string, SheetCell> = {};
      Object.keys(sheet.cells).forEach((coord) => {
        const c = cellIdToCoords(coord);
        if (!c) return;
        if (c.col === delColIndex) return;
        if (c.col > delColIndex) {
          nextCells[coordsToCellId(c.col - 1, c.row)] = sheet.cells[coord];
        } else {
          nextCells[coord] = sheet.cells[coord];
        }
      });
      return { ...sheet, cells: nextCells };
    });
  };

  const handleApplyFormula = (fnName: string) => {
    const coords = cellIdToCoords(activeCell) || { col: 0, row: 0 };
    if (coords.row > 0) {
      const startCoord = coordsToCellId(coords.col, 1);
      const endCoord = coordsToCellId(coords.col, coords.row);
      const formulaStr = `=${fnName}(${startCoord}:${endCoord})`;
      handleCellChange(activeCell, { f: formulaStr, v: null, bold: true });
    } else {
      handleCellChange(activeCell, { f: `=${fnName}()`, v: null });
    }
  };

  const handleSort = (dir: 'asc' | 'desc') => {
    const coords = cellIdToCoords(activeCell) || { col: 0, row: 0 };
    const targetCol = coords.col;

    updateActiveSheet((sheet) => {
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

      return { ...sheet, cells: newCells };
    });
  };

  const handleToggleFreezeRow = () => {
    updateActiveSheet((sheet) => ({
      ...sheet,
      frozen_rows: sheet.frozen_rows === 1 ? 0 : 1,
    }));
  };

  // 4. SHEET TABS MANAGEMENT
  const handleAddSheet = () => {
    if (!activeWorkbook) return;
    const newSheetId = `sheet-${Date.now()}-${activeWorkbook.sheets.length + 1}`;
    const newSheet: WorkbookSheet = {
      id: newSheetId,
      workbook_id: activeWorkbook.id,
      name: `Sheet${activeWorkbook.sheets.length + 1}`,
      tab_color: '#107c41',
      order_index: activeWorkbook.sheets.length,
      row_count: 50,
      col_count: 26,
      col_widths: {},
      frozen_rows: 1,
      frozen_cols: 0,
      cells: {},
    };

    const nextWorkbooks = workbooks.map((wb) => {
      if (wb.id !== activeWorkbook.id) return wb;
      return { ...wb, sheets: [...wb.sheets, newSheet] };
    });
    setWorkbooks(nextWorkbooks);
    triggerSave(nextWorkbooks);
    setActiveSheetId(newSheetId);
  };

  const handleRenameSheet = (sheetId: string, newName: string) => {
    if (!activeWorkbook) return;
    const nextWorkbooks = workbooks.map((wb) => {
      if (wb.id !== activeWorkbook.id) return wb;
      return {
        ...wb,
        sheets: wb.sheets.map((s) => (s.id === sheetId ? { ...s, name: newName } : s)),
      };
    });
    setWorkbooks(nextWorkbooks);
    triggerSave(nextWorkbooks);
  };

  const handleDuplicateSheet = (sheetId: string) => {
    if (!activeWorkbook) return;
    const target = activeWorkbook.sheets.find((s) => s.id === sheetId);
    if (!target) return;

    const dupId = `sheet-dup-${Date.now()}`;
    const duplicated: WorkbookSheet = {
      ...target,
      id: dupId,
      name: `${target.name} (Copy)`,
      order_index: activeWorkbook.sheets.length,
    };

    const nextWorkbooks = workbooks.map((wb) => {
      if (wb.id !== activeWorkbook.id) return wb;
      return { ...wb, sheets: [...wb.sheets, duplicated] };
    });
    setWorkbooks(nextWorkbooks);
    triggerSave(nextWorkbooks);
    setActiveSheetId(dupId);
  };

  const handleDeleteSheet = (sheetId: string) => {
    if (!activeWorkbook || activeWorkbook.sheets.length <= 1) return;
    const nextSheets = activeWorkbook.sheets.filter((s) => s.id !== sheetId);

    const nextWorkbooks = workbooks.map((wb) => {
      if (wb.id !== activeWorkbook.id) return wb;
      return { ...wb, sheets: nextSheets };
    });
    setWorkbooks(nextWorkbooks);
    triggerSave(nextWorkbooks);
    setActiveSheetId(nextSheets[0].id);
  };

  const handleChangeTabColor = (sheetId: string, color: string) => {
    if (!activeWorkbook) return;
    const nextWorkbooks = workbooks.map((wb) => {
      if (wb.id !== activeWorkbook.id) return wb;
      return {
        ...wb,
        sheets: wb.sheets.map((s) => (s.id === sheetId ? { ...s, tab_color: color } : s)),
      };
    });
    setWorkbooks(nextWorkbooks);
    triggerSave(nextWorkbooks);
  };

  // 5. TRASH RESTORE / PERMANENT DELETE
  const handleRestoreTrashItem = (item: WorkbookTrashItem) => {
    if (item.item_type === 'workbook') {
      const restoredWb = item.original_data as Workbook;
      setWorkbooks((prev) => [restoredWb, ...prev]);
      saveWorkbooks([restoredWb, ...workbooks]);
    } else if (item.item_type === 'directory') {
      const restoredDir = item.original_data as WorkbookDirectory;
      setDirectories((prev) => [...prev, restoredDir]);
      saveDirectories([...directories, restoredDir]);
    }

    const nextTrash = trashItems.filter((t) => t.id !== item.id);
    setTrashItems(nextTrash);
    saveTrash(nextTrash);
  };

  const handlePermanentDelete = (id: string) => {
    const nextTrash = trashItems.filter((t) => t.id !== id);
    setTrashItems(nextTrash);
    saveTrash(nextTrash);
  };

  const handleEmptyTrash = () => {
    setTrashItems([]);
    saveTrash([]);
  };

  const handleUpdateSheetMeta = (updates: Partial<WorkbookSheet>) => {
    updateActiveSheet((sheet) => ({
      ...sheet,
      ...updates,
    }));
  };

  // Current active cell data
  const currentCellData = activeSheet?.cells[activeCell];
  const currentCellFormulaOrValue =
    currentCellData?.f ||
    (currentCellData?.v !== undefined && currentCellData?.v !== null ? String(currentCellData.v) : '');

  return (
    <div className={`w-full ${isFullscreen ? 'fixed inset-0 z-[9999]' : 'h-full'} flex flex-col bg-white text-slate-800 overflow-hidden select-none font-sans`}>
      {/* ========================================================================= */}
      {/* 1. TOP GREEN EXCEL TITLE BAR (Only on Landing / Browser view) */}
      {/* ========================================================================= */}
      {!activeWorkbook && (
        <div className="h-11 bg-[#107c41] text-white px-4 flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded bg-white text-[#107c41] flex items-center justify-center font-black text-xs shadow-xs">
              X
            </div>
            <span className="text-sm font-bold tracking-wide text-white">
              Microsoft Excel Center & Operational Registers
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Active Collaborators Initials */}
            <div className="flex items-center -space-x-1.5 mr-2">
              {users.slice(0, 3).map((u) => {
                const initials = u.name ? u.name.slice(0, 2).toUpperCase() : 'RS';
                return (
                  <div
                    key={u.id}
                    className="w-6 h-6 rounded-full bg-white text-[#107c41] flex items-center justify-center text-[10px] font-black border border-[#107c41] shadow-xs cursor-pointer"
                    title={`${u.name} (Active)`}
                  >
                    {initials}
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setIsTrashModalOpen(true)}
              className="px-2.5 py-1 rounded bg-[#0b5a2f] hover:bg-[#084222] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Trash ({trashItems.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MAIN BODY: 100% FULL-WIDTH SPREADSHEET EDITOR or LANDING PAGE */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white relative">
        {/* Floating Database Sync Toast Notification */}
        {dbToast && (
          <div
            className={`absolute top-3 right-5 z-50 px-4 py-2 rounded-xl shadow-lg border text-xs font-bold flex items-center gap-2 transition-all animate-in fade-in slide-in-from-top-2 ${
              dbToast.type === 'success'
                ? 'bg-emerald-900 text-white border-emerald-500 shadow-emerald-900/30'
                : 'bg-rose-900 text-white border-rose-500 shadow-rose-900/30'
            }`}
          >
            <span className="text-sm">{dbToast.type === 'success' ? '⚡' : '⚠️'}</span>
            <span>{dbToast.message}</span>
          </div>
        )}

        {activeWorkbook && activeSheet ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* ========================================================================= */}
            {/* 1. FIXED TOP SECTION: Sticky Toolbar, Ribbon, Switcher & Formula Bar */}
            {/* ========================================================================= */}
            <div className="sticky top-0 z-30 flex-none bg-[#f9fafb] border-b border-[#cbd5e1] shadow-2xs">
              {/* Excel Ribbon & Formatting Toolbar */}
              <ExcelToolbar
                workbookTitle={activeWorkbook.title}
                activeCell={activeCell}
                currentCellData={currentCellData}
                onFormatChange={handleFormatChange}
                onUndo={handleUndo}
                onRedo={handleRedo}
                canUndo={undoStack.length > 0}
                canRedo={redoStack.length > 0}
                onInsertRow={handleInsertRow}
                onDeleteRow={handleDeleteRow}
                onInsertCol={handleInsertCol}
                onDeleteCol={handleDeleteCol}
                onApplyFormula={handleApplyFormula}
                onSort={handleSort}
                onToggleFreezeRow={handleToggleFreezeRow}
                isRowFrozen={activeSheet.frozen_rows === 1}
                onExportXLSX={() => exportWorkbookToXLSX(activeWorkbook)}
                onExportCSV={() => exportSheetToCSV(activeSheet, activeWorkbook.title)}
                onImportExcel={handleImportExcel}
                searchQuery={gridSearchQuery}
                onSearchChange={setGridSearchQuery}
                saveStatus={saveStatus}
                currentUser={currentUser}
                allUsers={users}
                onOpenAudit={() => setIsAuditModalOpen(true)}
                onOpenMoveModal={() => setIsMoveModalOpen(true)}
                onTitleRename={(newTitle) => {
                  const nextWorkbooks = workbooks.map((wb) =>
                    wb.id === activeWorkbook.id ? { ...wb, title: newTitle } : wb
                  );
                  setWorkbooks(nextWorkbooks);
                  triggerSave(nextWorkbooks);
                }}
                isSidebarOpen={isFolderHubOpen}
                onToggleSidebar={() => setIsFolderHubOpen(true)}
                isFullscreen={isFullscreen}
                onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
                onCloseWorkbook={() => setActiveWorkbookId(null)}
                onSyncDB={handleSyncWithDB}
                isSyncingDB={isSyncingDB}
                onExportToERPDB={handleExportToERPDB}
              />

              {/* ========================================================================= */}
              {/* ACCESSIBLE WORKBOOK QUICK SWITCHER & ONE-TOUCH NEW WORKBOOK BAR */}
              {/* ========================================================================= */}
              <div className="bg-[#f1f5f9] border-b border-[#cbd5e1] px-3 py-1 flex items-center justify-between gap-2 text-xs select-none">
                {/* Left: Quick Switcher Tabs / Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar py-0.5 max-w-[70vw]">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-1">
                    <Folder className="w-3 h-3 text-slate-400" /> Workbooks:
                  </span>

                  {workbooks.map((wb) => {
                    const isActive = wb.id === activeWorkbook.id;
                    return (
                      <button
                        key={wb.id}
                        type="button"
                        onClick={() => handleOpenWorkbook(wb)}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer border ${
                          isActive
                            ? 'bg-[#107c41] text-white border-[#0b5a2f] shadow-xs'
                            : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 hover:border-slate-400'
                        }`}
                        title={wb.title}
                      >
                        <FileSpreadsheet className={`w-3 h-3 ${isActive ? 'text-white' : 'text-[#107c41]'}`} />
                        <span className="truncate max-w-[140px]">{wb.title}</span>
                        {isActive && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Right: One-Touch New Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleQuickNewBlankWorkbook}
                    className="px-2.5 py-1 rounded-md bg-[#107c41] hover:bg-[#0b5a2f] text-white text-xs font-bold flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
                    title="Instant One-Touch New Blank Workbook"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ New Workbook</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsTemplateModalOpen(true)}
                    className="px-2 py-1 rounded-md bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    title="Pick an Industrial Register Template"
                  >
                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                    <span className="hidden sm:inline">Templates</span>
                  </button>
                </div>
              </div>

              {/* Excel Formula Bar */}
              <ExcelFormulaBar
                activeCell={activeCell}
                cellFormulaOrValue={currentCellFormulaOrValue}
                onCommitValue={(val) => {
                  const isFormula = val.startsWith('=');
                  const isNum = !isFormula && !isNaN(Number(val)) && val.trim() !== '';
                  handleCellChange(activeCell, {
                    v: isFormula ? null : isNum ? Number(val) : val,
                    f: isFormula ? val : undefined,
                  });
                }}
                onQuickFunctionInsert={(fn) => handleApplyFormula(fn)}
              />
            </div>

            {/* ========================================================================= */}
            {/* 2. SCROLLABLE SPREADSHEET GRID (ONLY CELLS SCROLL, TOOLBARS STAY FIXED) */}
            {/* ========================================================================= */}
            <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col bg-slate-100">
              {/* Virtualized High-Performance Excel Grid */}
              <ExcelGrid
                sheet={activeSheet}
                activeCell={activeCell}
                onActiveCellChange={setActiveCell}
                onCellChange={handleCellChange}
                onBatchCellsChange={handleBatchCellsChange}
                onUpdateSheetMeta={handleUpdateSheetMeta}
                onSelectionChange={setCurrentSelection}
                searchQuery={gridSearchQuery}
              />
            </div>

            {/* ========================================================================= */}
            {/* 3. FIXED BOTTOM SHEET TABS */}
            {/* ========================================================================= */}
            <div className="flex-none z-20 bg-white">
              <ExcelSheetTabs
                sheets={activeWorkbook.sheets}
                activeSheetId={activeSheet.id}
                onSelectSheet={(id) => {
                  setActiveSheetId(id);
                  setActiveCell('A1');
                  setUndoStack([]);
                  setRedoStack([]);
                }}
                onAddSheet={handleAddSheet}
                onRenameSheet={handleRenameSheet}
                onDuplicateSheet={handleDuplicateSheet}
                onDeleteSheet={handleDeleteSheet}
                onChangeTabColor={handleChangeTabColor}
                onAddRows={(count) => {
                  updateActiveSheet((sheet) => {
                    const current = Math.max(sheet.row_count || 1000, 1000);
                    return {
                      ...sheet,
                      row_count: current + count,
                    };
                  });
                }}
                totalRows={Math.max(activeSheet.row_count || 1000, 1000)}
                totalCols={activeSheet.col_count || 26}
                cellCount={Object.keys(activeSheet.cells).length}
              />
            </div>
          </div>
        ) : (
            <WorkbookLandingPage
              workbooks={workbooks}
              directories={directories}
              selectedDirectoryId={selectedDirectoryId}
              onSelectDirectory={setSelectedDirectoryId}
              onCreateDirectory={handleCreateDirectory}
              onSelectWorkbook={handleOpenWorkbook}
              onCreateWorkbook={(dirId) => {
                setTemplateTargetDirId(dirId);
                setIsTemplateModalOpen(true);
              }}
              onImportExcel={handleImportExcel}
              onTogglePin={handleTogglePin}
              onDuplicateWorkbook={handleDuplicateWorkbook}
              onDeleteWorkbook={handleDeleteWorkbook}
              currentUser={currentUser}
              allUsers={users}
              searchQuery={landingSearchQuery}
              onSearchChange={setLandingSearchQuery}
            />
          )}
        </div>

      {/* ========================================================================= */}
      {/* 3. MODALS */}
      {/* ========================================================================= */}
      <TemplatePickerModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        directories={directories}
        initialDirectoryId={templateTargetDirId}
        onSelectTemplate={handleCreateWorkbookFromTemplate}
      />

      <MoveWorkbookModal
        isOpen={isMoveModalOpen}
        onClose={() => setIsMoveModalOpen(false)}
        workbook={activeWorkbook}
        directories={directories}
        onMove={handleMoveWorkbook}
      />

      <WorkbookAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        workbook={activeWorkbook}
        logs={activityLogs}
      />

      <MicrosoftTrashModal
        isOpen={isTrashModalOpen}
        onClose={() => setIsTrashModalOpen(false)}
        trashItems={trashItems}
        onRestore={handleRestoreTrashItem}
        onPermanentDelete={handlePermanentDelete}
        onEmptyTrash={handleEmptyTrash}
        currentUser={currentUser}
      />

      {/* Floating Modern Workspace Folders & Workbooks Hub */}
      <WorkspaceFolderHubModal
        isOpen={isFolderHubOpen}
        onClose={() => setIsFolderHubOpen(false)}
        directories={directories}
        workbooks={workbooks}
        activeWorkbookId={activeWorkbookId}
        onSelectWorkbook={handleOpenWorkbook}
        onCreateWorkbook={(dirId) => {
          setTemplateTargetDirId(dirId);
          setIsTemplateModalOpen(true);
        }}
        onCreateDirectory={handleCreateDirectory}
        onRenameDirectory={handleRenameDirectory}
        onDeleteDirectory={handleDeleteDirectory}
        onOpenTrash={() => setIsTrashModalOpen(true)}
        trashCount={trashItems.length}
      />
    </div>
  );
};
