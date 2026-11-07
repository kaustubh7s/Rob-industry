import {
  AccountHead,
  JournalEntry,
  SalesInvoice,
  PurchaseOrderFinance,
  PurchaseBill,
  FinanceVendor,
  VendorPayment,
  BusinessExpense,
  BankAccount,
  BankTransaction,
  CreditNote,
  DebitNote,
  CompanyFinanceProfile,
} from '../types/finance';

const FINANCE_DB_NAME = 'rsb_finance_accounting_db_v1';
const FINANCE_DB_VERSION = 1;

const STORES = {
  CHART_OF_ACCOUNTS: 'chart_of_accounts',
  JOURNAL_ENTRIES: 'journal_entries',
  SALES_INVOICES: 'sales_invoices',
  PURCHASE_ORDERS: 'purchase_orders',
  PURCHASE_BILLS: 'purchase_bills',
  VENDORS: 'vendors',
  VENDOR_PAYMENTS: 'vendor_payments',
  EXPENSES: 'expenses',
  BANK_ACCOUNTS: 'bank_accounts',
  BANK_TRANSACTIONS: 'bank_transactions',
  CREDIT_NOTES: 'credit_notes',
  DEBIT_NOTES: 'debit_notes',
  COMPANY_PROFILE: 'company_profile',
};

const CACHE_KEYS = {
  CHART_OF_ACCOUNTS: 'rsb_acc_chart_cache',
  JOURNAL_ENTRIES: 'rsb_acc_journals_cache',
  SALES_INVOICES: 'rsb_acc_invoices_cache',
  PURCHASE_ORDERS: 'rsb_acc_po_cache',
  PURCHASE_BILLS: 'rsb_acc_bills_cache',
  VENDORS: 'rsb_acc_vendors_cache',
  VENDOR_PAYMENTS: 'rsb_acc_vendor_payments_cache',
  EXPENSES: 'rsb_acc_expenses_cache',
  BANK_ACCOUNTS: 'rsb_acc_bank_accounts_cache',
  BANK_TRANSACTIONS: 'rsb_acc_bank_tx_cache',
  CREDIT_NOTES: 'rsb_acc_credit_notes_cache',
  DEBIT_NOTES: 'rsb_acc_debit_notes_cache',
  COMPANY_PROFILE: 'rsb_acc_company_profile_cache',
};

