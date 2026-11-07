import React, { useState } from 'react';
import {
  CreditCard,
  Search,
  Plus,
  Printer,
  Calendar,
  Building2,
  CheckCircle2,
  Landmark,
  Trash2,
} from 'lucide-react';
import { useAccounts } from '../../context/AccountsContext';
import { VendorPayment } from '../../types/finance';
import { formatINR, formatDateIndian } from '../../utils/accountsCalculations';
import { PrintableDocumentModal, PrintableDocumentData } from './PrintableDocumentModal';

export const VendorPaymentsView: React.FC = () => {
  const {
    vendorPayments,
    financeVendors,
    purchaseBills,
    bankAccounts,
    addVendorPayment,
    deleteVendorPayment,
  } = useAccounts();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDocForPrint, setSelectedDocForPrint] = useState<PrintableDocumentData | null>(null);

  // Form State
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [selectedBillId, setSelectedBillId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMode, setPayMode] = useState<VendorPayment['paymentMode']>('Bank Transfer');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [reference, setReference] = useState('');
  const [remarks, setRemarks] = useState('');

  const filteredPayments = vendorPayments.filter((vp) => {
    const q = search.toLowerCase();
    return (
      vp.voucherNumber.toLowerCase().includes(q) ||
      vp.vendorName.toLowerCase().includes(q) ||
      (vp.utrNumber && vp.utrNumber.toLowerCase().includes(q))
    );
  });

  const handleSelectVendor = (vendorId: string) => {
    setSelectedVendorId(vendorId);
    setSelectedBillId('');
    setPayAmount('');
  };

  const handleSelectBill = (billId: string) => {
    setSelectedBillId(billId);
    const bill = purchaseBills.find((b) => b.id === billId);
    if (bill) {
      setPayAmount(String(bill.balancePayable));
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const vendor = financeVendors.find((v) => v.id === selectedVendorId);
    if (!vendor) {
      alert('Please select a vendor.');
      return;
    }
    const amt = Number(payAmount) || 0;
    if (amt <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    const bank = bankAccounts.find((b) => b.id === selectedBankId) || bankAccounts[0];
    const bill = purchaseBills.find((b) => b.id === selectedBillId);

    const voucherNumber = `RSB-PV-2026-${String(vendorPayments.length + 1).padStart(3, '0')}`;

    await addVendorPayment({
      voucherNumber,
      paymentDate: payDate,
      vendorId: vendor.id,
      vendorName: vendor.companyName,
      linkedBillId: bill?.id,
      linkedBillNumber: bill?.billNumber,
      projectName: bill?.projectName,
      amount: amt,
      paymentMode: payMode,
      bankAccountId: bank.id,
      bankAccountName: bank.accountName,
      transactionReference: reference.trim() || undefined,
      utrNumber: reference.trim() || undefined,
      remarks: remarks.trim() || `Payment against bill ${bill?.billNumber || 'Advance'}`,
      paymentType: bill ? 'bill_payment' : 'advance',
      createdBy: 'Accountant',
    });

    setIsModalOpen(false);
  };

  const handlePrintVoucher = (vp: VendorPayment) => {
    const vendor = financeVendors.find((v) => v.id === vp.vendorId);
    setSelectedDocForPrint({
      type: 'vendor_payment_voucher',
      title: 'VENDOR PAYMENT VOUCHER',
      docNumber: vp.voucherNumber,
      date: vp.paymentDate,
      partyName: vp.vendorName,
      partyGstin: vendor?.gstin,
      partyAddress: vendor?.billingAddress,
      partyPhone: vendor?.mobile,
      paymentMode: vp.paymentMode,
      transactionRef: vp.utrNumber || vp.transactionReference,
      projectName: vp.projectName,
      items: [
        {
          srNo: 1,
          description: vp.remarks || `Settlement towards Bill ${vp.linkedBillNumber || 'Advance'}`,
          qty: 1,
          unit: 'Payment',
          rate: vp.amount,
          taxableAmount: vp.amount,
          totalAmount: vp.amount,
        },
      ],
      grandTotal: vp.amount,
      notes: `Deducted from ${vp.bankAccountName}. Official payment voucher issued by RSB Industries.`,
    });
  };

  const vendorPendingBills = purchaseBills.filter(
    (b) => b.vendorId === selectedVendorId && b.balancePayable > 0
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Vendor Payment Vouchers
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Record supplier settlements, issue payment slips, track UTR numbers, and reconcile payables.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search voucher or vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-slate-900 w-56 shadow-2xs"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              if (financeVendors.length > 0) setSelectedVendorId(financeVendors[0].id);
              if (bankAccounts.length > 0) setSelectedBankId(bankAccounts[0].id);
              setIsModalOpen(true);
            }}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ Record Vendor Payment</span>
          </button>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {filteredPayments.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No vendor payment vouchers recorded. Click <strong>+ Record Vendor Payment</strong> to register a payout.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Voucher #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Vendor Name</th>
                  <th className="py-2.5 px-3">Linked Bill</th>
                  <th className="py-2.5 px-3">Mode & Bank</th>
                  <th className="py-2.5 px-3 font-mono">Reference / UTR</th>
                  <th className="py-2.5 px-3 text-right">Amount Paid</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((vp) => (
                  <tr key={vp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {vp.voucherNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                      {formatDateIndian(vp.paymentDate)}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 truncate max-w-[200px]">
                      {vp.vendorName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">
                      {vp.linkedBillNumber || 'Advance / General'}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                      {vp.paymentMode} ({vp.bankAccountName})
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700 text-[11px]">
                      {vp.utrNumber || vp.transactionReference || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700 whitespace-nowrap">
                      {formatINR(vp.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePrintVoucher(vp)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 rounded font-bold text-[11px] inline-flex items-center gap-1 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5 text-blue-600" />
                          <span>Print Voucher</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Delete this vendor payment?')) deleteVendorPayment(vp.id);
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

      {/* RECORD PAYMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
            <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-2">
              Record Supplier Payment
            </h2>

            <form onSubmit={handleRecordPayment} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Select Vendor / Supplier *
                </label>
                <select
                  required
                  value={selectedVendorId}
                  onChange={(e) => handleSelectVendor(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                >
                  <option value="">-- Choose Vendor --</option>
                  {financeVendors.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.companyName} (Outstanding: {formatINR(v.currentOutstanding)})
                    </option>
                  ))}
                </select>
              </div>

              {vendorPendingBills.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Link Unpaid Purchase Bill (Optional)
                  </label>
                  <select
                    value={selectedBillId}
                    onChange={(e) => handleSelectBill(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="">-- General Advance / Unlinked --</option>
                    {vendorPendingBills.map((b) => (
                      <option key={b.id} value={b.id}>
                        Bill #{b.billNumber} (Inv #{b.vendorInvoiceNumber} - Balance: {formatINR(b.balancePayable)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Payment Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Payment Mode
                  </label>
                  <select
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value as any)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="Bank Transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="UPI">UPI Payment</option>
                    <option value="Cheque">Cheque</option>
                    <option value="Cash">Cash in Hand</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Deduct From Account *
                  </label>
                  <select
                    required
                    value={selectedBankId}
                    onChange={(e) => setSelectedBankId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    {bankAccounts.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.accountName} ({formatINR(b.currentBalance)})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Bank Reference / UTR Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. HDFCR92026110300981"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                />
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
                  Confirm & Post Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Universal Printable Voucher Modal */}
      {selectedDocForPrint && (
        <PrintableDocumentModal
          data={selectedDocForPrint}
          onClose={() => setSelectedDocForPrint(null)}
        />
      )}
    </div>
  );
};

