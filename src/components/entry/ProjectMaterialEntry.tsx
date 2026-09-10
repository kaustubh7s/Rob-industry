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
  RefreshCw,
  Building2,
  Cpu,
  FileSpreadsheet,
  Save,
  Check,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clipboard,
  Info,
  SlidersHorizontal,
  Package,
  Wrench,
  Boxes,
  ArrowUpDown,
  ExternalLink,
  FolderKanban,
  Zap,
  ArrowRight,
  Calendar,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useERP } from '../../context/ERPContext';
import { MaterialType, MachineCategory, ProjectItem, ProjectMaterialRequirementItem } from '../../types/erp';
import { exportToExcel, parseExcelFile } from '../../utils/excelIntegration';
import { Modal } from '../common/Modal';
import { ProjectsDirectory } from '../projects/ProjectsDirectory';
import { ProjectDetailsView } from '../projects/ProjectDetailsView';
import { getMaterialsForProject } from '../../utils/projectMaterialsHelper';

export interface EntryRow {
  id: string;
  srNo: number;
  description: string;
  materialType: MaterialType;
  sizeSpecs: string;
  quantity: number;
  unit: string;
  vendor: string;
  machineType: MachineCategory;
  projectName: string;
  orderSource: string;
  poNumber: string;
  date: string;
  isEditing?: boolean;
}

