import React, { useState } from 'react';
import {
  LayoutDashboard,
  Layers,
  FileText,
  Users,
  Building2,
  ShoppingCart,
  Receipt,
  CreditCard,
  Landmark,
  BookOpen,
  PieChart,
  FileSpreadsheet,
  Settings,
  ChevronDown,
  ChevronRight,
  LogOut,
  ArrowLeft,
  Plus,
  ShieldCheck,
  TrendingUp,
  Clock,
  Sparkles,
  Wallet,
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

interface NavSection {
  title: string;
  items: {
    id: AccountsView;
    label: string;
    icon: React.ReactNode;
    badge?: string | number;
    badgeColor?: string;
  }[];
}

export const AccountsSidebar: React.FC<AccountsSidebarProps> = ({
  isOpen,
  onClose,
  onOpenNewDeal,
  isAccountantOnly,
  onBackToERP,
}) => {
  const { activeView, setActiveView, summary, financeMetrics } = useAccounts();
  const { currentUser, logout } = useERP();

  // Collapsible group state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const navSections: NavSection[] = [
    {
      title: 'OVERVIEW',
      items: [
        {
          id: 'overview',
          label: 'Finance Dashboard',
          icon: <LayoutDashboard className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'SALES',
      items: [
        {
          id: 'customers',
          label: 'Customers Directory',
          icon: <Users className="w-4 h-4" />,
        },
        {
          id: 'deals',
          label: 'Customer Deals',
          icon: <Layers className="w-4 h-4" />,
          badge: summary.totalDeals,
        },
        {
          id: 'invoices',
          label: 'Sales Invoices & PI',
          icon: <FileText className="w-4 h-4" />,
          badge: financeMetrics.invoicesCount,
        },
        {
          id: 'customer-receipts',
          label: 'Customer Receipts',
          icon: <Receipt className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'PURCHASES',
      items: [
        {
          id: 'vendors',
          label: 'Vendors Directory',
          icon: <Building2 className="w-4 h-4" />,
        },
        {
          id: 'purchase-orders',
          label: 'Purchase Orders',
          icon: <ShoppingCart className="w-4 h-4" />,
        },
        {
          id: 'purchase-bills',
          label: 'Purchase Bills (Bills)',
          icon: <Receipt className="w-4 h-4" />,
          badge: financeMetrics.purchaseBillsCount,
        },
      ],
    },
    {
      title: 'PAYMENTS',
      items: [
        {
          id: 'payments',
          label: 'Customer Payments Ledger',
          icon: <Clock className="w-4 h-4" />,
        },
        {
          id: 'vendor-payments',
          label: 'Vendor Payments',
          icon: <CreditCard className="w-4 h-4" />,
        },
        {
          id: 'bank-cash',
          label: 'Bank & Cash Accounts',
          icon: <Landmark className="w-4 h-4" />,
        },
        {
          id: 'expenses',
          label: 'Business Expenses',
          icon: <Wallet className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'ACCOUNTING',
      items: [
        {
          id: 'general-ledger',
          label: 'General Ledger',
          icon: <BookOpen className="w-4 h-4" />,
        },
        {
          id: 'chart-of-accounts',
          label: 'Chart of Accounts',
          icon: <Layers className="w-4 h-4" />,
        },
        {
          id: 'journal-entries',
          label: 'Journal Vouchers (JV)',
          icon: <FileSpreadsheet className="w-4 h-4" />,
        },
        {
          id: 'trial-balance',
          label: 'Trial Balance',
          icon: <PieChart className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'REPORTS',
      items: [
        {
          id: 'profit-loss',
          label: 'Profit & Loss Statement',
          icon: <TrendingUp className="w-4 h-4" />,
        },
        {
          id: 'balance-sheet',
          label: 'Balance Sheet',
          icon: <PieChart className="w-4 h-4" />,
        },
        {
          id: 'gst-reports',
          label: 'GST Tax Reports',
          icon: <FileText className="w-4 h-4" />,
        },
        {
          id: 'receivables',
          label: 'Receivables Aging',
          icon: <Clock className="w-4 h-4" />,
        },
        {
          id: 'payables',
          label: 'Payables Aging',
          icon: <Clock className="w-4 h-4" />,
        },
      ],
    },
    {
      title: 'SETTINGS',
      items: [
        {
          id: 'settings',
          label: 'Profile, GST & Security',
          icon: <Settings className="w-4 h-4" />,
        },
      ],
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
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-950 text-slate-200 border-r border-slate-800 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } select-none shadow-xl`}
      >
        {/* Top Header & Branding */}
        <div>
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 text-white flex items-center justify-center font-black text-sm tracking-wider shadow-md">
                ₹
              </div>
              <div>
                <h2 className="text-xs font-black text-white tracking-wider uppercase">
                  RSB FINANCE
                </h2>
                <p className="text-[10px] font-medium text-slate-400">
                  Industrial Accounts & ERP
                </p>
              </div>
            </div>

            <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              FY 26-27
            </span>
          </div>

          {/* Quick Action: New Deal Button */}
          <div className="p-3">
            <button
              type="button"
              onClick={() => {
                onOpenNewDeal();
                if (window.innerWidth < 1024) onClose();
              }}
              className="w-full py-2 px-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-sm active:scale-98 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-200" />
              <span>+ Record New Deal</span>
            </button>
          </div>
        </div>

        {/* Scrollable Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4 text-xs font-medium custom-scrollbar">
          {navSections.map((section) => {
            const isCollapsed = !!collapsedSections[section.title];

            return (
              <div key={section.title} className="space-y-1">
                {/* Section Header */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.title)}
                  className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <span>{section.title}</span>
                  {isCollapsed ? (
                    <ChevronRight className="w-3 h-3 text-slate-500" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-slate-500" />
                  )}
                </button>

                {/* Section Links */}
                {!isCollapsed && (
                  <div className="space-y-0.5">
                    {section.items.map((item) => {
                      const isActive = activeView === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleNavClick(item.id)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                            isActive
                              ? 'bg-indigo-600 text-white font-bold shadow-xs'
                              : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <span className={isActive ? 'text-white' : 'text-slate-400'}>
                              {item.icon}
                            </span>
                            <span className="truncate">{item.label}</span>
                          </div>

                          {item.badge !== undefined && (
                            <span
                              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold ${
                                isActive
                                  ? 'bg-white text-indigo-900'
                                  : 'bg-slate-800 text-slate-300 border border-slate-700'
                              }`}
                            >
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Profile & Switch ERP */}
        <div className="p-3 border-t border-slate-800 space-y-2">
          {/* Active User Pill */}
          <div className="px-2.5 py-2 bg-slate-900 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-bold text-xs flex items-center justify-center shrink-0">
                {currentUser?.name?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  {currentUser?.name || 'Accountant'}
                </p>
                <p className="text-[10px] text-slate-400 capitalize truncate">
                  {currentUser?.role === 'super_admin' ? 'Super Admin' : 'Finance Manager'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
              title="Lock Screen / Logout"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Switch to Plant ERP for Super Admin */}
          {!isAccountantOnly && onBackToERP && (
            <button
              type="button"
              onClick={onBackToERP}
              className="w-full py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-slate-800 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
              <span>Back to Plant ERP</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
