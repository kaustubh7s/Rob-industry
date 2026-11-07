import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Plus,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Building2,
  FileSpreadsheet,
  IndianRupee,
  Layers,
} from 'lucide-react';
import { useAccounts } from '../../context/AccountsContext';
import { AccountDeal, DealStatus } from '../../types/accounts';
import { formatINR, formatDateIndian } from '../../utils/accountsCalculations';

interface AllDealsViewProps {
  onOpenNewDeal: () => void;
  initialFilter?: 'all' | 'pending' | 'partially_received' | 'fully_paid' | 'overdue' | 'archived';
}

export const AllDealsView: React.FC<AllDealsViewProps> = ({ onOpenNewDeal, initialFilter = 'all' }) => {
  const { deals, setActiveView, exportAllDealsExcel } = useAccounts();

  const [search, setSearch] = useState<string>('');
  const [filterTab, setFilterTab] = useState<string>(initialFilter);

  // Filter & Search Logic
  const filteredDeals = useMemo(() => {
    const q = search.trim().toLowerCase();

    return deals.filter((deal) => {
      // 1. Tab Filter
      if (filterTab === 'archived') {
        if (!deal.isArchived) return false;
      } else {
        if (deal.isArchived) return false; // Hide archived in normal tabs
        if (filterTab === 'pending' && deal.remainingBalance <= 0) return false;
        if (filterTab === 'partially_received' && deal.status !== 'partially_received') return false;
        if (filterTab === 'fully_paid' && deal.status !== 'fully_paid') return false;
        if (filterTab === 'overdue' && deal.status !== 'overdue') return false;
      }

      // 2. Search Filter (Company Name, GSTIN, Deal ID, Phone Number)
      if (q) {
        const matchName = deal.companyName.toLowerCase().includes(q);
        const matchGstin = (deal.companyGstin || '').toLowerCase().includes(q);
        const matchDealId = deal.dealNumber.toLowerCase().includes(q);
        const matchPhone = (deal.companyPhone || '').includes(q);
        const matchContact = (deal.contactPerson || '').toLowerCase().includes(q);
        if (!matchName && !matchGstin && !matchDealId && !matchPhone && !matchContact) {
          return false;
        }
      }

      return true;
    });
  }, [deals, search, filterTab]);

  const statusBadge = (deal: AccountDeal) => {
    if (deal.status === 'fully_paid') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>Fully Paid</span>
        </span>
      );
    }
    if (deal.status === 'overdue') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-300 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-rose-600" />
          <span>Overdue</span>
        </span>
      );
    }
    if (deal.status === 'partially_received') {
      return (
        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>Partially Paid</span>
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
        <Clock className="w-3 h-3 text-slate-500" />
        <span>Awaiting Advance</span>
      </span>
    );
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">All Deals</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Simple register of company deals, received payments, and pending amounts.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={exportAllDealsExcel}
            className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export Excel</span>
          </button>
          <button
            type="button"
            onClick={onOpenNewDeal}
            className="px-4 py-2 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>+ Add New Deal</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search company, GSTIN, Deal ID, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-slate-900 outline-none"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 custom-scrollbar">
          {[
            { id: 'all', label: 'All Deals' },
            { id: 'pending', label: 'Pending Payments' },
            { id: 'partially_received', label: 'Partially Paid' },
            { id: 'fully_paid', label: 'Fully Paid' },
            { id: 'overdue', label: 'Overdue' },
            { id: 'archived', label: 'Archived' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterTab(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                filterTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Deals Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
        {filteredDeals.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <p className="text-sm font-bold text-slate-700">No deals found matching your search.</p>
            <p className="text-xs text-slate-500">
              Try adjusting your search terms or filter tab, or create a new deal.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <th className="py-3 px-3.5">Deal ID</th>
                  <th className="py-3 px-3.5">Company Name</th>
                  <th className="py-3 px-3.5">Deal Date</th>
                  <th className="py-3 px-3.5 text-right">Deal Amount</th>
                  <th className="py-3 px-3.5 text-right">Received Amount</th>
                  <th className="py-3 px-3.5 text-right">Pending Amount</th>
                  <th className="py-3 px-3.5 text-center">Progress</th>
                  <th className="py-3 px-3.5 text-center">Payment Status</th>
                  <th className="py-3 px-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDeals.map((deal) => {
                  const pct =
                    deal.decidedAmount > 0
                      ? Math.min(100, Math.round((deal.totalReceived / deal.decidedAmount) * 100))
                      : 0;

                  return (
                    <tr
                      key={deal.id}
                      onClick={() => setActiveView('deal-details', deal.id)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer group"
                    >
                      {/* Deal Number */}
                      <td className="py-3 px-3.5 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {deal.dealNumber}
                      </td>

                      {/* Company Name */}
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                          {deal.companyName}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500">
                          {deal.companyGstin || 'No GSTIN'}
                        </div>
                      </td>

                      {/* Deal Date */}
                      <td className="py-3 px-3.5 font-medium text-slate-700 whitespace-nowrap">
                        {formatDateIndian(deal.dealDate)}
                      </td>

                      {/* Decided Amount */}
                      <td className="py-3 px-3.5 text-right font-mono font-extrabold text-slate-900 whitespace-nowrap">
                        {formatINR(deal.decidedAmount)}
                      </td>

                      {/* Total Received */}
                      <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                        {formatINR(deal.totalReceived)}
                      </td>

                      {/* Pending Balance */}
                      <td className="py-3 px-3.5 text-right font-mono font-bold whitespace-nowrap">
                        <span className={deal.remainingBalance > 0 ? 'text-amber-700' : 'text-slate-500'}>
                          {formatINR(deal.remainingBalance)}
                        </span>
                      </td>

                      {/* Progress */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        <div className="w-24 mx-auto">
                          <div className="text-[10px] font-mono font-bold text-slate-600 mb-1 text-center">
                            {pct}%
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3.5 text-center whitespace-nowrap">
                        {statusBadge(deal)}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveView('deal-details', deal.id);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>View</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
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
            Showing <strong className="text-slate-900">{filteredDeals.length}</strong> of{' '}
            <strong className="text-slate-900">{deals.length}</strong> recorded deals
          </div>
          <div className="flex items-center gap-4 text-xs font-medium">
            <span>
              Total Deal Value:{' '}
              <strong className="text-slate-900 font-mono">
                {formatINR(filteredDeals.reduce((sum, d) => sum + (Number(d.decidedAmount) || 0), 0))}
              </strong>
            </span>
            <span>•</span>
            <span>
              Remaining Balance:{' '}
              <strong className="text-amber-700 font-mono">
                {formatINR(filteredDeals.reduce((sum, d) => sum + (Number(d.remainingBalance) || 0), 0))}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

