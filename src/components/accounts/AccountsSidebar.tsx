import React from 'react';
import {
  LayoutDashboard,
  Layers,
  Clock,
  History,
  Archive,
  Settings,
  LogOut,
  Building2,
  ArrowLeft,
  Shield,
  CreditCard,
  User,
  Plus,
} from 'lucide-react';
import { useAccounts, AccountsView } from '../../context/AccountsContext';
import { useERP } from '../../context/ERPContext';

interface AccountsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenNewDeal: () => void;
  isAccountantOnly: boolean;
  onBackToERP?: () => void;
}

export const AccountsSidebar: React.FC<AccountsSidebarProps> = ({
  isOpen,
  onClose,
  onOpenNewDeal,
  isAccountantOnly,
  onBackToERP,
}) => {
  const { activeView, setActiveView, summary } = useAccounts();
  const { currentUser, logout } = useERP();

  const navItems: { id: AccountsView; label: string; icon: React.ReactNode; badge?: string | number }[] = [
    {
      id: 'overview',
      label: 'Overview',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'deals',
      label: 'All Deals',
      icon: <Layers className="w-4 h-4" />,
      badge: summary.totalDeals,
    },
    {
      id: 'pending',
      label: 'Pending Payments',
      icon: <Clock className="w-4 h-4" />,
      badge: summary.outstandingBalance > 0 ? 'Pending' : undefined,
    },
    {
      id: 'payments',
      label: 'Payment History',
      icon: <History className="w-4 h-4" />,
    },
    {
      id: 'archived',
      label: 'Archived Deals',
      icon: <Archive className="w-4 h-4" />,
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  const handleNavClick = (viewId: AccountsView) => {
    setActiveView(viewId, null);
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } select-none shadow-sm`}
      >
        {/* Top Branding Section */}
        <div>
          <div className="p-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-lg tracking-wider shadow-md">
                <span className="text-emerald-400">₹</span>
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 tracking-tight">RSB ACCOUNTS</h2>
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Company Financials Portal
                </p>
              </div>
            </div>
          </div>

          {/* Quick Action Button */}
          <div className="p-3">
            <button
              type="button"
              onClick={() => {
                onOpenNewDeal();
                if (window.innerWidth < 1024) onClose();
              }}
              className="w-full py-2.5 px-3.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md active:scale-98 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              <span>+ Add New Deal</span>
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const isActive =
                activeView === item.id ||
                (item.id === 'deals' && activeView === 'deal-details');

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-emerald-400' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-emerald-500 text-slate-950'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile, ERP Switcher & Logout */}
        <div className="p-3 border-t border-slate-200 space-y-2 bg-slate-50/50">
          {/* Admin Switcher: Back to Manufacturing ERP */}
          {!isAccountantOnly && onBackToERP && (
            <button
              type="button"
              onClick={onBackToERP}
              className="w-full py-2 px-3 rounded-xl bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
              <span>← Switch to Plant ERP</span>
            </button>
          )}

          {/* User Profile Card */}
          <div className="p-2.5 bg-white border border-slate-200 rounded-xl flex items-center gap-2.5 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs shrink-0">
              {currentUser?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">
                {currentUser?.name || 'Accountant'}
              </p>
              <p className="text-[10px] text-slate-500 font-medium truncate">
                {currentUser?.role === 'super_admin' ? 'Super Admin' : 'Finance & Accounts'}
              </p>
            </div>
          </div>

          {/* Logout Button */}
          <button
            type="button"
            onClick={logout}
            className="w-full py-2 px-3 rounded-xl text-rose-700 hover:bg-rose-50 hover:text-rose-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};
