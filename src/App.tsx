import React, { useState, useEffect } from 'react';
import { ERPProvider, useERP } from './context/ERPContext';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './components/dashboard/Dashboard';
import { ProjectMaterialRequirementsTable } from './components/requirements/ProjectMaterialRequirementsTable';
import { ProductionTable } from './components/orders/ProductionTable';
import { ProjectManager } from './components/projects/ProjectManager';
import { MaterialCatalog } from './components/materials/MaterialCatalog';
import { WeightCalculator } from './components/materials/WeightCalculator';
import { InwardManagement } from './components/inward/InwardManagement';
import { OutwardManagement } from './components/dispatch/OutwardManagement';
import { JobCardManager } from './components/production/JobCardManager';
import { ShopfloorDispatcher } from './components/production/ShopfloorDispatcher';
import { OperatorTerminal } from './components/production/OperatorTerminal';
import { SubcontractingManager } from './components/production/SubcontractingManager';
import { QCInspectionManager } from './components/quality/QCInspectionManager';
import { MaterialTraceabilityEngine } from './components/quality/MaterialTraceabilityEngine';
import { VendorManager } from './components/stakeholders/VendorManager';
import { CustomerManager } from './components/stakeholders/CustomerManager';
import { MachineManager } from './components/machines/MachineManager';
import { PurchaseManager } from './components/commercial/PurchaseManager';
import { SalesManager } from './components/commercial/SalesManager';
import { CostingAnalysis } from './components/costing/CostingAnalysis';
import { ReportCenter } from './components/reports/ReportCenter';
import { SuperAdminPanel } from './components/admin/SuperAdminPanel';
import { BOMManager } from './components/bom/BOMManager';
import { MRPEngine } from './components/mrp/MRPEngine';
import { VendorPerformanceDashboard } from './components/vendor/VendorPerformanceDashboard';
import { VendorPortal } from './components/portal/VendorPortal';
import { GlobalSearch } from './components/common/GlobalSearch';
import { ExcelModal } from './components/common/ExcelModal';
import { QuickActionModal } from './components/common/QuickActionModal';
import { ProjectMaterialEntry } from './components/entry/ProjectMaterialEntry';
import { EasyTutorialModal } from './components/common/EasyTutorialModal';
import { Modal } from './components/common/Modal';
import { MobileAdminApp } from './components/mobile/MobileAdminApp';
import { MobileStoreInwardApp } from './components/mobile/MobileStoreInwardApp';
import { LoginScreen } from './components/auth/LoginScreen';
import { ErrorBoundary } from './components/common/ErrorBoundary';

