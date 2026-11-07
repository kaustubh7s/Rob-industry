import React, { useState } from 'react';
import { Menu, Plus, ArrowLeft, Search, Bell } from 'lucide-react';
import { AccountsProvider, useAccounts } from '../../context/AccountsContext';
import { AccountsSidebar } from './AccountsSidebar';
import { AccountsDashboard } from './AccountsDashboard';
import { AllDealsView } from './AllDealsView';
import { DealDetailsView } from './DealDetailsView';
import { AccountsPaymentHistoryView } from './AccountsPaymentHistoryView';
import { AccountsSettingsView } from './AccountsSettingsView';
import { NewDealModal } from './NewDealModal';
import { useERP } from '../../context/ERPContext';

interface AccountsPortalProps {
  isAccountantOnly?: boolean;
  onBackToERP?: () => void;
}

const AccountsPortalContent: React.FC<AccountsPortalProps> = ({
  isAccountantOnly = false,
  onBackToERP,
}) => {
  const { activeView, selectedDealId, setActiveView, summary } = useAccounts();
  const { currentUser } = useERP();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isNewDealOpen, setIsNewDealOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex font-sans antialiased selection:bg-slate-900 selection:text-white">
      {/* Accounts Sidebar */}
      <AccountsSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onOpenNewDeal={() => setIsNewDealOpen(true)}
        isAccountantOnly={isAccountantOnly}
        onBackToERP={onBackToERP}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
          <div className="flex items-center gap-3">
            {/* Mobile Sidebar Hamburger Toggle */}
            <button
              type="button"
              onClick={() => setIsSidebarOpen((prev) => !prev)}
              className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-700 lg:hidden cursor-pointer"
              aria-label="Toggle Navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Portal Badge */}
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 tracking-tight">
                RSB Accounts Portal
              </span>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-bold">
                Company Financials
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Switch back to Manufacturing ERP for Super Admin */}
            {!isAccountantOnly && onBackToERP && (
              <button
                type="button"
                onClick={onBackToERP}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer border border-slate-200"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Plant ERP</span>
              </button>
            )}

            {/* Top Quick + Add New Deal Button */}
            <button
              type="button"
              onClick={() => setIsNewDealOpen(true)}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>New Deal</span>
            </button>

            {/* User Avatar */}
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-xs flex items-center justify-center select-none shadow-2xs">
              {currentUser?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
          </div>
        </header>

        {/* Viewport Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeView === 'overview' && (
            <AccountsDashboard onOpenNewDeal={() => setIsNewDealOpen(true)} />
          )}

          {activeView === 'deals' && (
            <AllDealsView onOpenNewDeal={() => setIsNewDealOpen(true)} initialFilter="all" />
          )}

          {activeView === 'pending' && (
            <AllDealsView onOpenNewDeal={() => setIsNewDealOpen(true)} initialFilter="pending" />
          )}

          {activeView === 'archived' && (
            <AllDealsView onOpenNewDeal={() => setIsNewDealOpen(true)} initialFilter="archived" />
          )}

          {activeView === 'deal-details' && selectedDealId && (
            <DealDetailsView
              dealId={selectedDealId}
              onBack={() => setActiveView('deals')}
            />
          )}

          {activeView === 'payments' && <AccountsPaymentHistoryView />}

          {activeView === 'settings' && <AccountsSettingsView />}
        </main>
      </div>

      {/* New Deal Modal */}
      <NewDealModal
        isOpen={isNewDealOpen}
        onClose={() => setIsNewDealOpen(false)}
        onDealCreated={(newDealId) => setActiveView('deal-details', newDealId)}
      />
    </div>
  );
};

export const AccountsPortal: React.FC<AccountsPortalProps> = (props) => {
  return (
    <AccountsProvider>
      <AccountsPortalContent {...props} />
    </AccountsProvider>
  );
};
