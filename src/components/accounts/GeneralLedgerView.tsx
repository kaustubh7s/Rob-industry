import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  Download,
  Printer,
} from 'lucide-react';
import { useAccounts } from '../../context/AccountsContext';
import { AccountHead, AccountCategory } from '../../types/finance';

export const GeneralLedgerView: React.FC = () => {
  const { chartOfAccounts, journalEntries } = useAccounts();

  // Selected account for ledger
  const [selectedCode, setSelectedCode] = useState<string>(
    chartOfAccounts[0]?.code || '1010'
  );

  const [dateFrom, setDateFrom] = useState<string>('2026-04-01'); // FY start
  const [dateTo, setDateTo] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Account details
  const selectedAccount = useMemo(() => {
    return chartOfAccounts.find((a) => a.code === selectedCode) || chartOfAccounts[0];
  }, [chartOfAccounts, selectedCode]);

  // Group accounts by category for optgroups
  const accountsByCategory = useMemo(() => {
    const map: Record<AccountCategory, AccountHead[]> = {
      Assets: [],
      Liabilities: [],
      Equity: [],
      Income: [],
      Expenses: [],
    };
    chartOfAccounts.forEach((acc) => {
      if (map[acc.category]) {
        map[acc.category].push(acc);
      }
    });
    return map;
  }, [chartOfAccounts]);

  // Calculate opening balance before dateFrom, transactions within period, and running balances
  const ledgerData = useMemo(() => {
    if (!selectedAccount) {
      return {
        openingBalance: 0,
        transactions: [],
        totalDebits: 0,
        totalCredits: 0,
        closingBalance: 0,
      };
    }

    const code = selectedAccount.code;
    const isAssetOrExpense =
      selectedAccount.category === 'Assets' || selectedAccount.category === 'Expenses';

    let openingBal = selectedAccount.openingBalance || 0;

    // Separate journals before dateFrom and inside date range
    const sortedJournals = [...journalEntries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const periodRows: Array<{
      id: string;
      date: string;
      voucherNumber: string;
      reference?: string;
      narration: string;
      contraAccount?: string;
      debit: number;
      credit: number;
      runningBalance: number;
    }> = [];

    let currentBal = openingBal;
    let periodDebits = 0;
    let periodCredits = 0;

    for (const jv of sortedJournals) {
      const line = jv.lines.find((l) => l.accountCode === code);
      if (!line) continue;

      const lineDr = line.debit || 0;
      const lineCr = line.credit || 0;

      // Find contra account line (the opposite entry)
      const contraLine = jv.lines.find((l) => l.accountCode !== code);
      const contraAccount = contraLine
        ? `${contraLine.accountCode} - ${contraLine.accountName}`
        : 'Multiple';

      const jvDate = jv.date;

      if (jvDate < dateFrom) {
        if (isAssetOrExpense) {
          currentBal += lineDr - lineCr;
        } else {
          currentBal += lineCr - lineDr;
        }
      } else if (jvDate <= dateTo) {
        if (isAssetOrExpense) {
          currentBal += lineDr - lineCr;
        } else {
          currentBal += lineCr - lineDr;
        }
        periodDebits += lineDr;
        periodCredits += lineCr;

        periodRows.push({
          id: `${jv.id}-${line.id}`,
          date: jv.date,
          voucherNumber: jv.voucherNumber,
          reference: jv.referenceNumber || jv.referenceId,
          narration: jv.narration,
          contraAccount,
          debit: lineDr,
          credit: lineCr,
          runningBalance: currentBal,
        });
      }
    }

    // Filter by search query if any
    const filteredRows = periodRows.filter((r) => {
      if (!searchQuery) return true;
      return (
        r.narration.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.voucherNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.reference && r.reference.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.contraAccount && r.contraAccount.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    });

    return {
      openingBalance: openingBal,
      transactions: filteredRows,
      totalDebits: periodDebits,
      totalCredits: periodCredits,
      closingBalance: currentBal,
    };
  }, [selectedAccount, journalEntries, dateFrom, dateTo, searchQuery]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (!selectedAccount) return;
    const headers = [
      'Date',
      'Voucher Number',
      'Particulars / Contra',
      'Narration',
      'Debit (INR)',
      'Credit (INR)',
      'Running Balance (INR)',
    ];
    const rows = ledgerData.transactions.map((tx) => [
      tx.date,
      `"${tx.voucherNumber}"`,
      `"${tx.contraAccount || ''}"`,
      `"${tx.narration.replace(/"/g, '""')}"`,
      tx.debit || 0,
      tx.credit || 0,
      tx.runningBalance || 0,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        `"GENERAL LEDGER - ${selectedAccount.code} ${selectedAccount.name}"`,
        `"Period: ${dateFrom} to ${dateTo}"`,
        `"Opening Balance: ${ledgerData.openingBalance}"`,
        '',
        headers.join(','),
        ...rows.map((e) => e.join(',')),
        '',
        `"TOTALS",,,,"${ledgerData.totalDebits}","${ledgerData.totalCredits}","${ledgerData.closingBalance}"`,
      ].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `GL_${selectedAccount.code}_${dateFrom}_${dateTo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            General Ledger
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Complete double-entry accounting ledger with running balance and transaction audit trails
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer border border-slate-200 shadow-2xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors cursor-pointer border border-slate-200 shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Ledger</span>
          </button>
        </div>
      </div>

      {/* Account Selector & Date Range Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Account Selector */}
        <div className="md:col-span-5">
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
            Select Account Head
          </label>
          <select
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <optgroup label="1000 - ASSETS">
              {accountsByCategory.Assets.map((a) => (
                <option key={a.id} value={a.code}>
                  {a.code} - {a.name} ({a.group})
                </option>
              ))}
            </optgroup>
            <optgroup label="2000 - LIABILITIES">
              {accountsByCategory.Liabilities.map((a) => (
                <option key={a.id} value={a.code}>
                  {a.code} - {a.name} ({a.group})
                </option>
              ))}
            </optgroup>
            <optgroup label="3000 - EQUITY">
              {accountsByCategory.Equity.map((a) => (
                <option key={a.id} value={a.code}>
                  {a.code} - {a.name} ({a.group})
                </option>
              ))}
            </optgroup>
            <optgroup label="4000 - INCOME">
              {accountsByCategory.Income.map((a) => (
                <option key={a.id} value={a.code}>
                  {a.code} - {a.name} ({a.group})
                </option>
              ))}
            </optgroup>
            <optgroup label="5000 - EXPENSES">
              {accountsByCategory.Expenses.map((a) => (
                <option key={a.id} value={a.code}>
                  {a.code} - {a.name} ({a.group})
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Date From */}
        <div className="md:col-span-2">
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
            From Date
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
          />
        </div>

        {/* Date To */}
        <div className="md:col-span-2">
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
            To Date
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
          />
        </div>

        {/* Search */}
        <div className="md:col-span-3">
          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
            Search Ledger
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter particulars..."
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>
      </div>

      {/* Account KPI Summary Header */}
      {selectedAccount && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-medium text-slate-500">Account Details</span>
            <div className="mt-1 font-bold text-slate-900 text-base leading-snug">
              {selectedAccount.code} - {selectedAccount.name}
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                {selectedAccount.category}
              </span>
              <span className="text-xs text-slate-500">{selectedAccount.group}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-medium text-slate-500">Period Total Debits (Dr)</span>
            <div className="mt-2 text-2xl font-bold text-emerald-700">
              ₹{ledgerData.totalDebits.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-slate-500 mt-1">Total inward / debit movements</div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-xs font-medium text-slate-500">Period Total Credits (Cr)</span>
            <div className="mt-2 text-2xl font-bold text-rose-700">
              ₹{ledgerData.totalCredits.toLocaleString('en-IN')}
            </div>
            <div className="text-xs text-slate-500 mt-1">Total outward / credit movements</div>
          </div>

          <div className="bg-slate-900 text-white p-4 rounded-xl shadow-2xs">
            <span className="text-xs font-medium text-slate-400">Net Book Balance</span>
            <div className="mt-2 text-2xl font-extrabold text-white">
              ₹{Math.abs(ledgerData.closingBalance).toLocaleString('en-IN')}
              <span className="text-xs font-normal text-emerald-400 ml-1.5">
                {ledgerData.closingBalance >= 0
                  ? selectedAccount.category === 'Assets' || selectedAccount.category === 'Expenses'
                    ? 'Dr'
                    : 'Cr'
                  : selectedAccount.category === 'Assets' || selectedAccount.category === 'Expenses'
                  ? 'Cr (Overdrawn)'
                  : 'Dr'}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1">As of {dateTo}</div>
          </div>
        </div>
      )}

      {/* General Ledger Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm">Account Transaction History</h3>
            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-semibold">
              {ledgerData.transactions.length} vouchers
            </span>
          </div>
          <div className="text-xs text-slate-500">
            Base Opening Balance:{' '}
            <span className="font-bold text-slate-800">
              ₹{ledgerData.openingBalance.toLocaleString('en-IN')}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Voucher No</th>
                <th className="py-3 px-4">Contra Particulars</th>
                <th className="py-3 px-4">Narration</th>
                <th className="py-3 px-4 text-right">Debit (Dr)</th>
                <th className="py-3 px-4 text-right">Credit (Cr)</th>
                <th className="py-3 px-4 text-right">Running Balance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {ledgerData.transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">
                      No transactions recorded in this period
                    </p>
                    <p className="text-slate-400 mt-0.5">
                      Change the date range or select another account to view entries
                    </p>
                  </td>
                </tr>
              ) : (
                ledgerData.transactions.map((tx) => (
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

                    <td className="py-3 px-4 whitespace-nowrap font-medium text-slate-900">
                      {tx.contraAccount}
                    </td>

                    <td className="py-3 px-4 text-slate-700 max-w-sm">
                      <div>{tx.narration}</div>
                      {tx.reference && (
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Ref: {tx.reference}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono">
                      {tx.debit > 0 ? (
                        <span className="font-bold text-emerald-700">
                          ₹{tx.debit.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono">
                      {tx.credit > 0 ? (
                        <span className="font-bold text-rose-700">
                          ₹{tx.credit.toLocaleString('en-IN')}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono font-bold text-slate-900">
                      ₹{Math.abs(tx.runningBalance).toLocaleString('en-IN')}
                      <span className="text-[10px] text-slate-500 font-normal ml-1">
                        {tx.runningBalance >= 0 ? 'Dr' : 'Cr'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {ledgerData.transactions.length > 0 && (
              <tfoot className="bg-slate-50/90 font-bold border-t border-slate-200 text-xs text-slate-800">
                <tr>
                  <td colSpan={4} className="py-3 px-4 text-right uppercase tracking-wider">
                    Total Period Activity:
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-700">
                    ₹{ledgerData.totalDebits.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-rose-700">
                    ₹{ledgerData.totalCredits.toLocaleString('en-IN')}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-900">
                    ₹{Math.abs(ledgerData.closingBalance).toLocaleString('en-IN')}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
};
