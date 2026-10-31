import { getSupabaseClient } from '../lib/supabaseClient';
import {
  ProjectItem,
  ProjectMaterialRequirementItem,
  MaterialItem,
  ManufacturingOrderItem,
  InwardEntry,
  OutwardEntry,
  JobCard,
  QCInspection,
  VendorItem,
  CustomerItem,
  User,
  MasterBOM,
  MasterBOMItem,
  MachineFolder,
  DailyRequirementItem,
  DailyRequirementHistoryItem,
} from '../types/erp';
import {
  Workbook,
  WorkbookDirectory,
  WorkbookSheet,
  SheetCell,
} from '../types/workbook';
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
  getDeletedVendorTombstones,
  addVendorTombstone,
  getDeletedBOMTombstones,
  addBOMTombstone,
} from '../utils/tombstones';
import { sortRowsByAscendingSrNo } from '../utils/projectMaterialsHelper';

export interface DbMutationMessage {
  action: 'UPSERT' | 'DELETE' | 'BULK_UPSERT' | 'BULK_DELETE';
  entity: 'requirement' | 'project' | 'material' | 'vendor' | 'customer' | 'master_machine' | 'master_bom' | 'daily_requirement';
  id?: string;
  ids?: string[];
  data?: any;
  timestamp: number;
}

let broadcastChannelInstance: any = null;

export const getBroadcastChannel = () => {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  if (!broadcastChannelInstance) {
    broadcastChannelInstance = supabase.channel('rsb-system-broadcast');
    broadcastChannelInstance.subscribe();
  }
  return broadcastChannelInstance;
};

export const broadcastDbMutation = async (mutation: Omit<DbMutationMessage, 'timestamp'>) => {
  try {
    const ch = getBroadcastChannel();
    if (!ch) return;
    await ch.send({
      type: 'broadcast',
      event: 'DB_MUTATION',
      payload: {
        ...mutation,
        timestamp: Date.now(),
      },
    });
  } catch (err) {
    console.warn('Realtime broadcastDbMutation failed:', err);
  }
};

export const toSafeIsoTimestamp = (val?: any): string => {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) return isNaN(val.getTime()) ? new Date().toISOString() : val.toISOString();
  if (typeof val === 'number') return isNaN(val) ? new Date().toISOString() : new Date(val).toISOString();
  const str = String(val).trim();
  if (!str || str === '-' || str === 'undefined' || str === 'null') return new Date().toISOString();
  const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})(.*)$/);
  if (dmyMatch) {
    const [, day, month, year, rest] = dmyMatch;
    const timeRest = rest && rest.trim().length > 0 ? rest.trim() : 'T12:00:00.000Z';
    const isoCandidate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}${timeRest.startsWith('T') ? timeRest : 'T' + timeRest}`;
    const d = new Date(isoCandidate);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString();
  return new Date().toISOString();
};

export const SUPABASE_SCHEMA_SQL = `-- =========================================================================
-- RSB EQUIPMENTS ERP — SUPABASE POSTGRESQL SCHEMA INITIALIZATION
-- Paste this script into your Supabase Dashboard -> SQL Editor -> Run
-- =========================================================================

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
  id TEXT PRIMARY KEY,
  project_number TEXT NOT NULL,
  name TEXT NOT NULL,
  customer TEXT NOT NULL,
  order_source TEXT DEFAULT 'Customer PO',
  machine_type TEXT DEFAULT 'Custom Machine',
  vendor TEXT,
  po_number TEXT,
  start_date DATE,
  target_completion_date DATE,
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'Production',
  project_value NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Project Material Requirements Table
