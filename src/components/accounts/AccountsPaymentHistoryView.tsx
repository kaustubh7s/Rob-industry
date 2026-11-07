import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  Search,
  Download,
  Calendar,
  ExternalLink,
  IndianRupee,
  Layers,
  ArrowRight,
  Filter,
  Printer,
} from 'lucide-react';
import { useAccounts } from '../../context/AccountsContext';
import { formatINR, formatDateIndian } from '../../utils/accountsCalculations';
import { DocumentPreviewModal } from './DocumentPreviewModal';
import { AccountDealDocument } from '../../types/accounts';

export const AccountsPaymentHistoryView: React.FC = () => {
  const { payments, deals, setActiveView, exportPaymentHistoryExcel, exportPaymentReceipt } = useAccounts();

  const [search, setSearch] = useState<string>('');
  const [selectedMode, setSelectedMode] = useState<string>('ALL');
  const [selectedPreviewDoc, setSelectedPreviewDoc] = useState<AccountDealDocument | null>(null);

  const dealMap = useMemo(() => {
    const map = new Map<string, (typeof deals)[0]>();
    deals.forEach((d) => map.set(d.id, d));
    return map;
  }, [deals]);

  const filteredPayments = useMemo(() => {
    const q = search.trim().toLowerCase();

    return payments.filter((p) => {
      const deal = dealMap.get(p.dealId);
      const companyName = deal?.companyName?.toLowerCase() || '';
      const dealNumber = deal?.dealNumber?.toLowerCase() || '';
      const ref = (p.transactionReference || '').toLowerCase();
      const remarks = (p.remarks || '').toLowerCase();

      if (selectedMode !== 'ALL' && p.paymentMode !== selectedMode) {
        return false;
      }

      if (q) {
        if (
          !companyName.includes(q) &&
          !dealNumber.includes(q) &&
          !ref.includes(q) &&
          !remarks.includes(q)
        ) {
          return false;
        }
      }

      return true;
    });
  }, [payments, dealMap, search, selectedMode]);

  const totalFilteredAmount = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [filteredPayments]);

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Payment History</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Chronological record of advance payments and stage collections across all client deals.
          </p>
        </div>

        <button
          type="button"
          onClick={() => exportPaymentHistoryExcel()}
          className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer self-start md:self-auto"
        >
          <Download className="w-4 h-4 text-slate-600" />
          <span>Export Excel</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search company, Deal ID, UTR / ref, remarks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-slate-900 outline-none"
          />
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Mode:</span>
          <select
            value={selectedMode}
            onChange={(e) => setSelectedMode(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:border-slate-900 outline-none cursor-pointer"
          >
            <option value="ALL">All Modes</option>
            <option value="Bank Transfer">Bank Transfer (NEFT/RTGS)</option>
            <option value="UPI">UPI</option>
            <option value="Cheque">Cheque</option>
            <option value="Cash">Cash</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        {filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 font-medium">
            No payment transactions found matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <th className="py-3 px-3.5">Payment Date</th>
                  <th className="py-3 px-3.5">Company Name</th>
                  <th className="py-3 px-3.5">Description</th>
                  <th className="py-3 px-3.5">Payment Mode</th>
                  <th className="py-3 px-3.5 font-mono">Ref / UTR</th>
                  <th className="py-3 px-3.5 text-right">Amount Received</th>
                  <th className="py-3 px-3.5 text-center">Slip</th>
                  <th className="py-3 px-3.5 text-right">Receipt Voucher</th>
                  <th className="py-3 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPayments.map((p) => {
                  const deal = dealMap.get(p.dealId);

                  return (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3.5 font-medium text-slate-800 whitespace-nowrap">
                        {formatDateIndian(p.paymentDate)}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900">
                          {deal?.companyName || 'Unknown Company'}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500">
                          {deal?.dealNumber || p.dealId}
                        </div>
                      </td>
                      <td className="py-3 px-3.5 text-slate-800">
                        <div className="flex items-center gap-1.5">
                          {p.isAdvance && (
                            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[10px]">
                              Advance
                            </span>
                          )}
                          <span>{p.remarks || (p.isAdvance ? 'Initial Booking Advance' : 'Stage Payment')}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3.5 font-medium text-slate-700 whitespace-nowrap">
                        {p.paymentMode}
                      </td>
                      <td className="py-3 px-3.5 font-mono text-slate-600 whitespace-nowrap">
                        {p.transactionReference || '-'}
                      </td>
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-700 text-sm whitespace-nowrap">
                        {formatINR(p.amount)}
                      </td>
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {p.paymentProofUrl ? (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedPreviewDoc({
                                id: p.id,
                                dealId: p.dealId,
                                fileName: p.paymentProofName || 'Payment Proof Slip',
                                fileType: 'image/jpeg',
                                fileSize: 0,
                                fileData: p.paymentProofUrl!,
                                uploadedBy: p.createdBy,
                                uploadedAt: p.createdAt,
                              })
                            }
                            className="px-2 py-0.5 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors cursor-pointer"
                          >
                            View Slip
                          </button>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => exportPaymentReceipt(p.id)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 hover:text-slate-950 rounded-lg font-bold text-[11px] inline-flex items-center gap-1.5 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                          title="Download Official Payment Receipt Voucher PDF"
                        >
                          <Printer className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Print Receipt</span>
                        </button>
                      </td>
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        {deal && (
                          <button
                            type="button"
                            onClick={() => setActiveView('deal-details', deal.id)}
                            className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>View Deal</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Summary Strip */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            Showing <strong className="text-slate-900">{filteredPayments.length}</strong> payment transactions
          </div>
          <div>
            Money Received in View:{' '}
            <strong className="text-emerald-700 font-mono text-sm font-bold">
              {formatINR(totalFilteredAmount)}
            </strong>
          </div>
        </div>
      </div>

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        document={selectedPreviewDoc}
        onClose={() => setSelectedPreviewDoc(null)}
      />
    </div>
  );
};

