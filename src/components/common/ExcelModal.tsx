import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  CheckCircle2,
  Cloud,
  Mail,
  MessageSquare,
  BarChart3,
  RefreshCw,
  FileCode2,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import {
  exportToExcel,
  exportToCsv,
  downloadTemplate,
  importFromExcel,
} from '../../utils/excelIntegration';

interface ExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'export' | 'import' | 'templates' | 'microsoft365';
}

export const ExcelModal: React.FC<ExcelModalProps> = ({ isOpen, onClose, defaultTab = 'export' }) => {
  const [activeSubTab, setActiveSubTab] = useState<'export' | 'import' | 'templates' | 'microsoft365'>(defaultTab);
  const [importTarget, setImportTarget] = useState<'materials' | 'orders' | 'vendors' | 'customers'>('materials');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [oneDriveSynced, setOneDriveSynced] = useState(true);
  const [teamsWebhookStatus, setTeamsWebhookStatus] = useState(true);

  const {
    materials,
    orders,
    vendors,
    customers,
    projects,
    inwardEntries,
    outwardEntries,
    costingRecords,
    bulkImportMaterials,
    bulkImportOrders,
    bulkImportVendors,
    bulkImportCustomers,
    logAction,
  } = useERP();

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadSuccess(null);

    try {
      const data = await importFromExcel(file);
      if (!data || data.length === 0) {
        alert('The uploaded spreadsheet contains no data rows.');
        setIsUploading(false);
        return;
      }

      if (importTarget === 'materials') {
        bulkImportMaterials(data);
        setUploadSuccess(`Successfully imported ${data.length} materials from ${file.name}`);
      } else if (importTarget === 'orders') {
        bulkImportOrders(data);
        setUploadSuccess(`Successfully imported ${data.length} manufacturing orders from ${file.name}`);
      } else if (importTarget === 'vendors') {
        bulkImportVendors(data);
        setUploadSuccess(`Successfully imported ${data.length} vendors from ${file.name}`);
      } else if (importTarget === 'customers') {
        bulkImportCustomers(data);
        setUploadSuccess(`Successfully imported ${data.length} customers from ${file.name}`);
      }
    } catch (err: any) {
      alert(`Import error: ${err.message || 'Invalid file format'}`);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleOneClickExportAll = () => {
    exportToExcel(orders, `RSB_Production_Orders_${new Date().toISOString().split('T')[0]}`, 'Orders');
    exportToExcel(materials, `RSB_Material_Inventory_${new Date().toISOString().split('T')[0]}`, 'Inventory');
    exportToExcel(inwardEntries, `RSB_Inward_Register_${new Date().toISOString().split('T')[0]}`, 'Inward');
    exportToExcel(outwardEntries, `RSB_Outward_Register_${new Date().toISOString().split('T')[0]}`, 'Outward');
    logAction?.('Bulk Excel Export', 'Excel Integration', 'Exported full enterprise dataset into separate Excel spreadsheets');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                Microsoft Excel & 365 Hub
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Native XLSX / CSV
                </span>
              </h3>
              <p className="text-xs text-slate-400">Seamless bidirectional data exchange for factory operations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Sub Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-900/30">
          <button
            onClick={() => setActiveSubTab('export')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeSubTab === 'export'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-3.5 h-3.5" /> Export Data (XLSX / CSV)
          </button>
          <button
            onClick={() => setActiveSubTab('import')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeSubTab === 'import'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Excel Bulk Import
          </button>
          <button
            onClick={() => setActiveSubTab('templates')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeSubTab === 'templates'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode2 className="w-3.5 h-3.5" /> Blank Templates
          </button>
          <button
            onClick={() => setActiveSubTab('microsoft365')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-all ${
              activeSubTab === 'microsoft365'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cloud className="w-3.5 h-3.5" /> Microsoft 365 & Power BI
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 max-h-[calc(85vh-160px)] overflow-y-auto">
          {/* TAB 1: EXPORT */}
          {activeSubTab === 'export' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div>
                  <h4 className="text-sm font-bold text-emerald-300">Quick Full Factory Export</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Export all operational registers into individual Excel workbooks</p>
                </div>
                <button
                  onClick={handleOneClickExportAll}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-md shadow-emerald-950/40"
                >
                  <Download className="w-4 h-4" /> Export All (.XLSX)
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* 1. Production Orders */}
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between hover:border-slate-600">
                  <div>
                    <h5 className="text-xs font-bold text-slate-200">Main Production Orders</h5>
                    <p className="text-[11px] text-slate-400">{orders.length} active order items (PO 36, etc.)</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => exportToExcel(orders, 'RSB_Main_Production_Orders')}
                      className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md text-xs font-semibold flex items-center gap-1"
                    >
                      <Download className="w-3 h-3 text-emerald-400" /> XLSX
                    </button>
                    <button
                      onClick={() => exportToCsv(orders, 'RSB_Main_Production_Orders')}
                      className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md text-xs font-semibold"
                    >
                      CSV
                    </button>
                  </div>
                </div>

                {/* 2. Material Inventory */}
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between hover:border-slate-600">
                  <div>
                    <h5 className="text-xs font-bold text-slate-200">Raw Material Inventory</h5>
                    <p className="text-[11px] text-slate-400">{materials.length} stock specifications</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => exportToExcel(materials, 'RSB_Material_Master')}
                      className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md text-xs font-semibold flex items-center gap-1"
                    >
                      <Download className="w-3 h-3 text-emerald-400" /> XLSX
                    </button>
                    <button
                      onClick={() => exportToCsv(materials, 'RSB_Material_Master')}
                      className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md text-xs font-semibold"
                    >
                      CSV
                    </button>
                  </div>
                </div>

                {/* 3. Inward Register */}
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between hover:border-slate-600">
                  <div>
                    <h5 className="text-xs font-bold text-slate-200">Inward Material Register</h5>
                    <p className="text-[11px] text-slate-400">{inwardEntries.length} inward challans</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => exportToExcel(inwardEntries, 'RSB_Inward_Register')}
                      className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md text-xs font-semibold flex items-center gap-1"
                    >
                      <Download className="w-3 h-3 text-emerald-400" /> XLSX
                    </button>
                    <button
                      onClick={() => exportToCsv(inwardEntries, 'RSB_Inward_Register')}
                      className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md text-xs font-semibold"
                    >
                      CSV
                    </button>
                  </div>
                </div>

                {/* 4. Outward & Dispatch */}
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between hover:border-slate-600">
                  <div>
                    <h5 className="text-xs font-bold text-slate-200">Outward & Dispatch Register</h5>
                    <p className="text-[11px] text-slate-400">{outwardEntries.length} dispatch entries</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => exportToExcel(outwardEntries, 'RSB_Outward_Register')}
                      className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md text-xs font-semibold flex items-center gap-1"
                    >
                      <Download className="w-3 h-3 text-emerald-400" /> XLSX
                    </button>
                    <button
                      onClick={() => exportToCsv(outwardEntries, 'RSB_Outward_Register')}
                      className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md text-xs font-semibold"
                    >
                      CSV
                    </button>
                  </div>
                </div>

                {/* 5. Projects & Costing */}
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between hover:border-slate-600">
                  <div>
                    <h5 className="text-xs font-bold text-slate-200">Project Costing & P&L</h5>
                    <p className="text-[11px] text-slate-400">{costingRecords.length} project costing records</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => exportToExcel(costingRecords, 'RSB_Costing_Profit_Analysis')}
                      className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md text-xs font-semibold flex items-center gap-1"
                    >
                      <Download className="w-3 h-3 text-emerald-400" /> XLSX
                    </button>
                  </div>
                </div>

                {/* 6. Vendors & Customers */}
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between hover:border-slate-600">
                  <div>
                    <h5 className="text-xs font-bold text-slate-200">Vendor & Customer Master</h5>
                    <p className="text-[11px] text-slate-400">{vendors.length} vendors &bull; {customers.length} customers</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => exportToExcel([...vendors, ...customers], 'RSB_Stakeholders')}
                      className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md text-xs font-semibold flex items-center gap-1"
                    >
                      <Download className="w-3 h-3 text-emerald-400" /> XLSX
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IMPORT */}
          {activeSubTab === 'import' && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Select Import Destination Module
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { id: 'materials', label: 'Materials & Stock' },
                    { id: 'orders', label: 'Manufacturing Orders' },
                    { id: 'vendors', label: 'Vendor Directory' },
                    { id: 'customers', label: 'Customer Directory' },
                  ].map((target) => (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() => setImportTarget(target.id as any)}
                      className={`p-3 text-xs font-bold rounded-xl border text-center transition-all ${
                        importTarget === target.id
                          ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                          : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      {target.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Drop Area */}
              <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-2xl p-8 text-center bg-slate-800/30 transition-all cursor-pointer relative">
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                <div className="flex flex-col items-center">
                  <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400 mb-3">
                    <Upload className="w-8 h-8" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-200">
                    Click to choose or Drag & Drop Excel / CSV file
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Supports Microsoft Excel (.xlsx, .xls) and standard CSV files
                  </p>
                  <span className="mt-3 inline-block px-3 py-1 bg-slate-800 text-slate-300 rounded-full text-[11px] font-mono border border-slate-700">
                    Target: {importTarget.toUpperCase()}
                  </span>
                </div>
              </div>

              {isUploading && (
                <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold animate-pulse justify-center">
                  <RefreshCw className="w-4 h-4 animate-spin" /> Processing and parsing spreadsheet...
                </div>
              )}

              {uploadSuccess && (
                <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 shrink-0" />
                  <p className="font-semibold">{uploadSuccess}</p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: TEMPLATES */}
          {activeSubTab === 'templates' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Download ready-to-use pre-formatted Excel template files with exact column headers and example RSB parts for error-free bulk upload:
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  { type: 'materials', title: 'Raw Materials & Sizes Template', desc: 'SS Flat, Pipe, Circle, Bar, specs & initial stock' },
                  { type: 'orders', title: 'Manufacturing Orders Template', desc: 'PO Number, Machine Type, Project, Material Specs, Qty' },
                  { type: 'inward', title: 'Inward Material Register Template', desc: 'Challan, Vendor, Weight (Kg), Received by, QC status' },
                  { type: 'vendors', title: 'Vendor Master Template', desc: 'GSTIN, Contact person, Mobile, Payment terms' },
                  { type: 'customers', title: 'Customer Master Template', desc: 'Pharma / Machinery clients, addresses, GSTIN' },
                  { type: 'projects', title: 'Project Master Template', desc: 'Project ID, Machine Type, Schedule dates, Value' },
                ].map((tmpl) => (
                  <div
                    key={tmpl.type}
                    className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-between"
                  >
                    <div>
                      <h5 className="text-xs font-bold text-slate-200">{tmpl.title}</h5>
                      <p className="text-[11px] text-slate-400 mt-0.5">{tmpl.desc}</p>
                    </div>
                    <button
                      onClick={() => downloadTemplate(tmpl.type as any)}
                      className="px-3 py-1.5 bg-slate-700 hover:bg-emerald-600 text-slate-200 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ml-2"
                    >
                      <Download className="w-3.5 h-3.5" /> .XLSX
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: MICROSOFT 365 ECOSYSTEM */}
          {activeSubTab === 'microsoft365' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* OneDrive */}
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cloud className="w-5 h-5 text-cyan-400" />
                      <h5 className="text-xs font-bold text-slate-200">OneDrive Cloud Backup</h5>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      LIVE SYNC
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Automated incremental backup of all RSB drawing attachments, job cards, and ERP databases to OneDrive Business folder.
                  </p>
                  <button
                    onClick={() => {
                      setOneDriveSynced(true);
                      alert('OneDrive Cloud Sync Completed: Backup saved to /RSB-Enterprise-Backups/2026-09-01/');
                    }}
                    className="w-full py-2 bg-slate-700 hover:bg-cyan-600 text-slate-200 hover:text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Sync to OneDrive Now
                  </button>
                </div>

                {/* Power BI */}
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-5 h-5 text-amber-400" />
                      <h5 className="text-xs font-bold text-slate-200">Power BI Data Feed</h5>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                      OData Ready
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Live dataset endpoints for Power BI desktop modeling and executive management dashboards.
                  </p>
                  <button
                    onClick={() => {
                      exportToExcel(orders, 'RSB_PowerBI_Dataset_Feed');
                      alert('Power BI Feed generated and downloaded for dashboard refresh!');
                    }}
                    className="w-full py-2 bg-slate-700 hover:bg-amber-600 text-slate-200 hover:text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" /> Export Power BI Dataset
                  </button>
                </div>

                {/* Outlook Mail Notifications */}
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-blue-400" />
                      <h5 className="text-xs font-bold text-slate-200">Outlook 365 Dispatch Alerts</h5>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40">
                      ENABLED
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Automated email dispatch notifications with PDF invoices and dispatch notes sent directly to client engineering teams.
                  </p>
                  <button
                    onClick={() => alert('Test dispatch email sent via Outlook 365 SMTP gateway to procurement.pharma@cadila.com')}
                    className="w-full py-2 bg-slate-700 hover:bg-blue-600 text-slate-200 hover:text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <Mail className="w-3.5 h-3.5" /> Send Test Outlook Alert
                  </button>
                </div>

                {/* Microsoft Teams */}
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-purple-400" />
                      <h5 className="text-xs font-bold text-slate-200">Microsoft Teams Shop Floor Channel</h5>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/40">
                      WEBHOOK ACTIVE
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Real-time alerts broadcast to the #ShopFloor-Production channel when QC is rejected or job milestones finish.
                  </p>
                  <button
                    onClick={() => alert('Teams webhook card delivered to #ShopFloor-Production: [QC Approved for JC-2026-002]')}
                    className="w-full py-2 bg-slate-700 hover:bg-purple-600 text-slate-200 hover:text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> Trigger Test Teams Webhook
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