// Open Finance IndexedDB
function openFinanceDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = window.indexedDB.open(FINANCE_DB_NAME, FINANCE_DB_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      Object.values(STORES).forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// -------------------------------------------------------------
// SEED DATA: OFFICIAL RSB CHART OF ACCOUNTS
// -------------------------------------------------------------
export const INITIAL_CHART_OF_ACCOUNTS: AccountHead[] = [
  // Assets
  { id: 'acc-1010', code: '1010', name: 'Cash in Hand (Main Factory)', category: 'Assets', group: 'Cash in Hand', openingBalance: 50000, currentBalance: 50000, isSystem: true, isActive: true },
  { id: 'acc-1020', code: '1020', name: 'HDFC Bank Current A/c - 50200012345678', category: 'Assets', group: 'Bank Accounts', openingBalance: 845000, currentBalance: 845000, isSystem: true, isActive: true },
  { id: 'acc-1030', code: '1030', name: 'State Bank of India Plant A/c - 30894567891', category: 'Assets', group: 'Bank Accounts', openingBalance: 420000, currentBalance: 420000, isSystem: true, isActive: true },
  { id: 'acc-1100', code: '1100', name: 'Accounts Receivable (Sundry Debtors)', category: 'Assets', group: 'Accounts Receivable', openingBalance: 600000, currentBalance: 600000, isSystem: true, isActive: true },
  { id: 'acc-1200', code: '1200', name: 'Raw Material & Parts Inventory', category: 'Assets', group: 'Inventory', openingBalance: 1500000, currentBalance: 1500000, isSystem: true, isActive: true },
  { id: 'acc-1310', code: '1310', name: 'Input CGST (Recoverable)', category: 'Assets', group: 'Duties & Taxes', openingBalance: 49050, currentBalance: 49050, isSystem: true, isActive: true },
  { id: 'acc-1320', code: '1320', name: 'Input SGST (Recoverable)', category: 'Assets', group: 'Duties & Taxes', openingBalance: 49050, currentBalance: 49050, isSystem: true, isActive: true },
  { id: 'acc-1330', code: '1330', name: 'Input IGST (Recoverable)', category: 'Assets', group: 'Duties & Taxes', openingBalance: 0, currentBalance: 0, isSystem: true, isActive: true },
  { id: 'acc-1400', code: '1400', name: 'Plant Machinery & Tooling Equipment', category: 'Assets', group: 'Fixed Assets', openingBalance: 2800000, currentBalance: 2800000, isSystem: true, isActive: true },
  { id: 'acc-1500', code: '1500', name: 'Advances Paid to Suppliers', category: 'Assets', group: 'Advances to Suppliers', openingBalance: 0, currentBalance: 0, isSystem: true, isActive: true },

  // Liabilities
  { id: 'acc-2010', code: '2010', name: 'Accounts Payable (Sundry Creditors)', category: 'Liabilities', group: 'Accounts Payable', openingBalance: 275000, currentBalance: 275000, isSystem: true, isActive: true },
  { id: 'acc-2110', code: '2110', name: 'Output CGST (Payable)', category: 'Liabilities', group: 'Duties & Taxes', openingBalance: 90000, currentBalance: 90000, isSystem: true, isActive: true },
  { id: 'acc-2120', code: '2120', name: 'Output SGST (Payable)', category: 'Liabilities', group: 'Duties & Taxes', openingBalance: 90000, currentBalance: 90000, isSystem: true, isActive: true },
  { id: 'acc-2130', code: '2130', name: 'Output IGST (Payable)', category: 'Liabilities', group: 'Duties & Taxes', openingBalance: 0, currentBalance: 0, isSystem: true, isActive: true },
  { id: 'acc-2200', code: '2200', name: 'Customer Advances Received', category: 'Liabilities', group: 'Customer Advances', openingBalance: 200000, currentBalance: 200000, isSystem: true, isActive: true },
  { id: 'acc-2300', code: '2300', name: 'Outstanding Operational Expenses', category: 'Liabilities', group: 'Outstanding Expenses', openingBalance: 0, currentBalance: 0, isSystem: true, isActive: true },

  // Equity
  { id: 'acc-3010', code: '3010', name: "Owner's Equity & Capital", category: 'Equity', group: 'Capital Account', openingBalance: 4500000, currentBalance: 4500000, isSystem: true, isActive: true },
  { id: 'acc-3020', code: '3020', name: 'Retained Earnings / General Reserves', category: 'Equity', group: 'Retained Earnings', openingBalance: 1115000, currentBalance: 1115000, isSystem: true, isActive: true },

  // Income
  { id: 'acc-4010', code: '4010', name: 'Industrial Machinery Sales Revenue', category: 'Income', group: 'Sales Accounts', openingBalance: 0, currentBalance: 1000000, isSystem: true, isActive: true },
  { id: 'acc-4020', code: '4020', name: 'Machinery Overhaul & Service Charges', category: 'Income', group: 'Direct Income', openingBalance: 0, currentBalance: 0, isSystem: false, isActive: true },
  { id: 'acc-4030', code: '4030', name: 'Scrap Metal & Waste Recovery Sales', category: 'Income', group: 'Direct Income', openingBalance: 0, currentBalance: 0, isSystem: false, isActive: true },

  // Expenses
  { id: 'acc-5010', code: '5010', name: 'Material Purchases & Consumption', category: 'Expenses', group: 'Cost of Goods Sold', openingBalance: 0, currentBalance: 545000, isSystem: true, isActive: true },
  { id: 'acc-5020', code: '5020', name: 'Shop Floor Contractor & Labour Wages', category: 'Expenses', group: 'Cost of Goods Sold', openingBalance: 0, currentBalance: 0, isSystem: false, isActive: true },
  { id: 'acc-5030', code: '5030', name: 'Workshop Power & Electricity', category: 'Expenses', group: 'Operating Expenses', openingBalance: 0, currentBalance: 38450, isSystem: false, isActive: true },
  { id: 'acc-5040', code: '5040', name: 'Heavy Freight & Transportation', category: 'Expenses', group: 'Operating Expenses', openingBalance: 0, currentBalance: 24000, isSystem: false, isActive: true },
  { id: 'acc-5050', code: '5050', name: 'Factory Shed & Office Rent', category: 'Expenses', group: 'Operating Expenses', openingBalance: 0, currentBalance: 0, isSystem: false, isActive: true },
  { id: 'acc-5060', code: '5060', name: 'Machinery Maintenance & Spares', category: 'Expenses', group: 'Operating Expenses', openingBalance: 0, currentBalance: 0, isSystem: false, isActive: true },
  { id: 'acc-5070', code: '5070', name: 'Consumables, Cutting Tools & Gas', category: 'Expenses', group: 'Cost of Goods Sold', openingBalance: 0, currentBalance: 8500, isSystem: false, isActive: true },
  { id: 'acc-5080', code: '5080', name: 'Office Stationery & Printing', category: 'Expenses', group: 'Administrative Expenses', openingBalance: 0, currentBalance: 0, isSystem: false, isActive: true },
  { id: 'acc-5090', code: '5090', name: 'Internet & Telecom Charges', category: 'Expenses', group: 'Administrative Expenses', openingBalance: 0, currentBalance: 0, isSystem: false, isActive: true },
  { id: 'acc-5100', code: '5100', name: 'Professional, Audit & Legal Fees', category: 'Expenses', group: 'Administrative Expenses', openingBalance: 0, currentBalance: 0, isSystem: false, isActive: true },
  { id: 'acc-5110', code: '5110', name: 'Bank Charges & Commission', category: 'Expenses', group: 'Finance Charges', openingBalance: 0, currentBalance: 0, isSystem: false, isActive: true },
];

// -------------------------------------------------------------
// SEED DATA: BANK & CASH ACCOUNTS
// -------------------------------------------------------------
export const INITIAL_BANK_ACCOUNTS: BankAccount[] = [
  {
    id: 'bank-1',
    accountName: 'HDFC Bank Current A/c',
    accountType: 'bank',
    bankName: 'HDFC Bank Limited',
    accountNumber: '50200012345678',
    ifsc: 'HDFC0000287',
    branch: 'Vatva GIDC, Ahmedabad',
    openingBalance: 845000,
    currentBalance: 975000,
    status: 'active',
    isDefault: true,
  },
  {
    id: 'bank-2',
    accountName: 'State Bank of India Plant A/c',
    accountType: 'bank',
    bankName: 'State Bank of India',
    accountNumber: '30894567891',
    ifsc: 'SBIN0001245',
    branch: 'Makarpura, Vadodara',
    openingBalance: 420000,
    currentBalance: 420000,
    status: 'active',
    isDefault: false,
  },
  {
    id: 'cash-1',
    accountName: 'Main Factory Cash In Hand',
    accountType: 'cash',
    accountNumber: 'CASH-01',
    openingBalance: 50000,
    currentBalance: 41500,
    status: 'active',
    isDefault: false,
  },
];

// -------------------------------------------------------------
// SEED DATA: VENDORS
// -------------------------------------------------------------
export const INITIAL_FINANCE_VENDORS: FinanceVendor[] = [
  {
    id: 'vnd-101',
    companyName: 'Manav Metal & Steel Corporation',
    contactPerson: 'Ketan Patel',
    mobile: '+91 98251 33445',
    email: 'sales@manavmetal.com',
    billingAddress: 'Shed 14, Phase 1, GIDC Vatva, Ahmedabad, Gujarat',
    gstin: '24AABCM9821A1Z2',
    pan: 'AABCM9821A',
    state: 'Gujarat',
    stateCode: '24',
    bankName: 'Axis Bank',
    accountHolder: 'Manav Metal & Steel Corp',
    accountNumber: '918020012345678',
    ifsc: 'UTIB0000142',
    branch: 'Maninagar, Ahmedabad',
    paymentTerms: '30 Days Net',
    openingBalance: 0,
    currentOutstanding: 180000,
    status: 'Active',
    createdAt: '2026-10-15T10:00:00.000Z',
  },
  {
    id: 'vnd-102',
    companyName: 'TechnoDrive Automation & Motors',
    contactPerson: 'Sachin Kulkarni',
    mobile: '+91 97654 22110',
    email: 'billing@technodrive.in',
    billingAddress: 'Plot 88, Bhosari Industrial Area, MIDC Pune, Maharashtra',
    gstin: '27AABCT5544B1Z9',
    pan: 'AABCT5544B',
    state: 'Maharashtra',
    stateCode: '27',
    bankName: 'ICICI Bank',
    accountHolder: 'TechnoDrive Automation',
    accountNumber: '003405001234',
    ifsc: 'ICIC0000034',
    branch: 'Bhosari, Pune',
    paymentTerms: '50% Advance / 50% on Delivery',
    openingBalance: 0,
    currentOutstanding: 95000,
    status: 'Active',
    createdAt: '2026-10-18T11:00:00.000Z',
  },
  {
    id: 'vnd-103',
    companyName: 'Gujarat Tooling & Hardware Mart',
    contactPerson: 'Ramesh Shah',
    mobile: '+91 98980 66778',
    email: 'orders@gujarattooling.com',
    billingAddress: 'G-12, Makarpura Industrial Estate, Vadodara, Gujarat',
    gstin: '24AACCG4411C1Z4',
    pan: 'AACCG4411C',
    state: 'Gujarat',
    stateCode: '24',
    bankName: 'HDFC Bank',
    accountHolder: 'Gujarat Tooling & Hardware',
    accountNumber: '50200098765432',
    ifsc: 'HDFC0000180',
    branch: 'Makarpura, Vadodara',
    paymentTerms: '15 Days Net',
    openingBalance: 0,
    currentOutstanding: 0,
    status: 'Active',
    createdAt: '2026-10-22T14:00:00.000Z',
  },
];

// -------------------------------------------------------------
// SEED DATA: PURCHASE ORDERS
// -------------------------------------------------------------
export const INITIAL_PURCHASE_ORDERS: PurchaseOrderFinance[] = [
  {
    id: 'po-101',
    poNumber: 'RSB-PO-2026-001',
    poDate: '2026-10-18',
    vendorId: 'vnd-101',
    vendorName: 'Manav Metal & Steel Corporation',
    vendorGstin: '24AABCM9821A1Z2',
    vendorPhone: '+91 98251 33445',
    deliveryAddress: 'Plot 42-45, Phase II, GIDC Industrial Estate, Vatva, Ahmedabad',
    projectReference: 'Apex Automatic Vial Washing & Labelling System',
    requiredDeliveryDate: '2026-10-28',
    items: [
      {
        id: 'poi-1',
        description: 'SS 316L Sheet 2.5mm Grade (Laser Cutting Quality)',
        hsnSac: '7219',
        quantity: 1200,
        unit: 'Kg',
        rate: 250,
        taxableAmount: 300000,
        gstRate: 18,
        totalAmount: 354000,
      },
    ],
    taxableAmount: 300000,
    gstTotal: 54000,
    totalAmount: 354000,
    paymentTerms: '30 Days Net from Delivery',
    status: 'Completed',
    remarks: 'Pre-inspected stainless steel sheets for machine body and conveyor.',
    orderedBy: 'Kaustubh',
    approvedBy: 'Director',
    createdAt: '2026-10-18T10:00:00.000Z',
  },
  {
    id: 'po-102',
    poNumber: 'RSB-PO-2026-002',
    poDate: '2026-10-22',
    vendorId: 'vnd-102',
    vendorName: 'TechnoDrive Automation & Motors',
    vendorGstin: '27AABCT5544B1Z9',
    vendorPhone: '+91 97654 22110',
    deliveryAddress: 'Plot 42-45, Phase II, GIDC Industrial Estate, Vatva, Ahmedabad',
    projectReference: 'Apex Automatic Vial Washing & Labelling System',
    requiredDeliveryDate: '2026-11-05',
    items: [
      {
        id: 'poi-2',
        description: '0.75kW AC Servo Motor + Drive Set with Encoder Cable',
        hsnSac: '8501',
        quantity: 4,
        unit: 'Nos',
        rate: 41313.56,
        taxableAmount: 165254.24,
        gstRate: 18,
        totalAmount: 195000,
      },
    ],
    taxableAmount: 165254.24,
    gstTotal: 29745.76,
    totalAmount: 195000,
    paymentTerms: '50% Advance / 50% on Delivery',
    status: 'Partially Received',
    remarks: 'Critical servo drives for indexing turntable motion.',
    orderedBy: 'Kaustubh',
    approvedBy: 'Director',
    createdAt: '2026-10-22T12:00:00.000Z',
  },
];

// -------------------------------------------------------------
// SEED DATA: PURCHASE BILLS (VENDOR INVOICES)
// -------------------------------------------------------------
export const INITIAL_PURCHASE_BILLS: PurchaseBill[] = [
  {
    id: 'pb-101',
    billNumber: 'RSB-PB-2026-001',
    vendorInvoiceNumber: 'MM-26-881',
    vendorInvoiceDate: '2026-10-24',
    receivedDate: '2026-10-25',
    vendorId: 'vnd-101',
    vendorName: 'Manav Metal & Steel Corporation',
    vendorGstin: '24AABCM9821A1Z2',
    linkedPoId: 'po-101',
    linkedPoNumber: 'RSB-PO-2026-001',
    projectName: 'Apex Vial Washing System',
    items: [
      {
        id: 'pbi-1',
        description: 'SS 316L Sheet 2.5mm Grade (Laser Cutting Quality)',
        hsnSac: '7219',
        quantity: 1200,
        unit: 'Kg',
        rate: 250,
        taxableAmount: 300000,
        gstRate: 18,
        cgstAmount: 27000,
        sgstAmount: 27000,
        igstAmount: 0,
        totalAmount: 350000,
      },
    ],
    taxableAmount: 296610.17,
    cgstTotal: 26694.92,
    sgstTotal: 26694.92,
    igstTotal: 0,
    gstTotal: 53389.83,
    totalAmount: 350000,
    amountPaid: 170000,
    balancePayable: 180000,
    paymentDueDate: '2026-11-24',
    paymentStatus: 'partially_paid',
    notes: 'Inward GRN-104 inspection cleared by Stores Incharge.',
    createdBy: 'Accountant',
    createdAt: '2026-10-25T11:00:00.000Z',
  },
  {
    id: 'pb-102',
    billNumber: 'RSB-PB-2026-002',
    vendorInvoiceNumber: 'TD-NOV-045',
    vendorInvoiceDate: '2026-11-01',
    receivedDate: '2026-11-02',
    vendorId: 'vnd-102',
    vendorName: 'TechnoDrive Automation & Motors',
    vendorGstin: '27AABCT5544B1Z9',
    linkedPoId: 'po-102',
    linkedPoNumber: 'RSB-PO-2026-002',
    projectName: 'Apex Vial Washing System',
    items: [
      {
        id: 'pbi-2',
        description: '0.75kW AC Servo Motor + Drive Set with Encoder Cable',
        hsnSac: '8501',
        quantity: 4,
        unit: 'Nos',
        rate: 41313.56,
        taxableAmount: 165254.24,
        gstRate: 18,
        cgstAmount: 0,
        sgstAmount: 0,
        igstAmount: 29745.76,
        totalAmount: 195000,
      },
    ],
    taxableAmount: 165254.24,
    cgstTotal: 0,
    sgstTotal: 0,
    igstTotal: 29745.76,
    gstTotal: 29745.76,
    totalAmount: 195000,
    amountPaid: 100000,
    balancePayable: 95000,
    paymentDueDate: '2026-11-20',
    paymentStatus: 'partially_paid',
    notes: 'Inter-state purchase from Maharashtra. IGST applicable.',
    createdBy: 'Accountant',
    createdAt: '2026-11-02T14:30:00.000Z',
  },
];

// -------------------------------------------------------------
// SEED DATA: VENDOR PAYMENTS
// -------------------------------------------------------------
export const INITIAL_VENDOR_PAYMENTS: VendorPayment[] = [
  {
    id: 'pv-101',
    voucherNumber: 'RSB-PV-2026-001',
    paymentDate: '2026-10-28',
    vendorId: 'vnd-101',
    vendorName: 'Manav Metal & Steel Corporation',
    linkedBillId: 'pb-101',
    linkedBillNumber: 'RSB-PB-2026-001',
    projectName: 'Apex Vial Washing System',
    amount: 170000,
    paymentMode: 'Bank Transfer',
    bankAccountId: 'bank-1',
    bankAccountName: 'HDFC Bank Current A/c',
    transactionReference: 'HDFC-RTGS-9823411',
    utrNumber: 'HDFCR92026102800142',
    remarks: '50% stage payment against SS 316L delivery.',
    paymentType: 'bill_payment',
    createdBy: 'Accountant',
    createdAt: '2026-10-28T15:00:00.000Z',
  },
  {
    id: 'pv-102',
    voucherNumber: 'RSB-PV-2026-002',
    paymentDate: '2026-11-03',
    vendorId: 'vnd-102',
    vendorName: 'TechnoDrive Automation & Motors',
    linkedBillId: 'pb-102',
    linkedBillNumber: 'RSB-PB-2026-002',
    projectName: 'Apex Vial Washing System',
    amount: 100000,
    paymentMode: 'Bank Transfer',
    bankAccountId: 'bank-1',
    bankAccountName: 'HDFC Bank Current A/c',
    transactionReference: 'HDFC-NEFT-5512903',
    utrNumber: 'HDFCN92026110300981',
    remarks: 'Part payment towards servo motors.',
    paymentType: 'bill_payment',
    createdBy: 'Accountant',
    createdAt: '2026-11-03T16:15:00.000Z',
  },
];

// -------------------------------------------------------------
// SEED DATA: SALES INVOICES (LINKED TO EXISTING DEALS)
// -------------------------------------------------------------
export const INITIAL_SALES_INVOICES: SalesInvoice[] = [
  {
    id: 'inv-101',
    invoiceNumber: 'RSB-INV-2026-001',
    invoiceType: 'tax_invoice',
    dealId: 'deal-101',
    dealNumber: 'RSB-ACC-2026-001',
    customerId: 'comp-101',
    customerName: 'Apex Engineering Solutions',
    customerGstin: '27AABCA1234A1Z5',
    customerPhone: '+91 98250 44551',
    customerAddress: 'GIDC Industrial Estate, Vatva, Ahmedabad, Gujarat',
    invoiceDate: '2026-10-15',
    dueDate: '2026-11-20',
    poNumber: 'PO-APEX-2026-901',
    projectName: 'Complete Automatic Vial Washing & Labelling System',
    items: [
      {
        id: 'ini-1',
        description: 'Complete Automatic High-Speed Vial Washing & Linear Labelling Machine (GMP Model)',
        hsnSac: '8422',
        quantity: 1,
        unit: 'Set',
        rate: 847457.63,
        taxableAmount: 847457.63,
        gstRate: 18,
        cgstAmount: 76271.19,
        sgstAmount: 76271.19,
        igstAmount: 0,
        totalAmount: 1000000,
      },
    ],
    subtotal: 847457.63,
    cgstTotal: 76271.19,
    sgstTotal: 76271.19,
    igstTotal: 0,
    totalAmount: 1000000,
    amountPaid: 400000,
    balanceDue: 600000,
    status: 'partially_paid',
    isGstInclusive: true,
    notes: 'Fabrication under active assembly. Dispatch locked pending balance clearance.',
    termsAndConditions: '30% Advance / 40% During Production / 30% Before Dispatch. Machinery warranty 12 months.',
    bankDetails: {
      bankName: 'HDFC Bank Limited',
      accountNo: '50200012345678',
      ifsc: 'HDFC0000287',
      branch: 'Vatva GIDC, Ahmedabad',
    },
    createdBy: 'Kaustubh',
    createdAt: '2026-10-15T10:00:00.000Z',
  },
  {
    id: 'inv-102',
    invoiceNumber: 'RSB-PI-2026-002',
    invoiceType: 'proforma_invoice',
    dealId: 'deal-102',
    dealNumber: 'RSB-ACC-2026-002',
    customerId: 'comp-102',
    customerName: 'Bharat Pharma Automations',
    customerGstin: '24AAACB9876F1Z8',
    customerPhone: '+91 98980 12345',
    customerAddress: 'Makarpura Industrial Area, Vadodara, Gujarat',
    invoiceDate: '2026-10-20',
    dueDate: '2026-11-25',
    poNumber: 'BPA-PO-4421',
    projectName: 'Rotary Liquid Bottle Filling & Screw Capping Monoblock',
    items: [
      {
        id: 'ini-2',
        description: 'Automatic 8-Head Rotary Liquid Bottle Filling & ROPP Capping Monoblock Machine',
        hsnSac: '8422',
        quantity: 1,
        unit: 'Set',
        rate: 1271186.44,
        taxableAmount: 1271186.44,
        gstRate: 18,
        cgstAmount: 114406.78,
        sgstAmount: 114406.78,
        igstAmount: 0,
        totalAmount: 1500000,
      },
    ],
    subtotal: 1271186.44,
    cgstTotal: 114406.78,
    sgstTotal: 114406.78,
    igstTotal: 0,
    totalAmount: 1500000,
    amountPaid: 300000,
    balanceDue: 1200000,
    status: 'partially_paid',
    isGstInclusive: true,
    notes: 'Proforma Invoice issued for 20% advance milestone clearance.',
    termsAndConditions: '20% Advance / 50% Against Proforma / 30% Before Dispatch.',
    bankDetails: {
      bankName: 'HDFC Bank Limited',
      accountNo: '50200012345678',
      ifsc: 'HDFC0000287',
      branch: 'Vatva GIDC, Ahmedabad',
    },
    createdBy: 'Kaustubh',
    createdAt: '2026-10-20T11:30:00.000Z',
  },
];

// -------------------------------------------------------------
// SEED DATA: BUSINESS EXPENSES
// -------------------------------------------------------------
export const INITIAL_BUSINESS_EXPENSES: BusinessExpense[] = [
  {
    id: 'exp-101',
    expenseNumber: 'RSB-EXP-2026-001',
    expenseDate: '2026-10-31',
    category: 'Electricity',
    payeeName: 'Torrent Power Limited',
    description: 'Factory Workshop Power Bill for October 2026 (Meter No. TPL-9821)',
    amount: 38450,
    taxableAmount: 38450,
    gstAmount: 0,
    paymentMode: 'Bank Transfer',
    bankAccountId: 'bank-1',
    bankAccountName: 'HDFC Bank Current A/c',
    referenceNumber: 'TPL-EPAY-882190',
    approvalStatus: 'approved',
    createdBy: 'Accountant',
    createdAt: '2026-10-31T16:00:00.000Z',
  },
  {
    id: 'exp-102',
    expenseNumber: 'RSB-EXP-2026-002',
    expenseDate: '2026-11-04',
    category: 'Transportation & Freight',
    payeeName: 'Om Roadlines Logistics',
    description: 'Crane hiring and heavy machinery bed transport for stainless raw steel',
    amount: 24000,
    taxableAmount: 24000,
    gstAmount: 0,
    paymentMode: 'Bank Transfer',
    bankAccountId: 'bank-1',
    bankAccountName: 'HDFC Bank Current A/c',
    referenceNumber: 'OM-LR-8901',
    approvalStatus: 'approved',
    createdBy: 'Accountant',
    createdAt: '2026-11-04T12:00:00.000Z',
  },
  {
    id: 'exp-103',
    expenseNumber: 'RSB-EXP-2026-003',
    expenseDate: '2026-11-05',
    category: 'Consumables & Tools',
    payeeName: 'Star Industrial Tools Store',
    description: 'TIG welding argon gas cylinders, grinding discs, and carbide drill bits',
    amount: 8500,
    taxableAmount: 8500,
    gstAmount: 0,
    paymentMode: 'Cash',
    bankAccountId: 'cash-1',
    bankAccountName: 'Main Factory Cash In Hand',
    referenceNumber: 'CASH-VOUCHER-44',
    approvalStatus: 'approved',
    createdBy: 'Accountant',
    createdAt: '2026-11-05T14:30:00.000Z',
  },
];

// -------------------------------------------------------------
// SEED DATA: COMPANY PROFILE
// -------------------------------------------------------------
export const INITIAL_COMPANY_FINANCE_PROFILE: CompanyFinanceProfile = {
  companyName: 'RSB Industries & Equipments',
  legalTradeName: 'RSB Industries Private Limited',
  gstin: '24AABCR7276K1Z9',
  pan: 'AABCR7276K',
  cin: 'U29100GJ2018PTC104521',
  addressLine1: 'Plot No. 42-45, Phase II, GIDC Industrial Estate',
  addressLine2: 'Near Telephone Exchange, Vatva',
  city: 'Ahmedabad',
  state: 'Gujarat',
  stateCode: '24',
  pincode: '382445',
  phone: '+91 98250 12345 / 079-25831234',
  email: 'accounts@rsbequipments.com',
  website: 'www.rsbequipments.com',
  defaultBankAccountId: 'bank-1',
  currentFinancialYear: '2026-2027',
  authorizedSignatoryName: '',
  authorizedSignatoryDesignation: 'Authorized Signatory',
};

// -------------------------------------------------------------
// RESILIENT ASYNC STORAGE HELPERS
// -------------------------------------------------------------
async function getStoredList<T>(storeName: string, cacheKey: string, initialFallback: T[]): Promise<T[]> {
  // 1. Check in-memory / localStorage cache first
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn(`Cache read error for ${cacheKey}:`, err);
  }

  // 2. Fallback to IndexedDB
  try {
    const db = await openFinanceDB();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const records = await new Promise<T[]>((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    if (records.length > 0) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(records));
      } catch {}
      return records;
    }
  } catch (err) {
    console.warn(`IndexedDB read error for ${storeName}:`, err);
  }

  // 3. Fallback to initial seed records and seed both IDB and cache
  try {
    localStorage.setItem(cacheKey, JSON.stringify(initialFallback));
    const db = await openFinanceDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    initialFallback.forEach((item: any) => store.put(item));
  } catch {}

  return initialFallback;
}

