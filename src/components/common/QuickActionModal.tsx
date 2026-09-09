import React, { useState } from 'react';
import {
  Plus,
  Layers,
  Truck,
  Send,
  HardHat,
  ShieldCheck,
  Package,
  Calculator,
  X,
  CheckCircle2,
  FileText,
  Wrench,
  Zap,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { ProductionStatus, MaterialType, MachineCategory, InwardStatus, OutwardStatus } from '../../types/erp';
import { autoCalculateWeightFromSpec } from '../../utils/calculations';

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialAction?: 'order' | 'inward' | 'outward' | 'job' | 'qc';
}

export const QuickActionModal: React.FC<QuickActionModalProps> = ({
  isOpen,
  onClose,
  initialAction = 'inward',
}) => {
  const {
    addOrder,
    addInwardEntry,
    addOutwardEntry,
    addJobCard,
    addQCInspection,
    materials,
    vendors,
    customers,
    projects,
    machines,
    orders,
    activeProcessingMaterials,
    dispatchReadyItems,
    availableStockMaterials,
  } = useERP();

  const [activeAction, setActiveAction] = useState<'order' | 'inward' | 'outward' | 'job' | 'qc'>(initialAction);

  // Sync initialAction when modal opens
  React.useEffect(() => {
    if (initialAction) setActiveAction(initialAction);
  }, [initialAction, isOpen]);

  // Form states for New Order
  const [orderForm, setOrderForm] = useState({
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
    deliveryDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    orderSource: 'Customer PO',
    status: 'Pending' as ProductionStatus,
    unitRate: 450,
  });

  // Form states for New Inward
  const [inwardForm, setInwardForm] = useState({
    date: new Date().toISOString().split('T')[0],
    vendor: 'Manav Metal',
    poNumber: 'PO-2026-036',
    challanNumber: 'MM-CH-5012',
    invoiceNumber: 'MM-INV-1002',
    materialType: 'SS Flat' as MaterialType,
    sizeSpecs: '80 x 6 x 485',
    quantity: 10,
    unit: 'Nos',
    weightKg: 18.5,
    receivedBy: 'Ramesh Patel',
    qualityStatus: 'Approved' as InwardStatus,
    remarks: 'Visual and thickness gauge checked OK',
  });

  // Form states for Outward
  const [outwardForm, setOutwardForm] = useState({
    dispatchDate: new Date().toISOString().split('T')[0],
    customer: 'Cadila Healthcare Ltd (Zydus)',
    project: 'FOHA',
    material: 'SS Flat 80 x 6 x 485 (Guide Rails)',
    quantity: 2,
    unit: 'Nos',
    vehicleNumber: 'GJ-01-CZ-9912',
    driverName: 'Ramu Yadav',
    driverPhone: '+91 98250 88991',
    invoiceNumber: 'RSB-INV-2026-118',
    dispatchPerson: 'Ramesh Patel',
    deliveryStatus: 'Dispatched' as OutwardStatus,
    transporter: 'Gujarat Golden Transport',
    eWayBillNo: '241982736500',
  });

  // Form states for Job Card
  const [jobForm, setJobForm] = useState({
    orderNumber: 'ORD-1001',
    project: 'FOHA',
    partName: 'Guide Rail Bracket (SS Flat)',
    drawingRef: 'DWG-RSB-MC-0485',
    targetQuantity: 2,
    materialAllocated: 'SS Flat 80 x 6 x 485',
    assignedMachine: 'CNC Lathe 01 (LMW LL20T)',
    operator: 'Kailash Sharma',
    targetDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
    status: 'Cutting' as const,
  });

  // Form states for QC Inspection
  const [qcForm, setQCForm] = useState({
    referenceType: 'Job Card',
    referenceNumber: 'JOB-2026-042',
    itemDescription: 'SS Flat Guide Rails (80 x 6 x 485)',
    inspectedQuantity: 2,
    passedQuantity: 2,
    rejectedQuantity: 0,
    inspector: 'Bharat Panchal (QC Lead)',
    status: 'Passed' as const,
    remarks: 'Dimensions within ±0.05mm tolerance. Ra 0.8 smooth finish OK.',
  });

  if (!isOpen) return null;

  // Preset Handlers
  const applyInwardPreset = (type: 'flat' | 'pipe' | 'sheet') => {
    if (type === 'flat') {
      const spec = '80 x 6 x 485';
      const qty = 20;
      const weight = autoCalculateWeightFromSpec('SS Flat', spec, 'SS 304', qty) || 36.8;
      setInwardForm({
        ...inwardForm,
        vendor: 'Manav Metal',
        materialType: 'SS Flat',
        sizeSpecs: spec,
        quantity: qty,
        weightKg: Number(weight.toFixed(2)),
        poNumber: 'PO-2026-036',
        challanNumber: `MM-${Math.floor(1000 + Math.random() * 9000)}`,
      });
    } else if (type === 'pipe') {
      const spec = 'OD 106 x ID 75 x 110';
      const qty = 10;
      const weight = autoCalculateWeightFromSpec('SS Pipe', spec, 'SS 304', qty) || 38.5;
      setInwardForm({
        ...inwardForm,
        vendor: 'Jindal Stainless Steel',
        materialType: 'SS Pipe',
        sizeSpecs: spec,
        quantity: qty,
        weightKg: Number(weight.toFixed(2)),
        poNumber: 'PO-2026-036',
        challanNumber: `JND-${Math.floor(1000 + Math.random() * 9000)}`,
      });
    } else {
      const spec = '1220 x 2440 x 3.0';
      const qty = 2;
      const weight = 142.5;
      setInwardForm({
        ...inwardForm,
        vendor: 'Pooja Metal Corp',
        materialType: 'SS Sheet',
        sizeSpecs: spec,
        quantity: qty,
        weightKg: weight,
        poNumber: 'PO-2026-037',
        challanNumber: `PMC-${Math.floor(1000 + Math.random() * 9000)}`,
      });
    }
  };

  const handleOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const orderNumber = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    addOrder({
      ...orderForm,
      orderNumber,
      date: new Date().toISOString().split('T')[0],
      totalAmount: orderForm.quantity * orderForm.unitRate,
      inwardQty: 0,
      outwardQty: 0,
      currentStock: 0,
    });
    alert(`Work Order ${orderNumber} created successfully.`);
    onClose();
  };

  const handleInwardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const inwardNumber = `INW-2026-${Math.floor(100 + Math.random() * 900)}`;
    addInwardEntry({
      ...inwardForm,
      inwardNumber,
    });
    alert(`Goods Inward Note ${inwardNumber} recorded. Stock updated in warehouse.`);
    onClose();
  };

  const handleOutwardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const outwardNumber = `OUT-2026-${Math.floor(100 + Math.random() * 900)}`;
    addOutwardEntry({
      ...outwardForm,
      outwardNumber,
    });
    alert(`Delivery Challan ${outwardNumber} recorded. Inventory stock deducted.`);
    onClose();
  };

  const handleJobSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const jobCardNumber = `JOB-2026-${Math.floor(100 + Math.random() * 900)}`;
    addJobCard({
      ...jobForm,
      jobCardNumber,
      completedQuantity: 0,
      rejectedQuantity: 0,
      stages: [
        { name: 'Raw Material Saw Cutting', status: 'Completed', machine: 'Band Saw', durationMinutes: 20 },
        { name: 'CNC Turning & Facing', status: 'In Progress', machine: jobForm.assignedMachine, durationMinutes: 45 },
        { name: 'Edge Deburring & Buffing', status: 'Pending', machine: 'Bench Grinder', durationMinutes: 15 },
        { name: 'Final Inspection', status: 'Pending', machine: 'QC Bench', durationMinutes: 10 },
      ],
    } as any);
    alert(`Job Card ${jobCardNumber} assigned to ${jobForm.operator}.`);
    onClose();
  };

  const handleQCSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qcNumber = `QC-2026-${Math.floor(100 + Math.random() * 900)}`;
    addQCInspection({
      ...qcForm,
      inspectionNumber: qcNumber,
      date: new Date().toISOString().split('T')[0],
      checkpoints: [
        { parameter: 'Length & Width Dimensions', tolerance: '± 0.05 mm', observedValue: 'Within Tolerance', status: 'Pass' },
        { parameter: 'Surface Roughness Ra', tolerance: '< 0.8 µm', observedValue: '0.62 µm', status: 'Pass' },
        { parameter: 'Material Grade Testing', tolerance: 'SS 304 Certified', observedValue: 'Positive PMI Tested', status: 'Pass' },
      ],
    } as any);
    alert(`QC Inspection ${qcNumber} recorded successfully.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700 rounded-2xl shadow-xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 font-bold">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Voucher Entry (दैनिक वाउचर प्रविष्टि)
              </h3>
              <p className="text-xs text-slate-400">
                Record new goods inward, job cards, QC inspections, delivery challans, or customer orders
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Tabs with Clear Corporate Labels */}
        <div className="flex items-center gap-1.5 px-4 pt-3 border-b border-slate-800 bg-slate-900/60 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveAction('inward')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeAction === 'inward'
                ? 'border-emerald-400 text-emerald-400 bg-emerald-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>1. Goods Inward (GRN)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAction('job')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeAction === 'job'
                ? 'border-amber-400 text-amber-400 bg-amber-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>2. Shop Job Card</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAction('qc')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeAction === 'qc'
                ? 'border-cyan-400 text-cyan-400 bg-cyan-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>3. QC Inspection</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAction('outward')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeAction === 'outward'
                ? 'border-purple-400 text-purple-400 bg-purple-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>4. Delivery Challan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveAction('order')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold border-b-2 whitespace-nowrap transition-colors ${
              activeAction === 'order'
                ? 'border-blue-400 text-blue-400 bg-blue-500/10 rounded-t-lg'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Work Order (PO)</span>
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 max-h-[calc(85vh-160px)] overflow-y-auto">
          {/* TAB 1: INWARD ENTRY */}
          {activeAction === 'inward' && (
            <form onSubmit={handleInwardSubmit} className="space-y-4">
              {/* Quick Fill Sample Templates */}
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300">
                    Standard Item Presets:
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Click to auto-populate fields</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => applyInwardPreset('flat')}
                    className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-650 text-slate-200 text-[11px] font-medium border border-slate-600 transition-colors"
                  >
                    SS 304 Flat (80x6x485) - Manav Metal
                  </button>
                  <button
                    type="button"
                    onClick={() => applyInwardPreset('pipe')}
                    className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-650 text-slate-200 text-[11px] font-medium border border-slate-600 transition-colors"
                  >
                    SS 316 Pipe (OD 106) - Jindal
                  </button>
                  <button
                    type="button"
                    onClick={() => applyInwardPreset('sheet')}
                    className="px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-650 text-slate-200 text-[11px] font-medium border border-slate-600 transition-colors"
                  >
                    SS 304 Sheet (3.0mm) - Pooja Metal
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Supplier / Vendor Name *
                  </label>
                  <select
                    value={inwardForm.vendor}
                    onChange={(e) => setInwardForm({ ...inwardForm, vendor: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-hidden"
                  >
                    {vendors.map((v) => (
                      <option key={v.id} value={v.name}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Purchase Order (PO Ref)
                  </label>
                  <input
                    type="text"
                    value={inwardForm.poNumber}
                    onChange={(e) => setInwardForm({ ...inwardForm, poNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                    placeholder="PO-2026-036"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Vendor Challan No.
                  </label>
                  <input
                    type="text"
                    value={inwardForm.challanNumber}
                    onChange={(e) => setInwardForm({ ...inwardForm, challanNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                    placeholder="MM-CH-5012"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Material Form *
                  </label>
                  <select
                    value={inwardForm.materialType}
                    onChange={(e) => setInwardForm({ ...inwardForm, materialType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-hidden"
                  >
                    <option value="SS Flat">SS Flat (पत्ती)</option>
                    <option value="SS Pipe">SS Pipe (पाइप)</option>
                    <option value="SS Circle">SS Circle (सर्कल)</option>
                    <option value="SS Bar">SS Bar (गोल रॉड)</option>
                    <option value="SS Sheet">SS Sheet (चादर)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Size Specs (Dimensions) *
                  </label>
                  <input
                    type="text"
                    required
                    value={inwardForm.sizeSpecs}
                    onChange={(e) => {
                      const spec = e.target.value;
                      const autoW = autoCalculateWeightFromSpec(inwardForm.materialType, spec, 'SS 304', inwardForm.quantity);
                      setInwardForm({
                        ...inwardForm,
                        sizeSpecs: spec,
                        weightKg: autoW || inwardForm.weightKg,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                    placeholder="80 x 6 x 485"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Quantity Received *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={inwardForm.quantity}
                    onChange={(e) => {
                      const q = Number(e.target.value);
                      const autoW = autoCalculateWeightFromSpec(inwardForm.materialType, inwardForm.sizeSpecs, 'SS 304', q);
                      setInwardForm({
                        ...inwardForm,
                        quantity: q,
                        weightKg: autoW || inwardForm.weightKg,
                      });
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Total Weight (Kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={inwardForm.weightKg}
                    onChange={(e) => setInwardForm({ ...inwardForm, weightKg: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono text-emerald-400 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Inspection Status *
                  </label>
                  <select
                    value={inwardForm.qualityStatus}
                    onChange={(e) => setInwardForm({ ...inwardForm, qualityStatus: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold text-emerald-400"
                  >
                    <option value="Approved">Approved (Add to Godown Stock)</option>
                    <option value="QC Pending">QC Pending (Hold in Bay)</option>
                    <option value="Received">Received</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Received By (Store / Gatekeeper)
                  </label>
                  <input
                    type="text"
                    value={inwardForm.receivedBy}
                    onChange={(e) => setInwardForm({ ...inwardForm, receivedBy: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-850 border border-slate-750 flex items-center gap-2 text-xs text-slate-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Posting this voucher will add <strong>{inwardForm.quantity} Nos ({inwardForm.weightKg} Kg)</strong> to the Raw Material Stock Ledger under GRN No.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Inward Voucher</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: JOB CARD */}
          {activeAction === 'job' && (
            <form onSubmit={handleJobSubmit} className="space-y-4">
              {/* Synced Order & Available Raw Material Selector */}
              <div className="p-3 rounded-xl bg-slate-800/90 border border-blue-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-blue-300 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    ⚡ Select Active Customer Order / Available Raw Material (उपलब्ध स्टॉक):
                  </label>
                  <span className="text-[10px] text-emerald-400 font-bold font-mono">
                    {availableStockMaterials.length} Raw Materials In Stock
                  </span>
                </div>

                <select
                  onChange={(e) => {
                    const ord = orders.find((o) => o.id === e.target.value);
                    if (ord) {
                      setJobForm({
                        ...jobForm,
                        orderNumber: ord.orderNumber,
                        project: ord.project,
                        partName: `${ord.materialType} Part (${ord.sizeSpecs})`,
                        drawingRef: ord.drawingRef || 'DWG-RSB-MC-0485',
                        targetQuantity: ord.quantity,
                        materialAllocated: `${ord.materialType} ${ord.sizeSpecs}`,
                      });
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold focus:border-blue-500 focus:outline-hidden"
                >
                  <option value="">-- Choose Active Customer Order to Generate Job Card --</option>
                  {orders.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.orderNumber} • {o.customer} — {o.project} ({o.materialType} {o.sizeSpecs}, Qty: {o.quantity} {o.unit})
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[10px] font-bold text-slate-400">Available In Stock:</span>
                  {availableStockMaterials.slice(0, 3).map((m) => (
                    <span
                      key={m.id}
                      className="px-2 py-0.5 rounded-lg text-[10px] bg-slate-900 text-slate-300 border border-slate-700 font-mono"
                    >
                      {m.name}: <strong className="text-emerald-400">{m.currentStock} {m.unit}</strong>
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Machine Project *
                  </label>
                  <input
                    type="text"
                    required
                    value={jobForm.project}
                    onChange={(e) => setJobForm({ ...jobForm, project: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                    placeholder="FOHA"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Component / Part Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={jobForm.partName}
                    onChange={(e) => setJobForm({ ...jobForm, partName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                    placeholder="Guide Rail Bracket (SS Flat)"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Drawing Ref No.
                  </label>
                  <input
                    type="text"
                    value={jobForm.drawingRef}
                    onChange={(e) => setJobForm({ ...jobForm, drawingRef: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                    placeholder="DWG-RSB-MC-0485"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Target Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={jobForm.targetQuantity}
                    onChange={(e) => setJobForm({ ...jobForm, targetQuantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Assigned Machine / Cell *
                  </label>
                  <select
                    value={jobForm.assignedMachine}
                    onChange={(e) => setJobForm({ ...jobForm, assignedMachine: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                  >
                    {machines.map((m) => (
                      <option key={m.id} value={`${m.name} (${m.code})`}>
                        {m.name} ({m.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Operator / Machinist Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={jobForm.operator}
                    onChange={(e) => setJobForm({ ...jobForm, operator: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                    placeholder="Kailash Sharma"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Issue Job Card</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: QC INSPECTION */}
          {activeAction === 'qc' && (
            <form onSubmit={handleQCSubmit} className="space-y-4">
              {/* Synced Live Factory Processing Selector */}
              <div className="p-3 rounded-xl bg-slate-800/90 border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-emerald-400 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    ⚡ Select Live Material Currently Processing in Factory ({activeProcessingMaterials.length} Active):
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">Auto-fills Job & Specs</span>
                </div>

                <select
                  onChange={(e) => {
                    const proc = activeProcessingMaterials.find((p) => p.id === e.target.value);
                    if (proc) {
                      setQCForm({
                        ...qcForm,
                        referenceNumber: proc.jobCardNo,
                        itemDescription: `${proc.materialName} (${proc.sizeSpecs})`,
                        inspectedQuantity: proc.quantity,
                        passedQuantity: proc.quantity,
                        remarks: `Inspected on shopfloor station (${proc.displayBadge}). Heat No: ${proc.lotHeatNo}`,
                      });
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold focus:border-emerald-500 focus:outline-hidden"
                >
                  <option value="">-- Pick from Active Floor Lots / Inward Queue --</option>
                  {activeProcessingMaterials.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.jobCardNo} • {p.materialName} — {p.displayBadge} (Stage: {p.currentStage})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Job Card Reference *
                  </label>
                  <input
                    type="text"
                    required
                    value={qcForm.referenceNumber}
                    onChange={(e) => setQCForm({ ...qcForm, referenceNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono font-bold text-cyan-400"
                    placeholder="JOB-2026-042"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Part Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={qcForm.itemDescription}
                    onChange={(e) => setQCForm({ ...qcForm, itemDescription: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs text-emerald-300 font-semibold"
                    placeholder="SS Flat Guide Rails (80 x 6 x 485)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Inspected Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={qcForm.inspectedQuantity}
                    onChange={(e) => setQCForm({ ...qcForm, inspectedQuantity: Number(e.target.value), passedQuantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Passed Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={qcForm.passedQuantity}
                    onChange={(e) => setQCForm({ ...qcForm, passedQuantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold text-emerald-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    QA Inspector *
                  </label>
                  <input
                    type="text"
                    required
                    value={qcForm.inspector}
                    onChange={(e) => setQCForm({ ...qcForm, inspector: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                  Dimensional & Surface Observations
                </label>
                <input
                  type="text"
                  value={qcForm.remarks}
                  onChange={(e) => setQCForm({ ...qcForm, remarks: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                  placeholder="Dimensions within ±0.05mm tolerance. Ra 0.8 smooth finish OK."
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Inspection Clearance</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: OUTWARD DISPATCH */}
          {activeAction === 'outward' && (
            <form onSubmit={handleOutwardSubmit} className="space-y-4">
              {/* Synced QC Cleared Goods Selector */}
              <div className="p-3 rounded-xl bg-slate-800/90 border border-purple-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-purple-300 uppercase tracking-wide flex items-center gap-1.5">
                    <span className="flex h-2 w-2 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                    </span>
                    ✅ Select QC-Cleared Finished Goods ({dispatchReadyItems.length} Available):
                  </label>
                  <span className="text-[10px] text-emerald-400 font-bold font-mono">1-Click Dispatch</span>
                </div>

                <select
                  onChange={(e) => {
                    const disp = dispatchReadyItems.find((d) => d.id === e.target.value);
                    if (disp) {
                      setOutwardForm({
                        ...outwardForm,
                        customer: disp.customerName,
                        project: disp.projectName,
                        material: disp.material,
                        quantity: disp.quantity,
                        unit: disp.unit,
                        invoiceNumber: disp.invoiceNumber || `RSB-INV-2026-${Math.floor(100 + Math.random() * 900)}`,
                      });
                    }
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs font-semibold focus:border-purple-500 focus:outline-hidden"
                >
                  <option value="">-- Choose QC-Cleared Finished Goods for Gate Pass --</option>
                  {dispatchReadyItems.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.jobCardNo} • {d.material} — {d.customerName} ({d.quantity} {d.unit}) [QC Cert: {d.qcInspectionNo}]
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Customer Name *
                  </label>
                  <select
                    value={outwardForm.customer}
                    onChange={(e) => setOutwardForm({ ...outwardForm, customer: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs focus:outline-hidden"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Project *
                  </label>
                  <input
                    type="text"
                    required
                    value={outwardForm.project}
                    onChange={(e) => setOutwardForm({ ...outwardForm, project: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                    placeholder="FOHA"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Material / Assembly Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={outwardForm.material}
                    onChange={(e) => setOutwardForm({ ...outwardForm, material: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs text-purple-300 font-semibold"
                    placeholder="SS Flat 80 x 6 x 485 (Guide Rails)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Dispatch Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={outwardForm.quantity}
                    onChange={(e) => setOutwardForm({ ...outwardForm, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Vehicle Number (गाड़ी नंबर) *
                  </label>
                  <input
                    type="text"
                    required
                    value={outwardForm.vehicleNumber}
                    onChange={(e) => setOutwardForm({ ...outwardForm, vehicleNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono uppercase"
                    placeholder="GJ-01-CZ-8890"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Driver Name & Contact
                  </label>
                  <input
                    type="text"
                    value={outwardForm.driverName}
                    onChange={(e) => setOutwardForm({ ...outwardForm, driverName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                    placeholder="Ramu Yadav"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Status *
                  </label>
                  <select
                    value={outwardForm.deliveryStatus}
                    onChange={(e) => setOutwardForm({ ...outwardForm, deliveryStatus: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold text-purple-400"
                  >
                    <option value="Dispatched">Dispatched (Deduct from Godown)</option>
                    <option value="Ready">Ready at Plant</option>
                    <option value="Delivered">Delivered</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Tax Invoice No.
                  </label>
                  <input
                    type="text"
                    value={outwardForm.invoiceNumber}
                    onChange={(e) => setOutwardForm({ ...outwardForm, invoiceNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                    placeholder="RSB-INV-2026-118"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    E-Way Bill No.
                  </label>
                  <input
                    type="text"
                    value={outwardForm.eWayBillNo}
                    onChange={(e) => setOutwardForm({ ...outwardForm, eWayBillNo: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                    placeholder="241982736500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Generate Delivery Challan</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 5: CUSTOMER ORDER */}
          {activeAction === 'order' && (
            <form onSubmit={handleOrderSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Customer PO No. *
                  </label>
                  <input
                    type="text"
                    required
                    value={orderForm.poNumber}
                    onChange={(e) => setOrderForm({ ...orderForm, poNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                    placeholder="e.g. 36"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Customer Name *
                  </label>
                  <select
                    value={orderForm.customer}
                    onChange={(e) => setOrderForm({ ...orderForm, customer: e.target.value })}
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
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Project *
                  </label>
                  <input
                    type="text"
                    required
                    value={orderForm.project}
                    onChange={(e) => setOrderForm({ ...orderForm, project: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                    placeholder="FOHA"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Machine Category *
                  </label>
                  <select
                    value={orderForm.machineType}
                    onChange={(e) => setOrderForm({ ...orderForm, machineType: e.target.value as any })}
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
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Size Specs (Dimensions) *
                  </label>
                  <input
                    type="text"
                    required
                    value={orderForm.sizeSpecs}
                    onChange={(e) => setOrderForm({ ...orderForm, sizeSpecs: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                    placeholder="80 x 6 x 485"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={orderForm.quantity}
                    onChange={(e) => setOrderForm({ ...orderForm, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Create Work Order</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
