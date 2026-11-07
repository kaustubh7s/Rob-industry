import React, { useState } from 'react';
import {
  FileText,
  Search,
  Plus,
  Printer,
  Download,
  CheckCircle2,
  Clock,
  Building2,
  Calendar,
  Eye,
  Trash2,
} from 'lucide-react';
import { useAccounts } from '../../context/AccountsContext';
import { SalesInvoice, InvoiceType } from '../../types/finance';
import { formatINR, formatDateIndian } from '../../utils/accountsCalculations';
import { PrintableDocumentModal, PrintableDocumentData } from './PrintableDocumentModal';

export const SalesInvoicesView: React.FC = () => {
  const { salesInvoices, deals, companies, addSalesInvoice, deleteSalesInvoice } = useAccounts();

  const [typeFilter, setTypeFilter] = useState<'all' | 'tax_invoice' | 'proforma_invoice'>('all');
  const [search, setSearch] = useState('');
  const [selectedDocForPrint, setSelectedDocForPrint] = useState<PrintableDocumentData | null>(null);

  // Modal State for New Invoice
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [invType, setInvType] = useState<InvoiceType>('tax_invoice');
  const [selectedDealId, setSelectedDealId] = useState<string>('');
  const [invNumber, setInvNumber] = useState(`RSB-INV-2026-${String(salesInvoices.length + 1).padStart(3, '0')}`);
  const [invDate, setInvDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [itemDesc, setItemDesc] = useState('');
  const [itemRate, setItemRate] = useState('');
  const [itemQty, setItemQty] = useState('1');
  const [gstRate, setGstRate] = useState('18');
  const [poNumber, setPoNumber] = useState('');

  const filteredInvoices = salesInvoices.filter((inv) => {
    const matchType = typeFilter === 'all' || inv.invoiceType === typeFilter;
    const q = search.toLowerCase();
    const matchSearch =
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.customerName.toLowerCase().includes(q) ||
      (inv.projectName && inv.projectName.toLowerCase().includes(q));
    return matchType && matchSearch;
  });

  const handleSelectDeal = (dealId: string) => {
    setSelectedDealId(dealId);
    const deal = deals.find((d) => d.id === dealId);
    if (deal) {
      setItemDesc(deal.remarks || `${deal.companyName} Machinery Order`);
      setItemRate(String(Math.round(deal.decidedAmount / 1.18)));
      setPoNumber(deal.dealNumber);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const deal = deals.find((d) => d.id === selectedDealId);
    if (!deal && !itemDesc) {
      alert('Please select a deal or provide an item description.');
      return;
    }

    const qty = Number(itemQty) || 1;
    const rate = Number(itemRate) || 0;
    const taxable = qty * rate;
    const gstPct = Number(gstRate) || 18;
    const gstTotal = (taxable * gstPct) / 100;
    const cgst = gstTotal / 2;
    const sgst = gstTotal / 2;
    const total = taxable + gstTotal;

    const company = companies.find((c) => c.id === deal?.companyId);

    await addSalesInvoice({
      invoiceNumber: invNumber.trim(),
      invoiceType: invType,
      dealId: deal?.id,
      dealNumber: deal?.dealNumber,
      customerId: company?.id || 'comp-custom',
      customerName: deal?.companyName || 'Valued Customer',
      customerGstin: deal?.companyGstin || company?.gstin,
      customerAddress: deal?.companyAddress || company?.address,
      customerPhone: deal?.companyPhone || company?.phone,
      invoiceDate: invDate,
      dueDate,
      poNumber: poNumber.trim() || undefined,
      projectName: deal?.remarks || 'Machinery Fabrication Order',
      items: [
        {
          id: `item-${Date.now()}`,
          description: itemDesc,
          hsnSac: '8422',
          quantity: qty,
          unit: 'Set',
          rate,
          taxableAmount: taxable,
          gstRate: gstPct,
          cgstAmount: cgst,
          sgstAmount: sgst,
          igstAmount: 0,
          totalAmount: total,
        },
      ],
      subtotal: taxable,
      cgstTotal: cgst,
      sgstTotal: sgst,
      igstTotal: 0,
      totalAmount: total,
      amountPaid: 0,
      balanceDue: total,
      status: 'issued',
      isGstInclusive: true,
      createdBy: 'Accountant',
    });

    setIsCreateModalOpen(false);
  };

  const handleOpenPrintModal = (inv: SalesInvoice) => {
    setSelectedDocForPrint({
      type: inv.invoiceType,
      title: inv.invoiceType === 'tax_invoice' ? 'TAX INVOICE' : 'PROFORMA INVOICE',
      docNumber: inv.invoiceNumber,
      date: inv.invoiceDate,
      dueDate: inv.dueDate,
      partyName: inv.customerName,
      partyGstin: inv.customerGstin,
      partyAddress: inv.customerAddress,
      partyPhone: inv.customerPhone,
      poNumber: inv.poNumber,
      projectName: inv.projectName,
      items: inv.items.map((i, idx) => ({
        srNo: idx + 1,
        description: i.description,
        hsnSac: i.hsnSac,
        qty: i.quantity,
        unit: i.unit,
        rate: i.rate,
        taxableAmount: i.taxableAmount,
        gstRate: i.gstRate,
        totalAmount: i.totalAmount,
      })),
      subtotal: inv.subtotal,
      cgstAmount: inv.cgstTotal,
      sgstAmount: inv.sgstTotal,
      igstAmount: inv.igstTotal,
      grandTotal: inv.totalAmount,
      notes: inv.notes,
      terms: inv.termsAndConditions,
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Sales Invoices & Proforma
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            GST Tax Invoices, milestone Proforma Invoices, and official customer billing documents.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search invoice or customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-slate-900 w-56 shadow-2xs"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setInvNumber(`RSB-INV-2026-${String(salesInvoices.length + 1).padStart(3, '0')}`);
              setIsCreateModalOpen(true);
            }}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ Create Invoice</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs">
        <button
          type="button"
          onClick={() => setTypeFilter('all')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
            typeFilter === 'all'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          All ({salesInvoices.length})
        </button>
        <button
          type="button"
          onClick={() => setTypeFilter('tax_invoice')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
            typeFilter === 'tax_invoice'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Tax Invoices ({salesInvoices.filter((i) => i.invoiceType === 'tax_invoice').length})
        </button>
        <button
          type="button"
          onClick={() => setTypeFilter('proforma_invoice')}
          className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
            typeFilter === 'proforma_invoice'
              ? 'bg-slate-900 text-white'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Proforma Invoices ({salesInvoices.filter((i) => i.invoiceType === 'proforma_invoice').length})
        </button>
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No invoices found. Click <strong>+ Create Invoice</strong> to generate a Tax Invoice or Proforma Invoice.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Invoice No</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Customer Name</th>
                  <th className="py-2.5 px-3 text-right">Taxable</th>
                  <th className="py-2.5 px-3 text-right">Total (₹)</th>
                  <th className="py-2.5 px-3 text-right">Balance Due</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {inv.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                      {formatDateIndian(inv.invoiceDate)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          inv.invoiceType === 'tax_invoice'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}
                      >
                        {inv.invoiceType === 'tax_invoice' ? 'Tax Invoice' : 'Proforma (PI)'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 truncate max-w-[200px]">
                      {inv.customerName}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                      {formatINR(inv.subtotal)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-950 whitespace-nowrap">
                      {formatINR(inv.totalAmount)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700 whitespace-nowrap">
                      {formatINR(inv.balanceDue)}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {inv.status === 'paid' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          ✓ Paid
                        </span>
                      ) : inv.status === 'partially_paid' ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Partially Paid
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          Issued
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenPrintModal(inv)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 rounded font-bold text-[11px] inline-flex items-center gap-1 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                          title="View & Print Official A4 Invoice"
                        >
                          <Printer className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Print</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Delete this invoice?')) deleteSalesInvoice(inv.id);
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

      {/* CREATE INVOICE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 space-y-4 border border-slate-200">
            <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-2">
              Generate Sales / Proforma Invoice
            </h2>

            <form onSubmit={handleCreateInvoice} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Invoice Type *
                  </label>
                  <select
                    value={invType}
                    onChange={(e) => setInvType(e.target.value as InvoiceType)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="tax_invoice">Tax Invoice (Official GST)</option>
                    <option value="proforma_invoice">Proforma Invoice (PI)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Invoice Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={invNumber}
                    onChange={(e) => setInvNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Link Existing Customer Deal (Optional)
                </label>
                <select
                  value={selectedDealId}
                  onChange={(e) => handleSelectDeal(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value="">-- Manual Entry or Select Deal --</option>
                  {deals.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.dealNumber} - {d.companyName} ({formatINR(d.decidedAmount)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Item Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Automatic High-Speed Vial Washing Machine"
                  value={itemDesc}
                  onChange={(e) => setItemDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={itemQty}
                    onChange={(e) => setItemQty(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Rate (₹ Taxable) *
                  </label>
                  <input
                    type="number"
                    required
                    value={itemRate}
                    onChange={(e) => setItemRate(e.target.value)}
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
                    <option value="18">18% (Standard Machinery)</option>
                    <option value="12">12%</option>
                    <option value="5">5%</option>
                    <option value="0">0% (Nil / Exempt)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                >
                  Save & Issue Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Universal Printable A4 Modal */}
      {selectedDocForPrint && (
        <PrintableDocumentModal
          data={selectedDocForPrint}
          onClose={() => setSelectedDocForPrint(null)}
        />
      )}
    </div>
  );
};

