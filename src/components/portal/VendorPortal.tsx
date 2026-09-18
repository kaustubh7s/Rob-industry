import React, { useState } from 'react';
import {
  Building2,
  FileText,
  Upload,
  Plus,
  Search,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Truck,
  ShieldCheck,
  Send,
  Star,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react';
import { useERP } from '../../context/ERPContext';
import { RFQRecord, VendorQuotation, PurchaseOrder, VendorDocument } from '../../types/erp';
import { formatINR } from '../../utils/calculations';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';

export const VendorPortal: React.FC = () => {
  const {
    vendors,
    activeVendorId,
    setActiveVendorId,
    rfqs,
    submitVendorQuotation,
    approveVendorQuotation,
    rejectVendorQuotation,
    purchaseOrders,
    vendorDocuments,
    uploadVendorDocument,
    currentUser,
  } = useERP();

  const activeVendor = vendors.find((v) => v.id === activeVendorId) || vendors[0];

  const [activePortalTab, setActivePortalTab] = useState<'rfqs' | 'pos' | 'deliveries' | 'documents' | 'quotations'>('rfqs');
  const [selectedRFQForQuote, setSelectedRFQForQuote] = useState<RFQRecord | null>(null);
  const [isUploadDocModalOpen, setIsUploadDocModalOpen] = useState(false);

  // Quote form
  const [quoteForm, setQuoteForm] = useState({
    unitRate: 1950,
    leadTimeDays: 3,
    notes: 'Ex-stock in Vatva warehouse. Mill test cert SS304/SS316 included.',
  });

  // Doc upload form
  const [docForm, setDocForm] = useState({
    docType: 'Invoice' as VendorDocument['docType'],
    docNumber: 'INV-2026-9901',
    fileName: 'Tax_Invoice_9901.pdf',
    linkedPO: 'PO-2026-036',
  });

  // Filter vendor's specific POs and documents
  const vendorPOs = purchaseOrders.filter((po) =>
    po.vendor.toLowerCase().includes(activeVendor.name.toLowerCase()) ||
    activeVendor.name.toLowerCase().includes(po.vendor.toLowerCase())
  );

  const vendorDocs = vendorDocuments.filter((doc) =>
    doc.vendorName.toLowerCase().includes(activeVendor.name.toLowerCase()) ||
    activeVendor.name.toLowerCase().includes(doc.vendorName.toLowerCase())
  );

  const handleSubmitQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRFQForQuote) return;

    submitVendorQuotation(selectedRFQForQuote.id, {
      vendorId: activeVendor.id,
      vendorName: activeVendor.name,
      unitRate: quoteForm.unitRate,
      totalAmount: quoteForm.unitRate * (selectedRFQForQuote.quantity || 1),
      leadTimeDays: quoteForm.leadTimeDays,
      notes: quoteForm.notes,
    });

    setSelectedRFQForQuote(null);
  };

  const handleUploadDocument = (e: React.FormEvent) => {
    e.preventDefault();
    uploadVendorDocument({
      vendorName: activeVendor.name,
      docType: docForm.docType,
      docNumber: docForm.docNumber,
      fileName: docForm.fileName,
      fileSize: '480 KB',
      status: 'Pending Review',
      linkedPO: docForm.linkedPO,
    });
    setIsUploadDocModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header & Vendor Account Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-400" />
              Secure Supplier & Vendor Portal
            </h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
              Active Portal: {activeVendor.name}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Supplier workspace for RFQ bid submissions, purchase order tracking, delivery scheduling, and invoice uploads
          </p>
        </div>

        {/* Vendor Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Viewing As:</span>
          <select
            value={activeVendorId}
            onChange={(e) => setActiveVendorId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-xs font-bold text-white focus:outline-hidden focus:border-amber-500"
          >
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} (Supplier #{v.id})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Vendor Overview Dashboard KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Open RFQs for Bidding</span>
          <p className="text-2xl font-bold text-blue-400 font-mono mt-1">
            {rfqs.filter((r) => r.status === 'Open').length}
          </p>
          <span className="text-xs text-slate-400">Available to submit quote</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Purchase Orders</span>
          <p className="text-2xl font-bold text-emerald-400 font-mono mt-1">{vendorPOs.length}</p>
          <span className="text-xs text-emerald-300">Total ₹{formatINR(vendorPOs.reduce((acc, p) => acc + p.totalAmount, 0))}</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">On-Time Deliveries</span>
          <p className="text-2xl font-bold text-cyan-400 font-mono mt-1">
            {activeVendor.onTimeDeliveries} / {activeVendor.totalOrders}
          </p>
          <span className="text-xs text-slate-400">SLA: {((activeVendor.onTimeDeliveries / (activeVendor.totalOrders || 1)) * 100).toFixed(0)}%</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment Terms</span>
          <p className="text-sm font-bold text-amber-300 mt-1.5">{activeVendor.paymentTerms}</p>
          <span className="text-xs text-slate-400 font-mono">GST: {activeVendor.gstin}</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quality Score</span>
          <div className="flex items-center gap-1 mt-1">
            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
            <span className="text-2xl font-bold text-white font-mono">{activeVendor.rating} / 5</span>
          </div>
          <span className="text-xs text-purple-300">{activeVendor.qualityRating}% Pass Score</span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800 overflow-x-auto">
        {[
          { id: 'rfqs', label: 'Open RFQs (Inquiries)', count: rfqs.length },
          { id: 'pos', label: 'Purchase Orders', count: vendorPOs.length },
          { id: 'deliveries', label: 'Delivery Schedules', count: vendorPOs.length },
          { id: 'documents', label: 'Invoices & Certificates', count: vendorDocs.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActivePortalTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activePortalTab === tab.id
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
              activePortalTab === tab.id ? 'bg-blue-800 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* TAB 1: OPEN RFQs & QUOTATION SUBMISSION */}
      {activePortalTab === 'rfqs' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rfqs.map((rfq) => {
              const myQuote = rfq.quotations.find((q) => q.vendorId === activeVendor.id);

              return (
                <div
                  key={rfq.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-lg"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-400">{rfq.rfqNumber}</span>
                        <StatusBadge status={rfq.status === 'Open' ? 'New' : rfq.status === 'Awarded' ? 'Approved' : 'Completed'} size="sm" />
                      </div>
                      <h4 className="text-sm font-bold text-white mt-1">{rfq.title}</h4>
                      <p className="text-xs text-slate-400 mt-0.5">Due Date: <strong className="text-amber-300 font-mono">{rfq.dueDate}</strong></p>
                    </div>

                    <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-800 border border-slate-700 rounded-lg text-white">
                      Req: {rfq.quantity} {rfq.unit}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-850 rounded-xl border border-slate-750 space-y-1 text-xs">
                    <div><strong className="text-slate-400">Material Spec:</strong> <span className="font-mono text-slate-200">{rfq.material} ({rfq.sizeSpecs})</span></div>
                    {rfq.drawingRef && (
                      <div><strong className="text-slate-400">Drawing Ref:</strong> <span className="font-mono text-amber-300">{rfq.drawingRef}</span></div>
                    )}
                    {rfq.specNotes && (
                      <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-750">{rfq.specNotes}</p>
                    )}
                  </div>

                  {/* Submitted Quotation Details */}
                  {myQuote ? (
                    <div className="p-3.5 rounded-xl bg-slate-850 border border-slate-750 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-semibold">Your Submitted Quote:</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono ${
                          myQuote.status === 'Approved'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : myQuote.status === 'Rejected'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 line-through'
                            : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        }`}>
                          {myQuote.status}
                        </span>
                      </div>
                      <div className="flex justify-between font-mono pt-1 text-sm font-bold text-white">
                        <span>₹{myQuote.unitRate} / {rfq.unit}</span>
                        <span className="text-emerald-400">Total: {formatINR(myQuote.totalAmount)}</span>
                      </div>
                      <p className="text-[11px] text-slate-400">Lead time: {myQuote.leadTimeDays} days &bull; {myQuote.notes}</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedRFQForQuote(rfq);
                        setQuoteForm({
                          unitRate: 1950,
                          leadTimeDays: 3,
                          notes: `Standard dispatch from ${activeVendor.name} warehouse.`,
                        });
                      }}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95"
                    >
                      <Send className="w-4 h-4" /> Submit Supplier Quotation
                    </button>
                  )}

                  {/* Admin Evaluation Buttons (If logged in as Super Admin / Admin) */}
                  {(currentUser.role === 'super_admin' || currentUser.role === 'admin' || currentUser.role === 'purchase_manager') &&
                    rfq.quotations.length > 0 && (
                      <div className="pt-3 border-t border-slate-800 space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Buyer Evaluation & PO Award (Admin View)
                        </span>
                        {rfq.quotations.map((q) => (
                          <div key={q.id} className="p-2.5 bg-slate-850 rounded-xl border border-slate-750 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-white block">{q.vendorName}</span>
                              <span className="font-mono text-emerald-400">₹{q.unitRate}/{rfq.unit} ({formatINR(q.totalAmount)})</span>
                            </div>
                            <div className="flex gap-1.5">
                              {q.status === 'Submitted' && (
                                <>
                                  <button
                                    onClick={() => approveVendorQuotation(rfq.id, q.id)}
                                    className="px-3 py-1 bg-emerald-600 text-white text-[11px] font-bold rounded-lg hover:bg-emerald-500 shadow-xs"
                                  >
                                    Accept & Issue PO
                                  </button>
                                  <button
                                    onClick={() => rejectVendorQuotation(rfq.id, q.id)}
                                    className="px-3 py-1 bg-slate-800 text-slate-400 text-[11px] font-semibold rounded-lg hover:text-white"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                              {q.status === 'Approved' && (
                                <span className="text-[11px] font-bold text-emerald-400 font-mono">AWARDED (PO ISSUED)</span>
                              )}
                              {q.status === 'Rejected' && (
                                <span className="text-[11px] text-rose-400 font-mono">REJECTED</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: PURCHASE ORDERS */}
      {activePortalTab === 'pos' && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-850 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">PO Number</th>
                  <th className="p-3">Order Date</th>
                  <th className="p-3">Expected Delivery</th>
                  <th className="p-3">Line Items</th>
                  <th className="p-3 text-right">PO Total (₹)</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium text-slate-300">
                {vendorPOs.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-800/40">
                    <td className="p-3 font-mono font-bold text-cyan-400">{po.poNumber}</td>
                    <td className="p-3">{po.date}</td>
                    <td className="p-3 font-mono text-amber-300">{po.expectedDate}</td>
                    <td className="p-3">
                      {po.items.map((it, idx) => (
                        <div key={idx} className="text-[11px] font-mono text-slate-200">
                          {it.qty} {it.unit} &bull; {it.material}
                        </div>
                      ))}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-emerald-400">
                      {formatINR(po.totalAmount)}
                    </td>
                    <td className="p-3 text-center">
                      <StatusBadge status={po.status} size="sm" />
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => {
                          setDocForm({
                            docType: 'Invoice',
                            docNumber: `INV-${po.poNumber.slice(-3)}-01`,
                            fileName: `Invoice_${po.poNumber}.pdf`,
                            linkedPO: po.poNumber,
                          });
                          setIsUploadDocModalOpen(true);
                        }}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold"
                      >
                        Upload Invoice
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DELIVERIES */}
      {activePortalTab === 'deliveries' && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider text-[11px]">
            Upcoming Scheduled Consignments & Dispatch Tracking
          </h3>
          <div className="space-y-3">
            {vendorPOs.map((po) => (
              <div key={po.id} className="p-4 bg-slate-850 rounded-xl border border-slate-750 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-cyan-400">{po.poNumber}</span>
                    <span className="text-[11px] text-slate-400">Target Delivery Date: <strong className="text-amber-300 font-mono">{po.expectedDate}</strong></span>
                  </div>
                  <p className="text-slate-300 text-[11px] mt-1">
                    Items: {po.items.map((i) => `${i.qty} ${i.unit} ${i.material}`).join(', ')}
                  </p>
                </div>

                <button
                  onClick={() => {
                    setDocForm({
                      docType: 'Challan',
                      docNumber: `CH-${Date.now().toString().slice(-4)}`,
                      fileName: `Delivery_Challan_${po.poNumber}.pdf`,
                      linkedPO: po.poNumber,
                    });
                    setIsUploadDocModalOpen(true);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shrink-0 shadow-md"
                >
                  Upload Delivery Challan
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: DOCUMENTS & INVOICES */}
      {activePortalTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white">Uploaded Supplier Documents</h3>
            <button
              onClick={() => setIsUploadDocModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-colors shadow-md"
            >
              <Upload className="w-4 h-4" /> Upload Document
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-850 text-slate-400 font-bold uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="p-3">Doc Type</th>
                  <th className="p-3">Doc Number</th>
                  <th className="p-3">Linked PO</th>
                  <th className="p-3">File Name</th>
                  <th className="p-3">Date Uploaded</th>
                  <th className="p-3">Verification Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 font-medium text-slate-300">
                {vendorDocs.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-800/40">
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 font-bold text-[10px] uppercase font-mono">
                        {doc.docType}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-white">{doc.docNumber}</td>
                    <td className="p-3 font-mono text-slate-400">{doc.linkedPO || '-'}</td>
                    <td className="p-3 font-mono text-slate-200">{doc.fileName} ({doc.fileSize})</td>
                    <td className="p-3 text-slate-400">{doc.uploadDate}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        doc.status === 'Verified' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: SUBMIT QUOTATION */}
      <Modal
        isOpen={!!selectedRFQForQuote}
        onClose={() => setSelectedRFQForQuote(null)}
        title={`Submit Quotation for ${selectedRFQForQuote?.rfqNumber}`}
        subtitle={`Supplier: ${activeVendor.name}`}
        maxWidth="lg"
      >
        {selectedRFQForQuote && (
          <form onSubmit={handleSubmitQuote} className="space-y-4 text-xs">
            <div className="p-3.5 bg-slate-850 rounded-xl border border-slate-750 space-y-1">
              <div><strong className="text-slate-400">Material Spec:</strong> {selectedRFQForQuote.material}</div>
              <div><strong className="text-slate-400">Required Quantity:</strong> {selectedRFQForQuote.quantity} {selectedRFQForQuote.unit}</div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Unit Rate (₹ per {selectedRFQForQuote.unit}) *</label>
                <input
                  type="number"
                  required
                  value={quoteForm.unitRate}
                  onChange={(e) => setQuoteForm({ ...quoteForm, unitRate: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Delivery Lead Time (Days) *</label>
                <input
                  type="number"
                  required
                  value={quoteForm.leadTimeDays}
                  onChange={(e) => setQuoteForm({ ...quoteForm, leadTimeDays: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono font-bold"
                />
              </div>
            </div>

            <div className="p-3.5 bg-slate-850 rounded-xl border border-slate-750 flex justify-between items-center">
              <span className="text-slate-400">Total Calculated Bid:</span>
              <span className="font-mono text-sm font-bold text-emerald-400">
                {formatINR(quoteForm.unitRate * (selectedRFQForQuote.quantity || 1))}
              </span>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Commercial & Technical Remarks</label>
              <input
                type="text"
                value={quoteForm.notes}
                onChange={(e) => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedRFQForQuote(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md"
              >
                Submit Official Bid
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* MODAL 2: UPLOAD DOCUMENT */}
      <Modal
        isOpen={isUploadDocModalOpen}
        onClose={() => setIsUploadDocModalOpen(false)}
        title="Upload Supplier Document"
        subtitle={`Upload tax invoice, delivery challan, or test certificate for ${activeVendor.name}`}
        maxWidth="lg"
      >
        <form onSubmit={handleUploadDocument} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Document Type *</label>
              <select
                value={docForm.docType}
                onChange={(e) => setDocForm({ ...docForm, docType: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white"
              >
                <option value="Invoice">Tax Invoice</option>
                <option value="Challan">Delivery Challan</option>
                <option value="Test Certificate">Mill Test Certificate (MTC)</option>
                <option value="Drawing">Inspection Drawing</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Document Number *</label>
              <input
                type="text"
                required
                value={docForm.docNumber}
                onChange={(e) => setDocForm({ ...docForm, docNumber: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Linked Purchase Order</label>
            <input
              type="text"
              value={docForm.linkedPO}
              onChange={(e) => setDocForm({ ...docForm, linkedPO: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Select File (.PDF, .JPG, .PNG) *</label>
            <input
              type="file"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setDocForm({ ...docForm, fileName: e.target.files[0].name });
                }
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 text-xs"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsUploadDocModalOpen(false)}
              className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md"
            >
              Upload Document
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