async function setStoredList<T extends { id: string }>(
  storeName: string,
  cacheKey: string,
  list: T[]
): Promise<void> {
  try {
    localStorage.setItem(cacheKey, JSON.stringify(list));
  } catch (err) {
    console.warn(`Cache write error for ${cacheKey}:`, err);
  }

  try {
    const db = await openFinanceDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    list.forEach((item) => store.put(item));
  } catch (err) {
    console.warn(`IndexedDB write error for ${storeName}:`, err);
  }
}

// -------------------------------------------------------------
// EXPORTED STORAGE GETTERS AND SETTERS
// -------------------------------------------------------------
export const loadChartOfAccounts = () =>
  getStoredList<AccountHead>(STORES.CHART_OF_ACCOUNTS, CACHE_KEYS.CHART_OF_ACCOUNTS, INITIAL_CHART_OF_ACCOUNTS);
export const saveChartOfAccounts = (list: AccountHead[]) =>
  setStoredList<AccountHead>(STORES.CHART_OF_ACCOUNTS, CACHE_KEYS.CHART_OF_ACCOUNTS, list);

export const loadJournalEntries = () =>
  getStoredList<JournalEntry>(STORES.JOURNAL_ENTRIES, CACHE_KEYS.JOURNAL_ENTRIES, []);
