import React, { useMemo } from 'react';
import { Plus, ArrowRight, Calendar, AlertCircle } from 'lucide-react';
import { useAccounts } from '../../context/AccountsContext';
import { formatINR, formatDateIndian } from '../../utils/accountsCalculations';
import { AccountDeal } from '../../types/accounts';

interface AccountsDashboardProps {
  onOpenNewDeal: () => void;
}

export const AccountsDashboard: React.FC<AccountsDashboardProps> = ({ onOpenNewDeal }) => {
  const { summary, deals, setActiveView } = useAccounts();

  // Active Deals sorted by newest first
  const activeDeals = useMemo(() => {
    return [...deals]
      .filter((d) => !d.isArchived)
      .sort((a, b) => new Date(b.dealDate || b.createdAt).getTime() - new Date(a.dealDate || a.createdAt).getTime());
  }, [deals]);

  // Client Deals to show on Dashboard (first 8 deals)
  const clientDeals = useMemo(() => {
    return activeDeals.slice(0, 8);
  }, [activeDeals]);

  // Upcoming Payments: deals with a remaining balance and expected payment date
  const upcomingPayments = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return activeDeals
      .filter(
        (d) =>
          d.remainingBalance > 0 &&
          d.expectedPaymentDate &&
          d.expectedPaymentDate >= today
      )
      .sort((a, b) => (a.expectedPaymentDate || '').localeCompare(b.expectedPaymentDate || ''))
      .slice(0, 5);
  }, [activeDeals]);

  // Overdue deals count
  const overdueDeals = useMemo(() => {
    return activeDeals.filter((d) => d.status === 'overdue');
  }, [activeDeals]);

  const renderStatus = (deal: AccountDeal) => {
    if (deal.status === 'fully_paid') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Fully Paid
        </span>
      );
    }
    if (deal.status === 'overdue') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          Overdue
        </span>
      );
    }
    if (deal.status === 'partially_received') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          Partially Paid
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        Awaiting Advance
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Accounts Management</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage company deals, payment details, advances, and outstanding balances.
          </p>
        </div>

        {/* Clear Main Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveView('deals')}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors shadow-xs cursor-pointer"
          >
            View All Deals
          </button>
          <button
            type="button"
            onClick={onOpenNewDeal}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Deal</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Deals */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
          <p className="text-xs font-medium text-slate-500">Total Deals</p>
          <p className="text-2xl font-bold text-slate-900 font-mono">
            {summary.totalDeals}
          </p>
          <p className="text-xs text-slate-400">Total active client deals</p>
        </div>

        {/* 2. Total Deal Value */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
          <p className="text-xs font-medium text-slate-500">Total Deal Value</p>
          <p className="text-2xl font-bold text-slate-900 font-mono">
            {formatINR(summary.totalDealValue)}
          </p>
          <p className="text-xs text-slate-400">Combined agreed amount</p>
        </div>

        {/* 3. Total Received */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
          <p className="text-xs font-medium text-emerald-700">Total Received</p>
          <p className="text-2xl font-bold text-emerald-600 font-mono">
            {formatINR(summary.totalReceived)}
          </p>
          <p className="text-xs text-slate-400">Total money received to date</p>
        </div>

        {/* 4. Remaining Balance */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
          <p className="text-xs font-medium text-amber-700">Remaining Balance</p>
          <p className="text-2xl font-bold text-amber-600 font-mono">
            {formatINR(summary.outstandingBalance)}
          </p>
          <p className="text-xs text-slate-400">Pending collections from clients</p>
        </div>
      </div>

      {/* Overdue Alert Strip (if applicable) */}
      {overdueDeals.length > 0 && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>{overdueDeals.length} deal{overdueDeals.length > 1 ? 's' : ''} have overdue payments:</strong>{' '}
              {overdueDeals.map((d) => d.companyName).slice(0, 3).join(', ')}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveView('deals')}
            className="text-xs font-bold text-rose-700 hover:text-rose-900 underline cursor-pointer shrink-0 ml-2"
          >
            Review Overdue
          </button>
        </div>
      )}

      {/* Grid: Client Deals & Upcoming Payments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Section: Client Deals Table (2 cols span) */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Client Deals</h2>
            <button
              type="button"
              onClick={() => setActiveView('deals')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              <span>View All</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {clientDeals.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No deals recorded yet. Click <strong>+ Add New Deal</strong> to record your first client deal.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <th className="py-3 px-4">Company Name</th>
                    <th className="py-3 px-4 text-right">Deal Amount</th>
                    <th className="py-3 px-4 text-right">Received Amount</th>
                    <th className="py-3 px-4 text-right">Pending Amount</th>
                    <th className="py-3 px-4 text-center">Payment Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clientDeals.map((deal) => (
                    <tr
                      key={deal.id}
                      onClick={() => setActiveView('deal-details', deal.id)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      {/* Company Name */}
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {deal.companyName}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {deal.dealNumber}
                        </div>
                      </td>

                      {/* Deal Amount */}
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-900 whitespace-nowrap">
                        {formatINR(deal.decidedAmount)}
                      </td>

                      {/* Received Amount */}
                      <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-700 whitespace-nowrap">
                        {formatINR(deal.totalReceived)}
                      </td>

                      {/* Pending Amount */}
                      <td className="py-3 px-4 text-right font-mono font-semibold whitespace-nowrap">
                        <span className={deal.remainingBalance > 0 ? 'text-amber-700' : 'text-slate-400'}>
                          {formatINR(deal.remainingBalance)}
                        </span>
                      </td>

                      {/* Payment Status */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {renderStatus(deal)}
                      </td>

                      {/* View Button */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveView('deal-details', deal.id);
                          }}
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors cursor-pointer"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Side Section: Upcoming Payments (1 col span) */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Calendar className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">Upcoming Payments</h2>
          </div>

          {upcomingPayments.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">
              No upcoming payments scheduled with a pending balance.
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingPayments.map((deal) => (
                <div
                  key={deal.id}
                  onClick={() => setActiveView('deal-details', deal.id)}
                  className="p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900 truncate max-w-[150px]">
                      {deal.companyName}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-700">
                      {formatINR(deal.remainingBalance)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span>Due: {formatDateIndian(deal.expectedPaymentDate)}</span>
                    <span className="font-mono text-slate-400">{deal.dealNumber}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pt-2 text-center text-[11px] text-slate-400 border-t border-slate-100">
            Payment due dates based on agreed terms.
          </div>
        </div>
      </div>
    </div>
  );
};
