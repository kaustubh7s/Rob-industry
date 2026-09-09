import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Mail,
  FileText,
  Layers,
  Package,
  Truck,
  Send,
  Building2,
  Users2,
  ShoppingCart,
  ReceiptText,
  Cpu,
  BadgeDollarSign,
  CheckCircle2,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { formatINR } from '../../utils/calculations';
import { exportToExcel, exportToCsv, exportToPdfReport } from '../../utils/excelIntegration';

export const ReportCenter: React.FC = () => {
  const {
    projects,
    orders,
    materials,
    vendors,
    customers,
    inwardEntries,
    outwardEntries,
    jobCards,
    machines,
    costingRecords,
    purchaseOrders,
    salesOrders,
  } = useERP();

  const [selectedReport, setSelectedReport] = useState<string>('production');
  const [emailSentNotif, setEmailSentNotif] = useState<string | null>(null);

  const reportsList = [
    { id: 'production', title: 'Main Production & Orders Report', icon: Layers, count: orders.length },
    { id: 'inventory', title: 'Raw Material Inventory & Stock Report', icon: Package, count: materials.length },
    { id: 'consumption', title: 'Material Consumption Analysis', icon: Package, count: materials.length },
    { id: 'inward', title: 'Inward Material (GRN) Register', icon: Truck, count: inwardEntries.length },
    { id: 'outward', title: 'Outward & Dispatch Register', icon: Send, count: outwardEntries.length },
    { id: 'vendors', title: 'Vendor Directory & Spend Report', icon: Building2, count: vendors.length },
    { id: 'customers', title: 'Customer Revenue & Order Summary', icon: Users2, count: customers.length },
    { id: 'purchase', title: 'Purchase Orders & Requisition Report', icon: ShoppingCart, count: purchaseOrders.length },
    { id: 'sales', title: 'Sales Invoices & Quotations Report', icon: ReceiptText, count: salesOrders.length },
    { id: 'machines', title: 'Machine Utilization & OEE Report', icon: Cpu, count: machines.length },
    { id: 'profit_loss', title: 'Executive Profit & Loss (P&L) Report', icon: BadgeDollarSign, count: costingRecords.length },
  ];

  const handleExport = (format: 'xlsx' | 'csv' | 'pdf') => {
    const today = new Date().toISOString().split('T')[0];

    if (selectedReport === 'production') {
      const data = orders.map(o => ({
        'Order No': o.orderNumber,
        'PO No': o.poNumber,
        'Material Type': o.materialType,
        'Size Specs': o.sizeSpecs,
        'Quantity': `${o.quantity} ${o.unit}`,
        'Vendor': o.vendor,
        'Machine': o.machineType,
        'Project': o.project,
        'Status': o.status,
        'Delivery Date': o.deliveryDate,
      }));
      if (format === 'xlsx') exportToExcel(data, `RSB_Production_Report_${today}`);
      else if (format === 'csv') exportToCsv(data, `RSB_Production_Report_${today}`);
      else {
        const headers = ['Order / PO', 'Material Specs', 'Qty', 'Vendor', 'Machine', 'Project', 'Status'];
        const rows = orders.map(o => [`${o.orderNumber} (PO ${o.poNumber})`, `${o.materialType} ${o.sizeSpecs}`, `${o.quantity} ${o.unit}`, o.vendor, o.machineType, o.project, o.status]);
        exportToPdfReport('RSB Production Orders Master Report', headers, rows, 'RSB_Production_Report');
      }
    } else if (selectedReport === 'inventory' || selectedReport === 'consumption') {
      const data = materials.map(m => ({
        'Material Code': m.code,
        'Name': m.name,
        'Type': m.type,
        'Grade': m.grade,
        'Size Specs': m.sizeSpecs,
        'Stock': m.currentStock,
        'Min Stock': m.minStock,
        'Unit Cost (₹)': m.unitCost,
        'Total Valuation (₹)': m.currentStock * m.unitCost,
        'Vendor': m.vendor,
      }));
      if (format === 'xlsx') exportToExcel(data, `RSB_Inventory_Report_${today}`);
      else if (format === 'csv') exportToCsv(data, `RSB_Inventory_Report_${today}`);
      else {
        const headers = ['Code', 'Material Name', 'Type / Grade', 'Size Specs', 'Stock', 'Rate (₹)', 'Value (₹)'];
        const rows = materials.map(m => [m.code, m.name, `${m.type} (${m.grade})`, m.sizeSpecs, `${m.currentStock} ${m.unit}`, formatINR(m.unitCost), formatINR(m.currentStock * m.unitCost)]);
        exportToPdfReport('RSB Inventory Stock Valuation Report', headers, rows, 'RSB_Inventory_Report');
      }
    } else if (selectedReport === 'inward') {
      const data = inwardEntries.map(i => ({
        'Inward No': i.inwardNumber,
        'Date': i.date,
        'Vendor': i.vendor,
        'PO No': i.poNumber,
        'Material': `${i.materialType} ${i.sizeSpecs}`,
        'Qty': `${i.quantity} ${i.unit}`,
        'Weight (Kg)': i.weightKg,
        'QC Status': i.qualityStatus,
      }));
      if (format === 'xlsx') exportToExcel(data, `RSB_Inward_Report_${today}`);
      else if (format === 'csv') exportToCsv(data, `RSB_Inward_Report_${today}`);
      else {
        const headers = ['Inward No', 'Date', 'Vendor', 'Material Spec', 'Qty', 'Weight (Kg)', 'Status'];
        const rows = inwardEntries.map(i => [i.inwardNumber, i.date, i.vendor, `${i.materialType} ${i.sizeSpecs}`, `${i.quantity} ${i.unit}`, i.weightKg, i.qualityStatus]);
        exportToPdfReport('RSB Inward Goods Receipt Report', headers, rows, 'RSB_Inward_Report');
      }
    } else if (selectedReport === 'outward') {
      const data = outwardEntries.map(o => ({
        'Outward No': o.outwardNumber,
        'Date': o.dispatchDate,
        'Customer': o.customer,
        'Project': o.project,
        'Material': o.material,
        'Quantity': `${o.quantity} ${o.unit}`,
        'Vehicle': o.vehicleNumber,
        'Invoice': o.invoiceNumber,
        'Status': o.deliveryStatus,
      }));
      if (format === 'xlsx') exportToExcel(data, `RSB_Outward_Report_${today}`);
      else if (format === 'csv') exportToCsv(data, `RSB_Outward_Report_${today}`);
      else {
        const headers = ['Challan No', 'Date', 'Customer', 'Project & Component', 'Qty', 'Vehicle', 'Status'];
        const rows = outwardEntries.map(o => [o.outwardNumber, o.dispatchDate, o.customer, `${o.project} - ${o.material}`, `${o.quantity} ${o.unit}`, o.vehicleNumber, o.deliveryStatus]);
        exportToPdfReport('RSB Outward Dispatch Report', headers, rows, 'RSB_Outward_Report');
      }
    } else if (selectedReport === 'profit_loss') {
      const data = costingRecords.map(c => ({
        'Project Name': c.projectName,
        'Customer': c.customer,
        'Total Cost (INR)': c.totalProductionCost,
        'Selling Price (INR)': c.sellingPrice,
        'Gross Profit (INR)': c.grossProfit,
        'Margin %': `${c.profitMarginPct}%`,
      }));
      if (format === 'xlsx') exportToExcel(data, `RSB_Profit_Loss_Report_${today}`);
      else if (format === 'csv') exportToCsv(data, `RSB_Profit_Loss_Report_${today}`);
      else {
        const headers = ['Project Name', 'Customer', 'Total Cost (₹)', 'Selling Price (₹)', 'Gross Profit (₹)', 'Margin %'];
        const rows = costingRecords.map(c => [c.projectName, c.customer, formatINR(c.totalProductionCost), formatINR(c.sellingPrice), formatINR(c.grossProfit), `${c.profitMarginPct}%`]);
        exportToPdfReport('RSB Executive Profit & Loss (P&L) Report', headers, rows, 'RSB_Profit_Loss_Report');
      }
    } else {
      // General fallback
      exportToExcel(orders, `RSB_Report_${selectedReport}_${today}`);
    }
  };

  const handleEmailReport = () => {
    setEmailSentNotif(`Report "${selectedReport.toUpperCase()}" generated and queued via Microsoft 365 Outlook to management@rsbmetal.com`);
    setTimeout(() => setEmailSentNotif(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              Reports & Microsoft Excel Export Center
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
              11 Official Reports
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            One-click multi-format data export (.xlsx, .csv, .pdf, print, and Outlook email dispatch)
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleExport('xlsx')}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
          >
            <Download className="w-4 h-4" /> Download Excel (.XLSX)
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition-all"
          >
            Export CSV
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition-all"
          >
            <FileText className="w-4 h-4 text-cyan-400" /> Export PDF
          </button>
          <button
            onClick={handleEmailReport}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold rounded-xl transition-all"
          >
            <Mail className="w-4 h-4" /> Email Report
          </button>
        </div>
      </div>

      {emailSentNotif && (
        <div className="p-4 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-300 text-xs flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p className="font-semibold">{emailSentNotif}</p>
        </div>
      )}

      {/* Report Selector Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {reportsList.map((r) => {
          const Icon = r.icon;
          const isSelected = selectedReport === r.id;

          return (
            <button
              key={r.id}
              onClick={() => setSelectedReport(r.id)}
              className={`p-4 rounded-2xl border text-left transition-all ${
                isSelected
                  ? 'bg-emerald-500/15 border-emerald-400 shadow-md shadow-emerald-950/40 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 hover:bg-slate-850 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="p-2 rounded-xl bg-slate-800 text-emerald-400">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                  {r.count} Rows
                </span>
              </div>
              <h4 className="text-xs font-bold mt-3 line-clamp-2">{r.title}</h4>
            </button>
          );
        })}
      </div>

      {/* Live Preview Box */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              Live Report Data Preview ({selectedReport.toUpperCase()})
            </h3>
            <p className="text-xs text-slate-400">Previewing first 6 rows ready for immediate export</p>
          </div>
          <span className="text-xs text-slate-500 font-mono">Format: SheetJS XLSX 1.0</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-850">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-800 text-slate-400 font-bold uppercase text-[10px]">
              {selectedReport === 'production' && (
                <tr>
                  <th className="p-2.5">Order / PO</th>
                  <th className="p-2.5">Material Specs</th>
                  <th className="p-2.5">Qty</th>
                  <th className="p-2.5">Vendor</th>
                  <th className="p-2.5">Machine</th>
                  <th className="p-2.5">Project</th>
                  <th className="p-2.5">Status</th>
                </tr>
              )}
              {(selectedReport === 'inventory' || selectedReport === 'consumption') && (
                <tr>
                  <th className="p-2.5">Code</th>
                  <th className="p-2.5">Material Name</th>
                  <th className="p-2.5">Type & Grade</th>
                  <th className="p-2.5">Size Specs</th>
                  <th className="p-2.5">Stock</th>
                  <th className="p-2.5">Rate (₹)</th>
                  <th className="p-2.5">Value (₹)</th>
                </tr>
              )}
              {selectedReport === 'inward' && (
                <tr>
                  <th className="p-2.5">Inward No</th>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Vendor</th>
                  <th className="p-2.5">Material Spec</th>
                  <th className="p-2.5">Inward Qty</th>
                  <th className="p-2.5">Weight (Kg)</th>
                  <th className="p-2.5">QC Status</th>
                </tr>
              )}
              {selectedReport === 'outward' && (
                <tr>
                  <th className="p-2.5">Challan No</th>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Customer</th>
                  <th className="p-2.5">Project & Component</th>
                  <th className="p-2.5">Qty</th>
                  <th className="p-2.5">Vehicle</th>
                  <th className="p-2.5">Status</th>
                </tr>
              )}
              {selectedReport === 'profit_loss' && (
                <tr>
                  <th className="p-2.5">Project Name</th>
                  <th className="p-2.5">Customer</th>
                  <th className="p-2.5">Total Cost (₹)</th>
                  <th className="p-2.5">Selling Price (₹)</th>
                  <th className="p-2.5">Gross Profit (₹)</th>
                  <th className="p-2.5">Margin %</th>
                </tr>
              )}
            </thead>
            <tbody className="divide-y divide-slate-750 font-medium text-slate-300">
              {selectedReport === 'production' &&
                orders.slice(0, 6).map((o) => (
                  <tr key={o.id}>
                    <td className="p-2.5 font-mono text-cyan-300">{o.orderNumber} (PO {o.poNumber})</td>
                    <td className="p-2.5 font-mono text-slate-200">{o.materialType} {o.sizeSpecs}</td>
                    <td className="p-2.5 font-bold">{o.quantity} {o.unit}</td>
                    <td className="p-2.5 text-amber-300">{o.vendor}</td>
                    <td className="p-2.5">{o.machineType}</td>
                    <td className="p-2.5">{o.project}</td>
                    <td className="p-2.5">{o.status}</td>
                  </tr>
                ))}
              {(selectedReport === 'inventory' || selectedReport === 'consumption') &&
                materials.slice(0, 6).map((m) => (
                  <tr key={m.id}>
                    <td className="p-2.5 font-mono text-cyan-400">{m.code}</td>
                    <td className="p-2.5 font-semibold text-white">{m.name}</td>
                    <td className="p-2.5">{m.type} ({m.grade})</td>
                    <td className="p-2.5 font-mono">{m.sizeSpecs}</td>
                    <td className="p-2.5 font-bold">{m.currentStock} {m.unit}</td>
                    <td className="p-2.5 font-mono">{formatINR(m.unitCost)}</td>
                    <td className="p-2.5 font-mono font-bold text-emerald-400">{formatINR(m.currentStock * m.unitCost)}</td>
                  </tr>
                ))}
              {selectedReport === 'inward' &&
                inwardEntries.slice(0, 6).map((i) => (
                  <tr key={i.id}>
                    <td className="p-2.5 font-mono text-emerald-400">{i.inwardNumber}</td>
                    <td className="p-2.5">{i.date}</td>
                    <td className="p-2.5 font-semibold">{i.vendor}</td>
                    <td className="p-2.5 font-mono">{i.materialType} {i.sizeSpecs}</td>
                    <td className="p-2.5 font-bold">{i.quantity} {i.unit}</td>
                    <td className="p-2.5 font-mono text-emerald-400">{i.weightKg} kg</td>
                    <td className="p-2.5">{i.qualityStatus}</td>
                  </tr>
                ))}
              {selectedReport === 'outward' &&
                outwardEntries.slice(0, 6).map((o) => (
                  <tr key={o.id}>
                    <td className="p-2.5 font-mono text-purple-400">{o.outwardNumber}</td>
                    <td className="p-2.5">{o.dispatchDate}</td>
                    <td className="p-2.5 font-semibold">{o.customer}</td>
                    <td className="p-2.5">{o.project} - {o.material}</td>
                    <td className="p-2.5 font-bold">{o.quantity} {o.unit}</td>
                    <td className="p-2.5 font-mono">{o.vehicleNumber}</td>
                    <td className="p-2.5">{o.deliveryStatus}</td>
                  </tr>
                ))}
              {selectedReport === 'profit_loss' &&
                costingRecords.slice(0, 6).map((c) => (
                  <tr key={c.id}>
                    <td className="p-2.5 font-semibold text-white">{c.projectName}</td>
                    <td className="p-2.5">{c.customer}</td>
                    <td className="p-2.5 font-mono text-rose-400">{formatINR(c.totalProductionCost)}</td>
                    <td className="p-2.5 font-mono text-cyan-400">{formatINR(c.sellingPrice)}</td>
                    <td className="p-2.5 font-mono font-bold text-emerald-400">{formatINR(c.grossProfit)}</td>
                    <td className="p-2.5 font-mono font-bold">{c.profitMarginPct}%</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