export const saveJournalEntries = (list: JournalEntry[]) =>
  setStoredList<JournalEntry>(STORES.JOURNAL_ENTRIES, CACHE_KEYS.JOURNAL_ENTRIES, list);

export const loadSalesInvoices = () =>
  getStoredList<SalesInvoice>(STORES.SALES_INVOICES, CACHE_KEYS.SALES_INVOICES, INITIAL_SALES_INVOICES);
export const saveSalesInvoices = (list: SalesInvoice[]) =>
  setStoredList<SalesInvoice>(STORES.SALES_INVOICES, CACHE_KEYS.SALES_INVOICES, list);

export const loadPurchaseOrdersFinance = () =>
  getStoredList<PurchaseOrderFinance>(STORES.PURCHASE_ORDERS, CACHE_KEYS.PURCHASE_ORDERS, INITIAL_PURCHASE_ORDERS);
export const savePurchaseOrdersFinance = (list: PurchaseOrderFinance[]) =>
  setStoredList<PurchaseOrderFinance>(STORES.PURCHASE_ORDERS, CACHE_KEYS.PURCHASE_ORDERS, list);

export const loadPurchaseBills = () =>
  getStoredList<PurchaseBill>(STORES.PURCHASE_BILLS, CACHE_KEYS.PURCHASE_BILLS, INITIAL_PURCHASE_BILLS);
