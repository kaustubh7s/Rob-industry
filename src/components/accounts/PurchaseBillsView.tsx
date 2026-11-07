import React, { useState } from 'react';
import {
  Receipt,
  Search,
  Plus,
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Trash2,
  Download,
  CreditCard,
} from 'lucide-react';
import { useAccounts } from '../../context/AccountsContext';
import { PurchaseBill } from '../../types/finance';
import { formatINR, formatDateIndian } from '../../utils/accountsCalculations';

export const PurchaseBillsView: React.FC = () => {
  const {
    purchaseBills,
    financeVendors,
    purchaseOrdersFinance,
    addPurchaseBill,
    deletePurchaseBill,
    setActiveView,
  } = useAccounts();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unpaid' | 'partially_paid' | 'paid' | 'overdue'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);

  // New Bill Form
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [vendorInvNo, setVendorInvNo] = useState('');
  const [invDate, setInvDate] = useState(new Date().toISOString().split('T')[0]);
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [linkedPoId, setLinkedPoId] = useState('');
  const [itemDesc, setItemDesc] = useState('');
  const [taxableAmount, setTaxableAmount] = useState('');
  const [gstRate, setGstRate] = useState('18');
  const [notes, setNotes] = useState('');

  const filteredBills = purchaseBills.filter((bill) => {
    const matchStatus = statusFilter === 'all' || bill.paymentStatus === statusFilter;
    const q = search.toLowerCase();
    const matchSearch =
      bill.billNumber.toLowerCase().includes(q) ||
      bill.vendorInvoiceNumber.toLowerCase().includes(q) ||
      bill.vendorName.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const handleVendorInvChange = (val: string) => {
    setVendorInvNo(val);
    if (selectedVendorId && val.trim()) {
      const exists = purchaseBills.some(
        (b) =>
          b.vendorId === selectedVendorId &&
          b.vendorInvoiceNumber.trim().toLowerCase() === val.trim().toLowerCase()
      );
      if (exists) {
        setDuplicateWarning(`⚠️ Duplicate Warning: Invoice #${val} already exists for this vendor!`);
      } else {
        setDuplicateWarning(null);
      }
    }
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    const vendor = financeVendors.find((v) => v.id === selectedVendorId);
    if (!vendor) {
      alert('Please select a supplier / vendor.');
      return;
    }

    const taxable = Number(taxableAmount) || 0;
    const gstPct = Number(gstRate) || 18;
    const gstTotal = (taxable * gstPct) / 100;
    const isInterState = vendor.stateCode && vendor.stateCode !== '24';
    const cgst = isInterState ? 0 : gstTotal / 2;
    const sgst = isInterState ? 0 : gstTotal / 2;
    const igst = isInterState ? gstTotal : 0;
    const grandTotal = taxable + gstTotal;

    const po = purchaseOrdersFinance.find((p) => p.id === linkedPoId);

    try {
      await addPurchaseBill({
        billNumber: `RSB-PB-2026-${String(purchaseBills.length + 1).padStart(3, '0')}`,
        vendorInvoiceNumber: vendorInvNo.trim(),
        vendorInvoiceDate: invDate,
        receivedDate,
        vendorId: vendor.id,
        vendorName: vendor.companyName,
        vendorGstin: vendor.gstin,
        linkedPoId: po?.id,
        linkedPoNumber: po?.poNumber,
        projectName: po?.projectReference,
        items: [
          {
            id: `pbi-${Date.now()}`,
            description: itemDesc || 'Materials & Components Supplied',
            quantity: 1,
            unit: 'Lot',
            rate: taxable,
            taxableAmount: taxable,
            gstRate: gstPct,
            cgstAmount: cgst,
            sgstAmount: sgst,
            igstAmount: igst,
            totalAmount: grandTotal,
          },
        ],
        taxableAmount: taxable,
        cgstTotal: cgst,
        sgstTotal: sgst,
        igstTotal: igst,
        gstTotal,
        totalAmount: grandTotal,
        amountPaid: 0,
        balancePayable: grandTotal,
        paymentDueDate: dueDate,
        paymentStatus: 'unpaid',
        notes: notes.trim() || undefined,
        createdBy: 'Accountant',
      });

      setIsModalOpen(false);
      setVendorInvNo('');
      setTaxableAmount('');
      setItemDesc('');
      setDuplicateWarning(null);
    } catch (err: any) {
      alert(err.message || 'Failed to record purchase bill');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Purchase Bills & Supplier Invoices
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record incoming vendor bills, calculate Input GST credits, track payable balances, and avoid duplicates.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search bill or vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-slate-900 w-56 shadow-2xs"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ Enter Purchase Bill</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs">
        {(
          [
            { id: 'all', label: 'All Bills' },
            { id: 'unpaid', label: 'Unpaid' },
            { id: 'partially_paid', label: 'Partially Paid' },
            { id: 'paid', label: 'Fully Paid' },
            { id: 'overdue', label: 'Overdue' },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
              statusFilter === tab.id
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Bills Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {filteredBills.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No purchase bills recorded. Click <strong>+ Enter Purchase Bill</strong> to record a supplier invoice.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Bill ID</th>
                  <th className="py-2.5 px-3 font-mono">Vendor Inv #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Vendor Name</th>
                  <th className="py-2.5 px-3 text-right">Taxable</th>
                  <th className="py-2.5 px-3 text-right">Total (₹)</th>
                  <th className="py-2.5 px-3 text-right">Paid</th>
                  <th className="py-2.5 px-3 text-right">Balance Payable</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {bill.billNumber}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700 font-bold whitespace-nowrap">
                      {bill.vendorInvoiceNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                      {formatDateIndian(bill.vendorInvoiceDate)}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 truncate max-w-[180px]">
                      {bill.vendorName}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                      {formatINR(bill.taxableAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-950 whitespace-nowrap">
                      {formatINR(bill.totalAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700 font-semibold whitespace-nowrap">
                      {formatINR(bill.amountPaid)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-rose-700 whitespace-nowrap">
                      {formatINR(bill.balancePayable)}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {bill.paymentStatus === 'paid' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ✓ Paid
                        </span>
                      ) : bill.paymentStatus === 'partially_paid' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Part Paid
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          Unpaid
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {bill.balancePayable > 0 && (
                          <button
                            type="button"
                            onClick={() => setActiveView('vendor-payments')}
                            className="px-2 py-0.5 text-[11px] font-bold text-blue-700 hover:bg-blue-50 rounded border border-blue-200 transition-colors cursor-pointer"
                          >
                            Pay
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Delete this purchase bill?')) deletePurchaseBill(bill.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* NEW PURCHASE BILL MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 space-y-4 border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-2">
              Enter Supplier Purchase Bill
            </h2>

            {duplicateWarning && (
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                <span>{duplicateWarning}</span>
              </div>
            )}

            <form onSubmit={handleCreateBill} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Select Supplier / Vendor *
                  </label>
                  <select
                    required
                    value={selectedVendorId}
                    onChange={(e) => {
                      setSelectedVendorId(e.target.value);
                      if (vendorInvNo) handleVendorInvChange(vendorInvNo);
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="">-- Choose Vendor --</option>
                    {financeVendors.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.companyName} ({v.gstin || 'Unregistered'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Vendor Invoice Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MM-26-881"
                    value={vendorInvNo}
                    onChange={(e) => handleVendorInvChange(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Invoice Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={invDate}
                    onChange={(e) => setInvDate(e.target.value)}
                    className="w-full px-2 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Received Date
                  </label>
                  <input
                    type="date"
                    required
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                    className="w-full px-2 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Payment Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-2 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Item Description / Materials Received *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SS 316L Sheets 2.5mm Grade"
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Taxable Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 300000"
                    value={taxableAmount}
                    onChange={(e) => setTaxableAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    GST Rate (%)
                  </label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="18">18% (Standard GST)</option>
                    <option value="12">12%</option>
                    <option value="5">5%</option>
                    <option value="0">0% (Nil / Exempt)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save Purchase Bill
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

