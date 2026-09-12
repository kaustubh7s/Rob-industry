export type UserRole = 
  | 'kaustubh'
  | 'super_admin'
  | 'admin'
  | 'purchase_manager'
  | 'production_manager'
  | 'store_manager'
  | 'store_incharge'
  | 'accounts'
  | 'operator'
  | 'vendor';

export type AuthLevel = 
  | 'Tier 1: Super Admin'
  | 'Tier 2: Plant Head / Admin'
  | 'Tier 3: Department Manager'
  | 'Tier 4: Data Entry Operator'
  | 'Tier 5: External Vendor';

export interface UserPermissions {
  canEditMaterials: boolean;
  canApproveOrders: boolean;
  canDeleteRecords: boolean;
  canManageUsers: boolean;
  canExportReports: boolean;
  canOverrideLock: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  avatar?: string;
  department: string;
  vendorId?: string;
  authLevel?: AuthLevel;
  permissions?: UserPermissions;
  status?: 'Active' | 'Suspended' | 'Read Only';
  lastActive?: string;
}

export type MaterialType = 
  | 'SS Flat' 
  | 'SS Pipe' 
  | 'SS Circle' 
  | 'SS Bar' 
  | 'SS Sheet' 
  | 'SS Angle' 
  | 'Hardware' 
  | 'Consumables' 
  | 'Other';

export interface MaterialItem {
  id: string;
  code: string;
  name: string;
  type: MaterialType;
  grade: string; // e.g. SS 304, SS 316, SS 316L, MS
  thickness?: number; // mm
  sizeSpecs: string; // e.g. 80 x 6 x 485 or OD 106 x ID 75 x 110
  unit: string; // Nos, Kg, Meters, Mtr
  weightFormula?: string;
  unitWeightKg?: number;
  currentStock: number;
  reservedStock?: number;
  minStock: number;
  reorderLevel: number;
  unitCost: number; // in INR ₹
  vendor: string;
  notes?: string;
}

export interface VendorItem {
  id: string;
  name: string; // e.g. Manav Metal
  contactPerson: string;
  mobile: string;
  email: string;
  gstin: string;
  address: string;
  materialSupplied: string;
  rating: number; // 1 to 5
  paymentTerms: string; // e.g. 30 Days Net, Immediate
  totalOrders: number;
  totalPurchaseValue: number;
  onTimeDeliveries: number;
  delayedDeliveries: number;
  averageDeliveryDays: number;
  rejectionRate: number; // %
  qualityRating: number; // %
  costCompetitiveness: number; // 1 to 10
  reliabilityScore: number; // 1 to 100
  rank?: number;
}

export interface CustomerItem {
  id: string;
  name: string;
  contactPerson: string;
  mobile: string;
  email: string;
  gstin: string;
  address: string;
  segment: string; // Pharma, Food, Chemical, Dairy, Engineering
  paymentTerms: string;
  totalOrders: number;
  totalRevenue: number;
  rating: number;
}

export type MachineCategory = 
  | '10 HD'
  | '12 HD'
  | '16 HD'
  | '20 HD'
  | '24 HD'
  | '30 HD'
  | '40 HD'
  | 'Mono Conveyor'
  | 'Washing Unit'
  | 'Distributor'
  | 'Sealing Unit'
  | 'Cap Transfer'
  | 'Pipeline System'
  | 'Conveyor Assembly'
  | 'Custom Machine'
  | 'Custom Fabrication';

export interface MachineItem {
  id: string;
  code: string;
  name: string;
  type: MachineCategory;
  assignedProject?: string;
  productionHours: number;
  efficiency: number; // %
  status: 'running' | 'idle' | 'maintenance';
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  operatorAssigned?: string;
}

export type ProjectStatus = 
  | 'New'
  | 'Planning'
  | 'Material Procurement'
  | 'Production'
  | 'Quality Check'
  | 'Dispatch'
  | 'Completed';

