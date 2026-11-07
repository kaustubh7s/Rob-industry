import React, { useState, useMemo } from 'react';
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
  AlertTriangle,
  Receipt,
  FileCheck2,
  Calendar,
} from 'lucide-react';
import { useAccounts } from '../../context/AccountsContext';
import { BankAccount } from '../../types/finance';

export const BankAndCashView: React.FC = () => {
  const {
    bankAccounts,
    journalEntries,
    transferBankFunds,
    depositFundsToAccount,
    checkDuplicateReference,
    addBankAccount,
  } = useAccounts();

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activityFilter, setActivityFilter] = useState<'all' | 'inflow' | 'outflow'>('all');

  // Transfer form state
  const [fromAccountId, setFromAccountId] = useState(bankAccounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(bankAccounts[1]?.id || '');
  const [transferAmount, setTransferAmount] = useState<number>(50000);
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferReference, setTransferReference] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  // Add Money / Deposit form state
  const [depositAccountId, setDepositAccountId] = useState(bankAccounts[0]?.id || '');
  const [depositAmount, setDepositAmount] = useState<number>(100000);
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);
  const [depositType, setDepositType] = useState<
    'capital' | 'customer' | 'interest' | 'loan' | 'other'
  >('customer');
  const [depositParty, setDepositParty] = useState('');
  const [depositReference, setDepositReference] = useState('');
  const [depositNotes, setDepositNotes] = useState('');

  // New Account form state
  const [newAccName, setNewAccName] = useState('');
  const [newBankName, setNewBankName] = useState('');
  const [newAccNumber, setNewAccNumber] = useState('');
  const [newIfsc, setNewIfsc] = useState('');
  const [newBranch, setNewBranch] = useState('');
  const [newAccType, setNewAccType] = useState<'bank' | 'cash'>('bank');
  const [newOpeningBal, setNewOpeningBal] = useState<number>(0);

  // Live duplicate check for Deposit reference
  const depositDuplicateCheck = useMemo(() => {
    return checkDuplicateReference(depositReference);
  }, [checkDuplicateReference, depositReference]);

  // Live duplicate check for Transfer reference
  const transferDuplicateCheck = useMemo(() => {
    return checkDuplicateReference(transferReference);
  }, [checkDuplicateReference, transferReference]);

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
  const bankLedgerTransactions = useMemo(() => {
    return journalEntries
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
        // Activity filter
        if (activityFilter === 'inflow' && !tx.isDebit) return false;
        if (activityFilter === 'outflow' && tx.isDebit) return false;

        // Search query
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          tx.narration.toLowerCase().includes(query) ||
          tx.voucherNumber.toLowerCase().includes(query) ||
          tx.accountName.toLowerCase().includes(query) ||
          (tx.reference && tx.reference.toLowerCase().includes(query))
        );
      });
  }, [journalEntries, selectedAccountId, selectedBank, bankAccounts, activityFilter, searchQuery]);

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
      reference: transferReference,
      notes: transferNotes,
    });

    setIsTransferModalOpen(false);
    setTransferReference('');
    setTransferNotes('');
  };

  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositAccountId) {
      alert('Please select a destination account.');
      return;
    }
    if (depositAmount <= 0) {
      alert('Please enter a positive deposit amount.');
      return;
    }

    // Duplicate check confirmation
    if (depositDuplicateCheck.isDuplicate) {
      const proceed = confirm(
        `⚠️ DUPLICATE PAYMENT WARNING:\n\nThe reference "${depositReference}" is already recorded in the system:\n${depositDuplicateCheck.matchedRecord?.details}\n\nAre you absolutely sure this is NOT a duplicate entry or double wire transfer? Click OK only if this is a separate transaction.`
      );
      if (!proceed) return;
    }

    await depositFundsToAccount({
      accountId: depositAccountId,
      amount: depositAmount,
      date: depositDate,
      depositType,
      sourceParty: depositParty.trim() || undefined,
      reference: depositReference.trim() || undefined,
      notes: depositNotes.trim() || undefined,
    });

    setIsDepositModalOpen(false);
    setDepositAmount(100000);
    setDepositParty('');
    setDepositReference('');
    setDepositNotes('');
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
            Real-time bank balances, fund deposits, contra transfers, and anti-duplicate payment audit logs
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Quick Add Money / Deposit Funds Button */}
          <button
            type="button"
            onClick={() => {
              setDepositAccountId(bankAccounts[0]?.id || '');
              setIsDepositModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-200" />
            <span>Add Money / Deposit</span>
          </button>

          {/* Contra Transfer Button */}
          <button
            type="button"
            onClick={() => setIsTransferModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
            <span>Contra Transfer</span>
          </button>

          {/* Add Account Head Button */}
          <button
            type="button"
            onClick={() => setIsAddAccountModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer border border-slate-200"
          >
            <Plus className="w-4 h-4" />
            <span>Add Account</span>
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
            <span className="text-xs font-medium text-slate-500">Anti-Duplicate Protection</span>
            <span className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <FileCheck2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-700">ACTIVE</div>
          <div className="text-xs text-purple-600 font-medium mt-1">UTR & Cheque duplicate prevention</div>
        </div>
      </div>

      {/* Account Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Configured Bank & Cash Vaults
          </h3>
          <span className="text-xs text-slate-500">
            Click <strong className="text-emerald-700">+ Add Money</strong> on any card to credit funds
          </span>
        </div>

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
                    {acc.isDefault
                      ? 'Primary Current A/c'
                      : acc.accountType === 'cash'
                      ? 'Cash Safe'
                      : 'Current A/c'}
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
              <div className="mt-5 pt-3 border-t border-slate-100/10 flex items-end justify-between gap-2">
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

                <div className="flex items-center gap-1.5">
                  {/* Option to Add Money to this specific account */}
                  <button
                    type="button"
                    onClick={() => {
                      setDepositAccountId(acc.id);
                      setIsDepositModalOpen(true);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs ${
                      acc.isDefault
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold'
                        : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                    }`}
                    title={`Add Money / Record Inflow to ${acc.accountName}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Money</span>
                  </button>

                  {/* Transfer Option */}
                  <button
                    type="button"
                    onClick={() => {
                      setFromAccountId(acc.id);
                      setIsTransferModalOpen(true);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                      acc.isDefault
                        ? 'bg-white/10 hover:bg-white/20 text-white'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                    title="Transfer money between accounts"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Transfer</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bank & Cash Transactions & Anti-Duplicate Audit Log */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm">
                Bank & Cash Transaction History & Audit Trail
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                Anti-Duplicate Protected
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Immutable ledger of all money inflows, customer deposits, vendor payouts, and transfers
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Activity Type Filters */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActivityFilter('all')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activityFilter === 'all'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Activity
              </button>
              <button
                type="button"
                onClick={() => setActivityFilter('inflow')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activityFilter === 'inflow'
                    ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-emerald-700'
                }`}
              >
                Money In (+)
              </button>
              <button
                type="button"
                onClick={() => setActivityFilter('outflow')}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  activityFilter === 'outflow'
                    ? 'bg-white text-rose-800 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-rose-700'
                }`}
              >
                Money Out (−)
              </button>
            </div>

            {/* Filter by specific account */}
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 font-semibold focus:outline-none"
            >
              <option value="all">All Accounts</option>
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.accountName}
                </option>
              ))}
            </select>

            {/* Search by UTR, voucher or narration */}
            <div className="relative w-48 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search UTR, party, voucher..."
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Voucher No</th>
                <th className="py-3 px-4">Bank / Cash Account</th>
                <th className="py-3 px-4">Narration & Beneficiary Details</th>
                <th className="py-3 px-4">UTR / Cheque Ref</th>
                <th className="py-3 px-4 text-right">Money In (Dr)</th>
                <th className="py-3 px-4 text-right">Money Out (Cr)</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {bankLedgerTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No transactions found</p>
                    <p className="text-slate-400 mt-0.5">
                      Use "+ Add Money / Deposit" above to credit funds, or record customer receipts & vendor payments
                    </p>
                  </td>
                </tr>
              ) : (
                bankLedgerTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-600 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(tx.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-slate-800">
                      {tx.voucherNumber}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-900">{tx.accountName}</span>
                    </td>

                    <td className="py-3 px-4 text-slate-700 max-w-md">
                      <div className="font-medium text-slate-800">{tx.narration}</div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {tx.reference ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px] font-bold border border-slate-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {tx.reference}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {tx.isDebit ? (
                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">
                          <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
                          +₹{tx.amount.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {!tx.isDebit ? (
                        <span className="inline-flex items-center gap-1 font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded">
                          <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                          -₹{tx.amount.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        Audited
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Money / Deposit Funds (With Live Anti-Duplicate Checker) */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-emerald-50/70">
              <div>
                <h3 className="text-base font-bold text-emerald-950 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-emerald-700" />
                  Add Money / Record Bank Deposit
                </h3>
                <p className="text-xs text-emerald-800/80 mt-0.5">
                  Credit funds into company account with automatic double-entry and anti-duplicate check
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDepositModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-emerald-100 flex items-center justify-center text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDepositSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Destination Account (Credit Into) *
                </label>
                <select
                  value={depositAccountId}
                  onChange={(e) => setDepositAccountId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white font-semibold text-slate-900"
                >
                  {bankAccounts.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.accountName} {b.isDefault ? '(Primary)' : ''} — Current: ₹
                      {b.currentBalance.toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Deposit Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date Received *
                  </label>
                  <input
                    type="date"
                    value={depositDate}
                    onChange={(e) => setDepositDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Inflow Category *
                  </label>
                  <select
                    value={depositType}
                    onChange={(e) => setDepositType(e.target.value as any)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-semibold"
                  >
                    <option value="customer">Direct Customer NEFT / RTGS</option>
                    <option value="capital">Owner / Shareholder Capital</option>
                    <option value="interest">Bank Interest / Dividend</option>
                    <option value="loan">Bank OD / Loan Credit</option>
                    <option value="other">Other Inflow / Refund</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Source / Remitter Name
                  </label>
                  <input
                    type="text"
                    value={depositParty}
                    onChange={(e) => setDepositParty(e.target.value)}
                    placeholder="e.g. Apex Engineering Solutions"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              </div>

              {/* UTR / Reference with Live Duplicate Detection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bank UTR / Transaction Reference Number
                </label>
                <input
                  type="text"
                  value={depositReference}
                  onChange={(e) => setDepositReference(e.target.value)}
                  placeholder="e.g. UTR-HDFC98421098 or CHQ-445512"
                  className={`w-full px-3 py-2 border rounded-lg text-sm font-mono ${
                    depositDuplicateCheck.isDuplicate
                      ? 'border-amber-400 bg-amber-50/50 text-amber-950 focus:ring-2 focus:ring-amber-500'
                      : 'border-slate-200 focus:ring-2 focus:ring-slate-900'
                  }`}
                />

                {/* Real-time Anti-Duplicate Warning */}
                {depositDuplicateCheck.isDuplicate && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">⚠️ Warning: Duplicate Reference Detected!</span>
                      <p className="mt-0.5 text-[11px] text-amber-800 leading-relaxed">
                        This reference number was already recorded in the system:{' '}
                        <strong>{depositDuplicateCheck.matchedRecord?.details}</strong>.
                        Please verify that this is not an accidental double-entry or duplicate payout!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Purpose / Narration
                </label>
                <input
                  type="text"
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                  placeholder="e.g. Stage-2 Fabrication Milestone payment credited via RTGS"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsDepositModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Credit & Record Inflow</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Contra Transfer (With Live Anti-Duplicate Checker) */}
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
                  value={transferReference}
                  onChange={(e) => setTransferReference(e.target.value)}
                  placeholder="e.g. CHQ-889012 or UTR-HDFC..."
                  className={`w-full px-3 py-2 border rounded-lg text-sm font-mono ${
                    transferDuplicateCheck.isDuplicate
                      ? 'border-amber-400 bg-amber-50/50'
                      : 'border-slate-200'
                  }`}
                />

                {transferDuplicateCheck.isDuplicate && (
                  <div className="mt-2 p-2.5 bg-amber-50 border border-amber-300 rounded-lg flex items-center gap-2 text-xs text-amber-900">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>
                      Notice: Reference already exists in audit logs (
                      {transferDuplicateCheck.matchedRecord?.details}).
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Purpose / Narration
                </label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
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

      {/* Modal: Add Account Head */}
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
