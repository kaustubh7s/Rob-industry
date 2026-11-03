import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Eye,
  CheckCircle2,
  AlertCircle,
  Truck,
  Building2,
  Calendar,
  Clock,
  ShieldCheck,
  User,
  X,
  Printer,
  Share2,
  Hash,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { GRNOptions, GRNItem, downloadGRNPdf, createGRNPdfBlobUrl, buildGRNPdfDoc } from '../../utils/grnPdfGenerator';
import {
  peekNextGRNNumber,
  commitGRNSequence,
  getCurrentGRNSequence,
  setNextGRNSequence,
  parseGRNNumber,
  getGRNCurrentYear,
} from '../../utils/grnSequenceManager';

interface GRNModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialItems?: GRNItem[];
  defaultVendor?: string;
  defaultProject?: string;
  defaultPO?: string;
  defaultDate?: string;
}

export const GRNModal: React.FC<GRNModalProps> = ({
  isOpen,
  onClose,
  initialItems = [],
  defaultVendor = '',
  defaultProject = '',
  defaultPO = '',
  defaultDate = '',
}) => {
  const [grnNumber, setGrnNumber] = useState<string>(() => {
    return peekNextGRNNumber();
  });
  const [grnDate, setGrnDate] = useState<string>(() => {
    return defaultDate || new Date().toISOString().split('T')[0];
  });
  const [receivingTime, setReceivingTime] = useState<string>(() => {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  });

  const [vendorName, setVendorName] = useState<string>(defaultVendor || 'Manav Metal');
  const [vendorGst, setVendorGst] = useState<string>('');
  const [poNumber, setPoNumber] = useState<string>(defaultPO || 'PO-RSB-2026-073');
  const [challanNumber, setChallanNumber] = useState<string>('DC-8849 / INV-9241');
  const [challanDate, setChallanDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [vehicleNumber, setVehicleNumber] = useState<string>('');
  const [transporterName, setTransporterName] = useState<string>('');
  const [projectName, setProjectName] = useState<string>(defaultProject || 'Factory Project');
  const [machineName, setMachineName] = useState<string>('Standard Line');

  const [receivedBy, setReceivedBy] = useState<string>('Chandramani (Store Incharge)');
  const [inspectedBy, setInspectedBy] = useState<string>('Stores Quality & Receiving Inspector');
  const [authorizedBy, setAuthorizedBy] = useState<string>('Amit / Kaustubh (Director / Plant Head)');
  const [qcRemarks, setQcRemarks] = useState<string>('');

  const [items, setItems] = useState<GRNItem[]>(initialItems);
  const [previewBlobUrl, setPreviewBlobUrl] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync state when props change
  useEffect(() => {
    if (isOpen) {
      setGrnNumber(peekNextGRNNumber());
      if (initialItems.length > 0) {
        setItems(initialItems);
      }
      if (defaultVendor) setVendorName(defaultVendor);
      if (defaultProject) setProjectName(defaultProject);
      if (defaultPO) setPoNumber(defaultPO);
      if (defaultDate) setGrnDate(defaultDate);
      setIsPreviewOpen(false);
      setPreviewBlobUrl(null);
    }
  }, [isOpen, initialItems, defaultVendor, defaultProject, defaultPO, defaultDate]);

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    };
  }, [previewBlobUrl]);

  if (!isOpen) return null;

  const currentOptions: GRNOptions = {
    grnNumber,
    grnDate,
    receivingTime,
    vendorName,
    vendorGst,
    poNumber,
    challanNumber,
    challanDate,
    vehicleNumber,
    transporterName,
    projectName,
    machineName,
    receivedBy,
    inspectedBy,
    authorizedBy,
    qcRemarks,
    items,
  };

  const handleDownloadPDF = () => {
    const committedNum = commitGRNSequence(currentOptions);
    const fileName = downloadGRNPdf({ ...currentOptions, grnNumber: committedNum });
    setToastMessage(`Saved Sequential GRN: ${committedNum} (${fileName})`);
    setTimeout(() => setToastMessage(null), 3500);
    setGrnNumber(peekNextGRNNumber());
  };

  const handleDirectPrint = () => {
    try {
      const committedNum = commitGRNSequence(currentOptions);
      const opts = { ...currentOptions, grnNumber: committedNum };
      const { doc } = buildGRNPdfDoc(opts);
      doc.autoPrint();
      const blob = doc.output('blob');
      const blobUrl = URL.createObjectURL(blob);
      const printWin = window.open(blobUrl, '_blank');
      if (printWin) {
        printWin.focus();
      } else {
        window.location.href = blobUrl;
      }
      setToastMessage(`Sequential GRN: ${committedNum} generated for Print`);
      setTimeout(() => setToastMessage(null), 3000);
      setGrnNumber(peekNextGRNNumber());
    } catch (err) {
      console.error('Print error:', err);
      handleDownloadPDF();
    }
  };

  const handleSharePDF = async () => {
    try {
      const committedNum = commitGRNSequence(currentOptions);
      const opts = { ...currentOptions, grnNumber: committedNum };
      const { doc, safeFileName } = buildGRNPdfDoc(opts);
      const blob = doc.output('blob');
      const file = new File([blob], safeFileName, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `RSB GRN - ${committedNum}`,
          text: `Official Goods Receipt Note: ${committedNum} from ${vendorName}`,
          files: [file],
        });
        setToastMessage(`GRN ${committedNum} shared successfully!`);
      } else if (navigator.share) {
        await navigator.share({
          title: `RSB GRN - ${committedNum}`,
          text: `Official Goods Receipt Note: ${committedNum} from ${vendorName}`,
        });
        handleDownloadPDF();
      } else {
        handleDirectPrint();
      }
      setGrnNumber(peekNextGRNNumber());
    } catch (err) {
      console.log('Share canceled or not available:', err);
    }
  };

  const handleEditSequence = () => {
    const parsed = parseGRNNumber(grnNumber);
    const currentSeq = parsed?.sequence || getCurrentGRNSequence();
    const input = prompt(
      `Enter Next GRN Serial Number:\n(Currently: ${currentSeq} -> ${grnNumber})\nEnter a number (e.g. 1 to start from GRN-RSB-${getGRNCurrentYear()}-0001):`,
      String(currentSeq)
    );
    if (input !== null) {
      const num = parseInt(input.trim(), 10);
      if (!isNaN(num) && num >= 1) {
        setNextGRNSequence(num);
        setGrnNumber(peekNextGRNNumber());
        setToastMessage(`Next GRN Serial set to #${String(num).padStart(4, '0')}`);
        setTimeout(() => setToastMessage(null), 3000);
      }
    }
  };

  const handleTogglePreview = () => {
    if (!isPreviewOpen) {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
      const url = createGRNPdfBlobUrl(currentOptions);
      setPreviewBlobUrl(url);
      setIsPreviewOpen(true);
    } else {
      setIsPreviewOpen(false);
    }
  };

  const handleItemQtyChange = (index: number, newQty: number) => {
    setItems((prev) => {
      const next = [...prev];
      const validQty = Math.max(0, newQty);
      next[index] = {
        ...next[index],
        receivedQty: validQty,
        receivedQuantity: validQty,
      };
      return next;
    });
  };

  const totalOrdered = items.reduce((sum, it) => sum + (Number(it.orderedQty ?? it.poQuantity) || 0), 0);
  const totalReceived = items.reduce((sum, it) => sum + (Number(it.receivedQty ?? it.receivedQuantity) || 0), 0);
  const totalShortage = items.reduce((sum, it) => {
    const ord = Number(it.orderedQty ?? it.poQuantity) || 0;
    const rec = Number(it.receivedQty ?? it.receivedQuantity) || 0;
    return sum + Math.max(0, ord - rec);
  }, 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="📄 Goods Receipt Note (GRN / सामग्री आवक पावती)"
      subtitle="Generate official RSB Goods Receipt Note PDF for vendor delivery consignments"
      maxWidth="5xl"
      theme="light"
    >
      <div className="space-y-4 text-slate-800">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center justify-between animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{toastMessage}</span>
            </div>
            <button type="button" onClick={() => setToastMessage(null)} className="text-emerald-700 hover:text-emerald-950 font-bold">
              ✕
            </button>
          </div>
        )}

        {/* 1. Header Details Grid */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Vendor & Receiving Consignment Details
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Serial:
                </span>
                <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-200 shadow-2xs">
                  {grnNumber}
                </span>
              </div>
              <button
                type="button"
                onClick={handleEditSequence}
                className="px-2 py-0.5 rounded-md bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-[10px] font-bold border border-slate-300 transition-colors cursor-pointer shadow-2xs"
                title="Adjust sequential numbering counter"
              >
                ⚙️ Adjust #
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Vendor Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Vendor / Supplier *</label>
              <input
                type="text"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="e.g. Manav Metal"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold text-xs outline-none focus:border-blue-600 shadow-2xs"
              />
            </div>

            {/* PO Number */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Purchase Order (PO #) *</label>
              <input
                type="text"
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="e.g. PO-RSB-2026-073"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono font-bold text-xs outline-none focus:border-blue-600 shadow-2xs"
              />
            </div>

            {/* Delivery Challan / Invoice */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Vendor Challan / Inv # *</label>
              <input
                type="text"
                value={challanNumber}
                onChange={(e) => setChallanNumber(e.target.value)}
                placeholder="e.g. DC-8849 / INV-9241"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold text-xs outline-none focus:border-blue-600 shadow-2xs"
              />
            </div>

            {/* Challan Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Challan Date</label>
              <input
                type="date"
                value={challanDate}
                onChange={(e) => setChallanDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-blue-600 shadow-2xs"
              />
            </div>

            {/* Receipt Date */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Receipt Date</label>
              <input
                type="date"
                value={grnDate}
                onChange={(e) => setGrnDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 text-xs outline-none focus:border-blue-600 shadow-2xs"
              />
            </div>

            {/* Target Project */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Project Name</label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. Cadila Pharma Line"
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold text-xs outline-none focus:border-blue-600 shadow-2xs"
              />
            </div>

            {/* Store Receiver */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Received By (Stores)</label>
              <input
                type="text"
                value={receivedBy}
                onChange={(e) => setReceivedBy(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-bold text-xs outline-none focus:border-blue-600 shadow-2xs"
              />
            </div>

            {/* Receiving Time */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">Gate Entry Time</label>
              <input
                type="text"
                value={receivingTime}
                onChange={(e) => setReceivingTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-slate-900 font-mono text-xs outline-none focus:border-blue-600 shadow-2xs"
              />
            </div>
          </div>
        </div>

        {/* 2. Received Items Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>Consignment Items ({items.length})</span>
            </span>
            <div className="flex items-center gap-2 text-xs font-bold">
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                Ordered: {totalOrdered}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                Arrived: {totalReceived}
              </span>
              {totalShortage > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                  Shortage: {totalShortage}
                </span>
              )}
            </div>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden max-h-56 overflow-y-auto bg-white shadow-2xs">
            <table className="w-full text-left text-xs text-slate-800">
              <thead className="bg-slate-100 text-[11px] font-black uppercase tracking-wider text-slate-700 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="px-3 py-2 w-10 text-center">#</th>
                  <th className="px-3 py-2">Material Description</th>
                  <th className="px-3 py-2">Size Specification</th>
                  <th className="px-3 py-2 w-20 text-center">Ordered</th>
                  <th className="px-3 py-2 w-24 text-center">Arrived</th>
                  <th className="px-3 py-2 w-20 text-center">Shortage</th>
                  <th className="px-3 py-2 w-16">Unit</th>
                  <th className="px-3 py-2 w-24">QC Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                      No items currently selected for this GRN.
                    </td>
                  </tr>
                ) : (
                  items.map((it, idx) => {
                    const ord = Number(it.orderedQty ?? it.poQuantity) || 0;
                    const rec = Number(it.receivedQty ?? it.receivedQuantity) || 0;
                    const shortage = Math.max(0, ord - rec);
                    const spec = it.sizeSpecs || it.sizeSpecification || '-';
                    const qc = it.qcStatus || it.qualityStatus || 'Accepted';

                    return (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-center font-mono font-bold text-slate-500">
                          {it.srNo || idx + 1}
                        </td>
                        <td className="px-3 py-2 font-bold text-slate-900">{it.description}</td>
                        <td className="px-3 py-2 font-mono text-slate-800">{spec}</td>
                        <td className="px-3 py-2 text-center font-mono">{ord}</td>
                        <td className="px-3 py-2 text-center">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={rec}
                            onChange={(e) => handleItemQtyChange(idx, parseFloat(e.target.value) || 0)}
                            className="w-16 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-300 text-emerald-800 font-bold font-mono text-center text-xs outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="px-3 py-2 text-center font-mono font-bold">
                          {shortage > 0 ? (
                            <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                              {shortage}
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-500">{it.unit || 'Nos'}</td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            {it.qcStatus || 'Accepted'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Remarks (Optional) */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
          <label className="block text-xs font-bold text-slate-800">
            Remarks (Optional)
          </label>
          <input
            type="text"
            value={qcRemarks}
            onChange={(e) => setQcRemarks(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs text-slate-800 outline-none focus:border-blue-600 shadow-2xs"
            placeholder="e.g. Sound condition, verified against challan (optional)"
          />
        </div>

        {/* 4. Live PDF Preview Box (if toggled) */}
        {isPreviewOpen && previewBlobUrl && (
          <div className="border border-slate-300 rounded-2xl overflow-hidden shadow-lg animate-fadeIn">
            <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between text-xs">
              <span className="font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Live PDF Document Preview (RSB Goods Receipt Note)</span>
              </span>
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="text-slate-400 hover:text-white cursor-pointer font-bold"
              >
                ✕ Close Preview
              </button>
            </div>
            <iframe
              src={previewBlobUrl}
              title="GRN PDF Preview"
              className="w-full h-96 bg-slate-100"
            />
          </div>
        )}

        {/* 5. Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-200">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Official RSB Manufacturing Industry standard compliant format (GSTIN & 2-tier Signatures).</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
            <button
              type="button"
              onClick={handleTogglePreview}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
            >
              <Eye className="w-3.5 h-3.5 text-slate-600" />
              <span>{isPreviewOpen ? 'Hide' : '👀 Preview'}</span>
            </button>

            <button
              type="button"
              onClick={handleDirectPrint}
              className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs active:scale-95"
              title="Print directly or open full PDF viewer on phone"
            >
              <Printer className="w-3.5 h-3.5 text-blue-600" />
              <span>🖨️ Print / Open</span>
            </button>

            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                type="button"
                onClick={handleSharePDF}
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs active:scale-95"
                title="Share directly via WhatsApp, AirDrop, or Print App"
              >
                <Share2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>📱 WhatsApp / Share</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadPDF}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
            >
              <Download className="w-4 h-4 text-emerald-200" />
              <span>📥 Download PDF</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};
