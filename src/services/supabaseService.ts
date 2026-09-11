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
} from '../types/erp';

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
  sr_no INTEGER,
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
        notes: r.notes,
        ordered_by: r.orderedBy,
        timestamp: (r as any).timestamp || r.date || new Date().toISOString(),
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
};

// Pull remote data from Supabase into local ERP
export const pullAllDataFromSupabase = async (): Promise<{
  success: boolean;
  data?: {
    projects?: ProjectItem[];
    requirements?: ProjectMaterialRequirementItem[];
    materials?: MaterialItem[];
  };
  message: string;
}> => {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, message: 'Supabase client is not configured' };
  }

  try {
    // 1. Fetch Projects
    const { data: prjData, error: prjErr } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
    if (prjErr) throw prjErr;

    const parsedProjects: ProjectItem[] = (prjData || []).map((p: any) => ({
      id: p.id,
      projectNumber: p.project_number,
      name: p.name,
      customer: p.customer,
      orderSource: p.order_source,
      machineType: p.machine_type,
      vendor: p.vendor,
      poNumber: p.po_number,
      startDate: p.start_date || new Date().toISOString().split('T')[0],
      targetCompletionDate: p.target_completion_date || new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      priority: p.priority || 'medium',
      status: p.status || 'Production',
      projectValue: Number(p.project_value || 0),
      notes: p.notes,
      progressPct: Number(p.progress_pct || 0),
    }));

    // 2. Fetch Requirements
    const { data: reqData, error: reqErr } = await supabase.from('project_material_requirements').select('*').order('timestamp', { ascending: false });
    if (reqErr) throw reqErr;

    const parsedRequirements: ProjectMaterialRequirementItem[] = (reqData || []).map((r: any) => ({
      id: r.id,
      srNo: r.sr_no,
      description: r.description,
      materialType: r.material_type,
      materialGrade: r.material_grade,
      sizeSpecs: r.size_specs,
      quantity: Number(r.quantity || 0),
      unit: r.unit,
      weightKg: Number(r.weight_kg || 0),
      projectName: r.project_name,
      customerName: r.customer_name,
      poNumber: r.po_number,
      poDate: r.po_date,
      machineType: r.machine_type,
      orderSource: r.order_source,
      deliveryDate: r.delivery_date,
      vendor: r.vendor,
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
      assignedMachine: r.assigned_machine,
      productionStage: r.production_stage,
      materialCost: Number(r.material_cost || 0),
      laborCost: Number(r.labor_cost || 0),
      machineCost: Number(r.machine_cost || 0),
      outsourcingCost: Number(r.outsourcing_cost || 0),
      totalCost: Number(r.total_cost || 0),
      sellingPriceAllocated: Number(r.selling_price_allocated || 0),
      notes: r.notes,
      orderedBy: r.ordered_by,
      timestamp: r.timestamp,
    }));

    return {
      success: true,
      data: {
        projects: parsedProjects,
        requirements: parsedRequirements,
      },
      message: `Pulled ${parsedProjects.length} projects and ${parsedRequirements.length} requirements from Supabase.`,
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to pull from Supabase: ${err?.message || 'Unknown error'}`,
    };
  }
};

// Single project Supabase helpers
export const dbUpsertProject = async (project: ProjectItem) => {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    await supabase.from('projects').upsert({
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
  } catch (e) {
    console.warn('Supabase project upsert failed:', e);
  }
};

export const dbDeleteProject = async (projectId: string) => {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    await supabase.from('projects').delete().eq('id', projectId);
  } catch (e) {
    console.warn('Supabase project delete failed:', e);
  }
};

export const dbDeleteRequirementsByProject = async (projectName: string) => {
  const supabase = getSupabaseClient();
  if (!supabase || !projectName) return;

  try {
    await supabase.from('project_material_requirements').delete().ilike('project_name', projectName);
  } catch (e) {
    console.warn('Supabase delete requirements by project failed:', e);
  }
};

export const dbUpsertRequirement = async (req: ProjectMaterialRequirementItem) => {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    await supabase.from('project_material_requirements').upsert({
      id: req.id,
      sr_no: req.srNo,
      description: req.description,
      material_type: req.materialType,
      material_grade: req.materialGrade,
      size_specs: req.sizeSpecs,
      quantity: req.quantity,
      unit: req.unit,
      weight_kg: req.weightKg,
      project_name: req.projectName,
      customer_name: req.customerName,
      po_number: req.poNumber,
      po_date: req.poDate,
      machine_type: req.machineType,
      order_source: req.orderSource,
      delivery_date: req.deliveryDate,
      vendor: req.vendor,
      bom_ref: req.bomRef,
      stock_status: req.stockStatus,
      available_stock: req.availableStock,
      shortage_qty: req.shortageQty,
      production_status: req.productionStatus,
      qc_status: req.qcStatus,
      dispatch_status: req.dispatchStatus,
      job_card_no: req.jobCardNo,
      assigned_operator: req.assignedOperator,
      assigned_machine: req.assignedMachine,
      production_stage: req.productionStage,
      material_cost: req.materialCost,
      labor_cost: req.laborCost,
      machine_cost: req.machineCost,
      outsourcing_cost: req.outsourcingCost,
      total_cost: req.totalCost,
      selling_price_allocated: req.sellingPriceAllocated,
      notes: req.notes,
      ordered_by: req.orderedBy,
      timestamp: (req as any).timestamp || req.date || new Date().toISOString(),
    });
  } catch (e) {
    console.warn('Supabase requirement upsert failed:', e);
  }
};

export const dbDeleteRequirement = async (reqId: string) => {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    await supabase.from('project_material_requirements').delete().eq('id', reqId);
  } catch (e) {
    console.warn('Supabase requirement delete failed:', e);
  }
};

export const dbBulkUpsertRequirements = async (
  reqs: ProjectMaterialRequirementItem[]
): Promise<{ success: boolean; count: number; message?: string }> => {
  const supabase = getSupabaseClient();
  if (!supabase || reqs.length === 0) return { success: false, count: 0, message: 'No Supabase client or empty list' };

  try {
    const mapped = reqs.map((r) => ({
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
      notes: r.notes,
      ordered_by: r.orderedBy,
      timestamp: (r as any).timestamp || r.date || new Date().toISOString(),
    }));

    const { error } = await supabase.from('project_material_requirements').upsert(mapped, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase bulk requirements upsert warning:', error);
      return { success: false, count: 0, message: error.message };
    }

    return { success: true, count: mapped.length };
  } catch (e: any) {
    console.warn('Supabase bulk requirements upsert error:', e);
    return { success: false, count: 0, message: e?.message };
  }
};

