import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  AccountCompany,
  AccountDeal,
  AccountPayment,
  AccountDealDocument,
  AccountsDashboardSummary,
  PaymentMode,
  DealStatus,
  DispatchClearanceStatus,
  PaymentCommitment,
  CommitmentStatus,
} from '../types/accounts';
import {
  AccountHead,
  JournalEntry,
  JournalLine,
  VoucherType,
  SalesInvoice,
  PurchaseOrderFinance,
  PurchaseBill,
  FinanceVendor,
  VendorPayment,
  BusinessExpense,
  BankAccount,
  BankTransaction,
  CompanyFinanceProfile,
  FinanceDashboardMetrics,
  DeletedPaymentRecord,
  PersonalWithdrawalPayload,
} from '../types/finance';
import {
  loadCompanies,
  saveCompanies,
  loadDeals,
  saveDeals,
  loadPayments,
  savePayments,
  loadAllDocuments,
  saveDocument,
  deleteDocument,
} from '../services/accountsStorage';
import {
  loadChartOfAccounts,
  saveChartOfAccounts,
  loadJournalEntries,
  saveJournalEntries,
  loadSalesInvoices,
  saveSalesInvoices,
  loadPurchaseOrdersFinance,
  savePurchaseOrdersFinance,
  loadPurchaseBills,
  savePurchaseBills,
  loadFinanceVendors,
  saveFinanceVendors,
  loadVendorPayments,
  saveVendorPayments,
  loadBusinessExpenses,
  saveBusinessExpenses,
  loadBankAccounts,
  saveBankAccounts,
  loadCompanyProfile,
  saveCompanyProfile,
  loadDeletedPayments,
  saveDeletedPayments,
} from '../services/financeStorage';
import {
  computeDealStatus,
  generateNextDealId,
  exportDealSummaryPDF,
  exportPaymentReceiptPDF,
  exportAllDealsToExcel,
  exportPaymentHistoryToExcel,
} from '../utils/accountsCalculations';
import { useERP } from './ERPContext';

export type AccountsView =
  | 'overview'
  | 'deals'
  | 'deal-details'
  | 'pending'
  | 'payments'
  | 'archived'
  | 'settings'
  | 'customers'
  | 'invoices'
  | 'customer-receipts'
  | 'vendors'
  | 'purchase-orders'
  | 'purchase-bills'
  | 'vendor-payments'
  | 'bank-cash'
  | 'expenses'
  | 'general-ledger'
  | 'chart-of-accounts'
  | 'journal-entries'
  | 'trial-balance'
  | 'profit-loss'
  | 'balance-sheet'
  | 'gst-reports'
  | 'receivables'
  | 'payables'
  | 'cash-flow';

export interface CreateDealPayload {
  companyName: string;
  gstin?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  dealDate: string;
  decidedAmount: number;
  advanceAmount: number;
  paymentTerms: string;
  expectedPaymentDate?: string;
  gstInclusive: boolean;
  remarks?: string;
}

export interface CreatePaymentPayload {
  dealId: string;
  paymentDate: string;
  amount: number;
  paymentMode: PaymentMode;
  transactionReference?: string;
  remarks?: string;
  isAdvance?: boolean;
}

interface AccountsContextType {
  // Existing Accounts State (100% Preserved)
  companies: AccountCompany[];
  deals: AccountDeal[];
  payments: AccountPayment[];
  documents: AccountDealDocument[];
  isLoading: boolean;
  summary: AccountsDashboardSummary;
  activeView: AccountsView;
  selectedDealId: string | null;
  searchQuery: string;
  setActiveView: (view: AccountsView, dealId?: string | null) => void;
  setSelectedDealId: (dealId: string | null) => void;
  setSearchQuery: (query: string) => void;
  createDeal: (payload: CreateDealPayload, dealSheetFiles?: File[]) => Promise<AccountDeal>;
  updateDeal: (dealId: string, updates: Partial<AccountDeal>) => Promise<void>;
  archiveDeal: (dealId: string) => Promise<void>;
  unarchiveDeal: (dealId: string) => Promise<void>;
  deleteDeal: (dealId: string) => Promise<void>;
  addPayment: (payload: CreatePaymentPayload, proofFile?: File | null) => Promise<void>;
  updatePayment: (paymentId: string, updates: Partial<AccountPayment>) => Promise<void>;
  deletePayment: (paymentId: string) => Promise<void>;
  uploadDealDocument: (dealId: string, file: File, category?: AccountDealDocument['category']) => Promise<AccountDealDocument>;
  removeDealDocument: (docId: string) => Promise<void>;
  getDealById: (dealId: string) => AccountDeal | undefined;
  getCompanyById: (companyId: string) => AccountCompany | undefined;
  getPaymentsForDeal: (dealId: string) => AccountPayment[];
  getDocumentsForDeal: (dealId: string) => AccountDealDocument[];
  checkDuplicateGstin: (gstin: string, excludeCompanyId?: string) => AccountCompany | null;
  setDispatchClearance: (dealId: string, status: DispatchClearanceStatus, remarks?: string) => Promise<void>;
  addCommitment: (dealId: string, payload: { commitmentDate: string; amount: number; note?: string }) => Promise<void>;
  updateCommitmentStatus: (dealId: string, commitmentId: string, status: CommitmentStatus) => Promise<void>;
  deleteCommitment: (dealId: string, commitmentId: string) => Promise<void>;
  exportPaymentReceipt: (paymentId: string) => void;
  exportCurrentDealPDF: (dealId: string) => void;
  exportAllDealsExcel: () => void;
  exportPaymentHistoryExcel: (dealId?: string) => void;

  // New Complete Finance Management State & Actions
  financeMetrics: FinanceDashboardMetrics;
  salesInvoices: SalesInvoice[];
  purchaseOrdersFinance: PurchaseOrderFinance[];
  purchaseBills: PurchaseBill[];
  financeVendors: FinanceVendor[];
  vendorPayments: VendorPayment[];
  businessExpenses: BusinessExpense[];
  chartOfAccounts: AccountHead[];
  journalEntries: JournalEntry[];
  bankAccounts: BankAccount[];
  companyProfile: CompanyFinanceProfile;

  // Finance Actions
  addSalesInvoice: (invoice: Omit<SalesInvoice, 'id' | 'createdAt'>) => Promise<SalesInvoice>;
  updateSalesInvoice: (id: string, updates: Partial<SalesInvoice>) => Promise<void>;
  deleteSalesInvoice: (id: string) => Promise<void>;

  addPurchaseOrderFinance: (po: Omit<PurchaseOrderFinance, 'id' | 'createdAt'>) => Promise<PurchaseOrderFinance>;
  updatePurchaseOrderFinance: (id: string, updates: Partial<PurchaseOrderFinance>) => Promise<void>;

  addPurchaseBill: (bill: Omit<PurchaseBill, 'id' | 'createdAt'>) => Promise<PurchaseBill>;
  updatePurchaseBill: (id: string, updates: Partial<PurchaseBill>) => Promise<void>;
  deletePurchaseBill: (id: string) => Promise<void>;

  addFinanceVendor: (vendor: Omit<FinanceVendor, 'id' | 'createdAt'>) => Promise<FinanceVendor>;
  updateFinanceVendor: (id: string, updates: Partial<FinanceVendor>) => Promise<void>;

  addVendorPayment: (payment: Omit<VendorPayment, 'id' | 'createdAt'>) => Promise<VendorPayment>;
  deleteVendorPayment: (id: string) => Promise<void>;

  addBusinessExpense: (expense: Omit<BusinessExpense, 'id' | 'createdAt'>) => Promise<BusinessExpense>;
  deleteBusinessExpense: (id: string) => Promise<void>;

  addJournalEntry: (entry: Omit<JournalEntry, 'id' | 'createdAt'>) => Promise<JournalEntry>;
  reverseJournalEntry: (id: string, reason?: string) => Promise<void>;

  addBankAccount: (account: Omit<BankAccount, 'id'>) => Promise<BankAccount>;
  updateBankAccount: (id: string, updates: Partial<BankAccount>) => Promise<void>;
  transferBankFunds: (payload: { fromAccountId: string; toAccountId: string; amount: number; date: string; reference?: string; notes?: string }) => Promise<void>;
  depositFundsToAccount: (payload: {
    accountId: string;
    amount: number;
    date: string;
    depositType: 'capital' | 'customer' | 'interest' | 'loan' | 'other';
    sourceParty?: string;
    reference?: string;
    notes?: string;
  }) => Promise<void>;
  withdrawPersonalFunds: (payload: PersonalWithdrawalPayload) => Promise<void>;
  deletedPayments: DeletedPaymentRecord[];
  recordDeletedPayment: (record: Omit<DeletedPaymentRecord, 'id' | 'deletedAt'>) => Promise<void>;
  checkDuplicateReference: (reference: string) => {
    isDuplicate: boolean;
    isDeletedRecord?: boolean;
    matchedRecord?: {
      type: string;
      date: string;
      amount: number;
      party?: string;
      details: string;
    };
  };

