import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  User,
  UserRole,
  AuthLevel,
  UserPermissions,
  MaterialItem,
  VendorItem,
  CustomerItem,
  MachineItem,
  ProjectItem,
  ManufacturingOrderItem,
  InwardEntry,
  InwardStatus,
  OutwardEntry,
  OutwardStatus,
  JobCard,
  QCInspection,
  PurchaseOrder,
  SalesOrder,
  ProjectCosting,
  AuditLog,
  Notification,
  ProductionStatus,
  BOMRecord,
  BOMItem,
  RFQRecord,
  VendorQuotation,
  VendorDocument,
  MRPRecord,
  ProjectMaterialRequirementItem,
  ActiveProcessingMaterial,
  TrashItem,
  MasterBOM,
  MasterBOMItem,
  MachineFolder,
  MachineTypeMeta,
  DispatchReadyItem,
} from '../types/erp';
import {
  INITIAL_USERS,
  INITIAL_MATERIALS,
  INITIAL_VENDORS,
  INITIAL_CUSTOMERS,
  INITIAL_MACHINES,
  INITIAL_PROJECTS,
  INITIAL_ORDERS,
  INITIAL_INWARD,
  INITIAL_OUTWARD,
  INITIAL_JOB_CARDS,
  INITIAL_QC,
  INITIAL_PURCHASE_ORDERS,
  INITIAL_SALES_ORDERS,
  INITIAL_COSTING,
  INITIAL_AUDIT_LOGS,
  INITIAL_NOTIFICATIONS,
  INITIAL_BOMS,
  INITIAL_RFQS,
  INITIAL_VENDOR_DOCUMENTS,
  INITIAL_PROJECT_REQUIREMENTS,
} from '../data/seedData';
import {
  dbUpsertProject,
  dbDeleteProject,
  dbDeleteRequirementsByProject,
  dbUpsertRequirement,
  dbDeleteRequirement,
  dbBulkUpsertRequirements,
  pullAllDataFromSupabase,
  pushAllDataToSupabase,
  dbFactoryResetDatabase,
  dbUpsertVendor,
  dbDeleteVendor,
  dbUpsertCustomer,
  dbDeleteCustomer,
  dbUpsertMaterial,
  dbDeleteMaterial,
  dbUpsertUser,
  dbDeleteUser,
  getRemoteMaintenanceMode,
  setRemoteMaintenanceMode,
  DbMutationMessage,
  dbFetchMasterMachines,
  dbUpsertMasterMachine,
  dbDeleteMasterMachine,
  dbFetchMasterBOMs,
  dbUpsertMasterBOM,
  dbDeleteMasterBOM,
} from '../services/supabaseService';
import { getSupabaseClient } from '../lib/supabaseClient';
import {
  getDeletedRequirementTombstones,
  addRequirementTombstone,
  addRequirementTombstones,
  removeRequirementTombstone,
  getDeletedProjectTombstones,
  addProjectTombstone,
  removeProjectTombstone,
  getDeletedMaterialTombstones,
  addMaterialTombstone,
  addMaterialTombstones,
  removeMaterialTombstone,
  getDeletedVendorTombstones,
  addVendorTombstone,
  addVendorTombstones,
  removeVendorTombstone,
} from '../utils/tombstones';
import { isRequirementMatchingProjectName, isRequirementMatchedToProject, sortRowsByAscendingSrNo } from '../utils/projectMaterialsHelper';

interface ERPContextType {
  // Authentication & Role
  currentUser: User;
  setCurrentUserRole: (role: UserRole | string) => void;
  isAuthenticated: boolean;
  login: (identifier: string, password?: string) => { success: boolean; error?: string };
  loginWithPasskey: (passkey: string) => { success: boolean; error?: string };
  loginAsUser: (userId: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  users: User[];
  activeVendorId: string;
  setActiveVendorId: (vendorId: string) => void;

  // Active Tab
  activeTab: string;
  setActiveTab: (tab: string) => void;

  // Core Datasets
  materials: MaterialItem[];
  vendors: VendorItem[];
  customers: CustomerItem[];
  machines: MachineItem[];
  projects: ProjectItem[];
  orders: ManufacturingOrderItem[];
  inwardEntries: InwardEntry[];
  outwardEntries: OutwardEntry[];
  jobCards: JobCard[];
  qcInspections: QCInspection[];
  purchaseOrders: PurchaseOrder[];
  salesOrders: SalesOrder[];
  costingRecords: ProjectCosting[];
  auditLogs: AuditLog[];
  notifications: Notification[];

  // Synced Live Factory & QC Streams
  activeProcessingMaterials: ActiveProcessingMaterial[];
  dispatchReadyItems: DispatchReadyItem[];
  availableStockMaterials: MaterialItem[];

  // Advanced Modules: BOM, RFQ, Vendor Documents
  boms: BOMRecord[];
  rfqs: RFQRecord[];
  vendorDocuments: VendorDocument[];

  // Master Machine Folders & Master BOM Module
  masterMachines: MachineFolder[];
  masterBOMs: MasterBOM[];
  addMachineFolder: (name: string, types?: string[]) => MachineFolder;
  updateMachineFolder: (id: string, updates: Partial<MachineFolder>) => void;
  deleteMachineFolder: (id: string) => void;
  addMachineType: (machineId: string, typeName: string, details?: Partial<MachineTypeMeta>) => void;
  renameMachineType: (machineId: string, oldTypeName: string, newTypeName: string) => void;
  updateMachineTypeDetails: (machineId: string, typeName: string, details: Partial<MachineTypeMeta>) => void;
  deleteMachineType: (machineId: string, typeName: string) => void;
  moveMachineType: (sourceMachineId: string, targetMachineId: string, typeName: string) => void;
  duplicateMachineType: (machineId: string, sourceTypeName: string, newTypeName: string, copyBOMs: boolean) => void;
  archiveMachineType: (machineId: string, typeName: string, archive: boolean) => void;
  addMasterBOM: (bom: Omit<MasterBOM, 'id' | 'createdAt' | 'updatedAt'>) => MasterBOM;
  updateMasterBOM: (id: string, updates: Partial<MasterBOM>) => void;
  duplicateMasterBOM: (sourceId: string, newName?: string, targetMachineName?: string, targetMachineType?: string) => MasterBOM | null;
  deleteMasterBOM: (id: string) => void;
  resetMasterBOMsToFactoryDefault: () => void;

  // =======================================================================
  // HEART OF ERP: PROJECT MATERIAL REQUIREMENT TABLE STATE & HANDLERS
  // =======================================================================
  projectRequirements: ProjectMaterialRequirementItem[];
  setProjectRequirements: React.Dispatch<React.SetStateAction<ProjectMaterialRequirementItem[]>>;
  addProjectRequirement: (req: Omit<ProjectMaterialRequirementItem, 'id' | 'srNo'>) => void;
  updateProjectRequirement: (id: string, updates: Partial<ProjectMaterialRequirementItem>) => void;
  deleteProjectRequirement: (id: string) => void;
  deleteProjectRequirements: (ids: string[]) => void;
  refreshDatabase: () => Promise<void>;
  bulkImportProjectRequirements: (items: any[]) => void;
  populateRequirementsFromBOM: (projectId: string, bomId: string) => void;
  createJobCardFromRequirement: (reqId: string) => JobCard | undefined;
  convertShortagesToPO: (reqIds: string[]) => void;
  issueStockForRequirement: (reqId: string) => void;
  scrapRequirementMaterial: (reqId: string, scrapQty: number, reason: string) => void;
  toggleMaterialReceived: (reqId: string, customNotes?: string) => void;
  updateMaterialArrivalQty: (reqId: string, receivedQty: number) => void;

  // Handlers for Materials & Stock
  addMaterial: (material: Omit<MaterialItem, 'id'>) => void;
  updateMaterial: (id: string, updates: Partial<MaterialItem>) => void;
  deleteMaterial: (id: string) => void;
  adjustStock: (materialId: string, deltaQty: number, reason: string) => void;

  // Handlers for Orders
  addOrder: (order: Omit<ManufacturingOrderItem, 'id'>) => void;
  updateOrderStatus: (id: string, status: ProductionStatus) => void;
  updateOrder: (id: string, updates: Partial<ManufacturingOrderItem>) => void;
  deleteOrder: (id: string) => void;

  // Handlers for Inward (Auto-Increases Stock)
  addInwardEntry: (entry: Omit<InwardEntry, 'id'>) => void;
  updateInwardStatus: (id: string, status: InwardStatus) => void;
  deleteInwardEntry: (id: string) => void;

  // Handlers for Outward (Auto-Decreases Stock)
  addOutwardEntry: (entry: Omit<OutwardEntry, 'id'>) => void;
  updateOutwardStatus: (id: string, status: OutwardStatus) => void;
  deleteOutwardEntry: (id: string) => void;

  // Handlers for Job Cards
  addJobCard: (card: Omit<JobCard, 'id'>) => void;
  updateJobCard: (id: string, updates: Partial<JobCard>) => void;
  updateJobCardStep: (jobCardId: string, stepNumber: number, completed: boolean) => void;
  toggleJobOperation: (jobCardId: string, stepNumber: number) => void;
  createJobCardFromOrder: (order: ManufacturingOrderItem) => JobCard;
  deleteJobCard: (id: string) => void;

  // Handlers for QC
  addQCInspection: (qc: Omit<QCInspection, 'id'>) => void;
  updateQCInspection: (id: string, updates: Partial<QCInspection>) => void;
  deleteQCInspection: (id: string) => void;

  // Handlers for Projects
  setProjects: React.Dispatch<React.SetStateAction<ProjectItem[]>>;
  addProject: (project: Omit<ProjectItem, 'id'>) => void;
  updateProject: (id: string, updates: Partial<ProjectItem>) => void;
  deleteProject: (id: string, cascadeRequirements?: boolean) => void;

  // Handlers for Vendors & Customers
  addVendor: (vendor: Omit<VendorItem, 'id'>) => void;
  updateVendor: (id: string, updates: Partial<VendorItem>) => void;
  deleteVendor: (id: string) => void;
  addCustomer: (customer: Omit<CustomerItem, 'id'>) => void;
  updateCustomer: (id: string, updates: Partial<CustomerItem>) => void;
  deleteCustomer: (id: string) => void;
  learnCustomer: (name: string, mobile?: string, email?: string, address?: string) => CustomerItem;
  learnMachine: (name: string) => void;
  learnVendor: (name: string, contactPerson?: string, mobile?: string, category?: string) => VendorItem;

  // Handlers for Machines
  addMachine: (machine: Omit<MachineItem, 'id'>) => void;
  updateMachine: (id: string, updates: Partial<MachineItem>) => void;
  deleteMachine: (id: string) => void;

  // BOM Operations & Live Sync
  syncProjectToBOM: (projectNameOrId: string) => void;

  // Commercials: Purchase & Sales
  addPurchaseOrder: (po: Omit<PurchaseOrder, 'id'>) => void;
  updatePOStatus: (id: string, status: PurchaseOrder['status']) => void;
  deletePurchaseOrder: (id: string) => void;
  addSalesOrder: (so: Omit<SalesOrder, 'id'>) => void;
  updateSOStatus: (id: string, status: SalesOrder['status']) => void;

  // Costing
  saveCostingRecord: (costing: Omit<ProjectCosting, 'id'>) => void;

  // BOM Operations
  addBOM: (bom: Omit<BOMRecord, 'id'>) => void;
  updateBOM: (id: string, updates: Partial<BOMRecord>) => void;
  approveBOM: (id: string) => void;
  copyBOM: (sourceBomId: string, newBomNumber: string, newAssemblyName: string) => void;
  deleteBOM: (id: string) => void;

  // RFQ & Vendor Portal Operations
  addRFQ: (rfq: Omit<RFQRecord, 'id' | 'quotations'>) => void;
  submitVendorQuotation: (rfqId: string, quotation: Omit<VendorQuotation, 'id' | 'submittedDate' | 'status'>) => void;
  approveVendorQuotation: (rfqId: string, quotationId: string) => void;
  rejectVendorQuotation: (rfqId: string, quotationId: string) => void;
  uploadVendorDocument: (doc: Omit<VendorDocument, 'id' | 'uploadDate'>) => void;

  // MRP Operations
  mrpRecords: MRPRecord[];
  generateAutoPurchaseRequests: (shortages: MRPRecord[]) => void;

  // Bulk Excel Import handlers
  bulkImportMaterials: (items: any[]) => void;
  bulkImportOrders: (items: any[]) => void;
  bulkImportInward: (items: any[]) => void;
  bulkImportVendors: (items: any[]) => void;
  bulkImportCustomers: (items: any[]) => void;

  // Procurement Basket Operations
  bulkAssignMaterialVendor: (reqIds: string[], vendorName: string) => void;
  generateProcurementPO: (
    vendor: string,
    items: {
      material: string;
      sizeSpecs: string;
      qty: number;
      unit: string;
      rate?: number;
      amount?: number;
      requirementId?: string;
      projectName?: string;
      machineName?: string;
    }[],
    expectedDate?: string,
    notes?: string,
    customPoNumber?: string,
    orderedBy?: string
  ) => PurchaseOrder;
  sendProcurementRFQ: (
    vendors: string[],
    items: {
      requirementId?: string;
      description: string;
      materialType: string;
      sizeSpecs: string;
      quantity: number;
      unit: string;
      projectName: string;
      machineName: string;
      targetRate?: number;
    }[],
    notes?: string
  ) => RFQRecord;

  // Super Admin Member Authorization & Access Matrix
  addUser: (user: Omit<User, 'id'>) => void;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;
  alterUserAuthorization: (userId: string, authLevel: AuthLevel, permissions: UserPermissions, status?: 'Active' | 'Suspended' | 'Read Only') => void;
  issueUserResetPin: (userId: string) => { pin: string; formattedPin: string; expiresAtText: string; expiresAtMs: number };

  // Heart of ERP: Replace/Sync project requirements with full DB reconciliation
  replaceProjectRequirements: (projectName: string, items: any[]) => void;
  importMaterialRequirements: (
    items: Partial<ProjectMaterialRequirementItem>[],
    options?: {
      projectName?: string;
      machineName?: string;
      vendorName?: string;
      poNo?: string;
      sheetName?: string;
      batchId?: string;
    }
  ) => Promise<{ success: boolean; count: number; message?: string }>;

  // Dedicated Trash / Recycle Bin with Instant Recovery
  trashItems: TrashItem[];
  restoreFromTrash: (trashId: string) => void;
  permanentlyDeleteFromTrash: (trashId: string) => void;
  emptyTrash: () => void;

  // System Utilities
  logAction?: (action: string, module: string, details: string) => void;
  logAudit?: (action: string, module: string, details: string) => void;
  markNotificationRead: (id: string) => void;
  resetToDemoData: () => void;
  exportDatabaseBackup: () => void;
  importDatabaseBackup: (jsonContent: string) => boolean;
  isMaintenanceMode: boolean;
  toggleMaintenanceMode: (enabled?: boolean) => Promise<boolean>;
  isKaustubhAdmin: boolean;
  isRootAdmin: boolean;
}

const ERPContext = createContext<ERPContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'RSB_ERP_STATE_V6';
const DRAFT_STORAGE_KEY = 'RSB_PROJECT_MATERIAL_ENTRY_10COL_WORKFLOW_V4';
const AUTH_SESSION_KEY = 'RSB_ERP_AUTH_USER_ID';
const LAST_ACTIVITY_KEY = 'RSB_ERP_LAST_ACTIVITY';
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes session inactivity timeout

// One-time automatic purge of all previous trial data keys from browser
(function purgeLegacyTrialData() {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        !key.startsWith('RSB_ERP_STATE_V6') &&
        (key.startsWith('RSB_ERP_STATE_') ||
          key.startsWith('rsb_wb_') ||
          key.startsWith('rsb_custom_') ||
          key.startsWith('rsb_base_') ||
          key.startsWith('rsb_deleted_') ||
          key.startsWith('rsb_erp_production_') ||
          key.startsWith('rsb_selected_') ||
          key.startsWith('rsb_active_') ||
          key.startsWith('RSB_PROJECT_MATERIAL_ENTRY_'))
      ) {
        if (key === 'rsb_supabase_config') continue;
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.warn('Error purging legacy trial data:', e);
  }
})();

export const isKaustubhUser = (u?: User | null): boolean => {
  if (!u) return false;
  return (
    u.id === 'usr-kaustubh' ||
    u.email?.toLowerCase().includes('kaustubh') ||
    u.name?.toLowerCase().includes('kaustubh') ||
    u.role === 'kaustubh'
  );
};

export const isAmitUser = (u?: User | null): boolean => {
  if (!u) return false;
  return (
    u.id === 'usr-amit' ||
    u.email?.toLowerCase().includes('amit') ||
    u.name?.toLowerCase().includes('amit')
  );
};

export const isRootAdminUser = (u?: User | null): boolean => {
  return isKaustubhUser(u) || isAmitUser(u);
};

export const INITIAL_MASTER_MACHINES: MachineFolder[] = [
  {
    id: 'mach-filling-machine',
    name: 'Filling machine',
    types: [
      '1. Filling',
      '2. Sealing',
      '3. Washing',
      '4. Air Conveyor',
      '5. Housing & Drive shaft',
      '6. Cap elevator & Railing & cap shooter',
      '7. Transfer Wheel',
      '8. Machine & Base frame',
      '9. Outlet Conveyor',
      '10. Electrical',
      '11. Gear set & Hub set',
    ],
    createdBy: 'Kaustubh Admin',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'mach-labelling-machine-amit',
    name: 'LABELLING MACHINE AMIT',
    types: [
      '1. Base Frame + Clading + Panel',
      '2. Conveyor Assembly',
      '3. Drive Assembly + Gear Assembly + Shaft + Vacuum Assembly',
      '4. Drum Assembly',
      '5. Cutter Assembly',
      '6. Servo Roller Assembly',
      '7. Infeed Assembly',
      '8. Change part Assembly',
      '9. Electrical',
      '10. Pneumatic Assembly',
      '11. Pump Assembly',
    ],
    createdBy: 'Amit',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'mach-mono-conveyor',
    name: 'Mono Conveyor System',
    types: [
      '1. Slat Chain Conveyor Assembly',
      '2. Belt Conveyor Assembly',
      '3. Drive & Motor Assembly',
      '4. Guide Rail & Stand Frame',
    ],
    createdBy: 'Kaustubh Admin',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'mach-vial-washing',
    name: 'Automatic Vial Washing Machine',
    types: [
      '1. Linear Washing Unit',
      '2. Rotary Washing Unit',
      '3. Water Recycling & Pump Skid',
      '4. Enclosure & Base Structure',
    ],
    createdBy: 'Kaustubh Admin',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedAt: '2026-01-15T10:00:00.000Z',
  },
];

export const INITIAL_MASTER_BOMS: MasterBOM[] = [
  // --- Filling machine: Root BOM Files ---
  {
    id: 'bom-fm-nut-bolt-list',
    bomNumber: 'BOM-FM-NBL-01',
    name: 'Filling machine nut bolt list',
    assemblyName: 'Filling machine nut bolt list',
    machineName: 'Filling machine',
    machineType: 'General / Root',
    revision: 'Rev A',
    status: 'Approved',
    category: 'Fasteners & Hardware',
    notes: 'Complete standard hardware and fastener bill for rotary monoblock filling unit',
    createdBy: 'Kaustubh Admin',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedBy: 'Kaustubh Admin',
    updatedAt: '2026-01-15T10:00:00.000Z',
    items: [
      {
        id: 'fm-nb-1',
        srNo: 1,
        description: 'M8 x 25 Hex Head Bolt Full Thread',
        materialType: 'SS 304 Bolt',
        sizeSpecs: 'M8 x 25 mm',
        quantity: 120,
        unit: 'Nos',
        category: 'Fasteners',
        notes: 'SS 304 forged high tensile',
      },
      {
        id: 'fm-nb-2',
        srNo: 2,
        description: 'M8 Self Locking Nyloc Nut',
        materialType: 'SS 304 Nut',
        sizeSpecs: 'M8 Standard',
        quantity: 120,
        unit: 'Nos',
        category: 'Fasteners',
        notes: 'Vibration resistant nylon collar',
      },
      {
        id: 'fm-nb-3',
        srNo: 3,
        description: 'M10 x 35 Socket Head Cap Screw',
        materialType: 'SS 304 Bolt',
        sizeSpecs: 'M10 x 35 mm',
        quantity: 80,
        unit: 'Nos',
        category: 'Fasteners',
        notes: 'Allen key drive DIN 912',
      },
      {
        id: 'fm-nb-4',
        srNo: 4,
        description: 'M6 x 15 Button Head Torx Bolt',
        materialType: 'SS 304 Bolt',
        sizeSpecs: 'M6 x 15 mm',
        quantity: 64,
        unit: 'Nos',
        category: 'Fasteners',
        notes: 'Smooth panel mount finish',
      },
      {
        id: 'fm-nb-5',
        srNo: 5,
        description: 'Plain Washer M8 Thick Flange',
        materialType: 'SS Washer',
        sizeSpecs: 'OD 20 x ID 8.4 x 1.5 mm',
        quantity: 240,
        unit: 'Nos',
        category: 'Hardware',
        notes: 'SS 304 punched and deburred',
      },
      {
        id: 'fm-nb-6',
        srNo: 6,
        description: 'Spring Lock Washer M10',
        materialType: 'SS Washer',
        sizeSpecs: 'M10 Spring Split',
        quantity: 80,
        unit: 'Nos',
        category: 'Hardware',
        notes: 'DIN 127B spring steel SS',
      },
    ],
  },
  {
    id: 'bom-fm-rfc-switchgears',
    bomNumber: 'BOM-FM-ELEC-01',
    name: 'RFC switch gears',
    assemblyName: 'RFC switch gears',
    machineName: 'Filling machine',
    machineType: 'General / Root',
    revision: 'Rev A',
    status: 'Approved',
    category: 'Electrical & Automation',
    notes: 'Power switchgear, contactors, and control gear components for filling machine panel',
    createdBy: 'Kaustubh Admin',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedBy: 'Kaustubh Admin',
    updatedAt: '2026-01-15T10:00:00.000Z',
    items: [
      {
        id: 'fm-sg-1',
        srNo: 1,
        description: '3-Pole MCB 32A C-Curve 10kA',
        materialType: 'Electrical Component',
        sizeSpecs: '32 Ampere 415V AC',
        quantity: 2,
        unit: 'Nos',
        category: 'Electrical',
        notes: 'Schneider Electric Acti9 series',
      },
      {
        id: 'fm-sg-2',
        srNo: 2,
        description: 'SMPS Regulated Power Supply 24V DC 10A',
        materialType: 'Electrical Component',
        sizeSpecs: 'Input 230V / Output 24V DC 240W',
        quantity: 1,
        unit: 'Nos',
        category: 'Electrical',
        notes: 'DIN Rail mount industrial power',
      },
      {
        id: 'fm-sg-3',
        srNo: 3,
        description: 'VFD AC Inverter Motor Drive 1.5 kW',
        materialType: 'Electrical Component',
        sizeSpecs: '1.5 kW 415V 3-Phase',
        quantity: 2,
        unit: 'Nos',
        category: 'Drive Gear',
        notes: 'Modbus RS485 communication enabled',
      },
      {
        id: 'fm-sg-4',
        srNo: 4,
        description: 'Power Contactor 18A with 24V DC Coil',
        materialType: 'Electrical Component',
        sizeSpecs: '18A 3P + 1NO auxiliary',
        quantity: 3,
        unit: 'Nos',
        category: 'Electrical',
        notes: 'Heavy duty motor starter duty',
      },
      {
        id: 'fm-sg-5',
        srNo: 5,
        description: 'Emergency Stop Push Button Mushroom Head IP65',
        materialType: 'Electrical Component',
        sizeSpecs: '22.5 mm cutout 2NC contact',
        quantity: 2,
        unit: 'Nos',
        category: 'Safety',
        notes: 'Turn-to-reset latching mechanism',
      },
    ],
  },

  // --- Filling machine: Assembly Subfolder BOMs ---
  {
    id: 'bom-fm-filling-assembly',
    bomNumber: 'BOM-FM-01',
    name: 'Standard Rotary Filling Assembly BOM',
    assemblyName: 'Standard Rotary Filling Assembly BOM',
    machineName: 'Filling machine',
    machineType: '1. Filling',
    revision: 'Rev A',
    status: 'Approved',
    category: 'Filling Assembly',
    notes: 'Standard production BOM with precision SS components for 24-head liquid filling',
    createdBy: 'Kaustubh Admin',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedBy: 'Kaustubh Admin',
    updatedAt: '2026-01-15T10:00:00.000Z',
    items: [
      {
        id: 'bi-rmb-1',
        srNo: 1,
        description: 'Frame Mounting Bottom Strip',
        materialType: 'SS Flat',
        sizeSpecs: '80 x 6 x 485',
        quantity: 4,
        unit: 'Nos',
        category: 'Structural',
        notes: 'SS 304 laser cut & deburred',
        recommendedVendor: 'Standard SS Supplier',
      },
      {
        id: 'bi-rmb-2',
        srNo: 2,
        description: 'Liquid Feed Manifold Pipe',
        materialType: 'SS Pipe',
        sizeSpecs: '25 mm NB x 2 mm thk',
        quantity: 6,
        unit: 'Meter',
        category: 'Piping',
        notes: 'Sanitary electropolished ID',
        recommendedVendor: 'Standard SS Supplier',
      },
      {
        id: 'bi-rmb-3',
        srNo: 3,
        description: 'Machine Enclosure SS Sheet Paneling',
        materialType: 'SS Sheet',
        sizeSpecs: '2 mm x 1250 x 2500',
        quantity: 2,
        unit: 'Nos',
        category: 'Body Cover',
        notes: '2B finish with protective PVC coating',
        recommendedVendor: 'Standard SS Supplier',
      },
      {
        id: 'bi-rmb-4',
        srNo: 4,
        description: 'Filling Nozzle Plunger Shaft',
        materialType: 'SS Round',
        sizeSpecs: '20 mm Dia x 300 mm',
        quantity: 3,
        unit: 'Nos',
        category: 'Moving Parts',
        notes: 'Ground finish H7 tolerance',
        recommendedVendor: 'Standard SS Supplier',
      },
      {
        id: 'bi-rmb-5',
        srNo: 5,
        description: 'Inlet/Outlet Sanitary SS Flange',
        materialType: 'SS 304 Flange',
        sizeSpecs: '1.5 Inch Table E',
        quantity: 4,
        unit: 'Nos',
        category: 'Hardware',
        notes: 'Tri-clover clamp compatible',
        recommendedVendor: 'Standard SS Supplier',
      },
    ],
  },
  {
    id: 'bom-fm-sealing-assembly',
    bomNumber: 'BOM-FM-02',
    name: 'Rotary Capping & Sealing Assembly',
    assemblyName: 'Rotary Capping & Sealing Assembly',
    machineName: 'Filling machine',
    machineType: '2. Sealing',
    revision: 'Rev A',
    status: 'Approved',
    category: 'Sealing Assembly',
    notes: 'Magnetic torque capping heads and sealing spindle assembly',
    createdBy: 'Kaustubh Admin',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedBy: 'Kaustubh Admin',
    updatedAt: '2026-01-15T10:00:00.000Z',
    items: [
      {
        id: 'bi-sea-1',
        srNo: 1,
        description: 'Magnetic Capping Chuck Head SS 316',
        materialType: 'SS Round',
        sizeSpecs: '55 mm Dia x 120 mm',
        quantity: 8,
        unit: 'Nos',
        category: 'Sealing Head',
        notes: 'Adjustable magnetic slip torque 0.5 - 2.5 Nm',
      },
      {
        id: 'bi-sea-2',
        srNo: 2,
        description: 'Capping Spindle Drive Shaft',
        materialType: 'SS Round',
        sizeSpecs: '25 mm Dia x 450 mm',
        quantity: 8,
        unit: 'Nos',
        category: 'Drive Shaft',
        notes: 'Keyway milled and ground finish',
      },
    ],
  },
  {
    id: 'bom-fm-base-frame',
    bomNumber: 'BOM-FM-08',
    name: 'Machine Base Frame Structural Assembly',
    assemblyName: 'Machine Base Frame Structural Assembly',
    machineName: 'Filling machine',
    machineType: '8. Machine & Base frame',
    revision: 'Rev A',
    status: 'Approved',
    category: 'Structure',
    notes: 'Fabricated main base frame with leveling pads and stainless steel skin',
    createdBy: 'Kaustubh Admin',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedBy: 'Kaustubh Admin',
    updatedAt: '2026-01-15T10:00:00.000Z',
    items: [
      {
        id: 'bi-bf-1',
        srNo: 1,
        description: 'Base Frame Hollow Box Pipe',
        materialType: 'MS / SS Pipe',
        sizeSpecs: '75 x 75 x 3 mm thk',
        quantity: 18,
        unit: 'Meter',
        category: 'Structural',
        notes: 'Welded frame with epoxy primer',
      },
      {
        id: 'bi-bf-2',
        srNo: 2,
        description: 'Heavy Duty Machine Leveling Pad M24',
        materialType: 'SS Leveling Pad',
        sizeSpecs: 'Base 100 mm Dia x M24 Thread',
        quantity: 6,
        unit: 'Nos',
        category: 'Hardware',
        notes: 'Anti-vibration rubber base pad',
      },
    ],
  },

  // --- LABELLING MACHINE AMIT: Root & Subfolder BOMs ---
  {
    id: 'bom-lm-bearing-list',
    bomNumber: 'BOM-LM-BRG-01',
    name: 'LABELLING_MACHINE_120BPM_BEARING',
    assemblyName: 'LABELLING_MACHINE_120BPM_BEARING',
    machineName: 'LABELLING MACHINE AMIT',
    machineType: 'General / Root',
    revision: 'Rev A',
    status: 'Approved',
    category: 'Bearings & Hardware',
    notes: 'Comprehensive bearing schedule for 120 BPM automatic sticker labelling machine',
    createdBy: 'Amit',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedBy: 'Amit',
    updatedAt: '2026-01-15T10:00:00.000Z',
    items: [
      {
        id: 'lm-bg-1',
        srNo: 1,
        description: 'Deep Groove Ball Bearing 6204-2RS',
        materialType: 'Bearing Component',
        sizeSpecs: 'ID 20 x OD 47 x W 14 mm',
        quantity: 8,
        unit: 'Nos',
        category: 'Bearings',
        notes: 'SKF / FAG genuine rubber sealed',
      },
      {
        id: 'lm-bg-2',
        srNo: 2,
        description: 'High Speed Ball Bearing 6005-2RS',
        materialType: 'Bearing Component',
        sizeSpecs: 'ID 25 x OD 47 x W 12 mm',
        quantity: 6,
        unit: 'Nos',
        category: 'Bearings',
        notes: 'Pre-lubricated high speed synthetic grease',
      },
      {
        id: 'lm-bg-3',
        srNo: 3,
        description: 'Pillow Block Bearing Unit UCP 205',
        materialType: 'Bearing Component',
        sizeSpecs: 'Shaft 25 mm Center Height 36.5 mm',
        quantity: 4,
        unit: 'Nos',
        category: 'Mounted Units',
        notes: 'Cast iron housing with grease nipple',
      },
      {
        id: 'lm-bg-4',
        srNo: 4,
        description: '2-Bolt Oval Flange Bearing UCFL 204',
        materialType: 'Bearing Component',
        sizeSpecs: 'Shaft 20 mm 2-Bolt Flange',
        quantity: 4,
        unit: 'Nos',
        category: 'Mounted Units',
        notes: 'Side conveyor wall mounting',
      },
      {
        id: 'lm-bg-5',
        srNo: 5,
        description: 'Linear Ball Bushing LM 20 UU',
        materialType: 'Bearing Component',
        sizeSpecs: 'Shaft 20 mm OD 32 x L 42 mm',
        quantity: 4,
        unit: 'Nos',
        category: 'Linear Motion',
        notes: 'Dispensing beak height adjustment slide',
      },
    ],
  },
  {
    id: 'bom-lm-base-frame',
    bomNumber: 'BOM-LM-01',
    name: 'Base Frame + Cladding + Panel Specification',
    assemblyName: 'Base Frame + Cladding + Panel Specification',
    machineName: 'LABELLING MACHINE AMIT',
    machineType: '1. Base Frame + Clading + Panel',
    revision: 'Rev A',
    status: 'Approved',
    category: 'Structural',
    notes: 'Base frame chassis with stainless steel 304 architectural cladding',
    createdBy: 'Amit',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedBy: 'Amit',
    updatedAt: '2026-01-15T10:00:00.000Z',
    items: [
      {
        id: 'lm-bf-1',
        srNo: 1,
        description: 'Square Tubular Main Chassis Frame',
        materialType: 'SS Pipe',
        sizeSpecs: '50 x 50 x 2.5 mm thk',
        quantity: 14,
        unit: 'Meter',
        category: 'Structural',
        notes: 'TIG welded & pickled finish',
      },
      {
        id: 'lm-bf-2',
        srNo: 2,
        description: 'Cladding Side Door SS 304 Sheet',
        materialType: 'SS Sheet',
        sizeSpecs: '1.5 mm x 600 x 900 mm',
        quantity: 4,
        unit: 'Nos',
        category: 'Body Cover',
        notes: 'Matt finish with acrylic viewing window',
      },
    ],
  },
  {
    id: 'bom-lm-conveyor',
    bomNumber: 'BOM-LM-02',
    name: 'Conveyor Assembly Specification',
    assemblyName: 'Conveyor Assembly Specification',
    machineName: 'LABELLING MACHINE AMIT',
    machineType: '2. Conveyor Assembly',
    revision: 'Rev A',
    status: 'Approved',
    category: 'Conveyor',
    notes: 'Slat chain product handling conveyor with bottle spacing separator',
    createdBy: 'Amit',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedBy: 'Amit',
    updatedAt: '2026-01-15T10:00:00.000Z',
    items: [
      {
        id: 'lm-cv-1',
        srNo: 1,
        description: 'Delrin / SS 812 Slat Chain Conveyor',
        materialType: 'Hardware',
        sizeSpecs: 'Width 82.5 mm Pitch 38.1 mm',
        quantity: 5,
        unit: 'Meter',
        category: 'Chain',
        notes: 'Low friction food grade track',
      },
      {
        id: 'lm-cv-2',
        srNo: 2,
        description: 'Conveyor Guide Rail SS Profile',
        materialType: 'SS Flat',
        sizeSpecs: '25 x 3 mm x 2000 mm',
        quantity: 4,
        unit: 'Nos',
        category: 'Guide',
        notes: 'Fitted with green UHMWPE wear strip',
      },
    ],
  },
  {
    id: 'bom-lm-drive-vacuum',
    bomNumber: 'BOM-LM-03',
    name: 'Drive Assembly + Gear Assembly + Shaft + Vacuum Assembly',
    assemblyName: 'Drive Assembly + Gear Assembly + Shaft + Vacuum Assembly',
    machineName: 'LABELLING MACHINE AMIT',
    machineType: '3. Drive Assembly + Gear Assembly + Shaft + Vacuum Assembly',
    revision: 'Rev A',
    status: 'Approved',
    category: 'Drive Transmission',
    notes: 'Precision geared drive mechanism with vacuum suction manifold and shafting',
    createdBy: 'Amit',
    createdAt: '2026-01-15T10:00:00.000Z',
    updatedBy: 'Amit',
    updatedAt: '2026-01-15T10:00:00.000Z',
    items: [
      {
        id: 'lm-dv-1',
        srNo: 1,
        description: 'Main Drive Vacuum Transmission Shaft',
        materialType: 'SS Round',
        sizeSpecs: '35 mm Dia x 580 mm',
        quantity: 1,
        unit: 'Nos',
        category: 'Shafting',
        notes: 'Center drilled for vacuum suction passage, H6 tolerance',
      },
      {
        id: 'lm-dv-2',
        srNo: 2,
        description: 'Helical Worm Gearbox 1:20 Ratio',
        materialType: 'Hardware',
        sizeSpecs: 'Size 50 Input 14mm Output 25mm Hollow',
        quantity: 1,
        unit: 'Nos',
        category: 'Gearbox',
        notes: 'Aluminum housing synthetic gear oil filled',
      },
      {
        id: 'lm-dv-3',
        srNo: 3,
        description: 'Vacuum Distributor Rotary Union',
        materialType: 'Brass / SS Component',
        sizeSpecs: '1/2 Inch BSP Single Flow High Speed',
        quantity: 1,
        unit: 'Nos',
        category: 'Vacuum System',
        notes: 'Rotary carbon graphite seal 1500 RPM rated',
      },
    ],
  },

  // --- Mono Conveyor & Vial Washing ---
  {
    id: 'bom-conveyor-slat-std',
    bomNumber: 'BOM-MC-01',
    name: 'Standard Slat Conveyor BOM',
    assemblyName: 'Standard Slat Conveyor BOM',
    machineName: 'Mono Conveyor System',
    machineType: '1. Slat Chain Conveyor Assembly',
    revision: 'Rev A',
    status: 'Approved',
    category: 'Material Handling',
    notes: 'Heavy duty SS 304 slat conveyor with adjustable guide rails',
    createdBy: 'Kaustubh Admin',
    createdAt: '2026-01-16T11:00:00.000Z',
    updatedBy: 'Kaustubh Admin',
    updatedAt: '2026-01-16T11:00:00.000Z',
    items: [
      {
        id: 'bi-mc-1',
        srNo: 1,
        description: 'Conveyor Side Guide Frame Sheet',
        materialType: 'SS Sheet',
        sizeSpecs: '2.5 mm x 1000 x 2000',
        quantity: 2,
        unit: 'Nos',
        category: 'Frame',
        notes: 'CNC bent profile with guide mounting slots',
      },
      {
        id: 'bi-mc-2',
        srNo: 2,
        description: 'Return Roller Guide Outer Pipe',
        materialType: 'SS Pipe',
        sizeSpecs: '38 mm OD x 1.5 mm thk',
        quantity: 12,
        unit: 'Meter',
        category: 'Roller',
        notes: 'Seamless SS 304 pipe',
      },
    ],
  },
];

