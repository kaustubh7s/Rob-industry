import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  AccountCompany,
  AccountDeal,
  AccountPayment,
  AccountDealDocument,
  AccountsDashboardSummary,
  PaymentMode,
  DealStatus,
} from '../types/accounts';
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
  computeDealStatus,
  generateNextDealId,
  exportDealSummaryPDF,
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
  | 'settings';

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
  exportCurrentDealPDF: (dealId: string) => void;
  exportAllDealsExcel: () => void;
  exportPaymentHistoryExcel: (dealId?: string) => void;
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

  const [companies, setCompanies] = useState<AccountCompany[]>([]);
  const [deals, setDeals] = useState<AccountDeal[]>([]);
  const [payments, setPayments] = useState<AccountPayment[]>([]);
  const [documents, setDocuments] = useState<AccountDealDocument[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [activeView, setActiveView] = useState<AccountsView>('overview');
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Initial Data Hydration
  useEffect(() => {
    let isMounted = true;
    const hydrate = async () => {
      try {
        const [loadedComp, loadedDeals, loadedPay, loadedDocs] = await Promise.all([
          loadCompanies(),
          loadDeals(),
          loadPayments(),
          loadAllDocuments(),
        ]);
        if (isMounted) {
          setCompanies(loadedComp);
          setDeals(loadedDeals);
          setPayments(loadedPay);
          setDocuments(loadedDocs);
        }
      } catch (err) {
        console.error('Failed to load accounts datasets:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    hydrate();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute 4 Top Summary Numbers
  const summary: AccountsDashboardSummary = useMemo(() => {
    const activeDeals = deals.filter((d) => !d.isArchived);
    const totalDeals = activeDeals.length;

    let totalDealValue = 0;
    let totalReceived = 0;
    let overdueCount = 0;

    activeDeals.forEach((d) => {
      totalDealValue += Number(d.decidedAmount) || 0;
      totalReceived += Number(d.totalReceived) || 0;
      if (d.status === 'overdue') {
        overdueCount += 1;
      }
    });

    const outstandingBalance = Math.max(0, totalDealValue - totalReceived);

    return {
      totalDeals,
      totalDealValue,
      totalReceived,
      outstandingBalance,
      overdueDealsCount: overdueCount,
    };
  }, [deals]);

  // View navigation helper
  const handleSetActiveView = useCallback((view: AccountsView, dealId?: string | null) => {
    setActiveView(view);
    if (dealId !== undefined) {
      setSelectedDealId(dealId);
    }
    // Scroll top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Check if GSTIN already exists on another company
  const checkDuplicateGstin = useCallback(
    (gstin: string, excludeCompanyId?: string): AccountCompany | null => {
      if (!gstin || !gstin.trim()) return null;
      const normalized = gstin.trim().toUpperCase();
      return (
        companies.find(
          (c) =>
            c.gstin &&
            c.gstin.trim().toUpperCase() === normalized &&
            c.id !== excludeCompanyId
        ) || null
      );
    },
    [companies]
  );

  // CREATE NEW DEAL
  const createDeal = useCallback(
    async (payload: CreateDealPayload, dealSheetFiles?: File[]): Promise<AccountDeal> => {
      const now = new Date().toISOString();
      const trimmedCompanyName = payload.companyName.trim();
      const trimmedGstin = payload.gstin?.trim().toUpperCase() || undefined;

      // 1. Find or create company
      let targetCompany = companies.find(
        (c) =>
          (trimmedGstin && c.gstin?.toUpperCase() === trimmedGstin) ||
          c.companyName.toLowerCase() === trimmedCompanyName.toLowerCase()
      );

      let updatedCompanies = [...companies];
      if (!targetCompany) {
        targetCompany = {
          id: `comp-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
          companyName: trimmedCompanyName,
          gstin: trimmedGstin,
          contactPerson: payload.contactPerson?.trim() || undefined,
          phone: payload.phone?.trim() || undefined,
          email: payload.email?.trim() || undefined,
          address: payload.address?.trim() || undefined,
          createdAt: now,
          updatedAt: now,
        };
        updatedCompanies = [targetCompany, ...updatedCompanies];
        setCompanies(updatedCompanies);
        await saveCompanies(updatedCompanies);
      } else {
        // Update contact details if provided
        targetCompany = {
          ...targetCompany,
          contactPerson: payload.contactPerson?.trim() || targetCompany.contactPerson,
          phone: payload.phone?.trim() || targetCompany.phone,
          email: payload.email?.trim() || targetCompany.email,
          address: payload.address?.trim() || targetCompany.address,
          gstin: trimmedGstin || targetCompany.gstin,
          updatedAt: now,
        };
        updatedCompanies = updatedCompanies.map((c) => (c.id === targetCompany!.id ? targetCompany! : c));
        setCompanies(updatedCompanies);
        await saveCompanies(updatedCompanies);
      }

      // 2. Compute Deal Amounts & Advance
      const decidedAmount = Math.max(0, Math.round(Number(payload.decidedAmount) || 0));
      const advanceAmount = Math.max(0, Math.round(Number(payload.advanceAmount) || 0));
      const totalReceived = advanceAmount; // Advance is the first received payment
      const remainingBalance = Math.max(0, decidedAmount - totalReceived);

      const dealId = `deal-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
      const dealNumber = generateNextDealId(deals);

      const status = computeDealStatus({
        decidedAmount,
        totalReceived,
        expectedPaymentDate: payload.expectedPaymentDate,
      });

      const newDeal: AccountDeal = {
        id: dealId,
        dealNumber,
        companyId: targetCompany.id,
        companyName: targetCompany.companyName,
        companyGstin: targetCompany.gstin,
        companyPhone: targetCompany.phone,
        companyAddress: targetCompany.address,
        contactPerson: targetCompany.contactPerson,
        dealDate: payload.dealDate || now.split('T')[0],
        decidedAmount,
        advanceAmount,
        totalReceived,
        remainingBalance,
        paymentTerms: payload.paymentTerms || '100% Advance',
        expectedPaymentDate: payload.expectedPaymentDate || undefined,
        gstInclusive: Boolean(payload.gstInclusive),
        remarks: payload.remarks?.trim() || undefined,
        status,
        isArchived: false,
        createdBy: userName,
        createdAt: now,
        updatedAt: now,
      };

      const nextDeals = [newDeal, ...deals];
      setDeals(nextDeals);
      await saveDeals(nextDeals);

      // 3. Record Advance as First Payment Transaction (if > 0)
      let nextPayments = [...payments];
      if (advanceAmount > 0) {
        const advancePayment: AccountPayment = {
          id: `pay-${Date.now()}-adv`,
          dealId,
          paymentDate: newDeal.dealDate,
          amount: advanceAmount,
          paymentMode: 'Bank Transfer',
          transactionReference: 'Initial Booking Advance',
          remarks: 'Advance Payment received at deal sign-off',
          isAdvance: true,
          createdBy: userName,
          createdAt: now,
        };
        nextPayments = [advancePayment, ...nextPayments];
        setPayments(nextPayments);
        await savePayments(nextPayments);
      }

      // 4. Upload & Link Deal Sheets (if any)
      if (dealSheetFiles && dealSheetFiles.length > 0) {
        const nextDocs = [...documents];
        for (const file of dealSheetFiles) {
          try {
            const dataUrl = await fileToDataUrl(file);
            const docItem: AccountDealDocument = {
              id: `doc-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
              dealId,
              fileName: file.name,
              fileType: file.type || 'application/octet-stream',
              fileSize: file.size,
              fileData: dataUrl,
              uploadedBy: userName,
              uploadedAt: now,
              category: 'deal_sheet',
            };
            nextDocs.unshift(docItem);
            await saveDocument(docItem);
          } catch (fileErr) {
            console.error('Error saving deal sheet document:', fileErr);
          }
        }
        setDocuments(nextDocs);
      }

      return newDeal;
    },
    [companies, deals, payments, documents, userName]
  );

  // UPDATE DEAL
  const updateDeal = useCallback(
    async (dealId: string, updates: Partial<AccountDeal>): Promise<void> => {
      const now = new Date().toISOString();
      const nextDeals = deals.map((d) => {
        if (d.id !== dealId) return d;
        const merged = { ...d, ...updates, updatedAt: now };

        // Recalculate status and balance
        const decidedAmount = Math.max(0, Math.round(Number(merged.decidedAmount) || 0));
        const totalReceived = Math.max(0, Math.round(Number(merged.totalReceived) || 0));
        const remainingBalance = Math.max(0, decidedAmount - totalReceived);
        const status = computeDealStatus({
          decidedAmount,
          totalReceived,
          expectedPaymentDate: merged.expectedPaymentDate,
        });

        return {
          ...merged,
          decidedAmount,
          totalReceived,
          remainingBalance,
          status,
        };
      });

      setDeals(nextDeals);
      await saveDeals(nextDeals);
    },
    [deals]
  );

  // ARCHIVE / UNARCHIVE DEAL
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

  // DELETE DEAL (Admin Only)
  const deleteDeal = useCallback(
    async (dealId: string) => {
      const nextDeals = deals.filter((d) => d.id !== dealId);
      const nextPayments = payments.filter((p) => p.dealId !== dealId);
      const nextDocs = documents.filter((doc) => doc.dealId !== dealId);

      setDeals(nextDeals);
      setPayments(nextPayments);
      setDocuments(nextDocs);

      await Promise.all([
        saveDeals(nextDeals),
        savePayments(nextPayments),
        ...documents.filter((doc) => doc.dealId === dealId).map((doc) => deleteDocument(doc.id)),
      ]);
    },
    [deals, payments, documents]
  );

  // ADD PAYMENT
  const addPayment = useCallback(
    async (payload: CreatePaymentPayload, proofFile?: File | null): Promise<void> => {
      const now = new Date().toISOString();
      const payAmount = Math.max(0, Math.round(Number(payload.amount) || 0));
      if (payAmount <= 0) return;

      let paymentProofUrl: string | undefined = undefined;
      let paymentProofName: string | undefined = undefined;

      if (proofFile) {
        try {
          paymentProofUrl = await fileToDataUrl(proofFile);
          paymentProofName = proofFile.name;
        } catch (err) {
          console.error('Error reading payment proof:', err);
        }
      }

      const newPayment: AccountPayment = {
        id: `pay-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        dealId: payload.dealId,
        paymentDate: payload.paymentDate || now.split('T')[0],
        amount: payAmount,
        paymentMode: payload.paymentMode || 'Bank Transfer',
        transactionReference: payload.transactionReference?.trim() || undefined,
        remarks: payload.remarks?.trim() || undefined,
        isAdvance: Boolean(payload.isAdvance),
        paymentProofUrl,
        paymentProofName,
        createdBy: userName,
        createdAt: now,
      };

      const nextPayments = [newPayment, ...payments];
      setPayments(nextPayments);
      await savePayments(nextPayments);

      // Recalculate Deal Total Received & Status
      const dealPayments = nextPayments.filter((p) => p.dealId === payload.dealId);
      const newTotalReceived = dealPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      const targetDeal = deals.find((d) => d.id === payload.dealId);
      if (targetDeal) {
        const decidedAmount = Number(targetDeal.decidedAmount) || 0;
        const remainingBalance = Math.max(0, decidedAmount - newTotalReceived);
        const status = computeDealStatus({
          decidedAmount,
          totalReceived: newTotalReceived,
          expectedPaymentDate: targetDeal.expectedPaymentDate,
        });

        const nextDeals = deals.map((d) =>
          d.id === payload.dealId
            ? {
                ...d,
                totalReceived: newTotalReceived,
                remainingBalance,
                status,
                updatedAt: now,
              }
            : d
        );
        setDeals(nextDeals);
        await saveDeals(nextDeals);
      }
    },
    [payments, deals, userName]
  );

  // UPDATE PAYMENT
  const updatePayment = useCallback(
    async (paymentId: string, updates: Partial<AccountPayment>): Promise<void> => {
      const now = new Date().toISOString();
      let targetDealId = '';

      const nextPayments = payments.map((p) => {
        if (p.id !== paymentId) return p;
        targetDealId = p.dealId;
        return { ...p, ...updates, updatedAt: now };
      });

      setPayments(nextPayments);
      await savePayments(nextPayments);

      if (targetDealId) {
        const dealPayments = nextPayments.filter((p) => p.dealId === targetDealId);
        const newTotalReceived = dealPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const targetDeal = deals.find((d) => d.id === targetDealId);

        if (targetDeal) {
          const decidedAmount = Number(targetDeal.decidedAmount) || 0;
          const remainingBalance = Math.max(0, decidedAmount - newTotalReceived);
          const status = computeDealStatus({
            decidedAmount,
            totalReceived: newTotalReceived,
            expectedPaymentDate: targetDeal.expectedPaymentDate,
          });

          const nextDeals = deals.map((d) =>
            d.id === targetDealId
              ? {
                  ...d,
                  totalReceived: newTotalReceived,
                  remainingBalance,
                  status,
                  updatedAt: now,
                }
              : d
          );
          setDeals(nextDeals);
          await saveDeals(nextDeals);
        }
      }
    },
    [payments, deals]
  );

  // DELETE PAYMENT (Audit Safe)
  const deletePayment = useCallback(
    async (paymentId: string): Promise<void> => {
      const targetPayment = payments.find((p) => p.id === paymentId);
      if (!targetPayment) return;

      const nextPayments = payments.filter((p) => p.id !== paymentId);
      setPayments(nextPayments);
      await savePayments(nextPayments);

      const dealId = targetPayment.dealId;
      const dealPayments = nextPayments.filter((p) => p.dealId === dealId);
      const newTotalReceived = dealPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const targetDeal = deals.find((d) => d.id === dealId);

      if (targetDeal) {
        const decidedAmount = Number(targetDeal.decidedAmount) || 0;
        const remainingBalance = Math.max(0, decidedAmount - newTotalReceived);
        const status = computeDealStatus({
          decidedAmount,
          totalReceived: newTotalReceived,
          expectedPaymentDate: targetDeal.expectedPaymentDate,
        });

        const nextDeals = deals.map((d) =>
          d.id === dealId
            ? {
                ...d,
                totalReceived: newTotalReceived,
                remainingBalance,
                status,
                updatedAt: new Date().toISOString(),
              }
            : d
        );
        setDeals(nextDeals);
        await saveDeals(nextDeals);
      }
    },
    [payments, deals]
  );

  // UPLOAD DEAL DOCUMENT
  const uploadDealDocument = useCallback(
    async (
      dealId: string,
      file: File,
      category: AccountDealDocument['category'] = 'deal_sheet'
    ): Promise<AccountDealDocument> => {
      const now = new Date().toISOString();
      const dataUrl = await fileToDataUrl(file);
      const docItem: AccountDealDocument = {
        id: `doc-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`,
        dealId,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        fileData: dataUrl,
        uploadedBy: userName,
        uploadedAt: now,
        category,
      };

      const nextDocs = [docItem, ...documents];
      setDocuments(nextDocs);
      await saveDocument(docItem);
      return docItem;
    },
    [documents, userName]
  );

  // REMOVE DEAL DOCUMENT
  const removeDealDocument = useCallback(
    async (docId: string): Promise<void> => {
      const nextDocs = documents.filter((d) => d.id !== docId);
      setDocuments(nextDocs);
      await deleteDocument(docId);
    },
    [documents]
  );

  // Helper selectors
  const getDealById = useCallback((id: string) => deals.find((d) => d.id === id), [deals]);
  const getCompanyById = useCallback((id: string) => companies.find((c) => c.id === id), [companies]);
  const getPaymentsForDeal = useCallback(
    (dealId: string) =>
      payments
        .filter((p) => p.dealId === dealId)
        .sort((a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()),
    [payments]
  );
  const getDocumentsForDeal = useCallback(
    (dealId: string) => documents.filter((d) => d.dealId === dealId),
    [documents]
  );

  // EXPORT ACTIONS
  const exportCurrentDealPDF = useCallback(
    (dealId: string) => {
      const deal = deals.find((d) => d.id === dealId);
      if (!deal) return;
      const company = companies.find((c) => c.id === deal.companyId);
      const dealPayments = payments.filter((p) => p.dealId === dealId);
      exportDealSummaryPDF(deal, company, dealPayments);
    },
    [deals, companies, payments]
  );

  const exportAllDealsExcel = useCallback(() => {
    exportAllDealsToExcel(deals);
  }, [deals]);

  const exportPaymentHistoryExcel = useCallback(
    (dealId?: string) => {
      const targetPayments = dealId ? payments.filter((p) => p.dealId === dealId) : payments;
      const dealMap = new Map<string, AccountDeal>();
      deals.forEach((d) => dealMap.set(d.id, d));
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
        setActiveView: handleSetActiveView,
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
        exportCurrentDealPDF,
        exportAllDealsExcel,
        exportPaymentHistoryExcel,
      }}
    >
      {children}
    </AccountsContext.Provider>
  );
};

export const useAccounts = (): AccountsContextType => {
  const context = useContext(AccountsContext);
  if (!context) {
    throw new Error('useAccounts must be used within an AccountsProvider');
  }
  return context;
};

