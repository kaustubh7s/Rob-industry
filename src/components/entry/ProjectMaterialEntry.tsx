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
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useERP } from '../../context/ERPContext';
import { MaterialType, MachineCategory, ProjectMaterialRequirementItem } from '../../types/erp';
import { exportToExcel, parseExcelFile } from '../../utils/excelIntegration';
import { Modal } from '../common/Modal';

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
  'Custom Machine',
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
  'FOHA (Cadila High-Speed Line)',
  'RSB-VIAL-2026 (Zydus Vial Line)',
  'CIP-SKID-04 (Torrent Skid)',
  'SUN-LIQUID-02 (Sun Pharma Liquid Line)',
  'INT-FAB-101 (Internal Machine Frame)',
];

const DRAFT_STORAGE_KEY = 'RSB_KAUSTUBH_PROJECT_MATERIAL_ENTRY_DRAFT_V2';

export const ProjectMaterialEntry: React.FC = () => {
  const {
    bulkImportProjectRequirements,
  } = useERP();

  // Top Section - Project Details
  const [projectName, setProjectName] = useState('FOHA (Cadila High-Speed Line)');
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
      projectName: 'FOHA (Cadila High-Speed Line)',
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

  // Recalculate Sr Numbers sequentially
  const normalizeSrNumbers = (data: EntryRow[]): EntryRow[] => {
    return data.map((row, idx) => ({ ...row, srNo: idx + 1 }));
  };

  // Active Project Name resolver
  const activeProjectName = projectName === 'OTHER' ? customProject || 'Custom Project' : projectName;

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

  // Filter & Search Logic
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

  return (
    <div className="space-y-6 select-text">
      {/* ========================================================================= */}
      {/* 1. TOP BANNER: RSB BRANDING & QUICK ADMIN STATUS */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-blue-950 border border-slate-800/80 rounded-2xl p-5 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="px-2.5 py-0.5 rounded-md bg-blue-600/30 border border-blue-500/40 text-blue-300 text-[11px] font-bold tracking-wider uppercase font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                RSB Private Limited • Plant Operations
              </div>
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[11px] font-medium border border-slate-700">
                Admin: <strong className="text-white">Kaustubh</strong>
              </span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              PROJECT MATERIAL ENTRY
              <span className="text-xs font-normal font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                v2.4 Live
              </span>
            </h1>
            <p className="text-xs text-slate-400 max-w-2xl">
              High-speed manufacturing requirement entry matrix. Configured for fast factory fabrication part lists, automatic machine allocation, and instant Excel synchronization.
            </p>
          </div>

          {/* Action Hub */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Live Auto Save Indicator */}
            <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px]">
                Auto-saved <span className="font-mono text-slate-400">{lastAutoSavedTime}</span>
              </span>
            </div>

            {/* Quick Preset: 14 RSB Parts */}
            <button
              type="button"
              onClick={handleLoadRSBPreset}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 text-slate-200 hover:text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
              title="Load standard RSB Equipments 14-part fabrication requirement sheet"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Load 14 RSB Parts Preset</span>
            </button>

            {/* Excel Import Button */}
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 text-slate-200 hover:text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-400" />
              <span>Import Excel</span>
            </button>

            {/* Excel Export Button */}
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 text-slate-200 hover:text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export Excel</span>
            </button>

            {/* Save Project Primary Button */}
            <button
              type="button"
              onClick={handleSaveProject}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black transition-all shadow-lg shadow-blue-900/30 flex items-center gap-2 active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>SAVE PROJECT</span>
              <kbd className="hidden sm:inline-block px-1 py-0.5 rounded bg-blue-800/80 text-[10px] font-mono text-blue-200 border border-blue-400/30">
                ⌘S
              </kbd>
            </button>
          </div>
        </div>

        {/* Dynamic Save Toast Notification */}
        {saveToast && (
          <div className="mt-3.5 px-3.5 py-2 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-medium flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveToast}</span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 2. CLIENT DEMO MODE - KPI SUMMARY CARDS */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Materials */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-blue-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Materials</span>
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{stats.totalMaterials}</span>
            <span className="text-xs text-slate-400">Line Items</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-blue-400">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            <span>Active Sheet Matrix</span>
          </div>
        </div>

        {/* Total Quantity */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Total Quantity</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">{stats.totalQty}</span>
            <span className="text-xs text-slate-400">Total Units</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Fabrication & Raw Parts</span>
          </div>
        </div>

        {/* Projects */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-purple-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Projects</span>
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-300 font-mono">{stats.uniqueProjects}</span>
            <span className="text-xs text-slate-400">Machine Projects</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-purple-400">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            <span>Target: {activeProjectName}</span>
          </div>
        </div>

        {/* Vendors */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Vendors</span>
            <div className="w-8 h-8 rounded-lg bg-amber-600/20 text-amber-400 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-300 font-mono">{stats.uniqueVendors}</span>
            <span className="text-xs text-slate-400">Suppliers</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[10px] text-amber-400">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span>Primary: {vendor}</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TOP SECTION: PROJECT DETAILS CARDS */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              Project Specification & Header Details
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Auto-fills automatically into newly created requirement rows
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {/* Project Name */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Project Name
            </label>
            <select
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-blue-500 transition-colors"
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
                className="w-full mt-1.5 bg-slate-950 border border-blue-500/60 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none"
              />
            )}
          </div>

          {/* Machine Type */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Machine Type
            </label>
            <select
              value={machineType}
              onChange={(e) => setMachineType(e.target.value as MachineCategory)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-cyan-300 focus:outline-none focus:border-cyan-500 transition-colors"
            >
              {MACHINE_TYPES.map((mt) => (
                <option key={mt} value={mt}>
                  {mt}
                </option>
              ))}
            </select>
          </div>

          {/* Vendor Name */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Vendor / Supplier
            </label>
            <select
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-amber-300 focus:outline-none focus:border-amber-500 transition-colors"
            >
              {COMMON_VENDORS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Order Source */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Order Source
            </label>
            <select
              value={orderSource}
              onChange={(e) => setOrderSource(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-purple-300 focus:outline-none focus:border-purple-500 transition-colors"
            >
              {ORDER_SOURCES.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
          </div>

          {/* PO Number */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
              PO Number
            </label>
            <input
              type="text"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              placeholder="e.g. PO-2026-36"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-medium text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. QUICK MATERIAL ENTRY SECTION (SMART FAST FORM) */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/90 border border-blue-500/30 rounded-2xl p-5 shadow-lg space-y-3 relative">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <h2 className="text-sm font-black text-white uppercase tracking-wider">
              Quick Material Entry Form (फास्ट डेटा एंट्री)
            </h2>
          </div>
          <span className="text-[11px] text-slate-400">
            Inherits Vendor: <strong className="text-amber-300">{vendor}</strong> | Machine:{' '}
            <strong className="text-cyan-300">{machineType}</strong>
          </span>
        </div>

        <form onSubmit={handleAddQuickMaterial} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
            {/* Component / Description with quick suggestions */}
            <div className="lg:col-span-4 space-y-1">
              <label className="block text-[11px] font-bold text-slate-300">
                Description / Component Name
              </label>
              <div className="relative">
                <input
                  ref={quickDescInputRef}
                  type="text"
                  value={quickDescription}
                  onChange={(e) => setQuickDescription(e.target.value)}
                  placeholder="e.g. Mono Conveyor Inlet Patti, Sealing Clamp..."
                  list="rsb-parts-list"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <datalist id="rsb-parts-list">
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
              <label className="block text-[11px] font-bold text-slate-300">
                Material Type
              </label>
              <select
                value={quickMaterialType}
                onChange={(e) => setQuickMaterialType(e.target.value as MaterialType)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-blue-300 focus:outline-none focus:border-blue-500 transition-colors"
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
              <label className="block text-[11px] font-bold text-slate-300">
                Size Specification
              </label>
              <input
                type="text"
                value={quickSizeSpecs}
                onChange={(e) => setQuickSizeSpecs(e.target.value)}
                placeholder="e.g. 80 x 6 x 485 or OD 106 x ID 75 x 110"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-300 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Quantity */}
            <div className="lg:col-span-1 space-y-1">
              <label className="block text-[11px] font-bold text-slate-300">
                Qty
              </label>
              <input
                type="number"
                min="0.1"
                step="any"
                value={quickQuantity}
                onChange={(e) => setQuickQuantity(parseFloat(e.target.value) || 1)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono font-black text-amber-300 text-center focus:outline-none focus:border-amber-500 transition-colors"
              />
            </div>

            {/* Unit */}
            <div className="lg:col-span-1 space-y-1">
              <label className="block text-[11px] font-bold text-slate-300">
                Unit
              </label>
              <select
                value={quickUnit}
                onChange={(e) => setQuickUnit(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-blue-500 transition-colors text-center"
              >
                <option value="Nos">Nos</option>
                <option value="Kg">Kg</option>
                <option value="Mtr">Mtr</option>
                <option value="Sets">Sets</option>
                <option value="Pkt">Pkt</option>
              </select>
            </div>

            {/* Add Material Primary Action Button */}
            <div className="lg:col-span-1">
              <button
                type="submit"
                className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-1 shrink-0 h-[38px]"
                title="Add material to table (Press Enter)"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden xl:inline">Add</span>
              </button>
            </div>
          </div>

          {/* Quick Click Preset Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
            <span className="text-slate-400 font-bold uppercase">Quick Part Presets:</span>
            {RSB_SAMPLE_COMPONENTS.slice(0, 7).map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setQuickDescription(item.description);
                  setQuickMaterialType(item.materialType as MaterialType);
                  setQuickSizeSpecs(item.sizeSpecs);
                  setQuickQuantity(item.qty);
                  setQuickUnit(item.unit);
                }}
                className="px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/60 transition-colors"
              >
                {item.description}
              </button>
            ))}
          </div>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* 5. MATERIAL REQUIREMENT TABLE CONTROLS & SPREADSHEET */}
      {/* ========================================================================= */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        {/* Table Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search description, size, vendor, machine..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Filter Machine */}
            <select
              value={filterMachine}
              onChange={(e) => setFilterMachine(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Machines</option>
              {MACHINE_TYPES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {/* Filter Material Type */}
            <select
              value={filterMaterialType}
              onChange={(e) => setFilterMaterialType(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Materials</option>
              {MATERIAL_TYPES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>

            {/* Filter Vendor */}
            <select
              value={filterVendor}
              onChange={(e) => setFilterVendor(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Vendors</option>
              {COMMON_VENDORS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Table Operations Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Direct Paste from Excel Button */}
            <button
              type="button"
              onClick={() => setIsPasteModalOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
              title="Bulk paste data from Excel"
            >
              <Clipboard className="w-3.5 h-3.5 text-blue-400" />
              <span>Bulk Paste Excel</span>
            </button>

            {/* Copy Previous Row */}
            <button
              type="button"
              onClick={handleCopyPreviousRow}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
              title="Copy the last row in table"
            >
              <Copy className="w-3.5 h-3.5 text-indigo-400" />
              <span>Copy Prev Row</span>
            </button>

            {/* Add Blank Row */}
            <button
              type="button"
              onClick={handleAddEmptyRow}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>+ Add Row</span>
            </button>

            {/* Selected Bulk Actions */}
            {selectedRowIds.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleBulkDuplicate}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-900/40 hover:bg-blue-900/60 border border-blue-500/50 text-blue-200 text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Duplicate ({selectedRowIds.length})</span>
                </button>
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-900/40 hover:bg-rose-900/60 border border-rose-500/50 text-rose-200 text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete ({selectedRowIds.length})</span>
                </button>
              </>
            )}

            {/* Clear All Rows */}
            <button
              type="button"
              onClick={handleClearSheet}
              className="px-2 py-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 text-xs transition-colors"
              title="Clear all rows"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* ======================================================================= */}
        {/* SPREADSHEET-LIKE DATA ENTRY TABLE */}
        {/* ======================================================================= */}
        <div className="overflow-x-auto border border-slate-800 rounded-xl max-h-[580px] custom-scrollbar shadow-inner bg-slate-950">
          <table className="w-full text-left text-xs border-collapse">
            {/* Sticky Header */}
            <thead className="bg-slate-900 text-slate-300 sticky top-0 z-20 border-b border-slate-800 shadow-sm uppercase tracking-wider font-mono text-[11px]">
              <tr>
                <th className="p-2.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={paginatedRows.length > 0 && selectedRowIds.length === paginatedRows.length}
                    onChange={(e) => handleToggleSelectAll(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                  />
                </th>
                <th className="p-2.5 w-12 text-center">Sr</th>
                <th className="p-2.5 min-w-[200px]">Description / Component</th>
                <th className="p-2.5 min-w-[120px]">Material Type</th>
                <th className="p-2.5 min-w-[160px]">Size Specification</th>
                <th className="p-2.5 min-w-[100px] text-center">Quantity</th>
                <th className="p-2.5 min-w-[70px] text-center">Unit</th>
                <th className="p-2.5 min-w-[140px]">Vendor</th>
                <th className="p-2.5 min-w-[100px]">Machine Type</th>
                <th className="p-2.5 min-w-[140px]">Project</th>
                <th className="p-2.5 min-w-[120px]">Order Source</th>
                <th className="p-2.5 w-24 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-850">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="text-center py-12 text-slate-400">
                    <Boxes className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                    <p className="font-bold text-white text-sm">No Material Entries Found</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Use the quick entry form above, click "+ Add Row", or load the 14 RSB Parts Preset.
                    </p>
                    <button
                      type="button"
                      onClick={handleLoadRSBPreset}
                      className="mt-3 px-3 py-1.5 rounded-lg bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-bold hover:bg-blue-600/50"
                    >
                      Load 14 RSB Parts Preset
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => {
                  const isSelected = selectedRowIds.includes(row.id);

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-slate-900/80 transition-colors group ${
                        isSelected ? 'bg-blue-950/30' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-2 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectRow(row.id)}
                          className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0"
                        />
                      </td>

                      {/* Sr No */}
                      <td className="p-2 text-center font-mono font-bold text-slate-400">
                        {row.srNo}
                      </td>

                      {/* Description / Part */}
                      <td className="p-1">
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) => handleCellChange(row.id, 'description', e.target.value)}
                          placeholder="Part Name..."
                          className="w-full bg-transparent hover:bg-slate-900 focus:bg-slate-950 border border-transparent hover:border-slate-800 focus:border-blue-500 rounded px-2 py-1 text-xs text-white font-medium focus:outline-none transition-colors"
                        />
                      </td>

                      {/* Material Type */}
                      <td className="p-1">
                        <select
                          value={row.materialType}
                          onChange={(e) =>
                            handleCellChange(row.id, 'materialType', e.target.value as MaterialType)
                          }
                          className="w-full bg-transparent hover:bg-slate-900 focus:bg-slate-950 border border-transparent hover:border-slate-800 focus:border-blue-500 rounded px-2 py-1 text-xs text-blue-300 font-bold focus:outline-none transition-colors"
                        >
                          {MATERIAL_TYPES.map((mt) => (
                            <option key={mt} value={mt}>
                              {mt}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Size Specification */}
                      <td className="p-1">
                        <input
                          type="text"
                          value={row.sizeSpecs}
                          onChange={(e) => handleCellChange(row.id, 'sizeSpecs', e.target.value)}
                          placeholder="e.g. 80 x 6 x 485"
                          className="w-full bg-transparent hover:bg-slate-900 focus:bg-slate-950 border border-transparent hover:border-slate-800 focus:border-emerald-500 rounded px-2 py-1 text-xs font-mono font-bold text-emerald-300 focus:outline-none transition-colors"
                        />
                      </td>

                      {/* Quantity */}
                      <td className="p-1 text-center">
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          value={row.quantity}
                          onChange={(e) =>
                            handleCellChange(row.id, 'quantity', parseFloat(e.target.value) || 0)
                          }
                          className="w-full bg-transparent hover:bg-slate-900 focus:bg-slate-950 border border-transparent hover:border-slate-800 focus:border-amber-500 rounded px-2 py-1 text-xs font-mono font-bold text-amber-300 text-center focus:outline-none transition-colors"
                        />
                      </td>

                      {/* Unit */}
                      <td className="p-1 text-center">
                        <select
                          value={row.unit}
                          onChange={(e) => handleCellChange(row.id, 'unit', e.target.value)}
                          className="w-full bg-transparent hover:bg-slate-900 focus:bg-slate-950 border border-transparent hover:border-slate-800 focus:border-blue-500 rounded px-1 py-1 text-xs text-slate-300 text-center focus:outline-none transition-colors"
                        >
                          <option value="Nos">Nos</option>
                          <option value="Kg">Kg</option>
                          <option value="Mtr">Mtr</option>
                          <option value="Sets">Sets</option>
                          <option value="Pkt">Pkt</option>
                        </select>
                      </td>

                      {/* Vendor */}
                      <td className="p-1">
                        <input
                          type="text"
                          value={row.vendor}
                          onChange={(e) => handleCellChange(row.id, 'vendor', e.target.value)}
                          className="w-full bg-transparent hover:bg-slate-900 focus:bg-slate-950 border border-transparent hover:border-slate-800 focus:border-amber-500 rounded px-2 py-1 text-xs text-amber-200/90 focus:outline-none transition-colors"
                        />
                      </td>

                      {/* Machine Type */}
                      <td className="p-1">
                        <select
                          value={row.machineType}
                          onChange={(e) =>
                            handleCellChange(row.id, 'machineType', e.target.value as MachineCategory)
                          }
                          className="w-full bg-transparent hover:bg-slate-900 focus:bg-slate-950 border border-transparent hover:border-slate-800 focus:border-cyan-500 rounded px-2 py-1 text-xs text-cyan-300 font-semibold focus:outline-none transition-colors"
                        >
                          {MACHINE_TYPES.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Project */}
                      <td className="p-1">
                        <input
                          type="text"
                          value={row.projectName}
                          onChange={(e) => handleCellChange(row.id, 'projectName', e.target.value)}
                          className="w-full bg-transparent hover:bg-slate-900 focus:bg-slate-950 border border-transparent hover:border-slate-800 focus:border-purple-500 rounded px-2 py-1 text-xs text-purple-300 focus:outline-none transition-colors"
                        />
                      </td>

                      {/* Order Source */}
                      <td className="p-1">
                        <select
                          value={row.orderSource}
                          onChange={(e) => handleCellChange(row.id, 'orderSource', e.target.value)}
                          className="w-full bg-transparent hover:bg-slate-900 focus:bg-slate-950 border border-transparent hover:border-slate-800 focus:border-purple-500 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none transition-colors"
                        >
                          {ORDER_SOURCES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Row Actions */}
                      <td className="p-1 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => handleDuplicateRow(row.id)}
                            className="p-1 rounded text-slate-400 hover:text-blue-300 hover:bg-blue-950/50"
                            title="Duplicate row"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(row.id)}
                            className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-rose-950/50"
                            title="Delete row"
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

        {/* Table Footer: Pagination & Fast Add Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-white">{filteredRows.length}</strong> material item(s)
            </span>
            <div className="flex items-center gap-1.5 border-l border-slate-800 pl-3">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-slate-950 border border-slate-800 rounded px-1.5 py-0.5 text-xs text-white"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value="ALL">All</option>
              </select>
            </div>
          </div>

          {/* Pagination Controls */}
          {pageSize !== 'ALL' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2 py-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 text-white"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-slate-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2 py-1 rounded bg-slate-800 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 text-white"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. BOTTOM PROMINENT SAVE ACTION BAR */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-850 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold">
            <Save className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">Save Project Material Requirement</h3>
            <p className="text-xs text-slate-400">
              Commits all {rows.length} requirement entries to RSB Private Limited ERP database.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            type="button"
            onClick={handleExportExcel}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Export to Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={handleSaveProject}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black transition-all shadow-xl shadow-blue-950 flex items-center justify-center gap-2 active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>SAVE PROJECT (पूरा प्रोजेक्ट सेव करें)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: EXCEL IMPORT */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        title="Import Material Requirement Sheet (Excel / CSV)"
        subtitle="Upload standard RSB Equipments material lists in .xlsx, .xls or .csv format"
        maxWidth="lg"
      >
        <div className="space-y-4">
          <div className="border-2 border-dashed border-slate-700 hover:border-blue-500/60 rounded-2xl p-6 text-center transition-colors bg-slate-950/60">
            <FileSpreadsheet className="w-12 h-12 text-emerald-400 mx-auto mb-2 animate-bounce" />
            <p className="text-sm font-bold text-white">Choose an Excel (.xlsx / .csv) file to import</p>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Columns recognized: Description, Material Type, Size Specification, Quantity, Unit, Vendor, Machine Type.
            </p>
            <label className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              <span>Select File</span>
              <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs space-y-1.5">
            <span className="font-bold text-slate-300 block">Sample Format:</span>
            <div className="font-mono text-[11px] text-slate-400 bg-slate-950 p-2 rounded border border-slate-850 overflow-x-auto">
              Description | Material Type | Size Specification | Quantity | Unit
              <br />
              Mono Conveyor Inlet Patti | SS Flat | 80 x 6 x 485 | 2 | Nos
              <br />
              Sealing Clamp | SS Flat | 60 x 16 x 110 | 2 | Nos
            </div>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: BULK CLIPBOARD PASTE */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isPasteModalOpen}
        onClose={() => setIsPasteModalOpen(false)}
        title="Bulk Paste from Microsoft Excel"
        subtitle="Copy rows directly from Excel or Google Sheets and paste them here"
        maxWidth="xl"
      >
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">
              Paste Tab-Separated Data from Excel:
            </label>
            <textarea
              rows={8}
              value={pasteContent}
              onChange={(e) => setPasteContent(e.target.value)}
              placeholder="Paste cells copied directly from Excel (e.g. Description [TAB] Material Type [TAB] Size Spec [TAB] Qty [TAB] Unit)"
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-white placeholder-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Will automatically map into active table rows.
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleParseClipboard}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md"
              >
                Append Rows to Table
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
