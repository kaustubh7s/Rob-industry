import React, { useState } from 'react';
import {
  Award,
  TrendingUp,
  Search,
  Download,
  FileSpreadsheet,
  FileText,
  Star,
  Clock,
  AlertTriangle,
  CheckCircle2,
  BarChart2,
  Sliders,
  Building2,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { VendorItem } from '../../types/erp';
import { formatINR, formatCompactINR } from '../../utils/calculations';
import { exportToExcel, exportToPdfReport } from '../../utils/excelIntegration';
import { Modal } from '../common/Modal';

export const VendorPerformanceDashboard: React.FC = () => {
  const { vendors, purchaseOrders } = useERP();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScorecardVendor, setSelectedScorecardVendor] = useState<VendorItem | null>(null);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Calculate dynamic ranking based on reliability, quality, on-time delivery and cost competitiveness
  const rankedVendors = [...vendors].sort((a, b) => {
    const scoreA = (a.onTimeDeliveries / (a.totalOrders || 1)) * 40 + a.qualityRating * 0.4 + a.costCompetitiveness * 2;
    const scoreB = (b.onTimeDeliveries / (b.totalOrders || 1)) * 40 + b.qualityRating * 0.4 + b.costCompetitiveness * 2;
    return scoreB - scoreA;
  }).map((v, idx) => ({ ...v, rank: idx + 1 }));

  const filteredVendors = rankedVendors.filter((v) =>
    v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.materialSupplied.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportExcel = () => {
    const data = filteredVendors.map((v) => ({
      'Rank': v.rank,
      'Vendor Name': v.name,
      'Total Orders': v.totalOrders,
      'Total Purchase Value (INR)': v.totalPurchaseValue,
      'On Time Deliveries': v.onTimeDeliveries,
      'Delayed Deliveries': v.delayedDeliveries,
      'Avg Lead Time (Days)': v.averageDeliveryDays,
      'Rejection Rate %': `${v.rejectionRate}%`,
      'Quality Score %': `${v.qualityRating}%`,
      'Cost Score (1-10)': v.costCompetitiveness,
      'Reliability Score (1-100)': v.reliabilityScore,
      'Star Rating': v.rating,
    }));
    exportToExcel(data, `RSB_Vendor_Performance_Scorecard_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPdf = () => {
    const headers = ['Rank', 'Vendor Name', 'Orders', 'On-Time', 'Delayed', 'Rejection %', 'Rating', 'Reliability'];
    const rows = filteredVendors.map((v) => [
      `#${v.rank}`,
      v.name,
      v.totalOrders,
      v.onTimeDeliveries,
      v.delayedDeliveries,
      `${v.rejectionRate}%`,
      `${v.rating} / 5`,
      `${v.reliabilityScore}/100`,
    ]);
    exportToPdfReport('RSB Vendor Performance & Procurement Evaluation Report', headers, rows, 'RSB_Vendor_Performance');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-400" />
              Vendor Performance Management & Supplier Scorecards
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 font-semibold">
              {filteredVendors.length} Suppliers Evaluated
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Automated ranking and scorecards based on on-time delivery rates, quality pass rates, and pricing competitiveness
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsCompareModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition-colors"
          >
            <BarChart2 className="w-3.5 h-3.5 text-blue-400" /> Compare Suppliers
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-xl transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
          </button>
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition-colors"
          >
            <FileText className="w-3.5 h-3.5" /> Export PDF
          </button>
        </div>
      </div>

      {/* Top 4 Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Top Ranked Supplier</span>
          <p className="text-sm font-bold text-white mt-1">{rankedVendors[0]?.name || '-'}</p>
          <span className="text-xs text-amber-400 font-mono font-semibold">Reliability: {rankedVendors[0]?.reliabilityScore}/100</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Delivery Lead Time</span>
          <p className="text-xl font-bold text-cyan-400 font-mono mt-1">3.7 Days</p>
          <span className="text-xs text-slate-400">Across all SS raw materials</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Overall On-Time SLA</span>
          <p className="text-xl font-bold text-emerald-400 font-mono mt-1">96.8%</p>
          <span className="text-xs text-slate-400">346 on-time of 359 orders</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Avg Rejection Rate</span>
          <p className="text-xl font-bold text-rose-400 font-mono mt-1">1.2%</p>
          <span className="text-xs text-slate-400">Tolerance & Ra finish defects</span>
        </div>
      </div>

      {/* Search */}
      <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search vendor name, contact person, or materials supplied (e.g. Manav Metal, SS Pipe)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
          />
        </div>
      </div>

      {/* Required Table View: Vendor | Total Orders | On Time | Delayed | Rejection % | Rating */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-850 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800 tracking-wider">
              <tr>
                <th className="p-3 text-center w-14">Rank</th>
                <th className="p-3">Vendor</th>
                <th className="p-3 text-center">Total Orders</th>
                <th className="p-3 text-center">On Time</th>
                <th className="p-3 text-center">Delayed</th>
                <th className="p-3 text-center">Rejection %</th>
                <th className="p-3 text-center">Rating</th>
                <th className="p-3 text-center">Reliability</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-medium text-slate-300">
              {filteredVendors.map((v) => (
                <tr key={v.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-3 text-center font-mono font-bold">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] ${
                      v.rank === 1
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-black'
                        : 'bg-slate-800 text-slate-300'
                    }`}>
                      #{v.rank}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="font-bold text-white text-xs">{v.name}</div>
                    <div className="text-[11px] text-slate-400">{v.materialSupplied}</div>
                  </td>
                  <td className="p-3 text-center font-mono font-bold text-white">{v.totalOrders}</td>
                  <td className="p-3 text-center font-mono text-emerald-400 font-semibold">{v.onTimeDeliveries}</td>
                  <td className="p-3 text-center font-mono text-amber-400 font-semibold">{v.delayedDeliveries}</td>
                  <td className="p-3 text-center font-mono font-bold">
                    <span className={v.rejectionRate > 1.5 ? 'text-rose-400' : 'text-slate-300'}>
                      {v.rejectionRate}%
                    </span>
                  </td>
                  <td className="p-3 text-center font-mono">
                    <div className="inline-flex items-center gap-1 font-bold text-amber-400">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span>{v.rating}</span>
                    </div>
                  </td>
                  <td className="p-3 text-center font-mono">
                    <div className="inline-block px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 font-bold text-[11px] border border-blue-500/30">
                      {v.reliabilityScore}%
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => setSelectedScorecardVendor(v)}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors"
                    >
                      Scorecard
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: DETAILED VENDOR SCORECARD */}
      <Modal
        isOpen={!!selectedScorecardVendor}
        onClose={() => setSelectedScorecardVendor(null)}
        title={`Vendor Scorecard: ${selectedScorecardVendor?.name}`}
        subtitle={`Rank #${selectedScorecardVendor?.rank} Supplier Performance Audit`}
        maxWidth="2xl"
      >
        {selectedScorecardVendor && (
          <div className="space-y-4 text-xs">
            {/* Quick Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Purchase Spend</span>
                <span className="text-sm font-bold font-mono text-emerald-400 mt-0.5 block">
                  {formatINR(selectedScorecardVendor.totalPurchaseValue)}
                </span>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">On-Time SLA</span>
                <span className="text-sm font-bold font-mono text-cyan-400 mt-0.5 block">
                  {((selectedScorecardVendor.onTimeDeliveries / selectedScorecardVendor.totalOrders) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Quality Score</span>
                <span className="text-sm font-bold font-mono text-purple-400 mt-0.5 block">
                  {selectedScorecardVendor.qualityRating}%
                </span>
              </div>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Cost Rating</span>
                <span className="text-sm font-bold font-mono text-amber-400 mt-0.5 block">
                  {selectedScorecardVendor.costCompetitiveness} / 10
                </span>
              </div>
            </div>

            {/* Performance Indicators */}
            <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 space-y-3">
              <h4 className="font-bold text-white uppercase text-[11px] tracking-wider">Evaluation Breakdown</h4>

              <div>
                <div className="flex justify-between mb-1 text-[11px]">
                  <span className="text-slate-400">Delivery Timeliness SLA</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {selectedScorecardVendor.onTimeDeliveries} of {selectedScorecardVendor.totalOrders} Orders On-Time
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${(selectedScorecardVendor.onTimeDeliveries / selectedScorecardVendor.totalOrders) * 100}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1 text-[11px]">
                  <span className="text-slate-400">Quality & Dimensional Accuracy Pass Rate</span>
                  <span className="font-mono font-bold text-cyan-400">{selectedScorecardVendor.qualityRating}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-500 rounded-full"
                    style={{ width: `${selectedScorecardVendor.qualityRating}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1 text-[11px]">
                  <span className="text-slate-400">Material Defect / Rejection Rate</span>
                  <span className="font-mono font-bold text-rose-400">{selectedScorecardVendor.rejectionRate}% (Threshold &lt; 2%)</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full"
                    style={{ width: `${Math.min(100, selectedScorecardVendor.rejectionRate * 20)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Vendor Profile & Terms */}
            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5 text-slate-300 text-[11px]">
              <div><strong className="text-slate-400">Contact Person:</strong> {selectedScorecardVendor.contactPerson} ({selectedScorecardVendor.mobile})</div>
              <div><strong className="text-slate-400">GSTIN:</strong> <span className="font-mono text-amber-300">{selectedScorecardVendor.gstin}</span></div>
              <div><strong className="text-slate-400">Payment Terms:</strong> {selectedScorecardVendor.paymentTerms}</div>
              <div><strong className="text-slate-400">Plant / Warehouse Address:</strong> {selectedScorecardVendor.address}</div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setSelectedScorecardVendor(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700"
              >
                Close Scorecard
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MODAL 2: VENDOR COMPARISON REPORT */}
      <Modal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        title="Side-by-Side Vendor Comparison Matrix"
        subtitle="Comparative evaluation of approved stainless steel suppliers"
        maxWidth="4xl"
      >
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-850 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-2.5">Evaluation Parameter</th>
                  {rankedVendors.map((v) => (
                    <th key={v.id} className="p-2.5 text-center font-bold text-white border-l border-slate-800">
                      {v.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium text-slate-300">
                <tr>
                  <td className="p-2.5 font-semibold text-slate-400">Overall Rank</td>
                  {rankedVendors.map((v) => (
                    <td key={v.id} className="p-2.5 text-center font-mono font-bold text-amber-400 border-l border-slate-800">
                      #{v.rank}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-slate-400">Reliability Score</td>
                  {rankedVendors.map((v) => (
                    <td key={v.id} className="p-2.5 text-center font-mono font-bold text-blue-400 border-l border-slate-800">
                      {v.reliabilityScore} / 100
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-slate-400">On-Time Delivery %</td>
                  {rankedVendors.map((v) => (
                    <td key={v.id} className="p-2.5 text-center font-mono text-emerald-400 font-bold border-l border-slate-800">
                      {((v.onTimeDeliveries / v.totalOrders) * 100).toFixed(1)}%
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-slate-400">Avg Lead Time (Days)</td>
                  {rankedVendors.map((v) => (
                    <td key={v.id} className="p-2.5 text-center font-mono text-cyan-400 border-l border-slate-800">
                      {v.averageDeliveryDays} Days
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-slate-400">Quality Score %</td>
                  {rankedVendors.map((v) => (
                    <td key={v.id} className="p-2.5 text-center font-mono text-purple-400 font-bold border-l border-slate-800">
                      {v.qualityRating}%
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-slate-400">Rejection Rate %</td>
                  {rankedVendors.map((v) => (
                    <td key={v.id} className="p-2.5 text-center font-mono text-rose-400 border-l border-slate-800">
                      {v.rejectionRate}%
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-slate-400">Cost Competitiveness</td>
                  {rankedVendors.map((v) => (
                    <td key={v.id} className="p-2.5 text-center font-mono font-bold text-slate-200 border-l border-slate-800">
                      {v.costCompetitiveness} / 10
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2.5 font-semibold text-slate-400">Payment Terms</td>
                  {rankedVendors.map((v) => (
                    <td key={v.id} className="p-2.5 text-center text-[11px] text-amber-300 border-l border-slate-800">
                      {v.paymentTerms}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-2 border-t border-slate-800">
            <button
              onClick={() => setIsCompareModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold"
            >
              Close Comparison
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
