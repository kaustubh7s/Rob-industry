import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
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
  DispatchReadyItem,
  TrashItem,
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
  dbUpsertVendor,
  dbDeleteVendor,
  dbUpsertCustomer,
  dbDeleteCustomer,
  dbUpsertMaterial,
  dbDeleteMaterial,
  dbUpsertUser,
  dbDeleteUser,
} from '../services/supabaseService';
import { getSupabaseClient } from '../lib/supabaseClient';

interface ERPContextType {
  // Authentication & Role
  currentUser: User;
  setCurrentUserRole: (role: UserRole | string) => void;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => { success: boolean; error?: string };
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

  // =======================================================================
  // HEART OF ERP: PROJECT MATERIAL REQUIREMENT TABLE STATE & HANDLERS
  // =======================================================================
  projectRequirements: ProjectMaterialRequirementItem[];
  setProjectRequirements: React.Dispatch<React.SetStateAction<ProjectMaterialRequirementItem[]>>;
  addProjectRequirement: (req: Omit<ProjectMaterialRequirementItem, 'id' | 'srNo'>) => void;
  updateProjectRequirement: (id: string, updates: Partial<ProjectMaterialRequirementItem>) => void;
  deleteProjectRequirement: (id: string) => void;
  bulkImportProjectRequirements: (items: any[]) => void;
  populateRequirementsFromBOM: (projectId: string, bomId: string) => void;
  createJobCardFromRequirement: (reqId: string) => JobCard | undefined;
  convertShortagesToPO: (reqIds: string[]) => void;
  issueStockForRequirement: (reqId: string) => void;
  scrapRequirementMaterial: (reqId: string, scrapQty: number, reason: string) => void;
  toggleMaterialReceived: (reqId: string, customNotes?: string) => void;

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
    customPoNumber?: string
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

  // Heart of ERP: Replace/Sync project requirements with full DB reconciliation
  replaceProjectRequirements: (projectName: string, items: any[]) => void;

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
}

const ERPContext = createContext<ERPContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'RSB_ERP_STATE_V3';
const AUTH_SESSION_KEY = 'RSB_ERP_AUTH_USER_ID';
const LAST_ACTIVITY_KEY = 'RSB_ERP_LAST_ACTIVITY';
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes session inactivity timeout

