import React, { useState } from 'react';
import {
  Landmark,
  Wallet,
  ArrowRightLeft,
  Plus,
  Search,
  CheckCircle2,
  Building,
  ArrowUpRight,
  ArrowDownLeft,
  X,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { useAccounts } from '../../context/AccountsContext';
import { BankAccount } from '../../types/finance';

export const BankAndCashView: React.FC = () => {
  const {
    bankAccounts,
    journalEntries,
    transferBankFunds,
    addBankAccount,
  } = useAccounts();

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Transfer form state
  const [fromAccountId, setFromAccountId] = useState(bankAccounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(bankAccounts[1]?.id || '');
  const [transferAmount, setTransferAmount] = useState<number>(50000);
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');

  // New Account form state
  const [newAccName, setNewAccName] = useState('');
  const [newBankName, setNewBankName] = useState('');
  const [newAccNumber, setNewAccNumber] = useState('');
  const [newIfsc, setNewIfsc] = useState('');
  const [newBranch, setNewBranch] = useState('');
  const [newAccType, setNewAccType] = useState<'bank' | 'cash'>('bank');
  const [newOpeningBal, setNewOpeningBal] = useState<number>(0);

  // Totals
  const totalLiquid = bankAccounts.reduce((sum, b) => sum + (b.currentBalance || 0), 0);
  const totalBank = bankAccounts
    .filter((b) => b.accountType === 'bank')
    .reduce((sum, b) => sum + (b.currentBalance || 0), 0);
  const totalCash = bankAccounts
    .filter((b) => b.accountType === 'cash')
    .reduce((sum, b) => sum + (b.currentBalance || 0), 0);

  const selectedBank = bankAccounts.find((b) => b.id === selectedAccountId);

  // Extract bank/cash ledger transactions from journal entries
  const bankLedgerTransactions = journalEntries
    .filter((jv) =>
      jv.lines.some((line) => {
        if (selectedAccountId === 'all') {
          return line.accountCode.startsWith('10'); // 1000 Cash, 1010 HDFC, 1020 SBI, etc.
        }
        return (
          selectedBank &&
          (line.accountName.toLowerCase().includes(selectedBank.accountName.toLowerCase()) ||
            line.accountId === selectedBank.id)
        );
      })
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .map((jv) => {
      // Find the specific line for bank
      const targetLine = jv.lines.find((line) => {
        if (selectedAccountId === 'all') return line.accountCode.startsWith('10');
        return (
          selectedBank &&
          (line.accountName.toLowerCase().includes(selectedBank.accountName.toLowerCase()) ||
            line.accountId === selectedBank.id)
        );
      });

      const isDebit = (targetLine?.debit || 0) > 0;
      const amount = isDebit ? targetLine?.debit || 0 : targetLine?.credit || 0;
      const accountObj = bankAccounts.find(
        (b) =>
          targetLine &&
          (b.id === targetLine.accountId ||
            targetLine.accountName.toLowerCase().includes(b.accountName.toLowerCase()))
      );

      return {
        id: jv.id,
        date: jv.date,
        voucherNumber: jv.voucherNumber,
        reference: jv.referenceNumber || jv.referenceId,
        narration: jv.narration,
        accountName: accountObj?.accountName || targetLine?.accountName || 'Bank / Cash',
        isDebit,
        amount,
      };
    })
    .filter((tx) => {
      if (!searchQuery) return true;
      return (
        tx.narration.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.voucherNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.reference && tx.reference.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromAccountId || !toAccountId) {
      alert('Please select both source and destination accounts.');
      return;
    }
    if (fromAccountId === toAccountId) {
      alert('Source and destination accounts must be different.');
      return;
    }
    if (transferAmount <= 0) {
      alert('Please enter a positive transfer amount.');
      return;
    }

    const fromAcc = bankAccounts.find((b) => b.id === fromAccountId);
    if (fromAcc && fromAcc.currentBalance < transferAmount) {
      if (
        !confirm(
          `Warning: Source account (${fromAcc.accountName}) only has ₹${fromAcc.currentBalance.toLocaleString(
            'en-IN'
          )}. Proceeding will create an overdraft. Continue?`
        )
      ) {
        return;
      }
    }

    await transferBankFunds({
      fromAccountId,
      toAccountId,
      amount: transferAmount,
      date: transferDate,
      reference,
      notes,
    });

    setIsTransferModalOpen(false);
    setReference('');
    setNotes('');
  };

  const handleCreateAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccName) {
      alert('Account name is required.');
      return;
    }

    await addBankAccount({
      accountName: newAccName,
      bankName: newAccType === 'bank' ? newBankName : 'Cash Register',
      accountNumber: newAccType === 'bank' ? newAccNumber : 'CASH-VAULT',
      ifsc: newAccType === 'bank' ? newIfsc : 'N/A',
      branch: newAccType === 'bank' ? newBranch : 'Factory Premises',
      accountType: newAccType,
      openingBalance: Number(newOpeningBal) || 0,
      currentBalance: Number(newOpeningBal) || 0,
      status: 'active',
      isDefault: false,
    });

    setIsAddAccountModalOpen(false);
    setNewAccName('');
    setNewBankName('');
    setNewAccNumber('');
    setNewIfsc('');
    setNewBranch('');
    setNewOpeningBal(0);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Landmark className="w-6 h-6 text-emerald-600" />
            Bank & Cash Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time bank balances, petty cash registers, contra transfers, and liquidity tracking
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsAddAccountModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer border border-slate-200"
          >
            <Plus className="w-4 h-4" />
            <span>Add Account</span>
          </button>

          <button
            type="button"
            onClick={() => setIsTransferModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
            <span>Contra Transfer</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Liquid Funds</span>
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            ₹{totalLiquid.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-emerald-600 font-medium mt-1">Available company liquidity</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Bank Accounts Balance</span>
            <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Landmark className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-700">
            ₹{totalBank.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-500 mt-1">Across active current accounts</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Petty Cash in Hand</span>
            <span className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700">
            ₹{totalCash.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-500 mt-1">Cash in office safe & factory floor</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Accounts</span>
            <span className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Building className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-700">{bankAccounts.length}</div>
          <div className="text-xs text-slate-500 mt-1">Operational financial institutions</div>
        </div>
      </div>

      {/* Account Cards Grid */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3">
          Configured Bank & Cash Vaults
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bankAccounts.map((acc) => (
            <div
              key={acc.id}
              className={`p-5 rounded-2xl border transition-all ${
                acc.isDefault
                  ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white border-slate-800 shadow-md'
                  : 'bg-white text-slate-900 border-slate-200/90 shadow-2xs hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span
                    className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase mb-1.5 ${
                      acc.isDefault
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : acc.accountType === 'cash'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {acc.isDefault ? 'Primary Current A/c' : acc.accountType === 'cash' ? 'Cash Safe' : 'Current A/c'}
                  </span>
                  <h4
                    className={`font-bold text-base leading-snug ${
                      acc.isDefault ? 'text-white' : 'text-slate-900'
                    }`}
                  >
                    {acc.accountName}
                  </h4>
                  <p
                    className={`text-xs mt-0.5 ${
                      acc.isDefault ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {acc.bankName}
                  </p>
                </div>
                <div
                  className={`p-2.5 rounded-xl ${
                    acc.isDefault
                      ? 'bg-white/10 text-emerald-400'
                      : acc.accountType === 'cash'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  {acc.accountType === 'cash' ? (
                    <Wallet className="w-5 h-5" />
                  ) : (
                    <Landmark className="w-5 h-5" />
                  )}
                </div>
              </div>

              {/* Account Numbers & IFSC */}
              <div
                className={`mt-4 pt-3 border-t text-xs space-y-1 font-mono ${
                  acc.isDefault ? 'border-white/10 text-slate-300' : 'border-slate-100 text-slate-600'
                }`}
              >
                <div className="flex justify-between">
                  <span className="font-sans text-[11px] text-slate-400">Account No:</span>
                  <span className="font-semibold">{acc.accountNumber}</span>
                </div>
                {acc.accountType === 'bank' && (
                  <div className="flex justify-between">
                    <span className="font-sans text-[11px] text-slate-400">IFSC:</span>
                    <span className="font-semibold">{acc.ifsc}</span>
                  </div>
                )}
                {acc.branch && (
                  <div className="flex justify-between font-sans">
                    <span className="text-[11px] text-slate-400">Branch:</span>
                    <span className="truncate max-w-[180px]">{acc.branch}</span>
                  </div>
                )}
              </div>

              {/* Current Balance */}
              <div className="mt-5 pt-3 border-t border-slate-100/10 flex items-end justify-between">
                <div>
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider ${
                      acc.isDefault ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    Current Book Balance
                  </span>
                  <div
                    className={`text-xl font-extrabold tracking-tight mt-0.5 ${
                      acc.isDefault ? 'text-emerald-400' : 'text-slate-900'
                    }`}
                  >
                    ₹{acc.currentBalance.toLocaleString('en-IN')}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setFromAccountId(acc.id);
                    setIsTransferModalOpen(true);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                    acc.isDefault
                      ? 'bg-white/10 hover:bg-white/20 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <ArrowRightLeft className="w-3.5 h-3.5" />
                  <span>Transfer</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bank & Cash Transactions Ledger */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm">Bank & Cash Activity Ledger</h3>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold">
              {bankLedgerTransactions.length} entries
            </span>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 font-semibold focus:outline-none"
            >
              <option value="all">All Bank & Cash Accounts</option>
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.accountName}
                </option>
              ))}
            </select>

            <div className="relative w-48 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ledger..."
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Voucher No</th>
                <th className="py-3 px-4">Account</th>
                <th className="py-3 px-4">Narration & Description</th>
                <th className="py-3 px-4 text-right">Money In (Dr)</th>
                <th className="py-3 px-4 text-right">Money Out (Cr)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {bankLedgerTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No bank ledger transactions found</p>
                    <p className="text-slate-400 mt-0.5">
                      Customer receipts, vendor payments, and contra transfers will reflect here
                    </p>
                  </td>
                </tr>
              ) : (
                bankLedgerTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium">
                      {new Date(tx.date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-slate-800">
                      {tx.voucherNumber}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-900">{tx.accountName}</span>
                    </td>

                    <td className="py-3 px-4 text-slate-700 max-w-md">
                      <div>{tx.narration}</div>
                      {tx.reference && (
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Ref: {tx.reference}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {tx.isDebit ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                          <ArrowDownLeft className="w-3 h-3" />
                          +₹{tx.amount.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {!tx.isDebit ? (
                        <span className="inline-flex items-center gap-1 font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                          <ArrowUpRight className="w-3 h-3" />
                          -₹{tx.amount.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Contra Transfer */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
                Inter-Account Contra Transfer
              </h3>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleTransferSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  From Account (Transfer Out) *
                </label>
                <select
                  value={fromAccountId}
                  onChange={(e) => setFromAccountId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.accountName} (Balance: ₹{b.currentBalance.toLocaleString('en-IN')})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  To Account (Transfer In) *
                </label>
                <select
                  value={toAccountId}
                  onChange={(e) => setToAccountId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                >
                  {bankAccounts
                    .filter((b) => b.id !== fromAccountId)
                    .map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.accountName} (Balance: ₹{b.currentBalance.toLocaleString('en-IN')})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Transfer Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cheque / UTR / Reference No
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. CHQ-889012 or UTR-HDFC..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Purpose / Narration
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Cash withdrawal from bank for petty cash vault"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Account */}
      {isAddAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" />
                Add Bank or Cash Account
              </h3>
              <button
                type="button"
                onClick={() => setIsAddAccountModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAccountSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Type *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewAccType('bank')}
                    className={`py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      newAccType === 'bank'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Bank Current Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewAccType('cash')}
                    className={`py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      newAccType === 'cash'
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    Petty Cash Safe
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Display Name *
                </label>
                <input
                  type="text"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  placeholder="e.g. Axis Bank - Project Escrow"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              {newAccType === 'bank' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Bank Name
                      </label>
                      <input
                        type="text"
                        value={newBankName}
                        onChange={(e) => setNewBankName(e.target.value)}
                        placeholder="Axis Bank Ltd"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Account Number
                      </label>
                      <input
                        type="text"
                        value={newAccNumber}
                        onChange={(e) => setNewAccNumber(e.target.value)}
                        placeholder="9220200..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        IFSC Code
                      </label>
                      <input
                        type="text"
                        value={newIfsc}
                        onChange={(e) => setNewIfsc(e.target.value)}
                        placeholder="UTIB0000..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Branch
                      </label>
                      <input
                        type="text"
                        value={newBranch}
                        onChange={(e) => setNewBranch(e.target.value)}
                        placeholder="Vatva GIDC"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Opening Balance (₹)
                </label>
                <input
                  type="number"
                  value={newOpeningBal}
                  onChange={(e) => setNewOpeningBal(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddAccountModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