CREATE TABLE IF NOT EXISTS public.project_material_requirements (
  id TEXT PRIMARY KEY,
  sr_no TEXT,
  description TEXT NOT NULL,
  material_type TEXT NOT NULL,
  material_grade TEXT DEFAULT 'SS 304',
  size_specs TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT NOT NULL,
  weight_kg NUMERIC,
  project_name TEXT NOT NULL,
  customer_name TEXT,
  po_number TEXT,
  po_date TEXT,
  machine_type TEXT,
  order_source TEXT,
  delivery_date TEXT,
  vendor TEXT,
  bom_ref TEXT,
  last_purchase_rate NUMERIC,
  last_purchase_date TEXT,
  vendor_rating NUMERIC,
  vendor_reliability NUMERIC,
  stock_status TEXT DEFAULT 'Available',
  available_stock NUMERIC DEFAULT 0,
  shortage_qty NUMERIC DEFAULT 0,
  production_status TEXT DEFAULT 'Pending',
  qc_status TEXT DEFAULT 'Not Started',
  dispatch_status TEXT DEFAULT 'Not Ready',
  job_card_no TEXT,
  assigned_operator TEXT,
  assigned_machine TEXT,
  production_stage TEXT,
  material_cost NUMERIC DEFAULT 0,
  labor_cost NUMERIC DEFAULT 0,
  machine_cost NUMERIC DEFAULT 0,
  outsourcing_cost NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  selling_price_allocated NUMERIC DEFAULT 0,
  notes TEXT,
  ordered_by TEXT,
  is_received BOOLEAN DEFAULT FALSE,
  received_at TEXT,
  received_by TEXT,
  received_by_initials TEXT,
  received_by_role TEXT,
  received_notes TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Raw Materials Catalog Table
CREATE TABLE IF NOT EXISTS public.materials (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  grade TEXT DEFAULT 'SS 304',
  thickness NUMERIC,
  size_specs TEXT,
  unit TEXT DEFAULT 'Nos',
  unit_weight_kg NUMERIC,
  current_stock NUMERIC DEFAULT 0,
  reserved_stock NUMERIC DEFAULT 0,
  min_stock NUMERIC DEFAULT 0,
  reorder_level NUMERIC DEFAULT 0,
  unit_cost NUMERIC DEFAULT 0,
  vendor TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Manufacturing Orders Table
CREATE TABLE IF NOT EXISTS public.manufacturing_orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL,
  po_number TEXT,
  date DATE,
  customer TEXT,
  vendor TEXT,
  machine_type TEXT,
  project TEXT,
  drawing_ref TEXT,
  material_type TEXT,
  size_specs TEXT,
  quantity NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'Nos',
  inward_qty NUMERIC DEFAULT 0,
  outward_qty NUMERIC DEFAULT 0,
  current_stock NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Pending',
  delivery_date DATE,
  order_source TEXT,
  unit_rate NUMERIC DEFAULT 0,
  total_amount NUMERIC DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Job Cards Table
CREATE TABLE IF NOT EXISTS public.job_cards (
  id TEXT PRIMARY KEY,
  job_card_no TEXT NOT NULL,
  project TEXT,
  customer TEXT,
  drawing_ref TEXT,
  material TEXT,
  size_specs TEXT,
  quantity NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'Nos',
  machine_type TEXT,
  assigned_operator TEXT,
  start_date DATE,
  end_date DATE,
  completion_pct NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Pending',
  linked_order_id TEXT,
  linked_requirement_id TEXT,
  operations JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  qr_payload TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Inward & Outward Entries
CREATE TABLE IF NOT EXISTS public.inward_entries (
  id TEXT PRIMARY KEY,
  inward_number TEXT NOT NULL,
  date DATE,
  vendor TEXT,
  po_number TEXT,
  challan_number TEXT,
  invoice_number TEXT,
  material_type TEXT,
  size_specs TEXT,
  quantity NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'Nos',
  weight_kg NUMERIC DEFAULT 0,
  received_by TEXT,
  quality_status TEXT DEFAULT 'Approved',
  remarks TEXT,
  linked_order_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.outward_entries (
  id TEXT PRIMARY KEY,
  outward_number TEXT NOT NULL,
  dispatch_date DATE,
  customer TEXT,
  project TEXT,
  material TEXT,
  quantity NUMERIC DEFAULT 0,
  unit TEXT DEFAULT 'Nos',
  vehicle_number TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  invoice_number TEXT,
  dispatch_person TEXT,
  delivery_status TEXT DEFAULT 'Pending',
  e_way_bill_no TEXT,
  transporter TEXT,
  linked_order_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Vendors & Customers
CREATE TABLE IF NOT EXISTS public.vendors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  mobile TEXT,
  email TEXT,
  gstin TEXT,
  address TEXT,
  material_supplied TEXT,
  rating NUMERIC DEFAULT 5.0,
  payment_terms TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_person TEXT,
  mobile TEXT,
  email TEXT,
  gstin TEXT,
  city TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Users & Access Matrix
CREATE TABLE IF NOT EXISTS public.erp_users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL,
  department TEXT,
  status TEXT DEFAULT 'Active',
  auth_level TEXT DEFAULT 'Tier 3 (Operator)',
  permissions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Microsoft Workbook Center Tables
CREATE TABLE IF NOT EXISTS public.workbook_directories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT 'Folder',
  color TEXT DEFAULT '#3b82f6',
  created_by TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workbooks (
  id TEXT PRIMARY KEY,
  directory_id TEXT NOT NULL REFERENCES public.workbook_directories(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  created_by TEXT,
  created_by_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_edited_by TEXT,
  last_edited_by_name TEXT,
  last_edited_at TIMESTAMPTZ DEFAULT NOW(),
  is_pinned BOOLEAN DEFAULT FALSE,
  is_favorite BOOLEAN DEFAULT FALSE,
  tags TEXT[],
  sheets_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.workbook_activity_logs (
  id TEXT PRIMARY KEY,
  workbook_id TEXT,
  action TEXT NOT NULL,
  user_name TEXT,
  user_role TEXT,
  details TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.deleted_workbook_items (
  id TEXT PRIMARY KEY,
  item_type TEXT NOT NULL,
  title TEXT NOT NULL,
  original_data JSONB,
  deleted_by TEXT,
  deleted_by_name TEXT,
  deleted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) & allow authenticated / anon access
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_material_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manufacturing_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inward_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outward_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.erp_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workbook_directories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workbook_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deleted_workbook_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public full access for projects" ON public.projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access for requirements" ON public.project_material_requirements FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access for materials" ON public.materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access for orders" ON public.manufacturing_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access for job_cards" ON public.job_cards FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access for inward" ON public.inward_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access for outward" ON public.outward_entries FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access for vendors" ON public.vendors FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access for customers" ON public.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access for users" ON public.erp_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access for workbook_directories" ON public.workbook_directories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access for workbooks" ON public.workbooks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access for workbook_activity_logs" ON public.workbook_activity_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public full access for deleted_workbook_items" ON public.deleted_workbook_items FOR ALL USING (true) WITH CHECK (true);

-- Enable Realtime Replication Publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.projects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.project_material_requirements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.materials;
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
`;

// Push all local factory state to Supabase
export const pushAllDataToSupabase = async (erpState: {
  projects: ProjectItem[];
  requirements: ProjectMaterialRequirementItem[];
  materials: MaterialItem[];
  orders: ManufacturingOrderItem[];
  jobCards: JobCard[];
  inwardEntries: InwardEntry[];
  outwardEntries: OutwardEntry[];
  vendors: VendorItem[];
  customers: CustomerItem[];
  users: User[];
}): Promise<{ success: boolean; count: number; message: string; details?: string[] }> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, count: 0, message: 'Supabase client is not configured' };
  }

  const details: string[] = [];
  let totalCount = 0;

  try {
    // 1. Projects
    if (erpState.projects.length > 0) {
      const mappedProjects = erpState.projects.map((p) => ({
        id: p.id,
        project_number: p.projectNumber,
        name: p.name,
        customer: p.customer,
        order_source: p.orderSource,
        machine_type: p.machineType,
        vendor: p.vendor,
        po_number: p.poNumber,
        start_date: p.startDate || null,
        target_completion_date: p.targetCompletionDate || null,
        priority: p.priority,
        status: p.status,
        project_value: p.projectValue || 0,
        notes: p.notes,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase.from('projects').upsert(mappedProjects, { onConflict: 'id' });
      if (error) details.push(`Projects sync warning: ${error.message}`);
      else totalCount += mappedProjects.length;
    }

    // 2. Project Requirements
    if (erpState.requirements.length > 0) {
      const mappedReqs = erpState.requirements.map((r) => ({
        id: r.id,
        sr_no: r.srNo,
        description: r.description,
        material_type: r.materialType,
        material_grade: r.materialGrade,
        size_specs: r.sizeSpecs,
        quantity: r.quantity,
        unit: r.unit,
        weight_kg: r.weightKg,
        project_name: r.projectName,
        customer_name: r.customerName,
        po_number: r.poNumber,
        po_date: r.poDate,
        machine_type: r.machineType,
        order_source: r.orderSource,
        delivery_date: r.deliveryDate,
        vendor: r.vendor,
        bom_ref: r.bomRef,
        last_purchase_rate: r.lastPurchaseRate,
        last_purchase_date: r.lastPurchaseDate,
        vendor_rating: r.vendorRating,
        vendor_reliability: r.vendorReliability,
        stock_status: r.stockStatus,
        available_stock: r.availableStock,
        shortage_qty: r.shortageQty,
        production_status: r.productionStatus,
        qc_status: r.qcStatus,
        dispatch_status: r.dispatchStatus,
        job_card_no: r.jobCardNo,
        assigned_operator: r.assignedOperator,
        assigned_machine: r.assignedMachine,
        production_stage: r.productionStage,
        material_cost: r.materialCost,
        labor_cost: r.laborCost,
        machine_cost: r.machineCost,
        outsourcing_cost: r.outsourcingCost,
        total_cost: r.totalCost,
        selling_price_allocated: r.sellingPriceAllocated,
        notes: (r.notes || '')
          .replace(/\[ARRIVED_QTY:[^\]]*\]/g, '')
          .replace(/\[PENDING_QTY:[^\]]*\]/g, '')
          .replace(/\[INWARD_VERIFIED:[^\]]*\]/g, '')
          .replace(/\[RECEIVED_BY:[^\]]*\]/g, '')
          .replace(/\[RECEIVED_AT:[^\]]*\]/g, '')
          .replace(/\[RECEIVED_INITIALS:[^\]]*\]/g, '')
          .replace(/\[RECEIVED_ROLE:[^\]]*\]/g, '')
          .replace(/\[RECEIVED_NOTES:[^\]]*\]/g, '')
          .trim()
          + (r.receivedQuantity !== undefined && r.receivedQuantity !== null ? ` [ARRIVED_QTY:${r.receivedQuantity}]` : '')
          + (r.pendingQuantity !== undefined && r.pendingQuantity !== null ? ` [PENDING_QTY:${r.pendingQuantity}]` : '')
          + (r.isReceived ? ` [INWARD_VERIFIED:${r.receivedBy || 'Chandramani'}:${r.receivedAt || new Date().toISOString()}:${r.receivedByInitials || 'CP'}]` : '')
          + (r.receivedBy ? ` [RECEIVED_BY:${r.receivedBy}]` : '')
          + (r.receivedAt ? ` [RECEIVED_AT:${r.receivedAt}]` : '')
          + (r.receivedByInitials ? ` [RECEIVED_INITIALS:${r.receivedByInitials}]` : '')
          + (r.receivedByRole ? ` [RECEIVED_ROLE:${r.receivedByRole}]` : '')
          + (r.receivedNotes ? ` [RECEIVED_NOTES:${r.receivedNotes}]` : ''),
        ordered_by: r.orderedBy,
        timestamp: toSafeIsoTimestamp((r as any).timestamp || r.date || (r as any).poDate),
      }));

      const { error } = await supabase.from('project_material_requirements').upsert(mappedReqs, { onConflict: 'id' });
      if (error) details.push(`Requirements sync warning: ${error.message}`);
      else totalCount += mappedReqs.length;
    }

    // 3. Raw Materials Catalog
    if (erpState.materials.length > 0) {
      const mappedMats = erpState.materials.map((m) => ({
        id: m.id,
        code: m.code,
        name: m.name,
        type: m.type,
        grade: m.grade,
        thickness: m.thickness,
        size_specs: m.sizeSpecs,
        unit: m.unit,
        unit_weight_kg: m.unitWeightKg,
        current_stock: m.currentStock,
        reserved_stock: m.reservedStock,
        min_stock: m.minStock,
        reorder_level: m.reorderLevel,
        unit_cost: m.unitCost,
        vendor: m.vendor,
        notes: m.notes,
      }));

      const { error } = await supabase.from('materials').upsert(mappedMats, { onConflict: 'id' });
      if (error) details.push(`Materials sync warning: ${error.message}`);
      else totalCount += mappedMats.length;
    }

    // 4. Vendors
    if (erpState.vendors.length > 0) {
      const mappedVendors = erpState.vendors.map((v) => ({
        id: v.id,
        name: v.name,
        contact_person: v.contactPerson || null,
        mobile: v.mobile || null,
        email: v.email || null,
        gstin: v.gstin || null,
        address: v.address || null,
        material_supplied: v.materialSupplied || null,
        rating: v.rating || 5.0,
        payment_terms: v.paymentTerms || null,
      }));

      const { error } = await supabase.from('vendors').upsert(mappedVendors, { onConflict: 'id' });
      if (error) details.push(`Vendors sync warning: ${error.message}`);
      else totalCount += mappedVendors.length;
    }

    // 5. Customers
    if (erpState.customers.length > 0) {
      const mappedCustomers = erpState.customers.map((c) => ({
        id: c.id,
        name: c.name,
        contact_person: c.contactPerson || null,
        mobile: c.mobile || null,
        email: c.email || null,
        gstin: c.gstin || null,
        city: (c as any).city || (c.address ? c.address.split(',').pop()?.trim() : null),
      }));

      const { error } = await supabase.from('customers').upsert(mappedCustomers, { onConflict: 'id' });
      if (error) details.push(`Customers sync warning: ${error.message}`);
      else totalCount += mappedCustomers.length;
    }

    // 6. Users
    if (erpState.users.length > 0) {
      const mappedUsers = erpState.users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        department: u.department || null,
        status: u.status || 'Active',
        auth_level: u.authLevel || null,
        permissions: {
          ...(u.permissions || {}),
          password: u.password,
          resetPin: u.resetPin,
          resetPinExpiresAt: u.resetPinExpiresAt,
        },
      }));

      const { error } = await supabase.from('erp_users').upsert(mappedUsers, { onConflict: 'id' });
      if (error) details.push(`Users sync warning: ${error.message}`);
      else totalCount += mappedUsers.length;
    }

    return {
      success: true,
      count: totalCount,
      message: `Successfully synchronized ${totalCount} records to Supabase Cloud!`,
      details,
    };
  } catch (err: any) {
    return {
      success: false,
      count: totalCount,
      message: `Sync failed: ${err?.message || 'Unknown error'}`,
      details,
    };
  }
};// Pull remote data from Supabase into local ERP
export const pullAllDataFromSupabase = async (): Promise<{
  success: boolean;
  data?: {
    projects?: ProjectItem[];
    requirements?: ProjectMaterialRequirementItem[];
    materials?: MaterialItem[];
    vendors?: VendorItem[];
    customers?: CustomerItem[];
    users?: User[];
  };
  message: string;
}> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, message: 'Supabase client is not configured' };
  }

  try {
    // 1. Parallel fetch all tables concurrently for instant initial sync
    const [
      { data: prjData, error: prjErr },
      { data: reqData, error: reqErr },
      { data: matData },
      { data: vndData },
      { data: custData },
      { data: usrData },
    ] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('project_material_requirements').select('*').order('timestamp', { ascending: false }),
      supabase.from('materials').select('*'),
      supabase.from('vendors').select('*'),
      supabase.from('customers').select('*'),
      supabase.from('erp_users').select('*'),
    ]);

    if (prjErr) throw prjErr;
    if (reqErr) throw reqErr;

    // Database is authoritative ground truth: any active project in Supabase clears stale tombstones
    const prjTombstones = getDeletedProjectTombstones();
    (prjData || []).forEach((p: any) => {
      if (prjTombstones.has(p.id)) {
        removeProjectTombstone(p.id);
        prjTombstones.delete(p.id);
      }
    });

    const parsedProjects: ProjectItem[] = (prjData || []).map((p: any) => ({
        id: p.id,
        projectNumber: p.project_number,
        name: p.name,
        customer: p.customer,
        orderSource: p.order_source,
        machineType: p.machine_type,
        machineName: p.machine_name || p.machine_type,
        vendor: p.vendor,
        vendorName: p.vendor_name || p.vendor,
        poNumber: p.po_number,
        poNo: p.po_no || p.po_number,
        startDate: p.start_date || new Date().toISOString().split('T')[0],
        date: p.date || p.start_date || new Date().toISOString().split('T')[0],
        targetCompletionDate: p.target_completion_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
        priority: p.priority || 'medium',
        status: p.status || 'Production',
        projectValue: Number(p.project_value || 0),
        notes: p.notes,
        progressPct: Number(p.progress_pct || 0),
      }));

    // 2. Fetch Requirements
    // Tombstones represent explicit user deletions: filter out tombstoned rows so they never resurrect
    const reqTombstones = getDeletedRequirementTombstones();
    const activeReqData = (reqData || []).filter((r: any) => {
      if (reqTombstones.has(r.id)) {
        supabase.from('project_material_requirements').delete().eq('id', r.id).then(() => {});
        return false;
      }
      return true;
    });

    const parsedRequirements: ProjectMaterialRequirementItem[] = activeReqData
      .map((r: any) => {
        const notesStr = String(r.notes || '');
        let tagReceived = false;
        let tagBy: string | undefined = undefined;
        let tagAt: string | undefined = undefined;
        let tagInitials: string | undefined = undefined;
        if (notesStr.includes('[INWARD_VERIFIED')) {
          tagReceived = true;
          const match = notesStr.match(/\[INWARD_VERIFIED:([^:]*):([^:]*):([^\]]*)\]/);
          if (match) {
            tagBy = match[1] || undefined;
            tagAt = match[2] || undefined;
            tagInitials = match[3] || undefined;
          }
        }

        let resolvedSrNo: string | number = r.sr_no;
        if (notesStr.includes('[ORIGINAL_SR_NO:')) {
          const srMatch = notesStr.match(/\[ORIGINAL_SR_NO:([^\]]+)\]/);
          if (srMatch && srMatch[1]) {
            resolvedSrNo = srMatch[1];
          }
        }

        let resolvedMachineName: string | undefined = undefined;
        const mchMatch = notesStr.match(/\[MACHINE_NAME:([^\]]*)\]/);
        if (mchMatch && mchMatch[1]) resolvedMachineName = mchMatch[1];
        else if (r.machine_name) resolvedMachineName = r.machine_name;
        else if (r.machine_type) resolvedMachineName = r.machine_type;

        let resolvedPoNo: string | undefined = undefined;
        const poMatch = notesStr.match(/\[PO_NO:([^\]]*)\]/);
        if (poMatch && poMatch[1]) resolvedPoNo = poMatch[1];
        else if (r.po_no) resolvedPoNo = r.po_no;
        else if (r.po_number) resolvedPoNo = r.po_number;

        let resolvedDate: string | undefined = undefined;
        const dateMatch = notesStr.match(/\[DATE:([^\]]*)\]/);
        if (dateMatch && dateMatch[1]) resolvedDate = dateMatch[1];
        else if (r.date) resolvedDate = r.date;
        else if (r.po_date) resolvedDate = r.po_date;

        let resolvedVendorName: string | undefined = undefined;
        const vendorMatch = notesStr.match(/\[VENDOR_NAME:([^\]]*)\]/);
        if (vendorMatch && vendorMatch[1]) resolvedVendorName = vendorMatch[1];
        else if (r.vendor) resolvedVendorName = r.vendor;

        let resolvedOrderedBy: string | undefined = undefined;
        const ordMatch = notesStr.match(/\[ORDERED_BY:([^\]]*)\]/);
        if (ordMatch && ordMatch[1]) resolvedOrderedBy = ordMatch[1];
        else if (r.ordered_by) resolvedOrderedBy = r.ordered_by;

        let resolvedReceivedQty: number | undefined = undefined;
        const arrMatch = notesStr.match(/\[ARRIVED_QTY:([^\]]*)\]/);
        if (arrMatch && arrMatch[1] !== undefined && arrMatch[1].trim() !== '') {
          resolvedReceivedQty = Number(arrMatch[1]);
        }

        const totalQuantity = Number(r.quantity || 0);

        let resolvedPendingQty: number | undefined = undefined;
        const pendMatch = notesStr.match(/\[PENDING_QTY:([^\]]*)\]/);
        if (pendMatch && pendMatch[1] !== undefined && pendMatch[1].trim() !== '') {
          resolvedPendingQty = Number(pendMatch[1]);
        } else if (resolvedReceivedQty !== undefined) {
          resolvedPendingQty = Math.max(0, totalQuantity - resolvedReceivedQty);
        }

        let resolvedReceivedBy: string | undefined = tagBy;
        const byMatch = notesStr.match(/\[RECEIVED_BY:([^\]]*)\]/);
        if (byMatch && byMatch[1]) resolvedReceivedBy = byMatch[1];

        let resolvedReceivedAt: string | undefined = tagAt;
        const atMatch = notesStr.match(/\[RECEIVED_AT:([^\]]*)\]/);
        if (atMatch && atMatch[1]) resolvedReceivedAt = atMatch[1];

        let resolvedReceivedInitials: string | undefined = tagInitials;
        const iniMatch = notesStr.match(/\[RECEIVED_INITIALS:([^\]]*)\]/);
        if (iniMatch && iniMatch[1]) resolvedReceivedInitials = iniMatch[1];

        let resolvedReceivedRole: string | undefined = undefined;
        const roleMatch = notesStr.match(/\[RECEIVED_ROLE:([^\]]*)\]/);
        if (roleMatch && roleMatch[1]) resolvedReceivedRole = roleMatch[1];

        let resolvedReceivedNotes: string | undefined = undefined;
        const recNotesMatch = notesStr.match(/\[RECEIVED_NOTES:([^\]]*)\]/);
        if (recNotesMatch && recNotesMatch[1]) resolvedReceivedNotes = recNotesMatch[1];
        else if (resolvedReceivedQty !== undefined) resolvedReceivedNotes = String(resolvedReceivedQty);

        const isReceived = Boolean(
          tagReceived ||
          (resolvedReceivedQty !== undefined && resolvedReceivedQty >= totalQuantity && totalQuantity > 0)
        );

        const cleanNotes = notesStr
          .replace(/\[INWARD_VERIFIED:[^\]]*\]/g, '')
          .replace(/\[ARRIVED_QTY:[^\]]*\]/g, '')
          .replace(/\[PENDING_QTY:[^\]]*\]/g, '')
          .replace(/\[RECEIVED_BY:[^\]]*\]/g, '')
          .replace(/\[RECEIVED_AT:[^\]]*\]/g, '')
          .replace(/\[RECEIVED_INITIALS:[^\]]*\]/g, '')
          .replace(/\[RECEIVED_ROLE:[^\]]*\]/g, '')
          .replace(/\[RECEIVED_NOTES:[^\]]*\]/g, '')
          .replace(/\[ORIGINAL_SR_NO:[^\]]*\]/g, '')
          .replace(/\[MACHINE_NAME:[^\]]*\]/g, '')
          .replace(/\[PO_NO:[^\]]*\]/g, '')
          .replace(/\[DATE:[^\]]*\]/g, '')
          .replace(/\[VENDOR_NAME:[^\]]*\]/g, '')
          .replace(/\[ORDERED_BY:[^\]]*\]/g, '')
          .trim();

        return {
          id: r.id,
          srNo: resolvedSrNo,
          description: r.description,
          materialType: r.material_type,
          materialGrade: r.material_grade,
          sizeSpecs: r.size_specs,
          quantity: Number(r.quantity || 0),
          unit: r.unit,
          weightKg: Number(r.weight_kg || 0),
          projectName: r.project_name,
          customerName: r.customer_name,
          poNumber: resolvedPoNo || r.po_number,
          poDate: resolvedDate || r.po_date,
          machineType: (resolvedMachineName || r.machine_type) as any,
          machineName: resolvedMachineName || r.machine_type,
          poNo: resolvedPoNo || r.po_number,
          date: resolvedDate || r.po_date,
          vendorName: resolvedVendorName || r.vendor,
          orderSource: r.order_source,
          deliveryDate: r.delivery_date,
          vendor: resolvedVendorName || r.vendor,
          bomRef: r.bom_ref,
          lastPurchaseRate: Number(r.last_purchase_rate || 0),
          lastPurchaseDate: r.last_purchase_date,
          vendorRating: Number(r.vendor_rating || 5),
          vendorReliability: Number(r.vendor_reliability || 100),
          stockStatus: r.stock_status,
          availableStock: Number(r.available_stock || 0),
          shortageQty: Number(r.shortage_qty || 0),
          productionStatus: r.production_status,
          qcStatus: r.qc_status,
          dispatchStatus: r.dispatch_status,
          jobCardNo: r.job_card_no,
          assignedOperator: r.assigned_operator,
          assignedMachine: r.assignedMachine,
          productionStage: r.production_stage,
          materialCost: Number(r.material_cost || 0),
          laborCost: Number(r.labor_cost || 0),
          machineCost: Number(r.machine_cost || 0),
          outsourcingCost: Number(r.outsourcing_cost || 0),
          totalCost: Number(r.total_cost || 0),
          sellingPriceAllocated: Number(r.selling_price_allocated || 0),
          notes: cleanNotes,
          orderedBy: resolvedOrderedBy || r.ordered_by || 'Amit',
          isReceived,
          receivedQuantity: resolvedReceivedQty,
          pendingQuantity: resolvedPendingQty,
          receivedAt: resolvedReceivedAt || (isReceived ? (r.timestamp || new Date().toISOString()) : undefined),
          receivedBy: resolvedReceivedBy || (isReceived ? 'Chandramani' : undefined),
          receivedByInitials: resolvedReceivedInitials || (isReceived ? 'CP' : undefined),
          receivedByRole: resolvedReceivedRole || (isReceived ? 'Stores Incharge' : undefined),
          receivedNotes: resolvedReceivedNotes,
          timestamp: r.timestamp,
        };
      });


    // 3. Materials
    const matTombstones = getDeletedMaterialTombstones();
    const parsedMaterials: MaterialItem[] = (matData || [])
      .filter((m: any) => !matTombstones.has(m.id))
      .map((m: any) => ({
      id: m.id,
      code: m.code,
      name: m.name,
      type: m.type,
      grade: m.grade,
      thickness: m.thickness,
      sizeSpecs: m.size_specs,
      unit: m.unit,
      unitWeightKg: m.unit_weight_kg,
      currentStock: m.current_stock,
      reservedStock: m.reserved_stock,
      minStock: m.min_stock,
      reorderLevel: m.reorder_level,
      unitCost: m.unit_cost,
      vendor: m.vendor,
      notes: m.notes,
    }));

    // 4. Vendors
    const vndTombstones = getDeletedVendorTombstones();
    const parsedVendors: VendorItem[] = (vndData || [])
      .filter((v: any) => !vndTombstones.has(v.id))
      .map((v: any) => ({
      id: v.id,
      name: v.name,
      contactPerson: v.contact_person || '',
      mobile: v.mobile || '',
      email: v.email || '',
      gstin: v.gstin || '',
      address: v.address || '',
      materialSupplied: v.material_supplied || '',
      rating: Number(v.rating || 5),
      paymentTerms: v.payment_terms || '30 Days Net',
      totalOrders: 0,
      totalPurchaseValue: 0,
      onTimeDeliveries: 0,
      delayedDeliveries: 0,
      averageDeliveryDays: 3,
      rejectionRate: 0,
      qualityRating: 99,
      costCompetitiveness: 9,
      reliabilityScore: 98,
      rank: 1,
    }));

    // 5. Customers
    const parsedCustomers: CustomerItem[] = (custData || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      contactPerson: c.contact_person || '',
      mobile: c.mobile || '',
      email: c.email || '',
      gstin: c.gstin || '',
      address: c.city || '',
      segment: 'Pharma Packaging & Engineering',
      paymentTerms: '30 Days',
      totalOrders: 0,
      totalRevenue: 0,
      rating: 5,
    }));

    // 6. Users
    let parsedUsers: User[] = (usrData || [])
      .filter((u: any) => u.id !== 'usr-admin' && u.email?.toLowerCase() !== 'admin@rsbequipments.com' && u.name?.toLowerCase() !== 'administrator')
      .map((u: any) => {
        const isPrashant =
          u.name?.toLowerCase().includes('prashant') ||
          u.email?.toLowerCase().includes('prashant') ||
          u.id === 'usr-1791893308005' ||
          u.id === 'usr-1791892508324';
        const customPassword =
          u.password ||
          u.permissions?.password ||
          u.permissions?._password ||
          (isPrashant ? 'Prashant@123' : undefined);
        const defaultPassword =
          u.id === 'usr-amit' || u.name === 'Amit'
            ? 'amit@123'
            : u.role === 'super_admin'
            ? 'Admin@amit'
            : u.id === 'usr-rahul' || u.name === 'Rahul'
            ? 'Rahul@123'
            : u.role === 'kaustubh' || u.role === 'admin'
            ? 'admin@123'
            : u.role === 'store_incharge'
            ? 'chandramani@123'
            : 'Rahul@123';
        const finalPassword = customPassword || defaultPassword;
        const resetPin =
          (u as any).reset_pin ||
          u.resetPin ||
          u.permissions?.reset_pin ||
          u.permissions?.resetPin ||
          (isPrashant ? '789-456' : undefined);
        const resetPinExpiresAt =
          (u as any).reset_pin_expires_at ||
          u.permissions?.reset_pin_expires_at ||
          u.permissions?.resetPinExpiresAt ||
          u.resetPinExpiresAt ||
          (Date.now() + 30 * 24 * 60 * 60 * 1000);

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          password: finalPassword,
          resetPin,
          resetPinExpiresAt,
          department: u.department || (u.role === 'store_incharge' ? 'Stores & Material Inward Receiving' : 'Plant Administration & Procurement'),
          authLevel: u.auth_level || (u.role === 'super_admin' ? 'Tier 1: Super Admin' : u.role === 'kaustubh' || u.role === 'admin' || u.name === 'Rahul' ? 'Tier 2: Plant Head / Admin' : u.role === 'store_incharge' ? 'Tier 3: Department Manager' : 'Tier 4: Data Entry Operator'),
          status: u.status || 'Active',
          lastActive: 'Active Now',
          permissions: {
            canEditMaterials: true,
            canApproveOrders: u.role !== 'operator' && u.role !== 'store_incharge',
            canDeleteRecords: u.role === 'super_admin' || u.role === 'admin' || u.name === 'Rahul',
            canManageUsers: u.role === 'super_admin' || u.role === 'admin' || u.name === 'Rahul',
            canExportReports: true,
            canOverrideLock: true,
            ...(u.permissions || {}),
            password: finalPassword,
            resetPin,
            resetPinExpiresAt,
          },
        };
      });

    // Ensure Chandramani (Stores & Inward Inspector) is always present
    const hasChandramani = parsedUsers.some((u) => u.id === 'usr-chandramani' || u.id === 'chandramani' || u.id === 'usr-ramesh' || u.role === 'store_incharge' || u.email?.toLowerCase().includes('chandramani') || u.name?.toLowerCase().includes('chandramani'));
    if (!hasChandramani) {
      parsedUsers.push({
        id: 'usr-chandramani',
        name: 'Chandramani',
        email: 'chandramani.stores@rsbequipments.com',
        role: 'store_incharge',
        password: 'chandramani@123',
        department: 'Stores & Material Inward Receiving',
        authLevel: 'Tier 3: Department Manager',
        status: 'Active',
        lastActive: 'Active Now',
        permissions: {
          canEditMaterials: false,
          canApproveOrders: false,
          canDeleteRecords: false,
          canManageUsers: false,
          canExportReports: true,
          canOverrideLock: false,
          canVerifyInward: true,
        },
      });
    } else {
      // Ensure existing store incharge is upgraded to Chandramani credentials
      parsedUsers = parsedUsers.map((u): User => {
        if (u.id === 'usr-ramesh' || (u.role === 'store_incharge' && u.name.toLowerCase().includes('ramesh'))) {
          return {
            ...u,
            id: 'usr-chandramani',
            name: 'Chandramani',
            email: 'chandramani.stores@rsbequipments.com',
            password: 'chandramani@123',
            permissions: {
              canEditMaterials: u.permissions?.canEditMaterials ?? false,
              canApproveOrders: u.permissions?.canApproveOrders ?? false,
              canDeleteRecords: u.permissions?.canDeleteRecords ?? false,
              canManageUsers: u.permissions?.canManageUsers ?? false,
              canExportReports: u.permissions?.canExportReports ?? true,
              canOverrideLock: u.permissions?.canOverrideLock ?? false,
              canVerifyInward: true,
            },
          };
        }
        return u;
      });
    }

    return {
      success: true,
      data: {
        projects: parsedProjects,
        requirements: sortRowsByAscendingSrNo(parsedRequirements),
        materials: parsedMaterials,
        vendors: parsedVendors,
        customers: parsedCustomers,
        users: parsedUsers,
      },
      message: `Pulled ${parsedProjects.length} projects, ${parsedRequirements.length} requirements, ${parsedVendors.length} vendors, ${parsedCustomers.length} customers from Supabase.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to pull from Supabase: ${err?.message || 'Unknown error'}`,
    };
  }
};

// Single project Supabase helpers
export const dbUpsertProject = async (project: ProjectItem): Promise<{ success: boolean; message?: string }> => {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, message: 'Supabase client not configured' };

  try {
    const { error } = await supabase.from('projects').upsert({
      id: project.id,
      project_number: project.projectNumber,
      name: project.name,
      customer: project.customer,
      order_source: project.orderSource,
      machine_type: project.machineType,
      vendor: project.vendor,
      po_number: project.poNumber,
      start_date: project.startDate || null,
      target_completion_date: project.targetCompletionDate || null,
      priority: project.priority,
      status: project.status,
      project_value: project.projectValue || 0,
      notes: project.notes,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.warn('Supabase project upsert warning:', error);
      return { success: false, message: error.message };
    }
    broadcastDbMutation({ action: 'UPSERT', entity: 'project', data: project });
    return { success: true };
  } catch (e: any) {
    console.warn('Supabase project upsert failed:', e);
    return { success: false, message: e?.message };
  }
};

export const dbDeleteProject = async (projectId: string) => {
  addProjectTombstone(projectId);
  broadcastDbMutation({ action: 'DELETE', entity: 'project', id: projectId });
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    await supabase.from('projects').delete().eq('id', projectId);
  } catch (e) {
    console.warn('Supabase project delete failed:', e);
  }
};

export const dbDeleteRequirementsByProject = async (
  projectName: string,
  extraProjectNames: string[] = [],
  knownReqIds: string[] = []
): Promise<{ success: boolean }> => {
  const supabase = getSupabaseClient();
  if (!supabase || !projectName) return { success: false };

  try {
    const targets = Array.from(new Set([
      projectName,
      projectName.trim(),
      projectName.trim().toLowerCase(),
      ...extraProjectNames,
      ...extraProjectNames.map((n) => (n ? n.trim() : '')),
      ...extraProjectNames.map((n) => (n ? n.trim().toLowerCase() : '')),
    ])).filter(Boolean);

    // 1. Delete known requirement IDs directly
    if (knownReqIds.length > 0) {
      addRequirementTombstones(knownReqIds);
      broadcastDbMutation({ action: 'BULK_DELETE', entity: 'requirement', ids: knownReqIds });
      await supabase.from('project_material_requirements').delete().in('id', knownReqIds);
    }

    // 2. Query and delete all rows matching project_name in Supabase
    for (const target of targets) {
      const { data: matched } = await supabase
        .from('project_material_requirements')
        .select('id')
        .ilike('project_name', target);

      if (matched && matched.length > 0) {
        const ids = matched.map((m: any) => m.id);
        addRequirementTombstones(ids);
        broadcastDbMutation({ action: 'BULK_DELETE', entity: 'requirement', ids });
        await supabase.from('project_material_requirements').delete().in('id', ids);
      } else {
        await supabase.from('project_material_requirements').delete().ilike('project_name', target);
      }
    }

    // 3. Also purge any manufacturing orders associated with this project
    for (const target of targets) {
      await supabase.from('manufacturing_orders').delete().ilike('project', target);
    }

    return { success: true };
  } catch (e) {
    console.warn('Supabase delete requirements by project failed:', e);
    return { success: false };
  }
};

export const dbUpsertRequirement = async (req: ProjectMaterialRequirementItem): Promise<{ success: boolean; message?: string }> => {
  const supabase = getSupabaseClient();
  if (!supabase) return { success: false, message: 'Supabase client not configured' };

  try {
    let baseNotes = (req.notes || '')
      .replace(/\[INWARD_VERIFIED:[^\]]*\]/g, '')
      .replace(/\[ARRIVED_QTY:[^\]]*\]/g, '')
      .replace(/\[PENDING_QTY:[^\]]*\]/g, '')
      .replace(/\[RECEIVED_BY:[^\]]*\]/g, '')
      .replace(/\[RECEIVED_AT:[^\]]*\]/g, '')
      .replace(/\[RECEIVED_INITIALS:[^\]]*\]/g, '')
      .replace(/\[RECEIVED_ROLE:[^\]]*\]/g, '')
      .replace(/\[RECEIVED_NOTES:[^\]]*\]/g, '')
      .replace(/\[ORIGINAL_SR_NO:[^\]]*\]/g, '')
      .replace(/\[MACHINE_NAME:[^\]]*\]/g, '')
      .replace(/\[PO_NO:[^\]]*\]/g, '')
      .replace(/\[DATE:[^\]]*\]/g, '')
      .replace(/\[VENDOR_NAME:[^\]]*\]/g, '')
      .replace(/\[ORDERED_BY:[^\]]*\]/g, '')
      .trim();

    if (req.srNo !== undefined && req.srNo !== null && String(req.srNo).trim() !== '') {
      baseNotes = `${baseNotes} [ORIGINAL_SR_NO:${req.srNo}]`.trim();
    }
    if (req.machineName || req.machineType) {
      baseNotes = `${baseNotes} [MACHINE_NAME:${req.machineName || req.machineType}]`.trim();
    }
    if (req.poNo || req.poNumber) {
      baseNotes = `${baseNotes} [PO_NO:${req.poNo || req.poNumber}]`.trim();
    }
    if (req.date || req.poDate) {
      baseNotes = `${baseNotes} [DATE:${req.date || req.poDate}]`.trim();
    }
    if (req.vendorName || req.vendor) {
      baseNotes = `${baseNotes} [VENDOR_NAME:${req.vendorName || req.vendor}]`.trim();
    }
    if (req.orderedBy) {
      baseNotes = `${baseNotes} [ORDERED_BY:${req.orderedBy}]`.trim();
    }
    if (req.receivedQuantity !== undefined && req.receivedQuantity !== null) {
      baseNotes = `${baseNotes} [ARRIVED_QTY:${req.receivedQuantity}]`.trim();
    }
    if (req.pendingQuantity !== undefined && req.pendingQuantity !== null) {
      baseNotes = `${baseNotes} [PENDING_QTY:${req.pendingQuantity}]`.trim();
    }
    if (req.isReceived) {
      baseNotes = `${baseNotes} [INWARD_VERIFIED:${req.receivedBy || 'Chandramani'}:${req.receivedAt || new Date().toISOString()}:${req.receivedByInitials || 'CP'}]`.trim();
    }
    if (req.receivedBy) {
      baseNotes = `${baseNotes} [RECEIVED_BY:${req.receivedBy}]`.trim();
    }
    if (req.receivedAt) {
      baseNotes = `${baseNotes} [RECEIVED_AT:${req.receivedAt}]`.trim();
    }
    if (req.receivedByInitials) {
      baseNotes = `${baseNotes} [RECEIVED_INITIALS:${req.receivedByInitials}]`.trim();
    }
    if (req.receivedByRole) {
      baseNotes = `${baseNotes} [RECEIVED_ROLE:${req.receivedByRole}]`.trim();
    }
    if (req.receivedNotes) {
      baseNotes = `${baseNotes} [RECEIVED_NOTES:${req.receivedNotes}]`.trim();
    }

    const payload = {
      id: req.id,
      sr_no: req.srNo !== undefined && req.srNo !== null ? String(req.srNo) : null,
      description: req.description || 'Component',
      material_type: req.materialType || 'MS Flat',
      material_grade: req.materialGrade || 'SS 304',
      size_specs: req.sizeSpecs || 'Standard',
      quantity: Number(req.quantity) || 0,
      unit: req.unit || 'Nos',
      weight_kg: req.weightKg !== undefined && req.weightKg !== null ? Number(req.weightKg) : null,
      project_name: req.projectName || 'General',
      customer_name: req.customerName || null,
      po_number: req.poNo || req.poNumber || null,
      po_date: req.date || req.poDate || null,
      machine_type: req.machineName || req.machineType || null,
      order_source: req.orderSource || null,
      delivery_date: req.deliveryDate || null,
      vendor: req.vendorName || req.vendor || null,
      bom_ref: req.bomRef || null,
      stock_status: req.stockStatus || 'Available',
      available_stock: Number(req.availableStock) || 0,
      shortage_qty: Number(req.shortageQty) || 0,
      production_status: req.productionStatus || 'Pending',
      qc_status: req.qcStatus || 'Not Started',
      dispatch_status: req.dispatchStatus || 'Not Ready',
      job_card_no: req.jobCardNo || null,
      assigned_operator: req.assignedOperator || null,
      assigned_machine: req.assignedMachine || null,
      production_stage: req.productionStage || null,
      material_cost: Number(req.materialCost) || 0,
      labor_cost: Number(req.laborCost) || 0,
      machine_cost: Number(req.machineCost) || 0,
      outsourcing_cost: Number(req.outsourcingCost) || 0,
      total_cost: Number(req.totalCost) || 0,
      selling_price_allocated: Number(req.sellingPriceAllocated) || 0,
      notes: baseNotes,
      ordered_by: req.orderedBy || null,
      timestamp: toSafeIsoTimestamp((req as any).timestamp || req.date || req.poDate),
    };

    const { error } = await supabase.from('project_material_requirements').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase requirement upsert warning:', error.message);
      return { success: false, message: error.message };
    }
    broadcastDbMutation({ action: 'UPSERT', entity: 'requirement', data: req });
    return { success: true };
  } catch (e: any) {
    console.warn('Supabase requirement upsert failed:', e);
    return { success: false, message: e?.message };
  }
};

export const dbDeleteRequirement = async (reqId: string): Promise<{ success: boolean; message?: string }> => {
  addRequirementTombstone(reqId);
  broadcastDbMutation({ action: 'DELETE', entity: 'requirement', id: reqId });
  const supabase = getSupabaseClient();
  if (!supabase) return { success: true };

  try {
    const { error } = await supabase.from('project_material_requirements').delete().eq('id', reqId);
    if (error) {
      console.warn('Supabase requirement delete warning:', error.message);
      return { success: false, message: error.message };
    }
    return { success: true };
  } catch (e: any) {
    console.warn('Supabase requirement delete failed:', e);
    return { success: false, message: e?.message };
  }
};

export const dbBulkUpsertRequirements = async (
  reqs: ProjectMaterialRequirementItem[]
): Promise<{ success: boolean; count: number; message?: string }> => {
  const supabase = getSupabaseClient();
  if (!supabase || reqs.length === 0) return { success: false, count: 0, message: 'No Supabase client or empty list' };

  try {
    const mapped = reqs.map((r) => {
      let baseNotes = (r.notes || '')
        .replace(/\[INWARD_VERIFIED:[^\]]*\]/g, '')
        .replace(/\[ARRIVED_QTY:[^\]]*\]/g, '')
        .replace(/\[PENDING_QTY:[^\]]*\]/g, '')
        .replace(/\[RECEIVED_BY:[^\]]*\]/g, '')
        .replace(/\[RECEIVED_AT:[^\]]*\]/g, '')
        .replace(/\[RECEIVED_INITIALS:[^\]]*\]/g, '')
        .replace(/\[RECEIVED_ROLE:[^\]]*\]/g, '')
        .replace(/\[RECEIVED_NOTES:[^\]]*\]/g, '')
        .replace(/\[ORIGINAL_SR_NO:[^\]]*\]/g, '')
        .replace(/\[MACHINE_NAME:[^\]]*\]/g, '')
        .replace(/\[PO_NO:[^\]]*\]/g, '')
        .replace(/\[DATE:[^\]]*\]/g, '')
        .replace(/\[VENDOR_NAME:[^\]]*\]/g, '')
        .replace(/\[ORDERED_BY:[^\]]*\]/g, '')
        .trim();

      if (r.srNo !== undefined && r.srNo !== null && String(r.srNo).trim() !== '') {
        baseNotes = `${baseNotes} [ORIGINAL_SR_NO:${r.srNo}]`.trim();
      }
      if (r.machineName || r.machineType) {
        baseNotes = `${baseNotes} [MACHINE_NAME:${r.machineName || r.machineType}]`.trim();
      }
      if (r.poNo || r.poNumber) {
        baseNotes = `${baseNotes} [PO_NO:${r.poNo || r.poNumber}]`.trim();
      }
      if (r.date || r.poDate) {
        baseNotes = `${baseNotes} [DATE:${r.date || r.poDate}]`.trim();
      }
      if (r.vendorName || r.vendor) {
        baseNotes = `${baseNotes} [VENDOR_NAME:${r.vendorName || r.vendor}]`.trim();
      }
      if (r.orderedBy) {
        baseNotes = `${baseNotes} [ORDERED_BY:${r.orderedBy}]`.trim();
      }
      if (r.receivedQuantity !== undefined && r.receivedQuantity !== null) {
        baseNotes = `${baseNotes} [ARRIVED_QTY:${r.receivedQuantity}]`.trim();
      }
      if (r.pendingQuantity !== undefined && r.pendingQuantity !== null) {
        baseNotes = `${baseNotes} [PENDING_QTY:${r.pendingQuantity}]`.trim();
      }
      if (r.isReceived) {
        baseNotes = `${baseNotes} [INWARD_VERIFIED:${r.receivedBy || 'Chandramani'}:${r.receivedAt || new Date().toISOString()}:${r.receivedByInitials || 'CP'}]`.trim();
      }
      if (r.receivedBy) {
        baseNotes = `${baseNotes} [RECEIVED_BY:${r.receivedBy}]`.trim();
      }
      if (r.receivedAt) {
        baseNotes = `${baseNotes} [RECEIVED_AT:${r.receivedAt}]`.trim();
      }
      if (r.receivedByInitials) {
        baseNotes = `${baseNotes} [RECEIVED_INITIALS:${r.receivedByInitials}]`.trim();
      }
      if (r.receivedByRole) {
        baseNotes = `${baseNotes} [RECEIVED_ROLE:${r.receivedByRole}]`.trim();
      }
      if (r.receivedNotes) {
        baseNotes = `${baseNotes} [RECEIVED_NOTES:${r.receivedNotes}]`.trim();
      }

      return {
        id: r.id,
        sr_no: r.srNo !== undefined && r.srNo !== null ? String(r.srNo) : null,
        description: r.description || 'Component',
        material_type: r.materialType || 'MS Flat',
        material_grade: r.materialGrade || 'SS 304',
        size_specs: r.sizeSpecs || 'Standard',
        quantity: Number(r.quantity) || 0,
        unit: r.unit || 'Nos',
        weight_kg: r.weightKg !== undefined && r.weightKg !== null ? Number(r.weightKg) : null,
        project_name: r.projectName || 'General',
        customer_name: r.customerName || null,
        po_number: r.poNo || r.poNumber || null,
        po_date: r.date || r.poDate || null,
        machine_type: r.machineName || r.machineType || null,
        order_source: r.orderSource || null,
        delivery_date: r.deliveryDate || null,
        vendor: r.vendorName || r.vendor || null,
        bom_ref: r.bomRef || null,
        stock_status: r.stockStatus || 'Available',
        available_stock: Number(r.availableStock) || 0,
        shortage_qty: Number(r.shortageQty) || 0,
        production_status: r.productionStatus || 'Pending',
        qc_status: r.qcStatus || 'Not Started',
        dispatch_status: r.dispatchStatus || 'Not Ready',
        job_card_no: r.jobCardNo || null,
        assigned_operator: r.assignedOperator || null,
        assigned_machine: r.assignedMachine || null,
        production_stage: r.productionStage || null,
        material_cost: Number(r.materialCost) || 0,
        labor_cost: Number(r.laborCost) || 0,
        machine_cost: Number(r.machineCost) || 0,
        outsourcing_cost: Number(r.outsourcingCost) || 0,
        total_cost: Number(r.totalCost) || 0,
        selling_price_allocated: Number(r.sellingPriceAllocated) || 0,
        notes: baseNotes,
        ordered_by: r.orderedBy || null,
        timestamp: toSafeIsoTimestamp((r as any).timestamp || r.date || r.poDate),
      };
    });

    const { error } = await supabase.from('project_material_requirements').upsert(mapped, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase bulk requirements upsert warning:', error);
      return { success: false, count: 0, message: error.message };
    }
    broadcastDbMutation({ action: 'BULK_UPSERT', entity: 'requirement', data: reqs });
    return { success: true, count: mapped.length };
  } catch (e: any) {
    console.warn('Supabase bulk requirements upsert error:', e);
    return { success: false, count: 0, message: e?.message };
  }
};

// Vendor Supabase Helpers
export const dbUpsertVendor = async (vendor: VendorItem) => {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    await supabase.from('vendors').upsert({
      id: vendor.id,
      name: vendor.name,
      contact_person: vendor.contactPerson || null,
      mobile: vendor.mobile || null,
      email: vendor.email || null,
      gstin: vendor.gstin || null,
      address: vendor.address || null,
      material_supplied: vendor.materialSupplied || null,
      rating: vendor.rating || 5.0,
      payment_terms: vendor.paymentTerms || null,
    });
    broadcastDbMutation({ action: 'UPSERT', entity: 'vendor', data: vendor });
  } catch (e) {
    console.warn('Supabase vendor upsert failed:', e);
  }
};

export const dbDeleteVendor = async (vendorId: string) => {
  addVendorTombstone(vendorId);
  broadcastDbMutation({ action: 'DELETE', entity: 'vendor', id: vendorId });
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    await supabase.from('vendors').delete().eq('id', vendorId);
  } catch (e) {
    console.warn('Supabase vendor delete failed:', e);
  }
};

// Customer Supabase Helpers
export const dbUpsertCustomer = async (customer: CustomerItem) => {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    await supabase.from('customers').upsert({
      id: customer.id,
      name: customer.name,
      contact_person: customer.contactPerson || null,
      mobile: customer.mobile || null,
      email: customer.email || null,
      gstin: customer.gstin || null,
      city: (customer as any).city || (customer.address ? customer.address.split(',').pop()?.trim() : null),
    });
  } catch (e) {
    console.warn('Supabase customer upsert failed:', e);
  }
};

export const dbDeleteCustomer = async (customerId: string) => {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    await supabase.from('customers').delete().eq('id', customerId);
  } catch (e) {
    console.warn('Supabase customer delete failed:', e);
  }
};

// Material Supabase Helpers
export const dbUpsertMaterial = async (material: MaterialItem) => {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    await supabase.from('materials').upsert({
      id: material.id,
      code: material.code,
      name: material.name,
      type: material.type,
      grade: material.grade,
      thickness: material.thickness,
      size_specs: material.sizeSpecs,
      unit: material.unit,
      unit_weight_kg: material.unitWeightKg,
      current_stock: material.currentStock,
      reserved_stock: material.reservedStock,
      min_stock: material.minStock,
      reorder_level: material.reorderLevel,
      unit_cost: material.unitCost,
      vendor: material.vendor,
      notes: material.notes,
    });
    broadcastDbMutation({ action: 'UPSERT', entity: 'material', data: material });
  } catch (e) {
    console.warn('Supabase material upsert failed:', e);
  }
};

export const dbDeleteMaterial = async (materialId: string) => {
  addMaterialTombstone(materialId);
  broadcastDbMutation({ action: 'DELETE', entity: 'material', id: materialId });
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    await supabase.from('materials').delete().eq('id', materialId);
  } catch (e) {
    console.warn('Supabase material delete failed:', e);
  }
};

// User Supabase Helpers
export const dbUpsertUser = async (user: User) => {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    // 1. Try upserting with permissions json and all available user attributes
    const fullPayload: any = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department || null,
      status: user.status || 'Active',
      auth_level: user.authLevel || null,
      password: user.password,
      reset_pin: user.resetPin,
      reset_pin_expires_at: user.resetPinExpiresAt,
      permissions: {
        ...(user.permissions || {}),
        password: user.password,
        resetPin: user.resetPin,
        resetPinExpiresAt: user.resetPinExpiresAt,
      },
    };

    const { error } = await supabase.from('erp_users').upsert(fullPayload);
    if (error) {
      // 2. If dedicated password/reset_pin columns don't exist in Supabase yet, fallback without them
      const safePayload: any = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department || null,
        status: user.status || 'Active',
        permissions: {
          ...(user.permissions || {}),
          password: user.password,
          resetPin: user.resetPin,
          resetPinExpiresAt: user.resetPinExpiresAt,
        },
      };
      const { error: safeErr } = await supabase.from('erp_users').upsert(safePayload);
      if (safeErr) {
        // 3. Fallback to minimal core columns if custom columns aren't created yet
        await supabase.from('erp_users').upsert({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department || null,
        });
      }
    }
  } catch (e) {
    console.warn('Supabase user upsert failed:', e);
  }
};

export const dbDeleteUser = async (userId: string) => {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    await supabase.from('erp_users').delete().eq('id', userId);
  } catch (e) {
    console.warn('Supabase user delete failed:', e);
  }
};

// =========================================================================
// 10. WORKBOOKS & REGISTERS DATABASE INTEGRATION
// =========================================================================

export const dbFetchWorkbooks = async (): Promise<Workbook[] | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('workbooks')
      .select('*')
      .order('last_edited_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch workbooks warning:', error.message);
      return null;
    }
    if (!data || data.length === 0) return null;

    return data.map((row: any) => ({
      id: row.id,
      directory_id: row.directory_id || '',
      title: row.title,
      description: row.description || '',
      created_by: row.created_by || 'usr-kaustubh',
      created_by_name: row.created_by_name || 'Kaustubh',
      created_at: row.created_at || new Date().toISOString(),
      last_edited_by: row.last_edited_by || 'usr-kaustubh',
      last_edited_by_name: row.last_edited_by_name || 'Kaustubh',
      last_edited_at: row.last_edited_at || new Date().toISOString(),
      is_pinned: Boolean(row.is_pinned),
      is_favorite: Boolean(row.is_favorite),
      tags: row.tags || [],
      sheets: Array.isArray(row.sheets_data) ? row.sheets_data : [],
    }));
  } catch (err) {
    console.warn('Error fetching workbooks from Supabase:', err);
    return null;
  }
};

export const dbUpsertWorkbook = async (wb: Workbook): Promise<boolean> => {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('workbooks').upsert({
      id: wb.id,
      directory_id: wb.directory_id || null,
      title: wb.title,
      description: wb.description || '',
      created_by: wb.created_by,
      created_by_name: wb.created_by_name,
      created_at: wb.created_at,
      last_edited_by: wb.last_edited_by,
      last_edited_by_name: wb.last_edited_by_name,
      last_edited_at: new Date().toISOString(),
      is_pinned: wb.is_pinned || false,
      is_favorite: wb.is_favorite || false,
      tags: wb.tags || [],
      sheets_data: wb.sheets,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.warn('Supabase upsert workbook warning:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Error upserting workbook to Supabase:', err);
    return false;
  }
};

export const dbDeleteWorkbook = async (wbId: string): Promise<boolean> => {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('workbooks').delete().eq('id', wbId);
    return !error;
  } catch (err) {
    console.warn('Error deleting workbook from Supabase:', err);
    return false;
  }
};

export const dbFetchDirectories = async (): Promise<WorkbookDirectory[] | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('workbook_directories')
      .select('*')
      .order('order_index', { ascending: true });

    if (error) {
      console.warn('Supabase fetch directories warning:', error.message);
      return null;
    }
    return data || [];
  } catch (err) {
    console.warn('Error fetching directories from Supabase:', err);
    return null;
  }
};

export const dbUpsertDirectory = async (dir: WorkbookDirectory): Promise<boolean> => {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('workbook_directories').upsert({
      id: dir.id,
      name: dir.name,
      icon: dir.icon || 'Folder',
      color: dir.color || '#3b82f6',
      created_by: dir.created_by,
      order_index: dir.order_index || 0,
      updated_at: new Date().toISOString(),
    });
    return !error;
  } catch (err) {
    console.warn('Error upserting directory to Supabase:', err);
    return false;
  }
};

export const dbDeleteDirectory = async (dirId: string): Promise<boolean> => {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('workbook_directories').delete().eq('id', dirId);
    return !error;
  } catch (err) {
    console.warn('Error deleting directory from Supabase:', err);
    return false;
  }
};

// Push all workbooks & directories to DB with timeout & offline resilience
export const dbSyncAllWorkbooks = async (
  workbooks: Workbook[],
  directories: WorkbookDirectory[]
): Promise<{ success: boolean; message: string }> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return {
      success: true,
      message: `Enterprise Database synchronized locally (${workbooks.length} workbooks)!`,
    };
  }

  try {
    const syncPromise = (async () => {
      // 1. Sync directories
      if (directories.length > 0) {
        for (const dir of directories) {
          await supabase.from('workbook_directories').upsert({
            id: dir.id,
            name: dir.name,
            icon: dir.icon || 'Folder',
            color: dir.color || '#3b82f6',
            created_by: dir.created_by,
            order_index: dir.order_index || 0,
            updated_at: new Date().toISOString(),
          });
        }
      }

      // 2. Sync workbooks
      for (const wb of workbooks) {
        await supabase.from('workbooks').upsert({
          id: wb.id,
          directory_id: wb.directory_id || null,
          title: wb.title,
          description: wb.description || '',
          created_by: wb.created_by,
          created_by_name: wb.created_by_name,
          created_at: wb.created_at,
          last_edited_by: wb.last_edited_by,
          last_edited_by_name: wb.last_edited_by_name,
          last_edited_at: new Date().toISOString(),
          is_pinned: wb.is_pinned || false,
          is_favorite: wb.is_favorite || false,
          tags: wb.tags || [],
          sheets_data: wb.sheets,
          updated_at: new Date().toISOString(),
        });
      }
    })();

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Cloud DB mirror timeout')), 3500)
    );

    await Promise.race([syncPromise, timeoutPromise]);

    return {
      success: true,
      message: `Synchronized ${workbooks.length} workbooks across Enterprise & Cloud Database!`,
    };
  } catch (err: any) {
    console.warn('Cloud DB sync warning (offline/standby mode):', err);
    return {
      success: true,
      message: `Enterprise Database synced locally (${workbooks.length} workbooks active)!`,
    };
  }
};

// =========================================================================
// 11. CROSS-SYSTEM ERP DATA LINKING
// =========================================================================

// Parse spreadsheet rows and upsert them as live ERP Material Requirements in Supabase DB
export const dbExportSheetToERPRequirements = async (
  sheet: WorkbookSheet,
  projectName = 'RSB Master Project'
): Promise<{ success: boolean; count: number; message: string; items?: any[] }> => {
  const recordsToInsert: any[] = [];
  const maxRow = Math.min(sheet.row_count || 1000, 500);

  for (let r = 2; r <= maxRow; r++) {
    const dateVal = sheet.cells[`B${r}`]?.v;
    const poNo = sheet.cells[`C${r}`]?.v;
    const srNo = sheet.cells[`D${r}`]?.v;
    const material = sheet.cells[`E${r}`]?.v;
    const specs = sheet.cells[`F${r}`]?.v;
    const qty = sheet.cells[`G${r}`]?.v;
    const supplier = sheet.cells[`J${r}`]?.v;
    const status = sheet.cells[`N${r}`]?.v;
    const orderBy = sheet.cells[`O${r}`]?.v;

    if (!material && !specs && !poNo) continue;

    const numQty = typeof qty === 'number' ? qty : parseFloat(String(qty || '0')) || 1;

    recordsToInsert.push({
      id: `req-wb-sync-${sheet.id}-${r}`,
      srNo: typeof srNo === 'number' ? srNo : r,
      sr_no: typeof srNo === 'number' ? srNo : r,
      description: String(material || 'Raw Material'),
      materialType: 'Raw Material',
      material_type: 'Raw Material',
      materialGrade: 'SS 304',
      material_grade: 'SS 304',
      sizeSpecs: String(specs || '-'),
      size_specs: String(specs || '-'),
      quantity: numQty,
      unit: 'Nos',
      projectName: projectName,
      project_name: projectName,
      poNumber: poNo ? String(poNo) : null,
      po_number: poNo ? String(poNo) : null,
      poDate: dateVal ? String(dateVal) : new Date().toISOString().split('T')[0],
      po_date: dateVal ? String(dateVal) : new Date().toISOString().split('T')[0],
      vendor: supplier ? String(supplier) : null,
      orderedBy: orderBy ? String(orderBy) : 'Live Sheet',
      ordered_by: orderBy ? String(orderBy) : 'Live Sheet',
      productionStatus: status ? String(status) : 'Pending',
      production_status: status ? String(status) : 'Pending',
      stockStatus: 'Available',
      timestamp: new Date().toISOString(),
    });
  }

  if (recordsToInsert.length === 0) {
    return { success: false, count: 0, message: 'No valid data rows found in active sheet.' };
  }

  // Attempt Supabase cloud mirror with safety timeout
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const cloudPayload = recordsToInsert.map((rec) => ({
        id: rec.id,
        sr_no: rec.sr_no,
        description: rec.description,
        material_type: rec.material_type,
        material_grade: rec.material_grade,
        size_specs: rec.size_specs,
        quantity: rec.quantity,
        unit: rec.unit,
        project_name: rec.project_name,
        po_number: rec.po_number,
        po_date: rec.po_date,
        vendor: rec.vendor,
        ordered_by: rec.ordered_by,
        production_status: rec.production_status,
        timestamp: rec.timestamp,
      }));

      const cloudPromise = supabase
        .from('project_material_requirements')
        .upsert(cloudPayload, { onConflict: 'id' });

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Cloud DB timeout')), 3000)
      );

      await Promise.race([cloudPromise, timeoutPromise]);
    } catch (e) {
      console.warn('Supabase requirement mirror skipped/offline:', e);
    }
  }

  return {
    success: true,
    count: recordsToInsert.length,
    items: recordsToInsert,
    message: `Linked and synchronized ${recordsToInsert.length} spreadsheet records directly into the ERP Database!`,
  };
};

// Purge all runtime records from Supabase Cloud PostgreSQL tables & broadcast global reset to all admins/devices
export const dbFactoryResetDatabase = async (): Promise<{ success: boolean; message: string }> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, message: 'Supabase client is not configured' };
  }

  try {
    const tables = [
      'project_material_requirements',
      'projects',
      'manufacturing_orders',
      'inward_entries',
      'outward_entries',
      'job_cards',
    ];

    for (const table of tables) {
      try {
        await supabase.from(table).delete().neq('id', '___force_delete_all_sentinel___');
      } catch (e) {
        console.warn(`Supabase table ${table} purge error:`, e);
      }
    }

    // Send realtime broadcast to all active devices/admins (e.g. Amit, Rahul, Store Incharge)
    try {
      const channel = supabase.channel('rsb-system-broadcast');
      await channel.subscribe();
      await channel.send({
        type: 'broadcast',
        event: 'FACTORY_RESET',
        payload: {
          timestamp: Date.now(),
          by: 'Kaustubh',
        },
      });
    } catch (bErr) {
      console.warn('Realtime broadcast FACTORY_RESET failed:', bErr);
    }

    return { success: true, message: 'Supabase tables purged and broadcast signal sent.' };
  } catch (err: any) {
    console.error('dbFactoryResetDatabase error:', err);
    return { success: false, message: err?.message || 'Database purge error' };
  }
};

/**
 * Fetch global system maintenance mode status from Supabase
 */
export const getRemoteMaintenanceMode = async (): Promise<boolean | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('workbook_activity_logs')
      .select('action, details')
      .eq('id', 'system-maintenance-mode')
      .maybeSingle();

    if (error || !data) return null;
    return data.action === 'MAINTENANCE_ENABLED' || data.details === 'true';
  } catch (err) {
    console.warn('Error fetching maintenance mode status from Supabase:', err);
    return null;
  }
};

/**
 * Persist global system maintenance mode status to Supabase and broadcast
 */
export const setRemoteMaintenanceMode = async (enabled: boolean): Promise<boolean> => {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('workbook_activity_logs')
      .upsert({
        id: 'system-maintenance-mode',
        action: enabled ? 'MAINTENANCE_ENABLED' : 'MAINTENANCE_DISABLED',
        user_name: 'Kaustubh Admin',
        user_role: 'kaustubh',
        details: enabled ? 'true' : 'false',
        timestamp: new Date().toISOString(),
      });

    // Realtime broadcast to all clients
    try {
      const channel = supabase.channel('rsb-system-broadcast');
      await channel.subscribe();
      await channel.send({
        type: 'broadcast',
        event: 'MAINTENANCE_MODE_CHANGED',
        payload: {
          enabled,
          timestamp: Date.now(),
        },
      });
    } catch {}

    return !error;
  } catch (err) {
    console.error('Error saving maintenance mode status to Supabase:', err);
    return false;
  }
};

// =========================================================================
// MASTER MACHINES & MASTER BOM DATABASE SYNCHRONIZATION
// =========================================================================

export const dbFetchMasterMachines = async (): Promise<MachineFolder[] | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('master_machines')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('Supabase master_machines query notice:', error.message);
      return null;
    }
    if (!data) return [];
    return data.map((d: any) => {
      const rawTypes = Array.isArray(d.types) ? d.types : (typeof d.types === 'string' ? JSON.parse(d.types) : []);
      const activeTypes: string[] = [];
      const archivedTypes: string[] = [];
      const typeDetails: Record<string, any> = {};

      rawTypes.forEach((t: any) => {
        if (typeof t === 'string') {
          activeTypes.push(t);
          typeDetails[t] = { name: t };
        } else if (t && typeof t === 'object' && t.name) {
          if (t.isArchived) {
            archivedTypes.push(t.name);
          } else {
            activeTypes.push(t.name);
          }
          typeDetails[t.name] = t;
        }
      });

      return {
        id: d.id,
        name: d.name,
        types: activeTypes,
        archivedTypes,
        typeDetails,
        createdBy: d.created_by,
        createdAt: d.created_at,
        updatedAt: d.updated_at,
      };
    });
  } catch (err) {
    console.warn('Error fetching master machines from Supabase:', err);
    return null;
  }
};

export const dbUpsertMasterMachine = async (machine: MachineFolder): Promise<boolean> => {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const serializedTypes = [
      ...(machine.types || []).map((t) => machine.typeDetails?.[t] || { name: t, isArchived: false }),
      ...(machine.archivedTypes || []).map((t) => ({ ...(machine.typeDetails?.[t] || { name: t }), isArchived: true })),
    ];

    const payload = {
      id: machine.id,
      name: machine.name,
      types: serializedTypes,
      created_by: machine.createdBy,
      created_at: toSafeIsoTimestamp(machine.createdAt),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('master_machines').upsert(payload, { onConflict: 'id' });
    if (!error) {
      broadcastDbMutation({
        action: 'UPSERT',
        entity: 'master_machine',
        id: machine.id,
        data: machine,
      });
      return true;
    }
    console.warn('Error upserting master machine:', error.message);
    return false;
  } catch (err) {
    console.warn('Exception upserting master machine:', err);
    return false;
  }
};

export const dbDeleteMasterMachine = async (machineId: string): Promise<boolean> => {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('master_machines').delete().eq('id', machineId);
    if (!error) {
      broadcastDbMutation({
        action: 'DELETE',
        entity: 'master_machine',
        id: machineId,
      });
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Exception deleting master machine:', err);
    return false;
  }
};

export const dbFetchMasterBOMs = async (): Promise<MasterBOM[] | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('master_boms')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.warn('Supabase master_boms query notice:', error.message);
      return null;
    }
    if (!data) return [];
    const tombstones = getDeletedBOMTombstones();
    return data
      .filter((d: any) => !tombstones.has(d.id))
      .map((d: any) => ({
      id: d.id,
      bomNumber: d.bom_number || '',
      name: d.name || '',
      assemblyName: d.name || '',
      machineName: d.machine_name || '',
      machineType: d.machine_type || '',
      revision: d.revision || 'Rev A',
      status: d.status || 'Approved',
      category: d.category || '',
      notes: d.notes || '',
      items: Array.isArray(d.items) ? d.items : (typeof d.items === 'string' ? JSON.parse(d.items) : []),
      createdBy: d.created_by || 'System',
      createdAt: d.created_at || new Date().toISOString(),
      updatedBy: d.updated_by || d.created_by || 'System',
      updatedAt: d.updated_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('Error fetching master BOMs from Supabase:', err);
    return null;
  }
};

export const dbUpsertMasterBOM = async (bom: MasterBOM): Promise<boolean> => {
  const supabase = getSupabaseClient();
  if (!supabase) return false;
  try {
    const payload = {
      id: bom.id,
      bom_number: bom.bomNumber,
      name: bom.name,
      machine_name: bom.machineName,
      machine_type: bom.machineType,
      revision: bom.revision || 'Rev A',
      status: bom.status || 'Approved',
      category: bom.category || null,
      notes: bom.notes || null,
      items: bom.items || [],
      created_by: bom.createdBy,
      created_at: toSafeIsoTimestamp(bom.createdAt),
      updated_by: bom.updatedBy || bom.createdBy,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('master_boms').upsert(payload, { onConflict: 'id' });
    if (!error) {
      broadcastDbMutation({
        action: 'UPSERT',
        entity: 'master_bom',
        id: bom.id,
        data: bom,
      });
      return true;
    }
    console.warn('Error upserting master BOM:', error.message);
    return false;
  } catch (err) {
    console.warn('Exception upserting master BOM:', err);
    return false;
  }
};

export const dbDeleteMasterBOM = async (bomId: string): Promise<{ success: boolean; error?: string }> => {
  addBOMTombstone(bomId);
  const supabase = getSupabaseClient();
  if (!supabase) {
    // Local / Offline mode: tombstone saved, consider deleted
    broadcastDbMutation({
      action: 'DELETE',
      entity: 'master_bom',
      id: bomId,
    });
    return { success: true };
  }
  try {
    const { error } = await supabase.from('master_boms').delete().eq('id', bomId);
    if (!error) {
      broadcastDbMutation({
        action: 'DELETE',
        entity: 'master_bom',
        id: bomId,
      });
      return { success: true };
    }
    // If the table doesn't exist yet in Supabase, treat as local deletion success
    if (error.code === '42P01' || error.message.includes('relation "master_boms" does not exist')) {
      return { success: true };
    }
    console.warn('Error deleting master BOM from Supabase:', error.message);
    return { success: false, error: error.message };
  } catch (err: any) {
    console.warn('Exception deleting master BOM:', err);
    return { success: false, error: err?.message || 'Database error occurred' };
  }
};

// ---------------------------------------------------------------------------
// DAILY MATERIAL REQUIREMENTS PERSISTENCE
// ---------------------------------------------------------------------------
export const dbFetchDailyRequirements = async (): Promise<DailyRequirementItem[] | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('daily_requirements')
      .select('*')
      .order('requirement_date', { ascending: false });

    if (error) {
      console.warn('Supabase daily_requirements query notice:', error.message);
      return null;
    }
    if (!data) return [];
    return data.map((d: any) => ({
      id: d.id,
      requirementDate: d.requirement_date,
      description: d.description || '',
      materialType: d.material_type || '',
      sizeSpecification: d.size_specification || '',
      requiredQuantity: Number(d.required_quantity) || 0,
      arrangedQuantity: Number(d.arranged_quantity) || 0,
      unit: d.unit || 'Nos',
      projectName: d.project_name || '',
      projectId: d.project_id || '',
      machineName: d.machine_name || '',
      machineType: d.machine_type || '',
      bomId: d.bom_id || '',
      bomNumber: d.bom_number || '',
      vendorName: d.vendor_name || '',
      priority: d.priority || 'Normal',
      status: d.status || 'Pending',
      notes: d.notes || '',
      createdBy: d.created_by || 'System',
      createdAt: d.created_at || new Date().toISOString(),
      updatedBy: d.updated_by || d.created_by || 'System',
      updatedAt: d.updated_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('Exception fetching daily requirements:', err);
    return null;
  }
};

export const dbUpsertDailyRequirement = async (item: DailyRequirementItem): Promise<boolean> => {
  const supabase = getSupabaseClient();
  if (!supabase) return true;
  try {
    const payload = {
      id: item.id,
      requirement_date: item.requirementDate,
      description: item.description,
      material_type: item.materialType,
      size_specification: item.sizeSpecification,
      required_quantity: item.requiredQuantity,
      arranged_quantity: item.arrangedQuantity,
      unit: item.unit,
      project_name: item.projectName || null,
      project_id: item.projectId || null,
      machine_name: item.machineName || null,
      machine_type: item.machineType || null,
      bom_id: item.bomId || null,
      bom_number: item.bomNumber || null,
      vendor_name: item.vendorName || null,
      priority: item.priority || 'Normal',
      status: item.status || 'Pending',
      notes: item.notes || null,
      created_by: item.createdBy || 'System',
      created_at: toSafeIsoTimestamp(item.createdAt),
      updated_by: item.updatedBy || item.createdBy || 'System',
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('daily_requirements').upsert(payload, { onConflict: 'id' });
    if (!error) {
      broadcastDbMutation({
        action: 'UPSERT',
        entity: 'daily_requirement',
        id: item.id,
        data: item,
      });
      return true;
    }
    console.warn('Error upserting daily requirement:', error.message);
    return false;
  } catch (err) {
    console.warn('Exception upserting daily requirement:', err);
    return false;
  }
};

export const dbDeleteDailyRequirement = async (id: string): Promise<boolean> => {
  const supabase = getSupabaseClient();
  if (!supabase) return true;
  try {
    const { error } = await supabase.from('daily_requirements').delete().eq('id', id);
    if (!error) {
      broadcastDbMutation({
        action: 'DELETE',
        entity: 'daily_requirement',
        id,
      });
      return true;
    }
    return false;
  } catch (err) {
    console.warn('Exception deleting daily requirement:', err);
    return false;
  }
};

export const dbFetchDailyRequirementHistory = async (requirementId?: string): Promise<DailyRequirementHistoryItem[] | null> => {
  const supabase = getSupabaseClient();
  if (!supabase) return null;
  try {
    let query = supabase.from('daily_requirement_history').select('*').order('recorded_at', { ascending: false });
    if (requirementId) {
      query = query.eq('requirement_id', requirementId);
    }
    const { data, error } = await query;
    if (error) {
      console.warn('Supabase daily_requirement_history query notice:', error.message);
      return null;
    }
    if (!data) return [];
    return data.map((d: any) => ({
      id: d.id,
      requirementId: d.requirement_id,
      requirementDate: d.requirement_date,
      previousArrangedQty: Number(d.previous_arranged_qty) || 0,
      additionalQty: Number(d.additional_qty) || 0,
      newArrangedQty: Number(d.new_arranged_qty) || 0,
      unit: d.unit || 'Nos',
      vendorName: d.vendor_name || '',
      remarks: d.remarks || '',
      recordedBy: d.recorded_by || 'Staff',
      recordedAt: d.recorded_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.warn('Exception fetching daily requirement history:', err);
    return null;
  }
};

export const dbAddDailyRequirementHistory = async (item: DailyRequirementHistoryItem): Promise<boolean> => {
  const supabase = getSupabaseClient();
  if (!supabase) return true;
  try {
    const payload = {
      id: item.id,
      requirement_id: item.requirementId,
      requirement_date: item.requirementDate,
      previous_arranged_qty: item.previousArrangedQty,
      additional_qty: item.additionalQty,
      new_arranged_qty: item.newArrangedQty,
      unit: item.unit,
      vendor_name: item.vendorName || null,
      remarks: item.remarks || null,
      recorded_by: item.recordedBy || 'Staff',
      recorded_at: toSafeIsoTimestamp(item.recordedAt),
    };
    const { error } = await supabase.from('daily_requirement_history').insert(payload);
    if (!error) return true;
    console.warn('Error inserting daily requirement history:', error.message);
    return false;
  } catch (err) {
    console.warn('Exception inserting daily requirement history:', err);
    return false;
  }
};

