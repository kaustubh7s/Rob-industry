import React, { useState } from 'react';
import { Users, Search, Plus, Building2, Phone, Mail, MapPin, ArrowRight, Layers } from 'lucide-react';
import { useAccounts } from '../../context/AccountsContext';
import { formatINR } from '../../utils/accountsCalculations';

export const CustomerDirectoryView: React.FC = () => {
  const { companies, deals, setActiveView } = useAccounts();
  const [search, setSearch] = useState('');

  const filteredCustomers = companies.filter((c) => {
    const q = search.toLowerCase();
    return (
      c.companyName.toLowerCase().includes(q) ||
      (c.gstin && c.gstin.toLowerCase().includes(q)) ||
      (c.contactPerson && c.contactPerson.toLowerCase().includes(q)) ||
      (c.phone && c.phone.includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Customer Directory
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registered industrial clients, GSTIN verification, contact details, and financial exposure.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search company or GSTIN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs outline-none focus:border-slate-900 w-64 shadow-2xs"
            />
          </div>
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((customer) => {
          const customerDeals = deals.filter((d) => d.companyId === customer.id && !d.isArchived);
          const totalDealValue = customerDeals.reduce((s, d) => s + (d.decidedAmount || 0), 0);
          const totalReceived = customerDeals.reduce((s, d) => s + (d.totalReceived || 0), 0);
          const totalOutstanding = customerDeals.reduce((s, d) => s + (d.remainingBalance || 0), 0);

          return (
            <div
              key={customer.id}
              className="p-5 bg-white border border-slate-200 rounded-xl shadow-xs hover:border-slate-400 transition-all space-y-3.5 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">
                        {customer.companyName}
                      </h3>
                      <p className="text-[10px] font-mono text-slate-500 mt-0.5">
                        GSTIN: <strong>{customer.gstin || 'Unregistered / Not Provided'}</strong>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-600 space-y-1 pt-1">
                  {customer.contactPerson && (
                    <p className="flex items-center gap-1.5 text-[11px]">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{customer.contactPerson}</span>
                    </p>
                  )}
                  {customer.phone && (
                    <p className="flex items-center gap-1.5 text-[11px]">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-mono">{customer.phone}</span>
                    </p>
                  )}
                  {customer.address && (
                    <p className="flex items-start gap-1.5 text-[11px] text-slate-500 leading-snug">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="truncate">{customer.address}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Financial Snapshot */}
              <div className="pt-3 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 block">Total Orders</span>
                    <strong className="font-mono text-slate-900 font-bold text-xs">
                      {formatINR(totalDealValue)}
                    </strong>
                  </div>
                  <div className="p-2 bg-amber-50/50 rounded-lg border border-amber-100">
                    <span className="text-[10px] text-amber-700 block">Receivable</span>
                    <strong className="font-mono text-amber-800 font-bold text-xs">
                      {formatINR(totalOutstanding)}
                    </strong>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveView('deals')}
                  className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>View Customer Deals ({customerDeals.length})</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