  updateCompanyProfile: (profile: CompanyFinanceProfile) => void;
  getAccountBalance: (accountCode: string) => number;
  addChartAccount: (head: AccountHead) => Promise<void>;
}

const AccountsContext = createContext<AccountsContextType | undefined>(undefined);

// Helper to convert browser File to Base64 Data URL
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const AccountsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useERP();
  const userName = currentUser?.name || 'Accountant';

  // 1. Existing State
  const [companies, setCompanies] = useState<AccountCompany[]>([]);
  const [deals, setDeals] = useState<AccountDeal[]>([]);
  const [payments, setPayments] = useState<AccountPayment[]>([]);
  const [documents, setDocuments] = useState<AccountDealDocument[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeView, setActiveView] = useState<AccountsView>('overview');
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 2. New Finance State
  const [salesInvoices, setSalesInvoices] = useState<SalesInvoice[]>([]);
  const [purchaseOrdersFinance, setPurchaseOrdersFinance] = useState<PurchaseOrderFinance[]>([]);
  const [purchaseBills, setPurchaseBills] = useState<PurchaseBill[]>([]);
  const [financeVendors, setFinanceVendors] = useState<FinanceVendor[]>([]);
  const [vendorPayments, setVendorPayments] = useState<VendorPayment[]>([]);
  const [businessExpenses, setBusinessExpenses] = useState<BusinessExpense[]>([]);
  const [chartOfAccounts, setChartOfAccounts] = useState<AccountHead[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [deletedPayments, setDeletedPayments] = useState<DeletedPaymentRecord[]>([]);
  const [companyProfile, setCompanyProfile] = useState<CompanyFinanceProfile>(loadCompanyProfile);

  // Initial Data Hydration for all financial modules
  useEffect(() => {
    let isMounted = true;
    const hydrate = async () => {
      try {
        const [
          loadedComp,
          loadedDeals,
          loadedPay,
          loadedDocs,
          loadedInvoices,
          loadedPOs,
          loadedBills,
          loadedVendors,
          loadedVndPay,
          loadedExp,
          loadedChart,
          loadedJournals,
          loadedBanks,
          loadedDeleted,
        ] = await Promise.all([
          loadCompanies(),
          loadDeals(),
          loadPayments(),
          loadAllDocuments(),
          loadSalesInvoices(),
          loadPurchaseOrdersFinance(),
          loadPurchaseBills(),
          loadFinanceVendors(),
          loadVendorPayments(),
          loadBusinessExpenses(),
          loadChartOfAccounts(),
          loadJournalEntries(),
          loadBankAccounts(),
          loadDeletedPayments(),
        ]);

        if (isMounted) {
          setCompanies(loadedComp);
          setDeals(loadedDeals);
          setPayments(loadedPay);
          setDocuments(loadedDocs);
          setSalesInvoices(loadedInvoices);
          setPurchaseOrdersFinance(loadedPOs);
          setPurchaseBills(loadedBills);
          setFinanceVendors(loadedVendors);
          setVendorPayments(loadedVndPay);
          setBusinessExpenses(loadedExp);
          setChartOfAccounts(loadedChart);
          setJournalEntries(loadedJournals);
          setBankAccounts(loadedBanks);
          setDeletedPayments(loadedDeleted);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to hydrate finance and accounts database:', err);
        if (isMounted) setIsLoading(false);
      }
    };

    hydrate();
    return () => {
      isMounted = false;
    };
  }, []);

  // -------------------------------------------------------------
  // CALCULATED SUMMARIES & METRICS
  // -------------------------------------------------------------
  const summary: AccountsDashboardSummary = useMemo(() => {
    const activeDeals = deals.filter((d) => !d.isArchived);
    const totalDeals = activeDeals.length;
    const totalDealValue = activeDeals.reduce((sum, d) => sum + (d.decidedAmount || 0), 0);
    const totalReceived = activeDeals.reduce((sum, d) => sum + (d.totalReceived || 0), 0);
    const outstandingBalance = activeDeals.reduce((sum, d) => sum + (d.remainingBalance || 0), 0);
    const overdueDealsCount = activeDeals.filter((d) => d.status === 'overdue').length;

    return {
      totalDeals,
      totalDealValue,
      totalReceived,
      outstandingBalance,
      overdueDealsCount,
    };
  }, [deals]);

  const financeMetrics: FinanceDashboardMetrics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];

    // Total Sales: Max of Deals decidedAmount or Invoices totalAmount
    const totalSales = deals
      .filter((d) => !d.isArchived)
      .reduce((sum, d) => sum + (d.decidedAmount || 0), 0);

    const totalPurchases = purchaseBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const customerReceipts = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalVendorPayments = vendorPayments.reduce((sum, vp) => sum + (vp.amount || 0), 0);

    const customerOutstanding = deals
      .filter((d) => !d.isArchived)
      .reduce((sum, d) => sum + (d.remainingBalance || 0), 0);

    const vendorOutstanding = purchaseBills.reduce((sum, b) => sum + (b.balancePayable || 0), 0);
    const totalExpenses = businessExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

    const bankBalance = bankAccounts
      .filter((b) => b.accountType === 'bank' && b.status === 'active')
      .reduce((sum, b) => sum + (b.currentBalance || 0), 0);

    const cashBalance = bankAccounts
      .filter((b) => b.accountType === 'cash' && b.status === 'active')
      .reduce((sum, b) => sum + (b.currentBalance || 0), 0);

    const netProfitLoss = totalSales - totalPurchases - totalExpenses;

    const overdueInvoicesCount = salesInvoices.filter(
      (inv) => inv.status !== 'paid' && inv.dueDate < today
    ).length;

    const overdueBillsCount = purchaseBills.filter(
      (b) => b.paymentStatus !== 'paid' && b.paymentDueDate < today
    ).length;

    return {
      totalSales,
      totalPurchases,
      customerReceipts,
      vendorPayments: totalVendorPayments,
      customerOutstanding,
      vendorOutstanding,
      totalExpenses,
      bankBalance,
      cashBalance,
      netProfitLoss,
      totalDealsCount: deals.filter((d) => !d.isArchived).length,
      invoicesCount: salesInvoices.length,
      purchaseBillsCount: purchaseBills.length,
      overdueInvoicesCount,
      overdueBillsCount,
    };
  }, [deals, purchaseBills, payments, vendorPayments, businessExpenses, bankAccounts, salesInvoices]);

  // -------------------------------------------------------------
  // AUTOMATIC DOUBLE-ENTRY POSTING HELPER
  // -------------------------------------------------------------
  const postDoubleEntryTransaction = useCallback(
    async (
      voucherType: JournalEntry['voucherType'],
      date: string,
      narration: string,
      debits: { code: string; name: string; amount: number }[],
      credits: { code: string; name: string; amount: number }[],
      referenceId?: string,
      referenceNumber?: string,
      partyName?: string,
      projectId?: string
    ) => {
      const totalDebit = debits.reduce((s, d) => s + d.amount, 0);
      const totalCredit = credits.reduce((s, c) => s + c.amount, 0);

      // Validate Debits == Credits with 2-decimal precision
      if (Math.abs(totalDebit - totalCredit) > 0.05) {
        console.error(
          `Accounting Inbalance Error: Debits (₹${totalDebit}) != Credits (₹${totalCredit}) for ${voucherType}`
        );
        return;
      }

      const lines: JournalLine[] = [
        ...debits.map((d, idx) => ({
          id: `line-dr-${Date.now()}-${idx}`,
          accountId: `acc-${d.code}`,
          accountCode: d.code,
          accountName: d.name,
          debit: d.amount,
          credit: 0,
        })),
        ...credits.map((c, idx) => ({
          id: `line-cr-${Date.now()}-${idx}`,
          accountId: `acc-${c.code}`,
          accountCode: c.code,
          accountName: c.name,
          debit: 0,
          credit: c.amount,
        })),
      ];

      const newEntry: JournalEntry = {
        id: `jv-${Date.now()}`,
        voucherNumber: `JV-${new Date().getFullYear()}-${String(journalEntries.length + 1).padStart(4, '0')}`,
        voucherType,
        date,
        lines,
        totalDebit,
        totalCredit,
        narration,
        referenceId,
        referenceNumber,
        partyName,
        projectId,
        createdBy: userName,
        status: 'posted',
        createdAt: new Date().toISOString(),
      };

      const updatedJournals = [newEntry, ...journalEntries];
      setJournalEntries(updatedJournals);
      await saveJournalEntries(updatedJournals);
    },
    [journalEntries, userName]
  );

  // -------------------------------------------------------------
  // SALES INVOICES & PROFORMA INVOICES
  // -------------------------------------------------------------
  const addSalesInvoice = useCallback(
    async (invoiceData: Omit<SalesInvoice, 'id' | 'createdAt'>): Promise<SalesInvoice> => {
      const newInvoice: SalesInvoice = {
        ...invoiceData,
        id: `inv-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };

      const updated = [newInvoice, ...salesInvoices];
      setSalesInvoices(updated);
      await saveSalesInvoices(updated);

      // Post automatic Double-Entry for Tax Invoice:
      // Dr. Accounts Receivable (Sundry Debtors)
      // Cr. Industrial Machinery Sales Revenue
      // Cr. Output CGST / SGST / IGST
      if (newInvoice.invoiceType === 'tax_invoice') {
        const debits = [
          {
            code: '1100',
            name: 'Accounts Receivable (Sundry Debtors)',
            amount: newInvoice.totalAmount,
          },
        ];
        const credits = [
          {
            code: '4010',
            name: 'Industrial Machinery Sales Revenue',
            amount: newInvoice.subtotal,
          },
        ];
        if (newInvoice.cgstTotal > 0) {
          credits.push({ code: '2110', name: 'Output CGST (Payable)', amount: newInvoice.cgstTotal });
        }
        if (newInvoice.sgstTotal > 0) {
          credits.push({ code: '2120', name: 'Output SGST (Payable)', amount: newInvoice.sgstTotal });
        }
        if (newInvoice.igstTotal > 0) {
          credits.push({ code: '2130', name: 'Output IGST (Payable)', amount: newInvoice.igstTotal });
        }

        await postDoubleEntryTransaction(
          'Sales Invoice',
          newInvoice.invoiceDate,
          `Sales Invoice ${newInvoice.invoiceNumber} to ${newInvoice.customerName}`,
          debits,
          credits,
          newInvoice.id,
          newInvoice.invoiceNumber,
          newInvoice.customerName,
          newInvoice.projectName
        );
      }

      return newInvoice;
    },
    [salesInvoices, postDoubleEntryTransaction]
  );

  const updateSalesInvoice = useCallback(
    async (id: string, updates: Partial<SalesInvoice>) => {
      const updated = salesInvoices.map((inv) =>
        inv.id === id ? { ...inv, ...updates, updatedAt: new Date().toISOString() } : inv
      );
      setSalesInvoices(updated);
      await saveSalesInvoices(updated);
    },
    [salesInvoices]
  );

  const deleteSalesInvoice = useCallback(
    async (id: string) => {
      const updated = salesInvoices.filter((inv) => inv.id !== id);
      setSalesInvoices(updated);
      await saveSalesInvoices(updated);
    },
    [salesInvoices]
  );

  // -------------------------------------------------------------
  // PURCHASE ORDERS
  // -------------------------------------------------------------
  const addPurchaseOrderFinance = useCallback(
    async (poData: Omit<PurchaseOrderFinance, 'id' | 'createdAt'>): Promise<PurchaseOrderFinance> => {
      const newPo: PurchaseOrderFinance = {
        ...poData,
        id: `po-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      const updated = [newPo, ...purchaseOrdersFinance];
      setPurchaseOrdersFinance(updated);
      await savePurchaseOrdersFinance(updated);
      return newPo;
    },
    [purchaseOrdersFinance]
  );

  const updatePurchaseOrderFinance = useCallback(
    async (id: string, updates: Partial<PurchaseOrderFinance>) => {
      const updated = purchaseOrdersFinance.map((po) =>
        po.id === id ? { ...po, ...updates, updatedAt: new Date().toISOString() } : po
      );
      setPurchaseOrdersFinance(updated);
      await savePurchaseOrdersFinance(updated);
    },
    [purchaseOrdersFinance]
  );

  // -------------------------------------------------------------
  // PURCHASE BILLS (VENDOR INVOICES)
  // -------------------------------------------------------------
  const addPurchaseBill = useCallback(
    async (billData: Omit<PurchaseBill, 'id' | 'createdAt'>): Promise<PurchaseBill> => {
      // Prevent duplicate supplier invoice number for the same vendor
      const isDuplicate = purchaseBills.some(
        (b) =>
          b.vendorId === billData.vendorId &&
          b.vendorInvoiceNumber.trim().toLowerCase() === billData.vendorInvoiceNumber.trim().toLowerCase()
      );
      if (isDuplicate) {
        throw new Error(
          `Duplicate bill detected: Vendor invoice "${billData.vendorInvoiceNumber}" for this vendor already exists in the Purchase Register.`
        );
      }

      const newBill: PurchaseBill = {
        ...billData,
        id: `pb-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };

      const updatedBills = [newBill, ...purchaseBills];
      setPurchaseBills(updatedBills);
      await savePurchaseBills(updatedBills);

      // Update Vendor outstanding balance
      const updatedVendors = financeVendors.map((v) => {
        if (v.id === billData.vendorId) {
          return {
            ...v,
            currentOutstanding: (v.currentOutstanding || 0) + billData.balancePayable,
            updatedAt: new Date().toISOString(),
          };
        }
        return v;
      });
      setFinanceVendors(updatedVendors);
      await saveFinanceVendors(updatedVendors);

      // Post automatic Double-Entry for Purchase Bill:
      // Dr. Material Purchases & Consumption (5010)
      // Dr. Input CGST / SGST / IGST (1310 / 1320 / 1330)
      // Cr. Accounts Payable (2010)
      const debits = [
        {
          code: '5010',
          name: 'Material Purchases & Consumption',
          amount: newBill.taxableAmount,
        },
      ];
      if (newBill.cgstTotal > 0) {
        debits.push({ code: '1310', name: 'Input CGST (Recoverable)', amount: newBill.cgstTotal });
      }
      if (newBill.sgstTotal > 0) {
        debits.push({ code: '1320', name: 'Input SGST (Recoverable)', amount: newBill.sgstTotal });
      }
      if (newBill.igstTotal > 0) {
        debits.push({ code: '1330', name: 'Input IGST (Recoverable)', amount: newBill.igstTotal });
      }

      const credits = [
        {
          code: '2010',
          name: 'Accounts Payable (Sundry Creditors)',
          amount: newBill.totalAmount,
        },
      ];

      await postDoubleEntryTransaction(
        'Purchase Bill',
        newBill.receivedDate,
        `Purchase Bill ${newBill.billNumber} from ${newBill.vendorName} (Inv #${newBill.vendorInvoiceNumber})`,
        debits,
        credits,
        newBill.id,
        newBill.billNumber,
        newBill.vendorName,
        newBill.projectName
      );

      return newBill;
    },
    [purchaseBills, financeVendors, postDoubleEntryTransaction]
  );

  const updatePurchaseBill = useCallback(
    async (id: string, updates: Partial<PurchaseBill>) => {
      const updated = purchaseBills.map((b) =>
        b.id === id ? { ...b, ...updates, updatedAt: new Date().toISOString() } : b
      );
      setPurchaseBills(updated);
      await savePurchaseBills(updated);
    },
    [purchaseBills]
  );

  const deletePurchaseBill = useCallback(
    async (id: string) => {
      const target = purchaseBills.find((b) => b.id === id);
      if (target) {
        // Reverse vendor outstanding
        setFinanceVendors((prev) =>
          prev.map((v) =>
            v.id === target.vendorId
              ? { ...v, currentOutstanding: Math.max(0, v.currentOutstanding - target.balancePayable) }
              : v
          )
        );
      }
      const updated = purchaseBills.filter((b) => b.id !== id);
      setPurchaseBills(updated);
      await savePurchaseBills(updated);
    },
    [purchaseBills]
  );

  // -------------------------------------------------------------
  // VENDORS DIRECTORY
  // -------------------------------------------------------------
  const addFinanceVendor = useCallback(
    async (vendorData: Omit<FinanceVendor, 'id' | 'createdAt'>): Promise<FinanceVendor> => {
      const newVnd: FinanceVendor = {
        ...vendorData,
        id: `vnd-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      const updated = [newVnd, ...financeVendors];
      setFinanceVendors(updated);
      await saveFinanceVendors(updated);
      return newVnd;
    },
    [financeVendors]
  );

  const updateFinanceVendor = useCallback(
    async (id: string, updates: Partial<FinanceVendor>) => {
      const updated = financeVendors.map((v) =>
        v.id === id ? { ...v, ...updates, updatedAt: new Date().toISOString() } : v
      );
      setFinanceVendors(updated);
      await saveFinanceVendors(updated);
    },
    [financeVendors]
  );

  // -------------------------------------------------------------
  // VENDOR PAYMENTS
  // -------------------------------------------------------------
  const addVendorPayment = useCallback(
    async (paymentData: Omit<VendorPayment, 'id' | 'createdAt'>): Promise<VendorPayment> => {
      const newPayment: VendorPayment = {
        ...paymentData,
        id: `pv-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };

      const updatedPayments = [newPayment, ...vendorPayments];
      setVendorPayments(updatedPayments);
      await saveVendorPayments(updatedPayments);

      // 1. Reduce balance payable on linked purchase bill if applicable
      if (paymentData.linkedBillId) {
        const updatedBills = purchaseBills.map((b) => {
          if (b.id === paymentData.linkedBillId) {
            const nextPaid = (b.amountPaid || 0) + paymentData.amount;
            const nextBalance = Math.max(0, b.totalAmount - nextPaid);
            const status: PurchaseBill['paymentStatus'] =
              nextBalance <= 0 ? 'paid' : nextPaid > 0 ? 'partially_paid' : 'unpaid';

            return {
              ...b,
              amountPaid: nextPaid,
              balancePayable: nextBalance,
              paymentStatus: status,
              updatedAt: new Date().toISOString(),
            };
          }
          return b;
        });
        setPurchaseBills(updatedBills);
        await savePurchaseBills(updatedBills);
      }

      // 2. Reduce vendor outstanding balance
      setFinanceVendors((prev) =>
        prev.map((v) => {
          if (v.id === paymentData.vendorId) {
            return {
              ...v,
              currentOutstanding: Math.max(0, (v.currentOutstanding || 0) - paymentData.amount),
              updatedAt: new Date().toISOString(),
            };
          }
          return v;
        })
      );

      // 3. Deduct from Bank / Cash Account
      setBankAccounts((prev) =>
        prev.map((ba) => {
          if (ba.id === paymentData.bankAccountId) {
            return {
              ...ba,
              currentBalance: ba.currentBalance - paymentData.amount,
            };
          }
          return ba;
        })
      );

      // 4. Double-Entry Posting:
      // Dr. Accounts Payable (Sundry Creditors) (2010)
      // Cr. Bank / Cash Account (1020 / 1010)
      const bankHeadCode = paymentData.paymentMode === 'Cash' ? '1010' : '1020';
      const debits = [
        {
          code: '2010',
          name: 'Accounts Payable (Sundry Creditors)',
          amount: paymentData.amount,
        },
      ];
      const credits = [
        {
          code: bankHeadCode,
          name: paymentData.bankAccountName || 'Bank Account',
          amount: paymentData.amount,
        },
      ];

      await postDoubleEntryTransaction(
        'Vendor Payment',
        paymentData.paymentDate,
        `Payment ${newPayment.voucherNumber} to ${paymentData.vendorName} (${paymentData.paymentMode})`,
        debits,
        credits,
        newPayment.id,
        newPayment.voucherNumber,
        paymentData.vendorName,
        paymentData.projectName
      );

      return newPayment;
    },
    [vendorPayments, purchaseBills, postDoubleEntryTransaction]
  );

  const recordDeletedPayment = useCallback(
    async (record: Omit<DeletedPaymentRecord, 'id' | 'deletedAt'>) => {
      const newRecord: DeletedPaymentRecord = {
        ...record,
        id: `del-pmt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        deletedAt: new Date().toISOString(),
      };
      const updated = [newRecord, ...deletedPayments];
      setDeletedPayments(updated);
      await saveDeletedPayments(updated);
    },
    [deletedPayments]
  );

  const deleteVendorPayment = useCallback(
    async (id: string) => {
      const target = vendorPayments.find((vp) => vp.id === id);
      if (target) {
        await recordDeletedPayment({
          reference:
            target.transactionReference ||
            target.utrNumber ||
            target.chequeNumber ||
            target.voucherNumber ||
            target.id,
          originalType: 'vendor_payment',
          partyName: target.vendorName,
          amount: target.amount,
          paymentDate: target.paymentDate,
          deletedBy: userName,
          reason: 'Deleted from Vendor Payments register (Tombstoned to prevent duplicate payment)',
          accountName: target.bankAccountId,
        });
      }
      const updated = vendorPayments.filter((vp) => vp.id !== id);
      setVendorPayments(updated);
      await saveVendorPayments(updated);
    },
    [vendorPayments, recordDeletedPayment, userName]
  );

  // -------------------------------------------------------------
  // BUSINESS EXPENSES
  // -------------------------------------------------------------
  const addBusinessExpense = useCallback(
    async (expenseData: Omit<BusinessExpense, 'id' | 'createdAt'>): Promise<BusinessExpense> => {
      const newExp: BusinessExpense = {
        ...expenseData,
        id: `exp-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };

      const updatedExp = [newExp, ...businessExpenses];
      setBusinessExpenses(updatedExp);
      await saveBusinessExpenses(updatedExp);

      // Deduct from Bank / Cash
      setBankAccounts((prev) =>
        prev.map((ba) => {
          if (ba.id === expenseData.bankAccountId) {
            return {
              ...ba,
              currentBalance: ba.currentBalance - expenseData.amount,
            };
          }
          return ba;
        })
      );

      // Double-Entry Posting:
      // Dr. Operating / Administrative Expense Account
      // Cr. Bank / Cash Account
      const expenseCodeMap: Record<string, string> = {
        Electricity: '5030',
        'Transportation & Freight': '5040',
        'Factory Rent': '5050',
        'Maintenance & Repairs': '5060',
        'Consumables & Tools': '5070',
        'Office Stationery & Printing': '5080',
        'Internet & Telecom': '5090',
        'Professional & Legal Fees': '5100',
        'Bank Charges': '5110',
      };
      const expCode = expenseCodeMap[expenseData.category] || '5030';
      const bankHeadCode = expenseData.paymentMode === 'Cash' ? '1010' : '1020';

      const debits = [
        {
          code: expCode,
          name: expenseData.category,
          amount: expenseData.amount,
        },
      ];
      const credits = [
        {
          code: bankHeadCode,
          name: expenseData.bankAccountName || 'Bank/Cash Account',
          amount: expenseData.amount,
        },
      ];

      await postDoubleEntryTransaction(
        'Business Expense',
        expenseData.expenseDate,
        `Expense ${newExp.expenseNumber} for ${expenseData.category} - ${expenseData.description}`,
        debits,
        credits,
        newExp.id,
        newExp.expenseNumber,
        expenseData.payeeName,
        expenseData.projectName
      );

      return newExp;
    },
    [businessExpenses, postDoubleEntryTransaction]
  );

  const deleteBusinessExpense = useCallback(
    async (id: string) => {
      const target = businessExpenses.find((e) => e.id === id);
      if (target) {
        await recordDeletedPayment({
          reference: target.referenceNumber || target.expenseNumber || target.id,
          originalType: 'expense',
          partyName: target.payeeName || target.category,
          amount: target.amount,
          paymentDate: target.expenseDate,
          deletedBy: userName,
          reason: 'Deleted from Business Expenses (Tombstoned to prevent duplicate payment)',
          accountName: target.bankAccountName,
        });
      }
      const updated = businessExpenses.filter((e) => e.id !== id);
      setBusinessExpenses(updated);
      await saveBusinessExpenses(updated);
    },
    [businessExpenses, recordDeletedPayment, userName]
  );

  // -------------------------------------------------------------
  // JOURNAL ENTRIES
  // -------------------------------------------------------------
  const addJournalEntry = useCallback(
    async (entryData: Omit<JournalEntry, 'id' | 'createdAt'>): Promise<JournalEntry> => {
      const totalDr = entryData.lines.reduce((s, l) => s + (l.debit || 0), 0);
      const totalCr = entryData.lines.reduce((s, l) => s + (l.credit || 0), 0);

      if (Math.abs(totalDr - totalCr) > 0.05) {
        throw new Error(
          `Unbalanced Journal Entry: Total Debit (₹${totalDr.toLocaleString()}) must equal Total Credit (₹${totalCr.toLocaleString()}).`
        );
      }

      const newEntry: JournalEntry = {
        ...entryData,
        id: `jv-${Date.now()}`,
        totalDebit: totalDr,
        totalCredit: totalCr,
        status: 'posted',
        createdAt: new Date().toISOString(),
      };

      const updated = [newEntry, ...journalEntries];
      setJournalEntries(updated);
      await saveJournalEntries(updated);
      return newEntry;
    },
    [journalEntries]
  );

  const reverseJournalEntry = useCallback(
    async (id: string, reason?: string) => {
      const target = journalEntries.find((j) => j.id === id);
      if (!target) return;

      // Mark original as reversed
      const updatedJournals = journalEntries.map((j) =>
        j.id === id ? { ...j, status: 'reversed' as const, updatedAt: new Date().toISOString() } : j
      );

      // Create reversing entry with inverted debits & credits
      const reversalEntry: JournalEntry = {
        id: `jv-rev-${Date.now()}`,
        voucherNumber: `REV-${target.voucherNumber}`,
        voucherType: target.voucherType,
        date: new Date().toISOString().split('T')[0],
        lines: target.lines.map((line, idx) => ({
          ...line,
          id: `rev-line-${idx}`,
          debit: line.credit, // Invert
          credit: line.debit, // Invert
        })),
        totalDebit: target.totalCredit,
        totalCredit: target.totalDebit,
        narration: `Reversal of ${target.voucherNumber}: ${reason || 'Correction voucher'}`,
        referenceId: target.id,
        referenceNumber: target.voucherNumber,
        createdBy: userName,
        status: 'posted',
        createdAt: new Date().toISOString(),
      };

      const finalJournals = [reversalEntry, ...updatedJournals];
      setJournalEntries(finalJournals);
      await saveJournalEntries(finalJournals);
    },
    [journalEntries, userName]
  );

  // -------------------------------------------------------------
  // BANK & CASH ACCOUNTS
  // -------------------------------------------------------------
  const addBankAccount = useCallback(
    async (accountData: Omit<BankAccount, 'id'>): Promise<BankAccount> => {
      const newAcc: BankAccount = {
        ...accountData,
        id: `bank-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      const updated = [...bankAccounts, newAcc];
      setBankAccounts(updated);
      await saveBankAccounts(updated);
      return newAcc;
    },
    [bankAccounts]
  );

  const updateBankAccount = useCallback(
    async (id: string, updates: Partial<BankAccount>) => {
      const updated = bankAccounts.map((b) => (b.id === id ? { ...b, ...updates } : b));
      setBankAccounts(updated);
      await saveBankAccounts(updated);
    },
    [bankAccounts]
  );

  const transferBankFunds = useCallback(
    async (payload: {
      fromAccountId: string;
      toAccountId: string;
      amount: number;
      date: string;
      reference?: string;
      notes?: string;
    }) => {
      const fromAcc = bankAccounts.find((b) => b.id === payload.fromAccountId);
      const toAcc = bankAccounts.find((b) => b.id === payload.toAccountId);
      if (!fromAcc || !toAcc) {
        throw new Error('Please select valid source and destination accounts.');
      }
      if (fromAcc.currentBalance < payload.amount) {
        throw new Error(
          `Insufficient funds in ${fromAcc.accountName}. Current balance is ₹${fromAcc.currentBalance.toLocaleString()}.`
        );
      }

      // Update balances
      const updatedAccounts = bankAccounts.map((b) => {
        if (b.id === payload.fromAccountId) {
          return { ...b, currentBalance: b.currentBalance - payload.amount };
        }
        if (b.id === payload.toAccountId) {
          return { ...b, currentBalance: b.currentBalance + payload.amount };
        }
        return b;
      });
      setBankAccounts(updatedAccounts);
      await saveBankAccounts(updatedAccounts);

      // Create Contra Journal Entry
      const fromCode = fromAcc.accountType === 'cash' ? '1010' : '1020';
      const toCode = toAcc.accountType === 'cash' ? '1010' : '1020';

      const debits = [{ code: toCode, name: toAcc.accountName, amount: payload.amount }];
      const credits = [{ code: fromCode, name: fromAcc.accountName, amount: payload.amount }];

      await postDoubleEntryTransaction(
        'Contra Transfer',
        payload.date,
        `Bank Transfer: ₹${payload.amount.toLocaleString()} from ${fromAcc.accountName} to ${toAcc.accountName}. ${payload.notes || ''}`,
        debits,
        credits,
        `transfer-${Date.now()}`,
        payload.reference
      );
    },
    [bankAccounts, postDoubleEntryTransaction]
  );

  const depositFundsToAccount = useCallback(
    async (payload: {
      accountId: string;
      amount: number;
      date: string;
      depositType: 'capital' | 'customer' | 'interest' | 'loan' | 'other';
      sourceParty?: string;
      reference?: string;
      notes?: string;
    }) => {
      const targetAcc = bankAccounts.find((b) => b.id === payload.accountId);
      if (!targetAcc) {
        throw new Error('Please select a valid destination bank or cash account.');
      }
      if (payload.amount <= 0) {
        throw new Error('Deposit amount must be greater than zero.');
      }

      // Update bank account balance
      const updatedAccounts = bankAccounts.map((b) => {
        if (b.id === payload.accountId) {
          return { ...b, currentBalance: b.currentBalance + payload.amount };
        }
        return b;
      });
      setBankAccounts(updatedAccounts);
      await saveBankAccounts(updatedAccounts);

      // Select target bank code
      const bankCode =
        targetAcc.accountType === 'cash'
          ? '1010'
          : targetAcc.accountNumber.includes('50200012')
          ? '1020'
          : '1030';

      // Credit Account Head
      let creditCode = '3010';
      let creditName = "Owner's Equity & Capital";
      let voucherType: VoucherType = 'Journal Voucher';

      if (payload.depositType === 'customer') {
        creditCode = '1100';
        creditName = 'Accounts Receivable (Customer Receipt)';
        voucherType = 'Customer Receipt';
      } else if (payload.depositType === 'interest') {
        creditCode = '4020';
        creditName = 'Interest & Other Income';
      } else if (payload.depositType === 'loan') {
        creditCode = '2010';
        creditName = 'Bank Loan / Credit Facility';
      }

      const debits = [{ code: bankCode, name: targetAcc.accountName, amount: payload.amount }];
      const credits = [{ code: creditCode, name: creditName, amount: payload.amount }];

      const narration = `Funds Deposited: ₹${payload.amount.toLocaleString('en-IN')} into ${targetAcc.accountName} from ${payload.sourceParty || payload.depositType}. ${payload.notes || ''}`;

      await postDoubleEntryTransaction(
        voucherType,
        payload.date,
        narration,
        debits,
        credits,
        `deposit-${Date.now()}`,
        payload.reference
      );
    },
    [bankAccounts, postDoubleEntryTransaction]
  );

  const withdrawPersonalFunds = useCallback(
    async (payload: PersonalWithdrawalPayload) => {
      const targetAcc = bankAccounts.find((b) => b.id === payload.accountId);
      if (!targetAcc) throw new Error('Selected bank/cash account not found');

      // 1. Update bank balance
      const updatedAccounts = bankAccounts.map((b) =>
        b.id === payload.accountId
          ? { ...b, currentBalance: b.currentBalance - payload.amount }
          : b
      );
      setBankAccounts(updatedAccounts);
      await saveBankAccounts(updatedAccounts);

      // 2. Post Double-Entry:
      // Dr. 3030 Owner's Drawings & Personal Use
      // Cr. Bank Account (1020 HDFC / 1030 SBI / 1010 Cash)
      const bankCode =
        targetAcc.accountType === 'cash'
          ? '1010'
          : targetAcc.accountNumber.includes('50200012')
          ? '1020'
          : '1030';

      const debits = [
        {
          code: '3030',
          name: "Owner's Drawings & Personal Use",
          amount: payload.amount,
        },
      ];
      const credits = [
        {
          code: bankCode,
          name: targetAcc.accountName,
          amount: payload.amount,
        },
      ];

      const narration = `Personal Withdrawal / Drawings: ₹${payload.amount.toLocaleString(
        'en-IN'
      )} deducted from ${targetAcc.accountName} for personal use by ${payload.withdrawnBy} (${payload.paymentMode}). Purpose: ${payload.purpose}. ${payload.notes || ''}`.trim();

      await postDoubleEntryTransaction(
        'Payment Voucher',
        payload.date,
        narration,
        debits,
        credits,
        `drawing-${Date.now()}`,
        payload.reference
      );
    },
    [bankAccounts, postDoubleEntryTransaction]
  );

  const checkDuplicateReference = useCallback(
    (reference: string) => {
      if (!reference || !reference.trim()) {
        return { isDuplicate: false };
      }
      const cleanRef = reference.trim().toLowerCase();

      // 1. Check in tombstoned / deleted payments (CRITICAL: prevents double wire payouts)
      const matchedDeleted = deletedPayments.find(
        (dp) => dp.reference && dp.reference.trim().toLowerCase() === cleanRef
      );
      if (matchedDeleted) {
        return {
          isDuplicate: true,
          isDeletedRecord: true,
          matchedRecord: {
            type: `DELETED ${matchedDeleted.originalType.replace('_', ' ').toUpperCase()}`,
            date: matchedDeleted.paymentDate,
            amount: matchedDeleted.amount,
            party: matchedDeleted.partyName,
            details: `CRITICAL DUPLICATE ALERT: A payment of ₹${matchedDeleted.amount.toLocaleString(
              'en-IN'
            )} ${
              matchedDeleted.partyName ? `to/from ${matchedDeleted.partyName}` : ''
            } with Reference "${matchedDeleted.reference}" was ALREADY PROCESSED on ${
              matchedDeleted.paymentDate
            } and DELETED on ${new Date(matchedDeleted.deletedAt).toLocaleDateString(
              'en-IN'
            )}. Re-issuing this payment will cause a DUPLICATE PAYOUT!`,
          },
        };
      }

      // 2. Check in customer payments
      const matchedPayment = payments.find(
        (p) => p.transactionReference && p.transactionReference.trim().toLowerCase() === cleanRef
      );
      if (matchedPayment) {
        return {
          isDuplicate: true,
          matchedRecord: {
            type: 'Customer Payment Receipt',
            date: matchedPayment.paymentDate,
            amount: matchedPayment.amount,
            details: `Recorded on ${matchedPayment.paymentDate} for ₹${matchedPayment.amount.toLocaleString('en-IN')}`,
          },
        };
      }

      // 3. Check in vendor payments
      const matchedVendorPayment = vendorPayments.find(
        (vp) =>
          (vp.transactionReference && vp.transactionReference.trim().toLowerCase() === cleanRef) ||
          (vp.utrNumber && vp.utrNumber.trim().toLowerCase() === cleanRef) ||
          (vp.chequeNumber && vp.chequeNumber.trim().toLowerCase() === cleanRef)
      );
      if (matchedVendorPayment) {
        return {
          isDuplicate: true,
          matchedRecord: {
            type: 'Vendor Payment Voucher',
            date: matchedVendorPayment.paymentDate,
            amount: matchedVendorPayment.amount,
            party: matchedVendorPayment.vendorName,
            details: `Paid to ${matchedVendorPayment.vendorName} on ${matchedVendorPayment.paymentDate} for ₹${matchedVendorPayment.amount.toLocaleString('en-IN')}`,
          },
        };
      }

      // 4. Check in journal entries
      const matchedJV = journalEntries.find(
        (jv) =>
          (jv.referenceNumber && jv.referenceNumber.trim().toLowerCase() === cleanRef) ||
          (jv.referenceId && jv.referenceId.trim().toLowerCase() === cleanRef)
      );
      if (matchedJV) {
        return {
          isDuplicate: true,
          matchedRecord: {
            type: matchedJV.voucherType || 'Journal Voucher',
            date: matchedJV.date,
            amount: matchedJV.totalDebit,
            details: `${matchedJV.voucherNumber}: ${matchedJV.narration} (₹${matchedJV.totalDebit.toLocaleString('en-IN')})`,
          },
        };
      }

      // 5. Check in business expenses
      const matchedExpense = businessExpenses.find(
        (e) => e.referenceNumber && e.referenceNumber.trim().toLowerCase() === cleanRef
      );
      if (matchedExpense) {
        return {
          isDuplicate: true,
          matchedRecord: {
            type: 'Business Expense',
            date: matchedExpense.expenseDate,
            amount: matchedExpense.amount,
            party: matchedExpense.payeeName,
            details: `Paid to ${matchedExpense.payeeName} for ₹${matchedExpense.amount.toLocaleString('en-IN')}`,
          },
        };
      }

      return { isDuplicate: false };
    },
    [payments, vendorPayments, journalEntries, businessExpenses, deletedPayments]
  );

  const updateCompanyProfile = useCallback((profile: CompanyFinanceProfile) => {
    setCompanyProfile(profile);
    saveCompanyProfile(profile);
  }, []);

  const getAccountBalance = useCallback(
    (accountCode: string): number => {
      const head = chartOfAccounts.find((a) => a.code === accountCode);
      return head?.currentBalance || 0;
    },
    [chartOfAccounts]
  );

  const addChartAccount = useCallback(async (head: AccountHead) => {
    setChartOfAccounts((prev) => {
      const exists = prev.some((a) => a.code === head.code);
      const updated = exists ? prev.map((a) => (a.code === head.code ? head : a)) : [...prev, head];
      saveChartOfAccounts(updated);
      return updated;
    });
  }, []);

  // -------------------------------------------------------------
  // PRESERVED CUSTOMER DEALS & PAYMENTS IMPLEMENTATIONS
  // -------------------------------------------------------------
  const getDealById = useCallback(
    (dealId: string) => deals.find((d) => d.id === dealId),
    [deals]
  );

  const getCompanyById = useCallback(
    (companyId: string) => companies.find((c) => c.id === companyId),
    [companies]
  );

  const getPaymentsForDeal = useCallback(
    (dealId: string) =>
      payments
        .filter((p) => p.dealId === dealId)
        .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()),
    [payments]
  );

  const getDocumentsForDeal = useCallback(
    (dealId: string) =>
      documents
        .filter((d) => d.dealId === dealId)
        .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()),
    [documents]
  );

  const checkDuplicateGstin = useCallback(
    (gstin: string, excludeCompanyId?: string) => {
      const normalized = gstin.trim().toUpperCase();
      if (!normalized) return null;
      return (
        companies.find(
          (c) =>
            c.id !== excludeCompanyId &&
            c.gstin &&
            c.gstin.trim().toUpperCase() === normalized
        ) || null
      );
    },
    [companies]
  );

  const createDeal = useCallback(
    async (payload: CreateDealPayload, dealSheetFiles?: File[]): Promise<AccountDeal> => {
      const now = new Date().toISOString();
      let company = companies.find(
        (c) => c.companyName.trim().toLowerCase() === payload.companyName.trim().toLowerCase()
      );

      if (!company) {
        company = {
          id: `comp-${Date.now()}`,
          companyName: payload.companyName.trim(),
          gstin: payload.gstin?.trim() || undefined,
          contactPerson: payload.contactPerson?.trim() || undefined,
          phone: payload.phone?.trim() || undefined,
          email: payload.email?.trim() || undefined,
          address: payload.address?.trim() || undefined,
          createdAt: now,
          updatedAt: now,
        };
        const updatedCompanies = [company, ...companies];
        setCompanies(updatedCompanies);
        await saveCompanies(updatedCompanies);
      }

      const totalReceived = payload.advanceAmount;
      const remainingBalance = payload.decidedAmount - totalReceived;
      const status = computeDealStatus({
        decidedAmount: payload.decidedAmount,
        totalReceived,
        expectedPaymentDate: payload.expectedPaymentDate,
      });
      const dealNumber = generateNextDealId(deals);

      const initialCommitments: PaymentCommitment[] = [];
      if (remainingBalance > 0 && payload.expectedPaymentDate) {
        initialCommitments.push({
          id: `comm-${Date.now()}`,
          dealId: '',
          commitmentDate: payload.expectedPaymentDate,
          amount: remainingBalance,
          note: 'Final balance commitment agreed in payment terms',
          status: 'upcoming',
          createdAt: now,
        });
      }

      const newDeal: AccountDeal = {
        id: `deal-${Date.now()}`,
        dealNumber,
        companyId: company.id,
        companyName: company.companyName,
        companyGstin: company.gstin,
        companyPhone: company.phone,
        companyAddress: company.address,
        contactPerson: company.contactPerson,
        dealDate: payload.dealDate,
        decidedAmount: payload.decidedAmount,
        advanceAmount: payload.advanceAmount,
        totalReceived,
        remainingBalance,
        paymentTerms: payload.paymentTerms,
        expectedPaymentDate: payload.expectedPaymentDate,
        gstInclusive: payload.gstInclusive,
        remarks: payload.remarks,
        status,
        isArchived: false,
        dispatchClearance: remainingBalance > 0 ? 'locked' : 'cleared',
        commitments: initialCommitments,
        nextCommitmentDate: payload.expectedPaymentDate,
        nextCommitmentAmount: remainingBalance > 0 ? remainingBalance : undefined,
        createdBy: userName,
        createdAt: now,
        updatedAt: now,
      };

      if (newDeal.commitments && newDeal.commitments.length > 0) {
        newDeal.commitments[0].dealId = newDeal.id;
      }

      const updatedDeals = [newDeal, ...deals];
      setDeals(updatedDeals);
      await saveDeals(updatedDeals);

      if (payload.advanceAmount > 0) {
        const advancePayment: AccountPayment = {
          id: `pay-${Date.now()}`,
          dealId: newDeal.id,
          paymentDate: payload.dealDate,
          amount: payload.advanceAmount,
          paymentMode: 'Bank Transfer',
          remarks: 'Advance Received on Deal Booking',
          isAdvance: true,
          createdBy: userName,
          createdAt: now,
        };
        const updatedPayments = [advancePayment, ...payments];
        setPayments(updatedPayments);
        await savePayments(updatedPayments);

        // Auto double entry for advance:
        // Dr. Bank (1020), Cr. Customer Advances (2200)
        await postDoubleEntryTransaction(
          'Customer Receipt',
          payload.dealDate,
          `Advance Received from ${company.companyName} on Deal ${dealNumber}`,
          [{ code: '1020', name: 'HDFC Bank Current A/c', amount: payload.advanceAmount }],
          [{ code: '2200', name: 'Customer Advances Received', amount: payload.advanceAmount }],
          newDeal.id,
          dealNumber,
          company.companyName
        );
      }

      if (dealSheetFiles && dealSheetFiles.length > 0) {
        for (const file of dealSheetFiles) {
          try {
            const dataUrl = await fileToDataUrl(file);
            const doc: AccountDealDocument = {
              id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
              dealId: newDeal.id,
              fileName: file.name,
              fileType: file.type || 'application/octet-stream',
              fileSize: file.size,
              fileData: dataUrl,
              uploadedBy: userName,
              uploadedAt: now,
              category: 'deal_sheet',
            };
            await saveDocument(doc);
            setDocuments((prev) => [doc, ...prev]);
          } catch (err) {
            console.error('Failed to attach document:', err);
          }
        }
      }

      return newDeal;
    },
    [companies, deals, payments, userName, postDoubleEntryTransaction]
  );

  const updateDeal = useCallback(
    async (dealId: string, updates: Partial<AccountDeal>) => {
      const now = new Date().toISOString();
      const updatedDeals = deals.map((d) => {
        if (d.id === dealId) {
          const merged = { ...d, ...updates, updatedAt: now };
          const nextReceived = merged.totalReceived ?? d.totalReceived;
          const nextDecided = merged.decidedAmount ?? d.decidedAmount;
          merged.remainingBalance = nextDecided - nextReceived;
          merged.status = computeDealStatus({
            decidedAmount: nextDecided,
            totalReceived: nextReceived,
            expectedPaymentDate: merged.expectedPaymentDate,
          });
          return merged;
        }
        return d;
      });

      setDeals(updatedDeals);
      await saveDeals(updatedDeals);
    },
    [deals]
  );

  const archiveDeal = useCallback(
    async (dealId: string) => {
      await updateDeal(dealId, { isArchived: true });
    },
    [updateDeal]
  );

  const unarchiveDeal = useCallback(
    async (dealId: string) => {
      await updateDeal(dealId, { isArchived: false });
    },
    [updateDeal]
  );

  const deleteDeal = useCallback(
    async (dealId: string) => {
      const updatedDeals = deals.filter((d) => d.id !== dealId);
      setDeals(updatedDeals);
      await saveDeals(updatedDeals);

      const updatedPayments = payments.filter((p) => p.dealId !== dealId);
      setPayments(updatedPayments);
      await savePayments(updatedPayments);

      const dealDocs = documents.filter((doc) => doc.dealId === dealId);
      for (const doc of dealDocs) {
        await deleteDocument(doc.id);
      }
      setDocuments((prev) => prev.filter((doc) => doc.dealId !== dealId));
    },
    [deals, payments, documents]
  );

  const addPayment = useCallback(
    async (payload: CreatePaymentPayload, proofFile?: File | null) => {
      const now = new Date().toISOString();
      const deal = deals.find((d) => d.id === payload.dealId);
      if (!deal) throw new Error('Deal record not found');

      let proofUrl: string | undefined;
      let proofName: string | undefined;

      if (proofFile) {
        try {
          proofUrl = await fileToDataUrl(proofFile);
          proofName = proofFile.name;
        } catch (err) {
          console.error('Failed to read payment slip:', err);
        }
      }

      const newPayment: AccountPayment = {
        id: `pay-${Date.now()}`,
        dealId: payload.dealId,
        paymentDate: payload.paymentDate,
        amount: payload.amount,
        paymentMode: payload.paymentMode,
        transactionReference: payload.transactionReference,
        remarks: payload.remarks,
        isAdvance: payload.isAdvance || false,
        paymentProofUrl: proofUrl,
        paymentProofName: proofName,
        createdBy: userName,
        createdAt: now,
      };

      const updatedPayments = [newPayment, ...payments];
      setPayments(updatedPayments);
      await savePayments(updatedPayments);

      const dealPayments = updatedPayments.filter((p) => p.dealId === deal.id);
      const totalReceived = dealPayments.reduce((sum, p) => sum + p.amount, 0);
      const remainingBalance = deal.decidedAmount - totalReceived;
      const status = computeDealStatus({
        decidedAmount: deal.decidedAmount,
        totalReceived,
        expectedPaymentDate: deal.expectedPaymentDate,
      });

      const updatedDeals = deals.map((d) => {
        if (d.id === deal.id) {
          return {
            ...d,
            totalReceived,
            remainingBalance,
            status,
            dispatchClearance: remainingBalance <= 0 ? 'cleared' : d.dispatchClearance,
            updatedAt: now,
          };
        }
        return d;
      });

      setDeals(updatedDeals);
      await saveDeals(updatedDeals);

      // Deposit into Primary Bank/Cash Account
      setBankAccounts((prev) =>
        prev.map((ba) => {
          if (ba.isDefault || (ba.accountType === 'cash' && payload.paymentMode === 'Cash')) {
            return { ...ba, currentBalance: ba.currentBalance + payload.amount };
          }
          return ba;
        })
      );

      // Auto Double-Entry:
      // Dr. Bank/Cash (1020 / 1010)
      // Cr. Accounts Receivable (1100)
      const bankHeadCode = payload.paymentMode === 'Cash' ? '1010' : '1020';
      await postDoubleEntryTransaction(
        'Customer Receipt',
        payload.paymentDate,
        `Payment Received for Deal ${deal.dealNumber} from ${deal.companyName}`,
        [{ code: bankHeadCode, name: 'Bank/Cash Account', amount: payload.amount }],
        [{ code: '1100', name: 'Accounts Receivable (Sundry Debtors)', amount: payload.amount }],
        deal.id,
        deal.dealNumber,
        deal.companyName
      );
    },
    [deals, payments, userName, postDoubleEntryTransaction]
  );

  const updatePayment = useCallback(
    async (paymentId: string, updates: Partial<AccountPayment>) => {
      const now = new Date().toISOString();
      let targetDealId: string | undefined;

      const updatedPayments = payments.map((p) => {
        if (p.id === paymentId) {
          targetDealId = p.dealId;
          return { ...p, ...updates, updatedAt: now };
        }
        return p;
      });

      setPayments(updatedPayments);
      await savePayments(updatedPayments);

      if (targetDealId) {
        const deal = deals.find((d) => d.id === targetDealId);
        if (deal) {
          const dealPayments = updatedPayments.filter((p) => p.dealId === deal.id);
          const totalReceived = dealPayments.reduce((sum, p) => sum + p.amount, 0);
          const remainingBalance = deal.decidedAmount - totalReceived;
          const status = computeDealStatus({
        decidedAmount: deal.decidedAmount,
        totalReceived,
        expectedPaymentDate: deal.expectedPaymentDate,
      });

          const updatedDeals = deals.map((d) =>
            d.id === deal.id ? { ...d, totalReceived, remainingBalance, status, updatedAt: now } : d
          );
          setDeals(updatedDeals);
          await saveDeals(updatedDeals);
        }
      }
    },
    [payments, deals, recordDeletedPayment, userName]
  );

  const deletePayment = useCallback(
    async (paymentId: string) => {
      const targetPayment = payments.find((p) => p.id === paymentId);
      if (!targetPayment) return;

      const matchedDeal = deals.find((d) => d.id === targetPayment.dealId);

      await recordDeletedPayment({
        reference: targetPayment.transactionReference || targetPayment.id,
        originalType: 'customer_payment',
        partyName: matchedDeal?.companyName || 'Customer Receipt',
        amount: targetPayment.amount,
        paymentDate: targetPayment.paymentDate,
        deletedBy: userName,
        reason: 'Customer receipt deleted from deal register (Tombstoned to prevent duplicate entry)',
      });

      const updatedPayments = payments.filter((p) => p.id !== paymentId);
      setPayments(updatedPayments);
      await savePayments(updatedPayments);

      const deal = deals.find((d) => d.id === targetPayment.dealId);
      if (deal) {
        const dealPayments = updatedPayments.filter((p) => p.dealId === deal.id);
        const totalReceived = dealPayments.reduce((sum, p) => sum + p.amount, 0);
        const remainingBalance = deal.decidedAmount - totalReceived;
        const status = computeDealStatus({
        decidedAmount: deal.decidedAmount,
        totalReceived,
        expectedPaymentDate: deal.expectedPaymentDate,
      });

        const updatedDeals = deals.map((d) =>
          d.id === deal.id ? { ...d, totalReceived, remainingBalance, status, updatedAt: new Date().toISOString() } : d
        );
        setDeals(updatedDeals);
        await saveDeals(updatedDeals);
      }
    },
    [payments, deals, recordDeletedPayment, userName]
  );

  const uploadDealDocument = useCallback(
    async (dealId: string, file: File, category?: AccountDealDocument['category']): Promise<AccountDealDocument> => {
      const dataUrl = await fileToDataUrl(file);
      const newDoc: AccountDealDocument = {
        id: `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        dealId,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        fileData: dataUrl,
        uploadedBy: userName,
        uploadedAt: new Date().toISOString(),
        category: category || 'deal_sheet',
      };

      await saveDocument(newDoc);
      setDocuments((prev) => [newDoc, ...prev]);
      return newDoc;
    },
    [userName]
  );

  const removeDealDocument = useCallback(async (docId: string) => {
    await deleteDocument(docId);
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  }, []);

  const setDispatchClearance = useCallback(
    async (dealId: string, status: DispatchClearanceStatus, remarks?: string) => {
      const now = new Date().toISOString();
      const updatedDeals = deals.map((d) => {
        if (d.id === dealId) {
          return {
            ...d,
            dispatchClearance: status,
            dispatchClearedBy: userName,
            dispatchClearedAt: now,
            dispatchClearanceRemarks: remarks,
            updatedAt: now,
          };
        }
        return d;
      });
      setDeals(updatedDeals);
      await saveDeals(updatedDeals);
    },
    [deals, userName]
  );

  const addCommitment = useCallback(
    async (dealId: string, payload: { commitmentDate: string; amount: number; note?: string }) => {
      const now = new Date().toISOString();
      const newComm: PaymentCommitment = {
        id: `comm-${Date.now()}`,
        dealId,
        commitmentDate: payload.commitmentDate,
        amount: payload.amount,
        note: payload.note,
        status: 'upcoming',
        createdAt: now,
      };

      const updatedDeals = deals.map((d) => {
        if (d.id === dealId) {
          const existingList = d.commitments || [];
          const updatedList = [...existingList, newComm].sort(
            (a, b) => new Date(a.commitmentDate).getTime() - new Date(b.commitmentDate).getTime()
          );

          const nextActive = updatedList.find((c) => c.status === 'upcoming' || c.status === 'due');

          return {
            ...d,
            commitments: updatedList,
            nextCommitmentDate: nextActive?.commitmentDate,
            nextCommitmentAmount: nextActive?.amount,
            expectedPaymentDate: nextActive?.commitmentDate || d.expectedPaymentDate,
            updatedAt: now,
          };
        }
        return d;
      });

      setDeals(updatedDeals);
      await saveDeals(updatedDeals);
    },
    [deals]
  );

  const updateCommitmentStatus = useCallback(
    async (dealId: string, commitmentId: string, status: CommitmentStatus) => {
      const now = new Date().toISOString();
      const updatedDeals = deals.map((d) => {
        if (d.id === dealId) {
          const existingList = d.commitments || [];
          const updatedList = existingList.map((c) => {
            if (c.id === commitmentId) {
              return {
                ...c,
                status,
                markedDueAt: status === 'due' ? now : c.markedDueAt,
                receivedAt: status === 'received' ? now : c.receivedAt,
                updatedAt: now,
              };
            }
            return c;
          });

          const nextActive = updatedList.find((c) => c.status === 'upcoming' || c.status === 'due');

          return {
            ...d,
            commitments: updatedList,
            nextCommitmentDate: nextActive?.commitmentDate,
            nextCommitmentAmount: nextActive?.amount,
            expectedPaymentDate: nextActive?.commitmentDate || d.expectedPaymentDate,
            updatedAt: now,
          };
        }
        return d;
      });

      setDeals(updatedDeals);
      await saveDeals(updatedDeals);
    },
    [deals]
  );

  const deleteCommitment = useCallback(
    async (dealId: string, commitmentId: string) => {
      const now = new Date().toISOString();
      const updatedDeals = deals.map((d) => {
        if (d.id === dealId) {
          const existingList = d.commitments || [];
          const updatedList = existingList.filter((c) => c.id !== commitmentId);
          const nextActive = updatedList.find((c) => c.status === 'upcoming' || c.status === 'due');

          return {
            ...d,
            commitments: updatedList,
            nextCommitmentDate: nextActive?.commitmentDate,
            nextCommitmentAmount: nextActive?.amount,
            updatedAt: now,
          };
        }
        return d;
      });

      setDeals(updatedDeals);
      await saveDeals(updatedDeals);
    },
    [deals]
  );

  // -------------------------------------------------------------
  // PDF & EXCEL EXPORTS
  // -------------------------------------------------------------
  const exportCurrentDealPDF = useCallback(
    (dealId: string) => {
      const deal = deals.find((d) => d.id === dealId);
      if (!deal) return;
      const company = companies.find((c) => c.id === deal.companyId);
      const dealPayments = payments.filter((p) => p.dealId === deal.id);
      exportDealSummaryPDF(deal, company, dealPayments);
    },
    [deals, companies, payments]
  );

  const exportPaymentReceipt = useCallback(
    (paymentId: string) => {
      const payment = payments.find((p) => p.id === paymentId);
      if (!payment) return;
      const deal = deals.find((d) => d.id === payment.dealId);
      if (!deal) return;
      const company = companies.find((c) => c.id === deal.companyId);
      exportPaymentReceiptPDF(payment, deal, company);
    },
    [payments, deals, companies]
  );

  const exportAllDealsExcel = useCallback(() => {
    exportAllDealsToExcel(deals);
  }, [deals]);

  const exportPaymentHistoryExcel = useCallback(
    (dealId?: string) => {
      const dealMap = new Map<string, AccountDeal>();
      deals.forEach((d) => dealMap.set(d.id, d));
      const targetPayments = dealId ? payments.filter((p) => p.dealId === dealId) : payments;
      exportPaymentHistoryToExcel(targetPayments, dealMap);
    },
    [payments, deals]
  );

  return (
    <AccountsContext.Provider
      value={{
        companies,
        deals,
        payments,
        documents,
        isLoading,
        summary,
        activeView,
        selectedDealId,
        searchQuery,
        setActiveView,
        setSelectedDealId,
        setSearchQuery,
        createDeal,
        updateDeal,
        archiveDeal,
        unarchiveDeal,
        deleteDeal,
        addPayment,
        updatePayment,
        deletePayment,
        uploadDealDocument,
        removeDealDocument,
        getDealById,
        getCompanyById,
        getPaymentsForDeal,
        getDocumentsForDeal,
        checkDuplicateGstin,
        setDispatchClearance,
        addCommitment,
        updateCommitmentStatus,
        deleteCommitment,
        exportPaymentReceipt,
        exportCurrentDealPDF,
        exportAllDealsExcel,
        exportPaymentHistoryExcel,

        // New Finance Management State & Actions
        financeMetrics,
        salesInvoices,
        purchaseOrdersFinance,
        purchaseBills,
        financeVendors,
        vendorPayments,
        businessExpenses,
        chartOfAccounts,
        journalEntries,
        bankAccounts,
        companyProfile,

        addSalesInvoice,
        updateSalesInvoice,
        deleteSalesInvoice,
        addPurchaseOrderFinance,
        updatePurchaseOrderFinance,
        addPurchaseBill,
        updatePurchaseBill,
        deletePurchaseBill,
        addFinanceVendor,
        updateFinanceVendor,
        addVendorPayment,
        deleteVendorPayment,
        addBusinessExpense,
        deleteBusinessExpense,
        addJournalEntry,
        reverseJournalEntry,
        addBankAccount,
        updateBankAccount,
        transferBankFunds,
        depositFundsToAccount,
        withdrawPersonalFunds,
        deletedPayments,
        recordDeletedPayment,
        checkDuplicateReference,
        updateCompanyProfile,
        getAccountBalance,
        addChartAccount,
      }}
    >
      {children}
    </AccountsContext.Provider>
  );
};

export const useAccounts = () => {
  const context = useContext(AccountsContext);
  if (!context) {
    throw new Error('useAccounts must be used within an AccountsProvider');
  }
  return context;
};
