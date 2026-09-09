import React, { useState } from 'react';
import {
  Users2,
  Plus,
  Search,
  Filter,
  Download,
  Building,
  Phone,
  Mail,
  MapPin,
  FileSpreadsheet,
  FileText,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { CustomerItem } from '../../types/erp';
import { formatINR, formatCompactINR } from '../../utils/calculations';
import { exportToExcel, exportToPdfReport } from '../../utils/excelIntegration';
import { Modal } from '../common/Modal';

export const CustomerManager: React.FC = () => {
  const { customers, addCustomer, updateCustomer, deleteCustomer } = useERP();

  const [searchTerm, setSearchTerm] = useState('');
  const [isNewCustModalOpen, setIsNewCustModalOpen] = useState(false);

  const [form, setForm] = useState({
    name: 'Cadila Healthcare Ltd (Zydus)',
    contactPerson: 'Dr. K. Verma',
    mobile: '+91 98980 67890',
    email: 'procurement.pharma@cadila.com',
    gstin: '24AABCC1234D1Z2',
    address: 'Sarkhej-Bavla Highway, Changodar, Ahmedabad - 382213',
    segment: 'Pharma Packaging & Liquid Lines',
    paymentTerms: '45 Days',
  });

  const filteredCustomers = customers.filter((c) => {
    return (
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.segment.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.gstin.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    addCustomer({
      ...form,
      totalOrders: 0,
      totalRevenue: 0,
      rating: 5,
    });
    setIsNewCustModalOpen(false);
  };

  const handleExportExcel = () => {
    const data = filteredCustomers.map(c => ({
      'Customer Name': c.name,
      'Contact Person': c.contactPerson,
      'Mobile': c.mobile,
      'Email': c.email,
      'GSTIN': c.gstin,
      'Address': c.address,
      'Industry Segment': c.segment,
      'Payment Terms': c.paymentTerms,
      'Total Orders': c.totalOrders,
      'Total Revenue (INR)': c.totalRevenue,
    }));
    exportToExcel(data, `RSB_Customer_Master_${new Date().toISOString().split('T')[0]}`);
  };

  const handleExportPdf = () => {
    const headers = ['Customer Name', 'Contact Person', 'Mobile', 'GSTIN', 'Segment', 'Total Revenue (₹)', 'Terms'];
    const rows = filteredCustomers.map(c => [
      c.name,
      c.contactPerson,
      c.mobile,
      c.gstin,
      c.segment,
      formatINR(c.totalRevenue),
      c.paymentTerms,
    ]);
    exportToPdfReport('RSB Customer Master Directory & Revenue Analytics', headers, rows, 'RSB_Customers_Report');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
              <Users2 className="w-5 h-5 text-indigo-400" />
              Customer Management & Pharma Client Directory
            </h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold">
              {filteredCustomers.length} Clients
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Maintain client records, plant delivery locations, GSTIN details, and commercial terms
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setIsNewCustModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Customer
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
            placeholder="Search Customer Name, Contact Person, Segment, GSTIN (e.g. Cadila, Torrent, Pharma)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredCustomers.map((c) => (
          <div
            key={c.id}
            className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-lg space-y-4 transition-all"
          >
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-base font-bold text-white">{c.name}</h4>
                <p className="text-xs text-slate-400 mt-0.5">Contact: <strong className="text-slate-200">{c.contactPerson}</strong></p>
              </div>

              <span className="px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold font-mono">
                {c.totalOrders} Orders
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-850 border border-slate-750 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Industry Segment:</span>
                <span className="font-semibold text-slate-200">{c.segment}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Lifetime Billing:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">{formatINR(c.totalRevenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Credit / Payment Terms:</span>
                <span className="font-semibold text-amber-300">{c.paymentTerms}</span>
              </div>
            </div>

            <div className="text-xs text-slate-400 space-y-1">
              <p className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" /> {c.address}</p>
              <p className="flex items-center gap-1.5 pt-1 font-mono text-[11px]">GSTIN: <strong className="text-slate-200">{c.gstin}</strong></p>
            </div>

            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800 text-slate-400">
              <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-500" /> {c.mobile}</span>
              <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-500" /> {c.email}</span>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL: ADD CUSTOMER */}
      <Modal
        isOpen={isNewCustModalOpen}
        onClose={() => setIsNewCustModalOpen(false)}
        title="Add New Customer / Machinery Buyer"
        subtitle="Register client profile for sales quotation and dispatch"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Customer Name *
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                placeholder="Cadila Healthcare Ltd"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Contact Person & Designation *
              </label>
              <input
                type="text"
                required
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                placeholder="Dr. K. Verma (VP Engineering)"
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
                placeholder="24AABCC1234D1Z2"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
              Plant / Factory Delivery Address *
            </label>
            <input
              type="text"
              required
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
              placeholder="Sarkhej-Bavla Highway, Changodar, Ahmedabad"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Industry Segment *
              </label>
              <input
                type="text"
                required
                value={form.segment}
                onChange={(e) => setForm({ ...form, segment: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                placeholder="e.g. Pharma Packaging & Liquid Lines"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase mb-1">
                Payment Terms
              </label>
              <input
                type="text"
                value={form.paymentTerms}
                onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                placeholder="45 Days"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsNewCustModalOpen(false)}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md"
            >
              Save Customer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
