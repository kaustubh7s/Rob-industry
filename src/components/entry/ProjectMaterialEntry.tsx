import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Layers,
  Plus,
  Trash2,
  Copy,
  Download,
  Upload,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  Building2,
  Cpu,
  Save,
  Check,
  Package,
  Boxes,
  Zap,
  ArrowRight,
  Calendar,
  Lock,
  Tag,
  Hash,
  ListFilter,
  FileCheck,
  ChevronDown,
  RotateCcw,
  ExternalLink,
  FolderKanban,
  CheckSquare,
  Square,
  History,
  FileSpreadsheet,
  PlusCircle,
  Eye,
  ShieldCheck,
  ShieldAlert,
  Globe,
  ShoppingCart,
  RefreshCw,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useERP } from '../../context/ERPContext';
import { MaterialType, MachineCategory, ProjectItem, ProjectMaterialRequirementItem } from '../../types/erp';
import { exportToExcel, parseExcelFile } from '../../utils/excelIntegration';
import { formatDate, getTodayFormatted } from '../../utils/calculations';
import { Modal } from '../common/Modal';
import { ProjectsDirectory } from '../projects/ProjectsDirectory';
import { ProjectDetailsView } from '../projects/ProjectDetailsView';
import { MemberAuthorizationManager } from '../admin/MemberAuthorizationManager';
import { ProcurementBasket } from '../procurement/ProcurementBasket';
import { getMaterialsForProject, isRequirementMatchingProjectName } from '../../utils/projectMaterialsHelper';
import { MACHINE_BOM_TEMPLATES, MachineBOMTemplate } from '../../data/machineBOMTemplates';
import { LiveWorldSSRatesModal } from '../rates/LiveWorldSSRatesModal';
import { MATERIAL_TYPES } from '../../data/materialTypes';
import { getDeletedRequirementTombstones, removeRequirementTombstone } from '../../utils/tombstones';
import { ExcelImportPreviewModal } from './ExcelImportPreviewModal';
import { analyzeExcelFile, SheetAnalysisResult, ParsedImportRow } from '../../utils/excelImportEngine';
import { dbUpsertRequirement, dbBulkUpsertRequirements, dbDeleteRequirement } from '../../services/supabaseService';
import * as XLSX from 'xlsx';

export interface EntryRow {
  id: string;
  machineName: string;
  date: string;
  poNo: string;
  srNo: number | string;
  materialType: MaterialType;
  sizeSpecs: string;
  quantity: number;
  unit: string;
  vendorName: string;
  description: string;
  orderedBy: string;
  projectName?: string;
  isEditing?: boolean;
}

/**
 * Sorts materials strictly in ascending order of Sr. No. (1, 2, 3...)
 * Material Entry workstation never groups materials project-wise.
 */
export const sortRowsByAscendingSrNo = <T extends { srNo?: any }>(rowList: T[]): T[] => {
  return [...rowList].sort((a, b) => {
    const parseSr = (val: any) => {
      if (val === undefined || val === null || val === '') return 99999999;
      const clean = String(val).trim();
      const num = parseFloat(clean.replace(/[^0-9.]/g, ''));
      return isNaN(num) ? 99999999 : num;
    };
    const numA = parseSr(a.srNo);
    const numB = parseSr(b.srNo);
    if (numA !== numB) return numA - numB;
    return String(a.srNo || '').localeCompare(String(b.srNo || ''), undefined, { numeric: true });
  });
};

const MACHINE_SUGGESTIONS: string[] = [];

const COMMON_VENDORS: string[] = [];

// Machine-specific frequent components for smart auto-fill suggestions (Learns dynamically from user entries)
const MACHINE_FREQUENT_COMPONENTS: Record<string, { description: string; materialType: MaterialType; sizeSpecs: string; qty: number; unit: string }[]> = {};

const COMMON_DESCRIPTIONS: string[] = [];

const COMMON_SIZES: string[] = [];

const DRAFT_STORAGE_KEY = 'RSB_PROJECT_MATERIAL_ENTRY_10COL_WORKFLOW_V4';

