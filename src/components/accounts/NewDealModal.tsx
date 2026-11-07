import React, { useState, useMemo } from 'react';
import {
  X,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Building2,
  IndianRupee,
  Calendar,
  CreditCard,
  Plus,
  Trash2,
  Eye,
  Image as ImageIcon,
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

  // Section B: Deal Sheet Attachments
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFilePreview[]>([]);

  // Section C: Deal Amount
  const [decidedAmount, setDecidedAmount] = useState<string>('');
  const [advanceAmount, setAdvanceAmount] = useState<string>('');
  const [gstInclusive, setGstInclusive] = useState<boolean>(true);

  // Section D: Payment Terms & Dates
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
  const totalReceived = numericAdvance; // Advance is the first received payment
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

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setError('Please enter a valid Final Decided Amount greater than ₹0.');
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-xs">
              <Plus className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Add New Company Deal</h2>
              <p className="text-xs text-slate-500">
                Record new client project deal, upload signed deal sheet, and register advance payment.
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* SECTION A: Company Details */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4.5 space-y-3.5">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <Building2 className="w-4 h-4 text-slate-700" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Section A • Company Details
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Company Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  list="existing-company-list"
                  placeholder="e.g. Apex Engineering Solutions Pvt Ltd"
                  value={companyName}
                  onChange={(e) => handleCompanyNameSelect(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none"
                />
                <datalist id="existing-company-list">
                  {companies.map((c) => (
                    <option key={c.id} value={c.companyName}>
                      {c.gstin ? `GST: ${c.gstin}` : 'Registered Company'}
                    </option>
                  ))}
                </datalist>
              </div>

              {/* Company GSTIN */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">
                    Company GSTIN <span className="text-slate-400 font-normal lowercase">(optional)</span>
                  </label>
                  {gstin && !isGstinValid && (
                    <span className="text-[10px] text-rose-600 font-bold">Invalid GST format</span>
                  )}
                  {gstin && isGstinValid && (
                    <span className="text-[10px] text-emerald-600 font-bold">Valid GSTIN</span>
                  )}
                </div>
                <input
                  type="text"
                  maxLength={15}
                  placeholder="e.g. 27AABCA1234A1Z5"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs font-mono font-bold uppercase outline-none ${
                    gstin && !isGstinValid
                      ? 'border-rose-400 text-rose-700 focus:border-rose-600'
                      : 'border-slate-300 text-slate-900 focus:border-slate-900'
                  }`}
                />

                {/* Duplicate GSTIN Warning */}
                {duplicateGstinCompany && (
                  <div className="mt-1.5 p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-1.5 text-[11px] text-amber-800">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Company with GSTIN <strong className="font-mono">{gstin}</strong> already exists as{' '}
                      <strong>{duplicateGstinCompany.companyName}</strong>. Multiple deals can be linked to this company.
                    </span>
                  </div>
                )}
              </div>

              {/* Contact Person */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Contact Person <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mr. Suresh Patel"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:border-slate-900 outline-none"
                />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Phone Number <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +91 98250 12345"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:border-slate-900 outline-none"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Company Address <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. GIDC Industrial Estate, Vatva, Ahmedabad"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:border-slate-900 outline-none"
                />
              </div>
            </div>
          </div>

          {/* SECTION B: Final Deal Sheet */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4.5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Section B • Final Deal Sheet
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                JPG, JPEG, PNG or PDF (Multi-attachment supported)
              </span>
            </div>

            {/* Upload Area */}
            <label className="border-2 border-dashed border-slate-300 hover:border-slate-700 bg-white hover:bg-slate-100/50 rounded-2xl p-5 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center group">
              <div className="w-11 h-11 rounded-full bg-slate-100 text-slate-700 group-hover:bg-slate-900 group-hover:text-white flex items-center justify-center transition-colors">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  Click or drag signed deal sheet here
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Upload signed final deal sheet, purchase agreement, or WhatsApp approval screenshot
                </p>
              </div>
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/jpg,application/pdf"
                onChange={handleFileInputChange}
                className="hidden"
              />
            </label>

            {/* Uploaded Files Preview Strip */}
            {uploadedFiles.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {uploadedFiles.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-2 shadow-2xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.isPdf ? (
                        <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                      ) : item.previewUrl ? (
                        <img
                          src={item.previewUrl}
                          alt="thumb"
                          className="w-9 h-9 rounded-lg object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {item.file.name}
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {(item.file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveFile(idx)}
                      className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      title="Remove file"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION C: Deal Amount & Advance */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4.5 space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <IndianRupee className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Section C • Deal Amount & Advance
                </h3>
              </div>
              {/* GST Inclusive / Exclusive Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-slate-600">Tax Type:</span>
                <button
                  type="button"
                  onClick={() => setGstInclusive(!gstInclusive)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                    gstInclusive
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-slate-200 text-slate-700 border-slate-300'
                  }`}
                >
                  {gstInclusive ? 'GST Inclusive' : 'GST Exclusive'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Final Decided Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Final Decided Amount *
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
                    placeholder="e.g. 1000000"
                    value={decidedAmount}
                    onChange={(e) => setDecidedAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none"
                  />
                </div>
              </div>

              {/* Advance Received */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Advance Received <span className="text-slate-400 font-normal lowercase">(₹)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="e.g. 200000"
                    value={advanceAmount}
                    onChange={(e) => setAdvanceAmount(e.target.value)}
                    className="w-full pl-8 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 outline-none"
                  />
                </div>
              </div>

              {/* Remaining Balance (Auto-Calculated) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Remaining Balance <span className="text-emerald-600 font-semibold lowercase">(auto-calculated)</span>
                </label>
                <div className="w-full px-3.5 py-2.5 bg-slate-200/80 border border-slate-300 rounded-xl text-sm font-black text-slate-900 flex items-center justify-between">
                  <span>{formatINR(remainingBalance)}</span>
                  {numericDecided > 0 && (
                    <span className="text-[11px] font-bold text-slate-600">
                      {Math.round((totalReceived / numericDecided) * 100)}% Recd
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Overpayment Warning */}
            {isOverpaying && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Advance amount ({formatINR(numericAdvance)}) exceeds the decided deal amount ({formatINR(numericDecided)}).
                </span>
              </div>
            )}
          </div>

          {/* SECTION D: Payment Terms & Dates */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4.5 space-y-3.5">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <Calendar className="w-4 h-4 text-slate-700" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Section D • Payment Terms & Dates
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Payment Terms Dropdown */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Terms *
                </label>
                <select
                  value={paymentTermsOption}
                  onChange={(e) => setPaymentTermsOption(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:border-slate-900 outline-none cursor-pointer"
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
                    placeholder="Enter custom agreed payment terms (e.g. 25% Advance, 50% Milestone, 25% 15 Days after Delivery)"
                    value={customPaymentTerms}
                    onChange={(e) => setCustomPaymentTerms(e.target.value)}
                    className="w-full mt-2 px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:border-slate-900 outline-none"
                  />
                )}
              </div>

              {/* Deal Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Deal Date *
                </label>
                <input
                  type="date"
                  required
                  value={dealDate}
                  onChange={(e) => setDealDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:border-slate-900 outline-none"
                />
              </div>

              {/* Expected Balance Clearance Date */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Expected Payment Date <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="date"
                  value={expectedPaymentDate}
                  onChange={(e) => setExpectedPaymentDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:border-slate-900 outline-none"
                />
              </div>

              {/* Remarks */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Remarks / Notes <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Machine scope, special dispatch instructions, or purchase order reference..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:border-slate-900 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Form Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving Deal...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Save Deal
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
