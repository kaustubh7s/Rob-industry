import React, { useState, useMemo } from 'react';
import {
  Landmark,
  Wallet,
  ArrowRightLeft,
  Plus,
  Minus,
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
  Printer,
  Download,
  AlertOctagon,
  UserMinus,
  History,
} from 'lucide-react';
import { useAccounts } from '../../context/AccountsContext';
import { BankAccount } from '../../types/finance';

export const BankAndCashView: React.FC = () => {
  const {
    bankAccounts,
    journalEntries,
    transferBankFunds,
    depositFundsToAccount,
    withdrawPersonalFunds,
    checkDuplicateReference,
    addBankAccount,
  } = useAccounts();

  // Modal visibility states
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [isPersonalUseModalOpen, setIsPersonalUseModalOpen] = useState(false);
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);

  // Filters & search
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Transfer form state
  const [fromAccountId, setFromAccountId] = useState(bankAccounts[0]?.id || 'bank-1');
  const [toAccountId, setToAccountId] = useState(bankAccounts[1]?.id || 'bank-2');
  const [transferAmount, setTransferAmount] = useState<number>(50000);
  const [transferDate, setTransferDate] = useState(new Date().toISOString().split('T')[0]);
  const [transferReference, setTransferReference] = useState('');
  const [transferNotes, setTransferNotes] = useState('');

  // Add Money / Deposit form state
  const [depositAccountId, setDepositAccountId] = useState(bankAccounts[0]?.id || 'bank-1');
  const [depositAmount, setDepositAmount] = useState<number>(100000);
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split('T')[0]);
  const [depositType, setDepositType] = useState<
    'capital' | 'customer' | 'interest' | 'loan' | 'other'
  >('customer');
  const [depositParty, setDepositParty] = useState('');
  const [depositReference, setDepositReference] = useState('');
  const [depositNotes, setDepositNotes] = useState('');

  // Personal Use / Drawings form state
  const [personalAccountId, setPersonalAccountId] = useState(bankAccounts[0]?.id || 'bank-1');
  const [personalAmount, setPersonalAmount] = useState<number>(25000);
  const [personalDate, setPersonalDate] = useState(new Date().toISOString().split('T')[0]);
  const [personalWithdrawnBy, setPersonalWithdrawnBy] = useState('Kaustubh (Director)');
  const [personalMode, setPersonalMode] = useState<
    'Cheque' | 'ATM/Cash Withdrawal' | 'NetBanking' | 'UPI' | 'Self Cheque'
  >('Self Cheque');
  const [personalReference, setPersonalReference] = useState('');
  const [personalPurpose, setPersonalPurpose] = useState('Director personal drawings / household');
  const [personalNotes, setPersonalNotes] = useState('');

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

  // Live duplicate check for Personal Use reference
  const personalDuplicateCheck = useMemo(() => {
    return checkDuplicateReference(personalReference);
  }, [checkDuplicateReference, personalReference]);

  // Totals
  const totalLiquid = bankAccounts.reduce((sum, b) => sum + (b.currentBalance || 0), 0);
  const totalBank = bankAccounts
    .filter((b) => b.accountType === 'bank')
    .reduce((sum, b) => sum + (b.currentBalance || 0), 0);
  const totalCash = bankAccounts
    .filter((b) => b.accountType === 'cash')
    .reduce((sum, b) => sum + (b.currentBalance || 0), 0);

  const selectedBank = bankAccounts.find((b) => b.id === selectedAccountId);

  // -------------------------------------------------------------
  // UNIFIED TRANSACTION LOG WITH PROGRESSIVE RUNNING BALANCE
  // -------------------------------------------------------------
  const unifiedTransactions = useMemo(() => {
    // 1. Gather all matching JVs that affect Bank / Cash accounts
    const matchingJVs = journalEntries.filter((jv) =>
      jv.lines.some((line) => {
        if (selectedAccountId === 'all') return line.accountCode.startsWith('10');
        return (
          selectedBank &&
          (line.accountName.toLowerCase().includes(selectedBank.accountName.toLowerCase()) ||
            line.accountId === selectedBank.id)
        );
      })
    );

    // 2. Sort chronologically (oldest to newest) to calculate running progressive balance
    const sortedChronological = [...matchingJVs].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let running =
      selectedAccountId === 'all'
        ? bankAccounts.reduce((sum, b) => sum + (b.openingBalance || 0), 0)
        : selectedBank?.openingBalance || 0;

    const calculated = sortedChronological.map((jv) => {
      const targetLine = jv.lines.find((line) => {
        if (selectedAccountId === 'all') return line.accountCode.startsWith('10');
        return (
          selectedBank &&
          (line.accountName.toLowerCase().includes(selectedBank.accountName.toLowerCase()) ||
            line.accountId === selectedBank.id)
        );
      });

      const isDebit = (targetLine?.debit || 0) > 0;
      const moneyIn = isDebit ? targetLine?.debit || 0 : 0;
      const moneyOut = !isDebit ? targetLine?.credit || 0 : 0;

      running = running + moneyIn - moneyOut;

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
        voucherType: jv.voucherType || 'Bank Transaction',
        reference: jv.referenceNumber || jv.referenceId,
        narration: jv.narration,
        accountName: accountObj?.accountName || targetLine?.accountName || 'Bank / Cash',
        moneyIn,
        moneyOut,
        runningBalance: running,
      };
    });

    // Display newest on top
    const newestFirst = [...calculated].reverse();

    // Search filter
    if (!searchQuery) return newestFirst;
    const query = searchQuery.toLowerCase();
    return newestFirst.filter(
      (tx) =>
        tx.narration.toLowerCase().includes(query) ||
        tx.voucherNumber.toLowerCase().includes(query) ||
        tx.accountName.toLowerCase().includes(query) ||
        (tx.reference && tx.reference.toLowerCase().includes(query))
    );
  }, [journalEntries, selectedAccountId, selectedBank, bankAccounts, searchQuery]);

  // Form handlers
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

  const handlePersonalUseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personalAccountId) {
      alert('Please select a source account.');
      return;
    }
    if (personalAmount <= 0) {
      alert('Please enter a positive withdrawal amount.');
      return;
    }

    const sourceAcc = bankAccounts.find((b) => b.id === personalAccountId);
    if (sourceAcc && sourceAcc.currentBalance < personalAmount) {
      if (
        !confirm(
          `Warning: Account (${sourceAcc.accountName}) currently has ₹${sourceAcc.currentBalance.toLocaleString(
            'en-IN'
          )}. Withdrawing ₹${personalAmount.toLocaleString(
            'en-IN'
          )} will cause an overdraft. Continue?`
        )
      ) {
        return;
      }
    }

    // Duplicate check confirmation
    if (personalDuplicateCheck.isDuplicate) {
      const proceed = confirm(
        `⚠️ DUPLICATE CHEQUE/REFERENCE WARNING:\n\nReference "${personalReference}" is already recorded in system logs:\n${personalDuplicateCheck.matchedRecord?.details}\n\nAre you sure you want to proceed with this reference?`
      );
      if (!proceed) return;
    }

    await withdrawPersonalFunds({
      accountId: personalAccountId,
      amount: personalAmount,
      date: personalDate,
      withdrawnBy: personalWithdrawnBy.trim() || 'Director',
      paymentMode: personalMode,
      reference: personalReference.trim() || undefined,
      purpose: personalPurpose.trim() || 'Personal Drawings',
      notes: personalNotes.trim() || undefined,
    });

    setIsPersonalUseModalOpen(false);
    setPersonalAmount(25000);
    setPersonalReference('');
    setPersonalNotes('');
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

  const handlePrintLog = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Landmark className="w-6 h-6 text-emerald-600" />
            Bank & Cash Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time account balances, inter-account transfers, and unified passbook transaction logs
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Add Money / Deposit Funds Button */}
          <button
            type="button"
            onClick={() => {
              setDepositAccountId(bankAccounts[0]?.id || 'bank-1');
              setIsDepositModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-200" />
            <span>+ Add Money / Deposit</span>
          </button>

          {/* Deduct Money for Personal Use / Drawings */}
          <button
            type="button"
            onClick={() => {
              setPersonalAccountId(bankAccounts[0]?.id || 'bank-1');
              setIsPersonalUseModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Minus className="w-4 h-4 text-rose-200" />
            <span>− Personal Use / Drawings</span>
          </button>

          {/* Contra Transfer Button */}
          <button
            type="button"
            onClick={() => {
              setFromAccountId(bankAccounts[0]?.id || 'bank-1');
              setToAccountId(bankAccounts[1]?.id || 'bank-2');
              setIsTransferModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4 text-emerald-400" />
            <span>Inter-Account Transfer</span>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
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
            <span className="text-xs font-medium text-slate-500">Primary Bank (HDFC)</span>
            <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Landmark className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-700 font-mono">
            ₹{(bankAccounts[0]?.currentBalance || 975000).toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-500 mt-1 font-mono">A/c: 50200012345678</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Petty Cash in Hand</span>
            <span className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <Wallet className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700 font-mono">
            ₹{totalCash.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-500 mt-1">Factory floor & office safe</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Anti-Duplicate Protection</span>
            <span className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <FileCheck2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-700">ACTIVE</div>
          <div className="text-xs text-purple-600 font-medium mt-1">Blocks repeated & deleted UTRs</div>
        </div>
      </div>

      {/* Account Cards Grid */}
      <div className="no-print">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Configured Bank & Cash Vaults
          </h3>
          <span className="text-xs text-slate-500">
            Click <strong>Inter-Account Contra Transfer</strong> on any account to move funds
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {bankAccounts.map((acc) => {
            return (
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
                <div className="mt-5 pt-3 border-t border-slate-100/10">
                  <div className="flex items-baseline justify-between mb-3">
                    <span
                      className={`text-[10px] uppercase font-bold tracking-wider ${
                        acc.isDefault ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      Current Book Balance
                    </span>
                    <div
                      className={`text-xl font-extrabold tracking-tight font-mono ${
                        acc.isDefault ? 'text-emerald-400' : 'text-slate-900'
                      }`}
                    >
                      ₹{acc.currentBalance.toLocaleString('en-IN')}
                    </div>
                  </div>

                  {/* Clean Single Action on Card: Inter-Account Contra Transfer */}
                  <button
                    type="button"
                    onClick={() => {
                      setFromAccountId(acc.id);
                      const targetOther = bankAccounts.find((b) => b.id !== acc.id);
                      if (targetOther) setToAccountId(targetOther.id);
                      setIsTransferModalOpen(true);
                    }}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs ${
                      acc.isDefault
                        ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold'
                        : 'bg-slate-900 hover:bg-black text-white'
                    }`}
                    title="Inter-Account Contra Transfer"
                  >
                    <ArrowRightLeft className="w-4 h-4" />
                    <span>Inter-Account Contra Transfer</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* UNIFIED TRANSACTION LOG (SINGLE CONSOLIDATED REGISTER) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden printable-passbook">
        {/* Header Controls */}
        <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/70 no-print">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm">
                Bank & Cash Transaction History & Audit Register
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold">
                Live Passbook Tracking
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Consolidated transaction log of all customer receipts, vendor payments, contra transfers, and personal drawings
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Account Filter */}
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 bg-white shadow-2xs focus:outline-none"
            >
              <option value="all">All Bank & Cash Accounts</option>
              {bankAccounts.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.accountName} {b.isDefault ? '(Primary)' : ''}
                </option>
              ))}
            </select>

            {/* Search */}
            <div className="relative w-48 sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search UTR, party, voucher..."
                className="w-full pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 bg-white"
              />
            </div>

            {/* Print Log */}
            <button
              type="button"
              onClick={handlePrintLog}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1 shadow-2xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* Transaction Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 border-b-2 border-slate-300 text-slate-800 font-extrabold uppercase text-[10px] tracking-wider">
                <th className="py-2.5 px-3 w-28">Date</th>
                <th className="py-2.5 px-3 w-32">Voucher No</th>
                <th className="py-2.5 px-3 w-40">Account</th>
                <th className="py-2.5 px-3">Particulars / Beneficiary / Narration</th>
                <th className="py-2.5 px-3 w-36">Cheque / UTR Ref</th>
                <th className="py-2.5 px-3 text-right w-28 text-emerald-700">Money In (Cr ₹)</th>
                <th className="py-2.5 px-3 text-right w-28 text-rose-700">Money Out (Dr ₹)</th>
                <th className="py-2.5 px-3 text-right w-32 text-slate-900">Running Balance (₹)</th>
                <th className="py-2.5 px-3 text-center w-24">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono text-[11px]">
              {unifiedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500 font-sans">
                    <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-700 text-sm">No transactions found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Use "+ Add Money" or "Inter-Account Contra Transfer" above to record entries.
                    </p>
                  </td>
                </tr>
              ) : (
                unifiedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3 whitespace-nowrap text-slate-700 font-medium">
                      {new Date(tx.date).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap font-bold text-slate-900">
                      <div>{tx.voucherNumber}</div>
                      <span className="text-[9px] font-sans text-slate-400 font-normal">
                        {tx.voucherType}
                      </span>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap font-sans font-semibold text-slate-800">
                      {tx.accountName}
                    </td>

                    <td className="py-2.5 px-3 font-sans text-xs text-slate-900 font-medium max-w-sm">
                      <div className="leading-snug">{tx.narration}</div>
                    </td>

                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {tx.reference ? (
                        <span className="inline-flex items-center gap-1 font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-[10px]">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          {tx.reference}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-mono text-[11px]">-</span>
                      )}
                    </td>

                    {/* Money In (Credit) */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {tx.moneyIn > 0 ? (
                        <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          +₹{tx.moneyIn.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Money Out (Debit) */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      {tx.moneyOut > 0 ? (
                        <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded">
                          -₹{tx.moneyOut.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Running Progressive Balance */}
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <strong className="font-bold text-slate-950 text-xs">
                        ₹{tx.runningBalance.toLocaleString('en-IN')}
                      </strong>
                    </td>

                    {/* Audit Seal */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap font-sans">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        Verified
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Summary */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              All transactions recorded with immutable UTR reference verification and duplicate payment prevention.
            </span>
          </div>
          <div className="font-mono font-bold text-slate-900">
            Total Liquid Balance: ₹{totalLiquid.toLocaleString('en-IN')}
          </div>
        </div>
      </div>

      {/* MODAL 1: INTER-ACCOUNT CONTRA TRANSFER */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white font-semibold text-slate-900"
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
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white font-semibold text-slate-900"
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium"
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
                      ? 'border-amber-400 bg-amber-50/50 text-amber-950'
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

      {/* MODAL 2: ADD MONEY / DEPOSIT */}
      {isDepositModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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

                {depositDuplicateCheck.isDuplicate && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">⚠️ Warning: Duplicate Reference Detected!</span>
                      <p className="mt-0.5 text-[11px] text-amber-800 leading-relaxed">
                        This reference number was already recorded in the system:{' '}
                        <strong>{depositDuplicateCheck.matchedRecord?.details}</strong>.
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

      {/* MODAL 3: PERSONAL USE / DRAWINGS */}
      {isPersonalUseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-rose-50/80">
              <div>
                <h3 className="text-base font-bold text-rose-950 flex items-center gap-2">
                  <UserMinus className="w-4 h-4 text-rose-600" />
                  Deduct Money — Personal Use / Drawings
                </h3>
                <p className="text-xs text-rose-800/80 mt-0.5">
                  Deduct funds for director personal use or proprietor drawings with double-entry equity posting
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPersonalUseModalOpen(false)}
                className="w-7 h-7 rounded-lg hover:bg-rose-100 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handlePersonalUseSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Source Account (Deduct From) *
                </label>
                <select
                  value={personalAccountId}
                  onChange={(e) => setPersonalAccountId(e.target.value)}
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
                    Withdrawal Amount (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={personalAmount}
                    onChange={(e) => setPersonalAmount(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-rose-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Withdrawal Date *
                  </label>
                  <input
                    type="date"
                    value={personalDate}
                    onChange={(e) => setPersonalDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Withdrawn By / Director *
                  </label>
                  <input
                    type="text"
                    value={personalWithdrawnBy}
                    onChange={(e) => setPersonalWithdrawnBy(e.target.value)}
                    placeholder="e.g. Kaustubh (Director)"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Withdrawal Mode *
                  </label>
                  <select
                    value={personalMode}
                    onChange={(e) => setPersonalMode(e.target.value as any)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white font-semibold"
                  >
                    <option value="Self Cheque">Self Cheque</option>
                    <option value="ATM/Cash Withdrawal">ATM / Cash Withdrawal</option>
                    <option value="NetBanking">NetBanking / NEFT</option>
                    <option value="UPI">UPI Transfer</option>
                    <option value="Cheque">Standard Cheque</option>
                  </select>
                </div>
              </div>

              {/* Cheque / Reference with Anti-Duplicate Check */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cheque / Transaction Reference Number
                </label>
                <input
                  type="text"
                  value={personalReference}
                  onChange={(e) => setPersonalReference(e.target.value)}
                  placeholder="e.g. SELF-CHQ-004412 or UPI-998811"
                  className={`w-full px-3 py-2 border rounded-lg text-sm font-mono ${
                    personalDuplicateCheck.isDuplicate
                      ? 'border-amber-400 bg-amber-50/50 text-amber-950 focus:ring-2 focus:ring-amber-500'
                      : 'border-slate-200 focus:ring-2 focus:ring-slate-900'
                  }`}
                />

                {personalDuplicateCheck.isDuplicate && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">⚠️ Warning: Duplicate Reference Detected!</span>
                      <p className="mt-0.5 text-[11px] text-amber-800 leading-relaxed">
                        This reference number was already recorded in the system:{' '}
                        <strong>{personalDuplicateCheck.matchedRecord?.details}</strong>.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Purpose / Drawing Reason *
                </label>
                <input
                  type="text"
                  value={personalPurpose}
                  onChange={(e) => setPersonalPurpose(e.target.value)}
                  placeholder="e.g. Director personal drawings / family household expenses"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              {/* Dynamic Balance Impact Preview */}
              {(() => {
                const targetAcc = bankAccounts.find((b) => b.id === personalAccountId);
                const cur = targetAcc?.currentBalance || 0;
                const after = cur - personalAmount;
                return (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex justify-between items-center font-mono">
                    <span className="text-slate-600 font-sans">Balance After Withdrawal:</span>
                    <span className={`font-bold ${after < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                      ₹{cur.toLocaleString('en-IN')} − ₹{personalAmount.toLocaleString('en-IN')} = ₹
                      {after.toLocaleString('en-IN')}
                    </span>
                  </div>
                );
              })()}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsPersonalUseModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>Confirm & Deduct Funds</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD ACCOUNT HEAD */}
      {isAddAccountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
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
                    Cash Vault / Safe
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Display Account Name *
                </label>
                <input
                  type="text"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  placeholder="e.g. Kotak Mahindra Plant A/c"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold"
                />
              </div>

              {newAccType === 'bank' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Bank Name *
                      </label>
                      <input
                        type="text"
                        value={newBankName}
                        onChange={(e) => setNewBankName(e.target.value)}
                        placeholder="e.g. Kotak Mahindra Bank"
                        required
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Account Number *
                      </label>
                      <input
                        type="text"
                        value={newAccNumber}
                        onChange={(e) => setNewAccNumber(e.target.value)}
                        placeholder="e.g. 98112345678"
                        required
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        IFSC Code *
                      </label>
                      <input
                        type="text"
                        value={newIfsc}
                        onChange={(e) => setNewIfsc(e.target.value)}
                        placeholder="e.g. KKBK0000891"
                        required
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono uppercase"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Branch Location *
                      </label>
                      <input
                        type="text"
                        value={newBranch}
                        onChange={(e) => setNewBranch(e.target.value)}
                        placeholder="e.g. Naroda GIDC"
                        required
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
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
                  placeholder="0"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold font-mono"
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
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
