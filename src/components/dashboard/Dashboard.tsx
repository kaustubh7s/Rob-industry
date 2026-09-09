import React from 'react';
import {
  TrendingUp,
  Layers,
  FolderKanban,
  Package,
  Truck,
  Send,
  Cpu,
  Building2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Activity,
  CheckCircle2,
  FileSpreadsheet,
  Plus,
  BookOpen,
  Wrench,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { useERP } from '../../context/ERPContext';
import { formatINR, formatCompactINR } from '../../utils/calculations';
import { StatusBadge } from '../common/StatusBadge';
import { WorkflowPipeline } from '../common/WorkflowPipeline';

interface DashboardProps {
  onOpenQuickAction: (action?: 'order' | 'inward' | 'outward' | 'job' | 'qc') => void;
  onOpenExcel: () => void;
  onOpenTutorial?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onOpenQuickAction,
  onOpenExcel,
  onOpenTutorial,
}) => {
  const {
    projects,
    orders,
    materials,
    vendors,
    machines,
    inwardEntries,
    outwardEntries,
    jobCards,
    qcInspections,
    costingRecords,
    auditLogs,
    setActiveTab,
  } = useERP();

  // Calculated KPI Values
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status !== 'Completed').length;
  const activeOrders = orders.filter(o => o.status !== 'Completed').length;
  const completedOrders = orders.filter(o => o.status === 'Completed').length;
  const pendingOrders = orders.filter(o => o.status === 'Pending').length;

  const totalInventoryValue = materials.reduce((acc, m) => acc + m.currentStock * m.unitCost, 0);
  const lowStockItems = materials.filter(m => m.currentStock <= m.minStock);

  const avgEfficiency = Math.round(
    machines.reduce((acc, m) => acc + m.efficiency, 0) / (machines.length || 1)
  );

  const totalRevenue = costingRecords.reduce((acc, c) => acc + c.sellingPrice, 0) + 1850000;
  const totalProfit = costingRecords.reduce((acc, c) => acc + c.grossProfit, 0) + 640000;
  const avgProfitMargin = Math.round((totalProfit / (totalRevenue || 1)) * 100);

  // Today's Activity
  const todayInwardCount = inwardEntries.length;
  const todayOutwardCount = outwardEntries.length;
  const runningJobsCount = jobCards.filter(j => j.status !== 'Completed').length;
  const pendingQCCount = qcInspections.filter(q => q.status !== 'Passed').length;

  // Chart Data: Monthly Orders & Revenue
  const monthlyData = [
    { month: 'Apr', orders: 12, revenue: 1450000, profit: 480000 },
    { month: 'May', orders: 18, revenue: 2100000, profit: 720000 },
    { month: 'Jun', orders: 15, revenue: 1800000, profit: 590000 },
    { month: 'Jul', orders: 22, revenue: 2750000, profit: 920000 },
    { month: 'Aug', orders: 28, revenue: 3450000, profit: 1180000 },
    { month: 'Sep (Cur)', orders: orders.length, revenue: totalRevenue, profit: totalProfit },
  ];

  // Chart Data: Material Breakdown by Type
  const materialTypeStats = materials.reduce((acc: Record<string, number>, m) => {
    acc[m.type] = (acc[m.type] || 0) + m.currentStock * (m.unitWeightKg || 2);
    return acc;
  }, {});

  const materialPieData = Object.keys(materialTypeStats).map(type => ({
    name: type,
    value: Math.round(materialTypeStats[type]),
  }));

  const PIE_COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];

  // Machine Utilization Chart Data
  const machineChartData = machines.map(m => ({
    name: m.code,
    fullName: m.name,
    efficiency: m.efficiency,
    hours: m.productionHours,
  }));

  return (
    <div className="space-y-6">
      {/* Top Banner with Quick Actions & Easy Guide */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-700/80 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
            <h2 className="text-lg font-extrabold text-white tracking-tight">
              Factory Pulse & Daily Digital Cockpit (कारखाना नियंत्रण केंद्र)
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Real-time control center replacing physical chalkboards, registers, and paper chalans.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {onOpenTutorial && (
            <button
              onClick={onOpenTutorial}
              className="flex items-center gap-2 px-3.5 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-bold rounded-xl transition-all shadow-xs"
            >
              <BookOpen className="w-4 h-4 text-blue-400" />
              <span>🎓 How ERP Works (सरल गाइड)</span>
            </button>
          )}

          <button
            onClick={() => onOpenQuickAction('inward')}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
          >
            <Zap className="w-4 h-4" />
            <span>+ Daily Entry (नया काम)</span>
          </button>

          <button
            onClick={onOpenExcel}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition-all"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Excel Hub</span>
          </button>
        </div>
      </div>

      {/* 6-Step Visual Workflow Pipeline */}
      <WorkflowPipeline onOpenQuickAction={onOpenQuickAction} />

      {/* Four Daily Factory Registers Quick Cards */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            Daily Factory Registers (दैनिक रजिस्टर - 4 मुख्य कार्य)
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">Click card to open register</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Register 1: Inward */}
          <div
            onClick={() => setActiveTab('inward')}
            className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950/20 border border-emerald-500/30 hover:border-emerald-500 hover:scale-[1.01] cursor-pointer transition-all shadow-lg group relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wide">
                  Step 1 • Gate Arrival
                </span>
                <h4 className="text-sm font-black text-white group-hover:text-emerald-300 transition-colors">
                  1. Inward Register (आवक)
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">Raw steel sheets, pipes & bars</p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400">
                <Truck className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 font-mono">{todayInwardCount} Entries Logged</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenQuickAction('inward');
                }}
                className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow-xs"
              >
                + New Inward
              </button>
            </div>
          </div>

          {/* Register 2: Production / Jobs */}
          <div
            onClick={() => setActiveTab('production')}
            className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-amber-950/20 border border-amber-500/30 hover:border-amber-500 hover:scale-[1.01] cursor-pointer transition-all shadow-lg group relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wide">
                  Step 2 • Machine Floor
                </span>
                <h4 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors">
                  2. Job Cards (कारखाना)
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">CNC, lathe cutting & assembly</p>
              </div>
              <div className="p-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
                <Wrench className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-amber-400 font-mono">{runningJobsCount} Jobs Running</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenQuickAction('job');
                }}
                className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold shadow-xs"
              >
                + New Job
              </button>
            </div>
          </div>

          {/* Register 3: QC Inspection */}
          <div
            onClick={() => setActiveTab('quality')}
            className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-cyan-950/20 border border-cyan-500/30 hover:border-cyan-500 hover:scale-[1.01] cursor-pointer transition-all shadow-lg group relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wide">
                  Step 3 • Inspection
                </span>
                <h4 className="text-sm font-black text-white group-hover:text-cyan-300 transition-colors">
                  3. Quality Check (जांच)
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">Dimensional & tolerance test</p>
              </div>
              <div className="p-2.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 font-mono">
                {pendingQCCount > 0 ? `${pendingQCCount} QC Pending` : '100% Passed'}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenQuickAction('qc');
                }}
                className="px-2 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold shadow-xs"
              >
                + QC Pass
              </button>
            </div>
          </div>

          {/* Register 4: Outward Dispatch */}
          <div
            onClick={() => setActiveTab('outward')}
            className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-purple-950/20 border border-purple-500/30 hover:border-purple-500 hover:scale-[1.01] cursor-pointer transition-all shadow-lg group relative overflow-hidden"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-wide">
                  Step 4 • Delivery
                </span>
                <h4 className="text-sm font-black text-white group-hover:text-purple-300 transition-colors">
                  4. Outward & Challan (जावक)
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">Vehicle loading & gate pass</p>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/40 text-purple-400">
                <Send className="w-5 h-5" />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs font-bold text-purple-400 font-mono">{todayOutwardCount} Dispatches</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenQuickAction('outward');
                }}
                className="px-2 py-1 rounded bg-purple-600 hover:bg-purple-500 text-white text-[10px] font-bold shadow-xs"
              >
                + New Challan
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Key Factory Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* 1. Active Orders */}
        <div
          onClick={() => setActiveTab('orders')}
          className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Active Orders</span>
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-white font-mono">{activeOrders}</span>
            <span className="text-[10px] text-cyan-400 font-semibold">{pendingOrders} Pending</span>
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500">PO 36 Cadila & More</div>
        </div>

        {/* 2. Inward Today */}
        <div
          onClick={() => setActiveTab('inward')}
          className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Inward Today</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Truck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-emerald-400 font-mono">{todayInwardCount}</span>
            <span className="text-[10px] text-emerald-400 font-semibold">Challans</span>
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500">Auto Stock In</div>
        </div>

        {/* 3. Outward Today */}
        <div
          onClick={() => setActiveTab('outward')}
          className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Outward Today</span>
            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
              <Send className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-purple-400 font-mono">{todayOutwardCount}</span>
            <span className="text-[10px] text-purple-400 font-semibold">Dispatches</span>
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500">Auto Stock Out</div>
        </div>

        {/* 4. Inventory Valuation */}
        <div
          onClick={() => setActiveTab('materials')}
          className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-blue-500/50 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Godown Stock</span>
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-blue-400 font-mono">{formatCompactINR(totalInventoryValue)}</span>
          </div>
          <div className="mt-0.5 text-[10px] text-rose-400 font-semibold">
            {lowStockItems.length > 0 ? `${lowStockItems.length} Low Stock` : 'Optimal Level'}
          </div>
        </div>

        {/* 5. Machine OEE */}
        <div
          onClick={() => setActiveTab('machines')}
          className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Machine OEE</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Cpu className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-amber-400 font-mono">{avgEfficiency}%</span>
            <span className="text-[10px] text-emerald-400 font-semibold">Healthy</span>
          </div>
          <div className="mt-0.5 text-[10px] text-slate-500">5 Active Lines</div>
        </div>

        {/* 6. P&L Margin */}
        <div
          onClick={() => setActiveTab('costing')}
          className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition-all group"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Gross Profit</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-xl font-black text-emerald-400 font-mono">{avgProfitMargin}%</span>
            <span className="text-[10px] text-slate-400">Margin</span>
          </div>
          <div className="mt-0.5 text-[10px] text-emerald-400 font-semibold">{formatCompactINR(totalProfit)} Net</div>
        </div>
      </div>

      {/* Row 2: Charts (Revenue Trend & Material Inventory) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Monthly Revenue & Order Volume Trends
              </h3>
              <p className="text-xs text-slate-400">Dispatch billing vs manufacturing order pipeline</p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  formatter={(val: any) => formatINR(Number(val))}
                />
                <Area type="monotone" dataKey="revenue" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRev)" name="Revenue" />
                <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" name="Gross Profit" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-400" />
              Raw Material Stock (Weight Kg)
            </h3>
            <p className="text-xs text-slate-400">Total physical SS stock breakdown</p>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={materialPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {materialPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  formatter={(val: any) => `${val} Kg`}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[11px] pt-2 border-t border-slate-800">
            {materialPieData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                <span className="text-slate-400 truncate">{d.name}:</span>
                <span className="font-bold text-slate-200 font-mono">{d.value} kg</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: Active RSB Orders Quick Matrix & Machine Utilization */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Active Production Orders (Main Table Preview)
              </h3>
              <p className="text-xs text-slate-400">Live order status, drawing specs, and dispatch deadlines</p>
            </div>
            <button
              onClick={() => setActiveTab('orders')}
              className="text-xs text-cyan-400 hover:underline font-semibold"
            >
              View Full Table &rarr;
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-850/60 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Order / PO</th>
                  <th className="py-2.5 px-3">Material Specs</th>
                  <th className="py-2.5 px-3">Machine</th>
                  <th className="py-2.5 px-3">Project</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium text-slate-300">
                {orders.slice(0, 5).map((o) => (
                  <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-2.5 px-3 font-mono text-cyan-300">
                      {o.orderNumber} <span className="text-slate-500 font-normal">(PO {o.poNumber})</span>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-200">
                      {o.materialType} {o.sizeSpecs}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{o.machineType}</td>
                    <td className="py-2.5 px-3 font-bold text-amber-300">{o.project}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={o.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-amber-400" />
                Machine OEE & Utilization
              </h3>
              <p className="text-xs text-slate-400">Operational efficiency by machine category</p>
            </div>
            <button
              onClick={() => setActiveTab('machines')}
              className="text-xs text-cyan-400 hover:underline font-semibold"
            >
              Shop Floor &rarr;
            </button>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={machineChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} domain={[60, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  formatter={(val: any) => `${val}% Efficiency`}
                />
                <Bar dataKey="efficiency" fill="#f59e0b" radius={[6, 6, 0, 0]} name="OEE Efficiency %" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