export const ERPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_users');
    if (saved) {
      try {
        const parsed: User[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const cleaned = parsed.filter(
            (u) =>
              u.id !== 'usr-admin' &&
              u.email?.toLowerCase() !== 'admin@rsbequipments.com' &&
              u.name?.toLowerCase() !== 'administrator'
          );
          const existingIds = new Set(cleaned.map((u) => u.id));
          const merged: User[] = cleaned.map((u): User => {
            const seed = INITIAL_USERS.find(
              (su) =>
                su.id === u.id ||
                (su.email && u.email && su.email.toLowerCase() === u.email.toLowerCase()) ||
                (su.name && u.name && su.name.toLowerCase() === u.name.toLowerCase())
            );
            const isPrashant =
              u.name?.toLowerCase().includes('prashant') ||
              u.email?.toLowerCase().includes('prashant') ||
              u.id === 'usr-1791893308005' ||
              u.id === 'usr-1791892508324';
            const finalPass =
              (isPrashant ? 'Prashant@123' : undefined) ||
              u.password ||
              seed?.password ||
              'Admin@123';
            const finalResetPin =
              u.resetPin ||
              (u.permissions as any)?.resetPin ||
              seed?.resetPin ||
              (isPrashant ? '789-456' : undefined);
            const finalExpiresAt =
              u.resetPinExpiresAt ||
              (u.permissions as any)?.resetPinExpiresAt ||
              seed?.resetPinExpiresAt ||
              Date.now() + 30 * 24 * 60 * 60 * 1000;
            return {
              ...u,
              password: finalPass,
              resetPin: finalResetPin,
              resetPinExpiresAt: finalExpiresAt,
              permissions: {
                ...(seed?.permissions || {}),
                ...(u.permissions || {}),
                password: finalPass,
                resetPin: finalResetPin,
                resetPinExpiresAt: finalExpiresAt,
              },
            };
          });
          for (const initU of INITIAL_USERS) {
            if (
              !existingIds.has(initU.id) &&
              initU.id !== 'usr-admin' &&
              initU.email?.toLowerCase() !== 'admin@rsbequipments.com'
            ) {
              merged.push(initU);
            }
          }
          localStorage.setItem(LOCAL_STORAGE_KEY + '_users', JSON.stringify(merged));
          return merged;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_USERS.filter(
      (u) =>
        u.id !== 'usr-admin' &&
        u.email?.toLowerCase() !== 'admin@rsbequipments.com' &&
        u.name?.toLowerCase() !== 'administrator'
    );
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      const sessionUser = sessionStorage.getItem(AUTH_SESSION_KEY) || localStorage.getItem(AUTH_SESSION_KEY);
      if (!sessionUser) return false;

      // Check for inactivity timeout on page load / refresh
      const lastActivity = Number(
        sessionStorage.getItem(LAST_ACTIVITY_KEY) || localStorage.getItem(LAST_ACTIVITY_KEY) || '0'
      );
      if (lastActivity > 0 && Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS) {
        // Session expired - clear all auth keys
        sessionStorage.removeItem(AUTH_SESSION_KEY);
        localStorage.removeItem(AUTH_SESSION_KEY);
        sessionStorage.removeItem(LAST_ACTIVITY_KEY);
        localStorage.removeItem(LAST_ACTIVITY_KEY);
        return false;
      }
      return true;
    } catch {
      return false;
    }
  });

  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const sessionUser = sessionStorage.getItem(AUTH_SESSION_KEY) || localStorage.getItem(AUTH_SESSION_KEY);
      if (sessionUser && sessionUser !== 'usr-admin' && sessionUser !== 'admin@rsbequipments.com') {
        const savedUsersRaw = localStorage.getItem(LOCAL_STORAGE_KEY + '_users');
        const userPool: User[] = savedUsersRaw ? JSON.parse(savedUsersRaw) : INITIAL_USERS;
        const validPool = userPool.filter(
          (u) =>
            u.id !== 'usr-admin' &&
            u.email?.toLowerCase() !== 'admin@rsbequipments.com' &&
            u.name?.toLowerCase() !== 'administrator'
        );
        const found =
          validPool.find((u) => u.id === sessionUser || u.role === sessionUser || u.email === sessionUser) ||
          INITIAL_USERS.find(
            (u) =>
              (u.id === sessionUser || u.role === sessionUser || u.email === sessionUser) &&
              u.id !== 'usr-admin' &&
              u.email?.toLowerCase() !== 'admin@rsbequipments.com'
          );
        if (found) return found;
      }
    } catch {
      // fallback
    }
    return INITIAL_USERS[0];
  });

  const isKaustubhAdmin = isKaustubhUser(currentUser);
  const isRootAdmin = isRootAdminUser(currentUser);

  const [isMaintenanceMode, setIsMaintenanceMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('RSB_MAINTENANCE_MODE') === 'true';
    } catch {
      return false;
    }
  });

  // Sync maintenance mode from Supabase and BroadcastChannel across tabs
  useEffect(() => {
    let isMounted = true;
    const fetchMaintenanceStatus = async () => {
      try {
        const remote = await getRemoteMaintenanceMode();
        if (remote !== null && isMounted) {
          setIsMaintenanceMode(remote);
          try {
            localStorage.setItem('RSB_MAINTENANCE_MODE', remote ? 'true' : 'false');
          } catch {}
        }
      } catch (e) {}
    };

    fetchMaintenanceStatus();

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('rsb_maintenance_sync');
      channel.onmessage = (event) => {
        if (event.data && typeof event.data.enabled === 'boolean') {
          setIsMaintenanceMode(event.data.enabled);
        }
      };
    } catch {}

    const intervalId = setInterval(fetchMaintenanceStatus, 8000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      channel?.close();
    };
  }, []);

  const [activeVendorId, setActiveVendorId] = useState<string>('vnd-1');

  const [activeTab, setActiveTabState] = useState<string>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const tabParam = urlParams.get('tab');
      if (tabParam) return tabParam;
      const saved = localStorage.getItem('RSB_ACTIVE_TAB');
      if (saved) return saved;
    } catch (e) {}
    return 'microsoft';
  });

  const setActiveTab = (tab: string, pushHistory = true) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('RSB_ACTIVE_TAB', tab);
      if (pushHistory && typeof window !== 'undefined' && window.history) {
        window.history.pushState({ tab }, '', `?tab=${tab}`);
      }
    } catch (e) {}
  };

  // Sync with browser Back and Forward navigation
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.tab) {
        setActiveTabState(e.state.tab);
        try {
          localStorage.setItem('RSB_ACTIVE_TAB', e.state.tab);
        } catch {}
      } else {
        try {
          const urlParams = new URLSearchParams(window.location.search);
          const tab = urlParams.get('tab');
          if (tab) {
            setActiveTabState(tab);
            localStorage.setItem('RSB_ACTIVE_TAB', tab);
          }
        } catch {}
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const pendingSyncIdsRef = useRef<Set<string>>(new Set());

  const [materials, setMaterials] = useState<MaterialItem[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_materials');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const matTombstones = getDeletedMaterialTombstones();
          return parsed.filter((m) => !matTombstones.has(m.id));
        }
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_MATERIALS;
  });

  const [projectRequirements, setProjectRequirements] = useState<ProjectMaterialRequirementItem[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_requirements');
    if (saved) {
      try {
        const parsed: ProjectMaterialRequirementItem[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const reqTombstones = getDeletedRequirementTombstones();
          return sortRowsByAscendingSrNo(parsed.filter((r) => !reqTombstones.has(r.id)));
        }
      } catch (e) {
        console.error(e);
      }
    }
    return sortRowsByAscendingSrNo(INITIAL_PROJECT_REQUIREMENTS);
  });

  const [vendors, setVendors] = useState<VendorItem[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_vendors');
    const tombstones = getDeletedVendorTombstones();
    const initialList = saved ? JSON.parse(saved) : INITIAL_VENDORS;
    return initialList.filter((v: VendorItem) => !tombstones.has(v.id));
  });

  const [customers, setCustomers] = useState<CustomerItem[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_customers');
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [machines, setMachines] = useState<MachineItem[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_machines');
    return saved ? JSON.parse(saved) : INITIAL_MACHINES;
  });

  const [projects, setProjects] = useState<ProjectItem[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_projects');
    if (saved) {
      try {
        const parsed: ProjectItem[] = JSON.parse(saved);
        const prjTombstones = getDeletedProjectTombstones();
        return parsed.filter(
          (p) =>
            !prjTombstones.has(p.id) &&
            !['prj-foha', 'prj-1', 'prj-2', 'prj-cip-skid', 'prj-sun-liquid', 'prj-int-fab', 'prj-pipeline', 'prj-rotary-dist', 'prj-cap-trans', 'prj-sealing-30'].includes(p.id)
        );
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_PROJECTS;
  });


  const [orders, setOrders] = useState<ManufacturingOrderItem[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_orders');
    if (saved) {
      try {
        const parsed: ManufacturingOrderItem[] = JSON.parse(saved);
        return parsed.filter((o) => !['ord-1', 'ord-2', 'ord-3'].includes(o.id));
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_ORDERS;
  });

  const [inwardEntries, setInwardEntries] = useState<InwardEntry[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_inward');
    if (saved) {
      try {
        const parsed: InwardEntry[] = JSON.parse(saved);
        return parsed.filter((i) => !['inw-1', 'inw-2'].includes(i.id));
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_INWARD;
  });

  const [outwardEntries, setOutwardEntries] = useState<OutwardEntry[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_outward');
    if (saved) {
      try {
        const parsed: OutwardEntry[] = JSON.parse(saved);
        return parsed.filter((o) => !['out-1'].includes(o.id));
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_OUTWARD;
  });

  const [jobCards, setJobCards] = useState<JobCard[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_jobCards');
    if (saved) {
      try {
        const parsed: JobCard[] = JSON.parse(saved);
        return parsed.filter((j) => !['jc-1'].includes(j.id));
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_JOB_CARDS;
  });

  const [qcInspections, setQcInspections] = useState<QCInspection[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_qc');
    if (saved) {
      try {
        const parsed: QCInspection[] = JSON.parse(saved);
        return parsed.filter((q) => !['qc-1'].includes(q.id));
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_QC;
  });

  // =========================================================================
  // REAL-TIME SYNCHRONIZED FACTORY & QUALITY GETTERS
  // =========================================================================
  const activeProcessingMaterials = useMemo<ActiveProcessingMaterial[]>(() => {
    const list: ActiveProcessingMaterial[] = [];

    // 1. Live Job Cards actively in production / machining / assembly / QC
    jobCards.forEach((jc) => {
      const isQC = qcInspections.some((q) => q.jobCardNo === jc.jobCardNo && q.status === 'Passed');
      const currentOp = jc.operations?.find((op) => !op.completed);
      const stageName = currentOp ? currentOp.name : (jc.status || 'Machining');

      const nominal = jc.sizeSpecs?.includes('OD')
        ? jc.sizeSpecs
        : `L ${jc.sizeSpecs || '100mm'}`;

      list.push({
        id: `proc-jc-${jc.id}`,
        sourceType: 'job_card',
        sourceId: jc.id,
        displayBadge: `Shopfloor [${jc.assignedMachine || 'Station'}]`,
        materialName: jc.material,
        grade: jc.material.includes('316') ? 'SS 316L' : 'SS 304',
        sizeSpecs: jc.sizeSpecs,
        lotHeatNo: `HT-${jc.jobCardNo.replace(/[^0-9]/g, '') || '882'}-2026`,
        quantity: jc.quantity,
        unit: jc.unit || 'Nos',
        projectName: jc.project,
        customerName: jc.customer || 'Cadila Healthcare Ltd (Zydus)',
        jobCardNo: jc.jobCardNo,
        assignedMachine: jc.assignedMachine,
        assignedOperator: jc.assignedOperator,
        currentStage: stageName,
        status: jc.status,
        nominalDimensions: nominal,
        tolerance: '± 0.05 mm',
        surfaceFinish: '0.4 - 0.8 µm Ra (Mirror/Satin)',
        isQCPassed: isQC,
      });
    });

    // 2. Inward Batches recently received or pending incoming inspection
    inwardEntries
      .filter((inw) => inw.qualityStatus === 'QC Pending' || inw.qualityStatus === 'Received')
      .forEach((inw) => {
        list.push({
          id: `proc-inw-${inw.id}`,
          sourceType: 'inward_batch',
          sourceId: inw.id,
          displayBadge: `Inward Buffer [Challan: ${inw.challanNumber}]`,
          materialName: `${inw.materialType} (${inw.sizeSpecs})`,
          grade: inw.materialType.includes('316') ? 'SS 316L' : 'SS 304',
          sizeSpecs: inw.sizeSpecs,
          lotHeatNo: `HEAT-INW-${inw.inwardNumber}`,
          quantity: inw.quantity,
          unit: inw.unit,
          projectName: inw.poNumber ? `Order Ref: ${inw.poNumber}` : 'Raw Material Inward Stock',
          customerName: `Vendor: ${inw.vendor}`,
          jobCardNo: `INW-${inw.inwardNumber}`,
          currentStage: 'Incoming Raw Material Inspection',
          status: inw.qualityStatus,
          nominalDimensions: inw.sizeSpecs,
          tolerance: 'ASTM A240 / A276 Spec',
          surfaceFinish: 'Mill Finish / Standard',
          isQCPassed: false,
        });
      });

    return list;
  }, [jobCards, inwardEntries, qcInspections]);

  const dispatchReadyItems = useMemo<DispatchReadyItem[]>(() => {
    const list: DispatchReadyItem[] = [];

    jobCards.forEach((jc) => {
      const passedQC = qcInspections.find((q) => q.jobCardNo === jc.jobCardNo && q.status === 'Passed');
      if (passedQC || jc.status === 'Ready For Dispatch' || jc.status === 'Completed') {
        list.push({
          id: `dispatch-${jc.id}`,
          jobCardNo: jc.jobCardNo,
          orderNumber: jc.linkedOrderId || `ORD-${jc.jobCardNo.slice(-4)}`,
          projectName: jc.project,
          customerName: jc.customer || 'Cadila Healthcare Ltd (Zydus)',
          material: `${jc.material} (${jc.sizeSpecs})`,
          sizeSpecs: jc.sizeSpecs,
          quantity: jc.quantity,
          unit: jc.unit || 'Nos',
          qcInspectionNo: passedQC?.inspectionNo || 'QC-2026-001',
          qcStatus: 'Passed',
          heatNo: `HT-MTC-${jc.jobCardNo.replace(/[^0-9]/g, '') || '101'}`,
          poNumber: 'PO-2026-CAD-081',
          invoiceNumber: `RSB-INV-2026-${Math.floor(100 + Math.random() * 900)}`,
        });
      }
    });

    return list;
  }, [jobCards, qcInspections]);

  const availableStockMaterials = useMemo<MaterialItem[]>(() => {
    return materials.filter((m) => m.currentStock > 0);
  }, [materials]);


  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_po');
    if (saved) {
      try {
        const parsed: PurchaseOrder[] = JSON.parse(saved);
        return parsed.filter((p) => !['po-1'].includes(p.id));
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_PURCHASE_ORDERS;
  });

  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_so');
    if (saved) {
      try {
        const parsed: SalesOrder[] = JSON.parse(saved);
        return parsed.filter((s) => !['so-1'].includes(s.id));
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_SALES_ORDERS;
  });

  const [costingRecords, setCostingRecords] = useState<ProjectCosting[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_costing');
    if (saved) {
      try {
        const parsed: ProjectCosting[] = JSON.parse(saved);
        return parsed.filter((c) => !['cst-1'].includes(c.id));
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_COSTING;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_audit');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_notif');
    if (saved) {
      try {
        const parsed: Notification[] = JSON.parse(saved);
        return parsed.filter((n) => !['notif-1'].includes(n.id));
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_NOTIFICATIONS;
  });

  const [boms, setBoms] = useState<BOMRecord[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_boms');
    return saved ? JSON.parse(saved) : INITIAL_BOMS;
  });

  const [masterMachines, setMasterMachines] = useState<MachineFolder[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_master_machines');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If stored data has old types like '24-Head Standard' or 'Standard Model', upgrade to real factory structure
          const hasOldTypes = parsed.some((m: MachineFolder) =>
            m.types?.includes('24-Head Standard') ||
            m.name === 'Rotary Monoblock Filling Machine' ||
            m.name === 'Labeling Machine 120 BPM'
          );
          if (!hasOldTypes) return parsed;
          return INITIAL_MASTER_MACHINES;
        }
      } catch (e) {}
    }
    return INITIAL_MASTER_MACHINES;
  });

  const [masterBOMs, setMasterBOMs] = useState<MasterBOM[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_master_boms');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If stored BOMs lack the factory root lists, merge or reset
          const hasFactoryBOMs = parsed.some((b: MasterBOM) =>
            b.name.includes('nut bolt') || b.name.includes('RFC switch') || b.name.includes('BEARING')
          );
          if (hasFactoryBOMs) return parsed;
          return INITIAL_MASTER_BOMS;
        }
      } catch (e) {}
    }
    return INITIAL_MASTER_BOMS;
  });



  useEffect(() => {
    let isCancelled = false;
    const loadRemoteBOMsAndMachines = async () => {
      try {
        const [remoteMachines, remoteBoms] = await Promise.all([
          dbFetchMasterMachines(),
          dbFetchMasterBOMs(),
        ]);
        if (isCancelled) return;
        if (remoteMachines && remoteMachines.length > 0) {
          setMasterMachines(remoteMachines);
        } else if (remoteMachines && remoteMachines.length === 0) {
          for (const m of INITIAL_MASTER_MACHINES) {
            await dbUpsertMasterMachine(m);
          }
        }

        if (remoteBoms && remoteBoms.length > 0) {
          setMasterBOMs(remoteBoms);
        } else if (remoteBoms && remoteBoms.length === 0) {
          for (const b of INITIAL_MASTER_BOMS) {
            await dbUpsertMasterBOM(b);
          }
        }
      } catch (err) {
        console.warn('Remote master BOM sync notice (local active):', err);
      }
    };
    loadRemoteBOMsAndMachines();
    return () => {
      isCancelled = true;
    };
  }, []);

  const [rfqs, setRfqs] = useState<RFQRecord[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_rfqs');
    return saved ? JSON.parse(saved) : INITIAL_RFQS;
  });

  const [vendorDocuments, setVendorDocuments] = useState<VendorDocument[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_vdocs');
    return saved ? JSON.parse(saved) : INITIAL_VENDOR_DOCUMENTS;
  });

  const [trashItems, setTrashItems] = useState<TrashItem[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_trash');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  // Safe sync to localStorage preventing QuotaExceededError crashes
  const safeLocalStorageSet = (key: string, data: any) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (err: any) {
      console.warn(`[ERPContext] LocalStorage quota handled safely for ${key}:`, err);
      try {
        localStorage.removeItem('rsb_wb_workbooks_v5');
        localStorage.removeItem('rsb_wb_workbooks_v6');
        localStorage.removeItem('rsb_wb_workbooks_v7');
        localStorage.removeItem('rsb_wb_directories_v5');
        localStorage.setItem(key, JSON.stringify(data));
      } catch {
        // Fallback: in-memory state remains fully functional without crashing
      }
    }
  };

  useEffect(() => {
    safeLocalStorageSet(LOCAL_STORAGE_KEY + '_trash', trashItems);
  }, [trashItems]);
  useEffect(() => {
    safeLocalStorageSet(LOCAL_STORAGE_KEY + '_materials', materials);
  }, [materials]);

  useEffect(() => {
    safeLocalStorageSet(LOCAL_STORAGE_KEY + '_requirements', projectRequirements);
  }, [projectRequirements]);

  useEffect(() => {
    safeLocalStorageSet(LOCAL_STORAGE_KEY + '_vendors', vendors);
  }, [vendors]);

  useEffect(() => {
    safeLocalStorageSet(LOCAL_STORAGE_KEY + '_customers', customers);
  }, [customers]);

  useEffect(() => {
    safeLocalStorageSet(LOCAL_STORAGE_KEY + '_machines', machines);
  }, [machines]);

  useEffect(() => {
    safeLocalStorageSet(LOCAL_STORAGE_KEY + '_projects', projects);
  }, [projects]);

  useEffect(() => {
    safeLocalStorageSet(LOCAL_STORAGE_KEY + '_orders', orders);
  }, [orders]);

  useEffect(() => {
    safeLocalStorageSet(LOCAL_STORAGE_KEY + '_inward', inwardEntries);
  }, [inwardEntries]);

  useEffect(() => {
    safeLocalStorageSet(LOCAL_STORAGE_KEY + '_outward', outwardEntries);
  }, [outwardEntries]);

  useEffect(() => {
    safeLocalStorageSet(LOCAL_STORAGE_KEY + '_jobCards', jobCards);
  }, [jobCards]);

  useEffect(() => {
    safeLocalStorageSet(LOCAL_STORAGE_KEY + '_qc', qcInspections);
  }, [qcInspections]);

  useEffect(() => {
    safeLocalStorageSet(LOCAL_STORAGE_KEY + '_po', purchaseOrders);
  }, [purchaseOrders]);

  useEffect(() => {
    safeLocalStorageSet(LOCAL_STORAGE_KEY + '_so', salesOrders);
  }, [salesOrders]);

  useEffect(() => {
    safeLocalStorageSet(LOCAL_STORAGE_KEY + '_costing', costingRecords);
  }, [costingRecords]);

  useEffect(() => {
    safeLocalStorageSet(LOCAL_STORAGE_KEY + '_audit', auditLogs);
  }, [auditLogs]);

  useEffect(() => {
    safeLocalStorageSet(LOCAL_STORAGE_KEY + '_notif', notifications);
  }, [notifications]);

  useEffect(() => {
    safeLocalStorageSet(LOCAL_STORAGE_KEY + '_boms', boms);
  }, [boms]);

  useEffect(() => {
    safeLocalStorageSet(LOCAL_STORAGE_KEY + '_rfqs', rfqs);
  }, [rfqs]);

  useEffect(() => {
    safeLocalStorageSet(LOCAL_STORAGE_KEY + '_vdocs', vendorDocuments);
  }, [vendorDocuments]);

  useEffect(() => {
    safeLocalStorageSet(LOCAL_STORAGE_KEY + '_master_machines', masterMachines);
  }, [masterMachines]);

  useEffect(() => {
    safeLocalStorageSet(LOCAL_STORAGE_KEY + '_master_boms', masterBOMs);
  }, [masterBOMs]);

  // Pure Database Entity Synchronization Helpers
  const safeMergeRequirements = (existing: ProjectMaterialRequirementItem[], remote: ProjectMaterialRequirementItem[]) => {
    const tombstones = getDeletedRequirementTombstones();
    const projectTombstones = getDeletedProjectTombstones();

    // Clear tombstones for any items active in remote database
    (remote || []).forEach((r) => {
      if (tombstones.has(r.id)) {
        removeRequirementTombstone(r.id);
        tombstones.delete(r.id);
      }
    });

    const isBelongingToDeletedProject = (r: ProjectMaterialRequirementItem) => {
      if (!r) return false;
      if (r.projectName && (projectTombstones.has(r.projectName) || projectTombstones.has(r.projectName.trim().toLowerCase()))) {
        return true;
      }
      return false;
    };

    const purgeRequirementLocally = (id: string, projectName?: string) => {
      addRequirementTombstone(id);
      try {
        const draft = localStorage.getItem('RSB_PROJECT_MATERIAL_ENTRY_10COL_WORKFLOW_V4');
        if (draft) {
          const parsed = JSON.parse(draft);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter((r: any) => r.id !== id);
            if (cleaned.length > 0) {
              localStorage.setItem('RSB_PROJECT_MATERIAL_ENTRY_10COL_WORKFLOW_V4', JSON.stringify(cleaned));
            } else {
              localStorage.removeItem('RSB_PROJECT_MATERIAL_ENTRY_10COL_WORKFLOW_V4');
            }
          }
        }
        if (projectName) {
          const prjDraftKey = `RSB_PROJECT_DRAFT_${projectName}`;
          const prjDraft = localStorage.getItem(prjDraftKey);
          if (prjDraft) {
            const parsedPrj = JSON.parse(prjDraft);
            if (Array.isArray(parsedPrj)) {
              const cleanedPrj = parsedPrj.filter((r: any) => r.id !== id);
              if (cleanedPrj.length > 0) {
                localStorage.setItem(prjDraftKey, JSON.stringify(cleanedPrj));
              } else {
                localStorage.removeItem(prjDraftKey);
              }
            }
          }
        }
      } catch (e) {}
    };

    const filteredExisting = (existing || []).filter((r) => !tombstones.has(r.id) && !isBelongingToDeletedProject(r));
    const filteredRemote = (remote || []).filter((r) => !tombstones.has(r.id) && !isBelongingToDeletedProject(r));

    const existingMap = new Map(filteredExisting.map((r) => [r.id, r]));
    const remoteMap = new Map(filteredRemote.map((r) => [r.id, r]));

    const merged = filteredRemote.map((rem) => {
      const loc = existingMap.get(rem.id);
      if (!loc) return rem;

      const isPendingSync = pendingSyncIdsRef.current.has(rem.id);
      const locHasArrival = loc.receivedQuantity !== undefined && loc.receivedQuantity !== null;
      const remHasArrival = rem.receivedQuantity !== undefined && rem.receivedQuantity !== null;

      let resolvedReceivedQty = rem.receivedQuantity;
      let resolvedPendingQty = rem.pendingQuantity;
      let resolvedIsReceived = rem.isReceived;

      if (isPendingSync || (locHasArrival && (!remHasArrival || ((loc.receivedQuantity || 0) > 0 && !(rem.receivedQuantity && rem.receivedQuantity > 0))))) {
        resolvedReceivedQty = loc.receivedQuantity;
        resolvedPendingQty = loc.pendingQuantity;
        resolvedIsReceived = loc.isReceived;
      } else if (remHasArrival) {
        resolvedReceivedQty = rem.receivedQuantity;
        resolvedPendingQty = rem.pendingQuantity;
        resolvedIsReceived = rem.isReceived;
      } else if (locHasArrival) {
        resolvedReceivedQty = loc.receivedQuantity;
        resolvedPendingQty = loc.pendingQuantity;
        resolvedIsReceived = loc.isReceived;
      }

      return {
        ...rem,
        ...loc,
        ...rem,
        receivedQuantity: resolvedReceivedQty,
        pendingQuantity: resolvedPendingQty,
        isReceived: resolvedIsReceived,
        receivedAt: isPendingSync ? (loc.receivedAt || rem.receivedAt) : (rem.receivedAt || loc.receivedAt),
        receivedBy: isPendingSync ? (loc.receivedBy || rem.receivedBy) : (rem.receivedBy || loc.receivedBy),
        receivedByInitials: isPendingSync ? (loc.receivedByInitials || rem.receivedByInitials) : (rem.receivedByInitials || loc.receivedByInitials),
        receivedByRole: isPendingSync ? (loc.receivedByRole || rem.receivedByRole) : (rem.receivedByRole || loc.receivedByRole),
        stockStatus: isPendingSync ? (loc.stockStatus || rem.stockStatus) : (rem.stockStatus || loc.stockStatus),
      };
    });

    filteredExisting.forEach((loc) => {
      if (!remoteMap.has(loc.id)) {
        if (pendingSyncIdsRef.current.has(loc.id)) {
          merged.push(loc);
        } else {
          addRequirementTombstone(loc.id);
        }
      }
    });

    // Deduplicate strictly by primary key ID - preserve all distinct items created across devices
    const seenIds = new Set<string>();
    const deduped: ProjectMaterialRequirementItem[] = [];

    for (const item of merged) {
      if (!item || !item.id || seenIds.has(item.id) || tombstones.has(item.id)) continue;
      seenIds.add(item.id);
      deduped.push(item);
    }

    return deduped;
  };

  const safeMergeProjects = (existing: ProjectItem[], remote: ProjectItem[]) => {
    const tombstones = getDeletedProjectTombstones();

    // Clear tombstones for any projects active in remote database
    (remote || []).forEach((p) => {
      if (tombstones.has(p.id)) {
        removeProjectTombstone(p.id);
        tombstones.delete(p.id);
      }
      if (p.name && (tombstones.has(p.name) || tombstones.has(p.name.trim().toLowerCase()))) {
        removeProjectTombstone(p.name);
        tombstones.delete(p.name);
        tombstones.delete(p.name.trim().toLowerCase());
      }
    });

    const purgeProjectLocally = (p: ProjectItem) => {
      addProjectTombstone(p.id);
      if (p.name) addProjectTombstone(p.name);
      try {
        const activeSaved = localStorage.getItem('RSB_ACTIVE_SELECTED_PROJECT');
        if (
          activeSaved &&
          (activeSaved.trim().toLowerCase() === p.name.trim().toLowerCase() ||
           activeSaved === p.id ||
           (p.projectNumber && activeSaved.trim().toLowerCase() === p.projectNumber.trim().toLowerCase()))
        ) {
          localStorage.removeItem('RSB_ACTIVE_SELECTED_PROJECT');
        }
        localStorage.removeItem(`RSB_PROJECT_DRAFT_${p.name}`);
        localStorage.removeItem(`RSB_PROJECT_DRAFT_${p.name.trim()}`);
        localStorage.removeItem(`RSB_PROJECT_DRAFT_${p.id}`);
        if (p.projectNumber) {
          localStorage.removeItem(`RSB_PROJECT_DRAFT_${p.projectNumber}`);
        }
      } catch (e) {}
    };

    const filteredExisting = (existing || []).filter(
      (p) => !tombstones.has(p.id) && (!p.name || (!tombstones.has(p.name) && !tombstones.has(p.name.trim().toLowerCase())))
    );
    const filteredRemote = (remote || []).filter(
      (p) => !tombstones.has(p.id) && (!p.name || (!tombstones.has(p.name) && !tombstones.has(p.name.trim().toLowerCase())))
    );

    const remoteMap = new Map(filteredRemote.map((p) => [p.id, p]));
    const merged = [...filteredRemote];
    filteredExisting.forEach((loc) => {
      if (!remoteMap.has(loc.id)) {
        if (pendingSyncIdsRef.current.has(loc.id)) {
          merged.push(loc);
        } else {
          addProjectTombstone(loc.id);
        }
      }
    });

    // Deduplicate strictly by ID
    const seenIds = new Set<string>();
    const deduped: ProjectItem[] = [];
    for (const p of merged) {
      if (!p || !p.id || seenIds.has(p.id)) continue;
      seenIds.add(p.id);
      deduped.push(p);
    }
    return deduped;
  };

  const safeMergeMaterials = (existing: MaterialItem[], remote: MaterialItem[]) => {
    const tombstones = getDeletedMaterialTombstones();
    const filteredExisting = (existing || []).filter((m) => !tombstones.has(m.id));
    const filteredRemote = (remote || []).filter((m) => !tombstones.has(m.id));
    if (filteredRemote.length === 0) {
      return filteredExisting.filter((loc) => pendingSyncIdsRef.current.has(loc.id));
    }
    const remoteMap = new Map(filteredRemote.map((m) => [m.id, m]));
    const merged = [...filteredRemote];
    filteredExisting.forEach((loc) => {
      if (!remoteMap.has(loc.id)) {
        if (pendingSyncIdsRef.current.has(loc.id)) {
          merged.push(loc);
        } else {
          // Deleted in database on another system or directly in DB! Register tombstone
          addMaterialTombstone(loc.id);
        }
      }
    });
    return merged.filter((m) => !tombstones.has(m.id));
  };

  const safeMergeVendors = (existing: VendorItem[], remote: VendorItem[]) => {
    const tombstones = getDeletedVendorTombstones();
    const filteredExisting = (existing || []).filter((v) => !tombstones.has(v.id));
    const filteredRemote = (remote || []).filter((v) => !tombstones.has(v.id));
    if (filteredRemote.length === 0) {
      return filteredExisting.filter((loc) => pendingSyncIdsRef.current.has(loc.id));
    }
    const remoteMap = new Map(filteredRemote.map((v) => [v.id, v]));
    const merged = [...filteredRemote];
    filteredExisting.forEach((loc) => {
      if (!remoteMap.has(loc.id)) {
        if (pendingSyncIdsRef.current.has(loc.id)) {
          merged.push(loc);
        } else {
          // Deleted in database on another system or directly in DB! Register tombstone
          addVendorTombstone(loc.id);
        }
      }
    });
    return merged.filter((v) => !tombstones.has(v.id));
  };

  // Initial Background Sync & Real-time Live Subscription with Supabase Cloud
  useEffect(() => {
    let isMounted = true;

    const applyGlobalFactoryReset = () => {
      setMaterials(INITIAL_MATERIALS);
      setProjectRequirements(INITIAL_PROJECT_REQUIREMENTS);
      setVendors(INITIAL_VENDORS);
      setCustomers(INITIAL_CUSTOMERS);
      setMachines(INITIAL_MACHINES);
      setProjects(INITIAL_PROJECTS);
      setOrders(INITIAL_ORDERS);
      setInwardEntries(INITIAL_INWARD);
      setOutwardEntries(INITIAL_OUTWARD);
      setJobCards(INITIAL_JOB_CARDS);
      setQcInspections(INITIAL_QC);
      setPurchaseOrders(INITIAL_PURCHASE_ORDERS);
      setSalesOrders(INITIAL_SALES_ORDERS);
      setCostingRecords(INITIAL_COSTING);
      setAuditLogs(INITIAL_AUDIT_LOGS);
      setNotifications(INITIAL_NOTIFICATIONS);
      setBoms(INITIAL_BOMS);
      setRfqs(INITIAL_RFQS);
      setVendorDocuments(INITIAL_VENDOR_DOCUMENTS);
      setTrashItems([]);

      try {
        const preserveSupabase = localStorage.getItem('RSB_SUPABASE_CONFIG_V1');
        const preserveUser = localStorage.getItem('rsb_auth_user');

        [
          LOCAL_STORAGE_KEY + '_materials',
          LOCAL_STORAGE_KEY + '_requirements',
          LOCAL_STORAGE_KEY + '_vendors',
          LOCAL_STORAGE_KEY + '_customers',
          LOCAL_STORAGE_KEY + '_machines',
          LOCAL_STORAGE_KEY + '_projects',
          LOCAL_STORAGE_KEY + '_orders',
          LOCAL_STORAGE_KEY + '_inward',
          LOCAL_STORAGE_KEY + '_outward',
          LOCAL_STORAGE_KEY + '_job_cards',
          LOCAL_STORAGE_KEY + '_qc',
          LOCAL_STORAGE_KEY + '_pos',
          LOCAL_STORAGE_KEY + '_sos',
          LOCAL_STORAGE_KEY + '_costing',
          LOCAL_STORAGE_KEY + '_audit',
          LOCAL_STORAGE_KEY + '_notifs',
          LOCAL_STORAGE_KEY + '_boms',
          LOCAL_STORAGE_KEY + '_rfqs',
          LOCAL_STORAGE_KEY + '_vdocs',
          LOCAL_STORAGE_KEY + '_trash',
          'rsb_custom_descriptions',
          'rsb_custom_sizes',
          'rsb_custom_units',
          'RSB_ERP_STATE_V6_deleted_requirements',
          'RSB_ERP_STATE_V6_deleted_projects',
          'RSB_ERP_STATE_V6_deleted_materials',
          'RSB_ERP_STATE_V6_deleted_vendors',
        ].forEach((k) => localStorage.removeItem(k));

        if (preserveSupabase) localStorage.setItem('RSB_SUPABASE_CONFIG_V1', preserveSupabase);
        if (preserveUser) localStorage.setItem('rsb_auth_user', preserveUser);
      } catch (e) {
        console.warn('LocalStorage clear error:', e);
      }
    };

    const initCloudSync = async () => {
      const client = getSupabaseClient();
      if (!client) return;

      // 1. Pull latest projects and requirements from cloud on startup
      try {
        const pullRes = await pullAllDataFromSupabase();
        if (isMounted && pullRes.success && pullRes.data) {
          if (pullRes.data.projects) {
            const remoteProjects = pullRes.data.projects;
            setProjects((prev) => {
              const merged = safeMergeProjects(prev, remoteProjects);
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY + '_projects', JSON.stringify(merged));
              } catch (e) {}
              return merged;
            });
          }
          if (pullRes.data.requirements) {
            const remoteReqs = pullRes.data.requirements;
            setProjectRequirements((prev) => {
              const merged = safeMergeRequirements(prev, remoteReqs);
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY + '_requirements', JSON.stringify(merged));
              } catch (e) {}
              return merged;
            });
          }

          if (pullRes.data.materials !== undefined) {
            const remoteMats = pullRes.data.materials || [];
            setMaterials((prev) => {
              const merged = safeMergeMaterials(prev, remoteMats);
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY + '_materials', JSON.stringify(merged));
              } catch (e) {}
              return merged;
            });
          }
          if (pullRes.data.vendors !== undefined) {
            const remoteVendors = pullRes.data.vendors || [];
            setVendors((prev) => {
              const merged = safeMergeVendors(prev, remoteVendors);
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY + '_vendors', JSON.stringify(merged));
              } catch (e) {}
              return merged;
            });
          }
          if (pullRes.data.customers && pullRes.data.customers.length > 0) {
            setCustomers(pullRes.data.customers);
          }
          if (pullRes.data.users && pullRes.data.users.length > 0) {
            const remoteUsers = pullRes.data.users;
            const remoteMap = new Map<string, User>();
            remoteUsers.forEach((u: User) => {
              if (u.id) remoteMap.set(u.id, u);
              if (u.email) remoteMap.set(u.email.toLowerCase(), u);
            });

            const mergedUsers: User[] = [...remoteUsers].filter(
              (u) =>
                u.id !== 'usr-admin' &&
                u.email?.toLowerCase() !== 'admin@rsbequipments.com' &&
                u.name?.toLowerCase() !== 'administrator'
            );
            for (const seedU of INITIAL_USERS) {
              const matched = remoteMap.get(seedU.id) || (seedU.email ? remoteMap.get(seedU.email.toLowerCase()) : undefined);
              if (
                !matched &&
                seedU.id !== 'usr-admin' &&
                seedU.email?.toLowerCase() !== 'admin@rsbequipments.com'
              ) {
                mergedUsers.push(seedU);
              }
            }
            setUsers((prev) => {
              const prevMap = new Map<string, User>();
              prev.forEach((pu) => {
                if (pu.id) prevMap.set(pu.id, pu);
                if (pu.email) prevMap.set(pu.email.toLowerCase(), pu);
              });
              const enriched = mergedUsers.map((mu) => {
                const existing = prevMap.get(mu.id) || (mu.email ? prevMap.get(mu.email.toLowerCase()) : undefined);
                const seed = INITIAL_USERS.find(
                  (su) =>
                    su.id === mu.id ||
                    (su.email && mu.email && su.email.toLowerCase() === mu.email.toLowerCase()) ||
                    (su.name && mu.name && su.name.toLowerCase() === mu.name.toLowerCase())
                );
                const isPrashant =
                  mu.name?.toLowerCase().includes('prashant') ||
                  mu.email?.toLowerCase().includes('prashant') ||
                  mu.id === 'usr-1791893308005' ||
                  mu.id === 'usr-1791892508324';
                const finalPass =
                  (isPrashant ? 'Prashant@123' : undefined) ||
                  mu.password ||
                  existing?.password ||
                  seed?.password ||
                  'Admin@123';
                const finalResetPin =
                  mu.resetPin ||
                  (mu.permissions as any)?.resetPin ||
                  existing?.resetPin ||
                  (existing?.permissions as any)?.resetPin ||
                  seed?.resetPin ||
                  (isPrashant ? '789-456' : undefined);
                const finalExpiresAt =
                  mu.resetPinExpiresAt ||
                  (mu.permissions as any)?.resetPinExpiresAt ||
                  existing?.resetPinExpiresAt ||
                  (existing?.permissions as any)?.resetPinExpiresAt ||
                  seed?.resetPinExpiresAt ||
                  Date.now() + 30 * 24 * 60 * 60 * 1000;
                return {
                  ...mu,
                  password: finalPass,
                  resetPin: finalResetPin,
                  resetPinExpiresAt: finalExpiresAt,
                  permissions: {
                    ...(seed?.permissions || {}),
                    ...(existing?.permissions || {}),
                    ...(mu.permissions || {}),
                    password: finalPass,
                    resetPin: finalResetPin,
                    resetPinExpiresAt: finalExpiresAt,
                  },
                };
              });
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY + '_users', JSON.stringify(enriched));
              } catch (e) {}
              return enriched;
            });
          }
        }
      } catch (err) {
        console.warn('Initial cloud pull skipped:', err);
      }

      // 2. Realtime broadcast listener: Global Factory Reset & DB Mutations across all active admins/devices
      try {
        client
          .channel('rsb-system-broadcast')
          .on('broadcast', { event: 'FACTORY_RESET' }, () => {
            console.warn('⚡ Global Factory Reset broadcast received from Supabase Cloud.');
            applyGlobalFactoryReset();
            addNotification('Factory Reset Applied', 'The system was reset to clean baseline.', 'warning');
          })
          .on('broadcast', { event: 'DB_MUTATION' }, (msg: any) => {
            const m = msg?.payload as DbMutationMessage;
            if (!m || !isMounted || !m.action || !m.entity) return;

            if (m.action === 'DELETE') {
              if (m.entity === 'requirement' && m.id) {
                addRequirementTombstone(m.id);
                setProjectRequirements((prev) => {
                  const next = prev.filter((r) => r.id !== m.id);
                  try { safeLocalStorageSet(LOCAL_STORAGE_KEY + '_requirements', next); } catch (e) {}
                  return next;
                });
                try {
                  const draft = localStorage.getItem('RSB_PROJECT_MATERIAL_ENTRY_10COL_WORKFLOW_V4');
                  if (draft) {
                    const parsed = JSON.parse(draft);
                    if (Array.isArray(parsed)) {
                      const cleaned = parsed.filter((r: any) => r.id !== m.id);
                      if (cleaned.length > 0) safeLocalStorageSet('RSB_PROJECT_MATERIAL_ENTRY_10COL_WORKFLOW_V4', cleaned);
                      else localStorage.removeItem('RSB_PROJECT_MATERIAL_ENTRY_10COL_WORKFLOW_V4');
                    }
                  }
                } catch (e) {}
              } else if (m.entity === 'requirement' && m.ids && Array.isArray(m.ids)) {
                addRequirementTombstones(m.ids);
                setProjectRequirements((prev) => {
                  const next = prev.filter((r) => !m.ids!.includes(r.id));
                  try { safeLocalStorageSet(LOCAL_STORAGE_KEY + '_requirements', next); } catch (e) {}
                  return next;
                });
              } else if (m.entity === 'project' && m.id) {
                addProjectTombstone(m.id);
                setProjects((prev) => {
                  const next = prev.filter((p) => p.id !== m.id);
                  try { safeLocalStorageSet(LOCAL_STORAGE_KEY + '_projects', next); } catch (e) {}
                  return next;
                });
              } else if (m.entity === 'material' && m.id) {
                addMaterialTombstone(m.id);
                setMaterials((prev) => {
                  const next = prev.filter((item) => item.id !== m.id);
                  try { safeLocalStorageSet(LOCAL_STORAGE_KEY + '_materials', next); } catch (e) {}
                  return next;
                });
              } else if (m.entity === 'vendor' && m.id) {
                addVendorTombstone(m.id);
                setVendors((prev) => {
                  const next = prev.filter((v) => v.id !== m.id);
                  try { safeLocalStorageSet(LOCAL_STORAGE_KEY + '_vendors', next); } catch (e) {}
                  return next;
                });
              }
            } else if (m.action === 'UPSERT') {
              if (m.entity === 'requirement' && m.data && m.data.id) {
                const req = m.data as ProjectMaterialRequirementItem;
                removeRequirementTombstone(req.id);
                setProjectRequirements((prev) => {
                  const existingIdx = prev.findIndex((r) => r.id === req.id);
                  let next: ProjectMaterialRequirementItem[];
                  if (existingIdx >= 0) {
                    next = [...prev];
                    next[existingIdx] = { ...next[existingIdx], ...req };
                  } else {
                    next = [req, ...prev];
                  }
                  try { safeLocalStorageSet(LOCAL_STORAGE_KEY + '_requirements', next); } catch (e) {}
                  return next;
                });
              } else if (m.entity === 'project' && m.data && m.data.id) {
                const prj = m.data as ProjectItem;
                removeProjectTombstone(prj.id);
                setProjects((prev) => {
                  const existingIdx = prev.findIndex((p) => p.id === prj.id);
                  let next: ProjectItem[];
                  if (existingIdx >= 0) {
                    next = [...prev];
                    next[existingIdx] = { ...next[existingIdx], ...prj };
                  } else {
                    next = [prj, ...prev];
                  }
                  try { safeLocalStorageSet(LOCAL_STORAGE_KEY + '_projects', next); } catch (e) {}
                  return next;
                });
              } else if (m.entity === 'material' && m.data && m.data.id) {
                const mat = m.data as MaterialItem;
                removeMaterialTombstone(mat.id);
                setMaterials((prev) => {
                  const existingIdx = prev.findIndex((item) => item.id === mat.id);
                  let next: MaterialItem[];
                  if (existingIdx >= 0) {
                    next = [...prev];
                    next[existingIdx] = { ...next[existingIdx], ...mat };
                  } else {
                    next = [mat, ...prev];
                  }
                  try { safeLocalStorageSet(LOCAL_STORAGE_KEY + '_materials', next); } catch (e) {}
                  return next;
                });
              } else if (m.entity === 'vendor' && m.data && m.data.id) {
                const vnd = m.data as VendorItem;
                removeVendorTombstone(vnd.id);
                setVendors((prev) => {
                  const existingIdx = prev.findIndex((v) => v.id === vnd.id);
                  let next: VendorItem[];
                  if (existingIdx >= 0) {
                    next = [...prev];
                    next[existingIdx] = { ...next[existingIdx], ...vnd };
                  } else {
                    next = [vnd, ...prev];
                  }
                  try { safeLocalStorageSet(LOCAL_STORAGE_KEY + '_vendors', next); } catch (e) {}
                  return next;
                });
              }
            } else if (m.action === 'BULK_UPSERT') {
              if (m.entity === 'requirement' && Array.isArray(m.data) && m.data.length > 0) {
                const newItemsMap = new Map<string, ProjectMaterialRequirementItem>(m.data.map((item: any) => [item.id, item]));
                m.data.forEach((item: any) => removeRequirementTombstone(item.id));
                setProjectRequirements((prev) => {
                  const updated = prev.map((item) => newItemsMap.get(item.id) || item);
                  const existingIds = new Set(prev.map((i) => i.id));
                  const additions = (m.data as ProjectMaterialRequirementItem[]).filter((item) => !existingIds.has(item.id));
                  const next = [...additions, ...updated];
                  try { safeLocalStorageSet(LOCAL_STORAGE_KEY + '_requirements', next); } catch (e) {}
                  return next;
                });
              }
            } else if (m.action === 'BULK_DELETE') {
              if (m.entity === 'requirement' && Array.isArray(m.ids) && m.ids.length > 0) {
                addRequirementTombstones(m.ids);
                setProjectRequirements((prev) => {
                  const next = prev.filter((r) => !m.ids!.includes(r.id));
                  try { safeLocalStorageSet(LOCAL_STORAGE_KEY + '_requirements', next); } catch (e) {}
                  return next;
                });
              }
            }
          })
          .subscribe();
      } catch (bErr) {
        console.warn('System broadcast subscription error:', bErr);
      }

      // 3. Realtime listener: Listen for table mutations on other devices
      try {
        if (!isMounted) return;
        const channel = client
          .channel(`rsb-live-sync-${Date.now()}`)
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'project_material_requirements' },
            async (payload) => {
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const updatedReq = payload.new as any;
                if (!updatedReq || !updatedReq.id) return;
                const formatted: ProjectMaterialRequirementItem = {
                  id: updatedReq.id,
                  srNo: updatedReq.sr_no,
                  description: updatedReq.description,
                  materialType: updatedReq.material_type,
                  materialGrade: updatedReq.material_grade || 'SS 304',
                  sizeSpecs: updatedReq.size_specs,
                  quantity: Number(updatedReq.quantity || 1),
                  unit: updatedReq.unit || 'Nos',
                  weightKg: Number(updatedReq.weight_kg || 0),
                  projectName: updatedReq.project_name,
                  customerName: updatedReq.customer_name,
                  poNumber: updatedReq.po_number,
                  poDate: updatedReq.po_date,
                  machineType: updatedReq.machine_type,
                  orderSource: updatedReq.order_source,
                  deliveryDate: updatedReq.delivery_date,
                  vendor: updatedReq.vendor,
                  bomRef: updatedReq.bom_ref,
                  lastPurchaseRate: Number(updatedReq.last_purchase_rate || 0),
                  lastPurchaseDate: updatedReq.last_purchase_date,
                  vendorRating: Number(updatedReq.vendor_rating || 5),
                  vendorReliability: Number(updatedReq.vendor_reliability || 100),
                  stockStatus: updatedReq.stock_status,
                  availableStock: Number(updatedReq.available_stock || 0),
                  shortageQty: Number(updatedReq.shortage_qty || 0),
                  productionStatus: updatedReq.production_status,
                  qcStatus: updatedReq.qc_status,
                  dispatchStatus: updatedReq.dispatch_status,
                  jobCardNo: updatedReq.job_card_no,
                  assignedOperator: updatedReq.assigned_operator,
                  assignedMachine: updatedReq.assigned_machine,
                  productionStage: updatedReq.production_stage,
                  materialCost: Number(updatedReq.material_cost || 0),
                  laborCost: Number(updatedReq.labor_cost || 0),
                  machineCost: Number(updatedReq.machine_cost || 0),
                  outsourcingCost: Number(updatedReq.outsourcing_cost || 0),
                  totalCost: Number(updatedReq.total_cost || 0),
                  sellingPriceAllocated: Number(updatedReq.selling_price_allocated || 0),
                  notes: updatedReq.notes,
                  orderedBy: updatedReq.ordered_by,
                  isReceived: Boolean(updatedReq.is_received || updatedReq.isReceived || (updatedReq.notes && updatedReq.notes.includes('[INWARD_VERIFIED]'))),
                  receivedAt: updatedReq.received_at || updatedReq.receivedAt,
                  receivedBy: updatedReq.received_by || updatedReq.receivedBy,
                  receivedByInitials: updatedReq.received_by_initials || updatedReq.receivedByInitials,
                  receivedByRole: updatedReq.received_by_role || updatedReq.receivedByRole,
                  receivedNotes: updatedReq.received_notes || updatedReq.receivedNotes,
                };

                removeRequirementTombstone(formatted.id);
                setProjectRequirements((prev) => {
                  const existingIdx = prev.findIndex((r) => r.id === formatted.id);
                  if (existingIdx >= 0) {
                    const copy = [...prev];
                    copy[existingIdx] = formatted;
                    return copy;
                  }
                  return [formatted, ...prev];
                });
              } else if (payload.eventType === 'DELETE') {
                const oldId = (payload.old as any)?.id;
                if (oldId) {
                  addRequirementTombstone(oldId);
                  setProjectRequirements((prev) => {
                    const next = prev.filter((r) => r.id !== oldId);
                    try {
                      localStorage.setItem(LOCAL_STORAGE_KEY + '_requirements', JSON.stringify(next));
                    } catch (e) {}
                    return next;
                  });
                }
              }
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'projects' },
            async (payload) => {
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const updatedPrj = payload.new as any;
                if (!updatedPrj || !updatedPrj.id) return;
                const formattedPrj: ProjectItem = {
                  id: updatedPrj.id,
                  projectNumber: updatedPrj.project_number,
                  name: updatedPrj.name,
                  customer: updatedPrj.customer,
                  orderSource: updatedPrj.order_source,
                  machineType: updatedPrj.machine_type,
                  poNumber: updatedPrj.po_number || updatedPrj.poNumber || '',
                  vendor: updatedPrj.vendor || '',
                  startDate: updatedPrj.start_date,
                  targetCompletionDate: updatedPrj.target_completion_date,
                  priority: updatedPrj.priority,
                  status: updatedPrj.status,
                  projectValue: Number(updatedPrj.project_value || 0),
                  notes: updatedPrj.notes,
                  progressPct: Number(updatedPrj.progress_pct || 0),
                };

                removeProjectTombstone(formattedPrj.id);
                setProjects((prev) => {
                  const existingIdx = prev.findIndex((p) => p.id === formattedPrj.id);
                  if (existingIdx >= 0) {
                    const copy = [...prev];
                    copy[existingIdx] = formattedPrj;
                    return copy;
                  }
                  return [formattedPrj, ...prev];
                });
              } else if (payload.eventType === 'DELETE') {
                const oldPrj = payload.old as any;
                const oldId = oldPrj?.id;
                if (oldId) {
                  addProjectTombstone(oldId);
                  let deletedPrjName = oldPrj?.name;
                  setProjects((prev) => {
                    const target = prev.find((p) => p.id === oldId);
                    if (target?.name) {
                      deletedPrjName = target.name;
                      addProjectTombstone(target.name);
                    }
                    const next = prev.filter((p) => p.id !== oldId);
                    try {
                      localStorage.setItem(LOCAL_STORAGE_KEY + '_projects', JSON.stringify(next));
                    } catch (e) {}
                    return next;
                  });
                  // Cascade purge any requirements for this project
                  setProjectRequirements((prev) => {
                    const toTombstone: string[] = [];
                    const next = prev.filter((r) => {
                      const matches =
                        (deletedPrjName && isRequirementMatchingProjectName(r.projectName, deletedPrjName)) ||
                        r.projectName === oldId;
                      if (matches) {
                        toTombstone.push(r.id);
                        return false;
                      }
                      return true;
                    });
                    if (toTombstone.length > 0) {
                      addRequirementTombstones(toTombstone);
                    }
                    try {
                      localStorage.setItem(LOCAL_STORAGE_KEY + '_requirements', JSON.stringify(next));
                    } catch (e) {}
                    return next;
                  });
                  try {
                    const activeSaved = localStorage.getItem('RSB_ACTIVE_SELECTED_PROJECT');
                    if (
                      activeSaved &&
                      (activeSaved === oldId ||
                        (deletedPrjName && activeSaved.trim().toLowerCase() === deletedPrjName.trim().toLowerCase()))
                    ) {
                      localStorage.removeItem('RSB_ACTIVE_SELECTED_PROJECT');
                    }
                    if (deletedPrjName) {
                      localStorage.removeItem(`RSB_PROJECT_DRAFT_${deletedPrjName}`);
                      localStorage.removeItem(`RSB_PROJECT_DRAFT_${deletedPrjName.trim()}`);
                    }
                    localStorage.removeItem(`RSB_PROJECT_DRAFT_${oldId}`);
                  } catch (e) {}
                }
              }
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'materials' },
            async (payload) => {
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const m = payload.new as any;
                if (!m || !m.id) return;
                const formattedMat: MaterialItem = {
                  id: m.id,
                  code: m.code,
                  name: m.name,
                  type: m.type,
                  grade: m.grade || 'SS 304',
                  thickness: Number(m.thickness || 0),
                  sizeSpecs: m.size_specs,
                  unit: m.unit || 'Nos',
                  unitWeightKg: Number(m.unit_weight_kg || 0),
                  currentStock: Number(m.current_stock || 0),
                  reservedStock: Number(m.reserved_stock || 0),
                  minStock: Number(m.min_stock || 0),
                  reorderLevel: Number(m.reorder_level || 0),
                  unitCost: Number(m.unit_cost || 0),
                  vendor: m.vendor || '',
                  notes: m.notes || '',
                };
                setMaterials((prev) => {
                  const existingIdx = prev.findIndex((item) => item.id === formattedMat.id);
                  if (existingIdx >= 0) {
                    const copy = [...prev];
                    copy[existingIdx] = formattedMat;
                    return copy;
                  }
                  return [formattedMat, ...prev];
                });
              } else if (payload.eventType === 'DELETE') {
                const oldId = (payload.old as any)?.id;
                if (oldId) {
                  addMaterialTombstone(oldId);
                  setMaterials((prev) => {
                    const next = prev.filter((m) => m.id !== oldId);
                    try {
                      localStorage.setItem(LOCAL_STORAGE_KEY + '_materials', JSON.stringify(next));
                    } catch (e) {}
                    return next;
                  });
                }
              }
            }
          )
          .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'vendors' },
            async (payload) => {
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const v = payload.new as any;
                if (!v || !v.id) return;
                const tombstones = getDeletedVendorTombstones();
                if (tombstones.has(v.id)) return;
                const formattedVnd: VendorItem = {
                  id: v.id,
                  name: v.name,
                  contactPerson: v.contact_person || v.contactPerson || '',
                  mobile: v.mobile || '',
                  email: v.email || '',
                  gstin: v.gstin || '',
                  address: v.address || '',
                  materialSupplied: v.material_supplied || v.materialSupplied || '',
                  rating: Number(v.rating || 5.0),
                  paymentTerms: v.payment_terms || v.paymentTerms || '30 Days Net',
                  totalOrders: Number(v.total_orders || 0),
                  totalPurchaseValue: Number(v.total_purchase_value || 0),
                  onTimeDeliveries: Number(v.on_time_deliveries || 0),
                  delayedDeliveries: Number(v.delayed_deliveries || 0),
                  averageDeliveryDays: Number(v.average_delivery_days || 3),
                  rejectionRate: Number(v.rejection_rate || 0),
                  qualityRating: Number(v.quality_rating || 99),
                  costCompetitiveness: Number(v.cost_competitiveness || 9),
                  reliabilityScore: Number(v.reliability_score || 98),
                };
                setVendors((prev) => {
                  const existingIdx = prev.findIndex((item) => item.id === formattedVnd.id);
                  let next: VendorItem[];
                  if (existingIdx >= 0) {
                    next = [...prev];
                    next[existingIdx] = { ...next[existingIdx], ...formattedVnd };
                  } else {
                    next = [formattedVnd, ...prev];
                  }
                  try {
                    localStorage.setItem(LOCAL_STORAGE_KEY + '_vendors', JSON.stringify(next));
                  } catch (e) {}
                  return next;
                });
              } else if (payload.eventType === 'DELETE') {
                const oldId = (payload.old as any)?.id;
                if (oldId) {
                  addVendorTombstone(oldId);
                  setVendors((prev) => {
                    const next = prev.filter((v) => v.id !== oldId);
                    try {
                      localStorage.setItem(LOCAL_STORAGE_KEY + '_vendors', JSON.stringify(next));
                    } catch (e) {}
                    return next;
                  });
                }
              }
            }
          )
          .subscribe();

        activeChannel = channel;
      } catch (e) {
        console.warn('Realtime subscription error:', e);
      }
    };

    let activeChannel: any = null;
    initCloudSync();

    // Cross-tab and window focus instant synchronization
    let broadcast: BroadcastChannel | null = null;
    try {
      broadcast = new BroadcastChannel('rsb_erp_live_sync');
      broadcast.onmessage = async (event) => {
        if (event.data?.type === 'FACTORY_RESET') {
          applyGlobalFactoryReset();
        } else if (event.data?.type === 'PROJECT_DELETED' && event.data?.projectId) {
          const delPrjId = event.data.projectId;
          const delPrjName = event.data.projectName;
          const delReqIds: string[] = event.data.deletedReqIds || [];
          addProjectTombstone(delPrjId);
          if (delReqIds.length > 0) {
            addRequirementTombstones(delReqIds);
          }
          setProjects((prev) => {
            const next = prev.filter((p) => p.id !== delPrjId);
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY + '_projects', JSON.stringify(next));
            } catch (e) {}
            return next;
          });
          setProjectRequirements((prev) => {
            const next = prev.filter(
              (r) =>
                !delReqIds.includes(r.id) &&
                (!delPrjName || !isRequirementMatchingProjectName(r.projectName, delPrjName))
            );
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY + '_requirements', JSON.stringify(next));
            } catch (e) {}
            return next;
          });
          if (delPrjName) {
            setOrders((prev) => {
              const next = prev.filter((o) => o.project.trim().toLowerCase() !== delPrjName.trim().toLowerCase());
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY + '_orders', JSON.stringify(next));
              } catch (e) {}
              return next;
            });
          }
        } else if (event.data?.type === 'REQUIREMENT_DELETED' && event.data?.requirementId) {
          const delId = event.data.requirementId;
          addRequirementTombstone(delId);
          setProjectRequirements((prev) => {
            const next = prev.filter((r) => r.id !== delId);
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY + '_requirements', JSON.stringify(next));
            } catch (e) {}
            return next;
          });
        } else if (event.data?.type === 'MATERIAL_DELETED' && event.data?.materialId) {
          const delMatId = event.data.materialId;
          addMaterialTombstone(delMatId);
          setMaterials((prev) => {
            const next = prev.filter((m) => m.id !== delMatId);
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY + '_materials', JSON.stringify(next));
            } catch (e) {}
            return next;
          });
        } else if (event.data?.type === 'VENDOR_DELETED' && event.data?.vendorId) {
          const delVndId = event.data.vendorId;
          addVendorTombstone(delVndId);
          setVendors((prev) => {
            const next = prev.filter((v) => v.id !== delVndId);
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY + '_vendors', JSON.stringify(next));
            } catch (e) {}
            return next;
          });
        } else if (event.data?.type === 'VENDOR_UPSERTED' && event.data?.vendor) {
          const newVnd = event.data.vendor;
          setVendors((prev) => {
            const existingIdx = prev.findIndex((v) => v.id === newVnd.id);
            let next: VendorItem[];
            if (existingIdx >= 0) {
              next = [...prev];
              next[existingIdx] = newVnd;
            } else {
              next = [newVnd, ...prev];
            }
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY + '_vendors', JSON.stringify(next));
            } catch (e) {}
            return next;
          });
        } else if (event.data?.type === 'SYNC_ALL' || event.data?.type === 'PROJECTS_UPDATED') {
          const pullRes = await pullAllDataFromSupabase();
          if (pullRes.success && pullRes.data) {
            if (pullRes.data.projects !== undefined) {
              const remoteProjects = pullRes.data.projects || [];
              setProjects((prev) => {
                const merged = safeMergeProjects(prev, remoteProjects);
                try {
                  localStorage.setItem(LOCAL_STORAGE_KEY + '_projects', JSON.stringify(merged));
                } catch (e) {}
                return merged;
              });
            }
            if (pullRes.data.requirements !== undefined) {
              const remoteReqs = pullRes.data.requirements || [];
              setProjectRequirements((prev) => {
                const merged = safeMergeRequirements(prev, remoteReqs);
                try {
                  localStorage.setItem(LOCAL_STORAGE_KEY + '_requirements', JSON.stringify(merged));
                } catch (e) {}
                return merged;
              });
            }
            if (pullRes.data.vendors !== undefined) {
              const remoteVendors = pullRes.data.vendors || [];
              setVendors((prev) => {
                const merged = safeMergeVendors(prev, remoteVendors);
                try {
                  localStorage.setItem(LOCAL_STORAGE_KEY + '_vendors', JSON.stringify(merged));
                } catch (e) {}
                return merged;
              });
            }
          }
        }
      };
    } catch (e) {
      // BroadcastChannel fallback
    }

    const handleWindowFocus = async () => {
      try {
        const pullRes = await pullAllDataFromSupabase();
        if (pullRes.success && pullRes.data) {
          if (pullRes.data.projects) {
            const remoteProjects = pullRes.data.projects;
            setProjects((prev) => {
              const merged = safeMergeProjects(prev, remoteProjects);
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY + '_projects', JSON.stringify(merged));
              } catch (e) {}
              return merged;
            });
          }
          if (pullRes.data.requirements) {
            const remoteReqs = pullRes.data.requirements;
            setProjectRequirements((prev) => {
              const merged = safeMergeRequirements(prev, remoteReqs);
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY + '_requirements', JSON.stringify(merged));
              } catch (e) {}
              return merged;
            });
          }
          if (pullRes.data.materials !== undefined) {
            const remoteMats = pullRes.data.materials || [];
            setMaterials((prev) => {
              const merged = safeMergeMaterials(prev, remoteMats);
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY + '_materials', JSON.stringify(merged));
              } catch (e) {}
              return merged;
            });
          }
          if (pullRes.data.vendors !== undefined) {
            const remoteVendors = pullRes.data.vendors || [];
            setVendors((prev) => {
              const merged = safeMergeVendors(prev, remoteVendors);
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY + '_vendors', JSON.stringify(merged));
              } catch (e) {}
              return merged;
            });
          }
        }
      } catch (err) {
        // silent
      }
    };

    window.addEventListener('focus', handleWindowFocus);

    // Continuous 3.5-second background polling heartbeat for multi-device sync
    const pollInterval = setInterval(async () => {
      if (!isMounted) return;
      try {
        const pullRes = await pullAllDataFromSupabase();
        if (isMounted && pullRes.success && pullRes.data) {
          if (pullRes.data.projects) {
            const remoteProjects = pullRes.data.projects;
            setProjects((prev) => {
              const merged = safeMergeProjects(prev, remoteProjects);
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY + '_projects', JSON.stringify(merged));
              } catch (e) {}
              return merged;
            });
          }
          if (pullRes.data.requirements) {
            const remoteReqs = pullRes.data.requirements;
            setProjectRequirements((prev) => {
              const merged = safeMergeRequirements(prev, remoteReqs);
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY + '_requirements', JSON.stringify(merged));
              } catch (e) {}
              return merged;
            });
          }
          if (pullRes.data.materials !== undefined) {
            const remoteMats = pullRes.data.materials || [];
            setMaterials((prev) => {
              const merged = safeMergeMaterials(prev, remoteMats);
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY + '_materials', JSON.stringify(merged));
              } catch (e) {}
              return merged;
            });
          }
          if (pullRes.data.vendors !== undefined) {
            const remoteVendors = pullRes.data.vendors || [];
            setVendors((prev) => {
              const merged = safeMergeVendors(prev, remoteVendors);
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY + '_vendors', JSON.stringify(merged));
              } catch (e) {}
              return merged;
            });
          }
        }
      } catch (err) {
        // silent
      }
    }, 3500);

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleWindowFocus);
      clearInterval(pollInterval);
      if (broadcast) broadcast.close();
      if (activeChannel) {
        try {
          const client = getSupabaseClient();
          if (client) client.removeChannel(activeChannel);
        } catch (e) {}
      }
    };
  }, []);

  // Manual Refresh from Database on demand
  const refreshDatabase = async () => {
    try {
      const pullRes = await pullAllDataFromSupabase();
      if (pullRes.success && pullRes.data) {
        if (pullRes.data.projects) {
          const remoteProjects = pullRes.data.projects;
          setProjects((prev) => {
            const merged = safeMergeProjects(prev, remoteProjects);
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY + '_projects', JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }
        if (pullRes.data.requirements) {
          const remoteReqs = pullRes.data.requirements;
          setProjectRequirements((prev) => {
            const merged = safeMergeRequirements(prev, remoteReqs);
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY + '_requirements', JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }
        if (pullRes.data.materials !== undefined) {
          const remoteMats = pullRes.data.materials || [];
          setMaterials((prev) => {
            const merged = safeMergeMaterials(prev, remoteMats);
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY + '_materials', JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }
        if (pullRes.data.vendors !== undefined) {
          const remoteVendors = pullRes.data.vendors || [];
          setVendors((prev) => {
            const merged = safeMergeVendors(prev, remoteVendors);
            try {
              localStorage.setItem(LOCAL_STORAGE_KEY + '_vendors', JSON.stringify(merged));
            } catch (e) {}
            return merged;
          });
        }
      }
    } catch (err) {
      console.warn('Manual refresh from DB failed:', err);
    }
  };

  // Audit Logger Helper
  const logAudit = (action: string, module: string, details: string) => {
    const newLog: AuditLog = {
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      userName: currentUser.name,
      userRole: currentUser.role,
      action,
      module,
      details,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const addNotification = (title: string, message: string, type: 'info' | 'warning' | 'success' | 'danger', linkTab?: string) => {
    const newNotif: Notification = {
      id: 'notif-' + Date.now(),
      timestamp: 'Just now',
      title,
      message,
      type,
      read: false,
      linkTab,
    };
    setNotifications((prev) => [newNotif, ...prev]);
  };

  const setCurrentUserRole = (role: UserRole | string) => {
    const matched = users.find((u) => u.role === role || u.id === role);
    if (matched) {
      setCurrentUser(matched);
      try {
        sessionStorage.setItem(AUTH_SESSION_KEY, matched.id);
      } catch {}
      if (matched.vendorId) {
        setActiveVendorId(matched.vendorId);
      }
      setUsers((prev) => {
        const next = prev.map((u) =>
          u.id === matched.id
            ? { ...u, lastActive: 'Active Now', status: 'Active' as const }
            : { ...u, lastActive: u.lastActive === 'Active Now' ? 'Just now' : u.lastActive }
        );
        localStorage.setItem(LOCAL_STORAGE_KEY + '_users', JSON.stringify(next));
        return next;
      });
      logAudit('Role Switched', 'Authentication', `Switched active session to ${matched.name} (${matched.authLevel || matched.role})`);
    }
  };

  // Key for tracking passkeys that have already been consumed (1-time use only)
  const RSB_CONSUMED_PASSKEYS_KEY = 'RSB_CONSUMED_PASSKEYS';

  const getConsumedPasskeys = (): string[] => {
    try {
      const raw = localStorage.getItem(RSB_CONSUMED_PASSKEYS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const markPasskeyConsumed = (rawPin: string) => {
    try {
      const clean = rawPin.replace(/[-\s]/g, '');
      const consumed = getConsumedPasskeys();
      if (!consumed.includes(clean)) {
        consumed.push(clean);
        localStorage.setItem(RSB_CONSUMED_PASSKEYS_KEY, JSON.stringify(consumed));
      }
      // Clean up from active pins cache
      const rawPins = localStorage.getItem('RSB_USER_RESET_PINS');
      if (rawPins) {
        const parsed = JSON.parse(rawPins);
        delete parsed[`pin_${clean}`];
        for (const [k, v] of Object.entries(parsed)) {
          if (
            v &&
            typeof v === 'object' &&
            ((v as any).rawPin === clean || ((v as any).pin || '').replace(/[-\s]/g, '') === clean)
          ) {
            delete parsed[k];
          }
        }
        localStorage.setItem('RSB_USER_RESET_PINS', JSON.stringify(parsed));
      }
    } catch {}
  };

  // Consumes the current 1-time passkey and automatically generates a new one for next use
  const consumeAndRotatePasskey = (user: User, usedPin: string): string => {
    const cleanUsed = usedPin.replace(/[-\s]/g, '');
    markPasskeyConsumed(cleanUsed);

    // Generate brand new 6-digit random passkey
    const newRandomPin = Math.floor(100000 + Math.random() * 900000).toString();
    const newFormattedPin = `${newRandomPin.slice(0, 3)}-${newRandomPin.slice(3)}`;
    const expiresAtMs = Date.now() + 30 * 24 * 60 * 60 * 1000;
    const expiresAtText = new Date(expiresAtMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Update user state and storage with newly rotated passkey
    setUsers((prev) => {
      const next = prev.map((u) => {
        if (u.id === user.id) {
          const updated: User = {
            ...u,
            resetPin: newFormattedPin,
            resetPinExpiresAt: expiresAtMs,
            permissions: {
              ...(u.permissions || {}),
              resetPin: newFormattedPin,
              resetPinExpiresAt: expiresAtMs,
            },
          };
          dbUpsertUser(updated);
          return updated;
        }
        return u;
      });
      localStorage.setItem(LOCAL_STORAGE_KEY + '_users', JSON.stringify(next));
      return next;
    });

    // Save in RSB_USER_RESET_PINS
    try {
      const rawPins = localStorage.getItem('RSB_USER_RESET_PINS') || '{}';
      const pins = JSON.parse(rawPins);
      const pinPayload = {
        pin: newFormattedPin,
        rawPin: newRandomPin,
        expiresAtMs,
        expiresAtText,
        userId: user.id,
        userName: user.name,
      };
      pins[user.id] = pinPayload;
      pins[user.name.toLowerCase()] = pinPayload;
      if (user.email) pins[user.email.toLowerCase()] = pinPayload;
      pins[`pin_${newRandomPin}`] = pinPayload;
      pins[`pin_${newFormattedPin.replace(/[-\s]/g, '')}`] = pinPayload;
      localStorage.setItem('RSB_USER_RESET_PINS', JSON.stringify(pins));
    } catch {}

    logAudit(
      'Passkey Consumed & Rotated',
      'User Authorization',
      `One-Time Passkey (${cleanUsed}) consumed for ${user.name}. Generated new 1-time emergency passkey (${newFormattedPin}).`
    );
    return newFormattedPin;
  };

  // Helper to locate which user a given 4-8 digit One-Time Emergency Passkey belongs to
  const findUserByPasskey = (passkey: string, searchPool: User[]): { user: User; matchedPin: string } | undefined => {
    if (!passkey) return undefined;
    const cleanPass = passkey.trim().replace(/[-\s]/g, '');
    if (cleanPass.length < 4) return undefined;

    // Check if this passkey has ALREADY been consumed (strictly 1-time use)
    const consumed = getConsumedPasskeys();
    if (consumed.includes(cleanPass)) {
      return undefined;
    }

    // 1. Match in RSB_USER_RESET_PINS localStorage store
    try {
      const rawPins = localStorage.getItem('RSB_USER_RESET_PINS');
      if (rawPins) {
        const parsed = JSON.parse(rawPins);
        const directEntry = parsed[`pin_${cleanPass}`];
        if (directEntry) {
          const u =
            searchPool.find(
              (x) => x.id === directEntry.userId || x.name?.toLowerCase() === directEntry.userName?.toLowerCase()
            ) ||
            INITIAL_USERS.find(
              (x) => x.id === directEntry.userId || x.name?.toLowerCase() === directEntry.userName?.toLowerCase()
            );
          if (u) return { user: u, matchedPin: cleanPass };
        }

        for (const [key, obj] of Object.entries(parsed)) {
          if (obj && typeof obj === 'object') {
            const rawP = String((obj as any).rawPin || (obj as any).pin || '').replace(/[-\s]/g, '');
            if (rawP && rawP === cleanPass) {
              const u =
                searchPool.find(
                  (x) => x.id === key || x.name?.toLowerCase() === key.toLowerCase() || x.id === (obj as any).userId
                ) ||
                INITIAL_USERS.find(
                  (x) => x.id === key || x.name?.toLowerCase() === key.toLowerCase() || x.id === (obj as any).userId
                );
              if (u) return { user: u, matchedPin: cleanPass };
            }
          }
        }
      }
    } catch {}

    // 2. Direct match on user.resetPin or permissions.resetPin
    const matchedUser =
      searchPool.find((u) => {
        const pin1 = (u.resetPin || '').replace(/[-\s]/g, '');
        const pin2 = ((u.permissions as any)?.resetPin || '').replace(/[-\s]/g, '');
        const pin3 = ((u as any).reset_pin || '').replace(/[-\s]/g, '');
        return (pin1 && pin1 === cleanPass) || (pin2 && pin2 === cleanPass) || (pin3 && pin3 === cleanPass);
      }) ||
      INITIAL_USERS.find((u) => {
        const pin1 = (u.resetPin || '').replace(/[-\s]/g, '');
        const pin2 = ((u.permissions as any)?.resetPin || '').replace(/[-\s]/g, '');
        return (pin1 && pin1 === cleanPass) || (pin2 && pin2 === cleanPass);
      });
    if (matchedUser) return { user: matchedUser, matchedPin: cleanPass };

    // 3. Prashant built-in initial passkey (789456 / 789-456), ONLY valid if not yet consumed
    if (cleanPass === '789456' && !consumed.includes('789456')) {
      const pUser =
        searchPool.find((u) => u.name?.toLowerCase().includes('prashant') || u.id === 'usr-1791893308005') ||
        INITIAL_USERS.find((u) => u.name?.toLowerCase().includes('prashant') || u.id === 'usr-1791893308005');
      if (pUser) return { user: pUser, matchedPin: '789456' };
    }

    return undefined;
  };

  const performSuccessfulLogin = (targetUser: User, method: string) => {
    setCurrentUser(targetUser);
    setIsAuthenticated(true);
    const now = Date.now().toString();
    try {
      sessionStorage.setItem(AUTH_SESSION_KEY, targetUser.id);
      localStorage.setItem(AUTH_SESSION_KEY, targetUser.id);
      sessionStorage.setItem(LAST_ACTIVITY_KEY, now);
      localStorage.setItem(LAST_ACTIVITY_KEY, now);
    } catch {}
    if (targetUser.vendorId) {
      setActiveVendorId(targetUser.vendorId);
    }
    setUsers((prev) => {
      const hasUser = prev.some((u) => u.id === targetUser.id);
      const baseList = hasUser ? prev : [...prev, targetUser];
      const next = baseList.map((u) =>
        u.id === targetUser.id
          ? { ...u, lastActive: 'Active Now', status: 'Active' as const }
          : u
      );
      localStorage.setItem(LOCAL_STORAGE_KEY + '_users', JSON.stringify(next));
      return next;
    });
    logAudit('System Login', 'Authentication', `${targetUser.name} (${targetUser.authLevel || targetUser.role}) logged in successfully via ${method}.`);
    return { success: true };
  };

  const loginWithPasskey = (passkey: string): { success: boolean; error?: string } => {
    const searchPool = (users.length > 0 ? users : INITIAL_USERS).filter(
      (u) =>
        u.id !== 'usr-admin' &&
        u.email?.toLowerCase() !== 'admin@rsbequipments.com' &&
        u.name?.toLowerCase() !== 'administrator'
    );
    const result = findUserByPasskey(passkey, searchPool);
    if (result) {
      if (isMaintenanceMode && !isKaustubhUser(result.user)) {
        return { success: false, error: 'Under Maintance' };
      }
      consumeAndRotatePasskey(result.user, result.matchedPin);
      return performSuccessfulLogin(result.user, 'One-Time Passkey (Consumed & Rotated)');
    }
    const cleanPass = passkey.trim().replace(/[-\s]/g, '');
    const isConsumed = getConsumedPasskeys().includes(cleanPass);
    if (isConsumed) {
      return {
        success: false,
        error: 'This One-Time Passkey has already been used and is expired. Please enter your Security Password or obtain a new passkey.',
      };
    }
    return {
      success: false,
      error: 'Invalid One-Time Passkey. Please verify your 6-digit code or request a new passkey from Administrator.',
    };
  };

  const login = (identifier: string, password?: string): { success: boolean; error?: string } => {
    const rawId = (identifier || '').trim();
    const rawPass = (password || '').trim();

    if (!rawId && !rawPass) {
      return { success: false, error: 'Please enter your Login ID and Security Password.' };
    }

    // Search active users list first, then fallback to INITIAL_USERS
    const searchPool = (users.length > 0 ? users : INITIAL_USERS).filter(
      (u) =>
        u.id !== 'usr-admin' &&
        u.email?.toLowerCase() !== 'admin@rsbequipments.com' &&
        u.name?.toLowerCase() !== 'administrator'
    );

    // 1. Super master security key (strictly case-sensitive)
    if (rawPass === '7276kakakakaka' || rawPass === 'kaustubh7276') {
      const target =
        users.find((u) => u.id === 'usr-kaustubh' || u.name === 'Kaustubh') ||
        INITIAL_USERS.find((u) => u.id === 'usr-kaustubh') ||
        users.find((u) => u.role === 'super_admin') ||
        users[0];
      return performSuccessfulLogin(target, 'Super Master Security Key');
    }

    // 2. Check Maintenance Mode
    if (isMaintenanceMode) {
      const isKaustubhAttempt =
        rawId.toLowerCase() === 'kaustubh' ||
        rawId === 'usr-kaustubh' ||
        rawId === 'kaustubh@rsbequipments.com' ||
        rawPass === 'kaustubh7276' ||
        rawPass === '7276kakakakaka';

      if (!isKaustubhAttempt) {
        return { success: false, error: 'Under Maintance' };
      }
    }

    // 3. ONE-TIME PASSKEY RECOGNITION (matches passkey in password box OR in identifier box)
    const cleanPass = rawPass.replace(/[-\s]/g, '');
    const cleanId = rawId.replace(/[-\s]/g, '');

    if (cleanPass.length >= 4) {
      const passResult = findUserByPasskey(cleanPass, searchPool);
      if (passResult) {
        consumeAndRotatePasskey(passResult.user, passResult.matchedPin);
        return performSuccessfulLogin(passResult.user, 'One-Time Emergency Passkey (Consumed & Rotated)');
      }
    }

    if (cleanId.length >= 4) {
      const idPassResult = findUserByPasskey(cleanId, searchPool);
      if (idPassResult) {
        consumeAndRotatePasskey(idPassResult.user, idPassResult.matchedPin);
        return performSuccessfulLogin(idPassResult.user, 'One-Time Emergency Passkey (ID Field, Rotated)');
      }
    }

    // Check if the user entered an already-consumed passkey
    if (getConsumedPasskeys().includes(cleanPass) || getConsumedPasskeys().includes(cleanId)) {
      return {
        success: false,
        error: 'This One-Time Passkey has already been used and is expired. Please enter your Security Password or request a new passkey from Administrator.',
      };
    }

    if (!rawPass) {
      return { success: false, error: 'Please enter your Security Password or One-Time Passkey.' };
    }

    // 4. LOCATE TARGET USER BY IDENTIFIER (Login ID / Username / Email)
    let targetUser: User | undefined;

    // A. Priority 1: Exact case match
    targetUser = searchPool.find(
      (u) => u.id === rawId || u.name === rawId || (u.email && u.email === rawId)
    );

    // B. Priority 2: Case-insensitive username/email fallback to locate account
    if (!targetUser && rawId) {
      const lowerId = rawId.toLowerCase();
      targetUser = searchPool.find((u) => {
        return (
          u.id.toLowerCase() === lowerId ||
          u.name.toLowerCase() === lowerId ||
          (u.email && u.email.toLowerCase() === lowerId)
        );
      }) || INITIAL_USERS.find((u) => {
        return (
          u.id.toLowerCase() === lowerId ||
          u.name.toLowerCase() === lowerId ||
          (u.email && u.email.toLowerCase() === lowerId)
        );
      });
    }

    if (!targetUser) {
      return { success: false, error: 'User not recognized. Please verify your Login ID or Username.' };
    }

    // 5. STRICT CASE-SENSITIVE PASSWORD VALIDATION
    // Determine the user's expected password directly from account records
    const userPass = targetUser.password;
    const permPass = (targetUser as any)?.permissions?.password || (targetUser as any)?.permissions?._password;
    const initialUser = INITIAL_USERS.find((u) => u.id === targetUser?.id || u.name === targetUser?.name);
    const initialPass = initialUser?.password;

    const expectedPassword = userPass || permPass || initialPass;

    if (!expectedPassword) {
      return { success: false, error: 'No password configured for this user. Please contact Administrator.' };
    }

    // STRICT CHECK: Character for character, case for case!
    if (rawPass === expectedPassword) {
      return performSuccessfulLogin(targetUser, 'Security Password');
    }

    return {
      success: false,
      error: 'Invalid Security Password. Password is strictly case-sensitive.',
    };
  };

  const loginAsUser = (userId: string, password: string): { success: boolean; error?: string } => {
    return login(userId, password);
  };

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    try {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
      localStorage.removeItem(AUTH_SESSION_KEY);
      sessionStorage.removeItem(LAST_ACTIVITY_KEY);
      localStorage.removeItem(LAST_ACTIVITY_KEY);
    } catch {}
    logAudit('System Logout', 'Authentication', `${currentUser.name} locked screen & logged out.`);
  }, [currentUser.name]);

  // Automatically kick out any non-Kaustubh user if maintenance mode becomes active
  useEffect(() => {
    if (isMaintenanceMode && currentUser && !isKaustubhUser(currentUser)) {
      logout();
    }
  }, [isMaintenanceMode, currentUser, logout]);

  const toggleMaintenanceMode = async (enabled?: boolean): Promise<boolean> => {
    const nextState = enabled !== undefined ? enabled : !isMaintenanceMode;
    setIsMaintenanceMode(nextState);
    try {
      localStorage.setItem('RSB_MAINTENANCE_MODE', nextState ? 'true' : 'false');
    } catch {}

    try {
      const channel = new BroadcastChannel('rsb_maintenance_sync');
      channel.postMessage({ enabled: nextState });
      channel.close();
    } catch {}

    await setRemoteMaintenanceMode(nextState);

    if (nextState && currentUser && !isKaustubhUser(currentUser)) {
      logout();
    }

    logAudit(
      nextState ? 'Maintenance Mode Enabled' : 'Maintenance Mode Disabled',
      'System Security',
      `Kaustubh Admin ${nextState ? 'ACTIVATED' : 'DEACTIVATED'} emergency Maintenance Mode.`
    );

    return nextState;
  };

  // Automatic Inactivity Session Timeout & Activity Listener (15 minutes)
  useEffect(() => {
    if (!isAuthenticated) return;

    const recordActivity = () => {
      try {
        const now = Date.now().toString();
        localStorage.setItem(LAST_ACTIVITY_KEY, now);
        sessionStorage.setItem(LAST_ACTIVITY_KEY, now);
      } catch {}
    };

    // Record initial activity
    recordActivity();

    // Throttled activity listener (records at most once per 5 seconds)
    let lastRecorded = Date.now();
    const handleUserActivity = () => {
      const now = Date.now();
      if (now - lastRecorded > 5000) {
        lastRecorded = now;
        recordActivity();
      }
    };

    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    activityEvents.forEach((evt) => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    // Inactivity heartbeat check every 10 seconds
    const interval = setInterval(() => {
      try {
        const lastActivity = Number(
          sessionStorage.getItem(LAST_ACTIVITY_KEY) || localStorage.getItem(LAST_ACTIVITY_KEY) || '0'
        );
        if (lastActivity > 0 && Date.now() - lastActivity > INACTIVITY_TIMEOUT_MS) {
          console.warn('[RSB ERP] Session expired due to inactivity. Auto-logging out.');
          logout();
        }
      } catch (e) {
        console.error('Session timeout check error:', e);
      }
    }, 10000);

    return () => {
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, handleUserActivity);
      });
      clearInterval(interval);
    };
  }, [isAuthenticated, currentUser.name, logout]);

  // Stock Delta Adjuster
  const adjustStock = (materialId: string, deltaQty: number, reason: string) => {
    setMaterials((prev) =>
      prev.map((m) => {
        if (m.id === materialId) {
          const newStock = Math.max(0, m.currentStock + deltaQty);
          return { ...m, currentStock: newStock };
        }
        return m;
      })
    );
    logAudit('Stock Adjustment', 'Inventory', `Adjusted stock by ${deltaQty > 0 ? '+' : ''}${deltaQty} for Material ID ${materialId}. Reason: ${reason}`);
  };

  // =========================================================================
  // PROJECT MATERIAL REQUIREMENT TABLE HANDLERS (CORE HUB)
  // =========================================================================
  const addProjectRequirement = (req: Omit<ProjectMaterialRequirementItem, 'id' | 'srNo'>) => {
    const matchedMat = materials.find(
      (m) =>
        m.type === req.materialType &&
        m.sizeSpecs.toLowerCase().replace(/\s+/g, '') === req.sizeSpecs.toLowerCase().replace(/\s+/g, '')
    );

    const availableStock = matchedMat ? matchedMat.currentStock - (matchedMat.reservedStock || 0) : 0;
    const shortageQty = Math.max(0, req.quantity - availableStock);
    const stockStatus = shortageQty === 0 ? 'Available' : availableStock > 0 ? 'Partial Available' : 'Shortage';

    const mchName = req.machineName || req.machineType || req.projectName || 'Custom Assembly';
    const poNum = req.poNo || req.poNumber || '';
    const vendorNm = req.vendorName || req.vendor || '';
    const formattedDate = req.date || req.poDate || new Date().toISOString().split('T')[0];
    const targetPrj = req.projectName || mchName;

    const itemSrNo = (req as any).srNo !== undefined && (req as any).srNo !== null && String((req as any).srNo).trim() !== ''
      ? (req as any).srNo
      : projectRequirements.length + 1;

    const cleanDesc = (req.description || '').trim().toLowerCase();
    const cleanSpec = (req.sizeSpecs || '').trim().toLowerCase().replace(/\s+/g, '');
    const cleanType = (req.materialType || '').trim().toLowerCase();
    const cleanPrj = targetPrj.trim().toLowerCase();

    const finalId = (req as any).id || ('pmr-' + Date.now() + '-' + Math.floor(Math.random() * 1000));
    removeRequirementTombstone(finalId);
    if (targetPrj) {
      removeProjectTombstone(targetPrj);
    }
    pendingSyncIdsRef.current.add(finalId);

    const newReq: ProjectMaterialRequirementItem = {
      ...req,
      id: finalId,
      srNo: itemSrNo,
      machineName: mchName,
      date: formattedDate,
      poNo: poNum,
      vendorName: vendorNm,
      orderedBy: req.orderedBy || currentUser.name, // Auto-populated from logged-in user, read-only
      projectName: targetPrj,
      poNumber: poNum,
      poDate: req.poDate || formattedDate,
      machineType: (req.machineType || mchName) as any,
      vendor: vendorNm,
      availableStock,
      shortageQty,
      stockStatus,
      totalCost: (req.materialCost || 0) + (req.laborCost || 0) + (req.machineCost || 0) + (req.outsourcingCost || 0),
    };

    setProjectRequirements((prev) => {
      const existingIdx = prev.findIndex((r) => r.id === finalId);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = { ...copy[existingIdx], ...newReq };
        return copy;
      }
      return [...prev, newReq];
    });

    if (newReq.customerName) {
      learnCustomer(newReq.customerName);
    }
    if (mchName) {
      learnMachine(mchName);
    }

    // Update project metrics in state & DB
    const existingProject = projects.find((p) => p.name.trim().toLowerCase() === targetPrj.trim().toLowerCase());
    if (existingProject) {
      const updatedPrj: ProjectItem = {
        ...existingProject,
        materialsCount: (existingProject.materialsCount || 0) + 1,
        totalQuantity: (existingProject.totalQuantity || 0) + Number(newReq.quantity || 0),
      };
      setProjects((prev) => prev.map((p) => (p.id === updatedPrj.id ? updatedPrj : p)));
      dbUpsertProject(updatedPrj);
    }

    // Reserve stock if available
    if (matchedMat && availableStock > 0) {
      const reserveDelta = Math.min(availableStock, req.quantity);
      setMaterials((prev) =>
        prev.map((m) => (m.id === matchedMat.id ? { ...m, reservedStock: (m.reservedStock || 0) + reserveDelta } : m))
      );
    }

    logAudit('Requirement Added', 'Project Material Requirement', `Added ${newReq.description} (${newReq.sizeSpecs}) for machine ${newReq.machineName || newReq.projectName} by ${newReq.orderedBy}`);
    addNotification('Material Requirement Added', `Added ${newReq.description} (${newReq.orderedBy})`, 'info', 'requirements');
    dbUpsertRequirement(newReq).finally(() => {
      setTimeout(() => {
        pendingSyncIdsRef.current.delete(finalId);
      }, 20000);
    });

    // Auto-sync linked Project BOM
    setTimeout(() => syncProjectToBOM(targetPrj), 50);
  };

  const updateProjectRequirement = (
    id: string,
    updates: Partial<ProjectMaterialRequirementItem>,
    baseFallback?: ProjectMaterialRequirementItem
  ) => {
    pendingSyncIdsRef.current.add(id);
    setProjectRequirements((prev) => {
      const exists = prev.some((r) => r.id === id);
      let updatedList: ProjectMaterialRequirementItem[];
      if (exists) {
        updatedList = prev.map((r) => {
          if (r.id === id) {
            const merged = { ...r, ...updates };
            merged.totalCost = (merged.materialCost || 0) + (merged.laborCost || 0) + (merged.machineCost || 0) + (merged.outsourcingCost || 0);
            dbUpsertRequirement(merged).finally(() => {
              setTimeout(() => {
                pendingSyncIdsRef.current.delete(id);
              }, 20000);
            });
            return merged;
          }
          return r;
        });
      } else {
        const newEntry = { ...(baseFallback || {}), id, ...updates } as ProjectMaterialRequirementItem;
        dbUpsertRequirement(newEntry).finally(() => {
          setTimeout(() => {
            pendingSyncIdsRef.current.delete(id);
          }, 20000);
        });
        updatedList = [newEntry, ...prev];
      }
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY + '_requirements', JSON.stringify(updatedList));
      } catch (e) {
        console.error(e);
      }
      return updatedList;
    });
    logAudit('Requirement Updated', 'Project Material Requirement', `Updated Requirement ID ${id}`);
  };

  const deleteProjectRequirement = (id: string) => {
    addRequirementTombstone(id);
    pendingSyncIdsRef.current.delete(id);
    const reqToDelete = projectRequirements.find((r) => r.id === id);
    if (reqToDelete) {
      const trashEntry: TrashItem = {
        id: `trash-req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: 'requirement',
        deletedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toISOString().split('T')[0],
        deletedBy: currentUser?.name || 'Amit',
        title: `${reqToDelete.description} (${reqToDelete.sizeSpecs})`,
        subtitle: `Project: ${reqToDelete.projectName} • ${reqToDelete.quantity} ${reqToDelete.unit} • Vendor: ${reqToDelete.vendor || 'Unassigned'}`,
        requirementData: reqToDelete,
      };
      setTrashItems((prev) => [trashEntry, ...prev]);

      // Update project metrics in state & DB
      if (reqToDelete.projectName) {
        const existingProject = projects.find((p) => p.name.trim().toLowerCase() === reqToDelete.projectName?.trim().toLowerCase());
        if (existingProject) {
          const updatedPrj: ProjectItem = {
            ...existingProject,
            materialsCount: Math.max(0, (existingProject.materialsCount || 1) - 1),
            totalQuantity: Math.max(0, (existingProject.totalQuantity || reqToDelete.quantity) - Number(reqToDelete.quantity || 0)),
          };
          setProjects((prev) => prev.map((p) => (p.id === updatedPrj.id ? updatedPrj : p)));
          dbUpsertProject(updatedPrj);
        }

        // Clean matching draft items from localStorage
        try {
          const draftKey = `RSB_PROJECT_DRAFT_${reqToDelete.projectName}`;
          const cached = localStorage.getItem(draftKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              const cleaned = parsed.filter((row: any) => row.id !== id);
              if (cleaned.length > 0) {
                localStorage.setItem(draftKey, JSON.stringify(cleaned));
              } else {
                localStorage.removeItem(draftKey);
              }
            }
          }
        } catch (e) {}
      }
    }

    // Clean from global draft
    try {
      const globalDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (globalDraft) {
        const parsed = JSON.parse(globalDraft);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((row: any) => row.id !== id);
          if (cleaned.length > 0) {
            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(cleaned));
          } else {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
          }
        }
      }
    } catch (e) {}

    // Check if order-backed material item
    if (id.startsWith('ord-mat-')) {
      const rawOrderId = id.replace('ord-mat-', '');
      setOrders((prev) => {
        const next = prev.filter((o) => o.id !== rawOrderId);
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY + '_orders', JSON.stringify(next));
        } catch (e) {}
        return next;
      });
      const supabase = getSupabaseClient();
      if (supabase) {
        supabase.from('manufacturing_orders').delete().eq('id', rawOrderId).then(() => {});
      }
    }

    setProjectRequirements((prev) => {
      const nextReqs = prev.filter((r) => r.id !== id);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY + '_requirements', JSON.stringify(nextReqs));
      } catch (e) {}
      return nextReqs;
    });

    dbDeleteRequirement(id);

    try {
      const bc = new BroadcastChannel('rsb_erp_live_sync');
      bc.postMessage({ type: 'REQUIREMENT_DELETED', requirementId: id });
      bc.close();
    } catch (e) {}

    logAudit('Requirement Deleted', 'Project Material Requirement', `Deleted Requirement ID ${id} (Moved to Trash)`);
  };

  const deleteProjectRequirements = (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);
    addRequirementTombstones(ids);
    ids.forEach((id) => pendingSyncIdsRef.current.delete(id));

    const reqsToDelete = projectRequirements.filter((r) => idSet.has(r.id));
    if (reqsToDelete.length > 0) {
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toISOString().split('T')[0];
      const newTrashItems: TrashItem[] = reqsToDelete.map((req) => ({
        id: `trash-req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: 'requirement',
        deletedAt: nowStr,
        deletedBy: currentUser?.name || 'Amit',
        title: `${req.description} (${req.sizeSpecs})`,
        subtitle: `Project: ${req.projectName} • ${req.quantity} ${req.unit} • Vendor: ${req.vendor || 'Unassigned'}`,
        requirementData: req,
      }));
      setTrashItems((prev) => [...newTrashItems, ...prev]);

      // Group by project to update metrics and clear drafts
      const projectCounts = new Map<string, { count: number; qty: number }>();
      reqsToDelete.forEach((req) => {
        if (req.projectName) {
          const prevP = projectCounts.get(req.projectName) || { count: 0, qty: 0 };
          projectCounts.set(req.projectName, {
            count: prevP.count + 1,
            qty: prevP.qty + Number(req.quantity || 0),
          });
        }
      });

      projectCounts.forEach((delta, prjName) => {
        const existingProject = projects.find((p) => p.name.trim().toLowerCase() === prjName.trim().toLowerCase());
        if (existingProject) {
          const updatedPrj: ProjectItem = {
            ...existingProject,
            materialsCount: Math.max(0, (existingProject.materialsCount || delta.count) - delta.count),
            totalQuantity: Math.max(0, (existingProject.totalQuantity || delta.qty) - delta.qty),
          };
          setProjects((prev) => prev.map((p) => (p.id === updatedPrj.id ? updatedPrj : p)));
          dbUpsertProject(updatedPrj);
        }

        try {
          const draftKey = `RSB_PROJECT_DRAFT_${prjName}`;
          const cached = localStorage.getItem(draftKey);
          if (cached) {
            const parsed = JSON.parse(cached);
            if (Array.isArray(parsed)) {
              const cleaned = parsed.filter((row: any) => !idSet.has(row.id));
              if (cleaned.length > 0) {
                localStorage.setItem(draftKey, JSON.stringify(cleaned));
              } else {
                localStorage.removeItem(draftKey);
              }
            }
          }
        } catch (e) {}
      });
    }

    // Clean global draft
    try {
      const globalDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (globalDraft) {
        const parsed = JSON.parse(globalDraft);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter((row: any) => !idSet.has(row.id));
          if (cleaned.length > 0) {
            localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(cleaned));
          } else {
            localStorage.removeItem(DRAFT_STORAGE_KEY);
          }
        }
      }
    } catch (e) {}

    setProjectRequirements((prev) => {
      const nextReqs = prev.filter((r) => !idSet.has(r.id));
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY + '_requirements', JSON.stringify(nextReqs));
      } catch (e) {}
      return nextReqs;
    });

    // Batch delete in Supabase
    const supabase = getSupabaseClient();
    if (supabase) {
      supabase.from('project_material_requirements').delete().in('id', ids).then(() => {});
    }
    try {
      const bc = new BroadcastChannel('rsb_erp_live_sync');
      bc.postMessage({ type: 'PROJECTS_UPDATED', ids });
      bc.close();
    } catch (e) {}

    logAudit('Requirements Bulk Deleted', 'Project Material Requirement', `Bulk deleted ${ids.length} requirements (Moved to Trash)`);
  };


  // Dedicated Material Inward / Receiving Verification Toggle
  const toggleMaterialReceived = (reqId: string, customNotes?: string) => {
    let target = projectRequirements.find((r) => r.id === reqId);

    // If not found in projectRequirements, check if it's an order-backed material item
    if (!target) {
      const orderMatch = orders.find((o) => `ord-mat-${o.id}` === reqId || o.id === reqId);
      if (orderMatch) {
        target = {
          id: reqId,
          srNo: 1,
          description: orderMatch.drawingRef ? `${orderMatch.materialType} Part (${orderMatch.drawingRef})` : `${orderMatch.materialType} Component`,
          materialType: orderMatch.materialType,
          materialGrade: 'SS 304',
          sizeSpecs: orderMatch.sizeSpecs,
          quantity: orderMatch.quantity,
          unit: orderMatch.unit || 'Nos',
          weightKg: 2.5,
          projectName: orderMatch.project,
          customerName: orderMatch.customer,
          poNumber: orderMatch.poNumber,
          poDate: orderMatch.date,
          machineType: orderMatch.machineType as any,
          orderSource: orderMatch.orderSource,
          deliveryDate: orderMatch.deliveryDate,
          vendor: orderMatch.vendor || '',
          bomRef: `BOM-${orderMatch.orderNumber}`,
          stockStatus: 'Available',
          availableStock: orderMatch.currentStock || 15,
          shortageQty: 0,
          productionStatus: orderMatch.status,
          qcStatus: 'Passed',
          dispatchStatus: 'Not Ready',
          materialCost: 450 * orderMatch.quantity,
          laborCost: 180 * orderMatch.quantity,
          machineCost: 120 * orderMatch.quantity,
          outsourcingCost: 0,
          totalCost: orderMatch.totalAmount || 750 * orderMatch.quantity,
        };
        setProjectRequirements((prev) => [target!, ...prev.filter((r) => r.id !== reqId)]);
      }
    }

    if (!target) return;

    const willBeReceived = !target.isReceived;
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    const initials = (currentUser?.name || 'Chandramani')
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const userRoleDisplay =
      currentUser?.role === 'super_admin'
        ? 'Super Admin'
        : currentUser?.role === 'kaustubh'
        ? 'Admin'
        : currentUser?.role === 'store_incharge'
        ? 'Stores Incharge'
        : currentUser?.department || 'Inspector';

    const totalQty = Number(target.quantity) || 1;
    const updates: Partial<ProjectMaterialRequirementItem> = willBeReceived
      ? {
          isReceived: true,
          receivedQuantity: totalQty,
          pendingQuantity: 0,
          receivedAt: formattedDate,
          receivedBy: currentUser?.name || 'Chandramani',
          receivedByInitials: initials,
          receivedByRole: userRoleDisplay,
          receivedNotes: customNotes || `Verified arrival by ${currentUser?.name || 'Chandramani'} (${userRoleDisplay})`,
          stockStatus: 'Available',
        }
      : {
          isReceived: false,
          receivedQuantity: 0,
          pendingQuantity: totalQty,
          receivedAt: undefined,
          receivedBy: undefined,
          receivedByInitials: undefined,
          receivedByRole: undefined,
          receivedNotes: undefined,
        };

    updateProjectRequirement(target.id, updates);
    logAudit(
      willBeReceived ? 'Material Received Verified' : 'Material Receiving Reverted',
      'Project Material Requirement',
      `${target.description} for ${target.projectName} marked ${willBeReceived ? 'RECEIVED' : 'PENDING'} by ${currentUser?.name || 'Chandramani'} [${initials}]`
    );
    addNotification(
      willBeReceived ? 'Material Received' : 'Receiving Reverted',
      `${target.description} for ${target.projectName} marked ${willBeReceived ? 'Arrived (Checked by ' + initials + ')' : 'Pending'}`,
      willBeReceived ? 'success' : 'warning',
      'requirements'
    );
  };

  // Dedicated Handler for Updating Inward / Arrived Quantity with Auto-Calculated Pending Quantity
  const updateMaterialArrivalQty = (reqId: string, receivedQty: number) => {
    let target = projectRequirements.find((r) => r.id === reqId);
    if (!target) {
      const orderMatch = orders.find((o) => `ord-mat-${o.id}` === reqId || o.id === reqId);
      if (orderMatch) {
        target = {
          id: reqId,
          srNo: 1,
          description: orderMatch.drawingRef ? `${orderMatch.materialType} Part (${orderMatch.drawingRef})` : `${orderMatch.materialType} Component`,
          materialType: orderMatch.materialType,
          materialGrade: 'SS 304',
          sizeSpecs: orderMatch.sizeSpecs,
          quantity: orderMatch.quantity,
          unit: orderMatch.unit || 'Nos',
          weightKg: 2.5,
          projectName: orderMatch.project,
          customerName: orderMatch.customer,
          poNumber: orderMatch.poNumber,
          poDate: orderMatch.date,
          machineType: orderMatch.machineType as any,
          orderSource: orderMatch.orderSource,
          deliveryDate: orderMatch.deliveryDate,
          vendor: orderMatch.vendor || '',
          bomRef: `BOM-${orderMatch.orderNumber}`,
          stockStatus: 'Available',
          availableStock: orderMatch.currentStock || 15,
          shortageQty: 0,
          productionStatus: orderMatch.status,
          qcStatus: 'Passed',
          dispatchStatus: 'Not Ready',
          materialCost: 450 * orderMatch.quantity,
          laborCost: 180 * orderMatch.quantity,
          machineCost: 120 * orderMatch.quantity,
          outsourcingCost: 0,
          totalCost: orderMatch.totalAmount || 750 * orderMatch.quantity,
        };
        setProjectRequirements((prev) => [target!, ...prev.filter((r) => r.id !== reqId)]);
      }
    }

    if (!target) return;

    const totalQty = Number(target.quantity) || 0;
    const validArrived = Math.max(0, receivedQty);
    const pending = Math.max(0, totalQty - validArrived);
    const isFullyArrived = validArrived >= totalQty && totalQty > 0;
    const isPartiallyArrived = validArrived > 0 && validArrived < totalQty;

    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()} ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const initials = (currentUser?.name || 'Chandramani')
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const userRoleDisplay =
      currentUser?.role === 'super_admin'
        ? 'Super Admin'
        : currentUser?.role === 'kaustubh'
        ? 'Admin'
        : currentUser?.role === 'store_incharge'
        ? 'Stores Incharge'
        : currentUser?.department || 'Inspector';

    updateProjectRequirement(target.id, {
      receivedQuantity: validArrived,
      pendingQuantity: pending,
      isReceived: isFullyArrived,
      receivedAt: validArrived > 0 ? (target.receivedAt || formattedDate) : undefined,
      receivedBy: validArrived > 0 ? (target.receivedBy || currentUser?.name || 'Chandramani') : undefined,
      receivedByInitials: validArrived > 0 ? (target.receivedByInitials || initials) : undefined,
      receivedByRole: validArrived > 0 ? (target.receivedByRole || userRoleDisplay) : undefined,
      stockStatus: isFullyArrived ? 'Available' : isPartiallyArrived ? 'Partial Available' : 'Shortage',
    }, target);

    logAudit(
      'Material Inward Quantity Updated',
      'Project Material Requirement',
      `${target.description}: Arrived = ${validArrived} ${target.unit || 'Nos'}, Pending = ${pending} ${target.unit || 'Nos'}`
    );
  };

  // Replace and synchronize all requirements for a project in DB and local state
  const replaceProjectRequirements = (projectName: string, items: any[]) => {
    if (!projectName) return;
    
    // Find existing requirements in state for this project so we can preserve inward verification, custom flags, IDs if matched
    const currentProjectReqs = projectRequirements.filter(
      (r) => isRequirementMatchingProjectName(r.projectName, projectName)
    );

    // 1. Map active rows preserving exact Sr. No. and custom metadata
    const todayFormatted = new Date().toISOString().split('T')[0];
    const mapped: ProjectMaterialRequirementItem[] = items.map((it, idx) => {
      // Find if this item already existed in local state to preserve its receipt status / ID
      const existing = currentProjectReqs.find((er) => 
        (it.id && er.id === it.id) ||
        (er.description === (it.description || it['Description'] || it['Part Description']) &&
         er.sizeSpecs === (it.sizeSpecs || it['Size Specification'] || it['Size Specs']))
      );

      const spec = it.sizeSpecs || it['Size Specification'] || it['Size Specs'] || existing?.sizeSpecs || 'Custom Spec';
      const desc = it.description || it['Description'] || it['Part Description'] || existing?.description || 'Machine Component';
      const matType = it.materialType || it['Material Type'] || existing?.materialType || 'SS Flat';
      const qty = Number(it.quantity || it['Qty'] || it['Quantity'] || existing?.quantity || 1);
      const prj = projectName || it.projectName || it['Project'] || existing?.projectName || 'Project-1';
      const poNum = it.poNo || it.poNumber || it['PO No'] || existing?.poNumber || '';
      const cust = it.customerName || it['Customer'] || existing?.customerName || 'General Client';
      const mchType = it.machineName || it.machineType || existing?.machineName || prj;
      const unit = it.unit || it['Unit'] || existing?.unit || 'Nos';
      const vendor = it.vendorName || it.vendor || existing?.vendor || '';
      const bomRef = it.bomRef || existing?.bomRef || `BOM-${prj}`;
      const orderedBy = it.orderedBy || existing?.orderedBy || currentUser?.name || 'Unknown';
      const entryDate = it.date || it['Date'] || existing?.date || todayFormatted;

      const isReceived = it.isReceived !== undefined ? Boolean(it.isReceived) : (existing?.isReceived || false);
      const receivedAt = it.receivedAt || existing?.receivedAt || undefined;
      const receivedBy = it.receivedBy || existing?.receivedBy || undefined;
      const receivedByInitials = it.receivedByInitials || existing?.receivedByInitials || undefined;
      const receivedByRole = it.receivedByRole || existing?.receivedByRole || undefined;
      const receivedNotes = it.receivedNotes || existing?.receivedNotes || undefined;

      const matchedMat = materials.find(
        (m) =>
          m.sizeSpecs.toLowerCase().replace(/\s+/g, '') === spec.toLowerCase().replace(/\s+/g, '')
      );

      const availableStock = matchedMat ? matchedMat.currentStock : 20;
      const shortageQty = Math.max(0, qty - availableStock);
      const stockStatus = isReceived ? 'Available' : (shortageQty === 0 ? 'Available' : availableStock > 0 ? 'Partial Available' : 'Shortage');

      const unitCost = matchedMat ? matchedMat.unitCost : 450;
      const matCost = qty * unitCost;
      const laborCost = Math.round(matCost * 0.4);
      const machineCost = Math.round(matCost * 0.25);

      const resolvedId = it.id || existing?.id || ('pmr-' + (idx + 1) + '-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4));
      const resolvedSrNo = (it.srNo !== undefined && it.srNo !== null && String(it.srNo).trim() !== '')
        ? it.srNo
        : (existing?.srNo !== undefined && existing?.srNo !== null && String(existing.srNo).trim() !== '')
        ? existing.srNo
        : (idx + 1);

      return {
        id: resolvedId,
        srNo: resolvedSrNo,
        description: desc,
        materialType: matType as any,
        materialGrade: matchedMat?.grade || existing?.materialGrade || 'SS 304',
        sizeSpecs: spec,
        quantity: qty,
        unit,
        projectName: prj,
        customerName: cust,
        poNumber: poNum,
        poDate: entryDate,
        machineType: mchType as any,
        machineName: mchType,
        date: entryDate,
        poNo: poNum,
        vendorName: vendor,
        orderedBy,
        orderSource: 'Workstation Entry',
        deliveryDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        vendor,
        bomRef,
        lastPurchaseRate: unitCost,
        lastPurchaseDate: entryDate,
        vendorRating: 4.9,
        vendorReliability: 98,
        stockStatus,
        availableStock,
        shortageQty,
        productionStatus: (it.productionStatus || existing?.productionStatus || 'Pending') as any,
        qcStatus: (it.qcStatus || existing?.qcStatus || 'Not Started') as any,
        dispatchStatus: (it.dispatchStatus || existing?.dispatchStatus || 'Not Ready') as any,
        materialCost: matCost,
        laborCost,
        machineCost,
        outsourcingCost: 0,
        totalCost: matCost + laborCost + machineCost,
        sellingPriceAllocated: Math.round((matCost + laborCost + machineCost) * 1.6),
        isReceived,
        receivedAt,
        receivedBy,
        receivedByInitials,
        receivedByRole,
        receivedNotes,
      };
    });

    // 2. Safely purge specifically removed rows from DB (with durable tombstones)
    const activeIds = new Set(mapped.map((m) => m.id));
    const removedReqs = currentProjectReqs.filter((r) => !activeIds.has(r.id));
    if (removedReqs.length > 0) {
      addRequirementTombstones(removedReqs.map((r) => r.id));
      removedReqs.forEach((r) => dbDeleteRequirement(r.id));
    }

    // 3. Clear draft keys if items is empty
    if (items.length === 0) {
      try {
        localStorage.removeItem(`RSB_PROJECT_DRAFT_${projectName}`);
      } catch (e) {}
    }

    // 4. Update React state & LocalStorage
    const tombstones = getDeletedRequirementTombstones();
    const removedIdSet = new Set(removedReqs.map((r) => r.id));
    setProjectRequirements((prev) => {
      const remaining = prev.filter(
        (r) =>
          !removedIdSet.has(r.id) &&
          !tombstones.has(r.id) &&
          !isRequirementMatchingProjectName(r.projectName, projectName)
      );
      const nextReqs = sortRowsByAscendingSrNo([...remaining, ...mapped].filter((r) => !tombstones.has(r.id)));
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY + '_requirements', JSON.stringify(nextReqs));
      } catch (e) {}
      return nextReqs;
    });

    // 5. Authoritatively upsert active rows
    if (mapped.length > 0) {
      dbBulkUpsertRequirements(mapped);
    }

    // 6. Broadcast to other open tabs
    try {
      const bc = new BroadcastChannel('rsb_erp_live_sync');
      bc.postMessage({ type: 'PROJECTS_UPDATED', projectName });
      bc.close();
    } catch (e) {}


    // Update project metrics (materialsCount & totalQuantity) and sync to Supabase
    const existingProject = projects.find((p) => p.name.trim().toLowerCase() === projectName.trim().toLowerCase());
    const totalQty = mapped.reduce((acc, m) => acc + (Number(m.quantity) || 0), 0);
    const firstItem = mapped[0];
    mapped.forEach((item) => {
      if (item.customerName) {
        learnCustomer(item.customerName);
      }
      if (item.machineName) {
        learnMachine(item.machineName);
      }
      if (item.machineType) {
        learnMachine(item.machineType);
      }
    });

    if (existingProject) {
      const updatedPrj: ProjectItem = {
        ...existingProject,
        materialsCount: mapped.length,
        totalQuantity: totalQty,
        machineName: firstItem?.machineName || existingProject.machineName,
        vendorName: firstItem?.vendorName || existingProject.vendorName,
        poNo: firstItem?.poNo || existingProject.poNo,
        date: firstItem?.date || existingProject.date,
      };
      setProjects((prev) => prev.map((p) => (p.id === updatedPrj.id ? updatedPrj : p)));
      dbUpsertProject(updatedPrj);
    } else if (mapped.length > 0) {
      const autoProject: ProjectItem = {
        id: 'prj-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        name: projectName,
        projectNumber: `PRJ-${String(projects.length + 1).padStart(3, '0')}`,
        customer: firstItem?.customerName || 'General Client',
        orderSource: 'Workstation Entry',
        machineType: (firstItem?.machineType || projectName) as any,
        machineName: firstItem?.machineName || projectName,
        vendor: firstItem?.vendorName || '',
        vendorName: firstItem?.vendorName || '',
        poNumber: firstItem?.poNumber || '',
        poNo: firstItem?.poNo || '',
        startDate: firstItem?.date || todayFormatted,
        targetCompletionDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        priority: 'high',
        status: 'Material Procurement',
        projectValue: 450000,
        progressPct: 10,
        materialsCount: mapped.length,
        totalQuantity: totalQty,
        orderedBy: firstItem?.orderedBy || currentUser?.name || 'Unknown',
      };
      addProject(autoProject);
      dbUpsertProject(autoProject);
    }

    // Auto-sync full project BOM
    setTimeout(() => syncProjectToBOM(projectName), 50);

    // Broadcast across tabs/windows
    try {
      const bc = new BroadcastChannel('rsb_erp_live_sync');
      bc.postMessage({ type: 'PROJECTS_UPDATED', projectName });
      bc.close();
    } catch (e) {}
  };

  const bulkImportProjectRequirements = (items: any[]) => {
    const todayFormatted = new Date().toISOString().split('T')[0];
    const mapped: ProjectMaterialRequirementItem[] = items.map((it, idx) => {
      const spec = it.sizeSpecs || it['Size Specification'] || it['Size Specs'] || 'Custom Spec';
      const desc = it.description || it['Description'] || it['Part Description'] || 'Machine Component';
      const matType = it.materialType || it['Material Type'] || 'SS Flat';
      const qty = Number(it.quantity || it['Qty'] || it['Quantity'] || 1);
      const prj = it.projectName || it['Project'] || it['Project Name'] || it['Machine Name'] || 'Project-1';
      const poNum = it.poNo || it.poNumber || it['PO No'] || it['PO Number'] || '';
      const cust = it.customerName || it['Customer'] || it['Customer Name'] || 'General Client';
      const mchType = it.machineName || it.machineType || it['Machine Name'] || it['Machine Type'] || prj;
      const unit = it.unit || it['Unit'] || 'Nos';
      const vendor = it.vendorName || it.vendor || it['Vendor Name'] || it['Vendor'] || '';
      const bomRef = it.bomRef || it['BOM Ref'] || `BOM-${prj}`;
      const orderedBy = it.orderedBy || it['Ordered By'] || currentUser.name;
      const entryDate = it.date || it['Date'] || todayFormatted;

      const matchedMat = materials.find(
        (m) =>
          m.sizeSpecs.toLowerCase().replace(/\s+/g, '') === spec.toLowerCase().replace(/\s+/g, '')
      );

      const availableStock = matchedMat ? matchedMat.currentStock : 20;
      const shortageQty = Math.max(0, qty - availableStock);
      const stockStatus = shortageQty === 0 ? 'Available' : availableStock > 0 ? 'Partial Available' : 'Shortage';

      const unitCost = matchedMat ? matchedMat.unitCost : 450;
      const matCost = qty * unitCost;
      const laborCost = Math.round(matCost * 0.4);
      const machineCost = Math.round(matCost * 0.25);

      const resolvedSrNo = (it.srNo !== undefined && it.srNo !== null && String(it.srNo).trim() !== '')
        ? it.srNo
        : projectRequirements.length + idx + 1;

      return {
        id: 'pmr-' + (projectRequirements.length + idx + 1) + '-' + Date.now(),
        srNo: resolvedSrNo,
        description: desc,
        materialType: matType as any,
        materialGrade: matchedMat?.grade || 'SS 304',
        sizeSpecs: spec,
        quantity: qty,
        unit,
        projectName: prj,
        customerName: cust,
        poNumber: poNum,
        poDate: entryDate,
        machineType: mchType as any,
        machineName: mchType,
        date: entryDate,
        poNo: poNum,
        vendorName: vendor,
        orderedBy,
        orderSource: 'Excel Import',
        deliveryDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        vendor,
        bomRef,
        lastPurchaseRate: unitCost,
        lastPurchaseDate: entryDate,
        vendorRating: 4.9,
        vendorReliability: 98,
        stockStatus,
        availableStock,
        shortageQty,
        productionStatus: 'Pending',
        qcStatus: 'Not Started',
        dispatchStatus: 'Not Ready',
        materialCost: matCost,
        laborCost,
        machineCost,
        outsourcingCost: 0,
        totalCost: matCost + laborCost + machineCost,
        sellingPriceAllocated: Math.round((matCost + laborCost + machineCost) * 1.6),
      };
    });

    setProjectRequirements((prev) => [...prev, ...mapped]);
    logAudit('Excel Customer PO Import', 'Project Material Requirement', `Imported ${mapped.length} material requirements from Customer PO Excel`);
    addNotification('Customer PO Imported', `Generated ${mapped.length} material requirements with automatic stock matching`, 'success', 'requirements');

    // Automatically synchronize all saved requirements to Supabase cloud in real-time
    dbBulkUpsertRequirements(mapped);

    // Auto-create/upsert project on Supabase if not already created & auto-learn customers
    const uniqueProjects = Array.from(new Set(mapped.map((r) => r.projectName)));
    uniqueProjects.forEach((prjName) => {
      const firstReq = mapped.find((r) => r.projectName === prjName);
      if (firstReq?.customerName) {
        learnCustomer(firstReq.customerName);
      }
      if (firstReq?.machineName) {
        learnMachine(firstReq.machineName);
      }
      const existingProject = projects.find((p) => p.name.toLowerCase() === prjName.toLowerCase());
      if (!existingProject && firstReq) {
        const autoProject: ProjectItem = {
          id: 'prj-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
          name: firstReq.projectName,
          projectNumber: `PRJ-${String(projects.length + 1).padStart(3, '0')}`,
          customer: firstReq.customerName || 'General Client',
          orderSource: 'Customer PO',
          machineType: (firstReq.machineType || firstReq.projectName) as any,
          vendor: firstReq.vendor || '',
          poNumber: firstReq.poNumber || '',
          poNo: firstReq.poNumber || '',
          startDate: firstReq.poDate || todayFormatted,
          targetCompletionDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          priority: 'high',
          status: 'Production',
          projectValue: 450000,
          progressPct: 10,
          materialsCount: mapped.filter((r) => r.projectName === prjName).length,
          totalQuantity: mapped.filter((r) => r.projectName === prjName).reduce((acc, m) => acc + (Number(m.quantity) || 0), 0),
        };
        addProject(autoProject);
        dbUpsertProject(autoProject);
      }

      setTimeout(() => syncProjectToBOM(prjName), 50);
    });
  };

  // Authoritative Excel Import Engine Persistent Handlers
  const importMaterialRequirements = async (
    items: Partial<ProjectMaterialRequirementItem>[],
    options?: {
      projectName?: string;
      machineName?: string;
      vendorName?: string;
      poNo?: string;
      sheetName?: string;
      batchId?: string;
    }
  ): Promise<{ success: boolean; count: number; message?: string }> => {
    if (!items || items.length === 0) return { success: false, count: 0, message: 'No items to import' };

    const todayFormatted = new Date().toISOString().split('T')[0];
    const batchId = options?.batchId || `batch-${Date.now()}`;
    const defaultProject = options?.projectName || 'Project-1';

    const mapped: ProjectMaterialRequirementItem[] = items.map((it, idx) => {
      const prj = (it.projectName || options?.projectName || defaultProject).trim();
      const mch = (it.machineName || options?.machineName || prj).trim();
      const poNum = (it.poNo || it.poNumber || options?.poNo || '').trim();
      const vendorNm = (it.vendorName || it.vendor || options?.vendorName || '').trim();
      const dateVal = it.date || it.poDate || todayFormatted;

      const spec = it.sizeSpecs || 'Custom Spec';
      const desc = it.description || 'Component';
      const matType = it.materialType || 'SS Flat';
      const qty = Number(it.quantity || 1);
      const unit = it.unit || 'Nos';

      const resolvedSrNo = (it.srNo !== undefined && it.srNo !== null && String(it.srNo).trim() !== '')
        ? it.srNo
        : (idx + 1);

      const resolvedId = it.id || `pmr-imp-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`;

      return {
        id: resolvedId,
        srNo: resolvedSrNo,
        description: desc,
        materialType: matType as any,
        materialGrade: it.materialGrade || 'SS 304',
        sizeSpecs: spec,
        quantity: qty,
        unit,
        projectName: prj,
        customerName: it.customerName || prj,
        poNumber: poNum,
        poDate: dateVal,
        machineType: (mch || prj) as any,
        machineName: mch,
        date: dateVal,
        poNo: poNum,
        vendorName: vendorNm,
        vendor: vendorNm,
        orderedBy: it.orderedBy || currentUser?.name || 'Unknown',
        orderSource: 'Excel Import',
        deliveryDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        bomRef: it.bomRef || `BOM-${prj}`,
        lastPurchaseRate: 450,
        lastPurchaseDate: dateVal,
        vendorRating: 4.9,
        vendorReliability: 98,
        stockStatus: 'Available',
        availableStock: 20,
        shortageQty: 0,
        productionStatus: 'In Production',
        qcStatus: 'Passed',
        dispatchStatus: 'Ready',
        materialCost: qty * 450,
        laborCost: Math.round(qty * 450 * 0.4),
        machineCost: Math.round(qty * 450 * 0.25),
        outsourcingCost: 0,
        totalCost: Math.round(qty * 450 * 1.65),
        sellingPriceAllocated: Math.round(qty * 450 * 2.2),
        isReceived: false,
        importBatchId: batchId,
        sourceSheetName: options?.sheetName,
        sourceRowIndex: idx + 1,
        originalSrNo: resolvedSrNo,
        notes: `Imported via Intelligent Excel Parser (Batch ${batchId})`,
      };
    });

    // 1. Update React state non-destructively
    setProjectRequirements((prev) => {
      const nextList = [...prev];
      mapped.forEach((m) => {
        const existingIdx = nextList.findIndex((r) => r.id === m.id);
        if (existingIdx >= 0) {
          nextList[existingIdx] = m;
        } else {
          nextList.push(m);
        }
      });
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY + '_requirements', JSON.stringify(nextList));
      } catch (e) {}
      return nextList;
    });

    // 2. Persist directly to Supabase
    const dbRes = await dbBulkUpsertRequirements(mapped);

    // 3. Auto-link or update project metrics
    const targetProjects = Array.from(new Set(mapped.map((m) => m.projectName)));
    targetProjects.forEach((prjName) => {
      const existingPrj = projects.find((p) => p.name.trim().toLowerCase() === prjName.trim().toLowerCase());
      const prjRows = mapped.filter((m) => m.projectName.trim().toLowerCase() === prjName.trim().toLowerCase());
      const firstRow = prjRows[0];
      const totalQty = prjRows.reduce((s, r) => s + (Number(r.quantity) || 0), 0);

      if (existingPrj) {
        updateProject(existingPrj.id, {
          materialsCount: (existingPrj.materialsCount || 0) + prjRows.length,
          totalQuantity: (existingPrj.totalQuantity || 0) + totalQty,
          machineName: firstRow?.machineName || existingPrj.machineName,
          vendorName: firstRow?.vendorName || existingPrj.vendorName,
          poNo: firstRow?.poNo || existingPrj.poNo,
        });
      } else {
        addProject({
          projectNumber: `PRJ-2026-${String(projects.length + 1).padStart(3, '0')}`,
          name: prjName,
          customer: firstRow?.customerName || prjName,
          orderSource: 'Customer PO',
          machineType: (firstRow?.machineName || prjName) as any,
          machineName: firstRow?.machineName || prjName,
          vendor: firstRow?.vendorName || 'Manav Metal',
          vendorName: firstRow?.vendorName || 'Manav Metal',
          poNumber: firstRow?.poNo || '36',
          poNo: firstRow?.poNo || '36',
          startDate: firstRow?.date || todayFormatted,
          targetCompletionDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
          priority: 'medium',
          status: 'Production',
          projectValue: 450000,
          progressPct: 10,
          materialsCount: prjRows.length,
          totalQuantity: totalQty,
          notes: `Auto-created from Excel Import (${options?.sheetName || 'Sheet'})`,
        });
      }
    });

    // 4. Broadcast to other open tabs
    try {
      const bc = new BroadcastChannel('rsb_erp_live_sync');
      bc.postMessage({ type: 'PROJECTS_UPDATED', projectName: defaultProject });
      bc.close();
    } catch (e) {}

    logAudit('Excel Import Completed', 'Project Material Requirement', `Imported ${mapped.length} material records into ${targetProjects.join(', ')}`);
    return { success: dbRes.success, count: mapped.length, message: dbRes.message };
  };

  // Populate from BOM
  const populateRequirementsFromBOM = (projectId: string, bomId: string) => {
    const prj = projects.find((p) => p.id === projectId);
    const bom = boms.find((b) => b.id === bomId);
    if (!prj || !bom) return;

    const newRows: ProjectMaterialRequirementItem[] = [];

    const traverse = (items: BOMItem[]) => {
      items.forEach((item) => {
        if (item.itemType === 'raw_material' || item.itemType === 'hardware' || item.itemType === 'standard_part') {
          const matchedMat = materials.find(
            (m) => m.sizeSpecs.toLowerCase().replace(/\s+/g, '') === item.sizeSpecs.toLowerCase().replace(/\s+/g, '')
          );
          const availableStock = matchedMat ? matchedMat.currentStock : 10;
          const shortageQty = Math.max(0, item.quantity - availableStock);
          const stockStatus = shortageQty === 0 ? 'Available' : availableStock > 0 ? 'Partial Available' : 'Shortage';

          const matCost = item.totalCost;
          const laborCost = Math.round(matCost * 0.35);
          const machineCost = Math.round(matCost * 0.2);

          newRows.push({
            id: 'pmr-' + Date.now() + '-' + Math.floor(Math.random() * 10000),
            srNo: projectRequirements.length + newRows.length + 1,
            description: item.name,
            materialType: (item.materialType || (item.itemType === 'hardware' ? 'Hardware' : 'SS Flat')) as any,
            materialGrade: matchedMat?.grade || 'SS 304',
            sizeSpecs: item.sizeSpecs,
            quantity: item.quantity,
            unit: item.unit,
            projectName: prj.name,
            customerName: prj.customer,
            poNumber: prj.poNumber,
            poDate: prj.startDate,
            machineType: prj.machineType,
            orderSource: prj.orderSource,
            deliveryDate: prj.targetCompletionDate,
            vendor: matchedMat?.vendor || '',
            bomRef: bom.bomNumber,
            lastPurchaseRate: item.unitCost,
            lastPurchaseDate: new Date().toISOString().split('T')[0],
            vendorRating: 4.9,
            vendorReliability: 98,
            stockStatus,
            availableStock,
            shortageQty,
            productionStatus: 'Pending',
            qcStatus: 'Not Started',
            dispatchStatus: 'Not Ready',
            materialCost: matCost,
            laborCost,
            machineCost,
            outsourcingCost: 0,
            totalCost: matCost + laborCost + machineCost,
            sellingPriceAllocated: Math.round((matCost + laborCost + machineCost) * 1.55),
          });
        }
        if (item.children) {
          traverse(item.children);
        }
      });
    };

    traverse(bom.items);
    setProjectRequirements((prev) => [...prev, ...newRows]);
    logAudit('BOM Loaded into Project', 'Project Material Requirement', `Loaded ${newRows.length} items from ${bom.bomNumber} for ${prj.name}`);
    addNotification('BOM Loaded', `Populated ${newRows.length} material requirements for ${prj.name}`, 'info', 'requirements');
  };

  // 1-Click Job Card Creation from Requirement Row
  const createJobCardFromRequirement = (reqId: string): JobCard | undefined => {
    const req = projectRequirements.find((r) => r.id === reqId);
    if (!req) return;

    const count = String(jobCards.length + 1).padStart(3, '0');
    const jobCardNo = `JC-2026-${count}`;

    const newCard: JobCard = {
      id: 'jc-' + Date.now(),
      jobCardNo,
      project: req.projectName,
      customer: req.customerName || 'RSB Client',
      drawingRef: `DWG-RSB-${req.machineType.slice(0, 2).toUpperCase()}-${req.sizeSpecs.replace(/\s+/g, '')}`,
      material: `${req.materialType} ${req.sizeSpecs}`,
      sizeSpecs: req.sizeSpecs,
      quantity: req.quantity,
      unit: req.unit,
      machineType: req.machineType,
      assignedOperator: req.assignedOperator || 'Mahesh Thakor',
      startDate: new Date().toISOString().split('T')[0],
      endDate: req.deliveryDate || new Date().toISOString().split('T')[0],
      completionPct: 0,
      status: 'Pending',
      linkedRequirementId: req.id,
      operations: [
        { step: 1, name: 'Bandsaw Raw Material Cutting', completed: false, operator: 'Mahesh Thakor', timeSpentHours: 0 },
        { step: 2, name: 'CNC Lathe / Milling Machining', completed: false, operator: 'Mahesh Thakor', timeSpentHours: 0 },
        { step: 3, name: 'TIG Orbital Welding & Fabrication', completed: false, operator: 'Gopal Rawal', timeSpentHours: 0 },
        { step: 4, name: 'Deburring & Sanitary Buffing', completed: false, operator: 'Dinesh Solanki', timeSpentHours: 0 },
        { step: 5, name: 'Final Dimensional QC & Cleaning', completed: false, operator: 'Rajesh Patel', timeSpentHours: 0 },
      ],
      notes: `Manufacture ${req.description} as per drawing specifications`,
      qrPayload: `RSB-${jobCardNo}|${req.projectName}|${req.materialType}|QTY:${req.quantity}`,
    };

    setJobCards((prev) => [newCard, ...prev]);
    updateProjectRequirement(req.id, {
      jobCardNo,
      productionStatus: 'Cutting',
      productionStage: 'Cutting',
      assignedOperator: 'Mahesh Thakor',
    });

    logAudit('Job Card Created', 'Project Material Requirement', `Generated ${jobCardNo} for ${req.description}`);
    addNotification('Job Card Generated', `Generated ${jobCardNo} for ${req.description}`, 'success', 'production');
    return newCard;
  };

  // Convert Shortages to Purchase Orders
  const convertShortagesToPO = (reqIds: string[]) => {
    const targetReqs = projectRequirements.filter((r) => reqIds.includes(r.id) && r.shortageQty > 0);
    if (targetReqs.length === 0) return;

    const vendorMap: { [vendor: string]: ProjectMaterialRequirementItem[] } = {};
    targetReqs.forEach((r) => {
      const v = r.vendor || 'Unassigned';
      if (!vendorMap[v]) vendorMap[v] = [];
      vendorMap[v].push(r);
    });

    Object.keys(vendorMap).forEach((vendor, idx) => {
      const items = vendorMap[vendor];
      const count = String(purchaseOrders.length + idx + 51).padStart(3, '0');
      const poItems = items.map((i) => ({
        material: `${i.materialType} ${i.sizeSpecs}`,
        sizeSpecs: i.sizeSpecs,
        qty: i.shortageQty,
        unit: i.unit,
        rate: i.lastPurchaseRate || 450,
        amount: i.shortageQty * (i.lastPurchaseRate || 450),
      }));

      const totalAmount = poItems.reduce((acc, it) => acc + it.amount, 0);

      addPurchaseOrder({
        poNumber: `PO-REQ-${count}`,
        date: new Date().toISOString().split('T')[0],
        vendor,
        items: poItems,
        totalAmount,
        paymentTerms: '30 Days Net',
        expectedDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
        status: 'Sent',
        notes: `Auto-generated from Project Material Requirement Shortages for ${items[0].projectName}`,
      });

      // Update requirement statuses
      items.forEach((item) => {
        updateProjectRequirement(item.id, {
          stockStatus: 'Partial Available',
          notes: `PO-REQ-${count} issued to ${vendor}`,
        });
      });
    });

    logAudit('Purchase Request Converted', 'Project Material Requirement', `Generated POs for ${targetReqs.length} material shortages`);
    addNotification('POs Generated', `Issued Purchase Orders to suppliers for ${targetReqs.length} components`, 'success', 'purchase');
  };

  // Issue Stock
  const issueStockForRequirement = (reqId: string) => {
    const req = projectRequirements.find((r) => r.id === reqId);
    if (!req) return;

    const matched = materials.find((m) => m.sizeSpecs.toLowerCase().replace(/\s+/g, '') === req.sizeSpecs.toLowerCase().replace(/\s+/g, ''));
    if (matched) {
      adjustStock(matched.id, -req.quantity, `Issued for Project ${req.projectName} (${req.description})`);
    }

    updateProjectRequirement(req.id, { stockIssued: true, productionStatus: 'Cutting' });
    logAudit('Stock Issued', 'Inventory', `Issued ${req.quantity} ${req.unit} of ${req.sizeSpecs} for ${req.description}`);
    addNotification('Stock Issued', `Issued material for ${req.description}`, 'info', 'inventory');
  };

  // Scrap Generation
  const scrapRequirementMaterial = (reqId: string, scrapQty: number, reason: string) => {
    const req = projectRequirements.find((r) => r.id === reqId);
    if (!req) return;

    updateProjectRequirement(req.id, {
      scrapQty: (req.scrapQty || 0) + scrapQty,
      qcStatus: 'Rework',
      rejectionReason: reason,
    });

    logAudit('Scrap Logged', 'Quality Control', `Scrap of ${scrapQty} logged for ${req.description}. Reason: ${reason}`);
    addNotification('Scrap Logged', `Logged scrap for ${req.description}`, 'warning', 'quality');
  };

  // Material Handlers
  const addMaterial = (material: Omit<MaterialItem, 'id'>) => {
    const newMat: MaterialItem = {
      ...material,
      id: 'mat-' + (materials.length + 1) + '-' + Date.now().toString().slice(-4),
    };
    pendingSyncIdsRef.current.add(newMat.id);
    removeMaterialTombstone(newMat.id);
    setMaterials((prev) => [newMat, ...prev]);
    logAudit('Material Created', 'Materials Master', `Created material ${newMat.name} (${newMat.code})`);
    addNotification('Material Added', `Added ${newMat.name} to inventory catalog`, 'success', 'materials');
    dbUpsertMaterial(newMat).finally(() => {
      setTimeout(() => {
        pendingSyncIdsRef.current.delete(newMat.id);
      }, 20000);
    });
  };

  const updateMaterial = (id: string, updates: Partial<MaterialItem>) => {
    setMaterials((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const merged = { ...m, ...updates };
          dbUpsertMaterial(merged);
          return merged;
        }
        return m;
      })
    );
    logAudit('Material Updated', 'Materials Master', `Updated material ID ${id}`);
  };

  const deleteMaterial = (id: string) => {
    addMaterialTombstone(id);
    setMaterials((prev) => {
      const next = prev.filter((m) => m.id !== id);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY + '_materials', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    dbDeleteMaterial(id);
    try {
      const bc = new BroadcastChannel('rsb_erp_live_sync');
      bc.postMessage({ type: 'MATERIAL_DELETED', materialId: id });
      bc.close();
    } catch (e) {}
    logAudit('Material Deleted', 'Materials Master', `Deleted material ID ${id}`);
  };

  // Order Handlers
  const addOrder = (order: Omit<ManufacturingOrderItem, 'id'>) => {
    const newOrder: ManufacturingOrderItem = {
      ...order,
      id: 'ord-' + (orders.length + 1001),
    };
    setOrders((prev) => [newOrder, ...prev]);
    logAudit('Order Created', 'Manufacturing Orders', `Created production order ${newOrder.orderNumber} for project ${newOrder.project}`);
    addNotification('Order Added', `New order ${newOrder.orderNumber} created for PO ${newOrder.poNumber}`, 'info', 'orders');
  };

  const updateOrderStatus = (id: string, status: ProductionStatus) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
    logAudit('Order Status Updated', 'Manufacturing Orders', `Order ID ${id} status set to ${status}`);
  };

  const updateOrder = (id: string, updates: Partial<ManufacturingOrderItem>) => {
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...updates } : o)));
    logAudit('Order Updated', 'Manufacturing Orders', `Updated order ID ${id}`);
  };

  const deleteOrder = (id: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== id));
    logAudit('Order Deleted', 'Manufacturing Orders', `Deleted order ID ${id}`);
  };

  // Inward (Auto-Increases Stock)
  const addInwardEntry = (entry: Omit<InwardEntry, 'id'>) => {
    const newInward: InwardEntry = {
      ...entry,
      id: 'inw-' + (inwardEntries.length + 1) + '-' + Date.now().toString().slice(-4),
    };
    setInwardEntries((prev) => [newInward, ...prev]);

    if (newInward.qualityStatus === 'Approved') {
      const matchedMaterial = materials.find(
        (m) =>
          m.type === newInward.materialType &&
          m.sizeSpecs.toLowerCase().replace(/\s+/g, '') === newInward.sizeSpecs.toLowerCase().replace(/\s+/g, '')
      );
      if (matchedMaterial) {
        adjustStock(matchedMaterial.id, newInward.quantity, `GRN Inward ${newInward.inwardNumber} Approved`);
      }
    }

    logAudit('Inward Logged', 'Inward Management', `Logged Inward ${newInward.inwardNumber} from ${newInward.vendor}`);
    addNotification('Inward GRN Created', `Received ${newInward.quantity} ${newInward.unit} from ${newInward.vendor}`, 'success', 'inward');
  };

  const updateInwardStatus = (id: string, status: InwardStatus) => {
    const inward = inwardEntries.find((i) => i.id === id);
    if (!inward) return;

    const previousStatus = inward.qualityStatus;
    setInwardEntries((prev) =>
      prev.map((i) => (i.id === id ? { ...i, qualityStatus: status } : i))
    );

    if (status === 'Approved' && previousStatus !== 'Approved') {
      const matchedMaterial = materials.find(
        (m) =>
          m.type === inward.materialType &&
          m.sizeSpecs.toLowerCase().replace(/\s+/g, '') === inward.sizeSpecs.toLowerCase().replace(/\s+/g, '')
      );
      if (matchedMaterial) {
        adjustStock(matchedMaterial.id, inward.quantity, `Inward ${inward.inwardNumber} Approved`);
      }
    }

    logAudit('Inward Status Updated', 'Inward Management', `Inward ${inward.inwardNumber} status changed to ${status}`);
  };

  const deleteInwardEntry = (id: string) => {
    setInwardEntries((prev) => prev.filter((i) => i.id !== id));
    logAudit('Inward Deleted', 'Inward Management', `Deleted Inward ID ${id}`);
  };

  // Outward (Auto-Decreases Stock)
  const addOutwardEntry = (entry: Omit<OutwardEntry, 'id'>) => {
    const newOutward: OutwardEntry = {
      ...entry,
      id: 'out-' + (outwardEntries.length + 1) + '-' + Date.now().toString().slice(-4),
    };
    setOutwardEntries((prev) => [newOutward, ...prev]);

    if (newOutward.deliveryStatus === 'Dispatched' || newOutward.deliveryStatus === 'Delivered') {
      const matchedMaterial = materials.find(
        (m) =>
          newOutward.material.toLowerCase().includes(m.type.toLowerCase()) ||
          newOutward.material.toLowerCase().includes(m.sizeSpecs.toLowerCase())
      );
      if (matchedMaterial) {
        adjustStock(matchedMaterial.id, -newOutward.quantity, `Outward Dispatch ${newOutward.outwardNumber}`);
      }
    }

    logAudit('Outward Dispatched', 'Outward Management', `Dispatched Outward ${newOutward.outwardNumber} to ${newOutward.customer}`);
    addNotification('Outward Dispatched', `Challan ${newOutward.outwardNumber} generated for ${newOutward.customer}`, 'info', 'outward');
  };

  const updateOutwardStatus = (id: string, status: OutwardStatus) => {
    setOutwardEntries((prev) =>
      prev.map((o) => (o.id === id ? { ...o, deliveryStatus: status } : o))
    );
    logAudit('Outward Status Updated', 'Outward Management', `Outward ID ${id} status set to ${status}`);
  };

  const deleteOutwardEntry = (id: string) => {
    setOutwardEntries((prev) => prev.filter((o) => o.id !== id));
    logAudit('Outward Deleted', 'Outward Management', `Deleted Outward ID ${id}`);
  };

  // Job Cards Handlers
  const addJobCard = (card: Omit<JobCard, 'id'>) => {
    const newCard: JobCard = {
      ...card,
      id: 'jc-' + (jobCards.length + 1) + '-' + Date.now().toString().slice(-4),
    };
    setJobCards((prev) => [newCard, ...prev]);
    logAudit('Job Card Created', 'Production', `Job Card ${newCard.jobCardNo} issued for ${newCard.project}`);
    addNotification('Job Card Issued', `Job Card ${newCard.jobCardNo} ready for operator`, 'info', 'production');
  };

  const updateJobCard = (id: string, updates: Partial<JobCard>) => {
    setJobCards((prev) => prev.map((j) => (j.id === id ? { ...j, ...updates } : j)));
    logAudit('Job Card Updated', 'Production', `Updated Job Card ID ${id}`);
  };

  const updateJobCardStep = (jobCardId: string, stepNumber: number, completed: boolean) => {
    setJobCards((prev) =>
      prev.map((jc) => {
        if (jc.id === jobCardId) {
          const updatedOps = jc.operations.map((op) =>
            op.step === stepNumber
              ? {
                  ...op,
                  completed,
                  completedAt: completed ? new Date().toISOString().split('T')[0] : undefined,
                }
              : op
          );
          const completedCount = updatedOps.filter((o) => o.completed).length;
          const completionPct = Math.round((completedCount / updatedOps.length) * 100);
          const newStatus: ProductionStatus =
            completionPct === 100
              ? 'Completed'
              : completionPct >= 60
              ? 'Assembly'
              : completionPct >= 40
              ? 'Fabrication'
              : 'Cutting';

          if (jc.linkedRequirementId) {
            updateProjectRequirement(jc.linkedRequirementId, {
              productionStatus: newStatus,
              qcStatus: completionPct === 100 ? 'Passed' : 'Pending',
              dispatchStatus: completionPct === 100 ? 'Ready' : 'Not Ready',
            });
          }

          return {
            ...jc,
            operations: updatedOps,
            completionPct,
            status: newStatus,
          };
        }
        return jc;
      })
    );
    logAudit('Job Card Step Updated', 'Production', `Job Card ${jobCardId} step ${stepNumber} marked ${completed ? 'Completed' : 'Incomplete'}`);
  };

  const toggleJobOperation = (jobCardId: string, stepNumber: number) => {
    const card = jobCards.find((j) => j.id === jobCardId);
    if (!card) return;
    const op = card.operations.find((o) => o.step === stepNumber);
    updateJobCardStep(jobCardId, stepNumber, !op?.completed);
  };

  const createJobCardFromOrder = (order: ManufacturingOrderItem): JobCard => {
    const count = String(jobCards.length + 1).padStart(3, '0');
    const jobCardNo = `JC-2026-${count}`;
    const newCard: JobCard = {
      id: 'jc-' + Date.now(),
      jobCardNo,
      project: order.project,
      customer: order.customer,
      drawingRef: order.drawingRef,
      material: `${order.materialType} ${order.sizeSpecs}`,
      sizeSpecs: order.sizeSpecs,
      quantity: order.quantity,
      unit: order.unit,
      machineType: order.machineType,
      assignedOperator: 'Mahesh Thakor',
      startDate: new Date().toISOString().split('T')[0],
      endDate: order.deliveryDate,
      completionPct: 0,
      status: 'Pending',
      linkedOrderId: order.id,
      operations: [
        { step: 1, name: 'Bandsaw Raw Material Cutting', completed: false, operator: 'Mahesh Thakor', timeSpentHours: 0 },
        { step: 2, name: 'CNC Lathe / VMC Machining', completed: false, operator: 'Mahesh Thakor', timeSpentHours: 0 },
        { step: 3, name: 'TIG Orbital Welding & Fabrication', completed: false, operator: 'Gopal Rawal', timeSpentHours: 0 },
        { step: 4, name: 'Deburring, Grinding & Sanitary Polishing', completed: false, operator: 'Dinesh Solanki', timeSpentHours: 0 },
        { step: 5, name: 'Final Dimensional QC & Cleaning', completed: false, operator: 'Rajesh Patel', timeSpentHours: 0 },
      ],
      notes: order.notes || 'Manufacture as per drawing specifications',
      qrPayload: `RSB-${jobCardNo}|${order.project}|${order.materialType}|QTY:${order.quantity}`,
    };

    setJobCards((prev) => [newCard, ...prev]);
    updateOrderStatus(order.id, 'In Production');
    logAudit('Job Card Generated', 'Production', `Generated ${jobCardNo} from Order ${order.orderNumber}`);
    addNotification('Job Card Generated', `Generated ${jobCardNo} for Order ${order.orderNumber}`, 'success', 'production');
    return newCard;
  };

  const deleteJobCard = (id: string) => {
    setJobCards((prev) => prev.filter((j) => j.id !== id));
    logAudit('Job Card Deleted', 'Production', `Deleted Job Card ID ${id}`);
  };

  // QC Handlers with Real-Time Inter-Module Sync
  const addQCInspection = (qc: Omit<QCInspection, 'id'>) => {
    const newQC: QCInspection = {
      ...qc,
      id: 'qc-' + (qcInspections.length + 1) + '-' + Date.now().toString().slice(-4),
    };
    setQcInspections((prev) => [newQC, ...prev]);

    // 1. Sync Job Card Status
    if (newQC.jobCardNo) {
      if (newQC.status === 'Passed') {
        setJobCards((prev) =>
          prev.map((jc) =>
            jc.jobCardNo === newQC.jobCardNo
              ? { ...jc, status: 'Ready For Dispatch', completionPct: 100 }
              : jc
          )
        );
      } else if (newQC.status === 'Rework') {
        setJobCards((prev) =>
          prev.map((jc) =>
            jc.jobCardNo === newQC.jobCardNo
              ? { ...jc, status: 'In Production' }
              : jc
          )
        );
      }
    }

    // 2. Sync Inward Quality Status if this was an Inward Lot
    if (newQC.jobCardNo && newQC.jobCardNo.startsWith('INW-')) {
      const inwNum = newQC.jobCardNo.replace('INW-', '');
      setInwardEntries((prev) =>
        prev.map((inw) =>
          inw.inwardNumber === inwNum
            ? { ...inw, qualityStatus: newQC.status === 'Passed' ? 'Approved' : 'Rejected' }
            : inw
        )
      );
    }

    // 3. Sync Project Requirements
    if (newQC.linkedRequirementId) {
      updateProjectRequirement(newQC.linkedRequirementId, {
        qcStatus: newQC.status,
        dispatchStatus: newQC.status === 'Passed' ? 'Ready' : 'Not Ready',
        rejectionReason: newQC.status !== 'Passed' ? newQC.defectNotes : undefined,
      });
    } else if (newQC.jobCardNo) {
      setProjectRequirements((prev) =>
        prev.map((req) =>
          req.jobCardNo === newQC.jobCardNo
            ? {
                ...req,
                qcStatus: newQC.status,
                dispatchStatus: newQC.status === 'Passed' ? 'Ready' : 'Not Ready',
                rejectionReason: newQC.status !== 'Passed' ? newQC.defectNotes : undefined,
              }
            : req
        )
      );
    }

    // 4. Sync Orders
    if (newQC.status === 'Passed') {
      setOrders((prev) =>
        prev.map((ord) =>
          ord.project === newQC.project || (newQC.jobCardNo && ord.orderNumber.includes(newQC.jobCardNo.slice(-3)))
            ? { ...ord, status: 'Ready For Dispatch' }
            : ord
        )
      );
    }

    logAudit('QC Inspection Logged', 'Quality Control', `Inspection ${newQC.inspectionNo} result: ${newQC.status}`);
    addNotification(
      'QC Inspection Logged',
      `${newQC.inspectionNo} (${newQC.material}) - ${newQC.status}`,
      newQC.status === 'Passed' ? 'success' : 'danger',
      'quality'
    );
  };

  const updateQCInspection = (id: string, updates: Partial<QCInspection>) => {
    setQcInspections((prev) => prev.map((q) => (q.id === id ? { ...q, ...updates } : q)));
    logAudit('QC Inspection Updated', 'Quality Control', `Updated QC ID ${id}`);
  };

  const deleteQCInspection = (id: string) => {
    setQcInspections((prev) => prev.filter((q) => q.id !== id));
    logAudit('QC Inspection Deleted', 'Quality Control', `Deleted QC ID ${id}`);
  };

  // Projects Handlers
  const addProject = (project: Omit<ProjectItem, 'id'>) => {
    const cleanCustomerName = project.clientName || project.customer || 'General Client';
    learnCustomer(cleanCustomerName, project.clientNumber);
    if (project.machineName || project.machineType) {
      learnMachine(project.machineName || project.machineType);
    }

    const newPrj: ProjectItem = {
      ...project,
      id: 'prj-' + (projects.length + 1) + '-' + Date.now().toString().slice(-4),
    };

    // Auto-create linked Project BOM
    const projectBOM: BOMRecord = {
      id: 'bom-' + newPrj.id,
      bomNumber: 'BOM-' + newPrj.projectNumber,
      machineType: newPrj.machineName || newPrj.machineType || newPrj.name || 'Custom Assembly',
      assemblyName: newPrj.name,
      revision: 'Rev A',
      status: 'Draft',
      effectiveDate: newPrj.startDate || new Date().toISOString().split('T')[0],
      createdBy: currentUser?.name || 'Amit',
      projectId: newPrj.id,
      projectName: newPrj.name,
      customer: newPrj.customer,
      isProjectBOM: true,
      items: [],
      totalEstimatedCost: 0,
      notes: `Automated Project BOM for ${newPrj.name} (${newPrj.customer})`,
      history: [
        {
          revision: 'Rev A',
          changedBy: currentUser?.name || 'Amit',
          date: new Date().toISOString().split('T')[0],
          changeSummary: `Auto-generated Project BOM for ${newPrj.name}`,
        },
      ],
    };
    newPrj.bomId = projectBOM.id;

    setProjects((prev) => {
      const merged = [newPrj, ...prev.filter((p) => p.id !== newPrj.id && p.name !== newPrj.name)];
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY + '_projects', JSON.stringify(merged));
      } catch (e) {}
      return merged;
    });
    setBoms((prev) => [
      projectBOM,
      ...prev.filter((b) => b.projectId !== newPrj.id && b.bomNumber !== projectBOM.bomNumber),
    ]);

    if (newPrj.bomId && newPrj.bomId !== projectBOM.id) {
      populateRequirementsFromBOM(newPrj.id, newPrj.bomId);
    }

    logAudit(
      'Project Created',
      'Projects',
      `Created project ${newPrj.name} (${newPrj.projectNumber}) and generated linked Project BOM`
    );
    addNotification(
      'Project & BOM Created',
      `Created project ${newPrj.name} and initialized Project BOM`,
      'info',
      'projects'
    );
    removeProjectTombstone(newPrj.id);
    if (newPrj.name) {
      removeProjectTombstone(newPrj.name);
    }
    pendingSyncIdsRef.current.add(newPrj.id);
    dbUpsertProject(newPrj).then(() => {
      setTimeout(() => {
        pendingSyncIdsRef.current.delete(newPrj.id);
      }, 5000);
    }).catch(() => {
      setTimeout(() => {
        pendingSyncIdsRef.current.delete(newPrj.id);
      }, 10000);
    });
    try {
      const bc = new BroadcastChannel('rsb_erp_live_sync');
      bc.postMessage({ type: 'PROJECTS_UPDATED', projectName: newPrj.name });
      bc.close();
    } catch (e) {}
  };

  const updateProject = (id: string, updates: Partial<ProjectItem>) => {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          const merged = { ...p, ...updates };
          dbUpsertProject(merged);
          return merged;
        }
        return p;
      })
    );
    logAudit('Project Updated', 'Projects', `Updated project ID ${id}`);
  };

  const deleteProject = (id: string, cascadeRequirements: boolean = true) => {
    addProjectTombstone(id);
    const projectToDelete = projects.find((p) => p.id === id);
    let linkedReqIds: string[] = [];

    if (projectToDelete) {
      addProjectTombstone(projectToDelete.name);
      if (projectToDelete.projectNumber) addProjectTombstone(projectToDelete.projectNumber);

      // Find all linked requirements matching this project by name, number, id, or machine
      const deletedReqs = projectRequirements.filter(
        (r) =>
          isRequirementMatchedToProject(r.projectName, projectToDelete) ||
          isRequirementMatchingProjectName(r.projectName, projectToDelete.name) ||
          (projectToDelete.projectNumber && r.projectName.toLowerCase().includes(projectToDelete.projectNumber.toLowerCase()))
      );
      linkedReqIds = deletedReqs.map((r) => r.id);
      addRequirementTombstones(linkedReqIds);

      // Move Project to Trash Bin
      const trashEntry: TrashItem = {
        id: `trash-prj-${Date.now()}`,
        type: 'project',
        deletedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toISOString().split('T')[0],
        deletedBy: currentUser?.name || 'Amit',
        title: `Project: ${projectToDelete.name} (${projectToDelete.projectNumber || 'No No.'})`,
        subtitle: `Machine: ${projectToDelete.machineType || projectToDelete.machineName || 'Machine'} • Vendor: ${projectToDelete.vendor || 'Unassigned'} • ${deletedReqs.length} Material Items`,
        projectData: projectToDelete,
      };
      setTrashItems((prev) => [trashEntry, ...prev]);

      // 1. Remove all linked requirements from local state and localStorage
      setProjectRequirements((prev) => {
        const nextReqs = prev.filter(
          (r) =>
            !linkedReqIds.includes(r.id) &&
            !isRequirementMatchedToProject(r.projectName, projectToDelete) &&
            !isRequirementMatchingProjectName(r.projectName, projectToDelete.name)
        );
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY + '_requirements', JSON.stringify(nextReqs));
        } catch (e) {}
        return nextReqs;
      });

      // 2. Remove manufacturing orders linked to this project
      setOrders((prev) => {
        const nextOrders = prev.filter(
          (o) =>
            o.project.trim().toLowerCase() !== projectToDelete.name.trim().toLowerCase() &&
            (!projectToDelete.projectNumber || !o.project.toLowerCase().includes(projectToDelete.projectNumber.toLowerCase()))
        );
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY + '_orders', JSON.stringify(nextOrders));
        } catch (e) {}
        return nextOrders;
      });

      // 3. Remove BOMs linked to this project
      setBoms((prev) => {
        const nextBoms = prev.filter(
          (b) =>
            !b.projectName ||
            b.projectName.trim().toLowerCase() !== projectToDelete.name.trim().toLowerCase()
        );
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY + '_boms', JSON.stringify(nextBoms));
        } catch (e) {}
        return nextBoms;
      });

      // 4. Clear all draft keys & active project from localStorage
      try {
        const activeSaved = localStorage.getItem('RSB_ACTIVE_SELECTED_PROJECT');
        if (
          activeSaved &&
          (activeSaved.trim().toLowerCase() === projectToDelete.name.trim().toLowerCase() ||
           activeSaved === projectToDelete.id ||
           (projectToDelete.projectNumber && activeSaved.trim().toLowerCase() === projectToDelete.projectNumber.trim().toLowerCase()))
        ) {
          localStorage.removeItem('RSB_ACTIVE_SELECTED_PROJECT');
        }
        localStorage.removeItem(`RSB_PROJECT_DRAFT_${projectToDelete.name}`);
        localStorage.removeItem(`RSB_PROJECT_DRAFT_${projectToDelete.name.trim()}`);
        localStorage.removeItem(`RSB_PROJECT_DRAFT_${projectToDelete.id}`);
        if (projectToDelete.projectNumber) {
          localStorage.removeItem(`RSB_PROJECT_DRAFT_${projectToDelete.projectNumber}`);
        }

        const globalDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (globalDraft) {
          const parsed = JSON.parse(globalDraft);
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter(
              (row: any) =>
                !linkedReqIds.includes(row.id) &&
                !isRequirementMatchedToProject(row.projectName, projectToDelete) &&
                !isRequirementMatchingProjectName(row.projectName, projectToDelete.name)
            );
            if (cleaned.length > 0) {
              localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(cleaned));
            } else {
              localStorage.removeItem(DRAFT_STORAGE_KEY);
            }
          }
        }
      } catch (e) {}
    }

    // 5. Remove project from state & localStorage
    setProjects((prev) => {
      const nextProjects = prev.filter((p) => p.id !== id);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY + '_projects', JSON.stringify(nextProjects));
      } catch (e) {}
      return nextProjects;
    });

    // 6. Delete from Supabase Database (Project table & linked requirements & orders)
    dbDeleteProject(id);
    if (projectToDelete) {
      const extraNames = [projectToDelete.projectNumber, projectToDelete.id].filter(Boolean) as string[];
      dbDeleteRequirementsByProject(projectToDelete.name, extraNames, linkedReqIds);
      linkedReqIds.forEach((reqId) => dbDeleteRequirement(reqId));
    }

    // 7. Broadcast to all open tabs and windows
    try {
      const bc = new BroadcastChannel('rsb_erp_live_sync');
      bc.postMessage({
        type: 'PROJECT_DELETED',
        projectId: id,
        projectName: projectToDelete?.name,
        deletedReqIds: linkedReqIds,
      });
      bc.close();
    } catch (e) {}

    logAudit('Project Deleted', 'Projects', `Deleted project ${projectToDelete?.name || id} and purged all linked materials`);
    addNotification('Project & Materials Deleted', `Permanently deleted project ${projectToDelete?.name || id} and all its linked materials.`, 'warning', 'projects');
  };


  // Trash Bin Operations
  const restoreFromTrash = (trashId: string) => {
    const item = trashItems.find((t) => t.id === trashId);
    if (!item) return;

    if (item.type === 'project' && item.projectData) {
      const prj = item.projectData;
      setProjects((prev) => [prj, ...prev.filter((p) => p.id !== prj.id)]);
      dbUpsertProject(prj);
      logAudit('Project Restored', 'Trash Bin', `Restored project ${prj.name} from Trash Bin`);
      addNotification('Project Restored', `Restored project "${prj.name}" to active projects`, 'success', 'projects');
    } else if (item.type === 'requirement' && item.requirementData) {
      const req = item.requirementData;
      removeRequirementTombstone(req.id);
      if (req.projectName) removeProjectTombstone(req.projectName);
      pendingSyncIdsRef.current.add(req.id);

      setProjectRequirements((prev) => {
        // If an item with this ID already exists, update it in place; otherwise add it back
        const existingIdx = prev.findIndex((r) => r.id === req.id);
        if (existingIdx >= 0) {
          const copy = [...prev];
          copy[existingIdx] = req;
          return copy;
        }
        return [req, ...prev];
      });

      // Update project metrics in state & DB
      if (req.projectName) {
        const existingProject = projects.find((p) => p.name.trim().toLowerCase() === req.projectName?.trim().toLowerCase());
        if (existingProject) {
          const updatedPrj: ProjectItem = {
            ...existingProject,
            materialsCount: (existingProject.materialsCount || 0) + 1,
            totalQuantity: (existingProject.totalQuantity || 0) + Number(req.quantity || 0),
          };
          setProjects((prev) => prev.map((p) => (p.id === updatedPrj.id ? updatedPrj : p)));
          dbUpsertProject(updatedPrj);
        }
      }

      dbUpsertRequirement(req);
      logAudit('Requirement Restored', 'Trash Bin', `Restored ${req.description} from Trash Bin`);
      addNotification('Material Restored', `Restored "${req.description}" to ${req.projectName}`, 'success', 'requirements');
    }

    setTrashItems((prev) => prev.filter((t) => t.id !== trashId));
  };

  const permanentlyDeleteFromTrash = (trashId: string) => {
    setTrashItems((prev) => prev.filter((t) => t.id !== trashId));
    logAudit('Trash Item Purged', 'Trash Bin', `Permanently deleted trash item ${trashId}`);
  };

  const emptyTrash = () => {
    setTrashItems([]);
    logAudit('Trash Emptied', 'Trash Bin', 'Permanently emptied all items in Trash Bin');
  };

  // Stakeholders Handlers
  const addVendor = (vendor: Omit<VendorItem, 'id'>) => {
    const newVendor: VendorItem = {
      ...vendor,
      id: 'vnd-' + (vendors.length + 1) + '-' + Date.now().toString().slice(-4),
    };
    pendingSyncIdsRef.current.add(newVendor.id);
    removeVendorTombstone(newVendor.id);
    setVendors((prev) => {
      const next = [newVendor, ...prev.filter((v) => v.id !== newVendor.id)];
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY + '_vendors', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    dbUpsertVendor(newVendor).finally(() => {
      setTimeout(() => {
        pendingSyncIdsRef.current.delete(newVendor.id);
      }, 20000);
    });
    try {
      const bc = new BroadcastChannel('rsb_erp_live_sync');
      bc.postMessage({ type: 'VENDOR_UPSERTED', vendor: newVendor });
      bc.close();
    } catch (e) {}
    logAudit('Vendor Created', 'Vendor Management', `Added vendor ${newVendor.name}`);
  };

  const updateVendor = (id: string, updates: Partial<VendorItem>) => {
    removeVendorTombstone(id);
    setVendors((prev) => {
      const next = prev.map((v) => {
        if (v.id === id) {
          const merged = { ...v, ...updates };
          dbUpsertVendor(merged);
          return merged;
        }
        return v;
      });
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY + '_vendors', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    try {
      const bc = new BroadcastChannel('rsb_erp_live_sync');
      bc.postMessage({ type: 'SYNC_ALL' });
      bc.close();
    } catch (e) {}
    logAudit('Vendor Updated', 'Vendor Management', `Updated vendor ID ${id}`);
  };

  const deleteVendor = (id: string) => {
    addVendorTombstone(id);
    setVendors((prev) => {
      const next = prev.filter((v) => v.id !== id);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY + '_vendors', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    dbDeleteVendor(id);
    try {
      const bc = new BroadcastChannel('rsb_erp_live_sync');
      bc.postMessage({ type: 'VENDOR_DELETED', vendorId: id });
      bc.close();
    } catch (e) {}
    logAudit('Vendor Deleted', 'Vendor Management', `Deleted vendor ID ${id}`);
  };

  const learnVendor = (name: string, contactPerson?: string, mobile?: string, category?: string): VendorItem => {
    const cleanName = (name || '').trim();
    if (!cleanName) {
      if (vendors.length > 0) return vendors[0];
      return {
        id: `vnd-${Date.now()}`,
        name: 'General Vendor',
        contactPerson: contactPerson || 'Vendor Rep',
        mobile: mobile || '',
        email: 'sales@vendor.com',
        gstin: '',
        address: 'Factory Zone',
        materialSupplied: category || 'SS Raw Materials',
        rating: 5.0,
        paymentTerms: '30 Days Net',
        totalOrders: 0,
        totalPurchaseValue: 0,
        onTimeDeliveries: 0,
        delayedDeliveries: 0,
        averageDeliveryDays: 0,
        rejectionRate: 0,
        qualityRating: 100,
        costCompetitiveness: 10,
        reliabilityScore: 100,
      };
    }
    const existing = vendors.find(
      (v) => v.name.trim().toLowerCase() === cleanName.toLowerCase()
    );
    if (existing) {
      return existing;
    }
    const newVnd: VendorItem = {
      id: 'vnd-' + (vendors.length + 1) + '-' + Date.now().toString().slice(-4),
      name: cleanName,
      materialSupplied: category || 'Raw Materials & Hardware',
      contactPerson: contactPerson || cleanName,
      mobile: mobile || '+91 98000 00000',
      email: `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}@supplier.com`,
      gstin: '24' + Math.random().toString(36).substring(2, 7).toUpperCase() + '1234A1Z5',
      address: 'Ahmedabad, Gujarat',
      paymentTerms: '30 Days',
      rating: 5.0,
      totalOrders: 1,
      totalPurchaseValue: 0,
      onTimeDeliveries: 1,
      delayedDeliveries: 0,
      averageDeliveryDays: 5,
      rejectionRate: 0.1,
      qualityRating: 98,
      costCompetitiveness: 8.5,
      reliabilityScore: 98,
    };
    setVendors((prev) => {
      const updated = [newVnd, ...prev];
      localStorage.setItem(LOCAL_STORAGE_KEY + '_vendors', JSON.stringify(updated));
      return updated;
    });
    dbUpsertVendor(newVnd);
    logAudit('Vendor Learned', 'Self-Learning Engine', `Learned new vendor "${cleanName}"`);
    return newVnd;
  };

  // Super Admin Member Authorization Handlers
  const addUser = (userData: Omit<User, 'id'> & { id?: string }) => {
    const assignedId = (userData as any).id || ('usr-' + Date.now());
    const finalPassword = userData.password || 'Admin@123';
    const newUser: User = {
      ...userData,
      id: assignedId,
      password: finalPassword,
      status: userData.status || 'Active',
      lastActive: 'Just now',
      permissions: {
        ...(userData.permissions || {}),
        password: finalPassword,
      },
    };
    setUsers((prev) => {
      const filtered = prev.filter(
        (u) =>
          u.id !== newUser.id &&
          (!newUser.email || u.email?.toLowerCase() !== newUser.email.toLowerCase())
      );
      const next = [newUser, ...filtered];
      localStorage.setItem(LOCAL_STORAGE_KEY + '_users', JSON.stringify(next));
      return next;
    });
    dbUpsertUser(newUser);
    logAudit('Member Created', 'User Authorization', `Added member ${newUser.name} (${newUser.role})`);
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers((prev) => {
      const next = prev.map((u) => {
        if (u.id === id) {
          const merged = { ...u, ...updates };
          if (updates.password) {
            merged.permissions = {
              ...(merged.permissions || {}),
              password: updates.password,
            };
          }
          dbUpsertUser(merged);
          return merged;
        }
        return u;
      });
      localStorage.setItem(LOCAL_STORAGE_KEY + '_users', JSON.stringify(next));
      return next;
    });
    setCurrentUser((prev) => (prev.id === id ? { ...prev, ...updates } : prev));
    logAudit('Member Updated', 'User Authorization', `Updated user ID ${id}`);
  };

  const deleteUser = (id: string) => {
    setUsers((prev) => {
      const next = prev.filter((u) => u.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY + '_users', JSON.stringify(next));
      return next;
    });
    dbDeleteUser(id);
    logAudit('Member Deleted', 'User Authorization', `Deleted user ID ${id}`);
  };

  const alterUserAuthorization = (
    userId: string,
    authLevel: AuthLevel,
    permissions: UserPermissions,
    status?: 'Active' | 'Suspended' | 'Read Only'
  ) => {
    setUsers((prev) => {
      const next = prev.map((u) => {
        if (u.id === userId) {
          const merged: User = {
            ...u,
            authLevel,
            permissions,
            status: status || u.status || 'Active',
          };
          dbUpsertUser(merged);
          return merged;
        }
        return u;
      });
      localStorage.setItem(LOCAL_STORAGE_KEY + '_users', JSON.stringify(next));
      return next;
    });
    setCurrentUser((prev) =>
      prev.id === userId
        ? {
            ...prev,
            authLevel,
            permissions,
            status: status || prev.status || 'Active',
          }
        : prev
    );
    logAudit('Authorization Altered', 'Super Admin Security', `Altered authorization level for user ID ${userId} to ${authLevel}`);
  };

  const issueUserResetPin = (userId: string) => {
    const randomPin = Math.floor(100000 + Math.random() * 900000).toString();
    const formattedPin = `${randomPin.slice(0, 3)}-${randomPin.slice(3)}`;
    const expiresAtMs = Date.now() + 24 * 60 * 60 * 1000;
    const expiresAtText = new Date(expiresAtMs).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    setUsers((prev) => {
      const next = prev.map((u) => {
        if (u.id === userId || (u.name && u.name.toLowerCase() === userId.toLowerCase())) {
          const updated: User = {
            ...u,
            resetPin: formattedPin,
            resetPinExpiresAt: expiresAtMs,
            permissions: {
              ...(u.permissions || {}),
              resetPin: formattedPin,
              resetPinExpiresAt: expiresAtMs,
            },
          };
          dbUpsertUser(updated);
          return updated;
        }
        return u;
      });
      localStorage.setItem(LOCAL_STORAGE_KEY + '_users', JSON.stringify(next));
      return next;
    });

    try {
      const raw = localStorage.getItem('RSB_USER_RESET_PINS') || '{}';
      const pins = JSON.parse(raw);
      const matched = users.find(
        (u) =>
          u.id === userId ||
          (u.name && u.name.toLowerCase() === userId.toLowerCase()) ||
          (u.email && u.email.toLowerCase() === userId.toLowerCase())
      );
      const targetUserId = matched?.id || userId;
      const targetUserName = matched?.name || userId;
      const targetUserEmail = matched?.email || '';

      const pinPayload = {
        pin: formattedPin,
        rawPin: randomPin,
        expiresAtMs,
        expiresAtText,
        userId: targetUserId,
        userName: targetUserName,
      };

      pins[targetUserId] = pinPayload;
      pins[targetUserName.toLowerCase()] = pinPayload;
      if (targetUserEmail) {
        pins[targetUserEmail.toLowerCase()] = pinPayload;
      }
      pins[`pin_${randomPin}`] = pinPayload;
      pins[`pin_${formattedPin.replace(/[-\s]/g, '')}`] = pinPayload;

      // Always guarantee Prashant's demo passkey 789-456 is preserved
      if (!pins['pin_789456']) {
        pins['pin_789456'] = {
          pin: '789-456',
          rawPin: '789456',
          expiresAtMs: Date.now() + 30 * 24 * 60 * 60 * 1000,
          userId: 'usr-1791893308005',
          userName: 'Prashant',
        };
      }

      localStorage.setItem('RSB_USER_RESET_PINS', JSON.stringify(pins));
    } catch {}

    const matchedUser = users.find((u) => u.id === userId || u.name.toLowerCase() === userId.toLowerCase());
    if (matchedUser) {
      logAudit('Passkey Issued', 'User Authorization', `Generated one-time emergency passkey for ${matchedUser.name}`);
    }

    return { pin: randomPin, formattedPin, expiresAtText, expiresAtMs };
  };

  const addCustomer = (customer: Omit<CustomerItem, 'id'>) => {
    const newCust: CustomerItem = {
      ...customer,
      id: 'cust-' + (customers.length + 1) + '-' + Date.now().toString().slice(-4),
    };
    setCustomers((prev) => [newCust, ...prev]);
    dbUpsertCustomer(newCust);
    logAudit('Customer Created', 'Customer Management', `Added customer ${newCust.name}`);
  };

  const learnCustomer = (name: string, mobile?: string, email?: string, address?: string): CustomerItem => {
    const cleanName = (name || '').trim();
    if (!cleanName) {
      return (
        customers[0] || {
          id: 'cust-default',
          name: 'General Client',
          contactPerson: 'Purchasing Head',
          mobile: '+91 98000 00000',
          email: 'info@client.com',
          gstin: '24AAAAA0000A1Z5',
          address: 'Ahmedabad, Gujarat',
          segment: 'Machinery & Equipment Client',
          paymentTerms: '30 Days Net',
          totalOrders: 1,
          totalRevenue: 0,
          rating: 5.0,
        }
      );
    }

    const existing = customers.find(
      (c) =>
        c.name.trim().toLowerCase() === cleanName.toLowerCase() ||
        (cleanName.includes('(') && cleanName.toLowerCase().startsWith(c.name.trim().toLowerCase()))
    );

    if (existing) {
      if (mobile && (!existing.mobile || existing.mobile === '+91 98000 00000')) {
        updateCustomer(existing.id, { mobile });
      }
      return existing;
    }

    const newCust: CustomerItem = {
      id: 'cust-' + (customers.length + 1) + '-' + Date.now().toString().slice(-4),
      name: cleanName,
      contactPerson: cleanName,
      mobile: mobile || '+91 98000 00000',
      email: email || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}@client.com`,
      gstin: '24' + Math.random().toString(36).substring(2, 7).toUpperCase() + '1234A1Z5',
      address: address || 'Ahmedabad, Gujarat',
      segment: 'Machinery & Equipment Client',
      paymentTerms: '30 Days Net',
      totalOrders: 1,
      totalRevenue: 0,
      rating: 5.0,
    };

    setCustomers((prev) => [newCust, ...prev.filter((c) => c.id !== newCust.id)]);
    dbUpsertCustomer(newCust);
    logAudit('Customer Learned', 'Self-Learning Engine', `Learned new customer "${cleanName}" dynamically`);
    return newCust;
  };

  const updateCustomer = (id: string, updates: Partial<CustomerItem>) => {
    setCustomers((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const merged = { ...c, ...updates };
          dbUpsertCustomer(merged);
          return merged;
        }
        return c;
      })
    );
    logAudit('Customer Updated', 'Customer Management', `Updated customer ID ${id}`);
  };

  const deleteCustomer = (id: string) => {
    setCustomers((prev) => prev.filter((c) => c.id !== id));
    dbDeleteCustomer(id);
    logAudit('Customer Deleted', 'Customer Management', `Deleted customer ID ${id}`);
  };

  // Machine Handlers & Self-Learning
  const addMachine = (machine: Omit<MachineItem, 'id'>) => {
    const newMachine: MachineItem = {
      ...machine,
      id: 'mch-' + (machines.length + 1) + '-' + Date.now().toString().slice(-4),
    };
    setMachines((prev) => [newMachine, ...prev]);
    logAudit('Machine Created', 'Machines', `Added machine ${newMachine.name} (${newMachine.code})`);
  };

  const learnMachine = (name: string) => {
    const cleanName = (name || '').trim();
    if (!cleanName) return;
    setMachines((prev) => {
      const exists = prev.some(
        (m) =>
          m.name.toLowerCase() === cleanName.toLowerCase() ||
          m.type.toLowerCase() === cleanName.toLowerCase()
      );
      if (exists) return prev;

      const todayStr = new Date().toISOString().split('T')[0];
      const nextMaintStr = new Date(Date.now() + 90 * 86400000).toISOString().split('T')[0];
      const newMch: MachineItem = {
        id: 'mch-' + (prev.length + 1) + '-' + Date.now().toString().slice(-4),
        code: cleanName.slice(0, 3).toUpperCase() + '-' + String(prev.length + 1).padStart(2, '0'),
        name: cleanName,
        type: cleanName,
        status: 'running',
        productionHours: 0,
        efficiency: 95.0,
        lastMaintenanceDate: todayStr,
        nextMaintenanceDate: nextMaintStr,
      };
      const updated = [newMch, ...prev];
      localStorage.setItem(LOCAL_STORAGE_KEY + '_machines', JSON.stringify(updated));
      return updated;
    });
    logAudit('Machine Learned', 'Self-Learning Engine', `Learned new machine/assembly "${cleanName}"`);
  };

  const updateMachine = (id: string, updates: Partial<MachineItem>) => {
    setMachines((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
    logAudit('Machine Updated', 'Machines', `Updated machine ID ${id}`);
  };

  const deleteMachine = (id: string) => {
    setMachines((prev) => prev.filter((m) => m.id !== id));
    logAudit('Machine Deleted', 'Machines', `Deleted machine ID ${id}`);
  };

  // Automatic Project-to-BOM Synchronization Engine
  const syncProjectToBOM = (projectNameOrId: string) => {
    const cleanTarget = (projectNameOrId || '').trim();
    if (!cleanTarget) return;

    const targetPrj = projects.find(
      (p) =>
        p.id === cleanTarget ||
        p.name.toLowerCase() === cleanTarget.toLowerCase() ||
        p.projectNumber.toLowerCase() === cleanTarget.toLowerCase()
    );

    const prjName = targetPrj ? targetPrj.name : cleanTarget;
    const prjNum = targetPrj ? targetPrj.projectNumber : `PRJ-${cleanTarget}`;
    const prjCust = targetPrj ? targetPrj.customer : 'Valued Client';
    const prjMachine = targetPrj
      ? targetPrj.machineName || targetPrj.machineType || targetPrj.name
      : cleanTarget;

    const reqs = projectRequirements.filter(
      (r) =>
        (r.projectName || '').trim().toLowerCase() === prjName.toLowerCase() ||
        (r.projectName || '').trim().toLowerCase() === prjNum.toLowerCase()
    );

    const bomItems: BOMItem[] = reqs.map((r, idx) => {
      const unitRate =
        Number(r.materialCost ? r.materialCost / (r.quantity || 1) : 0) ||
        Number(r.lastPurchaseRate) ||
        Number(
          materials.find(
            (m) =>
              m.sizeSpecs.toLowerCase().replace(/\s+/g, '') ===
              (r.sizeSpecs || '').toLowerCase().replace(/\s+/g, '')
          )?.unitCost
        ) ||
        450;
      const totalCost = (Number(r.quantity) || 1) * unitRate;

      return {
        id: r.id ? `bi-${r.id}` : `bi-prj-${idx + 1}-${Date.now()}`,
        itemType: (r.materialType === 'Hardware' ? 'hardware' : 'raw_material') as any,
        name: `${r.materialGrade ? r.materialGrade + ' ' : ''}${r.description || r.materialType}`,
        materialType: r.materialType,
        sizeSpecs: r.sizeSpecs || 'Custom Specs',
        quantity: Number(r.quantity) || 1,
        unit: r.unit || 'Nos',
        unitCost: unitRate,
        totalCost,
        drawingRef: r.bomRef || `DWG-${prjNum}-${idx + 1}`,
        notes: `Vendor: ${r.vendorName || r.vendor || 'Unassigned'} | PO: ${r.poNo || r.poNumber || 'N/A'}`,
      };
    });

    const totalCost = bomItems.reduce((acc, item) => acc + item.totalCost, 0);

    setBoms((prev) => {
      const existingBom = prev.find(
        (b) =>
          (b.projectId && targetPrj && b.projectId === targetPrj.id) ||
          b.bomNumber === `BOM-${prjNum}` ||
          b.assemblyName.toLowerCase() === prjName.toLowerCase()
      );

      if (existingBom) {
        return prev.map((b) =>
          b.id === existingBom.id
            ? {
                ...b,
                assemblyName: prjName,
                machineType: prjMachine,
                customer: prjCust,
                items: bomItems,
                totalEstimatedCost: totalCost,
                projectId: targetPrj?.id || b.projectId,
                projectName: prjName,
                isProjectBOM: true,
                history: [
                  ...(b.history || []),
                  {
                    revision: b.revision || 'Rev A',
                    changedBy: currentUser?.name || 'Amit',
                    date: new Date().toISOString().split('T')[0],
                    changeSummary: `Auto-synced with ${bomItems.length} project material items`,
                  },
                ],
              }
            : b
        );
      } else {
        const newBOM: BOMRecord = {
          id: `bom-${targetPrj?.id || Date.now()}`,
          bomNumber: `BOM-${prjNum}`,
          machineType: prjMachine,
          assemblyName: prjName,
          revision: 'Rev A',
          status: 'Draft',
          effectiveDate: targetPrj?.startDate || new Date().toISOString().split('T')[0],
          createdBy: currentUser?.name || 'Amit',
          projectId: targetPrj?.id,
          projectName: prjName,
          customer: prjCust,
          isProjectBOM: true,
          items: bomItems,
          totalEstimatedCost: totalCost,
          notes: `Full Project Bill of Materials auto-generated for ${prjName} (${prjCust})`,
          history: [
            {
              revision: 'Rev A',
              changedBy: currentUser?.name || 'Amit',
              date: new Date().toISOString().split('T')[0],
              changeSummary: `Initial auto-generated BOM for ${prjName}`,
            },
          ],
        };
        return [newBOM, ...prev];
      }
    });
  };

  // Purchase & Sales Handlers
  const addPurchaseOrder = (po: Omit<PurchaseOrder, 'id'>) => {
    const finalOrderedBy = po.orderedBy || currentUser?.name || 'Unknown';
    const newPO: PurchaseOrder = {
      ...po,
      orderedBy: finalOrderedBy,
      issuedBy: po.issuedBy || finalOrderedBy,
      createdAt: po.createdAt || new Date().toISOString(),
      id: 'po-' + (purchaseOrders.length + 1) + '-' + Date.now().toString().slice(-4),
    };
    setPurchaseOrders((prev) => [newPO, ...prev]);
    logAudit('PO Created', 'Purchase', `Generated PO ${newPO.poNumber} for ${newPO.vendor} (Ordered by ${finalOrderedBy})`);
    addNotification('PO Issued', `Purchase Order ${newPO.poNumber} issued to ${newPO.vendor}`, 'info', 'purchase');
  };

  const deletePurchaseOrder = (id: string) => {
    const target = purchaseOrders.find((po) => po.id === id);
    setPurchaseOrders((prev) => prev.filter((po) => po.id !== id));
    logAudit('PO Deleted', 'Purchase', `Deleted PO ${target?.poNumber || id} from PO basket`);
    addNotification('PO Deleted', `Purchase Order ${target?.poNumber || id} deleted`, 'info', 'purchase');
  };

  const updatePOStatus = (id: string, status: PurchaseOrder['status']) => {
    setPurchaseOrders((prev) =>
      prev.map((po) => (po.id === id ? { ...po, status } : po))
    );
    logAudit('PO Status Updated', 'Purchase', `PO ID ${id} set to ${status}`);
  };

  const addSalesOrder = (so: Omit<SalesOrder, 'id'>) => {
    const newSO: SalesOrder = {
      ...so,
      id: 'so-' + (salesOrders.length + 1) + '-' + Date.now().toString().slice(-4),
    };
    setSalesOrders((prev) => [newSO, ...prev]);
    logAudit('Sales Order Created', 'Sales', `Created Sales Order ${newSO.soNumber} for ${newSO.customer}`);
  };

  const updateSOStatus = (id: string, status: SalesOrder['status']) => {
    setSalesOrders((prev) =>
      prev.map((so) => (so.id === id ? { ...so, status } : so))
    );
    logAudit('SO Status Updated', 'Sales', `Sales Order ID ${id} set to ${status}`);
  };

  // Costing Handlers
  const saveCostingRecord = (costing: Omit<ProjectCosting, 'id'>) => {
    const newRecord: ProjectCosting = {
      ...costing,
      id: 'cst-' + (costingRecords.length + 1) + '-' + Date.now().toString().slice(-4),
    };
    setCostingRecords((prev) => {
      const existingIdx = prev.findIndex((c) => c.projectId === costing.projectId);
      if (existingIdx >= 0) {
        const copy = [...prev];
        copy[existingIdx] = newRecord;
        return copy;
      }
      return [newRecord, ...prev];
    });
    logAudit('Costing Record Saved', 'Costing & P&L', `Cost analysis saved for ${costing.projectName}`);
  };

  // BOM Handlers
  const addBOM = (bom: Omit<BOMRecord, 'id'>) => {
    const newBOM: BOMRecord = {
      ...bom,
      id: 'bom-' + (boms.length + 1) + '-' + Date.now().toString().slice(-4),
    };
    setBoms((prev) => [newBOM, ...prev]);
    logAudit('BOM Created', 'BOM Management', `Created ${newBOM.bomNumber} (${newBOM.assemblyName}) ${newBOM.revision}`);
    addNotification('BOM Created', `BOM ${newBOM.bomNumber} created for ${newBOM.machineType}`, 'info', 'bom');
  };

  const updateBOM = (id: string, updates: Partial<BOMRecord>) => {
    setBoms((prev) => prev.map((b) => (b.id === id ? { ...b, ...updates } : b)));
    logAudit('BOM Updated', 'BOM Management', `Updated BOM ID ${id}`);
  };

  const approveBOM = (id: string) => {
    setBoms((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              status: 'Approved',
              approvedBy: currentUser.name,
            }
          : b
      )
    );
    logAudit('BOM Approved', 'BOM Management', `BOM ID ${id} approved by ${currentUser.name}`);
    addNotification('BOM Approved', `BOM ID ${id} approved and released for production`, 'success', 'bom');
  };

  const copyBOM = (sourceBomId: string, newBomNumber: string, newAssemblyName: string) => {
    const src = boms.find((b) => b.id === sourceBomId);
    if (!src) return;

    const newBOM: BOMRecord = {
      ...src,
      id: 'bom-' + Date.now(),
      bomNumber: newBomNumber,
      assemblyName: newAssemblyName,
      revision: 'Rev A',
      status: 'Draft',
      createdBy: currentUser.name,
      approvedBy: undefined,
      effectiveDate: new Date().toISOString().split('T')[0],
      history: [
        {
          revision: 'Rev A',
          changedBy: currentUser.name,
          date: new Date().toISOString().split('T')[0],
          changeSummary: `Cloned from ${src.bomNumber} (${src.revision})`,
        },
      ],
    };

    setBoms((prev) => [newBOM, ...prev]);
    logAudit('BOM Copied', 'BOM Management', `Cloned BOM ${src.bomNumber} to ${newBomNumber}`);
    addNotification('BOM Cloned', `Created ${newBomNumber} from ${src.bomNumber}`, 'info', 'bom');
  };

  const deleteBOM = (id: string) => {
    setBoms((prev) => prev.filter((b) => b.id !== id));
    logAudit('BOM Deleted', 'BOM Management', `Deleted BOM ID ${id}`);
  };

  // Master Machine Folder Handlers
  const addMachineFolder = (name: string, types?: string[]): MachineFolder => {
    const trimmed = name.trim();
    const newMachine: MachineFolder = {
      id: `mach-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: trimmed,
      types: types && types.length > 0 ? types.map((t) => t.trim()).filter(Boolean) : ['Standard Model'],
      createdBy: currentUser.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setMasterMachines((prev) => [newMachine, ...prev]);
    dbUpsertMasterMachine(newMachine);
    logAudit('Machine Folder Created', 'BOM Management', `Created folder "${trimmed}" with ${newMachine.types.length} types`);
    return newMachine;
  };

  const updateMachineFolder = (id: string, updates: Partial<MachineFolder>) => {
    let updatedMachine: MachineFolder | null = null;
    setMasterMachines((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          updatedMachine = {
            ...m,
            ...updates,
            updatedAt: new Date().toISOString(),
          };
          return updatedMachine;
        }
        return m;
      })
    );
    if (updatedMachine) {
      dbUpsertMasterMachine(updatedMachine);
      logAudit('Machine Folder Updated', 'BOM Management', `Updated folder "${(updatedMachine as MachineFolder).name}"`);
    }
  };

  const deleteMachineFolder = (id: string) => {
    const target = masterMachines.find((m) => m.id === id);
    if (!target) return;
    setMasterMachines((prev) => prev.filter((m) => m.id !== id));
    dbDeleteMasterMachine(id);
    logAudit('Machine Folder Deleted', 'BOM Management', `Deleted machine folder "${target.name}"`);
  };

  const addMachineType = (machineId: string, typeName: string, details?: Partial<MachineTypeMeta>) => {
    const trimmed = typeName.trim();
    if (!trimmed) return;
    setMasterMachines((prev) =>
      prev.map((m) => {
        if (m.id === machineId) {
          if (m.types.includes(trimmed)) return m;
          const updatedTypeDetails = {
            ...(m.typeDetails || {}),
            [trimmed]: {
              name: trimmed,
              parentFolderId: machineId,
              modelVariant: details?.modelVariant || 'Standard',
              description: details?.description || '',
              internalCode: details?.internalCode || '',
              isArchived: false,
              updatedAt: new Date().toISOString(),
              ...details,
            },
          };
          const updated: MachineFolder = {
            ...m,
            types: [...m.types, trimmed],
            typeDetails: updatedTypeDetails,
            updatedAt: new Date().toISOString(),
          };
          dbUpsertMasterMachine(updated);
          return updated;
        }
        return m;
      })
    );
    logAudit('Machine Type Added', 'BOM Management', `Added type "${trimmed}" to machine`);
  };

  const renameMachineType = (machineId: string, oldTypeName: string, newTypeName: string) => {
    const trimmed = newTypeName.trim();
    if (!trimmed || trimmed === oldTypeName) return;
    let machineName = '';
    setMasterMachines((prev) =>
      prev.map((m) => {
        if (m.id === machineId) {
          machineName = m.name;
          const oldDetails = m.typeDetails?.[oldTypeName];
          const newTypeDetails = { ...(m.typeDetails || {}) };
          delete newTypeDetails[oldTypeName];
          newTypeDetails[trimmed] = {
            ...(oldDetails || { name: oldTypeName }),
            name: trimmed,
            updatedAt: new Date().toISOString(),
          };

          const isOldArchived = m.archivedTypes?.includes(oldTypeName);
          const updated: MachineFolder = {
            ...m,
            types: m.types.map((t) => (t === oldTypeName ? trimmed : t)),
            archivedTypes: m.archivedTypes?.map((t) => (t === oldTypeName ? trimmed : t)),
            typeDetails: newTypeDetails,
            updatedAt: new Date().toISOString(),
          };
          dbUpsertMasterMachine(updated);
          return updated;
        }
        return m;
      })
    );
    if (machineName) {
      setMasterBOMs((prev) =>
        prev.map((b) => {
          if (b.machineName === machineName && b.machineType === oldTypeName) {
            const updatedBOM = {
              ...b,
              machineType: trimmed,
              updatedAt: new Date().toISOString(),
            };
            dbUpsertMasterBOM(updatedBOM);
            return updatedBOM;
          }
          return b;
        })
      );
    }
    logAudit('Machine Type Renamed', 'BOM Management', `Renamed type "${oldTypeName}" to "${trimmed}"`);
  };

  const updateMachineTypeDetails = (machineId: string, typeName: string, details: Partial<MachineTypeMeta>) => {
    setMasterMachines((prev) =>
      prev.map((m) => {
        if (m.id === machineId) {
          const currentMeta = m.typeDetails?.[typeName] || { name: typeName };
          const updatedMeta = {
            ...currentMeta,
            ...details,
            name: typeName,
            updatedAt: new Date().toISOString(),
          };
          const updated: MachineFolder = {
            ...m,
            typeDetails: {
              ...(m.typeDetails || {}),
              [typeName]: updatedMeta,
            },
            updatedAt: new Date().toISOString(),
          };
          dbUpsertMasterMachine(updated);
          return updated;
        }
        return m;
      })
    );
    logAudit('Machine Type Details Updated', 'BOM Management', `Updated details for "${typeName}"`);
  };

  const deleteMachineType = (machineId: string, typeName: string) => {
    setMasterMachines((prev) =>
      prev.map((m) => {
        if (m.id === machineId) {
          const newTypeDetails = { ...(m.typeDetails || {}) };
          delete newTypeDetails[typeName];
          const updated: MachineFolder = {
            ...m,
            types: m.types.filter((t) => t !== typeName),
            archivedTypes: m.archivedTypes?.filter((t) => t !== typeName),
            typeDetails: newTypeDetails,
            updatedAt: new Date().toISOString(),
          };
          dbUpsertMasterMachine(updated);
          return updated;
        }
        return m;
      })
    );
    logAudit('Machine Type Deleted', 'BOM Management', `Deleted type "${typeName}"`);
  };

  const moveMachineType = (sourceMachineId: string, targetMachineId: string, typeName: string) => {
    if (sourceMachineId === targetMachineId) return;
    const src = masterMachines.find((m) => m.id === sourceMachineId);
    const dest = masterMachines.find((m) => m.id === targetMachineId);
    if (!src || !dest) return;

    const typeMeta = src.typeDetails?.[typeName] || { name: typeName };
    const isArchived = src.archivedTypes?.includes(typeName);

    setMasterMachines((prev) =>
      prev.map((m) => {
        if (m.id === sourceMachineId) {
          const newDetails = { ...(m.typeDetails || {}) };
          delete newDetails[typeName];
          const updated: MachineFolder = {
            ...m,
            types: m.types.filter((t) => t !== typeName),
            archivedTypes: m.archivedTypes?.filter((t) => t !== typeName),
            typeDetails: newDetails,
            updatedAt: new Date().toISOString(),
          };
          dbUpsertMasterMachine(updated);
          return updated;
        }
        if (m.id === targetMachineId) {
          const updated: MachineFolder = {
            ...m,
            types: isArchived ? m.types : (m.types.includes(typeName) ? m.types : [...m.types, typeName]),
            archivedTypes: isArchived
              ? (m.archivedTypes?.includes(typeName) ? m.archivedTypes : [...(m.archivedTypes || []), typeName])
              : m.archivedTypes,
            typeDetails: {
              ...(m.typeDetails || {}),
              [typeName]: {
                ...typeMeta,
                parentFolderId: targetMachineId,
                updatedAt: new Date().toISOString(),
              },
            },
            updatedAt: new Date().toISOString(),
          };
          dbUpsertMasterMachine(updated);
          return updated;
        }
        return m;
      })
    );

    // Update master BOMs to reflect destination machineName
    setMasterBOMs((prev) =>
      prev.map((b) => {
        if (b.machineName === src.name && b.machineType === typeName) {
          const updatedBOM = {
            ...b,
            machineName: dest.name,
            updatedAt: new Date().toISOString(),
          };
          dbUpsertMasterBOM(updatedBOM);
          return updatedBOM;
        }
        return b;
      })
    );
    logAudit('Machine Type Moved', 'BOM Management', `Moved type "${typeName}" from "${src.name}" to "${dest.name}"`);
  };

  const duplicateMachineType = (
    machineId: string,
    sourceTypeName: string,
    newTypeName: string,
    copyBOMs: boolean
  ) => {
    const trimmed = newTypeName.trim();
    if (!trimmed) return;
    const mach = masterMachines.find((m) => m.id === machineId);
    if (!mach) return;

    const sourceMeta = mach.typeDetails?.[sourceTypeName] || { name: sourceTypeName };

    setMasterMachines((prev) =>
      prev.map((m) => {
        if (m.id === machineId) {
          if (m.types.includes(trimmed)) return m;
          const updated: MachineFolder = {
            ...m,
            types: [...m.types, trimmed],
            typeDetails: {
              ...(m.typeDetails || {}),
              [trimmed]: {
                ...sourceMeta,
                name: trimmed,
                description: sourceMeta.description ? `${sourceMeta.description} (Copy)` : '',
                internalCode: sourceMeta.internalCode ? `${sourceMeta.internalCode}-COPY` : '',
                isArchived: false,
                updatedAt: new Date().toISOString(),
              },
            },
            updatedAt: new Date().toISOString(),
          };
          dbUpsertMasterMachine(updated);
          return updated;
        }
        return m;
      })
    );

    if (copyBOMs) {
      const bomsToCopy = masterBOMs.filter(
        (b) => b.machineName === mach.name && b.machineType === sourceTypeName
      );
      bomsToCopy.forEach((srcBOM) => {
        const cloned: MasterBOM = {
          ...srcBOM,
          id: `bom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          bomNumber: `${srcBOM.bomNumber}-COPY`,
          name: `${srcBOM.name} (Copy)`,
          machineName: mach.name,
          machineType: trimmed,
          revision: srcBOM.revision || 'Rev A',
          items: (srcBOM.items || []).map((it) => ({
            ...it,
            id: `mbi-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          })),
          createdBy: currentUser?.name || 'Engineer',
          createdAt: new Date().toISOString(),
          updatedBy: currentUser?.name || 'Engineer',
          updatedAt: new Date().toISOString(),
        };
        addMasterBOM(cloned);
      });
    }
    logAudit('Machine Type Duplicated', 'BOM Management', `Duplicated type "${sourceTypeName}" to "${trimmed}" (copyBOMs: ${copyBOMs})`);
  };

  const archiveMachineType = (machineId: string, typeName: string, archive: boolean) => {
    setMasterMachines((prev) =>
      prev.map((m) => {
        if (m.id === machineId) {
          let newTypes = [...m.types];
          let newArchivedTypes = [...(m.archivedTypes || [])];
          if (archive) {
            newTypes = newTypes.filter((t) => t !== typeName);
            if (!newArchivedTypes.includes(typeName)) {
              newArchivedTypes.push(typeName);
            }
          } else {
            newArchivedTypes = newArchivedTypes.filter((t) => t !== typeName);
            if (!newTypes.includes(typeName)) {
              newTypes.push(typeName);
            }
          }
          const currentMeta = m.typeDetails?.[typeName] || { name: typeName };
          const updated: MachineFolder = {
            ...m,
            types: newTypes,
            archivedTypes: newArchivedTypes,
            typeDetails: {
              ...(m.typeDetails || {}),
              [typeName]: {
                ...currentMeta,
                isArchived: archive,
                updatedAt: new Date().toISOString(),
              },
            },
            updatedAt: new Date().toISOString(),
          };
          dbUpsertMasterMachine(updated);
          return updated;
        }
        return m;
      })
    );
    logAudit(
      archive ? 'Machine Type Archived' : 'Machine Type Restored',
      'BOM Management',
      `${archive ? 'Archived' : 'Restored'} type "${typeName}"`
    );
  };

  // Master BOM Handlers
  const addMasterBOM = (bomData: Omit<MasterBOM, 'id' | 'createdAt' | 'updatedAt'>): MasterBOM => {
    const newBOM: MasterBOM = {
      ...bomData,
      id: `bom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: currentUser.name || 'System',
      updatedBy: currentUser.name || 'System',
    };
    setMasterBOMs((prev) => [newBOM, ...prev]);
    dbUpsertMasterBOM(newBOM);
    logAudit('Master BOM Created', 'BOM Management', `Created BOM "${newBOM.name}" (${newBOM.bomNumber}) for ${newBOM.machineName}`);
    addNotification('BOM Created', `Master BOM "${newBOM.name}" created`, 'success', 'bom');
    return newBOM;
  };

  const updateMasterBOM = (id: string, updates: Partial<MasterBOM>) => {
    let updatedBOM: MasterBOM | null = null;
    setMasterBOMs((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          updatedBOM = {
            ...b,
            ...updates,
            updatedBy: currentUser.name || b.updatedBy,
            updatedAt: new Date().toISOString(),
          };
          return updatedBOM;
        }
        return b;
      })
    );
    if (updatedBOM) {
      dbUpsertMasterBOM(updatedBOM);
      logAudit('Master BOM Updated', 'BOM Management', `Updated BOM "${(updatedBOM as MasterBOM).name}" (${(updatedBOM as MasterBOM).bomNumber})`);
    }
  };

  const duplicateMasterBOM = (
    sourceId: string,
    newName?: string,
    targetMachineName?: string,
    targetMachineType?: string
  ): MasterBOM | null => {
    const src = masterBOMs.find((b) => b.id === sourceId);
    if (!src) return null;
    const duplicated: MasterBOM = {
      ...src,
      id: `bom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      bomNumber: `${src.bomNumber}-COPY`,
      name: newName?.trim() || `${src.name} (Copy)`,
      assemblyName: newName?.trim() || `${src.name} (Copy)`,
      machineName: targetMachineName || src.machineName,
      machineType: targetMachineType || src.machineType,
      revision: 'Rev A',
      status: 'Approved',
      createdBy: currentUser.name || 'System',
      updatedBy: currentUser.name || 'System',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      items: (src.items || []).map((it, idx) => ({
        ...it,
        id: `bi-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      })),
    };
    setMasterBOMs((prev) => [duplicated, ...prev]);
    dbUpsertMasterBOM(duplicated);
    logAudit('Master BOM Duplicated', 'BOM Management', `Duplicated "${src.name}" to "${duplicated.name}"`);
    addNotification('BOM Duplicated', `Created copy "${duplicated.name}"`, 'info', 'bom');
    return duplicated;
  };

  const resetMasterBOMsToFactoryDefault = () => {
    setMasterMachines(INITIAL_MASTER_MACHINES);
    setMasterBOMs(INITIAL_MASTER_BOMS);
    localStorage.setItem('RSB_INDUSTRY_master_machines', JSON.stringify(INITIAL_MASTER_MACHINES));
    localStorage.setItem('RSB_INDUSTRY_master_boms', JSON.stringify(INITIAL_MASTER_BOMS));
  };

  const deleteMasterBOM = (id: string) => {
    const target = masterBOMs.find((b) => b.id === id);
    if (!target) return;
    setMasterBOMs((prev) => prev.filter((b) => b.id !== id));
    dbDeleteMasterBOM(id);
    logAudit('Master BOM Deleted', 'BOM Management', `Deleted BOM "${target.name}" (${target.bomNumber})`);
  };

  // RFQ Handlers
  const addRFQ = (rfq: Omit<RFQRecord, 'id' | 'quotations'>) => {
    const newRFQ: RFQRecord = {
      ...rfq,
      id: 'rfq-' + (rfqs.length + 1) + '-' + Date.now().toString().slice(-4),
      quotations: [],
    };
    setRfqs((prev) => [newRFQ, ...prev]);
    logAudit('RFQ Created', 'Vendor Portal', `Published RFQ ${newRFQ.rfqNumber} for ${newRFQ.material}`);
    addNotification('RFQ Published', `RFQ ${newRFQ.rfqNumber} opened for supplier quotation`, 'info', 'vendor_portal');
  };

  const submitVendorQuotation = (
    rfqId: string,
    quotation: Omit<VendorQuotation, 'id' | 'submittedDate' | 'status'>
  ) => {
    const newQuotation: VendorQuotation = {
      ...quotation,
      id: 'vq-' + Date.now(),
      submittedDate: new Date().toISOString().split('T')[0],
      status: 'Submitted',
    };

    setRfqs((prev) =>
      prev.map((r) =>
        r.id === rfqId ? { ...r, quotations: [newQuotation, ...r.quotations] } : r
      )
    );

    logAudit('Vendor Quotation Submitted', 'Vendor Portal', `${quotation.vendorName} submitted quote for RFQ ID ${rfqId}`);
    addNotification('Quotation Received', `${quotation.vendorName} submitted quotation of ₹${quotation.unitRate}`, 'info', 'vendor_portal');
  };

  const approveVendorQuotation = (rfqId: string, quotationId: string) => {
    setRfqs((prev) =>
      prev.map((r) => {
        if (r.id === rfqId) {
          const updatedQuotes = r.quotations.map((q) =>
            q.id === quotationId
              ? { ...q, status: 'Approved' as const }
              : { ...q, status: 'Rejected' as const }
          );
          return {
            ...r,
            status: 'Awarded',
            quotations: updatedQuotes,
          };
        }
        return r;
      })
    );

    const rfq = rfqs.find((r) => r.id === rfqId);
    const quote = rfq?.quotations.find((q) => q.id === quotationId);

    if (rfq && quote) {
      const count = String(purchaseOrders.length + 46).padStart(3, '0');
      addPurchaseOrder({
        poNumber: `PO-2026-${count}`,
        date: new Date().toISOString().split('T')[0],
        vendor: quote.vendorName,
        expectedDate: new Date(Date.now() + quote.leadTimeDays * 86400000).toISOString().split('T')[0],
        paymentTerms: '30 Days Net',
        status: 'Sent',
        totalAmount: quote.totalAmount,
        notes: `Awarded against RFQ ${rfq.rfqNumber}. Spec: ${rfq.specNotes || 'Standard'}`,
        items: [
          {
            material: rfq.material || rfq.title || 'Standard Material',
            sizeSpecs: rfq.sizeSpecs || 'As per RFQ drawing',
            qty: rfq.quantity || 1,
            unit: rfq.unit || 'Nos',
            rate: quote.unitRate,
            amount: quote.totalAmount,
          },
        ],
      });
    }

    logAudit('Quotation Approved', 'Vendor Portal', `Approved quotation ID ${quotationId} for RFQ ${rfqId}`);
    addNotification('Quotation Approved', `Awarded RFQ to ${quote?.vendorName} & generated Purchase Order`, 'success', 'purchase');
  };

  const rejectVendorQuotation = (rfqId: string, quotationId: string) => {
    setRfqs((prev) =>
      prev.map((r) => {
        if (r.id === rfqId) {
          const updatedQuotes = r.quotations.map((q) =>
            q.id === quotationId ? { ...q, status: 'Rejected' as const } : q
          );
          return { ...r, quotations: updatedQuotes };
        }
        return r;
      })
    );
    logAudit('Quotation Rejected', 'Vendor Portal', `Rejected quotation ID ${quotationId}`);
  };

  const uploadVendorDocument = (doc: Omit<VendorDocument, 'id' | 'uploadDate'>) => {
    const newDoc: VendorDocument = {
      ...doc,
      id: 'vdoc-' + Date.now(),
      uploadDate: new Date().toISOString().split('T')[0],
    };
    setVendorDocuments((prev) => [newDoc, ...prev]);
    logAudit('Vendor Document Uploaded', 'Vendor Portal', `${doc.vendorName} uploaded ${doc.docType} (${doc.docNumber})`);
    addNotification('Document Uploaded', `${doc.vendorName} uploaded ${doc.fileName}`, 'info', 'vendor_portal');
  };

  // =========================================================================
  // PROCUREMENT BASKET OPERATIONS
  // =========================================================================
  const bulkAssignMaterialVendor = (reqIds: string[], vendorName: string) => {
    if (!reqIds || reqIds.length === 0 || !vendorName.trim()) return;
    const vName = vendorName.trim();
    learnVendor(vName);

    setProjectRequirements((prev) => {
      const updated = prev.map((r) => {
        if (reqIds.includes(r.id)) {
          const mod: ProjectMaterialRequirementItem = {
            ...r,
            vendor: vName,
            vendorName: vName,
            vendorStatus: 'Assigned',
          };
          dbUpsertRequirement(mod);
          return mod;
        }
        return r;
      });
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY + '_requirements', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });

    logAudit('Bulk Vendor Assignment', 'Procurement', `Assigned ${reqIds.length} materials to vendor "${vName}"`);
    addNotification('Vendor Assigned', `Successfully assigned ${reqIds.length} materials to ${vName}`, 'success', 'procurement');
  };

  const generateProcurementPO = (
    vendor: string,
    items: {
      material: string;
      sizeSpecs: string;
      qty: number;
      unit: string;
      rate?: number;
      amount?: number;
      requirementId?: string;
      projectName?: string;
      machineName?: string;
      materialType?: string;
      vendor?: string;
      description?: string;
    }[],
    expectedDate?: string,
    notes?: string,
    customPoNumber?: string,
    orderedBy?: string
  ): PurchaseOrder => {
    learnVendor(vendor);
    const count = String(purchaseOrders.length + 1).padStart(3, '0');
    const poNumber = customPoNumber || `PO-2026-${count}`;
    const totalAmount = items.reduce((sum, item) => sum + (item.amount || (item.qty * (item.rate || 0))), 0);
    const projectNames = Array.from(new Set(items.map((i) => i.projectName).filter(Boolean))) as string[];
    const machineNames = Array.from(new Set(items.map((i) => i.machineName).filter(Boolean))) as string[];
    const finalOrderedBy = orderedBy || currentUser?.name || 'Unknown';

    const newPO: PurchaseOrder = {
      id: 'po-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      poNumber,
      date: new Date().toISOString().split('T')[0],
      vendor,
      expectedDate: expectedDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      paymentTerms: '30 Days Net',
      status: 'Sent',
      totalAmount,
      notes: notes || `Direct procurement order for ${items.length} items (${projectNames.join(', ')})`,
      projectNames,
      machineNames,
      orderedBy: finalOrderedBy,
      issuedBy: finalOrderedBy,
      createdAt: new Date().toISOString(),
      items: items.map((i) => ({
        material: i.material || i.description || 'Material Item',
        description: i.description || i.material || 'Material Item',
        sizeSpecs: i.sizeSpecs || '-',
        qty: i.qty,
        unit: i.unit,
        rate: i.rate || 0,
        amount: i.amount || (i.qty * (i.rate || 0)),
        projectName: i.projectName,
        machineName: i.machineName,
        materialType: i.materialType,
        vendor: i.vendor || vendor,
      })),
    };

    setPurchaseOrders((prev) => [newPO, ...prev]);

    // Update linked requirements
    const linkedIds = items.map((i) => i.requirementId).filter(Boolean) as string[];
    if (linkedIds.length > 0) {
      setProjectRequirements((prev) => {
        const updated = prev.map((r) => {
          if (linkedIds.includes(r.id)) {
            const itemVendor = r.vendor && r.vendor !== 'Unassigned' ? r.vendor : vendor;
            const itemVendorName = r.vendorName && r.vendorName !== 'Unassigned' ? r.vendorName : (r.vendor || vendor);
            const mod: ProjectMaterialRequirementItem = {
              ...r,
              vendor: itemVendor,
              vendorName: itemVendorName,
              vendorStatus: 'Assigned',
              poStatus: 'Issued',
              poNumberAssigned: poNumber,
            };
            dbUpsertRequirement(mod);
            return mod;
          }
          return r;
        });
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY + '_requirements', JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        return updated;
      });
    }

    logAudit('Procurement PO Generated', 'Procurement', `Generated PO ${poNumber} for ${vendor} (${items.length} items)`);
    addNotification('Purchase Order Created', `Generated ${poNumber} for ${vendor}`, 'success', 'purchase');
    return newPO;
  };

  const sendProcurementRFQ = (
    vendors: string[],
    items: {
      requirementId?: string;
      description: string;
      materialType: string;
      sizeSpecs: string;
      quantity: number;
      unit: string;
      projectName: string;
      machineName: string;
      targetRate?: number;
    }[],
    notes?: string
  ): RFQRecord => {
    vendors.forEach((v) => learnVendor(v));
    const count = String(rfqs.length + 1).padStart(3, '0');
    const rfqNumber = `RFQ-2026-${count}`;
    const projectNames = Array.from(new Set(items.map((i) => i.projectName).filter(Boolean)));

    const newRFQ: RFQRecord = {
      id: 'rfq-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      rfqNumber,
      title: `RFQ for ${items.length} Materials (${projectNames.join(', ')})`,
      createdDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
      status: 'Sent',
      notes: notes || `Multi-vendor RFQ dispatched to: ${vendors.join(', ')}`,
      vendors,
      items: items.map((i) => ({
        requirementId: i.requirementId,
        description: i.description,
        materialType: i.materialType,
        sizeSpecs: i.sizeSpecs,
        quantity: i.quantity,
        unit: i.unit,
        projectName: i.projectName,
        machineName: i.machineName,
        targetRate: i.targetRate,
      })),
      quotations: [],
    };

    setRfqs((prev) => [newRFQ, ...prev]);

    // Update linked requirements
    const linkedIds = items.map((i) => i.requirementId).filter(Boolean) as string[];
    if (linkedIds.length > 0) {
      setProjectRequirements((prev) => {
        const updated = prev.map((r) => {
          if (linkedIds.includes(r.id)) {
            const mod: ProjectMaterialRequirementItem = {
              ...r,
              rfqStatus: 'Sent',
              rfqVendors: vendors,
            };
            dbUpsertRequirement(mod);
            return mod;
          }
          return r;
        });
        try {
          localStorage.setItem(LOCAL_STORAGE_KEY + '_requirements', JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        return updated;
      });
    }

    logAudit('Procurement RFQ Sent', 'Procurement', `Sent RFQ ${rfqNumber} to ${vendors.length} vendors (${items.length} items)`);
    addNotification('RFQ Dispatched', `RFQ ${rfqNumber} sent to ${vendors.join(', ')}`, 'info', 'procurement');
    return newRFQ;
  };

  // MRP Calculation Engine (Derived from live Project Material Requirement Table)
  const mrpRecords: MRPRecord[] = useMemo(() => {
    const demandsMap: { [key: string]: { requiredQty: number; projects: string[] } } = {};

    projectRequirements.forEach((req) => {
      const key = (req.sizeSpecs || '').toLowerCase().replace(/\s+/g, '');
      if (!key) return;
      if (!demandsMap[key]) {
        demandsMap[key] = { requiredQty: 0, projects: [] };
      }
      demandsMap[key].requiredQty += (req.quantity || 0);
      if (req.projectName && !demandsMap[key].projects.includes(req.projectName)) {
        demandsMap[key].projects.push(req.projectName);
      }
    });

    return materials.map((mat) => {
      const key = (mat.sizeSpecs || '').toLowerCase().replace(/\s+/g, '');
      const demand = (key && demandsMap[key]) || { requiredQty: mat.reorderLevel || 0, projects: ['Reorder Buffer'] };
      const requiredQty = demand.requiredQty;
      const availableStock = mat.currentStock || 0;
      const reservedStock = mat.reservedStock || 0;
      const freeStock = Math.max(0, availableStock - reservedStock);

      let incomingPOQty = 0;
      purchaseOrders
        .filter((po) => po.status === 'Sent' || po.status === 'Draft' || po.status === 'Partially Received')
        .forEach((po) => {
          po.items.forEach((item) => {
            if (key && (item.sizeSpecs || '').toLowerCase().replace(/\s+/g, '') === key) {
              incomingPOQty += (item.qty || 0);
            }
          });
        });

      const totalEffectiveStock = freeStock + incomingPOQty;
      const shortageQty = Math.max(0, requiredQty - totalEffectiveStock);

      let status: MRPRecord['status'] = 'available';
      if (shortageQty > 0) {
        status = totalEffectiveStock > 0 ? 'partial' : 'purchase_required';
      }

      return {
        materialId: mat.id,
        materialCode: mat.code,
        materialName: mat.name,
        materialType: mat.type,
        sizeSpecs: mat.sizeSpecs,
        unit: mat.unit,
        requiredQty,
        availableStock,
        reservedStock,
        incomingPOQty,
        shortageQty,
        status,
        unitCost: mat.unitCost,
        preferredVendor: mat.vendor,
        allocatedProjects: demand.projects,
      };
    });
  }, [materials, projectRequirements, purchaseOrders]);

  const generateAutoPurchaseRequests = (shortages: MRPRecord[]) => {
    if (shortages.length === 0) return;

    const vendorGroups: { [vendor: string]: MRPRecord[] } = {};
    shortages.forEach((s) => {
      const v = s.preferredVendor || 'Unassigned';
      if (!vendorGroups[v]) vendorGroups[v] = [];
      vendorGroups[v].push(s);
    });

    Object.keys(vendorGroups).forEach((vendor, idx) => {
      const items = vendorGroups[vendor];
      const count = String(purchaseOrders.length + idx + 50).padStart(3, '0');
      const poItems = items.map((it) => ({
        material: `${it.materialType} ${it.sizeSpecs}`,
        sizeSpecs: it.sizeSpecs,
        qty: it.shortageQty > 0 ? it.shortageQty : 10,
        unit: it.unit,
        rate: it.unitCost,
        amount: (it.shortageQty > 0 ? it.shortageQty : 10) * it.unitCost,
      }));
      const totalAmount = poItems.reduce((acc, i) => acc + i.amount, 0);

      addPurchaseOrder({
        poNumber: `PO-MRP-${count}`,
        date: new Date().toISOString().split('T')[0],
        vendor,
        items: poItems,
        totalAmount,
        paymentTerms: '30 Days Net',
        expectedDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
        status: 'Draft',
        notes: 'Automatically generated by MRP Engine for project material shortages',
      });
    });

    logAudit('MRP Auto-PO Generated', 'MRP Planning', `Generated ${Object.keys(vendorGroups).length} Purchase Orders for material shortages`);
    addNotification('MRP POs Created', `Generated ${Object.keys(vendorGroups).length} draft Purchase Orders from MRP shortages`, 'success', 'purchase');
  };

  // Bulk Excel Import
  const bulkImportMaterials = (items: any[]) => {
    setMaterials((prev) => [...items, ...prev]);
    logAudit('Excel Materials Import', 'Materials Master', `Imported ${items.length} materials from Excel`);
  };

  const bulkImportOrders = (items: any[]) => {
    setOrders((prev) => [...items, ...prev]);
    logAudit('Excel Orders Import', 'Manufacturing Orders', `Imported ${items.length} orders from Excel`);
  };

  const bulkImportInward = (items: any[]) => {
    setInwardEntries((prev) => [...items, ...prev]);
    logAudit('Excel Inward Import', 'Inward Management', `Imported ${items.length} inward entries from Excel`);
  };

  const bulkImportVendors = (items: any[]) => {
    setVendors((prev) => [...items, ...prev]);
    logAudit('Excel Vendors Import', 'Vendor Management', `Imported ${items.length} vendors from Excel`);
  };

  const bulkImportCustomers = (items: any[]) => {
    setCustomers((prev) => [...items, ...prev]);
    logAudit('Excel Customers Import', 'Customer Management', `Imported ${items.length} customers from Excel`);
  };

  const markNotificationRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const resetToDemoData = async () => {
    // Security check: Only Root Admins (Amit & Kaustubh) can trigger a Factory Reset
    if (!isRootAdminUser(currentUser)) {
      console.warn('Unauthorized Factory Reset attempt by:', currentUser?.name, currentUser?.email);
      alert('Access Denied: Only Root Admins (Amit and Kaustubh) are authorized to perform a Factory Reset.');
      return;
    }

    // 1. Reset all React state slices to clean baseline
    setMaterials(INITIAL_MATERIALS);
    setProjectRequirements(INITIAL_PROJECT_REQUIREMENTS);
    setVendors(INITIAL_VENDORS);
    setCustomers(INITIAL_CUSTOMERS);
    setMachines(INITIAL_MACHINES);
    setProjects(INITIAL_PROJECTS);
    setOrders(INITIAL_ORDERS);
    setInwardEntries(INITIAL_INWARD);
    setOutwardEntries(INITIAL_OUTWARD);
    setJobCards(INITIAL_JOB_CARDS);
    setQcInspections(INITIAL_QC);
    setPurchaseOrders(INITIAL_PURCHASE_ORDERS);
    setSalesOrders(INITIAL_SALES_ORDERS);
    setCostingRecords(INITIAL_COSTING);
    setAuditLogs(INITIAL_AUDIT_LOGS);
    setNotifications(INITIAL_NOTIFICATIONS);
    setBoms(INITIAL_BOMS);
    setRfqs(INITIAL_RFQS);
    setVendorDocuments(INITIAL_VENDOR_DOCUMENTS);
    setTrashItems([]);

    // 2. Clear local storage cache
    try {
      const preserveSupabase = localStorage.getItem('RSB_SUPABASE_CONFIG_V1');
      const preserveUser = localStorage.getItem('rsb_auth_user');

      [
        LOCAL_STORAGE_KEY + '_materials',
        LOCAL_STORAGE_KEY + '_requirements',
        LOCAL_STORAGE_KEY + '_vendors',
        LOCAL_STORAGE_KEY + '_customers',
        LOCAL_STORAGE_KEY + '_machines',
        LOCAL_STORAGE_KEY + '_projects',
        LOCAL_STORAGE_KEY + '_orders',
        LOCAL_STORAGE_KEY + '_inward',
        LOCAL_STORAGE_KEY + '_outward',
        LOCAL_STORAGE_KEY + '_job_cards',
        LOCAL_STORAGE_KEY + '_qc',
        LOCAL_STORAGE_KEY + '_pos',
        LOCAL_STORAGE_KEY + '_sos',
        LOCAL_STORAGE_KEY + '_costing',
        LOCAL_STORAGE_KEY + '_audit',
        LOCAL_STORAGE_KEY + '_notifs',
        LOCAL_STORAGE_KEY + '_boms',
        LOCAL_STORAGE_KEY + '_rfqs',
        LOCAL_STORAGE_KEY + '_vdocs',
        LOCAL_STORAGE_KEY + '_trash',
        'rsb_custom_descriptions',
        'rsb_custom_sizes',
        'rsb_custom_units',
      ].forEach((k) => localStorage.removeItem(k));

      if (preserveSupabase) localStorage.setItem('RSB_SUPABASE_CONFIG_V1', preserveSupabase);
      if (preserveUser) localStorage.setItem('rsb_auth_user', preserveUser);
    } catch (e) {
      console.warn('LocalStorage clear error:', e);
    }

    // 3. Broadcast to all open local browser tabs
    try {
      const bc = new BroadcastChannel('rsb_erp_live_sync');
      bc.postMessage({ type: 'FACTORY_RESET' });
      bc.close();
    } catch (e) {}

    // 4. Purge Supabase Cloud Database & Broadcast global reset to all devices (e.g. Amit)
    try {
      await dbFactoryResetDatabase();
    } catch (e) {
      console.warn('Supabase cloud factory reset error:', e);
    }

    logAudit('System Factory Reset', 'Super Admin', 'Reset full ERP cloud database and client states to clean factory baseline');
    addNotification('Factory Reset Complete', 'Reset all projects, suggestions, BOMs, and entries across all connected devices.', 'warning');
  };

  const exportDatabaseBackup = () => {
    const fullBackup = {
      version: '3.0.0',
      exportedAt: new Date().toISOString(),
      materials,
      projectRequirements,
      vendors,
      customers,
      machines,
      projects,
      orders,
      inwardEntries,
      outwardEntries,
      jobCards,
      qcInspections,
      purchaseOrders,
      salesOrders,
      costingRecords,
      auditLogs,
      boms,
      rfqs,
      vendorDocuments,
    };
    const jsonStr = JSON.stringify(fullBackup, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RSB_ERP_FullSnapshot_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    logAudit('Database Backup Exported', 'Super Admin', 'Exported complete database JSON snapshot');
  };

  const importDatabaseBackup = (jsonContent: string): boolean => {
    try {
      const data = JSON.parse(jsonContent);
      if (data.materials) setMaterials(data.materials);
      if (data.projectRequirements) setProjectRequirements(data.projectRequirements);
      if (data.vendors) setVendors(data.vendors);
      if (data.customers) setCustomers(data.customers);
      if (data.machines) setMachines(data.machines);
      if (data.projects) setProjects(data.projects);
      if (data.orders) setOrders(data.orders);
      if (data.inwardEntries) setInwardEntries(data.inwardEntries);
      if (data.outwardEntries) setOutwardEntries(data.outwardEntries);
      if (data.jobCards) setJobCards(data.jobCards);
      if (data.qcInspections) setQcInspections(data.qcInspections);
      if (data.purchaseOrders) setPurchaseOrders(data.purchaseOrders);
      if (data.salesOrders) setSalesOrders(data.salesOrders);
      if (data.costingRecords) setCostingRecords(data.costingRecords);
      if (data.boms) setBoms(data.boms);
      if (data.rfqs) setRfqs(data.rfqs);
      if (data.vendorDocuments) setVendorDocuments(data.vendorDocuments);
      logAudit('Database Backup Restored', 'Super Admin', 'Imported and restored database state from JSON backup');
      return true;
    } catch (err) {
      console.error('Failed to restore backup', err);
      return false;
    }
  };

  return (
    <ERPContext.Provider
      value={{
        currentUser,
        setCurrentUserRole,
        isAuthenticated,
        login,
        loginWithPasskey,
        loginAsUser,
        logout,
        users,
        activeVendorId,
        setActiveVendorId,
        activeTab,
        setActiveTab,
        materials,
        projectRequirements,
        setProjectRequirements,
        addProjectRequirement,
        updateProjectRequirement,
        deleteProjectRequirement,
        deleteProjectRequirements,
        refreshDatabase,
        bulkImportProjectRequirements,
        populateRequirementsFromBOM,
        createJobCardFromRequirement,
        convertShortagesToPO,
        issueStockForRequirement,
        scrapRequirementMaterial,
        vendors,
        customers,
        machines,
        projects,
        setProjects,
        orders,
        inwardEntries,
        outwardEntries,
        jobCards,
        qcInspections,
        purchaseOrders,
        salesOrders,
        costingRecords,
        auditLogs,
        notifications,
        boms,
        rfqs,
        vendorDocuments,
        activeProcessingMaterials,
        dispatchReadyItems,
        availableStockMaterials,
        addMaterial,
        updateMaterial,
        deleteMaterial,
        adjustStock,
        addOrder,
        updateOrderStatus,
        updateOrder,
        deleteOrder,
        addInwardEntry,
        updateInwardStatus,
        deleteInwardEntry,
        addOutwardEntry,
        updateOutwardStatus,
        deleteOutwardEntry,
        addJobCard,
        updateJobCard,
        updateJobCardStep,
        toggleJobOperation,
        createJobCardFromOrder,
        deleteJobCard,
        addQCInspection,
        updateQCInspection,
        deleteQCInspection,
        addProject,
        updateProject,
        deleteProject,
        addVendor,
        updateVendor,
        deleteVendor,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        learnCustomer,
        learnMachine,
        learnVendor,
        addMachine,
        updateMachine,
        deleteMachine,
        syncProjectToBOM,
        addPurchaseOrder,
        updatePOStatus,
        deletePurchaseOrder,
        addSalesOrder,
        updateSOStatus,
        saveCostingRecord,
        addBOM,
        updateBOM,
        approveBOM,
        copyBOM,
        deleteBOM,
        masterMachines,
        masterBOMs,
        addMachineFolder,
        updateMachineFolder,
        deleteMachineFolder,
        addMachineType,
        renameMachineType,
        updateMachineTypeDetails,
        deleteMachineType,
        moveMachineType,
        duplicateMachineType,
        archiveMachineType,
        addMasterBOM,
        updateMasterBOM,
        duplicateMasterBOM,
        deleteMasterBOM,
    resetMasterBOMsToFactoryDefault,
        addRFQ,
        submitVendorQuotation,
        approveVendorQuotation,
        rejectVendorQuotation,
        uploadVendorDocument,
        mrpRecords,
        generateAutoPurchaseRequests,
        bulkImportMaterials,
        bulkImportOrders,
        bulkImportInward,
        bulkImportVendors,
        bulkImportCustomers,
        bulkAssignMaterialVendor,
        generateProcurementPO,
        sendProcurementRFQ,
        addUser,
        updateUser,
        deleteUser,
        alterUserAuthorization,
        issueUserResetPin,
        replaceProjectRequirements,
        importMaterialRequirements,
        toggleMaterialReceived,
        updateMaterialArrivalQty,
        trashItems,
        restoreFromTrash,
        permanentlyDeleteFromTrash,
        emptyTrash,
        logAction: logAudit,
        logAudit,
        markNotificationRead,
        resetToDemoData,
        exportDatabaseBackup,
        importDatabaseBackup,
        isMaintenanceMode,
        toggleMaintenanceMode,
        isKaustubhAdmin,
        isRootAdmin,
      }}
    >
      {children}
    </ERPContext.Provider>
  );
};

export const useERP = () => {
  const context = useContext(ERPContext);
  if (!context) {
    throw new Error('useERP must be used within an ERPProvider');
  }
  return context;
};
