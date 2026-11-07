import React, { useState } from 'react';
import {
  Layers,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  ArrowRight,
  X,
} from 'lucide-react';
import { useAccounts } from '../../context/AccountsContext';
import { AccountHead, AccountCategory, AccountGroup } from '../../types/finance';

export const ChartOfAccountsView: React.FC = () => {
  const { chartOfAccounts, addChartAccount, setActiveView } = useAccounts();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | AccountCategory>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form State for New Account Head
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<AccountCategory>('Assets');
  const [newGroup, setNewGroup] = useState<AccountGroup>('Bank Accounts');
  const [newOpeningBalance, setNewOpeningBalance] = useState<number>(0);
  const [newDescription, setNewDescription] = useState('');

  // Category counts
  const assetCount = chartOfAccounts.filter((a) => a.category === 'Assets').length;
  const liabilityCount = chartOfAccounts.filter((a) => a.category === 'Liabilities').length;
  const equityCount = chartOfAccounts.filter((a) => a.category === 'Equity').length;
  const incomeCount = chartOfAccounts.filter((a) => a.category === 'Income').length;
  const expenseCount = chartOfAccounts.filter((a) => a.category === 'Expenses').length;

  const filteredAccounts = chartOfAccounts.filter((acc) => {
    const matchesSearch =
      acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.group.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || acc.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCode || !newName) {
      alert('Account code and name are required.');
      return;
    }

    if (chartOfAccounts.some((a) => a.code === newCode.trim())) {
      alert(`Account Code ${newCode} already exists. Please choose a unique code.`);
      return;
    }

    const newHead: AccountHead = {
      id: `head-${Date.now()}`,
      code: newCode.trim(),
      name: newName.trim(),
      category: newCategory,
      group: newGroup,
      openingBalance: Number(newOpeningBalance) || 0,
      currentBalance: Number(newOpeningBalance) || 0,
      description: newDescription.trim() || undefined,
      isActive: true,
      isSystem: false,
    };

    await addChartAccount(newHead);
    setIsAddModalOpen(false);

    // Reset
    setNewCode('');
    setNewName('');
    setNewOpeningBalance(0);
    setNewDescription('');
  };

  const getCategoryBadge = (category: AccountCategory) => {
    switch (category) {
      case 'Assets':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            Assets
          </span>
        );
      case 'Liabilities':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Liabilities
          </span>
        );
      case 'Equity':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            Equity
          </span>
        );
      case 'Income':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Income / Sales
          </span>
        );
      case 'Expenses':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            Expenses
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-indigo-600" />
            Chart of Accounts
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Standard Indian accounting master heads: Assets, Liabilities, Equity, Revenue, and Expenses
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>Add Account Head</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div
          onClick={() => setSelectedCategory('Assets')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedCategory === 'Assets'
              ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold text-slate-500">1000s Assets</div>
          <div className="mt-1 text-2xl font-bold text-blue-700">{assetCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Bank, Cash, Debtors, Plant</div>
        </div>

        <div
          onClick={() => setSelectedCategory('Liabilities')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedCategory === 'Liabilities'
              ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold text-slate-500">2000s Liabilities</div>
          <div className="mt-1 text-2xl font-bold text-amber-700">{liabilityCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Creditors, GST Duties & Taxes</div>
        </div>

        <div
          onClick={() => setSelectedCategory('Equity')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedCategory === 'Equity'
              ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold text-slate-500">3000s Equity</div>
          <div className="mt-1 text-2xl font-bold text-purple-700">{equityCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Share Capital & Reserves</div>
        </div>

        <div
          onClick={() => setSelectedCategory('Income')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedCategory === 'Income'
              ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold text-slate-500">4000s Revenue</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700">{incomeCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Machine Sales, Fabrication</div>
        </div>

        <div
          onClick={() => setSelectedCategory('Expenses')}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            selectedCategory === 'Expenses'
              ? 'bg-rose-50/80 border-rose-300 ring-2 ring-rose-500/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-xs font-semibold text-slate-500">5000s Expenses</div>
          <div className="mt-1 text-2xl font-bold text-rose-700">{expenseCount}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Purchases, Power, Labor</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search account code, name, or group..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
          {(['all', 'Assets', 'Liabilities', 'Equity', 'Income', 'Expenses'] as const).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {cat === 'all' ? 'All Heads' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Chart of Accounts Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Account Code</th>
                <th className="py-3 px-4">Account Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Account Group</th>
                <th className="py-3 px-4 text-right">Current Balance</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal text-xs">
              {filteredAccounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{acc.code}</td>

                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">{acc.name}</div>
                    {acc.description && (
                      <div className="text-[11px] text-slate-400 mt-0.5">{acc.description}</div>
                    )}
                  </td>

                  <td className="py-3 px-4">{getCategoryBadge(acc.category)}</td>

                  <td className="py-3 px-4 font-medium text-slate-700">{acc.group}</td>

                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    ₹{acc.currentBalance.toLocaleString('en-IN')}
                    <span className="text-[10px] text-slate-400 font-normal ml-1">
                      {acc.category === 'Assets' || acc.category === 'Expenses' ? 'Dr' : 'Cr'}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      <CheckCircle2 className="w-3 h-3" /> Active
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setActiveView('general-ledger')}
                      className="px-2.5 py-1 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>View Ledger</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Account Head */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                Add New Chart Account Head
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Account Code *
                  </label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="e.g. 5060"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as AccountCategory)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option value="Assets">Assets (1000s)</option>
                    <option value="Liabilities">Liabilities (2000s)</option>
                    <option value="Equity">Equity (3000s)</option>
                    <option value="Income">Income (4000s)</option>
                    <option value="Expenses">Expenses (5000s)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Name *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Factory Boiler Maintenance"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Account Group *
                  </label>
                  <select
                    value={newGroup}
                    onChange={(e) => setNewGroup(e.target.value as AccountGroup)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option value="Bank Accounts">Bank Accounts</option>
                    <option value="Cash in Hand">Cash in Hand</option>
                    <option value="Accounts Receivable">Accounts Receivable</option>
                    <option value="Inventory">Inventory</option>
                    <option value="Fixed Assets">Fixed Assets</option>
                    <option value="Accounts Payable">Accounts Payable</option>
                    <option value="Duties & Taxes">Duties & Taxes</option>
                    <option value="GST Payable">GST Payable</option>
                    <option value="Capital Account">Capital Account</option>
                    <option value="Sales Accounts">Sales Accounts</option>
                    <option value="Direct Income">Direct Income</option>
                    <option value="Cost of Goods Sold">Cost of Goods Sold</option>
                    <option value="Administrative Expenses">Administrative Expenses</option>
                    <option value="Operating Expenses">Operating Expenses</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Opening Balance (₹)
                  </label>
                  <input
                    type="number"
                    value={newOpeningBalance}
                    onChange={(e) => setNewOpeningBalance(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description / Remarks
                </label>
                <textarea
                  rows={2}
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Purpose of this account ledger..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Save Account Head
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