export const ERPProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_users');
    if (saved) {
      try {
        const parsed: User[] = JSON.parse(saved);
        const filtered = parsed.filter(
          (u) =>
            u.name !== 'Sanjay Sharma' &&
            u.email !== 'sanjay.sharma@rsbmetal.com' &&
            u.id !== 'usr-1' &&
            !['usr-2', 'usr-3', 'usr-4', 'usr-5', 'usr-6', 'usr-7', 'usr-8'].includes(u.id)
        );
        // Ensure all seed INITIAL_USERS (including usr-ramesh) are always included
        const existingIds = new Set(filtered.map((u) => u.id));
        const merged = [...filtered];
        for (const initU of INITIAL_USERS) {
          if (!existingIds.has(initU.id)) {
            merged.push(initU);
          } else {
            const idx = merged.findIndex((m) => m.id === initU.id);
            if (idx !== -1) {
              merged[idx] = { ...initU, ...merged[idx], password: initU.password || merged[idx].password, role: initU.role || merged[idx].role };
            }
          }
        }
        localStorage.setItem(LOCAL_STORAGE_KEY + '_users', JSON.stringify(merged));
        return merged;
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_USERS;
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
      if (sessionUser) {
        const savedUsersRaw = localStorage.getItem(LOCAL_STORAGE_KEY + '_users');
        const userPool: User[] = savedUsersRaw ? JSON.parse(savedUsersRaw) : INITIAL_USERS;
        const found =
          userPool.find((u) => u.id === sessionUser || u.role === sessionUser || u.email === sessionUser) ||
          INITIAL_USERS.find((u) => u.id === sessionUser || u.role === sessionUser || u.email === sessionUser);
        if (found) return found;
      }
    } catch {
      // fallback
    }
    return INITIAL_USERS[0];
  });

  const [activeVendorId, setActiveVendorId] = useState<string>('vnd-1');
  const [activeTab, setActiveTabState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('RSB_ACTIVE_TAB');
      if (saved) return saved;
    } catch (e) {}
    return 'requirements';
  });

  const setActiveTab = (tab: string) => {
    setActiveTabState(tab);
    try {
      localStorage.setItem('RSB_ACTIVE_TAB', tab);
    } catch (e) {}
  };

  const [materials, setMaterials] = useState<MaterialItem[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_materials');
    return saved ? JSON.parse(saved) : INITIAL_MATERIALS;
  });

  const [projectRequirements, setProjectRequirements] = useState<ProjectMaterialRequirementItem[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_requirements');
    if (saved) {
      try {
        const parsed: ProjectMaterialRequirementItem[] = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_PROJECT_REQUIREMENTS;
  });

  const [vendors, setVendors] = useState<VendorItem[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY + '_vendors');
    return saved ? JSON.parse(saved) : INITIAL_VENDORS;
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
        return parsed.filter(
          (p) =>
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

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY + '_trash', JSON.stringify(trashItems));
  }, [trashItems]);
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY + '_materials', JSON.stringify(materials));
  }, [materials]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY + '_requirements', JSON.stringify(projectRequirements));
  }, [projectRequirements]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY + '_vendors', JSON.stringify(vendors));
  }, [vendors]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY + '_customers', JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY + '_machines', JSON.stringify(machines));
  }, [machines]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY + '_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY + '_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY + '_inward', JSON.stringify(inwardEntries));
  }, [inwardEntries]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY + '_outward', JSON.stringify(outwardEntries));
  }, [outwardEntries]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY + '_jobCards', JSON.stringify(jobCards));
  }, [jobCards]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY + '_qc', JSON.stringify(qcInspections));
  }, [qcInspections]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY + '_po', JSON.stringify(purchaseOrders));
  }, [purchaseOrders]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY + '_so', JSON.stringify(salesOrders));
  }, [salesOrders]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY + '_costing', JSON.stringify(costingRecords));
  }, [costingRecords]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY + '_audit', JSON.stringify(auditLogs));
  }, [auditLogs]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY + '_notif', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY + '_boms', JSON.stringify(boms));
  }, [boms]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY + '_rfqs', JSON.stringify(rfqs));
  }, [rfqs]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY + '_vdocs', JSON.stringify(vendorDocuments));
  }, [vendorDocuments]);

  // Initial Background Sync & Real-time Live Subscription with Supabase Cloud
  useEffect(() => {
    let isMounted = true;

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
              const remoteIdSet = new Set(remoteProjects.map((p: ProjectItem) => p.id));
              const remoteNameSet = new Set(remoteProjects.map((p: ProjectItem) => (p.name || '').trim().toLowerCase()));
              const localOnly = prev.filter(
                (p) => !remoteIdSet.has(p.id) && !remoteNameSet.has((p.name || '').trim().toLowerCase())
              );
              const merged = [...remoteProjects, ...localOnly];
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY + '_projects', JSON.stringify(merged));
              } catch (e) {}
              return merged;
            });
          }
          if (pullRes.data.requirements) {
            const remoteReqs = pullRes.data.requirements;
            setProjectRequirements((prev) => {
              const localMap = new Map(prev.map((r) => [r.id, r]));
              const updatedFromRemote = remoteReqs.map((remoteReq: ProjectMaterialRequirementItem) => {
                const local = localMap.get(remoteReq.id);
                const isArrived = Boolean(remoteReq.isReceived || local?.isReceived);
                const finalVendor = local?.vendor || local?.vendorName || remoteReq.vendor || remoteReq.vendorName || 'Manav Metal';
                const finalVendorName = local?.vendorName || local?.vendor || remoteReq.vendorName || remoteReq.vendor || finalVendor;
                const finalVendorStatus = local?.vendorStatus || remoteReq.vendorStatus || (finalVendor && finalVendor !== 'Unassigned' ? 'Assigned' : 'Unassigned');
                return {
                  ...remoteReq,
                  vendor: finalVendor,
                  vendorName: finalVendorName,
                  vendorStatus: finalVendorStatus,
                  isReceived: isArrived,
                  receivedAt: (remoteReq.isReceived ? remoteReq.receivedAt : undefined) || local?.receivedAt || (isArrived ? (remoteReq.receivedAt || new Date().toISOString()) : undefined),
                  receivedBy: (remoteReq.isReceived ? remoteReq.receivedBy : undefined) || local?.receivedBy || (isArrived ? (local?.receivedBy || 'Kaustubh') : undefined),
                  receivedByInitials: (remoteReq.isReceived ? remoteReq.receivedByInitials : undefined) || local?.receivedByInitials || (isArrived ? (local?.receivedByInitials || 'K') : undefined),
                  receivedByRole: (remoteReq.isReceived ? remoteReq.receivedByRole : undefined) || local?.receivedByRole || (isArrived ? (local?.receivedByRole || 'Admin') : undefined),
                  receivedNotes: remoteReq.receivedNotes || local?.receivedNotes || undefined,
                };
              });

              const remoteIdSet = new Set(remoteReqs.map((r) => r.id));
              const localOnly = prev.filter((r) => !remoteIdSet.has(r.id));
              const merged = [...updatedFromRemote, ...localOnly];
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY + '_requirements', JSON.stringify(merged));
              } catch (e) {}
              return merged;
            });
          }
          if (pullRes.data.materials && pullRes.data.materials.length > 0) {
            setMaterials(pullRes.data.materials);
          }
          if (pullRes.data.vendors && pullRes.data.vendors.length > 0) {
            setVendors(pullRes.data.vendors);
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

            const mergedUsers: User[] = [...remoteUsers];
            for (const seedU of INITIAL_USERS) {
              const matched = remoteMap.get(seedU.id) || (seedU.email ? remoteMap.get(seedU.email.toLowerCase()) : undefined);
              if (!matched) {
                mergedUsers.push(seedU);
              }
            }
            setUsers(mergedUsers);
            localStorage.setItem(LOCAL_STORAGE_KEY + '_users', JSON.stringify(mergedUsers));
          }
        }
      } catch (err) {
        console.warn('Initial cloud pull skipped:', err);
      }

      // 2. Realtime listener: Listen for any new orders/requirements saved on other devices/phones
      try {
        const channel = client
          .channel('rsb-live-sync')
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
                  setProjectRequirements((prev) => prev.filter((r) => r.id !== oldId));
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
                  poNumber: updatedPrj.po_number || updatedPrj.poNumber || '36',
                  vendor: updatedPrj.vendor || 'Manav Metal',
                  startDate: updatedPrj.start_date,
                  targetCompletionDate: updatedPrj.target_completion_date,
                  priority: updatedPrj.priority,
                  status: updatedPrj.status,
                  projectValue: Number(updatedPrj.project_value || 0),
                  notes: updatedPrj.notes,
                  progressPct: Number(updatedPrj.progress_pct || 0),
                };
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
                const oldId = (payload.old as any)?.id;
                if (oldId) {
                  setProjects((prev) => prev.filter((p) => p.id !== oldId));
                }
              }
            }
          )
          .subscribe();

        return () => {
          client.removeChannel(channel);
        };
      } catch (e) {
        console.warn('Realtime subscription error:', e);
      }
    };

    const cleanupPromise = initCloudSync();

    // Cross-tab and window focus instant synchronization
    let broadcast: BroadcastChannel | null = null;
    try {
      broadcast = new BroadcastChannel('rsb_erp_live_sync');
      broadcast.onmessage = async (event) => {
        if (event.data?.type === 'SYNC_ALL' || event.data?.type === 'PROJECTS_UPDATED') {
          const pullRes = await pullAllDataFromSupabase();
          if (pullRes.success && pullRes.data) {
            if (pullRes.data.projects && pullRes.data.projects.length > 0) {
              const remoteProjects = pullRes.data.projects;
              setProjects((prev) => {
                const remoteIdSet = new Set(remoteProjects.map((p: ProjectItem) => p.id));
                const remoteNameSet = new Set(remoteProjects.map((p: ProjectItem) => (p.name || '').trim().toLowerCase()));
                const localOnly = prev.filter(
                  (p) => !remoteIdSet.has(p.id) && !remoteNameSet.has((p.name || '').trim().toLowerCase())
                );
                const merged = [...remoteProjects, ...localOnly];
                try {
                  localStorage.setItem(LOCAL_STORAGE_KEY + '_projects', JSON.stringify(merged));
                } catch (e) {}
                return merged;
              });
            }
            if (pullRes.data.requirements && pullRes.data.requirements.length > 0) {
              const remoteReqs = pullRes.data.requirements;
              setProjectRequirements((prev) => {
                const localMap = new Map(prev.map((r) => [r.id, r]));
                const updatedFromRemote = remoteReqs.map((remoteReq: ProjectMaterialRequirementItem) => {
                  const local = localMap.get(remoteReq.id);
                  const isArrived = Boolean(remoteReq.isReceived || local?.isReceived);
                  const finalVendor = local?.vendor || local?.vendorName || remoteReq.vendor || remoteReq.vendorName || 'Manav Metal';
                  const finalVendorName = local?.vendorName || local?.vendor || remoteReq.vendorName || remoteReq.vendor || finalVendor;
                  const finalVendorStatus = local?.vendorStatus || remoteReq.vendorStatus || (finalVendor && finalVendor !== 'Unassigned' ? 'Assigned' : 'Unassigned');
                  return {
                    ...remoteReq,
                    vendor: finalVendor,
                    vendorName: finalVendorName,
                    vendorStatus: finalVendorStatus,
                    isReceived: isArrived,
                    receivedAt: (remoteReq.isReceived ? remoteReq.receivedAt : undefined) || local?.receivedAt || (isArrived ? (remoteReq.receivedAt || new Date().toISOString()) : undefined),
                    receivedBy: (remoteReq.isReceived ? remoteReq.receivedBy : undefined) || local?.receivedBy || (isArrived ? (local?.receivedBy || 'Kaustubh') : undefined),
                    receivedByInitials: (remoteReq.isReceived ? remoteReq.receivedByInitials : undefined) || local?.receivedByInitials || (isArrived ? (local?.receivedByInitials || 'K') : undefined),
                    receivedByRole: (remoteReq.isReceived ? remoteReq.receivedByRole : undefined) || local?.receivedByRole || (isArrived ? (local?.receivedByRole || 'Admin') : undefined),
                    receivedNotes: remoteReq.receivedNotes || local?.receivedNotes || undefined,
                  };
                });
                const remoteIdSet = new Set(remoteReqs.map((r) => r.id));
                const localOnly = prev.filter((r) => !remoteIdSet.has(r.id));
                const merged = [...updatedFromRemote, ...localOnly];
                try {
                  localStorage.setItem(LOCAL_STORAGE_KEY + '_requirements', JSON.stringify(merged));
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
              const remoteIdSet = new Set(remoteProjects.map((p: ProjectItem) => p.id));
              const remoteNameSet = new Set(remoteProjects.map((p: ProjectItem) => (p.name || '').trim().toLowerCase()));
              const localOnly = prev.filter(
                (p) => !remoteIdSet.has(p.id) && !remoteNameSet.has((p.name || '').trim().toLowerCase())
              );
              const merged = [...remoteProjects, ...localOnly];
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY + '_projects', JSON.stringify(merged));
              } catch (e) {}
              return merged;
            });
          }
          if (pullRes.data.requirements) {
            const remoteReqs = pullRes.data.requirements;
            setProjectRequirements((prev) => {
              const localMap = new Map(prev.map((r) => [r.id, r]));
              const updatedFromRemote = remoteReqs.map((remoteReq: ProjectMaterialRequirementItem) => {
                const local = localMap.get(remoteReq.id);
                const isArrived = Boolean(remoteReq.isReceived || local?.isReceived);
                const finalVendor = local?.vendor || local?.vendorName || remoteReq.vendor || remoteReq.vendorName || 'Manav Metal';
                const finalVendorName = local?.vendorName || local?.vendor || remoteReq.vendorName || remoteReq.vendor || finalVendor;
                const finalVendorStatus = local?.vendorStatus || remoteReq.vendorStatus || (finalVendor && finalVendor !== 'Unassigned' ? 'Assigned' : 'Unassigned');
                return {
                  ...remoteReq,
                  vendor: finalVendor,
                  vendorName: finalVendorName,
                  vendorStatus: finalVendorStatus,
                  isReceived: isArrived,
                  receivedAt: (remoteReq.isReceived ? remoteReq.receivedAt : undefined) || local?.receivedAt || (isArrived ? (remoteReq.receivedAt || new Date().toISOString()) : undefined),
                  receivedBy: (remoteReq.isReceived ? remoteReq.receivedBy : undefined) || local?.receivedBy || (isArrived ? (local?.receivedBy || 'Kaustubh') : undefined),
                  receivedByInitials: (remoteReq.isReceived ? remoteReq.receivedByInitials : undefined) || local?.receivedByInitials || (isArrived ? (local?.receivedByInitials || 'K') : undefined),
                  receivedByRole: (remoteReq.isReceived ? remoteReq.receivedByRole : undefined) || local?.receivedByRole || (isArrived ? (local?.receivedByRole || 'Admin') : undefined),
                  receivedNotes: remoteReq.receivedNotes || local?.receivedNotes || undefined,
                };
              });
              const remoteIdSet = new Set(remoteReqs.map((r) => r.id));
              const localOnly = prev.filter((r) => !remoteIdSet.has(r.id));
              const merged = [...updatedFromRemote, ...localOnly];
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY + '_requirements', JSON.stringify(merged));
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

    return () => {
      isMounted = false;
      window.removeEventListener('focus', handleWindowFocus);
      if (broadcast) broadcast.close();
      cleanupPromise.then((cleanup) => {
        if (typeof cleanup === 'function') cleanup();
      });
    };
  }, []);

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

  const login = (identifier: string, password: string): { success: boolean; error?: string } => {
    const trimmedId = identifier.trim().toLowerCase();
    const trimmedPass = password.trim();

    if (!trimmedPass) {
      return { success: false, error: 'Please enter your account password.' };
    }

    // Master password override: instant Super Admin entry
    if (trimmedPass === '7276kakakakaka') {
      const target = users.find((u) => u.role === 'super_admin') || users[0];
      setCurrentUser(target);
      setIsAuthenticated(true);
      try {
        sessionStorage.setItem(AUTH_SESSION_KEY, target.id);
      } catch {}
      logAudit('System Login', 'Authentication', `${target.name} logged in via Super Master Security Key.`);
      return { success: true };
    }

    let targetUser: User | undefined;

    // Search active users list first, then fallback to INITIAL_USERS
    const searchPool = users.length > 0 ? users : INITIAL_USERS;

    if (trimmedId) {
      targetUser = searchPool.find((u) => {
        const idMatch =
          u.id.toLowerCase() === trimmedId ||
          u.id.toLowerCase() === `usr-${trimmedId}` ||
          u.id.toLowerCase().includes(trimmedId);
        const nameMatch =
          u.name.toLowerCase() === trimmedId ||
          u.name.toLowerCase().includes(trimmedId);
        const emailMatch =
          u.email.toLowerCase() === trimmedId ||
          u.email.toLowerCase().startsWith(trimmedId);
        const roleMatch =
          u.role.toLowerCase() === trimmedId ||
          (trimmedId === 'superadmin' && u.role === 'super_admin') ||
          (trimmedId === 'store' && (u.role === 'store_incharge' || u.role === 'store_manager')) ||
          (trimmedId === 'stores' && (u.role === 'store_incharge' || u.role === 'store_manager')) ||
          (trimmedId === 'store_incharge' && (u.role === 'store_incharge' || u.role === 'store_manager')) ||
          (trimmedId === 'chandramani' && (u.id === 'usr-chandramani' || u.role === 'store_incharge' || u.name.toLowerCase().includes('chandramani'))) ||
          (trimmedId === 'ramesh' && (u.id === 'usr-chandramani' || u.id === 'usr-ramesh' || u.role === 'store_incharge')) ||
          (trimmedId === 'rahul' && (u.id === 'usr-rahul' || u.name.toLowerCase() === 'rahul')) ||
          (trimmedId === 'admin' && (u.role === 'kaustubh' || u.role === 'admin' || u.role === 'super_admin' || u.name.toLowerCase() === 'rahul'));
        return idMatch || nameMatch || emailMatch || roleMatch;
      });

      // Fallback search in INITIAL_USERS if not in current pool
      if (!targetUser) {
        targetUser = INITIAL_USERS.find((u) => {
          return (
            u.id.toLowerCase().includes(trimmedId) ||
            u.name.toLowerCase().includes(trimmedId) ||
            (trimmedId === 'rahul' && (u.id === 'usr-rahul' || u.name.toLowerCase() === 'rahul')) ||
            (trimmedId === 'chandramani' && (u.id === 'usr-chandramani' || u.role === 'store_incharge')) ||
            (trimmedId === 'ramesh' && (u.id === 'usr-chandramani' || u.id === 'usr-ramesh')) ||
            (trimmedId === 'store' && u.role === 'store_incharge')
          );
        });
      }
    }

    // Direct password match across users (e.g. typing Rahul@123 directly logs in as Rahul)
    if (!targetUser) {
      targetUser = searchPool.find((u) => {
        const exp =
          u.password ||
          (u.role === 'super_admin'
            ? 'Admin@amit'
            : u.role === 'kaustubh'
            ? 'admin@123'
            : u.id === 'usr-rahul' || u.name === 'Rahul'
            ? 'Rahul@123'
            : u.role === 'store_incharge' || u.role === 'store_manager'
            ? 'chandramani@123'
            : 'Rahul@123');
        return trimmedPass === exp || trimmedPass.toLowerCase() === exp.toLowerCase();
      }) || INITIAL_USERS.find((u) => trimmedPass === u.password || trimmedPass.toLowerCase() === (u.password || '').toLowerCase());
    }

    if (!targetUser) {
      return { success: false, error: 'User not recognized. Please check Login ID or Email.' };
    }

    // Case-tolerant password matching
    const lowerPass = trimmedPass.toLowerCase();
    const isSuperAdminPass = lowerPass === 'admin@amit' || lowerPass === 'amit@123' || trimmedPass === 'Admin@amit' || lowerPass === 'admin';
    const isAdminPass = lowerPass === 'admin@123' || lowerPass === 'kaustubh@123' || lowerPass === 'rahul@123' || trimmedPass === 'Rahul@123';
    const isStorePass = lowerPass === 'chandramani@123' || lowerPass === 'chandramani' || lowerPass === 'store@123' || lowerPass === 'ramesh@123' || lowerPass === 'store';
    const isRahulPass = lowerPass === 'rahul@123' || trimmedPass === 'Rahul@123' || lowerPass === 'rahul';

    const userExpectedPass = targetUser.password ? targetUser.password.toLowerCase() : '';

    const isValidPassword =
      trimmedPass === targetUser.password ||
      lowerPass === userExpectedPass ||
      (targetUser.role === 'super_admin' && isSuperAdminPass) ||
      ((targetUser.role === 'kaustubh' || targetUser.role === 'admin' || targetUser.name === 'Rahul') && (isAdminPass || isSuperAdminPass || isRahulPass)) ||
      ((targetUser.role === 'store_incharge' || targetUser.role === 'store_manager' || targetUser.id === 'usr-chandramani' || targetUser.id === 'usr-ramesh') && (isStorePass || isSuperAdminPass || isAdminPass)) ||
      (targetUser.role === 'operator' && (isRahulPass || isSuperAdminPass || isAdminPass));

    if (isValidPassword) {
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
        const hasUser = prev.some((u) => u.id === targetUser!.id);
        const baseList = hasUser ? prev : [...prev, targetUser!];
        const next = baseList.map((u) =>
          u.id === targetUser!.id
            ? { ...u, lastActive: 'Active Now', status: 'Active' as const }
            : u
        );
        localStorage.setItem(LOCAL_STORAGE_KEY + '_users', JSON.stringify(next));
        return next;
      });
      logAudit('System Login', 'Authentication', `${targetUser.name} (${targetUser.authLevel || targetUser.role}) logged in successfully.`);
      return { success: true };
    }

    return { success: false, error: 'Incorrect password for this user.' };
  };

  const loginAsUser = (userId: string, password: string): { success: boolean; error?: string } => {
    return login(userId, password);
  };

  const logout = () => {
    setIsAuthenticated(false);
    try {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
      localStorage.removeItem(AUTH_SESSION_KEY);
      sessionStorage.removeItem(LAST_ACTIVITY_KEY);
      localStorage.removeItem(LAST_ACTIVITY_KEY);
    } catch {}
    logAudit('System Logout', 'Authentication', `${currentUser.name} locked screen & logged out.`);
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
  }, [isAuthenticated, currentUser.name]);

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
    const poNum = req.poNo || req.poNumber || '36';
    const vendorNm = req.vendorName || req.vendor || 'Manav Metal';
    const formattedDate = req.date || req.poDate || new Date().toISOString().split('T')[0];
    const targetPrj = req.projectName || mchName;

    const newReq: ProjectMaterialRequirementItem = {
      ...req,
      id: 'pmr-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      srNo: projectRequirements.length + 1,
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

    setProjectRequirements((prev) => [...prev, newReq]);

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
    dbUpsertRequirement(newReq);

    // Auto-sync linked Project BOM
    setTimeout(() => syncProjectToBOM(targetPrj), 50);
  };

  const updateProjectRequirement = (id: string, updates: Partial<ProjectMaterialRequirementItem>) => {
    setProjectRequirements((prev) => {
      const exists = prev.some((r) => r.id === id);
      let updatedList: ProjectMaterialRequirementItem[];
      if (exists) {
        updatedList = prev.map((r) => {
          if (r.id === id) {
            const merged = { ...r, ...updates };
            merged.totalCost = (merged.materialCost || 0) + (merged.laborCost || 0) + (merged.machineCost || 0) + (merged.outsourcingCost || 0);
            dbUpsertRequirement(merged);
            return merged;
          }
          return r;
        });
      } else {
        const newEntry = { id, ...updates } as ProjectMaterialRequirementItem;
        dbUpsertRequirement(newEntry);
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
    const reqToDelete = projectRequirements.find((r) => r.id === id);
    if (reqToDelete) {
      const trashEntry: TrashItem = {
        id: `trash-req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: 'requirement',
        deletedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toISOString().split('T')[0],
        deletedBy: currentUser?.name || 'Amit',
        title: `${reqToDelete.description} (${reqToDelete.sizeSpecs})`,
        subtitle: `Project: ${reqToDelete.projectName} • ${reqToDelete.quantity} ${reqToDelete.unit} • Vendor: ${reqToDelete.vendor || 'Manav Metal'}`,
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
      }
    }

    setProjectRequirements((prev) => prev.filter((r) => r.id !== id));
    dbDeleteRequirement(id);
    logAudit('Requirement Deleted', 'Project Material Requirement', `Deleted Requirement ID ${id} (Moved to Trash)`);
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
          vendor: orderMatch.vendor || 'Manav Metal',
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

    const updates: Partial<ProjectMaterialRequirementItem> = willBeReceived
      ? {
          isReceived: true,
          receivedAt: formattedDate,
          receivedBy: currentUser?.name || 'Chandramani',
          receivedByInitials: initials,
          receivedByRole: userRoleDisplay,
          receivedNotes: customNotes || `Verified arrival by ${currentUser?.name || 'Chandramani'} (${userRoleDisplay})`,
          stockStatus: 'Available',
        }
      : {
          isReceived: false,
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

  // Replace and synchronize all requirements for a project in DB and local state
  const replaceProjectRequirements = (projectName: string, items: any[]) => {
    if (!projectName) return;
    
    // Find existing requirements in state for this project so we can preserve inward verification, custom flags, IDs if matched
    const currentProjectReqs = projectRequirements.filter(
      (r) => (r.projectName || '').trim().toLowerCase() === projectName.trim().toLowerCase()
    );

    // 1. Immediately delete from Supabase DB to purge any removed/duplicate rows
    dbDeleteRequirementsByProject(projectName);

    // 2. Map and insert active rows
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
      const poNum = it.poNo || it.poNumber || it['PO No'] || existing?.poNumber || '36';
      const cust = it.customerName || it['Customer'] || existing?.customerName || 'General Client';
      const mchType = it.machineName || it.machineType || existing?.machineName || prj;
      const unit = it.unit || it['Unit'] || existing?.unit || 'Nos';
      const vendor = it.vendorName || it.vendor || existing?.vendor || 'Manav Metal';
      const bomRef = it.bomRef || existing?.bomRef || `BOM-${prj}`;
      const orderedBy = it.orderedBy || existing?.orderedBy || currentUser?.name || 'Amit';
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

      return {
        id: resolvedId,
        srNo: idx + 1,
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

    setProjectRequirements((prev) => [
      ...prev.filter((r) => (r.projectName || '').trim().toLowerCase() !== projectName.trim().toLowerCase()),
      ...mapped,
    ]);

    if (mapped.length > 0) {
      dbBulkUpsertRequirements(mapped);
    }

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
        vendor: firstItem?.vendorName || 'Manav Metal',
        vendorName: firstItem?.vendorName || 'Manav Metal',
        poNumber: firstItem?.poNumber || '36',
        poNo: firstItem?.poNo || '36',
        startDate: firstItem?.date || todayFormatted,
        targetCompletionDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        priority: 'high',
        status: 'Material Procurement',
        projectValue: 450000,
        progressPct: 10,
        materialsCount: mapped.length,
        totalQuantity: totalQty,
        orderedBy: firstItem?.orderedBy || currentUser?.name || 'Amit',
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
      const poNum = it.poNo || it.poNumber || it['PO No'] || it['PO Number'] || '36';
      const cust = it.customerName || it['Customer'] || it['Customer Name'] || 'General Client';
      const mchType = it.machineName || it.machineType || it['Machine Name'] || it['Machine Type'] || prj;
      const unit = it.unit || it['Unit'] || 'Nos';
      const vendor = it.vendorName || it.vendor || it['Vendor Name'] || it['Vendor'] || 'Manav Metal';
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

      return {
        id: 'pmr-' + (projectRequirements.length + idx + 1) + '-' + Date.now(),
        srNo: projectRequirements.length + idx + 1,
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
          vendor: firstReq.vendor || 'Manav Metal',
          poNumber: firstReq.poNumber || '36',
          poNo: firstReq.poNumber || '36',
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
            vendor: matchedMat?.vendor || 'Manav Metal',
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
      const v = r.vendor || 'Manav Metal';
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
    setMaterials((prev) => [newMat, ...prev]);
    logAudit('Material Created', 'Materials Master', `Created material ${newMat.name} (${newMat.code})`);
    addNotification('Material Added', `Added ${newMat.name} to inventory catalog`, 'success', 'materials');
    dbUpsertMaterial(newMat);
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
    setMaterials((prev) => prev.filter((m) => m.id !== id));
    dbDeleteMaterial(id);
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
    dbUpsertProject(newPrj);
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
    const projectToDelete = projects.find((p) => p.id === id);
    if (projectToDelete) {
      const pNameLower = (projectToDelete.name || '').trim().toLowerCase();
      const pNumLower = (projectToDelete.projectNumber || '').trim().toLowerCase();

      const deletedReqs = projectRequirements.filter((r) => {
        const rProjLower = (r.projectName || '').trim().toLowerCase();
        return rProjLower === pNameLower || rProjLower === pNumLower;
      });

      // Move Project to Trash Bin
      const trashEntry: TrashItem = {
        id: `trash-prj-${Date.now()}`,
        type: 'project',
        deletedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toISOString().split('T')[0],
        deletedBy: currentUser?.name || 'Amit',
        title: `Project: ${projectToDelete.name} (${projectToDelete.projectNumber})`,
        subtitle: `Machine: ${projectToDelete.machineType || projectToDelete.machineName || 'Machine'} • Vendor: ${projectToDelete.vendor || 'Manav Metal'} • ${deletedReqs.length} Material Items`,
        projectData: projectToDelete,
      };
      setTrashItems((prev) => [trashEntry, ...prev]);

      // Always remove linked requirements when deleting project to prevent orphan ghost materials
      setProjectRequirements((prev) =>
        prev.filter((r) => {
          const rProjLower = (r.projectName || '').trim().toLowerCase();
          return rProjLower !== pNameLower && rProjLower !== pNumLower;
        })
      );
    }

    setProjects((prev) => prev.filter((p) => p.id !== id));

    // INSTANT DB DELETE
    dbDeleteProject(id);
    if (projectToDelete) {
      dbDeleteRequirementsByProject(projectToDelete.name);
    }
    logAudit('Project Deleted', 'Projects', `Deleted project ${projectToDelete?.name || id} (Moved to Trash)`);
    addNotification('Project Moved to Trash', `Deleted project ${projectToDelete?.name || id}. Restore anytime from Trash Bin.`, 'warning', 'projects');
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
      setProjectRequirements((prev) => [req, ...prev.filter((r) => r.id !== req.id)]);
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
    setVendors((prev) => [newVendor, ...prev]);
    dbUpsertVendor(newVendor);
    logAudit('Vendor Created', 'Vendor Management', `Added vendor ${newVendor.name}`);
  };

  const updateVendor = (id: string, updates: Partial<VendorItem>) => {
    setVendors((prev) =>
      prev.map((v) => {
        if (v.id === id) {
          const merged = { ...v, ...updates };
          dbUpsertVendor(merged);
          return merged;
        }
        return v;
      })
    );
    logAudit('Vendor Updated', 'Vendor Management', `Updated vendor ID ${id}`);
  };

  const deleteVendor = (id: string) => {
    setVendors((prev) => prev.filter((v) => v.id !== id));
    dbDeleteVendor(id);
    logAudit('Vendor Deleted', 'Vendor Management', `Deleted vendor ID ${id}`);
  };

  const learnVendor = (name: string, contactPerson?: string, mobile?: string, category?: string): VendorItem => {
    const cleanName = (name || '').trim();
    if (!cleanName) {
      return (
        vendors[0] || {
          id: 'vnd-default',
          name: 'Manav Metal',
          category: 'SS Raw Materials',
          contactPerson: 'Vendor Rep',
          mobile: '+91 98000 00000',
          email: 'sales@vendor.com',
          gstin: '24AAAAA0000A1Z5',
          address: 'Ahmedabad',
          paymentTerms: '30 Days',
          leadTimeDays: 7,
          rating: 4.8,
          allocatedItemsCount: 1,
        }
      );
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
  const addUser = (userData: Omit<User, 'id'>) => {
    const newUser: User = {
      ...userData,
      id: 'usr-' + Date.now(),
      status: userData.status || 'Active',
      lastActive: 'Just now',
    };
    setUsers((prev) => {
      const next = [newUser, ...prev];
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
        notes: `Vendor: ${r.vendorName || r.vendor || 'Manav Metal'} | PO: ${r.poNo || r.poNumber || 'N/A'}`,
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
    const newPO: PurchaseOrder = {
      ...po,
      id: 'po-' + (purchaseOrders.length + 1) + '-' + Date.now().toString().slice(-4),
    };
    setPurchaseOrders((prev) => [newPO, ...prev]);
    logAudit('PO Created', 'Purchase', `Generated PO ${newPO.poNumber} for ${newPO.vendor}`);
    addNotification('PO Issued', `Purchase Order ${newPO.poNumber} issued to ${newPO.vendor}`, 'info', 'purchase');
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
    }[],
    expectedDate?: string,
    notes?: string,
    customPoNumber?: string
  ): PurchaseOrder => {
    learnVendor(vendor);
    const count = String(purchaseOrders.length + 1).padStart(3, '0');
    const poNumber = customPoNumber || `PO-2026-${count}`;
    const totalAmount = items.reduce((sum, item) => sum + (item.amount || (item.qty * (item.rate || 0))), 0);
    const projectNames = Array.from(new Set(items.map((i) => i.projectName).filter(Boolean))) as string[];
    const machineNames = Array.from(new Set(items.map((i) => i.machineName).filter(Boolean))) as string[];

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
      items: items.map((i) => ({
        material: i.material,
        sizeSpecs: i.sizeSpecs,
        qty: i.qty,
        unit: i.unit,
        rate: i.rate || 0,
        amount: i.amount || (i.qty * (i.rate || 0)),
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
      const v = s.preferredVendor || 'Manav Metal';
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

  const resetToDemoData = () => {
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
    localStorage.clear();
    logAudit('System Reset', 'Super Admin', 'Reset full ERP database to RSB demo factory state');
    addNotification('System Reset', 'Reset to factory seed data', 'warning');
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
        addSalesOrder,
        updateSOStatus,
        saveCostingRecord,
        addBOM,
        updateBOM,
        approveBOM,
        copyBOM,
        deleteBOM,
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
        replaceProjectRequirements,
        toggleMaterialReceived,
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
