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
  Globe,
  ShoppingCart,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useERP } from '../../context/ERPContext';
import { MaterialType, MachineCategory, ProjectItem, ProjectMaterialRequirementItem } from '../../types/erp';
import { exportToExcel, parseExcelFile } from '../../utils/excelIntegration';
import { Modal } from '../common/Modal';
import { ProjectsDirectory } from '../projects/ProjectsDirectory';
import { ProjectDetailsView } from '../projects/ProjectDetailsView';
import { MemberAuthorizationManager } from '../admin/MemberAuthorizationManager';
import { ProcurementBasket } from '../procurement/ProcurementBasket';
import { getMaterialsForProject } from '../../utils/projectMaterialsHelper';
import { MACHINE_BOM_TEMPLATES, MachineBOMTemplate } from '../../data/machineBOMTemplates';
import { LiveWorldSSRatesModal } from '../rates/LiveWorldSSRatesModal';

export interface EntryRow {
  id: string;
  machineName: string;
  date: string;
  poNo: string;
  srNo: number;
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

const MACHINE_SUGGESTIONS: string[] = [
  '16 HD',
  '10 HD',
  '12 HD',
  '20 HD',
  '24 HD',
  '30 HD',
  '40 HD',
  'Mono Conveyor',
  'Washing Unit',
  'Distributor',
  'Sealing Unit',
  'Cap Transfer',
  'Pipeline System',
  'CIP Skid',
  'Conveyor Assembly',
  'Custom Machine',
  'Custom Fabrication',
];

const MATERIAL_TYPES: MaterialType[] = [
  'SS Flat',
  'SS Pipe',
  'SS Circle',
  'SS Bar',
  'SS Sheet',
  'SS Angle',
  'Hardware',
  'Consumables',
  'Other',
];

const COMMON_VENDORS = [
  'Manav Metal',
  'Apex Steel Corporation',
  'Shreeji Tubes & Pipes',
  'Gujarat Precision Forgings',
  'R.K. Fasteners & Hardware',
  'Siddharth Engineering',
  'Bharat Forgings Ltd',
];

// Machine-specific frequent components for smart auto-fill suggestions
const MACHINE_FREQUENT_COMPONENTS: Record<string, { description: string; materialType: MaterialType; sizeSpecs: string; qty: number; unit: string }[]> = {
  '16 HD': [
    { description: 'Mono Conveyor Inlet Patti', materialType: 'SS Flat', sizeSpecs: '80 x 6 x 485', qty: 2, unit: 'Nos' },
    { description: 'Sealing Clamp', materialType: 'SS Flat', sizeSpecs: '60 x 16 x 110', qty: 2, unit: 'Nos' },
    { description: 'Cap Transfer Bush', materialType: 'SS Pipe', sizeSpecs: 'OD 106 x ID 75 x 110', qty: 2, unit: 'Nos' },
    { description: 'Clamp Ghode', materialType: 'SS Flat', sizeSpecs: '60 x 16 x 135', qty: 2, unit: 'Nos' },
    { description: 'Bridge Support Patti', materialType: 'SS Flat', sizeSpecs: '65 x 10 x 420', qty: 2, unit: 'Nos' },
    { description: 'Outlet Roll', materialType: 'SS Bar', sizeSpecs: 'Ø 45 x 620 mm', qty: 2, unit: 'Nos' },
  ],
  '10 HD': [
    { description: 'Guide Track Patti', materialType: 'SS Flat', sizeSpecs: '50 x 8 x 380', qty: 2, unit: 'Nos' },
    { description: 'Indexing Cam', materialType: 'SS Circle', sizeSpecs: 'OD 160 x 20 MM', qty: 1, unit: 'Nos' },
    { description: 'Conveyor Drive Roller', materialType: 'SS Pipe', sizeSpecs: 'OD 60 x ID 45 x 350', qty: 2, unit: 'Nos' },
    { description: 'Supporting Bracket', materialType: 'SS Angle', sizeSpecs: '50 x 50 x 6 x 300', qty: 4, unit: 'Nos' },
  ],
  '20 HD': [
    { description: 'High-Torque Head Clamp', materialType: 'SS Flat', sizeSpecs: '80 x 16 x 160', qty: 4, unit: 'Nos' },
    { description: 'Main Center Shaft', materialType: 'SS Bar', sizeSpecs: 'Ø 55 x 750 mm', qty: 1, unit: 'Nos' },
    { description: 'Distributor Sleeve Pipe', materialType: 'SS Pipe', sizeSpecs: 'OD 120 x ID 90 x 180', qty: 2, unit: 'Nos' },
    { description: 'Base Mounting Plate', materialType: 'SS Sheet', sizeSpecs: '400 x 400 x 10 mm', qty: 2, unit: 'Nos' },
  ],
  'Mono Conveyor': [
    { description: 'Mono Conveyor Inlet Patti', materialType: 'SS Flat', sizeSpecs: '80 x 6 x 485', qty: 2, unit: 'Nos' },
    { description: 'Conveyor Support Patti', materialType: 'SS Angle', sizeSpecs: '50 x 50 x 6 x 500', qty: 4, unit: 'Nos' },
    { description: 'Outlet Bridge', materialType: 'SS Flat', sizeSpecs: '90 x 12 x 580', qty: 1, unit: 'Nos' },
    { description: 'Return Idler Roller', materialType: 'SS Pipe', sizeSpecs: 'OD 60 x ID 45 x 420', qty: 2, unit: 'Nos' },
  ],
  'Washing Unit': [
    { description: 'Washing Clamp Bracket', materialType: 'SS Flat', sizeSpecs: '50 x 16 x 83', qty: 3, unit: 'Nos' },
    { description: 'Washing Cam', materialType: 'SS Circle', sizeSpecs: 'OD 180 x 25 MM', qty: 2, unit: 'Nos' },
    { description: 'Washing Distributor Manifold', materialType: 'SS Pipe', sizeSpecs: 'OD 106 x ID 75 x 110', qty: 1, unit: 'Nos' },
    { description: 'Spray Header Pipe', materialType: 'SS Pipe', sizeSpecs: 'OD 60 x ID 45 x 650', qty: 2, unit: 'Nos' },
  ],
  'Distributor': [
    { description: 'Distributor Support Patti', materialType: 'SS Flat', sizeSpecs: '50 x 12 x 320', qty: 2, unit: 'Nos' },
    { description: '6-Station Rotary Plate', materialType: 'SS Sheet', sizeSpecs: '450 x 450 x 12 mm', qty: 2, unit: 'Nos' },
    { description: 'Indexing Center Spindle', materialType: 'SS Bar', sizeSpecs: 'Ø 55 x 480 mm', qty: 1, unit: 'Nos' },
  ],
  'CIP Skid': [
    { description: 'Sanitary Header Main Run Pipe', materialType: 'SS Pipe', sizeSpecs: 'OD 106 x ID 75 x 1200', qty: 2, unit: 'Nos' },
    { description: 'Mounting Saddle Patti', materialType: 'SS Flat', sizeSpecs: '65 x 10 x 240', qty: 6, unit: 'Nos' },
    { description: 'Skid Base Support Angle', materialType: 'SS Angle', sizeSpecs: '50 x 50 x 6 x 850', qty: 4, unit: 'Nos' },
  ],
};

const COMMON_DESCRIPTIONS = [
  'Mono Conveyor Inlet Patti',
  'Sealing Clamp',
  'Clamp Ghode',
  'Washing Clamp',
  'Distributor Support Patti',
  'Pipe Line Clamp',
  'Bridge',
  'Bridge Support Patti',
  'Conveyor Support Patti',
  'Outlet Bridge',
  'Washing Cam',
  'Outlet Roll',
  'Cap Transfer',
  'Washing Distributor',
  'Main Center Shaft',
  'Guide Track Patti',
  'Base Mounting Plate',
];

const COMMON_SIZES = [
  '80 x 6 x 485',
  '60 x 16 x 110',
  '60 x 16 x 135',
  '50 x 16 x 83',
  '50 x 12 x 320',
  'OD 60 x ID 45 x 120',
  '100 x 12 x 650',
  '65 x 10 x 420',
  '50 x 50 x 6 x 500',
  '90 x 12 x 580',
  'OD 180 x 25 MM',
  'Ø 45 x 620 mm',
  '300 x 300 x 3 mm',
  'OD 106 x ID 75 x 110',
  'Ø 55 x 750 mm',
  '400 x 400 x 10 mm',
];

const DRAFT_STORAGE_KEY = 'RSB_PROJECT_MATERIAL_ENTRY_10COL_WORKFLOW_V3';

export const ProjectMaterialEntry: React.FC = () => {
  const {
    projects,
    addProject,
    updateProject,
    projectRequirements,
    bulkImportProjectRequirements,
    replaceProjectRequirements,
    deleteProjectRequirement,
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
  } = useERP();

  const isStoreIncharge = currentUser?.role === 'store_incharge';

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
  const [vendorName, setVendorName] = useState(() => vendors[0]?.name || 'Manav Metal');
  const [poNo, setPoNo] = useState('36');
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedProjectName, setSelectedProjectName] = useState<string>(() => projects[0]?.name || '');

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
  const [selectedBOMTemplateKey, setSelectedBOMTemplateKey] = useState<string>(() => Object.keys(MACHINE_BOM_TEMPLATES)[0] || '');
  const [selectedBOMPartIndices, setSelectedBOMPartIndices] = useState<number[]>([]);

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