export interface ProjectItem {
  id: string;
  projectNumber: string; // e.g. PRJ-2026-081
  name: string;
  customer: string;
  clientName?: string;
  clientNumber?: string;
  orderSource: string; // Customer PO, Tender, Direct Inquiry
  machineType: MachineCategory;
  startDate: string;
  targetCompletionDate: string;
  priority: 'high' | 'medium' | 'low';
  status: ProjectStatus;
  projectValue: number;
  poNumber: string;
  vendor?: string;
  machineName?: string;
  date?: string;
  targetDate?: string;
  poNo?: string;
  vendorName?: string;
  orderedBy?: string;
  createdDate?: string;
  lastUpdatedDate?: string;
  materialsCount?: number;
  totalQuantity?: number;
  bomId?: string;
  notes?: string;
  attachmentsCount?: number;
  progressPct: number;
  machineTypes?: string[];
  receivedMaterials?: number;
  arrivalPct?: number;
}

export interface TrashItem {
  id: string;
  type: 'project' | 'requirement';
  deletedAt: string;
  deletedBy: string;
  title: string;
  subtitle: string;
  projectData?: ProjectItem;
  requirementData?: ProjectMaterialRequirementItem;
}

export type ProductionStatus = 
  | 'Pending'
  | 'In Production'
  | 'Cutting'
  | 'Fabrication'
  | 'Assembly'
  | 'QC'
  | 'Ready For Dispatch'
  | 'Completed';

export type StockStatus = 'Available' | 'Partial Available' | 'Shortage' | 'Reserved';
export type QCStatus = 'Pending' | 'Passed' | 'Rework' | 'Rejected' | 'Not Started';
export type DispatchStatus = 'Not Ready' | 'Ready' | 'Dispatched' | 'Delivered';

// =========================================================================
// CORE HEART OF ERP: PROJECT MATERIAL REQUIREMENT TABLE ITEM INTERFACE
// =========================================================================
export interface ProjectMaterialRequirementItem {
  id: string;
  srNo: number;
  description: string; // e.g. Mono Conveyor Inlet Patti
  materialType: MaterialType;
  materialGrade: string; // SS 304, SS 316, SS 316L
  sizeSpecs: string; // e.g. 80 x 6 x 485
  quantity: number;
  unit: string; // Nos, Kg, Set
  weightKg?: number;
  
  // Project Info
  projectName: string;
  customerName?: string;
  poNumber: string;
  poDate: string;
  machineType: MachineCategory;
  orderSource?: string;
  deliveryDate?: string;
  machineName?: string;
  date?: string;
  poNo?: string;
  vendorName?: string;
  orderedBy?: string;

  // Vendor & Procurement
  vendor: string;
  bomRef: string; // e.g. BOM-MC-01
  lastPurchaseRate?: number;
  lastPurchaseDate?: string;
  vendorRating?: number;
  vendorReliability?: number;

  // Live Integrated Statuses
  stockStatus: StockStatus;
  availableStock: number;
  shortageQty: number;
  productionStatus: ProductionStatus;
  qcStatus: QCStatus;
  dispatchStatus: DispatchStatus;

  // Production Tracking
  jobCardNo?: string;
  assignedOperator?: string;
  assignedMachine?: string;
  productionStage?: string;
  startDate?: string;
  completionDate?: string;

  // Quality & Inspection
  inspector?: string;
  rejectionReason?: string;

  // Dispatch & Logistics
  dispatchDate?: string;
  vehicleNumber?: string;
  invoiceNumber?: string;

  // Costing & Financials
  materialCost: number;
  laborCost: number;
  machineCost: number;
  outsourcingCost: number;
  totalCost: number;
  sellingPriceAllocated?: number;

  // Inventory Flow & Material Inward Verification
  stockIssued?: boolean;
  scrapQty?: number;
  notes?: string;

  // Material Inward / Arrival Tracking
  isReceived?: boolean;
  receivedAt?: string;
  receivedBy?: string;
  receivedByInitials?: string;
  receivedByRole?: string;
  receivedNotes?: string;
}

