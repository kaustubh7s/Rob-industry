import React, { useEffect } from 'react';
import {
  FolderKanban,
  ShoppingCart,
  Trash2,
  ShieldCheck,
  Zap,
  X,
  Sparkles,
  Command,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTutorial?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
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
    onClose();
  };

  const isSuperOrAdmin =
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'admin' ||
    currentUser?.role === 'kaustubh';

  const workspaceItems = [
    {
      id: 'entry',
      label: 'Material Entry',
      icon: Zap,
      shortcut: 'Ctrl+1',
      badge: null,
    },
    {
      id: 'projects',
      label: 'Projects Directory',
      icon: FolderKanban,
      shortcut: 'Ctrl+2',
      badge: projects.length > 0 ? String(projects.length) : null,
    },
    {
      id: 'procurement',
      label: 'Order Basket',
      icon: ShoppingCart,
      shortcut: 'Ctrl+3',
      badge: projectRequirements.length > 0 ? String(projectRequirements.length) : null,
    },
  ];

  const managementItems = [
    {
      id: 'trash',
      label: 'Trash & Recovery',
      icon: Trash2,
      shortcut: 'Ctrl+4',
      badge: trashItems.length > 0 ? String(trashItems.length) : null,
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    },
    ...(isSuperOrAdmin
      ? [
          {
            id: 'members',
            label: 'Member Security',
            icon: ShieldCheck,
            shortcut: 'Ctrl+5',
            badge: 'Admin',
            badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
          },
        ]
      : []),
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-40 transition-opacity duration-200 animate-fadeIn"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Clean Slide-out Drawer */}
      <aside
        className="fixed inset-y-0 left-0 w-72 max-w-[85vw] bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 text-slate-200 shadow-2xl z-50 flex flex-col select-none animate-slideRight"
        aria-label="Navigation Drawer"
      >
        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
              RSB
            </div>
            <div>
              <span className="text-xs font-bold tracking-wide text-white block leading-none">
                Navigation
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Quick Switcher
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation List */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 custom-scrollbar">
          {/* Workspaces Section */}
          <div>
            <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Workspaces
            </div>
            <div className="space-y-1">
              {workspaceItems.map((item) => {
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
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {item.badge && (
                        <span
                          className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-medium ${
                            isActive
                              ? 'bg-white/20 text-white'
                              : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      <kbd
                        className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                          isActive
                            ? 'bg-blue-700 text-blue-100'
                            : 'bg-slate-800/80 text-slate-400 border border-slate-700/60'
                        }`}
                      >
                        {item.shortcut}
                      </kbd>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* System & Management Section */}
          <div>
            <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              System
            </div>
            <div className="space-y-1">
              {managementItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer group ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {item.badge && (
                        <span
                          className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-medium border ${
                            isActive
                              ? 'bg-white/20 text-white border-transparent'
                              : item.badgeColor || 'bg-slate-800 text-slate-400 border-slate-700/60'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      <kbd
                        className={`px-1.5 py-0.2 rounded font-mono text-[10px] ${
                          isActive
                            ? 'bg-blue-700 text-blue-100'
                            : 'bg-slate-800/80 text-slate-400 border border-slate-700/60'
                        }`}
                      >
                        {item.shortcut}
                      </kbd>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Clean Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2 truncate">
            <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-300 border border-slate-700 shrink-0">
              {currentUser?.name ? currentUser.name[0].toUpperCase() : 'U'}
            </div>
            <span className="truncate font-medium text-slate-300">{currentUser?.name || 'User'}</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 shrink-0">Esc to close</span>
        </div>
      </aside>
    </>
  );
};