  const allMaterialTypes = useMemo(() => {
    return Array.from(new Set([...MATERIAL_TYPES, ...customMaterials]));
  }, [customMaterials]);

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

  // Seed Initial 10-column table (discard empty/blank drafts)
  const [rows, setRows] = useState<EntryRow[]>(() => {
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasRealData = parsed.some((r) => r.description && r.description.trim() !== '' && r.description !== 'New Component');
          if (hasRealData) return parsed;
        }
      } catch (e) {
        console.error('Failed to parse draft:', e);
      }
    }
    return [];
  });

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
  const [isSavingOrder, setIsSavingOrder] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const isUserManuallyEditingRef = useRef<boolean>(false);
  const lastSelectedProjectRef = useRef<string>('');

  // Auto-save draft to localStorage (only save if there are real items)
  useEffect(() => {
    if (rows.length > 0) {
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(rows));
    }
    const now = new Date();
    setLastAutoSavedTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  }, [rows]);

  // Normalize Sr Numbers
  const normalizeSrNumbers = (rowList: EntryRow[]) => {
    return rowList.map((r, index) => ({
      ...r,
      srNo: index + 1,
    }));
  };

  // Sync selectedProjectName when projects list updates if currently unselected
  useEffect(() => {
    if (!selectedProjectName && projects.length > 0) {
      setSelectedProjectName(projects[0].name);
    }
  }, [projects]);

  // REAL-TIME LIVE WORKSTATION SYNC: Automatically synchronize rows & order header with live Supabase DB & other workstations
  useEffect(() => {
    if (!selectedProjectName) return;
    const currentProject = projects.find((p) => p.name.trim().toLowerCase() === selectedProjectName.trim().toLowerCase());
    if (!currentProject) return;

    // Load actual material requirements for this project from live state
    const projectMats = getMaterialsForProject(currentProject, projectRequirements);
    const isProjectSwitch = lastSelectedProjectRef.current.trim().toLowerCase() !== selectedProjectName.trim().toLowerCase();

    const mappedRows: EntryRow[] = projectMats.map((m, idx) => ({
      id: m.id,
      machineName: m.machineName || m.machineType || currentProject.machineName || currentProject.machineType || machineName,
      date: m.poDate || m.date || currentProject.startDate || entryDate,
      poNo: m.poNumber || m.poNo || currentProject.poNo || currentProject.poNumber || poNo,
      srNo: idx + 1,
      materialType: (m.materialType || 'SS Flat') as MaterialType,
      sizeSpecs: m.sizeSpecs || 'Custom Specs',
      quantity: Number(m.quantity) || 1,
      unit: m.unit || 'Nos',
      vendorName: m.vendor || m.vendorName || currentProject.vendorName || currentProject.vendor || vendorName,
      description: m.description || 'Component',
      orderedBy: m.orderedBy || activeOrderedBy,
      projectName: currentProject.name,
    }));

    if (isProjectSwitch) {
      // Switched to a new project: update reference and load DB rows or empty array
      lastSelectedProjectRef.current = selectedProjectName;
      isUserManuallyEditingRef.current = false;
      setRows(mappedRows);
      if (mappedRows.length === 0) {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }

      // Update header fields to match project
      if (currentProject.machineName || currentProject.machineType) {
        setMachineName(currentProject.machineName || currentProject.machineType || currentProject.name);
      }
      if (currentProject.vendorName || currentProject.vendor) {
        setVendorName(currentProject.vendorName || currentProject.vendor || 'Manav Metal');
      }
      if (currentProject.poNo || currentProject.poNumber) {
        setPoNo(currentProject.poNo || currentProject.poNumber || '36');
      }
      if (currentProject.date || currentProject.startDate) {
        setEntryDate(currentProject.date || currentProject.startDate || new Date().toISOString().split('T')[0]);
      }
    } else {
      // Still on the same project: only sync if external updates happened and user is not actively editing
      if (projectMats.length > 0) {
        setRows((prev) => {
          // If current rows are empty or placeholder only, populate
          const isPlaceholderOnly = prev.length === 0 || prev.every((r) => !r.description || r.description === 'New Component' || !r.sizeSpecs);
          if (isPlaceholderOnly) {
            return mappedRows;
          }
          if (!isUserManuallyEditingRef.current) {
            const prevKey = prev.map((r) => `${r.id}_${r.quantity}_${r.description}_${r.sizeSpecs}`).join('|');
            const nextKey = mappedRows.map((r) => `${r.id}_${r.quantity}_${r.description}_${r.sizeSpecs}`).join('|');
            if (prevKey !== nextKey) {
              return mappedRows;
            }
          }
          return prev;
        });
      }
      // If projectMats.length === 0 on the same project, do NOT wipe local draft rows!
    }
  }, [selectedProjectName, projectRequirements, projects]);

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
    return MACHINE_FREQUENT_COMPONENTS['16 HD'] || [];
  }, [machineName, projectRequirements]);

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
    const prevMaterials = getMaterialsForProject(prevProject, projectRequirements);
    if (prevMaterials.length === 0) {
      alert(`No material records found in project ${prevProject.name}`);
      return;
    }

    const copiedRows: EntryRow[] = prevMaterials.map((m, idx) => ({
      id: `copy-${Date.now()}-${idx}`,
      machineName: machineName || prevProject.machineName || prevProject.machineType || prevProject.name,
      date: entryDate,
      poNo: poNo,
      srNo: rows.length + idx + 1,
      materialType: m.materialType as MaterialType,
      sizeSpecs: m.sizeSpecs,
      quantity: m.quantity,
      unit: m.unit || 'Nos',
      vendorName: vendorName,
      description: m.description,
      orderedBy: activeOrderedBy,
      projectName: prevProject.name,
    }));

    setRows((prev) => normalizeSrNumbers([...prev, ...copiedRows]));
    confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    setSaveToast(`Copied ${copiedRows.length} materials into Machine "${machineName}"!`);
    setTimeout(() => setSaveToast(null), 3500);
  };

  // Duplicate Order (Generates new PO entry and copies all materials)
  const handleDuplicateOrder = (prevProject: ProjectItem) => {
    const prevMachine = prevProject.machineName || prevProject.machineType || machineName || prevProject.name;
    const prevVendor = prevProject.vendorName || prevProject.vendor || vendorName;
    const newPo = `${Number(prevProject.poNo || prevProject.poNumber || 36) + 1}`;

    setSelectedProjectName(prevProject.name);
    setMachineName(prevMachine);
    setVendorName(prevVendor);
    setPoNo(newPo);

    const prevMaterials = getMaterialsForProject(prevProject, projectRequirements);
    const newRows: EntryRow[] = prevMaterials.map((m, idx) => ({
      id: `dup-order-${Date.now()}-${idx}`,
      machineName: prevMachine,
      date: entryDate,
      poNo: newPo,
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
    confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
    setSaveToast(`Created new Order PO #${newPo} from Machine "${prevMachine}" with ${newRows.length} items!`);
    setTimeout(() => setSaveToast(null), 4000);
  };

  // Add 1-click suggested part
  const handleAddSuggestedPart = (part: { description: string; materialType: MaterialType; sizeSpecs: string; qty: number; unit: string }) => {
    const targetProject = selectedProjectName || (projects.length > 0 ? projects[0].name : 'Project-1');
    const newRow: EntryRow = {
      id: `sug-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      machineName: machineName || targetProject,
      date: entryDate || new Date().toISOString().split('T')[0],
      poNo: poNo || '36',
      srNo: rows.length + 1,
      materialType: part.materialType,
      sizeSpecs: part.sizeSpecs,
      quantity: part.qty,
      unit: part.unit,
      vendorName: vendorName || 'Manav Metal',
      description: part.description,
      orderedBy: activeOrderedBy,
      projectName: targetProject,
    };

    setRows((prev) => normalizeSrNumbers([...prev, newRow]));
    setSaveToast(`Added ${part.description} (${part.sizeSpecs})`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Add all suggested parts in 1 click
  const handleAddAllSuggestedParts = () => {
    const targetProject = selectedProjectName || (projects.length > 0 ? projects[0].name : 'Project-1');
    const newRows: EntryRow[] = suggestedFrequentParts.map((part, idx) => ({
      id: `sug-all-${Date.now()}-${idx}`,
      machineName: machineName || targetProject,
      date: entryDate || new Date().toISOString().split('T')[0],
      poNo: poNo || '36',
      srNo: rows.length + idx + 1,
      materialType: part.materialType,
      sizeSpecs: part.sizeSpecs,
      quantity: part.qty,
      unit: part.unit,
      vendorName: vendorName || 'Manav Metal',
      description: part.description,
      orderedBy: activeOrderedBy,
      projectName: targetProject,
    }));

    setRows((prev) => normalizeSrNumbers([...prev, ...newRows]));
    confetti({ particleCount: 60, spread: 60, origin: { y: 0.65 } });
    setSaveToast(`Added all ${newRows.length} suggested parts for Machine "${machineName}"!`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Project Selection Handler
  const handleSelectExistingProject = (pName: string) => {
    setSelectedProjectName(pName);
    const found = projects.find((p) => p.name === pName);
    if (found) {
      if (found.machineName || found.machineType) setMachineName(found.machineName || found.machineType || found.name);
      if (found.vendorName || found.vendor) setVendorName(found.vendorName || found.vendor || 'Manav Metal');
      if (found.poNo || found.poNumber) setPoNo(found.poNo || found.poNumber || '36');
      if (found.date || found.createdDate) setEntryDate(found.date || found.createdDate || new Date().toISOString().split('T')[0]);

      // Sync workstation rows with the project's actual material requirements
      const existingMats = getMaterialsForProject(found, projectRequirements);
      const mappedRows: EntryRow[] = existingMats.map((m, idx) => ({
        id: m.id,
        machineName: m.machineName || m.machineType || found.machineType || found.name,
        date: m.poDate || m.date || found.startDate || new Date().toISOString().split('T')[0],
        poNo: m.poNumber || m.poNo || found.poNumber || '36',
        srNo: idx + 1,
        materialType: m.materialType as MaterialType,
        sizeSpecs: m.sizeSpecs,
        quantity: m.quantity,
        unit: m.unit || 'Nos',
        vendorName: m.vendor || m.vendorName || found.vendor || 'Manav Metal',
        description: m.description,
        orderedBy: m.orderedBy || activeOrderedBy,
        projectName: found.name,
      }));
      setRows(mappedRows);
    }
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
    const resolvedMachine = newProjectForm.machineName?.trim() || machineName || newProjectForm.name.trim();

    const newPrj: Omit<ProjectItem, 'id'> = {
      name: newProjectForm.name.trim(),
      projectNumber: `PRJ-${String(projects.length + 1).padStart(3, '0')}`,
      customer: customerDisplay,
      clientName: clientNameVal,
      clientNumber: clientNumVal,
      orderSource: 'Customer PO',
      machineType: resolvedMachine as any,
      machineName: resolvedMachine,
      poNumber: poNo || `PO-2026-${projects.length + 1}`,
      poNo: poNo || `PO-2026-${projects.length + 1}`,
      date: formattedStartDate,
      createdDate: formattedStartDate,
      lastUpdatedDate: formattedStartDate,
      startDate: formattedStartDate,
      targetCompletionDate: formattedTargetDate,
      priority: 'high',
      projectValue: 450000,
      vendor: vendorName || 'Manav Metal',
      vendorName: vendorName || 'Manav Metal',
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
    setMachineName(resolvedMachine);
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
    setSaveToast(`✨ Created Project "${newPrj.name}" & Learned Machine "${resolvedMachine}"!`);
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

    const newRow: EntryRow = {
      id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      machineName: machineName || targetProject,
      date: entryDate || new Date().toISOString().split('T')[0],
      poNo: poNo || '36',
      srNo: rows.length + 1,
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

    setRows((prev) => normalizeSrNumbers([...prev, newRow]));
    setQuickDesc('');
    setQuickSize('');

    setQuickQty(1);

    // Smoothly refocus back to description for continuous rapid-fire entry
    setTimeout(() => {
      quickDescInputRef.current?.focus();
    }, 40);

    setSaveToast(`Added row #${rows.length + 1}: ${newRow.description}`);
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
    setRows(normalizeSrNumbers(updated));
    setSaveToast(`Duplicated row #${target.srNo}`);
    setTimeout(() => setSaveToast(null), 2000);
  };

  // Delete Row
  const handleDeleteRow = (rowId: string) => {
    const row = rows.find((r) => r.id === rowId);
    if (row && projectRequirements.some((pr) => pr.id === row.id)) {
      deleteProjectRequirement(row.id);
    }
    setRows((prev) => normalizeSrNumbers(prev.filter((r) => r.id !== rowId)));
    setSaveToast('Deleted row');
    setTimeout(() => setSaveToast(null), 2000);
  };

  // Delete Selected Rows in Bulk
  const handleDeleteSelectedRows = () => {
    if (selectedRowIds.length === 0) return;
    if (
      confirm(
        `Are you sure you want to delete ${selectedRowIds.length} selected row(s)? This will move them to Trash and delete permanently from DB.`
      )
    ) {
      selectedRowIds.forEach((id) => {
        const row = rows.find((r) => r.id === id);
        if (row) {
          const matched = projectRequirements.find(
            (pr) =>
              pr.id === id ||
              (pr.description === row.description &&
                pr.sizeSpecs === row.sizeSpecs &&
                pr.projectName === (row.projectName || selectedProjectName))
          );
          if (matched) {
            deleteProjectRequirement(matched.id);
          }
        }
      });
      setRows((prev) => normalizeSrNumbers(prev.filter((r) => !selectedRowIds.includes(r.id))));
      setSelectedRowIds([]);
      setSaveToast(`🗑️ Deleted ${selectedRowIds.length} rows • Moved to Trash & purged from DB`);
      setTimeout(() => setSaveToast(null), 2500);
    }
  };

  // Cell Change (Ordered By is strictly locked)
  const handleCellChange = (id: string, field: keyof EntryRow, value: any) => {
    if (field === 'orderedBy') return; // Read-only
    isUserManuallyEditingRef.current = true;
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return { ...r, [field]: value };
        }
        return r;
      })
    );
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

      const itemsToSave: Partial<ProjectMaterialRequirementItem>[] = rows.map((r) => ({
        id: r.id,
        projectName: r.projectName || targetProject,
        customerName: custName,
        poNumber: r.poNo || poNo,
        poDate: r.date || entryDate,
        date: r.date || entryDate,
        machineType: (r.machineName || machineName || targetProject) as any,
        machineName: r.machineName || machineName || targetProject,
        poNo: r.poNo || poNo,
        vendorName: r.vendorName || vendorName,
        vendor: r.vendorName || vendorName,
        description: r.description,
        materialType: r.materialType,
        materialGrade: 'SS 304',
        sizeSpecs: r.sizeSpecs,
        quantity: Number(r.quantity) || 1,
        unit: r.unit || 'Nos',
        orderedBy: activeOrderedBy,
        orderSource: 'Customer PO',
        productionStatus: 'In Production',
        stockStatus: 'Available',
        qcStatus: 'Passed',
        dispatchStatus: 'Ready',
        materialCost: 500,
        laborCost: 150,
        machineCost: 100,
        outsourcingCost: 0,
        notes: `RSB Machine Workflow | Ordered by ${activeOrderedBy}`,
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

      // Replace and update requirements in state and database
      replaceProjectRequirements(targetProject, itemsToSave);

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

      localStorage.removeItem(DRAFT_STORAGE_KEY);

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
      });

      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setLastAutoSavedTime(timeStr);
      setSaveToast(`🎉 Successfully saved Order for "${targetProject}" (${rows.length} materials) • ☁️ Synced to DB & Cloud at ${timeStr}`);
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

  // Import from Excel (Supports 10-column & 11-column standard RSB Excel sheets)
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsedData = await parseExcelFile(file);
      if (!parsedData || parsedData.length === 0) {
        alert('Invalid or empty Excel file.');
        return;
      }

      const importedRows: EntryRow[] = parsedData.map((it: any, idx: number) => ({
        id: `imp-${Date.now()}-${idx}`,
        projectName: it['Project Name'] || it['Project'] || selectedProjectName || machineName || 'Project-1',
        machineName: it['Machine Name'] || it['Machine'] || machineName || selectedProjectName || 'Custom Assembly',
        date: it['Date'] || entryDate || new Date().toISOString().split('T')[0],
        poNo: it['PO No'] || it['PO'] || it['poNumber'] || poNo || '36',
        srNo: idx + 1,
        materialType: (it['Material Type'] || it['materialType'] || 'SS Flat') as MaterialType,
        sizeSpecs: it['Size Specification'] || it['Size Specs'] || it['sizeSpecs'] || 'Custom Spec',
        quantity: Number(it['Quantity'] || it['Qty'] || it['quantity']) || 1,
        unit: it['Unit'] || it['unit'] || 'Nos',
        vendorName: it['Vendor Name'] || it['Vendor'] || it['vendor'] || vendorName || 'Manav Metal',
        description: it['Description'] || it['Part Description'] || it['description'] || 'Component',
        orderedBy: activeOrderedBy,
      }));

      setRows(importedRows);
      setIsImportModalOpen(false);
      confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      setSaveToast(`Imported ${importedRows.length} items from Excel into ${machineName}!`);
      setTimeout(() => setSaveToast(null), 3500);
    } catch (err) {
      console.error(err);
      alert('Failed to parse Excel file.');
    }
  };

  // Filtered rows for table
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchSearch =
        searchTerm === '' ||
        r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.sizeSpecs.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.machineName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.poNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.orderedBy.toLowerCase().includes(searchTerm.toLowerCase());

      const matchMat = filterMaterialType === 'ALL' || r.materialType === filterMaterialType;
      return matchSearch && matchMat;
    });
  }, [rows, searchTerm, filterMaterialType]);

  const handleSwitchView = (mode: 'entry' | 'projects' | 'procurement') => {
    setActiveViewMode(mode);
    setActiveTab(mode);
  };

  // View Mode Switcher: Procurement Basket
  if (activeViewMode === 'procurement') {
    return (
      <div className="space-y-4">
        <ProcurementBasket
          initialProjectFilter={basketProjectFilter}
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
                    if (found) handleUsePreviousOrder(found);
                    handleSwitchView('entry');
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
                  if (found) handleUsePreviousOrder(found);
                  handleSwitchView('entry');
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
            if (found) handleUsePreviousOrder(found);
            handleSwitchView('entry');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black shadow-sm">
            <Cpu className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-black text-slate-900 tracking-tight">
                RSB Machine Material Entry Workstation
              </h1>
              <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 text-xs font-black">
                📁 {selectedProjectName}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold font-mono">
                ⚙️ {machineName}
              </span>
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

          <button
            type="button"
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
                  Auto-configures 3-step order workflow & synchronizes material list
                </span>
              </div>
            </div>

            <button
              type="button"
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
              value={selectedProjectName}
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
                  📁 {p.name} (PO: {p.poNo || p.poNumber || 'N/A'}) — {p.machineName || p.machineType || 'Machine'}
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
              <div className="grid grid-cols-2 gap-2">
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
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-xs font-black text-indigo-300 placeholder-slate-500 focus:outline-none focus:border-emerald-400 font-mono"
                />
                <input
                  ref={entryDateInputRef}
                  type="text"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      quickDescInputRef.current?.focus();
                    }
                  }}
                  placeholder="2026-09-13"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-2 text-[11px] font-medium text-slate-300 focus:outline-none focus:border-emerald-400 font-mono"
                />
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
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 space-y-3 pt-3.5">
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

          <form onSubmit={handleAddMaterialRow} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-end">
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
            <div className="lg:col-span-3 space-y-1">
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
                  className="w-1/2 bg-transparent px-2 py-1.5 text-xs font-mono font-black text-white text-center focus:outline-none"
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
            {MATERIAL_TYPES.map((m) => (
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
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-black uppercase tracking-wider">
              Material Specification Matrix ({filteredRows.length} Items)
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            Auto-saved {lastAutoSavedTime}
          </span>
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
                <th className="p-2.5 min-w-[90px] whitespace-nowrap">PO No</th>
                {/* 5. Sr No */}
                <th className="p-2.5 w-12 text-center whitespace-nowrap">Sr No</th>
                {/* 6. Material Type */}
                <th className="p-2.5 min-w-[130px] whitespace-nowrap">Material Type</th>
                {/* 7. Size Specification */}
                <th className="p-2.5 min-w-[160px] whitespace-nowrap">Size Specification</th>
                {/* 8. Qty */}
                <th className="p-2.5 min-w-[90px] text-center whitespace-nowrap">Qty</th>
                {/* 9. Description */}
                <th className="p-2.5 min-w-[200px] whitespace-nowrap">Description</th>
                {/* 10. Ordered By (NON-EDITABLE) */}
                <th className="p-2.5 min-w-[120px] whitespace-nowrap">Ordered By</th>
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
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.poNo}
                          onChange={(e) => handleCellChange(row.id, 'poNo', e.target.value)}
                          className="w-full bg-transparent px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-slate-900 focus:bg-white text-xs font-mono font-bold text-indigo-700 transition-colors"
                        />
                      </td>

                      {/* 4. Sr No */}
                      <td className="p-2 text-center font-mono font-bold text-slate-400">
                        {row.srNo}
                      </td>

                      {/* 5. Material Type */}
                      <td className="p-2">
                        <select
                          value={row.materialType}
                          onChange={(e) => handleCellChange(row.id, 'materialType', e.target.value)}
                          className="w-full bg-transparent px-1.5 py-1 rounded border border-transparent hover:border-slate-300 focus:border-slate-900 focus:bg-white text-xs font-bold text-slate-800 transition-colors"
                        >
                          {MATERIAL_TYPES.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* 6. Size Specification */}
                      <td className="p-2">
                        <input
                          type="text"
                          list="size-suggestions"
                          value={row.sizeSpecs}
                          onChange={(e) => handleCellChange(row.id, 'sizeSpecs', e.target.value)}
                          className="w-full bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-slate-900 focus:bg-white text-xs font-mono font-bold text-blue-700 transition-colors"
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
                            className="w-14 text-center bg-slate-100 hover:bg-white focus:bg-white px-1.5 py-1 rounded border border-slate-200 text-xs font-mono font-black text-slate-900 shadow-2xs"
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
                      <td className="p-2">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-black" title="Auto-filled from logged-in user (Read-only)">
                          <Lock className="w-3 h-3 text-emerald-600" />
                          <span>{row.orderedBy || activeOrderedBy}</span>
                        </div>
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
                            className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
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

        {/* Footer Summary */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2">
          <div>
            Showing <strong className="text-slate-900">{filteredRows.length}</strong> items • Total Quantity:{' '}
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
                setRows((prev) => normalizeSrNumbers([...prev, emptyRow]));
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
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Project Name *
            </label>
            <input
              type="text"
              required
              value={newProjectForm.name}
              onChange={(e) => setNewProjectForm({ ...newProjectForm, name: e.target.value })}
              placeholder="e.g. Mahalaxmi 2, FOHA, Rotary Line 1"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-bold focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
              autoFocus
            />
          </div>

          {/* Machine / Assembly Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Machine / Assembly Name (Optional)
            </label>
            <input
              type="text"
              list="entry-learned-machines"
              value={newProjectForm.machineName}
              onChange={(e) => setNewProjectForm({ ...newProjectForm, machineName: e.target.value })}
              placeholder="e.g. Liquid Filling Line, Conveyor Cell, Washing System"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-semibold focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
            />
            <datalist id="entry-learned-machines">
              {allMachineOptions.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>

          {/* 2. Client Name & 3. Client Number (Self-Learning Combobox) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
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
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-semibold focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm"
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
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Client Number *
              </label>
              <input
                type="text"
                required
                value={newProjectForm.clientNumber}
                onChange={(e) => setNewProjectForm({ ...newProjectForm, clientNumber: e.target.value })}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-semibold focus:bg-white focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none transition-all text-sm font-mono"
              />
            </div>
          </div>

          {/* 3. Start Date & 4. Target Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={newProjectForm.startDate}
                onChange={(e) => setNewProjectForm({ ...newProjectForm, startDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-bold focus:bg-white focus:border-blue-600 outline-none font-mono text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Target Date *
              </label>
              <input
                type="date"
                required
                value={newProjectForm.targetDate}
                onChange={(e) => setNewProjectForm({ ...newProjectForm, targetDate: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 font-bold focus:bg-white focus:border-blue-600 outline-none font-mono text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsAddProjectModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer transition-all active:scale-95"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-md shadow-blue-500/20 cursor-pointer active:scale-95 transition-all"
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
          title={`⚡ Standard Factory BOM: ${selectedBOMTemplateKey}`}
          subtitle="1-Click load all precision engineered standard parts into the active table"
          maxWidth="4xl"
        >
          {(() => {
            const tmpl = MACHINE_BOM_TEMPLATES[selectedBOMTemplateKey];
            if (!tmpl) {
              return (
                <div className="p-6 text-center text-slate-400">
                  <p>No standard BOM template found for "{selectedBOMTemplateKey}".</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {Object.keys(MACHINE_BOM_TEMPLATES).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setSelectedBOMTemplateKey(key);
                          const t = MACHINE_BOM_TEMPLATES[key];
                          if (t) setSelectedBOMPartIndices(t.parts.map((_, i) => i));
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-bold hover:bg-slate-700"
                      >
                        {key}
                      </button>
                    ))}
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
    </div>
  );
};