// Main Production & Traceability Master Row (Legacy / Summary alias)
export interface ManufacturingOrderItem {
  id: string;
  orderNumber: string;
  poNumber: string;
  date: string;
  customer: string;
  vendor: string;
  machineType: MachineCategory;
  project: string;
  drawingRef: string;
  materialType: MaterialType;
  sizeSpecs: string;
  quantity: number;
  unit: string;
  inwardQty: number;
  outwardQty: number;
  currentStock: number;
  status: ProductionStatus;
  deliveryDate: string;
  orderSource: string;
  unitRate?: number;
  totalAmount?: number;
  notes?: string;
}

export type InwardStatus = 'Received' | 'QC Pending' | 'Approved' | 'Rejected';

export interface InwardEntry {
  id: string;
  inwardNumber: string;
  date: string;
  vendor: string;
  poNumber: string;
  challanNumber: string;
  invoiceNumber: string;
  materialType: MaterialType;
  sizeSpecs: string;
  quantity: number;
  unit: string;
  weightKg: number;
  receivedBy: string;
  qualityStatus: InwardStatus;
  remarks?: string;
  linkedOrderId?: string;
  linkedRequirementId?: string;
}

export type OutwardStatus = 'Ready' | 'Dispatched' | 'Delivered' | 'Returned';

export interface OutwardEntry {
  id: string;
  outwardNumber: string;
  dispatchDate: string;
  customer: string;
  project: string;
  material: string;
  quantity: number;
  unit: string;
  vehicleNumber: string;
  driverName: string;
  driverPhone?: string;
  invoiceNumber: string;
  dispatchPerson: string;
  deliveryStatus: OutwardStatus;
  linkedOrderId?: string;
  linkedRequirementId?: string;
  eWayBillNo?: string;
  transporter?: string;
}

export interface JobCardOperation {
  step: number;
  name: string;
  completed: boolean;
  operator: string;
  timeSpentHours: number;
  completedAt?: string;
}

export interface JobCard {
  id: string;
  jobCardNo: string;
  project: string;
  customer: string;
  drawingRef: string;
  material: string;
  sizeSpecs: string;
  quantity: number;
  unit: string;
  machineType: MachineCategory;
  assignedMachine?: string;
  assignedOperator: string;
  startDate: string;
  endDate: string;
  completionPct: number;
  status: ProductionStatus;
  operations: JobCardOperation[];
  notes?: string;
  qrPayload?: string;
  linkedOrderId?: string;
  linkedRequirementId?: string;
}

export interface QCInspection {
  id: string;
  inspectionNo: string;
  jobCardNo: string;
  project: string;
  material: string;
  dimensionsNominal: string;
  dimensionsMeasured: string;
  tolerance: string;
  surfaceFinish: string;
  visualInspection: 'Pass' | 'Fail' | 'Minor Scratch';
  inspector: string;
  status: 'Passed' | 'Rework' | 'Rejected';
  inspectionDate: string;
  defectNotes?: string;
  linkedRequirementId?: string;
}

export interface PurchaseOrderItem {
  material: string;
  sizeSpecs: string;
  qty: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  date: string;
  vendor: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  paymentTerms: string;
  expectedDate: string;
  status: 'Draft' | 'Sent' | 'Partially Received' | 'Received' | 'Cancelled';
  notes?: string;
  linkedRequirementId?: string;
}

export interface SalesOrderItem {
  description: string;
  machineType?: MachineCategory;
  qty: number;
  unitPrice: number;
  total: number;
}

export interface SalesOrder {
  id: string;
  soNumber: string;
  quoteNumber: string;
  customer: string;
  date: string;
  machineType: MachineCategory;
  project: string;
  items: SalesOrderItem[];
  totalValue: number;
  status: 'Enquiry' | 'Quotation' | 'Sales Order' | 'Invoiced' | 'Paid';
  deliveryDate: string;
  paymentTerms: string;
}

