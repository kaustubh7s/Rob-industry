import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  FolderTree,
  Folder,
  FolderOpen,
  FolderPlus,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  Plus,
  Trash2,
  Edit2,
  Edit3,
  Copy,
  Download,
  Upload,
  Search,
  FileSpreadsheet,
  FileText,
  Sparkles,
  Layers,
  ArrowUp,
  ArrowDown,
  Clock,
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  X,
  Check,
  Package,
  CheckSquare,
  Square,
  MoreVertical,
  RefreshCw,
  Eye,
  History,
  GitCompare,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Undo2,
  Redo2,
  Filter,
  CheckCircle2,
  Lock,
  Tag,
  Hash,
  Boxes,
  Zap,
  LayoutGrid,
  Table as TableIcon,
  Archive,
  ArchiveRestore,
  ArrowUpDown,
  SlidersHorizontal,
  FolderKanban,
  Building2,
  Calendar,
  List,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import confetti from 'canvas-confetti';
import { useERP } from '../../context/ERPContext';
import { MasterBOM, MasterBOMItem, MachineFolder, MachineTypeMeta, MaterialType, BOMStatus, ProjectItem, ProjectMaterialRequirementItem } from '../../types/erp';
import { Modal } from '../common/Modal';
import { formatDate, getTodayFormatted } from '../../utils/calculations';
import { MATERIAL_TYPES } from '../../data/materialTypes';
import { dbBulkUpsertRequirements } from '../../services/supabaseService';

