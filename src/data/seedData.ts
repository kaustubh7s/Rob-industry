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

export const INITIAL_VENDORS: VendorItem[] = [
  {
    id: 'vnd-1',
    name: 'Manav Metal',
    contactPerson: 'Sanjay Jain',
    mobile: '+91 98220 12345',
    email: 'sales@manavmetal.com',
    gstin: '27AABCM1234F1Z5',
    address: 'Waluj MIDC, Chhatrapati Sambhajinagar, Maharashtra',
    materialSupplied: 'SS 304 / 316 Flats, Plates & Round Bars',
    rating: 5.0,
    paymentTerms: '30 Days Net',
    totalOrders: 14,
    totalPurchaseValue: 485000,
    onTimeDeliveries: 14,
    delayedDeliveries: 0,
    averageDeliveryDays: 2,
    rejectionRate: 0,
    qualityRating: 99,
    costCompetitiveness: 9,
    reliabilityScore: 98,
  },
  {
    id: 'vnd-2',
    name: 'Jindal Stainless Steel',
    contactPerson: 'Rajesh Sharma',
    mobile: '+91 98900 54321',
    email: 'commercial@jindalstainless.com',
    gstin: '27AAACJ2234K1ZG',
    address: 'Chakan Industrial Area, Pune, Maharashtra',
    materialSupplied: 'SS Sheets, Coils & Heavy Plates',
    rating: 4.8,
    paymentTerms: '45 Days Net',
    totalOrders: 18,
    totalPurchaseValue: 1250000,
    onTimeDeliveries: 17,
    delayedDeliveries: 1,
    averageDeliveryDays: 3,
    rejectionRate: 0.5,
    qualityRating: 98,
    costCompetitiveness: 9,
    reliabilityScore: 96,
  },
  {
    id: 'vnd-3',
    name: 'Pooja Metal & Tubes',
    contactPerson: 'Pooja Agarwal',
    mobile: '+91 94222 98765',
    email: 'orders@poojametal.com',
    gstin: '27AABCP5678Q1Z1',
    address: 'Chikalthana MIDC, Chhatrapati Sambhajinagar, Maharashtra',
    materialSupplied: 'SS Seamless & ERW Pipes, Square Tubes',
    rating: 4.9,
    paymentTerms: '30 Days Net',
    totalOrders: 9,
    totalPurchaseValue: 320000,
    onTimeDeliveries: 9,
    delayedDeliveries: 0,
    averageDeliveryDays: 2,
    rejectionRate: 0,
    qualityRating: 100,
    costCompetitiveness: 8,
    reliabilityScore: 97,
  },
  {
    id: 'vnd-4',
    name: 'Apex Precision Laser Blanks',
    contactPerson: 'Vikas Deshmukh',
    mobile: '+91 98600 11223',
    email: 'laser@apexprecision.in',
    gstin: '27AAACA9876L1ZX',
    address: 'Shendra MIDC, Chhatrapati Sambhajinagar, Maharashtra',
    materialSupplied: 'CNC Laser Cut SS Profiles & Flanges',
    rating: 4.7,
    paymentTerms: '15 Days Net',
    totalOrders: 6,
    totalPurchaseValue: 195000,
    onTimeDeliveries: 6,
    delayedDeliveries: 0,
    averageDeliveryDays: 1,
    rejectionRate: 0,
    qualityRating: 99,
    costCompetitiveness: 9,
    reliabilityScore: 95,
  },
];

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
