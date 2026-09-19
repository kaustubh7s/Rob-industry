import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Copy,
  Check,
  Send,
  Building2,
  Calendar,
  FileText,
  ExternalLink,
  Download,
  CheckCircle2,
  UserCheck,
  ShieldCheck,
  Filter,
} from 'lucide-react';
import { Modal } from './Modal';
import { useERP } from '../../context/ERPContext';
import {
  formatWhatsAppPOMessage,
  createWhatsAppUrl,
  generatePurchaseOrderPDF,
  WhatsAppPOMessageOptions,
  WhatsAppPOItem,
} from '../../utils/whatsappHelper';

interface WhatsAppPOModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: WhatsAppPOMessageOptions;
}

export const WhatsAppPOModal: React.FC<WhatsAppPOModalProps> = ({
  isOpen,
  onClose,
  options,
}) => {
  const { vendors } = useERP();

  // Active Selected Vendor State (Pre-defined Vendor Dropdown & Details)
  const [selectedVendorName, setSelectedVendorName] = useState(options.vendorName || 'Manav Metal');

  const matchedVendor = useMemo(() => {
    return vendors.find(
      (v) => (v.name || '').trim().toLowerCase() === selectedVendorName.trim().toLowerCase()
    );
  }, [vendors, selectedVendorName]);

  const [vendorPhone, setVendorPhone] = useState(
    options.vendorMobile || matchedVendor?.mobile || '+91 98250 12345'
  );
  const [vendorContact, setVendorContact] = useState(
    options.vendorContactPerson || matchedVendor?.contactPerson || 'Sunil Shah'
  );
  const [paymentTerms, setPaymentTerms] = useState(
    options.paymentTerms || matchedVendor?.paymentTerms || '30 Days Net'
  );
  const [dateOfIssue, setDateOfIssue] = useState(
    options.dateOfIssue || new Date().toISOString().split('T')[0]
  );
  const [deliveryDate, setDeliveryDate] = useState(
    options.expectedDeliveryDate ||
      new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0]
  );
  const [customNotes, setCustomNotes] = useState(options.notes || '');
  const [copied, setCopied] = useState(false);
  const [pdfDownloaded, setPdfDownloaded] = useState(false);

  // When vendor changes from dropdown, update predefined phone, contact & terms
  const handleSelectVendor = (vName: string) => {
    setSelectedVendorName(vName);
    const found = vendors.find((v) => v.name.trim().toLowerCase() === vName.trim().toLowerCase());
    if (found) {
      setVendorPhone(found.mobile || '+91 98250 12345');
      setVendorContact(found.contactPerson || '');
      setPaymentTerms(found.paymentTerms || '30 Days Net');
    }
  };

  useEffect(() => {
    if (options.vendorName) {
      handleSelectVendor(options.vendorName);
    }
  }, [options.vendorName]);

  // STRICT VENDOR MATERIAL FILTERING & SYNC:
  // Only materials assigned to the selected vendor will be included in the PO and PDF.
  const syncedVendorItems: WhatsAppPOItem[] = useMemo(() => {
    const targetVendor = selectedVendorName.trim().toLowerCase();
    const vendorSpecific = options.items.filter((item) => {
      const itemVendor = (item.vendor || item.vendorName || '').trim().toLowerCase();
      return itemVendor === targetVendor;
    });

    // If items specifically matching this vendor are found, use them
    if (vendorSpecific.length > 0) {
      return vendorSpecific;
    }

    // If no vendor property is set on items (e.g. single PO selection), fallback to all items
    const unassignedItems = options.items.filter((item) => !item.vendor && !item.vendorName);
    if (unassignedItems.length > 0) {
      return unassignedItems;
    }

    return options.items;
  }, [options.items, selectedVendorName]);

  // Compute live options with selected vendor and filtered items
  const currentOptions: WhatsAppPOMessageOptions = useMemo(() => {
    return {
      ...options,
      vendorName: selectedVendorName,
      vendorMobile: vendorPhone,
      vendorContactPerson: vendorContact,
      vendorAddress: matchedVendor?.address,
      vendorGstin: matchedVendor?.gstin,
      paymentTerms: paymentTerms,
      dateOfIssue: dateOfIssue,
      expectedDeliveryDate: deliveryDate,
      notes: customNotes,
      items: syncedVendorItems,
    };
  }, [
    options,
    selectedVendorName,
    vendorPhone,
    vendorContact,
    matchedVendor,
    paymentTerms,
    dateOfIssue,
    deliveryDate,
    customNotes,
    syncedVendorItems,
  ]);

  // Compute live formatted concise message
  const activeMessage = useMemo(() => {
    return formatWhatsAppPOMessage(currentOptions);
  }, [currentOptions]);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(activeMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (e) {
      const textArea = document.createElement('textarea');
      textArea.value = activeMessage;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  };

  // 1-Click Generate & Download PDF
  const handleDownloadPDF = () => {
    generatePurchaseOrderPDF(currentOptions);
    setPdfDownloaded(true);
    setTimeout(() => setPdfDownloaded(false), 4000);
  };

  // 1-Click Send PDF & Open WhatsApp
  const handleSendPDFAndWhatsApp = () => {
    // 1. Generate & download official PDF
    generatePurchaseOrderPDF(currentOptions);
    setPdfDownloaded(true);

    // 2. Copy concise message text
    handleCopyText();

    // 3. Open WhatsApp Web / App with pre-configured vendor number & message
    const url = createWhatsAppUrl(vendorPhone, activeMessage);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🏭 RSB Official Material Purchase Order (PDF & WhatsApp)"
      subtitle="RSB PRIVATE LIMITED • Chhatrapati Sambhajinagar • 1-Click Direct Vendor PO Dispatch"
      maxWidth="4xl"
    >
      <div className="space-y-4 text-xs font-sans text-slate-800">
        {/* Top Vendor Quick Info & 1-Click Action Bar */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-emerald-950 text-white border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center font-bold shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white">{selectedVendorName}</h3>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 text-[10px] font-mono font-bold">
                  {currentOptions.poNumber || 'PO-RSB-2026-816'}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                  {paymentTerms}
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-medium mt-0.5">
                📞 {vendorPhone} • 👤 {vendorContact || 'Vendor Rep'} • 📦 {syncedVendorItems.length} Assigned Items (
                {syncedVendorItems.reduce((s, i) => s + (Number(i.quantity) || 0), 0)} Nos)
              </p>
            </div>
          </div>

          {/* Primary Action Button: 1-Click PDF + WhatsApp */}
          <button
            type="button"
            onClick={handleSendPDFAndWhatsApp}
            className="px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 text-xs font-black shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <Send className="w-4 h-4 fill-slate-950" />
            <span>Send PDF on WhatsApp →</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* 1. PRE-DEFINED VENDOR SELECTION & VENDOR MATERIAL SYNC */}
        {/* ========================================================================= */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Select Pre-Defined Vendor & Sync Assigned Materials:</span>
            </label>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
              <Filter className="w-3 h-3 text-emerald-600" />
              <span>Vendor Isolated: Only {selectedVendorName} parts</span>
            </span>
          </div>

          {/* Vendor Dropdown Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Vendor Name:
              </label>
              <select
                value={selectedVendorName}
                onChange={(e) => handleSelectVendor(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                {vendors.map((v) => (
                  <option key={v.id} value={v.name}>
                    {v.name} ({v.contactPerson ? `${v.contactPerson} • ` : ''}{v.mobile || 'No Phone'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                WhatsApp Phone Number:
              </label>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1.5 rounded-lg bg-slate-200 font-mono font-bold text-slate-700 text-xs border border-slate-300 shrink-0">
                  🇮🇳 +91
                </span>
                <input
                  type="text"
                  value={vendorPhone}
                  onChange={(e) => setVendorPhone(e.target.value)}
                  placeholder="e.g. 9825012345"
                  className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold font-mono text-slate-800 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Payment Terms:
              </label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="e.g. 30 Days Net"
                className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Dates & Reference Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-200">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-600" />
                <span>Date of Issue:</span>
              </label>
              <input
                type="text"
                value={dateOfIssue}
                onChange={(e) => setDateOfIssue(e.target.value)}
                placeholder="YYYY-MM-DD"
                className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-emerald-600" />
                <span>Target Delivery Date:</span>
              </label>
              <input
                type="text"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                placeholder="YYYY-MM-DD"
                className="w-full px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-emerald-800 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1 flex items-center gap-1">
                <FileText className="w-3 h-3 text-blue-600" />
                <span>PO Number:</span>
              </label>
              <input
                type="text"
                value={currentOptions.poNumber || 'PO-RSB-2026-816'}
                readOnly
                className="w-full px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 font-mono"
              />
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. OFFICIAL RSB 8-COLUMN MATERIAL PURCHASE ORDER PREVIEW */}
        {/* ========================================================================= */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
          <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <h4 className="font-black text-xs uppercase tracking-wider text-white">
                  RSB PRIVATE LIMITED
                </h4>
                <span className="text-[10px] text-amber-400 font-bold bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/20">
                  Manufacturing Industry
                </span>
              </div>
              <p className="text-[10px] text-slate-300 mt-0.5">
                F, 16/4, Naregaon Main Rd, Naregaon, Chilkalthana, Chhatrapati Sambhajinagar, Maharashtra 431007
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2.5 py-1 rounded-md border border-emerald-500/40">
                MATERIAL PURCHASE ORDER • STATUS: SENT
              </span>
            </div>
          </div>

          {/* Exact 8-Column Material Table Preview */}
          <div className="overflow-x-auto max-h-56">
            <table className="w-full text-[11px] text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] border-b border-slate-200 sticky top-0">
                  <th className="py-2 px-2 text-center w-8">#</th>
                  <th className="py-2 px-2.5">PROJECT NAME</th>
                  <th className="py-2 px-2.5">MACHINE NAME</th>
                  <th className="py-2 px-3">MATERIAL DESCRIPTION</th>
                  <th className="py-2 px-2.5">MATERIAL TYPE</th>
                  <th className="py-2 px-3">SIZE SPECIFICATION</th>
                  <th className="py-2 px-2 text-center">QTY</th>
                  <th className="py-2 px-2 text-center">UNIT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {syncedVendorItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-slate-400 font-medium">
                      No materials assigned to {selectedVendorName} in this batch.
                    </td>
                  </tr>
                ) : (
                  syncedVendorItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-2 text-center font-mono font-bold text-slate-400">
                        {idx + 1}
                      </td>
                      <td className="py-2 px-2.5 font-bold text-slate-900">
                        {item.projectName || currentOptions.projectName || 'Mahalaxmi 3'}
                      </td>
                      <td className="py-2 px-2.5 font-bold text-indigo-700">
                        {item.machineName || currentOptions.machineName || '10 HD'}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-800">
                        {item.description}
                      </td>
                      <td className="py-2 px-2.5 text-slate-600 font-medium">
                        {item.materialType || 'SS Flat'}
                      </td>
                      <td className="py-2 px-3 font-mono font-bold text-blue-900">
                        {item.sizeSpecs}
                      </td>
                      <td className="py-2 px-2 text-center font-black text-emerald-700">
                        {item.quantity}
                      </td>
                      <td className="py-2 px-2 text-center text-slate-500 font-medium">
                        {item.unit || 'Nos'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* 3-Tier Signatory Footer Banner */}
          <div className="grid grid-cols-3 gap-4 p-3 bg-slate-50 border-t border-slate-200 text-center text-[10px]">
            <div className="border-t border-dashed border-slate-300 pt-1.5">
              <span className="font-bold text-slate-900 block">Prepared By</span>
              <span className="text-slate-500 text-[9px]">Material Planning Dept</span>
            </div>
            <div className="border-t border-dashed border-slate-300 pt-1.5">
              <span className="font-bold text-slate-900 block">Verified By</span>
              <span className="text-slate-500 text-[9px]">Stores & Procurement Head</span>
            </div>
            <div className="border-t border-dashed border-slate-300 pt-1.5">
              <span className="font-bold text-slate-900 block">Authorized Signatory</span>
              <span className="text-slate-500 text-[9px]">Director / Plant Operations</span>
            </div>
          </div>
        </div>

        {/* WhatsApp Message Preview (Concise, no giant raw text table dump) */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
              <span>WhatsApp Message (Concise note notifying attached PDF):</span>
            </label>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyText}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer border border-slate-300"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied!' : 'Copy Text'}</span>
              </button>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#0b141a] text-[#e9edef] font-sans text-[11px] border border-emerald-500/20 shadow-inner max-h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed select-text">
            {activeMessage}
          </div>
        </div>

        {/* Confirmation Toast if PDF downloaded */}
        {pdfDownloaded && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-900 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-bold text-xs">
              ✓ RSB Official Purchase Order PDF generated & downloaded! Attach it directly in WhatsApp.
            </span>
          </div>
        )}

        {/* Action Buttons Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            Close (बंद करें)
          </button>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            {/* Download PDF Button */}
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Download PDF Only</span>
            </button>

            {/* 1-Click Send PDF & Open WhatsApp */}
            <button
              type="button"
              onClick={handleSendPDFAndWhatsApp}
              className="px-5 py-2.5 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 text-xs font-black shadow-md shadow-emerald-900/30 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Send className="w-4 h-4 fill-slate-950" />
              <span>Send PDF & Open WhatsApp</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

