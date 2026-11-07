import React, { useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Calendar,
  CreditCard,
  Download,
  FileText,
  Plus,
  Share2,
  Archive,
  ArchiveRestore,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Edit3,
  Trash2,
  Upload,
  Eye,
  ShieldCheck,
  IndianRupee,
} from 'lucide-react';
import { useAccounts } from '../../context/AccountsContext';
import { AccountDealDocument, DealStatus } from '../../types/accounts';
import { formatINR, formatDateIndian } from '../../utils/accountsCalculations';
import { AddPaymentModal } from './AddPaymentModal';
import { DocumentPreviewModal } from './DocumentPreviewModal';

interface DealDetailsViewProps {
  dealId: string;
  onBack: () => void;
}

export const DealDetailsView: React.FC<DealDetailsViewProps> = ({ dealId, onBack }) => {
  const {
    getDealById,
    getCompanyById,
    getPaymentsForDeal,
    getDocumentsForDeal,
    archiveDeal,
    unarchiveDeal,
    deleteDeal,
    deletePayment,
    uploadDealDocument,
    removeDealDocument,
    exportCurrentDealPDF,
    exportPaymentHistoryExcel,
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
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
        <p className="text-sm font-bold text-slate-700">Deal record not found or has been removed.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
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

  const statusConfig: Record<
    DealStatus,
    { label: string; bg: string; text: string; icon: React.ReactNode }
  > = {
    awaiting_advance: {
      label: 'Awaiting Advance',
      bg: 'bg-slate-100 border-slate-300',
      text: 'text-slate-700',
      icon: <Clock className="w-3.5 h-3.5 text-slate-500" />,
    },
    partially_received: {
      label: 'Partially Received',
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-800',
      icon: <Clock className="w-3.5 h-3.5 text-amber-600" />,
    },
    fully_paid: {
      label: 'Fully Paid & Cleared',
      bg: 'bg-emerald-50 border-emerald-200',
      text: 'text-emerald-800',
      icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
    },
    overdue: {
      label: 'Payment Overdue',
      bg: 'bg-rose-50 border-rose-300',
      text: 'text-rose-800',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />,
    },
  };

  const currentStatus = statusConfig[deal.status] || statusConfig.awaiting_advance;

  // Handle uploading new deal documents directly from details page
  const handleDirectDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
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
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Top Action Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-700 transition-colors cursor-pointer shadow-2xs"
            title="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                {deal.companyName}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border flex items-center gap-1.5 ${currentStatus.bg} ${currentStatus.text}`}>
                {currentStatus.icon}
                <span>{currentStatus.label}</span>
              </span>
              {deal.isArchived && (
                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md text-[10px] font-bold">
                  Archived
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Deal ID: <span className="font-mono font-bold text-slate-700">{deal.dealNumber}</span> • Deal Date: {formatDateIndian(deal.dealDate)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => exportCurrentDealPDF(deal.id)}
            className="px-3.5 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export Summary (PDF)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddPaymentOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-700/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Payment</span>
          </button>

          {deal.isArchived ? (
            <button
              type="button"
              onClick={() => unarchiveDeal(deal.id)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Restore from archive"
            >
              <ArchiveRestore className="w-4 h-4" />
              <span>Unarchive</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => archiveDeal(deal.id)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Archive deal"
            >
              <Archive className="w-4 h-4" />
              <span>Archive</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Decided Amount */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Final Decided Amount</p>
          <p className="text-xl font-extrabold text-slate-900 font-mono tracking-tight">
            {formatINR(deal.decidedAmount)}
          </p>
          <p className="text-[10px] text-slate-500">
            {deal.gstInclusive ? 'Includes applicable GST' : 'Excludes tax amount'}
          </p>
        </div>

        {/* Advance Received */}
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-1">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Advance Received</p>
          <p className="text-xl font-extrabold text-blue-900 font-mono tracking-tight">
            {formatINR(deal.advanceAmount)}
          </p>
          <p className="text-[10px] text-slate-500">
            {deal.decidedAmount > 0
              ? `${Math.round((deal.advanceAmount / deal.decidedAmount) * 100)}% of total deal`
              : 'Initial advance'}
          </p>
        </div>

        {/* Total Amount Received */}
        <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl shadow-2xs space-y-1">
          <p className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider">Total Received</p>
          <p className="text-xl font-extrabold text-emerald-700 font-mono tracking-tight">
            {formatINR(deal.totalReceived)}
          </p>
          <p className="text-[10px] text-emerald-700 font-medium">
            Includes advance + {payments.length > 1 ? `${payments.length - 1} stage payments` : 'no further payments'}
          </p>
        </div>

        {/* Remaining Balance */}
        <div className={`p-4 rounded-2xl shadow-2xs space-y-1 border ${
          deal.remainingBalance > 0
            ? 'bg-amber-50/80 border-amber-200'
            : 'bg-slate-50 border-slate-200'
        }`}>
          <p className={`text-[11px] font-bold uppercase tracking-wider ${
            deal.remainingBalance > 0 ? 'text-amber-800' : 'text-slate-500'
          }`}>
            Remaining Balance
          </p>
          <p className={`text-xl font-extrabold font-mono tracking-tight ${
            deal.remainingBalance > 0 ? 'text-amber-700' : 'text-slate-800'
          }`}>
            {formatINR(deal.remainingBalance)}
          </p>
          <p className="text-[10px] text-slate-500">
            {deal.remainingBalance <= 0 ? 'Fully settled & cleared' : 'Payment pending from client'}
          </p>
        </div>
      </div>

      {/* Payment Progress Bar */}
      <div className="p-4.5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900">Payment Progress:</span>
            <span className="font-mono font-extrabold text-emerald-700 text-sm">
              {progressPercent}% Received
            </span>
          </div>
          <div className="text-slate-500 text-xs font-mono">
            <strong>{formatINR(deal.totalReceived)}</strong> received out of <strong>{formatINR(deal.decidedAmount)}</strong>
          </div>
        </div>

        {/* Visual Progress Track */}
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
          <div
            className={`h-full transition-all duration-500 ${
              progressPercent >= 100
                ? 'bg-emerald-500'
                : progressPercent > 0
                ? 'bg-emerald-500'
                : 'bg-slate-300'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Grid: Company Details & Payment Terms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Company Info Card */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
            <Building2 className="w-4 h-4 text-slate-600" />
            <span>Company Information</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Company Name:</span>
              <span className="font-bold text-slate-900">{deal.companyName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">GSTIN:</span>
              <span className="font-mono font-bold text-slate-800">
                {deal.companyGstin || company?.gstin || 'Not Provided'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Contact Person:</span>
              <span className="font-medium text-slate-800">
                {deal.contactPerson || company?.contactPerson || '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Phone:</span>
              <span className="font-medium text-slate-800 font-mono">
                {deal.companyPhone || company?.phone || '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Address:</span>
              <span className="font-medium text-slate-800 text-right max-w-[240px]">
                {deal.companyAddress || company?.address || '-'}
              </span>
            </div>
          </div>
        </div>

        {/* Agreed Terms & Timeline Card */}
        <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-xs uppercase tracking-wider border-b border-slate-100 pb-2">
            <Calendar className="w-4 h-4 text-slate-600" />
            <span>Agreed Payment Terms & Timeline</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Agreed Payment Terms:</span>
              <span className="font-bold text-slate-900">{deal.paymentTerms}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Deal Date:</span>
              <span className="font-medium text-slate-800">{formatDateIndian(deal.dealDate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Expected Payment Date:</span>
              <span className="font-bold text-slate-800">
                {formatDateIndian(deal.expectedPaymentDate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tax Specification:</span>
              <span className="font-semibold text-slate-800">
                {deal.gstInclusive ? 'GST Inclusive' : 'GST Exclusive'}
              </span>
            </div>
            {deal.remarks && (
              <div className="pt-1 text-slate-600 border-t border-slate-100 mt-2">
                <span className="text-[11px] font-bold text-slate-500 block mb-0.5">Remarks:</span>
                <p className="text-xs bg-slate-50 p-2 rounded-lg border border-slate-200">
                  {deal.remarks}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Final Deal Sheet & Documents Section */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Final Deal Sheet & Documents ({documents.length})
            </h3>
          </div>

          <label className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs">
            <Upload className="w-3.5 h-3.5 text-slate-600" />
            <span>{isUploadingDoc ? 'Uploading...' : '+ Attach Document'}</span>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/jpg,application/pdf"
              onChange={handleDirectDocUpload}
              className="hidden"
              disabled={isUploadingDoc}
            />
          </label>
        </div>

        {documents.length === 0 ? (
          <div className="p-6 text-center border-2 border-dashed border-slate-200 rounded-xl text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-700">No deal sheets uploaded yet.</p>
            <p>Attach a photo of the signed deal sheet or scanned PDF for permanent audit records.</p>
          </div>
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
                  className="p-3 border border-slate-200 rounded-xl bg-slate-50 hover:bg-white hover:border-slate-300 transition-all flex flex-col justify-between gap-2.5 shadow-2xs group"
                >
                  <div className="flex items-center gap-2.5">
                    {isPdf ? (
                      <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                    ) : (
                      <img
                        src={doc.fileData}
                        alt={doc.fileName}
                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate" title={doc.fileName}>
                        {doc.fileName}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {(doc.fileSize / 1024).toFixed(1)} KB • {formatDateIndian(doc.uploadedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-slate-200/60">
                    <button
                      type="button"
                      onClick={() => setSelectedPreviewDoc(doc)}
                      className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeDealDocument(doc.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove attachment"
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

      {/* Payment History Register Section */}
      <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Payment Transaction History ({payments.length})
            </h3>
            <p className="text-xs text-slate-500">
              Chronological log of every advance and stage installment received.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => exportPaymentHistoryExcel(deal.id)}
              className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddPaymentOpen(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Payment</span>
            </button>
          </div>
        </div>

        {payments.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500 font-medium bg-slate-50 rounded-xl border border-slate-200">
            No payments recorded yet. Click "Record Payment" to register the advance or clearance.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Description / Remarks</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3 font-mono">Ref / UTR</th>
                  <th className="py-2.5 px-3 text-right">Amount Received</th>
                  <th className="py-2.5 px-3 text-center">Proof</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-medium text-slate-800 whitespace-nowrap">
                      {formatDateIndian(p.paymentDate)}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      <div className="flex items-center gap-2">
                        {p.isAdvance && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[10px]">
                            Advance
                          </span>
                        )}
                        <span>{p.remarks || (p.isAdvance ? 'Advance Payment' : 'Stage Payment')}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700 whitespace-nowrap">
                      {p.paymentMode}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {p.transactionReference || '-'}
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-emerald-700 font-mono text-sm whitespace-nowrap">
                      {formatINR(p.amount)}
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
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
                          className="px-2 py-0.5 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors cursor-pointer"
                        >
                          View Slip
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this payment record? Balance will be recalculated.')) {
                            deletePayment(p.id);
                          }
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
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
