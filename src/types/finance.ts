import {
  AccountCompany,
  AccountDeal,
  AccountPayment,
  AccountDealDocument,
  PaymentMode,
  DealStatus,
  PaymentCommitment,
} from './accounts';

// -------------------------------------------------------------
// 1. CHART OF ACCOUNTS & DOUBLE-ENTRY LEDGER
// -------------------------------------------------------------
export type AccountCategory = 'Assets' | 'Liabilities' | 'Equity' | 'Income' | 'Expenses';

export type AccountGroup =
  | 'Bank Accounts'
  | 'Cash in Hand'
  | 'Accounts Receivable'
  | 'Inventory'
  | 'Duties & Taxes'
  | 'Fixed Assets'
  | 'Advances to Suppliers'
  | 'Accounts Payable'
  | 'GST Payable'
  | 'Loans & Borrowings'
  | 'Customer Advances'
  | 'Outstanding Expenses'
  | 'Capital Account'
  | 'Retained Earnings'
  | 'Sales Accounts'
  | 'Direct Income'
  | 'Cost of Goods Sold'
  | 'Administrative Expenses'
  | 'Operating Expenses'
  | 'Finance Charges';

export interface AccountHead {
  id: string;
  code: string; // e.g. 1010, 2010, 4010
  name: string; // e.g. 'HDFC Bank Current A/c', 'Accounts Receivable'
  category: AccountCategory;
  group: AccountGroup;
  openingBalance: number;
  currentBalance: number;
  isSystem: boolean; // System accounts cannot be deleted
  isActive: boolean;
  description?: string;
  createdAt?: string;
}

export type VoucherType =
  | 'Sales Invoice'
  | 'Customer Receipt'
  | 'Purchase Bill'
  | 'Vendor Payment'
  | 'Business Expense'
  | 'Payment Voucher'
  | 'Journal Voucher'
  | 'Contra Transfer'
  | 'Credit Note'
  | 'Debit Note';

export interface JournalLine {
  id: string;
  accountId: string;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  narration?: string;
}

export interface JournalEntry {
  id: string;
  voucherNumber: string; // e.g. JV-2026-001
  voucherType: VoucherType;
  date: string; // YYYY-MM-DD
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  narration: string;
  referenceId?: string; // Linked Deal / Invoice / Bill ID
  referenceNumber?: string;
  projectId?: string;
  projectName?: string;
  partyName?: string;
  createdBy: string;
  approvedBy?: string;
  status: 'draft' | 'posted' | 'reversed';
  createdAt: string;
  updatedAt?: string;
}

// -------------------------------------------------------------
// 2. SALES INVOICES & PROFORMA INVOICES
// -------------------------------------------------------------
export type InvoiceType = 'tax_invoice' | 'proforma_invoice';
export type InvoiceStatus = 'draft' | 'issued' | 'partially_paid' | 'paid' | 'cancelled';

