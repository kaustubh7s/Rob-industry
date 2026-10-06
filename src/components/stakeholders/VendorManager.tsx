import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Search,
  Download,
  Star,
  Phone,
  Mail,
  MapPin,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  Award,
  Edit3,
  Trash2,
  MessageSquare,
  Copy,
  Check,
  CheckCircle2,
  ShieldCheck,
  ExternalLink,
  LayoutGrid,
  Table as TableIcon,
  PackageCheck,
  Receipt,
  Users,
  CreditCard,
  Sparkles,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { VendorItem } from '../../types/erp';
import { formatINR, formatCompactINR } from '../../utils/calculations';
import { exportToExcel, exportToPdfReport } from '../../utils/excelIntegration';
import { createWhatsAppUrl } from '../../utils/whatsappHelper';
import { Modal } from '../common/Modal';

export const VendorManager: React.FC = () => {
  const { vendors, addVendor, updateVendor, deleteVendor, purchaseOrders, inwardEntries } = useERP();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterTerms, setFilterTerms] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [copiedGstin, setCopiedGstin] = useState<string | null>(null);

  // Modal States
  const [isVendorModalOpen, setIsVendorModalOpen] = useState(false);
  const [editingVendorId, setEditingVendorId] = useState<string | null>(null);

  const initialFormState = {
    name: '',
    contactPerson: '',
    mobile: '+91 ',
    email: '',
    gstin: '',
    address: 'Chhatrapati Sambhajinagar, Maharashtra',
    materialSupplied: 'SS Flat, SS Pipe, SS Sheet, Laser Cut Blanks',
    rating: 5.0,
    paymentTerms: '30 Days Net',
  };

  const [form, setForm] = useState(initialFormState);

  // Compute live purchase metrics per vendor from real Purchase Orders & Inward Entries
  const enrichedVendors = useMemo(() => {
    return vendors.map((v) => {
      const vNorm = (v.name || '').trim().toLowerCase();
      
      const vendorPOs = purchaseOrders.filter(
        (po) => (po.vendor || '').trim().toLowerCase() === vNorm
      );
      
      const realOrderCount = vendorPOs.length > 0 ? vendorPOs.length : (v.totalOrders || 0);
      const realPurchaseSpend = vendorPOs.length > 0 
        ? vendorPOs.reduce((sum, po) => sum + (po.totalAmount || 0), 0)
        : (v.totalPurchaseValue || 0);

      const vendorInwards = inwardEntries.filter(
        (inw) => (inw.vendor || '').trim().toLowerCase() === vNorm
      );

      const onTimePct = realOrderCount > 0 
        ? Math.min(100, Math.round(((v.onTimeDeliveries || realOrderCount) / realOrderCount) * 100))
        : 100;

      return {
        ...v,
        computedOrders: realOrderCount,
        computedSpend: realPurchaseSpend,
        computedInwards: vendorInwards.length,
        onTimePct,
      };
    });
  }, [vendors, purchaseOrders, inwardEntries]);

  // Filtered List
  const filteredVendors = useMemo(() => {
    return enrichedVendors.filter((v) => {
      const matchesSearch =
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.materialSupplied.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.gstin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.mobile.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesTerms =
        filterTerms === 'ALL' ||
        v.paymentTerms.toLowerCase().includes(filterTerms.toLowerCase());

      return matchesSearch && matchesTerms;
    });
  }, [enrichedVendors, searchTerm, filterTerms]);

  // Overall KPI Metrics
  const totalSpend = useMemo(() => {
    return enrichedVendors.reduce((acc, v) => acc + (v.computedSpend || 0), 0);
  }, [enrichedVendors]);

  const totalPOsIssued = useMemo(() => {
    return purchaseOrders.length;
  }, [purchaseOrders]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingVendorId(null);
    setForm(initialFormState);
    setIsVendorModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (vendor: VendorItem) => {
    setEditingVendorId(vendor.id);
    setForm({
      name: vendor.name,
      contactPerson: vendor.contactPerson,
      mobile: vendor.mobile,
      email: vendor.email || '',
      gstin: vendor.gstin || '',
      address: vendor.address || '',
      materialSupplied: vendor.materialSupplied || '',
      rating: vendor.rating || 5.0,
      paymentTerms: vendor.paymentTerms || '30 Days Net',
    });
    setIsVendorModalOpen(true);
  };

  // Save Vendor (Create or Update)
  const handleSaveVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    if (editingVendorId) {
      updateVendor(editingVendorId, {
        ...form,
      });
    } else {
      addVendor({
        ...form,
        totalOrders: 0,
        totalPurchaseValue: 0,
        onTimeDeliveries: 0,
        delayedDeliveries: 0,
        averageDeliveryDays: 3,
        rejectionRate: 0,
        qualityRating: 99,
        costCompetitiveness: 9,
        reliabilityScore: 100,
      });
    }
    setIsVendorModalOpen(false);
  };

  // Delete Vendor
  const handleDeleteVendor = (vendor: VendorItem) => {
    if (window.confirm(`Are you sure you want to remove vendor "${vendor.name}"? This action cannot be undone.`)) {
      deleteVendor(vendor.id);
    }
  };

  // Copy GSTIN
  const handleCopyGSTIN = (gstin: string) => {
    try {
      navigator.clipboard.writeText(gstin);
      setCopiedGstin(gstin);
      setTimeout(() => setCopiedGstin(null), 2500);
    } catch (e) {}
  };

  // WhatsApp Quick Message
  const handleWhatsAppVendor = (phone: string, vendorName: string) => {
    const msg = `*RSB PRIVATE LIMITED*\nHello ${vendorName},\nWe are contacting you regarding our manufacturing purchase requirements.\nPlease share your current availability & live pricing.`;
    const url = createWhatsAppUrl(phone, msg);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Export Excel
  const handleExportExcel = () => {
    const data = filteredVendors.map((v, idx) => ({
      'Sr No': idx + 1,
      'Vendor Name': v.name,
      'Contact Person': v.contactPerson,
      'Mobile': v.mobile,
      'Email': v.email,
      'GSTIN': v.gstin,
      'Address': v.address,
      'Materials Supplied': v.materialSupplied,
      'Payment Terms': v.paymentTerms,
      'Rating': `${v.rating} / 5`,
      'Purchase Orders': v.computedOrders,
      'Purchase Spend (INR)': v.computedSpend,
      'Quality Score %': `${v.qualityRating || 99}%`,
    }));
    exportToExcel(data, `RSB_Vendor_Master_${new Date().toISOString().split('T')[0]}`);
  };

  // Export PDF Report
  const handleExportPdf = () => {
    const headers = ['#', 'Vendor Name', 'Contact Person', 'Mobile', 'GSTIN', 'Payment Terms', 'Spend (₹)', 'Rating'];
    const rows = filteredVendors.map((v, idx) => [
      idx + 1,
      v.name,
      v.contactPerson,
      v.mobile,
      v.gstin,
      v.paymentTerms,
      formatINR(v.computedSpend),
      `${v.rating} / 5`,
    ]);
    exportToPdfReport('RSB Vendor Directory & Supplier Network Report', headers, rows, 'RSB_Vendors_Report');
  };

  // Helper for vendor initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Main Header */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Vendor Management & Supplier Partners
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold">
                  {filteredVendors.length} Verified Suppliers
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Track supplier contacts, payment terms, GSTIN compliance, and procurement spend
              </p>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-900/30 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Supplier</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel (.XLSX)</span>
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>PDF Report</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center font-black">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Active Partners
            </span>
            <span className="text-base font-black text-slate-900">
              {vendors.length} Vendors
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-black">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Total POs Issued
            </span>
            <span className="text-base font-black text-emerald-700">
              {totalPOsIssued} Orders
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-black">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Procurement Spend
            </span>
            <span className="text-base font-black text-indigo-900">
              {formatCompactINR(totalSpend)}
            </span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-2xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center font-black">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
              Compliance Status
            </span>
            <span className="text-base font-black text-blue-900">
              100% Verified
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filter Strip */}
      <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80 md:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search vendor name, contact, materials, GSTIN, mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <select
            value={filterTerms}
            onChange={(e) => setFilterTerms(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="ALL">All Payment Terms</option>
            <option value="30 Days">30 Days Net</option>
            <option value="45 Days">45 Days Net</option>
            <option value="60 Days">60 Days Net</option>
            <option value="Immediate">Immediate / Advance</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white shadow-2xs text-slate-900 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Grid Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white shadow-2xs text-slate-900 font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VENDOR CARDS VIEW */}
      {/* ========================================================================= */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredVendors.length === 0 ? (
            <div className="col-span-full p-12 bg-white rounded-2xl border border-dashed border-slate-300 text-center space-y-3">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No vendors found</h3>
              <p className="text-xs text-slate-500">Try adjusting your search filter or click Add Supplier to register a new vendor.</p>
              <button
                type="button"
                onClick={handleOpenCreateModal}
                className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs shadow-xs"
              >
                + Add First Supplier
              </button>
            </div>
          ) : (
            filteredVendors.map((v) => (
              <div
                key={v.id}
                className="bg-white rounded-2xl border border-slate-200 hover:border-amber-400/50 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group"
              >
                {/* Top Section */}
                <div className="p-4 space-y-3">
                  {/* Card Header with Avatar, Title & Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Gradient Initials Avatar */}
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 border border-slate-800 text-amber-400 font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                        {getInitials(v.name)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-black text-slate-900 group-hover:text-amber-600 transition-colors">
                            {v.name}
                          </h3>
                          {v.rating >= 4.8 && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5 text-amber-500" />
                              <span>Top Partner</span>
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                          <span>Contact:</span>
                          <strong className="text-slate-800 font-semibold">{v.contactPerson}</strong>
                        </p>
                      </div>
                    </div>

                    {/* Star Rating Badge */}
                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-black text-xs shrink-0">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                      <span>{v.rating.toFixed(1)}</span>
                    </div>
                  </div>

                  {/* Clean 3-Column Performance Stats */}
                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Total Orders
                      </span>
                      <span className="font-mono font-bold text-slate-900 text-xs mt-0.5 block">
                        {v.computedOrders} {v.computedOrders === 1 ? 'PO' : 'POs'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        Purchase Spend
                      </span>
                      <span className="font-mono font-black text-emerald-700 text-xs mt-0.5 block">
                        {formatCompactINR(v.computedSpend)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        On-Time SLA
                      </span>
                      <span className="font-mono font-bold text-indigo-700 text-xs mt-0.5 block">
                        {v.onTimePct}%
                      </span>
                    </div>
                  </div>

                  {/* Materials Supplied Tags */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Materials Supplied:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {v.materialSupplied.split(',').map((mat, mIdx) => (
                        <span
                          key={mIdx}
                          className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200"
                        >
                          {mat.trim()}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* GSTIN, Payment Terms & Address */}
                  <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-bold">GSTIN:</span>
                        <span className="font-mono font-bold text-slate-800">{v.gstin || '24AAECM1234F1Z8'}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyGSTIN(v.gstin || '24AAECM1234F1Z8')}
                          className="text-slate-400 hover:text-indigo-600 p-0.5 transition-colors cursor-pointer"
                          title="Copy GSTIN"
                        >
                          {copiedGstin === (v.gstin || '24AAECM1234F1Z8') ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <CreditCard className="w-3 h-3 text-indigo-500" />
                        <span className="font-bold text-indigo-900 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">
                          {v.paymentTerms}
                        </span>
                      </div>
                    </div>

                    {v.address && (
                      <div className="flex items-start gap-1 text-[10.5px] text-slate-500 truncate pt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                        <span className="truncate">{v.address}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Action Bar */}
                <div className="p-3 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  {/* Left Contact Buttons */}
                  <div className="flex items-center gap-2">
                    <a
                      href={`tel:${v.mobile}`}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 font-mono font-bold text-slate-700 flex items-center gap-1.5 text-[11px] transition-colors"
                      title="Call Vendor"
                    >
                      <Phone className="w-3 h-3 text-slate-500" />
                      <span>{v.mobile}</span>
                    </a>

                    {v.email && (
                      <a
                        href={`mailto:${v.email}`}
                        className="p-1.5 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors"
                        title={v.email}
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>

                  {/* Right Actions: WhatsApp, Edit, Delete */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleWhatsAppVendor(v.mobile, v.name)}
                      className="px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
                      title="Direct WhatsApp Message"
                    >
                      <MessageSquare className="w-3.5 h-3.5 fill-slate-950" />
                      <span>WhatsApp</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(v)}
                      className="p-1.5 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                      title="Edit Vendor Details"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteVendor(v)}
                      className="p-1.5 rounded-lg bg-white hover:bg-rose-50 border border-slate-200 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Delete Vendor"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* VENDOR TABLE VIEW */
        /* ========================================================================= */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 text-white font-black uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-3">Supplier Name</th>
                  <th className="py-3 px-3">Contact Person</th>
                  <th className="py-3 px-3">Mobile & WhatsApp</th>
                  <th className="py-3 px-3">GSTIN</th>
                  <th className="py-3 px-3">Materials</th>
                  <th className="py-3 px-3">Payment Terms</th>
                  <th className="py-3 px-3 text-right">Spend</th>
                  <th className="py-3 px-3 text-center">Rating</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                {filteredVendors.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      No suppliers match the current filter.
                    </td>
                  </tr>
                ) : (
                  filteredVendors.map((v, idx) => (
                    <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-slate-900 text-amber-400 font-black text-xs flex items-center justify-center shrink-0">
                            {getInitials(v.name)}
                          </div>
                          <span>{v.name}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-semibold">
                        {v.contactPerson}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs font-bold text-slate-800">
                        {v.mobile}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                        {v.gstin || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate text-[11px]">
                        {v.materialSupplied}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-800 font-bold text-[10px] border border-indigo-100">
                          {v.paymentTerms}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-700">
                        {formatINR(v.computedSpend)}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md text-xs">
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          {v.rating.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleWhatsAppVendor(v.mobile, v.name)}
                            className="p-1.5 rounded-lg bg-[#25D366]/20 hover:bg-[#25D366]/30 text-emerald-950 border border-[#25D366]/40 transition-colors cursor-pointer"
                            title="Chat on WhatsApp"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-800 fill-emerald-800" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(v)}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteVendor(v)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT VENDOR */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isVendorModalOpen}
        onClose={() => setIsVendorModalOpen(false)}
        title={editingVendorId ? 'Edit Supplier Partner Details' : 'Register New Vendor / Supplier'}
        subtitle="Maintain official procurement profiles, GSTIN, payment terms & material scope"
        maxWidth="2xl"
      >
        <form onSubmit={handleSaveVendor} className="space-y-4 text-xs font-sans text-slate-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Vendor Company Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-bold focus:outline-none focus:border-amber-500"
                placeholder="e.g. Manav Metal"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Contact Person Name *
              </label>
              <input
                type="text"
                required
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-bold focus:outline-none focus:border-amber-500"
                placeholder="e.g. Sunil Shah"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                WhatsApp / Mobile *
              </label>
              <input
                type="text"
                required
                value={form.mobile}
                onChange={(e) => setForm({ ...form, mobile: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-bold font-mono focus:outline-none focus:border-amber-500"
                placeholder="+91 98250 12345"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-amber-500"
                placeholder="orders@supplier.com"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                GSTIN Number *
              </label>
              <input
                type="text"
                required
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-mono font-bold focus:outline-none focus:border-amber-500"
                placeholder="24AAECM1234F1Z8"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Materials Supplied (Comma-separated) *
            </label>
            <input
              type="text"
              required
              value={form.materialSupplied}
              onChange={(e) => setForm({ ...form, materialSupplied: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-medium focus:outline-none focus:border-amber-500"
              placeholder="e.g. SS Flat, SS Pipe, SS Circle, Laser Cut Parts"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Payment Terms
              </label>
              <input
                type="text"
                value={form.paymentTerms}
                onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs font-bold focus:outline-none focus:border-amber-500"
                placeholder="30 Days Net"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Supplier Rating (1.0 to 5.0)
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={form.rating}
                onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-amber-700 text-xs font-black focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
              Registered Works / Factory Address
            </label>
            <textarea
              rows={2}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs focus:outline-none focus:border-amber-500"
              placeholder="Plot details, Industrial Estate, City, State - PIN"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsVendorModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md cursor-pointer"
            >
              {editingVendorId ? 'Update Supplier' : 'Save New Supplier'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