const MACHINE_TYPES: MachineCategory[] = [
  '10 HD',
  '12 HD',
  '16 HD',
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

const ORDER_SOURCES = [
  'Customer PO',
  'Internal Fabrication',
  'BOM Release',
  'Spare Requirement',
  'Drawing Spec',
  'Annual Contract',
  'Direct Inquiry',
  'Urgent Maintenance',
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

const RSB_SAMPLE_COMPONENTS = [
  { description: 'Mono Conveyor Inlet Patti', materialType: 'SS Flat', sizeSpecs: '80 x 6 x 485', qty: 2, unit: 'Nos' },
  { description: 'Sealing Clamp', materialType: 'SS Flat', sizeSpecs: '60 x 16 x 110', qty: 2, unit: 'Nos' },
  { description: 'Clamp Ghode', materialType: 'SS Flat', sizeSpecs: '60 x 16 x 135', qty: 2, unit: 'Nos' },
  { description: 'Washing Clamp', materialType: 'SS Flat', sizeSpecs: '50 x 16 x 83', qty: 3, unit: 'Nos' },
  { description: 'Distributor Support Patti', materialType: 'SS Flat', sizeSpecs: '50 x 12 x 320', qty: 2, unit: 'Nos' },
  { description: 'Pipe Line Clamp', materialType: 'SS Pipe', sizeSpecs: 'OD 60 x ID 45 x 120', qty: 4, unit: 'Nos' },
  { description: 'Bridge', materialType: 'SS Flat', sizeSpecs: '100 x 12 x 650', qty: 1, unit: 'Nos' },
  { description: 'Bridge Support Patti', materialType: 'SS Flat', sizeSpecs: '65 x 10 x 420', qty: 2, unit: 'Nos' },
  { description: 'Conveyor Support Patti', materialType: 'SS Angle', sizeSpecs: '50 x 50 x 6 x 500', qty: 4, unit: 'Nos' },
  { description: 'Outlet Bridge', materialType: 'SS Flat', sizeSpecs: '90 x 12 x 580', qty: 1, unit: 'Nos' },
  { description: 'Washing Cam', materialType: 'SS Circle', sizeSpecs: 'OD 180 x 25 MM', qty: 2, unit: 'Nos' },
  { description: 'Outlet Roll', materialType: 'SS Bar', sizeSpecs: 'Ø 45 x 620 mm', qty: 2, unit: 'Nos' },
  { description: 'Cap Transfer', materialType: 'SS Sheet', sizeSpecs: '300 x 300 x 3 mm', qty: 1, unit: 'Nos' },
  { description: 'Washing Distributor', materialType: 'SS Pipe', sizeSpecs: 'OD 106 x ID 75 x 110', qty: 1, unit: 'Nos' },
];

const PRESET_PROJECTS = [
  'FOHA',
  'Project 1',
  'Project 2',
  'CIP-SKID-04 (Torrent Skid)',
  'SUN-LIQUID-02 (Sun Pharma Liquid Line)',
  'INT-FAB-101 (Internal Machine Frame)',
  'Sanitary Header Pipeline Skid',
  '6-Station Rotary Bottle Distributor',
  'Auto Cap Transfer Elevating Feeder',
  '30 HD High Precision Capping Unit',
];

const DRAFT_STORAGE_KEY = 'RSB_KAUSTUBH_PROJECT_MATERIAL_ENTRY_DRAFT_V2';

export const ProjectMaterialEntry: React.FC = () => {
  const {
    projects,
    projectRequirements,
    bulkImportProjectRequirements,
  } = useERP();

  // Mode View State: 'entry' | 'projects' | 'details'
  const [activeViewMode, setActiveViewMode] = useState<'entry' | 'projects' | 'details'>('entry');
  const [selectedDetailProject, setSelectedDetailProject] = useState<ProjectItem | null>(null);

  // Top Section - Project Details
  const [projectName, setProjectName] = useState('FOHA');
  const [customProject, setCustomProject] = useState('');
  const [machineType, setMachineType] = useState<MachineCategory>('16 HD');
  const [vendor, setVendor] = useState('Manav Metal');
  const [orderSource, setOrderSource] = useState('Customer PO');
  const [poNumber, setPoNumber] = useState('PO-2026-36');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Quick Material Entry Smart Form
  const [quickMaterialType, setQuickMaterialType] = useState<MaterialType>('SS Flat');
  const [quickDescription, setQuickDescription] = useState('Mono Conveyor Inlet Patti');
  const [quickSizeSpecs, setQuickSizeSpecs] = useState('80 x 6 x 485');
  const [quickQuantity, setQuickQuantity] = useState<number>(2);
  const [quickUnit, setQuickUnit] = useState('Nos');

  // Table Rows & Selection State
  const [rows, setRows] = useState<EntryRow[]>(() => {
    const saved = localStorage.getItem(DRAFT_STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse draft:', e);
      }
    }
    // Default seed with authentic RSB equipment parts
    return RSB_SAMPLE_COMPONENTS.map((item, idx) => ({
      id: `row-${idx + 1}-${Date.now()}`,
      srNo: idx + 1,
      description: item.description,
      materialType: item.materialType as MaterialType,
      sizeSpecs: item.sizeSpecs,
      quantity: item.qty,
      unit: item.unit,
      vendor: 'Manav Metal',
      machineType: (idx % 2 === 0 ? '16 HD' : '20 HD') as MachineCategory,
      projectName: 'FOHA',
      orderSource: 'Customer PO',
      poNumber: 'PO-2026-36',
      date: new Date().toISOString().split('T')[0],
    }));
  });

  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMachine, setFilterMachine] = useState('ALL');
  const [filterMaterialType, setFilterMaterialType] = useState('ALL');
  const [filterVendor, setFilterVendor] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'ALL'>(25);

  // Status & Feedback
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<string>('Just now');
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteContent, setPasteContent] = useState('');

  const quickDescInputRef = useRef<HTMLInputElement>(null);

  // Auto-save to localStorage
  useEffect(() => {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(rows));
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLastAutoSavedTime(timeStr);
  }, [rows]);

  // Active Project Name resolver
  const activeProjectName = projectName === 'OTHER' ? customProject || 'Custom Project' : projectName;

  // Listen for Header Quick Navigation events
  useEffect(() => {
    const handleNavEvent = (e: any) => {
      if (e.detail === 'projects') {
        setActiveViewMode('projects');
      } else if (e.detail === 'entry') {
        setActiveViewMode('entry');
      } else if (e.detail === 'details') {
        setActiveViewMode('details');
      }
    };
    window.addEventListener('RSB_NAVIGATE_VIEW', handleNavEvent);
    return () => window.removeEventListener('RSB_NAVIGATE_VIEW', handleNavEvent);
  }, []);

  // Global Keyboard Shortcuts (Alt+P for Projects, Alt+E for Entry, Alt+D for Details)
  useEffect(() => {
    const handleGlobalShortcuts = (e: KeyboardEvent) => {
      if (e.altKey && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        setActiveViewMode('projects');
      } else if (e.altKey && (e.key === 'e' || e.key === 'E')) {
        e.preventDefault();
        setActiveViewMode('entry');
      } else if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        handleOpenProjectDetailsByName(activeProjectName);
      }
    };
    window.addEventListener('keydown', handleGlobalShortcuts);
    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [activeProjectName]);

  // Recalculate Sr Numbers sequentially
  const normalizeSrNumbers = (data: EntryRow[]): EntryRow[] => {
    return data.map((row, idx) => ({ ...row, srNo: idx + 1 }));
  };

  // Recent Projects List (Last 10 Projects with dynamic material stats)
  const recentProjects = useMemo(() => {
    return projects.slice(0, 10).map((p) => {
      const mats = getMaterialsForProject(p, projectRequirements);
      return {
        ...p,
        materialsCount: mats.length,
        totalQuantity: mats.reduce((acc, m) => acc + (Number(m.quantity) || 0), 0),
      };
    });
  }, [projects, projectRequirements]);

  // Instant Load Project Materials into Entry Workstation
  const handleLoadProjectIntoSheet = (targetProjectName: string) => {
    const matchedProj = projects.find(
      (p) => p.name.toLowerCase() === targetProjectName.toLowerCase() || targetProjectName.toLowerCase().includes(p.name.toLowerCase())
    ) || {
      id: `prj-${Date.now()}`,
      name: targetProjectName,
      projectNumber: 'PRJ-2026-FOHA',
      customer: 'Cadila Healthcare Ltd (Zydus)',
      orderSource: orderSource,
      machineType: machineType,
      startDate: date,
      targetCompletionDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      priority: 'high',
      status: 'Production',
      projectValue: 1850000,
      poNumber: poNumber,
      vendor: vendor,
      progressPct: 65,
    } as ProjectItem;

    const targetName = matchedProj.name;
    setProjectName(targetName);

    if (matchedProj.machineType) setMachineType(matchedProj.machineType);
    if (matchedProj.vendor) setVendor(matchedProj.vendor);
    if (matchedProj.poNumber) setPoNumber(matchedProj.poNumber);
    if (matchedProj.orderSource) setOrderSource(matchedProj.orderSource);

    // Retrieve all materials for this project
    const projMaterials = getMaterialsForProject(matchedProj, projectRequirements);

    if (projMaterials.length > 0) {
      const loadedRows: EntryRow[] = projMaterials.map((r, idx) => ({
        id: `row-req-${r.id}-${Date.now()}-${idx}`,
        srNo: idx + 1,
        description: r.description,
        materialType: r.materialType,
        sizeSpecs: r.sizeSpecs,
        quantity: r.quantity,
        unit: r.unit,
        vendor: r.vendor || matchedProj.vendor || vendor,
        machineType: r.machineType || matchedProj.machineType || machineType,
        projectName: targetName,
        orderSource: r.orderSource || matchedProj.orderSource || orderSource,
        poNumber: r.poNumber || matchedProj.poNumber || poNumber,
        date: r.poDate || date,
      }));
      setRows(normalizeSrNumbers(loadedRows));
    }

    setSaveToast(`⚡ Loaded Project "${targetName}" with ${projMaterials.length} materials!`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Quick Open Project Details
  const handleOpenProjectDetailsByName = (pName: string) => {
    const matchedProj = projects.find(
      (p) => p.name.toLowerCase() === pName.toLowerCase() || pName.toLowerCase().includes(p.name.toLowerCase())
    );

    if (matchedProj) {
      setSelectedDetailProject(matchedProj);
    } else {
      setSelectedDetailProject({
        id: `prj-${Date.now()}`,
        name: pName,
        projectNumber: 'PRJ-2026-FOHA',
        customer: 'Cadila Healthcare Ltd (Zydus)',
        orderSource: orderSource,
        machineType: machineType,
        startDate: date,
        targetCompletionDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        priority: 'high',
        status: 'Production',
        projectValue: 1850000,
        poNumber: poNumber,
        vendor: vendor,
        progressPct: 65,
      });
    }
    setActiveViewMode('details');
  };

  // Handle Quick Add Material
  const handleAddQuickMaterial = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickSizeSpecs.trim()) return;

    const newRow: EntryRow = {
      id: `row-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      srNo: rows.length + 1,
      description: quickDescription.trim() || 'Custom Component',
      materialType: quickMaterialType,
      sizeSpecs: quickSizeSpecs.trim(),
      quantity: Number(quickQuantity) || 1,
      unit: quickUnit,
      vendor: vendor,
      machineType: machineType,
      projectName: activeProjectName,
      orderSource: orderSource,
      poNumber: poNumber,
      date: date,
    };

    setRows((prev) => normalizeSrNumbers([...prev, newRow]));
    setSaveToast(`Added "${newRow.description}" (${newRow.sizeSpecs}) to list`);
    setTimeout(() => setSaveToast(null), 3000);

    // Keep description & size focused
    if (quickDescInputRef.current) {
      quickDescInputRef.current.focus();
    }
  };

  // Add empty row directly into table
  const handleAddEmptyRow = () => {
    const newRow: EntryRow = {
      id: `row-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      srNo: rows.length + 1,
      description: '',
      materialType: 'SS Flat',
      sizeSpecs: '',
      quantity: 1,
      unit: 'Nos',
      vendor: vendor,
      machineType: machineType,
      projectName: activeProjectName,
      orderSource: orderSource,
      poNumber: poNumber,
      date: date,
      isEditing: true,
    };
    setRows((prev) => normalizeSrNumbers([...prev, newRow]));
  };

  // Inline Cell Edit Handler
  const handleCellChange = (id: string, field: keyof EntryRow, value: any) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return { ...r, [field]: value };
        }
        return r;
      })
    );
  };

  // Duplicate Row Handler
  const handleDuplicateRow = (id: string) => {
    const target = rows.find((r) => r.id === id);
    if (!target) return;
    const duplicated: EntryRow = {
      ...target,
      id: `row-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      description: `${target.description} (Copy)`,
    };
    const index = rows.findIndex((r) => r.id === id);
    const updated = [...rows];
    updated.splice(index + 1, 0, duplicated);
    setRows(normalizeSrNumbers(updated));
    setSaveToast(`Duplicated row #${target.srNo}`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Copy previous row
  const handleCopyPreviousRow = () => {
    if (rows.length === 0) return;
    const last = rows[rows.length - 1];
    const copied: EntryRow = {
      ...last,
      id: `row-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      srNo: rows.length + 1,
    };
    setRows(normalizeSrNumbers([...rows, copied]));
    setSaveToast(`Replicated last row (#${last.srNo})`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Delete Row Handler
  const handleDeleteRow = (id: string) => {
    setRows((prev) => normalizeSrNumbers(prev.filter((r) => r.id !== id)));
    setSelectedRowIds((prev) => prev.filter((item) => item !== id));
  };

  // Bulk Delete
  const handleBulkDelete = () => {
    if (selectedRowIds.length === 0) return;
    setRows((prev) => normalizeSrNumbers(prev.filter((r) => !selectedRowIds.includes(r.id))));
    setSelectedRowIds([]);
    setSaveToast(`Deleted ${selectedRowIds.length} selected row(s)`);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Bulk Duplicate
  const handleBulkDuplicate = () => {
    if (selectedRowIds.length === 0) return;
    const toDuplicate = rows.filter((r) => selectedRowIds.includes(r.id));
    const newCopies = toDuplicate.map((target) => ({
      ...target,
      id: `row-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      description: `${target.description} (Copy)`,
    }));
    setRows((prev) => normalizeSrNumbers([...prev, ...newCopies]));
    setSaveToast(`Duplicated ${selectedRowIds.length} items`);
    setSelectedRowIds([]);
    setTimeout(() => setSaveToast(null), 2500);
  };

  // Load RSB 14 Equipment Part Sheet preset
  const handleLoadRSBPreset = () => {
    const presetRows: EntryRow[] = RSB_SAMPLE_COMPONENTS.map((item, idx) => ({
      id: `row-preset-${idx + 1}-${Date.now()}`,
      srNo: idx + 1,
      description: item.description,
      materialType: item.materialType as MaterialType,
      sizeSpecs: item.sizeSpecs,
      quantity: item.qty,
      unit: item.unit,
      vendor: vendor || 'Manav Metal',
      machineType: machineType || '16 HD',
      projectName: activeProjectName,
      orderSource: orderSource || 'Customer PO',
      poNumber: poNumber || 'PO-2026-36',
      date: date || new Date().toISOString().split('T')[0],
    }));

    setRows(normalizeSrNumbers(presetRows));
    setSaveToast('Loaded 14 RSB Equipments Manufacturing Standard Parts');
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Clear / Reset Sheet
  const handleClearSheet = () => {
    if (window.confirm('Clear all entered material rows? This cannot be undone.')) {
      setRows([]);
      setSelectedRowIds([]);
    }
  };

  // Save Project to ERP Core
  const handleSaveProject = () => {
    if (rows.length === 0) {
      alert('Please add at least one material requirement row before saving.');
      return;
    }

    // Convert rows to ERP Project Material Requirement items
    const erpItems = rows.map((r) => ({
      description: r.description || 'Manufacturing Component',
      materialType: r.materialType,
      sizeSpecs: r.sizeSpecs,
      quantity: Number(r.quantity) || 1,
      unit: r.unit || 'Nos',
      projectName: r.projectName || activeProjectName,
      customerName: 'Cadila Healthcare Ltd (Zydus)',
      poNumber: r.poNumber || poNumber,
      poDate: r.date || date,
      machineType: r.machineType || machineType,
      orderSource: r.orderSource || orderSource,
      deliveryDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      vendor: r.vendor || vendor,
      bomRef: `BOM-${r.machineType.replace(/\s+/g, '')}`,
      lastPurchaseRate: 450,
      materialCost: Number(r.quantity) * 450,
      laborCost: Math.round(Number(r.quantity) * 180),
      machineCost: Math.round(Number(r.quantity) * 120),
      totalCost: Number(r.quantity) * 750,
    }));

    bulkImportProjectRequirements(erpItems);

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    setSaveToast(`🎉 Successfully saved Project "${activeProjectName}" with ${rows.length} materials!`);
    setTimeout(() => setSaveToast(null), 4000);
  };

  // Export to Excel
  const handleExportExcel = () => {
    if (rows.length === 0) {
      alert('No rows to export.');
      return;
    }

    const exportData = rows.map((r) => ({
      'Sr No': r.srNo,
      'Project Name': r.projectName,
      'Machine Type': r.machineType,
      'PO Number': r.poNumber,
      'Date': r.date,
      'Vendor': r.vendor,
      'Order Source': r.orderSource,
      'Description': r.description,
      'Material Type': r.materialType,
      'Size Specification': r.sizeSpecs,
      'Quantity': r.quantity,
      'Unit': r.unit,
    }));

    const cleanProjectName = activeProjectName.replace(/[^a-zA-Z0-9_-]/g, '_');
    exportToExcel(exportData, `RSB_Material_Requirement_${cleanProjectName}_${date}`);
  };

  // Import from Excel File
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsedData = await parseExcelFile(file);
      if (!parsedData || parsedData.length === 0) {
        alert('No data found in uploaded Excel file.');
        return;
      }

      const importedRows: EntryRow[] = parsedData.map((it: any, idx: number) => ({
        id: `row-imported-${Date.now()}-${idx}`,
        srNo: rows.length + idx + 1,
        description: it['Description'] || it['Part Description'] || it['description'] || 'SS Component',
        materialType: (it['Material Type'] || it['materialType'] || 'SS Flat') as MaterialType,
        sizeSpecs: it['Size Specification'] || it['Size Specs'] || it['sizeSpecs'] || '80 x 6 x 485',
        quantity: Number(it['Quantity'] || it['Qty'] || it['quantity'] || 1),
        unit: it['Unit'] || it['unit'] || 'Nos',
        vendor: it['Vendor'] || it['vendor'] || vendor,
        machineType: (it['Machine Type'] || it['machineType'] || machineType) as MachineCategory,
        projectName: it['Project Name'] || it['Project'] || it['projectName'] || activeProjectName,
        orderSource: it['Order Source'] || it['orderSource'] || orderSource,
        poNumber: it['PO Number'] || it['PO No'] || it['poNumber'] || poNumber,
        date: it['Date'] || it['date'] || date,
      }));

      setRows((prev) => normalizeSrNumbers([...prev, ...importedRows]));
      setIsImportModalOpen(false);
      setSaveToast(`Successfully imported ${importedRows.length} rows from Excel!`);
      setTimeout(() => setSaveToast(null), 3000);
    } catch (err) {
      console.error(err);
      alert('Failed to parse Excel file. Please ensure columns match standard format.');
    }
  };

  // Direct Clipboard Paste Parser (Ctrl+V from Excel)
  const handleParseClipboard = () => {
    if (!pasteContent.trim()) return;

    const lines = pasteContent.trim().split(/\r?\n/);
    const parsed: EntryRow[] = [];

    lines.forEach((line, idx) => {
      // Split by Tab (Excel copy) or Comma (CSV copy)
      const cols = line.split('\t').length > 1 ? line.split('\t') : line.split(',');
      if (cols.length >= 2) {
        const desc = cols[0]?.trim() || `Part ${idx + 1}`;
        const matType = (cols[1]?.trim() || 'SS Flat') as MaterialType;
        const size = cols[2]?.trim() || '80 x 6 x 485';
        const qty = parseFloat(cols[3]?.trim() || '1') || 1;
        const unit = cols[4]?.trim() || 'Nos';

        parsed.push({
          id: `paste-${Date.now()}-${idx}`,
          srNo: rows.length + idx + 1,
          description: desc,
          materialType: matType,
          sizeSpecs: size,
          quantity: qty,
          unit: unit,
          vendor: vendor,
          machineType: machineType,
          projectName: activeProjectName,
          orderSource: orderSource,
          poNumber: poNumber,
          date: date,
        });
      }
    });

    if (parsed.length > 0) {
      setRows((prev) => normalizeSrNumbers([...prev, ...parsed]));
      setPasteContent('');
      setIsPasteModalOpen(false);
      setSaveToast(`Pasted and created ${parsed.length} rows from clipboard`);
      setTimeout(() => setSaveToast(null), 3000);
    } else {
      alert('Could not parse rows. Please paste columns in format: Description, Material Type, Size Spec, Quantity, Unit');
    }
  };

  // Keyboard shortcut listener for global paste / quick actions
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveProject();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rows, activeProjectName, vendor, machineType, orderSource, poNumber, date]);

  // Statistics for Client Demo Mode
  const stats = useMemo(() => {
    const totalMaterials = rows.length;
    const totalQty = rows.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0);
    const uniqueProjects = new Set(rows.map((r) => r.projectName)).size;
    const uniqueVendors = new Set(rows.map((r) => r.vendor)).size;

    return {
      totalMaterials,
      totalQty,
      uniqueProjects,
      uniqueVendors,
    };
  }, [rows]);

  // Filter & Search Logic for Table
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchSearch =
        searchTerm === '' ||
        r.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.sizeSpecs.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.materialType.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.machineType.toLowerCase().includes(searchTerm.toLowerCase());

      const matchMachine = filterMachine === 'ALL' || r.machineType === filterMachine;
      const matchMaterial = filterMaterialType === 'ALL' || r.materialType === filterMaterialType;
      const matchVendor = filterVendor === 'ALL' || r.vendor === filterVendor;

      return matchSearch && matchMachine && matchMaterial && matchVendor;
    });
  }, [rows, searchTerm, filterMachine, filterMaterialType, filterVendor]);

  // Pagination Logic
  const paginatedRows = useMemo(() => {
    if (pageSize === 'ALL') return filteredRows;
    const start = (currentPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, currentPage, pageSize]);

  const totalPages = pageSize === 'ALL' ? 1 : Math.ceil(filteredRows.length / pageSize) || 1;

  // Toggle selection
  const handleToggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRowIds(paginatedRows.map((r) => r.id));
    } else {
      setSelectedRowIds([]);
    }
  };

  const handleToggleSelectRow = (id: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // =========================================================================
  // VIEW MODE ROUTER: DEDICATED PROJECTS & DETAILS
  // =========================================================================
  if (activeViewMode === 'projects') {
    return (
      <div className="space-y-4">
        {/* Navigation Switcher */}
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveViewMode('entry')}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Material Entry Workstation</span>
          </button>
          <button
            type="button"
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          >
            <FolderKanban className="w-3.5 h-3.5 text-blue-400" />
            <span>Projects Directory & History ({projects.length})</span>
          </button>
        </div>

        <ProjectsDirectory
          onSelectProject={(prj) => {
            setSelectedDetailProject(prj);
            setActiveViewMode('details');
          }}
          onOpenEntrySheetWithProject={(pName) => {
            handleLoadProjectIntoSheet(pName);
            setActiveViewMode('entry');
          }}
        />
      </div>
    );
  }

  if (activeViewMode === 'details' && selectedDetailProject) {
    return (
      <div className="space-y-4">
        {/* Navigation Switcher */}
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveViewMode('entry')}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Material Entry Workstation</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveViewMode('projects')}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <FolderKanban className="w-3.5 h-3.5 text-blue-600" />
            <span>Projects Directory</span>
          </button>
          <button
            type="button"
            className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Project: {selectedDetailProject.name}</span>
          </button>
        </div>

        <ProjectDetailsView
          project={selectedDetailProject}
          onBack={() => setActiveViewMode('projects')}
          onOpenInEntrySheet={(pName) => {
            handleLoadProjectIntoSheet(pName);
            setActiveViewMode('entry');
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5 select-text text-slate-900">
      {/* ========================================================================= */}
      {/* 0. TOP PORTAL NAVIGATION SWITCHER (STICKY & ULTRA-ACCESSIBLE) */}
      {/* ========================================================================= */}
      <div className="sticky top-14 z-20 bg-[#f8fafc]/95 backdrop-blur-md py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-black shadow-md flex items-center gap-2 ring-2 ring-slate-900 ring-offset-1"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>1. Material Entry Sheet</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveViewMode('projects')}
            className="px-4 py-2 rounded-xl bg-white hover:bg-blue-50 border border-slate-300 hover:border-blue-400 text-slate-800 hover:text-blue-700 text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
            title="Press Alt+P to switch to Projects Directory"
          >
            <FolderKanban className="w-4 h-4 text-blue-600" />
            <span>2. Projects Directory & History ({projects.length})</span>
            <span className="hidden md:inline text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Alt+P</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenProjectDetailsByName(activeProjectName)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            title="Press Alt+D to view dedicated project details page"
          >
            <Layers className="w-4 h-4 text-cyan-200" />
            <span>3. View "{activeProjectName}" Details</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. TOP BANNER: ENTERPRISE SPECIFICATION HEADER */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs relative">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-200 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                RSB Private Limited • Plant Operations
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-slate-50 text-slate-800 text-xs font-semibold border border-slate-200">
                Admin: <strong className="text-slate-900">Kaustubh</strong>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-slate-50 text-slate-600 border border-slate-200 text-[11px] font-mono">
                BOM Matrix v2.4
              </span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Project Material Entry
            </h1>
            <p className="text-xs text-slate-500 max-w-2xl font-normal">
              High-speed manufacturing requirement entry matrix. Configured for fast fabrication part lists, automatic machine allocation, and instant Excel synchronization.
            </p>
          </div>

          {/* Action Hub */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {/* Live Auto Save Indicator */}
            <div className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-1.5 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                Saved <strong className="font-mono text-emerald-900">{lastAutoSavedTime}</strong>
              </span>
            </div>

            {/* Quick Preset: 14 RSB Parts */}
            <button
              type="button"
              onClick={handleLoadRSBPreset}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              title="Load standard RSB Equipments 14-part fabrication requirement sheet"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>14 RSB Parts Preset</span>
            </button>

            {/* Excel Import Button */}
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>Import Excel</span>
            </button>

            {/* Excel Export Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Export Excel</span>
            </button>

            {/* Save Project Primary Button */}
            <button
              type="button"
              onClick={handleSaveProject}
              className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-emerald-400" />
              <span>SAVE PROJECT</span>
            </button>
          </div>
        </div>

        {/* Dynamic Save Toast Notification */}
        {saveToast && (
          <div className="mt-3 px-3.5 py-2 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{saveToast}</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* QUICK ACCESS: RECENT PROJECTS (SHOW LAST 10 PROJECTS - MANDATORY SPEC) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Quick Access: Recent Projects (Last 10 Projects)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Click any project to instantly load all its materials
          </span>
        </div>

        <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
          {recentProjects.map((p) => {
            const isSelected = activeProjectName === p.name;
            return (
              <div
                key={p.id}
                className={`flex-shrink-0 p-3 rounded-xl border transition-all cursor-pointer min-w-[200px] max-w-[240px] flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-400 shadow-2xs ring-1 ring-blue-400'
                    : 'bg-slate-50 hover:bg-white hover:border-slate-300 border-slate-200'
                }`}
                onClick={() => handleLoadProjectIntoSheet(p.name)}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="font-mono text-[10px] font-bold text-blue-600 bg-white px-1.5 py-0.5 rounded border border-blue-200">
                      {p.machineType}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      {p.materialsCount || 14} Items
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 truncate" title={p.name}>
                    {p.name}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate" title={p.vendor || 'Manav Metal'}>
                    {p.vendor || 'Manav Metal'}
                  </p>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
                  <span className="text-slate-400">{p.lastUpdatedDate || 'Today'}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenProjectDetailsByName(p.name);
                    }}
                    className="text-blue-600 font-bold hover:underline inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>View</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* CLIENT FRIENDLY FEATURE: "PROJECT SUMMARY" CARD (MANDATORY SPEC) */}
      {/* Total Material Entries, Total Quantity, Vendor, Machine Type, Created Date */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-blue-50 via-slate-50 to-indigo-50 border border-blue-200/80 rounded-xl p-4 shadow-xs">
        <div className="flex items-center justify-between pb-2 mb-3 border-b border-blue-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Project Summary: <strong className="text-blue-700">{activeProjectName}</strong>
            </h3>
          </div>
          <button
            type="button"
            onClick={() => handleOpenProjectDetailsByName(activeProjectName)}
            className="text-[11px] font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 cursor-pointer"
          >
            <span>Open Dedicated Project Page</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {/* Total Material Entries */}
          <div className="bg-white rounded-lg p-3 border border-blue-100 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Material Entries
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-900 font-mono">{stats.totalMaterials}</span>
              <span className="text-[11px] text-slate-500 font-medium">Items</span>
            </div>
          </div>

          {/* Total Quantity */}
          <div className="bg-white rounded-lg p-3 border border-blue-100 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Total Quantity
            </span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-xl font-bold text-slate-900 font-mono">{stats.totalQty}</span>
              <span className="text-[11px] text-slate-500 font-medium">Units</span>
            </div>
          </div>

          {/* Vendor */}
          <div className="bg-white rounded-lg p-3 border border-blue-100 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Vendor
            </span>
            <p className="text-xs font-bold text-amber-700 mt-1 truncate" title={vendor}>
              {vendor}
            </p>
          </div>

          {/* Machine Type */}
          <div className="bg-white rounded-lg p-3 border border-blue-100 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Machine Type
            </span>
            <p className="text-xs font-bold text-purple-700 mt-1 truncate">
              {machineType}
            </p>
          </div>

          {/* Created Date */}
          <div className="bg-white rounded-lg p-3 border border-blue-100 shadow-2xs">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Created Date
            </span>
            <p className="text-xs font-bold text-slate-800 font-mono mt-1">
              {date}
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. STATISTIC SUMMARY CARDS: CRISP WHITE WITH SUBTLE METRIC LABELS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Materials */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Materials</span>
            <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900 font-mono">{stats.totalMaterials}</span>
            <span className="text-xs text-slate-500 font-medium">Items</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span>Active Sheet Matrix</span>
          </div>
        </div>

        {/* Total Quantity */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Total Quantity</span>
            <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900 font-mono">{stats.totalQty}</span>
            <span className="text-xs text-slate-500 font-medium">Units</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Fabrication & Raw Stock</span>
          </div>
        </div>

        {/* Projects */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Project</span>
            <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900 font-mono">{stats.uniqueProjects}</span>
            <span className="text-xs text-slate-500 font-medium">Active</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-600 font-medium truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
            <span className="truncate">{activeProjectName}</span>
          </div>
        </div>

        {/* Vendors */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Vendors</span>
            <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900 font-mono">{stats.uniqueVendors}</span>
            <span className="text-xs text-slate-500 font-medium">Suppliers</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-600 font-medium truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
            <span className="truncate">Primary: {vendor}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TOP SECTION: PROJECT DETAILS (CLEAN ENTERPRISE INPUTS) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-slate-900" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Project Specification & Header Details
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 font-normal">
            Auto-fills into newly created requirement rows
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {/* Project Name */}
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              Project Name
            </label>
            <select
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors shadow-2xs"
            >
              {PRESET_PROJECTS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
              <option value="OTHER">+ Enter Custom Project Name</option>
            </select>
            {projectName === 'OTHER' && (
              <input
                type="text"
                value={customProject}
                onChange={(e) => setCustomProject(e.target.value)}
                placeholder="Type Project Name..."
                className="w-full mt-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 shadow-2xs font-semibold"
              />
            )}
          </div>

          {/* Machine Type */}
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              Machine Type
            </label>
            <select
              value={machineType}
              onChange={(e) => setMachineType(e.target.value as MachineCategory)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors shadow-2xs"
            >
              {MACHINE_TYPES.map((mt) => (
                <option key={mt} value={mt}>
                  {mt}
                </option>
              ))}
            </select>
          </div>

          {/* Vendor Name */}
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              Vendor / Supplier
            </label>
            <select
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors shadow-2xs"
            >
              {COMMON_VENDORS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Order Source */}
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              Order Source
            </label>
            <select
              value={orderSource}
              onChange={(e) => setOrderSource(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors shadow-2xs"
            >
              {ORDER_SOURCES.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
          </div>

          {/* PO Number */}
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              PO Number
            </label>
            <input
              type="text"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              placeholder="e.g. PO-2026-36"
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors shadow-2xs"
            />
          </div>

          {/* Date */}
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-mono font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. QUICK MATERIAL ENTRY SECTION (SMART FAST FORM) */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2.5 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Quick Material Entry Form (फास्ट डेटा एंट्री)
            </h2>
          </div>
          <span className="text-[11px] text-slate-500">
            Target Vendor: <strong className="text-slate-800">{vendor}</strong> • Machine:{' '}
            <strong className="text-slate-800">{machineType}</strong>
          </span>
        </div>

        <form onSubmit={handleAddQuickMaterial} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-end">
            {/* Component / Description */}
            <div className="lg:col-span-4 space-y-1">
              <label className="block text-[11px] font-semibold text-slate-700">
                Description / Component Name
              </label>
              <div className="relative">
                <input
                  ref={quickDescInputRef}
                  type="text"
                  value={quickDescription}
                  onChange={(e) => setQuickDescription(e.target.value)}
                  placeholder="e.g. Mono Conveyor Inlet Patti, Sealing Clamp..."
                  list="rsb-parts-list-pro"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors shadow-2xs"
                />
                <datalist id="rsb-parts-list-pro">
                  {RSB_SAMPLE_COMPONENTS.map((item, idx) => (
                    <option key={idx} value={item.description}>
                      {item.sizeSpecs} - {item.materialType}
                    </option>
                  ))}
                </datalist>
              </div>
            </div>

            {/* Material Type */}
            <div className="lg:col-span-2 space-y-1">
              <label className="block text-[11px] font-semibold text-slate-700">
                Material Type
              </label>
              <select
                value={quickMaterialType}
                onChange={(e) => setQuickMaterialType(e.target.value as MaterialType)}
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors shadow-2xs"
              >
                {MATERIAL_TYPES.map((mt) => (
                  <option key={mt} value={mt}>
                    {mt}
                  </option>
                ))}
              </select>
            </div>

            {/* Size Specification */}
            <div className="lg:col-span-3 space-y-1">
              <label className="block text-[11px] font-semibold text-slate-700">
                Size Specification
              </label>
              <input
                type="text"
                value={quickSizeSpecs}
                onChange={(e) => setQuickSizeSpecs(e.target.value)}
                placeholder="e.g. 80 x 6 x 485 or OD 106 x ID 75 x 110"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-mono font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors shadow-2xs"
              />
            </div>

            {/* Quantity */}
            <div className="lg:col-span-1 space-y-1">
              <label className="block text-[11px] font-semibold text-slate-700 text-center">
                Qty
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                value={quickQuantity}
                onChange={(e) => setQuickQuantity(parseFloat(e.target.value) || 1)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-1.5 py-1.5 text-xs font-mono font-bold text-slate-900 text-center focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors shadow-2xs"
              />
            </div>

            {/* Unit */}
            <div className="lg:col-span-1 space-y-1">
              <label className="block text-[11px] font-semibold text-slate-700 text-center">
                Unit
              </label>
              <select
                value={quickUnit}
                onChange={(e) => setQuickUnit(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-1 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 transition-colors text-center shadow-2xs"
              >
                <option value="Nos">Nos</option>
                <option value="Kg">Kg</option>
                <option value="Mtr">Mtr</option>
                <option value="Sets">Sets</option>
                <option value="Pkt">Pkt</option>
              </select>
            </div>

            {/* Add Material Button */}
            <div className="lg:col-span-1">
              <button
                type="submit"
                className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs active:scale-95 flex items-center justify-center gap-1 shrink-0 h-[34px] cursor-pointer"
                title="Add material to table (Press Enter)"
              >
                <Plus className="w-4 h-4" />
                <span>Add</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* 5. SEARCH, FILTER & BULK ACTIONS TOOLBAR */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="flex flex-1 items-center gap-2.5 w-full">
          {/* Global Search Input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by part description, size spec, material type, vendor, machine..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-50 border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white shadow-2xs"
            />
          </div>

          {/* Filter by Machine */}
          <select
            value={filterMachine}
            onChange={(e) => setFilterMachine(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-slate-900 shadow-2xs"
          >
            <option value="ALL">All Machines</option>
            {MACHINE_TYPES.map((mt) => (
              <option key={mt} value={mt}>
                {mt}
              </option>
            ))}
          </select>

          {/* Filter by Material Type */}
          <select
            value={filterMaterialType}
            onChange={(e) => setFilterMaterialType(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-slate-900 shadow-2xs"
          >
            <option value="ALL">All Materials</option>
            {MATERIAL_TYPES.map((mat) => (
              <option key={mat} value={mat}>
                {mat}
              </option>
            ))}
          </select>

          {/* Filter by Vendor */}
          <select
            value={filterVendor}
            onChange={(e) => setFilterVendor(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-slate-900 shadow-2xs"
          >
            <option value="ALL">All Vendors</option>
            {COMMON_VENDORS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </div>

        {/* Bulk Action Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {selectedRowIds.length > 0 && (
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
              <span className="text-[11px] font-bold text-slate-700 px-2">
                {selectedRowIds.length} selected
              </span>
              <button
                type="button"
                onClick={handleBulkDuplicate}
                className="px-2.5 py-1 rounded bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <Copy className="w-3 h-3 text-slate-600" />
                <span>Duplicate</span>
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="px-2.5 py-1 rounded bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-semibold shadow-2xs flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3 h-3 text-red-600" />
                <span>Delete</span>
              </button>
            </div>
          )}

          {/* Direct Paste from Excel Button */}
          <button
            type="button"
            onClick={() => setIsPasteModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer"
            title="Paste multiple rows directly from Excel table"
          >
            <Clipboard className="w-3.5 h-3.5 text-slate-600" />
            <span>Paste from Excel</span>
          </button>

          {/* Copy Previous Row */}
          <button
            type="button"
            onClick={handleCopyPreviousRow}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer"
            title="Replicate last row"
          >
            <Copy className="w-3.5 h-3.5 text-slate-600" />
            <span>Copy Last Row</span>
          </button>

          {/* Add Empty Row */}
          <button
            type="button"
            onClick={handleAddEmptyRow}
            className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-slate-600" />
            <span>Add Blank Row</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. MAIN HIGH-SPEED REQUIREMENT MATRIX TABLE */}
      {/* ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Material Specification Table ({rows.length} Total Rows)
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              • All cells editable inline
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Page Size Selector */}
            <div className="flex items-center gap-1 text-[11px] text-slate-600 font-medium">
              <span>Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-300 rounded px-1.5 py-0.5 text-xs text-slate-800 font-semibold focus:outline-none"
              >
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="ALL">All</option>
              </select>
            </div>

            <button
              type="button"
              onClick={handleClearSheet}
              className="text-[11px] text-slate-500 hover:text-red-600 font-semibold px-2 py-0.5 rounded hover:bg-red-50 transition-colors cursor-pointer"
            >
              Clear Table
            </button>
          </div>
        </div>

        {rows.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Boxes className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs font-semibold text-slate-600">
              No material requirement rows in current sheet.
            </p>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={handleLoadRSBPreset}
                className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Load 14 RSB Parts Preset
              </button>
              <button
                type="button"
                onClick={handleAddEmptyRow}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-slate-800 text-xs font-semibold cursor-pointer"
              >
                + Add Empty Row
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="p-2.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        paginatedRows.length > 0 &&
                        paginatedRows.every((r) => selectedRowIds.includes(r.id))
                      }
                      onChange={(e) => handleToggleSelectAll(e.target.checked)}
                      className="rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                    />
                  </th>
                  <th className="p-2.5 w-12 text-center whitespace-nowrap">Sr</th>
                  <th className="p-2.5 min-w-[200px] whitespace-nowrap">Description</th>
                  <th className="p-2.5 min-w-[140px] whitespace-nowrap">Material Type</th>
                  <th className="p-2.5 min-w-[180px] whitespace-nowrap">Size Specification</th>
                  <th className="p-2.5 min-w-[100px] w-28 text-center whitespace-nowrap">Qty</th>
                  <th className="p-2.5 min-w-[85px] w-24 text-center whitespace-nowrap">Unit</th>
                  <th className="p-2.5 min-w-[140px] whitespace-nowrap">Vendor</th>
                  <th className="p-2.5 min-w-[130px] whitespace-nowrap">Machine Type</th>
                  <th className="p-2.5 min-w-[140px] whitespace-nowrap">Project</th>
                  <th className="p-2.5 min-w-[120px] whitespace-nowrap">Order Source</th>
                  <th className="p-2.5 w-24 text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium">
                {paginatedRows.map((row) => {
                  const isSelected = selectedRowIds.includes(row.id);
                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-blue-50/50' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-2 text-center whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(row.id)}
                          className="rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
                        />
                      </td>

                      {/* Sr No */}
                      <td className="p-2 text-center font-mono font-bold text-slate-400 whitespace-nowrap">
                        {row.srNo}
                      </td>

                      {/* Description */}
                      <td className="p-2 min-w-[180px]">
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) => handleCellChange(row.id, 'description', e.target.value)}
                          placeholder="e.g. Conveyor Patti"
                          className="w-full bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-slate-900 focus:bg-white text-xs font-semibold text-slate-900 transition-colors"
                        />
                      </td>

                      {/* Material Type */}
                      <td className="p-2 min-w-[130px]">
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

                      {/* Size Specs */}
                      <td className="p-2 min-w-[170px]">
                        <input
                          type="text"
                          value={row.sizeSpecs}
                          onChange={(e) => handleCellChange(row.id, 'sizeSpecs', e.target.value)}
                          placeholder="e.g. 80 x 6 x 485"
                          className="w-full bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-slate-900 focus:bg-white text-xs font-mono font-bold text-blue-700 transition-colors"
                        />
                      </td>

                      {/* Quantity */}
                      <td className="p-2 text-center whitespace-nowrap min-w-[100px]">
                        <div className="flex items-center justify-center">
                          <input
                            type="number"
                            min="0.1"
                            step="any"
                            value={row.quantity}
                            onChange={(e) =>
                              handleCellChange(row.id, 'quantity', parseFloat(e.target.value) || 0)
                            }
                            className="w-24 text-center bg-slate-100 hover:bg-white focus:bg-white px-2 py-1 rounded-md border border-slate-200 hover:border-slate-400 focus:border-slate-900 text-xs font-mono font-black text-slate-900 shadow-2xs transition-colors"
                          />
                        </div>
                      </td>

                      {/* Unit */}
                      <td className="p-2 text-center whitespace-nowrap min-w-[85px]">
                        <div className="flex items-center justify-center">
                          <select
                            value={row.unit}
                            onChange={(e) => handleCellChange(row.id, 'unit', e.target.value)}
                            className="w-20 text-center bg-slate-100 hover:bg-white focus:bg-white px-1.5 py-1 rounded-md border border-slate-200 hover:border-slate-400 focus:border-slate-900 text-xs text-slate-700 font-semibold shadow-2xs transition-colors"
                          >
                            <option value="Nos">Nos</option>
                            <option value="Kg">Kg</option>
                            <option value="Mtr">Mtr</option>
                            <option value="Sets">Sets</option>
                            <option value="Pkt">Pkt</option>
                          </select>
                        </div>
                      </td>

                      {/* Vendor */}
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.vendor}
                          onChange={(e) => handleCellChange(row.id, 'vendor', e.target.value)}
                          className="w-full bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-slate-900 focus:bg-white text-xs font-semibold text-amber-800 transition-colors"
                        />
                      </td>

                      {/* Machine Type */}
                      <td className="p-2">
                        <select
                          value={row.machineType}
                          onChange={(e) => handleCellChange(row.id, 'machineType', e.target.value)}
                          className="w-full bg-transparent px-1 py-1 rounded border border-transparent hover:border-slate-300 focus:border-slate-900 focus:bg-white text-xs font-semibold text-purple-800 transition-colors"
                        >
                          {MACHINE_TYPES.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Project Name */}
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.projectName}
                          onChange={(e) => handleCellChange(row.id, 'projectName', e.target.value)}
                          className="w-full bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-slate-900 focus:bg-white text-xs font-bold text-slate-900 transition-colors"
                        />
                      </td>

                      {/* Order Source */}
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.orderSource}
                          onChange={(e) => handleCellChange(row.id, 'orderSource', e.target.value)}
                          className="w-full bg-transparent px-2 py-1 rounded border border-transparent hover:border-slate-300 focus:border-slate-900 focus:bg-white text-xs text-slate-700 transition-colors"
                        />
                      </td>

                      {/* Actions */}
                      <td className="p-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicateRow(row.id)}
                            className="p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                            title="Duplicate row"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row.id)}
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

        {/* Table Footer with Pagination & Summary */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-3 text-slate-600 font-medium">
            <span>
              Showing <strong>{filteredRows.length}</strong> of <strong>{rows.length}</strong> components
            </span>
            <span>•</span>
            <span>
              Total Sum: <strong>{stats.totalQty} Units</strong>
            </span>
          </div>

          {pageSize !== 'ALL' && totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 font-mono font-bold text-slate-800">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2 py-1 rounded bg-white border border-slate-200 text-slate-700 text-xs font-semibold disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 7. MODAL: EXCEL FILE UPLOAD */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Material Requirement from Excel"
        subtitle="Upload standard RSB BOM sheet or fabrication part specification file (.xlsx, .csv)"
        maxWidth="xl"
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-xl border-2 border-dashed border-slate-300 text-center hover:border-slate-900 transition-colors bg-slate-50">
            <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="font-bold text-slate-800 mb-1">
              Select Excel File (.xlsx, .xls, .csv)
            </p>
            <p className="text-[11px] text-slate-500 mb-3">
              Recognized columns: Description, Material Type, Size Specification, Quantity, Vendor, Machine Type
            </p>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-slate-900 file:text-white hover:file:bg-black cursor-pointer"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* 8. MODAL: PASTE DIRECTLY FROM EXCEL CLIPBOARD */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        title="Paste Directly from Excel Clipboard"
        subtitle="Copy rows from Excel and press Ctrl+V into the box below"
        maxWidth="2xl"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Paste Excel Table Rows (Tab-separated)
            </label>
            <textarea
              rows={8}
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              placeholder={`Example paste format:\nMono Conveyor Inlet Patti\tSS Flat\t80 x 6 x 485\t2\tNos\nSealing Clamp\tSS Flat\t60 x 16 x 110\t2\tNos`}
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 font-mono text-xs text-slate-900 focus:outline-none focus:border-slate-900"
            />
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-[11px] space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-600" />
              Supported Columns Order:
            </p>
            <p>1. Description | 2. Material Type | 3. Size Specification | 4. Quantity | 5. Unit</p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsPasteModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleParseClipboard}
              className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold shadow-xs hover:bg-black cursor-pointer"
            >
              Parse & Add Rows to Sheet
            </button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* 9. FLOATING QUICK SWITCHER (ALWAYS ACCESSIBLE WHEN SCROLLING) */}
      {/* ========================================================================= */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl shadow-xl border border-slate-700">
        <button
          type="button"
          onClick={() => setActiveViewMode('projects')}
          className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          title="Open Projects Directory (Alt+P)"
        >
          <FolderKanban className="w-4 h-4" />
          <span>Projects Directory ({projects.length})</span>
        </button>

        <button
          type="button"
          onClick={() => handleOpenProjectDetailsByName(activeProjectName)}
          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          title="View Dedicated Project Page (Alt+D)"
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>View {activeProjectName}</span>
        </button>
      </div>
    </div>
  );
};
