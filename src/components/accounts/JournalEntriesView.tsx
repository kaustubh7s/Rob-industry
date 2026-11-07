import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Printer,
  Trash2,
  X,
  Eye,
  Calendar,
} from 'lucide-react';
import { useAccounts } from '../../context/AccountsContext';
import { JournalEntry, JournalLine } from '../../types/finance';

export const JournalEntriesView: React.FC = () => {
  const { chartOfAccounts, journalEntries, addJournalEntry, reverseJournalEntry } = useAccounts();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'posted' | 'reversed'>('all');
  const [isNewJVModalOpen, setIsNewJVModalOpen] = useState(false);
  const [viewVoucher, setViewVoucher] = useState<JournalEntry | null>(null);

  // New JV form state
  const [voucherNumber, setVoucherNumber] = useState(
    `JV-${new Date().getFullYear()}-${String(journalEntries.length + 1).padStart(3, '0')}`
  );
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [reference, setReference] = useState('');
  const [narration, setNarration] = useState('');

  const [lines, setLines] = useState<
    Array<{
      id: string;
      accountId: string;
      accountCode: string;
      accountName: string;
      debit: number;
      credit: number;
      description?: string;
    }>
  >([
    {
      id: 'line-1',
      accountId: chartOfAccounts[0]?.id || 'acc-1',
      accountCode: chartOfAccounts[0]?.code || '1010',
      accountName: chartOfAccounts[0]?.name || 'HDFC Bank - Current A/c',
      debit: 0,
      credit: 0,
    },
    {
      id: 'line-2',
      accountId: chartOfAccounts[1]?.id || 'acc-2',
      accountCode: chartOfAccounts[1]?.code || '4000',
      accountName: chartOfAccounts[1]?.name || 'Plant & Machinery Sales',
      debit: 0,
      credit: 0,
    },
  ]);

  // Filtered JVs
  const filteredJVs = journalEntries
    .filter((jv) => {
      const matchesSearch =
        jv.voucherNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        jv.narration.toLowerCase().includes(searchQuery.toLowerCase()) ||
        ((jv.referenceNumber || jv.referenceId) &&
          (jv.referenceNumber || jv.referenceId)!.toLowerCase().includes(searchQuery.toLowerCase())) ||
        jv.lines.some((l) => l.accountName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'reversed'
          ? jv.status === 'reversed'
          : jv.status !== 'reversed';

      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Metrics
  const totalJVsCount = journalEntries.length;
  const totalVolume = journalEntries.reduce((sum, j) => sum + (j.totalDebit || 0), 0);
  const reversedCount = journalEntries.filter((j) => j.status === 'reversed').length;

  // New JV calculations
  const totalDr = lines.reduce((sum, l) => sum + (Number(l.debit) || 0), 0);
  const totalCr = lines.reduce((sum, l) => sum + (Number(l.credit) || 0), 0);
  const difference = Math.abs(totalDr - totalCr);
  const isBalanced = totalDr > 0 && totalCr > 0 && difference < 0.01;

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: `line-${Date.now()}`,
        accountId: chartOfAccounts[0]?.id || 'acc-1',
        accountCode: chartOfAccounts[0]?.code || '1010',
        accountName: chartOfAccounts[0]?.name || 'HDFC Bank',
        debit: 0,
        credit: 0,
      },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleLineAccountChange = (idx: number, code: string) => {
    const acc = chartOfAccounts.find((a) => a.code === code);
    setLines((prev) =>
      prev.map((line, i) =>
        i === idx
          ? {
              ...line,
              accountId: acc?.id || `acc-${code}`,
              accountCode: code,
              accountName: acc?.name || '',
            }
          : line
      )
    );
  };

  const handleLineValueChange = (idx: number, field: 'debit' | 'credit', val: number) => {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== idx) return line;
        if (field === 'debit') {
          return { ...line, debit: val, credit: val > 0 ? 0 : line.credit };
        } else {
          return { ...line, credit: val, debit: val > 0 ? 0 : line.debit };
        }
      })
    );
  };

  const handleCreateJV = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      alert('Total debits must equal total credits before posting a journal voucher.');
      return;
    }
    if (!narration.trim()) {
      alert('Please provide a narration describing the financial purpose.');
      return;
    }

    const cleanedLines: JournalLine[] = lines
      .filter((l) => l.debit > 0 || l.credit > 0)
      .map((l, idx) => ({
        id: `line-${idx + 1}`,
        accountId: l.accountId,
        accountCode: l.accountCode,
        accountName: l.accountName,
        debit: Number(l.debit) || 0,
        credit: Number(l.credit) || 0,
        narration: l.description,
      }));

    await addJournalEntry({
      voucherNumber,
      voucherType: 'Journal Voucher',
      date: entryDate,
      narration: narration.trim(),
      referenceNumber: reference.trim() || undefined,
      lines: cleanedLines,
      totalDebit: totalDr,
      totalCredit: totalCr,
      createdBy: 'Accounts',
      status: 'posted',
    });

    setIsNewJVModalOpen(false);
    setNarration('');
    setReference('');
  };

  const handleReverseClick = async (jv: JournalEntry) => {
    const reason = prompt(
      'Please enter the reason for reversing this Journal Voucher:',
      'Correction of error'
    );
    if (reason === null) return;
    await reverseJournalEntry(jv.id, reason);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-indigo-600" />
            Journal Entries & Vouchers
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            General journal register, adjustments, multi-line double entry vouchers, and reversals
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setVoucherNumber(
              `JV-${new Date().getFullYear()}-${String(journalEntries.length + 1).padStart(3, '0')}`
            );
            setIsNewJVModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white text-sm font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>New Journal Voucher</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Journal Vouchers</span>
            <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <FileSpreadsheet className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{totalJVsCount}</div>
          <div className="text-xs text-slate-500 mt-1">Double-entry accounting records</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Double-Entry Turnover</span>
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">
            ₹{totalVolume.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-emerald-600 font-medium mt-1">Balanced debits & credits</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Reversed Vouchers</span>
            <span className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <RotateCcw className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-700">{reversedCount}</div>
          <div className="text-xs text-slate-500 mt-1">Offsetting audit corrections</div>
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
            placeholder="Search voucher number, narration, account name, reference..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['all', 'posted', 'reversed'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                statusFilter === st
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              {st === 'all' ? 'All Vouchers' : st === 'posted' ? 'Active Posted' : 'Reversed'}
            </button>
          ))}
        </div>
      </div>

      {/* Journal Entries Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Voucher No & Date</th>
                <th className="py-3 px-4">Narration & Reference</th>
                <th className="py-3 px-4">Debits & Credits Accounts</th>
                <th className="py-3 px-4 text-right">Balanced Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredJVs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No journal vouchers found</p>
                    <p className="text-slate-400 mt-0.5">
                      Click "+ New Journal Voucher" to create an adjustment or entry
                    </p>
                  </td>
                </tr>
              ) : (
                filteredJVs.map((jv) => (
                  <tr key={jv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900 text-sm">
                        {jv.voucherNumber}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(jv.date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 max-w-sm">
                      <div className="font-medium text-slate-800 line-clamp-2">{jv.narration}</div>
                      {(jv.referenceNumber || jv.referenceId) && (
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Ref: {jv.referenceNumber || jv.referenceId}
                        </div>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        {jv.lines.map((line, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-4 font-mono text-[11px]"
                          >
                            <span className="text-slate-700 truncate max-w-[200px]">
                              {line.debit > 0 ? 'Dr. ' : '   To '}
                              <span className="font-semibold text-slate-900">{line.accountName}</span>{' '}
                              ({line.accountCode})
                            </span>
                            <span
                              className={
                                line.debit > 0 ? 'text-emerald-700 font-bold' : 'text-slate-600'
                              }
                            >
                              ₹{(line.debit > 0 ? line.debit : line.credit).toLocaleString('en-IN')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="font-bold text-slate-900 font-mono text-sm">
                        ₹{jv.totalDebit.toLocaleString('en-IN')}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-semibold">Dr = Cr Matched</div>
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {jv.status === 'reversed' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          <RotateCcw className="w-3 h-3" /> Reversed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3" /> Posted
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewVoucher(jv)}
                          className="px-2.5 py-1 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold inline-flex items-center gap-1 border border-slate-200 cursor-pointer"
                          title="View Voucher Slip"
                        >
                          <Eye className="w-3.5 h-3.5 text-slate-500" />
                          <span>View</span>
                        </button>

                        {jv.status !== 'reversed' && (
                          <button
                            type="button"
                            onClick={() => handleReverseClick(jv)}
                            className="px-2.5 py-1 text-amber-700 hover:bg-amber-50 rounded-lg text-xs font-semibold inline-flex items-center gap-1 border border-amber-200 cursor-pointer"
                            title="Reverse Journal Voucher"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reverse</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Journal Voucher */}
      {isNewJVModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 my-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
                  Create Double-Entry Journal Voucher
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Record accounting adjustments, accruals, depreciation, or ledger transfers
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewJVModalOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateJV} className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Voucher Number *
                  </label>
                  <input
                    type="text"
                    value={voucherNumber}
                    onChange={(e) => setVoucherNumber(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Reference / Document No
                  </label>
                  <input
                    type="text"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                    placeholder="e.g. Bank Advice / Bill No"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Lines Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Debit & Credit Accounts (Minimum 2 Lines)
                  </span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Line</span>
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  {lines.map((line, idx) => (
                    <div
                      key={line.id}
                      className="p-3 bg-slate-50/50 rounded-xl border border-slate-200 grid grid-cols-12 gap-2.5 items-center text-xs"
                    >
                      <div className="col-span-12 sm:col-span-6">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Account Head
                        </label>
                        <select
                          value={line.accountCode}
                          onChange={(e) => handleLineAccountChange(idx, e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                        >
                          {chartOfAccounts.map((a) => (
                            <option key={a.id} value={a.code}>
                              {a.code} - {a.name} ({a.category.toUpperCase()})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-5 sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Debit (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={line.debit || ''}
                          onChange={(e) =>
                            handleLineValueChange(idx, 'debit', Number(e.target.value))
                          }
                          placeholder="0.00"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-emerald-700"
                        />
                      </div>

                      <div className="col-span-5 sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Credit (₹)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={line.credit || ''}
                          onChange={(e) =>
                            handleLineValueChange(idx, 'credit', Number(e.target.value))
                          }
                          placeholder="0.00"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-rose-700"
                        />
                      </div>

                      <div className="col-span-2 sm:col-span-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          disabled={lines.length <= 2}
                          className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div
                  className={`px-6 py-3 border-t flex flex-col sm:flex-row items-center justify-between text-xs gap-3 ${
                    isBalanced
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isBalanced ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold">
                          Balanced: Debits (₹{totalDr.toLocaleString('en-IN')}) = Credits (₹
                          {totalCr.toLocaleString('en-IN')})
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                        <span className="font-bold">
                          Unbalanced: Difference of ₹{difference.toLocaleString('en-IN')}. Debits
                          must equal credits.
                        </span>
                      </>
                    )}
                  </div>

                  <div className="font-mono flex items-center gap-4">
                    <span>Total Dr: ₹{totalDr.toLocaleString('en-IN')}</span>
                    <span>Total Cr: ₹{totalCr.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Narration / Accounting Remarks *
                </label>
                <textarea
                  rows={2}
                  value={narration}
                  onChange={(e) => setNarration(e.target.value)}
                  placeholder="Being amount transferred / adjusted on account of..."
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewJVModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isBalanced}
                  className="px-5 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  Post Journal Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Single Journal Voucher */}
      {viewVoucher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 p-6 overflow-hidden">
            <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
              <div>
                <div className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
                  RSB INDUSTRIES — JOURNAL VOUCHER
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 font-mono mt-0.5">
                  {viewVoucher.voucherNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewVoucher(null)}
                className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="grid grid-cols-2 text-xs">
                <div>
                  <span className="text-slate-500">Voucher Date:</span>{' '}
                  <span className="font-bold text-slate-900">
                    {new Date(viewVoucher.date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                {(viewVoucher.referenceNumber || viewVoucher.referenceId) && (
                  <div>
                    <span className="text-slate-500">Reference:</span>{' '}
                    <span className="font-mono font-bold text-slate-900">
                      {viewVoucher.referenceNumber || viewVoucher.referenceId}
                    </span>
                  </div>
                )}
              </div>

              {/* Lines Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-600">
                    <tr>
                      <th className="p-3">Particulars / Account Head</th>
                      <th className="p-3 text-right">Debit (₹)</th>
                      <th className="p-3 text-right">Credit (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {viewVoucher.lines.map((l, idx) => (
                      <tr key={idx}>
                        <td className="p-3">
                          <span className="font-bold text-slate-900">{l.accountName}</span>{' '}
                          <span className="text-slate-400">({l.accountCode})</span>
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-700">
                          {l.debit > 0 ? `₹${l.debit.toLocaleString('en-IN')}` : '-'}
                        </td>
                        <td className="p-3 text-right font-bold text-rose-700">
                          {l.credit > 0 ? `₹${l.credit.toLocaleString('en-IN')}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-xs text-slate-900">
                    <tr>
                      <td className="p-3 text-right uppercase">Total:</td>
                      <td className="p-3 text-right font-mono text-emerald-700">
                        ₹{viewVoucher.totalDebit.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-right font-mono text-rose-700">
                        ₹{viewVoucher.totalCredit.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Narration */}
              <div className="p-3 bg-slate-50 rounded-lg text-xs">
                <span className="font-bold text-slate-700">Narration:</span>{' '}
                <span className="text-slate-800">{viewVoucher.narration}</span>
              </div>

              {/* Signatures */}
              <div className="pt-8 grid grid-cols-3 text-center text-xs text-slate-500">
                <div className="border-t border-slate-200 pt-1">Prepared By</div>
                <div className="border-t border-slate-200 pt-1">Verified By (Accounts)</div>
                <div className="border-t border-slate-200 pt-1">Authorized Signatory</div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Voucher</span>
              </button>
              <button
                type="button"
                onClick={() => setViewVoucher(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
