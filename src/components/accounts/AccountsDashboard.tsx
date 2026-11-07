import React, { useMemo } from 'react';
import {
  Plus,
  ArrowRight,
  TrendingUp,
  CreditCard,
  IndianRupee,
  Layers,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Building2,
  FileText,
} from 'lucide-react';
import { useAccounts } from '../../context/AccountsContext';
import { formatINR, formatDateIndian } from '../../utils/accountsCalculations';
import { AccountDeal } from '../../types/accounts';

interface AccountsDashboardProps {
  onOpenNewDeal: () => void;
}

export const AccountsDashboard: React.FC<AccountsDashboardProps> = ({ onOpenNewDeal }) => {
  const { summary, deals, setActiveView } = useAccounts();

  // Recent Deals (top 6 newest active deals)
  const recentDeals = useMemo(() => {
    return [...deals]
      .filter((d) => !d.isArchived)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 6);
  }, [deals]);

  // Overdue and upcoming payment alerts
  const overdueDeals = useMemo(() => {
    return deals.filter((d) => !d.isArchived && d.status === 'overdue');
  }, [deals]);

  const upcomingPayments = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return deals
      .filter(
        (d) =>
          !d.isArchived &&
          d.remainingBalance > 0 &&
          d.expectedPaymentDate &&
          d.expectedPaymentDate >= today
      )
      .sort((a, b) => (a.expectedPaymentDate || '').localeCompare(b.expectedPaymentDate || ''))
      .slice(0, 4);
  }, [deals]);

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Accounts Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage company deals, payment details, advances, and outstanding balances.
          </p>
        </div>

        {/* Two Main Primary Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveView('deals')}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>View All Deals</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          </button>

          <button
            type="button"
            onClick={onOpenNewDeal}
            className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>+ Add New Deal</span>
          </button>
        </div>
      </div>

      {/* Top 4 Summary Cards (Indian Rupees Format) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Deals */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              1. Total Deals
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight">
            {summary.totalDeals}
          </div>
          <p className="text-[11px] text-slate-500">
            Recorded company project contracts
          </p>
        </div>

        {/* 2. Total Deal Value */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              2. Total Deal Value
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
              ₹
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-900 font-mono tracking-tight">
            {formatINR(summary.totalDealValue)}
          </div>
          <p className="text-[11px] text-slate-500">
            Combined decided contract amount
          </p>
        </div>

        {/* 3. Total Received */}
        <div className="p-5 bg-emerald-50/60 border border-emerald-200 rounded-2xl shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">
              3. Total Received
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              ₹
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono tracking-tight">
            {formatINR(summary.totalReceived)}
          </div>
          <p className="text-[11px] text-emerald-700 font-medium">
            Money received so far (advances + installments)
          </p>
        </div>

        {/* 4. Outstanding Balance */}
        <div className={`p-5 rounded-2xl shadow-2xs space-y-2 border ${
          summary.outstandingBalance > 0
            ? 'bg-amber-50/70 border-amber-200'
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              summary.outstandingBalance > 0 ? 'text-amber-800' : 'text-slate-500'
            }`}>
              4. Outstanding Balance
            </span>
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
              summary.outstandingBalance > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-600'
            }`}>
              ₹
            </div>
          </div>
          <div className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
            summary.outstandingBalance > 0 ? 'text-amber-700' : 'text-slate-800'
          }`}>
            {formatINR(summary.outstandingBalance)}
          </div>
          <p className="text-[11px] text-slate-500">
            Money still pending across deals
          </p>
        </div>
      </div>

      {/* Payment Due Alerts Banner (If any deal is overdue) */}
      {overdueDeals.length > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <strong className="font-bold text-rose-900 block text-sm">
                {overdueDeals.length} Payment{overdueDeals.length > 1 ? 's' : ''} Overdue
              </strong>
              <p className="text-rose-700 mt-0.5">
                Expected payment dates have passed with pending balances on{' '}
                {overdueDeals.map((d) => d.companyName).slice(0, 3).join(', ')}
                {overdueDeals.length > 3 ? ' and more.' : '.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setActiveView('deals')}
            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition-colors cursor-pointer self-start sm:self-center shrink-0"
          >
            Review Overdue Deals
          </button>
        </div>
      )}

      {/* Grid: Recent Deals + Upcoming Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Deals Table (2 Columns Span) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Recent Company Deals
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Latest client deals and their real-time payment status
              </p>
            </div>
            <button
              type="button"
              onClick={() => setActiveView('deals')}
              className="text-xs font-bold text-slate-700 hover:text-slate-950 flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentDeals.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 font-medium space-y-3">
              <p>No company deals recorded yet.</p>
              <button
                type="button"
                onClick={onOpenNewDeal}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs"
              >
                + Add First Deal
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                    <th className="py-2.5 px-3.5">Company Name</th>
                    <th className="py-2.5 px-3.5 text-right">Decided Amount</th>
                    <th className="py-2.5 px-3.5 text-right">Total Received</th>
                    <th className="py-2.5 px-3.5 text-right">Balance</th>
                    <th className="py-2.5 px-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentDeals.map((deal) => (
                    <tr
                      key={deal.id}
                      onClick={() => setActiveView('deal-details', deal.id)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                          {deal.companyName}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500">
                          {deal.dealNumber} • {formatDateIndian(deal.dealDate)}
                        </div>
                      </td>

                      <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-800 whitespace-nowrap">
                        {formatINR(deal.decidedAmount)}
                      </td>

                      <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        {formatINR(deal.totalReceived)}
                      </td>

                      <td className="py-3 px-3.5 text-right font-mono font-bold whitespace-nowrap">
                        <span className={deal.remainingBalance > 0 ? 'text-amber-700' : 'text-slate-400'}>
                          {formatINR(deal.remainingBalance)}
                        </span>
                      </td>

                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {deal.status === 'fully_paid' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Fully Paid
                          </span>
                        )}
                        {deal.status === 'partially_received' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Partially Paid
                          </span>
                        )}
                        {deal.status === 'awaiting_advance' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Awaiting Adv
                          </span>
                        )}
                        {deal.status === 'overdue' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-300">
                            Overdue
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upcoming Collections / Payment Dates (1 Column Span) */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs p-4.5 space-y-3.5 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <Calendar className="w-4 h-4 text-slate-700" />
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Upcoming Collection Dates
              </h2>
            </div>

            {upcomingPayments.length === 0 ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No upcoming payment dates scheduled with pending balances.
              </p>
            ) : (
              <div className="space-y-2.5">
                {upcomingPayments.map((deal) => (
                  <div
                    key={deal.id}
                    onClick={() => setActiveView('deal-details', deal.id)}
                    className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900 truncate max-w-[160px]">
                        {deal.companyName}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-amber-700">
                        {formatINR(deal.remainingBalance)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span>Due: {formatDateIndian(deal.expectedPaymentDate)}</span>
                      <span className="text-slate-400 font-mono">{deal.dealNumber}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400">
              Automatic payment reminders based on agreed payment terms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
