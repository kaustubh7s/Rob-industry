import {
  AccountCompany,
  AccountDeal,
  AccountPayment,
  AccountDealDocument,
} from '../types/accounts';
import { getSupabaseClient } from '../lib/supabaseClient';

const DB_NAME = 'rsb_accounts_database_v1';
const DB_VERSION = 1;

const STORES = {
  COMPANIES: 'companies',
  DEALS: 'deals',
  PAYMENTS: 'payments',
  DOCUMENTS: 'documents',
};

const LOCAL_STORAGE_KEYS = {
  COMPANIES: 'rsb_acc_companies_cache',
  DEALS: 'rsb_acc_deals_cache',
  PAYMENTS: 'rsb_acc_payments_cache',
};

// Open IndexedDB database
function openAccountsDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORES.COMPANIES)) {
        db.createObjectStore(STORES.COMPANIES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.DEALS)) {
        const dealStore = db.createObjectStore(STORES.DEALS, { keyPath: 'id' });
        dealStore.createIndex('companyId', 'companyId', { unique: false });
        dealStore.createIndex('dealNumber', 'dealNumber', { unique: true });
      }
      if (!db.objectStoreNames.contains(STORES.PAYMENTS)) {
        const payStore = db.createObjectStore(STORES.PAYMENTS, { keyPath: 'id' });
        payStore.createIndex('dealId', 'dealId', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORES.DOCUMENTS)) {
        const docStore = db.createObjectStore(STORES.DOCUMENTS, { keyPath: 'id' });
        docStore.createIndex('dealId', 'dealId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Initial seed data so the accountant has realistic examples to see right away
export const INITIAL_COMPANIES: AccountCompany[] = [
  {
    id: 'comp-101',
    companyName: 'Apex Engineering Solutions',
    gstin: '27AABCA1234A1Z5',
    contactPerson: 'Suresh Patel',
    phone: '+91 98250 44551',
    email: 'accounts@apexengineering.com',
    address: 'GIDC Industrial Estate, Vatva, Ahmedabad, Gujarat',
    createdAt: '2026-10-15T10:00:00.000Z',
    updatedAt: '2026-10-15T10:00:00.000Z',
  },
  {
    id: 'comp-102',
    companyName: 'Bharat Pharma Automations',
    gstin: '24AAACB9876F1Z8',
    contactPerson: 'Mehul Shah',
    phone: '+91 98980 12345',
    email: 'finance@bharatpharma.in',
    address: 'Makarpura Industrial Area, Vadodara, Gujarat',
    createdAt: '2026-10-20T11:30:00.000Z',
    updatedAt: '2026-10-20T11:30:00.000Z',
  },
];

export const INITIAL_DEALS: AccountDeal[] = [
  {
    id: 'deal-101',
    dealNumber: 'RSB-ACC-2026-001',
    companyId: 'comp-101',
    companyName: 'Apex Engineering Solutions',
    companyGstin: '27AABCA1234A1Z5',
    companyPhone: '+91 98250 44551',
    companyAddress: 'GIDC Industrial Estate, Vatva, Ahmedabad, Gujarat',
    contactPerson: 'Suresh Patel',
    dealDate: '2026-10-15',
    decidedAmount: 1000000,
    advanceAmount: 200000,
    totalReceived: 400000,
    remainingBalance: 600000,
    paymentTerms: '30% Advance / 40% During Production / 30% Before Dispatch',
    expectedPaymentDate: '2026-11-20',
    gstInclusive: true,
    remarks: 'Complete Automatic Vial Washing & Labelling System fabrication order.',
    status: 'partially_received',
    isArchived: false,
    dispatchClearance: 'locked',
    dispatchClearanceRemarks: 'Pending final stage payment of ₹6,00,000 before machinery dispatch.',
    createdBy: 'Kaustubh',
    createdAt: '2026-10-15T10:00:00.000Z',
    updatedAt: '2026-10-25T14:30:00.000Z',
  },
  {
    id: 'deal-102',
    dealNumber: 'RSB-ACC-2026-002',
    companyId: 'comp-102',
    companyName: 'Bharat Pharma Automations',
    companyGstin: '24AAACB9876F1Z8',
    companyPhone: '+91 98980 12345',
    companyAddress: 'Makarpura Industrial Area, Vadodara, Gujarat',
    contactPerson: 'Mehul Shah',
    dealDate: '2026-10-20',
    decidedAmount: 650000,
    advanceAmount: 325000,
    totalReceived: 650000,
    remainingBalance: 0,
    paymentTerms: '50% Advance / 50% Before Dispatch',
    expectedPaymentDate: '2026-10-30',
    gstInclusive: false,
    remarks: 'High-speed Mono Conveyor System. Fully settled prior to dispatch.',
    status: 'fully_paid',
    isArchived: false,
    dispatchClearance: 'cleared',
    dispatchClearedBy: 'Super Admin',
    dispatchClearedAt: '2026-10-30T09:15:00.000Z',
    dispatchClearanceRemarks: 'Full payment received in bank. Cleared for plant dispatch.',
    createdBy: 'Amit',
    createdAt: '2026-10-20T11:30:00.000Z',
    updatedAt: '2026-10-30T09:15:00.000Z',
  },
];

export const INITIAL_PAYMENTS: AccountPayment[] = [
  {
    id: 'pay-101-1',
    dealId: 'deal-101',
    paymentDate: '2026-10-15',
    amount: 200000,
    paymentMode: 'Bank Transfer',
    transactionReference: 'NEFT-HDFC-991203',
    remarks: 'Initial Booking Advance Payment (20%)',
    isAdvance: true,
    createdBy: 'Kaustubh',
    createdAt: '2026-10-15T10:30:00.000Z',
  },
  {
    id: 'pay-101-2',
    dealId: 'deal-101',
    paymentDate: '2026-10-25',
    amount: 200000,
    paymentMode: 'UPI',
    transactionReference: 'UPI-AXIS-882194',
    remarks: 'Fabrication Stage 1 Clearance',
    isAdvance: false,
    createdBy: 'Kaustubh',
    createdAt: '2026-10-25T14:30:00.000Z',
  },
  {
    id: 'pay-102-1',
    dealId: 'deal-102',
    paymentDate: '2026-10-20',
    amount: 325000,
    paymentMode: 'Bank Transfer',
    transactionReference: 'RTGS-SBIN-445102',
    remarks: '50% Advance on Purchase Order sign-off',
    isAdvance: true,
    createdBy: 'Amit',
    createdAt: '2026-10-20T12:00:00.000Z',
  },
  {
    id: 'pay-102-2',
    dealId: 'deal-102',
    paymentDate: '2026-10-30',
    amount: 325000,
    paymentMode: 'Cheque',
    transactionReference: 'CHQ-ICICI-001924',
    remarks: 'Final 50% balance cleared before plant dispatch',
    isAdvance: false,
    createdBy: 'Amit',
    createdAt: '2026-10-30T09:15:00.000Z',
  },
];

/**
 * Loads all companies from storage
 */
export async function loadCompanies(): Promise<AccountCompany[]> {
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEYS.COMPANIES);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  try {
    const db = await openAccountsDB();
    const tx = db.transaction(STORES.COMPANIES, 'readonly');
    const store = tx.objectStore(STORES.COMPANIES);
    const all = await new Promise<AccountCompany[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    if (all && all.length > 0) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.COMPANIES, JSON.stringify(all));
      } catch {}
      return all;
    }
  } catch {}

  // Fallback to initial seed
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.COMPANIES, JSON.stringify(INITIAL_COMPANIES));
  } catch {}
  return INITIAL_COMPANIES;
}

