import {
  User,
  MaterialItem,
  VendorItem,
  CustomerItem,
  MachineItem,
  ProjectItem,
  ManufacturingOrderItem,
  InwardEntry,
  OutwardEntry,
  JobCard,
  QCInspection,
  PurchaseOrder,
  SalesOrder,
  ProjectCosting,
  AuditLog,
  Notification,
  BOMRecord,
  RFQRecord,
  VendorDocument,
  ProjectMaterialRequirementItem,
} from '../types/erp';

export const INITIAL_USERS: User[] = [
  {
    id: 'usr-kaustubh',
    name: 'Kaustubh',
    email: 'kaustubh@rsbequipments.com',
    role: 'super_admin',
    password: 'kaustubh7276',
    department: 'Executive Management & Hidden Admin',
    authLevel: 'Tier 1: Super Admin',
    status: 'Active',
    lastActive: 'Active Now',
    permissions: {
      canEditMaterials: true,
      canApproveOrders: true,
      canDeleteRecords: true,
      canManageUsers: true,
      canExportReports: true,
      canOverrideLock: true,
      canVerifyInward: true,
    },
  },
  {
    id: 'usr-admin',
    name: 'Administrator',
    email: 'admin@rsbequipments.com',
    role: 'super_admin',
    password: 'Admin@123',
    department: 'Super Admin & Executive Management',
    authLevel: 'Tier 1: Super Admin',
    status: 'Active',
    lastActive: 'Active Now',
    permissions: {
      canEditMaterials: true,
      canApproveOrders: true,
      canDeleteRecords: true,
      canManageUsers: true,
      canExportReports: true,
      canOverrideLock: true,
      canVerifyInward: true,
    },
  },
  {
    id: 'usr-rahul',
    name: 'Rahul',
    email: 'rahul@rsbequipments.com',
    role: 'super_admin',
    password: 'Rahul@123',
    department: 'Super Admin & Plant Operations',
    authLevel: 'Tier 1: Super Admin',
    status: 'Active',
    lastActive: 'Active Now',
    permissions: {
      canEditMaterials: true,
      canApproveOrders: true,
      canDeleteRecords: true,
      canManageUsers: true,
      canExportReports: true,
      canOverrideLock: true,
      canVerifyInward: true,
    },
  },
];

export const INITIAL_MATERIALS: MaterialItem[] = [];

export const INITIAL_VENDORS: VendorItem[] = [];

export const INITIAL_CUSTOMERS: CustomerItem[] = [];

export const INITIAL_MACHINES: MachineItem[] = [];

export const INITIAL_BOMS: BOMRecord[] = [];

export const INITIAL_RFQS: RFQRecord[] = [];

export const INITIAL_VENDOR_DOCUMENTS: VendorDocument[] = [];

export const INITIAL_PROJECTS: ProjectItem[] = [];

export const INITIAL_PROJECT_REQUIREMENTS: ProjectMaterialRequirementItem[] = [];

export const INITIAL_ORDERS: ManufacturingOrderItem[] = [];

export const INITIAL_INWARD: InwardEntry[] = [];

export const INITIAL_OUTWARD: OutwardEntry[] = [];

export const INITIAL_JOB_CARDS: JobCard[] = [];

export const INITIAL_QC: QCInspection[] = [];

export const INITIAL_PURCHASE_ORDERS: PurchaseOrder[] = [];

export const INITIAL_SALES_ORDERS: SalesOrder[] = [];

export const INITIAL_COSTING: ProjectCosting[] = [];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [];

export const INITIAL_NOTIFICATIONS: Notification[] = [];
