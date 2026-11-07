import React, { useRef } from 'react';
import { Printer, Download, X, Building2, CheckCircle2 } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatINR, formatDateIndian, convertNumberToWordsINR } from '../../utils/accountsCalculations';
import { useAccounts } from '../../context/AccountsContext';

export type PrintableDocType =
  | 'tax_invoice'
  | 'proforma_invoice'
  | 'purchase_order'
  | 'payment_receipt'
  | 'vendor_payment_voucher'
  | 'expense_voucher'
  | 'journal_voucher';

export interface PrintableDocumentData {
  type: PrintableDocType;
  title: string;
  docNumber: string;
  date: string;
  dueDate?: string;
  partyName: string;
  partyGstin?: string;
  partyAddress?: string;
  partyPhone?: string;
  poNumber?: string;
  projectName?: string;
  items?: {
    srNo: number;
    description: string;
    hsnSac?: string;
    qty: number;
    unit: string;
    rate: number;
    taxableAmount: number;
    gstRate?: number;
    totalAmount: number;
  }[];
  subtotal?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  grandTotal: number;
  amountInWords?: string;
  paymentMode?: string;
  transactionRef?: string;
  bankDetails?: {
    bankName: string;
    accountNo: string;
    ifsc: string;
    branch: string;
  };
  notes?: string;
  terms?: string;
  signatoryName?: string;
  signatoryDesignation?: string;
}

interface PrintableDocumentModalProps {
  data: PrintableDocumentData | null;
  onClose: () => void;
}