export interface InvoiceLineItem {
  id: string;
  description: string;
  hsnSac: string;
  quantity: number;
  unit: string;
  rate: number;
  taxableAmount: number;
  gstRate: number; // e.g. 18
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

export interface SalesInvoice {
  id: string;
  invoiceNumber: string; // e.g. RSB-INV-2026-001 or RSB-PI-2026-001
  invoiceType: InvoiceType;
  dealId?: string;
  dealNumber?: string;
  customerId: string;
  customerName: string;
  customerGstin?: string;
  customerPhone?: string;
  customerAddress?: string;
  invoiceDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  poNumber?: string;
  projectName?: string;
  items: InvoiceLineItem[];
  subtotal: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;
  status: InvoiceStatus;
  isGstInclusive: boolean;
  notes?: string;
  termsAndConditions?: string;
  bankDetails?: {
    bankName: string;
    accountNo: string;
    ifsc: string;
    branch: string;
  };
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

// -------------------------------------------------------------
// 3. PURCHASE MANAGEMENT (PO & PURCHASE BILLS)
// -------------------------------------------------------------
export type PurchaseOrderStatus =
  | 'Draft'
  | 'Pending Approval'
  | 'Approved'
  | 'Sent to Vendor'
  | 'Partially Received'
  | 'Completed'
  | 'Cancelled';

export interface PurchaseOrderItemFinance {
  id: string;
  description: string;
  hsnSac?: string;
  quantity: number;
  unit: string;
  rate: number;
  discount?: number;
  taxableAmount: number;
  gstRate: number;
  totalAmount: number;
}

export interface PurchaseOrderFinance {
  id: string;
  poNumber: string; // e.g. RSB-PO-2026-001
  poDate: string; // YYYY-MM-DD
  vendorId: string;
  vendorName: string;
  vendorGstin?: string;
  vendorPhone?: string;
  deliveryAddress: string;
  projectReference?: string;
  requiredDeliveryDate?: string;
  items: PurchaseOrderItemFinance[];
  taxableAmount: number;
  gstTotal: number;
  totalAmount: number;
  paymentTerms: string;
  status: PurchaseOrderStatus;
  remarks?: string;
  orderedBy: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export type PurchaseBillStatus = 'unpaid' | 'partially_paid' | 'paid' | 'overdue' | 'cancelled';

export interface PurchaseBillItem {
  id: string;
  description: string;
  hsnSac?: string;
  quantity: number;
  unit: string;
  rate: number;
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalAmount: number;
}

export interface PurchaseBill {
  id: string;
  billNumber: string; // Internal Bill ID e.g. RSB-PB-2026-001
  vendorInvoiceNumber: string; // Supplier's invoice number
  vendorInvoiceDate: string;
  receivedDate: string;
  vendorId: string;
  vendorName: string;
  vendorGstin?: string;
  linkedPoId?: string;
  linkedPoNumber?: string;
  projectName?: string;
  items: PurchaseBillItem[];
  taxableAmount: number;
  cgstTotal: number;
  sgstTotal: number;
  igstTotal: number;
  gstTotal: number;
  totalAmount: number;
  amountPaid: number;
  balancePayable: number;
  paymentDueDate: string;
  paymentStatus: PurchaseBillStatus;
  notes?: string;
  attachmentUrl?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

// -------------------------------------------------------------
// 4. VENDOR DIRECTORY & PAYMENTS
// -------------------------------------------------------------
export interface FinanceVendor {
  id: string;
  companyName: string;
  contactPerson: string;
  mobile: string;
  email: string;
  billingAddress: string;
  gstin: string;
  pan?: string;
  state: string;
  stateCode: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  ifsc: string;
  branch?: string;
  paymentTerms: string;
  openingBalance: number;
  currentOutstanding: number;
  status: 'Active' | 'Inactive';
  createdAt: string;
  updatedAt?: string;
}

export type VendorPaymentType =
  | 'bill_payment'
  | 'advance'
  | 'multi_bill'
  | 'refund_received'
  | 'adjustment';

export interface VendorPayment {
  id: string;
  voucherNumber: string; // e.g. RSB-PV-2026-001
  paymentDate: string;
  vendorId: string;
  vendorName: string;
  linkedBillId?: string;
  linkedBillNumber?: string;
  projectName?: string;
  amount: number;
  paymentMode: PaymentMode;
  bankAccountId: string;
  bankAccountName: string;
  transactionReference?: string;
  utrNumber?: string;
  chequeNumber?: string;
  remarks?: string;
  paymentType: VendorPaymentType;
  attachmentUrl?: string;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

// -------------------------------------------------------------
// 5. BUSINESS EXPENSES
// -------------------------------------------------------------
export type ExpenseCategory =
  | 'Office Expenses'
  | 'Electricity'
  | 'Transportation & Freight'
  | 'Fuel & Travel'
  | 'Labour & Contractor'
  | 'Staff Salaries'
  | 'Factory Rent'
  | 'Maintenance & Repairs'
  | 'Machinery & Equipment'
  | 'Consumables & Tools'
  | 'Stationery & Printing'
  | 'Internet & Telecom'
  | 'Professional & Legal Fees'
  | 'Bank Charges'
  | 'Miscellaneous';

export interface BusinessExpense {
  id: string;
  expenseNumber: string; // e.g. RSB-EXP-2026-001
  expenseDate: string;
  category: ExpenseCategory;
  payeeName: string;
  description: string;
  projectName?: string;
  amount: number;
  taxableAmount?: number;
  gstAmount?: number;
  paymentMode: PaymentMode;
  bankAccountId: string;
  bankAccountName: string;
  referenceNumber?: string;
  attachmentUrl?: string;
  approvalStatus: 'approved' | 'pending';
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

// -------------------------------------------------------------
// 6. BANK & CASH ACCOUNTS
// -------------------------------------------------------------
export interface BankAccount {
  id: string;
  accountName: string; // e.g. 'HDFC Bank Current A/c', 'Main Office Cash'
  accountType: 'bank' | 'cash';
  bankName?: string;
  accountNumber: string;
  ifsc?: string;
  branch?: string;
  openingBalance: number;
  currentBalance: number;
  status: 'active' | 'inactive';
  isDefault?: boolean;
  createdAt?: string;
}

export interface BankTransaction {
  id: string;
  bankAccountId: string;
  bankAccountName: string;
  date: string;
  type: 'deposit' | 'withdrawal' | 'transfer_in' | 'transfer_out';
  amount: number;
  balanceAfter: number;
  referenceNumber?: string;
  description: string;
  contraAccountId?: string;
  contraAccountName?: string;
  isReconciled: boolean;
  createdAt: string;
}

// -------------------------------------------------------------
// 7. CREDIT NOTES & DEBIT NOTES
// -------------------------------------------------------------
export interface CreditNote {
  id: string;
  noteNumber: string; // e.g. RSB-CN-2026-001
  date: string;
  customerId: string;
  customerName: string;
  originalInvoiceNumber?: string;
  taxableAmount: number;
  gstAmount: number;
  totalAmount: number;
  reason: string;
  status: 'issued' | 'applied';
  createdBy: string;
  createdAt: string;
}

export interface DebitNote {
  id: string;
  noteNumber: string; // e.g. RSB-DN-2026-001
  date: string;
  vendorId: string;
  vendorName: string;
  originalBillNumber?: string;
  taxableAmount: number;
  gstAmount: number;
  totalAmount: number;
  reason: string;
  status: 'issued' | 'applied';
  createdBy: string;
  createdAt: string;
}

// -------------------------------------------------------------
// 8. AUDIT LOG & SETTINGS
// -------------------------------------------------------------
export interface FinanceAuditLog {
  id: string;
  timestamp: string;
  action: string;
  category: string;
  details: string;
  performedBy: string;
  ipAddress?: string;
}

export interface CompanyFinanceProfile {
  companyName: string;
  legalTradeName: string;
  gstin: string;
  pan: string;
  cin?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  stateCode: string;
  pincode: string;
  phone: string;
  email: string;
  website?: string;
  defaultBankAccountId?: string;
  currentFinancialYear: string; // e.g. 2026-2027
  authorizedSignatoryName: string;
  authorizedSignatoryDesignation: string;
}

// -------------------------------------------------------------
// 9. FINANCIAL DASHBOARD METRICS
// -------------------------------------------------------------
export interface FinanceDashboardMetrics {
  totalSales: number;
  totalPurchases: number;
  customerReceipts: number;
  vendorPayments: number;
  customerOutstanding: number;
  vendorOutstanding: number;
  totalExpenses: number;
  bankBalance: number;
  cashBalance: number;
  netProfitLoss: number;
  totalDealsCount: number;
  invoicesCount: number;
  purchaseBillsCount: number;
  overdueInvoicesCount: number;
  overdueBillsCount: number;
}

// -------------------------------------------------------------
// 10. BANK PASSBOOK & ANTI-DUPLICATE AUDIT REGISTRY
// -------------------------------------------------------------
export interface DeletedPaymentRecord {
  id: string;
  reference: string;
  originalType: 'vendor_payment' | 'customer_payment' | 'expense' | 'personal_drawing' | 'contra_transfer';
  partyName?: string;
  amount: number;
  paymentDate: string;
  deletedAt: string;
  deletedBy: string;
  reason?: string;
  accountName?: string;
}

export interface PersonalWithdrawalPayload {
  accountId: string;
  amount: number;
  date: string;
  withdrawnBy: string;
  paymentMode: 'Cheque' | 'ATM/Cash Withdrawal' | 'NetBanking' | 'UPI' | 'Self Cheque';
  reference?: string;
  purpose: string;
  notes?: string;
}

export interface BankPassbookEntry {
  id: string;
  date: string;
  voucherNumber: string;
  voucherType: string;
  particulars: string;
  reference?: string;
  withdrawalAmount: number; // Dr (Money out)
  depositAmount: number; // Cr (Money in)
  balance: number; // progressive running balance
  accountId: string;
  accountName: string;
  isDeleted?: boolean;
}