/**
 * Saves all companies
 */
export async function saveCompanies(companies: AccountCompany[]): Promise<void> {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.COMPANIES, JSON.stringify(companies));
  } catch {}

  try {
    const db = await openAccountsDB();
    const tx = db.transaction(STORES.COMPANIES, 'readwrite');
    const store = tx.objectStore(STORES.COMPANIES);
    store.clear();
    companies.forEach((c) => store.put(c));
  } catch {}

  // Cloud sync if Supabase table is accessible
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('accounts_companies').upsert(companies, { onConflict: 'id' });
    }
  } catch {}
}

/**
 * Loads all deals from storage
 */
export async function loadDeals(): Promise<AccountDeal[]> {
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEYS.DEALS);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  try {
    const db = await openAccountsDB();
    const tx = db.transaction(STORES.DEALS, 'readonly');
    const store = tx.objectStore(STORES.DEALS);
    const all = await new Promise<AccountDeal[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    if (all && all.length > 0) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.DEALS, JSON.stringify(all));
      } catch {}
      return all;
    }
  } catch {}

  // Fallback to initial seed
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.DEALS, JSON.stringify(INITIAL_DEALS));
  } catch {}
  return INITIAL_DEALS;
}

/**
 * Saves all deals
 */
export async function saveDeals(deals: AccountDeal[]): Promise<void> {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.DEALS, JSON.stringify(deals));
  } catch {}

  try {
    const db = await openAccountsDB();
    const tx = db.transaction(STORES.DEALS, 'readwrite');
    const store = tx.objectStore(STORES.DEALS);
    store.clear();
    deals.forEach((d) => store.put(d));
  } catch {}

  // Cloud sync if Supabase table is accessible
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('accounts_deals').upsert(deals, { onConflict: 'id' });
    }
  } catch {}
}

