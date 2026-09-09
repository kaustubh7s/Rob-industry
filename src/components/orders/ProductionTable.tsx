import React, { useState } from 'react';
import {
  Layers,
  Search,
  Filter,
  Download,
  Plus,
  ArrowUpDown,
  CheckCircle2,
  HardHat,
  FileSpreadsheet,
  FileText,
  Eye,
  Trash2,
  Edit,
  Truck,
  Send,
  MoreVertical,
  QrCode,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { ManufacturingOrderItem, ProductionStatus, MaterialType, MachineCategory } from '../../types/erp';
import { StatusBadge } from '../common/StatusBadge';
import { exportToExcel, exportToPdfReport } from '../../utils/excelIntegration';
import { Modal } from '../common/Modal';
import { EasyGuideBanner } from '../common/EasyGuideBanner';

export const ProductionTable: React.FC = () => {
  const {
    orders,
    addOrder,
    updateOrder,
    deleteOrder,
    updateOrderStatus,
    createJobCardFromOrder,
    materials,
    vendors,
    customers,
    projects,
    setActiveTab,
  } = useERP();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterProject, setFilterProject] = useState('ALL');
  const [filterVendor, setFilterVendor] = useState('ALL');
  const [filterMachine, setFilterMachine] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterMaterial, setFilterMaterial] = useState('ALL');

  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [selectedOrderForTrace, setSelectedOrderForTrace] = useState<ManufacturingOrderItem | null>(null);

  // New order form state
  const [newOrder, setNewOrder] = useState({
    poNumber: '36',
    customer: 'Cadila Healthcare Ltd (Zydus)',
    vendor: 'Manav Metal',
    machineType: 'Mono Conveyor' as MachineCategory,
    project: 'FOHA',
    drawingRef: 'DWG-RSB-MC-0485',
    materialType: 'SS Flat' as MaterialType,
    sizeSpecs: '80 x 6 x 485',
    quantity: 2,
    unit: 'Nos',
    deliveryDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
    orderSource: 'Customer PO',
    status: 'Pending' as ProductionStatus,
    unitRate: 450,
    notes: '',
  });

  // Filter logic
  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.sizeSpecs.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      o.drawingRef.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProject = filterProject === 'ALL' || o.project === filterProject;
    const matchesVendor = filterVendor === 'ALL' || o.vendor === filterVendor;
    const matchesMachine = filterMachine === 'ALL' || o.machineType === filterMachine;
    const matchesStatus = filterStatus === 'ALL' || o.status === filterStatus;
    const matchesMaterial = filterMaterial === 'ALL' || o.materialType === filterMaterial;

    return matchesSearch && matchesProject && matchesVendor && matchesMachine && matchesStatus && matchesMaterial;
  });

  // Export handlers
  const handleExportExcel = () => {
    const dataToExport = filteredOrders.map(o => ({
      'Order No': o.orderNumber,
      'PO No': o.poNumber,
      'Date': o.date,
      'Customer': o.customer,
      'Material Type': o.materialType,
      'Size Specifications': o.sizeSpecs,
      'Quantity': `${o.quantity} ${o.unit}`,
      'Vendor': o.vendor,
      'Machine Type': o.machineType,
      'Project': o.project,
      'Order Source': o.orderSource,
      'Inward Qty': o.inwardQty,
      'Outward Qty': o.outwardQty,
      'Current Stock': o.currentStock,
      'Drawing Ref': o.drawingRef,
      'Status': o.status,
      'Delivery Date': o.deliveryDate,
    }));
    exportToExcel(dataToExport, `RSB_Production_Orders_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPdf = () => {
    const headers = ['Order / PO', 'Material Specs', 'Qty', 'Vendor', 'Machine', 'Project', 'Status', 'Delivery'];
    const rows = filteredOrders.map(o => [
      `${o.orderNumber} (PO ${o.poNumber})`,
      `${o.materialType} ${o.sizeSpecs}`,
      `${o.quantity} ${o.unit}`,
      o.vendor,
      o.machineType,
      o.project,
      o.status,
      o.deliveryDate,
    ]);
    exportToPdfReport('RSB Manufacturing Orders Master Report', headers, rows, 'RSB_Production_Orders');
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const orderNumber = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    addOrder({
      ...newOrder,
      orderNumber,
      date: new Date().toISOString().split('T')[0],
      totalAmount: newOrder.quantity * newOrder.unitRate,
      inwardQty: 0,
      outwardQty: 0,
      currentStock: 0,
    });
    setIsNewOrderModalOpen(false);
  };

  const handleGenerateJobCard = (order: ManufacturingOrderItem) => {
    const jc = createJobCardFromOrder(order);
    alert(`Job Card ${jc.jobCardNo} generated for order ${order.orderNumber}! Navigating to Job Cards module.`);
    setActiveTab('production');
  };

  // Extract unique filter dropdown values
  const uniqueProjects = Array.from(new Set(orders.map(o => o.project)));
  const uniqueVendors = Array.from(new Set(orders.map(o => o.vendor)));
  const uniqueMachines = Array.from(new Set(orders.map(o => o.machineType)));

  return (
    <div className="space-y-4">
      {/* Friendly Guide Banner */}
      <EasyGuideBanner
        moduleName="Production Master Table"
        hindiTitle="मास्टर उत्पादन तालिका (PO 36 व ऑर्डर्स)"
        paperEquivalent="Master Production Register / मुख्य ऑर्डर बही"
        whatItDoes="This is your master order schedule tracking each customer PO (e.g. Cadila PO #36 for FOHA machine) and every individual part required."
        howToAdd="Click '+ Add Order Row' to enter a new PO requirement, drawing reference, and quantity needed."
        autoBenefit="You can trace the entire lifecycle of each part with 1 click: Raw Material PO ➔ Inward Arrival ➔ Godown Stock ➔ Machine Job Card ➔ Outward Dispatch."
        defaultExpanded={false}
      />

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              RSB Main Production & Master Control Table
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
              {filteredOrders.length} Records
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Complete material traceability: Vendor PO &rarr; Inward &rarr; Inventory Stock &rarr; Job Card &rarr; Outward &rarr; Dispatch
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsNewOrderModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Order Row
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-xl transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel (.XLSX)
          </button>
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition-all"
          >
            <FileText className="w-4 h-4" /> PDF Report
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by PO No, Material, Size Specs, Customer, Project (e.g. 36, 80 x 6 x 485, FOHA)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
            />
          </div>

          {/* Quick Filter Selects */}
          <div className="flex gap-2 flex-wrap items-center">
            {/* Project Filter */}
            <select
              value={filterProject}
              onChange={(e) => setFilterProject(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 font-medium focus:outline-hidden"
            >
              <option value="ALL">All Projects</option>
              {uniqueProjects.map((p) => (
                <option key={p} value={p}>
                  Project: {p}
                </option>
              ))}
            </select>

            {/* Vendor Filter */}
            <select
              value={filterVendor}
              onChange={(e) => setFilterVendor(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 font-medium focus:outline-hidden"
            >
              <option value="ALL">All Vendors</option>
              {uniqueVendors.map((v) => (
                <option key={v} value={v}>
                  Vendor: {v}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-200 font-medium focus:outline-hidden"
            >
              <option value="ALL">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Material Ready">Material Ready</option>
              <option value="In Production">In Production</option>
              <option value="QC">QC Inspection</option>
              <option value="Ready For Dispatch">Ready For Dispatch</option>
              <option value="Completed">Completed</option>
            </select>

            {(filterProject !== 'ALL' || filterVendor !== 'ALL' || filterStatus !== 'ALL' || searchTerm) && (
              <button
                onClick={() => {
                  setFilterProject('ALL');
                  setFilterVendor('ALL');
                  setFilterMachine('ALL');
                  setFilterStatus('ALL');
                  setFilterMaterial('ALL');
                  setSearchTerm('');
                }}
                className="px-3 py-2 text-xs text-rose-400 hover:underline font-semibold"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main RSB Master Production Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-700/80 bg-slate-850 text-slate-300 font-bold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-3.5">Material Type</th>
                <th className="py-3 px-3.5">Size Specifications</th>
                <th className="py-3 px-3 text-center">Qty</th>
                <th className="py-3 px-3.5">Vendor</th>
                <th className="py-3 px-3.5">Machine Type</th>
                <th className="py-3 px-3.5">Project</th>
                <th className="py-3 px-3">Order Source</th>
                <th className="py-3 px-3 text-center font-mono">PO No</th>
                <th className="py-3 px-3 text-center text-emerald-400">Inward</th>
                <th className="py-3 px-3 text-center text-purple-400">Outward</th>
                <th className="py-3 px-3 text-center text-blue-400">Stock</th>
                <th className="py-3 px-3.5 text-center">Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-medium text-slate-300">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={13} className="py-12 text-center text-slate-500">
                    No manufacturing orders match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isLowStock = order.currentStock <= 5;
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-800/50 transition-colors group"
                    >
                      {/* 1. Material Type */}
                      <td className="py-3 px-3.5">
                        <span className="font-bold text-slate-100 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          {order.materialType}
                        </span>
                        <span className="text-[10px] text-slate-500 block font-mono">
                          {order.orderNumber}
                        </span>
                      </td>

                      {/* 2. Size Specifications */}
                      <td className="py-3 px-3.5 font-mono text-cyan-300 font-bold">
                        {order.sizeSpecs}
                        {order.drawingRef && (
                          <span className="text-[10px] text-slate-500 block font-normal">
                            Dwg: {order.drawingRef}
                          </span>
                        )}
                      </td>

                      {/* 3. Quantity */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-100">
                        {order.quantity} <span className="text-[10px] font-normal text-slate-400">{order.unit}</span>
                      </td>

                      {/* 4. Vendor */}
                      <td className="py-3 px-3.5">
                        <span className="text-amber-300 font-semibold">{order.vendor}</span>
                      </td>

                      {/* 5. Machine Type */}
                      <td className="py-3 px-3.5 text-slate-300">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[11px]">
                          {order.machineType}
                        </span>
                      </td>

                      {/* 6. Project */}
                      <td className="py-3 px-3.5">
                        <span className="font-bold text-white block">{order.project}</span>
                        <span className="text-[10px] text-slate-400 truncate max-w-[120px] block">
                          {order.customer}
                        </span>
                      </td>

                      {/* 7. Order Source */}
                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        {order.orderSource}
                      </td>

                      {/* 8. PO No */}
                      <td className="py-3 px-3 text-center font-mono font-bold text-amber-400">
                        {order.poNumber}
                      </td>

                      {/* 9. Inward Qty */}
                      <td className="py-3 px-3 text-center font-mono font-semibold text-emerald-400 bg-emerald-500/5">
                        {order.inwardQty}
                      </td>

                      {/* 10. Outward Qty */}
                      <td className="py-3 px-3 text-center font-mono font-semibold text-purple-400 bg-purple-500/5">
                        {order.outwardQty}
                      </td>

                      {/* 11. Current Stock */}
                      <td className="py-3 px-3 text-center font-mono font-bold">
                        <span className={isLowStock ? 'text-rose-400' : 'text-blue-400'}>
                          {order.currentStock}
                        </span>
                      </td>

                      {/* 12. Status with Inline Quick Change */}
                      <td className="py-3 px-3.5 text-center">
                        <select
                          value={order.status}
                          onChange={(e) => updateOrderStatus(order.id, e.target.value as any)}
                          className="bg-transparent text-xs font-semibold rounded-lg focus:outline-hidden cursor-pointer"
                        >
                          <option value="Pending" className="bg-slate-900 text-blue-400">Pending</option>
                          <option value="Material Ready" className="bg-slate-900 text-amber-400">Material Ready</option>
                          <option value="In Production" className="bg-slate-900 text-cyan-400">In Production</option>
                          <option value="QC" className="bg-slate-900 text-amber-300">QC Inspection</option>
                          <option value="Ready For Dispatch" className="bg-slate-900 text-purple-400">Ready For Dispatch</option>
                          <option value="Completed" className="bg-slate-900 text-emerald-400">Completed</option>
                        </select>
                      </td>

                      {/* 13. Actions */}
                      <td className="py-3 px-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Generate Job Card */}
                          <button
                            onClick={() => handleGenerateJobCard(order)}
                            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-colors"
                            title="Generate Physical Job Card with Barcode"
                          >
                            <HardHat className="w-3.5 h-3.5" />
                          </button>

                          {/* Traceability Modal */}
                          <button
                            onClick={() => setSelectedOrderForTrace(order)}
                            className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 transition-colors"
                            title="View Lifecycle Material Traceability"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => {
                              if (confirm(`Delete order ${order.orderNumber}?`)) {
                                deleteOrder(order.id);
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 transition-colors"
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
      </div>

      {/* MODAL 1: ADD NEW ORDER ROW */}
      <Modal
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        title="Add New Manufacturing Order"
        subtitle="Record PO specifications for RSB production scheduling"
        maxWidth="3xl"
      >
        <form onSubmit={handleCreateOrder} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Customer PO No *
              </label>
              <input
                type="text"
                required
                value={newOrder.poNumber}
                onChange={(e) => setNewOrder({ ...newOrder, poNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                placeholder="36"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Customer Name *
              </label>
              <select
                value={newOrder.customer}
                onChange={(e) => setNewOrder({ ...newOrder, customer: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Raw Material Vendor *
              </label>
              <select
                value={newOrder.vendor}
                onChange={(e) => setNewOrder({ ...newOrder, vendor: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.name}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Project Name *
              </label>
              <input
                type="text"
                required
                value={newOrder.project}
                onChange={(e) => setNewOrder({ ...newOrder, project: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                placeholder="FOHA"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Machine Type *
              </label>
              <select
                value={newOrder.machineType}
                onChange={(e) => setNewOrder({ ...newOrder, machineType: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
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
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Drawing Reference
              </label>
              <input
                type="text"
                value={newOrder.drawingRef}
                onChange={(e) => setNewOrder({ ...newOrder, drawingRef: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                placeholder="DWG-RSB-MC-0485"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Material Type *
              </label>
              <select
                value={newOrder.materialType}
                onChange={(e) => setNewOrder({ ...newOrder, materialType: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              >
                <option value="SS Flat">SS Flat</option>
                <option value="SS Pipe">SS Pipe</option>
                <option value="SS Circle">SS Circle</option>
                <option value="SS Bar">SS Bar</option>
                <option value="SS Sheet">SS Sheet</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Size Specifications *
              </label>
              <input
                type="text"
                required
                value={newOrder.sizeSpecs}
                onChange={(e) => setNewOrder({ ...newOrder, sizeSpecs: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                placeholder="80 x 6 x 485"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Quantity *
              </label>
              <input
                type="number"
                min="1"
                required
                value={newOrder.quantity}
                onChange={(e) => setNewOrder({ ...newOrder, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Delivery Target Date *
              </label>
              <input
                type="date"
                required
                value={newOrder.deliveryDate}
                onChange={(e) => setNewOrder({ ...newOrder, deliveryDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Order Source
              </label>
              <input
                type="text"
                value={newOrder.orderSource}
                onChange={(e) => setNewOrder({ ...newOrder, orderSource: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                placeholder="Customer PO"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Initial Production Status
              </label>
              <select
                value={newOrder.status}
                onChange={(e) => setNewOrder({ ...newOrder, status: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              >
                <option value="Pending">Pending</option>
                <option value="Material Ready">Material Ready</option>
                <option value="In Production">In Production</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsNewOrderModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md"
            >
              Save Order to Main Table
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: COMPLETE MATERIAL TRACEABILITY AUDIT */}
      <Modal
        isOpen={!!selectedOrderForTrace}
        onClose={() => setSelectedOrderForTrace(null)}
        title="Complete Material & Order Traceability Flow"
        subtitle={`Audit trail for ${selectedOrderForTrace?.orderNumber} (PO ${selectedOrderForTrace?.poNumber})`}
        maxWidth="3xl"
      >
        {selectedOrderForTrace && (
          <div className="space-y-6">
            {/* Quick Summary Strip */}
            <div className="p-4 rounded-xl bg-slate-850 border border-slate-700 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-400">Material Spec:</span>
                <p className="font-bold text-cyan-300 font-mono mt-0.5">
                  {selectedOrderForTrace.materialType} {selectedOrderForTrace.sizeSpecs}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Target Project:</span>
                <p className="font-bold text-white mt-0.5">{selectedOrderForTrace.project}</p>
              </div>
              <div>
                <span className="text-slate-400">Vendor:</span>
                <p className="font-bold text-amber-300 mt-0.5">{selectedOrderForTrace.vendor}</p>
              </div>
              <div>
                <span className="text-slate-400">Current Status:</span>
                <div className="mt-0.5">
                  <StatusBadge status={selectedOrderForTrace.status} size="sm" />
                </div>
              </div>
            </div>

            {/* Traceability Flow Steps */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                End-to-End Lifecycle Stages
              </h4>

              <div className="relative border-l-2 border-slate-700 ml-4 pl-6 space-y-6">
                {/* Step 1: Procurement */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900" />
                  <h5 className="text-xs font-bold text-slate-200">1. Purchase Order & Vendor Sourcing</h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    PO {selectedOrderForTrace.poNumber} placed with {selectedOrderForTrace.vendor} for raw material supply.
                  </p>
                </div>

                {/* Step 2: Inward */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-slate-900" />
                  <h5 className="text-xs font-bold text-slate-200">2. Material Inward Receipt & Gate Inward</h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Received {selectedOrderForTrace.inwardQty} {selectedOrderForTrace.unit}. Raw material stock verified and automatically updated in Store inventory.
                  </p>
                </div>

                {/* Step 3: Production */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-cyan-500 border-2 border-slate-900 animate-pulse" />
                  <h5 className="text-xs font-bold text-cyan-300">3. Shop Floor Production & Job Card Routing</h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Component routing on {selectedOrderForTrace.machineType} cell as per drawing {selectedOrderForTrace.drawingRef}.
                  </p>
                </div>

                {/* Step 4: Quality Check */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-amber-500 border-2 border-slate-900" />
                  <h5 className="text-xs font-bold text-slate-200">4. Dimensional Quality Inspection</h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Vernier/micrometer dimensional tolerance and Ra surface finish verification.
                  </p>
                </div>

                {/* Step 5: Outward & Dispatch */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-purple-500 border-2 border-slate-900" />
                  <h5 className="text-xs font-bold text-slate-200">5. Outward Dispatch & Customer Delivery</h5>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Dispatched to {selectedOrderForTrace.customer} with Tax Invoice & Delivery Challan. Stock deducted upon exit.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setSelectedOrderForTrace(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold"
              >
                Close Audit View
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