export const ProjectMaterialEntry: React.FC = () => {
  const {
    projects,
    addProject,
    updateProject,
    projectRequirements,
    addProjectRequirement,
    updateProjectRequirement,
    bulkImportProjectRequirements,
    replaceProjectRequirements,
    importMaterialRequirements,
    deleteProjectRequirement,
    deleteProjectRequirements,
    refreshDatabase,
    trashItems,
    restoreFromTrash,
    permanentlyDeleteFromTrash,
    emptyTrash,
    currentUser,
    vendors,
    customers,
    machines,
    learnMachine,
    learnCustomer,
    learnVendor,
    logAudit,
    activeTab,
    setActiveTab,
    resetToDemoData,
    orders,
    materials,
    addMaterial,
    isMaintenanceMode,
    toggleMaintenanceMode,
    isRootAdmin,
  } = useERP();

  const isStoreIncharge = currentUser?.role === 'store_incharge';
  const isKaustubhAdmin =
    currentUser?.id === 'usr-kaustubh' ||
    currentUser?.email?.toLowerCase() === 'kaustubh@rsbequipments.com' ||
    currentUser?.name?.toLowerCase() === 'kaustubh' ||
    currentUser?.role === 'kaustubh';

  const canDeleteMasterRecords = Boolean(
    currentUser?.permissions?.canDeleteRecords ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'kaustubh' ||
    currentUser?.name?.toLowerCase() === 'rahul' ||
    isKaustubhAdmin
  );

  // Mode View State: 'entry' | 'projects' | 'procurement' | 'details' | 'members'
  const [activeViewMode, setActiveViewMode] = useState<'entry' | 'projects' | 'procurement' | 'details' | 'members'>(() => {
    if (currentUser?.role === 'store_incharge') return 'projects';
    if (activeTab === 'projects') return 'projects';
    if (activeTab === 'procurement') return 'procurement';
    if (activeTab === 'members') return 'members';
    return 'entry';
  });

  // Targeted Project filter for Order Basket navigation
  const [basketProjectFilter, setBasketProjectFilter] = useState<string | undefined>(undefined);

  // Sync activeViewMode with activeTab from global context
  useEffect(() => {
    if (activeTab === 'entry' || activeTab === 'requirements') {
      setActiveViewMode('entry');
    } else if (activeTab === 'projects') {
      setActiveViewMode('projects');
    } else if (activeTab === 'procurement') {
      setActiveViewMode('procurement');
    } else if (activeTab === 'members') {
      setActiveViewMode('members');
    }
  }, [activeTab]);

  useEffect(() => {
    if (isStoreIncharge && activeViewMode === 'entry') {
      setActiveViewMode('projects');
    }
  }, [isStoreIncharge, activeViewMode]);

  const [selectedDetailProject, setSelectedDetailProject] = useState<ProjectItem | null>(null);

  // Machine Name & Header Workflow Fields (Machine Name is primary entity)
  const [machineName, setMachineName] = useState(() => projects[0]?.machineName || projects[0]?.machineType || '');
  const [vendorName, setVendorName] = useState(() => vendors[0]?.name || '');
  const [poNo, setPoNo] = useState('');
  const [entryDate, setEntryDate] = useState(() => getTodayFormatted());
  const [selectedProjectName, setSelectedProjectName] = useState<string>(() => projects[0]?.name || '');
  const [manualSrNo, setManualSrNo] = useState<string>('1');

  // Custom Options Dynamic Memory with Local Storage Persistence
  const [customMachines, setCustomMachines] = useState<string[]>([]);
  const [customMaterials, setCustomMaterials] = useState<string[]>([]);
  const [customVendors, setCustomVendors] = useState<string[]>([]);
  const [customUnits, setCustomUnits] = useState<string[]>(() => {
    const saved = localStorage.getItem('rsb_custom_units');
    return saved ? JSON.parse(saved) : ['Nos', 'Kg', 'Mtr', 'Sets', 'Pcs', 'Ltr', 'Sheet'];
  });
  const [customDescs, setCustomDescs] = useState<string[]>(() => {
    const saved = localStorage.getItem('rsb_custom_descriptions');
    return saved ? JSON.parse(saved) : [];
  });
  const [customSizes, setCustomSizes] = useState<string[]>(() => {
    const saved = localStorage.getItem('rsb_custom_sizes');
    return saved ? JSON.parse(saved) : [];
  });

  // Dynamic Learning Helper Functions
  const learnDescription = (desc: string) => {
    const clean = (desc || '').trim();
    if (!clean) return;
    setCustomDescs((prev) => {
      if (prev.includes(clean)) return prev;
      const updated = [clean, ...prev];
      localStorage.setItem('rsb_custom_descriptions', JSON.stringify(updated));
      return updated;
    });
  };

  const learnSize = (size: string) => {
    const clean = (size || '').trim();
    if (!clean) return;
    setCustomSizes((prev) => {
      if (prev.includes(clean)) return prev;
      const updated = [clean, ...prev];
      localStorage.setItem('rsb_custom_sizes', JSON.stringify(updated));
      return updated;
    });
  };

  const learnUnit = (unit: string) => {
    const clean = (unit || '').trim();
    if (!clean) return;
    setCustomUnits((prev) => {
      if (prev.includes(clean)) return prev;
      const updated = [...prev, clean];
      localStorage.setItem('rsb_custom_units', JSON.stringify(updated));
      return updated;
    });
  };

  // Keyboard Navigation Forwarding Refs
  const machineInputRef = useRef<HTMLInputElement>(null);
  const vendorInputRef = useRef<HTMLInputElement>(null);
  const poNoInputRef = useRef<HTMLInputElement>(null);
  const entryDateInputRef = useRef<HTMLInputElement>(null);
  const manualSrNoInputRef = useRef<HTMLInputElement>(null);
  const quickSrNoInputRef = useRef<HTMLInputElement>(null);
  const quickDescInputRef = useRef<HTMLInputElement>(null);
  const quickMatTypeRef = useRef<HTMLSelectElement>(null);
  const quickSizeInputRef = useRef<HTMLInputElement>(null);
  const quickQtyInputRef = useRef<HTMLInputElement>(null);
  const quickUnitRef = useRef<HTMLSelectElement>(null);

  // Modals for Custom Additions & Direct Project Creation
  const [isAddProjectModalOpen, setIsAddProjectModalOpen] = useState(false);
  const [isTrashModalOpen, setIsTrashModalOpen] = useState(false);
  const [isCustomMachineModalOpen, setIsCustomMachineModalOpen] = useState(false);
  const [isCustomMaterialModalOpen, setIsCustomMaterialModalOpen] = useState(false);
  const [isCustomVendorModalOpen, setIsCustomVendorModalOpen] = useState(false);
  const [isCustomUnitModalOpen, setIsCustomUnitModalOpen] = useState(false);
  const [isCustomDescModalOpen, setIsCustomDescModalOpen] = useState(false);
  const [isCustomSizeModalOpen, setIsCustomSizeModalOpen] = useState(false);
  const [isRatesModalOpen, setIsRatesModalOpen] = useState(false);
  const [isBOMModalOpen, setIsBOMModalOpen] = useState(false);
  const [isFactoryResetModalOpen, setIsFactoryResetModalOpen] = useState(false);
  const [selectedBOMTemplateKey, setSelectedBOMTemplateKey] = useState<string>(() => Object.keys(MACHINE_BOM_TEMPLATES)[0] || '');
  const [selectedBOMPartIndices, setSelectedBOMPartIndices] = useState<number[]>([]);

  // Full Factory Baseline Reset Handler
  const handleConfirmFactoryReset = () => {
    if (!isRootAdmin) {
      alert('Access Denied: Only Root Admins (Amit and Kaustubh) can perform a Factory Reset.');
      setIsFactoryResetModalOpen(false);
      return;
    }
    resetToDemoData();
    setRows([]);
    setCustomDescs([]);
    setCustomSizes([]);
    setCustomUnits(['Nos', 'Kg', 'Mtr', 'Sets', 'Pcs', 'Ltr', 'Sheet']);
    setMachineName('');
    setVendorName('');
    setPoNo('');
    setSelectedProjectName('');
    setIsFactoryResetModalOpen(false);
    setSaveToast('⚡ Factory Reset Complete! All data, suggestions, and BOMs restored to clean blank slate.');
    setTimeout(() => setSaveToast(null), 4000);
  };

  // Temporary inputs for custom modals
  const [customMachineInput, setCustomMachineInput] = useState('');
  const [newCustomVal, setNewCustomVal] = useState('');

  // Global Event Listeners for Header & Sidebar Actions
  useEffect(() => {
    const handleOpenAdd = () => setIsAddProjectModalOpen(true);
    const handleOpenBOM = () => handleOpenBOMModal(machineName);
    const handleOpenRates = () => setIsRatesModalOpen(true);
    const handleOpenTrash = () => setIsTrashModalOpen(true);

    window.addEventListener('rsb:open-add-project', handleOpenAdd);
    window.addEventListener('rsb:open-load-bom', handleOpenBOM);
    window.addEventListener('rsb:open-rates', handleOpenRates);
    window.addEventListener('rsb:open-trash', handleOpenTrash);

    return () => {
      window.removeEventListener('rsb:open-add-project', handleOpenAdd);
      window.removeEventListener('rsb:open-load-bom', handleOpenBOM);
      window.removeEventListener('rsb:open-rates', handleOpenRates);
      window.removeEventListener('rsb:open-trash', handleOpenTrash);
    };
  }, [machineName]);
  const [customMaterialInput, setCustomMaterialInput] = useState('');
  const [customVendorInput, setCustomVendorInput] = useState('');
  const [customUnitInput, setCustomUnitInput] = useState('');
  const [customDescInput, setCustomDescInput] = useState('');
  const [customSizeInput, setCustomSizeInput] = useState('');

  // New Project Form State: Project Name, Client Name, Client Number, Start Date, Target Date
  const [newProjectForm, setNewProjectForm] = useState({
    name: '',
    clientName: '',
    clientNumber: '',
    machineName: '',
    startDate: new Date().toISOString().split('T')[0],
    targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  // Quick Material Addition Row (Step 4)
  const [quickSrNo, setQuickSrNo] = useState('');
  const [quickDesc, setQuickDesc] = useState('');
  const [quickMatType, setQuickMatType] = useState<string>('SS Flat');
  const [quickSize, setQuickSize] = useState('');
  const [quickQty, setQuickQty] = useState<number>(1);
  const [quickUnit, setQuickUnit] = useState('Nos');

  // Dynamic merged options
  const allMachineOptions = useMemo(() => {
    return Array.from(
      new Set([
        ...customMachines,
        ...machines.map((m) => m.name || m.type || '').filter(Boolean),
        ...projects.map((p) => p.machineName || p.machineType || '').filter(Boolean),
        ...projectRequirements.map((r) => r.machineName || r.machineType || '').filter(Boolean),
      ])
    );
  }, [customMachines, machines, projects, projectRequirements]);

  const allVendorOptions = useMemo(() => {
    return Array.from(
      new Set([
        ...COMMON_VENDORS,
        ...customVendors,
        ...vendors.map((v) => v.name).filter(Boolean),
        ...projects.map((p) => p.vendorName || p.vendor || '').filter(Boolean),
        ...projectRequirements.map((r) => r.vendorName || r.vendor || '').filter(Boolean),
      ])
    );
  }, [customVendors, vendors, projects, projectRequirements]);

  // Seed Initial 10-column table directly with ALL materials across all projects from context/DB (Ordered strictly by ascending Sr. No.)
  const [rows, setRows] = useState<EntryRow[]>(() => {
    const tombstones = getDeletedRequirementTombstones();
    const allMats = (projectRequirements || []).filter((m) => Boolean(m && m.id && !tombstones.has(m.id)));
    const mapped = allMats.map((m, idx) => ({
      id: m.id,
      machineName: m.machineName || m.machineType || '',
      date: formatDate(m.poDate || m.date || getTodayFormatted()),
      poNo: m.poNumber || m.poNo || '',
      srNo: (m.srNo !== undefined && m.srNo !== null && String(m.srNo).trim() !== '') ? m.srNo : idx + 1,
      materialType: (m.materialType || 'SS Flat') as MaterialType,
      sizeSpecs: m.sizeSpecs || '',
      quantity: Number(m.quantity) || 1,
      unit: m.unit || 'Nos',
      vendorName: m.vendorName || m.vendor || '',
      description: m.description || '',
      orderedBy: m.orderedBy || 'Amit',
      projectName: m.projectName || '',
    }));
    return sortRowsByAscendingSrNo(mapped);
  });

  const allMaterialTypes = useMemo(() => {
    return Array.from(
      new Set([
        ...MATERIAL_TYPES,
        ...customMaterials,
        ...projectRequirements.map((r) => r.materialType).filter(Boolean),
        ...rows.map((r) => r.materialType).filter(Boolean),
      ])
    );
  }, [customMaterials, projectRequirements, rows]);


  const allDescriptionOptions = useMemo(() => {
    return Array.from(
      new Set([
        ...COMMON_DESCRIPTIONS,
        ...customDescs,
        ...projectRequirements.map((r) => r.description).filter(Boolean),
        ...rows.map((r) => r.description).filter(Boolean),
      ])
    );
  }, [customDescs, projectRequirements, rows]);

  const allSizeOptions = useMemo(() => {
    return Array.from(
      new Set([
        ...COMMON_SIZES,
        ...customSizes,
        ...projectRequirements.map((r) => r.sizeSpecs).filter(Boolean),
        ...rows.map((r) => r.sizeSpecs).filter(Boolean),
      ])
    );
  }, [customSizes, projectRequirements, rows]);

  const allUnits = useMemo(() => {
    return Array.from(new Set([...customUnits]));
  }, [customUnits]);

  // Ordered By is locked to the logged-in user (Amit, Kaustubh, Rahul)
  const activeOrderedBy = currentUser?.name || 'Amit';

  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMaterialType, setFilterMaterialType] = useState('ALL');
  const [filterVendor, setFilterVendor] = useState('ALL');
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<string>('Just now');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImportPreviewOpen, setIsImportPreviewOpen] = useState(false);
  const [importWorkbook, setImportWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [importAnalysis, setImportAnalysis] = useState<SheetAnalysisResult | null>(null);
  const [importFileName, setImportFileName] = useState<string>('');
  const [isSavingOrder, setIsSavingOrder] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUserManuallyEditingRef = useRef<boolean>(false);
  const cellEditTimerRef = useRef<any>(null);
  const lastSelectedProjectRef = useRef<string>('');

  const syncRowToDatabaseAndContext = (row: EntryRow, targetPrj?: string) => {
    const prjName = targetPrj || row.projectName || selectedProjectName || (projects.length > 0 ? projects[0].name : 'Project-1');
    const existingProject = projects.find((p) => p.name.trim().toLowerCase() === prjName.trim().toLowerCase());
    const custName = existingProject?.customer || existingProject?.clientName || prjName;
    const reqItem: ProjectMaterialRequirementItem = {
      id: row.id,
      srNo: (row.srNo !== undefined && row.srNo !== null && String(row.srNo).trim() !== '') ? row.srNo : 1,
      projectName: row.projectName || prjName,
      customerName: custName,
      poNumber: row.poNo || poNo,
      poDate: formatDate(row.date || entryDate),
      date: formatDate(row.date || entryDate),
      machineType: (row.machineName || machineName || prjName) as any,
      machineName: row.machineName || machineName || prjName,
      poNo: row.poNo || poNo,
      vendorName: row.vendorName || vendorName,
      vendor: row.vendorName || vendorName,
      description: row.description || '',
      materialType: row.materialType,
      materialGrade: 'SS 304',
      sizeSpecs: row.sizeSpecs || '',
      quantity: Number(row.quantity) || 1,
      unit: row.unit || 'Nos',
      orderedBy: row.orderedBy || activeOrderedBy,
      orderSource: 'Customer PO',
      productionStatus: 'In Production',
      stockStatus: 'Available',
      qcStatus: 'Passed',
      dispatchStatus: 'Ready',
      bomRef: '',
      availableStock: 0,
      shortageQty: 0,
      totalCost: 750,
      materialCost: 500,
      laborCost: 150,
      machineCost: 100,
      outsourcingCost: 0,
      notes: `RSB Machine Workflow | Ordered by ${row.orderedBy || activeOrderedBy}`,
    };
    addProjectRequirement(reqItem);

    // Also auto-learn / catalog into materials table if not already present
    const spec = (row.sizeSpecs || '').trim().toLowerCase();
    const desc = (row.description || '').trim().toLowerCase();
    const hasMat = (materials || []).some(
      (m) =>
        (m.sizeSpecs && m.sizeSpecs.trim().toLowerCase() === spec) ||
        (m.name && m.name.trim().toLowerCase() === desc)
    );
    if (!hasMat && row.description && row.sizeSpecs) {
      addMaterial({
        code: `MAT-${(row.materialType || 'SS').toUpperCase().replace(/\s+/g, '-')}-${Date.now().toString().slice(-4)}`,
        name: `${row.description} (${row.sizeSpecs})`,
        type: row.materialType,
        grade: 'SS 304',
        thickness: 5,
        sizeSpecs: row.sizeSpecs,
        unit: row.unit || 'Nos',
        unitWeightKg: 2.5,
        currentStock: 0,
        reservedStock: 0,
        minStock: 5,
        reorderLevel: 10,
        unitCost: 450,
        vendor: row.vendorName || vendorName || 'Standard Vendor',
        notes: `Auto-cataloged from Material Entry for ${prjName}`,
      });
    }
  };

  // Auto-save draft to localStorage (clears draft when table is emptied)
  useEffect(() => {
    if (rows.length > 0) {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(rows));
      if (selectedProjectName) {
        localStorage.setItem(`RSB_PROJECT_DRAFT_${selectedProjectName}`, JSON.stringify(rows));
      }
    } else {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      if (selectedProjectName) {
        localStorage.removeItem(`RSB_PROJECT_DRAFT_${selectedProjectName}`);
      }
    }
    const now = new Date();
    setLastAutoSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }, [rows, selectedProjectName]);


  // Normalize Sr Numbers & sort strictly in ascending order of Sr. No. (1, 2, 3...)
  const normalizeSrNumbers = (rowList: EntryRow[]) => {
    const normalized = rowList.map((r, index) => ({
      ...r,
      srNo: (r.srNo !== undefined && r.srNo !== null && String(r.srNo).trim() !== '')
        ? r.srNo
        : index + 1,
    }));
    return sortRowsByAscendingSrNo(normalized);
  };

  // Sync selectedProjectName when projects list updates: ensure selected project still exists
  useEffect(() => {
    if (projects.length > 0) {
      try {
        const saved = localStorage.getItem('RSB_ACTIVE_SELECTED_PROJECT');
        const savedProject = saved && projects.find((p) => p.name.trim().toLowerCase() === saved.trim().toLowerCase());
        if (savedProject) {
          if (selectedProjectName.trim().toLowerCase() !== savedProject.name.trim().toLowerCase()) {
            setSelectedProjectName(savedProject.name);
          }
          return;
        }
      } catch (e) {}

      const exists = projects.some((p) => p.name.trim().toLowerCase() === (selectedProjectName || '').trim().toLowerCase());
      if (!exists) {
        setSelectedProjectName(projects[0].name);
      }
    } else {
      setSelectedProjectName('');
      try {
        localStorage.removeItem('RSB_ACTIVE_SELECTED_PROJECT');
      } catch (e) {}
    }
  }, [projects, selectedProjectName]);

  // REAL-TIME LIVE WORKSTATION SYNC: Synchronize master file rows (ALL projects) & update active project workflow header
  useEffect(() => {
    // 1. If project selection changed, configure the 3-step order workflow header fields for adding items to that project
    if (selectedProjectName) {
      const isProjectSwitch = lastSelectedProjectRef.current.trim().toLowerCase() !== selectedProjectName.trim().toLowerCase();
      if (isProjectSwitch) {
        lastSelectedProjectRef.current = selectedProjectName;
        const currentProject = projects.find((p) => p.name.trim().toLowerCase() === selectedProjectName.trim().toLowerCase());
        if (currentProject) {
          if (currentProject.machineName || currentProject.machineType) {
            setMachineName(currentProject.machineName || currentProject.machineType || currentProject.name);
          }
          if (currentProject.vendorName || currentProject.vendor) {
            setVendorName(currentProject.vendorName || currentProject.vendor || '');
          }
          if (currentProject.poNo || currentProject.poNumber) {
            setPoNo(currentProject.poNo || currentProject.poNumber || '');
          }
          if (currentProject.date || currentProject.startDate) {
            setEntryDate(formatDate(currentProject.date || currentProject.startDate));
          }
        }
      }
    } else {
      lastSelectedProjectRef.current = '';
      setMachineName('');
      setPoNo('');
      setVendorName('');
    }

    // 2. Synchronize Master File rows (ALL materials across ALL projects without filtering)
    const isActivelyTypingInTable = typeof document !== 'undefined' &&
      document.activeElement &&
      (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') &&
      document.activeElement.closest('table');

    if (isActivelyTypingInTable) return;

    const tombstones = getDeletedRequirementTombstones();
    const allMats = (projectRequirements || []).filter((m) => Boolean(m && m.id && !tombstones.has(m.id)));
    const mappedMasterRows: EntryRow[] = allMats.map((m, idx) => ({
      id: m.id,
      machineName: m.machineName || m.machineType || '',
      date: formatDate(m.poDate || m.date || getTodayFormatted()),
      poNo: m.poNumber || m.poNo || '',
      srNo: (m.srNo !== undefined && m.srNo !== null && String(m.srNo).trim() !== '')
        ? m.srNo
        : idx + 1,
      materialType: (m.materialType || 'SS Flat') as MaterialType,
      sizeSpecs: m.sizeSpecs || '',
      quantity: Number(m.quantity) || 1,
      unit: m.unit || 'Nos',
      vendorName: m.vendor || m.vendorName || '',
      description: m.description || '',
      orderedBy: m.orderedBy || activeOrderedBy,
      projectName: m.projectName || '',
    }));

    const sortedMasterRows = sortRowsByAscendingSrNo(mappedMasterRows);

    setRows((prev) => {
      if (isUserManuallyEditingRef.current) return prev;
      return sortedMasterRows;
    });
  }, [projectRequirements, selectedProjectName, projects, activeOrderedBy]);


  // Find previous similar orders for the selected machine
  const previousSimilarOrders = useMemo(() => {
    const cleanMachine = (machineName || '').trim().toLowerCase();
    if (!cleanMachine) return [];

    return projects.filter((p) => {
      const pMachine = (p.machineName || p.machineType || '').toLowerCase();
      return pMachine.includes(cleanMachine) || cleanMachine.includes(pMachine);
    });
  }, [machineName, projects]);

  // Smart suggestions for the selected machine (Dynamically learns from last and previous orders)
  const suggestedFrequentParts = useMemo(() => {
    const cleanMachine = (machineName || '').trim().toLowerCase();
    const staticList =
      MACHINE_FREQUENT_COMPONENTS[
        Object.keys(MACHINE_FREQUENT_COMPONENTS).find((k) => k.toLowerCase() === cleanMachine) || ''
      ] || [];

    // Dynamically learn parts entered in previous orders for this machine
    const learnedParts: { description: string; materialType: MaterialType; sizeSpecs: string; qty: number; unit: string }[] = [];

    projectRequirements.forEach((r) => {
      const rMch = (r.machineName || r.machineType || '').trim().toLowerCase();
      const matchesMachine = cleanMachine ? rMch.includes(cleanMachine) || cleanMachine.includes(rMch) : true;
      if (matchesMachine && r.description && r.sizeSpecs) {
        const alreadyInLearned = learnedParts.some(
          (lp) =>
            lp.description.toLowerCase() === r.description.toLowerCase() &&
            lp.sizeSpecs.toLowerCase().replace(/\s+/g, '') === r.sizeSpecs.toLowerCase().replace(/\s+/g, '')
        );
        if (!alreadyInLearned) {
          learnedParts.push({
            description: r.description.trim(),
            materialType: (r.materialType || 'SS Flat') as MaterialType,
            sizeSpecs: r.sizeSpecs.trim(),
            qty: r.quantity || 2,
            unit: r.unit || 'Nos',
          });
        }
      }
    });

    // Merge static default suggestions with dynamically learned parts from past orders
    const combined = [...staticList];
    learnedParts.forEach((lp) => {
      const exists = combined.some(
        (c) =>
          c.description.toLowerCase() === lp.description.toLowerCase() &&
          c.sizeSpecs.toLowerCase().replace(/\s+/g, '') === lp.sizeSpecs.toLowerCase().replace(/\s+/g, '')
      );
      if (!exists) {
        combined.push(lp);
      }
    });

    if (combined.length > 0) return combined;
    return [];
  }, [machineName, projectRequirements]);

  // Open existing project in Entry Sheet (Configures active project for rapid entry while keeping Master Table intact)
  const handleOpenProjectInEntry = (proj: ProjectItem) => {
    lastSelectedProjectRef.current = proj.name;
    setSelectedProjectName(proj.name);
    if (proj.machineName || proj.machineType) {
      setMachineName(proj.machineName || proj.machineType || proj.name);
    }
    if (proj.vendorName || proj.vendor) {
      setVendorName(proj.vendorName || proj.vendor || '');
    }
    if (proj.poNo || proj.poNumber) {
      setPoNo(proj.poNo || proj.poNumber || '');
    }
    if (proj.date || proj.startDate) {
      setEntryDate(formatDate(proj.date || proj.startDate));
    }

    setActiveViewMode('entry');
    setActiveTab('entry');
    setSaveToast(`Active project: "${proj.name}". Showing Master Material Specification Matrix.`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Handle Smart Duplicate / Use Previous Order
  const handleUsePreviousOrder = (prevProject: ProjectItem) => {
    const prevMachine = prevProject.machineName || prevProject.machineType || machineName;
    const prevVendor = prevProject.vendorName || prevProject.vendor || vendorName;
    const prevPo = prevProject.poNo || prevProject.poNumber || poNo;
    const prevDate = prevProject.date || prevProject.createdDate || entryDate;

    setSelectedProjectName(prevProject.name);
    setMachineName(prevMachine);
    setVendorName(prevVendor);
    setPoNo(prevPo);
    setEntryDate(prevDate);

    const prevMaterials = getMaterialsForProject(prevProject, projectRequirements);
    if (prevMaterials.length > 0) {
      const newRows: EntryRow[] = prevMaterials.map((m, idx) => ({
        id: `prev-${Date.now()}-${idx}`,
        machineName: prevMachine,
        date: prevDate,
        poNo: prevPo,
        srNo: idx + 1,
        materialType: m.materialType as MaterialType,
        sizeSpecs: m.sizeSpecs,
        quantity: m.quantity,
        unit: m.unit || 'Nos',
        vendorName: prevVendor,
        description: m.description,
        orderedBy: activeOrderedBy,
        projectName: prevProject.name,
      }));
      setRows(newRows);
      confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
      setSaveToast(`Loaded previous order for Machine "${prevMachine}" with ${newRows.length} materials!`);
    } else {
      setSaveToast(`Loaded order header for "${prevProject.name}"`);
    }
    setTimeout(() => setSaveToast(null), 3500);
  };

  // Copy Materials Only
  const handleCopyMaterials = (prevProject: ProjectItem) => {
    const prevMaterials = getMaterialsForProject(prevProject, projectRequirements, orders);
    if (prevMaterials.length === 0) {
      alert(`No material records found in project ${prevProject.name}`);
      return;
    }

    const targetProject = selectedProjectName || (projects.length > 0 ? projects[0].name : 'Project-1');

    const copiedRows: EntryRow[] = prevMaterials.map((m, idx) => ({
      id: `copy-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      machineName: machineName || m.machineName || m.machineType || prevProject.machineName || prevProject.machineType || 'Machine',
      date: entryDate,
      poNo: poNo || m.poNo || m.poNumber || prevProject.poNo || prevProject.poNumber || '',
      srNo: rows.length + idx + 1,
      materialType: (m.materialType || 'SS Flat') as MaterialType,
      sizeSpecs: m.sizeSpecs || '',
      quantity: Number(m.quantity) || 1,
      unit: m.unit || 'Nos',
      vendorName: vendorName || m.vendorName || m.vendor || prevProject.vendorName || prevProject.vendor || '',
      description: m.description || '',
      orderedBy: activeOrderedBy,
      projectName: targetProject,
    }));

    setRows((prev) => normalizeSrNumbers([...prev, ...copiedRows]));
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    setSaveToast(`Copied ${copiedRows.length} materials into "${targetProject}"!`);
    setTimeout(() => setSaveToast(null), 3500);
  };

  // Duplicate Order (Generates new PO entry and copies all materials with new unique record IDs)
  const handleDuplicateOrder = (prevProject: ProjectItem) => {
    const prevMachine = prevProject.machineName || prevProject.machineType || machineName || prevProject.name;
    const prevVendor = prevProject.vendorName || prevProject.vendor || vendorName;
    const currentPo = String(prevProject.poNo || prevProject.poNumber || 'PO-2026-1');

    let newPo = 'PO-2026-1';
    const match = currentPo.match(/^(.*?)(\d+)$/);
    if (match) {
      newPo = `${match[1]}${parseInt(match[2], 10) + 1}`;
    } else {
      newPo = `${currentPo}-copy`;
    }

    const newProjectName = `${prevProject.name} (${newPo})`;

    setSelectedProjectName(newProjectName);
    setMachineName(prevMachine);
    setVendorName(prevVendor);
    setPoNo(newPo);

    const prevMaterials = getMaterialsForProject(prevProject, projectRequirements, orders);
    const newRows: EntryRow[] = prevMaterials.map((m, idx) => ({
      id: `dup-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      machineName: prevMachine,
      date: entryDate,
      poNo: newPo,
      srNo: (m.srNo !== undefined && m.srNo !== null && String(m.srNo).trim() !== '') ? m.srNo : idx + 1,
      materialType: (m.materialType || 'SS Flat') as MaterialType,
      sizeSpecs: m.sizeSpecs || '',
      quantity: Number(m.quantity) || 1,
      unit: m.unit || 'Nos',
      vendorName: prevVendor,
      description: m.description || '',
      orderedBy: activeOrderedBy,
      projectName: newProjectName,
    }));

    setRows(newRows);
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    setSaveToast(`Created new Order PO #${newPo} for "${newProjectName}" with ${newRows.length} items!`);
    setTimeout(() => setSaveToast(null), 4000);
  };


  // Add 1-click suggested part
  const handleAddSuggestedPart = (part: { description: string; materialType: MaterialType; sizeSpecs: string; qty: number; unit: string }) => {
    const targetProject = selectedProjectName || (projects.length > 0 ? projects[0].name : 'Project-1');
    const newRow: EntryRow = {
      id: `sug-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      machineName: machineName || targetProject,
      date: entryDate || new Date().toISOString().split('T')[0],
      poNo: poNo || '',
      srNo: rows.length + 1,
      materialType: part.materialType,
      sizeSpecs: part.sizeSpecs,
      quantity: part.qty,
      unit: part.unit,
      vendorName: vendorName || '',
      description: part.description,
      orderedBy: activeOrderedBy,
      projectName: targetProject,
    };

    const nextRows = normalizeSrNumbers([...rows, newRow]);
    setRows(nextRows);
    localStorage.setItem(`RSB_PROJECT_DRAFT_${targetProject}`, JSON.stringify(nextRows));
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(nextRows));
    syncRowToDatabaseAndContext(newRow, targetProject);

    setSaveToast(`Added ${part.description} (${part.sizeSpecs}) • Synced to DB`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Add all suggested parts in 1 click
  const handleAddAllSuggestedParts = () => {
    const targetProject = selectedProjectName || (projects.length > 0 ? projects[0].name : 'Project-1');
    const newRows: EntryRow[] = suggestedFrequentParts.map((part, idx) => ({
      id: `sug-all-${Date.now()}-${idx}`,
      machineName: machineName || targetProject,
      date: entryDate || new Date().toISOString().split('T')[0],
      poNo: poNo || '',
      srNo: rows.length + idx + 1,
      materialType: part.materialType,
      sizeSpecs: part.sizeSpecs,
      quantity: part.qty,
      unit: part.unit,
      vendorName: vendorName || '',
      description: part.description,
      orderedBy: activeOrderedBy,
      projectName: targetProject,
    }));

    const nextRows = normalizeSrNumbers([...rows, ...newRows]);
    setRows(nextRows);
    localStorage.setItem(`RSB_PROJECT_DRAFT_${targetProject}`, JSON.stringify(nextRows));
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(nextRows));
    newRows.forEach((r) => syncRowToDatabaseAndContext(r, targetProject));

    confetti({ particleCount: 60, spread: 60, origin: { y: 0.65 } });
    setSaveToast(`Added all ${newRows.length} suggested parts for Machine "${machineName}" • Synced to DB!`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Project Selection Handler (Configures 3-step order workflow without filtering Master File)
  const handleSelectExistingProject = (pName: string) => {
    setSelectedProjectName(pName);
    try {
      localStorage.setItem('RSB_ACTIVE_SELECTED_PROJECT', pName);
    } catch (e) {}
    const found = projects.find((p) => p.name.trim().toLowerCase() === pName.trim().toLowerCase());
    if (found) {
      if (found.machineName || found.machineType) setMachineName(found.machineName || found.machineType || found.name);
      if (found.vendorName || found.vendor) setVendorName(found.vendorName || found.vendor || '');
      if (found.poNo || found.poNumber) setPoNo(found.poNo || found.poNumber || '');
      if (found.date || found.createdDate || found.startDate) setEntryDate(formatDate(found.date || found.createdDate || found.startDate));
    }
    setSaveToast(`Configured workflow for project "${pName}". Ready to add materials.`);
    setTimeout(() => setSaveToast(null), 2500);
  };


  // Direct Project Creation Handler
  const handleCreateProject = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newProjectForm.name.trim()) return;

    const formattedStartDate = newProjectForm.startDate || new Date().toISOString().split('T')[0];
    const formattedTargetDate = newProjectForm.targetDate || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
    const clientNameVal = newProjectForm.clientName.trim() || 'General Client';
    const clientNumVal = newProjectForm.clientNumber.trim();
    const customerDisplay = clientNumVal ? `${clientNameVal} (${clientNumVal})` : clientNameVal;
    const resolvedMachine = newProjectForm.machineName?.trim() || '';

    const newPrj: Omit<ProjectItem, 'id'> = {
      name: newProjectForm.name.trim(),
      projectNumber: `PRJ-${String(projects.length + 1).padStart(3, '0')}`,
      customer: customerDisplay,
      clientName: clientNameVal,
      clientNumber: clientNumVal,
      orderSource: 'Customer PO',
      machineType: (resolvedMachine || '') as any,
      machineName: resolvedMachine || '',
      poNumber: poNo || `PO-2026-${projects.length + 1}`,
      poNo: poNo || `PO-2026-${projects.length + 1}`,
      date: formattedStartDate,
      createdDate: formattedStartDate,
      lastUpdatedDate: formattedStartDate,
      startDate: formattedStartDate,
      targetCompletionDate: formattedTargetDate,
      priority: 'high',
      projectValue: 450000,
      vendor: vendorName || '',
      vendorName: vendorName || '',
      orderedBy: activeOrderedBy,
      materialsCount: 0,
      totalQuantity: 0,
      status: 'Material Procurement',
      progressPct: 10,
      notes: `Project ${newProjectForm.name.trim()} - Client: ${clientNameVal} | Phone: ${clientNumVal || 'N/A'}`,
    };

    if (resolvedMachine) {
      learnMachine(resolvedMachine);
    }
    if (clientNameVal) {
      learnCustomer(clientNameVal, clientNumVal);
    }

    addProject(newPrj);
    setSelectedProjectName(newPrj.name);
    try {
      localStorage.setItem('RSB_ACTIVE_SELECTED_PROJECT', newPrj.name);
    } catch (e) {}
    setMachineName('');
    setRows([]);
    setVendorName('');
    setPoNo('');
    setIsAddProjectModalOpen(false);
    setNewProjectForm({
      name: '',
      clientName: '',
      clientNumber: '',
      machineName: '',
      startDate: new Date().toISOString().split('T')[0],
      targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });

    confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
    setSaveToast(`✨ Created Project "${newPrj.name}"!`);
    window.dispatchEvent(new CustomEvent('rsb:tour:project-created', { detail: { project: newPrj } }));
    setTimeout(() => setSaveToast(null), 4000);
  };

  // Add Custom Machine Option
  const handleAddCustomMachine = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = customMachineInput.trim();
    if (!val) return;
    learnMachine(val);
    if (!customMachines.includes(val)) {
      setCustomMachines((prev) => [...prev, val]);
    }
    setMachineName(val);
    setCustomMachineInput('');
    setIsCustomMachineModalOpen(false);
    setSaveToast(`Added & Learned Machine: "${val}"`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Add Custom Material Option
  const handleAddCustomMaterial = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = customMaterialInput.trim();
    if (!val) return;
    if (!customMaterials.includes(val)) {
      setCustomMaterials((prev) => [...prev, val]);
    }
    setQuickMatType(val);
    setCustomMaterialInput('');
    setIsCustomMaterialModalOpen(false);
    setSaveToast(`Added Custom Material Type: "${val}"`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Add Custom Vendor Option
  const handleAddCustomVendor = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = customVendorInput.trim();
    if (!val) return;
    if (!customVendors.includes(val)) {
      setCustomVendors((prev) => [...prev, val]);
    }
    setVendorName(val);
    setCustomVendorInput('');
    setIsCustomVendorModalOpen(false);
    setSaveToast(`Added Custom Vendor: "${val}"`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Add Custom Unit Option
  const handleAddCustomUnit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = customUnitInput.trim();
    if (!val) return;
    if (!customUnits.includes(val)) {
      setCustomUnits((prev) => [...prev, val]);
    }
    setQuickUnit(val);
    setCustomUnitInput('');
    setIsCustomUnitModalOpen(false);
    setSaveToast(`Added Custom Unit: "${val}"`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Add Custom Description Option
  const handleAddCustomDesc = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = customDescInput.trim();
    if (!val) return;
    setQuickDesc(val);
    setCustomDescInput('');
    setIsCustomDescModalOpen(false);
    setSaveToast(`Added Custom Description: "${val}"`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Add Custom Size Specification Option
  const handleAddCustomSize = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = customSizeInput.trim();
    if (!val) return;
    setQuickSize(val);
    setCustomSizeInput('');
    setIsCustomSizeModalOpen(false);
    setSaveToast(`Added Custom Size: "${val}"`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Open Standard Machine BOM Template Modal
  const handleOpenBOMModal = (targetMachine?: string) => {
    const keys = Object.keys(MACHINE_BOM_TEMPLATES);
    const key = targetMachine || machineName || (keys[0] || '');
    const foundKey = keys.find(
      (k) => k.toLowerCase() === key.trim().toLowerCase()
    ) || keys[0] || '';
    setSelectedBOMTemplateKey(foundKey);
    const tmpl = MACHINE_BOM_TEMPLATES[foundKey];
    if (tmpl) {
      setSelectedBOMPartIndices(tmpl.parts.map((_, i) => i));
    }
    setIsBOMModalOpen(true);
  };

  // 1-Click Load Standard BOM Parts into Table
  const handleLoadBOMTemplate = () => {
    const tmpl = MACHINE_BOM_TEMPLATES[selectedBOMTemplateKey];
    if (!tmpl) return;

    const partsToLoad = tmpl.parts.filter((_, idx) => selectedBOMPartIndices.includes(idx));
    if (partsToLoad.length === 0) {
      alert('Please select at least one standard part to load.');
      return;
    }

    const targetProject = selectedProjectName || (projects.length > 0 ? projects[0].name : 'General Project');

    const newRows: EntryRow[] = partsToLoad.map((p, idx) => ({
      id: `bom-${tmpl.machineName}-${Date.now()}-${idx}`,
      machineName: tmpl.machineName,
      date: entryDate || new Date().toLocaleDateString('en-GB'),
      poNo: poNo || '-',
      srNo: rows.length + idx + 1,
      materialType: p.materialType as MaterialType,
      sizeSpecs: p.sizeSpecification,
      quantity: p.quantity,
      unit: p.unit,
      vendorName: p.recommendedVendor || vendorName || 'Standard Vendor',
      description: p.description,
      orderedBy: activeOrderedBy,
      projectName: targetProject,
    }));

    setMachineName(tmpl.machineName);
    setRows((prev) => normalizeSrNumbers([...prev, ...newRows]));
    setIsBOMModalOpen(false);

    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    setSaveToast(`⚡ 1-Click Loaded ${newRows.length} standard parts from "${tmpl.machineName}" BOM!`);
    setTimeout(() => setSaveToast(null), 4000);
  };

  // Live World SS Rate Selection Handler
  const handleSelectLiveRate = (grade: string, rateINR: number, form: string) => {
    setSaveToast(`🌐 Applied Live World Rate for ${grade} (${form}): ₹${rateINR}/KG`);
    setTimeout(() => setSaveToast(null), 4000);
  };

  // Add single material from quick entry form
  const handleAddMaterialRow = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickDesc.trim()) {
      quickDescInputRef.current?.focus();
      return;
    }

    const targetProject = selectedProjectName || (projects.length > 0 ? projects[0].name : 'Project-1');

    const targetSrNo = (quickSrNo && !isNaN(Number(quickSrNo)) && Number(quickSrNo) > 0)
      ? Number(quickSrNo)
      : (manualSrNo && !isNaN(Number(manualSrNo)) && Number(manualSrNo) > 0)
      ? Number(manualSrNo)
      : rows.length + 1;

    const newRow: EntryRow = {
      id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      machineName: machineName || targetProject,
      date: formatDate(entryDate) || getTodayFormatted(),
      poNo: poNo || '36',
      srNo: targetSrNo,
      materialType: quickMatType as MaterialType,
      sizeSpecs: quickSize.trim() || 'Custom Spec',
      quantity: Number(quickQty) || 1,
      unit: quickUnit,
      vendorName: vendorName || 'Manav Metal',
      description: quickDesc.trim(),
      orderedBy: activeOrderedBy,
      projectName: targetProject,
    };

    if (machineName) {
      learnMachine(machineName);
    }
    if (vendorName) {
      learnVendor(vendorName);
    }
    if (quickDesc.trim()) {
      learnDescription(quickDesc.trim());
    }
    if (quickSize.trim()) {
      learnSize(quickSize.trim());
    }
    if (quickUnit) {
      learnUnit(quickUnit);
    }

    removeRequirementTombstone(newRow.id);
    const nextRows = [...rows, newRow];
    setRows(nextRows);
    localStorage.setItem(`RSB_PROJECT_DRAFT_${targetProject}`, JSON.stringify(nextRows));
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(nextRows));
    syncRowToDatabaseAndContext(newRow, targetProject);

    const nextSr = typeof targetSrNo === 'number' ? targetSrNo + 1 : (!isNaN(Number(targetSrNo)) ? Number(targetSrNo) + 1 : rows.length + 2);
    setManualSrNo(String(nextSr));
    setQuickSrNo(String(nextSr));
    window.dispatchEvent(new CustomEvent('rsb:tour:material-added', { detail: { newRow } }));
    setQuickDesc('');
    setQuickSize('');

    setQuickQty(1);

    // Smoothly refocus back to description for continuous rapid-fire entry
    setTimeout(() => {
      quickDescInputRef.current?.focus();
    }, 40);

    setSaveToast(`Added row #${targetSrNo}: ${newRow.description} • Synced to DB`);
    setTimeout(() => setSaveToast(null), 2000);
  };

  // Duplicate Row
  const handleDuplicateRow = (rowId: string) => {
    const target = rows.find((r) => r.id === rowId);
    if (!target) return;

    const duplicate: EntryRow = {
      ...target,
      id: `dup-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      orderedBy: activeOrderedBy,
    };

    const targetIdx = rows.findIndex((r) => r.id === rowId);
    const updated = [...rows];
    updated.splice(targetIdx + 1, 0, duplicate);
    const nextRows = normalizeSrNumbers(updated);
    setRows(nextRows);
    if (selectedProjectName) {
      localStorage.setItem(`RSB_PROJECT_DRAFT_${selectedProjectName}`, JSON.stringify(nextRows));
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(nextRows));
    }
    syncRowToDatabaseAndContext(duplicate, selectedProjectName);

    setSaveToast(`Duplicated row #${target.srNo} • Synced to DB`);
    setTimeout(() => setSaveToast(null), 2000);
  };

  // Delete Row (Strict Admin-Only with Confirmation: never auto-deletes)
  const handleDeleteRow = (rowId: string) => {
    if (!canDeleteMasterRecords) {
      alert('🔒 Master Material Matrix Protection: Only an Administrator can delete records from the Master Register. Regular users cannot delete materials.');
      return;
    }
    const row = rows.find((r) => r.id === rowId);
    if (!row) return;

    if (!confirm(`⚠️ ADMIN CONFIRMATION REQUIRED:\nAre you sure you want to permanently delete this material?\n\n• Part: ${row.description || 'Item'} (${row.sizeSpecs || 'No spec'})\n• Machine: ${row.machineName || 'N/A'}\n• Project: ${row.projectName || 'N/A'}\n• Qty: ${row.quantity} ${row.unit}\n\nThis will remove it from the Master Matrix and DB.`)) {
      return;
    }

    isUserManuallyEditingRef.current = true;
    deleteProjectRequirement(row.id);
    const nextRows = normalizeSrNumbers(rows.filter((r) => r.id !== rowId));
    setRows(nextRows);
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(nextRows));
    if (selectedProjectName) {
      localStorage.setItem(`RSB_PROJECT_DRAFT_${selectedProjectName}`, JSON.stringify(nextRows));
    }
    setSaveToast('🗑️ Deleted row by Admin • Synced to DB');
    setTimeout(() => {
      isUserManuallyEditingRef.current = false;
      setSaveToast(null);
    }, 1500);
  };

  // Delete Selected Rows in Bulk (Strict Admin-Only with Confirmation)
  const handleDeleteSelectedRows = () => {
    if (selectedRowIds.length === 0) return;
    if (!canDeleteMasterRecords) {
      alert('🔒 Master Material Matrix Protection: Only an Administrator can delete records from the Master Register. Regular users cannot delete materials.');
      return;
    }
    const count = selectedRowIds.length;
    if (
      confirm(
        `⚠️ ADMIN CONFIRMATION REQUIRED:\nAre you sure you want to delete ${count} selected material row(s)?\n\nThis will permanently purge them from the Master Matrix and Database.`
      )
    ) {
      isUserManuallyEditingRef.current = true;
      const idsToDelete = [...selectedRowIds];
      deleteProjectRequirements(idsToDelete);
      const nextRows = normalizeSrNumbers(rows.filter((r) => !idsToDelete.includes(r.id)));
      setRows(nextRows);
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(nextRows));
      if (selectedProjectName) {
        localStorage.setItem(`RSB_PROJECT_DRAFT_${selectedProjectName}`, JSON.stringify(nextRows));
      }
      setSelectedRowIds([]);
      setSaveToast(`🗑️ Deleted ${count} row(s) by Admin • Purged from DB`);
      setTimeout(() => {
        isUserManuallyEditingRef.current = false;
        setSaveToast(null);
      }, 2000);
    }
  };

  // Cell Change (Ordered By is strictly locked)
  const handleCellChange = (id: string, field: keyof EntryRow, value: any) => {
    if (field === 'orderedBy') return; // Read-only
    isUserManuallyEditingRef.current = true;
    if (cellEditTimerRef.current) {
      clearTimeout(cellEditTimerRef.current);
    }
    cellEditTimerRef.current = setTimeout(() => {
      isUserManuallyEditingRef.current = false;
    }, 1500);

    setRows((prev) => {
      const updated = prev.map((r) => {
        if (r.id === id) {
          return { ...r, [field]: value };
        }
        return r;
      });
      return updated;
    });

    const updatePayload: Partial<ProjectMaterialRequirementItem> = {
      [field === 'poNo' ? 'poNumber' : field === 'date' ? 'poDate' : field]: value,
    };
    if (field === 'poNo') updatePayload.poNo = value;
    if (field === 'date') updatePayload.date = value;
    if (field === 'machineName') {
      updatePayload.machineName = value;
      updatePayload.machineType = value as any;
    }
    if (field === 'vendorName') {
      updatePayload.vendorName = value;
      updatePayload.vendor = value;
    }
    updateProjectRequirement(id, updatePayload);
  };

  // Save Project (Synchronizes all materials and project headers directly to Database & Cloud)
  const handleSaveProject = async () => {
    isUserManuallyEditingRef.current = false;
    const targetProject = selectedProjectName || (projects.length > 0 ? projects[0].name : 'Project-1');
    setIsSavingOrder(true);

    try {
      const existingProject = projects.find(
        (p) => p.name.trim().toLowerCase() === targetProject.trim().toLowerCase()
      );
      const custName = existingProject?.customer || existingProject?.clientName || 'General Client';

      const itemsToSave: Partial<ProjectMaterialRequirementItem>[] = rows.map((r, idx) => ({
        id: r.id,
        srNo: (r.srNo !== undefined && r.srNo !== null && String(r.srNo).trim() !== '') ? r.srNo : idx + 1,
        projectName: r.projectName || targetProject,
        customerName: custName,
        poNumber: r.poNo || poNo,
        poDate: formatDate(r.date || entryDate),
        date: formatDate(r.date || entryDate),
        machineType: (r.machineName || machineName || targetProject) as any,
        machineName: r.machineName || machineName || targetProject,
        poNo: r.poNo || poNo,
        vendorName: r.vendorName || vendorName,
        vendor: r.vendorName || vendorName,
        description: r.description || '',
        materialType: r.materialType,
        materialGrade: 'SS 304',
        sizeSpecs: r.sizeSpecs || '',
        quantity: Number(r.quantity) || 1,
        unit: r.unit || 'Nos',
        orderedBy: r.orderedBy || activeOrderedBy,
        orderSource: 'Customer PO',
        productionStatus: 'In Production',
        stockStatus: 'Available',
        qcStatus: 'Passed',
        dispatchStatus: 'Ready',
        materialCost: 500,
        laborCost: 150,
        machineCost: 100,
        outsourcingCost: 0,
        notes: `RSB Machine Workflow | Ordered by ${r.orderedBy || activeOrderedBy}`,
      }));

      // Auto-learn machine, vendor, and customer on order save
      if (machineName) {
        learnMachine(machineName);
      }
      if (vendorName) {
        learnVendor(vendorName);
      }
      rows.forEach((r) => {
        if (r.machineName) learnMachine(r.machineName);
        if (r.vendorName) learnVendor(r.vendorName);
        if (r.description) learnDescription(r.description);
        if (r.sizeSpecs) learnSize(r.sizeSpecs);
        if (r.unit) learnUnit(r.unit);
      });
      if (custName) {
        learnCustomer(custName);
      }

      // Sync each material row directly to database and context preserving its specific project
      rows.forEach((r) => {
        syncRowToDatabaseAndContext(r, r.projectName || targetProject);
      });

      // Update project header in state and database (or auto-create if new)
      if (existingProject) {
        updateProject(existingProject.id, {
          machineName: machineName || existingProject.machineName,
          vendorName: vendorName || existingProject.vendorName,
          vendor: vendorName || existingProject.vendor,
          poNo: poNo || existingProject.poNo,
          poNumber: poNo || existingProject.poNumber,
          date: entryDate || existingProject.date,
          startDate: entryDate || existingProject.startDate,
          materialsCount: rows.length,
          totalQuantity: rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0),
        });
      } else {
        const autoProject: Omit<ProjectItem, 'id'> = {
          projectNumber: `PRJ-2026-${String(projects.length + 1).padStart(3, '0')}`,
          name: targetProject.trim(),
          customer: custName || 'General Client',
          orderSource: 'Customer PO',
          machineType: (machineName || targetProject) as any,
          machineName: machineName || targetProject,
          vendor: vendorName || 'Manav Metal',
          vendorName: vendorName || 'Manav Metal',
          poNumber: poNo || '36',
          poNo: poNo || '36',
          startDate: entryDate || new Date().toISOString().split('T')[0],
          targetCompletionDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          priority: 'medium',
          status: 'Production',
          projectValue: 450000,
          progressPct: 10,
          materialsCount: rows.length,
          totalQuantity: rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0),
          notes: `Project ${targetProject.trim()} auto-created on Material Entry save`,
        };
        addProject(autoProject);
      }

      // Keep rows permanently stored under this project (never auto-deleted)
      if (rows.length > 0) {
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(rows));
        localStorage.setItem(`RSB_PROJECT_DRAFT_${targetProject}`, JSON.stringify(rows));
      } else {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
        localStorage.removeItem(`RSB_PROJECT_DRAFT_${targetProject}`);
      }

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastAutoSavedTime(timeStr);
      setSaveToast(`🎉 Successfully saved Order for "${targetProject}" (${rows.length} materials) • ☁️ Synced to DB & Cloud at ${timeStr}`);
      window.dispatchEvent(new CustomEvent('rsb:tour:order-saved', { detail: { project: targetProject, count: rows.length } }));
      setTimeout(() => setSaveToast(null), 4500);
    } catch (err) {
      console.error('Error saving project order:', err);
    } finally {
      setTimeout(() => {
        setIsSavingOrder(false);
      }, 300);
    }
  };

  // Export to Excel (Exact 10 Columns)
  const handleExportExcel = () => {
    if (rows.length === 0) {
      alert('No rows to export.');
      return;
    }

    const exportData = rows.map((r) => ({
      'Project Name': r.projectName || selectedProjectName || '',
      'Machine Name': r.machineName,
      'Date': r.date,
      'PO No': r.poNo,
      'Sr No': r.srNo,
      'Material Type': r.materialType,
      'Size Specification': r.sizeSpecs,
      'Quantity': r.quantity,
      'Unit': r.unit,
      'Vendor Name': r.vendorName,
      'Description': r.description,
      'Ordered By': r.orderedBy,
    }));

    exportToExcel(exportData, `RSB_Material_Order_${machineName}_PO${poNo}_${Date.now()}`);
    setSaveToast(`Exported ${exportData.length} items to Excel!`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Intelligent Excel Import Engine Handlers
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImportFileName(file.name);
      const res = await analyzeExcelFile(file);
      setImportWorkbook(res.workbook);
      setImportAnalysis(res.analysis);
      setIsImportPreviewOpen(true);
      setIsImportModalOpen(false);
    } catch (err) {
      console.error(err);
      alert('Failed to analyze Excel file. Please ensure it is a valid .xlsx, .xls, or .csv file.');
    } finally {
      e.target.value = '';
    }
  };

  const handleConfirmExcelImport = async (
    importedRows: ParsedImportRow[],
    batchInfo: {
      sheetName: string;
      overrideProject?: string;
      overrideMachine?: string;
      overrideVendor?: string;
      overridePoNo?: string;
    }
  ) => {
    const targetPrj = batchInfo.overrideProject || selectedProjectName || 'Project-1';
    const targetMch = batchInfo.overrideMachine || machineName || targetPrj;

    // Convert to EntryRow format for immediate table display
    const newEntryRows: EntryRow[] = importedRows.map((r, idx) => ({
      id: `imp-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 5)}`,
      projectName: r.projectName || targetPrj,
      machineName: r.machineName || targetMch,
      date: r.date || entryDate || getTodayFormatted(),
      poNo: r.poNo || poNo || '36',
      srNo: r.srNo, // ABSOLUTE PRESERVATION OF ORIGINAL SR. NO.
      materialType: r.materialType || 'SS Flat',
      sizeSpecs: r.sizeSpecs || 'Custom Spec',
      quantity: r.quantity || 1,
      unit: r.unit || 'Nos',
      vendorName: r.vendorName || vendorName || 'Manav Metal',
      description: r.description || 'Component',
      orderedBy: activeOrderedBy,
    }));

    // Authoritative persistence across ERPContext, LocalStorage & Supabase
    await importMaterialRequirements(newEntryRows, {
      projectName: targetPrj,
      machineName: targetMch,
      vendorName: batchInfo.overrideVendor || vendorName,
      poNo: batchInfo.overridePoNo || poNo,
      sheetName: batchInfo.sheetName,
    });

    setRows(sortRowsByAscendingSrNo(newEntryRows));
    setIsImportPreviewOpen(false);
    confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 } });
    setSaveToast(`🎉 Successfully imported and persisted ${newEntryRows.length} items from sheet "${batchInfo.sheetName}"!`);
    setTimeout(() => setSaveToast(null), 3500);
  };

  // Filtered rows for table (Arranged strictly in ascending order of Sr. No. - NOT project-wise)
  const filteredRows = useMemo(() => {
    const list = rows.filter((r) => {
      const matchSearch =
        searchTerm === '' ||
        (r.projectName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.sizeSpecs.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.machineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.poNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.orderedBy.toLowerCase().includes(searchTerm.toLowerCase());

      const matchMat = filterMaterialType === 'ALL' || r.materialType === filterMaterialType;
      return matchSearch && matchMat;
    });

    return sortRowsByAscendingSrNo(list);
  }, [rows, searchTerm, filterMaterialType]);

  const handleSwitchView = (mode: 'entry' | 'projects' | 'procurement') => {
    setActiveViewMode(mode);
    setActiveTab(mode);
  };

  // View Mode Switcher: Procurement Basket / PO Basket
  if (activeViewMode === 'procurement') {
    return (
      <div className="space-y-4">
        <ProcurementBasket
          initialProjectFilter={basketProjectFilter}
          initialViewMode={basketProjectFilter ? 'projectFolders' : 'poBasket'}
          onNavigateToEntry={() => handleSwitchView('entry')}
          onNavigateToProjects={() => handleSwitchView('projects')}
        />
      </div>
    );
  }

  // View Mode Switcher: Projects Directory
  if (activeViewMode === 'projects' || isStoreIncharge) {
    if (activeViewMode === 'details' && selectedDetailProject) {
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
            <button
              type="button"
              onClick={() => setActiveViewMode('projects')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
            >
              <FolderKanban className="w-3.5 h-3.5 text-blue-600" />
              <span>← Back to All Projects</span>
            </button>
            <span className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-xs flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>Project: {selectedDetailProject.name}</span>
            </span>
          </div>

          <ProjectDetailsView
            project={selectedDetailProject}
            onBack={() => setActiveViewMode('projects')}
            onOpenInEntrySheet={
              !isStoreIncharge
                ? (pName) => {
                    const found = projects.find((p) => p.name === pName);
                    if (found) handleOpenProjectInEntry(found);
                    else handleSwitchView('entry');
                  }
                : undefined
            }
            onOpenOrderBasket={(pName) => {
              setBasketProjectFilter(pName);
              handleSwitchView('procurement');
            }}
          />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <ProjectsDirectory
          onSelectProject={(prj) => {
            setSelectedDetailProject(prj);
            setActiveViewMode('details');
          }}
          onOpenEntrySheetWithProject={
            !isStoreIncharge
              ? (pName) => {
                  const found = projects.find((p) => p.name === pName);
                  if (found) handleOpenProjectInEntry(found);
                  else handleSwitchView('entry');
                }
              : undefined
          }
          onOpenProcurementBasket={() => {
            setBasketProjectFilter(undefined);
            handleSwitchView('procurement');
          }}
          onOpenProcurementBasketWithProject={(pName) => {
            setBasketProjectFilter(pName);
            handleSwitchView('procurement');
          }}
        />
      </div>
    );
  }

  if (activeViewMode === 'details' && selectedDetailProject) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveViewMode('projects')}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
          >
            <FolderKanban className="w-3.5 h-3.5 text-blue-600" />
            <span>← Back to All Projects</span>
          </button>
          <span className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-xs flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Machine: {selectedDetailProject.machineName || selectedDetailProject.name}</span>
          </span>
        </div>

        <ProjectDetailsView
          project={selectedDetailProject}
          onBack={() => setActiveViewMode('projects')}
          onOpenInEntrySheet={(pName) => {
            const found = projects.find((p) => p.name === pName);
            if (found) handleOpenProjectInEntry(found);
            else handleSwitchView('entry');
          }}
          onOpenOrderBasket={(pName) => {
            setBasketProjectFilter(pName);
            handleSwitchView('procurement');
          }}
        />
      </div>
    );
  }

  if (activeViewMode === 'members') {
    return (
      <div className="space-y-4">
        <MemberAuthorizationManager />
      </div>
    );
  }

  return (
    <div className="space-y-5 select-text text-slate-900">
      {/* ========================================================================= */}
      {/* 0. AUTO-SUGGESTION HTML5 DATALISTS (GLOBAL TYPE-AHEAD) */}
      {/* ========================================================================= */}
      <datalist id="project-suggestions">
        {projects.map((p) => (
          <option key={p.id} value={p.name} />
        ))}
      </datalist>

      <datalist id="machine-suggestions">
        {allMachineOptions.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>

      <datalist id="vendor-suggestions">
        {allVendorOptions.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>

      <datalist id="description-suggestions">
        {allDescriptionOptions.map((d) => (
          <option key={d} value={d} />
        ))}
      </datalist>

      <datalist id="size-suggestions">
        {allSizeOptions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {/* Hidden File Input for Excel Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx, .xls, .csv"
        className="hidden"
        onChange={handleImportExcel}
      />

      {/* ========================================================================= */}
      {/* 1. TOP PORTAL BAR & ORDERED BY AUTOMATION BADGE */}
      {/* ========================================================================= */}
      <div data-tour="tour-entry-station" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-sm">
            <Cpu className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                RSB Material Entry Workstation
              </h1>
              {selectedProjectName && (
                <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-black">
                  📁 {selectedProjectName}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Repetitive order templates, smart auto-fill suggestions, and auto-locked creator auditing.
            </p>
          </div>
        </div>

        {/* Action Controls: + Add Project, Ordered By Badge, Projects Directory, Live World SS Rates, Load BOM */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Live World SS Rates Engine */}
          <button
            type="button"
            onClick={() => setIsRatesModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-amber-500/20 cursor-pointer active:scale-95"
            title="Open Live World Stainless Steel (SS) Market Rates & Auto-Costing"
          >
            <Globe className="w-4 h-4 text-slate-950 animate-spin-slow" />
            <span>🌐 Live SS Rates</span>
          </button>

          {/* 1-Click Load Machine BOM */}
          <button
            type="button"
            onClick={() => handleOpenBOMModal(machineName)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95"
            title={`1-Click Load Standard BOM Template for Machine ${machineName}`}
          >
            <Zap className="w-4 h-4 text-amber-300" />
            <span>⚡ Load Machine BOM</span>
          </button>

          {/* Strictly Kaustubh Admin Level Only: Maintenance Mode Button */}
          {isKaustubhAdmin && (
            <button
              type="button"
              onClick={async () => {
                const nextState = !isMaintenanceMode;
                const confirmed = window.confirm(
                  nextState
                    ? '⚠️ ACTIVATE SYSTEM MAINTENANCE MODE?\n\n• When activated, NO ONE will be able to login\n• Login screen will display "Under Maintance"\n• All active non-admin users will be signed out\n\nDo you want to proceed?'
                    : 'Deactivate Maintenance Mode?\n\nUsers will be able to log in normally again.'
                );
                if (!confirmed) return;
                await toggleMaintenanceMode(nextState);
                setSaveToast(
                  nextState
                    ? '🚨 Maintenance Mode ACTIVATED! System login locked ("Under Maintance").'
                    : '✅ Maintenance Mode DEACTIVATED! System open for logins.'
                );
                setTimeout(() => setSaveToast(null), 4000);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md cursor-pointer active:scale-95 ${
                isMaintenanceMode
                  ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30 ring-2 ring-rose-400 animate-pulse'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-800 dark:text-amber-300 border border-amber-500/50'
              }`}
              title="Strictly Kaustubh Admin Level Only: Toggle Global Maintenance Mode"
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>{isMaintenanceMode ? 'Maintenance: ACTIVE' : 'Maintenance Mode'}</span>
            </button>
          )}

          {/* Full Factory Reset Button - Only Visible to Root Admins (Amit & Kaustubh) */}
          {isRootAdmin && (
            <button
              type="button"
              onClick={() => setIsFactoryResetModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 border border-rose-400/40 hover:border-rose-500 text-xs font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
              title="Reset all data, materials, suggestions, BOMs, and workstation memory to clean factory baseline (Root Admin Only)"
            >
              <RotateCcw className="w-4 h-4 text-rose-500" />
              <span>Factory Reset</span>
            </button>
          )}

          <button
            type="button"
            data-tour="tour-add-project-btn"
            onClick={() => setIsAddProjectModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            title="Create and register a new machine project"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>+ Add Project</span>
          </button>

          <div className="flex items-center gap-2 bg-slate-900 text-white px-3.5 py-2 rounded-xl border border-slate-800 shadow-xs">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <div className="text-left">
              <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">
                Ordered By
              </span>
              <span className="text-xs font-black text-emerald-400">{activeOrderedBy}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dynamic Save Toast Notification */}
      {saveToast && (
        <div className="px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fadeIn shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. UNIFIED FACTORY ORDER & MATERIAL ENTRY WORKFLOW (TOGETHER) */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-blue-950 text-white rounded-2xl p-5 shadow-lg border border-slate-800 space-y-4">
        {/* ======================================================================= */}
        {/* ======================================================================= */}
        {/* TOP LEVEL: SELECT PROJECT */}
        {/* ======================================================================= */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/90 rounded-2xl p-4 sm:p-5 border border-indigo-500/40 shadow-xl space-y-3">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/30">
                <FolderKanban className="w-4 h-4" />
              </div>
              <div>
                <label className="text-xs sm:text-sm font-black tracking-wider text-indigo-200 uppercase block">
                  Select Project
                </label>
                <span className="text-[11px] font-medium text-slate-400 block">
                  Auto-configures 3-step order workflow to add new materials to this project (Master Matrix shows all projects)
                </span>
              </div>
            </div>

            <button
              type="button"
              data-tour="tour-select-new-project-btn"
              onClick={() => setIsAddProjectModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-md shadow-blue-500/20 active:scale-95 border border-blue-400/30"
              title="Create New Machine Project"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Project</span>
            </button>
          </div>

          {/* Full-Width Styled Project Dropdown */}
          <div className="relative">
            <select
              value={selectedProjectName || '__NEW__'}
              onChange={(e) => {
                if (e.target.value === '__NEW__') {
                  setIsAddProjectModalOpen(true);
                } else {
                  handleSelectExistingProject(e.target.value);
                }
              }}
              className="w-full bg-slate-900 border-2 border-indigo-500/50 hover:border-indigo-400 focus:border-blue-400 rounded-xl px-4 py-3 text-sm sm:text-base font-bold text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/40 shadow-lg transition-all cursor-pointer appearance-none pr-10"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.name} className="bg-slate-900 text-white py-2 text-sm font-semibold">
                  📁 {p.name} (PO: {p.poNo || p.poNumber || 'N/A'})
                </option>
              ))}
              <option value="__NEW__" className="bg-indigo-950 text-amber-300 font-bold py-2">
                + Create New Machine Project...
              </option>
            </select>
            <ChevronDown className="w-5 h-5 text-indigo-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* TOP PART: 3-STEP FACTORY ORDER WORKFLOW */}
        <div>
          <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-200">
                3-Step Factory Order Workflow
              </h2>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Machine-centric • Auto-suggests • Repetitive Templates
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* STEP 1: Select Machine Name */}
            <div className="space-y-1.5 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-amber-400/20 text-amber-300 inline-flex items-center justify-center text-[10px]">
                    1
                  </span>
                  Machine Name
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomMachineModalOpen(true)}
                  className="text-[10px] text-amber-300 hover:text-white underline cursor-pointer"
                >
                  + Custom
                </button>
              </div>
              <input
                ref={machineInputRef}
                type="text"
                list="machine-suggestions"
                value={machineName}
                onChange={(e) => {
                  const val = e.target.value;
                  setMachineName(val);
                  if (val.trim()) learnMachine(val.trim());
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (machineName.trim()) learnMachine(machineName.trim());
                    poNoInputRef.current?.focus();
                  }
                }}
                placeholder="Type or select machine (e.g. 60 HD, Mono Conveyor)..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all font-mono"
              />
            </div>

            {/* STEP 2: Enter PO Number & Date */}
            <div className="space-y-1.5 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60">
              <div className="flex items-center justify-between">
                <label className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-emerald-400/20 text-emerald-300 inline-flex items-center justify-center text-[10px]">
                    2
                  </span>
                  PO Number & Date
                </label>
                <span className="text-[10px] text-slate-400 font-mono">PO / Date</span>
              </div>
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-6">
                  <span className="text-[9px] text-slate-400 font-mono block mb-0.5">PO Number</span>
                  <input
                    ref={poNoInputRef}
                    type="text"
                    value={poNo}
                    onChange={(e) => setPoNo(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        entryDateInputRef.current?.focus();
                      }
                    }}
                    placeholder="PO-2026-1"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-black text-indigo-300 placeholder-slate-500 focus:outline-none focus:border-emerald-400 font-mono"
                  />
                </div>
                <div className="col-span-6">
                  <span className="text-[9px] text-slate-400 font-mono block mb-0.5">Date (dd-mm-yyyy)</span>
                  <input
                    ref={entryDateInputRef}
                    type="text"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        quickSrNoInputRef.current?.focus();
                      }
                    }}
                    placeholder={getTodayFormatted()}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-slate-300 focus:outline-none focus:border-emerald-400 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* STEP 3: Materials Count & Save Action */}
            <div className="space-y-1.5 bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 flex flex-col justify-between">
              <div>
                <label className="text-[11px] font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1">
                  <span className="w-4 h-4 rounded-full bg-purple-400/20 text-purple-300 inline-flex items-center justify-center text-[10px]">
                    3
                  </span>
                  Materials Count
                </label>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-sm font-bold text-white font-mono">{rows.length} Items</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Qty: {rows.reduce((s, r) => s + (Number(r.quantity) || 0), 0)}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleSaveProject}
                disabled={isSavingOrder}
                className="w-full py-2 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-black transition-all shadow-md shadow-emerald-950/40 flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                title="Save order specifications directly to database"
              >
                {isSavingOrder ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving to DB...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Save Order</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* BOTTOM PART: ADD MATERIAL ROW (DIRECTLY TOGETHER IN THE SAME WORKFLOW CARD) */}
        <div data-tour="tour-material-input-form" className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 space-y-3 pt-3.5">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                Add Material Row (Auto-suggests from frequent sizes & descriptions)
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-medium">
              Type description or size, then click Add or press Enter ↵
            </span>
          </div>

          <form onSubmit={handleAddMaterialRow} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2 items-end">
            {/* 0. Sr. No Manual Option */}
            <div className="lg:col-span-1 space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-300 block truncate">
                Sr. No
              </label>
              <input
                ref={quickSrNoInputRef}
                type="number"
                min="1"
                value={quickSrNo || manualSrNo}
                onChange={(e) => {
                  setQuickSrNo(e.target.value);
                  setManualSrNo(e.target.value);
                }}
                placeholder={String(rows.length + 1)}
                className="w-full bg-slate-800 border border-emerald-500/50 rounded-lg px-2 py-1.5 text-xs font-mono font-black text-emerald-300 text-center focus:bg-slate-900 focus:outline-none focus:border-emerald-400 shadow-2xs no-spin [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                title="Manual Serial Number for material item"
              />
            </div>

            {/* 1. Description (Type-Ahead & Custom) */}
            <div className="lg:col-span-4 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                  Description (Type-Ahead)
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomDescModalOpen(true)}
                  className="text-[9px] font-bold text-blue-400 hover:text-blue-300 cursor-pointer"
                >
                  + Custom
                </button>
              </div>
              <input
                ref={quickDescInputRef}
                type="text"
                list="description-suggestions"
                value={quickDesc}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuickDesc(val);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (quickDesc.trim()) learnDescription(quickDesc.trim());
                    quickMatTypeRef.current?.focus();
                  }
                }}
                placeholder="e.g. Mono Conveyor Inlet Patti"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-semibold text-white placeholder-slate-500 focus:bg-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs"
              />
            </div>

            {/* 2. Material Type */}
            <div className="lg:col-span-2 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                  Material Type
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomMaterialModalOpen(true)}
                  className="text-[9px] font-bold text-blue-400 hover:text-blue-300 cursor-pointer"
                >
                  + Custom
                </button>
              </div>
              <select
                ref={quickMatTypeRef}
                value={quickMatType}
                onChange={(e) => {
                  if (e.target.value === '__CUSTOM__') {
                    setIsCustomMaterialModalOpen(true);
                  } else {
                    setQuickMatType(e.target.value);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    quickSizeInputRef.current?.focus();
                  }
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-white focus:bg-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs cursor-pointer"
              >
                {allMaterialTypes.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
                <option value="__CUSTOM__">+ Custom Material...</option>
              </select>
            </div>

            {/* 3. Size Specification (Auto-Suggest & Custom) */}
            <div className="lg:col-span-2 space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                  Size Specification (Auto-Suggest)
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomSizeModalOpen(true)}
                  className="text-[9px] font-bold text-blue-400 hover:text-blue-300 cursor-pointer"
                >
                  + Custom
                </button>
              </div>
              <input
                ref={quickSizeInputRef}
                type="text"
                list="size-suggestions"
                value={quickSize}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuickSize(val);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (quickSize.trim()) learnSize(quickSize.trim());
                    quickQtyInputRef.current?.focus();
                  }
                }}
                placeholder="e.g. 80 x 6 x 485"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-blue-400 placeholder-slate-500 focus:bg-slate-900 focus:outline-none focus:border-blue-500 shadow-2xs"
              />
            </div>

            {/* 4. Qty & Unit Together (Compound Input Group) */}
            <div className="lg:col-span-2 space-y-1">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-300 block">
                Qty & Unit
              </label>
              <div className="flex items-center rounded-lg border border-slate-700 bg-slate-800 shadow-2xs overflow-hidden focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500">
                <input
                  ref={quickQtyInputRef}
                  type="number"
                  min="0.1"
                  step="any"
                  value={quickQty}
                  onChange={(e) => setQuickQty(parseFloat(e.target.value) || 1)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      quickUnitRef.current?.focus();
                    }
                  }}
                  className="w-1/2 bg-transparent px-2 py-1.5 text-xs font-mono font-black text-white text-center focus:outline-none no-spin [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="Qty"
                />
                <div className="h-4 w-px bg-slate-700" />
                <select
                  ref={quickUnitRef}
                  value={quickUnit}
                  onChange={(e) => {
                    if (e.target.value === '__CUSTOM__') {
                      setIsCustomUnitModalOpen(true);
                    } else {
                      setQuickUnit(e.target.value);
                      learnUnit(e.target.value);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddMaterialRow();
                    }
                  }}
                  className="w-1/2 bg-transparent px-1 py-1.5 text-xs font-bold text-slate-300 text-center focus:outline-none cursor-pointer"
                >
                  {allUnits.map((u) => (
                    <option key={u} value={u} className="bg-slate-900 text-white">
                      {u}
                    </option>
                  ))}
                  <option value="__CUSTOM__" className="bg-slate-900 text-white">+ Custom...</option>
                </select>
              </div>
            </div>

            {/* 5. Submit Button */}
            <div className="lg:col-span-1">
              <button
                type="submit"
                className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-black shadow-xs flex items-center justify-center gap-1 cursor-pointer transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. PREVIOUS ORDER SUGGESTION ENGINE: "SIMILAR PREVIOUS ORDERS" */}
      {/* ========================================================================= */}
      {previousSimilarOrders.length > 0 && (
        <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-blue-200/80">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-blue-700" />
              <h3 className="text-xs font-black uppercase tracking-wider text-blue-900">
                Similar Previous Orders for Machine "{machineName}"
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-blue-200/80 text-blue-900 text-[10px] font-black">
                {previousSimilarOrders.length} Matching Orders
              </span>
            </div>
            <span className="text-[11px] text-blue-700 font-medium">
              1-click duplicate workflow reduces data entry time by 80%+
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {previousSimilarOrders.map((prev) => (
              <div
                key={prev.id}
                className="bg-white rounded-xl p-3.5 border border-blue-200 shadow-2xs hover:shadow-xs transition-all space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-mono text-[10px] font-bold">
                        {prev.machineName || prev.machineType}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono text-[10px] font-bold border border-indigo-200">
                        PO: {prev.poNo || prev.poNumber || '36'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium font-mono">
                        {prev.date || prev.createdDate || '01-09-2026'}
                      </span>
                    </div>
                    <h4 className="text-xs font-black text-slate-900 mt-1">{prev.name}</h4>
                    <p className="text-[11px] text-slate-600 font-medium">
                      Vendor: <strong className="text-slate-800">{prev.vendorName || prev.vendor || 'Manav Metal'}</strong> • Ordered By: <strong className="text-emerald-700">{prev.orderedBy || 'Amit'}</strong>
                    </p>
                  </div>
                  <span className="px-2 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-bold shrink-0">
                    {getMaterialsForProject(prev, projectRequirements).length} Items
                  </span>
                </div>

                {/* 3 Action Buttons: [ View ], [ Copy Materials ], [ Duplicate Order ] */}
                <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDetailProject(prev);
                      setActiveViewMode('details');
                    }}
                    className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold transition-all text-center cursor-pointer active:scale-95 shadow-2xs flex items-center justify-center gap-1"
                    title="View full project specifications"
                  >
                    <Eye className="w-3 h-3 text-slate-600" />
                    <span>View</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopyMaterials(prev)}
                    className="px-2 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold transition-all text-center cursor-pointer active:scale-95 shadow-2xs flex items-center justify-center gap-1"
                    title="Copy all material rows from this previous machine order"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Materials</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDuplicateOrder(prev)}
                    className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white text-[10px] font-bold transition-all text-center cursor-pointer active:scale-95 shadow-2xs flex items-center justify-center gap-1"
                    title="Duplicate whole order and generate next PO number"
                  >
                    <Sparkles className="w-3 h-3 text-amber-400" />
                    <span>Duplicate Order</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. SMART AUTO-FILL: FREQUENTLY USED MATERIALS FOR THIS MACHINE */}
      {/* ========================================================================= */}
      {suggestedFrequentParts.length > 0 && (
        <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-4 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-amber-200/70">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <h3 className="text-xs font-black uppercase tracking-wider text-amber-900">
                Frequently Used Parts for Machine "{machineName}" (Smart Suggestions)
              </h3>
            </div>
            <button
              type="button"
              onClick={handleAddAllSuggestedParts}
              className="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add All Suggested ({suggestedFrequentParts.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {suggestedFrequentParts.map((part, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleAddSuggestedPart(part)}
                className="flex-shrink-0 bg-white hover:bg-amber-100/60 border border-amber-200/90 rounded-xl px-3 py-2 text-left transition-all cursor-pointer shadow-2xs group min-w-[200px]"
                title={`Click to add ${part.description}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded">
                    {part.materialType}
                  </span>
                  <span className="text-[10px] font-bold font-mono text-slate-500">
                    {part.qty} {part.unit}
                  </span>
                </div>
                <h5 className="text-xs font-bold text-slate-900 truncate mt-1 group-hover:text-amber-800">
                  {part.description}
                </h5>
                <p className="text-[11px] font-mono font-bold text-blue-700 truncate mt-0.5">
                  {part.sizeSpecs}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. TABLE TOOLBAR (SEARCH, FILTERS, EXCEL IMPORT/EXPORT, SAVE) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2.5 w-full">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search in 10-column table (machine, po, description, size, vendor, ordered by)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white shadow-2xs font-medium"
            />
          </div>

          <select
            value={filterMaterialType}
            onChange={(e) => setFilterMaterialType(e.target.value)}
            className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-bold focus:outline-none focus:border-blue-600 shadow-2xs"
          >
            <option value="ALL">All Materials</option>
            {allMaterialTypes.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* Action Hub */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {selectedRowIds.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteSelectedRows}
              className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Delete ({selectedRowIds.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Import 10-column table from Excel"
          >
            <Upload className="w-3.5 h-3.5 text-amber-600" />
            <span>Import Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            title="Export 10-column table to Excel"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            data-tour="tour-save-order-btn"
            onClick={handleSaveProject}
            disabled={isSavingOrder}
            className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-black transition-all shadow-md shadow-emerald-950/40 flex items-center gap-1.5 cursor-pointer active:scale-95"
            title="Save order specifications directly to database"
          >
            {isSavingOrder ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Saving to DB...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 text-emerald-200" />
                <span>SAVE ORDER</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. EXACT 10-COLUMN PROJECT MATERIAL DATA GRID */}
      {/* | Machine Name | Date | PO No | Sr No | Material Type | Size Specification | Qty | Vendor Name | Description | Ordered By | */}
      {/* ========================================================================= */}
      <div data-tour="tour-material-grid" className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-black uppercase tracking-wider">
              Master Material Specification Matrix • All Projects ({filteredRows.length} Items)
            </span>
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Permanent Storage • 1500+ Scale
            </span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
            {selectedProjectName && (
              <span className="text-amber-300 font-bold">
                Adding To: {selectedProjectName}
              </span>
            )}
            <span>Auto-saved {lastAutoSavedTime}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-800 font-black border-b border-slate-200 text-[11px] uppercase tracking-wider">
                <th className="p-2.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={filteredRows.length > 0 && filteredRows.every((r) => selectedRowIds.includes(r.id))}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedRowIds(filteredRows.map((r) => r.id));
                      else setSelectedRowIds([]);
                    }}
                    className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                  />
                </th>
                {/* 1. Project Name */}
                <th className="p-2.5 min-w-[140px] whitespace-nowrap">Project Name</th>
                {/* 2. Machine Name */}
                <th className="p-2.5 min-w-[130px] whitespace-nowrap">Machine Name</th>
                {/* 3. Date */}
                <th className="p-2.5 min-w-[100px] whitespace-nowrap">Date</th>
                {/* 4. PO No */}
                <th className="py-2.5 pl-2.5 pr-0.5 min-w-[85px] whitespace-nowrap">PO No</th>
                {/* 5. Sr No */}
                <th className="py-2.5 px-0.5 w-10 text-center whitespace-nowrap font-black">Sr No</th>
                {/* 6. Material Type */}
                <th className="p-2.5 min-w-[130px] whitespace-nowrap">Material Type</th>
                {/* 7. Size Specification */}
                <th className="p-2.5 min-w-[260px] whitespace-nowrap">Size Specification</th>
                {/* 8. Qty */}
                <th className="p-2.5 min-w-[85px] text-center whitespace-nowrap">Qty</th>
                {/* 9. Description */}
                <th className="p-2.5 min-w-[180px] whitespace-nowrap">Description</th>
                {/* 10. Ordered By (NON-EDITABLE) */}
                <th className="p-2.5 w-20 text-center whitespace-nowrap">Ordered By</th>
                {/* Actions */}
                <th className="p-2.5 w-20 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-500 font-medium">
                    No material rows found. Click "Add Material" or choose a smart suggestion above.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const isSelected = selectedRowIds.includes(row.id);
                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-2 text-center whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedRowIds((prev) =>
                              prev.includes(row.id) ? prev.filter((i) => i !== row.id) : [...prev, row.id]
                            );
                          }}
                          className="rounded border-slate-300 text-blue-600 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* 1. Project Name */}
                      <td className="p-2">
                        <input
                          type="text"
                          list="project-suggestions"
                          value={row.projectName || ''}
                          placeholder={selectedProjectName || 'Project Name'}
                          onChange={(e) => handleCellChange(row.id, 'projectName', e.target.value)}
                          className="w-full bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-slate-900 focus:bg-white text-xs font-bold text-blue-900 transition-colors"
                        />
                      </td>

                      {/* 2. Machine Name */}
                      <td className="p-2">
                        <input
                          type="text"
                          list="machine-suggestions"
                          value={row.machineName}
                          onChange={(e) => handleCellChange(row.id, 'machineName', e.target.value)}
                          className="w-full bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-slate-900 focus:bg-white text-xs font-bold text-purple-900 transition-colors font-mono"
                        />
                      </td>

                      {/* 2. Date */}
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.date}
                          onChange={(e) => handleCellChange(row.id, 'date', e.target.value)}
                          className="w-full bg-transparent px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-slate-900 focus:bg-white text-xs font-mono font-semibold text-slate-700 transition-colors"
                        />
                      </td>

                      {/* 3. PO No */}
                      <td className="py-2 pl-2 pr-0.5">
                        <input
                          type="text"
                          value={row.poNo}
                          onChange={(e) => handleCellChange(row.id, 'poNo', e.target.value)}
                          className="w-full bg-transparent px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-slate-900 focus:bg-white text-xs font-mono font-bold text-indigo-700 transition-colors"
                        />
                      </td>

                      {/* 4. Sr No */}
                      <td className="py-2 px-0.5 text-center">
                        <input
                          type="number"
                          min="1"
                          value={row.srNo || ''}
                          onChange={(e) => handleCellChange(row.id, 'srNo', parseInt(e.target.value, 10) || 1)}
                          className="w-10 text-center bg-transparent hover:bg-white focus:bg-white px-0.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-slate-900 text-xs font-mono font-black text-slate-900 transition-colors no-spin [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      </td>

                      {/* 5. Material Type */}
                      <td className="p-2">
                        <select
                          value={row.materialType}
                          onChange={(e) => handleCellChange(row.id, 'materialType', e.target.value)}
                          className="w-full bg-transparent px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-slate-900 focus:bg-white text-xs font-bold text-slate-800 transition-colors"
                        >
                          {allMaterialTypes.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* 6. Size Specification */}
                      <td className="p-2 min-w-[260px]">
                        <input
                          type="text"
                          list="size-suggestions"
                          value={row.sizeSpecs}
                          onChange={(e) => handleCellChange(row.id, 'sizeSpecs', e.target.value)}
                          className="w-full min-w-[250px] bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-slate-900 focus:bg-white text-xs font-mono font-bold text-blue-700 transition-colors whitespace-nowrap"
                          placeholder="e.g. 80 x 6 x 485"
                        />
                      </td>

                      {/* 7. Qty */}
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            value={row.quantity}
                            onChange={(e) => handleCellChange(row.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className="w-14 text-center bg-slate-100 hover:bg-white focus:bg-white px-1.5 py-1 rounded border border-slate-200 text-xs font-mono font-black text-slate-900 shadow-2xs no-spin [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="text-[10px] text-slate-500 font-semibold">{row.unit || 'Nos'}</span>
                        </div>
                      </td>

                      {/* 8. Description */}
                      <td className="p-2">
                        <input
                          type="text"
                          list="description-suggestions"
                          value={row.description}
                          onChange={(e) => handleCellChange(row.id, 'description', e.target.value)}
                          className="w-full bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-slate-900 focus:bg-white text-xs font-semibold text-slate-900 transition-colors"
                        />
                      </td>

                      {/* 10. Ordered By (AUTO-FILLED, READ-ONLY, LOCKED) */}
                      <td className="p-2 text-center whitespace-nowrap">
                        {(() => {
                          const userStr = (row.orderedBy || activeOrderedBy || 'Admin').trim();
                          const initial = (userStr[0] || 'A').toUpperCase();
                          const shortName = userStr.split(' ')[0] || userStr;
                          return (
                            <div
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-black cursor-help"
                              title={`Ordered by: ${userStr} (Auto-filled, Read-only)`}
                            >
                              <span className="w-4 h-4 rounded-full bg-emerald-200 text-emerald-900 text-[9px] font-black flex items-center justify-center shrink-0">
                                {initial}
                              </span>
                              <span className="max-w-[50px] truncate">{shortName}</span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Actions */}
                      <td className="p-2 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateRow(row.id)}
                            className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Duplicate Row"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row.id)}
                            className={`p-1 rounded transition-colors ${
                              canDeleteMasterRecords
                                ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                                : 'text-slate-300 opacity-60 hover:text-slate-400 cursor-not-allowed'
                            }`}
                            title={canDeleteMasterRecords ? 'Delete Row (Admin Only • Requires Confirmation)' : 'Protected (Admin Only)'}
                          >
                            {canDeleteMasterRecords ? <Trash2 className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
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

        {/* Footer Summary */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2">
          <div>
            Showing <strong className="text-slate-900">{filteredRows.length}</strong> items across all projects • Total Quantity:{' '}
            <strong className="text-slate-900 font-mono">
              {filteredRows.reduce((sum, r) => sum + (Number(r.quantity) || 0), 0)}
            </strong>{' '}
            Units
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const targetProject = selectedProjectName || (projects.length > 0 ? projects[0].name : 'Project-1');
                const emptyRow: EntryRow = {
                  id: `empty-${Date.now()}`,
                  machineName: machineName || targetProject,
                  date: entryDate || new Date().toISOString().split('T')[0],
                  poNo: poNo || '36',
                  srNo: rows.length + 1,
                  materialType: 'SS Flat',
                  sizeSpecs: 'Custom Spec',
                  quantity: 1,
                  unit: 'Nos',
                  vendorName: vendorName || 'Manav Metal',
                  description: 'New Component',
                  orderedBy: activeOrderedBy,
                  projectName: targetProject,
                };
                const nextRows = normalizeSrNumbers([...rows, emptyRow]);
                setRows(nextRows);
                localStorage.setItem(`RSB_PROJECT_DRAFT_${targetProject}`, JSON.stringify(nextRows));
                localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(nextRows));
                syncRowToDatabaseAndContext(emptyRow, targetProject);
                setSaveToast('Added empty row • Synced to DB');
                setTimeout(() => setSaveToast(null), 2000);
              }}
              className="px-3 py-1 rounded-lg bg-white border border-slate-300 hover:border-slate-400 text-slate-800 text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              + Add Empty Row
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: CREATE NEW PROJECT DIRECTLY IN WORKSTATION */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddProjectModalOpen}
        onClose={() => setIsAddProjectModalOpen(false)}
        title="Create New Project"
        subtitle="Establish dedicated project with self-learning client memory & automatic BOM generation"
        maxWidth="md"
        theme="light"
      >
        <form onSubmit={handleCreateProject} className="space-y-4 text-xs font-sans">
          {/* Smart Self-Learning Notice */}
          <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Auto-Learns Customer & Links Project BOM</span>
            </div>
            <span className="px-2 py-0.5 rounded-md bg-blue-600 text-white font-black text-[10px] uppercase tracking-wider shrink-0">
              Live Sync
            </span>
          </div>

          {/* 1. Project Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={newProjectForm.name}
              onChange={(e) => setNewProjectForm({ ...newProjectForm, name: e.target.value })}
              placeholder="e.g. Mahalaxmi 2, FOHA, Rotary Line 1"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm shadow-xs"
              autoFocus
            />
          </div>

          {/* 2. Client Name & 3. Client Number (Self-Learning Combobox) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Client / Customer Name *
              </label>
              <input
                type="text"
                required
                list="entry-learned-customers"
                value={newProjectForm.clientName}
                onChange={(e) => {
                  const val = e.target.value;
                  const matched = customers.find(c => c.name.toLowerCase() === val.toLowerCase());
                  setNewProjectForm({
                    ...newProjectForm,
                    clientName: val,
                    clientNumber: matched?.mobile || newProjectForm.clientNumber,
                  });
                }}
                placeholder="Type new or select existing"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-semibold placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm shadow-xs"
              />
              <datalist id="entry-learned-customers">
                {customers.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.mobile ? `${c.name} (${c.mobile})` : c.name}
                  </option>
                ))}
              </datalist>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Client Number *
              </label>
              <input
                type="text"
                required
                value={newProjectForm.clientNumber}
                onChange={(e) => setNewProjectForm({ ...newProjectForm, clientNumber: e.target.value })}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-semibold placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all text-sm font-mono shadow-xs"
              />
            </div>
          </div>

          {/* 3. Start Date & 4. Target Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={newProjectForm.startDate}
                onChange={(e) => setNewProjectForm({ ...newProjectForm, startDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none font-mono text-sm shadow-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Target Date *
              </label>
              <input
                type="date"
                required
                value={newProjectForm.targetDate}
                onChange={(e) => setNewProjectForm({ ...newProjectForm, targetDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 outline-none font-mono text-sm shadow-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAddProjectModalOpen(false)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer transition-all active:scale-95 text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-tour="tour-modal-create-project-btn"
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20 cursor-pointer active:scale-95 transition-all text-xs"
            >
              Create Project & Select
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: CUSTOM MACHINE NAME */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCustomMachineModalOpen}
        onClose={() => setIsCustomMachineModalOpen(false)}
        title="➕ Add Custom Machine"
        subtitle="Define a custom machine model or fabrication unit"
        maxWidth="sm"
      >
        <form onSubmit={handleAddCustomMachine} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Machine Name / Model:
            </label>
            <input
              autoFocus
              type="text"
              required
              value={customMachineInput}
              onChange={(e) => setCustomMachineInput(e.target.value)}
              placeholder="e.g. 50 HD, Ultra Washing Skid..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-bold focus:bg-white focus:border-blue-600 outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCustomMachineModalOpen(false)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer active:scale-95"
            >
              Save Machine
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: CUSTOM MATERIAL TYPE */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCustomMaterialModalOpen}
        onClose={() => setIsCustomMaterialModalOpen(false)}
        title="➕ Add Custom Material Type"
        subtitle="Add a specialized raw material or component category"
        maxWidth="sm"
      >
        <form onSubmit={handleAddCustomMaterial} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Material Type Name:
            </label>
            <input
              autoFocus
              type="text"
              required
              value={customMaterialInput}
              onChange={(e) => setCustomMaterialInput(e.target.value)}
              placeholder="e.g. Titanium Rod, SS Hex Bar, Brass Bush..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-bold focus:bg-white focus:border-blue-600 outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCustomMaterialModalOpen(false)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer active:scale-95"
            >
              Add Material Type
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: CUSTOM VENDOR */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCustomVendorModalOpen}
        onClose={() => setIsCustomVendorModalOpen(false)}
        title="➕ Add Custom Vendor"
        subtitle="Enter a new raw material supplier or fabrication vendor"
        maxWidth="sm"
      >
        <form onSubmit={handleAddCustomVendor} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Vendor / Supplier Name:
            </label>
            <input
              autoFocus
              type="text"
              required
              value={customVendorInput}
              onChange={(e) => setCustomVendorInput(e.target.value)}
              placeholder="e.g. Shiv Shakti Metals, Patel Precision..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-bold focus:bg-white focus:border-blue-600 outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCustomVendorModalOpen(false)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer active:scale-95"
            >
              Add Vendor
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: CUSTOM UNIT */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCustomUnitModalOpen}
        onClose={() => setIsCustomUnitModalOpen(false)}
        title="➕ Add Custom Unit of Measurement"
        subtitle="Define a custom unit (e.g. Roll, Box, Feet, Bundle)"
        maxWidth="sm"
      >
        <form onSubmit={handleAddCustomUnit} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Unit Name:
            </label>
            <input
              autoFocus
              type="text"
              required
              value={customUnitInput}
              onChange={(e) => setCustomUnitInput(e.target.value)}
              placeholder="e.g. Roll, Box, Feet, Bundle..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-bold focus:bg-white focus:border-blue-600 outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCustomUnitModalOpen(false)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer active:scale-95"
            >
              Add Unit
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: CUSTOM DESCRIPTION */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCustomDescModalOpen}
        onClose={() => setIsCustomDescModalOpen(false)}
        title="➕ Add Custom Material Description"
        subtitle="Enter component description or fabrication part name"
        maxWidth="sm"
      >
        <form onSubmit={handleAddCustomDesc} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Description / Part Name:
            </label>
            <input
              autoFocus
              type="text"
              required
              value={customDescInput}
              onChange={(e) => setCustomDescInput(e.target.value)}
              placeholder="e.g. Washing Distributor Barrel, Guide Clamp Patti..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-bold focus:bg-white focus:border-blue-600 outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCustomDescModalOpen(false)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer active:scale-95"
            >
              Use Description
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: CUSTOM SIZE SPECIFICATION */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isCustomSizeModalOpen}
        onClose={() => setIsCustomSizeModalOpen(false)}
        title="➕ Add Custom Size Specification"
        subtitle="Enter dimensions (e.g. 80 x 6 x 485, OD 106 x ID 75 x 110, Dia 45 x 620 mm)"
        maxWidth="sm"
      >
        <form onSubmit={handleAddCustomSize} className="space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">
              Size Dimensions / Specifications:
            </label>
            <input
              autoFocus
              type="text"
              required
              value={customSizeInput}
              onChange={(e) => setCustomSizeInput(e.target.value)}
              placeholder="e.g. 80 x 6 x 485 or Dia 45 x 620 mm..."
              className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-bold font-mono focus:bg-white focus:border-blue-600 outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsCustomSizeModalOpen(false)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-xs cursor-pointer active:scale-95"
            >
              Use Size Specification
            </button>
          </div>
        </form>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: LIVE WORLD STAINLESS STEEL (SS) RATES & MARKET INTELLIGENCE */}
      {/* ========================================================================= */}
      {isRatesModalOpen && (
        <Modal
          isOpen={isRatesModalOpen}
          onClose={() => setIsRatesModalOpen(false)}
          title="Global Stainless Steel (SS) Market Rates & Auto-Costing"
          subtitle="Real-time London Metal Exchange (LME) + Mumbai/Ahmedabad Mandi Spot Pricing"
          maxWidth="4xl"
        >
          <LiveWorldSSRatesModal
            onClose={() => setIsRatesModalOpen(false)}
            onSelectRate={(grade, rateINR, form) => {
              handleSelectLiveRate(grade, rateINR, form);
            }}
          />
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: 1-CLICK STANDARD MACHINE BOM TEMPLATE LOADER */}
      {/* ========================================================================= */}
      {isBOMModalOpen && (
        <Modal
          isOpen={isBOMModalOpen}
          onClose={() => setIsBOMModalOpen(false)}
          title={selectedBOMTemplateKey ? `⚡ Standard Factory BOM: ${selectedBOMTemplateKey}` : '⚡ Standard Factory BOM Templates'}
          subtitle="1-Click load all precision engineered standard parts into the active table"
          maxWidth="4xl"
        >
          {(() => {
            const hasTemplates = Object.keys(MACHINE_BOM_TEMPLATES).length > 0;
            const tmpl = selectedBOMTemplateKey ? MACHINE_BOM_TEMPLATES[selectedBOMTemplateKey] : null;

            if (!hasTemplates || !tmpl) {
              return (
                <div className="p-8 text-center space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Factory Clean BOM State</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      No sample BOM templates are preloaded. You can build, configure, and save customized BOM structures in the BOM Management module.
                    </p>
                  </div>
                  <div className="flex justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsBOMModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
                    >
                      Close
                    </button>
                  </div>
                </div>
              );
            }

            const allSelected = selectedBOMPartIndices.length === tmpl.parts.length;

            return (
              <div className="space-y-4 text-slate-200">
                {/* Machine Template Switcher & Overview */}
                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase text-amber-400 font-mono">
                        {tmpl.category}
                      </span>
                      <span className="text-sm font-extrabold text-white">
                        {tmpl.machineName} Standard BOM
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{tmpl.description}</p>
                  </div>

                  {/* Switch Machine Dropdown */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-bold">Select Machine:</span>
                    <select
                      value={selectedBOMTemplateKey}
                      onChange={(e) => {
                        const nextKey = e.target.value;
                        setSelectedBOMTemplateKey(nextKey);
                        const nextTmpl = MACHINE_BOM_TEMPLATES[nextKey];
                        if (nextTmpl) {
                          setSelectedBOMPartIndices(nextTmpl.parts.map((_, i) => i));
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-bold text-xs focus:border-amber-400 outline-none font-mono"
                    >
                      {Object.keys(MACHINE_BOM_TEMPLATES).map((k) => (
                        <option key={k} value={k}>
                          {k} ({MACHINE_BOM_TEMPLATES[k].parts.length} Parts)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Metrics Header */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 text-center">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Standard Parts</div>
                    <div className="text-base font-black text-amber-400 font-mono mt-0.5">
                      {tmpl.parts.length} Precision Items
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 text-center">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Estimated Raw SS</div>
                    <div className="text-base font-black text-emerald-400 font-mono mt-0.5">
                      ~{tmpl.estimatedRawSSKg} KG
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-850 border border-slate-800 text-center">
                    <div className="text-[10px] text-slate-400 uppercase font-mono">Assembly Cycle</div>
                    <div className="text-base font-black text-purple-400 font-mono mt-0.5">
                      {tmpl.standardAssemblyDays} Days
                    </div>
                  </div>
                </div>

                {/* Parts Selection Table */}
                <div className="border border-slate-800 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-850 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBOMPartIndices(tmpl.parts.map((_, i) => i));
                              } else {
                                setSelectedBOMPartIndices([]);
                              }
                            }}
                            className="rounded bg-slate-800 text-emerald-500"
                          />
                        </th>
                        <th className="px-3 py-2">Sr</th>
                        <th className="px-3 py-2">Part Description</th>
                        <th className="px-3 py-2">Material Type</th>
                        <th className="px-3 py-2">Size Specification</th>
                        <th className="px-3 py-2">Qty</th>
                        <th className="px-3 py-2">Vendor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 font-medium">
                      {tmpl.parts.map((p, idx) => {
                        const isChecked = selectedBOMPartIndices.includes(idx);
                        return (
                          <tr
                            key={idx}
                            onClick={() => {
                              if (isChecked) {
                                setSelectedBOMPartIndices((prev) => prev.filter((i) => i !== idx));
                              } else {
                                setSelectedBOMPartIndices((prev) => [...prev, idx]);
                              }
                            }}
                            className={`hover:bg-slate-800/60 cursor-pointer transition-colors ${
                              isChecked ? 'bg-indigo-950/20' : 'opacity-60'
                            }`}
                          >
                            <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedBOMPartIndices((prev) => [...prev, idx]);
                                  } else {
                                    setSelectedBOMPartIndices((prev) => prev.filter((i) => i !== idx));
                                  }
                                }}
                                className="rounded bg-slate-800 text-emerald-500"
                              />
                            </td>
                            <td className="px-3 py-2.5 font-mono text-slate-400">{p.srNo}</td>
                            <td className="px-3 py-2.5 font-bold text-white">{p.description}</td>
                            <td className="px-3 py-2.5">
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-300 text-[10px] font-bold">
                                {p.materialType}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-mono text-blue-300 font-bold">{p.sizeSpecification}</td>
                            <td className="px-3 py-2.5 font-mono text-emerald-300 font-bold">
                              {p.quantity} {p.unit}
                            </td>
                            <td className="px-3 py-2.5 text-slate-400">{p.recommendedVendor}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                  <span className="text-xs text-slate-400 font-medium">
                    Selected <strong className="text-white">{selectedBOMPartIndices.length}</strong> of {tmpl.parts.length} parts
                  </span>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsBOMModalOpen(false)}
                      className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-bold cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadBOMTemplate}
                      className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-extrabold shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer"
                    >
                      <Zap className="w-4 h-4 text-amber-300" />
                      <span>1-Click Load into Active Table</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TRASH / RECYCLE BIN & INSTANT RECOVERY */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isTrashModalOpen}
        onClose={() => setIsTrashModalOpen(false)}
        title="🗑️ Trash & Recovery Vault"
        subtitle="Recover accidentally deleted projects and material rows, or permanently empty trash"
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs font-sans">
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${trashItems.length > 0 ? 'bg-rose-500 animate-pulse' : 'bg-slate-400'}`} />
              <span className="text-slate-700 font-bold">
                {trashItems.length} Deleted Items in Vault
              </span>
            </div>
            {trashItems.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('Permanently purge all items from trash? This cannot be undone.')) {
                    emptyTrash();
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-800 text-[11px] font-bold cursor-pointer transition-all active:scale-95"
              >
                Empty Entire Trash
              </button>
            )}
          </div>

          {trashItems.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Trash2 className="w-10 h-10 mx-auto text-slate-300 opacity-60" />
              <p className="font-bold text-slate-600">Trash Vault is Empty</p>
              <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                Any projects or material rows you delete will appear here and can be recovered with 1 click.
              </p>
            </div>
          ) : (
            <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
              {trashItems.map((item) => (
                <div key={item.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors">
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                        item.type === 'project'
                          ? 'bg-purple-100 text-purple-800 border border-purple-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {item.type === 'project' ? '📁 Project' : '📦 Material'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Deleted: {item.deletedAt} • by {item.deletedBy}
                      </span>
                    </div>
                    <h4 className="text-xs font-black text-slate-900 truncate">{item.title}</h4>
                    <p className="text-[11px] text-slate-500 truncate font-mono">{item.subtitle}</p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        restoreFromTrash(item.id);
                        setSaveToast(`✨ Restored "${item.title}" back to active database!`);
                        setTimeout(() => setSaveToast(null), 3000);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-2xs flex items-center gap-1 cursor-pointer active:scale-95"
                      title="Restore back to active ERP and database"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Recover</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => permanentlyDeleteFromTrash(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      title="Delete permanently"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setIsTrashModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
            >
              Close Vault
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: FACTORY RESET CONFIRMATION (ONLY ACCESSIBLE TO ROOT ADMINS AMIT & KAUSTUBH) */}
      {/* ========================================================================= */}
      {isRootAdmin && isFactoryResetModalOpen && (
        <Modal
          isOpen={isFactoryResetModalOpen}
          onClose={() => setIsFactoryResetModalOpen(false)}
          title="⚠️ Factory Reset System Baseline"
          subtitle="Reset all info, suggestions, BOMs, active orders, and cache to blank slate"
          maxWidth="md"
        >
          <div className="space-y-4 p-1">
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-2">
              <div className="flex items-center gap-2 font-black text-rose-800 text-sm">
                <RotateCcw className="w-5 h-5 text-rose-600 animate-spin-reverse" />
                <span>Full Factory Data & Suggestion Wipe</span>
              </div>
              <p className="text-xs text-rose-700 leading-relaxed">
                This action will reset your workstation and system database to a pure, clean blank slate:
              </p>
              <ul className="text-xs text-rose-800 space-y-1 list-disc list-inside font-medium">
                <li>Clear all active material entry rows and drafts</li>
                <li>Clear all custom suggestion memory (descriptions, sizes, units)</li>
                <li>Reset projects, requirements, purchase orders, and BOMs</li>
                <li>Purge temporary browser state and cache</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsFactoryResetModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmFactoryReset}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md shadow-rose-600/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Yes, Factory Reset Everything</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: EXCEL IMPORT PREVIEW & COLUMN MAPPING */}
      {/* ========================================================================= */}
      {isImportPreviewOpen && importWorkbook && importAnalysis && (
        <ExcelImportPreviewModal
          isOpen={isImportPreviewOpen}
          onClose={() => setIsImportPreviewOpen(false)}
          fileName={importFileName}
          workbook={importWorkbook}
          initialAnalysis={importAnalysis}
          onConfirmImport={handleConfirmExcelImport}
        />
      )}
    </div>
  );
};