export const savePurchaseBills = (list: PurchaseBill[]) =>
  setStoredList<PurchaseBill>(STORES.PURCHASE_BILLS, CACHE_KEYS.PURCHASE_BILLS, list);

export const loadFinanceVendors = () =>
  getStoredList<FinanceVendor>(STORES.VENDORS, CACHE_KEYS.VENDORS, INITIAL_FINANCE_VENDORS);
export const saveFinanceVendors = (list: FinanceVendor[]) =>
  setStoredList<FinanceVendor>(STORES.VENDORS, CACHE_KEYS.VENDORS, list);

export const loadVendorPayments = () =>
  getStoredList<VendorPayment>(STORES.VENDOR_PAYMENTS, CACHE_KEYS.VENDOR_PAYMENTS, INITIAL_VENDOR_PAYMENTS);
export const saveVendorPayments = (list: VendorPayment[]) =>
  setStoredList<VendorPayment>(STORES.VENDOR_PAYMENTS, CACHE_KEYS.VENDOR_PAYMENTS, list);

export const loadBusinessExpenses = () =>
  getStoredList<BusinessExpense>(STORES.EXPENSES, CACHE_KEYS.EXPENSES, INITIAL_BUSINESS_EXPENSES);
export const saveBusinessExpenses = (list: BusinessExpense[]) =>
  setStoredList<BusinessExpense>(STORES.EXPENSES, CACHE_KEYS.EXPENSES, list);

export const loadBankAccounts = () =>
  getStoredList<BankAccount>(STORES.BANK_ACCOUNTS, CACHE_KEYS.BANK_ACCOUNTS, INITIAL_BANK_ACCOUNTS);
export const saveBankAccounts = (list: BankAccount[]) =>
  setStoredList<BankAccount>(STORES.BANK_ACCOUNTS, CACHE_KEYS.BANK_ACCOUNTS, list);

export const loadCompanyProfile = (): CompanyFinanceProfile => {
  try {
    const cached = localStorage.getItem(CACHE_KEYS.COMPANY_PROFILE);
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed.authorizedSignatoryName === 'Kaustubh') {
        parsed.authorizedSignatoryName = '';
      }
      return parsed;
    }
  } catch {}
  return INITIAL_COMPANY_FINANCE_PROFILE;
};

export const saveCompanyProfile = (profile: CompanyFinanceProfile): void => {
  try {
    localStorage.setItem(CACHE_KEYS.COMPANY_PROFILE, JSON.stringify(profile));
  } catch {}
};

