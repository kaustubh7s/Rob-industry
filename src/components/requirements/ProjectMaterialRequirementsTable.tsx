import React, { useState, useMemo } from 'react';
import {
  Table,
  Layers,
  Search,
  Plus,
  FileSpreadsheet,
  FileText,
  Upload,
  ShoppingCart,
  Wrench,
  ShieldCheck,
  Send,
  Package,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  TrendingUp,
  SlidersHorizontal,
  Eye,
  Trash2,
  Edit2,
  RefreshCw,
  Boxes,
  Truck,
  Building2,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import {
  ProjectMaterialRequirementItem,
  MaterialType,
  MachineCategory,
  StockStatus,
  ProductionStatus,
  QCStatus,
  DispatchStatus,
} from '../../types/erp';
import { formatINR, formatCompactINR } from '../../utils/calculations';
import { exportToExcel, exportToPdfReport, parseExcelFile } from '../../utils/excelIntegration';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';

export const ProjectMaterialRequirementsTable: React.FC = () => {
  const {
    projectRequirements,
    addProjectRequirement,
    updateProjectRequirement,
    deleteProjectRequirement,
    bulkImportProjectRequirements,
    createJobCardFromRequirement,
    convertShortagesToPO,
    issueStockForRequirement,
    scrapRequirementMaterial,
    projects,
    boms,
    populateRequirementsFromBOM,
    vendors,
    customers,
    materials,
    setActiveTab,
  } = useERP();

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState('ALL');
  const [filterMachine, setFilterMachine] = useState('ALL');
  const [filterMaterialType, setFilterMaterialType] = useState('ALL');
  const [filterStockStatus, setFilterStockStatus] = useState<string>('ALL');
  const [filterProdStatus, setFilterProdStatus] = useState<string>('ALL');
  const [selectedReqIds, setSelectedReqIds] = useState<string[]>([]);

  // Modals & Drawers
  const [activeDetailItem, setActiveDetailItem] = useState<ProjectMaterialRequirementItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);
  const [isLoadBOMModalOpen, setIsLoadBOMModalOpen] = useState(false);
  const [isQCModalOpen, setIsQCModalOpen] = useState(false);
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);

  // New Requirement Form
  const [newForm, setNewForm] = useState({
    description: 'Mono Conveyor Inlet Patti',
    materialType: 'SS Flat' as MaterialType,
    materialGrade: 'SS 304',
    sizeSpecs: '80 x 6 x 485',
    quantity: 2,
    unit: 'Nos',
    projectName: 'FOHA',
    customerName: 'Cadila Healthcare Ltd (Zydus)',
    poNumber: '36',
    poDate: new Date().toISOString().split('T')[0],
    machineType: 'Mono Conveyor' as MachineCategory,
    orderSource: 'Customer PO',
    deliveryDate: new Date(Date.now() + 20 * 86400000).toISOString().split('T')[0],
    vendor: 'Manav Metal',
    bomRef: 'BOM-MC-01',
    materialCost: 900,
    laborCost: 400,
    machineCost: 250,
    outsourcingCost: 0,
    productionStatus: 'Pending' as ProductionStatus,
    qcStatus: 'Not Started' as QCStatus,
    dispatchStatus: 'Not Ready' as DispatchStatus,
    notes: 'Fabricate as per drawing',
  });

  // Load BOM into Project Form
  const [bomSelectForm, setBomSelectForm] = useState({
    projectId: projects[0]?.id || '',
    bomId: boms[0]?.id || '',
  });

  // Quick QC Form
  const [qcForm, setQcForm] = useState({
    status: 'Passed' as QCStatus,
    inspector: 'Rajesh B. Patel',
    notes: 'Dimensional tolerance ± 0.05 mm verified OK.',
  });

  // Quick Dispatch Form
  const [dispatchForm, setDispatchForm] = useState({
    vehicleNumber: 'GJ-01-CZ-8890',
    invoiceNumber: 'RSB-INV-2026-118',
    deliveryStatus: 'Dispatched' as DispatchStatus,
  });

  // Filtered dataset
  const filteredRequirements = useMemo(() => {
    return projectRequirements.filter((req) => {
      const matchSearch =
        req.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.sizeSpecs.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.projectName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.poNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.vendor || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.bomRef || '').toLowerCase().includes(searchTerm.toLowerCase());

      const matchProject = filterProject === 'ALL' || req.projectName === filterProject;
      const matchMachine = filterMachine === 'ALL' || req.machineType === filterMachine;
      const matchMatType = filterMaterialType === 'ALL' || req.materialType === filterMaterialType;
      const matchStock = filterStockStatus === 'ALL' || req.stockStatus === filterStockStatus;
      const matchProd = filterProdStatus === 'ALL' || req.productionStatus === filterProdStatus;

      return matchSearch && matchProject && matchMachine && matchMatType && matchStock && matchProd;
    });
  }, [projectRequirements, searchTerm, filterProject, filterMachine, filterMaterialType, filterStockStatus, filterProdStatus]);

  // Dashboard Aggregates
  const totalComponents = projectRequirements.length;
  const inProductionCount = projectRequirements.filter((r) => r.productionStatus !== 'Pending' && r.productionStatus !== 'Completed').length;
  const completedCount = projectRequirements.filter((r) => r.productionStatus === 'Completed').length;
  const shortagesCount = projectRequirements.filter((r) => r.stockStatus === 'Shortage' || (r.shortageQty || 0) > 0).length;
  const delayedCount = projectRequirements.filter((r) => (r.deliveryDate ? new Date(r.deliveryDate) < new Date() : false) && r.productionStatus !== 'Completed').length;
  const completionPct = totalComponents > 0 ? Math.round((completedCount / totalComponents) * 100) : 0;
  const totalProjectCost = projectRequirements.reduce((acc, r) => acc + (r.totalCost || 0), 0);
  const totalProjectRevenue = projectRequirements.reduce((acc, r) => acc + (r.sellingPriceAllocated || r.totalCost * 1.55), 0);
  const expectedProfit = totalProjectRevenue - totalProjectCost;

  // Dropdown lists
  const uniqueProjects = Array.from(new Set(projectRequirements.map((r) => r.projectName)));
  const uniqueMachines = Array.from(new Set(projectRequirements.map((r) => r.machineType)));
  const uniqueMaterials = Array.from(new Set(projectRequirements.map((r) => r.materialType)));

  // Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedReqIds(filteredRequirements.map((r) => r.id));
    } else {
      setSelectedReqIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedReqIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const totalCost = newForm.materialCost + newForm.laborCost + newForm.machineCost + newForm.outsourcingCost;
    addProjectRequirement({
      ...newForm,
      stockStatus: 'Available',
      availableStock: 0,
      shortageQty: 0,
      totalCost,
    });
    setIsAddModalOpen(false);
  };

  const handleLoadBOM = (e: React.FormEvent) => {
    e.preventDefault();
    populateRequirementsFromBOM(bomSelectForm.projectId, bomSelectForm.bomId);
    setIsLoadBOMModalOpen(false);
  };

  const handleAutoPOForSelected = () => {
    const ids = selectedReqIds.length > 0 ? selectedReqIds : projectRequirements.filter((r) => r.shortageQty > 0).map((r) => r.id);
    convertShortagesToPO(ids);
    setSelectedReqIds([]);
  };

  const handleExportExcel = () => {
    const data = filteredRequirements.map((r) => ({
      'Sr No': r.srNo,
      'Description': r.description,
      'Material Type': r.materialType,
      'Material Grade': r.materialGrade,
      'Size Specification': r.sizeSpecs,
      'Quantity': r.quantity,
      'Unit': r.unit,
      'Machine Type': r.machineType,
      'Project': r.projectName,
      'Customer': r.customerName,
      'PO Number': r.poNumber,
      'PO Date': r.poDate,
      'Vendor': r.vendor,
      'BOM Ref': r.bomRef,
      'Stock Status': r.stockStatus,
      'Available Stock': r.availableStock,
      'Shortage Qty': r.shortageQty,
      'Production Status': r.productionStatus,
      'Production Stage': r.productionStage || '-',
      'Job Card No': r.jobCardNo || '-',
      'Assigned Operator': r.assignedOperator || '-',
      'QC Status': r.qcStatus,
      'Dispatch Status': r.dispatchStatus,
      'Delivery Date': r.deliveryDate,
      'Material Cost (INR)': r.materialCost,
      'Labor Cost (INR)': r.laborCost,
      'Machine Cost (INR)': r.machineCost,
      'Total Cost (INR)': r.totalCost,
    }));
    exportToExcel(data, `RSB_Project_Material_Requirements_Master_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPdf = () => {
    const headers = ['Sr', 'Description', 'Material Spec', 'Qty', 'Machine', 'Project', 'PO No', 'Vendor', 'Stock', 'Prod Status', 'QC'];
    const rows = filteredRequirements.map((r) => [
      r.srNo,
      r.description,
      `${r.materialType} ${r.sizeSpecs}`,
      `${r.quantity} ${r.unit}`,
      r.machineType,
      r.projectName,
      r.poNumber,
      r.vendor,
      r.stockStatus,
      r.productionStatus,
      r.qcStatus,
    ]);
    exportToPdfReport('RSB Project Material Requirement & Production Traceability Master', headers, rows, 'RSB_Material_Requirements');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsedData = await parseExcelFile(file);
      if (parsedData && parsedData.length > 0) {
        bulkImportProjectRequirements(parsedData);
        setIsExcelImportModalOpen(false);
      } else {
        alert('Could not read rows from the selected file. Please verify format.');
      }
    } catch (err) {
      console.error(err);
      alert('Error parsing Excel file.');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Hub Triggers */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-600/15 border border-blue-500/30 text-blue-400">
              <Table className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Project Material Requirement Table
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 font-bold uppercase">
                  Central ERP Heart
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Single Source of Truth linking BOM, MRP, Inventory, Purchase, Production, QC, Dispatch, Costing & Vendors
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Add Requirement
          </button>
          <button
            onClick={() => setIsLoadBOMModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition-colors"
          >
            <Boxes className="w-3.5 h-3.5 text-cyan-400" /> Load BOM into Project
          </button>
          <button
            onClick={() => setIsExcelImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 text-xs font-bold rounded-xl transition-colors"
          >
            <Upload className="w-3.5 h-3.5" /> Import Customer PO (Excel)
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Export Excel
          </button>
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition-colors"
          >
            <FileText className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      </div>

      {/* 2. Top Metric KPI Cockpit */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Components</span>
          <p className="text-xl font-bold text-white font-mono mt-1">{totalComponents}</p>
          <span className="text-[10px] text-slate-400">Master entries</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">In Production</span>
          <p className="text-xl font-bold text-blue-400 font-mono mt-1">{inProductionCount}</p>
          <span className="text-[10px] text-blue-300">Active shopfloor</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completed</span>
          <p className="text-xl font-bold text-emerald-400 font-mono mt-1">{completedCount}</p>
          <span className="text-[10px] text-emerald-300">{completionPct}% Progress</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">🔴 Shortages (PO)</span>
          <p className="text-xl font-bold text-rose-400 font-mono mt-1">{shortagesCount}</p>
          <span className="text-[10px] text-rose-300">Procurement req</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Delayed</span>
          <p className="text-xl font-bold text-amber-400 font-mono mt-1">{delayedCount}</p>
          <span className="text-[10px] text-amber-300">Past SLA target</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completion %</span>
          <p className="text-xl font-bold text-cyan-400 font-mono mt-1">{completionPct}%</p>
          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-cyan-400 rounded-full" style={{ width: `${completionPct}%` }} />
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Project Cost</span>
          <p className="text-sm font-bold text-slate-200 font-mono mt-1.5">{formatCompactINR(totalProjectCost)}</p>
          <span className="text-[10px] text-slate-400 font-mono">Mat+Labor+Mch</span>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Expected Profit</span>
          <p className="text-sm font-bold text-emerald-400 font-mono mt-1.5">{formatCompactINR(expectedProfit)}</p>
          <span className="text-[10px] text-emerald-300 font-mono">
            {totalProjectRevenue > 0 ? ((expectedProfit / totalProjectRevenue) * 100).toFixed(0) : 35}% Margin
          </span>
        </div>
      </div>

      {/* 3. Search & Interactive Multi-Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search component description, spec, project, PO No, vendor, BOM ref (e.g. Inlet Patti, 80x6x485, FOHA, 36, Manav Metal)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500 font-mono"
            />
          </div>

          {/* Bulk Multi-Select Actions */}
          {selectedReqIds.length > 0 && (
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 animate-in fade-in">
              <span className="text-xs font-mono font-bold text-blue-300">
                {selectedReqIds.length} Selected
              </span>
              <button
                onClick={handleAutoPOForSelected}
                className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-xs"
              >
                <ShoppingCart className="w-3.5 h-3.5" /> Issue Purchase Orders
              </button>
            </div>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 border-t border-slate-800 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Project</label>
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs"
            >
              <option value="ALL">All Projects ({projectRequirements.length})</option>
              {uniqueProjects.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Machine Type</label>
            <select
              value={filterMachine}
              onChange={(e) => setFilterMachine(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs"
            >
              <option value="ALL">All Machine Types</option>
              {uniqueMachines.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Material Type</label>
            <select
              value={filterMaterialType}
              onChange={(e) => setFilterMaterialType(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs"
            >
              <option value="ALL">All Materials</option>
              {uniqueMaterials.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Stock Status</label>
            <select
              value={filterStockStatus}
              onChange={(e) => setFilterStockStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs"
            >
              <option value="ALL">All Stock Statuses</option>
              <option value="Available">🟢 Available</option>
              <option value="Partial Available">🟡 Partial Available</option>
              <option value="Shortage">🔴 Shortage</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Production Status</label>
            <select
              value={filterProdStatus}
              onChange={(e) => setFilterProdStatus(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs"
            >
              <option value="ALL">All Production Stages</option>
              <option value="Pending">Pending</option>
              <option value="Cutting">Cutting</option>
              <option value="Fabrication">Fabrication</option>
              <option value="Assembly">Assembly</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. MASTER TABLE: Exact Schema Requested */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-850 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800 tracking-wider select-none">
              <tr>
                <th className="p-3 text-center w-10">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedReqIds.length > 0 && selectedReqIds.length === filteredRequirements.length}
                    className="rounded-sm border-slate-700 bg-slate-800 text-blue-600"
                  />
                </th>
                <th className="p-3 text-center w-12">Sr No</th>
                <th className="p-3">Description</th>
                <th className="p-3">Material Type</th>
                <th className="p-3">Size Specification</th>
                <th className="p-3 text-center">Qty</th>
                <th className="p-3 text-center">Unit</th>
                <th className="p-3">Machine Type</th>
                <th className="p-3">Project</th>
                <th className="p-3">PO No</th>
                <th className="p-3">Vendor</th>
                <th className="p-3">BOM Ref</th>
                <th className="p-3 text-center">Stock Status</th>
                <th className="p-3 text-center">Production Status</th>
                <th className="p-3 text-center">QC Status</th>
                <th className="p-3 text-center">Dispatch Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-medium text-slate-300">
              {filteredRequirements.map((req) => {
                const isSelected = selectedReqIds.includes(req.id);

                return (
                  <tr
                    key={req.id}
                    className={`hover:bg-slate-800/50 transition-colors ${
                      isSelected ? 'bg-blue-650/15' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(req.id)}
                        className="rounded-sm border-slate-700 bg-slate-800 text-blue-600"
                      />
                    </td>

                    {/* Sr No */}
                    <td className="p-3 text-center font-mono font-bold text-slate-400">
                      {req.srNo}
                    </td>

                    {/* Description */}
                    <td className="p-3">
                      <div className="font-bold text-white text-xs hover:text-blue-300 cursor-pointer" onClick={() => setActiveDetailItem(req)}>
                        {req.description}
                      </div>
                      {req.jobCardNo && (
                        <span className="text-[10px] font-mono text-cyan-400 block">
                          Card: {req.jobCardNo}
                        </span>
                      )}
                    </td>

                    {/* Material Type */}
                    <td className="p-3 font-mono">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 text-[11px] font-semibold border border-slate-700">
                        {req.materialType}
                      </span>
                    </td>

                    {/* Size Specification */}
                    <td className="p-3 font-mono font-semibold text-cyan-300 text-[11px]">
                      {req.sizeSpecs}
                    </td>

                    {/* Qty */}
                    <td className="p-3 text-center font-mono font-bold text-white text-xs">
                      {req.quantity}
                    </td>

                    {/* Unit */}
                    <td className="p-3 text-center text-[11px] text-slate-400 font-mono">
                      {req.unit}
                    </td>

                    {/* Machine Type */}
                    <td className="p-3 text-[11px] text-slate-300">
                      <span className="font-medium">{req.machineType}</span>
                    </td>

                    {/* Project */}
                    <td className="p-3 font-bold text-white text-xs">
                      {req.projectName}
                    </td>

                    {/* PO No */}
                    <td className="p-3 font-mono text-amber-300 font-bold text-xs">
                      {req.poNumber}
                    </td>

                    {/* Vendor */}
                    <td className="p-3 text-[11px] text-slate-300">
                      <span className="text-white font-semibold">{req.vendor}</span>
                    </td>

                    {/* BOM Ref */}
                    <td className="p-3 font-mono text-blue-400 text-[11px] font-bold">
                      {req.bomRef}
                    </td>

                    {/* Stock Status */}
                    <td className="p-3 text-center font-mono">
                      {req.stockStatus === 'Available' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-300 text-[10px] font-bold border border-emerald-800/80">
                          🟢 Available
                        </span>
                      )}
                      {req.stockStatus === 'Partial Available' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-300 text-[10px] font-bold border border-amber-800/80">
                          🟡 Partial
                        </span>
                      )}
                      {req.stockStatus === 'Shortage' && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-950/60 text-rose-300 text-[10px] font-bold border border-rose-800/80">
                          🔴 Shortage ({req.shortageQty})
                        </span>
                      )}
                    </td>

                    {/* Production Status */}
                    <td className="p-3 text-center">
                      <StatusBadge status={req.productionStatus} size="sm" />
                    </td>

                    {/* QC Status */}
                    <td className="p-3 text-center">
                      {req.qcStatus === 'Passed' && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-300 text-[10px] font-bold border border-emerald-800/80">
                          ✓ Passed
                        </span>
                      )}
                      {req.qcStatus === 'Rework' && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-300 text-[10px] font-bold border border-amber-800/80">
                          ⚠ Rework
                        </span>
                      )}
                      {req.qcStatus === 'Pending' && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-semibold">
                          Pending QC
                        </span>
                      )}
                      {req.qcStatus === 'Not Started' && (
                        <span className="text-[10px] text-slate-500">-</span>
                      )}
                    </td>

                    {/* Dispatch Status */}
                    <td className="p-3 text-center">
                      {req.dispatchStatus === 'Delivered' && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-950/60 text-emerald-300 text-[10px] font-bold border border-emerald-800/80">
                          Delivered
                        </span>
                      )}
                      {req.dispatchStatus === 'Dispatched' && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-950/60 text-blue-300 text-[10px] font-bold border border-blue-800/80">
                          Dispatched
                        </span>
                      )}
                      {req.dispatchStatus === 'Ready' && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-300 text-[10px] font-bold border border-amber-800/80">
                          Ready in Store
                        </span>
                      )}
                      {req.dispatchStatus === 'Not Ready' && (
                        <span className="text-[10px] text-slate-500">Not Ready</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!req.jobCardNo && (
                          <button
                            onClick={() => createJobCardFromRequirement(req.id)}
                            title="Generate Job Traveler Card"
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white rounded-lg border border-slate-700 transition-colors"
                          >
                            <Wrench className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setActiveDetailItem(req)}
                          title="View 360° Traceability Details"
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[11px] font-semibold transition-colors"
                        >
                          Details
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: 360° COMPREHENSIVE COMPONENT DETAILS DRAWER */}
      <Modal
        isOpen={!!activeDetailItem}
        onClose={() => setActiveDetailItem(null)}
        title={`Component Detail: ${activeDetailItem?.description}`}
        subtitle={`Sr No #${activeDetailItem?.srNo} &bull; ${activeDetailItem?.sizeSpecs} &bull; Project: ${activeDetailItem?.projectName}`}
        maxWidth="3xl"
      >
        {activeDetailItem && (
          <div className="space-y-4 text-xs">
            {/* Top 4 Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Stock Status</span>
                <span className="text-sm font-bold font-mono text-white mt-0.5 block">
                  {activeDetailItem.stockStatus}
                </span>
                <span className="text-[10px] text-slate-400">Avail: {activeDetailItem.availableStock} {activeDetailItem.unit}</span>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Production Stage</span>
                <span className="text-sm font-bold font-mono text-blue-400 mt-0.5 block">
                  {activeDetailItem.productionStatus}
                </span>
                <span className="text-[10px] text-slate-400">Card: {activeDetailItem.jobCardNo || 'Not Issued'}</span>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Quality Status</span>
                <span className="text-sm font-bold font-mono text-purple-400 mt-0.5 block">
                  {activeDetailItem.qcStatus}
                </span>
                <span className="text-[10px] text-slate-400">{activeDetailItem.rejectionReason || 'No defects'}</span>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Component Cost</span>
                <span className="text-sm font-bold font-mono text-emerald-400 mt-0.5 block">
                  {formatINR(activeDetailItem.totalCost)}
                </span>
                <span className="text-[10px] text-emerald-300">Selling: {formatINR(activeDetailItem.sellingPriceAllocated || 0)}</span>
              </div>
            </div>

            {/* Grid 1: Project & Material Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                <h4 className="font-bold text-white uppercase text-[11px] tracking-wider pb-1 border-b border-slate-800">
                  Project & Customer Details
                </h4>
                <div><strong className="text-slate-400">Project Name:</strong> <span className="text-white font-bold">{activeDetailItem.projectName}</span></div>
                <div><strong className="text-slate-400">Customer:</strong> {activeDetailItem.customerName}</div>
                <div><strong className="text-slate-400">Customer PO No:</strong> <span className="font-mono text-amber-300 font-bold">{activeDetailItem.poNumber}</span> (Date: {activeDetailItem.poDate})</div>
                <div><strong className="text-slate-400">Machine Category:</strong> {activeDetailItem.machineType}</div>
                <div><strong className="text-slate-400">Order Source:</strong> {activeDetailItem.orderSource}</div>
                <div><strong className="text-slate-400">Target Delivery Date:</strong> <span className="font-mono text-cyan-300">{activeDetailItem.deliveryDate}</span></div>
              </div>

              <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5">
                <h4 className="font-bold text-white uppercase text-[11px] tracking-wider pb-1 border-b border-slate-800">
                  Material & Engineering Specs
                </h4>
                <div><strong className="text-slate-400">Material Type:</strong> {activeDetailItem.materialType} ({activeDetailItem.materialGrade})</div>
                <div><strong className="text-slate-400">Size Specification:</strong> <span className="font-mono text-cyan-400 font-bold">{activeDetailItem.sizeSpecs}</span></div>
                <div><strong className="text-slate-400">Required Quantity:</strong> <span className="font-mono font-bold text-white">{activeDetailItem.quantity} {activeDetailItem.unit}</span></div>
                <div><strong className="text-slate-400">Calculated Weight:</strong> <span className="font-mono text-slate-200">{activeDetailItem.weightKg || 'Auto calculated'} Kg</span></div>
                <div><strong className="text-slate-400">BOM Reference:</strong> <span className="font-mono text-blue-400">{activeDetailItem.bomRef}</span></div>
                <div><strong className="text-slate-400">Preferred Supplier:</strong> {activeDetailItem.vendor} (Rating: {activeDetailItem.vendorRating || 4.9} ★)</div>
              </div>
            </div>

            {/* Grid 2: Cost Breakdown Rollup */}
            <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
              <h4 className="font-bold text-white uppercase text-[11px] tracking-wider pb-1 border-b border-slate-800">
                Automated Cost Rollup Breakdown
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                <div className="p-2.5 bg-slate-850 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Raw Material</span>
                  <span className="font-mono font-bold text-slate-200">{formatINR(activeDetailItem.materialCost)}</span>
                </div>
                <div className="p-2.5 bg-slate-850 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Shop Labor</span>
                  <span className="font-mono font-bold text-slate-200">{formatINR(activeDetailItem.laborCost)}</span>
                </div>
                <div className="p-2.5 bg-slate-850 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Machining & CNC</span>
                  <span className="font-mono font-bold text-slate-200">{formatINR(activeDetailItem.machineCost)}</span>
                </div>
                <div className="p-2.5 bg-slate-850 rounded-lg">
                  <span className="text-[10px] text-slate-400 block">Outsourcing / Polish</span>
                  <span className="font-mono font-bold text-slate-200">{formatINR(activeDetailItem.outsourcingCost)}</span>
                </div>
                <div className="p-2.5 bg-slate-850 rounded-lg border border-emerald-500/30">
                  <span className="text-[10px] text-emerald-400 font-bold block">Total Component Cost</span>
                  <span className="font-mono font-bold text-emerald-400">{formatINR(activeDetailItem.totalCost)}</span>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex justify-between items-center pt-2 border-t border-slate-800 flex-wrap gap-2">
              <div className="flex gap-2">
                {!activeDetailItem.jobCardNo && (
                  <button
                    onClick={() => {
                      createJobCardFromRequirement(activeDetailItem.id);
                      setActiveDetailItem(null);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-xs"
                  >
                    <Wrench className="w-3.5 h-3.5" /> Issue Job Card
                  </button>
                )}
                {activeDetailItem.shortageQty > 0 && (
                  <button
                    onClick={() => {
                      convertShortagesToPO([activeDetailItem.id]);
                      setActiveDetailItem(null);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-xs"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" /> Auto-PO to {activeDetailItem.vendor}
                  </button>
                )}
                {!activeDetailItem.stockIssued && (
                  <button
                    onClick={() => {
                      issueStockForRequirement(activeDetailItem.id);
                      setActiveDetailItem(null);
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold"
                  >
                    <Package className="w-3.5 h-3.5 text-cyan-400" /> Issue Warehouse Stock
                  </button>
                )}
              </div>

              <button
                onClick={() => setActiveDetailItem(null)}
                className="px-4 py-1.5 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700"
              >
                Close Traceability Drawer
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 2: ADD NEW MATERIAL REQUIREMENT */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Project Material Requirement"
        subtitle="Define drawing component, project, specifications, and initial status"
        maxWidth="2xl"
      >
        <form onSubmit={handleAddSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Part Description *</label>
              <input
                type="text"
                required
                value={newForm.description}
                onChange={(e) => setNewForm({ ...newForm, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                placeholder="e.g. Mono Conveyor Inlet Patti"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Project Name *</label>
              <input
                type="text"
                required
                value={newForm.projectName}
                onChange={(e) => setNewForm({ ...newForm, projectName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
                placeholder="e.g. FOHA"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Material Type *</label>
              <select
                value={newForm.materialType}
                onChange={(e) => setNewForm({ ...newForm, materialType: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              >
                <option value="SS Flat">SS Flat</option>
                <option value="SS Pipe">SS Pipe</option>
                <option value="SS Circle">SS Circle</option>
                <option value="SS Bar">SS Bar</option>
                <option value="SS Sheet">SS Sheet</option>
                <option value="Hardware">Hardware</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Size Specification *</label>
              <input
                type="text"
                required
                value={newForm.sizeSpecs}
                onChange={(e) => setNewForm({ ...newForm, sizeSpecs: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                placeholder="80 x 6 x 485"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Quantity *</label>
              <input
                type="number"
                required
                value={newForm.quantity}
                onChange={(e) => setNewForm({ ...newForm, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Customer PO Number *</label>
              <input
                type="text"
                required
                value={newForm.poNumber}
                onChange={(e) => setNewForm({ ...newForm, poNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
                placeholder="36"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Machine Type *</label>
              <select
                value={newForm.machineType}
                onChange={(e) => setNewForm({ ...newForm, machineType: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              >
                <option value="Mono Conveyor">Mono Conveyor</option>
                <option value="Washing Unit">Washing Unit</option>
                <option value="Distributor">Distributor</option>
                <option value="Sealing Unit">Sealing Unit</option>
                <option value="Cap Transfer">Cap Transfer</option>
                <option value="Pipeline System">Pipeline System</option>
                <option value="Conveyor Assembly">Conveyor Assembly</option>
                <option value="Custom Machine">Custom Machine</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Preferred Vendor</label>
              <select
                value={newForm.vendor}
                onChange={(e) => setNewForm({ ...newForm, vendor: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.name}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md"
            >
              Add Material Requirement
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: LOAD BOM DIRECTLY INTO PROJECT */}
      <Modal
        isOpen={isLoadBOMModalOpen}
        onClose={() => setIsLoadBOMModalOpen(false)}
        title="Automatic BOM Linking to Project"
        subtitle="Load complete multi-level component structure and populate requirements automatically"
        maxWidth="lg"
      >
        <form onSubmit={handleLoadBOM} className="space-y-4 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Target Project *</label>
            <select
              value={bomSelectForm.projectId}
              onChange={(e) => setBomSelectForm({ ...bomSelectForm, projectId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.projectNumber}) &bull; PO {p.poNumber}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select Bill of Materials (BOM) *</label>
            <select
              value={bomSelectForm.bomId}
              onChange={(e) => setBomSelectForm({ ...bomSelectForm, bomId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
            >
              {boms.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.bomNumber} - {b.assemblyName} ({b.revision})
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-slate-850 rounded-xl border border-slate-750 text-slate-300 text-[11px]">
            <p>
              Loading this BOM will automatically:
            </p>
            <ul className="list-disc pl-4 mt-1 space-y-0.5 text-slate-400">
              <li>Populate every component row into the Master Table</li>
              <li>Check live stock availability & detect shortages</li>
              <li>Roll up total project material & fabrication cost</li>
            </ul>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsLoadBOMModalOpen(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md"
            >
              Load BOM & Populate Table
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: IMPORT CUSTOMER PO FROM EXCEL */}
      <Modal
        isOpen={isExcelImportModalOpen}
        onClose={() => setIsExcelImportModalOpen(false)}
        title="Direct Customer PO Excel Import"
        subtitle="Upload customer PO (.xlsx / .csv) with columns: Sr No, Description, Material Type, Size Specification, Quantity"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs">
          <div className="p-6 border-2 border-dashed border-slate-700 rounded-2xl bg-slate-850 text-center hover:border-emerald-500/50 transition-colors">
            <FileSpreadsheet className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <h4 className="font-bold text-white text-sm">Upload Customer PO Excel File</h4>
            <p className="text-slate-400 text-xs mt-1">
              Supports .XLSX, .XLS, .CSV formats
            </p>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="mt-4 block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-500 cursor-pointer"
            />
          </div>

          <div className="p-3.5 bg-slate-850 rounded-xl border border-slate-750 text-[11px] text-slate-300 space-y-1">
            <h5 className="font-bold text-white">Automated Processing Logic:</h5>
            <p>&bull; Automatically creates project material records without manual re-entry.</p>
            <p>&bull; Matches size specifications to existing warehouse inventory.</p>
            <p>&bull; Calculates net shortages and generates procurement requests.</p>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              onClick={() => setIsExcelImportModalOpen(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
