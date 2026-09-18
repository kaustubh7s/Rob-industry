import React, { useState } from 'react';
import {
  ReceiptText,
  Plus,
  Search,
  Filter,
  Download,
  Printer,
  FileSpreadsheet,
  FileText,
  DollarSign,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { SalesOrder, MachineCategory } from '../../types/erp';
import { StatusBadge } from '../common/StatusBadge';
import { formatINR } from '../../utils/calculations';
import { exportToExcel, exportToPdfReport } from '../../utils/excelIntegration';
import { Modal } from '../common/Modal';

export const SalesManager: React.FC = () => {
  const { salesOrders, addSalesOrder, updateSOStatus, customers, projects } = useERP();

  const [searchTerm, setSearchTerm] = useState('');
  const [isNewSOModalOpen, setIsNewSOModalOpen] = useState(false);
  const [printSO, setPrintSO] = useState<SalesOrder | null>(null);

  // New Sales Order form
  const [form, setForm] = useState({
    quoteNumber: 'QT-2026-095',
    customer: 'Cadila Healthcare Ltd (Zydus)',
    machineType: 'Mono Conveyor' as MachineCategory,
    project: 'FOHA High-Speed Conveyor & Cap Line',
    deliveryDate: new Date(Date.now() + 25 * 86400000).toISOString().split('T')[0],
    paymentTerms: '30% Advance, 60% Against Proforma, 10% after SAT',
    status: 'Sales Order' as SalesOrder['status'],
    items: [
      { description: 'SS 304 Mono Conveyor Line (6 Meter length)', machineType: 'Mono Conveyor' as MachineCategory, qty: 1, unitPrice: 850000, total: 850000 },
      { description: 'Rotary Cap Transfer & Orientation System', machineType: 'Cap Transfer' as MachineCategory, qty: 1, unitPrice: 620000, total: 620000 },
      { description: 'SS 316 Outlet Roll & Sorting Bed', machineType: 'Conveyor Assembly' as MachineCategory, qty: 1, unitPrice: 380000, total: 380000 },
    ],
  });

  const filteredSOs = salesOrders.filter((so) => {
    return (
      so.soNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      so.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      so.project.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const totalSOValue = form.items.reduce((acc, i) => acc + i.total, 0);

  const handleCreateSO = (e: React.FormEvent) => {
    e.preventDefault();
    const count = String(salesOrders.length + 101);
    const soNumber = `SO-2026-${count}`;
    addSalesOrder({
      ...form,
      soNumber,
      date: new Date().toISOString().split('T')[0],
      totalValue: totalSOValue,
    });
    setIsNewSOModalOpen(false);
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
              <ReceiptText className="w-5 h-5 text-indigo-400" />
              Sales Orders, Quotations & Customer Invoicing
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold">
              {filteredSOs.length} Commercial Orders
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage machinery quotations, contract billing milestones, and tax invoice generation
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsNewSOModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> New Quotation / Sales Order
          </button>
        </div>
      </div>

      {/* Sales Orders Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredSOs.map((so) => (
          <div
            key={so.id}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-lg space-y-4 transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-mono text-sm font-black text-indigo-400">{so.soNumber}</span>
                <h4 className="text-sm font-bold text-white mt-1">{so.customer}</h4>
                <p className="text-xs text-slate-400">Project: <strong className="text-cyan-400">{so.project}</strong></p>
              </div>

              <div className="flex items-center gap-1.5">
                <StatusBadge status={so.status} size="sm" />
                <button
                  onClick={() => setPrintSO(so)}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Print Tax Invoice / Quotation"
                >
                  <Printer className="w-3.5 h-3.5 text-indigo-400" />
                </button>
              </div>
            </div>

            {/* Items */}
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-850">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2">Line Item / Machine Description</th>
                    <th className="p-2 text-center">Qty</th>
                    <th className="p-2 text-right">Price (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-750 font-medium">
                  {so.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2 text-slate-200">{it.description}</td>
                      <td className="p-2 text-center font-bold">{it.qty}</td>
                      <td className="p-2 text-right font-mono font-bold text-emerald-400">{formatINR(it.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-400">Terms: <strong className="text-amber-300">{so.paymentTerms}</strong></span>
              <span className="font-mono text-base font-extrabold text-emerald-400">
                Total: {formatINR(so.totalValue)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL 1: NEW SALES ORDER */}
      <Modal
        isOpen={isNewSOModalOpen}
        onClose={() => setIsNewSOModalOpen(false)}
        title="Create New Sales Order / Quotation"
        subtitle="Commercial contract for industrial machinery supply"
        maxWidth="3xl"
      >
        <form onSubmit={handleCreateSO} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Customer *</label>
              <select
                value={form.customer}
                onChange={(e) => setForm({ ...form, customer: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">Project Name *</label>
              <input
                type="text"
                required
                value={form.project}
                onChange={(e) => setForm({ ...form, project: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsNewSOModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md"
            >
              Generate Sales Order
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: PRINTABLE INVOICE */}
      <Modal
        isOpen={!!printSO}
        onClose={() => setPrintSO(null)}
        title="Commercial Tax Invoice & Quotation"
        subtitle="Official billing document"
        maxWidth="3xl"
      >
        {printSO && (
          <div className="space-y-6">
            <div className="p-6 bg-white text-slate-900 rounded-xl shadow-lg border border-slate-300 font-sans space-y-6" id="printable-invoice">
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
                  <span className="text-sm font-extrabold uppercase bg-indigo-900 text-white px-2.5 py-1 rounded-sm">
                    TAX INVOICE
                  </span>
                  <p className="text-xs font-mono font-bold mt-1">{printSO.soNumber}</p>
                  <p className="text-xs text-slate-600">Date: {printSO.date}</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                <span className="font-bold text-slate-500 uppercase block mb-1">Billed To:</span>
                <p className="font-bold text-slate-900 text-sm">{printSO.customer}</p>
                <p className="text-slate-600">Project Reference: {printSO.project}</p>
              </div>

              <table className="w-full text-left text-xs border border-slate-300">
                <thead className="bg-slate-100 border-b border-slate-300 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="p-2 border-r border-slate-300">Description of Machinery / Component</th>
                    <th className="p-2 border-r border-slate-300 text-center">Qty</th>
                    <th className="p-2 text-right">Total Price (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {printSO.items.map((it, idx) => (
                    <tr key={idx}>
                      <td className="p-2 border-r border-slate-300 font-bold text-slate-900">{it.description}</td>
                      <td className="p-2 border-r border-slate-300 text-center font-mono">{it.qty}</td>
                      <td className="p-2 text-right font-mono font-bold">{formatINR(it.total)}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold">
                    <td colSpan={2} className="p-2 text-right border-r border-slate-300">Total Invoice Amount (INR):</td>
                    <td className="p-2 text-right font-mono text-sm text-indigo-900">{formatINR(printSO.totalValue)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="pt-6 grid grid-cols-2 text-center text-xs">
                <div className="border-t border-slate-400 pt-1">Finance & Accounts</div>
                <div className="border-t border-slate-400 pt-1">Authorized Signatory (RSB)</div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setPrintSO(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md"
              >
                <Printer className="w-4 h-4" /> Print Tax Invoice
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