export const BOMManager: React.FC = () => {
  const {
    masterMachines,
    masterBOMs,
    addMachineFolder,
    updateMachineFolder,
    deleteMachineFolder,
    addMachineType,
    renameMachineType,
    updateMachineTypeDetails,
    deleteMachineType,
    moveMachineType,
    duplicateMachineType,
    archiveMachineType,
    addMasterBOM,
    updateMasterBOM,
    duplicateMasterBOM,
    deleteMasterBOM,
    resetMasterBOMsToFactoryDefault,
    currentUser,
    projects,
    projectRequirements,
    setProjectRequirements,
    addProject,
    setActiveTab,
    pushNavStep,
  } = useERP();

  // ---------------------------------------------------------------------------
  // NAVIGATION & VIEW STATE
  // ---------------------------------------------------------------------------
  // 'library' = Browse machine directory & BOM list
  // 'editor' = Dedicated focused BOM editor (directory collapsed)
  const [currentView, setCurrentView] = useState<'library' | 'editor'>('library');
  const [selectedMachineId, setSelectedMachineId] = useState<string>('ALL');
  const [selectedMachineType, setSelectedMachineType] = useState<string>('ALL');
  const [libraryViewMode, setLibraryViewMode] = useState<'cards' | 'table'>('cards');
  const [showAllMachineBOMs, setShowAllMachineBOMs] = useState<boolean>(false);
  const [activeBOMId, setActiveBOMId] = useState<string | null>(() => masterBOMs[0]?.id || null);

  // Left sidebar library collapsed toggle
  const [isLibraryCollapsed, setIsLibraryCollapsed] = useState<boolean>(false);

  // Sync sub-views with global navigation history (Back / Forward arrows)
  useEffect(() => {
    const handleNavRestore = (e: Event) => {
      const customEvent = e as CustomEvent<any>;
      const step = customEvent.detail;
      if (!step || step.tab !== 'bom') return;

      if (step.subView === 'editor' && step.bomId) {
        setActiveBOMId(step.bomId);
        setCurrentView('editor');
      } else if (step.subView === 'library') {
        setCurrentView('library');
      }
    };

    window.addEventListener('rsb:nav-restore', handleNavRestore);
    return () => window.removeEventListener('rsb:nav-restore', handleNavRestore);
  }, []);

  // Expanded folders in the library tree: { [machineId]: boolean }
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    masterMachines.forEach((m) => {
      init[m.id] = true;
    });
    return init;
  });

  // Reset or Sync to User's Real Factory Folder Structure (from photo)
  const handleSyncFactoryFolders = () => {
    resetMasterBOMsToFactoryDefault();
    setSelectedMachineId('ALL');
    setSelectedMachineType('ALL');
    confetti({ particleCount: 40, spread: 70 });
  };

  // Global search & filters for library/workspace
  const [globalSearch, setGlobalSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Active' | 'Draft' | 'Archived'>('all');
  const [sortBy, setSortBy] = useState<'updated' | 'name' | 'parts'>('updated');

  // Simple UI popovers and menus
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [isHeaderMoreMenuOpen, setIsHeaderMoreMenuOpen] = useState(false);
  const [activeMachineMenu, setActiveMachineMenu] = useState<string | null>(null);
  const [activeBOMCardMenu, setActiveBOMCardMenu] = useState<string | null>(null);
  const [isEditorMoreMenuOpen, setIsEditorMoreMenuOpen] = useState(false);
  const [isEditorFilterOpen, setIsEditorFilterOpen] = useState(false);

  // Dismissible quick guide banner
  const [showQuickGuide, setShowQuickGuide] = useState<boolean>(() => {
    return localStorage.getItem('RSB_BOM_GUIDE_DISMISSED') !== 'true';
  });

  const dismissQuickGuide = () => {
    setShowQuickGuide(false);
    localStorage.setItem('RSB_BOM_GUIDE_DISMISSED', 'true');
  };

  // ---------------------------------------------------------------------------
  // ACTIVE BOM & EDITOR STATE
  // ---------------------------------------------------------------------------
  const activeBOM = useMemo(() => {
    if (!activeBOMId) return null;
    return masterBOMs.find((b) => b.id === activeBOMId) || null;
  }, [masterBOMs, activeBOMId]);

  // Working copy of material items for active editor (supports undo/redo)
  const [editorItems, setEditorItems] = useState<MasterBOMItem[]>([]);
  const [historyStack, setHistoryStack] = useState<MasterBOMItem[][]>([]);
  const [futureStack, setFutureStack] = useState<MasterBOMItem[][]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'unsaved' | 'saving' | 'failed'>('saved');
  const [saveErrorMsg, setSaveErrorMsg] = useState<string>('');

  // Editable BOM metadata in editor
  const [editorBOMName, setEditorBOMName] = useState('');
  const [editorBOMNumber, setEditorBOMNumber] = useState('');
  const [editorRevision, setEditorRevision] = useState('Rev A');
  const [editorStatus, setEditorStatus] = useState<BOMStatus>('Active');
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  // Sync editor state when activeBOM changes
  useEffect(() => {
    if (activeBOM) {
      setEditorItems(activeBOM.items || []);
      setEditorBOMName(activeBOM.name || activeBOM.assemblyName || 'Machine BOM');
      setEditorBOMNumber(activeBOM.bomNumber || 'BOM-001');
      setEditorRevision(activeBOM.revision || 'Rev A');
      setEditorStatus(activeBOM.status || 'Active');
      setHistoryStack([]);
      setFutureStack([]);
      setHasUnsavedChanges(false);
      setSaveStatus('saved');
      setEditingCell(null);
      setSelectedRowIds([]);
    }
  }, [activeBOM?.id]);

  // Push new state to undo history
  const pushToHistory = (newItems: MasterBOMItem[]) => {
    setHistoryStack((prev) => [...prev.slice(-25), editorItems]);
    setFutureStack([]);
    setEditorItems(newItems);
    setHasUnsavedChanges(true);
    setSaveStatus('unsaved');
  };

  const handleUndo = () => {
    if (historyStack.length === 0) return;
    const previous = historyStack[historyStack.length - 1];
    setHistoryStack((prev) => prev.slice(0, -1));
    setFutureStack((prev) => [editorItems, ...prev]);
    setEditorItems(previous);
    setHasUnsavedChanges(true);
    setSaveStatus('unsaved');
  };

  const handleRedo = () => {
    if (futureStack.length === 0) return;
    const next = futureStack[0];
    setFutureStack((prev) => prev.slice(1));
    setHistoryStack((prev) => [...prev, editorItems]);
    setEditorItems(next);
    setHasUnsavedChanges(true);
    setSaveStatus('unsaved');
  };

  // ---------------------------------------------------------------------------
  // MATERIAL TABLE SETTINGS & FILTERS
  // ---------------------------------------------------------------------------
  const [tableSearch, setTableSearch] = useState('');
  const [tableMaterialFilter, setTableMaterialFilter] = useState<string>('all');
  const [tableCategoryFilter, setTableCategoryFilter] = useState<string>('all');
  const [onlyIncompleteFilter, setOnlyIncompleteFilter] = useState(false);
  const [onlyDuplicatesFilter, setOnlyDuplicatesFilter] = useState(false);
  const [rowDensity, setRowDensity] = useState<'comfortable' | 'compact' | 'dense'>('comfortable');

  // View format: Card View (Default as per specification) vs Table View
  const [materialViewFormat, setMaterialViewFormat] = useState<'card' | 'table'>('table');

  // Material sorting: srNo, description, quantity, materialType
  const [sortField, setSortField] = useState<'srNo' | 'description' | 'quantity' | 'materialType'>('srNo');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Sr. No. Management mode: 'auto' | 'manual' | 'preserve'
  const [srNoMode, setSrNoMode] = useState<'auto' | 'manual' | 'preserve'>('auto');
  const [isSrNoMenuOpen, setIsSrNoMenuOpen] = useState(false);

  // Inline cell editing: { rowId: string, col: string }
  const [editingCell, setEditingCell] = useState<{ rowId: string; col: string } | null>(null);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);

  // ---------------------------------------------------------------------------
  // CARD EDITING DRAWER / MODAL STATE
  // ---------------------------------------------------------------------------
  const [editingCardItem, setEditingCardItem] = useState<MasterBOMItem | null>(null);
  const [cardEditForm, setCardEditForm] = useState<{
    id: string;
    srNo: string | number;
    description: string;
    materialType: string;
    sizeSpecs: string;
    quantity: number | string;
    unit: string;
    category: string;
    notes: string;
    vendor?: string;
    orderedBy?: string;
    projectName?: string;
    poNo?: string;
  }>({
    id: '',
    srNo: '',
    description: '',
    materialType: 'SS Flat',
    sizeSpecs: '',
    quantity: 1,
    unit: 'Nos',
    category: '',
    notes: '',
    vendor: '',
    orderedBy: '',
    projectName: '',
    poNo: '',
  });
  const [cardEditErrors, setCardEditErrors] = useState<Record<string, string>>({});
  const [cardEditIsDirty, setCardEditIsDirty] = useState(false);
  const [isDiscardCardEditModalOpen, setIsDiscardCardEditModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);

  // ---------------------------------------------------------------------------
  // MACHINE SUBFOLDER / TYPE EDITING STATE
  // ---------------------------------------------------------------------------
  const [showArchivedTypes, setShowArchivedTypes] = useState(false);
  const [activeTypeMenu, setActiveTypeMenu] = useState<string | null>(null);

  // Inline rename state for machine types
  const [inlineRenamingType, setInlineRenamingType] = useState<{ machineId: string; oldTypeName: string } | null>(null);
  const [inlineRenameValue, setInlineRenameValue] = useState('');
  const [inlineRenameError, setInlineRenameError] = useState('');

  // Edit Details Modal state
  const [editTypeDetailsModalData, setEditTypeDetailsModalData] = useState<{
    machineId: string;
    typeName: string;
    name: string;
    parentFolderId: string;
    modelVariant: string;
    description: string;
    internalCode: string;
    status: 'Active' | 'Archived';
  } | null>(null);

  // Duplicate Machine Type Modal state
  const [duplicateTypeModalData, setDuplicateTypeModalData] = useState<{
    machineId: string;
    sourceTypeName: string;
    newTypeName: string;
    copyBOMs: boolean;
  } | null>(null);

  // Move Machine Type Modal state
  const [moveTypeModalData, setMoveTypeModalData] = useState<{
    sourceMachineId: string;
    typeName: string;
    targetMachineId: string;
  } | null>(null);

  // Delete Machine Type Confirmation Modal state
  const [deleteTypeConfirmModalData, setDeleteTypeConfirmModalData] = useState<{
    machineId: string;
    typeName: string;
    linkedBOMs: MasterBOM[];
  } | null>(null);

  // Close 3-dot and popover menus on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (activeTypeMenu && !target.closest('.type-menu-container')) {
        setActiveTypeMenu(null);
      }
      if (activeMachineMenu && !target.closest('.machine-menu-container')) {
        setActiveMachineMenu(null);
      }
      if (activeBOMCardMenu && !target.closest('.bom-card-menu-container')) {
        setActiveBOMCardMenu(null);
      }
      if (isFilterMenuOpen && !target.closest('.filter-menu-container')) {
        setIsFilterMenuOpen(false);
      }
      if (isHeaderMoreMenuOpen && !target.closest('.header-more-menu-container')) {
        setIsHeaderMoreMenuOpen(false);
      }
      if (isEditorMoreMenuOpen && !target.closest('.editor-more-menu-container')) {
        setIsEditorMoreMenuOpen(false);
      }
      if (isEditorFilterOpen && !target.closest('.editor-filter-container')) {
        setIsEditorFilterOpen(false);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [activeTypeMenu, activeMachineMenu, activeBOMCardMenu, isFilterMenuOpen, isHeaderMoreMenuOpen, isEditorMoreMenuOpen, isEditorFilterOpen]);

  // ---------------------------------------------------------------------------
  // MODALS STATE
  // ---------------------------------------------------------------------------
  const [isNewMachineModalOpen, setIsNewMachineModalOpen] = useState(false);
  const [newMachineNameInput, setNewMachineNameInput] = useState('');
  const [newMachineTypeInput, setNewMachineTypeInput] = useState('Standard Model');

  const [renameMachineModalData, setRenameMachineModalData] = useState<{ id: string; name: string } | null>(null);
  const [deleteMachineModalData, setDeleteMachineModalData] = useState<MachineFolder | null>(null);

  const [newTypeModalData, setNewTypeModalData] = useState<{ machineId: string; machineName: string } | null>(null);
  const [newTypeNameInput, setNewTypeNameInput] = useState('');

  const [renameTypeModalData, setRenameTypeModalData] = useState<{ machineId: string; oldTypeName: string } | null>(null);
  const [renameTypeInput, setRenameTypeInput] = useState('');

  const [deleteTypeModalData, setDeleteTypeModalData] = useState<{ machineId: string; typeName: string } | null>(null);

  const [isNewBOMModalOpen, setIsNewBOMModalOpen] = useState(false);
  const [newBOMForm, setNewBOMForm] = useState({
    name: '',
    bomNumber: '',
    machineName: '',
    machineType: '',
    revision: 'Rev A',
    status: 'Active' as BOMStatus,
    notes: '',
  });

  const [duplicateBOMModalData, setDuplicateBOMModalData] = useState<MasterBOM | null>(null);
  const [duplicateBOMNameInput, setDuplicateBOMNameInput] = useState('');
  const [duplicateTargetMachine, setDuplicateTargetMachine] = useState('');
  const [duplicateTargetType, setDuplicateTargetType] = useState('');

  const [deleteBOMModalData, setDeleteBOMModalData] = useState<MasterBOM | null>(null);

  // Guided Excel Import Modal
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [importRawRows, setImportRawRows] = useState<Record<string, any>[]>([]);
  const [importFileHeaders, setImportFileHeaders] = useState<string[]>([]);
  const [importColumnMapping, setImportColumnMapping] = useState({
    srNo: '',
    description: '',
    materialType: '',
    sizeSpecs: '',
    quantity: '',
    unit: '',
    category: '',
    notes: '',
  });
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [importParsedPreview, setImportParsedPreview] = useState<MasterBOMItem[]>([]);
  const [importFileName, setImportFileName] = useState('');
  const [importStats, setImportStats] = useState({ total: 0, valid: 0, incomplete: 0, duplicates: 0 });

  // Paste from Excel clipboard modal
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteRawText, setPasteRawText] = useState('');

  // Renumber rows modal
  const [isRenumberModalOpen, setIsRenumberModalOpen] = useState(false);
  const [renumberStartAt, setRenumberStartAt] = useState<number>(1);
  const [renumberPrefix, setRenumberPrefix] = useState<string>('');

  // Bulk Change Category modal
  const [isBulkCategoryModalOpen, setIsBulkCategoryModalOpen] = useState(false);
  const [bulkCategoryInput, setBulkCategoryInput] = useState('Mechanical');

  // Revision comparison modal
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [compareTargetBOMId, setCompareTargetBOMId] = useState<string>('');

  // Direct load into project modal (Requirement 9)
  const [isLoadToProjectModalOpen, setIsLoadToProjectModalOpen] = useState(false);
  const [loadProjStep, setLoadProjStep] = useState<1 | 2 | 3>(1);
  const [loadDestProjectName, setLoadDestProjectName] = useState('');
  const [loadIsNewProject, setLoadIsNewProject] = useState(false);
  const [loadNewProjectName, setLoadNewProjectName] = useState('');
  const [loadPONumber, setLoadPONumber] = useState('');
  const [loadPODate, setLoadPODate] = useState(getTodayFormatted());
  const [loadVendor, setLoadVendor] = useState('');
  const [loadSelectedMaterials, setLoadSelectedMaterials] = useState<Record<string, boolean>>({});
  const [loadCustomQuantities, setLoadCustomQuantities] = useState<Record<string, number>>({});
  const [loadExistingMode, setLoadExistingMode] = useState<'append' | 'replace'>('append');
  const [loadPreserveSrNo, setLoadPreserveSrNo] = useState(false);
  const [loadSkipDuplicates, setLoadSkipDuplicates] = useState(true);
  const [loadSrNoMode, setLoadSrNoMode] = useState<'auto' | 'manual'>('auto');
  const [loadManualStartingSrNo, setLoadManualStartingSrNo] = useState<number>(1);

  // Help & Documentation modal
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [helpSection, setHelpSection] = useState<'quickstart' | 'excel' | 'revisions' | 'load_project'>('quickstart');

  // ---------------------------------------------------------------------------
  // FILTERED LIST COMPUTATIONS
  // ---------------------------------------------------------------------------
  // Active selected machine object ('ALL' means showing all machines)
  const currentMachine = useMemo(() => {
    if (selectedMachineId === 'ALL') return null;
    return masterMachines.find((m) => m.id === selectedMachineId) || null;
  }, [masterMachines, selectedMachineId]);

  // Active selected machine type ('ALL' means all types under current machine or all)
  const currentType = useMemo(() => {
    if (!currentMachine) return selectedMachineType;
    if (selectedMachineType !== 'ALL' && currentMachine.types.includes(selectedMachineType)) {
      return selectedMachineType;
    }
    return 'ALL';
  }, [currentMachine, selectedMachineType]);

  // Helper to open New BOM modal prefilled with current or targeted machine & model
  const handleOpenNewBOMModal = useCallback((presetMachineName?: string, presetTypeName?: string) => {
    const targetMachName = presetMachineName || currentMachine?.name || (masterMachines[0]?.name || '');
    const foundMach = masterMachines.find((m) => m.name === targetMachName);
    const targetTypeName = presetTypeName || (currentType !== 'ALL' ? currentType : (foundMach?.types[0] || 'Standard Model'));
    const prefix = targetMachName.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X') || 'STD';
    const randomCode = `BOM-${prefix}-${Math.floor(10 + Math.random() * 90)}`;
    setNewBOMForm({
      name: '',
      bomNumber: randomCode,
      machineName: targetMachName,
      machineType: targetTypeName,
      revision: 'Rev A',
      status: 'Active',
      notes: '',
    });
    setIsNewBOMModalOpen(true);
  }, [currentMachine, currentType, masterMachines]);

  // Executive Metrics (matching ProjectsDirectory summary)
  const executiveMetrics = useMemo(() => {
    const totalMachines = masterMachines.length;
    let totalTypes = 0;
    masterMachines.forEach((m) => {
      totalTypes += (m.types || []).length;
    });
    const totalBOMs = masterBOMs.length;
    let totalMaterialsSum = 0;
    let totalQtySum = 0;
    masterBOMs.forEach((b) => {
      (b.items || []).forEach((it) => {
        totalMaterialsSum += 1;
        totalQtySum += Number(it.quantity) || 0;
      });
    });
    return {
      totalMachines,
      totalTypes,
      totalBOMs,
      totalMaterialsSum,
      totalQtySum,
    };
  }, [masterMachines, masterBOMs]);

  // BOM unit breakdown helper for cards
  const computeBOMUnitSummary = (items: MasterBOMItem[]) => {
    if (!items || items.length === 0) return '0 Parts';
    const map = new Map<string, number>();
    items.forEach((it) => {
      const u = (it.unit || 'Nos').trim();
      map.set(u, (map.get(u) || 0) + (Number(it.quantity) || 0));
    });
    const parts: string[] = [];
    map.forEach((qty, unit) => {
      const formatted = Number.isInteger(qty) ? qty : qty.toFixed(1);
      parts.push(`${formatted} ${unit}`);
    });
    return parts.slice(0, 2).join(' · ') || '0 Parts';
  };

  // BOMs matching current selection in Workspace
  const visibleWorkspaceBOMs = useMemo(() => {
    return masterBOMs.filter((b) => {
      // Machine filter
      if (currentMachine && b.machineName !== currentMachine.name) return false;
      // Machine Type filter
      if (selectedMachineType !== 'ALL' && b.machineType !== selectedMachineType) return false;
      // Status filter
      if (statusFilter !== 'all' && b.status !== statusFilter) return false;
      // Global search
      if (globalSearch.trim()) {
        const q = globalSearch.toLowerCase();
        const matchesName = (b.name || '').toLowerCase().includes(q) || (b.assemblyName && b.assemblyName.toLowerCase().includes(q));
        const matchesCode = (b.bomNumber || '').toLowerCase().includes(q);
        const matchesMachine = (b.machineName || '').toLowerCase().includes(q);
        const matchesType = (b.machineType || '').toLowerCase().includes(q);
        const matchesParts = (b.items || []).some(
          (it) => it.description.toLowerCase().includes(q) || (it.sizeSpecs && it.sizeSpecs.toLowerCase().includes(q))
        );
        if (!matchesName && !matchesCode && !matchesMachine && !matchesType && !matchesParts) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'parts') return (b.items?.length || 0) - (a.items?.length || 0);
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });
  }, [masterBOMs, currentMachine, selectedMachineType, statusFilter, globalSearch, sortBy]);

  // Factory Directory Machine & Assembly categorization
  const allCurrentMachineBOMs = useMemo(() => {
    if (!currentMachine) return [];
    return masterBOMs.filter((b) => b.machineName === currentMachine.name);
  }, [masterBOMs, currentMachine]);

  const currentMachineRootBOMs = useMemo(() => {
    if (!currentMachine) return [];
    return allCurrentMachineBOMs.filter((b) => {
      const t = (b.machineType || '').trim();
      return (
        t === 'General / Root' ||
        t === 'Root' ||
        t === 'General' ||
        t === '' ||
        !currentMachine.types.includes(t)
      );
    });
  }, [allCurrentMachineBOMs, currentMachine]);

  const currentSubfolderBOMs = useMemo(() => {
    if (!currentMachine || selectedMachineType === 'ALL') return [];
    return allCurrentMachineBOMs.filter((b) => b.machineType === selectedMachineType);
  }, [allCurrentMachineBOMs, currentMachine, selectedMachineType]);

  // Missing specification & duplicate analysis for active editor
  const { duplicateItemIds, incompleteItemIds } = useMemo(() => {
    const dups = new Set<string>();
    const incomp = new Set<string>();

    const seenKeyMap = new Map<string, string>();
    editorItems.forEach((it) => {
      // Check incomplete
      if (!it.description?.trim() || !it.materialType?.trim() || !it.sizeSpecs?.trim() || it.quantity <= 0 || !it.unit?.trim()) {
        incomp.add(it.id);
      }
      // Check duplicates (description + materialType + sizeSpecs)
      const key = `${(it.description || '').trim().toLowerCase()}:::${(it.materialType || '').trim().toLowerCase()}:::${(it.sizeSpecs || '').trim().toLowerCase()}`;
      if (seenKeyMap.has(key)) {
        dups.add(it.id);
        dups.add(seenKeyMap.get(key)!);
      } else {
        seenKeyMap.set(key, it.id);
      }
    });

    return { duplicateItemIds: dups, incompleteItemIds: incomp };
  }, [editorItems]);

  // Filtered editor items for display in table
  const displayedEditorItems = useMemo(() => {
    return editorItems.filter((it) => {
      // Text search
      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase();
        const matchesDesc = it.description.toLowerCase().includes(q);
        const matchesSize = it.sizeSpecs && it.sizeSpecs.toLowerCase().includes(q);
        const matchesType = it.materialType && it.materialType.toLowerCase().includes(q);
        const matchesCat = it.category && it.category.toLowerCase().includes(q);
        const matchesNotes = it.notes && it.notes.toLowerCase().includes(q);
        const matchesSr = String(it.srNo).toLowerCase().includes(q);
        if (!matchesDesc && !matchesSize && !matchesType && !matchesCat && !matchesNotes && !matchesSr) return false;
      }
      // Material filter
      if (tableMaterialFilter !== 'all' && it.materialType !== tableMaterialFilter) return false;
      // Category filter
      if (tableCategoryFilter !== 'all' && it.category !== tableCategoryFilter) return false;
      // Incomplete filter
      if (onlyIncompleteFilter && !incompleteItemIds.has(it.id)) return false;
      // Duplicate filter
      if (onlyDuplicatesFilter && !duplicateItemIds.has(it.id)) return false;
      return true;
    });
  }, [editorItems, tableSearch, tableMaterialFilter, tableCategoryFilter, onlyIncompleteFilter, onlyDuplicatesFilter, incompleteItemIds, duplicateItemIds]);

  // Sorted editor items based on sortField and sortOrder (used by Card View & Table View)
  const sortedEditorItems = useMemo(() => {
    return [...displayedEditorItems].sort((a, b) => {
      let comparison = 0;
      if (sortField === 'srNo') {
        const numA = parseFloat(String(a.srNo));
        const numB = parseFloat(String(b.srNo));
        if (!isNaN(numA) && !isNaN(numB)) {
          comparison = numA - numB;
        } else {
          comparison = String(a.srNo).localeCompare(String(b.srNo), undefined, { numeric: true });
        }
      } else if (sortField === 'quantity') {
        comparison = (Number(a.quantity) || 0) - (Number(b.quantity) || 0);
      } else if (sortField === 'description') {
        comparison = (a.description || '').localeCompare(b.description || '');
      } else if (sortField === 'materialType') {
        comparison = (a.materialType || '').localeCompare(b.materialType || '');
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [displayedEditorItems, sortField, sortOrder]);

  // Grouped Unit-wise summary for table footer (Requirement 6.D)
  const unitBreakdownSummary = useMemo(() => {
    const map = new Map<string, number>();
    editorItems.forEach((it) => {
      const u = (it.unit || 'Nos').trim();
      const current = map.get(u) || 0;
      map.set(u, current + (Number(it.quantity) || 0));
    });

    const parts: string[] = [];
    map.forEach((total, unit) => {
      const formattedQty = Number.isInteger(total) ? total : total.toFixed(2);
      parts.push(`${formattedQty} ${unit}`);
    });

    return parts.length > 0 ? parts.join(' · ') : '0 items';
  }, [editorItems]);

  // ---------------------------------------------------------------------------
  // EDITOR ROW OPERATIONS
  // ---------------------------------------------------------------------------
  // Calculate next auto Sr. No.
  const getNextSrNo = (): string | number => {
    if (srNoMode === 'manual') return '';
    let max = 0;
    editorItems.forEach((it) => {
      const num = parseInt(String(it.srNo).replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num) && num > max) max = num;
    });
    return max > 0 ? max + 1 : editorItems.length + 1;
  };

  const handleAddMaterialRow = () => {
    const newRow: MasterBOMItem = {
      id: `mbi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      srNo: getNextSrNo(),
      description: 'New Component Part',
      materialType: 'SS Flat',
      sizeSpecs: '-',
      quantity: 1,
      unit: 'Nos',
      category: 'Mechanical',
      notes: '',
    };
    pushToHistory([...editorItems, newRow]);
    setEditingCell({ rowId: newRow.id, col: 'description' });
  };

  const handleAdd5BlankRows = () => {
    let startSr = 1;
    let max = 0;
    editorItems.forEach((it) => {
      const num = parseInt(String(it.srNo).replace(/[^0-9]/g, ''), 10);
      if (!isNaN(num) && num > max) max = num;
    });
    startSr = max > 0 ? max + 1 : editorItems.length + 1;

    const newRows: MasterBOMItem[] = Array.from({ length: 5 }).map((_, i) => ({
      id: `mbi-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      srNo: srNoMode === 'manual' ? '' : startSr + i,
      description: '',
      materialType: 'SS Flat',
      sizeSpecs: '',
      quantity: 1,
      unit: 'Nos',
      category: 'Mechanical',
      notes: '',
    }));

    pushToHistory([...editorItems, ...newRows]);
  };

  const handleUpdateRowCell = (rowId: string, col: keyof MasterBOMItem, val: any) => {
    const updated = editorItems.map((r) => {
      if (r.id === rowId) {
        return { ...r, [col]: val };
      }
      return r;
    });
    pushToHistory(updated);
  };

  const handleDeleteRow = (rowId: string) => {
    const updated = editorItems.filter((r) => r.id !== rowId);
    pushToHistory(updated);
    setSelectedRowIds((prev) => prev.filter((id) => id !== rowId));
  };

  const handleDuplicateRow = (rowId: string) => {
    const idx = editorItems.findIndex((r) => r.id === rowId);
    if (idx === -1) return;
    const target = editorItems[idx];
    const clone: MasterBOMItem = {
      ...target,
      id: `mbi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      srNo: srNoMode === 'auto' ? getNextSrNo() : target.srNo,
      description: `${target.description} (Copy)`,
    };
    const next = [...editorItems];
    next.splice(idx + 1, 0, clone);
    pushToHistory(next);
  };

  const handleInsertRow = (rowId: string, position: 'above' | 'below') => {
    const idx = editorItems.findIndex((r) => r.id === rowId);
    if (idx === -1) return;
    const newRow: MasterBOMItem = {
      id: `mbi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      srNo: srNoMode === 'manual' ? '' : getNextSrNo(),
      description: '',
      materialType: 'SS Flat',
      sizeSpecs: '',
      quantity: 1,
      unit: 'Nos',
      category: 'Mechanical',
      notes: '',
    };
    const next = [...editorItems];
    next.splice(position === 'above' ? idx : idx + 1, 0, newRow);
    pushToHistory(next);
    setEditingCell({ rowId: newRow.id, col: 'description' });
  };

  const handleMoveRow = (rowId: string, direction: 'up' | 'down') => {
    const idx = editorItems.findIndex((r) => r.id === rowId);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === editorItems.length - 1) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    const next = [...editorItems];
    const temp = next[idx];
    next[idx] = next[targetIdx];
    next[targetIdx] = temp;
    pushToHistory(next);
  };

  // Bulk Selection Operations
  const handleToggleSelectAll = () => {
    if (selectedRowIds.length === displayedEditorItems.length && displayedEditorItems.length > 0) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(displayedEditorItems.map((r) => r.id));
    }
  };

  const handleToggleRowSelect = (rowId: string) => {
    setSelectedRowIds((prev) => (prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]));
  };

  const handleBulkDelete = () => {
    if (selectedRowIds.length === 0) return;
    setIsBulkDeleteModalOpen(true);
  };

  const handleConfirmBulkDelete = () => {
    if (selectedRowIds.length === 0) return;
    const updated = editorItems.filter((r) => !selectedRowIds.includes(r.id));
    pushToHistory(updated);
    setSelectedRowIds([]);
    setIsBulkDeleteModalOpen(false);
  };

  // Card Editing Handlers
  const handleOpenCardEdit = (item: MasterBOMItem) => {
    setEditingCardItem(item);
    setCardEditForm({
      id: item.id,
      srNo: item.srNo,
      description: item.description,
      materialType: item.materialType,
      sizeSpecs: item.sizeSpecs || '',
      quantity: item.quantity,
      unit: item.unit || 'Nos',
      category: item.category || '',
      notes: item.notes || '',
      vendor: item.vendor || item.recommendedVendor || '',
      orderedBy: item.orderedBy || currentUser?.name || 'Amit',
      projectName: item.projectName || activeBOM?.name || '',
      poNo: item.poNo || activeBOM?.bomNumber || '',
    });
    setCardEditErrors({});
    setCardEditIsDirty(false);
  };

  const handleCardFieldChange = (field: string, value: any) => {
    setCardEditForm((prev) => ({ ...prev, [field]: value }));
    setCardEditIsDirty(true);
    if (cardEditErrors[field]) {
      setCardEditErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSaveCardEdit = () => {
    const errors: Record<string, string> = {};
    if (!cardEditForm.description.trim()) {
      errors.description = 'Part description cannot be blank';
    }
    const q = Number(cardEditForm.quantity);
    if (isNaN(q) || q <= 0) {
      errors.quantity = 'Quantity must be greater than 0';
    }
    if (Object.keys(errors).length > 0) {
      setCardEditErrors(errors);
      return;
    }

    const updated = editorItems.map((it) => {
      if (it.id === cardEditForm.id) {
        return {
          ...it,
          srNo: cardEditForm.srNo,
          description: cardEditForm.description.trim(),
          materialType: cardEditForm.materialType,
          sizeSpecs: cardEditForm.sizeSpecs.trim(),
          quantity: q,
          unit: cardEditForm.unit,
          category: cardEditForm.category.trim(),
          notes: cardEditForm.notes.trim(),
          vendor: (cardEditForm.vendor || '').trim(),
          recommendedVendor: (cardEditForm.vendor || '').trim(),
          orderedBy: (cardEditForm.orderedBy || '').trim(),
          projectName: (cardEditForm.projectName || '').trim(),
          poNo: (cardEditForm.poNo || '').trim(),
        };
      }
      return it;
    });

    pushToHistory(updated);
    setEditingCardItem(null);
    setCardEditIsDirty(false);
  };

  const handleCloseCardEdit = () => {
    if (cardEditIsDirty) {
      setIsDiscardCardEditModalOpen(true);
    } else {
      setEditingCardItem(null);
    }
  };

  // Machine Type Inline Rename Handlers
  const handleStartInlineRename = (machineId: string, typeName: string) => {
    setInlineRenamingType({ machineId, oldTypeName: typeName });
    setInlineRenameValue(typeName);
    setInlineRenameError('');
    setActiveTypeMenu(null);
  };

  const handleSaveInlineRename = () => {
    if (!inlineRenamingType) return;
    const trimmed = inlineRenameValue.trim();
    if (!trimmed) {
      setInlineRenameError('Machine type name cannot be blank');
      return;
    }
    const mach = masterMachines.find((m) => m.id === inlineRenamingType.machineId);
    if (!mach) return;

    if (trimmed !== inlineRenamingType.oldTypeName && mach.types.includes(trimmed)) {
      setInlineRenameError('A machine type with this name already exists in this folder');
      return;
    }

    renameMachineType(inlineRenamingType.machineId, inlineRenamingType.oldTypeName, trimmed);
    if (selectedMachineType === inlineRenamingType.oldTypeName) {
      setSelectedMachineType(trimmed);
    }
    setInlineRenamingType(null);
    setInlineRenameError('');
  };

  // Edit Machine Type Details Handlers
  const handleOpenEditTypeDetails = (machineId: string, typeName: string) => {
    const mach = masterMachines.find((m) => m.id === machineId);
    const meta = mach?.typeDetails?.[typeName];
    const isArchived = mach?.archivedTypes?.includes(typeName) || meta?.isArchived || false;
    setEditTypeDetailsModalData({
      machineId,
      typeName,
      name: typeName,
      parentFolderId: machineId,
      modelVariant: meta?.modelVariant || 'Standard',
      description: meta?.description || '',
      internalCode: meta?.internalCode || '',
      status: isArchived ? 'Archived' : 'Active',
    });
    setActiveTypeMenu(null);
  };

  const handleSaveEditTypeDetails = () => {
    if (!editTypeDetailsModalData) return;
    const { machineId, typeName, name, parentFolderId, modelVariant, description, internalCode, status } = editTypeDetailsModalData;
    const trimmedName = name.trim();
    if (!trimmedName) return;

    let currentTypeName = typeName;
    if (trimmedName !== typeName) {
      renameMachineType(machineId, typeName, trimmedName);
      if (selectedMachineType === typeName) {
        setSelectedMachineType(trimmedName);
      }
      currentTypeName = trimmedName;
    }

    let currentMachineId = machineId;
    if (parentFolderId && parentFolderId !== machineId) {
      moveMachineType(machineId, parentFolderId, currentTypeName);
      currentMachineId = parentFolderId;
    }

    updateMachineTypeDetails(currentMachineId, currentTypeName, {
      modelVariant,
      description,
      internalCode,
      isArchived: status === 'Archived',
    });

    if (status === 'Archived') {
      archiveMachineType(currentMachineId, currentTypeName, true);
    } else {
      archiveMachineType(currentMachineId, currentTypeName, false);
    }

    setEditTypeDetailsModalData(null);
  };

  // Duplicate Machine Type Handler
  const handleOpenDuplicateType = (machineId: string, typeName: string) => {
    setDuplicateTypeModalData({
      machineId,
      sourceTypeName: typeName,
      newTypeName: `${typeName} (Copy)`,
      copyBOMs: true,
    });
    setActiveTypeMenu(null);
  };

  const handleSaveDuplicateType = () => {
    if (!duplicateTypeModalData) return;
    const { machineId, sourceTypeName, newTypeName, copyBOMs } = duplicateTypeModalData;
    const trimmed = newTypeName.trim();
    if (!trimmed) return;
    duplicateMachineType(machineId, sourceTypeName, trimmed, copyBOMs);
    setDuplicateTypeModalData(null);
    setSelectedMachineType(trimmed);
  };

  // Move Machine Type Handler
  const handleOpenMoveType = (machineId: string, typeName: string) => {
    const otherMachines = masterMachines.filter((m) => m.id !== machineId);
    setMoveTypeModalData({
      sourceMachineId: machineId,
      typeName,
      targetMachineId: otherMachines[0]?.id || machineId,
    });
    setActiveTypeMenu(null);
  };

  const handleSaveMoveType = () => {
    if (!moveTypeModalData) return;
    const { sourceMachineId, typeName, targetMachineId } = moveTypeModalData;
    if (sourceMachineId === targetMachineId) return;
    moveMachineType(sourceMachineId, targetMachineId, typeName);
    setSelectedMachineId(targetMachineId);
    setMoveTypeModalData(null);
  };

  // Delete Machine Type Handler
  const handleOpenDeleteType = (machineId: string, typeName: string) => {
    const mach = masterMachines.find((m) => m.id === machineId);
    const linked = masterBOMs.filter(
      (b) => b.machineName === mach?.name && b.machineType === typeName
    );
    setDeleteTypeConfirmModalData({
      machineId,
      typeName,
      linkedBOMs: linked,
    });
    setActiveTypeMenu(null);
  };

  const handleConfirmDeleteType = () => {
    if (!deleteTypeConfirmModalData) return;
    const { machineId, typeName } = deleteTypeConfirmModalData;
    deleteMachineType(machineId, typeName);
    if (selectedMachineType === typeName) {
      const remaining = masterMachines.find((m) => m.id === machineId)?.types.filter((t) => t !== typeName);
      setSelectedMachineType(remaining?.[0] || '');
    }
    setDeleteTypeConfirmModalData(null);
  };

  const handleConfirmArchiveInstead = () => {
    if (!deleteTypeConfirmModalData) return;
    const { machineId, typeName } = deleteTypeConfirmModalData;
    archiveMachineType(machineId, typeName, true);
    setDeleteTypeConfirmModalData(null);
  };

  const handleBulkDuplicate = () => {
    if (selectedRowIds.length === 0) return;
    const clones: MasterBOMItem[] = [];
    editorItems.forEach((r) => {
      if (selectedRowIds.includes(r.id)) {
        clones.push({
          ...r,
          id: `mbi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          srNo: srNoMode === 'auto' ? '' : r.srNo,
          description: `${r.description} (Copy)`,
        });
      }
    });
    pushToHistory([...editorItems, ...clones]);
    setSelectedRowIds([]);
  };

  // Renumbering Rows Preview & Execute
  const handleExecuteRenumber = () => {
    const updated = editorItems.map((r, i) => {
      const num = renumberStartAt + i;
      const sr = renumberPrefix ? `${renumberPrefix}${num}` : num;
      return { ...r, srNo: sr };
    });
    pushToHistory(updated);
    setIsRenumberModalOpen(false);
  };

  // ---------------------------------------------------------------------------
  // SAVE BOM CHANGES HANDLER
  // ---------------------------------------------------------------------------
  const handleSaveActiveBOM = async () => {
    if (!activeBOM) return;
    setSaveStatus('saving');
    setSaveErrorMsg('');

    try {
      const updatedRecord: MasterBOM = {
        ...activeBOM,
        name: editorBOMName.trim() || activeBOM.name,
        assemblyName: editorBOMName.trim() || activeBOM.name,
        bomNumber: editorBOMNumber.trim() || activeBOM.bomNumber,
        revision: editorRevision.trim() || activeBOM.revision,
        status: editorStatus,
        items: editorItems,
        updatedBy: currentUser?.name || 'Authorized Engineer',
        updatedAt: new Date().toISOString(),
      };

      await updateMasterBOM(activeBOM.id, updatedRecord);
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      confetti({ particleCount: 35, spread: 50, origin: { y: 0.15 } });
    } catch (err: any) {
      setSaveStatus('failed');
      setSaveErrorMsg(err?.message || 'Failed to persist BOM to database.');
    }
  };

  // Open focused editor for a BOM
  const handleOpenBOM = (bom: MasterBOM) => {
    setActiveBOMId(bom.id);
    setCurrentView('editor');
    pushNavStep({
      tab: 'bom',
      subView: 'editor',
      bomId: bom.id,
    });
    // Ensure machine & type match
    const mach = masterMachines.find((m) => m.name === bom.machineName);
    if (mach) {
      setSelectedMachineId(mach.id);
      setSelectedMachineType(bom.machineType);
    }
  };

  // Close editor and return to machine library
  const handleBackToLibrary = () => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes in this BOM. Are you sure you want to return to the library without saving?')) {
        return;
      }
    }
    setCurrentView('library');
    pushNavStep({
      tab: 'bom',
      subView: 'library',
    });
  };

  // ---------------------------------------------------------------------------
  // EXCEL IMPORT WORKFLOW (Guided 5 Steps)
  // ---------------------------------------------------------------------------
  const handleStartImportModal = () => {
    setImportStep(1);
    setImportRawRows([]);
    setImportFileHeaders([]);
    setImportParsedPreview([]);
    setImportFileName('');
    setImportColumnMapping({
      srNo: '',
      description: '',
      materialType: '',
      sizeSpecs: '',
      quantity: '',
      unit: '',
      category: '',
      notes: '',
    });
    setIsImportModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (!data || data.length < 2) {
          alert('Spreadsheet is empty or does not contain header row.');
          return;
        }

        // Header row
        const headers = (data[0] || []).map((h) => String(h || '').trim()).filter(Boolean);
        setImportFileHeaders(headers);

        // Convert data rows to objects
        const rawRows: Record<string, any>[] = [];
        for (let i = 1; i < data.length; i++) {
          const rowArr = data[i];
          if (!rowArr || rowArr.length === 0) continue;
          const obj: Record<string, any> = {};
          headers.forEach((h, colIdx) => {
            obj[h] = rowArr[colIdx];
          });
          rawRows.push(obj);
        }
        setImportRawRows(rawRows);

        // Auto-detect column mapping
        const autoMap = {
          srNo: headers.find((h) => /sr|s\.no|sl|item\s*no|serial/i.test(h)) || '',
          description: headers.find((h) => /desc|part|name|item\s*desc/i.test(h)) || headers[0] || '',
          materialType: headers.find((h) => /mat|grade|type|raw/i.test(h)) || '',
          sizeSpecs: headers.find((h) => /size|dim|spec|thk|thick/i.test(h)) || '',
          quantity: headers.find((h) => /qty|quantity|count|nos/i.test(h)) || '',
          unit: headers.find((h) => /unit|uom/i.test(h)) || '',
          category: headers.find((h) => /cat|group|section/i.test(h)) || '',
          notes: headers.find((h) => /note|remark|comment/i.test(h)) || '',
        };
        setImportColumnMapping(autoMap);
        setImportStep(2);
      } catch (err: any) {
        alert(`Error reading Excel file: ${err.message}`);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleConfirmMapping = () => {
    // Generate preview rows
    const items: MasterBOMItem[] = [];
    let validCount = 0;
    let incompleteCount = 0;

    importRawRows.forEach((row, i) => {
      const sr = importColumnMapping.srNo ? row[importColumnMapping.srNo] : i + 1;
      const desc = String(row[importColumnMapping.description] || '').trim();
      const type = String(row[importColumnMapping.materialType] || 'SS Flat').trim();
      const size = String(row[importColumnMapping.sizeSpecs] || '-').trim();
      const qVal = parseFloat(String(row[importColumnMapping.quantity] || '1').replace(/[^0-9.]/g, ''));
      const qty = isNaN(qVal) || qVal <= 0 ? 1 : qVal;
      const unit = String(row[importColumnMapping.unit] || 'Nos').trim();
      const cat = String(row[importColumnMapping.category] || 'General').trim();
      const notes = String(row[importColumnMapping.notes] || '').trim();

      if (!desc) {
        incompleteCount++;
      } else {
        validCount++;
      }

      items.push({
        id: `imp-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        srNo: sr !== undefined && sr !== null && String(sr).trim() !== '' ? sr : i + 1,
        description: desc || `Part ${i + 1}`,
        materialType: type || 'SS Flat',
        sizeSpecs: size || '-',
        quantity: qty,
        unit: unit || 'Nos',
        category: cat,
        notes: notes,
      });
    });

    setImportParsedPreview(items);
    setImportStats({
      total: items.length,
      valid: validCount,
      incomplete: incompleteCount,
      duplicates: 0,
    });
    setImportStep(3);
  };

  const handleExecuteImport = () => {
    if (importParsedPreview.length === 0) return;

    if (importMode === 'replace') {
      if (!confirm(`Are you sure you want to REPLACE all existing ${editorItems.length} material rows with ${importParsedPreview.length} imported rows?`)) {
        return;
      }
      pushToHistory(importParsedPreview);
    } else {
      pushToHistory([...editorItems, ...importParsedPreview]);
    }

    setImportStep(5);
    confetti({ particleCount: 30, spread: 60 });
  };

  // ---------------------------------------------------------------------------
  // PASTE FROM CLIPBOARD HANDLER
  // ---------------------------------------------------------------------------
  const handleExecutePaste = () => {
    if (!pasteRawText.trim()) return;
    const lines = pasteRawText.trim().split(/\r?\n/);
    const newItems: MasterBOMItem[] = [];

    lines.forEach((line, i) => {
      const cols = line.split('\t');
      if (cols.length === 0 || !cols[0]?.trim()) return;

      // Handle either: Sr, Desc, Type, Size, Qty, Unit OR Desc, Type, Size, Qty, Unit
      let sr: string | number = getNextSrNo();
      let desc = cols[0].trim();
      let type = 'SS Flat';
      let size = '-';
      let qty = 1;
      let unit = 'Nos';
      let cat = 'Mechanical';
      let notes = '';

      if (cols.length >= 5) {
        if (!isNaN(Number(cols[0]))) {
          sr = cols[0].trim();
          desc = cols[1]?.trim() || '';
          type = cols[2]?.trim() || 'SS Flat';
          size = cols[3]?.trim() || '-';
          qty = parseFloat(cols[4]) || 1;
          unit = cols[5]?.trim() || 'Nos';
          cat = cols[6]?.trim() || 'Mechanical';
          notes = cols[7]?.trim() || '';
        } else {
          desc = cols[0]?.trim() || '';
          type = cols[1]?.trim() || 'SS Flat';
          size = cols[2]?.trim() || '-';
          qty = parseFloat(cols[3]) || 1;
          unit = cols[4]?.trim() || 'Nos';
          cat = cols[5]?.trim() || 'Mechanical';
          notes = cols[6]?.trim() || '';
        }
      }

      newItems.push({
        id: `paste-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        srNo: sr,
        description: desc,
        materialType: type,
        sizeSpecs: size,
        quantity: qty,
        unit: unit,
        category: cat,
        notes: notes,
      });
    });

    if (newItems.length > 0) {
      pushToHistory([...editorItems, ...newItems]);
      setIsPasteModalOpen(false);
      setPasteRawText('');
    } else {
      alert('Could not parse any rows from pasted text. Please paste tab-separated rows from Excel.');
    }
  };

  // ---------------------------------------------------------------------------
  // EXCEL & CSV EXPORT HANDLERS
  // ---------------------------------------------------------------------------
  const handleExportCurrentBOM = (format: 'xlsx' | 'csv', onlySelected: boolean = false) => {
    if (!activeBOM) return;
    const itemsToExport = onlySelected && selectedRowIds.length > 0
      ? editorItems.filter((it) => selectedRowIds.includes(it.id))
      : editorItems;

    const data = itemsToExport.map((it) => ({
      'Sr. No.': it.srNo,
      'Part Description': it.description,
      'Material Type': it.materialType,
      'Size Specification': it.sizeSpecs,
      'Quantity': it.quantity,
      'Unit': it.unit,
      'Category': it.category || 'General',
      'Notes': it.notes || '',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BOM Specification');

    const cleanName = (activeBOM.name || 'BOM').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${cleanName}_${activeBOM.revision || 'RevA'}.${format}`;

    if (format === 'csv') {
      XLSX.writeFile(wb, filename, { bookType: 'csv' });
    } else {
      XLSX.writeFile(wb, filename);
    }
  };

  const handleDownloadBlankTemplate = () => {
    const templateData = [
      {
        'Sr. No.': '1',
        'Part Description': 'Main Mounting Strip',
        'Material Type': 'SS Flat',
        'Size Specification': '80 x 6 x 485',
        'Quantity': 4,
        'Unit': 'Nos',
        'Category': 'Frame Structure',
        'Notes': 'Grade 304 laser cut',
      },
      {
        'Sr. No.': '2',
        'Part Description': 'Feed Piping Tube',
        'Material Type': 'SS Pipe',
        'Size Specification': '25 mm NB',
        'Quantity': 6,
        'Unit': 'Meter',
        'Category': 'Piping',
        'Notes': 'Seamless mirror finish',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'BOM Template');
    XLSX.writeFile(wb, 'RSB_Master_BOM_Standard_Template.xlsx');
  };

  // ---------------------------------------------------------------------------
  // DIRECT LOAD INTO PROJECT WORKFLOW (Requirement 9)
  // ---------------------------------------------------------------------------
  const handleOpenLoadToProjectModal = () => {
    if (!activeBOM) return;
    setLoadProjStep(1);
    const initialDest = projects[0]?.name || '';
    setLoadDestProjectName(initialDest);
    setLoadIsNewProject(false);
    setLoadNewProjectName('');
    const targetPrj = projects[0];
    setLoadPONumber(targetPrj?.poNumber || activeBOM.bomNumber || '');
    setLoadPODate(getTodayFormatted());
    setLoadVendor('');
    setLoadExistingMode('append');
    setLoadPreserveSrNo(false);
    setLoadSkipDuplicates(true);
    setLoadSrNoMode('auto');

    const existingInit = projectRequirements.filter(
      (r) => (r.projectName || '').trim().toLowerCase() === initialDest.toLowerCase()
    );
    const maxSrInit = existingInit.reduce((max, r) => {
      const n = typeof r.srNo === 'number' ? r.srNo : parseInt(String(r.srNo).replace(/[^0-9]/g, ''), 10);
      return !isNaN(n) && n > max ? n : max;
    }, 0);
    setLoadManualStartingSrNo(maxSrInit + 1);

    // Initial item selections: select all active items
    const selMap: Record<string, boolean> = {};
    const qtyMap: Record<string, number> = {};
    editorItems.forEach((it) => {
      selMap[it.id] = true;
      qtyMap[it.id] = it.quantity;
    });
    setLoadSelectedMaterials(selMap);
    setLoadCustomQuantities(qtyMap);

    setIsLoadToProjectModalOpen(true);
  };

  const handleExecuteLoadToProject = async () => {
    if (!activeBOM) return;

    // Validate destination project name
    const finalProjectName = loadIsNewProject ? loadNewProjectName.trim() : loadDestProjectName.trim();
    if (!finalProjectName) {
      alert('Please select or specify a destination Project Name.');
      return;
    }

    // Filter selected items
    const selectedItems = editorItems.filter((it) => loadSelectedMaterials[it.id]);
    if (selectedItems.length === 0) {
      alert('Please select at least one material to load into the project.');
      return;
    }

    // Create new project if requested
    if (loadIsNewProject) {
      const newProjObj: ProjectItem = {
        id: `proj-${Date.now()}`,
        projectNumber: `PRJ-${Date.now().toString().slice(-4)}`,
        name: finalProjectName,
        customer: 'Factory Internal',
        clientName: 'Factory Internal',
        orderSource: 'Customer PO',
        machineName: activeBOM.machineName,
        machineType: activeBOM.machineType as any,
        poNumber: loadPONumber || 'PO-MANUAL',
        date: loadPODate,
        startDate: loadPODate,
        targetCompletionDate: loadPODate,
        priority: 'medium',
        status: 'Production',
        projectValue: 0,
        progressPct: 0,
      };
      addProject(newProjObj);
    }

    // Find existing requirements for destination project
    const existingForProject = projectRequirements.filter(
      (r) => (r.projectName || '').trim().toLowerCase() === finalProjectName.toLowerCase()
    );

    // Filter duplicates if enabled
    let itemsToInsert = selectedItems;
    if (loadExistingMode === 'append' && loadSkipDuplicates) {
      itemsToInsert = selectedItems.filter((it) => {
        const isDup = existingForProject.some(
          (er) =>
            er.description.trim().toLowerCase() === it.description.trim().toLowerCase() &&
            er.sizeSpecs.trim().toLowerCase() === it.sizeSpecs.trim().toLowerCase()
        );
        return !isDup;
      });
      if (itemsToInsert.length === 0) {
        alert('All selected materials already exist in this project. Uncheck "Skip duplicate rows" if you wish to append them again.');
        return;
      }
    }

    // Build project material records: auto or manual adjustment according to material entry station
    const maxExistingSrNo = existingForProject.reduce((max, r) => {
      const n = typeof r.srNo === 'number' ? r.srNo : parseInt(String(r.srNo).replace(/[^0-9]/g, ''), 10);
      return !isNaN(n) && n > max ? n : max;
    }, 0);

    const baseSrNo = loadExistingMode === 'replace'
      ? 0
      : (loadSrNoMode === 'auto' ? maxExistingSrNo : Math.max(0, Number(loadManualStartingSrNo) - 1));

    const newProjectRequirements: ProjectMaterialRequirementItem[] = itemsToInsert.map((it, idx) => {
      const customQty = loadCustomQuantities[it.id] !== undefined ? loadCustomQuantities[it.id] : it.quantity;
      const sr = baseSrNo + idx + 1;

      return {
        id: `req-bom-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
        projectName: finalProjectName,
        customerName: 'Factory Internal',
        poNumber: loadPONumber || 'PO-MANUAL',
        poDate: loadPODate,
        date: loadPODate,
        srNo: sr,
        description: it.description,
        materialType: (it.materialType as MaterialType) || 'SS Flat',
        materialGrade: 'SS 304',
        sizeSpecs: it.sizeSpecs || '-',
        quantity: Number(customQty) > 0 ? Number(customQty) : 1,
        unit: it.unit || 'Nos',
        vendorName: it.vendor || it.recommendedVendor || loadVendor || 'Manav Metal',
        vendor: it.vendor || it.recommendedVendor || loadVendor || 'Manav Metal',
        orderedBy: it.orderedBy || currentUser?.name || 'Amit',
        orderSource: 'Customer PO',
        productionStatus: 'In Production',
        stockStatus: 'Available',
        qcStatus: 'Passed',
        dispatchStatus: 'Ready',
        bomRef: activeBOM.bomNumber || '',
        availableStock: 0,
        shortageQty: 0,
        materialCost: 0,
        laborCost: 0,
        machineCost: 0,
        outsourcingCost: 0,
        totalCost: 0,
        machineType: (activeBOM.machineType || activeBOM.machineName || 'Rotary Machine') as any,
        machineName: activeBOM.machineName,
        notes: it.notes || '',
      };
    });

    // Update context & database
    let nextReqList: ProjectMaterialRequirementItem[];
    if (loadExistingMode === 'replace') {
      nextReqList = [
        ...projectRequirements.filter((r) => (r.projectName || '').trim().toLowerCase() !== finalProjectName.toLowerCase()),
        ...newProjectRequirements,
      ];
    } else {
      nextReqList = [...projectRequirements, ...newProjectRequirements];
    }

    setProjectRequirements(nextReqList);
    await dbBulkUpsertRequirements(newProjectRequirements);

    // Save project draft in localStorage for immediate sync in Material Entry Workstation
    localStorage.setItem('RSB_SELECTED_PROJECT_NAME', finalProjectName);
    localStorage.setItem(`RSB_PROJECT_DRAFT_${finalProjectName}`, JSON.stringify(newProjectRequirements));

    setIsLoadToProjectModalOpen(false);
    confetti({ particleCount: 50, spread: 80, origin: { y: 0.2 } });

    // Switch directly to Material Entry Workstation
    setActiveTab('entry');
  };

  // ---------------------------------------------------------------------------
  // REVISION WORKFLOW HANDLERS
  // ---------------------------------------------------------------------------
  const handleDuplicateAsNewRevision = () => {
    if (!activeBOM) return;
    const nextRevChar = String.fromCharCode(activeBOM.revision.charCodeAt(activeBOM.revision.length - 1) + 1);
    const suggestedRev = activeBOM.revision.startsWith('Rev ') ? `Rev ${nextRevChar}` : `${activeBOM.revision}.1`;

    const newRevBOM: MasterBOM = {
      ...activeBOM,
      id: `bom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: `${activeBOM.name} (${suggestedRev})`,
      revision: suggestedRev,
      status: 'Draft',
      items: editorItems.map((it) => ({
        ...it,
        id: `mbi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      })),
      createdBy: currentUser?.name || 'Engineer',
      createdAt: new Date().toISOString(),
      updatedBy: currentUser?.name || 'Engineer',
      updatedAt: new Date().toISOString(),
    };

    addMasterBOM(newRevBOM);
    setActiveBOMId(newRevBOM.id);
    confetti({ particleCount: 30, spread: 50 });
  };

  const handleActivateRevision = async () => {
    if (!activeBOM) return;
    if (!confirm(`Are you sure you want to activate revision ${editorRevision} as the primary active specification?`)) return;

    setEditorStatus('Active');
    const updated: MasterBOM = {
      ...activeBOM,
      status: 'Active',
      revision: editorRevision,
      items: editorItems,
      updatedBy: currentUser?.name || 'Engineer',
      updatedAt: new Date().toISOString(),
    };
    await updateMasterBOM(activeBOM.id, updated);
    setHasUnsavedChanges(false);
    setSaveStatus('saved');
  };

  // Revision comparison difference computation
  const comparisonDiff = useMemo(() => {
    if (!isCompareModalOpen || !compareTargetBOMId) return null;
    const targetBOM = masterBOMs.find((b) => b.id === compareTargetBOMId);
    if (!targetBOM) return null;

    const baseItems = targetBOM.items || [];
    const currentItems = editorItems;

    const added: MasterBOMItem[] = [];
    const removed: MasterBOMItem[] = [];
    const modified: { old: MasterBOMItem; current: MasterBOMItem; changes: string[] }[] = [];

    // Map base items by description + sizeSpecs
    const baseMap = new Map<string, MasterBOMItem>();
    baseItems.forEach((b) => {
      baseMap.set(`${b.description.trim().toLowerCase()}:::${b.sizeSpecs.trim().toLowerCase()}`, b);
    });

    currentItems.forEach((c) => {
      const key = `${c.description.trim().toLowerCase()}:::${c.sizeSpecs.trim().toLowerCase()}`;
      if (baseMap.has(key)) {
        const b = baseMap.get(key)!;
        const changes: string[] = [];
        if (b.quantity !== c.quantity) changes.push(`Qty: ${b.quantity} → ${c.quantity}`);
        if (b.materialType !== c.materialType) changes.push(`Type: ${b.materialType} → ${c.materialType}`);
        if (b.unit !== c.unit) changes.push(`Unit: ${b.unit} → ${c.unit}`);
        if (b.srNo !== c.srNo) changes.push(`Sr: ${b.srNo} → ${c.srNo}`);

        if (changes.length > 0) {
          modified.push({ old: b, current: c, changes });
        }
        baseMap.delete(key);
      } else {
        added.push(c);
      }
    });

    baseMap.forEach((b) => {
      removed.push(b);
    });

    return { added, removed, modified, targetName: targetBOM.name, targetRev: targetBOM.revision };
  }, [isCompareModalOpen, compareTargetBOMId, editorItems, masterBOMs]);

  // ---------------------------------------------------------------------------
  // ADDITIONAL WHITE THEME HELPERS & MEMOS
  // ---------------------------------------------------------------------------
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    editorItems.forEach((it) => {
      if (it.category?.trim()) set.add(it.category.trim());
    });
    return Array.from(set).sort();
  }, [editorItems]);

  const availableMaterialTypes = useMemo(() => {
    const set = new Set<string>();
    editorItems.forEach((it) => {
      if (it.materialType?.trim()) set.add(it.materialType.trim());
    });
    return Array.from(set).sort();
  }, [editorItems]);

  const handleRenameMachineSubmit = () => {
    if (!renameMachineModalData || !renameMachineModalData.name.trim()) return;
    updateMachineFolder(renameMachineModalData.id, { name: renameMachineModalData.name.trim() });
    setRenameMachineModalData(null);
  };

  // ===========================================================================
  // RENDER: CLEAN WHITE THEME INTERFACE (EASY TO UNDERSTAND & MODERN)
  // ===========================================================================
  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] bg-[#f8fafc] text-slate-900 selection:bg-blue-600 selection:text-white font-sans">
      {/* --------------------------------------------------------------------- */}
      {/* VIEW A: DEDICATED BOM SECTION & MACHINE PORTFOLIO (FULL-WIDTH CARD VIEW) */}
      {/* --------------------------------------------------------------------- */}
      {currentView === 'library' && (
        <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-6 space-y-6 select-text">
          {/* ========================================================================= */}
          {/* 1. SIMPLIFIED PAGE HEADER */}
          {/* ========================================================================= */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    BOM Management
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold">
                    {masterMachines.length} machine folders &bull; {masterBOMs.length} BOMs
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  Manage machine specifications and reuse materials across projects.
                </p>
              </div>

              {/* Header Actions: Only TWO prominent buttons + More menu */}
              <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                {/* Primary Action: + New BOM */}
                <button
                  type="button"
                  onClick={() => handleOpenNewBOMModal()}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ New BOM</span>
                </button>

                {/* Secondary Action: Import Excel */}
                <button
                  type="button"
                  onClick={handleStartImportModal}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Import Excel</span>
                </button>

                {/* More ▾ Menu */}
                <div className="relative header-more-menu-container">
                  <button
                    type="button"
                    onClick={() => setIsHeaderMoreMenuOpen(!isHeaderMoreMenuOpen)}
                    className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <span>More</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  </button>

                  {isHeaderMoreMenuOpen && (
                    <div
                      onClick={() => setIsHeaderMoreMenuOpen(false)}
                      className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white border border-slate-200 shadow-xl py-1.5 z-40 text-xs text-slate-700"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setNewMachineNameInput('');
                          setNewMachineTypeInput('1. Filling');
                          setIsNewMachineModalOpen(true);
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 font-medium cursor-pointer"
                      >
                        <FolderPlus className="w-4 h-4 text-blue-600" />
                        <span>+ New Machine Folder</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSyncFactoryFolders}
                        className="w-full text-left px-3.5 py-2 hover:bg-amber-50 flex items-center gap-2.5 font-medium text-amber-800 cursor-pointer"
                        title="Load real folder structure: Filling machine & LABELLING MACHINE AMIT with all assemblies"
                      >
                        <Sparkles className="w-4 h-4 text-amber-600" />
                        <span>⚡ Load Factory Folders</span>
                      </button>
                      <div className="border-t border-slate-100 my-1" />
                      <button
                        type="button"
                        onClick={() => handleExportCurrentBOM('xlsx')}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 font-medium cursor-pointer"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                        <span>Export to Excel (.xlsx)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportCurrentBOM('csv')}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 font-medium cursor-pointer"
                      >
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span>Export to CSV (.csv)</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadBlankTemplate}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 font-medium cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-amber-600" />
                        <span>Download Blank Template</span>
                      </button>
                      <div className="border-t border-slate-100 my-1" />
                      <button
                        type="button"
                        onClick={() => setIsHelpModalOpen(true)}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 font-medium cursor-pointer"
                      >
                        <HelpCircle className="w-4 h-4 text-slate-500" />
                        <span>Help &amp; Documentation</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. COMPACT SEARCH & FILTER BAR */}
          {/* ========================================================================= */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              {/* Single Compact Search Field */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={globalSearch}
                  onChange={(e) => setGlobalSearch(e.target.value)}
                  placeholder="Search machines, BOM names, or material specifications..."
                  className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 focus:border-blue-600 outline-none shadow-2xs font-medium"
                />
                {globalSearch && (
                  <button
                    type="button"
                    onClick={() => setGlobalSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Small Filter Popover Button */}
              <div className="relative filter-menu-container">
                <button
                  type="button"
                  onClick={() => setIsFilterMenuOpen(!isFilterMenuOpen)}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                    statusFilter !== 'all' || sortBy !== 'updated'
                      ? 'bg-blue-50 text-blue-700 border-blue-300'
                      : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                  }`}
                  title="Filter & Sort"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  <span className="hidden sm:inline">Filters</span>
                  {(statusFilter !== 'all' || sortBy !== 'updated') && (
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                  )}
                </button>

                {isFilterMenuOpen && (
                  <div className="absolute right-0 mt-1.5 w-64 rounded-xl bg-white border border-slate-200 shadow-xl p-4 z-40 text-xs space-y-3.5 text-slate-800">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Status
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(['all', 'Active', 'Draft', 'Archived'] as const).map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              setStatusFilter(s);
                              setIsFilterMenuOpen(false);
                            }}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer text-center ${
                              statusFilter === s
                                ? 'bg-blue-600 text-white font-bold shadow-2xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            {s === 'all' ? 'All Status' : s}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3">
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Sort By
                      </label>
                      <div className="space-y-1">
                        {[
                          { id: 'updated', label: 'Last Updated' },
                          { id: 'name', label: 'Name (A-Z)' },
                          { id: 'parts', label: 'Parts Count' },
                        ].map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => {
                              setSortBy(opt.id as any);
                              setIsFilterMenuOpen(false);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-between cursor-pointer ${
                              sortBy === opt.id
                                ? 'bg-blue-50 text-blue-700 font-bold'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {sortBy === opt.id && <Check className="w-3.5 h-3.5 text-blue-600" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {(statusFilter !== 'all' || sortBy !== 'updated') && (
                      <div className="border-t border-slate-100 pt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setStatusFilter('all');
                            setSortBy('updated');
                            setIsFilterMenuOpen(false);
                          }}
                          className="text-[11px] text-blue-600 hover:underline font-bold cursor-pointer"
                        >
                          Reset Filters
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Card View / Table View Toggle */}
              <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 shrink-0">
                <button
                  type="button"
                  onClick={() => setLibraryViewMode('cards')}
                  title="Card View"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    libraryViewMode === 'cards'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'hover:text-slate-900 text-slate-500'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setLibraryViewMode('table')}
                  title="Table View"
                  className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                    libraryViewMode === 'table'
                      ? 'bg-white text-slate-900 shadow-2xs font-bold'
                      : 'hover:text-slate-900 text-slate-500'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Removable Filter Chips */}
            {(statusFilter !== 'all' || globalSearch.trim()) && (
              <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
                <span className="text-slate-400 font-medium text-[11px]">Active Filters:</span>
                {globalSearch.trim() && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-xs font-medium">
                    Search: "{globalSearch.trim()}"
                    <button
                      type="button"
                      onClick={() => setGlobalSearch('')}
                      className="hover:text-blue-950 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {statusFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium">
                    Status: {statusFilter}
                    <button
                      type="button"
                      onClick={() => setStatusFilter('all')}
                      className="hover:text-slate-900 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setGlobalSearch('');
                    setStatusFilter('all');
                    setSortBy('updated');
                  }}
                  className="text-[11px] text-blue-600 hover:underline font-bold cursor-pointer ml-1"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* 3. SCREEN CONTENT: CHOOSE A MACHINE vs FOCUSED WORKSPACE */}
          {/* ========================================================================= */}
          {selectedMachineId === 'ALL' && !globalSearch.trim() ? (
            /* --------------------------------------------------------------------- */
            /* 3A. ROOT SCREEN: CHOOSE A MACHINE */
            /* --------------------------------------------------------------------- */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <span>Choose a Machine</span>
                </h2>
                <span className="text-xs text-slate-400 font-medium hidden sm:inline">
                  Select a machine folder to view and edit its specifications
                </span>
              </div>

              {/* Responsive Grid of Machine Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {masterMachines.map((m) => {
                  const bomsCount = masterBOMs.filter((b) => b.machineName === m.name).length;
                  const modelsCount = (m.types || []).length;
                  const isMenuOpen = activeMachineMenu === m.id;

                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        setSelectedMachineId(m.id);
                        setSelectedMachineType('ALL');
                      }}
                      className="group relative bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between min-h-[140px]"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-3">
                          {/* Machine Icon in rounded blue container */}
                          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-blue-600 group-hover:text-white transition-all">
                            <Folder className="w-5 h-5" />
                          </div>

                          {/* 3-Dot Options Menu */}
                          <div className="relative machine-menu-container">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMachineMenu(isMenuOpen ? null : m.id);
                              }}
                              title="Machine Options"
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {isMenuOpen && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className="absolute right-0 top-full mt-1 w-44 rounded-xl bg-white border border-slate-200 shadow-xl py-1.5 z-40 text-xs text-slate-700"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMachineMenu(null);
                                    setRenameMachineModalData({ id: m.id, name: m.name });
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 font-medium cursor-pointer"
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                                  <span>Rename Folder</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMachineMenu(null);
                                    setNewTypeModalData({ machineId: m.id, machineName: m.name });
                                    setNewTypeNameInput('');
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 font-medium cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                                  <span>+ Add Model</span>
                                </button>
                                <div className="border-t border-slate-100 my-1" />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMachineMenu(null);
                                    setDeleteMachineModalData(m);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-rose-50 flex items-center gap-2 font-medium text-rose-700 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Archive / Delete</span>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Machine Name */}
                        <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                          {m.name}
                        </h3>
                      </div>

                      {/* Badges / Counts */}
                      <div className="flex items-center gap-2 pt-3 border-t border-slate-100 text-xs mt-3">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200 text-[11px]">
                          {bomsCount} {bomsCount === 1 ? 'BOM' : 'BOMs'}
                        </span>
                        <span className="text-slate-400 text-[11px] font-medium">
                          {modelsCount} {modelsCount === 1 ? 'model' : 'models'}
                        </span>
                      </div>
                    </div>
                  );
                })}

                {/* + Add Machine Card at the end */}
                <button
                  type="button"
                  onClick={() => {
                    setNewMachineNameInput('');
                    setNewMachineTypeInput('Standard Model');
                    setIsNewMachineModalOpen(true);
                  }}
                  className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-white rounded-2xl p-5 transition-all cursor-pointer flex flex-col items-center justify-center text-center gap-2 min-h-[140px] group"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-blue-50 text-slate-500 group-hover:text-blue-600 flex items-center justify-center transition-all">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-700 group-hover:text-blue-600">
                      + Add Machine
                    </p>
                    <p className="text-[11px] text-slate-400">Create a new machine folder</p>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            /* --------------------------------------------------------------------- */
            /* 3B. FOCUSED SELECTED-MACHINE WORKSPACE (OR SEARCH RESULTS) */
            /* --------------------------------------------------------------------- */
            <div className="space-y-4">
              {currentMachine ? (
                selectedMachineType === 'ALL' ? (
                  /* ================================================================= */
                  /* MACHINE ROOT DIRECTORY VIEW: e.g. D:\Filling machine\           */
                  /* ================================================================= */
                  <div className="space-y-5">
                    {/* Machine Root Header Banner & Breadcrumb */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                      {/* Breadcrumb & Navigation */}
                      <div className="flex items-center justify-between">
                        <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMachineId('ALL');
                              setSelectedMachineType('ALL');
                            }}
                            className="hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            <span>BOM Management</span>
                          </button>
                          <span>/</span>
                          <span className="text-slate-900 font-bold flex items-center gap-1.5">
                            <Folder className="w-3.5 h-3.5 text-amber-500 fill-amber-100" />
                            <span>{currentMachine.name}</span>
                          </span>
                        </nav>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMachineId('ALL');
                            setSelectedMachineType('ALL');
                          }}
                          className="text-xs font-bold text-slate-600 hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>Back to Machine Catalog</span>
                        </button>
                      </div>

                      {/* Title & Actions Row */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                              <Folder className="w-6 h-6 fill-amber-100" />
                            </div>
                            <div>
                              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                <span>{currentMachine.name}</span>
                              </h2>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                                  D:\{currentMachine.name}\
                                </span>
                                <span className="text-xs text-slate-500 font-medium">
                                  {currentMachine.types.length} Assembly Subfolders · {currentMachineRootBOMs.length} Machine Files · {allCurrentMachineBOMs.length} Total Specifications
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Top Action Buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              setNewTypeModalData({ machineId: currentMachine.id, machineName: currentMachine.name });
                              setNewTypeNameInput('');
                            }}
                            className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                          >
                            <FolderPlus className="w-3.5 h-3.5 text-amber-700" />
                            <span>+ New Assembly Folder</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenNewBOMModal(currentMachine.name, 'General / Root')}
                            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ New BOM</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStartImportModal()}
                            className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Upload className="w-3.5 h-3.5 text-slate-500" />
                            <span>Import Excel</span>
                          </button>

                          {/* View Toggle */}
                          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
                            <button
                              type="button"
                              onClick={() => setLibraryViewMode('cards')}
                              title="Card Grid View"
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                                libraryViewMode === 'cards'
                                  ? 'bg-white text-blue-600 shadow-2xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              <LayoutGrid className="w-3.5 h-3.5" />
                              <span>Cards</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setLibraryViewMode('table')}
                              title="Windows Explorer Details View"
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                                libraryViewMode === 'table'
                                  ? 'bg-white text-blue-600 shadow-2xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              <TableIcon className="w-3.5 h-3.5" />
                              <span>Details</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => setRenameMachineModalData({ id: currentMachine.id, name: currentMachine.name })}
                            className="px-2.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                            title="Edit Machine Name"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* SECTION 1: ASSEMBLY SUBFOLDERS */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Folder className="w-4 h-4 text-amber-500 fill-amber-100" />
                          <h3 className="text-sm font-black text-slate-900 tracking-tight">
                            Assembly Subfolders ({currentMachine.types.length})
                          </h3>
                          <span className="text-xs text-slate-500 hidden sm:inline">
                            • Click any folder to view its components and blueprints
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setNewTypeModalData({ machineId: currentMachine.id, machineName: currentMachine.name });
                            setNewTypeNameInput('');
                          }}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Folder</span>
                        </button>
                      </div>

                      {libraryViewMode === 'cards' ? (
                        /* FOLDER CARDS GRID */
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                          {currentMachine.types.map((type) => {
                            const bomsInThisFolder = allCurrentMachineBOMs.filter((b) => b.machineType === type);
                            const count = bomsInThisFolder.length;
                            const isMenuOpen = activeTypeMenu === `${currentMachine.id}:${type}`;

                            return (
                              <div
                                key={type}
                                onClick={() => setSelectedMachineType(type)}
                                className="group/typecard relative bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md rounded-2xl p-4 transition-all cursor-pointer flex flex-col justify-between"
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 group-hover/typecard:bg-amber-100 transition-colors">
                                      <Folder className="w-6 h-6 fill-amber-100 group-hover/typecard:scale-105 transition-transform" />
                                    </div>

                                    {/* 3-Dot Options Menu */}
                                    <div className="relative type-menu-container">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveTypeMenu(isMenuOpen ? null : `${currentMachine.id}:${type}`);
                                        }}
                                        title="Folder Options"
                                        className={`p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer transition-opacity ${
                                          isMenuOpen ? 'opacity-100' : 'opacity-0 group-hover/typecard:opacity-100'
                                        }`}
                                      >
                                        <MoreVertical className="w-3.5 h-3.5" />
                                      </button>

                                      {isMenuOpen && (
                                        <div
                                          onClick={(e) => e.stopPropagation()}
                                          className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-white border border-slate-200 shadow-xl py-1 z-30 text-xs font-medium text-slate-700"
                                        >
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveTypeMenu(null);
                                              handleOpenEditTypeDetails(currentMachine.id, type);
                                            }}
                                            className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                          >
                                            <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                                            <span>Edit Details</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveTypeMenu(null);
                                              handleStartInlineRename(currentMachine.id, type);
                                            }}
                                            className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                          >
                                            <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                                            <span>Rename Folder</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveTypeMenu(null);
                                              handleOpenNewBOMModal(currentMachine.name, type);
                                            }}
                                            className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                          >
                                            <Plus className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>Add BOM in this Folder</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveTypeMenu(null);
                                              handleOpenDuplicateType(currentMachine.id, type);
                                            }}
                                            className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                          >
                                            <Copy className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>Duplicate Folder</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveTypeMenu(null);
                                              handleOpenMoveType(currentMachine.id, type);
                                            }}
                                            className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                          >
                                            <ArrowRight className="w-3.5 h-3.5 text-purple-600" />
                                            <span>Move to Another Machine</span>
                                          </button>
                                          <div className="border-t border-slate-100 my-1" />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              archiveMachineType(currentMachine.id, type, true);
                                              setActiveTypeMenu(null);
                                            }}
                                            className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                          >
                                            <Archive className="w-3.5 h-3.5 text-amber-600" />
                                            <span>Archive Folder</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setActiveTypeMenu(null);
                                              handleOpenDeleteType(currentMachine.id, type);
                                            }}
                                            className="w-full text-left px-3 py-1.5 hover:bg-rose-50 flex items-center gap-2 text-rose-600 cursor-pointer"
                                          >
                                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                            <span>Delete Folder</span>
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <h4 className="text-sm font-bold text-slate-900 group-hover/typecard:text-blue-600 transition-colors line-clamp-2">
                                    {type}
                                  </h4>
                                  <p className="text-xs text-slate-500 mt-1 font-medium">
                                    {count} {count === 1 ? 'specification' : 'specifications'}
                                  </p>
                                </div>

                                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400 group-hover/typecard:text-blue-600 transition-colors">
                                  <span>Open Folder</span>
                                  <ChevronRight className="w-3.5 h-3.5 group-hover/typecard:translate-x-1 transition-transform" />
                                </div>
                              </div>
                            );
                          })}

                          {/* + Add Assembly Folder Card */}
                          <button
                            type="button"
                            onClick={() => {
                              setNewTypeModalData({ machineId: currentMachine.id, machineName: currentMachine.name });
                              setNewTypeNameInput('');
                            }}
                            className="border-2 border-dashed border-slate-300 hover:border-amber-500 bg-slate-50/50 hover:bg-amber-50/30 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all group/add text-center min-h-[140px]"
                          >
                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 group-hover/add:border-amber-300 flex items-center justify-center text-slate-400 group-hover/add:text-amber-600 shadow-2xs">
                              <FolderPlus className="w-5 h-5" />
                            </div>
                            <span className="text-xs font-bold text-slate-700 group-hover/add:text-amber-900">
                              + Add Assembly Folder
                            </span>
                            <span className="text-[11px] text-slate-400">
                              e.g. 12. Conveyor or Panel
                            </span>
                          </button>
                        </div>
                      ) : (
                        /* EXPLORER DETAILS TABLE FOR FOLDERS */
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                                <th className="py-2.5 px-4">Name</th>
                                <th className="py-2.5 px-4">Type</th>
                                <th className="py-2.5 px-4 text-center">Specifications</th>
                                <th className="py-2.5 px-4">Date Modified</th>
                                <th className="py-2.5 px-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {currentMachine.types.map((type) => {
                                const bomsInThisFolder = allCurrentMachineBOMs.filter((b) => b.machineType === type);
                                const count = bomsInThisFolder.length;

                                return (
                                  <tr
                                    key={type}
                                    onClick={() => setSelectedMachineType(type)}
                                    className="hover:bg-amber-50/40 transition-colors cursor-pointer group"
                                  >
                                    <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                                      <Folder className="w-4 h-4 text-amber-500 fill-amber-100 shrink-0" />
                                      <span className="group-hover:text-blue-600">{type}</span>
                                    </td>
                                    <td className="py-3 px-4 text-slate-500 font-medium">File folder</td>
                                    <td className="py-3 px-4 text-center">
                                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full text-[11px]">
                                        {count} items
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-slate-500">29-10-2026</td>
                                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                      <button
                                        type="button"
                                        onClick={() => setSelectedMachineType(type)}
                                        className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs cursor-pointer inline-flex items-center gap-1"
                                      >
                                        <span>Open Folder</span>
                                        <ChevronRight className="w-3 h-3" />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* SECTION 2: MACHINE-LEVEL BOM FILES & LISTS */}
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                          <h3 className="text-sm font-black text-slate-900 tracking-tight">
                            Files in {currentMachine.name} ({currentMachineRootBOMs.length})
                          </h3>
                          <span className="text-xs text-slate-500 hidden sm:inline">
                            • Nut bolt lists, switchgear schedules &amp; root blueprints
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenNewBOMModal(currentMachine.name, 'General / Root')}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>+ New BOM File</span>
                        </button>
                      </div>

                      {currentMachineRootBOMs.length === 0 ? (
                        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-6 text-center space-y-2">
                          <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto" />
                          <p className="text-xs font-bold text-slate-700">No standalone root files yet</p>
                          <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                            Fastener nut bolt lists, electrical switchgear schedules, or bearing lists can be created directly here using the button below.
                          </p>
                          <button
                            type="button"
                            onClick={() => handleOpenNewBOMModal(currentMachine.name, 'General / Root')}
                            className="mt-2 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Create Nut Bolt / Root File</span>
                          </button>
                        </div>
                      ) : libraryViewMode === 'cards' ? (
                        /* ROOT BOM CARDS GRID */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {currentMachineRootBOMs.map((bom) => {
                            const partsCount = bom.items?.length || 0;
                            const unitSummary = computeBOMUnitSummary(bom.items || []);
                            const isActive = bom.status === 'Active' || bom.status === 'Approved';
                            const isCardMenuOpen = activeBOMCardMenu === bom.id;

                            return (
                              <div
                                key={bom.id}
                                onClick={() => handleOpenBOM(bom)}
                                className="group bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                              >
                                <div className="space-y-3">
                                  {/* Header: BOM Code & Rev, Status Badge, More Options 3-dots */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                                        <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                          {bom.bomNumber || 'BOM-001'}
                                        </span>
                                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                                          {bom.revision || 'Rev A'}
                                        </span>
                                      </div>

                                      <h3 className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                                        {bom.name}
                                      </h3>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                          isActive
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : bom.status === 'Draft'
                                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                                            : 'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}
                                      >
                                        {bom.status}
                                      </span>

                                      {/* 3-Dot More Menu */}
                                      <div className="relative bom-card-menu-container">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveBOMCardMenu(isCardMenuOpen ? null : bom.id);
                                          }}
                                          title="More options"
                                          className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                                        >
                                          <MoreVertical className="w-3.5 h-3.5" />
                                        </button>

                                        {isCardMenuOpen && (
                                          <div
                                            onClick={(e) => e.stopPropagation()}
                                            className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-white border border-slate-200 shadow-xl py-1 z-30 text-xs font-medium text-slate-700"
                                          >
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveBOMCardMenu(null);
                                                setDuplicateBOMModalData(bom);
                                                setDuplicateBOMNameInput(`${bom.name} (Copy)`);
                                                setDuplicateTargetMachine(bom.machineName);
                                                setDuplicateTargetType(bom.machineType);
                                              }}
                                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                            >
                                              <Copy className="w-3.5 h-3.5 text-blue-600" />
                                              <span>Duplicate BOM</span>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveBOMCardMenu(null);
                                                handleExportCurrentBOM('xlsx');
                                              }}
                                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                            >
                                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                              <span>Export Excel</span>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveBOMCardMenu(null);
                                                setCompareTargetBOMId(bom.id);
                                                setIsCompareModalOpen(true);
                                              }}
                                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                            >
                                              <GitCompare className="w-3.5 h-3.5 text-purple-600" />
                                              <span>Compare / History</span>
                                            </button>
                                            <div className="border-t border-slate-100 my-1" />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveBOMCardMenu(null);
                                                setDeleteBOMModalData(bom);
                                              }}
                                              className="w-full text-left px-3 py-1.5 hover:bg-rose-50 flex items-center gap-2 text-rose-600 cursor-pointer"
                                            >
                                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                              <span>Delete BOM</span>
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Specification Details Box */}
                                  <div className="space-y-1.5 text-xs bg-slate-50 border border-slate-100 rounded-xl p-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-500 font-sans text-xs flex items-center gap-1.5">
                                        <Boxes className="w-3.5 h-3.5 text-purple-600" />
                                        Materials:
                                      </span>
                                      <strong className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                                        {partsCount} Items ({unitSummary})
                                      </strong>
                                    </div>

                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-500 font-sans text-xs flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                        Updated:
                                      </span>
                                      <span className="text-slate-600 text-[11px] font-sans">
                                        {formatDate(bom.updatedAt || bom.createdAt)}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Actions Row: Open BOM (primary) & Load to Project */}
                                <div
                                  className="flex items-center gap-2 pt-4 border-t border-slate-100 mt-4"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleOpenBOM(bom)}
                                    className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer group/btn"
                                  >
                                    <span>Open BOM</span>
                                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover/btn:translate-x-0.5 transition-transform" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveBOMId(bom.id);
                                      handleOpenLoadToProjectModal();
                                    }}
                                    className="py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                    title="Load into manufacturing project"
                                  >
                                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                                    <span>Load to Project</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        /* EXPLORER DETAILS TABLE FOR ROOT FILES */
                        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                          <table className="w-full text-left border-collapse text-xs">
                            <thead>
                              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                                <th className="py-2.5 px-4">Name</th>
                                <th className="py-2.5 px-4">BOM Code &amp; Rev</th>
                                <th className="py-2.5 px-4">Type</th>
                                <th className="py-2.5 px-4 text-center">Materials</th>
                                <th className="py-2.5 px-4 text-center">Status</th>
                                <th className="py-2.5 px-4">Last Updated</th>
                                <th className="py-2.5 px-4 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {currentMachineRootBOMs.map((bom) => {
                                const partsCount = bom.items?.length || 0;
                                const unitSummary = computeBOMUnitSummary(bom.items || []);
                                const isActive = bom.status === 'Active' || bom.status === 'Approved';

                                return (
                                  <tr
                                    key={bom.id}
                                    onClick={() => handleOpenBOM(bom)}
                                    className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                  >
                                    <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                                      <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                                      <span className="group-hover:text-blue-600">{bom.name}</span>
                                    </td>
                                    <td className="py-3 px-4 font-mono text-slate-700 font-bold">
                                      {bom.bomNumber || 'BOM-001'} <span className="text-[10px] bg-slate-100 px-1 py-0.2 rounded font-normal text-slate-600">{bom.revision || 'Rev A'}</span>
                                    </td>
                                    <td className="py-3 px-4 text-slate-500 font-medium">Microsoft Excel Worksheet / BOM</td>
                                    <td className="py-3 px-4 text-center font-bold text-blue-700">
                                      {partsCount} ({unitSummary})
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                        isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                      }`}>
                                        {bom.status}
                                      </span>
                                    </td>
                                    <td className="py-3 px-4 text-slate-500 font-mono">
                                      {formatDate(bom.updatedAt || bom.createdAt)}
                                    </td>
                                    <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                      <div className="flex items-center justify-end gap-1.5">
                                        <button
                                          type="button"
                                          onClick={() => handleOpenBOM(bom)}
                                          className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1"
                                        >
                                          <span>Open</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveBOMId(bom.id);
                                            handleOpenLoadToProjectModal();
                                          }}
                                          className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1"
                                        >
                                          <Zap className="w-3 h-3 text-amber-300" />
                                          <span>Load</span>
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    {/* SECTION 3: ALL SPECIFICATIONS IN THIS MACHINE ACCORDION */}
                    <div className="pt-2 border-t border-slate-200">
                      <button
                        type="button"
                        onClick={() => setShowAllMachineBOMs(!showAllMachineBOMs)}
                        className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs font-bold text-slate-700 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-blue-600" />
                          <span>View All {allCurrentMachineBOMs.length} Specifications Across {currentMachine.name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-slate-500">
                          <span>{showAllMachineBOMs ? 'Hide Specifications' : 'Show All'}</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${showAllMachineBOMs ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {showAllMachineBOMs && (
                        <div className="pt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {allCurrentMachineBOMs.map((bom) => {
                            const partsCount = bom.items?.length || 0;
                            const unitSummary = computeBOMUnitSummary(bom.items || []);
                            const isActive = bom.status === 'Active' || bom.status === 'Approved';

                            return (
                              <div
                                key={bom.id}
                                onClick={() => handleOpenBOM(bom)}
                                className="bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                              >
                                <div className="space-y-2">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-mono text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                      📁 {bom.machineType}
                                    </span>
                                    <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                      {bom.bomNumber || 'BOM-001'}
                                    </span>
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ml-auto ${
                                      isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {bom.status}
                                    </span>
                                  </div>
                                  <h4 className="text-sm font-black text-slate-900 group-hover:text-blue-600 line-clamp-1">
                                    {bom.name}
                                  </h4>
                                  <p className="text-xs text-blue-700 font-bold">
                                    {partsCount} Items ({unitSummary})
                                  </p>
                                </div>
                                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenBOM(bom)}
                                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <span>Open BOM</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveBOMId(bom.id);
                                      handleOpenLoadToProjectModal();
                                    }}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1"
                                  >
                                    <Zap className="w-3 h-3 text-amber-300" />
                                    <span>Load</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* ================================================================= */
                  /* INSIDE AN ASSEMBLY SUBFOLDER: e.g. D:\Filling machine\1. Filling */
                  /* ================================================================= */
                  <div className="space-y-5">
                    {/* Subfolder Header Banner & Breadcrumb */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                      {/* Breadcrumb with parent link */}
                      <div className="flex items-center justify-between">
                        <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMachineId('ALL');
                              setSelectedMachineType('ALL');
                            }}
                            className="hover:text-blue-600 flex items-center gap-1 cursor-pointer"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            <span>BOM Management</span>
                          </button>
                          <span>/</span>
                          <button
                            type="button"
                            onClick={() => setSelectedMachineType('ALL')}
                            className="hover:text-blue-600 flex items-center gap-1 cursor-pointer font-bold text-slate-700"
                          >
                            <Folder className="w-3.5 h-3.5 text-amber-500 fill-amber-100" />
                            <span>{currentMachine.name}</span>
                          </button>
                          <span>/</span>
                          <span className="text-slate-900 font-bold flex items-center gap-1">
                            <FolderOpen className="w-3.5 h-3.5 text-amber-500 fill-amber-100" />
                            <span>{selectedMachineType}</span>
                          </span>
                        </nav>

                        <button
                          type="button"
                          onClick={() => setSelectedMachineType('ALL')}
                          className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                          <span>Back to {currentMachine.name}</span>
                        </button>
                      </div>

                      {/* Title & Actions Row */}
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-1">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shrink-0">
                              <FolderOpen className="w-6 h-6 fill-amber-100" />
                            </div>
                            <div>
                              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                                <span>{selectedMachineType}</span>
                              </h2>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200">
                                  D:\{currentMachine.name}\{selectedMachineType}\
                                </span>
                                <span className="text-xs text-slate-500 font-medium">
                                  Assembly Subfolder in {currentMachine.name} · {currentSubfolderBOMs.length} {currentSubfolderBOMs.length === 1 ? 'specification' : 'specifications'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Top Action Buttons inside Subfolder */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleOpenNewBOMModal(currentMachine.name, selectedMachineType)}
                            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ New BOM in {selectedMachineType}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStartImportModal()}
                            className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Upload className="w-3.5 h-3.5 text-slate-500" />
                            <span>Import Excel</span>
                          </button>

                          {/* View Toggle */}
                          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
                            <button
                              type="button"
                              onClick={() => setLibraryViewMode('cards')}
                              title="Card Grid View"
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                                libraryViewMode === 'cards'
                                  ? 'bg-white text-blue-600 shadow-2xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              <LayoutGrid className="w-3.5 h-3.5" />
                              <span>Cards</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setLibraryViewMode('table')}
                              title="Windows Explorer Details View"
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                                libraryViewMode === 'table'
                                  ? 'bg-white text-blue-600 shadow-2xs'
                                  : 'text-slate-500 hover:text-slate-800'
                              }`}
                            >
                              <TableIcon className="w-3.5 h-3.5" />
                              <span>Details</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleStartInlineRename(currentMachine.id, selectedMachineType)}
                            className="px-2.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1 cursor-pointer"
                            title="Rename this Folder"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-600" />
                            <span className="hidden sm:inline">Rename</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* SUBFOLDER CONTENT: SPECIFICATION CARDS OR EMPTY STATE */}
                    {currentSubfolderBOMs.length === 0 ? (
                      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-4 shadow-xs">
                        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-500">
                          <FolderOpen className="w-9 h-9 fill-amber-100" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-base font-black text-slate-900 tracking-tight">
                            Assembly folder "{selectedMachineType}" is empty
                          </h3>
                          <p className="text-xs text-slate-500 max-w-md mx-auto">
                            No BOM specifications have been created for this assembly subfolder yet. Create a new BOM specification or import an existing Excel sheet directly into this folder.
                          </p>
                        </div>

                        <div className="flex items-center justify-center gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => handleOpenNewBOMModal(currentMachine.name, selectedMachineType)}
                            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Create BOM for {selectedMachineType}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartImportModal()}
                            className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                          >
                            <Upload className="w-3.5 h-3.5 text-slate-500" />
                            <span>Import Excel</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedMachineType('ALL')}
                            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                          >
                            <span>Back to {currentMachine.name}</span>
                          </button>
                        </div>
                      </div>
                    ) : libraryViewMode === 'cards' ? (
                      /* SUBFOLDER BOM CARDS GRID */
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-blue-600" />
                            <h3 className="text-sm font-black text-slate-900 tracking-tight">
                              Specifications in {selectedMachineType} ({currentSubfolderBOMs.length})
                            </h3>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {currentSubfolderBOMs.map((bom) => {
                            const partsCount = bom.items?.length || 0;
                            const unitSummary = computeBOMUnitSummary(bom.items || []);
                            const isActive = bom.status === 'Active' || bom.status === 'Approved';
                            const isCardMenuOpen = activeBOMCardMenu === bom.id;

                            return (
                              <div
                                key={bom.id}
                                onClick={() => handleOpenBOM(bom)}
                                className="group bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                              >
                                <div className="space-y-3">
                                  {/* Header: BOM Code & Rev, Status Badge, More Options 3-dots */}
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-1 min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-mono text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                                          📁 {bom.machineType}
                                        </span>
                                        <span className="font-mono text-[11px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                          {bom.bomNumber || 'BOM-001'}
                                        </span>
                                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                                          {bom.revision || 'Rev A'}
                                        </span>
                                      </div>

                                      <h3 className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-2">
                                        {bom.name}
                                      </h3>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <span
                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                          isActive
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : bom.status === 'Draft'
                                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                                            : 'bg-slate-100 text-slate-600 border-slate-200'
                                        }`}
                                      >
                                        {bom.status}
                                      </span>

                                      {/* 3-Dot More Menu */}
                                      <div className="relative bom-card-menu-container">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveBOMCardMenu(isCardMenuOpen ? null : bom.id);
                                          }}
                                          title="More options"
                                          className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                                        >
                                          <MoreVertical className="w-3.5 h-3.5" />
                                        </button>

                                        {isCardMenuOpen && (
                                          <div
                                            onClick={(e) => e.stopPropagation()}
                                            className="absolute right-0 top-full mt-1 w-48 rounded-xl bg-white border border-slate-200 shadow-xl py-1 z-30 text-xs font-medium text-slate-700"
                                          >
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveBOMCardMenu(null);
                                                setDuplicateBOMModalData(bom);
                                                setDuplicateBOMNameInput(`${bom.name} (Copy)`);
                                                setDuplicateTargetMachine(bom.machineName);
                                                setDuplicateTargetType(bom.machineType);
                                              }}
                                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                            >
                                              <Copy className="w-3.5 h-3.5 text-blue-600" />
                                              <span>Duplicate BOM</span>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveBOMCardMenu(null);
                                                handleExportCurrentBOM('xlsx');
                                              }}
                                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                            >
                                              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                              <span>Export Excel</span>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveBOMCardMenu(null);
                                                setCompareTargetBOMId(bom.id);
                                                setIsCompareModalOpen(true);
                                              }}
                                              className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                            >
                                              <GitCompare className="w-3.5 h-3.5 text-purple-600" />
                                              <span>Compare / History</span>
                                            </button>
                                            <div className="border-t border-slate-100 my-1" />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setActiveBOMCardMenu(null);
                                                setDeleteBOMModalData(bom);
                                              }}
                                              className="w-full text-left px-3 py-1.5 hover:bg-rose-50 flex items-center gap-2 text-rose-600 cursor-pointer"
                                            >
                                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                              <span>Delete BOM</span>
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Specification Details Box */}
                                  <div className="space-y-1.5 text-xs bg-slate-50 border border-slate-100 rounded-xl p-3">
                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-500 font-sans text-xs flex items-center gap-1.5">
                                        <Boxes className="w-3.5 h-3.5 text-purple-600" />
                                        Materials:
                                      </span>
                                      <strong className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                                        {partsCount} Items ({unitSummary})
                                      </strong>
                                    </div>

                                    <div className="flex items-center justify-between">
                                      <span className="text-slate-500 font-sans text-xs flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                        Updated:
                                      </span>
                                      <span className="text-slate-600 text-[11px] font-sans">
                                        {formatDate(bom.updatedAt || bom.createdAt)}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Actions Row: Open BOM (primary) & Load to Project */}
                                <div
                                  className="flex items-center gap-2 pt-4 border-t border-slate-100 mt-4"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <button
                                    type="button"
                                    onClick={() => handleOpenBOM(bom)}
                                    className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer group/btn"
                                  >
                                    <span>Open BOM</span>
                                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover/btn:translate-x-0.5 transition-transform" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveBOMId(bom.id);
                                      handleOpenLoadToProjectModal();
                                    }}
                                    className="py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                                    title="Load into manufacturing project"
                                  >
                                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                                    <span>Load to Project</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      /* SUBFOLDER TABLE / EXPLORER DETAILS VIEW */
                      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                              <th className="py-2.5 px-4">Specification Name</th>
                              <th className="py-2.5 px-4">BOM Code &amp; Rev</th>
                              <th className="py-2.5 px-4">Type</th>
                              <th className="py-2.5 px-4 text-center">Materials</th>
                              <th className="py-2.5 px-4 text-center">Status</th>
                              <th className="py-2.5 px-4">Last Updated</th>
                              <th className="py-2.5 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {currentSubfolderBOMs.map((bom) => {
                              const partsCount = bom.items?.length || 0;
                              const unitSummary = computeBOMUnitSummary(bom.items || []);
                              const isActive = bom.status === 'Active' || bom.status === 'Approved';

                              return (
                                <tr
                                  key={bom.id}
                                  onClick={() => handleOpenBOM(bom)}
                                  className="hover:bg-slate-50 transition-colors cursor-pointer group"
                                >
                                  <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                                    <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span className="group-hover:text-blue-600">{bom.name}</span>
                                  </td>
                                  <td className="py-3 px-4 font-mono text-slate-700 font-bold">
                                    {bom.bomNumber || 'BOM-001'} <span className="text-[10px] bg-slate-100 px-1 py-0.2 rounded font-normal text-slate-600">{bom.revision || 'Rev A'}</span>
                                  </td>
                                  <td className="py-3 px-4 text-slate-500 font-medium">BOM Specification</td>
                                  <td className="py-3 px-4 text-center font-bold text-blue-700">
                                    {partsCount} ({unitSummary})
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                      isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                                    }`}>
                                      {bom.status}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-slate-500 font-mono">
                                    {formatDate(bom.updatedAt || bom.createdAt)}
                                  </td>
                                  <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-end gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenBOM(bom)}
                                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1"
                                      >
                                        <span>Open</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveBOMId(bom.id);
                                          handleOpenLoadToProjectModal();
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer inline-flex items-center gap-1"
                                      >
                                        <Zap className="w-3 h-3 text-amber-300" />
                                        <span>Load</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              ) : (
                /* ================================================================= */
                /* GLOBAL SEARCH RESULTS (OR NO MACHINE SELECTED)                     */
                /* ================================================================= */
                <div className="space-y-4">
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <Search className="w-5 h-5 text-blue-600" />
                        <span>Search Results: "{globalSearch.trim()}"</span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Found {visibleWorkspaceBOMs.length} matching specification {visibleWorkspaceBOMs.length === 1 ? 'file' : 'files'} across machines
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setGlobalSearch('');
                        setSelectedMachineId('ALL');
                        setSelectedMachineType('ALL');
                      }}
                      className="text-xs font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      Clear Search &amp; Back to Catalog
                    </button>
                  </div>

                  {visibleWorkspaceBOMs.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3 shadow-xs">
                      <Search className="w-10 h-10 text-slate-300 mx-auto" />
                      <h3 className="text-sm font-bold text-slate-900">No matching specifications found</h3>
                      <p className="text-xs text-slate-500">
                        Try searching for a different machine, part name, size specification or BOM number.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {visibleWorkspaceBOMs.map((bom) => {
                        const partsCount = bom.items?.length || 0;
                        const unitSummary = computeBOMUnitSummary(bom.items || []);

                        return (
                          <div
                            key={bom.id}
                            onClick={() => handleOpenBOM(bom)}
                            className="bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                                  {bom.machineName}
                                </span>
                                <span className="font-mono text-[11px] font-bold text-amber-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  📁 {bom.machineType}
                                </span>
                                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                                  {bom.revision || 'Rev A'}
                                </span>
                              </div>

                              <h3 className="text-base font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                                {bom.name}
                              </h3>

                              <p className="text-xs text-blue-700 font-bold bg-blue-50 p-2 rounded-xl">
                                {partsCount} Items ({unitSummary})
                              </p>
                            </div>

                            <div className="flex items-center gap-2 pt-4 border-t border-slate-100 mt-4" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => handleOpenBOM(bom)}
                                className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                              >
                                <span>Open BOM</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveBOMId(bom.id);
                                  handleOpenLoadToProjectModal();
                                }}
                                className="py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                              >
                                <Zap className="w-3.5 h-3.5 text-amber-300" />
                                <span>Load</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* VIEW B: DEDICATED FOCUSED BOM EDITOR */}
      {/* --------------------------------------------------------------------- */}
      {currentView === 'editor' && activeBOM && (
        <div className="flex-1 flex flex-col bg-[#f8fafc] select-text">
          {/* ===================================================================== */}
          {/* 1. SIMPLE BREADCRUMB & HEADER */}
          {/* ===================================================================== */}
          <div className="bg-white border-b border-slate-200 px-6 py-4 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                {/* Back button & Breadcrumb */}
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                  <button
                    type="button"
                    onClick={handleBackToLibrary}
                    className="text-blue-600 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Back to Machines</span>
                  </button>
                  <span>/</span>
                  <span className="truncate">{activeBOM.machineName}</span>
                  <span>/</span>
                  <span className="text-slate-800 font-bold truncate">{activeBOM.machineType}</span>
                </div>

                {/* BOM Title & Metadata */}
                <div className="flex items-center gap-2.5 flex-wrap pt-1">
                  {isEditingTitle ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editorBOMName}
                        onChange={(e) => {
                          setEditorBOMName(e.target.value);
                          setHasUnsavedChanges(true);
                        }}
                        onBlur={() => setIsEditingTitle(false)}
                        onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                        autoFocus
                        className="px-2.5 py-1 rounded-lg bg-white border-2 border-blue-600 text-slate-900 font-black text-lg outline-none shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => setIsEditingTitle(false)}
                        className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs cursor-pointer"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h1
                        onClick={() => setIsEditingTitle(true)}
                        title="Click to rename BOM"
                        className="text-xl font-black text-slate-900 hover:text-blue-600 cursor-pointer flex items-center gap-1.5 group"
                      >
                        <span>{editorBOMName}</span>
                        <Edit3 className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                      </h1>
                    </div>
                  )}

                  <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold border border-purple-200">
                    {editorRevision}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      editorStatus === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}
                  >
                    {editorStatus}
                  </span>

                  {/* Save Status Indicator */}
                  {saveStatus === 'saving' ? (
                    <span className="text-[11px] font-bold font-mono text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Saving...
                    </span>
                  ) : hasUnsavedChanges ? (
                    <span className="text-[11px] font-bold font-mono text-amber-800 bg-amber-50 border border-amber-300 px-2 py-0.5 rounded-lg flex items-center gap-1 animate-pulse">
                      ● Unsaved changes
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Saved
                    </span>
                  )}
                </div>

                {/* Compact Summary text (No oversized metric cards) */}
                <p className="text-xs text-slate-500 font-medium">
                  {editorItems.length} {editorItems.length === 1 ? 'material' : 'materials'} &bull; {unitBreakdownSummary}
                </p>
              </div>

              {/* Action Buttons: Save Changes, Load to Project, More */}
              <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
                {/* Save Changes button */}
                <button
                  type="button"
                  onClick={handleSaveActiveBOM}
                  disabled={saveStatus === 'saving' || !hasUnsavedChanges}
                  className={`px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer ${
                    hasUnsavedChanges
                      ? 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
                      : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>

                {/* Load Materials into Project */}
                <button
                  type="button"
                  onClick={handleOpenLoadToProjectModal}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
                  title="Copy this BOM into a manufacturing project"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>Load to Project</span>
                </button>

                {/* More ▾ Menu */}
                <div className="relative editor-more-menu-container">
                  <button
                    type="button"
                    onClick={() => setIsEditorMoreMenuOpen(!isEditorMoreMenuOpen)}
                    className="px-3 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <span>More</span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  </button>

                  {isEditorMoreMenuOpen && (
                    <div
                      onClick={() => setIsEditorMoreMenuOpen(false)}
                      className="absolute right-0 mt-1.5 w-56 rounded-xl bg-white border border-slate-200 shadow-xl py-1.5 z-40 text-xs text-slate-700"
                    >
                      <button
                        type="button"
                        onClick={handleAdd5BlankRows}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 font-medium cursor-pointer"
                      >
                        <Plus className="w-4 h-4 text-blue-600" />
                        <span>Add 5 Blank Rows</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsPasteModalOpen(true)}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 font-medium cursor-pointer"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                        <span>Paste from Excel...</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleStartImportModal}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 font-medium cursor-pointer"
                      >
                        <Upload className="w-4 h-4 text-blue-600" />
                        <span>Import Excel (.xlsx)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportCurrentBOM('xlsx')}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 font-medium cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-emerald-600" />
                        <span>Export Excel (.xlsx)</span>
                      </button>
                      <div className="border-t border-slate-100 my-1" />
                      <button
                        type="button"
                        onClick={() => {
                          const others = masterBOMs.filter((b) => b.machineName === activeBOM.machineName && b.id !== activeBOM.id);
                          setCompareTargetBOMId(others[0]?.id || '');
                          setIsCompareModalOpen(true);
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 font-medium cursor-pointer"
                      >
                        <GitCompare className="w-4 h-4 text-purple-600" />
                        <span>Compare Revisions</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDuplicateAsNewRevision}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 font-medium cursor-pointer"
                      >
                        <Layers className="w-4 h-4 text-purple-600" />
                        <span>Duplicate as New Revision</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsRenumberModalOpen(true)}
                        className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2.5 font-medium cursor-pointer"
                      >
                        <Hash className="w-4 h-4 text-amber-600" />
                        <span>Renumber All Rows...</span>
                      </button>
                      <div className="border-t border-slate-100 my-1" />
                      <button
                        type="button"
                        onClick={() => setDeleteBOMModalData(activeBOM)}
                        className="w-full text-left px-3.5 py-2 hover:bg-rose-50 flex items-center gap-2.5 font-medium text-rose-700 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 text-rose-600" />
                        <span>Delete BOM</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* 2. COMPACT TOOLBAR ABOVE MATERIALS */}
          {/* ========================================================================= */}
          <div className="px-6 pt-4 pb-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Left: Search & + Add Material */}
              <div className="flex items-center gap-2.5 flex-1">
                {/* Search Input */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Search description, size, material type, Sr No..."
                    className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs placeholder:text-slate-400 outline-none focus:border-blue-600 shadow-2xs font-medium"
                  />
                  {tableSearch && (
                    <button
                      type="button"
                      onClick={() => setTableSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* + Add Material Button */}
                <button
                  type="button"
                  onClick={handleAddMaterialRow}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Add Material</span>
                </button>

                {/* Filter Popover Button */}
                <div className="relative editor-filter-container">
                  <button
                    type="button"
                    onClick={() => setIsEditorFilterOpen(!isEditorFilterOpen)}
                    className={`p-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                      tableMaterialFilter !== 'all' || onlyIncompleteFilter || onlyDuplicatesFilter
                        ? 'bg-blue-50 text-blue-700 border-blue-300'
                        : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                    title="Filter Materials"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="hidden md:inline">Filter</span>
                    {(tableMaterialFilter !== 'all' || onlyIncompleteFilter || onlyDuplicatesFilter) && (
                      <span className="w-2 h-2 rounded-full bg-blue-600" />
                    )}
                  </button>

                  {isEditorFilterOpen && (
                    <div className="absolute left-0 sm:left-auto sm:right-0 mt-1.5 w-72 rounded-xl bg-white border border-slate-200 shadow-xl p-4 z-40 text-xs space-y-3.5 text-slate-800">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                          Material Type
                        </label>
                        <select
                          value={tableMaterialFilter}
                          onChange={(e) => setTableMaterialFilter(e.target.value)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold outline-none focus:border-blue-600"
                        >
                          <option value="all">All Material Types</option>
                          {availableMaterialTypes.map((mat) => (
                            <option key={mat} value={mat}>
                              {mat}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="border-t border-slate-100 pt-3 space-y-2">
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Quality Checks
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={onlyIncompleteFilter}
                            onChange={(e) => setOnlyIncompleteFilter(e.target.checked)}
                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                          />
                          <span>Show Incomplete only ({incompleteItemIds.size})</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                          <input
                            type="checkbox"
                            checked={onlyDuplicatesFilter}
                            onChange={(e) => setOnlyDuplicatesFilter(e.target.checked)}
                            className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 w-4 h-4"
                          />
                          <span>Show Duplicates only ({duplicateItemIds.size})</span>
                        </label>
                      </div>

                      {(tableMaterialFilter !== 'all' || onlyIncompleteFilter || onlyDuplicatesFilter) && (
                        <div className="border-t border-slate-100 pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setTableMaterialFilter('all');
                              setTableCategoryFilter('all');
                              setOnlyIncompleteFilter(false);
                              setOnlyDuplicatesFilter(false);
                            }}
                            className="text-[11px] text-blue-600 hover:underline font-bold cursor-pointer"
                          >
                            Reset Filters
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: View Toggle (Cards vs Table) & Undo/Redo */}
              <div className="flex items-center gap-2 shrink-0">
                {/* Undo / Redo */}
                <div className="flex items-center gap-1 bg-white border border-slate-300 rounded-xl p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={historyStack.length === 0}
                    title="Undo (Ctrl+Z)"
                    className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 text-slate-600 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRedo}
                    disabled={futureStack.length === 0}
                    title="Redo (Ctrl+Y)"
                    className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40 text-slate-600 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <Redo2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Cards / Table Toggle */}
                <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 text-slate-600">
                  <button
                    type="button"
                    onClick={() => setMaterialViewFormat('card')}
                    title="Card View"
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      materialViewFormat === 'card'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'hover:text-slate-900 text-slate-500'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMaterialViewFormat('table')}
                    title="Table View"
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                      materialViewFormat === 'table'
                        ? 'bg-white text-slate-900 shadow-2xs font-bold'
                        : 'hover:text-slate-900 text-slate-500'
                    }`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Active Filter Chips */}
            {(tableSearch.trim() || tableMaterialFilter !== 'all' || onlyIncompleteFilter || onlyDuplicatesFilter) && (
              <div className="flex items-center gap-2 flex-wrap pt-2 text-xs">
                <span className="text-slate-400 font-medium text-[11px]">Active Filters:</span>
                {tableSearch.trim() && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-xs">
                    Search: "{tableSearch.trim()}"
                    <button type="button" onClick={() => setTableSearch('')} className="hover:text-blue-950 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {tableMaterialFilter !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 text-xs">
                    Type: {tableMaterialFilter}
                    <button type="button" onClick={() => setTableMaterialFilter('all')} className="hover:text-slate-900 cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setTableSearch('');
                    setTableMaterialFilter('all');
                    setOnlyIncompleteFilter(false);
                    setOnlyDuplicatesFilter(false);
                  }}
                  className="text-[11px] text-blue-600 hover:underline font-bold cursor-pointer"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Bulk Selection Action Bar */}
          {selectedRowIds.length > 0 && (
            <div className="mx-6 mt-1 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs shadow-2xs">
              <span className="text-blue-900 font-bold">
                {selectedRowIds.length} of {displayedEditorItems.length} materials selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleBulkDuplicate}
                  className="px-3 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer shadow-2xs"
                >
                  Duplicate
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="px-3 py-1 rounded-lg bg-rose-50 border border-rose-300 text-rose-700 hover:bg-rose-100 text-xs font-bold cursor-pointer shadow-2xs"
                >
                  Delete Selected
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRowIds([])}
                  className="px-3 py-1 rounded-lg text-slate-500 hover:text-slate-800 text-xs font-semibold cursor-pointer"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 3. MATERIAL CARDS (OR TABLE VIEW) */}
          {/* ========================================================================= */}
          {materialViewFormat === 'card' ? (
            /* RESPONSIVE MATERIAL CARD VIEW (Desktop: 3 cols, Laptop: 2 cols, Mobile: 1 col) */
            <div className="flex-1 overflow-auto mx-6 my-3">
              {displayedEditorItems.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-xs text-slate-400 space-y-3 shadow-xs">
                  <Package className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-semibold text-slate-600">No material specifications match your search or filter.</p>
                  <button
                    type="button"
                    onClick={handleAddMaterialRow}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add First Material</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayedEditorItems.map((item) => {
                    const isSelected = selectedRowIds.includes(item.id);
                    const isIncomplete = incompleteItemIds.has(item.id);
                    const isDuplicate = duplicateItemIds.has(item.id);

                    return (
                      <div
                        key={item.id}
                        className={`bg-white border rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 ${
                          isSelected
                            ? 'border-blue-500 ring-2 ring-blue-100 bg-blue-50/20'
                            : isIncomplete
                            ? 'border-amber-300 hover:border-amber-400'
                            : 'border-slate-200 hover:border-blue-300'
                        }`}
                      >
                        {/* Header */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleToggleRowSelect(item.id)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                              />
                              <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                {item.srNo}
                              </span>
                            </div>

                            <span className="font-bold text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                              {item.materialType}
                            </span>
                          </div>

                          {/* Part Description */}
                          <h4 className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
                            {item.description || <em className="text-slate-400 font-normal">No description</em>}
                          </h4>

                          {/* Warning Badges if duplicate/incomplete */}
                          {(isDuplicate || isIncomplete) && (
                            <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
                              {isDuplicate && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                                  Duplicate
                                </span>
                              )}
                              {isIncomplete && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold">
                                  Missing Info
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Specification Details Box */}
                        <div className="space-y-1.5 text-xs bg-slate-50 border border-slate-100 rounded-xl p-2.5 font-mono">
                          {/* Size */}
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-sans text-[11px]">Size:</span>
                            <span className="font-bold text-slate-800 text-[11px] truncate max-w-[170px]" title={item.sizeSpecs}>
                              {item.sizeSpecs || '-'}
                            </span>
                          </div>

                          {/* Quantity & Unit */}
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500 font-sans text-[11px]">Quantity:</span>
                            <span className="font-bold text-emerald-700 text-[11px]">
                              {item.quantity} {item.unit}
                            </span>
                          </div>
                        </div>

                        {/* Actions Toolbar */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                          <button
                            type="button"
                            onClick={() => handleOpenCardEdit(item)}
                            className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDuplicateRow(item.id)}
                              title="Duplicate Card"
                              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(item.id)}
                              title="Delete Card"
                              className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* SPREADSHEET MATERIAL SPECIFICATION TABLE */
            <div className="flex-1 overflow-auto mx-6 my-3 bg-white border border-slate-200 rounded-2xl shadow-xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-800 font-black border-b border-slate-200 text-[11px] uppercase tracking-wider sticky top-0 z-10 select-none">
                  <tr>
                    <th className="p-2.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={selectedRowIds.length === displayedEditorItems.length && displayedEditorItems.length > 0}
                        onChange={handleToggleSelectAll}
                        className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="py-2.5 px-2 w-14 text-center whitespace-nowrap font-black text-slate-700 bg-slate-50/80">Sr No</th>
                    <th className="p-2.5 min-w-[140px] whitespace-nowrap">Material Type</th>
                    <th className="p-2.5 min-w-[200px] whitespace-nowrap">Size Specification</th>
                    <th className="p-2.5 w-24 text-center whitespace-nowrap">Qty</th>
                    <th className="p-2.5 w-20 text-center whitespace-nowrap">Unit</th>
                    <th className="p-2.5 min-w-[260px] whitespace-nowrap">Description</th>
                    <th className="p-2.5 w-24 text-center whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-medium">
                  {displayedEditorItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500 font-medium">
                        No material specifications match your search or filter. Click "+ Add Material" to create one.
                      </td>
                    </tr>
                  ) : (
                    displayedEditorItems.map((item) => {
                      const isSelected = selectedRowIds.includes(item.id);
                      const isIncomplete = incompleteItemIds.has(item.id);
                      const isDuplicate = duplicateItemIds.has(item.id);

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isSelected ? 'bg-blue-50/60' : ''
                          } ${isIncomplete ? 'border-l-4 border-l-amber-500 bg-amber-50/20' : ''}`}
                        >
                          {/* Checkbox */}
                          <td className="p-2.5 text-center whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleRowSelect(item.id)}
                              className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                            />
                          </td>

                          {/* 1. Sr No */}
                          <td className="py-2 px-1 w-12 text-center whitespace-nowrap bg-slate-50/50">
                            <span className="font-mono text-xs font-bold text-slate-600">
                              {item.srNo}
                            </span>
                          </td>

                          {/* 2. Material Type */}
                          <td className="p-2 min-w-[140px]">
                            <select
                              value={item.materialType}
                              onChange={(e) => handleUpdateRowCell(item.id, 'materialType', e.target.value)}
                              className="w-full bg-transparent px-2 py-1.5 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white text-xs font-bold text-blue-800 transition-colors cursor-pointer"
                            >
                              {MATERIAL_TYPES.map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* 3. Size Specification */}
                          <td className="p-2 min-w-[200px]">
                            <input
                              type="text"
                              value={item.sizeSpecs || ''}
                              placeholder="e.g. 80 x 6 x 485, 32 Ampere 415V AC"
                              onChange={(e) => handleUpdateRowCell(item.id, 'sizeSpecs', e.target.value)}
                              className="w-full min-w-[190px] bg-transparent px-2.5 py-1.5 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white text-xs font-mono font-medium text-slate-800 transition-colors"
                            />
                          </td>

                          {/* 4. Quantity */}
                          <td className="p-2 w-24 min-w-[75px] max-w-[95px] text-center">
                            <input
                              type="number"
                              min="0.01"
                              step="any"
                              value={item.quantity}
                              onChange={(e) => handleUpdateRowCell(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-16 text-center bg-slate-100 hover:bg-white focus:bg-white px-1.5 py-1.5 rounded border border-slate-200 focus:border-blue-500 text-xs font-bold font-mono text-emerald-800 transition-colors"
                            />
                          </td>

                          {/* 5. Unit */}
                          <td className="p-2 w-20 text-center">
                            <select
                              value={item.unit || 'Nos'}
                              onChange={(e) => handleUpdateRowCell(item.id, 'unit', e.target.value)}
                              className="text-xs font-bold text-slate-700 bg-transparent border border-transparent hover:border-slate-300 rounded px-1.5 py-1.5 cursor-pointer"
                            >
                              {['Nos', 'Meter', 'Kg', 'Set', 'Sheet', 'Liter', 'Length'].map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* 6. Description */}
                          <td className="p-2 min-w-[260px]">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                value={item.description}
                                placeholder="Part description..."
                                onChange={(e) => handleUpdateRowCell(item.id, 'description', e.target.value)}
                                className="w-full bg-transparent px-2.5 py-1.5 rounded border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white text-xs font-bold text-slate-900 transition-colors"
                              />
                              {isDuplicate && (
                                <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-[10px] shrink-0 font-bold">
                                  Dup
                                </span>
                              )}
                              {isIncomplete && !item.description && (
                                <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 text-[10px] shrink-0 font-bold">
                                  Missing
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="p-2 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleOpenCardEdit(item)}
                                className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Edit in Modal"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDuplicateRow(item.id)}
                                className="p-1.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                                title="Duplicate Row"
                              >
                                <Copy className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(item.id)}
                                className="p-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete Row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. CLEAN BOTTOM FOOTER BAR */}
          {/* ========================================================================= */}
          <div className="px-6 py-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAddMaterialRow}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Material</span>
              </button>
            </div>

            <div className="flex items-center gap-3 font-mono text-slate-600 text-xs">
              <span>
                Total Materials: <strong className="text-slate-900 font-black">{editorItems.length}</strong>
              </span>
              <span>&bull;</span>
              <span>
                Quantities: <strong className="text-emerald-700 font-black">{unitBreakdownSummary}</strong>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: LOAD MATERIALS INTO PROJECT WORKFLOW */}
      {/* ===================================================================== */}
      {isLoadToProjectModalOpen && activeBOM && (
        <Modal
          isOpen={isLoadToProjectModalOpen}
          onClose={() => setIsLoadToProjectModalOpen(false)}
          title="⚡ Load Materials into Project"
          subtitle="Copy selected BOM materials directly into Material Entry Workstation without leaving this ERP"
          maxWidth="4xl"
          theme="light"
        >
          <div className="space-y-4 text-slate-800">
            {/* Step 1: Destination Project */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center justify-between">
                <span>1. Select Destination Project & PO Information</span>
                <label className="flex items-center gap-1.5 cursor-pointer text-blue-700 font-bold">
                  <input
                    type="checkbox"
                    checked={loadIsNewProject}
                    onChange={(e) => setLoadIsNewProject(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 w-4 h-4"
                  />
                  <span>Create New Project</span>
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {loadIsNewProject ? (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">New Project Name *</label>
                    <input
                      type="text"
                      value={loadNewProjectName}
                      onChange={(e) => setLoadNewProjectName(e.target.value)}
                      placeholder="e.g. Pharma Order 2026"
                      className="w-full px-3 py-2 rounded-xl bg-white border border-blue-500 text-slate-900 font-bold text-xs outline-none shadow-2xs"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Existing Project *</label>
                    <select
                      value={loadDestProjectName}
                      onChange={(e) => {
                        const chosen = e.target.value;
                        setLoadDestProjectName(chosen);
                        const foundPrj = projects.find((p) => p.name === chosen);
                        if (foundPrj?.poNumber) {
                          setLoadPONumber(foundPrj.poNumber);
                        }
                        const existing = projectRequirements.filter(
                          (r) => (r.projectName || '').trim().toLowerCase() === chosen.toLowerCase()
                        );
                        const maxSr = existing.reduce((max, r) => {
                          const n = typeof r.srNo === 'number' ? r.srNo : parseInt(String(r.srNo).replace(/[^0-9]/g, ''), 10);
                          return !isNaN(n) && n > max ? n : max;
                        }, 0);
                        setLoadManualStartingSrNo(maxSr + 1);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold text-xs outline-none shadow-2xs focus:border-blue-600"
                    >
                      <option value="">-- Choose Project --</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.name}>
                          📁 {p.name} ({p.machineName || 'Machine'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Manual PO Number</label>
                  <input
                    type="text"
                    value={loadPONumber}
                    onChange={(e) => setLoadPONumber(e.target.value)}
                    placeholder="e.g. PO-RSB-2026-0042"
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs outline-none shadow-2xs focus:border-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">PO Date</label>
                  <input
                    type="date"
                    value={loadPODate}
                    onChange={(e) => setLoadPODate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs outline-none shadow-2xs focus:border-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Station Sr. Numbering & Conflict Settings */}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-700">Load Mode:</span>
                  <button
                    type="button"
                    onClick={() => setLoadExistingMode('append')}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer ${
                      loadExistingMode === 'append' ? 'bg-blue-600 text-white shadow-xs' : 'bg-white border border-slate-300 text-slate-700'
                    }`}
                  >
                    ➕ Append to Station
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoadExistingMode('replace')}
                    className={`px-3 py-1.5 rounded-lg font-bold text-xs cursor-pointer ${
                      loadExistingMode === 'replace' ? 'bg-rose-600 text-white shadow-xs' : 'bg-white border border-slate-300 text-slate-700'
                    }`}
                  >
                    🔄 Replace Project Items
                  </button>
                </div>

                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-semibold">
                  <input
                    type="checkbox"
                    checked={loadSkipDuplicates}
                    onChange={(e) => setLoadSkipDuplicates(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600 w-4 h-4"
                  />
                  <span>Skip Duplicate Rows</span>
                </label>
              </div>

              {/* Station Sr. No. Adjustment */}
              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-blue-600" />
                    <span>Material Entry Station Sr. Number Adjustment:</span>
                  </span>
                  <span className="text-[11px] text-blue-700 font-bold bg-blue-100 px-2 py-0.5 rounded-md">
                    {(() => {
                      const finalName = loadIsNewProject ? loadNewProjectName.trim() : loadDestProjectName.trim();
                      const existing = projectRequirements.filter(
                        (r) => (r.projectName || '').trim().toLowerCase() === finalName.toLowerCase()
                      );
                      const maxSr = existing.reduce((max, r) => {
                        const n = typeof r.srNo === 'number' ? r.srNo : parseInt(String(r.srNo).replace(/[^0-9]/g, ''), 10);
                        return !isNaN(n) && n > max ? n : max;
                      }, 0);
                      return `${existing.length} existing items in station (Max Sr: #${maxSr})`;
                    })()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    loadSrNoMode === 'auto' ? 'bg-white border-blue-500 ring-2 ring-blue-100 shadow-2xs' : 'bg-white/60 border-slate-200 hover:bg-white'
                  }`}>
                    <input
                      type="radio"
                      name="loadSrNoMode"
                      checked={loadSrNoMode === 'auto'}
                      onChange={() => setLoadSrNoMode('auto')}
                      className="mt-0.5 text-blue-600"
                    />
                    <div>
                      <p className="text-xs font-bold text-slate-900">Auto-Adjust to Station (Recommended)</p>
                      <p className="text-[11px] text-slate-500">
                        Continues automatically after existing items in this project.
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                    loadSrNoMode === 'manual' ? 'bg-white border-blue-500 ring-2 ring-blue-100 shadow-2xs' : 'bg-white/60 border-slate-200 hover:bg-white'
                  }`}>
                    <input
                      type="radio"
                      name="loadSrNoMode"
                      checked={loadSrNoMode === 'manual'}
                      onChange={() => setLoadSrNoMode('manual')}
                      className="mt-0.5 text-blue-600"
                    />
                    <div className="flex-1">
                      <p className="text-xs font-bold text-slate-900">Manual Starting Sr. No.</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-slate-500">Start from:</span>
                        <input
                          type="number"
                          min="1"
                          value={loadManualStartingSrNo}
                          onChange={(e) => setLoadManualStartingSrNo(parseInt(e.target.value, 10) || 1)}
                          disabled={loadSrNoMode !== 'manual'}
                          className="w-16 px-2 py-0.5 rounded bg-white border border-slate-300 text-xs font-bold font-mono text-slate-900 disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Step 3: Material Selection Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-72 overflow-y-auto bg-white shadow-2xs">
              <table className="w-full text-left text-xs text-slate-800">
                <thead className="bg-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-700 border-b border-slate-200 sticky top-0">
                  <tr>
                    <th className="px-3 py-2.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={editorItems.length > 0 && editorItems.every((it) => loadSelectedMaterials[it.id])}
                        onChange={(e) => {
                          const next: Record<string, boolean> = {};
                          editorItems.forEach((it) => (next[it.id] = e.target.checked));
                          setLoadSelectedMaterials(next);
                        }}
                        className="rounded border-slate-300 text-blue-600 w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="px-3 py-2.5 w-16">Sr.</th>
                    <th className="px-3 py-2.5">Part Description</th>
                    <th className="px-3 py-2.5">Material Type</th>
                    <th className="px-3 py-2.5">Size Specification</th>
                    <th className="px-3 py-2.5 w-28 text-center">Project Qty</th>
                    <th className="px-3 py-2.5 w-16">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {editorItems.map((it) => {
                    const isChecked = !!loadSelectedMaterials[it.id];
                    const customQty = loadCustomQuantities[it.id] !== undefined ? loadCustomQuantities[it.id] : it.quantity;

                    return (
                      <tr
                        key={it.id}
                        className={`hover:bg-slate-50 ${isChecked ? 'bg-blue-50/60' : 'opacity-60'}`}
                      >
                        <td className="px-3 py-2 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              setLoadSelectedMaterials((prev) => ({ ...prev, [it.id]: e.target.checked }));
                            }}
                            className="rounded border-slate-300 text-blue-600 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-500 font-bold">{it.srNo}</td>
                        <td className="px-3 py-2 font-bold text-slate-900">{it.description}</td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-bold">
                            {it.materialType}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-800 font-semibold">{it.sizeSpecs || '-'}</td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            value={customQty}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setLoadCustomQuantities((prev) => ({ ...prev, [it.id]: val }));
                            }}
                            className="w-20 px-2 py-1 rounded bg-white border border-slate-300 text-emerald-700 font-mono font-bold text-xs text-center outline-none focus:border-blue-600 shadow-2xs"
                          />
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-500">{it.unit}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <span className="text-xs text-slate-500">
                🔒 Safe Isolation: Changes made here only affect this project order. Master BOM remains intact.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsLoadToProjectModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer shadow-2xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleExecuteLoadToProject}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <Zap className="w-4 h-4 text-amber-300" />
                  <span>Confirm & Load into Project</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: GUIDED EXCEL IMPORT */}
      {/* ===================================================================== */}
      {isImportModalOpen && (
        <Modal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          title="📥 Import BOM from Excel / CSV"
          subtitle="Guided 5-step import with automatic column detection and validation"
          maxWidth="4xl"
          theme="light"
        >
          <div className="space-y-4 text-slate-800">
            {/* Step Indicators */}
            <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-3">
              {[
                { s: 1, label: '1. Select File' },
                { s: 2, label: '2. Map Columns' },
                { s: 3, label: '3. Preview' },
                { s: 4, label: '4. Choose Mode' },
                { s: 5, label: '5. Complete' },
              ].map((step) => (
                <span
                  key={step.s}
                  className={`font-bold ${
                    importStep === step.s
                      ? 'text-blue-700 border-b-2 border-blue-600 pb-1'
                      : importStep > step.s
                      ? 'text-emerald-700'
                      : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              ))}
            </div>

            {/* Step 1: Upload */}
            {importStep === 1 && (
              <div className="p-8 text-center border-2 border-dashed border-slate-300 rounded-2xl space-y-4 bg-slate-50">
                <FileSpreadsheet className="w-12 h-12 text-emerald-600 mx-auto" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Upload Spreadsheet File</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Select a standard stainless steel fabrication or assembly BOM (.xlsx, .xls, or .csv)
                  </p>
                </div>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="block mx-auto text-xs text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer shadow-2xs"
                />
              </div>
            )}

            {/* Step 2: Map Columns */}
            {importStep === 2 && (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                  File: <strong className="text-slate-900">{importFileName}</strong> &bull; Total Rows: <strong className="text-slate-900">{importRawRows.length}</strong>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { key: 'srNo', label: 'Sr. No.' },
                    { key: 'materialType', label: 'Material Type' },
                    { key: 'sizeSpecs', label: 'Size Specification' },
                    { key: 'quantity', label: 'Quantity' },
                    { key: 'unit', label: 'Unit' },
                    { key: 'description', label: 'Description *' },
                  ].map((field) => (
                    <div key={field.key} className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600">{field.label}</label>
                      <select
                        value={(importColumnMapping as any)[field.key]}
                        onChange={(e) =>
                          setImportColumnMapping((prev) => ({ ...prev, [field.key]: e.target.value }))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-blue-600 shadow-2xs"
                      >
                        <option value="">-- None / Default --</option>
                        {importFileHeaders.map((h) => (
                          <option key={h} value={h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setImportStep(1)}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmMapping}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-xs"
                  >
                    Preview Rows →
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Preview */}
            {importStep === 3 && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-slate-500">Total Rows:</span> <strong className="text-slate-900 font-mono">{importStats.total}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-emerald-700 font-bold">Valid Rows:</span> <strong className="text-emerald-800 font-mono">{importStats.valid}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="text-amber-800 font-bold">Incomplete:</span> <strong className="text-amber-900 font-mono">{importStats.incomplete}</strong>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-xl max-h-60 overflow-y-auto bg-white shadow-2xs">
                  <table className="w-full text-left text-xs text-slate-800">
                    <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600 sticky top-0">
                      <tr>
                        <th className="px-3 py-2">Sr</th>
                        <th className="px-3 py-2">Description</th>
                        <th className="px-3 py-2">Type</th>
                        <th className="px-3 py-2">Size</th>
                        <th className="px-3 py-2">Qty</th>
                        <th className="px-3 py-2">Unit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {importParsedPreview.slice(0, 15).map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5 text-slate-500">{r.srNo}</td>
                          <td className="px-3 py-1.5 font-bold text-slate-900">{r.description}</td>
                          <td className="px-3 py-1.5 text-blue-700 font-bold">{r.materialType}</td>
                          <td className="px-3 py-1.5 text-slate-800">{r.sizeSpecs}</td>
                          <td className="px-3 py-1.5 text-emerald-700 font-bold">{r.quantity}</td>
                          <td className="px-3 py-1.5 text-slate-600">{r.unit}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setImportStep(2)}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportStep(4)}
                    className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 shadow-xs"
                  >
                    Choose Import Mode →
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Mode Selection */}
            {importStep === 4 && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <h4 className="text-sm font-bold text-slate-900">How should imported materials be integrated?</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 bg-white hover:bg-blue-50/50 cursor-pointer shadow-2xs">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'append'}
                        onChange={() => setImportMode('append')}
                        className="text-blue-600 w-4 h-4"
                      />
                      <div>
                        <div className="text-xs font-bold text-slate-900">➕ Append to current BOM</div>
                        <div className="text-[11px] text-slate-500">Keep existing {editorItems.length} material rows and add the new imported rows at the end.</div>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 rounded-lg border border-rose-200 bg-white hover:bg-rose-50 cursor-pointer shadow-2xs">
                      <input
                        type="radio"
                        name="importMode"
                        checked={importMode === 'replace'}
                        onChange={() => setImportMode('replace')}
                        className="text-rose-600 w-4 h-4"
                      />
                      <div>
                        <div className="text-xs font-bold text-rose-700">🔄 Replace current BOM rows</div>
                        <div className="text-[11px] text-slate-500">Clear existing materials in this BOM and replace them completely with the imported rows.</div>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setImportStep(3)}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteImport}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs"
                  >
                    Confirm Import ({importParsedPreview.length} Items)
                  </button>
                </div>
              </div>
            )}

            {/* Step 5: Complete */}
            {importStep === 5 && (
              <div className="p-8 text-center space-y-4">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h4 className="text-base font-bold text-slate-900">BOM Materials Imported Successfully!</h4>
                <p className="text-xs text-slate-500">
                  Imported {importParsedPreview.length} parts into your active BOM editor. Remember to click <strong>Save Changes</strong> to store them permanently.
                </p>
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                >
                  Return to BOM Editor
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: PASTE ROWS FROM EXCEL */}
      {/* ===================================================================== */}
      {isPasteModalOpen && (
        <Modal
          isOpen={isPasteModalOpen}
          onClose={() => setIsPasteModalOpen(false)}
          title="📋 Paste Rows from Excel / Google Sheets"
          subtitle="Copy cells in Excel (Ctrl+C) and paste them here directly"
          maxWidth="2xl"
          theme="light"
        >
          <div className="space-y-3 text-slate-800">
            <p className="text-xs text-slate-500">
              Columns should ideally match: <code>Description &bull; Material Type &bull; Size Specs &bull; Qty &bull; Unit</code>
            </p>
            <textarea
              rows={8}
              value={pasteRawText}
              onChange={(e) => setPasteRawText(e.target.value)}
              placeholder="Paste tab-separated spreadsheet rows here..."
              className="w-full p-3 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs outline-none focus:border-blue-600 shadow-2xs"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecutePaste}
                disabled={!pasteRawText.trim()}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Insert Pasted Rows
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* MODAL 4: RENUMBER ROWS */}
      {/* ===================================================================== */}
      {isRenumberModalOpen && (
        <Modal
          isOpen={isRenumberModalOpen}
          onClose={() => setIsRenumberModalOpen(false)}
          title="🔢 Renumber Material Rows"
          subtitle="Renumber rows sequentially with custom start index and prefix"
          maxWidth="md"
          theme="light"
        >
          <div className="space-y-4 text-slate-800">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Starting Number</label>
                <input
                  type="number"
                  min="1"
                  value={renumberStartAt}
                  onChange={(e) => setRenumberStartAt(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs outline-none focus:border-blue-600 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Prefix (Optional)</label>
                <input
                  type="text"
                  value={renumberPrefix}
                  onChange={(e) => setRenumberPrefix(e.target.value)}
                  placeholder="e.g. PART-"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs outline-none focus:border-blue-600 shadow-2xs"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              Preview: First 3 rows will become:{' '}
              <strong className="text-blue-700">
                {renumberPrefix}{renumberStartAt}, {renumberPrefix}{renumberStartAt + 1}, {renumberPrefix}{renumberStartAt + 2}...
              </strong>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRenumberModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRenumber}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Apply Renumbering
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* MODAL 5: BULK CHANGE CATEGORY */}
      {/* ===================================================================== */}
      {isBulkCategoryModalOpen && (
        <Modal
          isOpen={isBulkCategoryModalOpen}
          onClose={() => setIsBulkCategoryModalOpen(false)}
          title="🏷️ Change Category for Selected Rows"
          subtitle={`Assign category to ${selectedRowIds.length} selected material items`}
          maxWidth="sm"
          theme="light"
        >
          <div className="space-y-4 text-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Category Name</label>
              <input
                type="text"
                value={bulkCategoryInput}
                onChange={(e) => setBulkCategoryInput(e.target.value)}
                placeholder="e.g. Frame Structure, Piping, Drivetrain"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-blue-600 shadow-2xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkCategoryModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = editorItems.map((it) => {
                    if (selectedRowIds.includes(it.id)) {
                      return { ...it, category: bulkCategoryInput };
                    }
                    return it;
                  });
                  setEditorItems(updated);
                  setHasUnsavedChanges(true);
                  setIsBulkCategoryModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Update Category
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* MODAL 6: REVISION COMPARISON */}
      {/* ===================================================================== */}
      {isCompareModalOpen && (
        <Modal
          isOpen={isCompareModalOpen}
          onClose={() => setIsCompareModalOpen(false)}
          title="🔄 BOM Revision Comparison & Change Tracker"
          subtitle="Compare active BOM specification against other revisions or models"
          maxWidth="4xl"
          theme="light"
        >
          <div className="space-y-4 text-slate-800">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <span className="font-bold text-slate-600">Compare Current ({editorRevision}) against:</span>
              <select
                value={compareTargetBOMId}
                onChange={(e) => setCompareTargetBOMId(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-900 text-xs font-bold outline-none focus:border-blue-600 shadow-2xs"
              >
                {masterBOMs
                  .filter((b) => b.id !== activeBOM?.id)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.revision}) &bull; {b.machineName}
                    </option>
                  ))}
              </select>
            </div>

            {comparisonDiff && (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <span className="text-emerald-700 font-bold block">Added in Current</span>
                    <strong className="text-emerald-800 font-mono text-base">{comparisonDiff.added.length}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                    <span className="text-amber-800 font-bold block">Modified</span>
                    <strong className="text-amber-900 font-mono text-base">{comparisonDiff.modified.length}</strong>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200">
                    <span className="text-rose-700 font-bold block">Removed / Missing</span>
                    <strong className="text-rose-800 font-mono text-base">{comparisonDiff.removed.length}</strong>
                  </div>
                </div>

                {comparisonDiff.modified.length > 0 && (
                  <div className="space-y-1.5">
                    <h5 className="text-xs font-bold text-slate-700 uppercase">Modified Components:</h5>
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs max-h-48 overflow-y-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-[10px] uppercase font-bold text-slate-600">
                          <tr>
                            <th className="px-3 py-1.5">Part Description</th>
                            <th className="px-3 py-1.5">Detected Changes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {comparisonDiff.modified.map((m, i) => (
                            <tr key={i} className="hover:bg-slate-50">
                              <td className="px-3 py-1.5 font-bold text-slate-900">{m.current.description}</td>
                              <td className="px-3 py-1.5 text-amber-800 font-mono">{m.changes.join(', ')}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsCompareModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* MODAL 7: NEW MACHINE FOLDER */}
      {/* ===================================================================== */}
      {isNewMachineModalOpen && (
        <Modal
          isOpen={isNewMachineModalOpen}
          onClose={() => setIsNewMachineModalOpen(false)}
          title="📁 Create New Machine Folder"
          subtitle="Add a top-level machine category to organize standard specifications"
          maxWidth="md"
          theme="light"
        >
          <div className="space-y-4 text-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Machine Name *</label>
              <input
                type="text"
                value={newMachineNameInput}
                onChange={(e) => setNewMachineNameInput(e.target.value)}
                placeholder="e.g. Linear Piston Capping Machine"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-blue-600 shadow-2xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Initial Machine Type / Model</label>
              <input
                type="text"
                value={newMachineTypeInput}
                onChange={(e) => setNewMachineTypeInput(e.target.value)}
                placeholder="e.g. Standard Model, 4-Head High Speed"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-blue-600 shadow-2xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsNewMachineModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newMachineNameInput.trim()) return;
                  const created = addMachineFolder(newMachineNameInput.trim(), [newMachineTypeInput.trim() || 'Standard Model']);
                  setSelectedMachineId(created.id);
                  setSelectedMachineType(created.types[0] || 'Standard Model');
                  setIsNewMachineModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Create Machine Folder
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* MODAL 8: NEW MACHINE TYPE */}
      {/* ===================================================================== */}
      {newTypeModalData && (
        <Modal
          isOpen={!!newTypeModalData}
          onClose={() => setNewTypeModalData(null)}
          title={`⚙️ Add Machine Type under ${newTypeModalData.machineName}`}
          subtitle="Create a new model or variant category"
          maxWidth="sm"
          theme="light"
        >
          <div className="space-y-4 text-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Model / Type Name *</label>
              <input
                type="text"
                value={newTypeNameInput}
                onChange={(e) => setNewTypeNameInput(e.target.value)}
                placeholder="e.g. 16-Head Ultra High Speed"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-blue-600 shadow-2xs font-semibold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewTypeModalData(null)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!newTypeNameInput.trim()) return;
                  addMachineType(newTypeModalData.machineId, newTypeNameInput.trim());
                  setSelectedMachineType(newTypeNameInput.trim());
                  setNewTypeModalData(null);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Add Type
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* MODAL 9: RENAME MACHINE FOLDER */}
      {/* ===================================================================== */}
      {renameMachineModalData && (
        <Modal
          isOpen={!!renameMachineModalData}
          onClose={() => setRenameMachineModalData(null)}
          title="✏️ Rename Machine Folder"
          subtitle="Update the machine name across the ERP"
          maxWidth="sm"
          theme="light"
        >
          <div className="space-y-4 text-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">New Machine Name *</label>
              <input
                type="text"
                value={renameMachineModalData.name}
                onChange={(e) => setRenameMachineModalData({ ...renameMachineModalData, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-blue-600 shadow-2xs font-semibold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRenameMachineModalData(null)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRenameMachineSubmit}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Save Name
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* MODAL 10: CREATE NEW BOM SPECIFICATION */}
      {/* ===================================================================== */}
      {isNewBOMModalOpen && (
        <Modal
          isOpen={isNewBOMModalOpen}
          onClose={() => setIsNewBOMModalOpen(false)}
          title="Create New BOM"
          subtitle="Define a reusable Bill of Materials specification"
          maxWidth="md"
          theme="light"
        >
          <div className="space-y-4 text-slate-800">
            {/* BOM Name (Autofocused) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                BOM Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                autoFocus
                value={newBOMForm.name}
                onChange={(e) => setNewBOMForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Standard 24-Head Rotary BOM"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-blue-600 shadow-2xs font-semibold placeholder:font-normal"
              />
            </div>

            {/* Machine Folder & Machine Model */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Machine Folder
                </label>
                <select
                  value={newBOMForm.machineName}
                  onChange={(e) => {
                    const chosenMachineName = e.target.value;
                    const found = masterMachines.find((m) => m.name === chosenMachineName);
                    const defaultModel = found?.types[0] || 'Standard Model';
                    const prefix = chosenMachineName.slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X') || 'STD';
                    setNewBOMForm((prev) => ({
                      ...prev,
                      machineName: chosenMachineName,
                      machineType: defaultModel,
                      bomNumber: `BOM-${prefix}-${Math.floor(10 + Math.random() * 90)}`,
                    }));
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-blue-600 shadow-2xs font-medium cursor-pointer"
                >
                  {masterMachines.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Machine Model
                </label>
                {(() => {
                  const targetMach = masterMachines.find((m) => m.name === newBOMForm.machineName);
                  const availableTypes = targetMach?.types || ['Standard Model'];
                  return (
                    <select
                      value={newBOMForm.machineType}
                      onChange={(e) => setNewBOMForm((prev) => ({ ...prev, machineType: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-blue-600 shadow-2xs font-medium cursor-pointer"
                    >
                      {availableTypes.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  );
                })()}
              </div>
            </div>

            {/* BOM Code & Revision */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  BOM Code / Number
                </label>
                <input
                  type="text"
                  value={newBOMForm.bomNumber}
                  onChange={(e) => setNewBOMForm((prev) => ({ ...prev, bomNumber: e.target.value }))}
                  placeholder="e.g. BOM-RMB-01"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs outline-none focus:border-blue-600 shadow-2xs font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Revision
                </label>
                <input
                  type="text"
                  value={newBOMForm.revision}
                  onChange={(e) => setNewBOMForm((prev) => ({ ...prev, revision: e.target.value }))}
                  placeholder="Rev A"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs outline-none focus:border-blue-600 shadow-2xs"
                />
              </div>
            </div>

            {/* Description or Notes (Optional) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Description or Notes <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <textarea
                value={newBOMForm.notes}
                onChange={(e) => setNewBOMForm((prev) => ({ ...prev, notes: e.target.value }))}
                rows={2}
                placeholder="Optional assembly notes, engineering comments..."
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-blue-600 shadow-2xs font-medium resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsNewBOMModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!newBOMForm.name.trim()}
                onClick={() => {
                  if (!newBOMForm.name.trim()) return;
                  const newBOM: MasterBOM = {
                    id: `bom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    name: newBOMForm.name.trim(),
                    bomNumber: newBOMForm.bomNumber.trim() || 'BOM-001',
                    machineName: newBOMForm.machineName || currentMachine?.name || (masterMachines[0]?.name || ''),
                    machineType: newBOMForm.machineType || currentType || 'Standard Model',
                    revision: newBOMForm.revision || 'Rev A',
                    status: newBOMForm.status || 'Active',
                    notes: newBOMForm.notes || '',
                    items: [],
                    createdBy: currentUser?.name || 'Engineer',
                    createdAt: new Date().toISOString(),
                    updatedBy: currentUser?.name || 'Engineer',
                    updatedAt: new Date().toISOString(),
                  };
                  addMasterBOM(newBOM);
                  setIsNewBOMModalOpen(false);
                  handleOpenBOM(newBOM);
                  confetti({ particleCount: 30, spread: 60 });
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create BOM</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* MODAL 11: DUPLICATE BOM */}
      {/* ===================================================================== */}
      {duplicateBOMModalData && (
        <Modal
          isOpen={!!duplicateBOMModalData}
          onClose={() => setDuplicateBOMModalData(null)}
          title="📋 Duplicate BOM Specification"
          subtitle={`Create an isolated copy of ${duplicateBOMModalData.name}`}
          maxWidth="md"
          theme="light"
        >
          <div className="space-y-4 text-slate-800">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">New BOM Name *</label>
              <input
                type="text"
                value={duplicateBOMNameInput}
                onChange={(e) => setDuplicateBOMNameInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-blue-600 shadow-2xs font-semibold"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDuplicateBOMModalData(null)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!duplicateBOMNameInput.trim()) return;
                  const cloned: MasterBOM = {
                    ...duplicateBOMModalData,
                    id: `bom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    name: duplicateBOMNameInput.trim(),
                    bomNumber: `${duplicateBOMModalData.bomNumber || 'BOM'}-COPY`,
                    revision: duplicateBOMModalData.revision || 'Rev A',
                    items: (duplicateBOMModalData.items || []).map((it) => ({
                      ...it,
                      id: `mbi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    })),
                    createdBy: currentUser?.name || 'Engineer',
                    createdAt: new Date().toISOString(),
                    updatedBy: currentUser?.name || 'Engineer',
                    updatedAt: new Date().toISOString(),
                  };
                  addMasterBOM(cloned);
                  setDuplicateBOMModalData(null);
                  handleOpenBOM(cloned);
                  confetti({ particleCount: 30, spread: 50 });
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Duplicate BOM
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* MODAL 12: DELETE BOM CONFIRMATION */}
      {/* ===================================================================== */}
      {deleteBOMModalData && (
        <Modal
          isOpen={!!deleteBOMModalData}
          onClose={() => setDeleteBOMModalData(null)}
          title="🗑️ Delete Master BOM Specification"
          subtitle="This deletes only the reusable template. Historical project orders and purchase orders remain intact."
          maxWidth="md"
          theme="light"
        >
          <div className="space-y-4 text-slate-800">
            <p className="text-xs text-slate-600">
              Are you sure you want to delete <strong>{deleteBOMModalData.name}</strong> ({deleteBOMModalData.bomNumber})?
            </p>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0 text-amber-600" />
              <span>Safe Isolation: Existing project requirements and purchase records are never affected.</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteBOMModalData(null)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  deleteMasterBOM(deleteBOMModalData.id);
                  setDeleteBOMModalData(null);
                  if (activeBOMId === deleteBOMModalData.id) {
                    setCurrentView('library');
                    setActiveBOMId(null);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* MODAL 13: HELP & USER GUIDE */}
      {/* ===================================================================== */}
      {isHelpModalOpen && (
        <Modal
          isOpen={isHelpModalOpen}
          onClose={() => setIsHelpModalOpen(false)}
          title="📘 BOM Management & Engineering Guide"
          subtitle="Standard operating procedures for factory staff and engineers"
          maxWidth="3xl"
          theme="light"
        >
          <div className="space-y-4 text-slate-800 text-xs">
            {/* Guide Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              {[
                { id: 'quickstart', label: '🚀 Quick Start' },
                { id: 'excel', label: '📊 Excel Import & Export' },
                { id: 'revisions', label: '🔄 Revision Tracking' },
                { id: 'load_project', label: '⚡ Loading into Projects' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setHelpSection(tab.id as any)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    helpSection === tab.id ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {helpSection === 'quickstart' && (
              <div className="space-y-3 leading-relaxed">
                <h4 className="text-sm font-bold text-slate-900">How BOM Management Works</h4>
                <p>
                  A <strong>Bill of Materials (BOM)</strong> is a reusable master specification of all stainless steel, raw materials, piping, and components required to build a machine.
                </p>
                <div className="space-y-2 pl-4 border-l-2 border-blue-500">
                  <div><strong>1. Machine Library:</strong> Machine folders group standard models (e.g. 24-Head Standard, 36-Head High Speed).</div>
                  <div><strong>2. BOM Editor:</strong> Add, edit, or paste material rows with dimensions, weights, and grades. Click any cell to edit directly.</div>
                  <div><strong>3. Project Isolation:</strong> When you load a BOM into a project, it creates independent project-specific copies. Editing project quantities never modifies the master BOM.</div>
                </div>
              </div>
            )}

            {helpSection === 'excel' && (
              <div className="space-y-3 leading-relaxed">
                <h4 className="text-sm font-bold text-slate-900">Excel Import & Export Guidelines</h4>
                <p>
                  You can upload existing factory drawings and BOM spreadsheets directly. Our system automatically matches column headers like <em>Sr. No., Part Description, Material Type, Size Specification, Quantity,</em> and <em>Unit</em>.
                </p>
                <p>
                  To preserve original drawing numbers (such as <code>10A</code> or skipped rows), select <strong>🔒 Preserve Imported</strong> in the Sr. No. mode dropdown.
                </p>
              </div>
            )}

            {helpSection === 'revisions' && (
              <div className="space-y-3 leading-relaxed">
                <h4 className="text-sm font-bold text-slate-900">Revision Comparison & Management</h4>
                <p>
                  When making design improvements to an existing machine, use <strong>Duplicate as New Revision</strong> (e.g., Rev A → Rev B). This ensures past manufacturing orders remain strictly linked to Rev A, while new orders can use Rev B.
                </p>
                <p>
                  Use <strong>Compare Revisions</strong> to visually see added, removed, and modified components side-by-side.
                </p>
              </div>
            )}

            {helpSection === 'load_project' && (
              <div className="space-y-3 leading-relaxed">
                <h4 className="text-sm font-bold text-slate-900">Loading Materials into Material Entry Workstation</h4>
                <p>
                  Click the <strong>⚡ Load Materials into Project</strong> button in the BOM editor to transfer chosen components directly into an active manufacturing order. You can adjust project quantities or exclude parts on the fly without changing the master template.
                </p>
              </div>
            )}

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsHelpModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold"
              >
                Close Guide
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ===================================================================== */}
      {/* MODAL 14: EDIT MATERIAL CARD */}
      {/* ===================================================================== */}
      {editingCardItem && (
        <Modal
          isOpen={!!editingCardItem}
          onClose={handleCloseCardEdit}
          title="✏️ Edit Material Specification Card"
          subtitle="Update material type, dimensions, quantity, or description"
          maxWidth="lg"
          theme="light"
        >
          <div className="space-y-4 text-slate-800 text-xs">
            {/* Unsaved changes notice */}
            {cardEditIsDirty && (
              <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span>You have unsaved changes in this card.</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Sr. No. */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Sr. No. {srNoMode === 'auto' && <span className="text-slate-400 font-normal">(Auto)</span>}
                </label>
                <input
                  type="text"
                  value={cardEditForm.srNo}
                  onChange={(e) => handleCardFieldChange('srNo', e.target.value)}
                  placeholder="e.g. 1, 10A"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs outline-none focus:border-blue-600 shadow-2xs font-bold"
                />
              </div>

              {/* Material Type */}
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Material Type / Grade *
                </label>
                <select
                  value={cardEditForm.materialType}
                  onChange={(e) => handleCardFieldChange('materialType', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold text-xs outline-none focus:border-blue-600 shadow-2xs cursor-pointer"
                >
                  {MATERIAL_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Description *
              </label>
              <input
                type="text"
                value={cardEditForm.description}
                onChange={(e) => handleCardFieldChange('description', e.target.value)}
                placeholder="e.g. Delrin / SS 812 Slat Chain Conveyor"
                className={`w-full px-3 py-2 rounded-xl bg-white border text-slate-900 text-xs outline-none shadow-2xs font-bold ${
                  cardEditErrors.description ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300 focus:border-blue-600'
                }`}
              />
              {cardEditErrors.description && (
                <p className="text-[10px] text-rose-600 font-bold mt-1">{cardEditErrors.description}</p>
              )}
            </div>

            {/* Size Specification */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Size Specification / Dimensions
              </label>
              <input
                type="text"
                value={cardEditForm.sizeSpecs}
                onChange={(e) => handleCardFieldChange('sizeSpecs', e.target.value)}
                placeholder="e.g. 80 x 6 x 485 mm, Width 82.5 mm Pitch 38.1 mm"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs outline-none focus:border-blue-600 shadow-2xs font-semibold"
              />
            </div>

            {/* Quantity and Unit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  value={cardEditForm.quantity}
                  onChange={(e) => handleCardFieldChange('quantity', e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl bg-white border font-mono text-emerald-700 font-black text-xs outline-none shadow-2xs ${
                    cardEditErrors.quantity ? 'border-rose-500 bg-rose-50/20' : 'border-slate-300 focus:border-blue-600'
                  }`}
                />
                {cardEditErrors.quantity && (
                  <p className="text-[10px] text-rose-600 font-bold mt-1">{cardEditErrors.quantity}</p>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Unit
                </label>
                <select
                  value={cardEditForm.unit}
                  onChange={(e) => handleCardFieldChange('unit', e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold text-xs outline-none focus:border-blue-600 shadow-2xs cursor-pointer"
                >
                  {['Nos', 'Meter', 'Kg', 'Set', 'Sheet', 'Liter', 'Length'].map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={handleCloseCardEdit}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCardEdit}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer active:scale-95 transition-all"
              >
                Save Changes
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Discard Card Edits Confirmation Modal */}
      {isDiscardCardEditModalOpen && (
        <Modal
          isOpen={isDiscardCardEditModalOpen}
          onClose={() => setIsDiscardCardEditModalOpen(false)}
          title="⚠️ Discard Unsaved Changes?"
          subtitle="You have modified fields in this material card"
          maxWidth="sm"
          theme="light"
        >
          <div className="space-y-4 text-slate-800 text-xs">
            <p className="text-slate-600">
              Are you sure you want to discard your edits? Any changes made to this material card will be lost.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsDiscardCardEditModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Keep Editing
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDiscardCardEditModalOpen(false);
                  setEditingCardItem(null);
                  setCardEditIsDirty(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Delete Materials Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <Modal
          isOpen={isBulkDeleteModalOpen}
          onClose={() => setIsBulkDeleteModalOpen(false)}
          title="🗑️ Confirm Delete Selected Materials"
          subtitle="Remove chosen specification rows from this BOM"
          maxWidth="sm"
          theme="light"
        >
          <div className="space-y-4 text-slate-800 text-xs">
            <p className="text-slate-600 leading-relaxed">
              Are you sure you want to delete <strong>{selectedRowIds.length}</strong> selected material card(s)?
            </p>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>You can undo this action immediately using Ctrl+Z or the Undo button.</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmBulkDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                Delete Selected
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Edit Machine Type Details Modal */}
      {editTypeDetailsModalData && (
        <Modal
          isOpen={!!editTypeDetailsModalData}
          onClose={() => setEditTypeDetailsModalData(null)}
          title="⚙️ Edit Machine Type / Subfolder Details"
          subtitle="Manage model configuration, internal code, and folder location"
          maxWidth="md"
          theme="light"
        >
          <div className="space-y-4 text-slate-800 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Machine Type Name *
              </label>
              <input
                type="text"
                value={editTypeDetailsModalData.name}
                onChange={(e) => setEditTypeDetailsModalData({ ...editTypeDetailsModalData, name: e.target.value })}
                placeholder="e.g. 24-Head Standard"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-blue-600 shadow-2xs font-bold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Parent Machine Folder
                </label>
                <select
                  value={editTypeDetailsModalData.parentFolderId}
                  onChange={(e) => setEditTypeDetailsModalData({ ...editTypeDetailsModalData, parentFolderId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-semibold text-xs outline-none focus:border-blue-600 shadow-2xs cursor-pointer"
                >
                  {masterMachines.map((m) => (
                    <option key={m.id} value={m.id}>
                      📁 {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Model / Variant
                </label>
                <input
                  type="text"
                  value={editTypeDetailsModalData.modelVariant}
                  onChange={(e) => setEditTypeDetailsModalData({ ...editTypeDetailsModalData, modelVariant: e.target.value })}
                  placeholder="e.g. Standard, High Speed, Custom"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-blue-600 shadow-2xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Internal Code / Reference
                </label>
                <input
                  type="text"
                  value={editTypeDetailsModalData.internalCode}
                  onChange={(e) => setEditTypeDetailsModalData({ ...editTypeDetailsModalData, internalCode: e.target.value })}
                  placeholder="e.g. MC-RMB-24"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs outline-none focus:border-blue-600 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  Status
                </label>
                <select
                  value={editTypeDetailsModalData.status}
                  onChange={(e) => setEditTypeDetailsModalData({ ...editTypeDetailsModalData, status: e.target.value as any })}
                  className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-semibold text-xs outline-none focus:border-blue-600 shadow-2xs cursor-pointer"
                >
                  <option value="Active">Active</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Description / Technical Specifications
              </label>
              <textarea
                rows={2}
                value={editTypeDetailsModalData.description}
                onChange={(e) => setEditTypeDetailsModalData({ ...editTypeDetailsModalData, description: e.target.value })}
                placeholder="e.g. Standard 24-station monoblock liquid filler with servo plunger mechanism"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-blue-600 shadow-2xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setEditTypeDetailsModalData(null)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditTypeDetails}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Duplicate Machine Type Modal */}
      {duplicateTypeModalData && (
        <Modal
          isOpen={!!duplicateTypeModalData}
          onClose={() => setDuplicateTypeModalData(null)}
          title="📋 Duplicate Machine Type"
          subtitle={`Create a copy of "${duplicateTypeModalData.sourceTypeName}"`}
          maxWidth="sm"
          theme="light"
        >
          <div className="space-y-4 text-slate-800 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                New Machine Type Name *
              </label>
              <input
                type="text"
                value={duplicateTypeModalData.newTypeName}
                onChange={(e) => setDuplicateTypeModalData({ ...duplicateTypeModalData, newTypeName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-blue-600 shadow-2xs font-bold"
              />
            </div>

            <label className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={duplicateTypeModalData.copyBOMs}
                onChange={(e) => setDuplicateTypeModalData({ ...duplicateTypeModalData, copyBOMs: e.target.checked })}
                className="rounded border-slate-300 text-blue-600 w-4 h-4"
              />
              <span className="font-semibold text-slate-700">
                Also copy all BOMs belonging to this machine type
              </span>
            </label>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDuplicateTypeModalData(null)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDuplicateType}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Duplicate Type
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Move Machine Type Modal */}
      {moveTypeModalData && (
        <Modal
          isOpen={!!moveTypeModalData}
          onClose={() => setMoveTypeModalData(null)}
          title="➡️ Move Machine Type to Another Folder"
          subtitle={`Reassign "${moveTypeModalData.typeName}" to a different parent machine folder`}
          maxWidth="sm"
          theme="light"
        >
          <div className="space-y-4 text-slate-800 text-xs">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Destination Machine Folder *
              </label>
              <select
                value={moveTypeModalData.targetMachineId}
                onChange={(e) => setMoveTypeModalData({ ...moveTypeModalData, targetMachineId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-semibold text-xs outline-none focus:border-blue-600 shadow-2xs cursor-pointer"
              >
                {masterMachines.map((m) => (
                  <option key={m.id} value={m.id} disabled={m.id === moveTypeModalData.sourceMachineId}>
                    📁 {m.name} {m.id === moveTypeModalData.sourceMachineId ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <p className="text-slate-500 text-[11px] leading-relaxed">
              Moving this type will also update the parent machine folder reference on all associated Master BOMs.
            </p>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMoveTypeModalData(null)}
                className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveMoveType}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Move Type
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Machine Type Confirmation Modal */}
      {deleteTypeConfirmModalData && (
        <Modal
          isOpen={!!deleteTypeConfirmModalData}
          onClose={() => setDeleteTypeConfirmModalData(null)}
          title="🗑️ Delete Machine Type"
          subtitle={`Confirm deletion of "${deleteTypeConfirmModalData.typeName}"`}
          maxWidth="md"
          theme="light"
        >
          <div className="space-y-4 text-slate-800 text-xs">
            {deleteTypeConfirmModalData.linkedBOMs.length > 0 ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Active BOMs Linked to this Machine Type</span>
                  </div>
                  <p className="text-xs leading-relaxed">
                    This machine type currently has <strong>{deleteTypeConfirmModalData.linkedBOMs.length}</strong> master BOM specification(s) linked to it:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    {deleteTypeConfirmModalData.linkedBOMs.map((b) => (
                      <li key={b.id} className="font-medium">
                        {b.name} ({b.bomNumber}) - {b.revision}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs font-semibold pt-1">
                    Instead of permanent deletion, we strongly recommend <strong>Archiving</strong> this type. Archiving keeps all your historical BOMs and projects intact while hiding it from daily selection menus.
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteTypeConfirmModalData(null)}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleConfirmArchiveInstead}
                      className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Archive Instead (Recommended)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmDeleteType}
                      className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-300 text-rose-700 text-xs font-bold cursor-pointer"
                    >
                      Delete Anyway
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-slate-600">
                  Are you sure you want to permanently delete machine type <strong>{deleteTypeConfirmModalData.typeName}</strong>? No BOMs are currently attached to this type.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteTypeConfirmModalData(null)}
                    className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteType}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer shadow-xs"
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
