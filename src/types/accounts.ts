export interface AccountCompany {
  id: string;
  companyName: string;
  gstin?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
}

export type DealStatus = 'awaiting_advance' | 'partially_received' | 'fully_paid' | 'overdue';

export interface AccountDeal {
  id: string;
  dealNumber: string; // e.g. RSB-ACC-2026-001
  companyId: string;
  companyName: string;
  companyGstin?: string;
  companyPhone?: string;
  companyAddress?: string;
  contactPerson?: string;
  dealDate: string; // YYYY-MM-DD
  decidedAmount: number; // Final Decided Amount in INR
  advanceAmount: number; // Initial Advance Received
  totalReceived: number; // Total Received to date
  remainingBalance: number; // decidedAmount - totalReceived
  paymentTerms: string;
  expectedPaymentDate?: string; // YYYY-MM-DD
  gstInclusive: boolean;
  remarks?: string;
  status: DealStatus;
  isArchived: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export type PaymentMode = 'Cash' | 'Bank Transfer' | 'UPI' | 'Cheque' | 'Other';

export interface AccountPayment {
  id: string;
  dealId: string;
  paymentDate: string; // YYYY-MM-DD
  amount: number;
  paymentMode: PaymentMode;
  transactionReference?: string;
  remarks?: string;
  isAdvance?: boolean;
  paymentProofUrl?: string;
  paymentProofName?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export interface AccountDealDocument {
  id: string;
  dealId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  fileData: string; // Data URL for preview / storage
  uploadedBy: string;
  uploadedAt: string;
  category?: 'deal_sheet' | 'revised_agreement' | 'payment_proof' | 'other';
}

export interface AccountsDashboardSummary {
  totalDeals: number;
  totalDealValue: number;
  totalReceived: number;
  outstandingBalance: number;
  overdueDealsCount: number;
}
