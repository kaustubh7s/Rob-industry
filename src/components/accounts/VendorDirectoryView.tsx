import React, { useState } from 'react';
import { Building2, Search, Plus, Phone, Mail, MapPin, Landmark, CreditCard, ShieldCheck } from 'lucide-react';
import { useAccounts } from '../../context/AccountsContext';
import { FinanceVendor } from '../../types/finance';
import { formatINR } from '../../utils/accountsCalculations';

export const VendorDirectoryView: React.FC = () => {
  const { financeVendors, purchaseBills, addFinanceVendor, setActiveView } = useAccounts();
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Vendor Form
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstin, setGstin] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('30 Days Net');

  const filteredVendors = financeVendors.filter((v) => {
    const q = search.toLowerCase();
    return (
      v.companyName.toLowerCase().includes(q) ||
      v.gstin.toLowerCase().includes(q) ||
      v.contactPerson.toLowerCase().includes(q)
    );
  });

  const handleCreateVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) return;

    await addFinanceVendor({
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim(),
      mobile: mobile.trim(),
      email: email.trim(),
      billingAddress: address.trim(),
      gstin: gstin.trim().toUpperCase(),
      state: 'Gujarat',
      stateCode: '24',
      bankName: bankName.trim(),
      accountHolder: companyName.trim(),
      accountNumber: accountNo.trim(),
      ifsc: ifsc.trim().toUpperCase(),
      paymentTerms,
      openingBalance: 0,
      currentOutstanding: 0,
      status: 'Active',
    });

    setIsModalOpen(false);
    setCompanyName('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Vendor Directory & Creditors
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Raw material suppliers, machining vendors, electrical parts distributors, and bank details.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search vendor or GSTIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-slate-900 w-60 shadow-2xs"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ Add Vendor</span>
          </button>
        </div>
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVendors.map((vendor) => {
          const vendorBills = purchaseBills.filter((b) => b.vendorId === vendor.id);
          const totalPurchases = vendorBills.reduce((s, b) => s + b.totalAmount, 0);

          return (
            <div
              key={vendor.id}
              className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-slate-400 transition-all space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">
                        {vendor.companyName}
                      </h3>
                      <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                        GSTIN: <strong>{vendor.gstin || 'Not Provided'}</strong>
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {vendor.status}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1 pt-1">
                  {vendor.contactPerson && (
                    <p className="text-[11px]">Contact: <strong>{vendor.contactPerson}</strong></p>
                  )}
                  {vendor.mobile && (
                    <p className="flex items-center gap-1.5 text-[11px] font-mono">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{vendor.mobile}</span>
                    </p>
                  )}
                  {vendor.bankName && (
                    <div className="p-2 bg-slate-50 rounded border border-slate-100 text-[10px] space-y-0.5 mt-2">
                      <span className="font-bold text-slate-500 uppercase block">Bank Remittance Info:</span>
                      <p className="font-semibold text-slate-800">{vendor.bankName}</p>
                      <p className="font-mono text-slate-600">A/c: {vendor.accountNumber} • IFSC: {vendor.ifsc}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Balances */}
              <div className="pt-3 border-t border-slate-100 space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-slate-50 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">Total Billed</span>
                    <strong className="font-mono text-slate-900 font-bold text-xs">
                      {formatINR(totalPurchases)}
                    </strong>
                  </div>
                  <div className="p-2 bg-rose-50/50 rounded-lg border border-rose-100">
                    <span className="text-[10px] text-rose-700 block">Payable Balance</span>
                    <strong className="font-mono text-rose-800 font-bold text-xs">
                      {formatINR(vendor.currentOutstanding)}
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveView('purchase-bills')}
                  className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <span>View Purchase Bills ({vendorBills.length})</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ADD VENDOR MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
            <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-2">
              Add New Vendor to Directory
            </h2>

            <form onSubmit={handleCreateVendor} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Vendor / Supplier Company Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Manav Metal Corporation"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    GSTIN (15-Digit)
                  </label>
                  <input
                    type="text"
                    placeholder="24AABCM9821A1Z2"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ketan Patel"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98250 12345"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Payment Terms
                  </label>
                  <select
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="Immediate">Immediate / Advance</option>
                    <option value="15 Days Net">15 Days Net</option>
                    <option value="30 Days Net">30 Days Net</option>
                    <option value="45 Days Net">45 Days Net</option>
                  </select>
                </div>
              </div>

              {/* Bank Details for Remittance */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-[10px] font-bold text-slate-700 uppercase block">
                  Vendor Bank Remittance Details (for RTGS/NEFT):
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    placeholder="Bank Name (e.g. Axis)"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="px-2 py-1.5 bg-white border border-slate-300 rounded text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Account Number"
                    value={accountNo}
                    onChange={(e) => setAccountNo(e.target.value)}
                    className="px-2 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
                  />
                  <input
                    type="text"
                    placeholder="IFSC Code"
                    value={ifsc}
                    onChange={(e) => setIfsc(e.target.value)}
                    className="px-2 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono"
                  />
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
                  Save Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

