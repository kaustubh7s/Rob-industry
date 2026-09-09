import React, { useState } from 'react';
import {
  Send,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  CheckCircle2,
  Truck,
  FileSpreadsheet,
  FileText,
  User,
  Phone,
  FileCheck,
  Eye,
  Sparkles,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { OutwardEntry, OutwardStatus } from '../../types/erp';
import { StatusBadge } from '../common/StatusBadge';
import { exportToExcel, exportToPdfReport } from '../../utils/excelIntegration';
import { Modal } from '../common/Modal';
import { EasyGuideBanner } from '../common/EasyGuideBanner';
import { PrintableSlipModal } from '../common/PrintableSlipModal';
import { DispatchReadyItem } from '../../types/erp';

interface OutwardManagementProps {
  onOpenQuickAction?: (action?: 'order' | 'inward' | 'outward' | 'job' | 'qc') => void;
}

export const OutwardManagement: React.FC<OutwardManagementProps> = ({ onOpenQuickAction }) => {
  const {
    outwardEntries,
    addOutwardEntry,
    updateOutwardStatus,
    deleteOutwardEntry,
    customers,
    projects,
    dispatchReadyItems,
  } = useERP();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const [isNewOutwardModalOpen, setIsNewOutwardModalOpen] = useState(false);
  const [printChallanData, setPrintChallanData] = useState<OutwardEntry | null>(null);
  const [selectedDispatchReadyId, setSelectedDispatchReadyId] = useState<string>('');

  // Form state
  const [form, setForm] = useState({
    dispatchDate: new Date().toISOString().split('T')[0],
    customer: 'Cadila Healthcare Ltd (Zydus)',
    project: 'FOHA High-Speed Conveyor & Cap Line',
    material: 'SS Flat 80 x 6 x 485 (Conveyor Guide Rails)',
    quantity: 2,
    unit: 'Nos',
    vehicleNumber: 'GJ-01-CZ-8890',
    driverName: 'Ramu K. Yadav',
    driverPhone: '+91 98254 99001',
    invoiceNumber: 'RSB-INV-2026-118',
    dispatchPerson: 'Ramesh Patel',
    deliveryStatus: 'Dispatched' as OutwardStatus,
    transporter: 'Gujarat Golden Transport',
    eWayBillNo: '241982736500',
  });

  const handleSelectDispatchReadyItem = (item: DispatchReadyItem) => {
    setSelectedDispatchReadyId(item.id);
    setForm({
      ...form,
      customer: item.customerName,
      project: item.projectName,
      material: item.material,
      quantity: item.quantity,
      unit: item.unit,
      invoiceNumber: item.invoiceNumber || `RSB-INV-2026-${Math.floor(100 + Math.random() * 900)}`,
    });
  };

  const applyOutwardPreset = (customerType: 'cadila' | 'torrent' | 'intas') => {
    if (customerType === 'cadila') {
      setForm({
        ...form,
        customer: 'Cadila Healthcare Ltd (Zydus)',
        project: 'FOHA High-Speed Conveyor & Cap Line',
        material: 'SS Flat 80 x 6 x 485 (Conveyor Guide Rails)',
        quantity: 2,
        vehicleNumber: 'GJ-01-CZ-8890',
        driverName: 'Ramu K. Yadav',
        invoiceNumber: `RSB-INV-2026-${Math.floor(100 + Math.random() * 900)}`,
        eWayBillNo: '241982736500',
      });
    } else if (customerType === 'torrent') {
      setForm({
        ...form,
        customer: 'Torrent Pharmaceuticals',
        project: 'Liquid Syrup Washing Line',
        material: 'SS Pipe OD 106 x ID 75 x 110 (Manifold)',
        quantity: 4,
        vehicleNumber: 'GJ-27-TT-4412',
        driverName: 'Suresh Kumar',
        invoiceNumber: `RSB-INV-2026-${Math.floor(100 + Math.random() * 900)}`,
        eWayBillNo: '248871920199',
      });
    } else {
      setForm({
        ...form,
        customer: 'Intas Pharmaceuticals Ltd',
        project: 'Vial Filling Machine',
        material: 'SS 316 Starwheel Assembly (Custom)',
        quantity: 1,
        vehicleNumber: 'GJ-06-BB-1092',
        driverName: 'Dilip Varma',
        invoiceNumber: `RSB-INV-2026-${Math.floor(100 + Math.random() * 900)}`,
        eWayBillNo: '249918273412',
      });
    }
  };

  const filteredOutward = outwardEntries.filter((item) => {
    const matchesSearch =
      item.outwardNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.material.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCustomer = filterCustomer === 'ALL' || item.customer === filterCustomer;
    const matchesStatus = filterStatus === 'ALL' || item.deliveryStatus === filterStatus;

    return matchesSearch && matchesCustomer && matchesStatus;
  });

  // Analytics Metrics
  const totalOutwardCount = outwardEntries.length;
  const deliveredCount = outwardEntries.filter(o => o.deliveryStatus === 'Delivered').length;
  const inTransitCount = outwardEntries.filter(o => o.deliveryStatus === 'Dispatched').length;
  const readyCount = outwardEntries.filter(o => o.deliveryStatus === 'Ready').length;

  const handleExportExcel = () => {
    const exportData = filteredOutward.map(o => ({
      'Outward No': o.outwardNumber,
      'Dispatch Date': o.dispatchDate,
      'Customer': o.customer,
      'Project': o.project,
      'Material': o.material,
      'Quantity': `${o.quantity} ${o.unit}`,
      'Vehicle No': o.vehicleNumber,
      'Driver': o.driverName,
      'Transporter': o.transporter,
      'Invoice No': o.invoiceNumber,
      'E-Way Bill': o.eWayBillNo,
      'Delivery Status': o.deliveryStatus,
      'Dispatch Person': o.dispatchPerson,
    }));
    exportToExcel(exportData, `RSB_Outward_Register_${new Date().toISOString().split('T')[0]}`);
  };

  const handleCreateOutward = (e: React.FormEvent) => {
    e.preventDefault();
    const outwardNumber = `OUT-2026-${Math.floor(100 + Math.random() * 900)}`;
    addOutwardEntry({
      ...form,
      outwardNumber,
    });
    alert(`Outward Dispatch ${outwardNumber} recorded successfully!`);
    setIsNewOutwardModalOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Friendly Guide Banner */}
      <EasyGuideBanner
        moduleName="Outward & Dispatch Register"
        hindiTitle="जावक चालान रजिस्टर"
        paperEquivalent="Dispatch Book / डिलीवरी चालान बही"
        whatItDoes="This register tracks all finished parts and machines leaving the factory loaded into delivery tempos, trucks, or customer pickups."
        howToAdd="When parts are ready to ship, click '+ New Dispatch Challan'. Enter vehicle number, driver name, and customer address."
        autoBenefit="When you mark status as 'Dispatched', the finished inventory is automatically deducted from your Godown Stock. Click the Print icon for a paper gate pass."
        defaultExpanded={false}
      />

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950/20 to-slate-900 border border-slate-700 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                4. Outward & Dispatch Register (जावक चालान)
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono">
                  CHALLAN & GATE PASS
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Generate delivery challans, vehicle gate passes, and track customer delivery status.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsNewOutwardModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ New Dispatch Challan (जावक चालान)</span>
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition-all"
            title="Export Outward Register to Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden md:inline">Excel</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div
          onClick={() => setFilterStatus('ALL')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            filterStatus === 'ALL'
              ? 'bg-slate-850 border-blue-500 ring-1 ring-blue-500'
              : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Total Dispatches</span>
            <Send className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-white font-mono">{totalOutwardCount}</span>
            <span className="text-[10px] text-slate-400">Challans</span>
          </div>
          <div className="text-[10px] text-purple-400 font-mono mt-0.5">Cadila, Torrent, Intas</div>
        </div>

        <div
          onClick={() => setFilterStatus('Dispatched')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            filterStatus === 'Dispatched'
              ? 'bg-slate-850 border-purple-500 ring-1 ring-purple-500'
              : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">In Transit (रास्ते में)</span>
            <Truck className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-purple-400 font-mono">{inTransitCount}</span>
            <span className="text-[10px] text-purple-400 font-semibold">On Road</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Stock auto-deducted</div>
        </div>

        <div
          onClick={() => setFilterStatus('Delivered')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            filterStatus === 'Delivered'
              ? 'bg-slate-850 border-emerald-500 ring-1 ring-emerald-500'
              : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Delivered (पहुँच गया)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-emerald-400 font-mono">{deliveredCount}</span>
            <span className="text-[10px] text-emerald-400 font-semibold">Completed</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Customer received</div>
        </div>

        <div
          onClick={() => setFilterStatus('Ready')}
          className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
            filterStatus === 'Ready'
              ? 'bg-slate-850 border-amber-500 ring-1 ring-amber-500'
              : 'bg-slate-900 border-slate-800 hover:bg-slate-850'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Ready in Factory (तैयार)</span>
            <FileCheck className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-amber-400 font-mono">{readyCount}</span>
            <span className="text-[10px] text-amber-400 font-semibold">Ready to Load</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Awaiting vehicle dispatch</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search outward no, customer, vehicle, material..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:border-purple-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={filterCustomer}
            onChange={(e) => setFilterCustomer(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-hidden"
          >
            <option value="ALL">All Customers (सभी ग्राहक)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Outward Register Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-700/80 bg-slate-850 text-slate-300 font-bold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-3.5">Outward No & Date</th>
                <th className="py-3 px-3.5">Customer & Project</th>
                <th className="py-3 px-3.5">Material Dispatched</th>
                <th className="py-3 px-3 text-center">Qty</th>
                <th className="py-3 px-3">Vehicle & Driver</th>
                <th className="py-3 px-3">Invoice & E-Way</th>
                <th className="py-3 px-3.5 text-center">Delivery Status</th>
                <th className="py-3 px-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-medium text-slate-300">
              {filteredOutward.map((out) => (
                <tr key={out.id} className="hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-3.5">
                    <span className="font-mono font-bold text-purple-400 block">{out.outwardNumber}</span>
                    <span className="text-[10px] text-slate-500">{out.dispatchDate}</span>
                  </td>

                  <td className="py-3 px-3.5">
                    <span className="font-bold text-white block">{out.customer}</span>
                    <span className="text-[10px] text-cyan-400 font-semibold">{out.project}</span>
                  </td>

                  <td className="py-3 px-3.5 font-semibold text-slate-200">
                    {out.material}
                  </td>

                  <td className="py-3 px-3 text-center font-mono font-bold text-slate-100">
                    {out.quantity} <span className="text-[10px] font-normal text-slate-400">{out.unit}</span>
                  </td>

                  <td className="py-3 px-3 font-mono font-bold text-amber-300 uppercase">
                    {out.vehicleNumber}
                    <span className="text-[10px] text-slate-400 block font-sans font-normal">
                      {out.driverName}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-slate-400 text-[11px]">
                    <div>Inv: <span className="text-slate-200 font-mono">{out.invoiceNumber}</span></div>
                    {out.eWayBillNo && (
                      <div className="text-[10px]">E-Way: <span className="text-slate-300 font-mono">{out.eWayBillNo}</span></div>
                    )}
                  </td>

                  <td className="py-3 px-3.5 text-center">
                    <select
                      value={out.deliveryStatus}
                      onChange={(e) => updateOutwardStatus(out.id, e.target.value as any)}
                      className={`text-xs font-bold rounded-lg px-2 py-1 border cursor-pointer ${
                        out.deliveryStatus === 'Dispatched'
                          ? 'bg-purple-950/60 text-purple-300 border-purple-500/40'
                          : out.deliveryStatus === 'Delivered'
                          ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      <option value="Dispatched" className="bg-slate-900 text-purple-400">Dispatched (In-Transit)</option>
                      <option value="Ready" className="bg-slate-900 text-amber-400">Ready in Factory</option>
                      <option value="Delivered" className="bg-slate-900 text-emerald-400">Delivered</option>
                      <option value="Returned" className="bg-slate-900 text-rose-400">Returned</option>
                    </select>
                  </td>

                  <td className="py-3 px-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setPrintChallanData(out)}
                        className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 transition-colors"
                        title="Print Delivery Challan & Gate Pass"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          if (confirm(`Delete dispatch record ${out.outwardNumber}?`)) {
                            deleteOutwardEntry(out.id);
                          }
                        }}
                        className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
                        title="Delete Record"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: NEW OUTWARD DISPATCH */}
      <Modal
        isOpen={isNewOutwardModalOpen}
        onClose={() => setIsNewOutwardModalOpen(false)}
        title="Record Outward Material Dispatch (जावक चालान दर्ज करें)"
        subtitle="Generate delivery challan and log vehicle dispatch details"
        maxWidth="3xl"
      >
        <form onSubmit={handleCreateOutward} className="space-y-4">
          {/* Synced QC-Passed Finished Goods Ready for Dispatch */}
          <div className="p-3.5 rounded-xl bg-slate-800/90 border border-purple-500/40 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-black text-purple-300 uppercase tracking-wide flex items-center gap-1.5">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                </span>
                ✅ Select QC-Cleared Finished Goods (QC पास माल - 1-Click Dispatch Challan):
              </label>
              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
                {dispatchReadyItems.length} Lots Cleared
              </span>
            </div>

            <select
              value={selectedDispatchReadyId}
              onChange={(e) => {
                const found = dispatchReadyItems.find((d) => d.id === e.target.value);
                if (found) {
                  handleSelectDispatchReadyItem(found);
                }
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold focus:border-purple-500 focus:outline-hidden"
            >
              <option value="">-- Pick from QC-Passed Factory Finished Orders ({dispatchReadyItems.length} Available) --</option>
              {dispatchReadyItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.jobCardNo} • {item.material} — {item.customerName} ({item.quantity} {item.unit}) [QC Cert: {item.qcInspectionNo}]
                </option>
              ))}
            </select>

            {/* Quick Chips of QC cleared items */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] font-bold text-slate-400">Quick Select:</span>
              {dispatchReadyItems.slice(0, 3).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectDispatchReadyItem(item)}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-medium border transition-colors ${
                    selectedDispatchReadyId === item.id
                      ? 'bg-purple-500/30 text-purple-300 border-purple-400'
                      : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  🚚 {item.jobCardNo} ({item.customerName.split(' ')[0]})
                </button>
              ))}
            </div>
          </div>

          {/* 1-Click Fast Presets */}
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                ⚡ Or Use Fast Presets (ऑटो-फिल उदाहरण):
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Click to test instant fill</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => applyOutwardPreset('cadila')}
                className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-purple-600/30 hover:border-purple-500 text-slate-200 hover:text-purple-300 text-[11px] font-medium border border-slate-600 transition-colors"
              >
                🚚 Cadila FOHA Guide Rails
              </button>
              <button
                type="button"
                onClick={() => applyOutwardPreset('torrent')}
                className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-purple-600/30 hover:border-purple-500 text-slate-200 hover:text-purple-300 text-[11px] font-medium border border-slate-600 transition-colors"
              >
                🚚 Torrent Washing Line Manifold
              </button>
              <button
                type="button"
                onClick={() => applyOutwardPreset('intas')}
                className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-purple-600/30 hover:border-purple-500 text-slate-200 hover:text-purple-300 text-[11px] font-medium border border-slate-600 transition-colors"
              >
                🚚 Intas Vial Filling Starwheel
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Customer Name (ग्राहक) *
              </label>
              <select
                value={form.customer}
                onChange={(e) => setForm({ ...form, customer: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:border-purple-500 focus:outline-hidden"
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
                Project Name *
              </label>
              <input
                type="text"
                required
                value={form.project}
                onChange={(e) => setForm({ ...form, project: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                placeholder="FOHA Conveyor Line"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Dispatch Date *
              </label>
              <input
                type="date"
                required
                value={form.dispatchDate}
                onChange={(e) => setForm({ ...form, dispatchDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Material Description *
              </label>
              <input
                type="text"
                required
                value={form.material}
                onChange={(e) => setForm({ ...form, material: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                placeholder="SS Flat 80 x 6 x 485"
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
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Vehicle Number (गाड़ी नंबर) *
              </label>
              <input
                type="text"
                required
                value={form.vehicleNumber}
                onChange={(e) => setForm({ ...form, vehicleNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono uppercase"
                placeholder="GJ-01-CZ-8890"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Driver Name (चालक)
              </label>
              <input
                type="text"
                value={form.driverName}
                onChange={(e) => setForm({ ...form, driverName: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                placeholder="Ramu Yadav"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Invoice Number
              </label>
              <input
                type="text"
                value={form.invoiceNumber}
                onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                placeholder="RSB-INV-2026-118"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsNewOutwardModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Record Dispatch (जावक दर्ज करें)</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* PRINTABLE SLIP MODAL */}
      <PrintableSlipModal
        isOpen={!!printChallanData}
        onClose={() => setPrintChallanData(null)}
        type="outward"
        data={printChallanData}
      />
    </div>
  );
};
