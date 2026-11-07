import React, { useState } from 'react';
import {
  Wallet,
  Search,
  Plus,
  Calendar,
  Building2,
  CheckCircle2,
  Trash2,
  Tag,
  Landmark,
} from 'lucide-react';
import { useAccounts } from '../../context/AccountsContext';
import { BusinessExpense, ExpenseCategory } from '../../types/finance';
import { formatINR, formatDateIndian } from '../../utils/accountsCalculations';

const CATEGORIES: ExpenseCategory[] = [
  'Electricity',
  'Transportation & Freight',
  'Factory Rent',
  'Maintenance & Repairs',
  'Consumables & Tools',
  'Office Expenses',
  'Staff Salaries',
  'Labour & Contractor',
  'Fuel & Travel',
  'Stationery & Printing',
  'Internet & Telecom',
  'Professional & Legal Fees',
  'Bank Charges',
  'Miscellaneous',
];

export const ExpensesView: React.FC = () => {
  const { businessExpenses, bankAccounts, addBusinessExpense, deleteBusinessExpense } = useAccounts();

  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [category, setCategory] = useState<ExpenseCategory>('Electricity');
  const [payee, setPayee] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [payMode, setPayMode] = useState<BusinessExpense['paymentMode']>('Bank Transfer');
  const [selectedBankId, setSelectedBankId] = useState('');
  const [refNumber, setRefNumber] = useState('');

  const filteredExpenses = businessExpenses.filter((e) => {
    const matchCat = categoryFilter === 'all' || e.category === categoryFilter;
    const q = search.toLowerCase();
    const matchSearch =
      e.description.toLowerCase().includes(q) ||
      e.payeeName.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const totalFilteredAmount = filteredExpenses.reduce((s, e) => s + e.amount, 0);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount) || 0;
    if (amt <= 0) {
      alert('Please enter a valid expense amount.');
      return;
    }

    const bank = bankAccounts.find((b) => b.id === selectedBankId) || bankAccounts[0];

    await addBusinessExpense({
      expenseNumber: `RSB-EXP-2026-${String(businessExpenses.length + 1).padStart(3, '0')}`,
      expenseDate: expDate,
      category,
      payeeName: payee.trim() || 'General Vendor',
      description: description.trim(),
      amount: amt,
      paymentMode: payMode,
      bankAccountId: bank.id,
      bankAccountName: bank.accountName,
      referenceNumber: refNumber.trim() || undefined,
      approvalStatus: 'approved',
      createdBy: 'Accountant',
    });

    setIsModalOpen(false);
    setDescription('');
    setAmount('');
    setPayee('');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Business Expenses Management
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Workshop power bills, transportation, cutting consumables, machine repairs, and office overheads.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search description or payee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-slate-900 w-56 shadow-2xs"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              if (bankAccounts.length > 0) setSelectedBankId(bankAccounts[0].id);
              setIsModalOpen(true);
            }}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>+ Record Expense</span>
          </button>
        </div>
      </div>

      {/* Category Pills & Total Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 border border-slate-200 rounded-xl shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs py-1">
          <button
            type="button"
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-1 rounded-md text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
              categoryFilter === 'all'
                ? 'bg-slate-900 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Categories
          </button>
          {CATEGORIES.slice(0, 6).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                categoryFilter === cat
                  ? 'bg-slate-900 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="text-right shrink-0">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Filtered Total:</span>
          <span className="font-mono font-bold text-sm text-slate-900">
            {formatINR(totalFilteredAmount)}
          </span>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No expenses found. Click <strong>+ Record Expense</strong> to log a business expense.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Expense #</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Payee / Vendor</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Payment Account</th>
                  <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {exp.expenseNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                      {formatDateIndian(exp.expenseDate)}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900 truncate max-w-[150px]">
                      {exp.payeeName}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 max-w-[220px] truncate">
                      {exp.description}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                      {exp.bankAccountName} ({exp.paymentMode})
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-950 whitespace-nowrap">
                      {formatINR(exp.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Delete this expense entry?')) deleteBusinessExpense(exp.id);
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* RECORD EXPENSE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 border border-slate-200">
            <h2 className="text-base font-black text-slate-900 border-b border-slate-100 pb-2">
              Record Business Expense
            </h2>

            <form onSubmit={handleAddExpense} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Expense Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Payee / Vendor / Utility Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Torrent Power Ltd or Om Logistics"
                  value={payee}
                  onChange={(e) => setPayee(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Description / Purpose *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Workshop power bill for October"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 38450"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Paid From Account *
                  </label>
                  <select
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
                    <option value="UPI">UPI</option>
                    <option value="Cash">Cash in Hand</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Bill / Reference Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. TPL-EPAY-882190"
                    value={refNumber}
                    onChange={(e) => setRefNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono"
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
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