/**
 * Loads all payments from storage
 */
export async function loadPayments(): Promise<AccountPayment[]> {
  try {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEYS.PAYMENTS);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}

  try {
    const db = await openAccountsDB();
    const tx = db.transaction(STORES.PAYMENTS, 'readonly');
    const store = tx.objectStore(STORES.PAYMENTS);
    const all = await new Promise<AccountPayment[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
    if (all && all.length > 0) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEYS.PAYMENTS, JSON.stringify(all));
      } catch {}
      return all;
    }
  } catch {}

  // Fallback to initial seed
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.PAYMENTS, JSON.stringify(INITIAL_PAYMENTS));
  } catch {}
  return INITIAL_PAYMENTS;
}

/**
 * Saves all payments
 */
export async function savePayments(payments: AccountPayment[]): Promise<void> {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
  } catch {}

  try {
    const db = await openAccountsDB();
    const tx = db.transaction(STORES.PAYMENTS, 'readwrite');
    const store = tx.objectStore(STORES.PAYMENTS);
    store.clear();
    payments.forEach((p) => store.put(p));
  } catch {}

  // Cloud sync if Supabase table is accessible
  try {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.from('accounts_payments').upsert(payments, { onConflict: 'id' });
    }
  } catch {}
}

/**
 * Loads documents for a given deal from IndexedDB
 */
export async function loadDocumentsForDeal(dealId: string): Promise<AccountDealDocument[]> {
  try {
    const db = await openAccountsDB();
    const tx = db.transaction(STORES.DOCUMENTS, 'readonly');
    const store = tx.objectStore(STORES.DOCUMENTS);
    const index = store.index('dealId');
    return await new Promise<AccountDealDocument[]>((resolve, reject) => {
      const req = index.getAll(dealId);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/**
 * Loads all documents
 */
export async function loadAllDocuments(): Promise<AccountDealDocument[]> {
  try {
    const db = await openAccountsDB();
    const tx = db.transaction(STORES.DOCUMENTS, 'readonly');
    const store = tx.objectStore(STORES.DOCUMENTS);
    return await new Promise<AccountDealDocument[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/**
 * Saves or updates a document in IndexedDB
 */
export async function saveDocument(doc: AccountDealDocument): Promise<void> {
  try {
    const db = await openAccountsDB();
    const tx = db.transaction(STORES.DOCUMENTS, 'readwrite');
    const store = tx.objectStore(STORES.DOCUMENTS);
    store.put(doc);
  } catch (err) {
    console.error('Failed to save document in IndexedDB:', err);
  }
}

/**
 * Deletes a document by ID
 */
export async function deleteDocument(docId: string): Promise<void> {
  try {
    const db = await openAccountsDB();
    const tx = db.transaction(STORES.DOCUMENTS, 'readwrite');
    const store = tx.objectStore(STORES.DOCUMENTS);
    store.delete(docId);
  } catch (err) {
    console.error('Failed to delete document from IndexedDB:', err);
  }
}