const ERPAppContent: React.FC = () => {
  const { activeTab, setActiveTab, currentUser, isAuthenticated } = useERP();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isExcelOpen, setIsExcelOpen] = useState(false);
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [quickActionInitial, setQuickActionInitial] = useState<'order' | 'inward' | 'outward' | 'job' | 'qc'>('inward');
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  // Dedicated Mobile Device Detection (Leaves PC UI 100% untouched)
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isProductionWorkstation =
    currentUser?.role === 'super_admin' ||
    currentUser?.role === 'kaustubh' ||
    currentUser?.role === 'operator' ||
    currentUser?.role === 'store_incharge' ||
    currentUser?.role === 'admin' ||
    true;

  const handleOpenQuickAction = (action?: 'order' | 'inward' | 'outward' | 'job' | 'qc') => {
    if (action) setQuickActionInitial(action);
    setIsQuickActionOpen(true);
  };

  // Easy & Reliable Keyboard Shortcuts for:
  // 1 / Alt+1 / Ctrl+1 / Alt+M -> Material Entry
  // 2 / Alt+2 / Ctrl+2 / Alt+P -> Projects Directory
  // 3 / Alt+3 / Ctrl+3 / Alt+O / Alt+B -> Order Basket
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInputActive =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement ||
        (activeEl as HTMLElement)?.isContentEditable;

      // Ctrl+K / Cmd+K Search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
        return;
      }

      // Single-Key Number Navigation (when not typing in an input field)
      if (!isInputActive && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.key === '1') {
          e.preventDefault();
          setActiveTab('entry');
          return;
        }
        if (e.key === '2') {
          e.preventDefault();
          setActiveTab('projects');
          return;
        }
        if (e.key === '3') {
          e.preventDefault();
          setActiveTab('procurement');
          return;
        }
      }

      // Alt / Option Combinations (works anywhere)
      if (e.altKey) {
        const key = e.key.toLowerCase();
        if (key === '1' || key === 'm') {
          e.preventDefault();
          setActiveTab('entry');
          return;
        }
        if (key === '2' || key === 'p') {
          e.preventDefault();
          setActiveTab('projects');
          return;
        }
        if (key === '3' || key === 'o' || key === 'b') {
          e.preventDefault();
          setActiveTab('procurement');
          return;
        }
      }

      // Ctrl + Number & Refresh Combinations (works anywhere)
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey) {
        if (e.key === '1') {
          e.preventDefault();
          setActiveTab('entry');
          return;
        }
        if (e.key === '2') {
          e.preventDefault();
          setActiveTab('projects');
          return;
        }
        if (e.key === '3') {
          e.preventDefault();
          setActiveTab('procurement');
          return;
        }
        if (e.key === 'r' || e.key === 'R') {
          // Allow default Ctrl+R / Cmd+R to reload the browser while keeping all assigned vendors intact
          // Or reload seamlessly
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTab]);

  // Screen Lock / Unauthenticated Gate
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // On Phone View: Render dedicated mobile apps
  if (isMobile) {
    if (currentUser?.role === 'store_incharge') {
      return <MobileStoreInwardApp />;
    }
    return <MobileAdminApp />;
  }

  return (
    <div className={`min-h-screen flex flex-col ${isProductionWorkstation ? 'bg-[#f8fafc] text-slate-900' : 'bg-slate-950 text-slate-100'} selection:bg-slate-900 selection:text-white`}>
      {/* Header with ☰ Menu Drawer Toggle */}
      <Header
        onOpenSearch={() => setIsSearchOpen(true)}
        onOpenExcel={() => setIsExcelOpen(true)}
        onOpenCalculator={() => setIsCalcModalOpen(true)}
        onOpenQuickAction={handleOpenQuickAction}
        onOpenTutorial={() => setIsTutorialOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      />

      {/* Main Full-Screen Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Slide-out Drawer Sidebar (Opens only when needed) */}
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onOpenTutorial={() => setIsTutorialOpen(true)}
        />

        {/* 100% Full Screen Main Viewport */}
        <main className="flex-1 w-full overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#f8fafc] text-slate-900 custom-scrollbar">
          <div className="w-full max-w-[1800px] mx-auto space-y-6">
            {/* Core Workstation Screens */}
            {(activeTab === 'entry' ||
              activeTab === 'requirements' ||
              activeTab === 'projects' ||
              activeTab === 'details' ||
              activeTab === 'procurement' ||
              activeTab === 'members') && (
              <ProjectMaterialEntry />
            )}

            {/* Additional Plant Registers & Modules */}
            {activeTab === 'dashboard' && (
              <Dashboard
                onOpenQuickAction={handleOpenQuickAction}
                onOpenExcel={() => setIsExcelOpen(true)}
                onOpenTutorial={() => setIsTutorialOpen(true)}
              />
            )}
            {activeTab === 'orders' && <ProductionTable />}
            {activeTab === 'bom' && <BOMManager />}
            {activeTab === 'mrp' && <MRPEngine />}
            {activeTab === 'dispatcher' && <ShopfloorDispatcher />}
            {activeTab === 'terminal' && <OperatorTerminal />}
            {activeTab === 'subcontracting' && <SubcontractingManager />}
            {activeTab === 'traceability' && <MaterialTraceabilityEngine />}
            {activeTab === 'vendor_performance' && <VendorPerformanceDashboard />}
            {activeTab === 'vendor_portal' && <VendorPortal />}
            {activeTab === 'materials' && (
              <MaterialCatalog onOpenCalculator={() => setIsCalcModalOpen(true)} />
            )}
            {activeTab === 'calculator' && <WeightCalculator />}
            {activeTab === 'inward' && <InwardManagement onOpenQuickAction={handleOpenQuickAction} />}
            {activeTab === 'outward' && <OutwardManagement onOpenQuickAction={handleOpenQuickAction} />}
            {activeTab === 'production' && <JobCardManager />}
            {activeTab === 'quality' && <QCInspectionManager />}
            {activeTab === 'vendors' && <VendorManager />}
            {activeTab === 'customers' && <CustomerManager />}
            {activeTab === 'machines' && <MachineManager />}
            {activeTab === 'purchase' && <PurchaseManager />}
            {activeTab === 'sales' && <SalesManager />}
            {activeTab === 'costing' && <CostingAnalysis />}
            {activeTab === 'reports' && <ReportCenter />}
            {activeTab === 'admin' && <SuperAdminPanel />}

            {/* Robust Fallback for Unrecognized / Dynamic Tabs */}
            {![
              'entry', 'requirements', 'projects', 'details', 'procurement', 'members',
              'dashboard', 'orders', 'bom', 'mrp', 'dispatcher', 'terminal',
              'subcontracting', 'traceability', 'vendor_performance', 'vendor_portal',
              'materials', 'calculator', 'inward', 'outward', 'production',
              'quality', 'vendors', 'customers', 'machines', 'purchase',
              'sales', 'costing', 'reports', 'admin'
            ].includes(activeTab) && (
              <ProjectMaterialEntry />
            )}
          </div>
        </main>
      </div>

      {/* Global Command Palette & Modals */}
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      <ExcelModal isOpen={isExcelOpen} onClose={() => setIsExcelOpen(false)} />
      <QuickActionModal
        isOpen={isQuickActionOpen}
        onClose={() => setIsQuickActionOpen(false)}
        initialAction={quickActionInitial}
      />
      <EasyTutorialModal
        isOpen={isTutorialOpen}
        onClose={() => setIsTutorialOpen(false)}
        onSelectTab={(tabId) => setActiveTab(tabId)}
      />

      {/* SS Weight Quick Calculator Modal */}
      <Modal
        isOpen={isCalcModalOpen}
        onClose={() => setIsCalcModalOpen(false)}
        title="Stainless Steel Engineering Weight & Cost Calculator"
        subtitle="Quick engineering formula calculator for SS Flat, Pipe, Circle, Bar, and Sheet"
        maxWidth="4xl"
      >
        <WeightCalculator isModal onClose={() => setIsCalcModalOpen(false)} />
      </Modal>
    </div>
  );
};

export function App() {
  return (
    <ErrorBoundary>
      <ERPProvider>
        <ERPAppContent />
      </ERPProvider>
    </ErrorBoundary>
  );
}

export default App;
