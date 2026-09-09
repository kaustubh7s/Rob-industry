import React, { useState } from 'react';
import {
  Building2,
  Plus,
  Search,
  Filter,
  Download,
  Star,
  Phone,
  Mail,
  MapPin,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  Award,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { VendorItem } from '../../types/erp';
import { formatINR, formatCompactINR } from '../../utils/calculations';
import { exportToExcel, exportToPdfReport } from '../../utils/excelIntegration';
import { Modal } from '../common/Modal';

export const VendorManager: React.FC = () => {
  const { vendors, addVendor, updateVendor, deleteVendor, inwardEntries, purchaseOrders } = useERP();

  const [searchTerm, setSearchTerm] = useState('');
  const [isNewVendorModalOpen, setIsNewVendorModalOpen] = useState(false);

  const [form, setForm] = useState({
    name: 'Manav Metal',
    contactPerson: 'Sunil Shah',
    mobile: '+91 98250 12345',
    email: 'orders@manavmetal.in',
    gstin: '24AAECM1234F1Z8',
    address: 'Plot 44, GIDC Phase II, Vatva Industrial Area, Ahmedabad - 382445',
    materialSupplied: 'SS Flat, SS Pipe, SS Circle, SS Bar, Laser Cut Blanks',
    rating: 4.9,
    paymentTerms: '30 Days Net',
  });

  const filteredVendors = vendors.filter((v) => {
    return (
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.materialSupplied.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.gstin.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleCreateVendor = (e: React.FormEvent) => {
    e.preventDefault();
    addVendor({
      ...form,
      totalOrders: 0,
      totalPurchaseValue: 0,
      onTimeDeliveries: 0,
      delayedDeliveries: 0,
      averageDeliveryDays: 3,
      rejectionRate: 0,
      qualityRating: 100,
      costCompetitiveness: 9,
      reliabilityScore: 100,
    });
    setIsNewVendorModalOpen(false);
  };

  const handleExportExcel = () => {
    const data = filteredVendors.map(v => ({
      'Vendor Name': v.name,
      'Contact Person': v.contactPerson,
      'Mobile': v.mobile,
      'Email': v.email,
      'GSTIN': v.gstin,
      'Address': v.address,
      'Materials Supplied': v.materialSupplied,
      'Payment Terms': v.paymentTerms,
      'Rating': v.rating,
      'Total Orders': v.totalOrders,
      'Total Purchase Value (INR)': v.totalPurchaseValue,
      'On-Time Deliveries': v.onTimeDeliveries,
      'Quality Score %': `${v.qualityRating}%`,
    }));
    exportToExcel(data, `RSB_Vendor_Master_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPdf = () => {
    const headers = ['Vendor Name', 'Contact', 'Mobile', 'GSTIN', 'Materials Supplied', 'Spend (₹)', 'On-Time', 'Rating'];
    const rows = filteredVendors.map(v => [
      v.name,
      v.contactPerson,
      v.mobile,
      v.gstin,
      v.materialSupplied,
      formatINR(v.totalPurchaseValue),
      `${v.onTimeDeliveries}/${v.totalOrders}`,
      `${v.rating} / 5`,
    ]);
    exportToPdfReport('RSB Vendor Directory & Performance Analytics Report', headers, rows, 'RSB_Vendors_Report');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-400" />
              Vendor Management & Supply Chain Partners
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
              {filteredVendors.length} Suppliers
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Track stainless steel suppliers, on-time delivery scorecards, payment terms, and purchase histories
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsNewVendorModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Vendor
          </button>
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-xl transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel (.XLSX)
          </button>
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl transition-all"
          >
            <FileText className="w-4 h-4" /> PDF Report
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Vendor Name, Contact Person, Supplied Materials, GSTIN (e.g. Manav Metal, SS Pipe)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-amber-500"
          />
        </div>
      </div>

      {/* Vendors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredVendors.map((v) => (
          <div
            key={v.id}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-lg space-y-4 transition-all"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  {v.name}
                  {v.rating >= 4.8 && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      Top Rated
                    </span>
                  )}
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">Contact: <strong className="text-slate-200">{v.contactPerson}</strong></p>
              </div>

              <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-xs">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{v.rating} / 5</span>
              </div>
            </div>

            {/* Metrics */}
            <div className="p-3 rounded-xl bg-slate-850 border border-slate-750 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Purchase Spend:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {formatCompactINR(v.totalPurchaseValue)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">On-Time SLA:</span>
                <span className="font-mono font-bold text-cyan-400 text-sm">{((v.onTimeDeliveries / (v.totalOrders || 1)) * 100).toFixed(0)}%</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">QC Pass Score:</span>
                <span className="font-mono font-bold text-purple-400 text-sm">{v.qualityRating}%</span>
              </div>
            </div>

            {/* Supplied Materials & Terms */}
            <div className="space-y-1.5 text-xs text-slate-300">
              <p><strong className="text-slate-400">Materials:</strong> {v.materialSupplied}</p>
              <div className="flex justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                <span>GSTIN: <strong className="text-slate-200 font-mono">{v.gstin}</strong></span>
                <span>Terms: <strong className="text-amber-300">{v.paymentTerms}</strong></span>
              </div>
            </div>

            {/* Contact Actions */}
            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800 text-slate-400">
              <span className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" /> {v.mobile}
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-slate-500" /> {v.email}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: ADD VENDOR */}
      <Modal
        isOpen={isNewVendorModalOpen}
        onClose={() => setIsNewVendorModalOpen(false)}
        title="Add New Vendor / Supplier"
        subtitle="Register raw material supplier or fabrication subcontractor"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateVendor} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Vendor Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                placeholder="Manav Metal"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Contact Person *
              </label>
              <input
                type="text"
                required
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Mobile Number *
              </label>
              <input
                type="text"
                required
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                GSTIN *
              </label>
              <input
                type="text"
                required
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-mono"
                placeholder="24AAECM1234F1Z8"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
              Materials Supplied *
            </label>
            <input
              type="text"
              required
              value={form.materialSupplied}
              onChange={(e) => setForm({ ...form, materialSupplied: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              placeholder="e.g. SS Flat, SS Pipe, SS Circle, Laser Cut Parts"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Payment Terms
              </label>
              <input
                type="text"
                value={form.paymentTerms}
                onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                placeholder="30 Days Net"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Initial Rating (1-5)
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs font-bold text-amber-400"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsNewVendorModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md"
            >
              Save Vendor
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
