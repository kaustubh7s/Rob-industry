import React, { useState } from 'react';
import {
  ShoppingCart,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Calendar,
  Building2,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { PurchaseOrder } from '../../types/erp';
import { StatusBadge } from '../common/StatusBadge';
import { formatINR } from '../../utils/calculations';
import { exportToExcel, exportToPdfReport } from '../../utils/excelIntegration';
import { Modal } from '../common/Modal';

export const PurchaseManager: React.FC = () => {
  const { purchaseOrders, addPurchaseOrder, updatePOStatus, vendors, materials } = useERP();

  const [searchTerm, setSearchTerm] = useState('');
  const [isNewPOModalOpen, setIsNewPOModalOpen] = useState(false);
  const [printPO, setPrintPO] = useState<PurchaseOrder | null>(null);

  // New PO form
  const [form, setForm] = useState({
    poNumber: 'PO-2026-045',
    date: new Date().toISOString().split('T')[0],
    vendor: 'Manav Metal',
    expectedDate: new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0],
    paymentTerms: '30 Days Net',
    status: 'Sent' as PurchaseOrder['status'],
    items: [
      { material: 'SS Flat 80 x 6 x 485', sizeSpecs: '80 x 6 x 485', qty: 25, unit: 'Nos', rate: 450, amount: 11250 },
      { material: 'SS Pipe OD 106 x ID 75 x 110', sizeSpecs: 'OD 106 x ID 75 x 110', qty: 10, unit: 'Nos', rate: 1950, amount: 19500 },
    ],
    notes: 'Material test certificate SS 304/316 required with delivery.',
  });

  const filteredPOs = purchaseOrders.filter((po) => {
    return (
      po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.vendor.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const totalPOAmount = form.items.reduce((acc, i) => acc + i.amount, 0);

  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    addPurchaseOrder({
      ...form,
      totalAmount: totalPOAmount,
    });
    setIsNewPOModalOpen(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-amber-400" />
              Purchase Management & Raw Material Procurement
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
              {filteredPOs.length} Purchase Orders
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Issue official Purchase Orders (PO) to stainless steel suppliers and track GRN fulfillment
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsNewPOModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Create Purchase Order
          </button>
        </div>
      </div>

      {/* PO Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredPOs.map((po) => (
          <div
            key={po.id}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-lg space-y-4 transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-sm font-black text-amber-400">{po.poNumber}</span>
                <h4 className="text-sm font-bold text-white mt-1">{po.vendor}</h4>
                <p className="text-xs text-slate-400">Date: {po.date} &bull; Expected: {po.expectedDate}</p>
              </div>

              <div className="flex items-center gap-1.5">
                <StatusBadge status={po.status} size="sm" />
                <button
                  onClick={() => setPrintPO(po)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Print Official Purchase Order"
                >
                  <Printer className="w-3.5 h-3.5 text-amber-400" />
                </button>
              </div>
            </div>

            {/* Items Table Preview */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-850">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2">Material / Spec</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Rate</th>
                    <th className="p-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-750 font-medium">
                  {po.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2 font-mono text-slate-200">{item.material}</td>
                      <td className="p-2 text-center font-bold">{item.qty} {item.unit}</td>
                      <td className="p-2 text-right font-mono">{formatINR(item.rate)}</td>
                      <td className="p-2 text-right font-mono font-bold text-emerald-400">{formatINR(item.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-400">Payment Terms: <strong className="text-amber-300">{po.paymentTerms}</strong></span>
              <span className="font-mono text-base font-extrabold text-emerald-400">
                Total: {formatINR(po.totalAmount)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL 1: NEW PO */}
      <Modal
        isOpen={isNewPOModalOpen}
        onClose={() => setIsNewPOModalOpen(false)}
        title="Create Official Purchase Order (PO)"
        subtitle="Procurement requisition for raw stainless steel stock"
        maxWidth="3xl"
      >
        <form onSubmit={handleCreatePO} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">PO Number *</label>
              <input
                type="text"
                required
                value={form.poNumber}
                onChange={(e) => setForm({ ...form, poNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Vendor *</label>
              <select
                value={form.vendor}
                onChange={(e) => setForm({ ...form, vendor: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.name}>{v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Expected Delivery Date *</label>
              <input
                type="date"
                required
                value={form.expectedDate}
                onChange={(e) => setForm({ ...form, expectedDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Terms & Conditions</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsNewPOModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md"
            >
              Generate PO Document
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: PRINTABLE PO */}
      <Modal
        isOpen={!!printPO}
        onClose={() => setPrintPO(null)}
        title="Official Purchase Order Document"
        subtitle="Purchase Order for vendor dispatch"
        maxWidth="3xl"
      >
        {printPO && (
          <div className="space-y-6">
            <div className="p-6 bg-white text-slate-900 rounded-xl shadow-lg border border-slate-300 font-sans space-y-6" id="printable-po">
              <div className="flex justify-between items-start border-b-2 border-slate-900 pb-3">
                <div>
                  <h1 className="text-lg font-extrabold tracking-tight text-slate-900">
                    RSB PRIVATE LIMITED
                  </h1>
                  <p className="text-xs font-semibold text-slate-700">
                    Manufacturing Industry
                  </p>
                  <p className="text-[11px] font-medium text-slate-600">
                    F, 16/4, Naregaon Main Rd, Naregaon, Chilkalthana, Chhatrapati Sambhajinagar, Maharashtra 431007
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold uppercase bg-slate-900 text-white px-2.5 py-1 rounded-sm">
                    PURCHASE ORDER
                  </span>
                  <p className="text-xs font-mono font-bold mt-1">{printPO.poNumber}</p>
                  <p className="text-xs text-slate-600">Date: {printPO.date}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <span className="font-bold text-slate-500 uppercase block mb-1">To Vendor:</span>
                <p className="font-bold text-slate-900 text-sm">{printPO.vendor}</p>
                <p className="text-slate-600">Expected Delivery: {printPO.expectedDate} &bull; Terms: {printPO.paymentTerms}</p>
              </div>

              <table className="w-full text-left text-xs border border-slate-300">
                <thead className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2 border-r border-slate-300">Item Description</th>
                    <th className="p-2 border-r border-slate-300 text-center">Qty</th>
                    <th className="p-2 border-r border-slate-300 text-right">Unit Rate (₹)</th>
                    <th className="p-2 text-right">Total Amount (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {printPO.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2 border-r border-slate-300 font-bold">{it.material}</td>
                      <td className="p-2 border-r border-slate-300 text-center font-mono">{it.qty} {it.unit}</td>
                      <td className="p-2 border-r border-slate-300 text-right font-mono">{formatINR(it.rate)}</td>
                      <td className="p-2 text-right font-mono font-bold">{formatINR(it.amount)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold">
                    <td colSpan={3} className="p-2 text-right border-r border-slate-300">Total Purchase Value:</td>
                    <td className="p-2 text-right font-mono text-sm">{formatINR(printPO.totalAmount)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="pt-6 grid grid-cols-2 text-center text-xs">
                <div className="border-t border-slate-400 pt-1">Prepared By (Purchase Dept)</div>
                <div className="border-t border-slate-400 pt-1">Authorized Signatory (RSB)</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setPrintPO(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md"
              >
                <Printer className="w-4 h-4" /> Print Purchase Order
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
