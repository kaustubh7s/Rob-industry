import React, { useState, useMemo } from 'react';
import {
  X,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Building2,
  Calendar,
  Trash2,
  FileText,
} from 'lucide-react';
import { useAccounts } from '../../context/AccountsContext';
import { formatINR, isValidGSTIN } from '../../utils/accountsCalculations';

interface NewDealModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDealCreated?: (dealId: string) => void;
}

interface UploadedFilePreview {
  file: File;
  previewUrl: string | null;
  isPdf: boolean;
}

export const NewDealModal: React.FC<NewDealModalProps> = ({ isOpen, onClose, onDealCreated }) => {
  const { createDeal, companies, checkDuplicateGstin, setActiveView } = useAccounts();

  // Section A: Company Details
  const [companyName, setCompanyName] = useState<string>('');
  const [gstin, setGstin] = useState<string>('');
  const [contactPerson, setContactPerson] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [address, setAddress] = useState<string>('');

  // Section B: Deal Documents
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFilePreview[]>([]);

  // Section C: Deal Amount
  const [decidedAmount, setDecidedAmount] = useState<string>('');
  const [advanceAmount, setAdvanceAmount] = useState<string>('');
  const [gstInclusive, setGstInclusive] = useState<boolean>(true);

  // Section D: Payment Terms
  const [paymentTermsOption, setPaymentTermsOption] = useState<string>(
    '30% Advance / 40% During Production / 30% Before Dispatch'
  );
  const [customPaymentTerms, setCustomPaymentTerms] = useState<string>('');
  const [dealDate, setDealDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expectedPaymentDate, setExpectedPaymentDate] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill existing company details when user chooses or types an existing company
  const handleCompanyNameSelect = (selectedName: string) => {
    setCompanyName(selectedName);
    const existing = companies.find(
      (c) => c.companyName.toLowerCase() === selectedName.trim().toLowerCase()
    );
    if (existing) {
      if (existing.gstin && !gstin) setGstin(existing.gstin);
      if (existing.contactPerson && !contactPerson) setContactPerson(existing.contactPerson);
      if (existing.phone && !phone) setPhone(existing.phone);
      if (existing.email && !email) setEmail(existing.email);
      if (existing.address && !address) setAddress(existing.address);
    }
  };

  // Duplicate GSTIN Warning check
  const duplicateGstinCompany = useMemo(() => {
    return checkDuplicateGstin(gstin);
  }, [gstin, checkDuplicateGstin]);

  // GSTIN validity check
  const isGstinValid = useMemo(() => {
    return isValidGSTIN(gstin);
  }, [gstin]);

  // Financial Calculations
  const numericDecided = Math.max(0, Math.round(Number(decidedAmount) || 0));
  const numericAdvance = Math.max(0, Math.round(Number(advanceAmount) || 0));
  const totalReceived = numericAdvance; // Advance is part of Money Received
  const remainingBalance = Math.max(0, numericDecided - totalReceived);
  const isOverpaying = numericAdvance > numericDecided && numericDecided > 0;

  if (!isOpen) return null;

  // File Handlers
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newEntries: UploadedFilePreview[] = [];
    Array.from(files).forEach((file) => {
      const isPdf = file.type.includes('pdf') || file.name.toLowerCase().endsWith('.pdf');
      if (file.type.startsWith('image/')) {
        const previewUrl = URL.createObjectURL(file);
        newEntries.push({ file, previewUrl, isPdf: false });
      } else {
        newEntries.push({ file, previewUrl: null, isPdf });
      }
    });

    setUploadedFiles((prev) => [...prev, ...newEntries]);
    e.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setUploadedFiles((prev) => {
      const target = prev[index];
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  // Submit Handler with double-click protection
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    if (!companyName.trim()) {
      setError('Please enter the Company Name.');
      return;
    }

    if (gstin.trim() && !isGstinValid) {
      setError('The GSTIN entered is invalid. Please check the 15-character Indian GST format (e.g. 27AABCA1234A1Z5) or leave it blank.');
      return;
    }

    if (numericDecided <= 0) {
      setError('Please enter a valid Total Deal Amount greater than ₹0.');
      return;
    }

    const finalTerms =
      paymentTermsOption === 'Custom Payment Terms'
        ? customPaymentTerms.trim() || 'Custom Terms'
        : paymentTermsOption;

    setIsSubmitting(true);
    try {
      const filesToUpload = uploadedFiles.map((u) => u.file);
      const createdDeal = await createDeal(
        {
          companyName: companyName.trim(),
          gstin: gstin.trim() || undefined,
          contactPerson: contactPerson.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          dealDate,
          decidedAmount: numericDecided,
          advanceAmount: numericAdvance,
          paymentTerms: finalTerms,
          expectedPaymentDate: expectedPaymentDate || undefined,
          gstInclusive,
          remarks: remarks.trim() || undefined,
        },
        filesToUpload
      );

      // Clean up object URLs
      uploadedFiles.forEach((u) => {
        if (u.previewUrl) URL.revokeObjectURL(u.previewUrl);
      });

      onClose();
      if (onDealCreated) {
        onDealCreated(createdDeal.id);
      } else {
        setActiveView('deal-details', createdDeal.id);
      }
    } catch (err: any) {
      console.error('Error creating deal:', err);
      setError(err?.message || 'Failed to save deal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Add New Deal</h2>
            <p className="text-xs text-slate-500">
              Record a new client deal, advance payment, and deal documents.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Section A: Company Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-1.5">
              1. Company Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Company Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  list="new-deal-company-list"
                  placeholder="e.g. Apex Engineering Solutions Pvt Ltd"
                  value={companyName}
                  onChange={(e) => handleCompanyNameSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:border-blue-600 outline-none"
                />
                <datalist id="new-deal-company-list">
                  {companies.map((c) => (
                    <option key={c.id} value={c.companyName}>
                      {c.gstin ? `GST: ${c.gstin}` : 'Company'}
                    </option>
                  ))}
                </datalist>
              </div>

              {/* Company GSTIN */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company GSTIN <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="e.g. 27AABCA1234A1Z5"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  className={`w-full px-3 py-2 bg-white border rounded-lg text-xs font-mono font-semibold uppercase outline-none ${
                    gstin && !isGstinValid
                      ? 'border-rose-400 text-rose-700'
                      : 'border-slate-300 text-slate-900 focus:border-blue-600'
                  }`}
                />
                {duplicateGstinCompany && (
                  <p className="mt-1 text-[11px] text-amber-700">
                    Note: GSTIN already exists for <strong>{duplicateGstinCompany.companyName}</strong>. Multiple deals can be created for the same company.
                  </p>
                )}
              </div>

              {/* Contact Person */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contact Person <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Suresh Patel"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:border-blue-600 outline-none"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98250 12345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:border-blue-600 outline-none"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company Address <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. GIDC Industrial Estate, Ahmedabad"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:border-blue-600 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section B: Deal Documents */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-1.5">
              2. Deal Documents
            </h3>

            <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-lg p-4 flex flex-col items-center justify-center gap-1.5 cursor-pointer bg-slate-50 hover:bg-blue-50/20 transition-colors">
              <Upload className="w-5 h-5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-700">
                Click or drag deal documents here
              </span>
              <span className="text-[11px] text-slate-400">
                Upload signed deal sheet, purchase agreement or photo (JPG, PNG, PDF)
              </span>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/jpg,application/pdf"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </label>

            {uploadedFiles.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {uploadedFiles.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded border border-slate-200 bg-white flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FileText className={`w-4 h-4 shrink-0 ${item.isPdf ? 'text-rose-600' : 'text-blue-600'}`} />
                      <span className="truncate font-medium text-slate-800">{item.file.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section C: Deal Amount */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                3. Deal Amount
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Tax:</span>
                <button
                  type="button"
                  onClick={() => setGstInclusive(!gstInclusive)}
                  className={`px-2 py-0.5 rounded text-xs font-semibold cursor-pointer border ${
                    gstInclusive
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {gstInclusive ? 'GST Inclusive' : 'GST Exclusive'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Total Deal Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Total Deal Amount (₹) *
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  placeholder="e.g. 1000000"
                  value={decidedAmount}
                  onChange={(e) => setDecidedAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:border-blue-600 outline-none"
                />
              </div>

              {/* Advance Payment */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Advance Payment (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g. 200000"
                  value={advanceAmount}
                  onChange={(e) => setAdvanceAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-900 focus:border-blue-600 outline-none"
                />
              </div>

              {/* Pending Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pending Amount (auto-calculated)
                </label>
                <div className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm font-bold text-slate-900">
                  {formatINR(remainingBalance)}
                </div>
              </div>
            </div>

            {isOverpaying && (
              <p className="text-xs text-amber-700 font-medium">
                Note: Advance payment exceeds the total deal amount.
              </p>
            )}
          </div>

          {/* Section D: Payment Terms */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-1.5">
              4. Payment Terms
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Payment Terms Dropdown */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Payment Terms *
                </label>
                <select
                  value={paymentTermsOption}
                  onChange={(e) => setPaymentTermsOption(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:border-blue-600 outline-none cursor-pointer"
                >
                  <option value="100% Advance">100% Advance</option>
                  <option value="50% Advance / 50% Before Dispatch">50% Advance / 50% Before Dispatch</option>
                  <option value="30% Advance / 40% During Production / 30% Before Dispatch">
                    30% Advance / 40% During Production / 30% Before Dispatch
                  </option>
                  <option value="Custom Payment Terms">Custom Payment Terms...</option>
                </select>

                {paymentTermsOption === 'Custom Payment Terms' && (
                  <input
                    type="text"
                    required
                    placeholder="Enter custom terms (e.g. 25% Advance, 75% Upon Delivery)"
                    value={customPaymentTerms}
                    onChange={(e) => setCustomPaymentTerms(e.target.value)}
                    className="w-full mt-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:border-blue-600 outline-none"
                  />
                )}
              </div>

              {/* Deal Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deal Date *
                </label>
                <input
                  type="date"
                  required
                  value={dealDate}
                  onChange={(e) => setDealDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:border-blue-600 outline-none"
                />
              </div>

              {/* Expected Balance Clearance Date */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Expected Payment Date <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="date"
                  value={expectedPaymentDate}
                  onChange={(e) => setExpectedPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:border-blue-600 outline-none"
                />
              </div>

              {/* Remarks */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Remarks / Notes <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Machine scope or order notes..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:border-blue-600 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? 'Saving Deal...' : 'Save Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
