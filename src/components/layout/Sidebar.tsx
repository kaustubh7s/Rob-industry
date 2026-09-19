import React, { useEffect } from 'react';
import {
  FolderKanban,
  ShoppingCart,
  Trash2,
  ShieldCheck,
  Zap,
  X,
  Layers,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTutorial?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onOpenTutorial }) => {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    projects,
    projectRequirements,
    trashItems,
  } = useERP();

  // Close drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleNavClick = (tabId: string) => {
    if (tabId === 'trash') {
      window.dispatchEvent(new CustomEvent('rsb:open-trash'));
      setActiveTab('entry');
    } else {
      setActiveTab(tabId);
    }
    // Auto-close drawer on selection so workspace is 100% full screen
    onClose();
  };

  // Primary Nav Items requested by user
  const primaryNavItems = [
    {
      id: 'entry',
      label: 'Material Entry',
      sub: 'Machine Workstation',
      icon: Zap,
      shortcut: 'Ctrl+1',
      badge: 'Active',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      roles: ['super_admin', 'kaustubh', 'admin', 'operator', 'store_incharge', 'store_manager', 'production_manager', 'purchase_manager'],
    },
    {
      id: 'projects',
      label: 'Projects Directory',
      sub: 'Machines & BOM Archive',
      icon: FolderKanban,
      shortcut: 'Ctrl+2',
      badge: String(projects.length),
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      roles: ['super_admin', 'kaustubh', 'admin', 'operator', 'store_incharge', 'store_manager', 'production_manager', 'purchase_manager'],
    },
    {
      id: 'procurement',
      label: 'Order Basket',
      sub: 'Vendor Allocation & RFQ',
      icon: ShoppingCart,
      shortcut: 'Ctrl+3',
      badge: String(projectRequirements.length),
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      roles: ['super_admin', 'kaustubh', 'admin', 'store_incharge', 'store_manager', 'purchase_manager'],
    },
    {
      id: 'trash',
      label: 'Trash Bin',
      sub: 'Deleted Items & Recovery',
      icon: Trash2,
      shortcut: 'Ctrl+4',
      badge: String(trashItems.length),
      badgeColor:
        trashItems.length > 0
          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
          : 'bg-slate-800 text-slate-400 border-slate-700',
      roles: ['super_admin', 'kaustubh', 'admin', 'store_incharge', 'store_manager', 'production_manager', 'purchase_manager'],
    },
    {
      id: 'members',
      label: 'Member Authorizations',
      sub: 'Admin Security Matrix',
      icon: ShieldCheck,
      shortcut: 'Ctrl+5',
      badge: currentUser.role === 'super_admin' ? 'Super Admin' : 'Admin',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      roles: ['super_admin', 'admin', 'kaustubh'],
    },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Semi-transparent Backdrop Overlay */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 transition-opacity duration-300 animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out Drawer Sidebar */}
      <aside
        className="fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-slate-900 border-r border-slate-800 text-slate-300 shadow-2xl z-50 flex flex-col select-none animate-slideRight"
        aria-label="Enterprise Navigation Drawer"
      >
        {/* 1. TOP DRAWER HEADER */}
        <div className="h-16 border-b border-slate-800 px-4 flex items-center justify-between gap-3 bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center font-black text-sm shrink-0">
              <Layers className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <span className="text-xs font-black tracking-wider uppercase text-white block">
                RSB ENTERPRISE
              </span>
              <span className="text-[10px] font-medium text-slate-400 block">
                Navigation & Operations
              </span>
            </div>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white transition-all cursor-pointer active:scale-95"
            title="Close Menu (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2. MAIN NAVIGATION ITEMS */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar">
          <div className="px-2 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
            <span>Workspace Modules</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              activeTab === item.id ||
              (item.id === 'entry' && activeTab === 'requirements') ||
              (item.id === 'projects' && activeTab === 'details');

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-left relative ${
                  isActive
                    ? 'bg-blue-600/20 text-white border border-blue-500/50 shadow-sm shadow-blue-500/10'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white border border-transparent'
                }`}
              >
                {/* Active Indicator Bar */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-1.5 rounded-r bg-blue-500 shadow-sm shadow-blue-400" />
                )}

                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isActive
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-400/30'
                      : 'bg-slate-800/80 text-slate-400 border border-slate-700/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <div className="flex-1 flex items-center justify-between min-w-0">
                  <div className="truncate">
                    <span className="block truncate leading-tight text-xs">{item.label}</span>
                    {item.sub && (
                      <span className="block text-[10px] font-normal text-slate-400 truncate leading-tight mt-0.5">
                        {item.sub}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 ml-2 shrink-0">
                    {item.shortcut && (
                      <kbd className="px-1.5 py-0.2 rounded bg-slate-900 text-amber-300 font-mono text-[10px] font-bold border border-slate-700">
                        {item.shortcut}
                      </kbd>
                    )}
                    {item.badge && (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border shrink-0 ${item.badgeColor}`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

        </div>

        {/* 3. DRAWER FOOTER */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
          <span>RSB ERP Workstation</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] border border-slate-700">
            Full Screen Active
          </span>
        </div>
      </aside>
    </>
  );
};
