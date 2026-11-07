import React, { useState } from 'react';
import { X, CreditCard, Upload, CheckCircle2, AlertCircle, FileText, Image as ImageIcon } from 'lucide-react';
import { AccountDeal, PaymentMode } from '../../types/accounts';
import { useAccounts } from '../../context/AccountsContext';
import { formatINR } from '../../utils/accountsCalculations';

interface AddPaymentModalProps {
  deal: AccountDeal;
  isOpen: boolean;
  onClose: () => void;
}

export const AddPaymentModal: React.FC<AddPaymentModalProps> = ({ deal, isOpen, onClose }) => {
  const { addPayment } = useAccounts();

  const [paymentDate, setPaymentDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [amount, setAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('Bank Transfer');
  const [transactionReference, setTransactionReference] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => setProofPreview(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        setProofPreview(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numericAmount = Math.round(Number(amount) || 0);
    if (numericAmount <= 0) {
      setError('Please enter a valid payment amount greater than ₹0.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addPayment(
        {
          dealId: deal.id,
          paymentDate,
          amount: numericAmount,
          paymentMode,
          transactionReference: transactionReference.trim() || undefined,
          remarks: remarks.trim() || undefined,
          isAdvance: false,
        },
        proofFile
      );
      onClose();
    } catch (err: any) {
      console.error('Error recording payment:', err);
      setError(err?.message || 'Failed to save payment transaction. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const parsedAmount = Math.max(0, Math.round(Number(amount) || 0));
  const newTotalReceived = (deal.totalReceived || 0) + parsedAmount;
  const newBalance = Math.max(0, (deal.decidedAmount || 0) - newTotalReceived);
  const isOverpaying = newTotalReceived > deal.decidedAmount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Record New Payment</h3>
              <p className="text-xs text-slate-500">
                {deal.companyName} • <span className="font-mono font-semibold">{deal.dealNumber}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Balance Bar */}
        <div className="px-6 py-3 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-500">Total Decided: </span>
            <strong className="text-slate-800 font-semibold">{formatINR(deal.decidedAmount)}</strong>
          </div>
          <div>
            <span className="text-slate-500">Current Balance: </span>
            <strong className="text-amber-700 font-bold">{formatINR(deal.remainingBalance)}</strong>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Payment Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10 outline-none"
              />
            </div>

            {/* Payment Mode */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Payment Mode *
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10 outline-none cursor-pointer"
              >
                <option value="Bank Transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          {/* Amount Received */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Amount Received (₹) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                ₹
              </span>
              <input
                type="number"
                min="1"
                step="1"
                required
                placeholder="e.g. 100000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-8 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/10 outline-none"
              />
            </div>
          </div>

          {/* Realtime Calculation Strip */}
          {parsedAmount > 0 && (
            <div className={`p-3 rounded-xl border text-xs space-y-1 ${
              isOverpaying ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
            }`}>
              <div className="flex justify-between font-medium">
                <span>New Total Received:</span>
                <strong className="font-bold">{formatINR(newTotalReceived)}</strong>
              </div>
              <div className="flex justify-between font-medium">
                <span>Updated Pending Balance:</span>
                <strong className="font-bold">{formatINR(newBalance)}</strong>
              </div>
              {isOverpaying && (
                <p className="text-[11px] font-semibold text-amber-700 mt-1">
                  ⚠️ Note: Total received exceeds the decided deal amount by {formatINR(newTotalReceived - deal.decidedAmount)}.
                </p>
              )}
            </div>
          )}

          {/* Transaction Reference / UTR */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Transaction ID / Reference Number <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <input
              type="text"
              placeholder="e.g. UTR / IMPS-39201940 / Cheque #00412"
              value={transactionReference}
              onChange={(e) => setTransactionReference(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:border-emerald-600 outline-none font-mono"
            />
          </div>

          {/* Payment Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Payment Remarks <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Stage 2 fabrication clearance payment received via HDFC bank..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:border-emerald-600 outline-none"
            />
          </div>

          {/* Upload Payment Proof (Optional) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Upload Payment Proof / Bank Slip <span className="text-slate-400 font-normal lowercase">(optional)</span>
            </label>
            <div className="flex items-center gap-3">
              <label className="flex-1 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer bg-slate-50 hover:bg-emerald-50/30 transition-colors">
                <Upload className="w-4 h-4 text-slate-500" />
                <span className="text-xs font-medium text-slate-600">
                  {proofFile ? proofFile.name : 'Choose bank receipt / screenshot (JPG, PNG, PDF)'}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/jpg,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {proofFile && (
                <button
                  type="button"
                  onClick={() => {
                    setProofFile(null);
                    setProofPreview(null);
                  }}
                  className="px-2 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                >
                  Remove
                </button>
              )}
            </div>
            {proofPreview && (
              <div className="mt-2 w-20 h-20 rounded-lg overflow-hidden border border-slate-200 shadow-xs">
                <img src={proofPreview} alt="Receipt preview" className="w-full h-full object-cover" />
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md shadow-emerald-700/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving Payment...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Save Payment
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
