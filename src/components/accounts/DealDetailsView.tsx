import React, { useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  CreditCard,
  Download,
  FileText,
  Plus,
  Archive,
  ArchiveRestore,
  AlertCircle,
  CheckCircle2,
  Clock,
  Trash2,
  Upload,
  Eye,
  Building2,
  Lock,
  Unlock,
  ShieldCheck,
  Printer,
  ShieldAlert,
} from 'lucide-react';
import { useAccounts } from '../../context/AccountsContext';
import { useERP } from '../../context/ERPContext';
import { AccountDealDocument, DealStatus } from '../../types/accounts';
import { formatINR, formatDateIndian } from '../../utils/accountsCalculations';
import { AddPaymentModal } from './AddPaymentModal';
import { DocumentPreviewModal } from './DocumentPreviewModal';

interface DealDetailsViewProps {
  dealId: string;
  onBack: () => void;
}

export const DealDetailsView: React.FC<DealDetailsViewProps> = ({ dealId, onBack }) => {
  const { currentUser } = useERP();
  const {
    getDealById,
    getCompanyById,
    getPaymentsForDeal,
    getDocumentsForDeal,
    archiveDeal,
    unarchiveDeal,
    deletePayment,
    uploadDealDocument,
    removeDealDocument,
    exportCurrentDealPDF,
    exportPaymentHistoryExcel,
    setDispatchClearance,
    exportPaymentReceipt,
  } = useAccounts();

  const deal = getDealById(dealId);
  const company = deal ? getCompanyById(deal.companyId) : undefined;
  const payments = deal ? getPaymentsForDeal(dealId) : [];
  const documents = deal ? getDocumentsForDeal(dealId) : [];

  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [selectedPreviewDoc, setSelectedPreviewDoc] = useState<AccountDealDocument | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  if (!deal) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center space-y-3">
        <p className="text-sm font-semibold text-slate-700">Deal record not found.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold cursor-pointer"
        >
          Back to Deals List
        </button>
      </div>
    );
  }

  // Payment Progress Calculation
  const progressPercent =
    deal.decidedAmount > 0
      ? Math.min(100, Math.round((deal.totalReceived / deal.decidedAmount) * 100))
      : 0;

  const renderStatus = (status: DealStatus) => {
    if (status === 'fully_paid') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          Fully Paid
        </span>
      );
    }
    if (status === 'overdue') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
          Payment Overdue
        </span>
      );
    }
    if (status === 'partially_received') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          Partially Paid
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        Awaiting Advance
      </span>
    );
  };

  // Direct Document Upload
  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsUploadingDoc(true);
    try {
      for (const file of Array.from(files)) {
        await uploadDealDocument(deal.id, file, 'deal_sheet');
      }
    } catch (err) {
      console.error('Failed to upload document:', err);
    } finally {
      setIsUploadingDoc(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition-colors cursor-pointer shadow-xs"
            title="Back to Deals"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {deal.companyName}
              </h1>
              {renderStatus(deal.status)}
              {deal.isArchived && (
                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-xs font-medium">
                  Archived
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Deal ID: <span className="font-mono font-semibold text-slate-700">{deal.dealNumber}</span> • Deal Date: {formatDateIndian(deal.dealDate)}
            </p>
          </div>
        </div>

        {/* Clear Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => exportCurrentDealPDF(deal.id)}
            className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export PDF</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddPaymentOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Payment</span>
          </button>

          {deal.isArchived ? (
            <button
              type="button"
              onClick={() => unarchiveDeal(deal.id)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <ArchiveRestore className="w-3.5 h-3.5" />
              <span>Unarchive</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => archiveDeal(deal.id)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archive</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Deal Amount */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
          <p className="text-xs font-medium text-slate-500">Total Deal Amount</p>
          <p className="text-xl font-bold text-slate-900 font-mono">
            {formatINR(deal.decidedAmount)}
          </p>
          <p className="text-[11px] text-slate-400">
            {deal.gstInclusive ? 'GST Inclusive' : 'GST Exclusive'}
          </p>
        </div>

        {/* Advance Payment */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
          <p className="text-xs font-medium text-slate-500">Advance Payment</p>
          <p className="text-xl font-bold text-slate-900 font-mono">
            {formatINR(deal.advanceAmount)}
          </p>
          <p className="text-[11px] text-slate-400">Initial booking advance</p>
        </div>

        {/* Money Received */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
          <p className="text-xs font-medium text-emerald-700">Money Received</p>
          <p className="text-xl font-bold text-emerald-600 font-mono">
            {formatINR(deal.totalReceived)}
          </p>
          <p className="text-[11px] text-slate-400">Advance + payments received</p>
        </div>

        {/* Pending Amount */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-1">
          <p className="text-xs font-medium text-amber-700">Pending Amount</p>
          <p className={`text-xl font-bold font-mono ${
            deal.remainingBalance > 0 ? 'text-amber-600' : 'text-slate-800'
          }`}>
            {formatINR(deal.remainingBalance)}
          </p>
          <p className="text-[11px] text-slate-400">
            {deal.remainingBalance <= 0 ? 'Fully cleared' : 'Balance to be collected'}
          </p>
        </div>
      </div>

      {/* Simple Payment Progress Bar */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-700">Payment Progress:</span>
          <span className="font-mono font-bold text-emerald-700">
            {progressPercent}% Received ({formatINR(deal.totalReceived)} of {formatINR(deal.decidedAmount)})
          </span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* 🛡️ DISPATCH GATE PASS CLEARANCE (FINANCIAL GATEKEEPER) */}
      <div
        className={`p-4 rounded-xl border shadow-xs transition-all ${
          deal.dispatchClearance === 'cleared'
            ? 'bg-emerald-50/70 border-emerald-300'
            : deal.dispatchClearance === 'director_approved'
            ? 'bg-purple-50/70 border-purple-300'
            : 'bg-rose-50/70 border-rose-300'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                deal.dispatchClearance === 'cleared'
                  ? 'bg-emerald-600 text-white'
                  : deal.dispatchClearance === 'director_approved'
                  ? 'bg-purple-700 text-white'
                  : 'bg-rose-600 text-white'
              }`}
            >
              {deal.dispatchClearance === 'cleared' ? (
                <ShieldCheck className="w-5 h-5" />
              ) : deal.dispatchClearance === 'director_approved' ? (
                <Unlock className="w-5 h-5" />
              ) : (
                <Lock className="w-5 h-5" />
              )}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                  Dispatch Gate Pass Clearance
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-2xs ${
                    deal.dispatchClearance === 'cleared'
                      ? 'bg-emerald-700 text-white'
                      : deal.dispatchClearance === 'director_approved'
                      ? 'bg-purple-800 text-white'
                      : 'bg-rose-700 text-white'
                  }`}
                >
                  {deal.dispatchClearance === 'cleared'
                    ? '✓ Cleared for Dispatch'
                    : deal.dispatchClearance === 'director_approved'
                    ? '👑 Director Approved'
                    : '🔒 Gate Pass Locked'}
                </span>
              </div>

              <p className="text-xs text-slate-700">
                {deal.dispatchClearance === 'cleared' ? (
                  <>
                    <strong className="text-emerald-900">Approved for Dispatch:</strong> Machinery and materials can be issued on factory Outward Gate Pass. Cleared by <strong>{deal.dispatchClearedBy || 'Accounts'}</strong> on {formatDateIndian(deal.dispatchClearedAt)}.
                  </>
                ) : deal.dispatchClearance === 'director_approved' ? (
                  <>
                    <strong className="text-purple-900">Director Special Approval:</strong> Management credit authorization granted by <strong>{deal.dispatchClearedBy || 'Director'}</strong> on {formatDateIndian(deal.dispatchClearedAt)}.
                  </>
                ) : (
                  <>
                    <strong className="text-rose-900">Dispatch Gate Pass is Locked:</strong> Pending collection of {formatINR(deal.remainingBalance)}. Factory gate/stores team cannot generate Outward Gate Pass until Accounts clears payment.
                  </>
                )}
              </p>
              {deal.dispatchClearanceRemarks && (
                <p className="text-[11px] text-slate-500 italic">
                  Note: {deal.dispatchClearanceRemarks}
                </p>
              )}
            </div>
          </div>

          {/* Gatekeeper Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
            {deal.dispatchClearance === 'cleared' || deal.dispatchClearance === 'director_approved' ? (
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      'Re-lock dispatch gate pass for this company? Factory team will not be able to generate outward gate passes.'
                    )
                  ) {
                    setDispatchClearance(deal.id, 'locked', 'Dispatch re-locked by Accounts');
                  }
                }}
                className="px-3 py-1.5 bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Re-lock Gate Pass</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const remarks = window.prompt(
                      'Enter clearance note (optional):',
                      'Payment verified in bank account. Cleared for dispatch.'
                    );
                    if (remarks !== null) {
                      setDispatchClearance(deal.id, 'cleared', remarks);
                    }
                  }}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Clear for Dispatch</span>
                </button>

                {currentUser?.role === 'super_admin' && (
                  <button
                    type="button"
                    onClick={() => {
                      const remarks = window.prompt(
                        'Director credit approval remarks:',
                        'Management authorized credit dispatch.'
                      );
                      if (remarks !== null) {
                        setDispatchClearance(deal.id, 'director_approved', remarks);
                      }
                    }}
                    className="px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Director Credit Approval</span>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Grid: Company Details & Agreed Payment Terms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Company Contact Details */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
            Company Contact Details
          </h2>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Company Name:</span>
              <span className="font-semibold text-slate-900">{deal.companyName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">GSTIN:</span>
              <span className="font-mono font-semibold text-slate-800">
                {deal.companyGstin || company?.gstin || 'Not Provided'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Contact Person:</span>
              <span className="text-slate-800">{deal.contactPerson || company?.contactPerson || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Phone:</span>
              <span className="text-slate-800 font-mono">{deal.companyPhone || company?.phone || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Address:</span>
              <span className="text-slate-800 text-right max-w-[240px]">
                {deal.companyAddress || company?.address || '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Agreed Payment Terms */}
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
            Agreed Payment Terms
          </h2>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Payment Terms:</span>
              <span className="font-semibold text-slate-900">{deal.paymentTerms}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Deal Date:</span>
              <span className="text-slate-800">{formatDateIndian(deal.dealDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Expected Payment Date:</span>
              <span className="font-semibold text-slate-800">
                {formatDateIndian(deal.expectedPaymentDate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tax Type:</span>
              <span className="text-slate-800">{deal.gstInclusive ? 'GST Inclusive' : 'GST Exclusive'}</span>
            </div>
            {deal.remarks && (
              <div className="pt-2 border-t border-slate-100 text-slate-600">
                <span className="text-slate-400 block text-[11px] mb-0.5">Remarks:</span>
                <p className="bg-slate-50 p-2 rounded border border-slate-200 text-xs">
                  {deal.remarks}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Deal Documents Section */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Deal Documents ({documents.length})
          </h2>

          <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors">
            <Upload className="w-3.5 h-3.5" />
            <span>{isUploadingDoc ? 'Uploading...' : 'Upload Document'}</span>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/jpg,application/pdf"
              onChange={handleDocUpload}
              className="hidden"
              disabled={isUploadingDoc}
            />
          </label>
        </div>

        {documents.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">
            No deal documents uploaded. Click <strong>Upload Document</strong> to attach signed deal sheet or agreement.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {documents.map((doc) => {
              const isPdf =
                doc.fileType.includes('pdf') ||
                doc.fileName.toLowerCase().endsWith('.pdf') ||
                doc.fileData.startsWith('data:application/pdf');

              return (
                <div
                  key={doc.id}
                  className="p-3 border border-slate-200 rounded-lg bg-slate-50 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className={`w-6 h-6 shrink-0 ${isPdf ? 'text-rose-600' : 'text-blue-600'}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate" title={doc.fileName}>
                        {doc.fileName}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {(doc.fileSize / 1024).toFixed(1)} KB • {formatDateIndian(doc.uploadedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedPreviewDoc(doc)}
                      className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded font-medium cursor-pointer"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDealDocument(doc.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                      title="Remove"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Payment History Section */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Payment History ({payments.length})
          </h2>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportPaymentHistoryExcel(deal.id)}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddPaymentOpen(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Payment</span>
            </button>
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400">
            No payments recorded yet. Click <strong>Add Payment</strong> to register a payment receipt.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3 font-mono">Reference / UTR</th>
                  <th className="py-2.5 px-3 text-right">Amount</th>
                  <th className="py-2.5 px-3 text-center">Proof Slip</th>
                  <th className="py-2.5 px-3 text-right">Receipt Voucher</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {formatDateIndian(p.paymentDate)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-900 font-medium">
                      <div className="flex items-center gap-1.5">
                        {p.isAdvance && (
                          <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded text-[10px] font-bold">
                            Advance
                          </span>
                        )}
                        <span>{p.remarks || (p.isAdvance ? 'Advance Payment' : 'Stage Payment')}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                      {p.paymentMode}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {p.transactionReference || '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                      {formatINR(p.amount)}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {p.paymentProofUrl ? (
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedPreviewDoc({
                              id: p.id,
                              dealId: deal.id,
                              fileName: p.paymentProofName || 'Payment Proof',
                              fileType: 'image/jpeg',
                              fileSize: 0,
                              fileData: p.paymentProofUrl!,
                              uploadedBy: p.createdBy,
                              uploadedAt: p.createdAt,
                            })
                          }
                          className="text-xs text-blue-600 hover:underline cursor-pointer"
                        >
                          View Slip
                        </button>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => exportPaymentReceipt(p.id)}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-800 hover:text-slate-950 rounded-lg font-bold text-[11px] inline-flex items-center gap-1.5 border border-slate-300 shadow-2xs transition-colors cursor-pointer"
                        title="Print Official Payment Receipt Voucher PDF"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Print Receipt</span>
                      </button>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Delete this payment transaction? Remaining balance will update automatically.')) {
                            deletePayment(p.id);
                          }
                        }}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                        title="Delete payment"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Payment Modal */}
      <AddPaymentModal
        deal={deal}
        isOpen={isAddPaymentOpen}
        onClose={() => setIsAddPaymentOpen(false)}
      />

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        document={selectedPreviewDoc}
        onClose={() => setSelectedPreviewDoc(null)}
      />
    </div>
  );
};