export interface ProjectCosting {
  id: string;
  projectId: string;
  projectName: string;
  customer: string;
  materialCost: number;
  laborCost: number;
  fabricationCost: number;
  outsourcingCost: number;
  transportCost: number;
  machineCost: number;
  totalProductionCost: number;
  sellingPrice: number;
  grossProfit: number;
  profitMarginPct: number;
  notes?: string;
}

export type BOMStatus = 'Draft' | 'Pending Approval' | 'Approved' | 'Archived';

export interface BOMItem {
  id: string;
  itemType: 'raw_material' | 'sub_assembly' | 'standard_part' | 'hardware';
  name: string;
  materialType?: MaterialType;
  sizeSpecs: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  drawingRef?: string;
  notes?: string;
  children?: BOMItem[];
}

export interface BOMRecord {
  id: string;
  bomNumber: string;
  machineType: MachineCategory;
  assemblyName: string;
  revision: string;
  status: BOMStatus;
  effectiveDate: string;
  createdBy: string;
  approvedBy?: string;
  items: BOMItem[];
  totalEstimatedCost: number;
  notes?: string;
  history?: { revision: string; changedBy: string; date: string; changeSummary: string }[];
}

export interface MRPRecord {
  materialId: string;
  materialCode: string;
  materialName: string;
  materialType: MaterialType;
  sizeSpecs: string;
  unit: string;
  requiredQty: number;
  availableStock: number;
  reservedStock: number;
  incomingPOQty: number;
  shortageQty: number;
  status: 'available' | 'partial' | 'purchase_required';
  unitCost: number;
  preferredVendor: string;
  allocatedProjects: string[];
}

export interface VendorQuotation {
  id: string;
  vendorId: string;
  vendorName: string;
  unitRate: number;
  totalAmount: number;
  leadTimeDays: number;
  notes: string;
  submittedDate: string;
  status: 'Submitted' | 'Approved' | 'Rejected';
}

export interface RFQRecord {
  id: string;
  rfqNumber: string;
  title: string;
  material: string;
  sizeSpecs: string;
  quantity: number;
  unit: string;
  createdDate: string;
  dueDate: string;
  status: 'Open' | 'Closed' | 'Awarded';
  drawingRef?: string;
  specNotes?: string;
  quotations: VendorQuotation[];
}

export interface VendorDocument {
  id: string;
  vendorName: string;
  docType: 'Invoice' | 'Challan' | 'Test Certificate' | 'Drawing';
  docNumber: string;
  uploadDate: string;
  fileName: string;
  fileSize: string;
  status: 'Verified' | 'Pending Review';
  linkedPO?: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userName: string;
  userRole: UserRole;
  action: string;
  module: string;
  details: string;
}

export interface Notification {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  read: boolean;
  linkTab?: string;
}

// Synced Live Factory & Cross-Admin Workflow Types
export interface ActiveProcessingMaterial {
  id: string;
  sourceType: 'job_card' | 'inward_batch' | 'requirement' | 'order';
  sourceId: string;
  displayBadge: string;
  materialName: string;
  grade: string;
  sizeSpecs: string;
  lotHeatNo: string;
  quantity: number;
  unit: string;
  projectName: string;
  customerName: string;
  jobCardNo: string;
  assignedMachine?: string;
  assignedOperator?: string;
  currentStage: string;
  status: string;
  nominalDimensions: string;
  tolerance: string;
  surfaceFinish: string;
  isQCPassed: boolean;
}

export interface DispatchReadyItem {
  id: string;
  jobCardNo: string;
  orderNumber?: string;
  projectName: string;
  customerName: string;
  material: string;
  sizeSpecs: string;
  quantity: number;
  unit: string;
  qcInspectionNo: string;
  qcStatus: 'Passed';
  heatNo: string;
  poNumber: string;
  invoiceNumber?: string;
}

