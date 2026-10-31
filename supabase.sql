-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.projects (
  id text NOT NULL,
  project_number text NOT NULL,
  name text NOT NULL,
  customer text NOT NULL,
  order_source text DEFAULT 'Customer PO'::text,
  machine_type text DEFAULT 'Custom Machine'::text,
  vendor text,
  po_number text,
  start_date date,
  target_completion_date date,
  priority text DEFAULT 'medium'::text,
  status text DEFAULT 'Production'::text,
  project_value numeric DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT projects_pkey PRIMARY KEY (id)
);
CREATE TABLE public.project_material_requirements (
  id text NOT NULL,
  sr_no integer,
  description text NOT NULL,
  material_type text NOT NULL,
  material_grade text DEFAULT 'SS 304'::text,
  size_specs text NOT NULL,
  quantity numeric NOT NULL,
  unit text NOT NULL,
  weight_kg numeric,
  project_name text NOT NULL,
  customer_name text,
  po_number text,
  po_date text,
  machine_type text,
  order_source text,
  delivery_date text,
  vendor text,
  bom_ref text,
  last_purchase_rate numeric,
  last_purchase_date text,
  vendor_rating numeric,
  vendor_reliability numeric,
  stock_status text DEFAULT 'Available'::text,
  available_stock numeric DEFAULT 0,
  shortage_qty numeric DEFAULT 0,
  production_status text DEFAULT 'Pending'::text,
  qc_status text DEFAULT 'Not Started'::text,
  dispatch_status text DEFAULT 'Not Ready'::text,
  job_card_no text,
  assigned_operator text,
  assigned_machine text,
  production_stage text,
  material_cost numeric DEFAULT 0,
  labor_cost numeric DEFAULT 0,
  machine_cost numeric DEFAULT 0,
  outsourcing_cost numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  selling_price_allocated numeric DEFAULT 0,
  notes text,
  ordered_by text,
  timestamp timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT project_material_requirements_pkey PRIMARY KEY (id)
);
CREATE TABLE public.materials (
  id text NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  grade text DEFAULT 'SS 304'::text,
  thickness numeric,
  size_specs text,
  unit text DEFAULT 'Nos'::text,
  unit_weight_kg numeric,
  current_stock numeric DEFAULT 0,
  reserved_stock numeric DEFAULT 0,
  min_stock numeric DEFAULT 0,
  reorder_level numeric DEFAULT 0,
  unit_cost numeric DEFAULT 0,
  vendor text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT materials_pkey PRIMARY KEY (id)
);
CREATE TABLE public.manufacturing_orders (
  id text NOT NULL,
  order_number text NOT NULL,
  po_number text,
  date date,
  customer text,
  vendor text,
  machine_type text,
  project text,
  drawing_ref text,
  material_type text,
  size_specs text,
  quantity numeric DEFAULT 0,
  unit text DEFAULT 'Nos'::text,
  inward_qty numeric DEFAULT 0,
  outward_qty numeric DEFAULT 0,
  current_stock numeric DEFAULT 0,
  status text DEFAULT 'Pending'::text,
  delivery_date date,
  order_source text,
  unit_rate numeric DEFAULT 0,
  total_amount numeric DEFAULT 0,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT manufacturing_orders_pkey PRIMARY KEY (id)
);
CREATE TABLE public.job_cards (
  id text NOT NULL,
  job_card_no text NOT NULL,
  project text,
  customer text,
  drawing_ref text,
  material text,
  size_specs text,
  quantity numeric DEFAULT 0,
  unit text DEFAULT 'Nos'::text,
  machine_type text,
  assigned_operator text,
  start_date date,
  end_date date,
  completion_pct numeric DEFAULT 0,
  status text DEFAULT 'Pending'::text,
  linked_order_id text,
  linked_requirement_id text,
  operations jsonb DEFAULT '[]'::jsonb,
  notes text,
  qr_payload text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT job_cards_pkey PRIMARY KEY (id)
);
CREATE TABLE public.inward_entries (
  id text NOT NULL,
  inward_number text NOT NULL,
  date date,
  vendor text,
  po_number text,
  challan_number text,
  invoice_number text,
  material_type text,
  size_specs text,
  quantity numeric DEFAULT 0,
  unit text DEFAULT 'Nos'::text,
  weight_kg numeric DEFAULT 0,
  received_by text,
  quality_status text DEFAULT 'Approved'::text,
  remarks text,
  linked_order_id text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inward_entries_pkey PRIMARY KEY (id)
);
CREATE TABLE public.outward_entries (
  id text NOT NULL,
  outward_number text NOT NULL,
  dispatch_date date,
  customer text,
  project text,
  material text,
  quantity numeric DEFAULT 0,
  unit text DEFAULT 'Nos'::text,
  vehicle_number text,
  driver_name text,
  driver_phone text,
  invoice_number text,
  dispatch_person text,
  delivery_status text DEFAULT 'Pending'::text,
  e_way_bill_no text,
  transporter text,
  linked_order_id text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT outward_entries_pkey PRIMARY KEY (id)
);
CREATE TABLE public.vendors (
  id text NOT NULL,
  name text NOT NULL,
  contact_person text,
  mobile text,
  email text,
  gstin text,
  address text,
  material_supplied text,
  rating numeric DEFAULT 5.0,
  payment_terms text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT vendors_pkey PRIMARY KEY (id)
);
CREATE TABLE public.customers (
  id text NOT NULL,
  name text NOT NULL,
  contact_person text,
  mobile text,
  email text,
  gstin text,
  city text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT customers_pkey PRIMARY KEY (id)
);
CREATE TABLE public.erp_users (
  id text NOT NULL,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  role text NOT NULL,
  department text,
  status text DEFAULT 'Active'::text,
  auth_level text DEFAULT 'Tier 3 (Operator)'::text,
  permissions jsonb,
  created_at timestamp with time zone DEFAULT now(),
  password text,
  reset_pin text,
  reset_pin_expires_at bigint,
  CONSTRAINT erp_users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.workbooks (
  id text NOT NULL,
  directory_id text,
  title text NOT NULL,
  description text,
  created_by text,
  created_by_name text,
  created_at timestamp with time zone DEFAULT now(),
  last_edited_by text,
  last_edited_by_name text,
  last_edited_at timestamp with time zone DEFAULT now(),
  is_pinned boolean DEFAULT false,
  is_favorite boolean DEFAULT false,
  tags ARRAY DEFAULT '{}'::text[],
  sheets_data jsonb DEFAULT '[]'::jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT workbooks_pkey PRIMARY KEY (id)
);
CREATE TABLE public.workbook_directories (
  id text NOT NULL,
  name text NOT NULL,
  icon text DEFAULT 'Folder'::text,
  color text DEFAULT '#107c41'::text,
  created_by text,
  order_index integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT workbook_directories_pkey PRIMARY KEY (id)
);
CREATE TABLE public.qc_inspections (
  id text NOT NULL,
  inspection_number text,
  job_card_no text,
  project text,
  material text,
  sample_size numeric DEFAULT 0,
  inspected_by text,
  inspection_date date,
  status text DEFAULT 'Pending'::text,
  remarks text,
  measurements jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT qc_inspections_pkey PRIMARY KEY (id)
);
CREATE TABLE public.workbook_activity_logs (
  id text NOT NULL,
  workbook_id text,
  action text NOT NULL,
  user_name text,
  user_role text,
  details text,
  timestamp timestamp with time zone DEFAULT now(),
  CONSTRAINT workbook_activity_logs_pkey PRIMARY KEY (id)
);
CREATE TABLE public.deleted_workbook_items (
  id text NOT NULL,
  item_type text NOT NULL,
  title text NOT NULL,
  original_data jsonb,
  deleted_by text,
  deleted_by_name text,
  deleted_at timestamp with time zone DEFAULT now(),
  CONSTRAINT deleted_workbook_items_pkey PRIMARY KEY (id)
);
CREATE TABLE public.purchase_orders (
  id text NOT NULL,
  po_number text NOT NULL,
  vendor_name text,
  vendor_id text,
  date text,
  expected_delivery text,
  status text DEFAULT 'Open'::text,
  total_amount numeric DEFAULT 0,
  payment_terms text,
  project_name text,
  items jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT purchase_orders_pkey PRIMARY KEY (id)
);

-- Master Machine Folders (Directory Hierarchy for Machine BOMs)
CREATE TABLE IF NOT EXISTS public.master_machines (
  id text NOT NULL,
  name text NOT NULL,
  types jsonb DEFAULT '[]'::jsonb,
  created_by text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT master_machines_pkey PRIMARY KEY (id)
);

-- Master Bill of Materials (Master BOMs with precision material specifications)
CREATE TABLE IF NOT EXISTS public.master_boms (
  id text NOT NULL,
  bom_number text NOT NULL,
  name text NOT NULL,
  machine_id text,
  machine_name text NOT NULL,
  machine_type text NOT NULL,
  revision text DEFAULT 'Rev A'::text,
  status text DEFAULT 'Approved'::text,
  category text,
  notes text,
  items jsonb DEFAULT '[]'::jsonb,
  created_by text,
  created_at timestamp with time zone DEFAULT now(),
  updated_by text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT master_boms_pkey PRIMARY KEY (id)
);

-- Enable RLS & Policies
ALTER TABLE public.master_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_boms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read master_machines" ON public.master_machines FOR SELECT USING (true);
CREATE POLICY "Allow public write master_machines" ON public.master_machines FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read master_boms" ON public.master_boms FOR SELECT USING (true);
CREATE POLICY "Allow public write master_boms" ON public.master_boms FOR ALL USING (true) WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- Daily Material Requirement Tracking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_requirements (
  id text NOT NULL,
  requirement_date date NOT NULL,
  description text NOT NULL,
  material_type text NOT NULL,
  size_specification text NOT NULL,
  required_quantity numeric DEFAULT 0 NOT NULL,
  arranged_quantity numeric DEFAULT 0 NOT NULL,
  unit text DEFAULT 'Nos'::text NOT NULL,
  project_name text,
  project_id text,
  machine_name text,
  machine_type text,
  bom_id text,
  bom_number text,
  vendor_name text,
  priority text DEFAULT 'Normal'::text,
  status text DEFAULT 'Pending'::text,
  notes text,
  created_by text,
  created_at timestamp with time zone DEFAULT now(),
  updated_by text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT daily_requirements_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_daily_req_date ON public.daily_requirements(requirement_date);
CREATE INDEX IF NOT EXISTS idx_daily_req_project ON public.daily_requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_daily_req_status ON public.daily_requirements(status);

CREATE TABLE IF NOT EXISTS public.daily_requirement_history (
  id text NOT NULL,
  requirement_id text NOT NULL,
  requirement_date date NOT NULL,
  previous_arranged_qty numeric DEFAULT 0 NOT NULL,
  additional_qty numeric DEFAULT 0 NOT NULL,
  new_arranged_qty numeric DEFAULT 0 NOT NULL,
  unit text DEFAULT 'Nos'::text NOT NULL,
  vendor_name text,
  remarks text,
  recorded_by text,
  recorded_at timestamp with time zone DEFAULT now(),
  CONSTRAINT daily_requirement_history_pkey PRIMARY KEY (id)
);

CREATE INDEX IF NOT EXISTS idx_daily_hist_req ON public.daily_requirement_history(requirement_id);

ALTER TABLE public.daily_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_requirement_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read daily_requirements" ON public.daily_requirements FOR SELECT USING (true);
CREATE POLICY "Allow public write daily_requirements" ON public.daily_requirements FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public read daily_requirement_history" ON public.daily_requirement_history FOR SELECT USING (true);
CREATE POLICY "Allow public write daily_requirement_history" ON public.daily_requirement_history FOR ALL USING (true) WITH CHECK (true);