export const PrintableDocumentModal: React.FC<PrintableDocumentModalProps> = ({ data, onClose }) => {
  const { companyProfile } = useAccounts();
  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!data) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!printAreaRef.current) return;
    try {
      const canvas = await html2canvas(printAreaRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${data.docNumber || 'Document'}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      window.print();
    }
  };

  const words = data.amountInWords || convertNumberToWordsINR(data.grandTotal);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] flex flex-col border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Top Actions Bar */}
        <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50 rounded-t-2xl no-print">
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700">
              {data.title} Preview
            </span>
            <span className="font-mono text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
              {data.docNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600" />
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadPDF}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-black text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100 flex justify-center">
          {/* Official A4 Sheet (210mm x 297mm styled container) */}
          <div
            ref={printAreaRef}
            className="w-full max-w-[800px] bg-white p-8 sm:p-10 shadow-md border border-slate-200 text-slate-900 font-sans printable-invoice"
            style={{ minHeight: '1050px' }}
          >
            {/* Header: Company Info & Document Badge */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
              <div className="space-y-1 max-w-[460px]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-slate-900 text-white font-black text-base flex items-center justify-center">
                    RSB
                  </div>
                  <div>
                    <h1 className="text-lg font-black tracking-tight text-slate-950 uppercase">
                      {companyProfile.legalTradeName}
                    </h1>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      Industrial Machinery & Automation Systems
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-slate-600 leading-snug pt-1">
                  {companyProfile.addressLine1}, {companyProfile.addressLine2}, {companyProfile.city}, {companyProfile.state} - {companyProfile.pincode}
                </p>
                <div className="text-[10px] text-slate-600 font-mono space-x-3 pt-0.5">
                  <span>GSTIN: <strong>{companyProfile.gstin}</strong></span>
                  <span>• PAN: <strong>{companyProfile.pan}</strong></span>
                  <span>• State Code: <strong>{companyProfile.stateCode}</strong></span>
                </div>
                <p className="text-[10px] text-slate-500">
                  Tel: {companyProfile.phone} • Email: {companyProfile.email}
                </p>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded">
                  {data.title}
                </span>
                <div className="mt-2 space-y-0.5 text-xs">
                  <div className="font-mono font-bold text-sm text-slate-950">{data.docNumber}</div>
                  <div className="text-slate-600 text-[11px]">Date: <strong>{formatDateIndian(data.date)}</strong></div>
                  {data.dueDate && (
                    <div className="text-slate-600 text-[11px]">Due Date: <strong>{formatDateIndian(data.dueDate)}</strong></div>
                  )}
                  {data.poNumber && (
                    <div className="text-slate-600 text-[11px]">PO Ref: <strong className="font-mono">{data.poNumber}</strong></div>
                  )}
                </div>
              </div>
            </div>

            {/* Bill To / Party Details */}
            <div className="grid grid-cols-2 gap-6 py-4 border-b border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  {data.type.includes('purchase') || data.type.includes('vendor') ? 'Vendor / Supplier Details' : 'Customer / Bill To'}
                </span>
                <h3 className="font-bold text-slate-950 text-sm">{data.partyName}</h3>
                {data.partyAddress && (
                  <p className="text-slate-600 text-[11px] mt-0.5 whitespace-pre-line leading-relaxed">
                    {data.partyAddress}
                  </p>
                )}
                {data.partyGstin && (
                  <p className="font-mono text-[11px] text-slate-700 mt-1">
                    GSTIN: <strong>{data.partyGstin}</strong>
                  </p>
                )}
                {data.partyPhone && (
                  <p className="text-[11px] text-slate-600">Phone: {data.partyPhone}</p>
                )}
              </div>

              <div className="text-right space-y-1">
                {data.projectName && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Project Reference:</span>
                    <strong className="text-slate-900 text-xs">{data.projectName}</strong>
                  </div>
                )}
                {data.paymentMode && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment Mode:</span>
                    <span className="text-slate-800 text-xs font-semibold">{data.paymentMode}</span>
                  </div>
                )}
                {data.transactionRef && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Reference / UTR:</span>
                    <span className="font-mono text-slate-800 text-xs font-bold">{data.transactionRef}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Items Table */}
            {data.items && data.items.length > 0 ? (
              <div className="py-4">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-900 text-slate-800 font-extrabold uppercase text-[10px] tracking-wider">
                      <th className="py-2 px-2 text-center w-10">Sr</th>
                      <th className="py-2 px-3">Item Description</th>
                      <th className="py-2 px-2 text-center w-16">HSN/SAC</th>
                      <th className="py-2 px-2 text-center w-16">Qty</th>
                      <th className="py-2 px-2 text-right w-24">Rate (₹)</th>
                      <th className="py-2 px-3 text-right w-28">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {data.items.map((item, idx) => (
                      <tr key={idx} className="align-top">
                        <td className="py-2.5 px-2 text-center text-slate-500 font-mono text-[11px]">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900 leading-snug">
                          {item.description}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-slate-600 text-[11px]">
                          {item.hsnSac || '8422'}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono text-slate-900 font-bold whitespace-nowrap">
                          {item.qty} {item.unit}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono text-slate-800">
                          {item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-950">
                          {item.taxableAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {/* Calculations & Total Summary Block */}
            <div className="border-t-2 border-slate-900 pt-3 flex justify-between items-start text-xs">
              {/* Left Side: Amount in Words & Bank Details */}
              <div className="space-y-3 max-w-[420px]">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                    Amount in Words (INR):
                  </span>
                  <p className="font-semibold text-slate-900 capitalize text-xs leading-relaxed bg-slate-50 p-2 rounded border border-slate-200">
                    {words}
                  </p>
                </div>

                {/* Bank Payment Details */}
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    RSB Bank Remittance Details:
                  </span>
                  <div>Bank Name: <strong>{companyProfile.defaultBankAccountId ? 'HDFC Bank Limited' : 'HDFC Bank Limited'}</strong></div>
                  <div>Account Number: <strong className="font-mono">50200012345678</strong></div>
                  <div>IFSC Code: <strong className="font-mono">HDFC0000287</strong> • Branch: <strong>Vatva GIDC, Ahmedabad</strong></div>
                </div>
              </div>

              {/* Right Side: Totals Breakup */}
              <div className="w-64 space-y-1.5 text-xs">
                {data.subtotal !== undefined && (
                  <div className="flex justify-between py-1 text-slate-600">
                    <span>Taxable Amount:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatINR(data.subtotal)}
                    </span>
                  </div>
                )}
                {data.cgstAmount !== undefined && data.cgstAmount > 0 && (
                  <div className="flex justify-between py-0.5 text-slate-600">
                    <span>CGST (9%):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatINR(data.cgstAmount)}
                    </span>
                  </div>
                )}
                {data.sgstAmount !== undefined && data.sgstAmount > 0 && (
                  <div className="flex justify-between py-0.5 text-slate-600">
                    <span>SGST (9%):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatINR(data.sgstAmount)}
                    </span>
                  </div>
                )}
                {data.igstAmount !== undefined && data.igstAmount > 0 && (
                  <div className="flex justify-between py-0.5 text-slate-600">
                    <span>IGST (18%):</span>
                    <span className="font-mono font-bold text-slate-900">
                      {formatINR(data.igstAmount)}
                    </span>
                  </div>
                )}

                <div className="border-t-2 border-slate-900 pt-2 flex justify-between items-baseline text-sm">
                  <strong className="text-slate-950 uppercase tracking-tight">Grand Total:</strong>
                  <strong className="font-mono text-base font-black text-slate-950">
                    {formatINR(data.grandTotal)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Terms and Signatures */}
            <div className="mt-8 pt-4 border-t border-slate-200 grid grid-cols-2 gap-6 text-[11px] text-slate-600">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Terms & Conditions:
                </span>
                <p className="leading-relaxed">
                  {data.terms || 'Payment as per decided milestones. Machinery dispatch subject to 100% payment realization. Subject to Ahmedabad jurisdiction.'}
                </p>
              </div>

              <div className="text-right flex flex-col justify-between items-end">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  For {companyProfile.companyName}
                </span>

                <div className="pt-10">
                  <div className="border-t border-slate-900 w-44 text-center pt-1 font-bold text-slate-900 text-xs">
                    {companyProfile.authorizedSignatoryName}
                  </div>
                  <div className="text-[10px] text-slate-500 text-center">
                    {companyProfile.authorizedSignatoryDesignation}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

