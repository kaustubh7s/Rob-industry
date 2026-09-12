import React from 'react';
import {
  LayoutDashboard,
  Table,
  Layers,
  FolderKanban,
  Package,
  Calculator,
  Truck,
  Send,
  Wrench,
  ShieldCheck,
  Building2,
  Users2,
  Cpu,
  ShoppingCart,
  ReceiptText,
  BadgeDollarSign,
  FileSpreadsheet,
  Settings,
  Award,
  Boxes,
  Sparkles,
  BookOpen,
  Activity,
  ExternalLink,
  FileCheck,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';

interface SidebarProps {
  onOpenTutorial?: () => void;
}

interface NavItem {
  id: string;
  label: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
  roles: string[];
}

interface NavSection {
  title: string;
  subtitle?: string;
  items: NavItem[];
}

export const Sidebar: React.FC<SidebarProps> = ({ onOpenTutorial }) => {
  const { activeTab, setActiveTab, currentUser } = useERP();

  // For Kaustubh Admin role, hide all other ERP modules completely
  if (currentUser.role === 'kaustubh') {
    return null;
  }

  const navSections: NavSection[] = [
    {
      title: 'DAILY REGISTERS (दैनिक रजिस्टर)',
      subtitle: 'Primary paper-to-digital work',
      items: [
        {
          id: 'inward',
          label: '1. Inward & Gate (आवक)',
          sub: 'Raw material gate entry',
          icon: Truck,
          badge: 'GATE',
          badgeColor: 'bg-emerald-600/30 text-emerald-300 border-emerald-500/40',
          roles: ['super_admin', 'admin', 'purchase_manager', 'store_manager', 'store_incharge', 'operator'],
        },
        {
          id: 'production',
          label: '2. Production & Jobs (कारखाना)',
          sub: 'Machine shopfloor job cards',
          icon: Wrench,
          badge: 'SHOP',
          badgeColor: 'bg-amber-600/30 text-amber-300 border-amber-500/40',
          roles: ['super_admin', 'admin', 'production_manager', 'operator'],
        },
        {
          id: 'quality',
          label: '3. Quality Inspection (जांच)',
          sub: 'QC check & test certificates',
          icon: ShieldCheck,
          badge: 'QC',
          badgeColor: 'bg-cyan-600/30 text-cyan-300 border-cyan-500/40',
          roles: ['super_admin', 'admin', 'production_manager', 'store_manager'],
        },
        {
          id: 'outward',
          label: '4. Outward & Dispatch (जावक)',
          sub: 'Challan book & gate pass',
          icon: Send,
          badge: 'CHALLAN',
          badgeColor: 'bg-purple-600/30 text-purple-300 border-purple-500/40',
          roles: ['super_admin', 'admin', 'store_manager', 'production_manager'],
        },
      ],
    },
    {
      title: 'MES SHOPFLOOR & EXECUTION (कारखाना सिस्टम)',
      subtitle: 'Advanced dispatching & traceability',
      items: [
        {
          id: 'dispatcher',
          label: 'Shopfloor Dispatcher & Gantt',
          sub: 'Live machine schedule & shift timeline',
          badge: 'MES',
          badgeColor: 'bg-indigo-600/30 text-indigo-300 border-indigo-500/40',
          icon: Activity,
          roles: ['super_admin', 'admin', 'production_manager'],
        },
        {
          id: 'terminal',
          label: 'Machinist Touch Terminal',
          sub: 'Operator live stage checkoff',
          badge: 'TOUCH',
          badgeColor: 'bg-amber-600/30 text-amber-300 border-amber-500/40',
          icon: Cpu,
          roles: ['super_admin', 'admin', 'production_manager', 'operator'],
        },
        {
          id: 'subcontracting',
          label: 'Subcontracting Jobwork (54)',
          sub: 'External electro-polishing & plating',
          badge: '54(4)',
          badgeColor: 'bg-teal-600/30 text-teal-300 border-teal-500/40',
          icon: ExternalLink,
          roles: ['super_admin', 'admin', 'purchase_manager', 'production_manager'],
        },
        {
          id: 'traceability',
          label: 'Pharma Traceability (MTC)',
          sub: 'Heat number & 21 CFR compliance',
          badge: 'MTC',
          badgeColor: 'bg-cyan-600/30 text-cyan-300 border-cyan-500/40',
          icon: FileCheck,
          roles: ['super_admin', 'admin', 'production_manager', 'purchase_manager'],
        },
      ],
    },
    {
      title: 'PLANNING & INVENTORY (नियोजन व स्टॉक)',
      subtitle: 'Stock balances & order tracking',
      items: [
        {
          id: 'requirements',
          label: 'Material Req Table',
          sub: 'Central project parts matrix',
          badge: 'CORE',
          badgeColor: 'bg-blue-600 text-white border-blue-500',
          icon: Table,
          roles: ['super_admin', 'admin', 'purchase_manager', 'production_manager', 'store_manager', 'store_incharge', 'accounts', 'operator'],
        },
        {
          id: 'orders',
          label: 'Production Orders (PO 36)',
          sub: 'Customer PO tracking list',
          icon: Layers,
          roles: ['super_admin', 'admin', 'production_manager', 'purchase_manager', 'store_manager', 'store_incharge', 'operator'],
        },
        {
          id: 'materials',
          label: 'Godown Stock Master (स्टॉक)',
          sub: 'Live raw & finished stock ledger',
          icon: Package,
          roles: ['super_admin', 'admin', 'purchase_manager', 'store_manager', 'store_incharge'],
        },
        {
          id: 'bom',
          label: 'BOM Management (पुर्जे)',
          sub: 'Bill of materials for machines',
          icon: Boxes,
          roles: ['super_admin', 'admin', 'production_manager', 'purchase_manager'],
        },
        {
          id: 'mrp',
          label: 'MRP Shortage Engine',
          sub: 'Automatic shortage calculation',
          icon: Cpu,
          badge: 'MRP',
          badgeColor: 'bg-slate-800 text-blue-300 border-slate-700',
          roles: ['super_admin', 'admin', 'purchase_manager', 'production_manager', 'store_manager', 'store_incharge'],
        },
      ],
    },
    {
      title: 'SHOPFLOOR & DIRECTORIES (मास्टर)',
      items: [
        {
          id: 'machines',
          label: 'Machine Floor OEE',
          icon: Cpu,
          roles: ['super_admin', 'admin', 'production_manager', 'operator'],
        },
        {
          id: 'vendors',
          label: 'Vendor Directory (सप्लायर)',
          icon: Building2,
          roles: ['super_admin', 'admin', 'purchase_manager'],
        },
        {
          id: 'customers',
          label: 'Customer Directory (ग्राहक)',
          icon: Users2,
          roles: ['super_admin', 'admin', 'accounts'],
        },
        {
          id: 'projects',
          label: 'Machine Projects',
          icon: FolderKanban,
          roles: ['super_admin', 'admin', 'production_manager', 'store_manager', 'store_incharge'],
        },
        {
          id: 'vendor_performance',
          label: 'Vendor Performance',
          icon: Award,
          roles: ['super_admin', 'admin', 'purchase_manager'],
        },
      ],
    },
    {
      title: 'COMMERCIAL & REPORTS (हिसाब)',
      items: [
        {
          id: 'purchase',
          label: 'Purchase Orders (PO)',
          icon: ShoppingCart,
          roles: ['super_admin', 'admin', 'purchase_manager', 'accounts'],
        },
        {
          id: 'sales',
          label: 'Sales & Invoicing',
          icon: ReceiptText,
          roles: ['super_admin', 'admin', 'accounts'],
        },
        {
          id: 'costing',
          label: 'Costing & P&L',
          icon: BadgeDollarSign,
          roles: ['super_admin', 'admin', 'accounts'],
        },
        {
          id: 'reports',
          label: 'Reports & Excel Export',
          icon: FileSpreadsheet,
          roles: ['super_admin', 'admin', 'purchase_manager', 'production_manager', 'accounts'],
        },
      ],
    },
    {
      title: 'OVERVIEW & TOOLS',
      items: [
        {
          id: 'dashboard',
          label: 'Factory Cockpit',
          icon: LayoutDashboard,
          roles: ['super_admin', 'admin', 'purchase_manager', 'production_manager', 'store_manager', 'accounts'],
        },
        {
          id: 'calculator',
          label: 'SS Weight Calculator',
          icon: Calculator,
          roles: ['super_admin', 'admin', 'purchase_manager', 'production_manager', 'operator'],
        },
        {
          id: 'admin',
          label: 'Admin Control Center',
          icon: Settings,
          roles: ['super_admin'],
        },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 select-none overflow-hidden h-full">
      {/* Brand Header */}
      <div className="p-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-black text-white text-xs tracking-tight shadow-md shrink-0">
            RSB
          </div>
          <div className="min-w-0">
            <h1 className="text-xs font-black text-white tracking-wide truncate">RSB PRIVATE LTD</h1>
            <p className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              PRODUCTION LEVEL ERP
            </p>
          </div>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="p-2 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
        {navSections.map((sec, secIdx) => {
          const visibleItems = sec.items.filter(
            (item) => item.roles.includes(currentUser.role) || currentUser.role === 'super_admin'
          );

          if (visibleItems.length === 0) return null;

          return (
            <div key={secIdx} className="space-y-1">
              <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>{sec.title}</span>
              </div>

              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;

                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all group ${
                        isActive
                          ? 'bg-blue-600/20 text-blue-200 border border-blue-500/40 font-bold shadow-xs'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                          }`}
                        />
                        <div className="text-left min-w-0">
                          <span className="truncate block text-xs">{item.label}</span>
                        </div>
                      </div>

                      {item.badge && (
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border shrink-0 ${
                            item.badgeColor || 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User Info & Quick Help Button Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-900/90 space-y-2">
        {onOpenTutorial && (
          <button
            type="button"
            onClick={onOpenTutorial}
            className="w-full py-1.5 px-2.5 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 border border-blue-500/30 text-blue-300 text-[11px] font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>🎓 Easy ERP Guide (सरल गाइड)</span>
          </button>
        )}

        <div className="flex items-center gap-2.5 pt-1">
          <div className="w-7 h-7 rounded-md bg-blue-700 flex items-center justify-center text-xs font-bold text-white uppercase border border-blue-600 shrink-0">
            {currentUser.name.charAt(0)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-slate-200 truncate">{currentUser.name}</p>
            <p className="text-[10px] text-slate-400 font-mono uppercase truncate">{currentUser.role.replace('_', ' ')}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};
